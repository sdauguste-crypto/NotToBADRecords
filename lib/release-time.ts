// Wall-clock time in a named zone -> the instant it happens. Release times
// are announced in the label's zone, never the visitor's, so a fan in LA and
// a fan in London count down to the same second.

function zoneOffsetAt(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wall = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wall - Math.floor(instant / 1000) * 1000;
}

/** "2026-10-09T00:00" in "America/New_York" -> epoch ms (DST-aware). */
export function zonedTimeToEpoch(local: string, timeZone: string): number {
  const [date, time = "00:00"] = local.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, h, min);
  // two passes settle the offset on either side of a DST change
  const first = asUtc - zoneOffsetAt(asUtc, timeZone);
  return asUtc - zoneOffsetAt(first, timeZone);
}
