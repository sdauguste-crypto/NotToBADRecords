"use client";

import { useEffect, useRef, useState } from "react";

import { announceMediaOpen, onOtherMediaOpen } from "@/lib/media-bus";
import { cn } from "@/lib/utils";

import { RING_C } from "./ring";
import { StoreLinks } from "./store-links";

const SOURCE = "wednesday-single";
/** One turn of the hero record (the wed-spin duration in globals.css). */
const SPIN_SECONDS = 14;

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * NEW SINGLE: the cover in a blood ring that plays the public 15-second
 * preview — the ring fills as it plays and the hero cover turns like a
 * record. PLAY FULL SONG mounts the Spotify player only after the tap.
 * The preview has no native controls, so no download menu; the full song
 * is never on the site.
 */
export function SingleCard({
  title,
  artist,
  year,
  thumb,
  previewSrc,
  spotifyUrl,
  appleMusicUrl,
  spotifyEmbedUrl,
}: {
  title: string;
  artist: string;
  year: number;
  thumb: { src: string; width: number; height: number };
  previewSrc?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  spotifyEmbedUrl?: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const arc = useRef<SVGCircleElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ now: 0, total: 0 });
  // the Spotify player for the whole song, mounted only after the tap
  const [embedOpen, setEmbedOpen] = useState(false);

  // the ring is the progress bar: one attribute per frame while playing
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    let frame = 0;
    const paint = () => {
      const total = Number.isFinite(el.duration) ? el.duration : 0;
      const progress = total > 0 ? el.currentTime / total : 0;
      arc.current?.setAttribute("stroke-dashoffset", String(RING_C * (1 - progress)));
    };
    const loop = () => {
      paint();
      frame = requestAnimationFrame(loop);
    };
    // also on a seek while paused (a reset to 0:00 empties the ring)
    const update = () => {
      setTime({ now: el.currentTime, total: Number.isFinite(el.duration) ? el.duration : 0 });
      if (el.paused) paint();
    };
    const start = () => {
      setPlaying(true);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      setPlaying(false);
      cancelAnimationFrame(frame);
      paint();
    };
    const ended = () => {
      el.currentTime = 0;
      stop();
    };
    el.addEventListener("play", start);
    el.addEventListener("pause", stop);
    el.addEventListener("ended", ended);
    el.addEventListener("timeupdate", update);
    el.addEventListener("loadedmetadata", update);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("play", start);
      el.removeEventListener("pause", stop);
      el.removeEventListener("ended", ended);
      el.removeEventListener("timeupdate", update);
      el.removeEventListener("loadedmetadata", update);
    };
  }, []);

  // the hero cover spins while the preview plays (CSS keys off this flag).
  // The spin exists only while playing, so at rest the disc is not a layer;
  // on pause the angle it reached is pinned inline (a still transform) and
  // the next play picks up from there instead of snapping back to 0°.
  useEffect(() => {
    const root = document.documentElement;
    if (playing) {
      root.setAttribute("data-wed-playing", "");
      return;
    }
    const disc = document.querySelector<HTMLElement>(".wed-disc");
    if (disc && root.hasAttribute("data-wed-playing")) {
      const now = getComputedStyle(disc).transform;
      if (now && now !== "none") {
        const m = new DOMMatrixReadOnly(now);
        const turn = ((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360;
        disc.style.transform = `rotate(${turn.toFixed(2)}deg)`;
        disc.style.animationDelay = `${((-turn / 360) * SPIN_SECONDS).toFixed(3)}s`;
      }
    }
    root.removeAttribute("data-wed-playing");
  }, [playing]);
  useEffect(() => () => document.documentElement.removeAttribute("data-wed-playing"), []);

  // one thing plays at a time: a video or another song opening stops the
  // preview and closes this player
  useEffect(
    () =>
      onOtherMediaOpen(SOURCE, () => {
        audio.current?.pause();
        setEmbedOpen(false);
      }),
    [],
  );

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      announceMediaOpen(SOURCE);
      setEmbedOpen(false);
      void el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  };

  const openFullSong = () => {
    if (embedOpen) {
      setEmbedOpen(false);
      return;
    }
    announceMediaOpen(SOURCE);
    // stop the preview and rewind it, so the card shows one player in one
    // state: the ring back to idle, the label back to PREVIEW · 0:15
    const el = audio.current;
    if (el) {
      el.pause();
      if (el.currentTime > 0) el.currentTime = 0;
    }
    setTime((t) => ({ ...t, now: 0 }));
    setEmbedOpen(true);
  };

  // playing, or paused part-way: the label counts, the full ring dims
  const busy = playing || time.now > 0;
  const clipLength = time.total || 15;

  return (
    <div className="wed-glass p-4 sm:p-5">
      <div className="flex items-center gap-4 sm:gap-6">
        <button
          type="button"
          onClick={toggle}
          disabled={!previewSrc}
          // one state mechanism: the label says Play or Pause (no aria-pressed)
          aria-label={playing ? `Pause the ${title} preview` : `Play a 15-second preview of ${title}`}
          data-preview-toggle=""
          className="group relative size-24 shrink-0 rounded-full transition-transform duration-300 active:scale-[0.97] min-[380px]:size-28 sm:size-32"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb.src}
            width={thumb.width}
            height={thumb.height}
            alt=""
            decoding="async"
            className="absolute inset-[9%] h-[82%] w-[82%] rounded-full object-cover"
          />
          <svg viewBox="0 0 200 200" aria-hidden className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="100"
              cy="100"
              r="94"
              fill="none"
              stroke="#b41c25"
              strokeWidth="5"
              className={cn("transition-opacity duration-500", busy ? "opacity-30" : "opacity-100")}
            />
            <circle
              ref={arc}
              cx="100"
              cy="100"
              r="94"
              fill="none"
              stroke="#b41c25"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C}
            />
          </svg>
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-obsidian/60 text-chrome transition-colors duration-300 group-hover:border-blood group-hover:bg-blood"
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
              </svg>
            )}
          </span>
        </button>

        <div className="min-w-0">
          {/* the same words on a phone and a laptop: what it is and how long */}
          <p
            data-preview-state={busy ? "progress" : "idle"}
            className="whitespace-nowrap text-[0.65rem] font-medium uppercase tabular-nums tracking-[0.2em] text-steel min-[380px]:tracking-[0.28em]"
          >
            {busy ? `Preview · ${clock(time.now)} / ${clock(clipLength)}` : `Preview · ${clock(clipLength)}`}
          </p>
          {/* the serif belongs to the hero wordmark; the card reads as UI */}
          <h3 className="mt-2 text-lg font-semibold uppercase leading-none tracking-[0.14em] text-chrome sm:text-xl">
            {title}
          </h3>
          <p className="mt-2 text-sm text-steel">
            {artist} · {year}
          </p>
        </div>
      </div>

      {previewSrc ? (
        <audio
          ref={audio}
          src={previewSrc}
          preload="none"
          playsInline
          controlsList="nodownload noplaybackrate"
          onContextMenu={(event) => event.preventDefault()}
        />
      ) : null}

      <StoreLinks title={title} spotifyUrl={spotifyUrl} appleMusicUrl={appleMusicUrl} className="mt-5" />

      {spotifyEmbedUrl ? (
        <div className="mt-4 border-t border-white/10 pt-1">
          <button
            type="button"
            onClick={openFullSong}
            aria-expanded={embedOpen}
            aria-controls="wed-full-song"
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left text-[0.7rem] font-semibold tracking-[0.24em] text-chrome"
          >
            <span>{embedOpen ? "▾ CLOSE PLAYER" : "▸ PLAY FULL SONG"}</span>
            <span className="text-[0.65rem] font-normal tracking-[0.12em] text-steel">
              Spotify player
            </span>
          </button>
          <div id="wed-full-song">
            {embedOpen ? (
              <iframe
                src={`${spotifyEmbedUrl}?utm_source=generator&theme=0`}
                title={`${title} — ${artist} on Spotify`}
                width="100%"
                height="152"
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className="wed-fade mt-2 block w-full rounded-xl border-0"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
