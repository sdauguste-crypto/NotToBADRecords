// Tiny event bus so embedded media (YouTube, Spotify) can duck the site-wide
// ambient player instead of playing over it.

export const MEDIA_OPEN_EVENT = "ntb:media-open";

/**
 * Call right before mounting a video/track embed. `source` names who opened
 * it, so other players on the page can stand down (one thing plays at a time).
 */
export function announceMediaOpen(source?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MEDIA_OPEN_EVENT, { detail: { source } }));
}

/** Runs `onOther` whenever media other than `source` opens. Returns the unsubscribe. */
export function onOtherMediaOpen(source: string, onOther: () => void): () => void {
  const listener = (event: Event) => {
    if ((event as CustomEvent<{ source?: string }>).detail?.source !== source) onOther();
  };
  window.addEventListener(MEDIA_OPEN_EVENT, listener);
  return () => window.removeEventListener(MEDIA_OPEN_EVENT, listener);
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
