import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { splitCountdown } from "@/lib/release-clock";

import { u } from "./story-units";

const UNITS = [
  ["days", "DAYS"],
  ["hours", "HRS"],
  ["minutes", "MIN"],
  ["seconds", "SEC"],
] as const;

/**
 * DD : HH : MM : SS in four HUD cells. `remaining` null renders dashes — the
 * static HTML can't know the time, so the digits arrive with the script.
 * The story size is measured in the story card's design pixels (--u) and
 * skips the glass blur, which is costly at story size on phones.
 */
export function Countdown({
  remaining,
  size = "page",
  className,
  style,
}: {
  remaining: number | null;
  size?: "page" | "story";
  className?: string;
  style?: CSSProperties;
}) {
  const parts = remaining === null ? null : splitCountdown(remaining);
  const story = size === "story";

  return (
    <div
      role="timer"
      aria-label={
        parts
          ? `${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds`
          : "Countdown"
      }
      className={cn(
        "grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-start",
        !story && "gap-x-1.5 sm:gap-x-3",
        className,
      )}
      style={story ? { columnGap: u(12), ...style } : style}
    >
      {UNITS.map(([key, label], i) => (
        <div key={key} className="contents">
          {i > 0 ? (
            <span
              aria-hidden
              className={cn(
                "self-center font-bold text-blood/70",
                !story && "-mt-5 text-2xl sm:text-3xl",
              )}
              style={story ? { marginTop: u(-48), fontSize: u(60), lineHeight: u(60) } : undefined}
            >
              :
            </span>
          ) : null}
          <div
            className={cn(
              "hud-corners flex flex-col items-center",
              story
                ? "rounded-xl border border-blood/30 bg-[rgba(8,18,43,0.72)]"
                : "glass-panel px-1 pb-2.5 pt-3 sm:pb-3 sm:pt-4",
            )}
            style={story ? { padding: `${u(32)} ${u(8)} ${u(24)}` } : undefined}
          >
            <span
              aria-hidden
              className={cn(
                "font-bold tabular-nums leading-none text-[#ebeef1] [text-shadow:0_0_18px_rgba(180,28,37,.55)]",
                !story && "text-4xl sm:text-5xl",
              )}
              style={story ? { fontSize: u(120), lineHeight: u(180) } : undefined}
            >
              {parts ? parts[key] : "--"}
            </span>
            <span
              aria-hidden
              className={cn(
                "uppercase text-blood",
                story ? "tracking-[0.4em]" : "mt-2 text-[0.6rem] tracking-[0.3em]",
              )}
              style={story ? { marginTop: u(16), fontSize: u(24), lineHeight: u(32) } : undefined}
            >
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
