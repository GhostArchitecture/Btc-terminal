// Cloudflare Pages Function — same-origin relay to Kalshi's public API.
// Route: /api/*  →  https://api.elections.kalshi.com/trade-api/v2/*
// Read-only (GET), no credentials, no caching. Exists because Kalshi's edge
// rejects cross-origin browser requests; same-origin requests need no CORS.
const UPSTREAM = "https://api.elections.kalshi.com/trade-api/v2";
const ALLOW = /^\/(markets|events|series)(\/|$)/;

export async function onRequest({ request, params }) {
  if (request.method !== "GET") return new Response("GET only", { status: 405 });
  const path = "/" + (params.path || []).join("/");
  if (!ALLOW.test(path)) return new Response("path not allowed", { status: 403 });
  const u = new URL(request.url);
  const target = UPSTREAM + path + u.search;
  try {
    const r = await fetch(target, { headers: { accept: "application/json" } });
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: { "content-type": "application/json", "cache-control": "no-store" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "upstream", message: String(e) }), {
      status: 502, headers: { "content-type": "application/json", "cache-control": "no-store" }
    });
  }
}
