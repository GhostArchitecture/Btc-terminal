/* react/Floor.js — the ambient floor on this tool's page ground (OCCVM-L13, amended at 2.31).
 *
 * WHAT CHANGED IN THE LAW, because the code is downstream of it. L13 withheld ambient motion from this
 * tool outright from 2.15 to 2.30: "from the canvas and every surface §5 governs, because every moving
 * mark on the sweep means something and a drifting decorative mass drawn from PAL beside marks that
 * carry win/lose is §7.6's noise-as-opportunity trade." That reasoning is not repealed and is not
 * weakened — it is the reason the grant is SURFACE-BOUNDED rather than tool-wide. The floor runs on the
 * page ground and nowhere else: not on a `.tile`, not on the sweep canvas, not on anything §5 governs.
 * Every tile keeps the still field it has carried since 2.25. The amendment, its cost and the owner's
 * decision are in SPINE.md L13; `law-audit.js` measures the boundary rather than trusting this comment.
 *
 * WHAT THIS FILE IS. Ten lines of lifecycle around `OCCVM_FLOOR.ambientFloor` — the same shape as
 * Rhyme's `useAmbientFloor`, which is why the floor itself is a shared part and this is not. Nothing
 * here decides physics, weight or colour: the field is `OCCVM_GLOBULES`', the cycle is `occvm/floor.js`',
 * the ink is the palette's, and the only two values this tool supplies are the two that are properties
 * of a SURFACE rather than of the substance — its own weight and its own session seed.
 *
 * HEAT IS ZERO AND STAYS ZERO. L13's modulation clause names Rhyme's `--heat` as the obvious first real
 * value and says the floor is lawful at zero modulation. This tool has no drone depth and no equivalent
 * measured value, and REACT-MAP is explicit that it "should not invent one to fill the slot" — a
 * modulator manufactured to have something to attach is the same error as a trigger manufactured to fit
 * a hook. Zero, passed literally, guarded as literal.
 */
(function () {
  "use strict";

  /* THE GROUND'S OWN WEIGHT, measured on this tool's own ground exactly as GLOBULE_ALPHA was at 2.25.
     It is not a spine constant and it is not Rhyme's 0.24: a page ground under live numbers earns less
     than a document face (§7.6), and the two surfaces composite differently — the still frame reaches
     the page as an SVG at GLOBULE_ALPHA inside `<g opacity>` behind a pseudo-element at opacity .55,
     while the canvas composites once. The number below is chosen from a sweep against what that stack
     renders today, so the ground's weight does not move when it starts moving. See CLAUDE.md §13.7. */
  var GROUND_ALPHA = 0.20;

  function Floor() {
    var e = React.createElement;
    var ref = React.useRef(null);
    React.useEffect(function () {
      var el = ref.current;
      if (!el || typeof OCCVM_FLOOR === "undefined") return;
      /* L8, unchanged and reaffirmed by L13: reduced motion is a STATIC FRAME, never a slower floor.
         `still` is the same branch Rhyme's off-draft slabs take, so one code path serves both. */
      var stop = OCCVM_FLOOR.ambientFloor(el, reducedMotion(), 0,
        { alpha: GROUND_ALPHA, seed: SESSION >>> 0 });
      /* The still frame under `body::before` is the fallback, and it is only retired once the floor
         has actually taken the surface. `.ok` is absent on all three of the part's refusals — no
         canvas, no field generator, no resolved palette — and in each of those the ground must keep
         the layer it already had rather than going blank because a decoration declined. */
      if (stop && stop.ok) document.documentElement.classList.add("floorlive");
      return function () {
        if (stop) stop();
        document.documentElement.classList.remove("floorlive");
      };
    }, []);
    return e("canvas", { id: "occvm-floor", ref: ref, "aria-hidden": "true" });
  }

  self.OCCVM_MOUNT_FLOOR = function (containerId) {
    if (typeof React === "undefined" || typeof ReactDOM === "undefined") return null;
    var el = document.getElementById(containerId);
    if (!el || el.nodeType !== 1) return null;
    var root = ReactDOM.createRoot(el);
    root.render(React.createElement(Floor));
    return root;
  };
  self.OCCVM_FLOOR_GROUND_ALPHA = GROUND_ALPHA;   /* one owner for the number the guards read */
})();
