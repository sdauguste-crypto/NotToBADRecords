"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Stream-only player for the public preview: play/pause and a progress line.
 * No native controls, so no download menu. The site never carries the full
 * song — only this 15-second clip.
 */
export function AudioPlayer({ src, label }: { src: string; label: string }) {
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
    <div className="glass-panel flex w-full items-center gap-4 px-4 py-3">
      <audio
        ref={audio}
        src={src}
        preload="none"
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
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sunset-orange to-sunset-gold shadow-[0_0_12px_rgba(34,211,238,.7)]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/** The public preview clip (15 s of the song). */
export function PreviewPlayer({ src }: { src: string }) {
  return <AudioPlayer src={src} label="PREVIEW" />;
}
