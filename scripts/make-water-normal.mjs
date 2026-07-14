/**
 * Derive a tangent-space normal map from the water ripple photo.
 *
 * Reads assets-inbox/Water 0341.jpg, runs a Sobel filter over its luminance
 * (height-from-brightness), and writes public/textures/water-normal.webp.
 * The shader samples it with mirrored wrapping, so the photo does not need
 * to tile seamlessly.
 *
 * Usage: node scripts/make-water-normal.mjs
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const SRC = "assets-inbox/Water 0341.jpg";
const OUT = "public/textures/water-normal.webp";
const SIZE = 512;
const STRENGTH = 2.2;

const { data } = await sharp(SRC)
  .resize(SIZE, SIZE, { fit: "cover" })
  .grayscale()
  .blur(0.6) // knock out JPEG grain before differentiating
  .raw()
  .toBuffer({ resolveWithObject: true });

const h = (x, y) => {
  const cx = Math.min(SIZE - 1, Math.max(0, x));
  const cy = Math.min(SIZE - 1, Math.max(0, y));
  return data[cy * SIZE + cx] / 255;
};

const out = Buffer.alloc(SIZE * SIZE * 3);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx =
      (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1)) -
      (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1));
    const dy =
      (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1)) -
      (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1));
    const nx = -dx * STRENGTH;
    const ny = -dy * STRENGTH;
    const len = Math.sqrt(nx * nx + ny * ny + 1);
    const o = (y * SIZE + x) * 3;
    out[o] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
    out[o + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
    out[o + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
  }
}

await mkdir("public/textures", { recursive: true });
await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 3 } })
  .webp({ quality: 90 })
  .toFile(OUT);
console.log(`wrote ${OUT}`);
