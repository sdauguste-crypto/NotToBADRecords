"use client";

import Link from "next/link";

import { splitCountdown, useReleaseClock } from "@/lib/release-clock";
import { WEDNESDAY_PATH, wednesday } from "@/lib/wednesday";

/** The strip above the artist-page nav: a live countdown, then OUT NOW. */
export function ReleaseBanner() {
  const clock = useReleaseClock(wednesday.releaseAt);
  // the static HTML can't know the time; the strip arrives with the clock
  if (clock.now === null) return null;

  const t = splitCountdown(clock.remaining);
  return (
    <Link
      href={WEDNESDAY_PATH}
      className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-xl border border-blood/50 bg-black/60 px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.25em] text-[#ebeef1] backdrop-blur-sm transition-colors hover:border-blood hover:bg-blood/15 sm:text-xs md:mx-auto md:max-w-6xl"
    >
      <span aria-hidden className="animate-led-pulse motion-reduce:animate-none size-1.5 shrink-0 rounded-full bg-blood" />
      {clock.released ? (
        <span>
          WEDNESDAY — OUT NOW <span className="text-blood">· LISTEN →</span>
        </span>
      ) : (
        <span>
          NEW SINGLE · WEDNESDAY{" "}
          <span className="tabular-nums text-blood">
            {t.days}D {t.hours}:{t.minutes}:{t.seconds}
          </span>{" "}
          →
        </span>
      )}
    </Link>
  );
}
