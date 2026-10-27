"use client";

import { useEffect, useRef, useState } from "react";

/** Seconds -> m:ss. */
function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * Stream-only player: play/pause and a progress line (plus seeking and times
 * for the full song). No native controls, so no download menu.
 */
export function AudioPlayer({
  src,
  label,
  seekable = false,
  id,
}: {
  src: string;
  label: string;
  seekable?: boolean;
  id?: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ now: 0, total: 0 });

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const update = () =>
      setTime({ now: el.currentTime, total: Number.isFinite(el.duration) ? el.duration : 0 });
    const stop = () => setPlaying(false);
    const start = () => setPlaying(true);
    el.addEventListener("timeupdate", update);
    el.addEventListener("loadedmetadata", update);
    el.addEventListener("durationchange", update);
    el.addEventListener("ended", stop);
    el.addEventListener("pause", stop);
    el.addEventListener("play", start);
    update();
    return () => {
      el.removeEventListener("timeupdate", update);
      el.removeEventListener("loadedmetadata", update);
      el.removeEventListener("durationchange", update);
      el.removeEventListener("play", start);
      el.removeEventListener("ended", stop);
      el.removeEventListener("pause", stop);
    };
  }, []);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  };

  const progress = time.total > 0 ? time.now / time.total : 0;

  return (
    <div id={id} className="glass-panel flex w-full scroll-mt-6 items-center gap-4 px-4 py-3">
      <audio
        ref={audio}
        src={src}
        preload={seekable ? "metadata" : "none"}
        playsInline
        controlsList="nodownload noplaybackrate"
        onContextMenu={(e) => e.preventDefault()}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${label.toLowerCase()}` : `Play ${label.toLowerCase()}`}
        className="btn-blood flex size-12 shrink-0 items-center justify-center rounded-full text-lg"
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-left text-[0.65rem] uppercase tracking-[0.3em] text-blood">
          ▸ {label}
        </p>
        {seekable ? (
          <>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(progress * 1000)}
              onChange={(e) => {
                const el = audio.current;
                if (el && time.total > 0) el.currentTime = (Number(e.target.value) / 1000) * time.total;
              }}
              aria-label="Seek"
              className="mt-2 block w-full accent-[#b41c25]"
            />
            <div className="mt-1 flex justify-between text-[0.65rem] tabular-nums tracking-[0.2em] text-foreground/50">
              <span>{clock(time.now)}</span>
              <span>{time.total > 0 ? clock(time.total) : "--:--"}</span>
            </div>
          </>
        ) : (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sunset-orange to-sunset-gold shadow-[0_0_12px_rgba(34,211,238,.7)]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** The public preview clip (15 s of the song). */
export function PreviewPlayer({ src }: { src: string }) {
  return <AudioPlayer src={src} label="PREVIEW" />;
}
