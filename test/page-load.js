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
    /* jsdom performs no layout, so every clientWidth is 0 and the rAF loop's "can this frame produce a
       pixel" gate would skip every frame. A harness that wants to drive a layout-dependent path has to
       supply the layout; _w/_h let a test put the canvas back to zero area deliberately. */
    for (const k of ["Width", "Height"]) Object.defineProperty(window.HTMLCanvasElement.prototype, "client" + k, {
      configurable: true, get() { const v = this["_" + k.toLowerCase()[0]]; return v === undefined ? (k === "Width" ? 800 : 340) : v; },
    });
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
  /* §10.5's recorded nit, closed and measured: a frame that cannot produce a pixel is not drawn, and
     the refusal is counted rather than silent. Driven both ways on the shipped loop, because a gate
     asserted only in its skipping direction is a gate that could be stuck. */
  {
    const chart = w.document.getElementById("chart");
    const before = g("S.frameSkip"), calls = chart._ctx._calls.length;
    chart._w = 0;                                   /* the DATA view: the canvas is laid out at 0x0 */
    rafs[0](2000);
    const skipped = g("S.frameSkip") === before + 1 && chart._ctx._calls.length === calls;
    chart._w = undefined;                           /* and back */
    rafs[0](3000);
    T("a frame with no area to draw into is skipped and counted, and drawing resumes when it returns",
      skipped && g("S.frameSkip") === before + 1 && chart._ctx._calls.length > calls,
      { before, after: g("S.frameSkip"), calls, now: chart._ctx._calls.length });
  }
  const meta = w.document.querySelector('meta[name="theme-color"]');
  T("theme-color meta is the obsidian value (§8 item resolved)", meta && meta.content === "#1b1a22", meta && meta.content);
  T("verdict reads NOT READY on an empty ledger", /NOT READY/.test(w.document.getElementById("verdictbox").textContent), w.document.getElementById("verdictbox").textContent);
  T("viability strip reads NEGATIVE with no live fills", /NEGATIVE/.test(w.document.getElementById("vstrip").textContent), w.document.getElementById("vstrip").textContent.slice(0, 120));
  T("sundial set the four light custom properties", ["--lx", "--ly", "--elev", "--night"].every(p => w.document.documentElement.style.getPropertyValue(p) !== ""), null);

  /* The React island (REACT-MAP step 1). This is the only harness that loads the real page into a real
     DOM, which is exactly why the island is spliced rather than loaded from three <script src> tags:
     jsdom runs scripts "dangerously" and fetches resources never, so an external React would be absent
     here and the component would be unverifiable by construction. Driven, not read. */
  {
    const bar = w.document.getElementById("lockbar");
    T("the island mounted and init recorded no UI error", g("S.uiErr") === undefined && !!bar && bar.children.length > 0,
      { uiErr: g("S.uiErr"), children: bar && bar.children.length });
    T("it rendered the note and SWING, and RESUME is absent with no lock held",
      !!w.document.getElementById("locknote") && !!w.document.getElementById("lockSwing") && !w.document.getElementById("lockResume"));
    T("SWING is a real button, so the spine's 44px interaction floor reaches it (L8)",
      w.document.getElementById("lockSwing").tagName === "BUTTON" && w.document.getElementById("lockSwing").type === "button");
    /* Rendered through OCCVM_CAST and marked `action`: it fires, it does not hold, so it announces no
       pressed state it would not maintain. RESUME, not a second press of SWING, is what undoes it. */
    T("and it announces no state it does not hold (Cast's rule, on the real DOM)",
      !w.document.getElementById("lockSwing").hasAttribute("aria-pressed"));

    g("S.k.cur={ticker:'KXBTC15M-T',strike:100000,open:Date.now(),close:Date.now()+9e5}; lockSwing();");
    await new Promise(r => setTimeout(r, 30));
    const resume = w.document.getElementById("lockResume");
    T("taking a lock renders RESUME and moves the note", !!resume && /swing window/.test(w.document.getElementById("locknote").textContent),
      { resume: !!resume, note: w.document.getElementById("locknote").textContent });
    /* The mirror this replaced was CSS: #lockResume{display:none} plus a body.locked override. If either
       had survived, RESUME would be in the DOM and invisible — the component deciding to show a button
       the stylesheet had already hidden. Measured on the resolved style, not on the absence of a rule. */
    T("and RESUME is actually visible, not shown by React and hidden by CSS",
      w.getComputedStyle(resume).display !== "none" && !w.document.body.classList.contains("locked"),
      w.getComputedStyle(resume).display);

    resume.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    T("clicking RESUME releases the lock and unmounts it",
      g("S.lock") === null && !w.document.getElementById("lockResume") && /drag on the field/.test(w.document.getElementById("locknote").textContent),
      { lock: g("S.lock"), note: w.document.getElementById("locknote").textContent });
  }

  /* OCCVM-L13 at 2.34 — the floor on this tool's page ground, and the half a stylesheet cannot say.
     law-audit.js can check that the mount names the granted surface, that the surface is fixed, and
     that it sits outside the content column. It cannot check that no §5 surface moved, so that is
     here, driven on the real DOM: the floor's canvas must not be inside .wrap, and every .tile must
     be a later sibling subtree than it, which is what puts the ground under them. */
  {
    const floor = w.document.getElementById("occvm-floor");
    T("the floor mounted on the page ground", !!floor && floor.tagName === "CANVAS", floor && floor.id);
    T("and the island reported no error", g("S.uiErr") === undefined, g("S.uiErr"));
    if (floor) {
      T("it is not inside the content column — the subtree every §5 surface lives in",
        !floor.closest(".wrap"), floor.parentElement && floor.parentElement.id);
      T("its own surface is the one the law names, fixed and pointer-transparent",
        w.getComputedStyle(floor).position === "fixed" && w.getComputedStyle(floor).pointerEvents === "none",
        w.getComputedStyle(floor).position);
      /* the still frame is retired only when the part reports it took the surface */
      T("the still ground is retired only because the floor took it",
        w.document.documentElement.classList.contains("floorlive"));
      /* and no .tile is an ancestor OR a descendant of it: the floor touches no §5 surface's subtree */
      const tiles = [...w.document.querySelectorAll(".tile")];
      T("no §5 surface contains the floor and the floor contains none",
        tiles.length > 0 && tiles.every(t => !t.contains(floor) && !floor.contains(t)), tiles.length);
    }
  }

  /* §10.3 SEC1: EXPAND/COLLAPSE ALL must not be discarded by the very next single-section toggle (shared SEC_STATE, not two stale closures) */
  g("setAllSections(true)");
  const afterAll = JSON.parse(w.localStorage.getItem("btc.sections.v2"));
  const verdictHead = w.document.querySelector('section[data-key="verdict"] .shead');
  verdictHead.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const afterToggle = JSON.parse(w.localStorage.getItem("btc.sections.v2"));
  const otherKeysStillClosed = Object.keys(afterAll).filter(k => k !== "verdict").every(k => afterToggle[k] === 1);
  T("collapsing every section then expanding one keeps the rest collapsed in storage", afterToggle.verdict === 0 && otherKeysStillClosed, { afterAll, afterToggle });
  /* 11.9: the regime ledger is rendered, read-only, and shows every state the registry distinguishes. */
  {
    const T0 = Date.parse("2026-01-01T00:00:00Z");
    const entries = [
      { id: "d1", kind: "declared", t: T0, category: "exchange-failure", reason: "CF basket broke <b>", declaredAt: T0 },
      { id: "d2", kind: "declared", t: T0 + 86400000, category: "price-collapse", reason: "over-called", declaredAt: T0 },
      { id: "d3", kind: "declared", t: T0 + 172800000, category: "price-collapse", reason: "corrects d2", declaredAt: T0, supersedes: "d2" },
      { id: "f1", kind: "flagged", t: T0 + 3600000, declaredAt: T0, metric: { name: "rv_trailing_pctl", value: 0.0123456, percentile: 99.4 } }
    ];
    /* seeded through the registry's own storage path, because S is script-scoped and not on window */
    w.localStorage.setItem("btc.regime", JSON.stringify({ v: 1, entries }));
    w.regimeLoad();
    w.renderRegimeLedger();
    const sec = w.document.querySelector('section[data-key="regime"]');
    const rows = [...w.document.querySelectorAll("#regime tbody tr")];
    const cells = rows.map(tr => [...tr.querySelectorAll("td")].map(td => td.textContent));
    const bcls = rows.map(tr => tr.querySelectorAll("td")[3].className);
    T("the regime section exists and renders one row per entry", !!sec && rows.length === 4, rows.length);
    T("rows are newest first", cells[0][0] === "2026-01-03 00:00", cells[0][0]);
    T("the flagged row shows its statistic and is marked not a boundary",
      /rv_trailing_pctl 0\.0123 · p99\.4/.test(cells[2][2]) && bcls[2] === "boundary-none", cells[2][2] + " / " + bcls[2]);
    T("the rows reading active are exactly the walk's own boundaries",
      bcls.filter(c => c === "boundary-active").length === w.regimeBoundaries(entries).length &&
      w.regimeBoundaries(entries).length === 2, bcls.join("|"));
    T("operator markup renders as characters, not as nodes",
      rows[3].querySelectorAll("b").length === 0 && /CF basket broke <b>/.test(cells[3][2]), cells[3][2]);
    T("the ledger carries no control that could declare a break (11.9, §7.6)",
      sec.querySelectorAll("button,input,select,textarea,[contenteditable]").length === 0);
    T("the note counts entries and boundaries separately",
      w.document.getElementById("regimenote").textContent === "4 entries · 2 boundaries",
      w.document.getElementById("regimenote").textContent);
  }

  T("errors after ticks and frame: none", errors.length === 0 && rejections.length === 0, errors.concat(rejections));
  w.close();
  process.exitCode = done() ? 1 : 0;
})().catch(e => { console.log("  FAIL page-load harness threw\n         " + String(e && e.stack || e)); process.exitCode = 1; });
