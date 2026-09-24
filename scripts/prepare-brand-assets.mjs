/**
 * Build every web-facing brand asset from the official 2026 packs in
 * assets-inbox/brand-2026 (OFFICIAL_NOT_TO_BAD_EMBLEM_2026 +
 * OFFICIAL_NOT_TO_BAD_LOGOS_2026).
 *
 * The composed logos ship on a flat #0a0a0b card. The label page runs a film
 * loop behind the lockup, so a baked card would read as a dead rectangle —
 * keyOutCard() turns that flat ground into alpha by taking each pixel's
 * brightest channel as coverage and unmultiplying the ground back out. White
 * line art keys exactly; the blood rule keeps its hue because the unmultiply
 * divides the ground out of all three channels, not just luminance.
 *
 * The emblem pack already ships true-transparent PNGs, so those are only
 * trimmed and resized.
 *
 * Usage: node scripts/prepare-brand-assets.mjs
 */
import { writeFile } from "node:fs/promises";

import sharp from "sharp";

const IN = "assets-inbox/brand-2026";
const CARD = 10; // the #0a0a0b ground the composed logos sit on
// The card is not perfectly flat — it carries a channel or two of noise, which
// keys to a haze of alpha-1 pixels over the whole frame. Anything under this
// is ground, and real edges are rescaled so the dead-zone costs no antialiasing.
const FLOOR = 14;

/** Flat dark ground -> alpha, with the ground unmultiplied out of the color. */
async function keyOutCard(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  const span = 255 - CARD;
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const raw = Math.max(0, Math.min(255, Math.round(((Math.max(r, g, b) - CARD) / span) * 255)));
    const cover = raw <= FLOOR ? 0 : Math.round(((raw - FLOOR) / (255 - FLOOR)) * 255);
    if (cover === 0) { out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0; continue; }
    const a = cover / 255;
    // c = src*a + ground*(1-a)  ->  src = (c - ground*(1-a)) / a
    const un = (c) => Math.max(0, Math.min(255, Math.round((c - CARD * (1 - a)) / a)));
    out[o] = un(r); out[o + 1] = un(g); out[o + 2] = un(b); out[o + 3] = cover;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

const trimmed = (buf) => sharp(buf).trim({ threshold: 1 });

/** Pack PNG buffers into a multi-size .ico so the browser picks per size. */
function encodeIco(pngs, sizes) {
  const HEADER = 6, ENTRY = 16;
  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = HEADER + ENTRY * pngs.length;
  const entries = pngs.map((png, i) => {
    const e = Buffer.alloc(ENTRY);
    e.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 0);
    e.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs]);
}

/**
 * Crop to where the artwork actually is. Keying leaves a scatter of stray
 * pixels, and a plain bounding box would stretch to the furthest speck, so a
 * row or column only counts once it holds MIN_RUN solid pixels.
 */
async function cropToArt(buf, { threshold = 40, minRun = 3 } = {}) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const rows = new Uint32Array(H);
  const cols = new Uint32Array(W);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * C + 3] > threshold) { rows[y]++; cols[x]++; }
    }
  }
  const span = (counts) => {
    let lo = 0, hi = counts.length - 1;
    while (lo < counts.length && counts[lo] < minRun) lo++;
    while (hi >= 0 && counts[hi] < minRun) hi--;
    return [lo, hi];
  };
  const [y0, y1] = span(rows);
  const [x0, x1] = span(cols);
  return sharp(buf)
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .png()
    .toBuffer();
}

/**
 * Bounding box of everything that is not the card, within a band of rows.
 * NTB-4e carries a hairline frame around the whole sheet, so trim() can't
 * find the discs — this ignores the frame by insetting first.
 */
async function discBox(input, bandTop, bandBottom, inset = 16) {
  const { data, info } = await sharp(input).raw().toBuffer({ resolveWithObject: true });
  const { width: W, channels: C } = info;
  let x0 = W, y0 = bandBottom, x1 = -1, y1 = -1;
  for (let y = bandTop + inset; y < bandBottom - inset; y++) {
    for (let x = inset; x < W - inset; x++) {
      const i = (y * W + x) * C;
      if (Math.hypot(data[i] - CARD, data[i + 1] - CARD, data[i + 2] - CARD) < 40) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

async function webp(buf, out, width) {
  const info = await sharp(buf)
    .resize({ width, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(out);
  console.log(`  ${out}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
}

console.log("brand assets:");

// --- Primary stacked lockup — label landing, over the film loop -------------
const lockup = await trimmed(await keyOutCard(`${IN}/logos/NTB-4a-primary-obsidian.png`)).png().toBuffer();
await webp(lockup, "public/label/lockup.webp", 1000);

// --- Emblem, lettered collar — the seal that marks every surface ------------
const mark = await trimmed(`${IN}/emblem/NTB-mark-v1-lettered-white-on-transparent.png`).png().toBuffer();
await webp(mark, "public/label/mark.webp", 512);

// --- Horizontal banner — press kit masthead --------------------------------
const banner = await trimmed(await keyOutCard(`${IN}/logos/NTB-4c-banner-obsidian.png`)).png().toBuffer();
await webp(banner, "public/label/banner.webp", 1400);

// --- Circular seal — the house stamp, and the site's icon ------------------
// Cropped to the ring itself; the source centers it on a tall card.
const seal = await cropToArt(await keyOutCard(`${IN}/logos/NTB-4d-seal-lettered.png`));
await webp(seal, "public/label/seal.webp", 760);

// --- Nav crest — the seal ---------------------------------------------------
await webp(seal, "public/logo-crest.webp", 256);

// NTB-4e stacks three 924x574 discs: obsidian, bone, blood.
const AVATARS = `${IN}/logos/NTB-4e-avatar-marks.png`;
const { height: avatarH } = await sharp(AVATARS).metadata();

// --- Icons — the white (bone) logo -------------------------------------------
// 512px and the 180px Apple icon carry the full bone lockup — dog, rule and
// wordmark — centered on its own bone card, squared off from the portrait
// original.
const BONE = { r: 244, g: 244, b: 242, alpha: 1 };
const PRIMARY_BONE = `${IN}/logos/NTB-4b-primary-bone.png`;
{
  // the card has a hairline frame, so find the ink inside it by darkness
  const { data, info } = await sharp(PRIMARY_BONE).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const INSET = 12;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = INSET; y < H - INSET; y++) {
    for (let x = INSET; x < W - INSET; x++) {
      const i = (y * W + x) * C;
      if (Math.min(data[i], data[i + 1], data[i + 2]) > 200) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const art = await sharp(PRIMARY_BONE)
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .png()
    .toBuffer();
  const square = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BONE } })
    .composite([{
      input: await sharp(art).resize(800, 800, { fit: "contain", background: BONE }).toBuffer(),
      gravity: "center",
    }])
    .png()
    .toBuffer();
  for (const [out, size] of [["app/icon.png", 512], ["app/apple-icon.png", 180]]) {
    const buf = await sharp(square).resize(size, size).png().toBuffer();
    await writeFile(out, buf);
    console.log(`  ${out}  ${size}x${size}  ${(buf.length / 1024).toFixed(0)} KB`);
  }
}

// A tab is 16px, where the wordmark is unreadable and the line-art dog thins
// to nothing. The pack's bone disc — the same dog, filled, on bone — is the
// form that survives, so the favicon carries it. The disc is cut out with a
// true circle: the dog is as dark as the card around the disc, so keying the
// card away would punch the dog out with it.
{
  const box = await discBox(AVATARS, Math.round(avatarH / 3), Math.round((avatarH * 2) / 3));
  const side = Math.min(box.width, box.height);
  const disc = await sharp(AVATARS)
    .extract({ left: box.left, top: box.top, width: side, height: side })
    .ensureAlpha()
    .composite([{
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}">
           <circle cx="${side / 2}" cy="${side / 2}" r="${side / 2 - 1}" fill="#fff"/>
         </svg>`,
      ),
      blend: "dest-in",
    }])
    .png()
    .toBuffer();
  const tab = await Promise.all(
    [16, 32, 48].map((s) => sharp(disc).resize(s, s).png().toBuffer()),
  );
  const ico = encodeIco(tab, [16, 32, 48]);
  await writeFile("app/favicon.ico", ico);
  console.log(`  app/favicon.ico  16/32/48  ${(ico.length / 1024).toFixed(0)} KB`);
}

// --- Social share card — the banner centered on obsidian -------------------
const OG_W = 1200, OG_H = 630;
const ogArt = await sharp(banner).resize({ width: Math.round(OG_W * 0.74), fit: "inside" }).toBuffer();
// A single blood ember behind the mark, same as the label page. Drawn as an
// SVG gradient because sharp blurs before it composites, so a blurred shape
// composited here would come out with hard edges.
const ember = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
     <defs>
       <radialGradient id="ember" cx="27%" cy="48%" r="38%">
         <stop offset="0%" stop-color="#b41c25" stop-opacity="0.42"/>
         <stop offset="55%" stop-color="#b41c25" stop-opacity="0.12"/>
         <stop offset="100%" stop-color="#b41c25" stop-opacity="0"/>
       </radialGradient>
     </defs>
     <rect width="${OG_W}" height="${OG_H}" fill="url(#ember)"/>
   </svg>`,
);
const ogInfo = await sharp({
  create: { width: OG_W, height: OG_H, channels: 4, background: { r: 0x09, g: 0x08, b: 0x0d, alpha: 1 } },
})
  .composite([
    { input: ember, left: 0, top: 0 },
    { input: ogArt, gravity: "center" },
  ])
  .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
  .toFile("public/og-card.jpg");
console.log(`  public/og-card.jpg  ${ogInfo.width}x${ogInfo.height}  ${(ogInfo.size / 1024).toFixed(0)} KB`);
