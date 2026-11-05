// WEDNESDAY — the single's release, in one place. Everything on /wednesday,
// /wednesday/story, the artist-page banner and the MUSIC feature reads from
// here, so filling a link below updates every surface on the next deploy.

import { zonedTimeToEpoch } from "@/lib/release-time";

export const RELEASE_ZONE = "America/New_York";
export const RELEASE_LOCAL = "2026-10-30T00:00";

export const wednesday = {
  title: "WEDNESDAY",
  artist: "Simon Auguste",
  /** Friday, October 30, 2026, 12:00 AM Eastern — 04:00 UTC (re-release). */
  releaseAt: zonedTimeToEpoch(RELEASE_LOCAL, RELEASE_ZONE),
  releaseLabel: "FRI 10.30 · 12AM ET",
  cover: { src: "/wednesday/cover.jpg", width: 1200, height: 1200 },
  /** The cover at 960px: the hero disc on phones (about 900 device px at 3x). */
  coverMedium: { src: "/wednesday/cover-960.jpg", width: 960, height: 960 },
  /** The release cover at 480px, for the small circle on the single card. */
  thumb: { src: "/covers/wednesday-480.webp", width: 480, height: 480 },
  /** The cover at 40px: the browser stretches it into the hero's soft backdrop. */
  ambient: "/wednesday/ambient.jpg",
  og: { src: "/wednesday/og.jpg", width: 1200, height: 630 },
  /**
   * Public 15–30 s preview clip under public/wednesday (never the full song).
   * The player stays hidden until this is set.
   */
  previewClip: "/wednesday/preview.mp3" as string | undefined, // 0:13–0:28
  // The full song is never on the site: the site and the repo are public, so
  // any file here can be downloaded. Full listening is the Spotify and Apple
  // Music links below and the Spotify player that mounts on /wednesday.
  /** Streaming links (Oct 30 re-release) — each button appears once its link is set. */
  links: {
    spotify: "https://open.spotify.com/track/13isILcElhB9AhP2koPIsN" as string | undefined,
    appleMusic: "https://music.apple.com/us/album/wednesday-single/6826547891" as string | undefined,
    youtube: undefined as string | undefined,
  },
  /** Mailing-list tag: the weekly drop list (Take Off Thursdays). */
  tags: { weekly: "take-off-thursdays" },
} as const;

export const WEDNESDAY_PATH = "/wednesday/";
export const WEDNESDAY_URL_TEXT = "nottobadrecords.com/wednesday";
