// GET /api/audio/<token> — the full song, streamed with byte ranges (iOS
// needs them to play and seek). Same gate as the page: a valid token, before
// release. The file lives in KV, so it has no public URL of its own.

import { TOKEN_RE, PRIVATE_HEADERS, isReleased, redirectToPublic } from "../../_lib/shared.js";

let song = null; // per-isolate cache; KV reads are ~5MB each otherwise

export async function onRequestGet({ request, params, env }) {
  const token = String(params.token || "");
  if (isReleased(env)) return redirectToPublic(env);
  if (!TOKEN_RE.test(token) || !(await env.NTB_LIST.get(`tok:${token}`))) {
    return new Response("Not found", { status: 404, headers: PRIVATE_HEADERS });
  }

  song ??= await env.NTB_AUDIO.get("song", { type: "arrayBuffer", cacheTtl: 3600 });
  if (!song) return new Response("Not ready", { status: 503, headers: PRIVATE_HEADERS });

  const size = song.byteLength;
  const headers = {
    ...PRIVATE_HEADERS,
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
  };

  const range = request.headers.get("Range");
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m || (m[1] === "" && m[2] === "")) {
    return new Response(song, { status: 200, headers: { ...headers, "Content-Length": String(size) } });
  }
  let start;
  let end;
  if (m[1] === "") {
    // suffix range: the last N bytes
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
  }
  return new Response(song.slice(start, end + 1), {
    status: 206,
    headers: {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
    },
  });
}
