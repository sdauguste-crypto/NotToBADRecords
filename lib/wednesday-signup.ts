// Where a signup goes: the Kit list, through the public endpoint of the
// "Newsletter site" form. It takes a plain POST from any site, so nothing
// secret lives in the page. Kit applies the form's own settings (tags,
// confirmation email) on its side. If Kit can't be reached, the signup falls
// back to the label inbox through the contact relay, so nobody is lost.

import { relayToGroundControl } from "@/lib/relay";

export const KIT_FORM_ID = 10052240;
export const KIT_ENDPOINT = `https://app.kit.com/forms/${KIT_FORM_ID}/subscriptions`;

/** Resolves once the signup is kept somewhere; throws if it wasn't. */
export async function joinList(email: string, tag: string, website = ""): Promise<void> {
  if (website) return; // a bot filled the hidden field: drop it quietly

  try {
    const body = new FormData();
    body.append("email_address", email);
    const res = await fetch(KIT_ENDPOINT, {
      method: "POST",
      body,
      headers: { Accept: "application/json" },
    });
    const data = (await res.json().catch(() => null)) as { status?: string } | null;
    if (res.ok && data?.status !== "failed") return;
    throw new Error(`kit responded ${res.status} ${data?.status ?? ""}`);
  } catch (err) {
    console.warn("Kit signup failed; sending it to the label inbox instead", err);
    await relayToGroundControl({
      email,
      tag,
      _subject: `NTB Mission Control — signup (${tag}) — Kit was unreachable, add by hand`,
    });
  }
}
