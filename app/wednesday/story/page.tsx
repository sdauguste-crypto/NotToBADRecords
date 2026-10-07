import type { Metadata, Viewport } from "next";

import { StoryCard } from "@/components/wednesday/story-card";
import { wednesday } from "@/lib/wednesday";

// A 1080×1920 card to screen-record for Instagram and TikTok stories. Not a
// page anyone should land on from search.
export const metadata: Metadata = {
  title: "WEDNESDAY — Story",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#09080d",
};

export default function WednesdayStoryPage() {
  return <StoryCard initiallyReleased={Date.now() >= wednesday.releaseAt} />;
}
