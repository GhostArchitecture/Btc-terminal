// Alternate-pool relay to Kalshi's public API — Cloudflare Worker. Read-only, keyless.
// Deploy: dash.cloudflare.com (a SEPARATE account from the one hosting btc-terminal.pages.dev,
// so egress lands in a different pool) -> Compute/Workers -> Create -> Start from Hello World
// -> replace the worker code with this file -> Deploy. Paste the workers.dev URL into the
// instrument: DATA -> Advanced -> relay URL -> TEST.
const UP = "https://api.elections.kalshi.com/trade-api/v2";
const ALLOW = /^\/(markets|events|series)(\/|$)/;
const CORS = {
  "access-control-allow-origin": "*",          // public read-only data
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "accept, content-type",
  "cache-control": "no-store",
};

export default {
  async fetch(request) {
    const u = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "GET") return new Response("GET only", { status: 405, headers: CORS });
    if (!ALLOW.test(u.pathname)) return new Response("path not allowed", { status: 403, headers: CORS });

    const target = UP + u.pathname + u.search;
    // brief edge memoization so reloads and extra tabs do not multiply upstream requests
    const memo = /orderbook/.test(u.pathname) ? 3 : /status=(settled|unopened)/.test(u.search) ? 60 : 8;
    const key = new Request(target, { method: "GET" });
    const cache = caches.default;
    let hit = await cache.match(key);
    if (hit) {
      const h = new Headers(hit.headers); Object.entries(CORS).forEach(([k, v]) => h.set(k, v)); h.set("x-relay-cache", "hit");
      return new Response(hit.body, { status: hit.status, headers: h });
    }
    try {
      const r = await fetch(target, { headers: { accept: "application/json" } });
      const body = await r.text();
      const h = new Headers({ ...CORS, "content-type": "application/json", "x-relay-upstream-status": String(r.status), "x-relay-cache": "miss" });
      const ra = r.headers.get("retry-after"); if (ra) h.set("retry-after", ra);
      if (r.ok) {
        const c = new Response(body, { status: r.status, headers: new Headers({ "content-type": "application/json", "cache-control": `max-age=${memo}` }) });
        await cache.put(key, c.clone());
      }
      return new Response(body, { status: r.status, headers: h });
    } catch (e) {
      return new Response(JSON.stringify({ error: "upstream", message: String(e) }), { status: 502, headers: { ...CORS, "content-type": "application/json" } });
    }
  },
};
