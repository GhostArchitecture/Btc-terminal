/* OCCVM 1.1 → 2.8 — the vein generator. One implementation, shared by every conforming tool (OCCVM-L10).
 *
 * Authored in occvm/SPINE.md; spliced into a tool by occvm/tools/splice-spine.js. Do not hand-edit the
 * spliced copy — the next splice reverts it silently.
 *
 * Veins are GROWN, not drawn. Both tools drew three displaced cubic beziers and called the result a
 * mineral vein; a bezier is a shape that resembles the outcome, and the eye eventually catches the
 * smooth curvature because nothing in a real aggregate is smooth at every scale.
 *
 * 2.8 — THE MECHANISM CHANGED WITH THE SUBSTANCE. From 1.1 to 2.7 this was particle-cluster DLA: a
 * fixed aggregate seeded at a few nuclei, walkers arriving one at a time and sticking. That is how a
 * crystal grows from a nucleation point, and it was grown as one — aragonite's cyclic twin, with the
 * {110} angle read from the material's unit cell. A fluid has no lattice, no nucleus and no angle, and
 * a colloidal suspension does not aggregate that way. Ketchup is a particulate gel: tomato cell-wall
 * fragments in suspension, every one of them diffusing, sticking to each other on contact, the clusters
 * they form diffusing in turn until the whole suspension has joined into one network. That is
 * DIFFUSION-LIMITED CLUSTER AGGREGATION (Meakin 1983; Kolb, Botet & Jullien 1983), and it is what this
 * file now simulates: every particle starts mobile, every cluster moves as a rigid body with a mobility
 * that falls with its size, and two clusters that touch become one.
 *
 * What that does to the picture, measured rather than asserted (test/occvm.js): the vein layer stops
 * being a few dendrites radiating from points in clear matrix and becomes a network SUSPENDED IN the
 * material — open, tenuous, everywhere at once. The roadmap's own visual note (§5.4) asked for exactly
 * that, and it turns out not to be a rendering choice; it is what the mechanism produces at the density
 * the tools already ship. At `--vein-density .3` the suspension is above its gel point and the clusters
 * span the field; at .15 they are separate flocs with matrix between them; at .08 they are isolated.
 * The axis a fluid has is CONCENTRATION, and the reference surface's specimens now run along it.
 *
 * `--vein-habit` IS RETIRED, and the reason is a measurement, not a preference. The crystal's habit was
 * attachment anisotropy — which crystallographic directions accept a particle — and a fluid has no
 * directions to be anisotropic along. The one axis colloid science does offer, the sticking probability
 * that separates diffusion-limited from reaction-limited aggregation (Lin et al. 1989: D_f 1.86 → 2.1
 * in three dimensions), was tried here as the token's new meaning and DOES NOT EXPRESS on this lattice:
 * at the shipped density the mass-radius dimension moved 1.61 → 1.54 across a 20× range in sticking
 * probability, and in the dilute regime 1.38 → 1.39, inside the estimator's own error both times. A
 * token whose effect is below measurement is OCCVM-D12 with a physical story attached. `field()` still
 * accepts `habit` and ignores it, so a caller written against 1.1 does not throw; the spine carries the
 * declaration one minor cycle marked deprecated per its versioning contract, and nothing reads it.
 *
 * Seeded and pure. Same seed plus same parameters yields the same bytes, which is what the golden set
 * and the injected session seed exist for (SPINE.md section 4). No substance module is read: DLCA takes
 * no constant from the fluid, and the fractal dimension is an OUTPUT of the process, measured in the
 * tests against the literature, never an input to it. That also removes the load-order dependency that
 * had material.js needing to precede this file.
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

  /* grow(): cluster-cluster aggregation on a lattice.
   *
   *   w, h     lattice; the surface wraps vertically and has walls at the sides, as before
   *   n        particle count — the volume fraction times the lattice
   *   seed     mulberry32 seed
   *   stick    probability that a contact becomes a bond (1 = diffusion-limited). Accepted, measured,
   *            and not exposed as a token — see the header.
   *   target   stop when this many clusters remain. The suspension is not driven to a single cluster,
   *            because a gel is a network of many flocs that have joined, and the last few merges are
   *            the slowest by a wide margin (a cluster's mobility falls as s^-½).
   *   budget   a hard cap on steps, so a pathological seed cannot hang a page
   *
   * Every particle begins as its own cluster at a random empty site. Each step picks a cluster at
   * random, moves it one lattice step in a random direction as a rigid body — accepted with probability
   * s^-½, the standard size-dependent mobility, so a monomer moves every time it is picked and a cluster
   * of a hundred moves one time in ten — and then looks for contact with any other cluster on the Moore
   * neighbourhood of every particle it moved. A contact merges the two with probability `stick`. The
   * bond recorded is the pair of particles that touched, kept as INDICES rather than coordinates: the
   * clusters keep moving after they join, and a bond stored as a position at the moment of contact is
   * wrong the next time either of its ends moves (the prototype did exactly that and rendered confetti).
   */
  function grow(o) {
    var w = o.w | 0, h = o.h | 0;
    var n = o.n | 0;
    var stick = o.stick === undefined ? 1 : Math.max(0.005, Math.min(1, o.stick));
    var target = o.target === undefined ? 8 : Math.max(1, o.target | 0);
    var budget = o.budget === undefined ? 400000 : o.budget | 0;
    var rnd = mulberry32(o.seed >>> 0);

    var occ = new Int32Array(w * h);            /* particle index + 1, or 0 */
    var px = new Int16Array(n), py = new Int16Array(n), cid = new Int32Array(n);
    var members = [];                           /* cluster id -> array of particle indices, or null */
    var placed = 0, tries = 0, i, m, q;
    while (placed < n && tries < n * 50) {
      tries++;
      var x = 1 + ((rnd() * (w - 2)) | 0), y = (rnd() * h) | 0, k = y * w + x;
      if (occ[k]) continue;
      occ[k] = placed + 1; px[placed] = x; py[placed] = y; cid[placed] = placed;
      members.push([placed]); placed++;
    }
    n = placed;
    var alive = [];
    for (i = 0; i < n; i++) alive.push(i);

    var bonds = [], clusters = n, steps = 0;
    var DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
    function wrapY(v) { return v < 0 ? v + h : (v >= h ? v - h : v); }

    while (clusters > target && steps < budget) {
      steps++;
      var ai = (rnd() * alive.length) | 0, c = alive[ai], mem = members[c], s = mem.length;
      if (s > 1 && rnd() > 1 / Math.sqrt(s)) continue;   /* mobility ∝ s^-½ */
      var d = (rnd() * 4) | 0, dx = DX[d], dy = DY[d];

      /* can the whole cluster take the step? a wall or another cluster in the way blocks it */
      var blocked = false, contacts = [];
      for (m = 0; m < s; m++) {
        q = mem[m];
        var nx = px[q] + dx, ny = wrapY(py[q] + dy);
        if (nx < 1 || nx > w - 2) { blocked = true; break; }
        var o2 = occ[ny * w + nx];
        if (o2 && cid[o2 - 1] !== c) { blocked = true; contacts.push(q, o2 - 1); }
      }
      if (!blocked) {
        for (m = 0; m < s; m++) { q = mem[m]; occ[py[q] * w + px[q]] = 0; }
        for (m = 0; m < s; m++) { q = mem[m]; px[q] += dx; py[q] = wrapY(py[q] + dy); occ[py[q] * w + px[q]] = q + 1; }
        /* Moore contact: diagonal touch bonds too, or the network reads as circuit routing (1.1) */
        for (m = 0; m < s; m++) {
          q = mem[m];
          for (var j = 0; j < 8; j++) {
            var ddx = (j === 0 || j === 3 || j === 5) ? -1 : (j === 2 || j === 4 || j === 7) ? 1 : 0;
            var ddy = (j === 0 || j === 1 || j === 2) ? -1 : (j === 5 || j === 6 || j === 7) ? 1 : 0;
            var xx = px[q] + ddx, yy = wrapY(py[q] + ddy);
            if (xx < 0 || xx >= w) continue;
            var o3 = occ[yy * w + xx];
            if (o3 && cid[o3 - 1] !== c) contacts.push(q, o3 - 1);
          }
        }
      }
      if (contacts.length && rnd() < stick) {
        var seen = {};
        for (var t = 0; t < contacts.length; t += 2) {
          var a = contacts[t], b = contacts[t + 1], cb = cid[b];
          if (cb === c || seen[cb]) continue;
          seen[cb] = 1;
          bonds.push(a, b);
          var mb = members[cb];
          for (m = 0; m < mb.length; m++) { cid[mb[m]] = c; mem.push(mb[m]); }
          members[cb] = null; clusters--;
          var idx = alive.indexOf(cb);
          alive[idx] = alive[alive.length - 1]; alive.pop();
        }
      }
    }

    /* resolve bonds to where the particles ENDED, not where they met */
    var segs = [];
    for (i = 0; i < bonds.length; i += 2) {
      var A = bonds[i], B = bonds[i + 1];
      segs.push(px[A], py[A], px[B], py[B]);
    }
    return { segs: segs, bonds: bonds, w: w, h: h, particles: n, clusters: clusters, steps: steps,
             px: px, py: py, cid: cid, members: members };
  }

  /* paths(): trace the aggregate. Every stroke is a straight segment between two particles that bonded
   * — the record of how it formed. No curve is fitted over it, because a fitted curve is the bezier
   * coming back in through the renderer.
   */
  function paths(g, o) {
    var sc = o.scale || 1, jx = o.ox || 0, jy = o.oy || 0;
    /* The lattice is a discretisation of the walk, not a fact about the substance, so the trace carries
       a deterministic sub-cell offset per particle. It breaks the grid without fitting a curve. */
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

  /* field(): the whole vein layer as raw SVG, so both tools share the assembly and not just the growth.
   *
   * Two strokes over one path, as since 1.1 — but the wide, deep one is now BLURRED and the fine one
   * sits lower in opacity. A crystal vein is a seam in a solid and reads crisp; a floc is suspended in
   * a fluid and has no hard boundary against it. `soft` is the blur's standard deviation in viewBox
   * units; 0 restores the seam. This is the one authored rendering value in the file and is named as
   * one — the mechanism gives the structure, not the focus.
   *
   * density is the volume fraction: the particle count as a fraction of the lattice. It is the same
   * number `--vein-density` has always been (a walker budget was the same fraction under the old
   * mechanism); only what it means physically has sharpened. `habit` is accepted and ignored (header).
   *
   * RETURNS RAW SVG. The caller must encodeURIComponent it before putting it in a url(). Both the
   * fragment references and the colours carry a literal "#", and a "#" left raw inside a data: URI ends
   * the URI at a fragment — while pre-encoding it to %23 leaves the parsed SVG holding the two literal
   * characters "%23", so href="%23v" resolves to nothing and the layer renders empty. That failure is
   * invisible to a token diff and to any check that only looks for the string: it has to be looked at.
   */
  function field(o) {
    var w = o.w || 110, h = o.h || 70;
    var density = o.density === undefined ? 0.3 : Math.max(0.02, Math.min(0.6, o.density));
    var g = grow({ w: w, h: h, n: Math.round(w * h * density), seed: o.seed, stick: o.stick, target: o.target });
    if (g.segs.length < 8) throw new Error("occvm veins: suspension did not aggregate");
    var d = paths(g, { scale: (o.viewW || 1200) / w, seed: o.seed });
    var soft = o.soft === undefined ? 1.4 : Math.max(0, o.soft);
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + (o.viewW || 1200) + " " +
      (o.viewH || Math.round((o.viewW || 1200) * h / w)) + "' preserveAspectRatio='none'>" +
      "<defs><path id='v' d='" + d + "'/>" +
      (soft > 0 ? "<filter id='s' x='-3%' y='-3%' width='106%' height='106%'><feGaussianBlur stdDeviation='" + soft + "'/></filter>" : "") +
      "</defs>" +
      "<g fill='none' stroke-linecap='round' stroke-linejoin='round'>" +
      "<use href='#v' stroke='" + (o.lo || "#1c6a45") + "' stroke-width='" + (o.wide || 4.5) + "' opacity='.55'" + (soft > 0 ? " filter='url(#s)'" : "") + "/>" +
      "<use href='#v' stroke='" + (o.hi || "#3fbf7e") + "' stroke-width='" + (o.fine || 1.3) + "' opacity='.7'/>" +
      "</g></svg>";
    return { svg: svg, particles: g.particles, clusters: g.clusters, bonds: g.segs.length / 4 };
  }

  return { grow: grow, paths: paths, field: field, mulberry32: mulberry32 };
})();
if (typeof module !== "undefined") module.exports = OCCVM_VEINS;
