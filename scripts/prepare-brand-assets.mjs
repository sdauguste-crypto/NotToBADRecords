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
import sharp from "sharp";

const IN = "assets-inbox/brand-2026";
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

// --- Circular seal — "we really out here" ring -----------------------------
const seal = await trimmed(await keyOutCard(`${IN}/logos/NTB-4d-seal-lettered.png`)).png().toBuffer();
await webp(seal, "public/label/seal.webp", 700);

// --- Solid avatar mark — legible at nav and favicon sizes -------------------
// NTB-4e stacks three 924x574 discs: obsidian, bone, blood. The blood disc is
// the one that still reads as Not To B.A.D at 36px and at 16px in a tab.
const AVATARS = `${IN}/logos/NTB-4e-avatar-marks.png`;
const { height: avatarH } = await sharp(AVATARS).metadata();
const box = await discBox(AVATARS, Math.round((avatarH * 2) / 3), avatarH);
console.log(`  (blood disc at ${box.left},${box.top} ${box.width}x${box.height})`);
const crest = await cutCard(await sharp(AVATARS).extract(box).png().toBuffer());
await webp(crest, "public/logo-crest.webp", 256);

// --- Favicons — the blood disc, padded so it survives a 16px render ---------
const iconArt = await sharp(crest)
  .resize(464, 464, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();
// sharp resizes before it composites, so the square is built first and scaled
// in a second pass.
const iconSquare = await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 0x09, g: 0x08, b: 0x0d, alpha: 1 } },
})
  .composite([{ input: iconArt, gravity: "center" }])
  .png()
  .toBuffer();
for (const [out, size] of [["app/icon.png", 512], ["app/apple-icon.png", 180]]) {
  const info = await sharp(iconSquare).resize(size, size).png().toFile(out);
  console.log(`  ${out}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
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
