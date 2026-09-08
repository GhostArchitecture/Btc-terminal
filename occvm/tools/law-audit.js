#!/usr/bin/env node
/* occvm/tools/law-audit.js — measure each law against the tools, instead of asserting it.
 *
 * WHY THIS EXISTS. Until now SPINE.md carried a hand-typed conformance table reading "violates: —" for
 * both tools. It was written at 1.0, never re-measured, and it was false: BTC paints corner radii of
 * 16–22px against L2's declared ≤4px, and both tools depend on Apple-only faces against L7's "no font the
 * tool does not own". Nothing caught either, because nothing was looking.
 *
 * Every other claim in this system is guarded — tokens by occvm/tools/token-audit.js, spliced regions by
 * splice-spine.js --check, rendered values by occvm/golden/, the shock thresholds by test/prereg.js which
 * reads CLAUDE.md from disk and fails when document and code disagree. The LAWS were the last thing left
 * saying "this is true" with nothing measuring it, and three separate errors this session came from
 * reading a declaration as if it were a render.
 *
 * WHAT A LAW'S STATE MEANS. A law is not simply obeyed or broken; four states are real and the document
 * must distinguish them, because collapsing them is what let "declared and unadopted" read as "in force":
 *
 *   IN FORCE      measured, and every tool on disk conforms
 *   DIVERGED      measured, and at least one tool does not — with the numbers, named
 *   UNADOPTED     the law is real but nothing wears the surface it governs yet
 *   UNMEASURED    the law is a judgment a script cannot make (does gilt mark what DECIDES?)
 *
 * UNMEASURED is not a failure and not an excuse. It is the honest label for a law whose conformance needs
 * an eye, and saying so is better than a "—" that reads as a pass.
 *
 * PARTIAL CHECKOUTS. A tool that is not on disk is reported ABSENT and never counted as conforming. This
 * bug has been fixed twice already in this repository — once in the golden recorder, once in the token
 * audit's gate — and it is the same bug both times: a sweep that finds nothing concluding that nothing is
 * wrong.
 *
 * Usage:  node occvm/tools/law-audit.js [--check] [--json]
 *         --check exits nonzero when a measured state disagrees with what SPINE.md records.
 */
"use strict";
const fs = require("fs"), path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const IS_RHYME = fs.existsSync(path.join(ROOT, "tome-src", "20_style.css"));
/* The sibling is the OTHER repository. The first version resolved "../Rhyme-Instrument" unconditionally,
   so run from Rhyme it read Rhyme's own built index.html and reported it as BTC — measuring one tool
   twice under two names, and passing. Every Rhyme-side LAW AUDIT OK before this line was that. */
const SIBLING = path.resolve(ROOT, "..", IS_RHYME ? "Btc-terminal" : "Rhyme-Instrument");

/* Each tool names the files that carry its OWN declarations — never the spliced spine, which is the law
   speaking rather than the tool answering. The fences are stripped before measurement for that reason. */
const TOOLS = [
  { name: "BTC Terminal", root: IS_RHYME ? SIBLING : ROOT,
    files: ["index.html"] },
  { name: "Rhyme Instrument", root: IS_RHYME ? ROOT : SIBLING,
    files: [path.join("tome-src", "20_style.css"), path.join("tome-src", "30_ui.jsx")] }
];

const FENCE = /\/\* ==== OCCVM SPINE [\s\S]*?\/\* ==== END OCCVM [^*]*\*\//g;
const COMMENTS = /\/\*[\s\S]*?\*\//g;

function readTool(t) {
  const parts = [];
  for (const f of t.files) {
    const p = path.join(t.root, f);
    if (!fs.existsSync(p)) return null;
    parts.push(fs.readFileSync(p, "utf8"));
  }
  const raw = parts.join("\n");
  return { raw, own: raw.replace(FENCE, "").replace(COMMENTS, "") };
}

/* ---- the laws, each with what it claims and how that claim is measured ------------------------- */

const LAWS = [
  { id: "L1", name: "substrate and inscription",
    claim: "three substrate weights and three ink weights, no more",
    measure: null, note: "token families are guarded by token-audit.js and the golden set" },

  { id: "L2", name: "geometry: the vessel and the meniscus",
    claim: "plan-view radius is the vessel's (recorded); the edge is the fluid's meniscus, lc = 7.15px",
    measure(tool) {
      /* THE VESSEL — recorded, never judged. Both tools have a real one and they differ; that is two
         vessels, not a violation. Listed so the record is on the law. */
      const radii = [];
      const re = /border-radius:\s*([^;}\n]+)/g; let m;
      while ((m = re.exec(tool.own))) for (const px of m[1].match(/(\d+(?:\.\d+)?)px/g) || []) radii.push(parseFloat(px));
      const pills = radii.filter(r => r >= 999).length, real = radii.filter(r => r < 999);
      const vessel = real.length ? `vessel ${real.length} radii ${Math.min(...real)}-${Math.max(...real)}px` +
        (pills ? ` + ${pills} pills` : "") : "no radii";
      /* THE MENISCUS — derived from the substance, measured against the spine's bevel. Spine-level: both
         tools inherit --occvm-bevel, so both read the same result. */
      const RH = require(path.join(__dirname, "..", "rheology.js"));
      const lc = RH.radiusPx(RH.SUBSTANCE);
      const spine = fs.readFileSync(path.join(__dirname, "..", "spine.css"), "utf8");
      const bevel = parseFloat((spine.match(/--lit-x:\s*calc\(var\(--lx, 0\) \* ([0-9.]+)px\)/) || [])[1]);
      if (isNaN(bevel)) return { state: "DIVERGES", detail: `${vessel}; spine bevel width unreadable` };
      const ok = Math.abs(bevel - lc) < 0.05;
      return { state: ok ? "CONFORMS" : "DIVERGES",
        detail: `${vessel}; meniscus: spine bevel ${bevel}px against lc ${lc.toFixed(2)}px` +
                (ok ? "" : " — the crystal's chisel; widening it is the adoption candidate") };
    } },

  { id: "L3", name: "one light",
    claim: "exactly one light on any surface, and it is the real sun",
    measure(tool) {
      /* the failure this catches is a tool re-deriving solar position locally instead of reading the
         spliced sundial — which is precisely what 1.2 unified and what would silently un-unify. */
      const local = (tool.own.match(/function\s+solarPosition/g) || []).length;
      return local
        ? { state: "DIVERGES", detail: `${local} local solarPosition() outside the spliced sundial` }
        : { state: "CONFORMS", detail: "no local solar implementation" };
    } },

  { id: "L4", name: "cast shadow",
    claim: "no fixed box-shadow offset exists outside the light vector",
    measure(tool) {
      const casts = tool.own.match(/box-shadow:[^;}\n]+/g) || [];
      const fixed = casts.filter(c => /\d+px\s+\d+px/.test(c) && !/var\(--l[xy]/.test(c) && !/inset/.test(c));
      if (!casts.length) return { state: "UNADOPTED", detail: "no box-shadow in the tool's own CSS" };
      return fixed.length
        ? { state: "DIVERGES", detail: `${fixed.length} of ${casts.length} casts use a fixed offset` }
        : { state: "CONFORMS", detail: `${casts.length} casts, all light-derived or inset` };
    } },

  { id: "L5", name: "gilt is reserved",
    claim: "the gilt ramp marks what decides and nothing else",
    measure: null, note: "whether a surface DECIDES is a judgment; no script can make it" },

  { id: "L6", name: "the mineral set is frozen",
    claim: "the set is closed and comes from occvm/minerals.js",
    measure(tool) {
      /* A tool restating a mineral hex locally is the defect 1.4 closed — but the law's own exception
         ledger grants BTC `--malachite`/`--ruby` as OUTCOME colours, which share hexes with the mineral
         set while meaning something else entirely (win/lose, governed by CLAUDE.md section 5). A measure
         that cannot tell those apart reports a false divergence, which is the same failure as the
         hand-typed "violates: —" pointing the other way. Only the accent pair is the mineral set's. */
      const accent = (tool.own.match(/--amethyst(-lo)?:\s*#[0-9a-f]{6}/gi) || []).length;
      const outcome = (tool.own.match(/--(malachite|ruby)(-lo)?:\s*#[0-9a-f]{6}/gi) || []).length;
      if (accent) return { state: "DIVERGES",
        detail: `${accent} mineral accent hex restated outside minerals.js` +
                (outcome ? ` (${outcome} outcome-colour declarations are the section 5 exception, not counted)` : "") };
      return { state: "CONFORMS",
        detail: outcome ? `no accent restated; ${outcome} outcome colours are the granted exception` : "no local mineral hex" };
    } },

  { id: "L7", name: "figure discipline",
    claim: "a tool depends on no font it does not own",
    measure(tool) {
      /* THE ONE THIS FOUND. Both tools name faces that ship with no @font-face, so a viewer without them
         silently gets a fallback — which is the same class of defect as a token resolving to nothing. */
      const named = [];
      for (const face of ["SF Mono", "Iowan Old Style", "Palatino", "Menlo", "Consolas"]) {
        if (tool.own.includes(face)) named.push(face);
      }
      const owned = /@font-face/.test(tool.raw);
      const unowned = named.filter(f => !new RegExp(`@font-face[\\s\\S]{0,400}${f}`).test(tool.raw));
      /* 2.7: the spine's own stack is spliced (and stripped here), so a conforming tool names no face at
         all in its own CSS. But "names nothing" is also what a tool that set no serif would read, so the
         check goes one step further into the RAW file: the stack the tool renders must lead with a face
         that has a matching @font-face on the page. */
      if (!named.length) {
        const lead = (tool.raw.match(/--serif:\s*"([^"]+)"/) || [])[1];
        const owned = lead && new RegExp(`@font-face[\\s\\S]{0,200}font-family:\\s*"${lead}"`).test(tool.raw);
        return owned
          ? { state: "CONFORMS", detail: `stack leads with an embedded face ("${lead}")` }
          : { state: "DIVERGES", detail: lead ? `stack leads with "${lead}", which has no @font-face` : "no --serif resolves on the page" };
      }
      return { state: "DIVERGES",
        detail: `depends on ${unowned.length} unembedded face(s): ${unowned.join(", ")}` +
                (owned ? " (tool does embed at least one face)" : " (tool embeds none)") };
    } },

  { id: "L8", name: "the interaction floor",
    claim: "every action is a real control, at least 44x44px",
    measure(tool) {
      const floors = (tool.own.match(/min-height:\s*44px/g) || []).length;
      const buttons = (tool.own.match(/<button|\bbutton\s*\{/g) || []).length;
      if (!buttons) return { state: "UNADOPTED", detail: "no button rule in the tool's own CSS" };
      return floors
        ? { state: "CONFORMS", detail: `${floors} explicit 44px floor(s)` }
        : { state: "DIVERGES", detail: "buttons declared with no 44px floor in the tool's own CSS" };
    } },

  { id: "L9", name: "night",
    claim: "--night is a continuous quantity, not a state flag",
    measure: null, note: "written by the spliced sundial; pinned behaviourally by test/occvm.js" },

  { id: "L10", name: "vein habit",
    claim: "veins are grown by diffusion-limited aggregation, not drawn",
    measure(tool) {
      /* Counting every mention over-reports: the first hit is the function DEFINITION, not a use. And a
         call sitting in a catch is a fallback for when growth throws, not a parallel drawn implementation
         — the tool renders something rather than nothing. That is a documented degradation, not a tool
         that draws its veins. Distinguished, because reporting it as a plain divergence would put a
         false entry in the law. */
      /* The lookbehind already excludes the definition; subtracting for it as well — which the first
         version did — double-counts the exclusion and turns a real call into zero, i.e. a false CONFORMS.
         Exactly the reading this whole tool exists to stop, produced by the tool itself. */
      const defined = /function\s+veinLayerLegacy/.test(tool.own);
      const calls = (tool.own.match(/(?<!function\s)veinLayerLegacy\s*\(/g) || []).length;
      const guarded = /catch\s*\([^)]*\)\s*\{[^}]*veinLayerLegacy/.test(tool.own);
      if (calls <= 0) return { state: "CONFORMS", detail: defined ? "fallback defined, never called" : "no drawn fallback" };
      return guarded
        ? { state: "CONFORMS", detail: `${calls} drawn call, reached only when growth throws — a degradation, not the habit` }
        : { state: "DIVERGES", detail: `${calls} unguarded call(s) to the drawn-bezier fallback` };
    } },

  { id: "L11", name: "fracture",
    claim: "the cleave vocabulary is used for irreversible actions and nothing else",
    measure(tool) {
      const calls = (tool.own.match(/OCCVM_FRACTURE\.cleave/g) || []).length;
      if (!calls) return { state: "UNADOPTED", detail: "no cleave call site" };
      return { state: "UNMEASURED", detail: `${calls} call site(s); whether each is irreversible needs an eye` };
    } },

  { id: "L12", name: "the material",
    claim: "a hex is not authored; surface values derive from the substance",
    measure(tool) {
      /* the substrate ramp must not be restated as a literal in the tool's own CSS */
      const lit = (tool.own.match(/--sub(-hi|-lo)?:\s*#[0-9a-f]{6}/gi) || []).length;
      return lit > 3
        ? { state: "DIVERGES", detail: `${lit} substrate literals in the tool's own CSS` }
        : { state: "CONFORMS", detail: lit ? `${lit} :root fallback(s), overwritten by the sundial` : "no literal" };
    } }
];

/* ---- run --------------------------------------------------------------------------------------- */

const results = LAWS.map(law => {
  const per = TOOLS.map(t => {
    const src = readTool(t);
    if (!src) return { tool: t.name, state: "ABSENT", detail: "not on disk — not judged" };
    if (!law.measure) return { tool: t.name, state: "UNMEASURED", detail: law.note };
    return Object.assign({ tool: t.name }, law.measure(src));
  });
  const states = per.map(p => p.state);
  /* IN FORCE requires at least one tool MEASURED as conforming. A law whose tools are all unadopted or
     all unmeasured is not in force — it is undecided, and calling it in force is how "declared and
     unadopted since 1.0" came to read as a working law. */
  const overall = states.includes("DIVERGES") ? "DIVERGED"
    : states.includes("ABSENT") ? "PARTIAL"
    : states.includes("CONFORMS") ? "IN FORCE"
    : states.every(s => s === "UNADOPTED") ? "UNADOPTED"
    : "UNMEASURED";
  return { id: law.id, name: law.name, claim: law.claim, overall, per };
});

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

const W = { "IN FORCE": "", DIVERGED: "  <-- ", UNADOPTED: "", UNMEASURED: "", PARTIAL: "" };
console.log("OCCVM law conformance — measured, not asserted\n");
for (const r of results) {
  console.log(`${r.id.padEnd(4)} ${r.overall.padEnd(11)} ${r.name}`);
  console.log(`     ${r.claim}`);
  for (const p of r.per) console.log(`       ${p.tool.padEnd(18)} ${p.state.padEnd(11)} ${p.detail}`);
  console.log("");
}

const diverged = results.filter(r => r.overall === "DIVERGED");
const unmeasured = results.filter(r => r.overall === "UNMEASURED");
console.log(`${results.length} laws: ${results.filter(r => r.overall === "IN FORCE").length} in force, ` +
            `${diverged.length} diverged, ${results.filter(r => r.overall === "UNADOPTED").length} unadopted, ` +
            `${unmeasured.length} unmeasured, ${results.filter(r => r.overall === "PARTIAL").length} partial`);

function blockFor(r) {
  return [`> **STATE: ${r.overall}** — measured by \`occvm/tools/law-audit.js\`, not asserted.`,
    ...r.per.map(p => `> - ${p.tool}: **${p.state}** — ${p.detail}`),
    ">", "> *This block is generated. If it disagrees with the tools, the tools are what is true.*"].join("\n");
}
if (process.argv.includes("--stamp")) {
  /* The STATE blocks are GENERATED, and generated means regenerated: a block stamped once and left is a
     hand-typed table with extra steps. This rewrites each law's block and the section-7 table from the
     measurement just taken. Run it after any change to a tool, then commit the document with the code. */
  const sp = path.join(ROOT, "occvm", "SPINE.md");
  let spine = fs.readFileSync(sp, "utf8");
  for (const r of results) {
    const h = spine.indexOf(`### OCCVM-${r.id} —`); if (h < 0) continue;
    const nl = spine.indexOf("\n", h) + 1;
    const rest = spine.slice(nl).replace(/^\n+/, "");
    const m = rest.match(/^(> [^\n]*\n|>\n)+/);
    const after = m ? rest.slice(m[0].length) : rest;
    spine = spine.slice(0, nl) + "\n" + blockFor(r) + "\n\n" + after.replace(/^\n+/, "");
  }
  const t0 = spine.indexOf("| law | | state | BTC Terminal | Rhyme Instrument |");
  if (t0 >= 0) {
    const tEnd = spine.indexOf("\n\n", spine.indexOf("**", spine.indexOf("\n\n", t0) + 2));
    const rows = results.map(a => { const per = {}; for (const x of a.per) per[x.tool.split(" ")[0]] = x.state;
      return `| **${a.id}** | ${a.name} | ${a.overall} | ${per.BTC || "?"} | ${per.Rhyme || "?"} |`; });
    const cnt = {}; for (const a of results) cnt[a.overall] = (cnt[a.overall] || 0) + 1;
    spine = spine.slice(0, t0) + "| law | | state | BTC Terminal | Rhyme Instrument |\n|---|---|---|---|---|\n" +
      rows.join("\n") + `\n\n**${cnt["IN FORCE"] || 0} in force · ${cnt.DIVERGED || 0} diverged · ` +
      `${cnt.UNMEASURED || 0} unmeasured · ${cnt.UNADOPTED || 0} unadopted**` + spine.slice(tEnd);
  }
  fs.writeFileSync(sp, spine);
  console.log("\nSTAMPED: every law's state block and the section-7 table regenerated from this run.");
}

if (process.argv.includes("--check")) {
  /* The document must RECORD the divergences the measurement finds. A law measured as diverged and
     written up as in force is the failure this tool exists to prevent — the hand-typed "violates: —"
     that stood for six releases while BTC painted 16-22px. */
  const spine = fs.readFileSync(path.join(ROOT, "occvm", "SPINE.md"), "utf8");

  /* Read each law's OWN state block, not the document at large.
   *
   * The first version of this check searched the whole file for `L2 ... DIVERGED` on one line, and it did
   * not bite: hiding L2's divergence from its own block still passed, because the summary table further
   * down mentions L2 and DIVERGED on the same row. A guard satisfied by a different part of the document
   * than the one it is guarding is exactly the failure this tool was written to end, and it took removing
   * a real divergence and watching the check pass to find it. Verify that a guard fails before trusting
   * that it passes. */
  function stateBlock(id) {
    const h = spine.indexOf(`### OCCVM-${id} —`);
    if (h < 0) return "";
    const next = spine.indexOf("\n### ", h + 1);
    const section = spine.slice(h, next < 0 ? spine.length : next);
    const lines = section.split("\n").filter(l => l.startsWith(">"));
    return lines.join("\n");
  }
  const missing = diverged.filter(r => !/DIVERG/.test(stateBlock(r.id)));
  /* and the other direction: a law recorded as diverged that now conforms is a document lying about the
     tools, just a kinder lie. L4 and L6 were fixed and their blocks still read DIVERGES until --stamp. */
  const stale = results.filter(r => r.overall === "IN FORCE" && /DIVERG/.test(stateBlock(r.id)));
  if (stale.length) {
    console.error(`\nLAW AUDIT FAIL: ${stale.map(m => m.id).join(", ")} recorded as DIVERGED but measure IN FORCE — run --stamp.`);
    process.exit(1);
  }
  if (missing.length) {
    console.error(`\nLAW AUDIT FAIL: ${missing.map(m => m.id).join(", ")} measured as DIVERGED and not ` +
                  `recorded as such in SPINE.md.`);
    process.exit(1);
  }
  console.log("\nLAW AUDIT OK: every measured divergence is recorded in the law.");
}
