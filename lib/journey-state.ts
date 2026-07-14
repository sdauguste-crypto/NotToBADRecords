// FROZEN CONTRACT between the DOM scroll tracker and the WebGL scene.
// Do not add or rename fields without orchestrator sign-off.
//
// The DOM side (components/scroll/journey-tracker.tsx) is the sole WRITER.
// The scene (components/scene/**) POLLS this in useFrame — no subscriptions,
// no React re-renders.

export const SECTION_IDS = [
  "hero",
  "music",
  "videos",
  "gallery",
  "store",
  "events",
  "about",
  "contact",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export type JourneyState = {
  /** 0..1 overall document scroll (coarse fallback signal) */
  progress: number;
  /**
   * Continuous 0..7 keyed to the measured offsetTop of the 8 sections:
   * 0 = top of #hero, 1 = top of #music, ... 7 = top of #contact.
   * Piecewise-linear between section tops; robust to unequal heights.
   */
  sectionProgress: number;
  /** -1..1 normalized pointer, 0 on touch devices / reduced motion */
  pointerX: number;
  /** -1..1 normalized pointer, 0 on touch devices / reduced motion */
  pointerY: number;
  /** prefers-reduced-motion: reduce */
  reducedMotion: boolean;
};

export const journeyState: JourneyState = {
  progress: 0,
  sectionProgress: 0,
  pointerX: 0,
  pointerY: 0,
  reducedMotion: false,
};
