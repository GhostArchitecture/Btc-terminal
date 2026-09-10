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

  /* the substance, read LAZILY. The splicer inserts every part after one anchor, so parts land in
     REVERSE list order and rheology.js may be assigned AFTER this file is evaluated — the 2.0 defect
     that made cleave() throw on every call in the browser while Node resolved it through require and
     every assertion passed. Same shape as yield.js's read, for the same reason. */
  function rheo() {
    return (typeof OCCVM_RHEOLOGY !== "undefined" && OCCVM_RHEOLOGY) ? OCCVM_RHEOLOGY
         : (typeof require !== "undefined" ? require("./rheology.js") : null);
  }

  /* ---- the size scale, and what the substance says about merging (2.28) --------------------------
   * Build-plan step 2 is "static globules at λc". Executing it turned up an identity, then a defect in
   * how this system reads its own constant, then an answer that decides step 5 in advance. In order:
   *
   * 1. ℓ = γ/τ₀ IS λc, BY CONSTRUCTION RATHER THAN BY LUCK. Two drops of a yield-stress fluid begin
   *    merging exactly as a Newtonian pair does — the bridge grows linearly in time — and then either
   *    close or ARREST at a finite height, freezing a permanent non-spherical shape. The competition is
   *    capillary stress γ/R against yield stress τ₀, so the boundary radius is γ/τ₀. Measured here:
   *    γ/τ₀ = 7.1480 px, the capillary length √(γ/ρg) = 7.1479 px, and the puddle height τ₀/ρg =
   *    7.1478 px are the SAME NUMBER. Not a coincidence — 2.10 fixed τ₀ by the puddle-height identity,
   *    so γ/τ₀ = γ/(ρg·λc) = λc follows. The build plan asks whether the field landing on λc is "a
   *    lucky coincidence or something to tune deliberately"; it is neither, and it cost nothing to
   *    settle because both halves already shipped.
   *
   *    SOURCE, AND A CORRECTION TO THE PLAN. Kern, Sæter & Carlson, "Viscoplastic sessile drop
   *    coalescence" (arXiv:2203.15617) — bridge height evolves as h₀ ∼ t "before arresting at long time
   *    prior to minimizing its liquid/gas interfacial energy", with the arrested profile set by the
   *    **Bingham number τ_y·h_drop/σ** modified by the drop's aspect ratio. That group is exactly R/ℓ
   *    inverted, so the criterion's form is the source's rather than mine. The plan lists "Kern et al."
   *    and "arXiv:2203.15617" as two corroborating sources; they are the same paper, and two citations
   *    of one result is one result.
   *
   * 2. THE TWO YIELD STRESSES GIVE OPPOSITE ANSWERS, AND THEY ARE NOT COMPETING — THEY BRACKET.
   *    rheology.js has carried an unresolved pairing since 2.10: τ₀ static 21.15 Pa (stress-ramp and
   *    creep, the right one for a substance at rest) beside the dynamic Herschel-Bulkley intercept
   *    4.41 Pa that k and n come from. That file records the pairing as unresolved "rather than
   *    resolved". Arrest is its first consumer that forces the question, because γ/21.15 = 7.148 px
   *    says every globule here arrests and γ/4.41 = 34.281 px says every one completes.
   *
   *    Read as a hysteresis, both are right and each governs its own moment. The bridge KEEPS FLOWING
   *    while the driving capillary stress exceeds the DYNAMIC yield stress — the stress a material
   *    already in motion resists at. The arrested shape STAYS PUT if the residual stress is below the
   *    STATIC one — the stress required to restart it. Two lengths, three regimes, and no third
   *    constant:
   *
   *        R < 7.148 px          nothing can hold the shape — the merge COMPLETES, one round globule
   *        7.148 ≤ R ≤ 34.281    the bridge grows and then locks — a DUMBBELL with a real bridge
   *        R > 34.281 px         the drive is under even the dynamic stress — BARELY JOINED
   *
   * 3. WHAT THE SHIPPED FIELD ACTUALLY PRODUCES, measured over 400,000 uniform pairs from the band:
   *    **0.00% complete, 96.2% dumbbell, 3.8% barely joined.** The plan warns that "a system that
   *    always completes merges is simpler and wrong". This substance, at this pixel scale, says the
   *    opposite and says it decisively — the frozen dumbbell is not the rare case, it is the case.
   *
   *    THE BAND DOES NOT MOVE, AND THAT IS THE DISCIPLINED ANSWER. Completion needs BOTH drops under
   *    7.148 px, since a merged radius is never smaller than its larger parent. Dropping the floor from
   *    9 px buys 0.00% at 5.673 (the largest floor whose own twin-merge could complete), 0.69% at 4 px
   *    and 2.68% at 2 px — while changing a look measured and approved on the page at 2.25. Moving a
   *    measured value to manufacture an outcome the substance does not give is what P1, 2.1/P4 and 2.16
   *    each refused, and this is the same refusal. The model expresses all three regimes as real
   *    functions of the radii; the substance selects among them. That is the difference between a model
   *    that CAN express both outcomes — which is what the plan asks for — and a picture arranged to
   *    show both.
   *
   * 4. A CONSTANT USED OUTSIDE ITS REGIME, recorded because the plan's step 2 would have walked into it.
   *    The shipped λc is the AIR interface's, √(γ/ρg). A globule suspended in a near-density-matched
   *    liquid — which is what a lava lamp is, and what the plan's own §0 establishes — has
   *    √(γ/(Δρ·g)), and Δρ is the one quantity such a lamp designs toward zero, so the length diverges:
   *    7.1 px at Δρ = ρ, 30 px at Δρ/ρ = 0.056, 101 px at 0.005. Sizing a suspended globule with the
   *    air-interface value is the 2.8/2.10/2.22 error class.
   *
   *    2.39 CORRECTS THE EXEMPTION THIS PARAGRAPH GAVE ITSELF. It read: "Note that the ARREST lengths
   *    above are unaffected: γ/τ₀ carries no g and no density at all, which is why they are the ones
   *    used here." The clause is true and the conclusion does not follow. γ/τ₀ carries no g and no ρ,
   *    so it is immune to the DENSITY half of the two-phase correction — which is the only half the
   *    sentence looked at. It is not immune to the TENSION half: γ is a property OF AN INTERFACE, and
   *    the interface changes from wax/air to wax/carrier at the same moment ρ changes to Δρ. Both
   *    arrest lengths are γ over a stress, so both scale with it directly. The paragraph exempted the
   *    arrest lengths from a correction by checking the one substitution they survive and not the one
   *    they do not — which is 2.26's global-worst-case error in a third coordinate: the right
   *    arithmetic on the wrong pair.
   *
   *    WHAT THAT COSTS, MEASURED, AND THE DIRECTION IS AGAINST THE PICTURE ANYBODY WANTS. Both lengths
   *    scale linearly in γ, so a lower interfacial tension SHORTENS them and the field arrests MORE:
   *    at γ 0.020 the 9+9 pair still reads dumbbell, at 0.010 it reads BARELY JOINED, and the merged
   *    radius that completes falls from 7.148 px to 1.787. Completion would need γ to RISE — 0.0635
   *    N/m for a 9+9 twin-merge (1.59× the shipped value), 0.2115 for 30+30 (5.29×) — and a
   *    liquid/liquid interface is the direction away from that, not toward it.
   *
   *    AND NO SUCH CONSTANT IS ADOPTABLE HERE, FOR A WORSE REASON THAN P-1's. rheology.js closes γ as
   *    unclosable because ordinary tensiometry has no valid regime on a fluid that holds below τ₀.
   *    A wax/carrier γ for THIS substance is not merely unmeasured, it is ill-posed: the substance is
   *    an aqueous matrix and the lamp analogy's carrier is aqueous too, so the two are not immiscible
   *    and there is no interface to have a tension. The two-phase framing is an analogy laid over a
   *    proxy chosen on other grounds, and it does not survive being asked for this number. So the
   *    shipped γ stays the air interface's, USED KNOWINGLY OUTSIDE ITS REGIME AND SAID SO, which is
   *    the honest form of what the sentence above was claiming by exemption.
   *    Inverted as a check rather than adopted as a derivation, the authored 30 px ceiling implies
   *    Δρ/ρ = 0.0567; secondary sources put a real lamp's contrast at roughly 0.022–0.056. Those
   *    sources are secondary, the bracket is reported as a bracket, and no constant here comes from
   *    them — the check is only that the authored ceiling is physically ordinary, and it is.
   *
   * MERGE CONSERVATION: r³ = r₁³ + r₂³. Decided here and recorded, because the plan leaves it open and
   * every number above depends on it. Volume rather than area: the drops render as spheres in
   * projection, and the 3-D convention is the one drop-coalescence simulation uses. Under the 2-D
   * alternative r² = r₁² + r₂² the same 400,000 pairs read 0.00% / 98.9% / 1.1% — the same verdict. */
  var R = [9, 30];             /* authored, unchanged since 2.25 and measured on the page then */
  var MERGE_POWER = 3;         /* volume conservation on merge — see above */

  function arrestLengths() {   /* the two boundary radii, in CSS px; null with no substance spliced */
    var r = rheo(); if (!r) return null;
    var m = r.SUBSTANCE, px = function (pa) { return (m.gamma / pa) * 1000 / r.MM_PER_PX; };
    return { complete: px(m.tau0), joined: px(m.tau0Dynamic) };
  }
  function merged(r1, r2) {
    return Math.pow(Math.pow(r1, MERGE_POWER) + Math.pow(r2, MERGE_POWER), 1 / MERGE_POWER);
  }
  /* the only question the build plan's §2 asks, answered per pair rather than per system */
  function arrestRegime(r1, r2) {
    var L = arrestLengths(); if (!L) return "unknown";
    var R2 = merged(r1, r2);
    return R2 < L.complete ? "completes" : R2 <= L.joined ? "dumbbell" : "joined";
  }
  /* the Bingham number the source states the arrested shape by: τ_y·R/γ, i.e. R/ℓ */
  function bingham(r1, r2) {
    var L = arrestLengths(); return L ? merged(r1, r2) / L.complete : null;
  }

  /* HOW FAR THE BRIDGE GETS BEFORE IT FREEZES, as a fraction of the smaller lobe (2.28, step 5).
   * Kern, Sæter & Carlson state the arrested profile by the Bingham number — the arrested shape "depends
   * on the fluid's yield stress τ_y and coalescence angle α, represented by the Bingham number
   * τ_y·h_drop/σ modified by the drop's height-width aspect ratio". They give the group, not a closed
   * form for the height, and the aspect-ratio modification is a sessile-drop geometry this floor does
   * not have — so what is taken is the group and its DIRECTION, and the shape of the falloff is named
   * as authored rather than dressed as theirs. 1/Bi is the simplest falloff with the right two limits:
   * it reaches 1 exactly where Bi reaches 1, which is the completion boundary the same group defines,
   * so the three regimes meet without a seam and without a fourth constant.
   * Measured across the shipped band: 0.63 at r=9+9, 0.38 at 15+15, 0.19 at 30+30 — a pair of small
   * globules freezes with a thick waist, a pair of large ones barely touches. */
  function arrestedBridge(r1, r2) {
    var Bi = bingham(r1, r2);
    return Bi === null ? 1 : Math.min(1, 1 / Bi);
  }

  var PX_PER_DROP = 9000;      /* authored: one droplet per ~95×95 px */
  /* 2.38 — DRIFT_PX_S IS RETIRED, and with it `vx`/`vy`. It was a 2.22 leftover: step 3 replaced the
     vertical drift with the buoyancy cycle and never replaced the lateral one, so a constant random
     heading survived sideways under a comment calling it "the lateral wander a real lamp shows".
     The vessel is what forced the question. A wall and a constant lateral drive cannot coexist —
     driven on this field over an hour of simulated time, an absorbing wall pins 36 of 37 drops on the
     phone and 162 of 171 on the desktop, emptying the middle into two stripes at the edges, because
     peeling a drop off a wall needs the same buoyant stress that is 4.2-14x short of tau-0 (below).
     A reflecting wall survives (0 pinned) and is refused for a different reason: an elastic bounce is
     the material claiming an elasticity it does not have, which is the recoil 2.21 already refused.
     The lateral motion is now a closed orbit sharing the vertical cycle's own parameter, and it lives
     in the live consumer (occvm/floor.js) with the rest of the motion. `vy` was the sharper half of
     the find: it was written onto every drop and READ BY NOTHING, D12 one level down, invisible
     because a value on an object is not a token the auditor scans. */

  function count(w, h, pxPerDrop) { return Math.max(3, Math.round(w * h / (pxPerDrop || PX_PER_DROP))); }

  /* one droplet, from the field's own PRNG.
     `phase` is where this drop sits in the buoyancy cycle (2.28, step 3) — a STATIC property of the
     drop like its radius, not motion, which is why it is the field's and the cycle it feeds is the live
     consumer's. L13 grants motion to one tool only and a shared part must not carry what one tool is
     withheld; a number saying "this drop starts 0.37 of the way round" is carried by both tools alike
     and moves nothing on its own.
     2.39 — THIS SENTENCE USED TO END "`vx`/`vy` stay for the lateral wander a real lamp shows", and
     2.38 retired both of them one screen above without correcting it here. A comment promising a
     field two properties the field stopped writing is 2.14's class exactly, inside the file that
     records 2.14's class. Found by reading the part end to end rather than by any guard: nothing
     measures a comment. */
  function drop(rnd, w, h, r0, r1, atCoil) {
    var r = r0 + rnd() * (r1 - r0);
    /* THE LANE IS CLAMPED INTO THE VESSEL, and a torus is why nobody noticed it needed to be. Until
       2.38 a centre was drawn anywhere in [0, w], so a drop within r of an edge hung over it — which
       is invisible while the consumer WRAPS (the drop reappears on the far side) and is a drop half
       inside the glass the moment a wall exists. Clamping here rather than in the consumer keeps the
       field one field: both tools draw the same drops. */
    var lane = Math.min(Math.max(rnd() * w, r), Math.max(r, w - r));
    /* a replacement drop is born AT THE COIL rather than sliding in from off-screen. There is no
       off-screen inside a vessel, and the coil is where a real lamp's wax pools and re-forms — the
       same bottom dwell the merge already happens in (2.28 steps 4+5), so this costs no new geometry
       and no new constant. */
    return { x: lane, y: atCoil ? Math.max(r, h - r) : rnd() * h, r: r, phase: atCoil ? 0 : rnd() };
  }

  /* ---- what the substance says about drift (2.28, step 3) ---------------------------------------
   * L13 already records the floor's cost in a sentence: "a yield-stress fluid below τ₀ does not
   * spontaneously convect or drift, so the floor contradicts the substance's defining behaviour". The
   * buoyancy model gives that sentence a number, so it can be checked rather than believed.
   *
   * A globule rises when the buoyant stress Δρ·g·R exceeds τ₀. At the density contrast the authored
   * 30 px ceiling implies (Δρ/ρ = 0.0567), that stress is 1.509 Pa at r = 9 px and 5.031 Pa at r = 30 —
   * against a static yield stress of 21.15 Pa. **The substance is 14× short at the smallest globule in
   * the field and 4.2× short at the largest**, and the radius at which buoyancy could move anything at
   * all is 33.4 mm — **126 px**, four times the ceiling and larger than most surfaces the floor paints
   * on. Nothing in this field can rise, by its own physics, at any speed.
   *
   * So the drift's MAGNITUDE is authored and there is no derivation to reach for; what is adopted from
   * the literature is the cycle's SHAPE. Gyüre & Jánosi, "Basics of lava-lamp convection", Phys. Rev. E
   * 80, 046307 (2009) — a real two-fluid lab analog — report the process as warm blobs rising from the
   * bottom, ATTACHING at the top surface, then sinking again, and identify two modes, one heat-transport
   * limited and one viscosity-limited with CONSTANT PERIODICITY. Rise, dwell, sink, dwell, one period
   * for every drop with its own phase: that is what this field carries, and it is the shape rather than
   * the speed that came from the source. */
  /* 2.39 — THE CONTRAST AND g BOTH HAD AN OWNER SOMEWHERE ELSE, AND THIS FUNCTION OWNED COPIES.
     `0.0567` sat here as a DEFAULT ARGUMENT — the least visible place a constant can hide, since it is
     neither a token the auditor scans nor a named constant a reader finds — while being the whole of
     what "the liquid" contributes to this model. It is `OCCVM_RHEOLOGY.CARRIER.contrast` now, with its
     provenance (inverted from the authored 30 px ceiling, not measured) recorded beside the value.
     And `9.80665` was a second g: rheology.js has fixed the physical constants for this system since
     the crystal port and uses 9.81, so the two disagreed in the fifth digit for no reason. Reading its
     G moves the buoyant stress by 0.034% — 1.5094 -> 1.5099 Pa at r = 9, 5.0314 -> 5.0331 at r = 30 —
     which changes no verdict anywhere (the shortfall against tau-0 is 14.0x and 4.20x either way) and
     is recorded rather than absorbed, because a figure in this file's own prose moved. */
  function buoyantStress(rPx, dRhoOverRho) {
    var r = rheo(); if (!r) return null;
    var m = r.SUBSTANCE;
    var d = dRhoOverRho === undefined ? r.CARRIER.contrast : dRhoOverRho;
    return m.density * 1000 * d * r.G * (rPx * r.MM_PER_PX / 1000);
  }
  function risesAt(rPx, dRhoOverRho) {
    var r = rheo(), t = buoyantStress(rPx, dRhoOverRho);
    return r && t !== null ? t > r.SUBSTANCE.tau0 : null;
  }

  /* the field: deterministic in (seed, w, h). Returns the drops and the PRNG positioned after them, so a
     live consumer that respawns keeps drawing from the same stream. */
  function field(o) {
    var w = o.w, h = o.h, rnd = mulberry32(o.seed >>> 0);
    var r0 = (o.r || R)[0], r1 = (o.r || R)[1], n = count(w, h, o.pxPerDrop), drops = [];
    for (var i = 0; i < n; i++) drops.push(drop(rnd, w, h, r0, r1, false));
    return { drops: drops, rnd: rnd, spawn: function (atCoil) { return drop(rnd, w, h, r0, r1, atCoil); }, count: function () { return n; } };
  }

  /* ---- metaball rendering (2.28) -----------------------------------------------------------------
   * BLUR + THRESHOLD, which is the build plan's own first recommendation and the cheapest of the three
   * real paths. Blinn, "A Generalization of Algebraic Surface Drawing", ACM TOG 1(3):235-256 (1982) is
   * the foundational form: sum a density field, draw the isosurface at a threshold. A Gaussian blur of
   * overlapping filled circles IS a summed density field, and a hard cut on its alpha IS the
   * isosurface, so the effect is one SVG filter rather than a field evaluation.
   *
   * WHY IT MATTERS BEYOND THE SILHOUETTE. Because the fields simply add, two approaching drops MERGE
   * VISUALLY WITH NO MERGE CODE. That is what makes arrest expressible at all: an arrested pair is
   * rendered by stopping the approach, never by special-casing the geometry, so the same renderer
   * draws both outcomes and neither is a branch.
   *
   * THE BLUR RADIUS IS THE MENISCUS, NOT A NEW NUMBER. The scale over which surface tension smooths a
   * shape is the same length L2 already uses for a wet edge, `--occvm-meniscus` = λc = 7.148 px, which
   * §2.28 above shows is also ℓp. One length, one owner (L3). A blur authored beside it would be a
   * second copy of a fact this system already carries.
   *
   * THE ISO-LEVEL IS BLINN'S HALF-DENSITY SURFACE, 0.5, and the alpha matrix's offset is therefore
   * exactly `gain × 0.5` rather than the 18/-7 pair copied around the web (which is an iso-level of
   * 0.389, a number nobody chose). GAIN is authored and named: it sets how hard the cut is, i.e. how
   * many pixels the surface takes to go from transparent to opaque, and no derivation fixes it.
   *
   * THE CAVEAT IS REAL AND IS THIS TOOL'S PROBLEM. Blur+threshold "requires an opaque background to
   * read correctly", and BTC paints this SVG as a background-image on a TRANSPARENT pseudo-element,
   * screened over the substrate. Whether the threshold survives that is measured on the page, not
   * assumed here; `goo:false` renders the plain gradient field exactly as 2.25 did, so the change is
   * always the caller's and never the default sneaking in. That is 2.24's `fine:0` lesson: a flag the
   * generator can silently ignore is worse than no flag. */
  var GOO_GAIN = 24;           /* authored: the hardness of the isosurface cut, in alpha units */
  var ISO = 0.5;               /* Blinn's half-density isosurface — derived from the method, not chosen */

  function blurPx() { var L = arrestLengths(); return L === null ? 7.148 : L.complete; }

  /* THE FILTER ITSELF, defined once and used by both renderers. BTC embeds it in the still SVG it
     writes to --globules; Rhyme puts the same markup in a hidden <svg> and hands its id to the canvas
     as `ctx.filter = url(#...)`, so the live floor and every still frame threshold identically. Two
     copies of one filter would be L3's defect in a place nobody would think to look for it.
     alpha' = gain·alpha − gain·ISO, clamped by the filter pipeline: opaque above the iso-level, gone
     below. The widely-copied 18/-7 pair is an iso-level of 0.389, which is nobody's decision; this is
     Blinn's 0.5 with the offset following from it. */
  function gooFilter(o) {
    var id = o && o.id || "occvm-goo";
    var blur = (o && o.blur !== undefined) ? o.blur : blurPx();
    var gain = (o && o.gain !== undefined) ? o.gain : GOO_GAIN;
    return "<filter id='" + id + "' x='-20%' y='-20%' width='140%' height='140%'" +
      " color-interpolation-filters='sRGB'>" +
      "<feGaussianBlur in='SourceGraphic' stdDeviation='" + (+blur).toFixed(3) + "' result='b'/>" +
      "<feColorMatrix in='b' type='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 " +
      (+gain).toFixed(3) + " " + (-gain * ISO).toFixed(3) + "'/></filter>";
  }

  /* the still frame, as an SVG. One radial gradient per drop, hi at the core, lo at the rim; colours
     come in from the caller's resolved tokens, so this file carries no literal (L6). With `goo` the
     whole field passes through the metaball filter above. */
  function svg(f, o) {
    var w = o.viewW || f.w || 1200, h = o.viewH || f.h || 800, alpha = o.alpha === undefined ? 0.24 : o.alpha;
    var sx = w / (o.w || w), sy = h / (o.h || h);
    var goo = o.goo === undefined ? true : !!o.goo;
    var gain = o.gooGain === undefined ? GOO_GAIN : o.gooGain;
    var sd = (o.blur === undefined ? blurPx() : o.blur) * Math.min(sx, sy);
    var defs = "", body = "";
    for (var i = 0; i < f.drops.length; i++) {
      var d = f.drops[i], id = "g" + i;
      defs += "<radialGradient id='" + id + "'><stop offset='0' stop-color='" + o.hi + "'/><stop offset='1' stop-color='" + o.lo + "'/></radialGradient>";
      body += "<circle cx='" + (d.x * sx).toFixed(1) + "' cy='" + (d.y * sy).toFixed(1) + "' r='" + (d.r * Math.min(sx, sy)).toFixed(1) + "' fill='url(#" + id + ")'/>";
    }
    if (goo) { defs += gooFilter({ id: "goo", blur: sd, gain: gain }); body = "<g filter='url(#goo)'>" + body + "</g>"; }
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + w + " " + h + "' preserveAspectRatio='none'>" +
      "<defs>" + defs + "</defs><g opacity='" + alpha + "'>" + body + "</g></svg>";
  }

  return { mulberry32: mulberry32, field: field, svg: svg, count: count,
           PX_PER_DROP: PX_PER_DROP, R: R, MERGE_POWER: MERGE_POWER,
           arrestLengths: arrestLengths, merged: merged, arrestRegime: arrestRegime, bingham: bingham,
           arrestedBridge: arrestedBridge,
           gooFilter: gooFilter, blurPx: blurPx, buoyantStress: buoyantStress, risesAt: risesAt,
           GOO_GAIN: GOO_GAIN, ISO: ISO };
})();
if (typeof module !== "undefined") module.exports = OCCVM_GLOBULES;
