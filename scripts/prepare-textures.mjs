/**
 * Convert uploaded texture photos into web-ready assets.
 *
 *  - assets-inbox/cloudy-sky-dawn.jpg  -> public/textures/sunset-clouds.webp
 *      photographic clouds blended into the stage-A sky dome
 *  - assets-inbox/c515e304... .jpg     -> public/textures/grunge-scratches.webp
 *      global analog-grit overlay (paired with the CRT scanlines)
 *  - assets-inbox/867924570... .jpg    -> public/textures/diamond-plate.webp
 *      CARGO BAY product-card backdrop
 *
 * Usage: node scripts/prepare-textures.mjs
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

await mkdir("public/textures", { recursive: true });

const jobs = [
  {
    src: "assets-inbox/cloudy-sky-dawn.jpg",
    out: "public/textures/sunset-clouds.webp",
    resize: { width: 2048, height: 1024, fit: "cover" },
    quality: 80,
  },
  {
    src: "assets-inbox/c515e304d3bdb445d869a6646893e653.jpg",
    out: "public/textures/grunge-scratches.webp",
    resize: { width: 700, fit: "inside" },
    quality: 50,
    grayscale: true,
  },
  {
    src: "assets-inbox/867924570e56c92bbf754e71b0d0a5b1.jpg",
    out: "public/textures/diamond-plate.webp",
    resize: { width: 800, fit: "inside" },
    quality: 75,
  },
];

for (const { src, out, resize, quality, grayscale } of jobs) {
  let img = sharp(src).resize(resize);
  if (grayscale) img = img.grayscale();
  const info = await img.webp({ quality }).toFile(out);
  console.log(`wrote ${out} (${(info.size / 1024).toFixed(0)} KB)`);
}
