#!/usr/bin/env node
/* occvm/tools/token-audit.js — the 1.9 audit, as an instrument rather than a session.
 *
 * 1.9's brief is a full token audit and a migration table a stranger could follow. An audit performed
 * once by hand is a paragraph; an audit that can be re-run is a gate, and the difference is whether the
 * next release can silently undo it. This is the gate. `--check` exits nonzero on anything in class [A].
 *
 * IT DERIVES EVERYTHING AND ASSUMES NOTHING. Its first draft reported four tokens as "used but never
 * declared" and three more as dead, and every one of those was the instrument's fault: it looked only for
 * `var(--x)` and `setProperty("--x")`, so it could not see a token read through `getPropertyValue`, nor
 * one written as a JSX inline-style key (`style={{"--m": ...}}`). Reporting those as defects would have
 * been precisely the failure this pass exists to catch, one level up. Every way a token can be provided
 * or consumed is enumerated below, and adding a new way is a change to THIS file.
 *
 * Usage:  node occvm/tools/token-audit.js [--check] [--json]
 */
"use strict";
const fs = require("fs"), path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SIBLING = path.resolve(ROOT, "..", "Rhyme-Instrument");
const OCCVM = path.join(ROOT, "occvm");
/* 2.27 — the part list is READ FROM THE SPLICER rather than typed here. It had gone stale twice over:
   it still named veins.js and minerals.js (both retired) and had never gained serif.css, reading.css,
   rheology.js, globules.js or yield.js, so five spliced parts' tokens were being attributed to the tools
   that carry them instead of to the spine. That is the 2.14 class — a hand-typed list inside the
   instrument built to end hand-typed lists. */
const PARTS = [...new Set(require("./splice-spine.js").PARTS.map(p => p.name))];

const read = p => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");
/* the body of a named object literal, so a token in VALUE position can be attributed to the right class */
function mapBody(text, name) {
  const m = text.match(new RegExp(name + "\\s*=\\s*\\{"));   /* both tools' brace styles: `X = {` and `X={` */
  if (!m) return "";
  const j = text.indexOf("};", m.index); return j < 0 ? "" : text.slice(m.index, j);
}
const add = (set, text, re) => { for (const m of text.matchAll(re)) set.add(m[1]); };

/* every way a token is CONSUMED */
function consumed(text) {
  const U = new Set();
  add(U, text, /var\(\s*(--[a-zA-Z0-9-]+)/g);                       /* CSS reference */
  add(U, text, /getPropertyValue\(\s*["'](--[a-zA-Z0-9-]+)/g);      /* read back in JS */
  add(U, text, /\bnum\(\s*["'](--[a-zA-Z0-9-]+)/g);                 /* a tool's own numeric reader */
  add(U, text, /\bstr\(\s*["'](--[a-zA-Z0-9-]+)/g);                 /* a tool's own string reader */
  /* 2.27 — A TOKEN NAMED AS A MAP'S VALUE. `PAL_LIVE` is `{mal: "--malachite", ...}` and `palTick`
     resolves every one of them through `getPropertyValue`, so thirteen tokens are consumed by a loop
     the regexes above cannot see: the token is the map's VALUE, and the two existing object-literal
     rules both match a token as a KEY. Reported --ruby-lo as dead weight on the run that introduced it,
     which is this file's own opening paragraph happening again — the instrument's fault, not the code's.
     Syntax alone cannot say whether a value-position token is read or written, so the maps are named
     rather than sniffed, which is this file's stated rule for adding a way. */
  add(U, mapBody(text, "PAL_LIVE"), /["'](--[a-zA-Z0-9-]+)["']/g);
  return U;
}
/* every way a token is WRITTEN at runtime */
function written(text) {
  const W = new Set();
  add(W, text, /setProperty\(\s*["'](--[a-zA-Z0-9-]+)/g);           /* imperative */
  add(W, text, /["'](--[a-zA-Z0-9-]+)["']\s*:/g);                   /* object literal / JSX inline style */
  add(W, mapBody(text, "OCCVM_PIGMENT_TOKENS"), /["'](--[a-zA-Z0-9-]+)["']/g);  /* see consumed() */
  return W;
}
/* declared in CSS */
function declared(text) {
  const D = new Set();
  add(D, text, /(--[a-zA-Z0-9-]+)\s*:\s*[^;\n]/g);
  return D;
}

function audit() {
  const spineSrc = PARTS.map(n => read(path.join(OCCVM, n))).join("\n");
  const spineWrites = written(spineSrc);
  const spineDecl = declared(spineSrc);
  for (const w of spineWrites) spineDecl.delete(w);

  const btcSrc = read(path.join(ROOT, "index.html"));
  const btcStyles = (btcSrc.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join("\n");
  const btc = { D: declared(btcStyles), U: consumed(btcSrc), W: written(btcSrc) };

  const rh = { D: new Set(), U: new Set(), W: new Set(), present: fs.existsSync(SIBLING) };
  for (const f of ["20_style.css", "10_engine.js", "30_ui.jsx", "25_card.js", "00_data.js"]) {
    const t = read(path.join(SIBLING, "tome-src", f));
    declared(t).forEach(x => rh.D.add(x));
    consumed(t).forEach(x => rh.U.add(x));
    written(t).forEach(x => rh.W.add(x));
  }
  /* the spine is spliced INTO the tools, so subtract it to leave each tool's own surface */
  for (const s of [...spineDecl, ...spineWrites]) {
    btc.D.delete(s); btc.W.delete(s); rh.D.delete(s); rh.W.delete(s);
  }

  const all = new Set([...spineDecl, ...spineWrites,
    ...btc.D, ...btc.U, ...btc.W, ...rh.D, ...rh.U, ...rh.W]);
  return [...all].sort().map(token => ({
    token,
    spine: spineWrites.has(token) ? "written" : spineDecl.has(token) ? "declared" : null,
    btc: { decl: btc.D.has(token), use: btc.U.has(token), write: btc.W.has(token) },
    rhyme: { decl: rh.D.has(token), use: rh.U.has(token), write: rh.W.has(token) },
    rhymePresent: rh.present,
  }));
}

const provider = r => r.spine ? "spine/" + r.spine
  : [r.btc.decl || r.btc.write ? "btc" : "", r.rhyme.decl || r.rhyme.write ? "rhyme" : ""].filter(Boolean).join("+");
const isUsed = r => r.btc.use || r.rhyme.use;

function main() {
  const rows = audit();
  const argv = process.argv.slice(2);
  if (argv.includes("--json")) { console.log(JSON.stringify(rows, null, 1)); return; }

  const orphans = rows.filter(r => !provider(r));
  const unconsumed = rows.filter(r => r.spine && !isUsed(r));
  const deadLocal = rows.filter(r => !r.spine && provider(r) && !isUsed(r));

  console.log(`tokens: ${rows.length} · spine writes ${rows.filter(r => r.spine === "written").length}` +
              ` · spine declares ${rows.filter(r => r.spine === "declared").length}` +
              ` · tool-local ${rows.filter(r => !r.spine && provider(r)).length}`);
  if (!rows[0].rhymePresent)
    console.log("  note: the sibling repository is not in this checkout — Rhyme's columns read empty.");

  console.log("\n[A] consumed but never provided — resolves to nothing:");
  console.log(orphans.length ? orphans.map(r => "  " + r.token).join("\n") : "  none");

  console.log("\n[B] a spine token no tool consumes:");
  console.log(unconsumed.length ? unconsumed.map(r => "  " + r.token.padEnd(16) + "(" + r.spine + ")").join("\n") : "  none");

  console.log("\n[C] a tool-local token its own tool never consumes — dead weight:");
  console.log(deadLocal.length ? deadLocal.map(r => "  " + r.token.padEnd(16) + provider(r)).join("\n") : "  none");

  if (argv.includes("--check")) {
    /* [A] is decidable from one repository: a token consumed here and provided nowhere is broken here.
     *
     * [B] AND [C] ARE NOT, AND GATING THEM ON A PARTIAL CHECKOUT IS UNSOUND. A token this tool declares
     * and never reads may be read by the other tool; with only one repository present the audit cannot
     * tell "dead" from "consumed next door". CI checks out one repository, so this gate fired on four
     * tokens that Rhyme consumes and failed a green build — which is precisely the defect the GOLDEN
     * RECORDER had before it was fixed earlier in this same migration: a verdict that changed with which
     * clones happened to be on the machine. Having repeated it one level up, the instrument now says so
     * rather than judging what it cannot see.
     *
     * (The four tokens were nevertheless a real finding: BTC wrote --mineral, --mineral-lo, --vein-hi
     * and --vein-lo and read none of them, which Rhyme's consumption had been masking. They are consumed
     * in BTC now. The gate below is about what the instrument may CLAIM, not about that fix.) */
    if (orphans.length) { console.error(`\nAUDIT FAIL: ${orphans.length} token(s) resolve to nothing.`); process.exit(1); }
    const whole = rows.length && rows[0].rhymePresent;
    if (!whole) {
      console.log("\nAUDIT OK (partial): nothing resolves to nothing.");
      console.log("  [B] and [C] are NOT gated here — the sibling repository is absent, so a token this");
      console.log("  tool never reads may simply be read next door. Run it where both clones are present");
      console.log("  to judge those. Reporting a partial picture as a verdict is how the golden recorder");
      console.log("  went wrong before it was fixed; this instrument will not repeat it.");
      return;
    }
    if (deadLocal.length) { console.error(`\nAUDIT FAIL: ${deadLocal.length} dead tool-local token(s). 1.9 removes these.`); process.exit(1); }
    console.log("\nAUDIT OK: nothing resolves to nothing, no dead tool-local token, both tools seen.");
  }
}
if (require.main === module) main();
module.exports = { audit, provider, isUsed };
