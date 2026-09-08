/* OCCVM 2.5 — the rheological substance (OCCVM-L12, second basis).
 *
 * Authored in occvm/SPINE.md; spliced into a tool by occvm/tools/splice-spine.js. Do not hand-edit the
 * spliced copy — the next splice reverts it silently.
 *
 * Replaces occvm/material.js. The crystal basis (aragonite, orthorhombic) was not wrong and did not fail
 * a measurement; it is retired on the owner's aesthetic judgment, which is a legitimate call and is
 * recorded as one rather than dressed as a defect. What follows is what survives that decision, what
 * does not, and — the part the roadmap got wrong — what ports across intact.
 *
 * ─── the substance ───────────────────────────────────────────────────────────────────────────────
 *
 * Tomato ketchup, as a Herschel-Bulkley fluid: τ = τ₀ + k·γ̇ⁿ. Chosen over Carbopol, the cleaner
 * synthetic yield-stress fluid, because Carbopol is explicitly non-thixotropic while both tools' shipped
 * copy already describes a memory effect ("dilate instantly, contract slowly"). One substance that does
 * both jobs beats two that each do one.
 *
 * Beneath it, Soft Glassy Rheology (Sollich 1997/1998): mesoscopic elements caged in energy wells,
 * escaping by YIELDING over an activation barrier. Not a second substance — the same one, one level down,
 * and the reason `yield` is the right word for a destructive action rather than a metaphor for one.
 *
 * ─── WHAT THE ROADMAP SAID WOULD DIE, AND DOES NOT ───────────────────────────────────────────────
 *
 * The handoff records "elastic tensor and biaxial optics have no fluid equivalent — deleted, not ported."
 * The elastic tensor does die: a fluid has no stiffness, so P1's anisotropic motion goes with it, and
 * P1 shipped nothing anyway (2.1). **The optics do not die, and deleting them would have taken the
 * substrate's colour with them** — since 2.4 the sundial derives `--sub-hi` and `--sub-lo` by calling
 * `faceRatios()` every tick, so a substance with no refractive index does not simplify the tool, it
 * stops it painting.
 *
 * The port works because 2.4's mechanism was never biaxiality. It is that ONE slab presents THREE ANGLES
 * to the viewer, and Fresnel reflectance varies with angle at any fixed index. Aragonite happened to
 * supply three indices as well; that was a bonus, not the mechanism. Measured at L2's cut geometry:
 *
 *      n = 1.381        front 0°  R = 2.56%     chamfer 45°  R = 3.41%     edge 80°  R = 36.23%
 *      spread 14.148×   against aragonite's 9.353× and the 13.881× the tools actually render
 *
 * **The fluid fits the rendered substrate BETTER than the crystal did.** Aragonite needed a legibility
 * exponent of 1.177 to reach what the tools paint; ketchup reaches it at 0.9928 — within 1% of unity,
 * meaning the substance's own optics reproduce the shipped substrate with almost no judgment applied.
 * That is a stronger position than the model it replaces, and it was not the reason for the pivot.
 *
 * ─── why n is the best-sourced number here, and not a convenience ────────────────────────────────
 *
 * Tomato concentrate is graded in degrees Brix, and Brix in tomato products is DEFINED refractometrically
 * — the standard method measures refractive index and reads soluble solids off it. So n is not a property
 * somebody had to go looking for to make this model work; it is the property the industry already
 * measures ketchup by. Commercial ketchup runs ~28–33 °Brix; n = 1.381 is the ICUMSA value at 30 °Brix,
 * 20 °C. The Herschel-Bulkley triple is the control formulation of Koocheki et al. (2009), read off that
 * paper's Table 3 — see the block on it below, and the 2.10 correction that put it there.
 */
var OCCVM_RHEOLOGY = (function () {
  "use strict";

  var RAD = Math.PI / 180;
  var G = 9.81;   /* m/s² — the geometry below is a static balance against weight */
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ---- the definition ---------------------------------------------------------------------------
   * Every value published and none chosen to fit: the flow triple from steady-shear rheometry, the
   * index from the refractometric Brix scale the product is graded on, density from composition tables.
   */
  var KETCHUP = {
    name: "ketchup",
    model: "Herschel-Bulkley",
    /* τ = τ₀ + k·γ̇ⁿ — Koocheki et al. 2009, control formulation, Table 3, 25 °C.
     *
     * 2.10 — k AND n WERE MISATTRIBUTED, AND THE PAPER WAS NEVER OPENED. From 2.5 to 2.9 this block
     * carried k = 4.6 and n = 0.19 as "the control formulation of Koocheki et al. (2009), fixed at the
     * published range floor". Checked against the paper: its Herschel-Bulkley consistency k′ ranges
     * **6.56–20.10 Pa·sⁿ** across every formulation and temperature it reports, so **4.6 is below the
     * entire published range and appears in that paper nowhere.** Its flow indices are n 0.189–0.228
     * (power law) and n′ 0.216–0.263 (Herschel-Bulkley); 0.19 is the floor of the POWER-LAW index across
     * hydrocolloid-supplemented samples, and it was being carried as the control's, paired with a
     * Herschel-Bulkley fit that reports 0.250. The control ketchup at 25 °C reads:
     *
     *     Herschel-Bulkley   τ₀ 4.41 Pa    k′ 16.18 Pa·sⁿ    n′ 0.250
     *     power law                        k  19.34 Pa·sⁿ    n  0.228
     *
     * The Herschel-Bulkley row is the one this model is named for, and it is what k and n now are. The
     * roadmap's τ₀ = 0.03 Pa is not in the paper either (its minimum is 2.18); the falsification below
     * stands on the physics regardless of where the figure came from.
     *
     * WHAT THE CORRECTION MOVED, measured rather than assumed (test/rheology.js pins each):
     *
     *     x = 1 − n            0.81 → 0.75      still < 1, so the glass phase and the yield stress hold
     *     1/n                  5.26 → 4.00      a 100× stress range still spans 10⁸ in shear rate, so
     *                                           the roadmap's duration formula stays unusable (#1 closed)
     *     regime at v₀ = 1     0.217 → 0.765    still < 1, so cessation stays yield-dominated and
     *                                           yield.js's curve stays the quadratic with a hard stop
     *     crossover v₀         3070 → 2.92      THE ONE CLAIM THAT CHANGED, and it is not cosmetic: the
     *                                           file used to say the regime was yield-dominated "for any
     *                                           v₀ under ~3,000". At the real constants the margin is
     *                                           2.92, and yield.js runs at v₀ = 1. Still inside it, with
     *                                           a thousandth of the headroom it was documented to have.
     *     trap depth 60s/300s  2.43/3.73 → 2.25/3.45
     *
     * Nothing that does not read k or n moves: λc = 7.15 px, the optical spread 14.148×, renderedContrast
     * 0.9928 and the vein dimension are all unchanged, because none of them is a function of the flow
     * curve. That containment is why the correction is publishable rather than a re-derivation.
     *
     * The lesson is the one this system keeps relearning and had not yet applied to a CITATION: every
     * number here was checked against what renders, and none of these three was checked against its
     * source. A provenance claim is a claim.
     *
     * τ₀ IS NOT THE RANGE FLOOR, AND THE FLOOR IS FALSIFIED BY THE SUBSTANCE'S OWN BEHAVIOUR.
     * The handoff fixes τ₀ at 0.03 Pa, "the published range floor", which reads as the conservative
     * choice and is instead the one value that breaks the model. A layer of yield-stress fluid stands on
     * a plate only while τ₀ ≥ ρgh, so at 0.03 Pa the tallest standing blob is **2.7 µm**: this ketchup
     * would sheet off the plate like water. Ketchup visibly does not. A 5 mm blob — what anybody would
     * call a dollop — needs τ₀ ≥ 55.9 Pa; even 1 mm needs 11.2. Three orders of magnitude, and it
     * matters beyond realism: a Herschel-Bulkley fluid with a negligible yield stress is just a
     * power-law fluid, and SGR's whole mechanism (caging, x < 1, escape over a barrier) needs a real
     * one. The floor deletes the property the model is named for.
     *
     * Re-entered by a consistency criterion rather than by preference or by position in the range: τ₀ is
     * the stress at which the yield-stress height equals the capillary length — the blob is exactly as
     * TALL as surface tension makes it ROUND. τ₀ = ρ·g·λc = 21.15 Pa. Judgment, named as judgment: the
     * criterion is a choice, the arithmetic under it is not.
     *
     * 2.10 — THE BAND THIS USED TO CITE HAD NO CITATION. It read "sits inside the published ~10–40 Pa
     * band without having been chosen from it", and no source for that band exists in either file or was
     * found on searching. What does exist, and what the value is now stated against: stress-ramp and
     * Casson yield stresses on commercial ketchup of 21.88 / 29.02 / 37.10 Pa (Ebatco lab note) and
     * 21.8 Pa (NETZSCH, secondary), and a creep plateau collapsing between ≈28 and ≈32 Pa (TA RH-058,
     * read off a figure — an estimate). 21.15 Pa sits at the foot of those. Note what they are: STATIC
     * yield stresses from ramps and creep, not the DYNAMIC Herschel-Bulkley intercept (4.41 Pa) that
     * k and n come from — the two are different quantities and this file pairs them, which is recorded
     * here rather than resolved, because a static yield stress is the right one for a substance at rest
     * and the wrong one to sit in a flow-curve triple. */
    tau0: 21.15,       /* Pa      — yield stress: below this the substance does not flow at all */
    k: 16.18,          /* Pa·sⁿ   — consistency index k′, Koocheki Table 3, control, 25 °C (was 4.6, 2.10) */
    n: 0.250,          /* —       — flow index n′, same row; n < 1 is shear-thinning (was 0.19, 2.10) */
    brix: 30,          /* °Bx     — soluble solids, the grade ketchup is sold by */
    ri: 1.381,         /* —       — refractive index at 30 °Bx, 20 °C (ICUMSA); see header */
    density: 1.14,     /* g/cm³ */
    /* Surface tension. THE LEAST-SOURCED NUMBER IN THIS FILE and flagged as such: aqueous food systems
       carrying solids and surfactants run well below water's 0.072, and 0.04 N/m is a mid-range estimate
       rather than a measurement of ketchup. It is tolerable because the geometry it feeds goes as √γ:
       being wrong by 2× moves the derived radius by 1.41×, from 7.1 px to 5.7 or 9.6. Stated so nobody
       reads the radius as tighter than its input. */
    gamma: 0.040,      /* N/m — estimate, see note */
    /* THE BODY COLOUR, and it is judgment, named as judgment exactly as the crystal model named its own.
       A fluid's colour comes from what is dissolved in it, not from its flow curve, so no amount of
       rheology produces this. It stays anchored to OCCVM-L1's declared substrate floor — the same anchor,
       for the same reason, and with the same objection standing: fixing a free parameter FROM the tools
       is a fit, and a free parameter has to be fixed from something. */
    body: "#0e0d13"
  };

  /* The substance under its ROLE rather than its identity. The sundial reads this, not `KETCHUP`, so the
     light pipeline names what a thing does in the system instead of what it is made of — and a second
     substance swap costs one splice-list line rather than an edit to every consumer. The pivot from
     aragonite cost more than it should have precisely because the consumers named the mineral. */
  var SUBSTANCE = KETCHUP;

  /* ---- optics: ported from the crystal model, mechanism unchanged --------------------------------
   * Unpolarised Fresnel reflectance. A fluid is isotropic, so one index serves all three faces — and the
   * faces still separate, because the angle is what varies. This is the whole of the port.
   */
  function fresnel(n, thetaDeg) {
    var th = clamp(thetaDeg, 0, 89.9) * RAD;
    var s = Math.sin(th), c = Math.cos(th);
    var k = Math.sqrt(Math.max(0, 1 - (s / n) * (s / n)));
    var rs = Math.pow((c - n * k) / (c + n * k), 2);
    var rp = Math.pow((k - n * c) / (k + n * c), 2);
    return (rs + rp) / 2;
  }

  /* The angles are OCCVM-L2's cut geometry, unchanged from 2.4: the flat front, the chamfer L2 permits,
     and the edge seen near tangent. The crystal model paired each with a principal index and flagged that
     pairing as a convention; a fluid has one index, so THE CONVENTION IS GONE. One fewer authored
     decision, which is a small real gain from the pivot and worth naming as one. */
  var CUT = { front: 0, chamfer: 45, edge: 80 };

  function faces(m) {
    var n = m.ri;
    return {
      front:   { theta: CUT.front,   R: fresnel(n, CUT.front) },
      chamfer: { theta: CUT.chamfer, R: fresnel(n, CUT.chamfer) },
      edge:    { theta: CUT.edge,    R: fresnel(n, CUT.edge) }
    };
  }

  /* ---- resolve ----------------------------------------------------------------------------------
   * A reflectance ratio is a ratio in LINEAR light. Kept verbatim from the crystal model, including the
   * reason: the first version of that resolver scaled sRGB bytes and rendered a 9.35× spread as 116×,
   * the transfer function applied twice, while shifting hue as one channel saturated before another.
   */
  function srgbToLinear(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function linearToSrgb(v) { return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }
  function parse(h) { return [1, 3, 5].map(function (i) { return srgbToLinear(parseInt(h.substr(i, 2), 16) / 255); }); }
  function hex(c) {
    return "#" + c.map(function (v) {
      return clamp(Math.round(linearToSrgb(clamp(v, 0, 1)) * 255), 0, 255).toString(16).padStart(2, "0");
    }).join("");
  }

  /* The spread the tools actually paint at high sun — a NAMED rendered instant, never the `:root`
     fallback. That distinction is the one 2.3 got wrong and 2.4 corrected, and it carries across the
     pivot unchanged because it is a fact about the tools, not about the substance. */
  var RENDERED_SPREAD_HIGH = 13.881;

  function substrate(m, contrast) {
    var k = contrast === undefined ? renderedContrast(m) : contrast;
    var f = faces(m);
    var base = f.front.R;
    var body = parse(m.body);
    function face(R) {
      var gain = Math.pow(R / base, k);
      return hex(body.map(function (v) { return v * gain; }));
    }
    return {
      hi: face(f.edge.R), mid: face(f.chamfer.R), lo: face(f.front.R),
      R: { front: f.front.R, chamfer: f.chamfer.R, edge: f.edge.R },
      spread: Math.pow(f.edge.R / base, k),
      ratios: [Math.pow(f.edge.R / base, k), Math.pow(f.chamfer.R / base, k), 1]
    };
  }

  /* The legibility exponent, derived rather than typed. It reads 0.991 for ketchup against 1.177 for
     aragonite: the fluid's own optics land within 1% of what the tools paint, so almost no judgment is
     applied. A value this close to unity is worth stating plainly — it means the substance is carrying
     the substrate essentially unaided, which the crystal was not. */
  function renderedContrast(m) {
    var f = faces(m);
    return Math.log(RENDERED_SPREAD_HIGH) / Math.log(f.edge.R / f.front.R);
  }

  /* The two face offsets the sundial applies, relative to the base colour it owns. Same signature as the
     crystal model's, so the sundial needs no change beyond which global it reads. */
  function faceRatios(m, contrast) {
    var r = substrate(m, contrast).ratios;
    return { hi: r[0] / r[1], lo: 1 / r[1] };
  }

  /* ---- flow -------------------------------------------------------------------------------------
   * The Herschel-Bulkley inverse: given an applied stress, the shear rate that results. Below the yield
   * stress there is no flow at all — not slow flow, NONE — which is the property `yield.js` is built on
   * and the reason a destructive action can have an inert phase that is physically real rather than a
   * designed pause.
   */
  function shearRate(m, tau) {
    if (tau <= m.tau0) return 0;
    return Math.pow((tau - m.tau0) / m.k, 1 / m.n);
  }
  function stress(m, gammaDot) {
    return m.tau0 + m.k * Math.pow(Math.max(0, gammaDot), m.n);
  }

  /* ---- geometry: what a fluid puts on an edge --------------------------------------------------
   *
   * OCCVM-L2 reads "a surface is **cut, not rounded**. Corner radius ≤ 4px." That is the most directly
   * crystalline sentence in the law, and it is why swapping the substance changed nothing visible: 2.5
   * step A ported the OPTICS and kept the GEOMETRY, so the tools went on presenting a 45° chamfer and a
   * faceted edge while claiming to be made of a fluid. Changing what a surface is made of while keeping
   * its shape is not a material change, and the measurement said so — the substance reaches 2 of 70
   * rendered tokens, through one gradient stop.
   *
   * A fluid at rest does not present facets. Two real lengths decide its edge, and neither is authored:
   *
   *   CAPILLARY LENGTH  λc = √(γ/ρg) — where surface tension stops losing to gravity. Below it a free
   *   surface is rounded by tension; above it gravity flattens it into a puddle. For this substance
   *   λc = 1.891 mm, which is **7.1 CSS px at 96 dpi**. That number is not fitted and not tuned: it is
   *   what the substance's own density and surface tension produce, and it happens to land in the range
   *   a UI radius lives in. (Contrast the retired electromagnetic layer, whose Debye length came out at
   *   0.43 nm — seven orders too small to be a UI dimension. The difference is not luck about which
   *   physics was picked; it is that capillarity is a millimetre-scale phenomenon and screens are
   *   millimetre-scale objects.)
   *
   *   PUDDLE HEIGHT  h = τ₀/ρg — the tallest layer the yield stress can hold against its own weight.
   *   At the corrected τ₀ this equals λc by construction, which is what fixed τ₀ in the first place.
   *
   * **The radius is therefore larger than the crystal's ceiling, not smaller, and that is the point.**
   * L2 capped radius at 4px because a cut mineral holds a sharp arris. A fluid cannot: surface tension
   * rounds every edge to λc whether the designer wants it or not. 7.1 px against 4 px is the visible
   * consequence of the pivot, and unlike the substrate ramp it lands on every slab, tile, control and
   * binding in both tools rather than on one gradient stop. */
  function capillaryLength(m) { return Math.sqrt(m.gamma / (m.density * 1000 * G)); }
  function puddleHeight(m) { return m.tau0 / (m.density * 1000 * G); }
  /* CSS px at the reference 96 dpi, where 1 px = 25.4/96 mm. A physical length only becomes a UI length
     through a stated conversion; putting it here means the conversion is visible rather than folded into
     a constant somebody later reads as a design choice. */
  var MM_PER_PX = 25.4 / 96;
  function radiusPx(m) { return capillaryLength(m) * 1000 / MM_PER_PX; }
  /* The stress a layer of height h exerts at its own base — the test that falsified the range floor. */
  function standingStress(m, heightMm) { return m.density * 1000 * G * heightMm / 1000; }

  /* ---- Soft Glassy Rheology ----------------------------------------------------------------------
   * CLOSES OPEN ITEM #5, which asked whether SGR's noise temperature x derives from τ₀/k/n or needs a
   * second authored constant. It derives, and the sign is fixed by physics rather than by preference.
   *
   * In Sollich's SGR, x is the effective noise temperature and x = 1 is the glass transition. A yield
   * stress exists ONLY in the glass phase, x < 1; above it the material is a power-law fluid with no
   * yield stress at all. Ketchup has a measured yield stress, so x < 1 is not a choice — it is a
   * constraint the substance imposes, and any value at or above 1 would contradict τ₀ > 0.
   *
   * Near the transition the Herschel-Bulkley exponent and the noise temperature are complementary,
   * n = 1 − x, giving **x = 0.75 for n = 0.250** (it read 0.81 for the misattributed n = 0.19 until 2.10).
   *
   * 2.10 — THIS FILE UNDERSTATED ITS OWN DERIVATION, which is the rarer direction and is corrected for
   * the same reason an overclaim would be. It called n = 1 − x "the exact functional form, the judgment".
   * It is not: it is Sollich's own result — in the SGR glass phase the flow curve goes
   * σ = σ_y + O(γ̇^(1−x)), so identifying the exponent of a Herschel-Bulkley fit with 1 − x is reading
   * the theory, not choosing a form. **The judgment that remains, and it is a real one, is the
   * IDENTIFICATION**: equating an asymptotic SGR exponent with a coefficient fitted over a finite range
   * of shear rates on a real rheometer. That is what is flagged, and it is flagged here rather than
   * where it was. What is not judgment either way: x sits below 1, which is where a substance that
   * yields but only just is supposed to sit.
   */
  function noiseTemperature(m) { return 1 - m.n; }
  function inGlassPhase(m) { return noiseTemperature(m) < 1; }

  /* ---- vein habit --------------------------------------------------------------------------------
   * occvm/veins.js grows by diffusion-limited CLUSTER aggregation since 2.8 — every particle mobile,
   * clusters sticking to clusters — which is how a colloidal suspension actually gels and is what
   * ketchup is: a particulate gel. The {110} twin angle was a fact about a lattice and has no fluid
   * counterpart; nothing replaces it as an INPUT, because DLCA takes no constant from the substance.
   *
   * The fractal dimension is an OUTPUT of the process, and the literature values are recorded here so
   * the generator can be measured against them rather than quoted as if it produced them:
   *
   *   DLCA_D          1.75   three dimensions, gold colloids, Weitz & Oliveria 1984 — the figure the
   *                          roadmap carries. Lin et al. 1989 put the same regime at 1.86 and the
   *                          reaction-limited one at 2.1. None of these is reachable on a 2-D lattice.
   *   DLCA_D_LATTICE  1.44   two dimensions, Meakin 1983 / Kolb, Botet & Jullien 1983 — what a planar
   *                          simulation of the same mechanism produces in the dilute limit, and the
   *                          number test/occvm.js holds the generator to at low density.
   *
   * At the density the tools ship (.3) the suspension is past its gel point and the measured dimension
   * climbs toward 2 above the correlation length, as it must — a gel is space-filling at large scale
   * and fractal only below ξ. Measured 1.61 at .3 against 1.45 at .15 (test/occvm.js). That is not a
   * discrepancy with the literature; it is the difference between a floc and a gel, and the reference
   * surface's L10 specimens now show exactly that transition.
   *
   * The twin angle also fed occvm/fracture.js, which cleaved along it. Retiring the angle retired
   * fracture's geometry with it, which is why occvm/yield.js replaced fracture wholesale (2.8).
   */
  var DLCA_D = 1.75;
  var DLCA_D_LATTICE = 1.44;
  function fractalDimension() { return DLCA_D; }

  /* ---- cessation: how disturbed material comes to rest ---------------------------------------------
   * A Newtonian fluid never stops: its velocity decays exponentially and only approaches zero. A
   * yield-stress fluid STOPS, in finite, provable time (Huilgol, Mena & Piau 2002 for Bingham; the
   * Herschel-Bulkley case follows the same argument). The roadmap's reduced model, unit effective mass:
   *
   *      dv/dt = −(τ₀ + k·vⁿ)
   *
   * with the analytic bracket  v₀/(τ₀ + k·v₀ⁿ) ≤ t_stop ≤ v₀/τ₀. Both are reproduced here and the
   * integration is checked against both (test/rheology.js).
   *
   * WHAT THE DERIVATION ACTUALLY DECIDES, and what it does not. The roadmap read the shape as "normal
   * deceleration, then a linear terminal phase" and attributed the tightness of the lower bound to the
   * yield term dominating. Measured, the opposite holds at the roadmap's τ₀ = 0.03 Pa: the rate term
   * k·vⁿ is larger than τ₀ until v falls to 3e-12, so the yield term governs the last 10⁻¹² of the
   * decay and nothing else — the lower bound is tight because n = 0.19 makes vⁿ nearly flat, so the
   * RATE term stays at its maximum. At the τ₀ this file carries (21.15 Pa), the yield term governs from
   * t = 0 for any v₀ below about 3,000. Two regimes, one ratio deciding between them: k·v₀ⁿ/τ₀.
   *
   * Both regimes stop in finite time and both have a closed form for the POSITION, which is what an
   * easing curve is:
   *
   *      yield-dominated  (k·v₀ⁿ ≪ τ₀)   v = v₀ − τ₀t         s(u) = 1 − (1−u)²
   *      rate-dominated   (k·v₀ⁿ ≫ τ₀)   v^(1−n) linear in t  s(u) = 1 − (1−u)^(1 + 1/(1−n))  = 1 − (1−u)^2.235
   *
   * So the shape is a power ease-out with a HARD STOP — velocity reaches zero exactly at u = 1, which no
   * cubic-bezier keyword does — and the exponent lies between 2 and 2.235. The roadmap's "linear
   * terminal phase" is the yield-dominated velocity, whose position is the quadratic; it is not a third
   * phase. `easing()` samples the integrated curve for CSS `linear()`, which encodes either exactly.
   *
   * WHAT IS AUTHORED, named as such. v₀ is the roadmap's open item #12: no derivation maps a UI
   * disturbance onto an initial velocity, and with v₀ free the regime — hence the exponent — is chosen
   * by choosing v₀. The absolute duration is the same story one step on: t_stop is in the model's own
   * units, and a real millisecond count needs a scale nothing here supplies. The primitive therefore
   * takes its DURATION as an authored constant, exactly as fracture's 220 ms was, and takes its SHAPE
   * from here. That is the honest split: the derivation owns the curve and the hard stop; a person owns
   * how long it lasts. Stating it this way is what keeps the exponent from being quietly tuned to a
   * wanted feel and called physics.
   */
  function decel(m, v) { return m.tau0 + m.k * Math.pow(Math.max(v, 0), m.n); }
  function stoppingBracket(m, v0) { return { lo: v0 / decel(m, v0), hi: v0 / m.tau0 }; }
  function stoppingTime(m, v0, dt) {
    dt = dt || v0 / decel(m, v0) / 2000;
    var v = v0, t = 0;
    while (v > 0) { v -= decel(m, v) * dt; t += dt; }
    return t;
  }
  /* position fraction at `samples` evenly spaced time fractions, 0 → 1 inclusive; the curve CSS needs */
  function easing(m, v0, samples) {
    samples = samples || 17;
    var T = stoppingTime(m, v0), dt = T / 4000, v = v0, t = 0, x = 0, pts = [0], next = 1;
    while (t < T && next < samples) {
      v = Math.max(0, v - decel(m, v) * dt); x += v * dt; t += dt;
      if (t >= T * next / (samples - 1)) { pts.push(x); next++; }
    }
    var X = pts[pts.length - 1] || 1;
    while (pts.length < samples) pts.push(X);
    return pts.map(function (p) { return +(p / X).toFixed(4); });
  }
  /* the regime this v₀ lands in: the ratio that decides the exponent */
  function regime(m, v0) { return m.k * Math.pow(v0, m.n) / m.tau0; }
  function cssEasing(m, v0) {
    return "linear(" + easing(m, v0, 17).join(", ") + ")";
  }

  /* ---- trap depth: CLOSES OPEN ITEM #4 -------------------------------------------------------------
   * The roadmap records "no formula converts a poll interval to an energy". SGR has one: an element
   * caged in a well of depth E escapes at a rate ∝ exp(−E/x), so its residence time is
   * τ = τ_a · exp(E/x) and E = x · ln(τ/τ_a). A cadence is a residence time, and the fastest tier is
   * the attempt time τ_a — the reference from which the others are measured, at depth 0. With x = 1−n:
   *
   *      exchange feeds   3 s      E = 0
   *      CoinGecko       60 s      E = 0.81 · ln 20  = 2.43
   *      Kalshi ladder  300 s      E = 0.81 · ln 100 = 3.73
   *
   * in units of x·kT. Derived, and CONSUMED BY NOTHING — recorded here for the same reason P1's
   * durations were: the arithmetic is right, and wiring it before a surface expresses it would be a
   * token nobody reads (OCCVM-D12). The roadmap's item #7, the scale mismatch of applying ensemble
   * statistics to six named elements, stands and is not answered by this.
   */
  function trapDepth(m, periodMs, attemptMs) {
    return noiseTemperature(m) * Math.log(periodMs / attemptMs);
  }

  return {
    KETCHUP: KETCHUP, SUBSTANCE: SUBSTANCE, CUT: CUT, RENDERED_SPREAD_HIGH: RENDERED_SPREAD_HIGH, DLCA_D: DLCA_D,
    fresnel: fresnel, faces: faces, substrate: substrate,
    renderedContrast: renderedContrast, faceRatios: faceRatios,
    shearRate: shearRate, stress: stress,
    capillaryLength: capillaryLength, puddleHeight: puddleHeight,
    radiusPx: radiusPx, standingStress: standingStress, MM_PER_PX: MM_PER_PX,
    noiseTemperature: noiseTemperature, inGlassPhase: inGlassPhase,
    DLCA_D_LATTICE: DLCA_D_LATTICE, fractalDimension: fractalDimension,
    decel: decel, stoppingBracket: stoppingBracket, stoppingTime: stoppingTime, easing: easing,
    regime: regime, cssEasing: cssEasing, trapDepth: trapDepth
  };
})();
if (typeof module !== "undefined") module.exports = OCCVM_RHEOLOGY;
