// This Pages project serves the private listen links and the list API; the
// public site lives at www. Nothing here should be indexed.
export async function onRequest(context) {
  const response = await context.next();
  const res = new Response(response.body, response);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
