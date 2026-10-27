// WEDNESDAY audio for the site, from the master:
//   - the public preview: 15 s from 0:13 (0:13–0:28), short fades
// and writes the song's real length into the WEDNESDAY release entry.
// The full song never goes on the site (the site and the repo are public);
// this also deletes any old full-song file left in public/wednesday.
//
//   node scripts/prepare-wednesday-audio.mjs "C:\path\to\Wednesday Final Master 7.wav"
//
// Needs ffmpeg: set FFMPEG to its path, or have it on PATH
// (Windows: winget install Gyan.FFmpeg, then open a new terminal).
// The master itself is never copied into the repo.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const PREVIEW_START = 13; // seconds — the owner's pick
const PREVIEW_LENGTH = 15;

const master = process.argv[2];
if (!master || !existsSync(master)) {
  console.error('usage: node scripts/prepare-wednesday-audio.mjs "<path to the master>"');
  process.exit(1);
}

const ffmpeg = process.env.FFMPEG || "ffmpeg";
const run = (args) => spawnSync(ffmpeg, ["-hide_banner", "-y", ...args], { encoding: "utf8" });
if (run(["-version"]).error) {
  console.error("ffmpeg not found. Install it (Windows: winget install Gyan.FFmpeg) or set FFMPEG to its path.");
  process.exit(1);
}

// where the site expects the files (lib/wednesday.ts is the source of truth)
const root = process.cwd();
const config = readFileSync(path.join(root, "lib", "wednesday.ts"), "utf8");
const previewUrl = /previewClip:\s*"([^"]+)"/.exec(config)?.[1];
if (!previewUrl) throw new Error("previewClip not found in lib/wednesday.ts");
const out = (url) => path.join(root, "public", ...url.split("/").filter(Boolean));

// length of the master
const probe = run(["-i", master]);
const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(probe.stderr);
if (!m) throw new Error(`could not read the length of ${master}`);
const seconds = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
if (seconds < PREVIEW_START + PREVIEW_LENGTH) throw new Error(`master is only ${seconds}s long`);

function check(result, what) {
  if (result.status !== 0) {
    console.error(result.stderr);
    throw new Error(`ffmpeg failed making the ${what}`);
  }
}

// preview: input-side seek is sample-accurate for audio; the fades are on the
// clip's own timeline (0 = 0:13)
check(
  run([
    "-ss", String(PREVIEW_START), "-t", String(PREVIEW_LENGTH), "-i", master,
    "-af", `afade=t=in:st=0:d=0.03,afade=t=out:st=${PREVIEW_LENGTH - 1.2}:d=1.2`,
    "-map_metadata", "-1", "-vn", "-ac", "2", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "160k",
    out(previewUrl),
  ]),
  "preview",
);

// no full song on the site: remove any old full-song file
const dir = path.dirname(out(previewUrl));
for (const f of readdirSync(dir)) {
  if (/^full-.*\.mp3$/.test(f)) {
    rmSync(path.join(dir, f));
    console.log(`removed public/wednesday/${f} (the full song never goes on the site)`);
  }
}

// the release entry shows the real length on the Now Playing bar
const whole = Math.round(seconds);
const length = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
const contentPath = path.join(root, "lib", "content.ts");
const content = readFileSync(contentPath, "utf8");
const entry = /(id: "rel-wednesday",[\s\S]*?duration: ")(\d+:\d{2})(")/;
if (!entry.test(content)) throw new Error("WEDNESDAY entry (duration) not found in lib/content.ts");
writeFileSync(contentPath, content.replace(entry, `$1${length}$3`));

const size = (url) => `${(statSync(out(url)).size / 1048576).toFixed(1)} MB`;
console.log(`master: ${path.basename(master)} (${length})`);
console.log(`preview → public${previewUrl} (0:13–0:28, ${size(previewUrl)})`);
console.log(`lib/content.ts: WEDNESDAY duration = ${length}`);
