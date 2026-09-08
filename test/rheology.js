/* test/rheology.js — OCCVM 2.5, the rheological substance.
 *
 * Step 1 of the pivot sequence. rheology.js is consumed by nothing yet, deliberately: the handoff's own
 * ordering says everything else reads from it and nothing can be spliced correctly before it exists.
 * These assertions are what make that safe — the file is measured now, not when three other modules
 * already depend on it.
 */
const { runner } = require("./lib/load");
const { T, done } = runner("rheology: the substance");
const R = require("../occvm/rheology.js");
const K = R.KETCHUP;

/* ── the substance is published, not chosen ─────────────────────────────────────────────────────── */
T("k and n are the Koocheki control formulation", K.k === 4.6 && K.n === 0.19);
/* tau0 is NOT the published range floor, and the floor is falsified by the substance's own behaviour:
   a layer stands only while tau0 >= rho*g*h, so 0.03 Pa holds 2.7 micrometres and this ketchup would
   sheet off a plate. Re-entered at the stress where puddle height equals capillary length. */
T("tau0 is not the range floor that could not hold a blob", K.tau0 !== 0.03 && K.tau0 > 10, K.tau0);
T("and it sits inside the published ~10-40 Pa band", K.tau0 > 10 && K.tau0 < 40);
T("the flow index is shear-thinning, which is what makes it a yield-stress fluid at all", K.n < 1);
T("the refractive index is the refractometric Brix value, not a convenience",
  K.brix === 30 && Math.abs(K.ri - 1.381) < 1e-9);

/* ── THE PORT THE ROADMAP SAID WAS IMPOSSIBLE ───────────────────────────────────────────────────
 * "Elastic tensor and biaxial optics have no fluid equivalent — deleted, not ported." The tensor does
 * die. The optics do not, and this is the block that proves it: one index, three angles, three faces.
 * 2.4's mechanism was never biaxiality — it was that a slab presents three angles to the viewer. */
{
  const f = R.faces(K);
  T("an isotropic fluid still separates the three faces, by angle alone",
    f.edge.R > f.chamfer.R && f.chamfer.R > f.front.R);
  T("all three faces take the same index — the crystal model's index-to-face convention is gone",
    R.fresnel(K.ri, 0) === f.front.R && R.fresnel(K.ri, 80) === f.edge.R);
  const spread = f.edge.R / f.front.R;
  T("the fluid's optical spread is 14.15x", Math.abs(spread - 14.148) < 0.01, spread.toFixed(3));

  /* and it lands closer to what the tools actually paint than the crystal did — measured, not asserted */
  const kC = R.renderedContrast(K);
  T("the legibility exponent is within 1% of unity: the substance carries the substrate essentially unaided",
    Math.abs(kC - 1) < 0.01, kC.toFixed(4));
  T("which is a better fit than the crystal's 1.177", Math.abs(kC - 1) < Math.abs(1.1766 - 1));
  T("the anchor is the RENDERED high-sun spread, never the :root fallback — 2.3's error may not return",
    R.RENDERED_SPREAD_HIGH === 13.881 && Math.abs(R.RENDERED_SPREAD_HIGH - 5.739) > 1);
  T("at that exponent the substrate reproduces the rendered spread",
    Math.abs(R.substrate(K).spread - R.RENDERED_SPREAD_HIGH) < 0.02);
}

/* ── the resolver is the crystal model's, including the reason it is ────────────────────────────── */
{
  const s = R.substrate(K, 1);
  const lin = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = h => { const p = lin(h); return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; };
  T("the ramp is ordered hi > mid > lo", lum(s.hi) > lum(s.mid) && lum(s.mid) > lum(s.lo));
  T("the rendered spread equals the optical ratio in linear light (no double gamma)",
    Math.abs(lum(s.hi) / lum(s.lo) / s.spread - 1) < 0.02);
  const hue = h => { const p = lin(h), m = Math.max(...p) || 1; return p.map(v => v / m); };
  hue(K.body).forEach((v, i) => T(`one gain, no hue shift (ch ${i})`, Math.abs(v - hue(s.hi)[i]) < 0.02));
  T("contrast 0 collapses to the body colour", R.substrate(K, 0).lo === K.body);
  T("the sun does not enter the ratio: substance owns structure, sundial owns magnitude",
    R.faces.length === 1);
}

/* ── the sundial's call site must keep working across the swap ──────────────────────────────────── */
{
  const r = R.faceRatios(K);
  T("faceRatios returns the same shape the sundial already calls",
    typeof r.hi === "number" && typeof r.lo === "number" && r.hi > 1 && r.lo < 1);
  const M = require("../occvm/material.js");
  const c = M.faceRatios(M.ARAGONITE);
  T("and it is NOT identical to the crystal's — the swap is a visible change, not a no-op",
    Math.abs(r.hi - c.hi) > 1, `ketchup hi ${r.hi.toFixed(2)} vs aragonite ${c.hi.toFixed(2)}`);
}

/* ── flow, and the property yield.js is built on ────────────────────────────────────────────────── */
{
  T("below the yield stress there is NO flow — not slow flow, none",
    R.shearRate(K, K.tau0 * 0.5) === 0 && R.shearRate(K, K.tau0) === 0);
  T("above it, flow", R.shearRate(K, K.tau0 + 5) > 0);
  T("stress and shear rate invert each other",
    Math.abs(R.stress(K, R.shearRate(K, K.tau0 + 5)) - (K.tau0 + 5)) < 1e-6);

  /* THE FINDING THAT BLOCKS THE ROADMAP'S §3 AS WRITTEN, pinned so it is not rediscovered mid-build.
     The handoff proposes computing an animation duration from gammaDot = ((tau-tau0)/k)^(1/n). With
     n = 0.19 that exponent is 5.26, so a 100x range in applied stress spans ~1.9e18 in rate. No
     monotone map from that to a 200-400ms duration exists that is not doing all the work itself. */
  const lo = R.shearRate(K, K.tau0 * 1.001), hi = R.shearRate(K, K.tau0 * 100);
  T("gammaDot spans >1e15 across a 100x stress range — raw rate cannot be a duration",
    hi / lo > 1e15, (hi / lo).toExponential(1));
  T("1/n is the culprit and it is 5.26, a property of the published n, not a modelling choice",
    Math.abs(1 / K.n - 5.263) < 0.01);
}

/* ── SGR: open item #5, closed by derivation ────────────────────────────────────────────────────── */
{
  const x = R.noiseTemperature(K);
  T("the noise temperature derives from n rather than needing a second authored constant",
    Math.abs(x - 0.81) < 1e-9, x.toFixed(3));
  T("x < 1: a yield stress exists ONLY in the glass phase, so the sign is physics, not preference",
    R.inGlassPhase(K));
  T("and it sits just below the transition, where a substance that yields but only just belongs",
    x > 0.5 && x < 1);
}

/* ── vein habit ─────────────────────────────────────────────────────────────────────────────────── */
T("the DLCA fractal dimension replaces the twin angle", Math.abs(R.fractalDimension() - 1.75) < 1e-9);
T("no lattice survives on the substance: a fluid has no unit cell", K.cell === undefined);
T("and no stiffness tensor, so P1's anisotropic motion retires with the crystal", K.C === undefined);

process.exit(done());
