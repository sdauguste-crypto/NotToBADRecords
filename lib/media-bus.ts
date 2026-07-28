// Tiny event bus so embedded media (YouTube, Spotify) can duck the site-wide
// ambient player instead of playing over it.

export const MEDIA_OPEN_EVENT = "ntb:media-open";

/** Call right before mounting a video/track embed. */
export function announceMediaOpen(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MEDIA_OPEN_EVENT));
}

// The ambient player owns the only <audio> element; the Music section reads
// it so its NOW PLAYING bar tracks real playback instead of faking it.
let ambientAudio: HTMLAudioElement | null = null;

export function setAmbientAudio(el: HTMLAudioElement | null): void {
  ambientAudio = el;
}

export function getAmbientAudio(): HTMLAudioElement | null {
  return ambientAudio;
}
