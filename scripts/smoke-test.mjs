#!/usr/bin/env node
/**
 * Smoke test for the NotToBAD Records site.
 *
 * Assumes `vite preview` (npm run preview) is already serving the built site
 * at http://localhost:4173/NotToBADRecords/ (override with BASE_URL env var).
 *
 * Uses playwright-core with the system chromium under /opt/pw-browsers
 * (no browser download required).
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173/NotToBADRecords/';
const SHOT_DIR = process.env.SHOT_DIR || path.resolve('./smoke-shots');
const VIEWPORT = { width: 1440, height: 900 };
const SECTION_IDS = ['hero', 'music', 'videos', 'gallery', 'store', 'events', 'about', 'contact'];

const passes = [];
const failures = [];

function pass(msg) {
  passes.push(msg);
  console.log(`  PASS  ${msg}`);
}

function fail(msg) {
  failures.push(msg);
  console.error(`  FAIL  ${msg}`);
}

function warn(msg) {
  console.warn(`  WARN  ${msg}`);
}

// ---------------------------------------------------------------------------
// Resolve chromium executable under /opt/pw-browsers
// ---------------------------------------------------------------------------
function isExecutableFile(p) {
  try {
    const st = fs.statSync(p); // statSync follows symlinks
    if (!st.isFile()) return false;
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveChromium() {
  const root = '/opt/pw-browsers';
  const candidates = [];

  // Direct entry: /opt/pw-browsers/chromium (file or symlink to the binary)
  candidates.push(path.join(root, 'chromium'));

  // Glob-ish: /opt/pw-browsers/chromium*/chrome-linux*/chrome
  let entries = [];
  try {
    entries = fs.readdirSync(root);
  } catch {
    entries = [];
  }
  for (const entry of entries) {
    if (!entry.startsWith('chromium')) continue;
    const dir = path.join(root, entry);
    let stat;
    try {
      stat = fs.statSync(dir);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    let subdirs = [];
    try {
      subdirs = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const sub of subdirs) {
      if (!sub.startsWith('chrome-linux')) continue;
      candidates.push(path.join(dir, sub, 'chrome'));
      candidates.push(path.join(dir, sub, 'headless_shell'));
    }
  }

  for (const candidate of candidates) {
    if (isExecutableFile(candidate)) return candidate;
  }

  let listing = '(could not read /opt/pw-browsers)';
  try {
    listing = fs.readdirSync(root).join('\n  ');
  } catch {
    // keep default message
  }
  console.error(
    'ERROR: No chromium executable found under /opt/pw-browsers.\n' +
      'Looked for /opt/pw-browsers/chromium and /opt/pw-browsers/chromium*/chrome-linux*/chrome.\n' +
      `Contents of /opt/pw-browsers:\n  ${listing}`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Wait for the preview server to be reachable (up to 10s)
// ---------------------------------------------------------------------------
async function waitForServer(url, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok || (res.status >= 300 && res.status < 400)) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error(
    `ERROR: Preview server not reachable at ${url} after ${timeoutMs / 1000}s.\n` +
      `Last error: ${lastError?.message ?? 'unknown'}\n` +
      'Start it with: npm run build && npm run preview'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Error collection helpers
// ---------------------------------------------------------------------------
function attachCollectors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore favicon noise
      if (/favicon/i.test(text)) return;
      consoleErrors.push(text);
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });
  page.on('requestfailed', (req) => {
    if (/favicon/i.test(req.url())) return;
    failedRequests.push(`${req.url()} — ${req.failure()?.errorText ?? 'unknown'}`);
  });

  return { consoleErrors, pageErrors, failedRequests };
}

function reportCollected(label, { consoleErrors, pageErrors, failedRequests }) {
  const problems = [];
  if (consoleErrors.length) {
    problems.push(`console errors (${consoleErrors.length}):\n    - ${consoleErrors.join('\n    - ')}`);
  }
  if (pageErrors.length) {
    problems.push(`page errors (${pageErrors.length}):\n    - ${pageErrors.join('\n    - ')}`);
  }
  if (failedRequests.length) {
    problems.push(`failed requests (${failedRequests.length}):\n    - ${failedRequests.join('\n    - ')}`);
  }
  if (problems.length) {
    fail(`${label}: runtime errors detected\n  ${problems.join('\n  ')}`);
  } else {
    pass(`${label}: no console errors, page errors, or failed requests`);
  }
}

// ---------------------------------------------------------------------------
// Smooth-ish scroll that gives Lenis/ScrollTrigger time to react
// ---------------------------------------------------------------------------
async function scrollThroughPage(page, steps = 30) {
  const total = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  const stepSize = Math.max(1, Math.ceil(total / steps));
  for (let i = 1; i <= steps; i++) {
    const target = Math.min(total, i * stepSize);
    await page.evaluate((y) => {
      // Both mechanisms: wheel event (for Lenis) and a hard scrollTo jump
      // (so native scroll position + ScrollTriggers advance even if smooth
      // scrolling is intercepting wheel input).
      window.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 300, bubbles: true, cancelable: true })
      );
      window.scrollTo(0, y);
      window.scrollBy(0, 0);
    }, target);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(500);
}

async function scrollToTop(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
}

async function scrollToFraction(page, fraction) {
  await page.evaluate((f) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(max * f));
  }, fraction);
  await page.waitForTimeout(800);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const executablePath = resolveChromium();
  console.log(`Chromium: ${executablePath}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Shots:    ${SHOT_DIR}`);

  fs.mkdirSync(SHOT_DIR, { recursive: true });

  console.log('\nWaiting for preview server...');
  await waitForServer(BASE_URL);
  console.log('Server reachable.\n');

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    // -----------------------------------------------------------------
    // Page 1: default motion, desktop viewport
    // -----------------------------------------------------------------
    console.log('== Page 1: default motion (1440x900) ==');
    const ctx1 = await browser.newContext({ viewport: VIEWPORT });
    const page1 = await ctx1.newPage();
    const collected = attachCollectors(page1);

    await page1.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });

    // Sections exist, in DOM order
    const sectionOrder = await page1.evaluate((ids) => {
      const found = ids.map((id) => document.getElementById(id));
      const missing = ids.filter((_, i) => !found[i]);
      if (missing.length) return { ok: false, missing };
      const all = Array.from(document.querySelectorAll('[id]'));
      const positions = found.map((el) => all.indexOf(el));
      const ordered = positions.every((p, i) => i === 0 || p > positions[i - 1]);
      return { ok: ordered, missing: [], positions };
    }, SECTION_IDS);

    if (!sectionOrder.ok && sectionOrder.missing.length) {
      fail(`Missing sections: ${sectionOrder.missing.map((s) => '#' + s).join(', ')}`);
    } else if (!sectionOrder.ok) {
      fail(`Sections present but not in expected DOM order (${SECTION_IDS.map((s) => '#' + s).join(' -> ')})`);
    } else {
      pass(`All 8 sections present in order: ${SECTION_IDS.map((s) => '#' + s).join(', ')}`);
    }

    // canvas#scene + WebGL tier
    const canvasInfo = await page1.evaluate(() => {
      const canvas = document.querySelector('canvas#scene');
      if (!canvas) return { exists: false };
      return {
        exists: true,
        width: canvas.width,
        noWebgl: document.documentElement.classList.contains('no-webgl'),
      };
    });

    if (!canvasInfo.exists) {
      fail('canvas#scene not found in DOM');
    } else {
      pass('canvas#scene exists');
      if (canvasInfo.noWebgl) {
        warn('html.no-webgl is set — WebGL unavailable under swiftshader; running in graceful fallback tier (not a failure)');
      } else if (canvasInfo.width > 0) {
        pass(`WebGL tier active (no-webgl absent, canvas width=${canvasInfo.width})`);
      } else {
        warn('no-webgl absent but canvas width is 0 — renderer may not have sized the canvas yet');
      }
    }

    // Screenshot: top
    await scrollToTop(page1);
    await page1.screenshot({ path: path.join(SHOT_DIR, '01-top.png') });
    pass('Screenshot 01-top.png');

    // Scroll through the whole page (fires ScrollTriggers)
    await scrollThroughPage(page1, 30);

    // Screenshot: bottom (we're at the bottom after the scroll run)
    await page1.screenshot({ path: path.join(SHOT_DIR, '03-bottom.png') });
    pass('Screenshot 03-bottom.png');

    // Screenshot: middle
    await scrollToFraction(page1, 0.5);
    await page1.screenshot({ path: path.join(SHOT_DIR, '02-middle.png') });
    pass('Screenshot 02-middle.png');

    // Back to top, then check collected errors
    await scrollToTop(page1);
    reportCollected('Page 1', collected);

    await ctx1.close();

    // -----------------------------------------------------------------
    // Page 2: prefers-reduced-motion
    // -----------------------------------------------------------------
    console.log('\n== Page 2: reduced motion ==');
    const ctx2 = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' });
    const page2 = await ctx2.newPage();
    const collected2 = attachCollectors(page2);

    await page2.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await page2.waitForTimeout(1000);

    const h1 = page2.locator('#hero h1').first();
    const h1Count = await h1.count();
    if (h1Count === 0) {
      fail('Reduced motion: #hero h1 not found');
    } else {
      const box = await h1.boundingBox();
      const opacity = await h1.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
      if (box && opacity > 0.5) {
        pass(`Reduced motion: hero h1 visible (opacity=${opacity})`);
      } else {
        fail(`Reduced motion: hero h1 not visible (boundingBox=${box ? 'present' : 'null'}, opacity=${opacity})`);
      }
    }

    if (collected2.pageErrors.length) {
      fail(`Reduced motion: page errors:\n    - ${collected2.pageErrors.join('\n    - ')}`);
    } else {
      pass('Reduced motion: no page errors');
    }

    await ctx2.close();

    // -----------------------------------------------------------------
    // Mobile screenshot
    // -----------------------------------------------------------------
    console.log('\n== Mobile screenshot (390x844) ==');
    const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page3 = await ctx3.newPage();
    await page3.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await page3.waitForTimeout(1000);
    await page3.screenshot({ path: path.join(SHOT_DIR, '04-mobile.png') });
    pass('Screenshot 04-mobile.png');
    await ctx3.close();
  } finally {
    await browser.close();
  }

  // -----------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------
  console.log('\n========== SMOKE TEST SUMMARY ==========');
  for (const p of passes) console.log(`  PASS  ${p}`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(`\n${passes.length} passed, ${failures.length} failed`);

  if (failures.length > 0) {
    process.exit(1);
  }
  console.log('Smoke test OK.');
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
