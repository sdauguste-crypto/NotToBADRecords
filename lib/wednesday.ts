// WEDNESDAY — the single's release, in one place. Everything on /wednesday,
// /wednesday/story, the artist-page banner and the MUSIC feature reads from
// here, so filling a link below updates every surface on the next deploy.

import { zonedTimeToEpoch } from "@/lib/release-time";

export const RELEASE_ZONE = "America/New_York";
export const RELEASE_LOCAL = "2026-10-09T00:00";

export const wednesday = {
  title: "WEDNESDAY",
  artist: "Simon Auguste",
  /** Friday, October 9, 2026, 12:00 AM Eastern — 04:00 UTC. */
  releaseAt: zonedTimeToEpoch(RELEASE_LOCAL, RELEASE_ZONE),
  releaseLabel: "FRI 10.09 · 12AM ET",
  cover: { src: "/wednesday/cover.jpg", width: 1200, height: 1200 },
  og: { src: "/wednesday/og.jpg", width: 1200, height: 630 },
  /**
   * Public 15–30 s preview clip under public/wednesday (never the full song).
   * The player stays hidden until this is set.
   */
  previewClip: undefined as string | undefined,
  /** Streaming links — each button appears once its link is set. */
  links: {
    spotify: undefined as string | undefined,
    appleMusic: undefined as string | undefined,
    youtube: undefined as string | undefined,
  },
  /** Mailing-list tags: early-access signups, then the weekly drop list. */
  tags: { early: "wednesday-early", weekly: "take-off-thursdays" },
} as const;

export const WEDNESDAY_PATH = "/wednesday/";
export const WEDNESDAY_URL_TEXT = "nottobadrecords.com/wednesday";

export function streamingLinks() {
  const { spotify, appleMusic, youtube } = wednesday.links;
  return [
    { label: "SPOTIFY", href: spotify },
    { label: "APPLE MUSIC", href: appleMusic },
    { label: "YOUTUBE", href: youtube },
  ].filter((l): l is { label: string; href: string } => !!l.href);
}
