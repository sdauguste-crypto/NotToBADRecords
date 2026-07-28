"use client";

// Site-wide ambient player: the top MUSIC track autoplays and loops for the
// whole visit.
//
// Every browser blocks audible autoplay from a cold visit — it cannot be
// coded around — so this goes as far as the platform allows, in order:
//   1. Try to play with sound. Chrome grants this to visitors who have
//      engaged with the domain before, so returning fans get instant audio.
//   2. Otherwise autoplay MUTED, which is always permitted, so the track is
//      genuinely running from page load.
//   3. Unmute on the visitor's first qualifying gesture (unmuting without
//      one makes Chrome pause the element), restarting from 0:00 so they
//      hear the song from the top rather than mid-verse.
//
// A visitor's pause is remembered across visits, embeds duck the music, and
// the whole widget removes itself if the audio file isn't deployed yet.

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { releases } from "@/lib/content";
import { MEDIA_OPEN_EVENT, setAmbientAudio } from "@/lib/media-bus";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ntb-ambient-audio";
const VOLUME = 0.45;
// Only gestures that count as user activation can lift the mute; scroll and
// mousemove do not qualify, so they are deliberately absent.
const GESTURES = ["pointerdown", "keydown", "touchend", "click"] as const;

const track = releases.find((release) => release.audioUrl);

export function AmbientPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  // Playing, but silently — waiting on a gesture to lift the mute.
  const [silent, setSilent] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  // Visitors who pressed pause stay paused — never re-autostart on them.
  const optedOut = useRef(false);

  /** Autoplay with sound if allowed, else muted. Returns true if audible. */
  const start = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || optedOut.current) return false;
    audio.volume = VOLUME;
    audio.muted = false;
    try {
      await audio.play();
      setPlaying(true);
      setSilent(false);
      setMuted(false);
      return true;
    } catch {
      // Blocked with sound — fall back to muted autoplay, which is allowed.
    }
    try {
      audio.muted = true;
      await audio.play();
      setPlaying(true);
      setSilent(true);
      setMuted(true);
    } catch {
      // Even muted autoplay refused (iOS low-power); wait for the gesture.
      setSilent(true);
    }
    return false;
  }, []);

  // The <audio> ships in the static HTML, so a missing file can error before
  // React hydrates and attaches onError — check the element's own state on
  // mount too, otherwise the widget lingers with nothing to play.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const fail = () => setUnavailable(true);
    if (audio.error || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      fail();
      return;
    }
    setAmbientAudio(audio);
    audio.addEventListener("error", fail);
    return () => {
      audio.removeEventListener("error", fail);
      setAmbientAudio(null);
    };
  }, []);

  // Restore preference, then attempt autoplay.
  useEffect(() => {
    if (!track) return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage unavailable
    }
    if (stored === "off") {
      optedOut.current = true;
      return;
    }
    const audio = audioRef.current;
    if (audio) audio.volume = VOLUME;
    void start();
  }, [start]);

  // Running silently — the first qualifying gesture brings the sound in from
  // the top of the track.
  useEffect(() => {
    if (!silent || optedOut.current) return;
    const onGesture = () => {
      const audio = audioRef.current;
      if (!audio || optedOut.current) return;
      audio.muted = false;
      audio.volume = VOLUME;
      audio.currentTime = 0;
      setMuted(false);
      setSilent(false);
      void audio.play().catch(() => undefined);
    };
    GESTURES.forEach((type) =>
      window.addEventListener(type, onGesture, { once: true, passive: true }),
    );
    return () =>
      GESTURES.forEach((type) => window.removeEventListener(type, onGesture));
  }, [silent]);

  // A video or Spotify embed just opened — get out of its way.
  useEffect(() => {
    const duck = () => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      audio.pause();
      setPlaying(false);
    };
    window.addEventListener(MEDIA_OPEN_EVENT, duck);
    return () => window.removeEventListener(MEDIA_OPEN_EVENT, duck);
  }, []);

  if (!track || unavailable) return null;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      optedOut.current = false;
      try {
        window.localStorage.setItem(STORAGE_KEY, "on");
      } catch {
        // storage unavailable
      }
      void start();
    } else {
      optedOut.current = true;
      audio.pause();
      setPlaying(false);
      try {
        window.localStorage.setItem(STORAGE_KEY, "off");
      } catch {
        // storage unavailable
      }
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40 print:hidden">
      {/* preload="auto": the track now starts on every visit, so buffer it
          up front for a clean, gapless start */}
      <audio
        ref={audioRef}
        src={track.audioUrl}
        loop
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setUnavailable(true)}
      />
      <div
        className={cn(
          "glass-panel pointer-events-auto flex items-center gap-3 px-3 py-2 transition-opacity duration-500",
          playing ? "opacity-100" : "opacity-80 hover:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={toggle}
          title={playing ? "Pause the music" : "Play the music"}
          aria-label={playing ? "Pause background music" : "Play background music"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sunset-pink/60 text-sunset-pink transition-transform hover:scale-110"
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" fill="currentColor" />
          ) : (
            <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" />
          )}
        </button>

        <span className="hidden min-w-0 flex-col leading-tight sm:flex">
          <span
            className={cn(
              "text-[0.6rem] uppercase tracking-[0.25em]",
              silent
                ? "animate-blink text-sunset-pink motion-reduce:animate-none"
                : "text-sunset-gold/80",
            )}
          >
            {silent ? "TAP FOR SOUND" : "NOW TRANSMITTING"}
          </span>
          <span className="truncate text-xs font-bold uppercase tracking-wide text-foreground/90">
            {track.title}
          </span>
        </span>

        {/* three-bar VU meter, frozen while paused */}
        <span aria-hidden className="flex items-end gap-0.5">
          {[0, 1, 2].map((bar) => (
            <span
              key={bar}
              className={cn(
                "w-0.5 rounded-full bg-sunset-gold",
                playing
                  ? "animate-led-pulse motion-reduce:animate-none"
                  : "opacity-40",
              )}
              style={{
                height: `${6 + bar * 4}px`,
                animationDelay: `${bar * 0.18}s`,
              }}
            />
          ))}
        </span>

        <button
          type="button"
          onClick={toggleMute}
          title={muted ? "Unmute" : "Mute"}
          aria-label={muted ? "Unmute background music" : "Mute background music"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground/60 transition-colors hover:text-sunset-gold"
        >
          {muted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
