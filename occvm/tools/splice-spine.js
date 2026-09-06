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
 * Usage:  node occvm/tools/splice-spine.js [--check] [target ...]
 *         --check verifies the spliced region matches occvm/spine.css and exits nonzero if not.
 *         With no target, splices every target this repository has.
 */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..");
const SPINE = path.join(ROOT, "occvm", "spine.css");

const OPEN = "/* ==== OCCVM 1.0 SPINE — spliced from occvm/spine.css. do not edit. ==== */";
const CLOSE = "/* ==== END OCCVM SPINE ==== */";

/* A target names the file the spine lives in and the anchor it is spliced immediately after. The anchor
   is the first thing in the tool's own stylesheet, so the spine sits above every tool declaration and
   the tool wins every collision by ordinary cascade order. That is what makes 1.0 a no-op.
 *
 * The target is chosen by which repository this is, and the rule is migration section 0b#2: the
 * generator's input is the source. Rhyme's index.html is ASSEMBLED from tome-src by build.js, so the
 * spine goes into the source stylesheet and reaches the artifact through the build. Splicing the
 * assembled file as well would put the block in twice and lose it on the next build.
 */
const RHYME_SRC = path.join("tome-src", "20_style.css");
const TARGETS = fs.existsSync(path.join(ROOT, RHYME_SRC))
  ? [{ file: RHYME_SRC, anchor: null, why: "Rhyme: the source stylesheet build.js assembles" }]
  : [{ file: "index.html", anchor: "<style>", why: "BTC: the single style block" }];

const sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

function block(spine) {
  return `${OPEN}\n/* sha256:${sha(spine)} */\n${spine.trimEnd()}\n${CLOSE}`;
}

function splice(file, anchor, spine, check) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) return { file, skipped: "not in this repository" };
  const src = fs.readFileSync(abs, "utf8");
  const want = block(spine);

  const i = src.indexOf(OPEN);
  if (i >= 0) {
    const j = src.indexOf(CLOSE, i);
    if (j < 0) throw new Error(`${file}: opening fence with no closing fence — refusing to guess where it ends`);
    const have = src.slice(i, j + CLOSE.length);
    if (have === want) return { file, state: "current" };
    if (check) return { file, state: "STALE", detail: "spliced block does not match occvm/spine.css" };
    const out = src.slice(0, i) + want + src.slice(j + CLOSE.length);
    fs.writeFileSync(abs, out);
    return { file, state: "updated", delta: out.length - src.length };
  }

  if (check) return { file, state: "ABSENT", detail: "no spine block in this file" };
  if (anchor === null) {
    fs.writeFileSync(abs, want + "\n\n" + src);
    return { file, state: "inserted", delta: want.length + 2 };
  }
  const a = src.indexOf(anchor);
  if (a < 0) throw new Error(`${file}: anchor ${JSON.stringify(anchor)} not found — refusing to splice blind`);
  const at = a + anchor.length;
  const out = src.slice(0, at) + "\n" + want + "\n" + src.slice(at);
  fs.writeFileSync(abs, out);
  return { file, state: "inserted", delta: out.length - src.length };
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes("--check");
  const only = argv.filter(a => !a.startsWith("--"));
  if (!fs.existsSync(SPINE)) throw new Error(`occvm/spine.css not found at ${SPINE}`);
  const spine = fs.readFileSync(SPINE, "utf8");

  let bad = 0, any = 0;
  for (const t of TARGETS) {
    if (only.length && !only.includes(t.file)) continue;
    const r = splice(t.file, t.anchor, spine, check);
    if (r.skipped) { console.log(`  ${t.file}: skipped — ${r.skipped}`); continue; }
    any++;
    const d = r.delta !== undefined ? ` (${r.delta >= 0 ? "+" : ""}${r.delta} bytes)` : "";
    console.log(`  ${r.file}: ${r.state}${d}${r.detail ? " — " + r.detail : ""}`);
    if (r.state === "STALE" || r.state === "ABSENT") bad++;
  }
  if (!any) { console.error("no target matched — nothing spliced"); process.exit(1); }
  console.log(check
    ? (bad ? `SPINE DRIFT: ${bad} target(s) out of date. Run: node occvm/tools/splice-spine.js` : `SPINE OK: sha256:${sha(spine)}`)
    : `spine sha256:${sha(spine)}`);
  process.exit(bad ? 1 : 0);
}
if (require.main === module) main();
module.exports = { block, OPEN, CLOSE, sha };
