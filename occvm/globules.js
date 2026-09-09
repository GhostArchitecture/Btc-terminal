/* OCCVM — the globule field (2.25). The substrate decoration both tools share: a seeded field of
   droplets, one generator, two renderers. Rhyme paints it live on the draft face and as a still frame on
   every other slab (30_ui.jsx: ambientFloor); BTC writes a still frame to --globules as a data URI
   (index.html: globuleLayer). This part owns the FIELD — where the drops are and how big — and the
   still SVG. Motion, merging and the canvas are the live consumer's, because L13 grants motion to one
   tool only and a shared part must not carry what one tool is withheld.

   WHAT IT REPLACES. The DLCA vein layer (occvm/veins.js, 1.1–2.24). Its mechanism was real and its
   fractal dimension was measured (1.61 at the shipped density, recorded in SPINE.md L10), but what it
   RENDERED was a crisp lattice trace that read as a crystal in both tools, and at 2.24 the owner said so.
   Rhyme retired it at 2.24; BTC follows at 2.25. veins.js stays in occvm/ unspliced, as the generator the
   record cites, and ships in neither tool.

   AUTHORED, AND NAMED AS AUTHORED. A droplet field is decoration (L13 records the cost: a yield-stress
   fluid below tau0 does not bead or drift). Nothing here derives from the substance. The radius band, the
   density and the seed are numbers a person chose; the weight (alpha) is each tool's own, measured on
   its own surface, because a slab and a page ground are not the same surface. */
var OCCVM_GLOBULES = (function () {
  /* the PRNG the veins used; one owner (L3), so veins.js reads it from here in Node */
  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var PX_PER_DROP = 9000;      /* authored: one droplet per ~95×95 px */
  var R = [9, 30];             /* authored: the radius band, px */
  var DRIFT_PX_S = 1.4;        /* authored: the live consumer's drift, carried on each drop so the field is one field */

  function count(w, h, pxPerDrop) { return Math.max(3, Math.round(w * h / (pxPerDrop || PX_PER_DROP))); }

  /* one droplet, from the field's own PRNG */
  function drop(rnd, w, h, r0, r1, edge) {
    var r = r0 + rnd() * (r1 - r0), a = rnd() * Math.PI * 2;
    return { x: edge ? (rnd() < 0.5 ? -r : w + r) : rnd() * w, y: rnd() * h, r: r,
             vx: Math.cos(a) * DRIFT_PX_S / 1000, vy: Math.sin(a) * DRIFT_PX_S / 1000 };
  }

  /* the field: deterministic in (seed, w, h). Returns the drops and the PRNG positioned after them, so a
     live consumer that respawns keeps drawing from the same stream. */
  function field(o) {
    var w = o.w, h = o.h, rnd = mulberry32(o.seed >>> 0);
    var r0 = (o.r || R)[0], r1 = (o.r || R)[1], n = count(w, h, o.pxPerDrop), drops = [];
    for (var i = 0; i < n; i++) drops.push(drop(rnd, w, h, r0, r1, false));
    return { drops: drops, rnd: rnd, spawn: function (edge) { return drop(rnd, w, h, r0, r1, edge); }, count: function () { return n; } };
  }

  /* the still frame, as an SVG: one radial gradient per drop, hi at the core, lo at the rim. Colours
     come in from the caller's resolved tokens — this file carries no literal (L6). */
  function svg(f, o) {
    var w = o.viewW || f.w || 1200, h = o.viewH || f.h || 800, alpha = o.alpha === undefined ? 0.24 : o.alpha;
    var sx = w / (o.w || w), sy = h / (o.h || h);
    var defs = "", body = "";
    for (var i = 0; i < f.drops.length; i++) {
      var d = f.drops[i], id = "g" + i;
      defs += "<radialGradient id='" + id + "'><stop offset='0' stop-color='" + o.hi + "'/><stop offset='1' stop-color='" + o.lo + "'/></radialGradient>";
      body += "<circle cx='" + (d.x * sx).toFixed(1) + "' cy='" + (d.y * sy).toFixed(1) + "' r='" + (d.r * Math.min(sx, sy)).toFixed(1) + "' fill='url(#" + id + ")'/>";
    }
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + w + " " + h + "' preserveAspectRatio='none'>" +
      "<defs>" + defs + "</defs><g opacity='" + alpha + "'>" + body + "</g></svg>";
  }

  return { mulberry32: mulberry32, field: field, svg: svg, count: count, PX_PER_DROP: PX_PER_DROP, R: R, DRIFT_PX_S: DRIFT_PX_S };
})();
if (typeof module !== "undefined") module.exports = OCCVM_GLOBULES;
