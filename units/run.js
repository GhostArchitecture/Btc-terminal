/* Runs every H-protocol unit suite. These are the suites that PROVE the spliced code in index.html;
   test/ covers the page, units/ covers the units. Exit code = number of failing units. */
"use strict";
const { spawnSync } = require("child_process");
const path = require("path"), fs = require("fs");
const units = ["volspace", "calendar", "detect", "reversal", "schema", "prereg"];
let failed = 0;
for (const u of units) {
  const f = path.join(__dirname, u, "test.js");
  if (!fs.existsSync(f)) { console.log(`${u}: NO SUITE`); failed++; continue; }
  const r = spawnSync(process.execPath, [f], { cwd: path.join(__dirname, u), encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || "");
  const bad = r.status !== 0;
  if (bad) { failed++; process.stdout.write(out); }
  console.log(`${bad ? "FAIL" : "PASS"} ${u}: ${(out.trim().split("\n").pop() || "").trim()}`);
}
console.log(failed ? `UNITS FAIL: ${failed} of ${units.length}` : `UNITS PASS: ${units.length}`);
process.exit(failed);
