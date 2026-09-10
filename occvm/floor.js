/* occvm/floor.js — the ambient floor (OCCVM-L13). One implementation, shared by every tool the law
 * grants it to.
 *
 * WHERE IT CAME FROM, AND WHY IT MOVED. This shipped inside Rhyme's tome-src/30_ui.jsx from 2.22
 * through 2.28 step 6, because L13's grant was Rhyme's alone and "a shared part must not carry what one
 * tool is withheld" — that sentence is in 2.25's own comment and it was right at the time. L13 is
 * amended at 2.31: BTC Terminal is granted the floor on its page ground. Two tools, one behaviour, so
 * one owner (L3). What did NOT move is `useAmbientFloor`, the ten-line React lifecycle wrapper: it is
 * Rhyme's, it is React, and OCCVM's parts are CSS and framework-free JS.
 *
 * THE SCOPE IS STILL ASYMMETRIC AND THIS PART DOES NOT DECIDE IT. Rhyme runs it live on the draft face
 * and still on every other slab; BTC runs it on the page ground alone and never on a `.tile`, never on
 * the sweep, never on any surface CLAUDE.md §5 governs. The law says which surface; `law-audit.js`
 * measures it per tool; this file just renders.
 *
 * WHAT IS AUTHORED IS NAMED AUTHORED, and the defaults below are Rhyme's shipped values so that moving
 * the code changes nothing there. A caller may override `alpha` and `seed` — the two things that are
 * genuinely a property of the SURFACE rather than of the substance — and nothing else.
 */
(function (root) {
  "use strict";

  /* ---- authored constants ---------------------------------------------------------------------- */

  /* authored MAGNITUDE; the linearity above it is derived and confirmed (P-3, 2.22) */
  var MERGE_PX_S = 2.6;

  /* 2.24: 0.05 shipped as "read at the edge of vision or it is not a floor", measured at a median
     0.42 L*, and was an underlayer nobody could see while the crystal veins were what showed. As the
     SUBSTRATE LAYER it has to be seen. Measured on a live lookup slab, one frozen load, still frame,
     canvas toggled: 0.05 -> 0.78 L* mean over the moved 28%; 0.10 -> 1.43; 0.16 -> 2.20; 0.24 -> 3.21;
     0.32 -> 4.20 (max 24.6, competing with the text). 0.24 is chosen: the globules read as a field
     under the page, above the 1.08 the diffuse vein wash measures in BTC and below the 4.6 a beat
     strike reaches on the draft face, so the beat still stands out from the ground. Authored, and
     named as authored. It is the DEFAULT rather than the value, because a page ground under live
     numbers and a document face earn different weights (§7.6) and each tool measures its own. */
  var ALPHA = 0.24;

  /* fixed, so the field is the same field every session and can be recorded. A caller with its own
     session seed passes it; BTC does, so its live ground and its still tiles show one field. */
  var SEED = 0x0CCF1005;

  /* ---- 2.28 step 3: the buoyancy cycle ----------------------------------------------------------
   * The build plan's finding that reshapes this: a lava lamp is not one substance getting restless, it
   * is TWO IMMISCIBLE PHASES IN A HEAT-DRIVEN DENSITY RACE. The wax sits very slightly denser at rest;
   * heat expands it more than the carrier; past a crossover it becomes buoyant, rises, cools, becomes
   * dense again, sinks. **The motion is buoyancy. Rheology governs shape and merging, not drive** —
   * which is why the drift that shipped at 2.22 (a random constant direction per drop) was the wrong
   * model rather than a coarse one: it had no bottom, no top, and no turnaround.
   *
   * WHAT IS ADOPTED FROM THE SOURCE IS THE SHAPE. Gyure & Janosi, "Basics of lava-lamp convection",
   * Phys. Rev. E 80, 046307 (2009), a real two-fluid lab analog: warm blobs rise from the bottom,
   * ATTACH at the top surface, then sink again — rise, dwell, sink, dwell. They identify two modes, one
   * heat-transport limited and one **viscosity-limited with constant periodicity**; the constant-period
   * mode is the one taken, so every drop shares one period and differs only in phase, which is the
   * field's own seeded number rather than a fresh random per session.
   *
   * WHAT IS AUTHORED IS THE SPEED, AND THE SUBSTANCE SAYS THE SPEED IS ZERO. occvm/globules.js measures
   * it: at the density contrast the 30 px ceiling implies, the buoyant stress on a globule is 1.509 Pa
   * at r = 9 and 5.031 Pa at r = 30, against tau-0 = 21.15 — **14x short at the smallest drop in the
   * field, 4.2x at the largest**, and a globule would need a 126 px radius before buoyancy could move
   * it at all. That is not a reason to abandon the floor; L13 grants it and records the cost. It is a
   * reason to state the number rather than to reach for a derivation that returns zero.
   *
   * RISE_PX_S is therefore 1.4 — the same magnitude `OCCVM_GLOBULES.DRIFT_PX_S` has carried since 2.22,
   * now vertical and cyclic instead of random. The period FOLLOWS from it and the surface's own height
   * rather than being a second authored number: a drop crosses the face at that speed, so a tall face
   * cycles slowly and a short one quickly, which is what a taller vessel does. */
  var RISE_PX_S = 1.4;    /* authored: see above — the substance's own answer here is zero */
  var DWELL = 0.18;       /* authored: the share of each half-cycle spent attached at an end */

  /* 2.28 step 6 — HEAT MODULATES, IT DOES NOT GATE, and L13 named this case in advance: "a real value
     may scale a floor's intensity (Rhyme's --heat, read-only, is the obvious first one), but the floor
     is lawful at zero modulation, which is precisely why this is a grant and not a case of the
     gated-motion rule." WHAT IT MODULATES IS THE CONVECTION RATE, which is the one thing this model
     already has a heat-driven mechanism for: a lamp's bulb is its heat source and the cycle rate scales
     with it. At heat 0 the period is EXACTLY the unmodulated one — asserted by driving both, not by
     reading. BTC passes 0 and has nothing to pass instead; inventing a modulator to fill the slot is
     the error REACT-MAP names and this part does not make it. */
  var HEAT_GAIN = 0.6;    /* authored: the share of the base rate full heat adds */

  /* The substance's cessation curve for the turn at each end, sampled ONCE and LAZILY. `easing`
     integrates 4,000 steps and the curve is a property of the substance, not of the frame, so calling
     it per drop per frame would be the wrong price — but sampling it at LOAD is the 2.0 defect: the
     splicer inserts parts after one anchor, so they land in reverse list order, and a part that
     captures a sibling's global while the file evaluates gets whatever was there at that instant. That
     is exactly how `fracture.js` captured a null `OCCVM_VEINS` and threw on every call in the browser
     while Node's `require` resolved it and every assertion passed. Sampled on first use, the ordering
     cannot silently degrade this to the straight-ramp fallback. */
  var EASE, EASE_TRIED = false;
  function ease(x) {
    if (!EASE_TRIED) {
      EASE_TRIED = true;
      try { EASE = OCCVM_RHEOLOGY.easing(OCCVM_RHEOLOGY.SUBSTANCE, 1, 33); } catch (e) { EASE = null; }
    }
    if (!EASE) return Math.max(0, Math.min(1, x));       /* no substance spliced: straight ramp */
    var t = Math.max(0, Math.min(1, x)) * (EASE.length - 1), i = Math.floor(t), f = t - i;
    return i >= EASE.length - 1 ? EASE[EASE.length - 1]
         : EASE[i] + (EASE[i + 1] - EASE[i]) * f;
  }

  /* one drop's height in its cycle: 0 at the bottom of the travel, 1 at the top — rise, attach, sink,
     rest, with the turn at each end on the substance's own cessation curve rather than an invented
     ease. It is exactly 0 only while resting at the bottom, which is what lets it BE the coil predicate
     as well as the position: no authored coil height, because step 3 already put one there. */
  function cyclePos(u) {
    var half = 0.5, move = half * (1 - DWELL);
    if (u < move) return ease(u / move);                      /* rising  */
    if (u < half) return 1;                                   /* attached at the top */
    if (u < half + move) return 1 - ease((u - half) / move);  /* sinking */
    return 0;                                                 /* resting at the bottom */
  }

  /* P-3's confirmed law, on its own so it can be driven rather than read. Linear in t, and the guard
     proves linearity by doubling rather than by matching the source text: r(2t) = 2*r(t), which sqrt(t)
     does not satisfy and which is the one substitution anybody is likely to make here. */
  function bridgeRadius(ms) { return MERGE_PX_S * Math.max(0, ms) / 1000; }

  /* ---- the floor ---------------------------------------------------------------------------------
   * ambientFloor(canvas, still, heat, opts) -> stop
   *   still  truthy paints one frame and starts no rAF at all (L8: reduced motion is a STATIC FRAME,
   *          never a slower floor)
   *   heat   read-only [0,1]; 0 is lawful and is what a tool with nothing to pass passes
   *   opts   { alpha, seed } — the surface's own two properties. Nothing else is overridable: the
   *          substance is not the caller's to retune.
   * The returned stop carries `.setHeat(v)` and `.ok`. `.ok` is true on both real paths and absent on
   * all three refusals above — not decoration: a caller that hides its own fallback layer once the
   * floor takes over needs to tell "the floor has this surface" from "the floor declined", or a
   * refusal shows as a blank ground and nothing says so. It deliberately does NOT mean a frame has
   * landed, because on the live path none has; a flag claiming otherwise would be the kind of
   * near-true name this system keeps having to correct.  */
  function ambientFloor(canvas, still, heat, opts) {
    if (!canvas || !canvas.getContext) return function () {};
    /* named, not aliased: the L10 auditor measures the consumer by this call */
    if (typeof OCCVM_GLOBULES === "undefined" || !OCCVM_GLOBULES.field) return function () {};
    opts = opts || {};
    var alpha = typeof opts.alpha === "number" ? opts.alpha : ALPHA;
    var seed = typeof opts.seed === "number" ? opts.seed : SEED;

    var ink = (function () {
      try {
        var cs = getComputedStyle(document.documentElement);
        var hi = (cs.getPropertyValue("--vein-hi") || "").trim();
        var lo = (cs.getPropertyValue("--vein-lo") || "").trim();
        return /^#[0-9a-f]{6}$/i.test(hi) && /^#[0-9a-f]{6}$/i.test(lo) ? [hi, lo] : null;
      } catch (e) { return null; }
    })();
    if (!ink) return function () {};

    /* 2.28 — METABALL RENDERING, the build plan's own first recommendation and the same threshold BTC's
       still frame uses. `OCCVM_GLOBULES.gooFilter` is the one definition; here it goes into a hidden
       <svg> in the document and the canvas names it, so the live floor and every still slab cut their
       isosurface at the same level. What it buys is not the silhouette — it is that overlapping fields
       ADD, so two approaching drops join with no merge code at all. */
    var gooId = (function () {
      try {
        var id = "occvm-goo";
        if (!document.getElementById(id)) {
          var host = document.createElement("div");
          host.setAttribute("aria-hidden", "true");
          host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
          host.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg'><defs>" +
            OCCVM_GLOBULES.gooFilter({ id: id }) + "</defs></svg>";
          document.body.appendChild(host);
        }
        return id;
      } catch (e) { return null; }
    })();

    /* a box rather than a captured value, so a changed reading reaches the running floor without the
       floor being torn down and reseeded — a field that reshuffled every time the writing changed would
       be a floor nobody could look at */
    var heatRef = { v: heat };
    var ctx = canvas.getContext("2d"), fld = null;
    var w = 0, h = 0, pw = 0, ph = 0, dpr = 1, drops = [], welds = [], raf = 0, last = 0, clock = 0;

    function count() { return fld ? fld.count() : 3; }
    function spawn(seedEdge) { return fld.spawn(seedEdge); }

    function size() {
      var box = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(box.width)); h = Math.max(1, Math.round(box.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!drops.length) { fld = OCCVM_GLOBULES.field({ seed: seed, w: w, h: h }); drops = fld.drops.slice(); }
      else if (pw && ph && (pw !== w || ph !== h))
        for (var j = 0; j < drops.length; j++) { drops[j].x *= w / pw; drops[j].y *= h / ph; }
      pw = w; ph = h;
    }

    function blob(c2, d, a) {
      var g = c2.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      g.addColorStop(0, ink[0]); g.addColorStop(1, ink[1]);
      c2.globalAlpha = a; c2.fillStyle = g;
      c2.beginPath(); c2.arc(d.x, d.y, d.r, 0, Math.PI * 2); c2.fill();
    }

    /* at the coil = resting at the bottom of the cycle, which cyclePos returns exactly 0 for. It reads
       this instance's own clock, so unlike cyclePos it is not a pure curve and stays inside. */
    function atCoil(d, period) {
      if (d.phase === undefined) return true;
      return cyclePos(((clock / period) + d.phase) % 1) === 0;
    }

    function step(dt) {
      var i, j;
      /* 2.28 — the cycle's period follows from the authored speed and the surface's own height, so the
         floor keeps its pace on a face of any size rather than carrying a second authored constant. */
      var travel = Math.max(1, h);
      /* READ-ONLY, and clamped here rather than trusted: the floor never writes --heat and never decides
         what it means. At heat 0 this is exactly the unmodulated period. */
      var hx = Math.max(0, Math.min(1, +heatRef.v || 0));
      var period = 2 * (travel / (RISE_PX_S * (1 + HEAT_GAIN * hx))) * 1000 / (1 - DWELL);
      clock += dt;
      for (i = 0; i < drops.length; i++) {
        var d = drops[i];
        d.x += d.vx * dt;                                        /* the lateral wander a real lamp shows */
        if (d.x < -d.r * 2) d.x = w + d.r; else if (d.x > w + d.r * 2) d.x = -d.r;
        if (d.merging) continue;                                 /* a welding pair is driven by the weld */
        if (d.lockedTo) continue;                                /* a follower lobe is placed below */
        var u = ((clock / period) + (d.phase === undefined ? 0 : d.phase)) % 1;
        d.y = (h - d.r) - cyclePos(u) * (h - 2 * d.r);
      }
      /* the follower lobes, after every leader has moved: a frozen bridge holds its offset exactly */
      for (i = 0; i < drops.length; i++) {
        var f = drops[i];
        if (f.lockedTo) { f.x = f.lockedTo.x + f.dx; f.y = f.lockedTo.y + f.dy; }
      }
      for (i = 0; i < welds.length; i++) {
        var wd = welds[i];
        wd.t += dt; wd.rb = bridgeRadius(wd.t);              /* r proportional to t — the derived half */
        if (wd.rb >= wd.target) {
          var a = wd.a, b = wd.b;
          if (wd.arrests) {
            /* 2.28 step 5 — IT FREEZES. The bridge reached the height the Bingham number allows and the
               yield stress holds it there: "the effect of the yield stress evident only in its final
               arrested shape". The pair does NOT become one drop. It stays two lobes locked at the
               separation they froze at, which is what a frozen dumbbell IS, and it answers the build
               plan's open accumulation question without inventing a rule: an arrested pair is one stuck
               object, so it drifts off on the cycle rather than piling up at the coil. It also cannot
               grow without bound — a pair that has arrested is done, and a third arrival would need the
               bridge to grow again against a yield stress that already stopped it. */
            a.locked = b.locked = true; a.merging = b.merging = false;
            /* ONE RIGID OBJECT, not two drops that agree to move alike. The first draft gave the
               follower the leader's phase and let it compute its own height — and because that height
               depends on the drop's own radius, two lobes of different size drifted apart over the
               cycle. A frozen bridge does not stretch: the follower's position is the leader's plus the
               offset they froze at, and nothing else. */
            b.lockedTo = a; b.dx = b.x - a.x; b.dy = b.y - a.y;
            welds.splice(i--, 1);
            continue;
          }
          /* 2.28 — the conservation convention is the SHARED field's, not this file's. It shipped as
             area (r2 = r1^2 + r2^2); occvm/globules.js decides volume (r3 = r1^3 + r2^3) and records
             why, and the arrest boundaries are computed against that choice, so two conventions would
             put the renderer and the physics on different drops. Centres weight by the same power. */
          var P = OCCVM_GLOBULES.MERGE_POWER;
          var wa = Math.pow(a.r, P), wb = Math.pow(b.r, P), m = wa + wb;
          a.x = (a.x * wa + b.x * wb) / m; a.y = (a.y * wa + b.y * wb) / m;
          a.r = OCCVM_GLOBULES.merged(a.r, b.r); a.merging = false; b.gone = true;
          welds.splice(i--, 1);
          drops = drops.filter(function (x) { return !x.gone; });
          while (drops.length < count()) drops.push(spawn(true));
        }
      }
      /* 2.28 step 4 — RECOMBINATION HAPPENS AT THE COIL, not wherever two globules touch.
         A real lava lamp carries a metallic wire coil at the base acting as a surface-tension breaker,
         recombining cooled wax after it descends; free-floating pairwise merging anywhere on screen is
         the easier build and is not what the object does. The coil determines WHERE globules meet;
         tau-0 determines WHAT the meeting produces.
         The coil needs no geometry and no authored height here, because step 3 already put one at the
         bottom: a drop is at the coil exactly when it is in the bottom dwell of its cycle. Two drops
         can only begin a weld while both are resting there, which is when a real lamp's wax pools. */
      for (i = 0; i < drops.length; i++) for (j = i + 1; j < drops.length; j++) {
        var p = drops[i], q = drops[j];
        if (p.merging || q.merging || p.locked || q.locked) continue;
        if (!atCoil(p, period) || !atCoil(q, period)) continue;
        if (Math.hypot(p.x - q.x, p.y - q.y) > p.r + q.r) continue;
        /* the substance decides the outcome BEFORE the bridge starts growing, from the radii alone —
           so the same weld renders a completion or a freeze without a branch appearing mid-merge */
        var reg = OCCVM_GLOBULES.arrestRegime(p.r, q.r);
        var lobe = Math.min(p.r, q.r);
        p.merging = q.merging = true;
        welds.push({ a: p, b: q, t: 0, rb: 0, arrests: reg !== "completes",
                     target: lobe * OCCVM_GLOBULES.arrestedBridge(p.r, q.r) });
      }
    }

    /* THE WEIGHT GOES OUTSIDE THE FILTER, and getting that wrong erases the floor completely.
       The isosurface cuts at alpha 0.5 (Blinn). Drawing the blobs AT the display weight of 0.24 puts
       the whole field below the cut, so the threshold deletes it: measured in Chromium on a 25 px disc,
       filtered at alpha 0.24 gives max alpha 0 over 0 non-zero pixels, against 255 over 1,804 at
       alpha 1. The first version of this shipped that way and the screenshot did not show it — the slab
       it was measured on has the floor behind opaque controls, so "looks the same" and "is gone" were
       the same picture. Caught by probing the pixels rather than by looking.
       BTC's still frame never had the bug because its `<g opacity>` wraps the FILTERED group; the canvas
       needs the same shape, so the field is drawn opaque on an offscreen buffer, thresholded there, and
       composited at the weight. One extra canvas, no extra field. */
    var buf = null, bctx = null, iso = null, ictx = null;
    function paint() {
      ctx.clearRect(0, 0, w, h);
      var i, filtered = false;
      if (gooId) {
        try {
          if (!buf) { buf = document.createElement("canvas"); bctx = buf.getContext("2d"); }
          if (buf.width !== canvas.width || buf.height !== canvas.height) { buf.width = canvas.width; buf.height = canvas.height; }
          bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          bctx.clearRect(0, 0, w, h);
          bctx.filter = "none";
          ctx.filter = "url(#" + gooId + ")";
          filtered = ctx.filter !== "none";
          ctx.filter = "none";
        } catch (e) { filtered = false; }
      }
      if (filtered) {
        /* 2.33 — THE FILTER GOES ON THE COMPOSITE, NOT ON EACH DROP, and until now it went on each
           drop. `ctx.filter` filters every DRAWING OPERATION separately, so N fills through a set
           filter is N independent blur-and-threshold passes composited afterwards — which is not a
           metaball field at all. Fields cannot add if each one is thresholded before the addition.
           Measured on two r=24 discs at the midpoint between them: per-draw-call gives alpha 0 at
           EVERY gap including zero, one composite gives 255 out to a 6 px gap. 2.28's claim that
           "two approaching drops join with no merge code" was true of the design and false of the
           canvas; BTC's still frame never had it, because an SVG `<g filter>` wraps the rendered
           group, which is the summed field by construction. The two paths were asserted to cut at
           the same level and did not.
           THE WEIGHT NEEDS ITS OWN STEP, and reading the spec instead of driving it got this wrong
           once already in the writing of this very change: `globalAlpha` on a filtered drawImage is
           applied BEFORE the filter, not after, so setting it on the way out re-created 2.28's
           erasure exactly — measured, one r=25 drop at alpha 0.2 gave max alpha 0 over 0 non-zero
           pixels, against 255 over 1,804 at alpha 1. Hence two buffers and not one: the drops are
           drawn opaque, filtered opaque into a second buffer, and only THEN composited at the
           weight. Still one filtered operation per frame.
           It is also 3,278x cheaper, which is not a side benefit so much as the same fact: one
           filtered operation per frame instead of one per drop. Measured at 390x844 with 37 drops,
           196.67 ms/frame became a single composite. */
        for (i = 0; i < drops.length; i++) blob(bctx, drops[i], 1);
        bctx.globalAlpha = 1;
        if (!iso) { iso = document.createElement("canvas"); ictx = iso.getContext("2d"); }
        if (iso.width !== canvas.width || iso.height !== canvas.height) { iso.width = canvas.width; iso.height = canvas.height; }
        ictx.setTransform(1, 0, 0, 1, 0, 0);
        ictx.clearRect(0, 0, iso.width, iso.height);
        ictx.globalAlpha = 1;
        ictx.filter = "url(#" + gooId + ")";     /* ONE filtered operation, over the summed field */
        ictx.drawImage(buf, 0, 0);
        ictx.filter = "none";
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = alpha;                 /* and the weight, outside the isosurface */
        ctx.drawImage(iso, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else {
        /* no SVG-filter support on a 2D context: the unthresholded field, which is what shipped at 2.25.
           A degradation, never a blank — the same rule L8 applies to reduced motion. */
        for (i = 0; i < drops.length; i++) blob(ctx, drops[i], alpha);
      }
      ctx.globalAlpha = 1;
    }

    size();
    if (still) { paint(); var stillStop = function () {}; stillStop.ok = true; return stillStop; }
    last = performance.now();
    var frame = function (t) {
      var dt = Math.min(100, t - last); last = t;
      step(dt); paint();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    /* The surface GROWS. Rhyme's `.bars` is nearly empty at mount and gains a row per bar, so a single
       measurement at mount plus a window-resize listener sizes the floor to whatever the draft happened
       to be when the component appeared — measured in Chromium at 356x44 px against a face several
       times that, a floor that every assertion passed and that was the wrong size on screen. A
       ResizeObserver on the element is the measurement that tracks the thing it measures. */
    var onResize = function () { size(); };
    window.addEventListener("resize", onResize);
    var ro = null;
    if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(onResize); ro.observe(canvas.parentNode || canvas); }
    var stop = function () {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (ro) ro.disconnect();
    };
    stop.setHeat = function (v) { heatRef.v = v; };
    stop.ok = true;
    return stop;
  }

  root.OCCVM_FLOOR = {
    ambientFloor: ambientFloor,
    cyclePos: cyclePos, ease: ease, bridgeRadius: bridgeRadius,
    MERGE_PX_S: MERGE_PX_S, ALPHA: ALPHA, SEED: SEED,
    RISE_PX_S: RISE_PX_S, DWELL: DWELL, HEAT_GAIN: HEAT_GAIN,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
if (typeof module !== "undefined" && module.exports) module.exports = OCCVM_FLOOR;
