/* OCCVM 1.1b — fracture. The first shared BEHAVIOUR primitive (OCCVM-L11).
 *
 * Authored in occvm/SPINE.md; spliced into a tool by occvm/tools/splice-spine.js. Do not hand-edit the
 * spliced copy — the next splice reverts it silently.
 *
 * A destructive action should not share a physical vocabulary with a reversible one. Everything else in
 * these tools fades, slides or settles; those are elastic behaviours, and elastic behaviour implies the
 * thing could come back. Aragonite does not deform past its limit — it CLEAVES, along fixed planes, at
 * an angle its own lattice decides, the moment stress exceeds a threshold. That is a different event, and
 * irreversible actions are a different event.
 *
 * THE ANGLE IS NOT CHOSEN. It is 2·arctan(b/a) from the unit cell — the {110} composition-plane angle of
 * the same cyclic twin the vein generator grows — imported from occvm/veins.js rather than recomputed,
 * because two derivations of one angle is the defect OCCVM-L3 exists to prevent, one material down. An
 * eyeballed crack is decoration wearing this primitive's clothes; the whole extension passes its own test
 * only if the angle is the mineral's.
 *
 * SCOPE IS THE DISCIPLINE. Irreversible only — delete, discard, disconnect. Never a cancel, never a
 * dismiss, never a close. A vocabulary that marks everything marks nothing, and this one exists to say
 * "that is not coming back" in a language the rest of the system deliberately does not speak.
 */
var OCCVM_FRACTURE = (function () {
  "use strict";

  var RAD = Math.PI / 180;
  /* The mineral's own angle, from the generator that already derives it — and from NOWHERE ELSE.
   *
   * This began as `... || 116.209`, a fallback for when the generator is absent. A guard written one
   * commit later caught it: that literal is a second copy of the angle, which is the exact thing this
   * primitive's header promises it does not have, and in Node it silently *was* the value while the
   * browser used the real one. A fallback that quietly disagrees with its source is worse than no
   * fallback. If the generator is not spliced beside this, that is a splice failure and it should be
   * loud.
   *
   * RESOLVED AT CALL TIME, NOT AT LOAD. The first version captured OCCVM_VEINS into a module-scope
   * binding while this IIFE ran, and that is wrong in the browser for a reason nothing in Node can show:
   * the splicer inserts each part after the same anchor, so parts land in reverse list order and this
   * file is evaluated BEFORE veins.js is assigned. `typeof OCCVM_VEINS` was therefore "undefined" at
   * capture, the require branch does not exist in a page, and the binding was null — so cleave() threw
   * on every call from the moment 1.1b shipped. Node resolved it through require and every assertion
   * passed. A lazy read is order-independent, which is the property this actually needs. */
  function twinAngle() {
    var v = (typeof OCCVM_VEINS !== "undefined" && OCCVM_VEINS) ? OCCVM_VEINS
          : (typeof require !== "undefined" ? require("./veins.js") : null);
    if (!v || !v.TWIN_ANGLE) throw new Error("occvm fracture: veins.js is not spliced beside this — no angle to cleave on");
    return v.TWIN_ANGLE;
  }

  /* 220ms, fixed, and deliberately faster than any elastic curve in the system. Fracture is sudden by
     definition; sharing a duration with a settle would put it back in the vocabulary it exists to leave. */
  var MS = 220;

  function reduced() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  /* mulberry32 again rather than Math.random: a fracture is seeded off the element so a given deletion
     looks the same if it is replayed, and the golden set can pin one. */
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

  /* The split line, in the element's own box: a line at the twin angle through a jittered centre.
   * Returned as the two clip polygons, each a half-plane intersected with the box, in percent. */
  function halves(angleDeg, offset) {
    var t = Math.tan(angleDeg * RAD);
    /* y = t·(x − 50) + (50 + offset), in percent coordinates; solve at both box edges */
    var yAt = function (x) { return t * (x - 50) + (50 + offset); };
    var y0 = yAt(0), y100 = yAt(100);
    /* clamp the traversal to the box and take the two sides of it */
    var a = ["0% " + y0 + "%", "100% " + y100 + "%", "100% -60%", "0% -60%"];
    var b = ["0% " + y0 + "%", "100% " + y100 + "%", "100% 160%", "0% 160%"];
    return ["polygon(" + a.join(",") + ")", "polygon(" + b.join(",") + ")"];
  }

  /* cleave(el, done): the element splits along the mineral's angle and the two halves torque apart.
   *
   * The element is cloned twice rather than animated in place, because one box cannot move in two
   * directions. The original is hidden on the same frame the clones appear, so nothing is ever visible
   * twice. No fade at any point: cleaved material does not become transparent, it becomes absent, and a
   * fade here would put the elastic vocabulary back into the one event that is meant to be without it. */
  function cleave(el, done) {
    if (!el || !el.getBoundingClientRect) { if (done) done(); return; }
    var box = el.getBoundingClientRect();
    if (!box.width || !box.height) { if (done) done(); return; }

    if (reduced()) {                       /* the floor is the law's, not this primitive's (L8) */
      el.style.visibility = "hidden";
      if (done) done();
      return;
    }

    var seed = hash((el.id || "") + "|" + Math.round(box.width) + "x" + Math.round(box.height));
    var rnd = rng(seed);
    /* ±8% of the shorter dimension, so two deletions of the same thing do not cleave identically */
    var offset = (rnd() * 16 - 8);
    var ang = twinAngle() - 90;            /* the composition plane, as a screen-space slope */
    var poly = halves(ang, offset);

    var host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;left:" + box.left + "px;top:" + box.top + "px;width:" +
      box.width + "px;height:" + box.height + "px;pointer-events:none;z-index:9999";

    /* THE CLONE MUST CARRY ITS COMPUTED STYLE, NOT ITS MARKUP.
     *
     * The first version cloned the node and stripped its id — necessary, because two elements with one
     * id is invalid and breaks getElementById — and the halves rendered BLANK. Everything an `#id`
     * selector had been giving the element (its background, its border, its whole surface) was supplied
     * by a rule that no longer matched. Every JS assertion still passed: two clones, opposite torque, no
     * fade, host cleaned up. It was only visible by looking at the frame.
     *
     * Copying the resolved style instead is indifferent to how the element was selected — id, class,
     * inheritance, inline — so a fracture looks like the thing that fractured whatever the tool's CSS
     * happens to be. Layout properties are overridden afterwards, because the halves are positioned by
     * this primitive rather than by the page they came from. */
    var computed = window.getComputedStyle(el);
    var norm = { x: Math.cos(ang * RAD), y: Math.sin(ang * RAD) };
    for (var i = 0; i < 2; i++) {
      var part = el.cloneNode(true);
      part.removeAttribute("id");
      for (var k = 0; k < computed.length; k++) {
        var prop = computed[k];
        part.style.setProperty(prop, computed.getPropertyValue(prop));
      }
      part.style.cssText += ";position:absolute;left:0;top:0;margin:0;width:100%;height:100%" +
        ";clip-path:" + poly[i] + ";transition:transform " + MS + "ms cubic-bezier(.15,.7,.4,1)";
      host.appendChild(part);
    }
    document.body.appendChild(host);
    el.style.visibility = "hidden";

    /* separate along the split normal, each half torquing — real cleavage does not slide parallel */
    requestAnimationFrame(function () {
      var kids = host.children;
      for (var i = 0; i < kids.length; i++) {
        var s = i ? 1 : -1;
        var dx = -norm.y * s * (box.height * 0.22 + 10);
        var dy = norm.x * s * (box.height * 0.22 + 10);
        kids[i].style.transform =
          "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) rotate(" + (s * (2 + rnd() * 4)).toFixed(2) + "deg)";
      }
    });

    setTimeout(function () {
      if (host.parentNode) host.parentNode.removeChild(host);
      if (done) done();
    }, MS + 20);
  }

  return { cleave: cleave, halves: halves, twinAngle: twinAngle, MS: MS };
})();
if (typeof module !== "undefined") module.exports = OCCVM_FRACTURE;
