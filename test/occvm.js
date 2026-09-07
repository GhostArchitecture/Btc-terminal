/* OCCVM harness — the determinism seam the golden set depends on.
 *
 * The 2.0 migration process (section 4) requires the vein generator to be seeded and pure: same seed
 * plus same sun yields the same bytes, every time. Without that there is no golden set, no diff, and no
 * way to distinguish a regression from a session. These assertions are the seam, tested at the level the
 * harness can reach; the rendered half lives in occvm/golden/.
 *
 * Also pins CLAUDE.md section 10.5's closure: the vein layer reseeded per hour where section 5 said per
 * session, so the same tab redrew different veins across an hour boundary.
 */
"use strict";
const { load, runner } = require("./lib/load");
const { T, done } = runner("occvm: determinism seam");

const vein = h => { h.R("veinLayer()"); return h.ctx.document.documentElement.style["--vein"]; };
const SUN = 1757160000000;   /* 2026-09-06T12:00:00Z — sun up over Dayton */
const NIGHT = 1757214000000; /* 2026-09-07T03:00:00Z — sun well down */

/* --- the seed is injected, not generated internally --- */
{
  const a = load({ storage: { "btc.seed": "12345" } });
  const b = load({ storage: { "btc.seed": "12345" } });
  const c = load({ storage: { "btc.seed": "99999" } });
  const va = vein(a), vb = vein(b), vc = vein(c);
  T("same injected seed yields byte-identical veins", va === vb && !!va);
  T("a different seed yields different veins", va !== vc && !!vc);
  T("the injected seed is the one the generator used", a.store["btc.seed"] === "12345");
}

/* --- the clock is not an input to the vein layer (CLAUDE.md 10.5) --- */
{
  const h = load({ storage: { "btc.seed": "4242" } });
  h.setNow(SUN);   const day = vein(h);
  h.setNow(NIGHT); const night = vein(h);
  h.setNow(SUN + 86400000 * 37); const later = vein(h);
  T("the vein layer does not move with the clock", day === night && day === later && !!day);
}

/* --- with nothing injected, a seed is generated once and persisted for the tab --- */
{
  const h = load();
  const first = vein(h);
  const k = h.store["btc.seed"];
  T("a seed is generated and persisted when none is injected", typeof k === "string" && /^\d+$/.test(k));
  T("re-running the generator in the same tab is stable", vein(h) === first);
}

/* --- the sundial is a pure function of clock and place --- */
{
  const read = () => {
    const h = load();
    h.setNow(SUN);
    h.R("sunTick()");
    const s = h.ctx.document.documentElement.style;
    return { lx: s["--lx"], ly: s["--ly"], elev: s["--elev"], night: s["--night"] };
  };
  const a = read(), b = read();
  T("sunTick is deterministic at a pinned instant", JSON.stringify(a) === JSON.stringify(b));
  T("sunTick writes all four light tokens", ["lx", "ly", "elev", "night"].every(k => a[k] !== undefined && a[k] !== ""));

  /* Until 1.2 these two pinned BTC's own behaviour — a binary --night and a 0.15 --elev night floor —
     specifically so that resolving the divergence would fail here rather than drift. It did. They now
     pin the spine's law instead (OCCVM-L3, L9; D2 and D9 closed at 1.2). */
  const h = load(); h.setNow(NIGHT); h.R("sunTick()");
  const n = h.ctx.document.documentElement.style;
  T("--night is a continuous ramp, not a step", /^[01]\.\d{3}$/.test(n["--night"]) && parseFloat(n["--night"]) === 1, n["--night"]);
  T("--elev falls to zero at night; the floor lives in --amb", parseFloat(n["--elev"]) === 0 && parseFloat(n["--amb"]) > 0.5, { elev: n["--elev"], amb: n["--amb"] });
  T("the light vector resolves neutral overhead below the horizon", n["--lx"] === "0.000" && n["--ly"] === "1.000", { lx: n["--lx"], ly: n["--ly"] });
  T("--glow is a resolved scalar, never a calc()", /^\d+\.\d+$/.test(n["--glow"]), n["--glow"]);
  T("--bone-lo derives with --bone", /^#[0-9a-f]{6}$/.test(n["--bone-lo"]) && n["--bone-lo"] !== "#b7ad9c", n["--bone-lo"]);
}

/* --- the screen convention both tools share (occvm/SPINE-AUDIT.md section 3) --- */
{
  const h = load(); h.setNow(SUN); h.R("sunTick()");
  const s = h.ctx.document.documentElement.style;
  const lx = parseFloat(s["--lx"]), ly = parseFloat(s["--ly"]);
  T("the light vector is unit length (lx=sin az, ly=-cos az)", Math.abs(Math.hypot(lx, ly) - 1) < 2e-3, { lx, ly });
}

/* --- the spine: spliced, matching, above the tool's own CSS, and no wider than SPINE.md says --- */
{
  const fs = require("fs"), path = require("path");
  const ROOT = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const spine = fs.readFileSync(path.join(ROOT, "occvm", "spine.css"), "utf8");
  const doc = fs.readFileSync(path.join(ROOT, "occvm", "SPINE.md"), "utf8");
  const { block, fence, PARTS } = require("../occvm/tools/splice-spine");

  for (const part of PARTS) {
    const f = fence(part.name);
    const src = fs.readFileSync(path.join(ROOT, "occvm", part.name), "utf8");
    T(`${part.name} is spliced exactly once`,
      html.split(f.open).length - 1 === 1 && html.split(f.close).length - 1 === 1);
    const a = html.indexOf(f.open), b = html.indexOf(f.close);
    T(`${part.name} matches occvm/${part.name}`, html.slice(a, b + f.close.length) === block(part.name, src));
  }

  const i = html.indexOf(fence("spine.css").open), j = html.indexOf(fence("spine.css").close);
  T("the sundial is defined before sunTick calls it",
    html.indexOf(fence("sundial.js").open) < html.indexOf("function sunTick(){"));
  T("the tool keeps no second solar implementation (L3)", !html.includes("function solarPosition("));

  /* 1.0 is a no-op because the spine is inlined ABOVE the tool's own declarations, so the tool wins
     every collision by ordinary cascade order (2.0 migration process section 3.2). If the block ever
     moves below them it stops being inert and starts overriding. */
  T("the spine sits above the tool's own :root", i >= 0 && i < html.indexOf("--sub:#1b1a22"));

  /* SPINE.md section 2a enumerates what 1.0 governs. The code cannot quietly grow past the document:
     the expected set is parsed out of the document, not restated here. */
  /* Section 2a alone — the tokens spine.css DECLARES. Slice to the next heading, not to a named one,
     so inserting a section between them cannot silently widen what this scans. Section 2ab lists the
     tokens the sundial WRITES at runtime; those are not CSS declarations and are not checked here. */
  const secStart = doc.indexOf("### 2a.");
  const secEnd = doc.indexOf("### 2", secStart + 8);
  const sec = doc.slice(secStart, secEnd);
  const documented = new Set((sec.match(/--[a-z0-9-]+/g) || []));
  /* Section 2a spans every CSS part the spine ships, not just spine.css: since 1.3 the owned mono stack
     and --t-num are declared in mono.css, because the part that declares them is the part that carries
     the face. Scanning one file would let a token in the other drift out of the document unnoticed. */
  const declared = new Set();
  for (const part of ["spine.css", "mono.css"]) {
    const f = path.join(ROOT, "occvm", part);
    if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f, "utf8");
    const head = src.indexOf(":root");
    if (head < 0) continue;
    const tail = src.indexOf("---- primitives");
    for (const m of src.slice(head, tail > head ? tail : undefined).match(/^\s*(--[a-z0-9-]+)\s*:/gm) || [])
      declared.add(m.trim().replace(/\s*:$/, ""));
  }
  const extra = [...declared].filter(k => !documented.has(k));
  T("the spine declares nothing SPINE.md section 2a does not list", extra.length === 0, extra);
  T("the spine declares every token section 2a lists", [...documented].every(k => declared.has(k)),
    [...documented].filter(k => !declared.has(k)));

  /* Every primitive is namespaced, because .row/.wrap/.note already mean incompatible things in the
     two tools (OCCVM-D11): an un-namespaced spine primitive breaks a tool on the day it is inlined. */
  const sels = (spine.match(/^\.[a-zA-Z][\w-]*/gm) || []);
  T("every spine primitive is namespaced .occvm-", sels.length > 0 && sels.every(x => x.startsWith(".occvm-")), sels);
}

/* --- OCCVM-L4 / roadmap 1.2 exit: no fixed cast offset survives outside the primitives -------------
 * "Fixed offset" means a literal non-zero x or y. A `0 0 <blur>` bloom is not an offset and is not a
 * cast; neither is `none`. The spine's own primitive block is where offsets may be authored, so it is
 * excluded from the scan — that is what "outside the primitives" means.
 */
{
  const fs = require("fs"), path = require("path");
  const { fence } = require("../occvm/tools/splice-spine");
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const f = fence("spine.css");
  const i = html.indexOf(f.open), j = html.indexOf(f.close);
  const tool = html.slice(0, i) + html.slice(j);
  const bad = [];
  for (const m of tool.matchAll(/box-shadow:([^;}]*)/g))
    for (const layer of m[1].split(",")) {
      const t = layer.trim().replace(/^inset\s*/, "");
      const n = /^(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(t);
      if (n && (parseFloat(n[1]) !== 0 || parseFloat(n[2]) !== 0)) bad.push(layer.trim());
    }
  T("no fixed cast offset outside the primitives (1.2 exit)", bad.length === 0, bad);
}

/* --- OCCVM-L4: the cast falls AWAY from the sun ---------------------------------------------------
 * A direction that reads plausible and is backwards is the failure this repository takes most seriously
 * (CLAUDE.md section 5). Every fixed offset 1.2 replaced had this sign inverted, so it is pinned here
 * semantically — the sun's real position at four bearings, against the sign of the resulting cast —
 * rather than by matching the text of a calc().
 */
{
  const h = load();
  const cast = (lx, ly) => ({ x: -lx, y: -ly });   /* the rule the spine's cast tokens encode */
  const spine = require("fs").readFileSync(require("path").join(__dirname, "..", "occvm", "spine.css"), "utf8");

  T("every cast depth negates the light vector", ["1", "2", "3"].every(d => {
    const m = new RegExp(`--occvm-cast-${d}:\\s*calc\\(var\\(--lx[^)]*\\)\\s*\\*[^*]*\\*\\s*-`).test(spine.replace(/\n/g, " "));
    return m;
  }), "a cast depth is missing its negation");

  /* Four bearings through the day, from the shared sundial, checked against where a shadow must land. */
  const rows = [
    { iso: "2026-09-06T11:30:00Z", where: "sun in the east",  expect: "cast to the west (screen left)",  x: -1 },
    { iso: "2026-09-06T17:45:00Z", where: "sun due south",    expect: "cast to the north (screen up)",   y: -1 },
    { iso: "2026-09-06T23:15:00Z", where: "sun in the west",  expect: "cast to the east (screen right)", x: +1 },
  ];
  for (const r of rows) {
    const v = h.R(`(function(){var p=OCCVM_SUN.position(SUN_DEF.lat,SUN_DEF.lon,new Date(${JSON.stringify(r.iso)}));
                    var t=OCCVM_SUN.respond(p); return {lx:+t["--lx"], ly:+t["--ly"]};})()`);
    const c = cast(v.lx, v.ly);
    const ok = r.x !== undefined ? Math.sign(c.x) === r.x : Math.sign(c.y) === r.y;
    T(`${r.where}: ${r.expect}`, ok, { lx: v.lx, ly: v.ly, cast: c });
  }
}

/* --- OCCVM-D5 / roadmap 1.6: the PWA is whole, and the cache name cannot go stale ------------------ */
{
  const fs = require("fs"), path = require("path");
  const ROOT = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  T("a service worker ships", fs.existsSync(path.join(ROOT, "sw.js")));
  T("the page registers it", /serviceWorker\.register\("\.\/sw\.js\?v="/.test(html));

  /* The stamp lives in two places by design — the deploy comment and BUILD_STAMP — because the worker's
     cache name derives from the second. One replace-all covers both; this is what catches a miss. */
  const comment = (html.match(/<!--\s*(build-\d{14})\s*-->/) || [])[1];
  const konst = (html.match(/BUILD_STAMP\s*=\s*"(build-\d{14})"/) || [])[1];
  T("BUILD_STAMP equals the deploy stamp", !!comment && comment === konst, { comment, konst });

  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  T("the cache name comes from the registration, not a literal", /searchParams\.get\("v"\)/.test(sw));

  /* Market data is never cached: a cached price is a wrong price, and this tool is only measurement. */
  T("the worker passes cross-origin and /api straight through",
    /url\.origin !== self\.location\.origin \|\| url\.pathname\.startsWith\("\/api"\)/.test(sw));
  T("the page is network-first so a new stamp lands", sw.indexOf("fetch(req)") < sw.indexOf("caches.match(req)"));

  /* CLAUDE.md section 2 records one style block and one script as an architectural property, and
     test/lib/load.js reads the script by first-open to last-close. A second tag breaks every harness. */
  T("still one <script> and one <style>",
    (html.match(/<script/g) || []).length === 1 && (html.match(/<style/g) || []).length === 1);

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.webmanifest"), "utf8"));
  const tag = (html.match(/<meta name="theme-color" content="([^"]+)"/) || [])[1];
  T("the manifest and the theme-color tag agree (section 8)", manifest.theme_color === tag, { manifest: manifest.theme_color, tag });
}

/* --- OCCVM-L8 / roadmap 1.5: the interaction floor ------------------------------------------------
 * Exit criteria: every action reachable by keyboard, every state announced, no target under 44px.
 * Checked structurally here; the rendered halves (real box sizes, no non-button handlers) are checked
 * in a browser, because a stylesheet cannot tell you what an element actually measures.
 */
{
  const fs = require("fs"), path = require("path");
  const ROOT = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const spine = fs.readFileSync(path.join(ROOT, "occvm", "spine.css"), "utf8");
  const markup = html.slice(0, html.indexOf("<script"));

  T("no inline onclick anywhere in the markup", !/\son[a-z]+\s*=/i.test(markup));
  T("no control is nested inside another", !/<a\b[^>]*>[^<]*<button/i.test(html));

  /* A toggle that carries its state only in a class tells a screen reader nothing. */
  for (const id of ["viewBtn", "pauseBtn", "callAbove", "callBelow"])
    T(`${id} announces its state`, new RegExp(`id="${id}"[^>]*aria-pressed`).test(html), id);
  T("both call buttons keep aria-pressed in sync on click",
    (html.match(/setAttribute\("aria-pressed"/g) || []).length >= 4);

  T("every control meets the 44px floor in CSS", /button\{[^}]*min-height:44px/.test(html.replace(/\s*\n\s*/g, "")));

  /* One rule, in the spine, rather than a list of selectors a new animation escapes tomorrow. */
  T("reduced motion is honoured system-wide from the spine",
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\*::after/.test(spine));
  T("the tool's own unguarded motion is covered by it",
    /transition:color \.5s/.test(html) && /transition-duration: \.01ms !important/.test(html));
  T("durations go to .01ms, not 0, so transitionend still fires",
    !/transition-duration: 0 !important/.test(spine) && /\.01ms/.test(spine));
}

/* --- OCCVM-L10 / roadmap 1.1: veins are grown, not drawn -------------------------------------------- */
{
  const h = load({ storage: { "btc.seed": "20260906" } });
  h.R("veinLayer()");
  const vein = decodeURIComponent(h.ctx.document.documentElement.style["--vein"] || "");

  T("the vein layer is produced", vein.length > 500);
  T("it is a data URI, not bare markup", /url\("data:image\/svg\+xml/.test(vein), vein.slice(0, 40));

  /* The whole point of the release: no curve is fitted over the growth. A path built from a walk uses
     moveto and lineto and nothing else; C, S, Q, T and A are the bezier arriving back through the
     renderer. Checked on the path data alone, since the surrounding markup is full of letters. */
  const dm = vein.match(/<path id='v' d='([^']+)'/);
  T("the aggregate is traced as straight segments", !!dm && /^[ML0-9 .,-]+$/.test(dm[1]),
    dm ? [...new Set(dm[1].replace(/[0-9 .,-]/g, ""))].join("") : "no path");
  T("no bezier command survives anywhere in the layer", !/[CSQTA]\d|[CSQTA] ?-?\d/.test(dm ? dm[1] : ""));

  /* seeded and pure — the golden set and the injected seed both depend on it */
  const again = load({ storage: { "btc.seed": "20260906" } });
  again.R("veinLayer()");
  T("the same seed grows the same aggregate",
    again.ctx.document.documentElement.style["--vein"] === h.ctx.document.documentElement.style["--vein"]);

  const other = load({ storage: { "btc.seed": "111" } });
  other.R("veinLayer()");
  T("a different seed grows a different aggregate",
    other.ctx.document.documentElement.style["--vein"] !== h.ctx.document.documentElement.style["--vein"]);

  /* the fallback OCCVM-L10 requires: growth failing must not leave the surface bare */
  const fs2 = require("fs"), path2 = require("path");
  const html2 = fs2.readFileSync(path2.join(__dirname, "..", "index.html"), "utf8");
  T("the previous generator is kept as the fallback", /function veinLayerLegacy\(/.test(html2));
  T("growth is guarded and falls back", /catch\(e\)\{ svg=encodeURIComponent\(veinLayerLegacy/.test(html2));
  T("the generator reads the spine's tokens",
    /--vein-density/.test(html2) && /--vein-habit/.test(html2));
}

/* --- OCCVM-L7 / roadmap 1.3: the numeric face ------------------------------------------------------
 * Exit: no tool depends on a font the visitor's OS supplies, and column alignment holds at every weight.
 * The rendered halves — which face actually paints, and the measured advance at each weight — are
 * checked in a browser; a stylesheet cannot tell you what a glyph measures.
 */
{
  const fs3 = require("fs"), path3 = require("path");
  const ROOT3 = path3.resolve(__dirname, "..");
  const html3 = fs3.readFileSync(path3.join(ROOT3, "index.html"), "utf8");
  const mono = fs3.readFileSync(path3.join(ROOT3, "occvm", "mono.css"), "utf8");

  T("the face is embedded, not fetched", /@font-face[\s\S]*?url\(data:font\/woff2;base64,/.test(mono)
    && !/url\(https?:/.test(mono));
  /* count rule openings, not mentions: the prose above explains why a fallback stack survives and says
     "@font-face" while doing so. */
  T("two real weights ship", (mono.match(/@font-face\s*\{/g) || []).length === 2
    && /font-weight:\s*400/.test(mono) && /font-weight:\s*600/.test(mono),
    (mono.match(/@font-face\s*\{/g) || []).length);
  T("weight synthesis is off", /font-synthesis:\s*none/.test(mono));

  /* The tool must no longer name an OS face first. Its own --mono declaration is gone; the spine's
     owned stack governs, and the fallbacks stay only so a failed @font-face still lands on mono. */
  const owned = /--mono:\s*"OCCVM Mono"/.test(html3);
  T("--mono is the owned stack, spine-governed", owned);
  T("the tool declares no competing --mono",
    (html3.match(/--mono\s*:/g) || []).length === 1, (html3.match(/--mono\s*:/g) || []).length);

  T("the browser's own default mono is claimed too", /\bcode,\s*\n?kbd,/.test(mono) || /code,[\s\S]{0,40}font-family: var\(--mono\)/.test(mono));

  /* A symbol the subset does not carry, sitting in a right-aligned numeric column, brings its own
     advance and shifts every digit before it. Those sites pin the advance to 1ch. */
  T("uncovered symbols in numeric cells are width-pinned",
    /\.occvm-sym\s*\{[^}]*width:\s*1ch/.test(mono) && (html3.match(/class="occvm-sym"/g) || []).length >= 2);

  T("the subset is regenerable from a committed source",
    fs3.existsSync(path3.join(ROOT3, "occvm", "fonts", "upstream", "IBMPlexMono-latin-400.woff2"))
    && fs3.existsSync(path3.join(ROOT3, "occvm", "tools", "subset-mono.py"))
    && fs3.existsSync(path3.join(ROOT3, "occvm", "mono.head.css")));
  T("the licence travels with the font", fs3.existsSync(path3.join(ROOT3, "occvm", "fonts", "OFL.txt")));
}

process.exit(done());
