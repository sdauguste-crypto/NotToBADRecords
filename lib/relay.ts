// Backend-free form delivery. FormSubmit forwards each submission to the
// label inbox, so the static site can receive mail with no server.
//
// Note: the first submission to a fresh address triggers a one-time
// activation email that must be confirmed before delivery begins.

import { contactEmail } from "@/lib/content";

const RELAY_URL = `https://formsubmit.co/ajax/${contactEmail}`;

/** POSTs the fields to ground control. Throws if the relay refuses. */
export async function relayToGroundControl(
  fields: Record<string, string>,
): Promise<void> {
  const res = await fetch(RELAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ _template: "table", _captcha: "false", ...fields }),
  });
  if (!res.ok) throw new Error(`relay responded ${res.status}`);
}
