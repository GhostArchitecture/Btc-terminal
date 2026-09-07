/* OCCVM 2.0 — the material model (OCCVM-L12). One definition, shared by every conforming tool.
 *
 * Authored in occvm/SPINE.md; spliced into a tool by occvm/tools/splice-spine.js. Do not hand-edit the
 * spliced copy — the next splice reverts it silently.
 *
 * THE BREAK: a hex stops being authored and starts being derived. `--sub-hi`, `--sub` and `--sub-lo` were
 * three separate decisions that happened to look related. They are now one material, one body colour and
 * one cut geometry, and their RATIOS fall out of the arithmetic.
 *
 * ─── three derivations were measured before this one was kept ────────────────────────────────────
 *
 * The roadmap's argument for an orthorhombic system is that a slab has three faces sharing one scaled
 * response today, and that three principal indices give each face its own value from one definition.
 * That argument is right. Two obvious ways to cash it in are wrong, and both were measured:
 *
 *   1. NORMAL-INCIDENCE Fresnel on α/β/γ gives 4.39% / 6.44% / 6.51% — a spread of 1.48×, against the
 *      5.74× linear-luminance spread the tools actually author. Real optics, taken that way, is 3.9×
 *      FLATTER than the design; a substrate derived from it is nearly monochrome and both tools lose the
 *      structure they are read by.
 *
 *   2. Adding the sun and weighting reflectance by incident flux — R(θ)·cos θ, the intuitive fix — is
 *      WORSE, not better: the cosine very nearly cancels the Fresnel rise, and the whole 0–90° sweep
 *      collapses to 1.13×, peaking at 76.9°. Flux-weighting cannot produce a ramp at all. It was tried
 *      because it sounds more physical than what replaced it; it is recorded because the next person to
 *      have that idea should not have to spend the hour.
 *
 * What is kept is the third: on a dark, glossy solid you do not see a diffuse return, you see the
 * SPECULAR one, so a face's brightness tracks R at the angle it presents TO THE VIEWER. Those angles are
 * the slab's own cut geometry — the thing OCCVM-L2 already fixes — not the sun's position:
 *
 *      front  0°  n=α  R= 4.39%      chamfer 45°  n=β  R= 7.60%      edge 80°  n=γ  R=41.04%
 *
 * ─── what that decomposition buys, and it is the reason it is the one kept ───────────────────────
 *
 * The sun DROPS OUT of the ratio. Material owns structure; the sundial owns magnitude, exactly as it has
 * since 1.2. 2.0 therefore does not fight the light pipeline or double-apply it — the failure mode of the
 * elevation-parameterised version, which re-sorted its own faces as the sun moved and let `mid` collide
 * with `hi` at noon and with `lo` at dawn.
 *
 * ─── where the material and the hand disagree, stated rather than fitted ─────────────────────────
 *
 *      optics    edge : chamfer : front  =  9.353 : 1.732 : 1.000
 *      authored  hi   : mid     : lo     =  5.739 : 2.539 : 1.000
 *
 * Same ORDERING, different SHAPE. The material is more convex: it makes the edge carry more of the range
 * and the mid-tone less, which is what a cut mineral does and what a hand-mixed ramp tends not to. This
 * is NOT corrected by fitting a per-face fudge — a per-face correction is three authored numbers wearing
 * a derivation's clothes, which is the exact thing 2.0 exists to remove. The shape is the material's.
 *
 * ─── the one value here that is NOT derived, said plainly ────────────────────────────────────────
 *
 * `contrast` is a legibility parameter, not a material property: an exponent on the optical ratio setting
 * how much of the available range the substrate spends. Physics fixes the order and the shape; it does
 * not know how readable a terminal has to be at 3am. At contrast 1 the substrate is the mineral's;
 * at 0.782 its spread matches what the tools author today (measured: log 5.739 / log 9.353). It is named
 * here, in the material, for the same reason OCCVM-L7 names `--t-num` — a judgment gets called judgment
 * in the place somebody would otherwise mistake it for measurement.
 */
var OCCVM_MATERIAL = (function () {
  "use strict";

  var RAD = Math.PI / 180;
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ---- the definition ---------------------------------------------------------------------------
   * Aragonite, CaCO₃, orthorhombic, space group Pmcn. Every number is published and none is chosen:
   * cell from diffraction, indices from optical mineralogy, elastic constants from Brillouin
   * spectroscopy on natural single-crystal aragonite at ambient conditions.
   */
  var ARAGONITE = {
    name: "aragonite",
    formula: "CaCO3",
    system: "orthorhombic",
    group: "Pmcn",
    cell: { a: 4.96, b: 7.97, c: 5.74 },              /* Å */
    ri: { alpha: 1.530, beta: 1.680, gamma: 1.685 },  /* biaxial, three principal indices */
    hardness: 3.75,                                   /* Mohs 3.5–4 */
    density: 2.93,                                    /* g/cm³ */
    /* stiffness tensor, GPa — C11/C22/C33 are the three axes P1's motion derives from */
    C: { 11: 171.1, 22: 110.1, 33: 98.4, 44: 39.3, 55: 24.2, 66: 40.2, 12: 60.3, 13: 27.8, 23: 41.9 },
    /* THE BODY COLOUR: what the material absorbs to. NOT derived, and named as judgment for the same
       reason `contrast` is — a mineral's colour comes from trace chemistry and defects, not from its
       lattice, so no amount of crystallography produces it. The material says how light BEHAVES on a
       surface; this says what is left after.
     *
     * ANCHORED AT 2.3 to OCCVM-L1's own substrate floor, `--sub-lo #0e0d13`, replacing an arbitrary
     * #12111a. This is the same move `authoredContrast` makes and it carries the same objection: setting
     * the material's one free value FROM the tools is fitting, and somebody should say so. The answer is
     * that a free parameter has to be set from something, the alternative was a number with no reason at
     * all, and the fit is to ONE value while the derivation then predicts the other two.
     *
     * What it buys is the strongest evidence L12 has. At the derived contrast 0.7816 the material now
     * reproduces the authored ramp's ENDPOINTS to the byte — `--sub-hi #2c2a36` and `--sub-lo #0e0d13`,
     * neither of them fitted — and disagrees only on the mid-tone, which it puts 3.91 L* darker. That is
     * the shape disagreement 2.0 recorded as 9.353 : 1.732 : 1.000 against 5.739 : 2.539 : 1.000, landing
     * on a specific pixel. The hand got the endpoints right and the middle wrong. */
    body: "#0e0d13",
    luster: "vitreous"
  };

  /* birefringence, derived rather than stated: γ − α */
  function birefringence(m) { return m.ri.gamma - m.ri.alpha; }

  /* The {110} composition-plane angle is NOT computed here, deliberately. occvm/veins.js derives it from
     this file's cell and occvm/fracture.js reads it from veins; adding a third site would be the same
     duplicate-derivation defect those two exist to avoid. The material owns the lattice; the habit and
     the cleavage own the angle. */

  /* ---- optics -----------------------------------------------------------------------------------
   * Unpolarised Fresnel reflectance at an interface, as a function of index and incidence angle.
   * Total internal reflection is not reachable here (light enters from the less dense side), so the
   * square root is always real.
   */
  function fresnel(n, thetaDeg) {
    var th = clamp(thetaDeg, 0, 89.9) * RAD;
    var s = Math.sin(th), c = Math.cos(th);
    var k = Math.sqrt(Math.max(0, 1 - (s / n) * (s / n)));
    var rs = Math.pow((c - n * k) / (c + n * k), 2);
    var rp = Math.pow((k - n * c) / (k + n * c), 2);
    return (rs + rp) / 2;
  }

  /* ---- the three faces --------------------------------------------------------------------------
   * A slab presents three surfaces to the viewer and each takes its own principal index. The angles are
   * the cut geometry OCCVM-L2 already governs — the flat front, the chamfer L2 permits, and the edge seen
   * near tangent — so the faces are fixed by the slab, not by the sun (see the header for what happens
   * when they are not).
   *
   * WHICH INDEX GOES ON WHICH FACE IS A CONVENTION, and is flagged as one here rather than buried. What
   * the crystallography establishes is that there ARE three principal indices and that they differ; it
   * does not tell you how a rendered rectangle is oriented in the lattice, because a rendered rectangle
   * is not in a lattice. α on the front and γ on the edge is chosen so the ordering the optics produces
   * runs the same direction as the ramp the tools already read — the same honesty flag P1 carries about
   * mapping crystal axes onto screen axes.
   */
  var CUT = { front: 0, chamfer: 45, edge: 80 };   /* degrees from the view normal — L2 geometry */

  function faces(m) {
    return {
      front:   { axis: "a", n: m.ri.alpha, theta: CUT.front,   R: fresnel(m.ri.alpha, CUT.front) },
      chamfer: { axis: "b", n: m.ri.beta,  theta: CUT.chamfer, R: fresnel(m.ri.beta,  CUT.chamfer) },
      edge:    { axis: "c", n: m.ri.gamma, theta: CUT.edge,    R: fresnel(m.ri.gamma, CUT.edge) }
    };
  }

  /* ---- resolve ----------------------------------------------------------------------------------
   * material -> the substrate family. A reflectance ratio is a ratio in LINEAR light, so the body colour
   * is decoded out of sRGB, scaled, and re-encoded. The first version scaled the sRGB bytes directly and
   * a 9.35× optical spread rendered as 116× — the transfer function applied twice — and it shifted hue,
   * because saturating one channel before another is a colour change nobody asked the material for. One
   * gain across all three linear channels is hue-preserving by construction.
   */
  function srgbToLinear(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function linearToSrgb(v) { return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }
  function parse(h) { return [1, 3, 5].map(function (i) { return srgbToLinear(parseInt(h.substr(i, 2), 16) / 255); }); }
  function hex(c) {
    return "#" + c.map(function (v) {
      return clamp(Math.round(linearToSrgb(clamp(v, 0, 1)) * 255), 0, 255).toString(16).padStart(2, "0");
    }).join("");
  }

  /* the authored spread, kept as a measurement of what the tools do today rather than as a target */
  var AUTHORED_SPREAD = 5.739;

  function substrate(m, contrast) {
    var k = contrast === undefined ? 1 : contrast;
    var f = faces(m);
    var base = f.front.R;                       /* the darkest face is the reference, by geometry */
    var body = parse(m.body);
    function face(R) {
      var gain = Math.pow(R / base, k);         /* contrast is an exponent on the optical ratio */
      return hex(body.map(function (v) { return v * gain; }));
    }
    return {
      hi: face(f.edge.R), mid: face(f.chamfer.R), lo: face(f.front.R),
      R: { front: f.front.R, chamfer: f.chamfer.R, edge: f.edge.R },
      spread: Math.pow(f.edge.R / base, k),
      ratios: [Math.pow(f.edge.R / base, k), Math.pow(f.chamfer.R / base, k), 1]
    };
  }

  /* the contrast at which the material's spread equals what the tools author today. Derived, not typed:
     it moves if the material moves, which is the whole point of it being here rather than in a stylesheet. */
  function authoredContrast(m) {
    var f = faces(m);
    return Math.log(AUTHORED_SPREAD) / Math.log(f.edge.R / f.front.R);
  }

  /* ---- what the other properties govern ---------------------------------------------------------
   * Stated as derivations rather than applied here, because each belongs to the law that owns the
   * surface it touches; this file is the material, not the renderer.
   */
  /* OCCVM-L2 — hardness sets how sharply a face can be cut. Mohs 3.5–4 is soft enough to be cut into
     rather than merely faceted, which is the roadmap's own argument for aragonite over topaz. Mapped
     against the 4px ceiling L2 already fixes: softer mineral, larger permissible radius. */
  function edgeRadius(m) { return clamp(4 * (m.hardness / 10), 1, 4); }

  /* OCCVM-L4 — density sets cast weight. Aragonite at 2.93 against a nominal 2.65 (quartz) is the
     reference ratio; a denser material throws a heavier shadow and carries more apparent mass. */
  function castWeight(m) { return m.density / 2.65; }

  /* P1 — anisotropic motion. DERIVED, MEASURED, AND NOT SHIPPED. Read the negative before using it.
   *
   * The stiffness ratio the three axes move at, normalised to the softest (C33):
   *     a 1.7388   b 1.1189   c 1.0000
   */
  function stiffness(m) {
    return { a: m.C[11] / m.C[33], b: m.C[22] / m.C[33], c: 1 };
  }

  /* Duration scalar per axis. A stiffer axis settles faster, and the relation is the oscillator's, not
     the spring's: T = 2π√(m/k), so duration ∝ 1/√k. The alternative — static compliance, 1/k — was the
     other candidate and is wrong for a TEMPORAL quantity; it describes how far a thing deflects, not how
     long it takes. Both are recorded because they differ enough to matter:
         1/√k   a 0.7584   b 0.9454   c 1.0000     ← in force
         1/k    a 0.5751   b 0.8937   c 1.0000     ← rejected, static not temporal            */
  function motion(m) {
    var k = stiffness(m);
    return { a: 1 / Math.sqrt(k.a), b: 1 / Math.sqrt(k.b), c: 1 / Math.sqrt(k.c) };
  }

  /* ---- WHY P1 IS NOT WIRED TO A TOKEN --------------------------------------------------------------
   *
   * Anisotropy is only observable as a DIFFERENCE BETWEEN TWO DIRECTIONS IN THE SAME VIEW. Censused
   * across both tools and the spine at 2.0:
   *
   *     translateX     0 animated sites          <- zero, in either tool
   *     translateY     3 animated sites          (.edge:active 260ms, rise 380ms, and BTC's chevron)
   *     translate(x,y) every site is a STATIC light-vector offset, calc(var(--lx) * Npx), not a motion
   *
   * There is no pair. The one genuinely animated 2D direction anywhere is fracture's separation along
   * the twin normal, and projecting the per-axis scalars onto it gives 194.4ms against the isotropic
   * 220ms — an 11.6% change. But the fracture angle is FIXED: one direction, every time, with nothing
   * beside it to be faster or slower than. That is not anisotropy, it is 220 renamed to 194.
   *
   * Shipping `--dur-a/--dur-b/--dur-c` here would be three tokens computed and consumed by nothing,
   * which is OCCVM-D12 exactly — closed at 1.2a, one release before this one. The arithmetic stays
   * because it is right and cheap; the wiring waits for a second axis to exist. `test/occvm.js` holds a
   * SELF-RETIRING guard: it asserts the translateX count is still zero, so the day somebody animates a
   * horizontal motion the suite fails and says P1 has become expressible.                              */
  /* P4 — unit-cell spacing. DERIVED, MEASURED, AND NOT SHIPPED. Read the negative before using it.
   *
   * The three cell edges, normalised to the shortest, are a spacing triple with a reason behind it where
   * an 8px grid has none:  a 1.0000 : c 1.1573 : b 1.6069.
   *
   * TWO MEASUREMENTS KILL IT, and the second is the one that matters.
   *
   * 1. IT DOES NOT DESCRIBE THE TOOLS. Censused over 213 real padding/margin/gap declarations across both
   *    tools: 19 distinct pixel values, weighted mean error against the cell ladder 10.79%. A plain 4px
   *    grid covers more of them (42.3% within 6%, against 32.4%). Adopting the cell scale would therefore
   *    MOVE 213 declarations by ~11% — a redesign wearing a derivation's coat, and the opposite of what
   *    the substrate did at 2.0, where the material REPRODUCED the authored ramp at a derived contrast.
   *
   * 2. IT DOES NOT SURVIVE TO THE SCREEN. Spacing quantises to whole pixels, and 84.5% of both tools'
   *    spacing is under 12px, where rounding destroys the ratio outright:
   *
   *        base 4  -> 4 / 5 / 6    renders 1.000 : 1.250 : 1.500
   *        base 6  -> 6 / 7 / 10   renders 1.000 : 1.167 : 1.667
   *        base 8  -> 8 / 9 / 13   renders 1.000 : 1.125 : 1.625
   *        base 2  -> 2 / 2 / 3    two of the three steps COLLAPSE
   *
   *    The rendered ratios wander by ±8% and are never the cell's. The derivation is present in the
   *    source and absent from the render, which is a value computed and consumed by nothing wearing a
   *    third disguise.
   *
   * AND THE RATIO IS NOT DISTINGUISHABLE FROM THE ONE IT REPLACES. b/a = 1.6069 against the golden ratio
   * 1.6180 differs by 0.04px at step 1, 0.35px at step 3, and only reaches a whole pixel at step 5 —
   * past the largest spacing either tool uses. Over the range where all the spacing actually lives they
   * are the same number. What the cell buys is provenance, not appearance, and that is worth having; it
   * is not worth 213 moved declarations.
   *
   * THE GUARD SHIPS EVEN THOUGH THE SCALE DOES NOT, and precisely because the two ratios are
   * indistinguishable: somebody will eventually "correct" 1.6069 to 1.6180 on the grounds that it looks
   * like a typo for the golden ratio. It is not. It is 7.97/4.96, and the whole point of L12 is that a
   * value has a reason. `test/occvm.js` fails on the golden ratio appearing as a spacing constant. */
  function spacing(m) {
    var c = m.cell;
    return { a: 1, c: c.c / c.a, b: c.b / c.a };
  }
  var GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;   /* named ONLY so a guard can reject it, never to be used */
  var P4_UNEXPRESSED = {
    reason: "the cell ratio does not survive integer-pixel quantisation at the sizes 84.5% of spacing uses",
    declarationsCensused: 213,
    distinctValues: 19,
    meanErrorVsCellLadder: 0.1079,
    censusedAt: "2.1"
  };

  var P1_UNEXPRESSED = {
    reason: "no animated horizontal motion exists in either tool; anisotropy needs two directions in one view",
    translateXSites: 0,
    fractureProjection: 0.8837,
    censusedAt: "2.0"
  };

  return {
    ARAGONITE: ARAGONITE, CUT: CUT, AUTHORED_SPREAD: AUTHORED_SPREAD,
    fresnel: fresnel, faces: faces, substrate: substrate, authoredContrast: authoredContrast,
    birefringence: birefringence,
    edgeRadius: edgeRadius, castWeight: castWeight, stiffness: stiffness,
    motion: motion, P1_UNEXPRESSED: P1_UNEXPRESSED,
    spacing: spacing, GOLDEN_RATIO: GOLDEN_RATIO, P4_UNEXPRESSED: P4_UNEXPRESSED
  };
})();
if (typeof module !== "undefined") module.exports = OCCVM_MATERIAL;
