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

  /* grow(): DLA on a lattice, growing the habit of a named mineral rather than a generic dendrite.
   *
   * THE MINERAL IS ARAGONITE, and since 1.1a that is a decision the generator encodes rather than a label
   * on the output. The 2.0 material model anchors substrate and vein to one crystal (CaCO₃, orthorhombic)
   * on the argument that a vein is not a foreign material embedded in a slab — it is the same crystal
   * grown differently. Aragonite's two expressions are exactly the two this system needs: a blocky
   * orthorhombic form for a cut face, and a fibrous radiating form for a vein. So the vein grows the
   * second one, and it grows it the way aragonite actually does:
   *
   *   - FIBRES RADIATE FROM A NUCLEATION POINT. Not from the screen's left edge, and not along the
   *     screen's horizontal. Until 1.1a the anisotropy was `pH = .5 + habit * .32`, a bias toward
   *     horizontal STEPS — a direction in the viewport, which is a fact about the browser window and not
   *     about the crystal. A crystal has no idea which way the screen is. Direction is now measured from
   *     the growth's own nucleus, which is a direction in the material's frame.
   *
   *   - IT TWINS IN THREES. Aragonite's signature is cyclic twinning on {110}: three individuals meeting
   *     at close to 120°, which mimics a hexagonal prism well enough that the pseudo-hexagonal form is
   *     what the mineral is known for. Each nucleus therefore carries `twin` sectors — three, by default,
   *     because that is what aragonite does — each with its own rotation, and growth is selective along
   *     them. Radiating fibre bundles from one point, grown rather than drawn.
   *
   * habit stays what OCCVM-L10 says it is — the anisotropy of growth — and its ends still mean what the
   * law says: 0 grows the bushy, equant dendrite of a manganese oxide; 1 draws the structure out into an
   * elongated, acicular form. Two things changed under it. The AXIS anisotropy is measured against moved
   * from the viewport's to the crystal's, and the MECHANISM moved from the walk to the attachment (see
   * accept(), below, which records why the first attempt failed). At habit 0 the twin sectors still exist
   * but express nothing, because attachment is then indifferent to direction — which is correct, and is
   * what an equant habit is.
   *
   * Walkers spawn just beyond the frontier rather than at infinity — the standard optimisation, and the
   * reason this finishes in single-digit milliseconds. A walker that strays far outside the frontier is
   * abandoned rather than followed, which is equivalent in the limit and much cheaper.
   *
   * `twin` is a parameter rather than a CSS token deliberately. Twinning is a MATERIAL PROPERTY, and
   * material properties are 2.0's substance — at 2.0 this argument comes from the material definition
   * instead of a default. Adding a `--vein-twin` token now would put a 2.0 property into the 1.x token
   * surface, which is the leak SPINE.md's own 1.4 note warns about. It defaults to aragonite's 3.
   */
  function grow(o) {
    var w = o.w | 0, h = o.h | 0;
    var n = o.n | 0;
    var habit = Math.max(0, Math.min(1, o.habit === undefined ? 0.55 : o.habit));
    var twin = o.twin === undefined ? 3 : Math.max(1, o.twin | 0);
    var rnd = mulberry32(o.seed >>> 0);
    var TAU = 6.283185307179586;

    var occ = new Uint8Array(w * h);
    var segs = [];
    var i, j, y, x;

    /* Nucleation points, scattered across the whole surface rather than banked against one edge: a vein
       layer that fills half the page and stops is a gradient, and the eye reads a gradient as a mistake.
       They compete for the same walkers and screen each other, which is what leaves clear matrix between
       separate growths.

       Each nucleus carries its own twin rotation, so the three sectors do not all point the same way
       across the surface — cyclic twins nucleate independently and there is no reason they would. */
    var nuclei = 6 + ((rnd() * 4) | 0);
    var seeds = [], sites = [], siteGroup = [], groups = [], segOwner = [];
    for (i = 0; i < nuclei; i++) {
      x = 1 + ((rnd() * (w - 3)) | 0);
      y = ((rnd() * h) | 0);
      occ[y * w + x] = 1;
      seeds.push(x, y);
      sites.push(y * w + x);
      siteGroup.push(i);
      groups.push({ cx: x, cy: y, rot: rnd() * TAU });
    }

    var maxSteps = h * 2 + 60;

    /* ATTACHMENT ANISOTROPY — how a crystal actually grows in a direction.
     *
     * The first attempt at this biased the WALKER's drift toward its sector axis, and measurement said
     * it did nothing: twin 1, twin 3 and twin 6 produced identical angular spectra, all dominated by a
     * single lobe. Two reasons, both instructive. A walker pushed radially outward is pushed away from
     * the aggregate, so it wanders off and is abandoned rather than sticking anywhere — the bias spent
     * walkers instead of shaping growth. And snapping an axis to the nearest lattice step collapses
     * three directions 120° apart into at most four, which destroys the threefold signal before it can
     * reach the surface.
     *
     * A real crystal is not anisotropic because the diffusing atom travels differently. It is
     * anisotropic because ATTACHMENT differs by crystallographic direction: some faces accept an atom
     * readily and some do not, and the fast directions become the needles. So the walk stays a pure
     * unbiased random walk — which is what makes this DLA at all — and the anisotropy lives in whether
     * a contact is accepted.
     *
     * `align` is +1 when the candidate site sits exactly on one of the nucleus's `twin` axes and −1
     * exactly between two of them; `cos(twin·(θ−rot))` gives the whole cyclic-twin symmetry in one term.
     * Acceptance falls from certain (habit 0, isotropic, equant) to strongly axis-selective (habit 1),
     * and a rejected walker keeps walking rather than being discarded, so no walker is wasted. */
    function accept(g, px, py) {
      if (habit <= 0) return true;
      var dx = px - g.cx, dy = py - g.cy;
      /* the surface wraps vertically, so take the shorter way round when measuring a bearing */
      if (dy > h / 2) dy -= h; else if (dy < -h / 2) dy += h;
      if (dx === 0 && dy === 0) return true;                  /* at the nucleus itself: no direction yet */
      var align = Math.cos(twin * (Math.atan2(dy, dx) - g.rot));   /* +1 on an axis, -1 between */
      /* Selectivity is the EXPONENT, not a blend against an isotropic floor. The first form here was
         `(1-habit) + habit·p`, which keeps a 0.45 floor of accepting anything at habit .55 — both tools'
         default — and measurement showed the threefold signal absent there: dominant harmonic k=1, the
         twin invisible at exactly the setting that ships. As an exponent the limits are exact (habit 0
         gives p⁰ = 1, accept everything, equant) and selectivity rises smoothly with no dead band. */
      return rnd() < Math.pow((1 + align) / 2, habit * 6);
    }

    for (i = 0; i < n; i++) {
      /* Spawn across the whole occupied extent rather than only at the leading edge, so the interior
         keeps thickening while the tips advance. Launching only at the frontier grows one filament and
         leaves the body starved. */
      /* Launch near the aggregate, not at infinity. A walker released far out in the matrix spends most
         of its life wandering empty lattice; released on a small circle around a site already occupied,
         it arrives at the cluster with the same isotropic distribution — this is the standard DLA launch
         radius, and it is why the generator finishes in single-digit milliseconds instead of twenty. */
      var pick = (rnd() * sites.length) | 0;
      var site = sites[pick], group = groups[siteGroup[pick]];
      var ang = rnd() * TAU, rad = 4 + rnd() * 7;
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
        /* a contact only becomes a stick if this direction accepts one (see accept(), above) */
        if (hit >= 0 && accept(group, x, y)) { stuck = hit; break; }

        /* An unbiased lattice walk. The anisotropy is in attachment, not in travel. */
        if (rnd() < 0.5) x += rnd() < 0.5 ? -1 : 1;
        else y += rnd() < 0.5 ? -1 : 1;

        if (y < 0) y = h - 1; else if (y >= h) y = 0;        /* the surface wraps vertically */
        if (x < 1) x = 1; else if (x >= w - 1) x = w - 2;
      }
      if (stuck < 0) continue;

      var kk = y * w + x;
      if (occ[kk]) continue;
      occ[kk] = 1;
      sites.push(kk);
      siteGroup.push(siteGroup[pick]);   /* a fibre belongs to the twin it grew from */
      segOwner.push(siteGroup[pick]);
      segs.push(stuck % w, (stuck / w) | 0, x, y);
    }
    /* `groups` and `segOwner` are returned so the twin can be MEASURED rather than eyeballed: with
       several growths overlapping, assigning a particle to its nearest nucleus misattributes enough of
       them to bury the signal, and a property that can only be checked when it happens to be isolated is
       not really checked. With the true owner and the group's own rotation, the angular harmonic is
       exact — which is what test/occvm.js asserts on. */
    return { segs: segs, w: w, h: h, nuclei: seeds, twin: twin, groups: groups, segOwner: segOwner };
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
    var g = grow({ w: w, h: h, n: Math.round(w * h * density), habit: o.habit, seed: o.seed, twin: o.twin });
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
