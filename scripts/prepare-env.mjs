/**
 * Build the scene's environment/reflection map from a source HDRI.
 *
 * Reads assets-inbox/golden_bay_2k.hdr, box-downsamples it to 512x256 (plenty
 * for glossy reflections once PMREM mips it), regrades the blue-hour sky
 * toward the site's magenta/purple palette, and writes an uncompressed RGBE
 * .hdr to public/env/sunset-env.hdr (~512 KB).
 *
 * Usage: node scripts/prepare-env.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { FloatType } from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

const SRC = "assets-inbox/golden_bay_2k.hdr";
const OUT = "public/env/sunset-env.hdr";
const W = 512;
const H = 256;

const buf = await readFile(SRC);
const tex = new RGBELoader()
  .setDataType(FloatType)
  .parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const ch = tex.data.length / (tex.width * tex.height);
const fx = tex.width / W;
const fy = tex.height / H;

// Box-downsample + magenta regrade: fold some blue into red (blue sky ->
// purple) and pull green back (kills cyan); warm golds barely move since
// their blue component is small.
const graded = new Float32Array(W * H * 3);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let sy = Math.floor(y * fy); sy < Math.floor((y + 1) * fy); sy++) {
      for (let sx = Math.floor(x * fx); sx < Math.floor((x + 1) * fx); sx++) {
        const i = (sy * tex.width + sx) * ch;
        r += tex.data[i]; g += tex.data[i + 1]; b += tex.data[i + 2]; n++;
      }
    }
    r /= n; g /= n; b /= n;
    const o = (y * W + x) * 3;
    graded[o] = r + 0.32 * b;
    graded[o + 1] = g * 0.78;
    graded[o + 2] = b;
  }
}

// Flat (non-RLE) RGBE encode — three's HDR loader falls back to flat reading
// when a scanline doesn't carry the RLE signature.
const pixels = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const r = graded[i * 3], g = graded[i * 3 + 1], b = graded[i * 3 + 2];
  const max = Math.max(r, g, b);
  const o = i * 4;
  if (max <= 1e-32) continue; // stays zeroed
  let e = Math.ceil(Math.log2(max));
  let scale = Math.pow(2, -e) * 256;
  if (max * scale >= 256) { e += 1; scale /= 2; }
  pixels[o] = Math.min(255, Math.floor(r * scale));
  pixels[o + 1] = Math.min(255, Math.floor(g * scale));
  pixels[o + 2] = Math.min(255, Math.floor(b * scale));
  pixels[o + 3] = e + 128;
}
// Guard: a first pixel encoding to (2, 2, <no high bit>) would look like an
// RLE scanline header to decoders; nudge the mantissa imperceptibly.
if (pixels[0] === 2 && pixels[1] === 2 && !(pixels[2] & 0x80)) pixels[0] = 3;

const header = `#?RADIANCE\n# Not To B.A.D Records — graded reflection env (golden_bay_2k)\nFORMAT=32-bit_rle_rgbe\n\n-Y ${H} +X ${W}\n`;
await mkdir("public/env", { recursive: true });
await writeFile(OUT, Buffer.concat([Buffer.from(header, "ascii"), pixels]));
console.log(`wrote ${OUT} (${((header.length + pixels.length) / 1024).toFixed(0)} KB)`);
