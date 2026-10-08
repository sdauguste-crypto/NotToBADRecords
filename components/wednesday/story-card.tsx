"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { useReleaseClock } from "@/lib/release-clock";
import { WEDNESDAY_URL_TEXT, wednesday } from "@/lib/wednesday";

import { Countdown } from "./countdown";
import { u } from "./story-units";

/**
 * A 1080×1920 card, laid out in "design pixels" (--u) that resolve to real
 * screen pixels, so it is drawn at the size it's shown. It used to be a
 * full-size 1080×1920 board shrunk with a CSS transform — iOS rasterizes that
 * at 3x before shrinking, and with the blurred glow on top the in-app
 * browsers ran out of memory and killed the page.
 *
 * The top ~250 and bottom ~340 design pixels sit under the Instagram/TikTok
 * story chrome, so everything that matters lives between them.
 */
export function StoryCard({ initiallyReleased }: { initiallyReleased: boolean }) {
  const clock = useReleaseClock(wednesday.releaseAt, initiallyReleased);
  // CSS alone sizes the card on first paint; the measured viewport then
  // replaces it, because 100vh in an in-app browser includes its toolbars
  const [unit, setUnit] = useState<string | null>(null);

  useEffect(() => {
    const fit = () =>
      setUnit(`${Math.min(window.innerWidth / 1080, window.innerHeight / 1920)}px`);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const out = clock.released;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black"
      style={{ "--u": unit ?? "min(calc(100vw / 1080), calc(100vh / 1920))" } as CSSProperties}
    >
      <div
        className="relative shrink-0 overflow-hidden bg-obsidian text-center text-chrome"
        style={{ width: u(1080), height: u(1920) }}
      >
        {/* the blood ember: a plain gradient — no blur filter, no extra layer */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 38%, rgba(180,28,37,0.30) 0%, rgba(180,28,37,0.16) 22%, rgba(180,28,37,0.05) 42%, transparent 60%)",
          }}
        />
        <div aria-hidden className="scanlines absolute inset-0 opacity-60" />

        <div
          className="relative flex h-full flex-col items-center"
          style={{ padding: `${u(230)} ${u(90)} 0` }}
        >
          <p
            className="font-body text-steel"
            style={{ fontSize: u(26), letterSpacing: "0.45em" }}
          >
            SIMON AUGUSTE
          </p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wednesday.cover.src}
            width={680}
            height={680}
            alt=""
            className="border-white/10"
            style={{
              marginTop: u(40),
              width: u(680),
              height: u(680),
              borderWidth: u(2),
              borderRadius: u(12),
              boxShadow: `0 ${u(40)} ${u(90)} ${u(-30)} rgba(180,28,37,0.8)`,
            }}
          />

          <p
            className="uppercase text-blood"
            style={{ marginTop: u(48), fontSize: u(30), letterSpacing: "0.35em" }}
          >
            {out ? "// OUT NOW" : `// ${wednesday.releaseLabel}`}
          </p>

          {out ? (
            <h1
              className="font-display text-neon-pink font-black uppercase leading-none"
              style={{ marginTop: u(32), fontSize: u(120) }}
            >
              OUT NOW
            </h1>
          ) : (
            <Countdown
              size="story"
              remaining={clock.now === null ? null : clock.remaining}
              className="w-full"
              style={{ marginTop: u(32) }}
            />
          )}

          <p
            className="rounded-full border-blood/70 bg-black/40 font-bold text-[#ebeef1]"
            style={{
              marginTop: u(40),
              padding: `${u(16)} ${u(40)}`,
              borderWidth: u(2),
              fontSize: u(34),
              letterSpacing: "0.08em",
            }}
          >
            {WEDNESDAY_URL_TEXT}
          </p>
        </div>
      </div>
    </div>
  );
}
