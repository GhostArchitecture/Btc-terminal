/* BTC Terminal — offline shell. OCCVM-D5, roadmap 1.6: no tool installs to a home screen it cannot serve.
 *
 * manifest.webmanifest and four icons shipped from the beginning with no service worker behind them, so
 * the tool installed to a home screen and then failed to open without a network. This is the other half.
 *
 * THREE RULES, AND THE FIRST TWO ARE ABOUT NOT LYING.
 *
 * 1. Market data is NEVER cached. Every exchange, every Kalshi relay, every /api path is network-only and
 *    passes straight through. A cached price is a wrong price, and this tool's entire purpose is
 *    measurement — CLAUDE.md section 9. A stale tape would be worse than no tape.
 *
 * 2. The page is network-first. A deploy must land the moment the recorder is online, because the deploy
 *    procedure verifies by build stamp (CLAUDE.md section 1 step 4) and a cache-first shell would let a
 *    browser sit on an old stamp indefinitely. The cache is the fallback, not the source.
 *
 * 3. The cache name is the build stamp, passed by the registering page as ?v=. The script URL therefore
 *    changes on every deploy, which is what makes the browser install the new worker at all. Nothing is
 *    hand-bumped; a version cannot be forgotten.
 */
const V = "btc-" + (new URL(self.location).searchParams.get("v") || "dev");
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-180.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./favicon-32.png"];

self.addEventListener("install", e => {
  /* addAll is all-or-nothing; one missing icon would leave the tool with no offline shell at all, so
     each entry is added on its own and a failure is skipped rather than fatal. */
  e.waitUntil(caches.open(V)
    .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* Rule 1: anything that is not this origin's own shell goes to the network, untouched and uncached.
     That is every exchange socket fallback, every Kalshi relay, and the same-origin /api function. */
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api")) return;

  const isPage = url.pathname === "/" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html");
  if (isPage) {
    /* Rule 2: network first, so a new stamp lands as soon as the recorder is online. */
    e.respondWith(
      fetch(req).then(r => {
        if (r && r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); }
        return r;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  /* Icons and the manifest are immutable per build: cache first, fall back to the network. */
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
    if (res && res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(req, c)); }
    return res;
  }).catch(() => r)));
});
