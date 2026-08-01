/**
 * Transcode the label-page background loop to web-safe H.264.
 *
 * The uploaded master is HEVC in a QuickTime container, which most non-Safari
 * browsers refuse to play. This re-encodes it with the bundled ffmpeg.wasm
 * (no system ffmpeg in the build sandbox):
 *
 *   assets-inbox/<SRC>  ->  public/label/bg-loop.webm  (VP9 — Chrome/Firefox)
 *                       ->  public/label/bg-loop.mp4   (H.264 — Safari/iOS)
 *                       ->  public/label/bg-poster.webp (first-frame poster)
 *
 * Usage: node scripts/prepare-label-video.mjs
 * Deps:  npm i --no-save @ffmpeg/ffmpeg@0.11.6 @ffmpeg/core@0.11.0
 */

// Node >=18 ships a global fetch that breaks the emscripten loader's local
// file path; removing it forces the fs.readFileSync fallback.
delete globalThis.fetch;
delete globalThis.Request;
delete globalThis.Response;
delete globalThis.Headers;

const { createFFmpeg } = await import("@ffmpeg/ffmpeg");
const { readFile, writeFile, mkdir } = await import("node:fs/promises");

const SRC =
  "assets-inbox/hf_20260801_064333_8bc00a5a-c587-4e04-be51-b128c15115aa (1).MP4";

const ffmpeg = createFFmpeg({ log: false });
let lastLog = "";
ffmpeg.setLogger(({ message }) => {
  if (/frame=/.test(message)) lastLog = message;
});
const tick = setInterval(() => {
  if (lastLog) console.log(" ", lastLog.trim().slice(0, 90));
}, 15000);

await ffmpeg.load();
ffmpeg.FS("writeFile", "in.mp4", await readFile(SRC));

// yuv420p is required for broad playback; faststart puts the index up front
// so the loop starts before the file finishes downloading.
// -threads 1: the pthread-backed x264 path crashes in this wasm build
// ("null function or function signature mismatch"); single-thread is stable.
await ffmpeg.run(
  "-threads", "1",
  "-i", "in.mp4",
  "-an",
  "-c:v", "libx264",
  "-threads", "1",
  "-preset", "veryfast",
  "-crf", "24",
  "-vf", "scale=1440:-2,format=yuv420p",
  "-movflags", "+faststart",
  "out.mp4",
);
// VP9 twin: realtime deadline keeps the wasm encode tractable.
await ffmpeg.run(
  "-threads", "1",
  "-i", "in.mp4",
  "-an",
  "-c:v", "libvpx-vp9",
  "-threads", "1",
  "-b:v", "0",
  "-crf", "34",
  "-deadline", "realtime",
  "-cpu-used", "5",
  "-vf", "scale=1440:-2,format=yuv420p",
  "out.webm",
);
await ffmpeg.run("-i", "in.mp4", "-frames:v", "1", "-vf", "scale=1440:-2", "poster.png");
clearInterval(tick);

await mkdir("public/label", { recursive: true });
const video = ffmpeg.FS("readFile", "out.mp4");
await writeFile("public/label/bg-loop.mp4", video);
console.log(`bg-loop.mp4: ${(video.length / 1024 / 1024).toFixed(1)} MB`);
const webm = ffmpeg.FS("readFile", "out.webm");
await writeFile("public/label/bg-loop.webm", webm);
console.log(`bg-loop.webm: ${(webm.length / 1024 / 1024).toFixed(1)} MB`);

const sharp = (await import("sharp")).default;
const posterInfo = await sharp(ffmpeg.FS("readFile", "poster.png"))
  .webp({ quality: 78 })
  .toFile("public/label/bg-poster.webp");
console.log(`bg-poster.webp: ${(posterInfo.size / 1024).toFixed(0)} KB`);
process.exit(0);
