// GET /api/export?key=<EXPORT_KEY> — every signup as a CSV, straight from the
// site's own records (a second copy alongside Resend's contact export).

import { PRIVATE_HEADERS } from "../_lib/shared.js";

function csvCell(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function onRequestGet({ request, env }) {
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!env.EXPORT_KEY || key !== env.EXPORT_KEY) {
    return new Response("Forbidden", { status: 403, headers: PRIVATE_HEADERS });
  }
  const rows = [["email", "tags", "signed_up", "early_link_sent", "pending_email", "unsubscribed"]];
  let cursor;
  do {
    const page = await env.NTB_LIST.list({ prefix: "em:", cursor });
    const records = await Promise.all(page.keys.map((k) => env.NTB_LIST.get(k.name, "json")));
    for (const r of records) {
      if (!r) continue;
      rows.push([r.email, (r.tags || []).join(" "), r.created, r.sentAt || "", r.pending ? "yes" : "", r.unsubscribed ? "yes" : ""]);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const date = new Date().toISOString().slice(0, 10);
  return new Response(rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n", {
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ntb-list-${date}.csv"`,
    },
  });
}
