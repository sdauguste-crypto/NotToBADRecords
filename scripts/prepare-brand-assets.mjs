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
const CHROME = { r: 0xeb, g: 0xee, b: 0xf1 };
const CARD = 10; // the #0a0a0b ground the composed logos sit on
// The card is not perfectly flat — it carries a channel or two of noise, which
// keys to a haze of alpha-1 pixels over the whole frame. Anything under this
// is ground, and real edges are rescaled so the dead-zone costs no antialiasing.
const FLOOR = 14;
const BLOOD = { r: 0xb4, g: 0x1c, b: 0x25 };

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

/**
 * Drop only the flat card, keeping everything drawn on it opaque. Used for
 * the filled discs, where keyOutCard()'s brightness rule would make the blood
 * itself half transparent.
 */
async function cutCard(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  const NEAR = 14, FAR = 30; // ramp across the disc's antialiased rim
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.hypot(r - CARD, g - CARD, b - CARD);
    const cover = d <= NEAR ? 0 : d >= FAR ? 255 : Math.round(((d - NEAR) / (FAR - NEAR)) * 255);
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = cover;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

const trimmed = (buf) => sharp(buf).trim({ threshold: 1 });

/** Repaint every visible pixel one flat color, keeping the alpha shape. */
async function tint(buf, { r, g, b }) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = data[i + 3];
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Fatten strokes by taking the max alpha over a (2r+1) box, separably. */
async function dilateAlpha(buf, r) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const read = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) read[p] = data[p * C + 3];
  const pass = (src, w, h) => {
    const dst = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let m = 0;
        for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) {
          const v = src[y * w + k];
          if (v > m) m = v;
        }
        dst[y * w + x] = m;
      }
    }
    return dst;
  };
  const transpose = (src, w, h) => {
    const dst = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dst[x * h + y] = src[y * w + x];
    return dst;
  };
  const alpha = transpose(pass(transpose(pass(read, W, H), W, H), H, W), H, W);
  const out = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    out[p * 4] = data[p * C];
    out[p * 4 + 1] = data[p * C + 1];
    out[p * 4 + 2] = data[p * C + 2];
    out[p * 4 + 3] = alpha[p];
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

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

// --- Nav crest — the seal, so the header and the tab icon agree ------------
await webp(seal, "public/logo-crest.webp", 256);

// NTB-4e stacks three 924x574 discs: obsidian, bone, blood. The obsidian one
// is the pack's own small-size answer — a filled silhouette, which is the only
// form that survives a browser tab. Keying it drops the disc (it is the card
// color) and leaves the solid dog.
const AVATARS = `${IN}/logos/NTB-4e-avatar-marks.png`;
const { height: avatarH } = await sharp(AVATARS).metadata();
const darkBox = await discBox(AVATARS, 0, Math.round(avatarH / 3));
const solidMark = await cropToArt(
  await keyOutCard(await sharp(AVATARS).extract(darkBox).png().toBuffer()),
);
await webp(solidMark, "public/label/mark-solid.webp", 256);

// --- Icons — the seal, on obsidian -----------------------------------------
// At 180px and up the seal renders faithfully. A browser tab is a different
// problem: the ring is a hairline, so scaling it to 16px averages it away to
// near black. Those sizes get the same seal with its strokes thickened and
// pushed to chrome first, so the mark still reads as a ring around the dog —
// the lettering becomes texture at that size no matter what is done to it.
const iconOn = async (art, size, fill = 0.96) =>
  sharp(
    await sharp({
      create: { width: 1024, height: 1024, channels: 4, background: { r: 0x09, g: 0x08, b: 0x0d, alpha: 1 } },
    })
      .composite([{
        input: await sharp(art)
          .resize(Math.round(1024 * fill), Math.round(1024 * fill), {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toBuffer(),
        gravity: "center",
      }])
      .png()
      .toBuffer(),
  )
    .resize(size, size)
    .png()
    .toBuffer();

for (const [out, size] of [["app/icon.png", 512], ["app/apple-icon.png", 180]]) {
  const buf = await iconOn(seal, size);
  await writeFile(out, buf);
  console.log(`  ${out}  ${size}x${size}  ${(buf.length / 1024).toFixed(0)} KB`);
}

// A tab is 16px: the seal's hairline ring would have to be thickened roughly
// twenty-five-fold to hold a single pixel there, which would blot out the
// design. The filled mark carries the brand at that size instead, nudged
// heavier so it stays solid.
const tabArt = await tint(await dilateAlpha(solidMark, 3), CHROME);
const ico = encodeIco(await Promise.all([16, 32, 48].map((s) => iconOn(tabArt, s, 0.72))), [16, 32, 48]);
await writeFile("app/favicon.ico", ico);
console.log(`  app/favicon.ico  16/32/48  ${(ico.length / 1024).toFixed(0)} KB`);

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
