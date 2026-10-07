// The release instant must come from Eastern time, not the machine's clock.
// Run under a few machine zones: TZ=Asia/Tokyo node scripts/test-release-time.mjs
import assert from "node:assert/strict";

import { zonedTimeToEpoch } from "../lib/release-time.ts";

const cases = [
  // WEDNESDAY: Friday 12AM EDT (UTC-4)
  ["2026-10-09T00:00", "America/New_York", "2026-10-09T04:00:00.000Z"],
  // standard time (UTC-5), and either side of the November change
  ["2026-12-04T00:00", "America/New_York", "2026-12-04T05:00:00.000Z"],
  ["2026-10-31T23:30", "America/New_York", "2026-11-01T03:30:00.000Z"],
  ["2026-11-02T00:00", "America/New_York", "2026-11-02T05:00:00.000Z"],
  ["2026-10-09T00:00", "UTC", "2026-10-09T00:00:00.000Z"],
];

for (const [local, zone, expected] of cases) {
  assert.equal(new Date(zonedTimeToEpoch(local, zone)).toISOString(), expected, `${local} ${zone}`);
}
console.log(`release-time: ${cases.length} cases pass (machine TZ=${process.env.TZ ?? "default"})`);
