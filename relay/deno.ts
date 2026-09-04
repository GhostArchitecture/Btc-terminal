// Alternate-IP relay to Kalshi's public API (Deno Deploy). Read-only, keyless.
// Deploy from GitHub with this file as the entrypoint; paste the resulting
// https://<name>.deno.dev URL into TUNE -> relay URL. History queries route here.
const UP = "https://api.elections.kalshi.com/trade-api/v2";
const ALLOW = /^\/(markets|events|series)(\/|$)/;
const ORIGINS = ["https://btc-terminal.pages.dev", "https://ghostarchitecture.github.io", "http://localhost:8080"];

Deno.serve(async (req: Request): Promise<Response> => {
  const u = new URL(req.url);
  const o = req.headers.get("origin") || "";
  const cors: Record<string, string> = {
    "access-control-allow-origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "vary": "origin",
    "cache-control": "no-store",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET") return new Response("GET only", { status: 405, headers: cors });
  if (!ALLOW.test(u.pathname)) return new Response("path not allowed", { status: 403, headers: cors });
  try {
    const r = await fetch(UP + u.pathname + u.search, { headers: { accept: "application/json" } });
    const h: Record<string, string> = { ...cors, "content-type": "application/json", "x-relay-upstream-status": String(r.status) };
    const ra = r.headers.get("retry-after"); if (ra) h["retry-after"] = ra;
    return new Response(await r.text(), { status: r.status, headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: "upstream", message: String(e) }), { status: 502, headers: { ...cors, "content-type": "application/json" } });
  }
});
