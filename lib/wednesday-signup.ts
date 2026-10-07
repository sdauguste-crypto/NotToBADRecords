// Where a WEDNESDAY signup goes. Once the mailing-list backend exists, its
// URL is set as NEXT_PUBLIC_WEDNESDAY_SIGNUP_URL at build time and every
// signup lands on the real list (tagged), which emails the early-access link.
// Until then signups fall back to the label inbox through the contact relay,
// so nobody who signs up is lost — but no early-access email goes out.

import { relayToGroundControl } from "@/lib/relay";

const ENDPOINT = process.env.NEXT_PUBLIC_WEDNESDAY_SIGNUP_URL;

/** True when signups reach the list that sends the early-access email. */
export const sendsEarlyAccess = !!ENDPOINT;

export async function joinList(email: string, tag: string): Promise<void> {
  if (ENDPOINT) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, tag }),
    });
    if (!res.ok) throw new Error(`signup responded ${res.status}`);
    return;
  }
  await relayToGroundControl({
    email,
    tag,
    _subject: `NTB Mission Control — WEDNESDAY signup (${tag})`,
  });
}
