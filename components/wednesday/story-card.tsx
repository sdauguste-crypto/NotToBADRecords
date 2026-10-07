"use client";

import { useEffect, useState } from "react";

import { useReleaseClock } from "@/lib/release-clock";
import { WEDNESDAY_URL_TEXT, wednesday } from "@/lib/wednesday";

import { Countdown } from "./countdown";

const W = 1080;
const H = 1920;

/**
 * A fixed 1080×1920 artboard, scaled to fit whatever screen it's opened on.
 * The top ~250px and bottom ~340px sit under the Instagram/TikTok story
 * chrome, so everything that matters lives between them.
 */
export function StoryCard({ initiallyReleased }: { initiallyReleased: boolean }) {
  const clock = useReleaseClock(wednesday.releaseAt, initiallyReleased);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () =>
      setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const out = clock.released;

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div
        className="relative shrink-0 overflow-hidden bg-obsidian text-center text-chrome"
        style={{ width: W, height: H, transform: `scale(${scale})` }}
      >
        <div
          aria-hidden
          className="absolute left-1/2 top-[38%] h-[1300px] w-[1300px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.28] blur-[160px]"
          style={{ background: "radial-gradient(circle, #b41c25 0%, transparent 70%)" }}
        />
        <div aria-hidden className="scanlines absolute inset-0 opacity-60" />

        <div className="relative flex h-full flex-col items-center px-[90px] pt-[230px]">
          <p className="font-body text-[26px] tracking-[0.45em] text-steel">
            SIMON AUGUSTE
          </p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wednesday.cover.src}
            width={680}
            height={680}
            alt=""
            className="mt-10 h-[680px] w-[680px] rounded-xl border-2 border-white/10 shadow-[0_50px_140px_-30px_rgba(180,28,37,0.8)]"
          />

          <p className="mt-12 text-[30px] uppercase tracking-[0.35em] text-blood">
            {out ? "// OUT NOW" : `// ${wednesday.releaseLabel}`}
          </p>

          {out ? (
            <h1 className="font-display text-neon-pink mt-8 text-[120px] font-black uppercase leading-none">
              OUT NOW
            </h1>
          ) : (
            <Countdown
              size="story"
              remaining={clock.now === null ? null : clock.remaining}
              className="mt-8 w-full"
            />
          )}

          <p className="mt-10 rounded-full border-2 border-blood/70 bg-black/40 px-10 py-4 text-[34px] font-bold tracking-[0.08em] text-[#ebeef1]">
            {WEDNESDAY_URL_TEXT}
          </p>
        </div>
      </div>
    </div>
  );
}
