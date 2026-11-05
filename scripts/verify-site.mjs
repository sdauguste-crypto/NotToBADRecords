/**
 * End-to-end verification of the static export in headless Chromium.
 *
 * Usage: npm run build && npm run verify
 * Env:   SHOT_DIR  where screenshots go (default ./verify-shots)
 *        PORT      server port (default 4173)
 *        CHROMIUM  browser to drive (default: Playwright's Chromium, else
 *                  Chrome or Edge on Windows/macOS)
 */
import { createServer } from "node:http";
import { readFile, mkdir, readdir } from "node:fs/promises";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const ROOT = path.resolve(process.cwd(), "out");
const BASE_PATH = "";
const PORT = Number(process.env.PORT || 4173);
const SHOT_DIR = process.env.SHOT_DIR || "./verify-shots";
const SECTION_IDS = ["hero", "music", "videos", "gallery", "store", "events", "about", "contact"];

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".json": "application/json", ".txt": "text/plain",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ico": "image/x-icon", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".webm": "video/webm",
  ".hdr": "application/octet-stream", ".glb": "model/gltf-binary", ".xml": "application/xml",
};

// Third-party embed domains are expected to be unreachable in the sandbox.
const IGNORABLE = [
  /open\.spotify\.com/, /youtube-nocookie\.com/, /i\.ytimg\.com/, /favicon\.ico/,
  /gc\.zgo\.at/, /goatcounter\.com/, /formsubmit\.co/,
];

function findChromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const installed = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].find((p) => existsSync(p));
  const base = "/opt/pw-browsers";
  if (!existsSync(base) && installed) return installed;
  if (existsSync(`${base}/chromium`)) return `${base}/chromium`;
  for (const d of (existsSync(base) ? require("node:fs").readdirSync(base) : [])) {
    const p = `${base}/${d}/chrome-linux/chrome`;
    if (existsSync(p)) return p;
  }
  throw new Error("chromium not found under /opt/pw-browsers");
}

function serve() {
  const server = createServer(async (req, res) => {
    try {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if (!urlPath.startsWith(BASE_PATH)) { res.writeHead(404); res.end(); return; }
      urlPath = urlPath.slice(BASE_PATH.length) || "/";
      let filePath = path.join(ROOT, urlPath);
      if (urlPath.endsWith("/")) filePath = path.join(filePath, "index.html");
      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        const withHtml = `${filePath}.html`;
        filePath = existsSync(withHtml) ? withHtml : path.join(ROOT, "404.html");
      }
      const data = await readFile(filePath);
      const type = MIME[path.extname(filePath)] || "application/octet-stream";
      // Media elements fetch by range; serve them like a real host does,
      // otherwise the audio load aborts and looks like a page error.
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
      if (range) {
        const start = range[1] ? Number(range[1]) : 0;
        const end = range[2] ? Number(range[2]) : data.length - 1;
        res.writeHead(206, {
          "Content-Type": type,
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${start}-${end}/${data.length}`,
          "Content-Length": end - start + 1,
        });
        res.end(data.subarray(start, end + 1));
        return;
      }
      res.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes" });
      res.end(data);
    } catch {
      res.writeHead(404); res.end();
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function collectErrors(page, bucket) {
  page.on("pageerror", (err) => bucket.push(`[pageerror] ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    const srcUrl = msg.location()?.url ?? "";
    if (IGNORABLE.some((re) => re.test(text) || re.test(srcUrl))) return;
    bucket.push(`[console] ${text} (${srcUrl})`);
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (IGNORABLE.some((re) => re.test(url))) return;
    const reason = req.failure()?.errorText ?? "";
    // Media elements cut the transfer once they have what they need
    // (preload="metadata"), which surfaces as an abort — not a failure.
    // Anything else on the audio file (404, bad type) still counts.
    if (/\.(mp3|mp4|webm)$/.test(url) && reason.includes("ERR_ABORTED")) return;
    // next/link prefetches route documents and the router routinely cancels
    // them. Only extensionless same-origin paths are exempt — assets still
    // count, and the explicit navigation checks prove routing really works.
    const pathname = new URL(url).pathname;
    if (
      reason.includes("ERR_ABORTED") &&
      url.startsWith(`http://localhost:${PORT}`) &&
      !/\.\w{2,5}$/.test(pathname)
    ) {
      return;
    }
    bucket.push(`[requestfailed] ${url} :: ${reason}`);
  });
}

// Composited layers (other than the document) taller than 1.3 viewports, read
// from Chromium's layer tree. `read` is false when no tree arrived.
async function tallLayers(ctx, page) {
  const cdp = await ctx.newCDPSession(page);
  let tree = null;
  cdp.on("LayerTree.layerTreeDidChange", (e) => { if (e.layers) tree = e.layers; });
  await cdp.send("DOM.enable");
  await cdp.send("LayerTree.enable");
  // a nudge makes the compositor commit, which sends the tree
  for (let i = 0; i < 20 && !tree; i++) {
    await page.evaluate((dy) => window.scrollBy(0, dy), i % 2 ? -1 : 1);
    await page.waitForTimeout(150);
  }
  const limit = (await page.evaluate(() => window.innerHeight)) * 1.3;
  const tall = [];
  for (const layer of tree ?? []) {
    if (!layer.drawsContent || layer.height <= limit) continue;
    let name = "(no node)";
    if (layer.backendNodeId) {
      const { node } = await cdp.send("DOM.describeNode", { backendNodeId: layer.backendNodeId }).catch(() => ({ node: null }));
      if (node?.nodeName === "#document") continue;
      if (node) {
        const attrs = Object.fromEntries((node.attributes ?? []).reduce((pairs, v, i, all) => (i % 2 ? pairs : [...pairs, [v, all[i + 1]]]), []));
        name = `${node.nodeName}${attrs.id ? `#${attrs.id}` : ""}.${(attrs.class ?? "").slice(0, 50)}`;
      }
    }
    tall.push(`${name} ${Math.round(layer.width)}x${Math.round(layer.height)}`);
  }
  await cdp.detach();
  return { read: !!tree, tall };
}

// The WebGL canvas can't be read back after present (preserveDrawingBuffer is
// off), so stage distinctness is judged from the screenshot files instead:
// the sunset stage carries far more color entropy than near-black space, so
// its PNG compresses much larger.

/** Every text file in the export, so copy rules can be checked site-wide. */
async function exportedText(dir = ROOT) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await exportedText(full)));
    else if (/\.(html|js|json|txt|xml)$/.test(entry.name)) out.push([full, await readFile(full, "utf8")]);
  }
  return out;
}

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });

  // "Silver Surfer" is a Marvel property; the universe is Channel Surfer.
  const surfer = (await exportedText())
    .filter(([, text]) => /silver\s+surfer/i.test(text))
    .map(([file]) => path.relative(ROOT, file));
  check("copy: no Silver Surfer anywhere in the built site", surfer.length === 0, surfer.join(", "));

  const server = await serve();
  const browser = await chromium.launch({
    executablePath: findChromium(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
  });
  const labelUrl = `http://localhost:${PORT}${BASE_PATH}/`;
  // The label landing now owns "/"; the artist journey lives one level down.
  const url = `http://localhost:${PORT}${BASE_PATH}/simon-auguste/`;

  // ---------- Label landing ----------
  console.log("== Label landing (1440x900) ==");
  const labelErrors = [];
  const labelPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  collectErrors(labelPage, labelErrors);
  await labelPage.goto(labelUrl, { waitUntil: "networkidle", timeout: 45000 });

  const lockupOk = await labelPage.evaluate(() => {
    const img = document.querySelector('img[src*="lockup"]');
    return !!img && img.complete && img.naturalWidth > 0;
  });
  check("label: chrome lockup renders", lockupOk);

  const landing = await labelPage.evaluate(() => {
    const text = document.body.innerText;
    return {
      era: /CHANNEL SURFER ERA/.test(text) && !/SILVER SURFER ERA/.test(text),
      noBio: !/built in the Bronx/i.test(text),
      pulsingFooter: [...document.querySelectorAll("footer a.animate-blood-pulse")].length,
    };
  });
  check("label: Channel Surfer era, no bio, footer links pulse",
    landing.era && landing.noBio && landing.pulsingFooter === 3, JSON.stringify(landing));

  // Every brand file the 2026 pack generates must actually be served — a
  // broken path here shows up as a missing logo, not an error.
  const brandOk = await labelPage.evaluate(async (base) => {
    const files = [
      "/label/lockup.webp", "/label/mark.webp", "/label/banner.webp",
      "/label/seal.webp", "/logo-crest.webp",
      "/og-card.jpg", "/icon.png", "/apple-icon.png", "/favicon.ico",
    ];
    const results = await Promise.all(
      files.map(async (f) => [f, (await fetch(`${base}${f}`)).status]),
    );
    return results.filter(([, status]) => status !== 200);
  }, `http://localhost:${PORT}${BASE_PATH}`);
  check("brand: every 2026 logo asset is served", brandOk.length === 0, JSON.stringify(brandOk));

  const tabs = await labelPage.evaluate(() =>
    [...document.querySelectorAll("nav[aria-label='Label and artist'] a")].map((a) => a.textContent.trim()),
  );
  check("label: both tabs present", tabs.length === 2 && tabs.includes("SIMON AUGUSTE"), JSON.stringify(tabs));

  const toArtist = await labelPage.evaluate(() =>
    [...document.querySelectorAll("a")].some((a) => /simon-auguste/.test(a.getAttribute("href") || "")),
  );
  check("label: links through to the artist site", toArtist);

  // Background film loop: present, muted, and actually advancing.
  await labelPage.waitForTimeout(2500);
  const film = await labelPage.evaluate(() => {
    const v = document.querySelector("video");
    if (!v) return { present: false };
    return { present: true, muted: v.muted, playing: !v.paused && v.currentTime > 0.2 };
  });
  check("label: film loop playing muted", film.present && film.muted && film.playing, JSON.stringify(film));
  await labelPage.screenshot({ path: path.join(SHOT_DIR, "label-landing.png"), fullPage: true });

  // The tab must actually land on the journey page.
  await labelPage.click("nav[aria-label='Label and artist'] a[href*='simon-auguste']");
  await labelPage.waitForURL(/simon-auguste/, { timeout: 20000 }).catch(() => {});
  const arrived = await labelPage
    .waitForFunction(() => !!document.getElementById("hero"), { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  check("label: SIMON AUGUSTE tab opens the journey", arrived, labelPage.url());
  check("label: zero unexpected errors", labelErrors.length === 0, labelErrors.slice(0, 5).join(" | "));
  await labelPage.close();

  // ---------- Desktop pass ----------
  console.log("== Desktop (1440x900) ==");
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  collectErrors(page, errors);
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  const ready = await page
    .waitForFunction(() => document.documentElement.dataset.journeyReady, { timeout: 20000 })
    .then((h) => h.jsonValue())
    .catch(() => null);
  check("journey ready flag set", ready === "true" || ready === "fallback", `value=${ready}`);
  if (ready === "fallback") console.log("  WARN: WebGL unavailable — fallback tier active");

  const order = await page.evaluate((ids) => {
    const tops = ids.map((id) => document.getElementById(id)?.offsetTop ?? -1);
    return { tops, ascending: tops.every((t, i) => t >= 0 && (i === 0 || t > tops[i - 1])) };
  }, SECTION_IDS);
  check("9 sections present in ascending order", order.ascending, JSON.stringify(order.tops));

  // ---------- Honest content: nothing invented is on the page ----------
  const content = await page.evaluate(() => {
    const text = document.body.innerText;
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => { try { return JSON.parse(s.textContent); } catch { return null; } });
    const graph = ld[0]?.["@graph"] ?? [];
    return {
      noArchivePlaceholders: !/\/\/ ARCHIVE \d/.test(text),
      noFakeCoords: !/LAT \d/.test(text) && !/NOMINAL/.test(text),
      // teaser must not claim a production status nobody has confirmed
      dropTeaser: /DROP 001/.test(text) && !/\$\d/.test(text) && !/IN PRODUCTION|BEING CUT/i.test(text),
      // innerText carries the CSS uppercase transform; the Sept 19 date must
      // not show anywhere while the show is postponed
      delancey: /the delancey/i.test(text) && /postponed/i.test(text) && !/SEP 19/i.test(text),
      spotifyStat: !/\n—\n/.test(text),
      ldTypes: graph.map((n) => n?.["@type"]),
    };
  });
  check("content: no placeholder captions or fake HUD coords", content.noArchivePlaceholders && content.noFakeCoords);
  check("content: store shows the DROP 001 teaser, no invented prices", content.dropTeaser);
  check("content: Delancey listed as postponed, no stale date", content.delancey);
  check("seo: JSON-LD graph carries the label and the MusicGroup",
    content.ldTypes.includes("Organization") && content.ldTypes.includes("MusicGroup"), JSON.stringify(content.ldTypes));

  // WEDNESDAY is the featured release: Now Playing, first in the catalogue,
  // with its real store links (no download link anywhere)
  const featured = await page.evaluate(() => {
    const music = document.getElementById("music");
    const links = [...(music?.querySelectorAll("a") ?? [])].map((a) => a.href);
    return {
      nowPlaying: music?.querySelector("h3")?.textContent?.trim(),
      firstCard: music?.querySelector("article h3")?.textContent?.trim(),
      spotify: links.includes("https://open.spotify.com/track/13isILcElhB9AhP2koPIsN"),
      apple: links.includes("https://music.apple.com/us/album/wednesday-single/6826547891"),
      noDownload: !document.querySelector('a[href*="wednesday"][download], audio[src*="wednesday"]'),
    };
  });
  check("music: WEDNESDAY is Now Playing and first in the catalogue, with Spotify + Apple Music",
    featured.nowPlaying === "WEDNESDAY" && featured.firstCard === "WEDNESDAY" && featured.spotify && featured.apple && featured.noDownload,
    JSON.stringify(featured));

  const banner = await page
    .waitForFunction(() => {
      const a = [...document.querySelectorAll('a[href="/wednesday/"]')].find((l) => /WEDNESDAY/.test(l.textContent ?? ""));
      return a ? a.textContent.trim() : false;
    }, null, { timeout: 10000 })
    .then((h) => h.jsonValue())
    .catch(() => "");
  check("artist page: the WEDNESDAY banner links to the landing and reads OUT NOW", /OUT NOW/.test(banner), JSON.stringify(banner));

  const canvasCount = await page.evaluate(() => document.querySelectorAll("canvas").length);
  check("WebGL canvas present", ready !== "true" || canvasCount >= 1);

  const navLinks = await page.evaluate(() => document.querySelectorAll("header a[href^='#'], nav a[href^='#']").length);
  check("nav anchor links present", navLinks >= 7, `count=${navLinks}`);

  for (let i = 0; i < SECTION_IDS.length; i++) {
    const id = SECTION_IDS[i];
    await page.evaluate((sid) => document.getElementById(sid)?.scrollIntoView({ behavior: "instant" }), id);
    await page.waitForTimeout(900); // damping settle
    await page.screenshot({ path: path.join(SHOT_DIR, `stage-${i}-${id}.png`) });
  }
  if (ready === "true") {
    const heroBuf = await readFile(path.join(SHOT_DIR, "stage-0-hero.png"));
    const eventsBuf = await readFile(path.join(SHOT_DIR, `stage-${SECTION_IDS.indexOf("events")}-events.png`));
    const distinct = !heroBuf.equals(eventsBuf);
    check("journey stages visually distinct (screenshot divergence)", distinct,
      `hero=${heroBuf.length}B events=${eventsBuf.length}B`);
  }
  // ---------- The arcade was retired: no section, no nav entry ----------
  const arcadeGone = await page.evaluate(
    () =>
      !document.getElementById("games") &&
      ![...document.querySelectorAll("nav a")].some((a) => /GAMES/i.test(a.textContent ?? "")),
  );
  check("arcade removed: no games section or nav link", arcadeGone);

  check("desktop: zero unexpected errors", errors.length === 0, errors.slice(0, 5).join(" | "));
  await page.close();

  // ---------- Secondary pages: /listen/ and /press/ ----------
  console.log("== Listen + Press ==");
  const secErrors = [];
  const secPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  collectErrors(secPage, secErrors);
  await secPage.goto(`http://localhost:${PORT}${BASE_PATH}/listen/`, { waitUntil: "networkidle", timeout: 45000 });
  const listen = await secPage.evaluate(() => ({
    h1: document.querySelector("h1")?.textContent?.trim() ?? "",
    spotify: [...document.querySelectorAll("a[href*='open.spotify.com']")].length,
    apple: [...document.querySelectorAll("a[href*='music.apple.com']")].length,
    list: [...document.querySelectorAll("a[href*='#contact']")].length,
    portrait: (() => { const i = document.querySelector("main img[src*='portrait']"); return !!i && i.complete && i.naturalWidth > 0; })(),
    // the name and ENTER MISSION CONTROL are the ways in, and both pulse
    nameLink: document.querySelector("h1 a")?.getAttribute("href") ?? "",
    pulsing: [...document.querySelectorAll("a.animate-blood-pulse")].filter((a) => /simon-auguste\/$/.test(a.getAttribute("href") ?? "")).length,
    noPromotedSong: !/THE PRINCESS/i.test(document.querySelector("main")?.textContent ?? ""),
    overflow: document.documentElement.scrollWidth,
  }));
  check("listen: smart link renders with Spotify + Apple + list capture",
    listen.h1 === "SIMON AUGUSTE" && listen.spotify >= 1 && listen.apple >= 1 && listen.list >= 1 && listen.portrait,
    JSON.stringify(listen));
  check("listen: portrait instead of a promoted song; name + ENTER MISSION CONTROL pulse to the artist site",
    listen.noPromotedSong && /simon-auguste\/$/.test(listen.nameLink) && listen.pulsing === 2,
    JSON.stringify(listen));
  check("listen: no horizontal overflow on mobile", listen.overflow <= 390 + 1, `scrollWidth=${listen.overflow}`);
  await secPage.screenshot({ path: path.join(SHOT_DIR, "listen.png"), fullPage: true });

  // press kit at phone width first — the booking email must wrap, not scroll
  await secPage.goto(`http://localhost:${PORT}${BASE_PATH}/press/`, { waitUntil: "networkidle", timeout: 45000 });
  const pressOverflow = await secPage.evaluate(() => document.documentElement.scrollWidth);
  check("press: no horizontal overflow on mobile", pressOverflow <= 390 + 1, `scrollWidth=${pressOverflow}`);
  await secPage.setViewportSize({ width: 1440, height: 900 });
  // the seal is lazy and sits under the fold — scroll so it decodes before we
  // assert on it (and so it lands in the screenshot)
  await secPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await secPage.waitForFunction(
    () => [...document.querySelectorAll("main img")].every((i) => i.complete),
    null,
    { timeout: 15000 },
  );
  await secPage.evaluate(() => window.scrollTo(0, 0));
  const press = await secPage.evaluate(() => {
    const text = document.body.innerText;
    const bio = [...document.querySelectorAll("h2")].find((h) => h.textContent.trim() === "BIO")?.nextElementSibling?.textContent ?? "";
    return {
      booking: [...document.querySelectorAll("a[href^='mailto:motivationmusicmgmt']")].length,
      photos: [...document.querySelectorAll("main img")].filter((i) => i.complete && i.naturalWidth > 0).length,
      // letterhead banner + house seal, both from the official pack
      banner: (() => { const i = document.querySelector('img[src*="banner"]'); return !!i && i.complete && i.naturalWidth > 0; })(),
      seal: (() => { const i = document.querySelector('img[src*="seal"]'); return !!i && i.complete && i.naturalWidth > 0; })(),
      bioWords: bio.trim().split(/\s+/).length,
      noNumbers: !/monthly listeners|followers/i.test(text),
      ld: !!document.querySelector('script[type="application/ld+json"]'),
    };
  });
  check("press: booking email, photos, JSON-LD present",
    press.booking >= 2 && press.photos >= 4 && press.ld, JSON.stringify(press));
  check("press: banner letterhead and house seal render", press.banner && press.seal, JSON.stringify(press));
  check("press: bio within 150 words, no audience numbers", press.bioWords > 60 && press.bioWords <= 150 && press.noNumbers, `words=${press.bioWords}`);
  await secPage.screenshot({ path: path.join(SHOT_DIR, "press.png"), fullPage: true });

  const sitemapOk = await secPage.evaluate(async (base) => {
    const r = await fetch(`${base}/sitemap.xml`);
    const body = await r.text();
    return r.ok && /\/listen\//.test(body) && /\/press\//.test(body) && /\/simon-auguste\//.test(body);
  }, `http://localhost:${PORT}${BASE_PATH}`);
  check("seo: sitemap.xml lists every page", sitemapOk);
  check("secondary pages: zero unexpected errors", secErrors.length === 0, secErrors.slice(0, 5).join(" | "));
  await secPage.close();

  // ---------- WEDNESDAY: the post-release landing ----------
  // The site and the repo are public, so the full song must never be in the
  // export: the page carries the 15-second preview, and full listening is
  // Spotify / Apple Music (their players mount only after a tap). The real
  // Kit endpoint is replaced by a stand-in that answers like Kit, so the
  // signup is checked offline: Kit gets the email, the page says "You're in",
  // and that holds on return.
  console.log("== WEDNESDAY landing ==");
  const wedConfig = readFileSync(path.resolve("lib/wednesday.ts"), "utf8");
  const previewUrl = /previewClip:\s*"([^"]+)"/.exec(wedConfig)?.[1];
  const builtSize = (u) => (u && existsSync(path.join(ROOT, u)) ? statSync(path.join(ROOT, u)).size : 0);
  check("wednesday: the 15-second preview is built into the site",
    builtSize(previewUrl) > 50_000 && builtSize(previewUrl) < 600_000,
    `preview=${builtSize(previewUrl)}B — run scripts/prepare-wednesday-audio.mjs on the master`);
  const audioFiles = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i.test(entry.name)) audioFiles.push(path.relative(ROOT, full).split(path.sep).join("/"));
    }
  };
  await walk(path.join(ROOT, "wednesday"));
  check("wednesday: the preview is the only audio file under /wednesday (no full song)",
    audioFiles.length === 1 && "/" + audioFiles[0] === previewUrl, JSON.stringify(audioFiles));
  const fullRefs = (await exportedText())
    .filter(([, text]) => /full-[0-9a-f]{6,}\.mp3|fullSong/.test(text))
    .map(([file]) => path.relative(ROOT, file));
  check("wednesday: nothing in the built site points to a full-song file", fullRefs.length === 0, fullRefs.join(", "));
  // the page and its RSC payloads name no audio but the preview: props handed
  // to client components are serialized whole, so a full Release object would
  // carry the artist page's ambient master along with it
  const wedPayloads = (await readdir(path.join(ROOT, "wednesday")))
    .filter((name) => name === "index.html" || name.endsWith(".txt"));
  const otherAudio = [];
  for (const name of wedPayloads) {
    const text = await readFile(path.join(ROOT, "wednesday", name), "utf8");
    for (const [ref] of text.matchAll(/[\w./-]+\.(?:mp3|m4a|wav|aac|flac|ogg|opus)\b/gi)) {
      if (ref !== previewUrl) otherAudio.push(`${name}: ${ref}`);
    }
  }
  check("wednesday: the page and its payloads name no audio file but the preview",
    wedPayloads.includes("index.html") && otherAudio.length === 0, JSON.stringify({ files: wedPayloads.length, otherAudio }));

  const storeLinks = {
    spotify: /spotify:\s*"([^"]+)"/.exec(wedConfig)?.[1],
    apple: /appleMusic:\s*"([^"]+)"/.exec(wedConfig)?.[1],
  };
  const wedTrackId = /track\/(\w+)/.exec(storeLinks.spotify ?? "")?.[1] ?? "(none)";
  const youreIn = "You're in, Cadet. New drops hit your inbox every Thursday.";
  const wedUrl = `http://localhost:${PORT}${BASE_PATH}/wednesday/`;

  const wErrors = [];
  const wCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const kitPosts = [];
  await wCtx.route("https://app.kit.com/forms/**", async (route) => {
    kitPosts.push(route.request().postData() ?? "");
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: '{"status":"success"}' });
  });
  const wPage = await wCtx.newPage();
  collectErrors(wPage, wErrors);
  await wPage.goto(wedUrl, { waitUntil: "networkidle", timeout: 45000 });
  await wPage.waitForTimeout(1200);
  const audioList = () => wPage.evaluate(() => [...document.querySelectorAll("audio")].map((a) => ({
    src: a.getAttribute("src"), controls: a.controls, download: a.hasAttribute("download"),
  })));
  const onlyPreview = (list) => list.length === 1 && list[0].src === previewUrl && !list[0].controls && !list[0].download;
  const frames = () => wPage.evaluate(() => [...document.querySelectorAll("iframe")].map((f) => f.src));

  const wed = await wPage.evaluate(() => {
    const text = document.body.innerText;
    const hrefs = (sel) => [...document.querySelectorAll(sel)].map((a) => a.href);
    return {
      h1: document.querySelector("h1")?.textContent?.trim(),
      outNow: /OUT NOW/.test(text),
      sections: ["listen", "music", "videos", "shows", "loop"].filter((id) => !document.getElementById(id)),
      single: hrefs("#listen a"),
      hero: hrefs('section[aria-labelledby="wed-title"] a'),
      listenCta: !!document.querySelector('header a[href="#listen"]'),
      // the countdown era is over: no timer, no test-view tag
      noCountdown: !document.querySelector('[role="timer"]') && !/TEST VIEW/.test(text),
      showRows: document.querySelectorAll("#shows li").length,
      emptyShows: /No dates on the board right now/i.test(document.getElementById("shows")?.innerText ?? ""),
      noPostponed: !/delancey/i.test(text) && !/SEP 19/i.test(text),
    };
  });
  check("wednesday: OUT NOW landing with the single, more music, videos, shows and the signup",
    wed.h1 === "WEDNESDAY" && wed.outNow && wed.sections.length === 0 && wed.listenCta && wed.noCountdown,
    JSON.stringify(wed));
  check("wednesday: Spotify + Apple Music carry the exact store links (single card and hero)",
    !!storeLinks.spotify && !!storeLinks.apple &&
      wed.single.includes(storeLinks.spotify) && wed.single.includes(storeLinks.apple) &&
      wed.hero.includes(storeLinks.spotify) && wed.hero.includes(storeLinks.apple),
    JSON.stringify({ single: wed.single, hero: wed.hero }));
  check("wednesday: shows lists only real dates (none postponed), else the honest empty state",
    wed.noPostponed && (wed.showRows > 0 || wed.emptyShows), JSON.stringify({ rows: wed.showRows, empty: wed.emptyShows }));
  const firstAudio = await audioList();
  check("wednesday: the preview is the only <audio> on the page, no controls or download",
    onlyPreview(firstAudio), JSON.stringify(firstAudio));
  check("wednesday: no third-party player (iframe) before any tap", (await frames()).length === 0, JSON.stringify(await frames()));

  // In-app browsers on iPhone crashed on big blur filters; none on this page.
  const heavy = await wPage.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => {
    const cs = getComputedStyle(el);
    const backdrop = cs.backdropFilter || cs.webkitBackdropFilter || "none";
    return /blur/.test(cs.filter) || (backdrop !== "none" && backdrop !== "");
  }).map((el) => `${el.tagName}.${String(el.className).slice(0, 60)}`));
  check("wednesday: no blur or backdrop filters (in-app browser memory)", heavy.length === 0, JSON.stringify(heavy));
  const wOverflow = await wPage.evaluate(() => document.documentElement.scrollWidth);
  check("wednesday: no horizontal overflow on mobile", wOverflow <= 390 + 1, `scrollWidth=${wOverflow}`);

  // A clip-to-text background on anything that wraps the animated panels
  // makes desktop Chrome paint ghost text in the top-left corner.
  const clipped = await wPage.evaluate(() => [...document.querySelectorAll("body *")]
    .filter((el) => getComputedStyle(el).backgroundClip === "text" && el.querySelector(".glass-panel, .wed-glass, button, audio, iframe"))
    .map((el) => `${el.tagName}.${el.className}`.slice(0, 80)));
  check("wednesday: no clip-to-text background around the panels (desktop ghost text)", clipped.length === 0, JSON.stringify(clipped));

  // Once the entrance has played, nothing but the document itself may be
  // composited taller than about a screen, at the top or mid-page: big
  // layers are what run the iPhone in-app browsers out of memory (an
  // entrance animation that holds its last frame keeps its element
  // composited for good; a composited scroller can push everything after it
  // into one page-tall layer).
  await wPage.waitForTimeout(2500);
  const atTop = await tallLayers(wCtx, wPage);
  await wPage.evaluate(() => document.getElementById("videos")?.scrollIntoView({ block: "center", behavior: "instant" }));
  await wPage.waitForTimeout(1500);
  const midPage = await tallLayers(wCtx, wPage);
  await wPage.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  check("wednesday: no composited layer but the page taller than 1.3 screens (top and mid-page)",
    atTop.read && midPage.read && atTop.tall.length === 0 && midPage.tall.length === 0, JSON.stringify({ atTop, midPage }));

  // the full page at phone size: scroll through so every section has faded
  // in, then settle the entrance animations for the still (the full-page
  // capture resizes the viewport, which restarts them)
  const wHeight = await wPage.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= wHeight; y += 400) {
    await wPage.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await wPage.waitForTimeout(80);
  }
  await wPage.waitForTimeout(1000);
  await wPage.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const imgs = await wPage.evaluate(() => [...document.querySelectorAll("img")]
    .filter((i) => !/ytimg/.test(i.src) && !(i.complete && i.naturalWidth > 0)).map((i) => i.getAttribute("src")));
  check("wednesday: every local image loads (covers, ambient, seal)", imgs.length === 0, JSON.stringify(imgs));
  await wPage.addStyleTag({ content: ".wed-rise,.wed-fade{animation:none!important}" });
  await wPage.screenshot({ path: path.join(SHOT_DIR, "wednesday-landing.png"), fullPage: true, animations: "disabled" });

  // the preview plays inline: the ring fills and the hero cover turns
  await wPage.click("#listen button[data-preview-toggle]");
  const played = await wPage
    .waitForFunction(() => { const a = document.querySelector("audio"); return a && !a.paused && a.currentTime > 0.4; }, null, { timeout: 15000 })
    .then(() => true).catch(() => false);
  const ring = await wPage.evaluate(() => ({
    spinning: document.documentElement.hasAttribute("data-wed-playing") &&
      getComputedStyle(document.querySelector(".wed-disc")).animationName === "wed-spin",
    offset: Number(document.querySelector("#listen svg circle[stroke-dasharray]")?.getAttribute("stroke-dashoffset")),
    dash: Number(document.querySelector("#listen svg circle[stroke-dasharray]")?.getAttribute("stroke-dasharray")),
  }));
  check("wednesday: tapping the cover plays the preview inline (ring fills, record turns)",
    played && ring.spinning && ring.offset < ring.dash && onlyPreview(await audioList()), JSON.stringify({ played, ring }));

  // PLAY FULL SONG mounts the WEDNESDAY Spotify player — and stops the preview
  await wPage.click("#listen button[aria-controls='wed-full-song']");
  await wPage.waitForSelector("#wed-full-song iframe", { timeout: 5000 }).catch(() => {});
  await wPage.waitForTimeout(300);
  // the preview stops and rewinds: one player on the card, in one state
  const embed = {
    frames: await frames(),
    ...(await wPage.evaluate(() => {
      const arc = document.querySelector("#listen svg circle[stroke-dasharray]");
      return {
        paused: document.querySelector("audio")?.paused,
        at: document.querySelector("audio")?.currentTime,
        ringEmpty: Number(arc?.getAttribute("stroke-dashoffset")) >= Number(arc?.getAttribute("stroke-dasharray")) - 0.5,
        // at rest the record has no animation at all (one left attached, even
        // paused, keeps it composited); the angle it reached stays put
        discAtRest: getComputedStyle(document.querySelector(".wed-disc")).animationName === "none",
        label: document.querySelector("#listen [data-preview-state]")?.getAttribute("data-preview-state") === "idle",
      };
    })),
  };
  check("wednesday: PLAY FULL SONG loads the WEDNESDAY Spotify embed after the tap (preview stops and resets)",
    embed.frames.length === 1 && embed.frames[0].startsWith(`https://open.spotify.com/embed/track/${wedTrackId}`) &&
      embed.paused && embed.at === 0 && embed.ringEmpty && embed.label && embed.discAtRest,
    JSON.stringify(embed));

  // songs play right on the page, one player at a time
  await wPage.click("#music li button");
  await wPage.waitForSelector("#wed-more-player iframe", { timeout: 5000 }).catch(() => {});
  const moreFrames = await frames();
  check("wednesday: a MORE MUSIC tap plays that song on the page, one player at a time",
    moreFrames.length === 1 && /^https:\/\/open\.spotify\.com\/embed\/track\//.test(moreFrames[0]) && !moreFrames[0].includes(wedTrackId),
    JSON.stringify(moreFrames));
  await wPage.click("#videos li button");
  await wPage.waitForSelector("#videos iframe", { timeout: 5000 }).catch(() => {});
  const videoFrames = await frames();
  check("wednesday: a video tap mounts youtube-nocookie in place of the song player",
    videoFrames.length === 1 && videoFrames[0].startsWith("https://www.youtube-nocookie.com/embed/"), JSON.stringify(videoFrames));

  await wPage.fill("#wednesday-email", "cadet.check@example.com");
  await wPage.click('#loop form button[type="submit"]');
  await wPage.waitForSelector("[role=status]", { timeout: 10000 }).catch(() => {});
  const status = await wPage.evaluate(() => document.querySelector("[role=status]")?.textContent ?? "");
  check(`wednesday: signing up sends the email to Kit and says "You're in" (no full song)`,
    kitPosts.some((b) => b.includes("cadet.check@example.com")) && status.includes(youreIn) &&
      !/unlock/i.test(await wPage.evaluate(() => document.body.innerText)) && onlyPreview(await audioList()),
    JSON.stringify({ kitPosts: kitPosts.length, status }));
  await wPage.reload({ waitUntil: "networkidle" });
  const statusAgain = await wPage.evaluate(() => document.querySelector("[role=status]")?.textContent ?? "");
  check(`wednesday: "You're in" is remembered on return`,
    statusAgain.includes(youreIn) && onlyPreview(await audioList()) && (await frames()).length === 0,
    JSON.stringify({ statusAgain }));
  check("wednesday: zero unexpected errors", wErrors.length === 0, wErrors.slice(0, 5).join(" | "));
  await wCtx.close();

  // Layer size depends on the screen: what fits at 390x844@2 can merge into a
  // two-screen overlap layer on the most common Android width at 3x or 4x
  // (an animation left attached at rest did exactly that). So the same check
  // runs as the Instagram in-app browser on a 360x740 phone, at both scales.
  const IG_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.4.32.98 (iPhone15,3; iOS 17_5; en_US; en; scale=3.00; 1290x2796; 604349315)";
  const layerRuns = [];
  for (const dsf of [3, 4]) {
    const lCtx = await browser.newContext({
      viewport: { width: 360, height: 740 }, deviceScaleFactor: dsf, isMobile: true, hasTouch: true, userAgent: IG_UA,
    });
    // only the site itself: thumbnails and players are not what is measured
    await lCtx.route((u) => !u.href.startsWith(`http://localhost:${PORT}`), (route) => route.abort());
    const lPage = await lCtx.newPage();
    await lPage.goto(wedUrl, { waitUntil: "networkidle", timeout: 45000 });
    await lPage.waitForTimeout(4000); // ring draw-in and head dot settle
    const top = await tallLayers(lCtx, lPage);
    await lPage.evaluate(() => document.getElementById("videos")?.scrollIntoView({ block: "center", behavior: "instant" }));
    await lPage.waitForTimeout(1500);
    const mid = await tallLayers(lCtx, lPage);
    // and while the preview plays, when the record turns
    await lPage.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await lPage.tap("#listen button[data-preview-toggle]");
    await lPage.waitForFunction(() => document.documentElement.hasAttribute("data-wed-playing"), null, { timeout: 10000 }).catch(() => {});
    await lPage.waitForTimeout(1500);
    const playing = { spinning: await lPage.evaluate(() => document.documentElement.hasAttribute("data-wed-playing")), ...(await tallLayers(lCtx, lPage)) };
    layerRuns.push({ at: `360x740@${dsf}`, top, mid, playing });
    await lCtx.close();
  }
  check("wednesday: no tall composited layer on a 360x740 phone at 3x and 4x (Instagram browser: top, mid-page, playing)",
    layerRuns.every((r) => [r.top, r.mid, r.playing].every((m) => m.read && m.tall.length === 0) && r.playing.spinning),
    JSON.stringify(layerRuns));

  // ---------- The release clock still drives the story card + banner ----------
  console.log("== WEDNESDAY story card ==");
  const sErrors = [];
  const sPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  collectErrors(sPage, sErrors);
  await sPage.goto(`${wedUrl}story/?preview=before`, { waitUntil: "networkidle", timeout: 45000 });
  const storyBefore = await sPage.waitForSelector('[role="timer"]', { timeout: 10000 }).then(() => true).catch(() => false);
  await sPage.goto(`${wedUrl}story/?preview=after`, { waitUntil: "networkidle", timeout: 45000 });
  const storyAfter = await sPage
    .waitForFunction(() => document.querySelector("h1")?.textContent?.trim() === "OUT NOW", null, { timeout: 10000 })
    .then(() => true).catch(() => false);
  check("story card: countdown before release, OUT NOW after (?preview switch)", storyBefore && storyAfter, JSON.stringify({ storyBefore, storyAfter }));
  check("story card: zero unexpected errors", sErrors.length === 0, sErrors.slice(0, 5).join(" | "));
  await sPage.close();

  // ---------- Reduced motion ----------
  console.log("== Reduced motion ==");
  const rmErrors = [];
  const rmCtx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const rmPage = await rmCtx.newPage();
  collectErrors(rmPage, rmErrors);
  await rmPage.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await rmPage.waitForFunction(() => document.documentElement.dataset.journeyReady, { timeout: 20000 }).catch(() => {});
  const h1Visible = await rmPage.evaluate(() => {
    const h1 = document.querySelector("#hero h1");
    if (!h1) return false;
    const r = h1.getBoundingClientRect();
    return r.width > 0 && parseFloat(getComputedStyle(h1).opacity) > 0.5;
  });
  check("reduced-motion: hero headline visible", h1Visible);
  await rmPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await rmPage.waitForTimeout(800);
  check("reduced-motion: zero unexpected errors", rmErrors.length === 0, rmErrors.slice(0, 5).join(" | "));
  await rmCtx.close();

  // /wednesday promises everything is off or instant under reduced motion:
  // nothing animates at load, every block is shown once scrolled, and the
  // ring and record stay still.
  const rmwErrors = [];
  const rmwCtx = await browser.newContext({
    reducedMotion: "reduce", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const rmwPage = await rmwCtx.newPage();
  collectErrors(rmwPage, rmwErrors);
  await rmwPage.goto(wedUrl, { waitUntil: "networkidle", timeout: 45000 });
  const rmwLoad = await rmwPage.evaluate(() => document.getAnimations().map((a) => a.animationName || a.transitionProperty));
  const rmwHeight = await rmwPage.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= rmwHeight; y += 500) {
    await rmwPage.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await rmwPage.waitForTimeout(60);
  }
  const rmw = await rmwPage.evaluate(() => ({
    running: document.getAnimations().map((a) => a.animationName || a.transitionProperty),
    dim: [...document.querySelectorAll(".wed-landing [data-reveal]")].filter((el) => getComputedStyle(el).opacity !== "1").map((el) => el.id || el.tagName),
    disc: getComputedStyle(document.querySelector(".wed-disc")).animationName,
    orbit: getComputedStyle(document.querySelector(".wed-orbit")).animationName,
  }));
  check("reduced-motion: /wednesday has no animation, every block shown, ring and record still",
    rmwLoad.length === 0 && rmw.running.length === 0 && rmw.dim.length === 0 && rmw.disc === "none" && rmw.orbit === "none",
    JSON.stringify({ atLoad: rmwLoad, ...rmw }));

  // Keyboard focus on a video tile must show. The tile (and its scroller)
  // clips anything drawn outside it, so the page's outer ring would vanish:
  // tab in from MORE MUSIC and compare the tile's pixels at rest and focused.
  await rmwPage.evaluate(() => document.getElementById("videos")?.scrollIntoView({ block: "center", behavior: "instant" }));
  await rmwPage.waitForFunction(() => [...document.querySelectorAll("#videos img")].every((i) => i.complete), null, { timeout: 10000 }).catch(() => {});
  await rmwPage.waitForTimeout(400);
  const firstTile = rmwPage.locator("#videos li").first();
  const tileShot = () => firstTile.screenshot({ animations: "disabled" });
  const restA = await tileShot();
  const restB = await tileShot();
  await rmwPage.locator("#music li button").last().focus();
  await rmwPage.keyboard.press("Tab");
  await rmwPage.waitForTimeout(500);
  const tileFocus = await rmwPage.evaluate(() => {
    const el = document.activeElement;
    return { onTile: !!el?.closest("#videos li"), focusVisible: !!el?.matches(":focus-visible"), label: el?.getAttribute("aria-label") };
  });
  const focusedTile = await tileShot();
  check("wednesday: keyboard focus on a video tile is visible (the tile's pixels change)",
    tileFocus.onTile && tileFocus.focusVisible && restA.equals(restB) && !focusedTile.equals(restA),
    JSON.stringify({ ...tileFocus, stableAtRest: restA.equals(restB), changed: !focusedTile.equals(restA) }));
  await rmwPage.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());

  // the first screen inside the Instagram/TikTok browsers (about 390x700 on
  // an iPhone, 375x667 on the small ones) reaches the single's play circle
  const fold = [];
  for (const [width, height] of [[390, 700], [375, 667]]) {
    await rmwPage.setViewportSize({ width, height });
    await rmwPage.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await rmwPage.waitForTimeout(200);
    fold.push(await rmwPage.evaluate(([w, h]) => {
      const r = document.querySelector("#listen button[data-preview-toggle]").getBoundingClientRect();
      return { size: `${w}x${h}`, shown: Math.round((Math.min(h, r.bottom) - r.top) / r.height * 100) / 100 };
    }, [width, height]));
  }
  check("wednesday: the single's play circle is at least half on the first screen (390x700, 375x667)",
    fold.every((f) => f.shown >= 0.5), JSON.stringify(fold));
  check("reduced-motion: /wednesday zero unexpected errors", rmwErrors.length === 0, rmwErrors.slice(0, 5).join(" | "));
  await rmwCtx.close();

  // ---------- Mobile ----------
  console.log("== Mobile (390x844) ==");
  const mErrors = [];
  const mCtx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const mPage = await mCtx.newPage();
  collectErrors(mPage, mErrors);
  await mPage.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await mPage.waitForTimeout(1500);
  const overflow = await mPage.evaluate(() => document.documentElement.scrollWidth);
  check("mobile: no horizontal overflow", overflow <= 390 + 1, `scrollWidth=${overflow}`);
  const burger = await mPage.evaluate(() => {
    const b = document.querySelector("button[aria-label*='enu' i], button[aria-expanded]");
    return b ? b.getBoundingClientRect().width > 0 : false;
  });
  check("mobile: hamburger visible", burger);
  await mPage.screenshot({ path: path.join(SHOT_DIR, "mobile-hero.png") });
  await mPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await mPage.waitForTimeout(1200);
  await mPage.screenshot({ path: path.join(SHOT_DIR, "mobile-contact.png") });
  check("mobile: zero unexpected errors", mErrors.length === 0, mErrors.slice(0, 5).join(" | "));
  await mCtx.close();

  // ---------- High tier under load ----------
  // The test machine renders at a few fps, so the quality governor steps the
  // full-effects scene down. Every step re-renders the post-processing, which
  // once took the whole page down (a ref serialized into the effect's key).
  console.log("== High tier quality step-down ==");
  const gErrors = [];
  const gCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const gPage = await gCtx.newPage();
  collectErrors(gPage, gErrors);
  await gPage.goto(`${url}?ntb-tier=high`, { waitUntil: "load", timeout: 45000 });
  await gPage.waitForFunction(() => document.documentElement.dataset.journeyReady, { timeout: 30000 }).catch(() => {});
  const startWidth = await gPage.evaluate(() => document.querySelector("canvas")?.width ?? 0);
  let stepped = false;
  for (let i = 0; i < 12 && !stepped; i++) {
    await gPage.waitForTimeout(2500);
    await gPage.mouse.wheel(0, 700);
    stepped = (await gPage.evaluate(() => document.querySelector("canvas")?.width ?? 0)) < startWidth;
  }
  await gPage.waitForTimeout(6000); // past the second step (lighter effects)
  const survived = await gPage.evaluate(() => !!document.querySelector("canvas") && !document.body.innerText.includes("couldn’t load"));
  check("high tier: governor steps resolution down", stepped, `start=${startWidth}`);
  check("high tier: page survives the step-down", survived && gErrors.length === 0, gErrors.slice(0, 3).join(" | "));
  await gCtx.close();

  // ---------- No-WebGL fallback ----------
  console.log("== No-WebGL fallback ==");
  const fCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await fCtx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (typeof type === "string" && type.includes("webgl")) return null;
      return orig.call(this, type, ...rest);
    };
  });
  const fErrors = [];
  const fPage = await fCtx.newPage();
  collectErrors(fPage, fErrors);
  await fPage.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  const fReady = await fPage
    .waitForFunction(() => document.documentElement.dataset.journeyReady, { timeout: 20000 })
    .then((h) => h.jsonValue())
    .catch(() => null);
  check("fallback: ready flag = fallback", fReady === "fallback", `value=${fReady}`);
  check("fallback: zero unexpected errors", fErrors.length === 0, fErrors.slice(0, 5).join(" | "));
  await fPage.screenshot({ path: path.join(SHOT_DIR, "fallback.png") });
  await fCtx.close();

  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n========== ${results.length - failed.length}/${results.length} checks passed ==========`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
