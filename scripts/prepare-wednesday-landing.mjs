// Small images for the /wednesday landing, cut from the art already in
// public/ (run again whenever a cover or the seal changes):
//   node scripts/prepare-wednesday-landing.mjs
//
// - public/wednesday/ambient.jpg   40px-wide cover. The browser stretches it
//   across the hero, which reads as a soft blur with no blur filter — a large
//   CSS blur is what crashed the Instagram/TikTok in-app browsers on iPhone.
// - public/wednesday/cover-960.jpg the hero disc on phones: at 3x the circle
//   needs about 900 device px, so the 1200px cover only goes to wider screens.
// - public/covers/<name>-480.webp  the small circles: the single card (the
//   WEDNESDAY cut) and MORE MUSIC (the 1200px covers weigh up to 220 KB each
//   for a circle about 110px wide).
// - public/label/seal-288.webp     the footer seal, shown at 96px (3x).
import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const pub = path.join(process.cwd(), "public");
const cover = path.join(pub, "wednesday", "cover.jpg");

// softened at 40px too, so the browser's stretch has no pixel edges to show
await sharp(cover)
  .resize(40, 40)
  .blur(1.4)
  .jpeg({ quality: 72, mozjpeg: true })
  .toFile(path.join(pub, "wednesday", "ambient.jpg"));

await sharp(cover)
  .resize(960, 960)
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.join(pub, "wednesday", "cover-960.jpg"));

const covers = (await readdir(path.join(pub, "covers"))).filter(
  (f) => f.endsWith(".webp") && !f.endsWith("-480.webp"),
);
for (const file of covers) {
  await sharp(path.join(pub, "covers", file))
    .resize(480, 480)
    .webp({ quality: 80 })
    .toFile(path.join(pub, "covers", file.replace(/\.webp$/, "-480.webp")));
}

await sharp(path.join(pub, "label", "seal.webp"))
  .resize(288, 288)
  .webp({ quality: 82, alphaQuality: 90 })
  .toFile(path.join(pub, "label", "seal-288.webp"));

console.log(
  `wrote wednesday/ambient.jpg, wednesday/cover-960.jpg, ${covers.length} covers/*-480.webp and label/seal-288.webp`,
);
