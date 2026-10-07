import type { Metadata, Viewport } from "next";

import { ReleasePage } from "@/components/wednesday/release-page";
import { WEDNESDAY_PATH, wednesday } from "@/lib/wednesday";

// Standalone like /listen: no scene, no motion library — it opens from
// Instagram and TikTok bios, inside their in-app browsers.

// Time-neutral copy: share cards are cached for days, so they mustn't say
// "out Friday" after Friday.
const TITLE = "WEDNESDAY — Simon Auguste";
const DESCRIPTION =
  "The new single from Simon Auguste. Space Cadets hear it first. Not To B.A.D Records.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: WEDNESDAY_PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: WEDNESDAY_PATH,
    siteName: "Not To B.A.D Records",
    type: "music.song",
    images: [{ url: wednesday.og.src, width: wednesday.og.width, height: wednesday.og.height, alt: "WEDNESDAY — Simon Auguste" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [wednesday.og.src],
  },
};

export const viewport: Viewport = {
  themeColor: "#09080d",
};

export default function WednesdayPage() {
  // built after release? then the static HTML already reads OUT NOW
  return <ReleasePage initiallyReleased={Date.now() >= wednesday.releaseAt} />;
}
