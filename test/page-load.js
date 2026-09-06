/* Full-page load under jsdom (§6): zero init errors with the network blocked, then three ticks of the 1 Hz loop and one frame.
   Run: node test/page-load.js   (needs `npm install` for jsdom) */
"use strict";
const fs = require("fs");
const { INDEX, mkCtx, runner } = require("./lib/load");

let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require("jsdom")); }
catch (e) { console.log("SKIP page-load: jsdom not installed (npm install)"); process.exit(0); }

const { T, done } = runner("page-load");
const html = fs.readFileSync(INDEX, "utf8");
const errors = [], rejections = [], intervals = [], rafs = [], fetches = [];
const vc = new VirtualConsole();
vc.on("jsdomError", e => errors.push("jsdomError: " + (e && (e.stack || e.message) || e)));
process.on("unhandledRejection", e => rejections.push(String(e && (e.stack || e.message) || e)));

const dom = new JSDOM(html, {
  url: "https://btc-terminal.pages.dev/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    window.HTMLCanvasElement.prototype.getContext = function () { return this._ctx || (this._ctx = mkCtx()); };
    window.WebSocket = class { constructor(url) { this.url = url; } send() {} close() {} addEventListener() {} };
    window.fetch = (u) => { fetches.push(String(u)); return Promise.reject(new TypeError("network blocked in harness")); };
    window.setInterval = (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; };
    window.requestAnimationFrame = fn => { rafs.push(fn); return rafs.length; };
    window.addEventListener("error", e => errors.push("window.error: " + (e.error && e.error.stack || e.message)));
  },
});
const w = dom.window;
const g = expr => w.eval(expr);                          /* top-level const/let in a classic script are not window properties */

(async () => {
  await new Promise(r => setTimeout(r, 200));           /* let init() run through the blocked seed and start polling */
  T("no uncaught error during script evaluation and init", errors.length === 0, errors);
  T("no unhandled promise rejection during init", rejections.length === 0, rejections);
  T("init reached the seed fallback and the pollers with the network blocked", /cold start/.test(g("S.seedInfo")) && fetches.some(u => /api\.kraken\.com/.test(u)), { seedInfo: g("S.seedInfo"), fetches: fetches.length });
  const hz = intervals.find(i => i.ms === 1000);
  T("the 1 Hz loop and the 3 s REST poller are registered", !!hz && intervals.some(i => i.ms === 3000), intervals.map(i => i.ms));
  const tickErrors = [];
  for (let i = 0; i < 3; i++) { try { hz.fn(); } catch (e) { tickErrors.push(String(e.stack || e)); } await new Promise(r => setTimeout(r, 20)); }
  T("three ticks of the 1 Hz loop throw nothing", tickErrors.length === 0, tickErrors);
  const frameErrors = [];
  try { rafs[0](1000); } catch (e) { frameErrors.push(String(e.stack || e)); }
  T("one canvas frame renders without throwing", frameErrors.length === 0 && rafs.length >= 2, frameErrors);
  T("canvas drew the idle header", w.document.getElementById("chart")._ctx._calls.some(c => c.op === "fillText"), null);
  const meta = w.document.querySelector('meta[name="theme-color"]');
  T("theme-color meta is the obsidian value (§8 item resolved)", meta && meta.content === "#1b1a22", meta && meta.content);
  T("verdict reads NOT READY on an empty ledger", /NOT READY/.test(w.document.getElementById("verdictbox").textContent), w.document.getElementById("verdictbox").textContent);
  T("viability strip reads NEGATIVE with no live fills", /NEGATIVE/.test(w.document.getElementById("vstrip").textContent), w.document.getElementById("vstrip").textContent.slice(0, 120));
  T("sundial set the four light custom properties", ["--lx", "--ly", "--elev", "--night"].every(p => w.document.documentElement.style.getPropertyValue(p) !== ""), null);

  /* §10.3 SEC1: EXPAND/COLLAPSE ALL must not be discarded by the very next single-section toggle (shared SEC_STATE, not two stale closures) */
  g("setAllSections(true)");
  const afterAll = JSON.parse(w.localStorage.getItem("btc.sections.v2"));
  const verdictHead = w.document.querySelector('section[data-key="verdict"] .shead');
  verdictHead.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const afterToggle = JSON.parse(w.localStorage.getItem("btc.sections.v2"));
  const otherKeysStillClosed = Object.keys(afterAll).filter(k => k !== "verdict").every(k => afterToggle[k] === 1);
  T("collapsing every section then expanding one keeps the rest collapsed in storage", afterToggle.verdict === 0 && otherKeysStillClosed, { afterAll, afterToggle });
  T("errors after ticks and frame: none", errors.length === 0 && rejections.length === 0, errors.concat(rejections));
  w.close();
  process.exitCode = done() ? 1 : 0;
})().catch(e => { console.log("  FAIL page-load harness threw\n         " + String(e && e.stack || e)); process.exitCode = 1; });
