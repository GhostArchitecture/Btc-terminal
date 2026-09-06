/* Runs the whole suite. Exit code = number of failing harness files. Per CLAUDE.md §6: run before every push. */
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");
const files = ["invariants.js", "sweep.js", "page-load.js", "hprotocol.js", "prereg.js"];
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: "inherit" });
  if (r.status !== 0) failed++;
  console.log("");
}
console.log("known-defect reproductions (informational): node test/defects.js");
console.log(failed ? `SUITE FAIL: ${failed} of ${files.length} harnesses failing` : `SUITE PASS: ${files.length} harnesses`);
process.exit(failed);
