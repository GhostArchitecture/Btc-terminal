/* OCCVM 2.8 — yield. The shared BEHAVIOUR primitive for irreversible actions (OCCVM-L11), second basis.
 *
 * Authored in occvm/SPINE.md; spliced into a tool by occvm/tools/splice-spine.js. Do not hand-edit the
 * spliced copy — the next splice reverts it silently.
 *
 * Replaces occvm/fracture.js. A crystal past its limit CLEAVES along a plane its lattice decides; that
 * primitive split the element along aragonite's {110} angle and torqued the halves apart. A fluid has
 * no plane and no angle. What a yield-stress fluid does past its limit is YIELD: below τ₀ it holds and
 * nothing moves, at τ₀ it flows, and a filament of it that is pulled thins at one point — capillary
 * necking — until it PINCHES OFF into two bodies that retract from the break and come to rest. Three
 * phases, hold → neck → pinch-off, and the last is the one that makes the event irreversible: a
 * filament that has pinched does not rejoin.
 *
 * WHAT THE PRIMITIVE KEEPS FROM FRACTURE, because it was right for reasons that survive the substance:
 * a destructive action must not share a physical vocabulary with a reversible one. Everything else in
 * these tools fades, slides or settles, and those are elastic behaviours — elastic behaviour implies
 * the thing could come back. No fade at any point: yielded material does not become transparent, it
 * becomes absent. Two clones carrying the element's RESOLVED style, so an #id-styled element does not
 * pinch blank (1.1b's lesson, kept verbatim). Reduced motion honoured from the spine's rule. Seeded off
 * the element, so a replayed deletion looks the same and the golden set can pin one.
 *
 * WHAT DISTINGUISHES IT FROM THE ELASTIC VOCABULARY, now that speed does not. Fracture claimed "faster
 * than any elastic curve", and a fluid has no reason to be quick. The distinction is the STOP. Every
 * elastic easing in the system approaches rest asymptotically and never technically arrives; a
 * yield-stress fluid stops in finite time, at an exact instant, with the velocity reaching zero rather
 * than tending to it (rheology.js, `cessation`). The retraction here runs on that curve — sampled from
 * the integrated Herschel-Bulkley decay and handed to CSS as `linear()` — and it is the only motion in
 * either tool that ends. That is the vocabulary.
 *
 * WHAT IS AUTHORED, named. The roadmap wanted the duration derived from γ̇ = ((τ−τ₀)/k)^(1/n). With
 * n = 0.19 that exponent is 5.26 and a 100× range in stress spans 1.9e18 in rate: no monotone map from
 * that onto a few hundred milliseconds exists that is not doing all the work itself (rheology.js, 2.5).
 * So the millisecond counts below are authored, as fracture's 220 ms was, and the SHAPE of the
 * retraction is derived. The hold phase is zero for a click-driven action: the click is the stress, and
 * it is above τ₀ by definition — that is what makes it a deletion. A hold that is visible would read as
 * lag, not as a material refusing to move.
 *
 * SCOPE IS THE DISCIPLINE. Irreversible only — delete, discard, disconnect. Never a cancel, never a
 * dismiss, never a close. A vocabulary that marks everything marks nothing.
 */
var OCCVM_YIELD = (function () {
  "use strict";

  /* The substance, resolved at CALL time and never at load. fracture.js captured its dependency into a
     module binding while its IIFE ran; the splicer lands parts in reverse list order, so the binding was
     null in every browser and cleave() threw on every call for a release and a half while Node resolved
     it through require. A lazy read is order-independent, which is the property this needs. No fallback
     to a literal: a curve typed here would be a second copy of the derivation. */
  function substance() {
    var r = (typeof OCCVM_RHEOLOGY !== "undefined" && OCCVM_RHEOLOGY) ? OCCVM_RHEOLOGY
          : (typeof require !== "undefined" ? require("./rheology.js") : null);
    if (!r) throw new Error("occvm yield: rheology.js is not spliced beside this — no substance to yield");
    return r;
  }

  /* Authored, and named as authored: the thinning and the retraction, in milliseconds. */
  var NECK_MS = 140;
  var RETRACT_MS = 260;
  /* v₀ in the model's own units. It fixes the regime (rheology.js: k·v₀ⁿ/τ₀) and with it the exponent of
     the ease-out; at the substance's τ₀ any v₀ under ~3,000 is yield-dominated and the curve is the
     quadratic with a hard stop. Open item #12 stands: nothing maps a click onto this number. */
  var V0 = 1;

  function reduced() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(s) {
    var n = 2166136261;
    for (var i = 0; i < s.length; i++) { n ^= s.charCodeAt(i); n = Math.imul(n, 16777619); }
    return n >>> 0;
  }

  /* The neck. The filament is the element's width; it thins at one point along it, `at` (percent of
     width), and the two bodies either side taper toward that point. Returned as the two clip polygons,
     in percent, for a given taper `t` (0 = untouched rectangle, 1 = drawn to a point). Same vertex
     count at every t, so CSS interpolates the polygon rather than snapping. */
  function halves(at, t) {
    var tp = 50 * t;                            /* how far each corner at the neck has moved toward mid-height */
    var L = "polygon(0% 0%," + at + "% " + tp + "%," + at + "% 50%," + at + "% " + (100 - tp) + "%,0% 100%)";
    var R = "polygon(100% 0%," + at + "% " + tp + "%," + at + "% 50%," + at + "% " + (100 - tp) + "%,100% 100%)";
    return [L, R];
  }

  /* the retraction's easing, from the substance — the one place the curve is decided */
  function easing() {
    var r = substance();
    return r.cssEasing(r.SUBSTANCE, V0);
  }

  /* pinch(el, done): the element necks at a point along its width, pinches off, and the two bodies
   * retract from the break on the cessation curve and STOP.
   *
   * Cloned twice rather than animated in place, because one box cannot move in two directions. The
   * original is hidden on the same frame the clones appear, so nothing is ever visible twice. */
  function pinch(el, done) {
    if (!el || !el.getBoundingClientRect) { if (done) done(); return; }
    var box = el.getBoundingClientRect();
    if (!box.width || !box.height) { if (done) done(); return; }

    if (reduced()) {                       /* the floor is the law's, not this primitive's */
      el.style.visibility = "hidden";
      if (done) done();
      return;
    }

    var seed = hash((el.id || "") + "|" + Math.round(box.width) + "x" + Math.round(box.height));
    var rnd = rng(seed);
    /* the neck forms somewhere in the middle third: a filament thins where it is thinnest, and a
       jittered point keeps two deletions of the same thing from pinching identically */
    var at = 35 + rnd() * 30;
    var whole = halves(at, 0), necked = halves(at, 1);
    var curve = easing();

    var host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;left:" + box.left + "px;top:" + box.top + "px;width:" +
      box.width + "px;height:" + box.height + "px;pointer-events:none;z-index:9999";

    var computed = window.getComputedStyle(el);
    for (var i = 0; i < 2; i++) {
      var part = el.cloneNode(true);
      part.removeAttribute("id");
      for (var k = 0; k < computed.length; k++) {
        var prop = computed[k];
        part.style.setProperty(prop, computed.getPropertyValue(prop));
      }
      part.style.cssText += ";position:absolute;left:0;top:0;margin:0;width:100%;height:100%" +
        ";clip-path:" + whole[i] +
        ";transition:clip-path " + NECK_MS + "ms linear,transform " + RETRACT_MS + "ms " + curve + " " + NECK_MS + "ms";
      host.appendChild(part);
    }
    document.body.appendChild(host);
    el.style.visibility = "hidden";

    requestAnimationFrame(function () {
      var kids = host.children;
      for (var i = 0; i < kids.length; i++) {
        /* the neck draws in, then each body retracts AWAY from the break along the filament's own axis —
           surface tension pulling a severed thread back into itself. No rotation: a fluid body has no
           edge to torque about. The retraction is a fraction of the body's own length, so a short
           element does not fly. */
        var s = i ? 1 : -1;
        var reach = box.width * (i ? (100 - at) : at) / 100;
        kids[i].style.clipPath = necked[i];
        kids[i].style.transform = "translateX(" + (s * reach * 0.55).toFixed(1) + "px)";
      }
    });

    setTimeout(function () {
      if (host.parentNode) host.parentNode.removeChild(host);
      if (done) done();
    }, NECK_MS + RETRACT_MS + 20);
  }

  return { pinch: pinch, halves: halves, easing: easing, NECK_MS: NECK_MS, RETRACT_MS: RETRACT_MS, V0: V0 };
})();
if (typeof module !== "undefined") module.exports = OCCVM_YIELD;
