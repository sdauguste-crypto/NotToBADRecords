"use client";

// One ticking clock for every release surface on the page. It reads the
// server's clock (the Date header of a same-origin HEAD request), so a phone
// set five minutes fast still flips at the real second; if that request fails
// the device clock stands in.
//
// Test switch, on any page that shows the release:
//   ?preview=after   the released page (OUT NOW, streaming buttons)
//   ?preview=before  the countdown, even after release
//   ?preview=flip    ten seconds out — watch the page flip live
//   ?at=2026-10-08T23:59:30-04:00   pretend it is that moment (clock runs on)

import { useEffect, useState, useSyncExternalStore } from "react";

let skew = 0;
let syncing: Promise<void> | null = null;

function syncWithServer(): Promise<void> {
  syncing ??= (async () => {
    try {
      const sent = Date.now();
      const res = await fetch(window.location.pathname, {
        method: "HEAD",
        cache: "no-store",
      });
      const received = Date.now();
      const header = res.headers.get("date");
      if (!header) return;
      // the header is whole seconds, so it sits 0–999ms behind: aim mid-second
      const server = Date.parse(header) + 500;
      const measured = server - (sent + received) / 2;
      // within the header's own precision the device clock is the better one
      if (Number.isFinite(measured) && Math.abs(measured) > 2000) skew = measured;
    } catch {
      // offline or blocked: device clock
    }
  })();
  return syncing;
}

/** Simulated "now" offset from the URL test switch, or null when live. */
function simulatedOffset(releaseAt: number): number | null {
  const params = new URLSearchParams(window.location.search);
  const at = params.get("at");
  if (at && Number.isFinite(Date.parse(at))) return Date.parse(at) - Date.now();
  switch (params.get("preview")) {
    case "after":
      return releaseAt + 1000 - Date.now();
    case "flip":
      return releaseAt - 10_000 - Date.now();
    case "before":
      return Date.now() < releaseAt
        ? 0
        : releaseAt - 2 * 86_400_000 - 3_723_000 - Date.now();
    default:
      return null;
  }
}

// A single 1Hz ticker shared by every subscriber, aligned to the second
// boundary so the digits change together; it re-aligns when the tab returns
// from the background (in-app browsers freeze timers while hidden).
const listeners = new Set<() => void>();
let tick = 0;
let timer: number | undefined;

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(
    () => {
      tick += 1;
      listeners.forEach((l) => l());
      schedule();
    },
    1000 - ((Date.now() + skew) % 1000) + 8,
  );
}

function onVisible() {
  if (document.visibilityState !== "visible") return;
  tick += 1;
  listeners.forEach((l) => l());
  schedule();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    schedule();
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

export type ReleaseClock = {
  /** Corrected current time, or null before the first client render. */
  now: number | null;
  released: boolean;
  /** Milliseconds until release (0 once out). */
  remaining: number;
  /** True when the test switch is driving the clock. */
  simulated: boolean;
};

export function useReleaseClock(
  releaseAt: number,
  initiallyReleased = false,
): ReleaseClock {
  useSyncExternalStore(subscribe, () => tick, () => -1);
  const [mounted, setMounted] = useState(false);
  const [sim, setSim] = useState<number | null>(null);

  useEffect(() => {
    const offset = simulatedOffset(releaseAt);
    setSim(offset);
    setMounted(true);
    if (offset === null) void syncWithServer();
  }, [releaseAt]);

  if (!mounted) {
    return {
      now: null,
      released: initiallyReleased,
      remaining: 0,
      simulated: false,
    };
  }
  const now = Date.now() + (sim ?? skew);
  return {
    now,
    released: now >= releaseAt,
    remaining: Math.max(0, releaseAt - now),
    simulated: sim !== null,
  };
}

/** Remaining ms -> zero-padded days/hours/minutes/seconds. */
export function splitCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    days: pad(Math.floor(total / 86_400)),
    hours: pad(Math.floor((total % 86_400) / 3600)),
    minutes: pad(Math.floor((total % 3600) / 60)),
    seconds: pad(total % 60),
  };
}
