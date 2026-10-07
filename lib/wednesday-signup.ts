// Where a WEDNESDAY signup goes. Once the mailing-list backend exists, its
// URL is set as NEXT_PUBLIC_WEDNESDAY_SIGNUP_URL at build time and every
// signup lands on the real list (tagged), which emails the early-access link.
// Until then signups fall back to the label inbox through the contact relay,
// so nobody who signs up is lost — but no early-access email goes out.

import { relayToGroundControl } from "@/lib/relay";

const ENDPOINT = process.env.NEXT_PUBLIC_WEDNESDAY_SIGNUP_URL;

/** True when signups reach the list that sends the early-access email. */
export const sendsEarlyAccess = !!ENDPOINT;

/** Resolves to "queued" when the list kept the signup but the email is delayed. */
export async function joinList(
  email: string,
  tag: string,
  website = "",
): Promise<"sent" | "queued"> {
  if (ENDPOINT) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, tag, website }),
    });
    if (!res.ok) throw new Error(`signup responded ${res.status}`);
    const data = (await res.json().catch(() => ({}))) as { queued?: boolean };
    return data.queued ? "queued" : "sent";
  }
  if (website) return "sent"; // a bot: drop it quietly
  await relayToGroundControl({
    email,
    tag,
    _subject: `NTB Mission Control — WEDNESDAY signup (${tag})`,
  });
  return "sent";
}
