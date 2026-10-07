// /api/unsub?t=<token> — GET shows a one-button confirm (so link scanners in
// mail filters can't unsubscribe anyone); POST unsubscribes, which is also
// what Gmail and Apple Mail's one-click unsubscribe send.

import { TOKEN_RE, escapeHtml, getSubscriber, html, page, putSubscriber, resend } from "../_lib/shared.js";

async function emailFor(env, url) {
  const token = url.searchParams.get("t") || "";
  if (!TOKEN_RE.test(token)) return null;
  return env.NTB_LIST.get(`tok:${token}`);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const email = await emailFor(env, url);
  if (!email) return html(page("Unsubscribe", `<p class="hud">// LINK NOT RECOGNISED</p>`), 404);
  return html(
    page(
      "Unsubscribe",
      `<p class="kicker">NOT TO B.A.D RECORDS</p>
<p class="hud">// UNSUBSCRIBE</p>
<p class="note" style="font-size:.9rem">Stop all emails to <strong>${escapeHtml(email)}</strong>?</p>
<form method="post" action="${escapeHtml(url.pathname + url.search)}"><button class="btn" type="submit">UNSUBSCRIBE</button></form>`,
    ),
  );
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const email = await emailFor(env, url);
  if (!email) return html(page("Unsubscribe", `<p class="hud">// LINK NOT RECOGNISED</p>`), 404);

  await resend(env, "PATCH", `/contacts/${encodeURIComponent(email)}`, { unsubscribed: true });
  const record = await getSubscriber(env, email);
  if (record) {
    record.unsubscribed = true;
    record.unsubscribedAt = new Date().toISOString();
    await putSubscriber(env, email, record);
  }
  return html(
    page(
      "Unsubscribed",
      `<p class="kicker">NOT TO B.A.D RECORDS</p><p class="hud">// UNSUBSCRIBED</p><p class="note" style="font-size:.9rem">You won't get any more emails from us. Safe travels, Cadet.</p>`,
    ),
  );
}
