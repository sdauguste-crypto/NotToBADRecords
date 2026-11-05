"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import type { Video } from "@/lib/content";
import { announceMediaOpen, onOtherMediaOpen } from "@/lib/media-bus";
import { cn } from "@/lib/utils";

const SOURCE = "wednesday-videos";

/** "FALL IN LOVE (OFFICIAL MUSIC VIDEO)" -> title + kind. */
function splitTitle(full: string) {
  const match = /^(.*?)\s*\((.+)\)\s*$/.exec(full);
  return match ? { name: match[1], kind: match[2] } : { name: full, kind: "" };
}

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === "prev" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

/**
 * Swipeable video row (scroll-snap, no library). Thumbnails come from
 * YouTube's image CDN and load lazily; the player itself (youtube-nocookie)
 * mounts only after a tap, one at a time.
 */
export function VideoCarousel({ videos, heading }: { videos: Video[]; heading: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => onOtherMediaOpen(SOURCE, () => setPlayingId(null)), []);

  // the tapped button is replaced by the player: hand focus to the player so
  // keyboard and screen-reader users stay where they were
  useEffect(() => {
    if (!playingId) return;
    track.current?.querySelector<HTMLIFrameElement>(`iframe[data-video="${playingId}"]`)?.focus();
  }, [playingId]);

  // a thumbnail that failed before hydration never reaches onError: hide it
  // so the tile shows its own surface instead of a broken-image glyph
  useEffect(() => {
    track.current?.querySelectorAll("img").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) img.style.visibility = "hidden";
    });
  }, []);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [measure]);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    const card = el?.querySelector("li");
    if (!el || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * (card.getBoundingClientRect().width + 12), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div>
      <div className="mb-4 flex min-h-11 items-center justify-between gap-4">
        {heading}
        <div className="hidden gap-2 sm:flex">
        {(["prev", "next"] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => step(dir === "prev" ? -1 : 1)}
            disabled={dir === "prev" ? edges.start : edges.end}
            aria-label={dir === "prev" ? "Previous video" : "Next video"}
            className="flex size-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-chrome transition-colors duration-300 hover:border-blood hover:bg-blood disabled:pointer-events-none disabled:opacity-35"
          >
            <Arrow dir={dir} />
          </button>
        ))}
        </div>
      </div>

      <ul
        ref={track}
        aria-label="Videos"
        className={cn(
          "wed-noscrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:scroll-px-0 sm:px-0",
          !edges.start && "wed-peek-start",
          !edges.end && "wed-peek-end",
        )}
      >
        {videos.map((video) => {
          const { name, kind } = splitTitle(video.title);
          const playing = video.id === playingId;
          return (
            <li key={video.id} className="w-[84%] shrink-0 snap-start sm:w-[88%]">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#131218] bg-[radial-gradient(90%_80%_at_50%_0%,rgba(180,28,37,0.2),rgba(180,28,37,0)_70%)]">
                {playing ? (
                  <iframe
                    data-video={video.id}
                    src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&playsinline=1&rel=0`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      announceMediaOpen(SOURCE);
                      setPlayingId(video.id);
                    }}
                    aria-label={`Play video: ${name}${kind ? ` — ${kind.toLowerCase()}` : ""}`}
                    // the tile clips anything outside it (and so does the
                    // scroller), so the page's outer focus ring would vanish:
                    // the ring is drawn inside instead (last child, on top)
                    className="group absolute inset-0 flex items-center justify-center rounded-2xl focus-visible:outline-none"
                  >
                    {/* hqdefault is 4:3 with bars; the 16:9 crop drops them */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                      width={480}
                      height={360}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        event.currentTarget.style.visibility = "hidden";
                      }}
                      className="absolute inset-0 h-full w-full object-cover opacity-85 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100"
                    />
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/10 to-obsidian/20" />
                    <span
                      aria-hidden
                      className={cn(
                        // on phones the tile is short: a smaller button, lifted
                        // clear of the title block
                        "relative flex size-12 -translate-y-3 items-center justify-center rounded-full border-2 border-blood bg-obsidian/55 text-chrome shadow-[0_0_0_5px_rgba(180,28,37,0.18)] transition-[background-color,scale] duration-300 sm:size-14 sm:translate-y-0 sm:shadow-[0_0_0_6px_rgba(180,28,37,0.18)]",
                        "group-hover:scale-105 group-hover:bg-blood group-focus-visible:scale-105 group-focus-visible:bg-blood group-active:scale-95",
                      )}
                    >
                      <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 sm:h-5 sm:w-5" fill="currentColor">
                        <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
                      </svg>
                    </span>
                    <span className="absolute inset-x-0 bottom-0 px-4 pb-3 text-left sm:pb-3.5">
                      <span className="block truncate text-[0.8rem] font-semibold tracking-[0.12em] text-chrome">
                        {name}
                      </span>
                      {kind ? (
                        <span className="mt-0.5 block text-[0.62rem] uppercase tracking-[0.22em] text-steel">
                          {kind}
                        </span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden
                      data-focus-ring=""
                      // chrome line with a dark halo inside it, so it reads
                      // on a bright thumbnail too
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 shadow-[inset_0_0_0_5px_rgba(9,8,13,0.7)] ring-2 ring-inset ring-chrome group-focus-visible:opacity-100"
                    />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
