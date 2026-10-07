// WEDNESDAY artwork: the cover for the page, and a 1200×630 share card (the
// square cover on its own blurred, darkened field — the cover already carries
// the title, so the card needs no type of its own).
//   node scripts/prepare-wednesday.mjs path/to/cover.jpg
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) throw new Error("usage: node scripts/prepare-wednesday.mjs <cover image>");
const out = path.join(process.cwd(), "public", "wednesday");
await mkdir(out, { recursive: true });

await sharp(source)
  .resize(1200, 1200, { fit: "cover" })
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(path.join(out, "cover.jpg"));

const field = await sharp(source)
  .resize(1200, 630, { fit: "cover" })
  .blur(40)
  .modulate({ brightness: 0.4 })
  .toBuffer();
const art = await sharp(source).resize(560, 560).toBuffer();
await sharp(field)
  .composite([{ input: art, top: 35, left: 320 }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(path.join(out, "og.jpg"));

console.log("wrote public/wednesday/cover.jpg and og.jpg");
