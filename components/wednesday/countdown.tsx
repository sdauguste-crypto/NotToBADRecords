import { cn } from "@/lib/utils";
import { splitCountdown } from "@/lib/release-clock";

const UNITS = [
  ["days", "DAYS"],
  ["hours", "HRS"],
  ["minutes", "MIN"],
  ["seconds", "SEC"],
] as const;

/**
 * DD : HH : MM : SS in four HUD cells. `remaining` null renders dashes — the
 * static HTML can't know the time, so the digits arrive with the script.
 */
export function Countdown({
  remaining,
  size = "page",
  className,
}: {
  remaining: number | null;
  size?: "page" | "story";
  className?: string;
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
        story ? "gap-x-3" : "gap-x-1.5 sm:gap-x-3",
        className,
      )}
    >
      {UNITS.map(([key, label], i) => (
        <div key={key} className="contents">
          {i > 0 ? (
            <span
              aria-hidden
              className={cn(
                "self-center font-bold text-blood/70",
                story ? "-mt-12 text-6xl" : "-mt-5 text-2xl sm:text-3xl",
              )}
            >
              :
            </span>
          ) : null}
          <div
            className={cn(
              "glass-panel hud-corners flex flex-col items-center",
              story ? "px-2 pb-6 pt-8" : "px-1 pb-2.5 pt-3 sm:pb-3 sm:pt-4",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "font-bold tabular-nums leading-none text-[#ebeef1] [text-shadow:0_0_18px_rgba(180,28,37,.55)]",
                story ? "text-[7.5rem]" : "text-4xl sm:text-5xl",
              )}
            >
              {parts ? parts[key] : "--"}
            </span>
            <span
              aria-hidden
              className={cn(
                "uppercase text-blood",
                story ? "mt-4 text-2xl tracking-[0.4em]" : "mt-2 text-[0.6rem] tracking-[0.3em]",
              )}
            >
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
