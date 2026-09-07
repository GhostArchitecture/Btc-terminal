/* OCCVM 1.1 — the vein generator. One implementation, shared by every conforming tool (OCCVM-L10).
 *
 * Authored in occvm/SPINE.md; spliced into a tool by occvm/tools/splice-spine.js. Do not hand-edit the
 * spliced copy — the next splice reverts it silently.
 *
 * Veins are GROWN, not drawn. Both tools drew three displaced cubic beziers and called the result a
 * mineral vein; a bezier is a shape that resembles the outcome, and the eye eventually catches the
 * smooth curvature because nothing in a real dendrite is smooth at every scale.
 *
 * This is diffusion-limited aggregation: a walker starts in the matrix, moves at random, and sticks the
 * instant it touches the aggregate. Growth is dendritic because a tip that protrudes intercepts walkers
 * before they can reach the shielded interior — the screening effect, which nobody has to author. That
 * is the roadmap's discipline for 2.0 arriving early: simulate the process, never the resulting shape.
 *
 * Seeded and pure. Same seed plus same parameters yields the same bytes, which is what the golden set
 * and the injected session seed exist for (SPINE.md section 4).
 */
var OCCVM_VEINS = (function () {
  "use strict";

  /* the PRNG both tools already use, so a seed means the same thing everywhere */
  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* grow(): DLA on a lattice, seeded along the left edge so the aggregate crosses the surface the way a
   * vein does rather than radiating from a point.
   *
   * habit is the anisotropy of the walk, and it is a real mineral term: 0 walks isotropically and grows
   * the bushy, equant dendrite of a manganese oxide; 1 weights horizontal steps and draws the structure
   * out into the elongated, fibrous habit of an acicular growth. It changes how the crystal grows, not
   * what is drawn afterwards.
   *
   * Walkers spawn just beyond the frontier rather than at infinity — the standard optimisation, and the
   * reason this finishes in single-digit milliseconds. A walker that strays far outside the frontier is
   * abandoned rather than followed, which is equivalent in the limit and much cheaper.
   */
  function grow(o) {
    var w = o.w | 0, h = o.h | 0;
    var n = o.n | 0;
    var habit = Math.max(0, Math.min(1, o.habit === undefined ? 0.55 : o.habit));
    var rnd = mulberry32(o.seed >>> 0);

    var occ = new Uint8Array(w * h);
    var segs = [];
    var i, j, y, x;

    /* Seeds are a handful of scattered points, not the whole edge. An edge seed grows a comb — every
       column starts at once and nothing competes — where scattered nuclei compete for the same walkers
       and screen each other, which is what produces separate dendrites with clear matrix between them.
       They are scattered across the whole surface, not banked against one edge: a vein layer that fills
       half the page and stops is a gradient, and the eye reads a gradient as a mistake. */
    var nuclei = 4 + ((rnd() * 4) | 0);
    var seeds = [], sites = [];
    for (i = 0; i < nuclei; i++) {
      x = 1 + ((rnd() * (w - 3)) | 0);
      y = ((rnd() * h) | 0);
      occ[y * w + x] = 1;
      seeds.push(x, y);
      sites.push(y * w + x);
    }

    var maxSteps = h * 2 + 60;
    /* horizontal step probability: .5 is isotropic, rising to .82 at full habit */
    var pH = 0.5 + habit * 0.32;

    for (i = 0; i < n; i++) {
      /* Spawn across the whole occupied extent rather than only at the leading edge, so the interior
         keeps thickening while the tips advance. Launching only at the frontier grows one filament and
         leaves the body starved. */
      /* Launch near the aggregate, not at infinity. A walker released far out in the matrix spends most
         of its life wandering empty lattice; released on a small circle around a site already occupied,
         it arrives at the cluster with the same isotropic distribution — this is the standard DLA launch
         radius, and it is why the generator finishes in single-digit milliseconds instead of twenty. */
      var site = sites[(rnd() * sites.length) | 0];
      var ang = rnd() * 6.283185307, rad = 4 + rnd() * 7;
      x = ((site % w) + Math.cos(ang) * rad) | 0;
      y = (((site / w) | 0) + Math.sin(ang) * rad) | 0;
      if (x < 1) x = 1; else if (x > w - 2) x = w - 2;
      if (y < 0) y += h; else if (y >= h) y -= h;
      var stuck = -1;

      for (var st = 0; st < maxSteps; st++) {
        var k = y * w + x;
        if (occ[k]) break;                                   /* landed inside: discard */
        /* Moore neighbourhood: a walker sticks on diagonal contact too, so the aggregate grows at 45
           degrees as readily as along the axes. Von Neumann sticking is what makes a lattice DLA look
           like circuit routing rather than a mineral. */
        var hit = -1;
        for (j = 0; j < 8 && hit < 0; j++) {
          var dx = (j === 0 || j === 3 || j === 5) ? -1 : (j === 2 || j === 4 || j === 7) ? 1 : 0;
          var dy = (j === 0 || j === 1 || j === 2) ? -1 : (j === 5 || j === 6 || j === 7) ? 1 : 0;
          var nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w) continue;
          if (ny < 0) ny = h - 1; else if (ny >= h) ny = 0;
          if (occ[ny * w + nx]) hit = ny * w + nx;
        }
        if (hit >= 0) { stuck = hit; break; }

        if (rnd() < pH) x += rnd() < 0.5 ? -1 : 1;
        else y += rnd() < 0.5 ? -1 : 1;

        if (y < 0) y = h - 1; else if (y >= h) y = 0;        /* the surface wraps vertically */
        if (x < 1) x = 1; else if (x >= w - 1) x = w - 2;
      }
      if (stuck < 0) continue;

      var kk = y * w + x;
      if (occ[kk]) continue;
      occ[kk] = 1;
      sites.push(kk);
      segs.push(stuck % w, (stuck / w) | 0, x, y);
    }
    return { segs: segs, w: w, h: h, nuclei: seeds };
  }

  /* svg(): trace the aggregate. Every stroke is a straight segment between a particle and the particle
   * it stuck to — the record of how it grew. No curve is fitted over it, because a fitted curve is the
   * bezier coming back in through the renderer.
   */
  function paths(g, o) {
    var sc = o.scale || 1, jx = o.ox || 0, jy = o.oy || 0;
    /* The lattice is a discretisation of the walk, not a fact about the mineral, so the trace carries a
       deterministic sub-cell offset per particle. It breaks the grid without fitting a curve over the
       growth — a fitted curve is the bezier coming back in through the renderer. */
    var jit = o.jitter === undefined ? 0.42 : o.jitter;
    var r = mulberry32((o.seed >>> 0) ^ 0x5bf03635);
    var d = [], i;
    for (i = 0; i < g.segs.length; i += 4) {
      var ay = g.segs[i + 1], by = g.segs[i + 3];
      if (Math.abs(ay - by) > g.h * 0.5) continue;           /* a wrap, not a real neighbour */
      var ax = (g.segs[i] + (r() - 0.5) * jit) * sc + jx;
      var bx = (g.segs[i + 2] + (r() - 0.5) * jit) * sc + jx;
      var ay2 = (ay + (r() - 0.5) * jit) * sc + jy;
      var by2 = (by + (r() - 0.5) * jit) * sc + jy;
      /* Integer coordinates. At the scale these are drawn, a tenth of a pixel is below the stroke width
         and costs a byte per number across thousands of segments. */
      d.push("M" + (ax | 0) + " " + (ay2 | 0) + "L" + (bx | 0) + " " + (by2 | 0));
    }
    return d.join("");
  }

  /* field(): the whole vein layer as a data URI, so both tools share the assembly and not just the
   * growth. Two strokes over one path — a wide deep one and a fine bright one offset by nothing — read
   * as a vein with depth rather than a wire.
   *
   * density is the walker budget as a fraction of the lattice; habit is the growth anisotropy. Both are
   * read from --vein-density and --vein-habit by the caller, so a tool can tune its own surface without
   * a second generator.
   *
   * RETURNS RAW SVG. The caller must encodeURIComponent it before putting it in a url(). Both the
   * fragment reference and the colours carry a literal "#", and a "#" left raw inside a data: URI ends
   * the URI at a fragment — while pre-encoding it to %23 leaves the parsed SVG holding the two literal
   * characters "%23", so href="%23v" resolves to nothing and the layer renders empty. That failure is
   * invisible to a token diff and to any check that only looks for the string: it has to be looked at.
   */
  function field(o) {
    var w = o.w || 110, h = o.h || 70;
    var density = o.density === undefined ? 0.35 : Math.max(0.05, Math.min(1, o.density));
    var g = grow({ w: w, h: h, n: Math.round(w * h * density), habit: o.habit, seed: o.seed });
    if (g.segs.length < 8) throw new Error("occvm veins: aggregate did not grow");
    var d = paths(g, { scale: (o.viewW || 1200) / w, seed: o.seed });
    /* The geometry is written once and referenced twice. Serialising the same few tens of kilobytes of
       path data a second time is the single largest cost in producing this layer. */
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + (o.viewW || 1200) + " " +
      (o.viewH || Math.round((o.viewW || 1200) * h / w)) + "' preserveAspectRatio='none'>" +
      "<defs><path id='v' d='" + d + "'/></defs>" +
      "<g fill='none' stroke-linecap='round'>" +
      "<use href='#v' stroke='" + (o.lo || "#1c6a45") + "' stroke-width='" + (o.wide || 4.5) + "' opacity='.5'/>" +
      "<use href='#v' stroke='" + (o.hi || "#3fbf7e") + "' stroke-width='" + (o.fine || 1.3) + "' opacity='.85'/>" +
      "</g></svg>";
    return { svg: svg, particles: g.segs.length / 4 };
  }

  return { grow: grow, paths: paths, field: field, mulberry32: mulberry32 };
})();
if (typeof module !== "undefined") module.exports = OCCVM_VEINS;
