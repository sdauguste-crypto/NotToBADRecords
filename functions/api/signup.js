// POST /api/signup  { email }
// Before release: tag "wednesday-early" and email a private listen link.
// After release: tag "take-off-thursdays" (no email — the weekly drops are
// sent as broadcasts from Resend, which add their own unsubscribe link).

import {
  EMAIL_RE,
  corsHeaders,
  escapeHtml,
  getSubscriber,
  isReleased,
  newToken,
  putSubscriber,
  releaseAt,
  resend,
} from "../_lib/shared.js";

const RESEND_COOLDOWN_MS = 5 * 60_000;

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors },
  });
}

export function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

export async function onRequestPost({ request, env }) {
  const cors = corsHeaders(request, env);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad-request" }, 400, cors);
  }
  // bots fill every field; people never see this one
  if (body.website) return json({ ok: true }, 200, cors);

  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: "invalid-email" }, 400, cors);
  }

  const released = isReleased(env);
  const tag = released ? "take-off-thursdays" : "wednesday-early";
  const segment = released ? env.RESEND_SEGMENT_WEEKLY : env.RESEND_SEGMENT_EARLY;

  const now = Date.now();
  const existing = await getSubscriber(env, email);
  const record = existing || { email, created: new Date(now).toISOString(), tags: [] };
  if (!record.tags.includes(tag)) record.tags.push(tag);
  record.unsubscribed = false;

  // the list of record: the Resend contact, in the tag's segment
  const created = await resend(env, "POST", "/contacts", {
    email,
    unsubscribed: false,
    segments: segment ? [{ id: segment }] : undefined,
  });
  if (!created.ok) {
    // already a contact: resubscribe and add the segment
    await resend(env, "PATCH", `/contacts/${encodeURIComponent(email)}`, { unsubscribed: false });
    if (segment) {
      await resend(env, "POST", `/contacts/${encodeURIComponent(email)}/segments/${segment}`);
    }
  }

  if (released) {
    await putSubscriber(env, email, record);
    return json({ ok: true, early: false }, 200, cors);
  }

  // early access: one private token per subscriber, reused on repeat signups
  if (!record.token) {
    record.token = newToken();
    await env.NTB_LIST.put(`tok:${record.token}`, email);
  }

  const recentlySent = record.sentAt && now - Date.parse(record.sentAt) < RESEND_COOLDOWN_MS;
  if (!recentlySent) {
    const sent = await sendEarlyAccess(env, request, email, record.token);
    if (sent.ok) {
      record.sentAt = new Date(now).toISOString();
      delete record.pending;
    } else {
      // e.g. the free plan's daily cap: keep them, flag for a manual resend
      record.pending = true;
      console.log("early-access email failed", sent.status, JSON.stringify(sent.data));
    }
  }
  await putSubscriber(env, email, record);
  return json({ ok: true, early: true, queued: !!record.pending }, 200, cors);
}

async function sendEarlyAccess(env, request, email, token) {
  if (!env.POSTAL_ADDRESS || !env.MAIL_FROM || !env.RESEND_API_KEY) {
    // the mailing address is required by law in every email: no address, no send
    return { ok: false, status: 0, data: "missing MAIL_FROM / POSTAL_ADDRESS / RESEND_API_KEY" };
  }
  const origin = new URL(request.url).origin;
  const listen = `${origin}/l/${token}`;
  const unsub = `${origin}/api/unsub?t=${token}`;
  const until = new Date(releaseAt(env)).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const address = escapeHtml(env.POSTAL_ADDRESS);

  const html = `<!doctype html><html><body style="margin:0;background:#09080d;color:#ebeef1;font-family:Helvetica,Arial,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:32px 20px;text-align:center">
<p style="font-size:11px;letter-spacing:4px;color:#95999f;margin:0">SIMON AUGUSTE · NOT TO B.A.D RECORDS</p>
<p style="font-size:12px;letter-spacing:3px;color:#b41c25;margin:28px 0 0">// EARLY ACCESS — SPACE CADETS ONLY</p>
<h1 style="font-size:34px;letter-spacing:2px;color:#ffd7ea;margin:10px 0 0">WEDNESDAY</h1>
<p style="font-size:15px;line-height:1.6;color:#ebeef1;margin:20px 0 0">You hear it first. Your private link plays the full song in your browser — it's yours alone, so keep it to yourself.</p>
<p style="margin:28px 0"><a href="${listen}" style="display:inline-block;background:#b41c25;color:#ffffff;text-decoration:none;font-weight:bold;letter-spacing:3px;font-size:13px;padding:16px 28px;border-radius:999px">LISTEN NOW →</a></p>
<p style="font-size:12px;line-height:1.6;color:#95999f;margin:0">The link works until ${escapeHtml(until)} ET, when WEDNESDAY comes out everywhere.</p>
<hr style="border:0;border-top:1px solid #222;margin:32px 0 16px">
<p style="font-size:11px;line-height:1.7;color:#6b6f75;margin:0">You're getting this because you signed up at nottobadrecords.com/wednesday.<br>
<a href="${unsub}" style="color:#95999f">Unsubscribe</a><br>Not To B.A.D Records · ${address}</p>
</div></body></html>`;

  const text = `WEDNESDAY — early access, Space Cadets only.

Your private link (plays the full song in your browser; keep it to yourself):
${listen}

It works until ${until} ET, when WEDNESDAY comes out everywhere.

—
You're getting this because you signed up at nottobadrecords.com/wednesday.
Unsubscribe: ${unsub}
Not To B.A.D Records · ${env.POSTAL_ADDRESS}`;

  return resend(env, "POST", "/emails", {
    from: env.MAIL_FROM,
    to: [email],
    subject: "WEDNESDAY — your early listen, Cadet",
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${unsub}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
