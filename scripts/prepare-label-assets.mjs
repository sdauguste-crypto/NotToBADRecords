/**
 * Web assets for the label landing page, from the 3A obsidian lockup.
 *
 *  - public/label/lockup.webp  full stacked lockup (crest + wordmark)
 *  - public/label/mark.webp    crest only, for the nav and the seal
 *
 * The source is chrome artwork sitting on a near-black plate. Rather than
 * relying on mix-blend-screen (which leaves a visible rectangle wherever the
 * plate isn't exactly the page colour), the plate is turned into real
 * transparency: shadows are crushed to true black, then the pixel's own
 * brightness becomes its alpha. The result composites cleanly on any
 * background, so the artwork simply floats.
 *
 * Usage: node scripts/prepare-label-assets.mjs
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const SRC = "assets-inbox/NTB-3a-obsidian-stacked.jpg";
await mkdir("public/label", { recursive: true });

// Crush the dark plate to true black without dimming the chrome.
const CRUSH = { a: 1.22, b: -26 };

/** Brightness -> alpha, so the black plate becomes transparent. */
async function cutout(pipeline, out) {
  const { data, info } = await pipeline
    .linear(CRUSH.a, CRUSH.b)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = info.width * info.height;
  const rgba = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const o = i * 4;
    rgba[o] = r;
    rgba[o + 1] = g;
    rgba[o + 2] = b;
    // brightest channel — keeps the blood red opaque as well as the chrome
    rgba[o + 3] = Math.max(r, g, b);
  }

  const info2 = await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(out);
  console.log(`${out} ${info2.width}x${info2.height} ${(info2.size / 1024).toFixed(0)}KB`);
}

await cutout(
  sharp(SRC).resize({ width: 1000, withoutEnlargement: true }),
  "public/label/lockup.webp",
);

// Crest only: the head occupies roughly the top two-thirds of the frame.
const { width, height } = await sharp(SRC).metadata();
await cutout(
  sharp(SRC)
    .extract({
      left: Math.round(width * 0.22),
      top: Math.round(height * 0.1),
      width: Math.round(width * 0.56),
      height: Math.round(height * 0.58),
    })
    .resize({ width: 420 }),
  "public/label/mark.webp",
);
