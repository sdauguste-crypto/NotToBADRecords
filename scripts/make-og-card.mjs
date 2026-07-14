/**
 * Build the social share card (Open Graph image) from the official logo.
 *
 * Centers NTB-3a-obsidian-stacked.jpg on a 1200x630 canvas with a
 * blurred/darkened blow-up of itself filling the sides — the classic
 * letterbox treatment, so the card reads as one seamless dark panel.
 *
 * Usage: node scripts/make-og-card.mjs
 */
import sharp from "sharp";

const SRC = "assets-inbox/NTB-3a-obsidian-stacked.jpg";
const OUT = "public/og-card.jpg";
const W = 1200;
const H = 630;

const backdrop = await sharp(SRC)
  .resize(W, H, { fit: "cover" })
  .blur(40)
  .modulate({ brightness: 0.55 })
  .toBuffer();

const logo = await sharp(SRC)
  .resize({ height: H - 40, fit: "inside" })
  .toBuffer();

const info = await sharp(backdrop)
  .composite([{ input: logo, gravity: "center" }])
  .jpeg({ quality: 90 })
  .toFile(OUT);
console.log(`wrote ${OUT} (${(info.size / 1024).toFixed(0)} KB)`);
