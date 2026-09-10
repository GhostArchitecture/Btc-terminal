#!/usr/bin/env node
/* react/tools/resplice.js — put the React island's sources into index.html, idempotently.
 *
 * Same five rules as occvm/tools/splice-spine.js, which is the older instance of this pattern in this
 * repository (units/tools/resplice.js is the other):
 *   1. the generated region is fenced and never hand-edited
 *   2. the generator's input is the source; the spliced copy is an artifact
 *   3. regeneration is idempotent — unchanged input yields a byte-identical block
 *   4. the ritual runs before the diff, not after
 *   5. a part dropped from PARTS is REMOVED from the target, not left to go stale under its fence
 *
 * Why splice rather than three <script src> tags: vendor/README.md. In one line — jsdom does not fetch
 * external scripts in test/page-load.js, so the one harness that loads the real page could not see the
 * component at all, and the foot of index.html already records that a second script tag breaks every
 * harness.
 *
 * ORDER IS LOAD ORDER AND IS NOT INCIDENTAL. react must evaluate before react-dom (react-dom's UMD
 * global branch reads self.React as its second argument), and both before any component. So the first
 * part anchors on the marker and every later part anchors on its predecessor's closing fence. The
 * splicer cannot produce an order the list does not state, which is the defect occvm's splicer shipped
 * from 1.1b to 2.0 — one anchor for every part means parts land in reverse list order.
 *
 * Usage:  node react/tools/resplice.js [--check] [part ...]
 */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..");
const TARGET = "index.html";
const MARKER = "/* ==== REACT ISLAND — vendor and components are spliced below by react/tools/resplice.js ==== */";

const PARTS = [
  { name: "react-18.3.1.umd.min.js",     from: path.join("vendor", "react-18.3.1.umd.min.js") },
  { name: "react-dom-18.3.1.umd.min.js", from: path.join("vendor", "react-dom-18.3.1.umd.min.js") },
  /* Cast before LockBar: LockBar renders OCCVM_CAST, and the island's own guard forbids a bare button
     anywhere else, so every later component depends on this one being defined first. */
  { name: "Cast.js",                     from: path.join("react", "Cast.js") },
  { name: "LockBar.js",                  from: path.join("react", "LockBar.js") },
];
/* A part removed from PARTS above goes here, so its block leaves index.html rather than shipping
   forever under a fence nobody regenerates. Empty is the honest state today. */
const RETIRED = [];

const sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const fence = p => ({
  open: `/* ==== REACT ISLAND ${p.name} — spliced from ${p.from.split(path.sep).join("/")}. do not edit. ==== */`,
  close: `/* ==== END REACT ISLAND ${p.name} ==== */`,
});
const block = (p, src) => `${fence(p).open}\n/* sha256:${sha(src)} */\n${src.trimEnd()}\n${fence(p).close}`;

function splice(p, prevAnchor, check) {
  const srcFile = path.join(ROOT, p.from);
  if (!fs.existsSync(srcFile)) throw new Error(`${p.from} not found`);
  const src = fs.readFileSync(srcFile, "utf8");
  const abs = path.join(ROOT, TARGET);
  const text = fs.readFileSync(abs, "utf8");
  const f = fence(p), want = block(p, src);

  const i = text.indexOf(f.open);
  if (i >= 0) {
    const j = text.indexOf(f.close, i);
    if (j < 0) throw new Error(`${TARGET}: ${p.name} opening fence with no close — refusing to guess where it ends`);
    if (text.slice(i, j + f.close.length) === want) return { state: "current" };
    if (check) return { state: "STALE", detail: `does not match ${p.from}` };
    fs.writeFileSync(abs, text.slice(0, i) + want + text.slice(j + f.close.length));
    return { state: "updated" };
  }
  if (check) return { state: "ABSENT", detail: `no ${p.name} block in ${TARGET}` };
  const a = text.indexOf(prevAnchor);
  if (a < 0) throw new Error(`${TARGET}: anchor ${JSON.stringify(prevAnchor.slice(0, 60))} not found — refusing to splice blind`);
  const at = a + prevAnchor.length;
  fs.writeFileSync(abs, text.slice(0, at) + "\n" + want + "\n" + text.slice(at));
  return { state: "inserted" };
}

function retire(name, check) {
  const abs = path.join(ROOT, TARGET);
  const text = fs.readFileSync(abs, "utf8");
  const open = `/* ==== REACT ISLAND ${name} —`, close = `/* ==== END REACT ISLAND ${name} ==== */`;
  const i = text.indexOf(open);
  if (i < 0) return { state: "retired" };
  if (check) return { state: "LINGERING", detail: `retired part still spliced into ${TARGET}` };
  const j = text.indexOf(close, i);
  if (j < 0) throw new Error(`${TARGET}: retired ${name} has an opening fence with no close — refusing to guess`);
  let end = j + close.length;
  while (text[end] === "\n") end++;
  fs.writeFileSync(abs, text.slice(0, i) + text.slice(end));
  return { state: "removed" };
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes("--check");
  const only = argv.filter(a => !a.startsWith("--"));
  let bad = 0;
  for (const name of RETIRED) {
    const r = retire(name, check);
    if (r.state !== "retired") console.log(`  ${name}: ${r.state}${r.detail ? " — " + r.detail : ""}`);
    if (r.state === "LINGERING") bad++;
  }
  let anchor = MARKER;
  for (const p of PARTS) {
    if (!only.length || only.includes(p.name)) {
      const r = splice(p, anchor, check);
      console.log(`  ${p.name} -> ${TARGET}: ${r.state}${r.detail ? " — " + r.detail : ""}`);
      if (r.state === "STALE" || r.state === "ABSENT") bad++;
    }
    anchor = fence(p).close;   /* the next part follows this one, whether or not this one was rewritten */
  }
  const stamp = PARTS.map(p => `${p.name}:${sha(fs.readFileSync(path.join(ROOT, p.from), "utf8"))}`).join(" ");
  console.log(check ? (bad ? `REACT DRIFT: ${bad} part(s) out of date. Run: node react/tools/resplice.js` : `REACT OK: ${stamp}`) : `react ${stamp}`);
  process.exit(bad ? 1 : 0);
}
if (require.main === module) main();
module.exports = { PARTS, RETIRED, MARKER, fence, block, sha };
