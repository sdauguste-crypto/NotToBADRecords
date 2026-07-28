// Tiny event bus so embedded media (YouTube, Spotify) can duck the site-wide
// ambient player instead of playing over it.

export const MEDIA_OPEN_EVENT = "ntb:media-open";

/** Call right before mounting a video/track embed. */
export function announceMediaOpen(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MEDIA_OPEN_EVENT));
}
