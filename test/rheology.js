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
/* 2.10 — read off Koocheki Table 3's CONTROL row at 25 °C, and pinned to it. Until 2.10 this asserted
   k = 4.6 and n = 0.19 "the control formulation", and neither is in that paper: its Herschel-Bulkley k′
   ranges 6.56–20.10 across every formulation, so 4.6 is below the whole range, and 0.19 is the floor of
   the POWER-LAW index across hydrocolloid samples. An assertion can pin a number to a citation and still
   be wrong about the citation — this one was, for five releases. */
T("k and n are the Koocheki control row, Herschel-Bulkley, 25 °C", K.k === 16.18 && K.n === 0.250);
T("and both sit inside that paper's published ranges", K.k >= 6.56 && K.k <= 20.10 && K.n >= 0.216 && K.n <= 0.263);
T("the retired misattribution cannot come back", K.k !== 4.6 && K.n !== 0.19);
/* tau0 is NOT the published range floor, and the floor is falsified by the substance's own behaviour:
   a layer stands only while tau0 >= rho*g*h, so 0.03 Pa holds 2.7 micrometres and this ketchup would
   sheet off a plate. Re-entered at the stress where puddle height equals capillary length. */
T("tau0 is not the range floor that could not hold a blob", K.tau0 !== 0.03 && K.tau0 > 10, K.tau0);
/* 2.10 — the "~10–40 Pa published band" this used to assert had no citation in either file and none was
   found. What is on the record are STATIC yield stresses: 21.88 / 29.02 / 37.10 Pa (Ebatco) and 21.8 Pa
   (NETZSCH). τ₀ sits at the foot of those, and the quantity mismatch — a static yield stress paired with
   a dynamic flow-curve triple — is recorded in the file rather than resolved. */
T("tau0 sits at the foot of the measured static yield stresses, not in an uncited band",
  K.tau0 >= 21 && K.tau0 <= 21.9);
T("and it is well above the paper's DYNAMIC Herschel-Bulkley intercept of 4.41 Pa — a different quantity",
  K.tau0 > 4.41 * 4);
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
  /* the crystal it replaced is gone (2.8), so the comparison is against its RECORDED ratio: aragonite's
     optics gave edge:front 9.353 at the same cut, the fluid gives 14.148 — the swap was a visible change */
  const F = R.faces(K);
  T("and it is NOT the crystal's — the swap was a visible change, not a no-op",
    Math.abs(F.edge.R / F.front.R - 14.148) < 0.01 && Math.abs(F.edge.R / F.front.R - 9.353) > 1,
    (F.edge.R / F.front.R).toFixed(3));
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
     n = 0.250 that exponent is 4.00, so a 100x range in applied stress spans 1e8 in rate. No
     monotone map from that to a 200-400ms duration exists that is not doing all the work itself. */
  const lo = R.shearRate(K, K.tau0 * 1.001), hi = R.shearRate(K, K.tau0 * 100);
  T("gammaDot spans >1e15 across a 100x stress range — raw rate cannot be a duration",
    hi / lo > 1e15, (hi / lo).toExponential(1));
  T("1/n is the culprit and it is 4.00, a property of the published n, not a modelling choice",
    Math.abs(1 / K.n - 4) < 0.01);
  T("and the correction did not rescue the formula: 100x in stress is still 1e8 in rate",
    Math.pow(100, 1 / K.n) > 1e7, Math.pow(100, 1 / K.n).toExponential(1));
}

/* ── SGR: open item #5, closed by derivation ────────────────────────────────────────────────────── */
{
  const x = R.noiseTemperature(K);
  T("the noise temperature derives from n rather than needing a second authored constant",
    Math.abs(x - 0.75) < 1e-9, x.toFixed(3));
  T("x < 1: a yield stress exists ONLY in the glass phase, so the sign is physics, not preference",
    R.inGlassPhase(K));
  T("and it sits just below the transition, where a substance that yields but only just belongs",
    x > 0.5 && x < 1);
}

/* ── vein habit ─────────────────────────────────────────────────────────────────────────────────── */
T("the DLCA fractal dimension replaces the twin angle — as a recorded output, not an input", Math.abs(R.fractalDimension() - 1.75) < 1e-9);
T("the 3-D and the 2-D lattice values are both recorded, and they differ", R.DLCA_D === 1.75 && R.DLCA_D_LATTICE === 1.44);
T("no lattice survives on the substance: a fluid has no unit cell", K.cell === undefined);
T("and no stiffness tensor, so P1's anisotropic motion retires with the crystal", K.C === undefined);

/* ── cessation: finite stopping time, the roadmap's derivation checked rather than cited ────────── */
{
  /* the roadmap's table, at ITS τ₀ (0.03 Pa): v₀ 0.01 / 0.1 / 1 → 0.0063 / 0.041 / 0.266 */
  const rm = { tau0: 0.03, k: 4.6, n: 0.19 };   /* the ROADMAP's triple, kept verbatim: this block checks its table */
  const tab = [[0.01, 0.0063], [0.1, 0.041], [1, 0.266]];
  T("the integration reproduces the roadmap's three stopping times to the figures it printed",
    tab.every(([v0, t]) => Math.abs(R.stoppingTime(rm, v0) / t - 1) < 0.01),
    tab.map(([v0]) => R.stoppingTime(rm, v0).toFixed(4)).join(" "));
  T("and every one sits inside the analytic bracket",
    [0.01, 0.1, 1].every(v0 => { const b = R.stoppingBracket(K, v0), t = R.stoppingTime(K, v0); return t >= b.lo * 0.999 && t <= b.hi * 1.001; }));
  T("stopping is FINITE: the integrator terminates, which a Newtonian decay never would", isFinite(R.stoppingTime(K, 1)));

  /* THE ATTRIBUTION THE ROADMAP INVERTED. At its τ₀ the rate term dominates until v ~ 3e-12; at the
     substance's, the yield term dominates from the first instant for any v₀ under ~2.92 — which read
     ~3,000 until 2.10 corrected k and n, and is the one documented claim that correction moved. */
  T("at the roadmap's τ₀ the regime is rate-dominated (k·v₀ⁿ ≫ τ₀), so the bound is tight for the OPPOSITE reason it gave",
    R.regime(rm, 1) > 100);
  /* 2.10 — THIS ASSERTION USED TO READ "for any plausible v₀" AND THE CORRECTION BROKE IT, which is the
     whole value of the correction. At the misattributed k = 4.6 the regime stayed yield-dominated to
     v₀ ≈ 3,000 and the phrase was harmless. At the real k = 16.18 it crosses at 2.92: yield-dominated
     where the primitive actually runs, rate-dominated an order of magnitude above. Stated as the bracket
     it is, not as a blanket. */
  T("at the substance's τ₀ the regime is yield-dominated where the primitive runs, and only there",
    R.regime(K, 1) < 1 && R.regime(K, 100) > 1,
    "v0=1 " + R.regime(K, 1).toFixed(3) + ", v0=100 " + R.regime(K, 100).toFixed(3));
  T("the crossover v₀ is 2.92 in the model's units", Math.abs(Math.pow(K.tau0 / K.k, 1 / K.n) / 2.92 - 1) < 0.02);
  T("yield.js still runs inside it, and the margin is now the thing to watch",
    require("../occvm/yield.js").V0 < Math.pow(K.tau0 / K.k, 1 / K.n),
    "v0 " + require("../occvm/yield.js").V0 + " against a crossover of " + Math.pow(K.tau0 / K.k, 1 / K.n).toFixed(2));

  /* both regimes have a closed-form position, and the sampled curve matches each */
  const e1 = R.easing(K, 1, 17), e2 = R.easing(rm, 1, 17);
  /* The two closed forms are LIMITS, and 2.10's correction moved the substance off the yield-dominated
     one far enough to matter. At v₀ = 1 the rate term is 76.5% of the yield term, so the curve is mixed:
     0.0163 from the quadratic, 0.0403 from the power law — nearer the quadratic, which is what makes the
     quadratic the right thing to name, and not equal to it, which is what makes "is the quadratic" the
     wrong thing to say. Driven into the limit (v₀ = 0.001, regime 0.024) it converges to 0.0042. */
  const deep = R.easing(K, 0.001, 17);
  const dev = (arr, f) => Math.max(...arr.map((v, i) => Math.abs(v - f(i / 16))));
  const quad = u => 1 - Math.pow(1 - u, 2);
  T("in the yield-dominated LIMIT the position converges on the quadratic", dev(deep, quad) < 0.005, dev(deep, quad).toFixed(4));
  T("at the v₀ the primitive uses the curve is mixed, and nearer the quadratic than the power law",
    dev(e1, quad) < 0.02 && dev(e1, quad) < dev(e1, u => 1 - Math.pow(1 - u, 1 + 1 / (1 - K.n))) / 2,
    "quad " + dev(e1, quad).toFixed(4) + " vs power " + dev(e1, u => 1 - Math.pow(1 - u, 1 + 1 / (1 - K.n))).toFixed(4));
  /* the rate-dominated form is checked on the ROADMAP's own triple, which is the one that is in that
     regime — reading K.n here mixed one fluid's exponent into the other fluid's curve. */
  T("rate-dominated: position is 1 − (1−u)^(1 + 1/(1−n)), the roadmap's own 2.235",
    dev(e2, u => 1 - Math.pow(1 - u, 1 + 1 / (1 - rm.n))) < 0.005 && Math.abs(1 + 1 / (1 - rm.n) - 2.235) < 0.001);
  T("the curve is monotone, starts at 0 and ends at exactly 1", e1[0] === 0 && e1[16] === 1 && e1.every((v, i) => i === 0 || v >= e1[i - 1]));
  T("cssEasing hands CSS a linear() it can consume", /^linear\(0, [\d., ]+1\)$/.test(R.cssEasing(K, 1)));
  T("the roadmap's 'linear terminal phase' is a velocity, and its position is the quadratic — not a third phase",
    Math.abs((e1[16] - e1[15]) / (e1[1] - e1[0])) < 0.05);
}

/* ── trap depth: open item #4, closed by SGR's own escape law ───────────────────────────────────── */
{
  const E = [3000, 60000, 300000].map(t => R.trapDepth(K, t, 3000));
  T("the fastest tier is the attempt time and sits at depth zero", E[0] === 0);
  T("depth is x·ln(t/t₀): 2.25 at a minute, 3.45 at five (2.43 / 3.73 before 2.10 corrected x)",
    Math.abs(E[1] - 2.25) < 0.01 && Math.abs(E[2] - 3.45) < 0.01, E.map(v => v.toFixed(2)).join(" "));
  T("it is logarithmic in the cadence, so a 100× slower poll is not 100× deeper", E[2] / E[1] < 2);
  T("derived and consumed by nothing: no trap token ships", !require("fs").readFileSync(require("path").join(__dirname, "..", "occvm", "spine.css"), "utf8").includes("--trap"));
}

/* ── gamma: the estimate is bracketed now, and the bracket is what these hold ──────────────────────
   No ketchup surface tension is published, and the reason is methodological rather than a gap in the
   search: ordinary tensiometry has no valid regime on a yield-stress fluid — a pendant drop of one moves
   as a plug and steps through pinch-off — which is why "Measuring the surface tension of yield stress
   fluids" exists as a paper at all. The nearest MEASURED matrix is fermented tomato juice at 12.5 °Brix,
   40.5 and 42.6 mN/m, both carrying an added hydrocolloid with no untreated control published. */
{
  const g = K.gamma, TOMATO_LO = 0.0405, TOMATO_HI = 0.0426, WATER = 0.072;
  T("gamma is unchanged at the stated estimate", g === 0.040, g);
  T("it sits within 5% of the nearest measured tomato matrix",
    Math.abs(g - TOMATO_LO) / TOMATO_LO < 0.05, ((g - TOMATO_LO) / TOMATO_LO * 100).toFixed(2) + "%");
  T("it is below both published tomato readings, as a thicker solids-loaded matrix should be",
    g < TOMATO_LO && g < TOMATO_HI, g);
  T("water's 0.072 is not the value and cannot become it silently", g !== WATER && g < WATER * 0.7, g);

  const px = R.radiusPx(K);
  T("the meniscus this gamma produces is the token that shipped", Math.abs(px - 7.148) < 0.001, px);
  const atWater = Math.sqrt(WATER / (K.density * 1000 * 9.80665)) * 1000 / (25.4 / 96);
  T("adopting water's value would move the meniscus by more than two pixels",
    atWater - px > 2, (atWater - px).toFixed(3) + "px");

  const src = require("fs").readFileSync(require("path").join(__dirname, "..", "occvm", "rheology.js"), "utf8");
  T("the absence is recorded as methodological, with the matrix that brackets it",
    /NO PUBLISHED SURFACE TENSION FOR KETCHUP/i.test(src) && /40\.5/.test(src) && /42\.6/.test(src));
}

process.exit(done());
