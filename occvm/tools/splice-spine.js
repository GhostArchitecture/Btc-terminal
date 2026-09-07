#!/usr/bin/env node
/* occvm/tools/splice-spine.js — put the spine into a tool, idempotently.
 *
 * The 2.0 migration process (section 0b) sets the rules this obeys:
 *   1. the generated region is fenced and never hand-edited
 *   2. the generator's input is the source; the spliced copy is an artifact
 *   3. regeneration is idempotent — unchanged input yields a byte-identical block
 *   4. the ritual runs before the diff, not after
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
const PARTS = IS_RHYME ? [
  { name: "spine.css",    target: path.join("tome-src", "20_style.css"), anchor: null },
  { name: "sundial.js",   target: path.join("tome-src", "10_engine.js"), anchor: null },
  { name: "veins.js",     target: path.join("tome-src", "10_engine.js"), anchor: null },
  { name: "minerals.js",  target: path.join("tome-src", "10_engine.js"), anchor: null },
] : [
  { name: "spine.css",    target: "index.html", anchor: "<style>" },
  /* the numeric face ships only where mono is rendered; Rhyme resolves zero mono elements */
  { name: "mono.css",     target: "index.html", anchor: "<style>" },
  { name: "sundial.js",   target: "index.html", anchor: "<script>" },
  { name: "veins.js",     target: "index.html", anchor: "<script>" },
  { name: "minerals.js",  target: "index.html", anchor: "<script>" },
];

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

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes("--check");
  const only = argv.filter(a => !a.startsWith("--"));
  let bad = 0, any = 0;
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
  const stamp = PARTS.map(p => `${p.name}:${sha(fs.readFileSync(path.join(OCCVM, p.name), "utf8"))}`).join(" ");
  console.log(check ? (bad ? `SPINE DRIFT: ${bad} part(s) out of date. Run: node occvm/tools/splice-spine.js` : `SPINE OK: ${stamp}`) : `spine ${stamp}`);
  process.exit(bad ? 1 : 0);
}
if (require.main === module) main();
module.exports = { block, fence, sha, PARTS };
