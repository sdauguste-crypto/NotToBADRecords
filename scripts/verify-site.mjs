/**
 * End-to-end verification of the static export in headless Chromium.
 *
 * Usage: npm run build && npm run verify
 * Env:   SHOT_DIR  where screenshots go (default ./verify-shots)
 *        PORT      server port (default 4173)
 */
import { createServer } from "node:http";
import { readFile, mkdir, readdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const ROOT = path.resolve(process.cwd(), "out");
const BASE_PATH = "/NotToBADRecords";
const PORT = Number(process.env.PORT || 4173);
const SHOT_DIR = process.env.SHOT_DIR || "./verify-shots";
const SECTION_IDS = ["hero", "music", "videos", "gallery", "store", "events", "about", "contact"];

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".json": "application/json", ".txt": "text/plain",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ico": "image/x-icon", ".png": "image/png",
};

// Third-party embed domains are expected to be unreachable in the sandbox.
const IGNORABLE = [/open\.spotify\.com/, /youtube-nocookie\.com/, /favicon\.ico/];

function findChromium() {
  const base = "/opt/pw-browsers";
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
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
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
    if (IGNORABLE.some((re) => re.test(text))) return;
    bucket.push(`[console] ${text}`);
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (IGNORABLE.some((re) => re.test(url))) return;
    bucket.push(`[requestfailed] ${url} :: ${req.failure()?.errorText}`);
  });
}

// The WebGL canvas can't be read back after present (preserveDrawingBuffer is
// off), so stage distinctness is judged from the screenshot files instead:
// the sunset stage carries far more color entropy than near-black space, so
// its PNG compresses much larger.

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch({
    executablePath: findChromium(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
  });
  const url = `http://localhost:${PORT}${BASE_PATH}/`;

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
  check("8 sections present in ascending order", order.ascending, JSON.stringify(order.tops));

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
    const eventsBuf = await readFile(path.join(SHOT_DIR, "stage-5-events.png"));
    const ratio = Math.max(heroBuf.length, eventsBuf.length) / Math.min(heroBuf.length, eventsBuf.length);
    const distinct = !heroBuf.equals(eventsBuf) && ratio > 1.05;
    check("journey stages visually distinct (screenshot divergence)", distinct,
      `hero=${heroBuf.length}B events=${eventsBuf.length}B`);
  }
  check("desktop: zero unexpected errors", errors.length === 0, errors.slice(0, 5).join(" | "));
  await page.close();

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
