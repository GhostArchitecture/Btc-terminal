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
  const declared = new Set(
    (spine.slice(spine.indexOf(":root"), spine.indexOf("---- primitives")).match(/^\s*(--[a-z0-9-]+)\s*:/gm) || [])
      .map(x => x.trim().replace(/\s*:$/, "")));
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

process.exit(done());
