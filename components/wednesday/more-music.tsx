"use client";

import { useEffect, useState } from "react";

import type { Release } from "@/lib/content";
import { announceMediaOpen, onOtherMediaOpen } from "@/lib/media-bus";
import { cn } from "@/lib/utils";

import { RingedCover } from "./ring";
import { StoreLinks } from "./store-links";

const SOURCE = "wednesday-more-music";

/**
 * Only what the row shows. The page hands over this slim shape, not whole
 * releases, so nothing else (the artist page's ambient audio file among it)
 * is serialized into the /wednesday payload.
 */
export type MoreMusicRelease = Pick<
  Release,
  "id" | "title" | "year" | "coverImage" | "spotifyUrl" | "spotifyEmbedUrl" | "appleMusicUrl"
>;

/** The 480px cut of a cover (scripts/prepare-wednesday-landing.mjs). */
function smallCover(src: string) {
  return src.replace(/\.webp$/, "-480.webp");
}

/**
 * Earlier releases as ringed circles. A tap plays the song right on the
 * page: its Spotify player mounts under the row (only then — no iframe
 * before a tap), one at a time.
 */
export function MoreMusic({ releases }: { releases: MoreMusicRelease[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = releases.find((r) => r.id === activeId);

  useEffect(() => onOtherMediaOpen(SOURCE, () => setActiveId(null)), []);

  const choose = (release: MoreMusicRelease) => {
    if (release.id === activeId) {
      setActiveId(null);
      return;
    }
    announceMediaOpen(SOURCE);
    setActiveId(release.id);
  };

  return (
    <div>
      <ul className="grid grid-cols-3 gap-x-3 sm:gap-x-6">
        {releases.map((release) => {
          const on = release.id === activeId;
          return (
            <li key={release.id}>
              {/* a disclosure: the label stays put, aria-expanded says whether
                  this song's player is open below */}
              <button
                type="button"
                onClick={() => choose(release)}
                disabled={!release.spotifyEmbedUrl}
                aria-expanded={on}
                aria-controls="wed-more-player"
                aria-label={`${release.title} (${release.year}) — play on this page`}
                className="group flex w-full flex-col items-center rounded-2xl px-1 pb-2 pt-1 text-center"
              >
                {/* while another song is open only the art steps back; the
                    title and year keep full contrast */}
                <span
                  className={cn(
                    "relative block w-full transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.03] group-active:scale-[0.97]",
                    active && !on && "opacity-50 group-hover:opacity-100",
                  )}
                >
                  <RingedCover
                    src={release.coverImage ? smallCover(release.coverImage) : ""}
                    active={on}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-chrome transition-colors duration-300",
                      on
                        ? "border-blood bg-blood"
                        : "border-white/30 bg-obsidian/80 group-hover:border-blood group-hover:bg-blood",
                    )}
                  >
                    {on ? (
                      // open below: a close mark, not a "now playing" claim —
                      // the Spotify player starts only when it is pressed
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5" fill="currentColor">
                        <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
                      </svg>
                    )}
                  </span>
                </span>
                {/* the year leads as a small kicker: the years line up across
                    the row, and a title that wraps (ROCKIN WITH MY) runs on
                    below it without leaving a gap under the short ones */}
                <span className="mt-3 text-[0.62rem] tabular-nums tracking-[0.24em] text-steel">
                  {release.year}
                </span>
                <span className="mt-1 text-[0.68rem] font-semibold leading-snug tracking-[0.14em] text-chrome sm:text-xs">
                  {release.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div id="wed-more-player" aria-live="polite">
        {active?.spotifyEmbedUrl ? (
          <div key={active.id} className="wed-rise mt-4">
            <iframe
              src={`${active.spotifyEmbedUrl}?utm_source=generator&theme=0`}
              title={`${active.title} — Simon Auguste on Spotify`}
              width="100%"
              height="152"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className="block w-full rounded-xl border-0 bg-white/[0.04]"
            />
            {/* the same store pills as the single card */}
            <StoreLinks
              title={active.title}
              spotifyUrl={active.spotifyUrl}
              appleMusicUrl={active.appleMusicUrl}
              className="mt-3"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
