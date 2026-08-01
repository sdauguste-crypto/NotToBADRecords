"use client";

// Full-bleed muted film loop behind the label landing page.
//
// Client component because React does not serialize the `muted` attribute
// into SSR markup — without it set before play(), autoplay is refused.
// Honors prefers-reduced-motion (poster only), and removes itself entirely
// if the file is missing or the browser declines playback, leaving the
// plain obsidian page.

import { useEffect, useRef, useState } from "react";

export function LabelVideoBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return; // poster frame only — no motion
    }
    video.muted = true;
    video.play().catch(() => {
      // Autoplay refused (rare for muted video) — the poster still shows.
    });
  }, []);

  if (failed) return null;

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <video
        ref={videoRef}
        poster="/label/bg-poster.webp"
        loop
        muted
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      >
        {/* VP9 first for Chrome/Firefox; H.264 fallback covers Safari/iOS */}
        <source src="/label/bg-loop.webm" type="video/webm" />
        <source src="/label/bg-loop.mp4" type="video/mp4" />
      </video>
      {/* Obsidian treatment: the film reads through as a living texture while
          Tier I chrome/blood stays fully legible on top. */}
      <div className="absolute inset-0 bg-obsidian/72" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(9,8,13,0.85)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-obsidian to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-obsidian to-transparent" />
    </div>
  );
}
