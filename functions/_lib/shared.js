// Shared by the WEDNESDAY functions (Cloudflare Pages Functions).
//
// Bindings (Pages project → Settings → Bindings):
//   NTB_LIST   KV namespace: subscribers and listen tokens
//   NTB_AUDIO  KV namespace: the full song, under the key "song"
// Variables and secrets (Settings → Variables and Secrets):
//   RESEND_API_KEY        secret
//   RESEND_SEGMENT_EARLY  segment id for "wednesday-early"
//   RESEND_SEGMENT_WEEKLY segment id for "take-off-thursdays"
//   MAIL_FROM             e.g. Simon Auguste <music@mail.nottobadrecords.com>
//   POSTAL_ADDRESS        the label's mailing address (printed in every email)
//   EXPORT_KEY            secret for /api/export
//   RELEASE_AT            optional override, ISO time (tests only)
//   PUBLIC_RELEASE_URL    optional, defaults to https://www.nottobadrecords.com/wednesday/
//   ALLOWED_ORIGINS       optional, comma-separated

// Friday, October 9, 2026, 12:00 AM Eastern (EDT, UTC−4). The site computes
// the same instant from the zone; scripts/test-release-time.mjs pins it.
export const RELEASE_AT_DEFAULT = "2026-10-09T04:00:00Z";

export function releaseAt(env) {
  const t = Date.parse(env.RELEASE_AT || RELEASE_AT_DEFAULT);
  return Number.isFinite(t) ? t : Date.parse(RELEASE_AT_DEFAULT);
}

export function isReleased(env) {
  return Date.now() >= releaseAt(env);
}

export function publicReleaseUrl(env) {
  return env.PUBLIC_RELEASE_URL || "https://www.nottobadrecords.com/wednesday/";
}

/** 128 random bits, URL-safe: not guessable, not derivable from the email. */
export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Private responses: never cached, never indexed, never leak the URL onward. */
export const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};

export function redirectToPublic(env) {
  return new Response(null, {
    status: 302,
    headers: { Location: publicReleaseUrl(env), ...PRIVATE_HEADERS },
  });
}

export function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...PRIVATE_HEADERS },
  });
}

/** Minimal page shell in the site's look (obsidian, blood, Cinzel titles). */
export function page(title, inner, extraHead = "") {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#09080d">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@900&family=Inter:wght@400;700&display=swap">
<style>
*{box-sizing:border-box}html,body{margin:0;background:#09080d;color:#ebeef1;font-family:Inter,system-ui,sans-serif;-webkit-text-size-adjust:100%}
body{min-height:100svh;background:radial-gradient(circle at 50% 22%,rgba(180,28,37,.22),transparent 60%) #09080d}
main{max-width:30rem;margin:0 auto;padding:28px 20px 56px;text-align:center}
.kicker{font-size:.62rem;letter-spacing:.4em;color:#95999f;text-transform:uppercase}
.hud{font-size:.72rem;letter-spacing:.3em;color:#b41c25;text-transform:uppercase;margin:28px 0 0}
h1{font-family:"Cinzel Decorative",serif;font-weight:900;font-size:2.3rem;line-height:1.05;margin:12px 0 0;color:#ffd7ea;text-shadow:0 0 6px #ff2e88,0 0 24px rgba(255,46,136,.7),0 0 64px rgba(255,46,136,.4)}
.cover{width:100%;aspect-ratio:1;border-radius:6px;border:1px solid rgba(255,255,255,.1);box-shadow:0 30px 80px -20px rgba(180,28,37,.55);margin-top:22px;display:block;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;pointer-events:none}
.panel{background:rgba(8,18,43,.55);border:1px solid rgba(180,28,37,.3);border-radius:12px;padding:16px;margin-top:22px;text-align:left}
.note{font-size:.75rem;color:rgba(235,238,241,.5);line-height:1.6;margin-top:14px}
.btn{display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(180,28,37,.3),rgba(180,28,37,.14));border:1px solid #b41c25;color:#ebeef1;border-radius:999px;padding:12px 22px;font:700 .72rem Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;text-decoration:none}
a{color:#ebeef1}
</style>${extraHead}
</head><body><main>${inner}</main></body></html>`;
}

export function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "https://www.nottobadrecords.com,https://nottobadrecords.com")
    .split(",")
    .map((s) => s.trim());
  const self = new URL(request.url).origin;
  if (!origin || (origin !== self && !allowed.includes(origin))) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const RESEND = (env) => env.RESEND_API_BASE || "https://api.resend.com";

export async function resend(env, method, path, body) {
  const res = await fetch(RESEND(env) + path, {
    method,
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

export async function getSubscriber(env, email) {
  return env.NTB_LIST.get(`em:${email}`, "json");
}

export async function putSubscriber(env, email, record) {
  await env.NTB_LIST.put(`em:${email}`, JSON.stringify(record));
}
