// The blood ring that runs through the page: the hero cover, the single, the
// singles. Every ring is drawn in a 200-unit viewBox at r=94, so one
// circumference serves the draw-in animation (globals.css) and the progress.

import { cn } from "@/lib/utils";

export const RING_R = 94;
export const RING_C = 2 * Math.PI * RING_R; // 590.6

/** Where the hero's accent arc ends: it covers this share of the ring. */
const ARC = 0.74;
const headAngle = -Math.PI / 2 + ARC * 2 * Math.PI;
const HEAD = {
  x: 100 + RING_R * Math.cos(headAngle),
  y: 100 + RING_R * Math.sin(headAngle),
};

/**
 * The hero: the cover as a big disc, a thin chrome guide ring, and a blood
 * arc that draws in on load and then travels slowly round. The disc turns
 * like a record while the preview plays (only then: see .wed-disc in
 * globals.css). Plain transforms on one screen-sized element each; the glow
 * is a gradient, not a blur.
 */
export function HeroDisc({
  src,
  width,
  height,
  srcSet,
  sizes,
  alt,
  className,
}: {
  src: string;
  width: number;
  height: number;
  srcSet?: string;
  sizes?: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-square", className)}>
      <div
        aria-hidden
        className="wed-fade absolute -inset-[16%] rounded-full"
        style={{
          ["--d" as string]: "200ms",
          background:
            "radial-gradient(closest-side, rgba(180,28,37,0.34), rgba(180,28,37,0.12) 58%, rgba(180,28,37,0) 100%)",
        }}
      />

      <div className="absolute inset-[6%] overflow-hidden rounded-full bg-[#141318] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]">
        <div className="wed-disc h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            srcSet={srcSet}
            sizes={sizes}
            width={width}
            height={height}
            alt={alt}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
        {/* a still sheen over the turning cover, like light on vinyl */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 200deg, transparent 0deg, rgba(255,255,255,0.07) 30deg, transparent 70deg, transparent 180deg, rgba(255,255,255,0.05) 215deg, transparent 250deg), radial-gradient(circle, transparent 55%, rgba(9,8,13,0.45) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-obsidian/55 via-obsidian/20 to-transparent lg:from-obsidian/40"
        />
      </div>

      <svg viewBox="0 0 200 200" aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
        <circle cx="100" cy="100" r="99" fill="none" stroke="rgba(235,238,241,0.14)" strokeWidth="0.5" />
      </svg>

      {/* the turning square sweeps past its own box (its corners reach ~1.41x
          out), and the browser counts that sweep when it decides what else
          must be composited; the clip keeps it to the disc. The ring and its
          head dot stay inside r=100. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div className="wed-orbit h-full w-full">
          <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id="wed-arc" x1="160" y1="10" x2="20" y2="170" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#b41c25" stopOpacity="0.15" />
                <stop offset="0.55" stopColor="#b41c25" stopOpacity="0.85" />
                <stop offset="1" stopColor="#b41c25" />
              </linearGradient>
            </defs>
            <circle
              cx="100"
              cy="100"
              r={RING_R}
              fill="none"
              stroke="#b41c25"
              strokeOpacity="0.2"
              strokeWidth="1.2"
            />
            <circle
              cx="100"
              cy="100"
              r={RING_R}
              fill="none"
              stroke="url(#wed-arc)"
              strokeWidth="2.6"
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
              className="wed-draw"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - ARC)}
            />
            <g className="wed-fade" style={{ ["--d" as string]: "2000ms" }}>
              <circle cx={HEAD.x} cy={HEAD.y} r="6" fill="#b41c25" fillOpacity="0.35" />
              <circle cx={HEAD.x} cy={HEAD.y} r="2.4" fill="#ebeef1" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * A cover in a blood ring, for the MORE MUSIC row. A dark vignette at the rim
 * settles the brighter covers into the obsidian field (a gradient, no filter).
 */
export function RingedCover({
  src,
  active,
  className,
}: {
  src: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative block aspect-square", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        width={480}
        height={480}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-[8%] h-[84%] w-[84%] rounded-full object-cover"
      />
      <span
        aria-hidden
        className="absolute inset-[8%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(9,8,13,0) 52%, rgba(9,8,13,0.5) 100%), linear-gradient(180deg, rgba(9,8,13,0) 40%, rgba(9,8,13,0.22) 100%)",
        }}
      />
      <svg viewBox="0 0 200 200" aria-hidden className="absolute inset-0 h-full w-full">
        <circle
          cx="100"
          cy="100"
          r={RING_R}
          fill="none"
          stroke="#b41c25"
          strokeWidth={active ? 6 : 3.5}
          className="transition-[stroke-width] duration-300"
        />
      </svg>
    </span>
  );
}
