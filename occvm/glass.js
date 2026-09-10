/* occvm/glass.js — the vessel (OCCVM-L2's other half).
 *
 * L2 has said since 2.7 that the plan-view radius is THE VESSEL'S — "authored per tool, recorded, not
 * judged" — and that the edge is THE FLUID'S, a meniscus derived from the substance. The fluid's half
 * got its physics at 2.10 and both tools wore it at 2.11. The vessel's half stayed authored. This is
 * the vessel's half: a lava lamp is not wax and liquid, it is wax and liquid IN GLASS, and the glass is
 * constitutive of the reference rather than decoration on it.
 *
 * THIS IS NOT A NEW MATERIAL BEING INTRODUCED, and that is worth stating because material.js was
 * deleted at 2.8 with the crystal. `fresnel(n, thetaDeg)` already ships in occvm/rheology.js, ported
 * unchanged from the crystal model. And `--occvm-gloss` = .685 has been computed against polished
 * glass since 2.10: ASTM D523 / NIST SP250-70 fix the 60-degree standard as polished black glass at
 * nD 1.567, defined as 100 GU. The system has been measuring itself against glass since the wet edge.
 * What is new here is a BODY for the reference that was already in the file. No new optics.
 *
 * WHAT IS SOURCED, WHAT IS DERIVED, WHAT IS AUTHORED — the three kept apart as everywhere else:
 *   sourced   n = 1.474 (borosilicate) and the 2.0 mm wall
 *   derived   every angle, every reflectance, every displacement, and the resolution floor
 *   authored  U_RIM alone, and it is named at its declaration
 */
(function (root) {
  "use strict";

  var RAD = Math.PI / 180, DEG = 180 / Math.PI;

  /* CSS reference pixels are 1/96 in by definition, which is the only unit that carries a physical
     length into this system. The substance's own lengths arrive the same way (occvm/rheology.js). */
  var PX_PER_MM = 96 / 25.4;

  /* SOURCED. Borosilicate rather than soda-lime (1.520): both are real lava-lamp glass, and a vessel
     that is thermally cycled continuously is the borosilicate case. Wall thickness has no published
     lamp-specific spec — vessel dimensions are manufacturer-proprietary, the same wall the wax formula
     sits behind — so the reference class is the container-glass standard, where standard wall is
     2.0-3.0 mm, heavy wall 3.0+, and lightweight below 2.0. A continuously cycled vessel is standard
     wall or above, not lightweight, so 2.0 mm is the bottom of the right class rather than a guess.

     A COINCIDENCE, RECORDED SO NOBODY COLLAPSES IT INTO A DEPENDENCY. 2.0 mm is 7.559 px here, and the
     substance's capillary length is 7.148 px. They are 1.06x apart — 0.41 px, under half a pixel on
     screen — and they are unrelated: one is surface tension over density, the other is a glass
     manufacturing standard. Borrowing lc for the wall would be exactly the cross-domain reuse this
     project has caught before, and it is not even necessary, because the real sourced value is right
     there. The guard asserts they are close AND that neither is computed from the other. */
  var VESSEL = {
    name: "borosilicate",
    ri: 1.474,
    wallMm: 2.0,
    wallSource: "container-glass standard wall 2.0-3.0 mm; lamp vessel dimensions are unpublished",
  };
  function wallPx() { return VESSEL.wallMm * PX_PER_MM; }

  /* ---- the optics, and there is no table -------------------------------------------------------
   * For a cylinder viewed head-on at normalised horizontal offset u = x/R from the centre axis
   * (0 at the axis, 1 at the silhouette), the surface normal turns with the offset and
   *
   *     sin(theta) = u
   *
   * is the whole model. No authored angle table. rheology.js's CUT = {front:0, chamfer:45, edge:80} is
   * a FLAT-FACE convention inherited from the crystal and must not be used here: a cylinder has a
   * continuum of incidences and picking three of them would be authoring what geometry already gives.
   */
  function incidence(u) { return Math.asin(Math.min(1, Math.max(0, u))) * DEG; }
  function refracted(u) { return Math.asin(Math.min(1, Math.max(0, u)) / VESSEL.ri) * DEG; }
  function reflectance(u) { return OCCVM_RHEOLOGY.fresnel(VESSEL.ri, incidence(u)); }

  /* the standard plane-parallel slab displacement, d = t*sin(th1-th2)/cos(th2) */
  function shiftPx(u) {
    var a = incidence(u) * RAD, b = refracted(u) * RAD;
    return wallPx() * Math.sin(a - b) / Math.cos(b);
  }

  /* ---- the inner face, which is why the floor survives being put behind glass -------------------
   * The interface that matters for what is INSIDE is glass->substance, not glass->air: a lamp's wax is
   * seen through glass in contact with liquid. That relative index is near 1, so the globules are seen
   * essentially directly rather than through two surfaces of distortion — the vessel's optical presence
   * lives almost entirely at its outer face. Derived from the substance's own index, so a substance
   * swap moves it rather than leaving a stale constant. */
  function inner() {
    var ns = OCCVM_RHEOLOGY.SUBSTANCE.ri, rel = VESSEL.ri / ns;
    return {
      nSubstance: ns, nRel: rel,
      R0: Math.pow((VESSEL.ri - ns) / (VESSEL.ri + ns), 2),
      /* total internal reflection at the inner face is the mechanism behind a real vessel's rim
         reading bright and mirror-like while its face reads clear. It is not authored; it falls out. */
      criticalDeg: Math.asin(ns / VESSEL.ri) * DEG,
    };
  }

  /* ---- the rim, and the resolution floor that bounds the displacement half ----------------------
   * AUTHORED, and the only authored number here: U_RIM is where the curve turns. Below it reflectance
   * stays under 8% and displacement under 3.7 px; above it both go vertical — 5% at u = 0.74, 10% at
   * 0.89, 20% at 0.95, 45% at 0.99. That is a reasonable reading of a curve, not a derived constant,
   * and it gets the treatment SWIPE_YIELD_PX and FLOOR_RISE_PX_S get. The floor below scales with it. */
  var U_RIM = 0.85;

  /* THE FAILURE CONDITION IS GEOMETRIC, not aesthetic. The rim band is (1 - U_RIM)/2 of the vessel's
     width. The displacement it must express is the RANGE across that band. Below the width where those
     two cross, the band is narrower than the shift it carries and the effect samples outside its own
     band — incoherent rather than ugly.
     GLASS-VESSEL-PLAN §4 puts this at 48 px from a range of 3.63 px. That range is wrong, and the way
     it is wrong matters: 3.63 is shiftPx(0.85) = 3.6145 itself — the displacement AT the band's inner
     edge, not the change ACROSS the band. shiftPx(1.0) = 7.5591, so the range is 3.9445 and the floor
     is 52.6 px. Every row of the plan's §4 table is optimistic by the same 8.66%, and a safety
     threshold that reads safer than it is, is the one direction an error must not go. Derived here so
     it cannot be typed wrong again. */
  function rimBandFraction() { return (1 - U_RIM) / 2; }
  function shiftRangePx() { return shiftPx(1) - shiftPx(U_RIM); }
  function floorPx() { return shiftRangePx() / rimBandFraction(); }

  /* The rim as a colour operation and NOTHING ELSE. Per-pixel, no spatial extent, therefore no
     resolution floor at all — which is why this is the half that ships first and the displacement map
     is the half that has to clear floorPx(). A uniform blur would be frosting, and frosting is not
     refraction; the correct displacement is ZERO over most of the surface and rises only near grazing
     incidence, so anything uniform is decoration wearing the name.
     Stops are emitted symmetrically about the axis, alpha = the reflectance at that offset, so the face
     carries the real 3.67% sheen and the rim carries the real rise. Nothing is normalised or eased:
     the profile IS the curve. `u` runs 0 at the centre to 1 at each edge, so x = (1 +/- u)/2. */
  /* U_MAX — the last renderable sample. R -> 1 as u -> 1 and the silhouette is not a pixel, so the
     profile is cut where the plan's own table stops. Not authored so much as arithmetic: a stop AT the
     silhouette would be a stop at zero width. */
  var U_MAX = 0.99;

  /* ALPHA_TOL — the 8-bit alpha quantum. A CSS gradient is a piecewise-LINEAR interpolation between
     stops, and this curve is anything but linear, so the stop set has to be dense enough that the
     chord never departs from the curve by more than the renderer can express. 1/255 is that bound and
     it is derived from the target, not chosen. */
  var ALPHA_TOL = 1 / 255;

  /* ADAPTIVE, because neither uniform scheme works and both were measured before this was written.
     Uniform in POSITION plateaus at |err| 0.047 however many stops are added — the curve goes vertical
     near the rim and no amount of even sampling resolves a vertical. Uniform in REFLECTANCE fixes the
     rim and moves the failure to the middle, 0.021 at u ~ 0.63, because it leaves the flat 70% as one
     enormous chord. Subdividing any segment that exceeds ALPHA_TOL costs one recursion and has no
     authored step count at all: the density follows the curve, which is the only thing that should
     decide it. */
  function rimStops(tol) {
    var eps = typeof tol === "number" ? tol : ALPHA_TOL;
    var pts = [];
    function R(u) { return reflectance(Math.min(u, U_MAX)); }
    function push(u) { pts.push({ u: u, x: (1 - u) / 2, a: R(u) }); }
    function split(u0, u1, a0, a1, depth) {
      var um = (u0 + u1) / 2, am = R(um);
      if (depth > 16 || Math.abs((a0 + a1) / 2 - am) <= eps) return;
      split(u0, um, a0, am, depth + 1);
      push(um);
      split(um, u1, am, a1, depth + 1);
    }
    push(0);
    split(0, 1, R(0), R(1), 0);
    push(1);
    return pts;
  }

  /* the two edges of one box, as a CSS gradient a surface can wear. One definition, so the reference
     surface and any tool that later adopts it cut the same profile. */
  /* THE COLOUR IS THE LIGHT'S, NOT THE VESSEL'S, and it is resolved rather than authored. 2.4's
     finding: a specular return on a dielectric carries the SOURCE's colour, which is why 2.11's
     bevel highlight goes warm bone to white. So the rim is the system's own ink lightened toward the
     source, read from `--bone` at call time — and if that token does not resolve the rim paints
     NOTHING rather than an invented white. That is L6's rule applied to a highlight, and it is the
     same refusal floor.js makes when the palette is absent. */
  function rimColor() {
    try {
      var v = (getComputedStyle(document.documentElement).getPropertyValue("--bone") || "").trim();
      return /^#[0-9a-f]{3,6}$/i.test(v) ? v : null;
    } catch (e) { return null; }
  }
  function rimGradient(o) {
    o = o || {};
    var col = o.color || rimColor(), gain = typeof o.gain === "number" ? o.gain : 1;
    if (!col) return "none";
    var s = rimStops(o.tol), parts = [], i;
    for (i = s.length - 1; i >= 0; i--) parts.push(rgba(col, s[i].a * gain) + " " + pct(s[i].x));
    for (i = 1; i < s.length; i++) parts.push(rgba(col, s[i].a * gain) + " " + pct(1 - s[i].x));
    return "linear-gradient(90deg," + parts.join(",") + ")";
  }
  function pct(x) { return (x * 100).toFixed(2) + "%"; }
  function rgba(hex, a) {
    var h = String(hex).replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a.toFixed(4) + ")";
  }

  root.OCCVM_GLASS = {
    VESSEL: VESSEL, PX_PER_MM: PX_PER_MM, wallPx: wallPx,
    incidence: incidence, refracted: refracted, reflectance: reflectance, shiftPx: shiftPx,
    inner: inner,
    U_RIM: U_RIM, U_MAX: U_MAX, ALPHA_TOL: ALPHA_TOL,
    rimBandFraction: rimBandFraction, shiftRangePx: shiftRangePx, floorPx: floorPx,
    rimStops: rimStops, rimGradient: rimGradient, rimColor: rimColor,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
if (typeof module !== "undefined" && module.exports) module.exports = OCCVM_GLASS;
