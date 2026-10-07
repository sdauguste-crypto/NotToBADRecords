"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The public preview clip: play/pause and a progress line, nothing else. No
 * native controls, so no download menu — the clip itself is the only file
 * that is ever public before release.
 */
export function PreviewPlayer({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const update = () =>
      setProgress(el.duration > 0 ? el.currentTime / el.duration : 0);
    const stop = () => setPlaying(false);
    const start = () => setPlaying(true);
    el.addEventListener("timeupdate", update);
    el.addEventListener("ended", stop);
    el.addEventListener("pause", stop);
    el.addEventListener("play", start);
    return () => {
      el.removeEventListener("timeupdate", update);
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
        aria-label={playing ? "Pause preview" : "Play preview"}
        className="btn-blood flex size-12 shrink-0 items-center justify-center rounded-full text-lg"
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="flex-1">
        <p className="text-left text-[0.65rem] uppercase tracking-[0.3em] text-blood">
          ▸ PREVIEW
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
