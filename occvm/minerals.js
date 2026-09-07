/* OCCVM 1.4 — the mineral set (OCCVM-L6). One implementation, shared by every conforming tool.
 *
 * Authored in occvm/SPINE.md; spliced into a tool by occvm/tools/splice-spine.js. Do not hand-edit the
 * spliced copy — the next splice reverts it silently.
 *
 * The set is closed and the meanings are fixed: amethyst is the default field, malachite is affirmed/
 * won/positive, ruby is negated/lost/failed. `m`/`mlo` (accent/deep) are the law-pinned pair — SPINE.md's
 * L6 table states them exactly. `hi`/`lo` are the vein generator's own highlight/shadow tint, derived by
 * eye rather than by a formula (the existing amethyst/malachite pair wasn't built from one either), and
 * are cosmetic: changing them is a design call, not a re-registration.
 *
 * Before this file, each tool that had a mineral concept declared its own copy. Rhyme's carried only two
 * of the three — it had never needed a negative mineral, so ruby was never added — which is exactly the
 * "no local exceptions" gap L6 exists to close (OCCVM-D6's other half: BTC had no mineral system at all).
 */
var OCCVM_MINERALS = {
  amethyst:  { m: "#8d5cf0", mlo: "#4a2a8c", hi: "#c9a6ff", lo: "#5a36a8" },
  malachite: { m: "#3fbf7e", mlo: "#1c6a45", hi: "#9ff0c5", lo: "#1f7a50" },
  ruby:      { m: "#e0475f", mlo: "#6b1a2e", hi: "#f5a3b3", lo: "#8f2740" },
};
if (typeof module !== "undefined") module.exports = OCCVM_MINERALS;
