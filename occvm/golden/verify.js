/* occvm/golden/verify.js — diff the current tools against the committed golden set.
 *
 * Tier 1 only. The token manifests are pure numbers and hexes, so they are byte-stable on any machine
 * and equality is a fair gate. The PNGs are NOT diffed: font rasterisation and GPU compositing differ
 * per machine, so pixel equality would be red everywhere but the machine that recorded it. Look at the
 * PNGs with your eyes; assert on the manifests.
 *
 * A failure here is not automatically a regression — it is an unexplained delta, which per the 2.0
 * migration process (section 7) is exactly the thing you must not ship. Read the delta. If it is the
 * change you intended, re-record and commit the new baseline (migration section 8).
 *
 * Usage:  node occvm/golden/verify.js [--tool btc|rhyme]
 */
"use strict";
const fs = require("fs"), os = require("os"), path = require("path");
const { record } = require("./record");

const HERE = __dirname;

function flat(manifest) {
  const out = {};
  /* Pin the measured key set itself. If the list of tokens a recording queries can shrink, the diff
     silently narrows and stops testing what it dropped — which is exactly how eleven live sundial values
     read <absent> in CI for five releases while every local run said PASS. */
  out["@token_names"] = (manifest.token_names || []).join(",");
  for (const [c, body] of Object.entries(manifest.cases || {})) {
    for (const [k, v] of Object.entries(body.tokens || {})) out[`${c}/${k}`] = v;
    out[`${c}/@page_errors`] = JSON.stringify(body.page_errors || []);
    out[`${c}/@vendored`] = JSON.stringify(body.vendored_requests || []);
  }
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const only = argv.includes("--tool") ? argv[argv.indexOf("--tool") + 1] : null;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "occvm-golden-"));
  let failures = 0, checked = 0;

  for (const tool of ["btc", "rhyme"]) {
    if (only && tool !== only) continue;
    const goldenFile = path.join(HERE, tool, "tokens.json");
    if (!fs.existsSync(goldenFile)) { console.log(`  ${tool}: no golden set recorded — skipping`); continue; }

    const fresh = await record(tool, tmp);
    if (fresh.skipped) { console.log(`  ${tool}: SKIPPED — ${fresh.skipped}`); continue; }

    const a = flat(JSON.parse(fs.readFileSync(goldenFile, "utf8"))), b = flat(fresh);
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    const deltas = keys.filter(k => a[k] !== b[k]);
    checked += keys.length;
    if (!deltas.length) { console.log(`  ${tool}: ${keys.length} values match the golden set`); continue; }
    failures += deltas.length;
    console.log(`  ${tool}: ${deltas.length} of ${keys.length} values DIFFER from the golden set`);
    if (deltas.includes("@token_names"))
      console.log("      ^ the SET OF TOKENS MEASURED changed, not just their values. A narrower set is not\n" +
                  "        a passing diff — it is a diff that stopped looking. Check the recorder before the tool.");
    for (const k of deltas.slice(0, 40))
      console.log(`      ${k}\n        golden ${a[k] === undefined ? "<absent>" : a[k]}\n        now    ${b[k] === undefined ? "<absent>" : b[k]}`);
    if (deltas.length > 40) console.log(`      … and ${deltas.length - 40} more`);
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(failures
    ? `GOLDEN DRIFT: ${failures} value(s) changed. Read the delta; if it is intended, re-record with\n  node occvm/golden/record.js   and commit the new baseline.`
    : `GOLDEN OK: ${checked} values match.`);
  process.exit(failures ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
