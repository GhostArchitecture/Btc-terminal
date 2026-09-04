// Cloudflare Pages Function — same-origin relay to Kalshi's public API.
// Route: /api/*  →  https://api.elections.kalshi.com/trade-api/v2/*
// Read-only, no credentials. Memoizes responses briefly (Cache API) so reloads
// and extra tabs do not multiply upstream requests; passes 429/Retry-After through.
const UPSTREAM = "https://api.elections.kalshi.com/trade-api/v2";
const ALLOW = /^\/(markets|events|series)(\/|$)/;

function ttlFor(path, search) {
  if (/\/orderbook$/.test(path)) return 3;
  if (/status=(settled|unopened)/.test(search)) return 60;
  if (/series_ticker=KXBTCD/.test(search)) return 20;
  return 8;
}

export async function onRequest({ request, params }) {
  if (request.method !== "GET") return new Response("GET only", { status: 405 });
  const path = "/" + (params.path || []).join("/");
  if (!ALLOW.test(path)) return new Response("path not allowed", { status: 403 });
  const u = new URL(request.url);
  const target = UPSTREAM + path + u.search;
  const ttl = ttlFor(path, u.search);
  const cache = caches.default;
  const key = new Request(target, { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const r = await fetch(target, { headers: { accept: "application/json" } });
    const body = await r.text();
    const h = { "content-type": "application/json", "cache-control": "no-store", "x-relay-upstream-status": String(r.status) };
    if (r.status === 429) {
      const ra = r.headers.get("retry-after");
      if (ra) h["retry-after"] = ra;
      return new Response(body || '{"error":"rate_limited"}', { status: 429, headers: h });
    }
    const res = new Response(body, { status: r.status, headers: h });
    if (r.ok) {
      const cached = new Response(body, { status: 200, headers: { "content-type": "application/json", "cache-control": "public, max-age=" + ttl } });
      await cache.put(key, cached);
    }
    return res;
  } catch (e) {
    return new Response(JSON.stringify({ error: "upstream", message: String(e) }), {
      status: 502, headers: { "content-type": "application/json", "cache-control": "no-store" }
    });
  }
}
