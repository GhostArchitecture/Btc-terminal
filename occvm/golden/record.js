/* occvm/golden/record.js — the golden set.
 *
 * The 2.0 migration process asks for a field-recorded baseline at three sun elevations, diffed against
 * after every change (sections 3.3, 5, 8). Neither repository had an instrument for it: the harnesses are
 * jsdom, which does not render. This is that instrument.
 *
 * It records TWO tiers, and the distinction is load-bearing:
 *
 *   tier 1 — tokens.json.  The computed value of every OCCVM token on documentElement at each pinned
 *            instant. Pure numbers and hexes, byte-stable on any machine. THIS is what CI asserts on.
 *   tier 2 — <case>.png.   A viewport screenshot. Recorded for the eye. NEVER diffed for equality:
 *            font rasterisation and GPU compositing differ per machine, so a pixel-equality gate would
 *            be red on every machine but the one that recorded it. Look at these; do not assert on them.
 *
 * Determinism comes from three pins, all injected rather than internal:
 *   - the clock      (Playwright page.clock, fixed instant)
 *   - the timezone   (America/New_York — Rhyme's solar() reads local getHours(), so an unpinned runner
 *                     timezone moves its day-of-year and therefore its declination)
 *   - the seed       (sessionStorage btc.seed / tome:seed, written before any page script evaluates)
 *
 * Usage:  node occvm/golden/record.js [--tool btc|rhyme|reference] [--out DIR]
 *         node occvm/golden/verify.js            (re-records and diffs tier 1 only)
 *
 * Requires playwright and a Chromium; both are present in the Claude Code web environment.
 */
"use strict";
const fs = require("fs"), path = require("path"), http = require("http"), url = require("url");

const HERE = __dirname;
const REPOS = {
  btc:   { root: path.resolve(HERE, "..", ".."), seedKey: "btc.seed",
           /* --vein is written only by veinLayer(); it has no CSS default, so it cannot pass while dead */
           ready: () => getComputedStyle(document.documentElement).getPropertyValue("--vein").trim() !== "" },
  rhyme: { root: path.resolve(HERE, "..", "..", "..", "Rhyme-Instrument"), seedKey: "tome:seed",
           /* the binding only exists once React has mounted and rendered */
           ready: () => !!document.querySelector(".binding") },
  /* OCCVM 1.8 — the reference surface is recorded like a tool, and it is the only one of the three whose
     drift can ONLY be the spine's: it holds no values of its own, so anything that moves here moved in a
     part. It lives inside this repository, so unlike `rhyme` it is always present in a checkout. */
  reference: { root: path.resolve(HERE, "..", "reference"), seedKey: "occvm.seed",
               /* the token table is the last thing the page paints, and it needs every part alive */
               ready: () => document.querySelectorAll("#tok tr").length > 0
                            && getComputedStyle(document.documentElement).getPropertyValue("--vein").trim() !== "" },
};

/* Pinned instants over Dayton. Elevations are from occvm/tools/solar-compare.js, not asserted here. */
const CASES = [
  { name: "low",   iso: "2026-09-06T11:30:00Z", note: "elev +3.06 deg, az 84.3 (E) — rake at its longest" },
  { name: "high",  iso: "2026-09-06T17:45:00Z", note: "elev +56.40 deg, az 184.5 (S) — near solar noon" },
  { name: "night", iso: "2026-09-07T04:00:00Z", note: "elev -39.21 deg, az 328.9 — night in both tools" },
];
/* Nothing is vendored any more. Until OCCVM 1.6 Rhyme pulled React, ReactDOM and babel-standalone from
   a CDN and could not boot without them, so the recorder served them from a local cache to keep the
   measurement off the network. 1.6 inlined React and deleted the compiler; both tools now refuse all
   egress and still render, which is the exit criterion rather than a harness convenience. */
const VENDOR = {};
const VENDOR_DIR = path.join(HERE, ".vendor");
function ensureVendor() {
  fs.mkdirSync(VENDOR_DIR, { recursive: true });
  for (const [u, f] of Object.entries(VENDOR)) {
    const dest = path.join(VENDOR_DIR, f);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
    console.log("  fetching " + f + " ...");
    const r = require("child_process").spawnSync("curl", ["-sSL", "--max-time", "120", u, "-o", dest], { stdio: "inherit" });
    if (r.status !== 0 || !fs.existsSync(dest) || !fs.statSync(dest).size)
      throw new Error(`could not vendor ${u}`);
  }
}

const SEED = "20260906";
const TZ = "America/New_York";
const VIEW = { width: 1200, height: 900 };

/* The token list is derived from the tools themselves at record time, so a token added to either tool
   appears in the next manifest instead of being silently missed by a hand-kept list. */
/* Which tokens to read off the page.
 *
 * THE LIST MUST NOT DEPEND ON WHICH REPOSITORIES HAPPEN TO BE PRESENT. It used to: the union was built
 * from every repo this checkout could see, and eleven tokens the sundial writes are declared in CSS only
 * by Rhyme. On a machine with both clones the union carried them; in CI, which checks out one repository,
 * it did not — so the recorder queried 59 tokens instead of 69 and eleven live values read <absent>
 * against the baseline. The values were in the page the whole time. A measured key set that can quietly
 * narrow is a diff that quietly stops testing things, which is worse than one that fails.
 *
 * A tool is therefore scanned for the tokens IT names, from the whole file rather than the style block
 * alone: CSS declarations, setProperty/set calls, and the object keys the shared sundial returns — that
 * object is the authoritative list of what the light writes, and it is spliced into every tool.
 */
function tokenNames(root) {
  const f = path.join(root, "index.html");
  if (!fs.existsSync(f)) return null;
  const html = fs.readFileSync(f, "utf8");
  const names = new Set();
  const styles = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join("\n");
  for (const m of styles.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) names.add(m[1]);
  for (const m of html.matchAll(/(?:setProperty|set)\(\s*"(--[a-zA-Z0-9-]+)"/g)) names.add(m[1]);
  for (const m of html.matchAll(/"(--[a-zA-Z0-9-]+)"\s*:/g)) names.add(m[1]);
  return [...names].sort();
}

function serve(root) {
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
                  ".png": "image/png", ".webmanifest": "application/manifest+json", ".txt": "text/plain" };
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent(url.parse(req.url).pathname);
    const f = path.join(root, p === "/" ? "index.html" : p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("nf"); }
    res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ srv, port: srv.address().port })));
}

async function record(tool, outDir) {
  const { chromium } = require("playwright");
  /* BTC refuses all egress and needs nothing vendored; only Rhyme cannot boot without a CDN. */
  if (REPOS[tool].needsVendor) ensureVendor();
  const cfg = REPOS[tool];
  if (!fs.existsSync(path.join(cfg.root, "index.html")))
    return { tool, skipped: `no index.html at ${cfg.root} — clone the sibling repository to record both` };

  const TOKENS = tokenNames(cfg.root);
  if (!TOKENS || !TOKENS.length) throw new Error(`${tool}: no tokens found — refusing to record an empty manifest`);
  const { srv, port } = await serve(cfg.root);
  const browser = await chromium.launch();
  const out = { tool, recorded_by: "occvm/golden/record.js", seed: SEED, timezone: TZ,
                viewport: VIEW, tokens: TOKENS.length, token_names: TOKENS, cases: {} };
  try {
    for (const c of CASES) {
      const ctx = await browser.newContext({
        viewport: VIEW, deviceScaleFactor: 1, timezoneId: TZ, locale: "en-US",
        colorScheme: "dark", reducedMotion: "reduce",
      });
      /* every external request is recorded and refused except the ones a tool cannot boot without */
      const blocked = [], vendored = [];
      await ctx.route("**", async route => {
        const u = route.request().url();
        if (u.includes("127.0.0.1:" + port)) return route.continue();
        const key = u.split("?")[0];
        if (VENDOR[key]) {
          vendored.push(key);
          return route.fulfill({ status: 200, contentType: "text/javascript",
            body: fs.readFileSync(path.join(VENDOR_DIR, VENDOR[key])) });
        }
        /* every other egress is refused: the recording measures the tool, never the network */
        blocked.push(key);
        return route.abort();
      });
      const page = await ctx.newPage();
      /* setFixedTime pins Date and Date.now only. The install() variant also fakes timers, and React 18
         schedules through them, so under it Rhyme never mounts and the recording silently captures
         :root defaults as though they were live values. Pin the wall clock; leave the event loop alone. */
      await page.clock.setFixedTime(new Date(c.iso));
      await page.addInitScript(([k, v]) => {
        try { sessionStorage.setItem(k, v); } catch (e) {}
      }, [cfg.seedKey, SEED]);

      const errors = [];
      page.on("pageerror", e => errors.push("pageerror: " + String(e.message || e)));
      page.on("console", m => {
        if (m.type() !== "error") return;
        const t = m.text();
        /* the recorder refuses egress on purpose; the resulting load failures are the instrument
           working, not the tool failing. Real exceptions still arrive through pageerror. */
        if (/Failed to load resource|net::ERR_/.test(t)) return;
        errors.push("console: " + t);
      });
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
      /* Fatal, deliberately. A recording of a tool that never booted is worse than no recording: it
         looks like a clean baseline, and every later diff is then measured against a blank page. */
      await page.waitForFunction(cfg.ready, undefined, { timeout: 20000 }).catch(() => {
        throw new Error(`${tool}/${c.name}: the tool never became ready — refusing to record a dead page.` +
          (errors.length ? "\n  " + errors.join("\n  ") : "\n  (no page or console errors reported)"));
      });

      const values = await page.evaluate(list => {
        const cs = getComputedStyle(document.documentElement);
        const o = {};
        for (const n of list) { const v = cs.getPropertyValue(n).trim(); if (v !== "") o[n] = v; }
        return o;
      }, TOKENS);

      fs.mkdirSync(path.join(outDir, tool), { recursive: true });
      await page.screenshot({ path: path.join(outDir, tool, c.name + ".png") });

      out.cases[c.name] = {
        instant: c.iso, note: c.note,
        vendored_requests: [...new Set(vendored)].sort(),
        blocked_requests: [...new Set(blocked)].sort(),
        page_errors: errors,
        tokens: values,
      };
      await ctx.close();
      console.log(`  ${tool}/${c.name}: ${Object.keys(values).length} tokens` +
                  (errors.length ? `, ${errors.length} PAGE ERROR(S)` : "") +
                  (vendored.length ? `, ${new Set(vendored).size} vendored` : "") +
                  (blocked.length ? `, ${new Set(blocked).size} blocked` : ""));
    }
  } finally { await browser.close(); srv.close(); }

  fs.writeFileSync(path.join(outDir, tool, "tokens.json"), JSON.stringify(out, null, 1) + "\n");
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const only = argv.includes("--tool") ? argv[argv.indexOf("--tool") + 1] : null;
  const outDir = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : HERE;
  for (const tool of Object.keys(REPOS)) {
    if (only && tool !== only) continue;
    const r = await record(tool, outDir);
    if (r.skipped) console.log(`  ${tool}: SKIPPED — ${r.skipped}`);
  }
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { record, tokenNames, CASES, SEED, TZ, TOOLS: Object.keys(REPOS) };
