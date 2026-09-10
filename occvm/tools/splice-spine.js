#!/usr/bin/env node
/* occvm/tools/splice-spine.js — put the spine into a tool, idempotently.
 *
 * The 2.0 migration process (section 0b) sets the rules this obeys:
 *   1. the generated region is fenced and never hand-edited
 *   2. the generator's input is the source; the spliced copy is an artifact
 *   3. regeneration is idempotent — unchanged input yields a byte-identical block
 *   4. the ritual runs before the diff, not after
 *   5. (2.8) a retired part's block is removed, and --check fails while one lingers
 *
 * Both repositories already had an author-time generation step (Rhyme's build.js, BTC's
 * units/tools/resplice.js), so this extends an existing practice rather than starting a habit.
 *
 * The spine has two parts, and migration section 0 anticipates exactly this shape: the constants are
 * CSS, and the light-dependent half is one resolver, JS only, because both consumers are browser tools.
 *
 * Usage:  node occvm/tools/splice-spine.js [--check] [part ...]
 *         --check verifies every spliced region matches its source and exits nonzero if not.
 */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..");
const OCCVM = path.join(ROOT, "occvm");

/* Which tool is this? The rule is migration section 0b#2 — the generator's input is the source. Rhyme's
   index.html is ASSEMBLED from tome-src by build.js, so the spine goes into the sources and reaches the
   artifact through the build. Splicing the assembled file too would double the block and lose it on the
   next build. */
const IS_RHYME = fs.existsSync(path.join(ROOT, "tome-src", "20_style.css"));

/* A part names its source, the file it is spliced into, and the anchor it follows. Anchors put the spine
   ABOVE the tool's own declarations, so the tool wins every collision by ordinary cascade and load order.
   A null anchor means the top of the file. */
/* The reference surface (1.8) is a splice target like a tool, and for the same reason: it must carry the
   spine's actual bytes rather than a description of them. It is not duplicated into Rhyme — it renders
   the numeric face, which lives only where mono is rendered, and it sits beside occvm/golden/ because
   both are conformance instruments rather than spine content. The law and the five parts are what every
   repository carries identically; the instruments that check them live in one place. */
const REF = path.join("occvm", "reference", "index.html");

/* 2.31 — floor.js is the one part that reads two siblings, OCCVM_GLOBULES and OCCVM_RHEOLOGY, so it
   is the one part whose POSITION could matter. It does not, and that is a property rather than a
   coincidence: it takes neither at load. Its cessation curve is sampled on first use, and everything
   else it reads it reads inside ambientFloor, which nothing calls while the file evaluates. That
   closes the 2.0 defect by construction instead of by ordering — fracture.js captured a null
   OCCVM_VEINS at load, threw on every call in the browser, and passed in Node because `require`
   resolved it. `test/occvm.js` asserts the property: no sibling global is referenced at this part's
   top level. Where it actually lands is insertion history, not the list: parts go in after one anchor,
   so on a fresh file the list reverses, and on a file that already carries the others a new part goes
   in first. Neither ordering is relied on and neither is asserted. */
const PARTS = IS_RHYME ? [
  { name: "floor.js",     target: path.join("tome-src", "10_engine.js"), anchor: null },
  { name: "spine.css",    target: path.join("tome-src", "20_style.css"), anchor: null },
  /* 2.7 — the owned faces. serif.css ships to both tools; reading.css only where running text is set in a
     serif, which is Rhyme's whole body and nothing in BTC — the same rule that keeps mono.css BTC-only. */
  { name: "serif.css",    target: path.join("tome-src", "20_style.css"), anchor: null },
  { name: "reading.css",  target: path.join("tome-src", "20_style.css"), anchor: null },
  { name: "sundial.js",   target: path.join("tome-src", "10_engine.js"), anchor: null },
  /* 2.5–2.8 — the rheological substance. Spliced beside material.js from 2.5 until nothing read the
     crystal; at 2.8 veins moved to DLCA, fracture became yield, and material.js was RETIRED (below). */
  { name: "rheology.js",  target: path.join("tome-src", "10_engine.js"), anchor: null },
  /* 2.25 — the globule field replaces the DLCA veins as the substrate layer in both tools; veins.js is
     RETIRED (below) and stays in occvm/ unspliced, as the generator the L10 record cites. */
  { name: "globules.js",  target: path.join("tome-src", "10_engine.js"), anchor: null },
  { name: "pigments.js",  target: path.join("tome-src", "10_engine.js"), anchor: null },
  { name: "yield.js",     target: path.join("tome-src", "10_engine.js"), anchor: null },
] : [
  /* 2.34 — floor.js joins the list here, because L13 now grants this tool a floor on its page ground.
     The grant is surface-bounded and law-audit.js measures the boundary; the part itself is the same
     part Rhyme runs. */
  { name: "floor.js",     target: "index.html", anchor: "<script>" },
  { name: "spine.css",    target: "index.html", anchor: "<style>" },
  /* the numeric face ships only where mono is rendered; Rhyme resolves zero mono elements */
  { name: "mono.css",     target: "index.html", anchor: "<style>" },
  { name: "serif.css",    target: "index.html", anchor: "<style>" },
  { name: "sundial.js",   target: "index.html", anchor: "<script>" },
  /* 2.5–2.8 — the rheological substance; see the Rhyme list above for the strangler's history */
  { name: "rheology.js",  target: "index.html", anchor: "<script>" },
  { name: "globules.js",  target: "index.html", anchor: "<script>" },
  { name: "pigments.js",  target: "index.html", anchor: "<script>" },
  { name: "yield.js",     target: "index.html", anchor: "<script>" },
  /* 2.38 — the vessel is worn. From 2.32 glass.js was spliced into the reference surface alone and
     no tool carried it; the tool carries it now, because L2's vessel half is what bounds the field. */
  { name: "glass.js",     target: "index.html", anchor: "<script>" },
  { name: "spine.css",    target: REF, anchor: "<style>" },
  { name: "mono.css",     target: REF, anchor: "<style>" },
  { name: "serif.css",    target: REF, anchor: "<style>" },
  { name: "sundial.js",   target: REF, anchor: "<script>" },
  { name: "rheology.js",  target: REF, anchor: "<script>" },
  { name: "globules.js",  target: REF, anchor: "<script>" },
  { name: "pigments.js",  target: REF, anchor: "<script>" },
  { name: "yield.js",     target: REF, anchor: "<script>" },
  /* 2.32 — the vessel is prototyped on the reference surface first, exactly where the meniscus was at
     2.10 before both tools wore it at 2.11. It is spliced into no tool yet. */
  { name: "glass.js",     target: REF, anchor: "<script>" },
  { name: "floor.js",     target: REF, anchor: "<script>" },
];

/* A RETIRED part is one the spine no longer carries. Its fenced block is REMOVED from every target it was
   ever spliced into, and --check fails while any such block survives — otherwise a retired part keeps
   shipping, byte for byte, under a fence nobody regenerates. Added at 2.8, when material.js and
   fracture.js left with the crystal; until then the splicer could only add and update, never take away,
   and a part dropped from PARTS would simply have gone stale in place. */
/* 2.27 — minerals.js is RETIRED and replaced by pigments.js. Not a rename: the crystal-era set was
   three closed minerals because under aragonite a colour had to be a mineral that exists with that
   colour, and a dye carries no such constraint. It leaves occvm/ entirely — unlike veins.js, whose
   generator the L10 record still cites, nothing cites a mineral. */
const RETIRED = ["material.js", "fracture.js", "veins.js", "minerals.js"];
const RETIRED_TARGETS = IS_RHYME ? [path.join("tome-src", "10_engine.js")] : ["index.html", REF];

const sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const fence = name => ({
  open: `/* ==== OCCVM SPINE ${name} — spliced from occvm/${name}. do not edit. ==== */`,
  close: `/* ==== END OCCVM ${name} ==== */`,
});

function block(name, src) {
  const f = fence(name);
  return `${f.open}\n/* sha256:${sha(src)} */\n${src.trimEnd()}\n${f.close}`;
}

function splice(part, check) {
  const srcFile = path.join(OCCVM, part.name);
  if (!fs.existsSync(srcFile)) throw new Error(`occvm/${part.name} not found`);
  const src = fs.readFileSync(srcFile, "utf8");
  const abs = path.join(ROOT, part.target);
  if (!fs.existsSync(abs)) return { part: part.name, skipped: `${part.target} not in this repository` };

  const text = fs.readFileSync(abs, "utf8");
  const f = fence(part.name), want = block(part.name, src);

  const i = text.indexOf(f.open);
  if (i >= 0) {
    const j = text.indexOf(f.close, i);
    if (j < 0) throw new Error(`${part.target}: ${part.name} opening fence with no close — refusing to guess where it ends`);
    if (text.slice(i, j + f.close.length) === want) return { part: part.name, state: "current" };
    if (check) return { part: part.name, state: "STALE", detail: `does not match occvm/${part.name}` };
    const out = text.slice(0, i) + want + text.slice(j + f.close.length);
    fs.writeFileSync(abs, out);
    return { part: part.name, state: "updated", delta: out.length - text.length };
  }

  if (check) return { part: part.name, state: "ABSENT", detail: `no ${part.name} block in ${part.target}` };
  let out;
  if (part.anchor === null) out = want + "\n\n" + text;
  else {
    const a = text.indexOf(part.anchor);
    if (a < 0) throw new Error(`${part.target}: anchor ${JSON.stringify(part.anchor)} not found — refusing to splice blind`);
    const at = a + part.anchor.length;
    out = text.slice(0, at) + "\n" + want + "\n" + text.slice(at);
  }
  fs.writeFileSync(abs, out);
  return { part: part.name, state: "inserted", delta: out.length - text.length };
}

function retire(name, target, check) {
  const abs = path.join(ROOT, target);
  if (!fs.existsSync(abs)) return { part: name, skipped: `${target} not in this repository` };
  const text = fs.readFileSync(abs, "utf8");
  const f = fence(name);
  const i = text.indexOf(f.open);
  if (i < 0) return { part: name, state: "retired" };
  const j = text.indexOf(f.close, i);
  if (j < 0) throw new Error(`${target}: retired ${name} has an opening fence with no close — refusing to guess`);
  if (check) return { part: name, state: "LINGERING", detail: `retired part still spliced into ${target}` };
  /* take the block and the blank line the insertion put after it */
  let end = j + f.close.length;
  if (text[end] === "\n") end++;
  if (text[end] === "\n") end++;
  const out = text.slice(0, i) + text.slice(end);
  fs.writeFileSync(abs, out);
  return { part: name, state: "removed", delta: out.length - text.length };
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes("--check");
  const only = argv.filter(a => !a.startsWith("--"));
  let bad = 0, any = 0;
  for (const name of RETIRED) {
    if (only.length && !only.includes(name)) continue;
    for (const target of RETIRED_TARGETS) {
      const r = retire(name, target, check);
      any++;
      if (r.skipped) continue;
      if (r.state !== "retired") console.log(`  ${name} -> ${target}: ${r.state}${r.delta !== undefined ? ` (${r.delta} bytes)` : ""}${r.detail ? " — " + r.detail : ""}`);
      if (r.state === "LINGERING") bad++;
    }
  }
  for (const p of PARTS) {
    if (only.length && !only.includes(p.name)) continue;
    const r = splice(p, check);
    any++;
    if (r.skipped) { console.log(`  ${p.name}: skipped — ${r.skipped}`); continue; }
    const d = r.delta !== undefined ? ` (${r.delta >= 0 ? "+" : ""}${r.delta} bytes)` : "";
    console.log(`  ${p.name} -> ${p.target}: ${r.state}${d}${r.detail ? " — " + r.detail : ""}`);
    if (r.state === "STALE" || r.state === "ABSENT") bad++;
  }
  if (!any) { console.error("no part matched — nothing spliced"); process.exit(1); }
  /* one hash per PART FILE, not per splice site — since 1.8 a part is spliced into more than one target */
  const stamp = [...new Set(PARTS.map(p => p.name))]
    .map(n => `${n}:${sha(fs.readFileSync(path.join(OCCVM, n), "utf8"))}`).join(" ");
  console.log(check ? (bad ? `SPINE DRIFT: ${bad} part(s) out of date. Run: node occvm/tools/splice-spine.js` : `SPINE OK: ${stamp}`) : `spine ${stamp}`);
  process.exit(bad ? 1 : 0);
}
if (require.main === module) main();
module.exports = { block, fence, sha, PARTS, RETIRED };
