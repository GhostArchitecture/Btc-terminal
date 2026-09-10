# REACT-MAP.md — Rhyme's React features, mapped onto BTC

**Method: same as PATCH.md.** Every feature below was read from the current
`Rhyme-Instrument/tome-src/30_ui.jsx` (1,198 lines) and checked against the
current `Btc-terminal/index.html`. File:line citations are real. Verdicts
are one of three: **maps directly**, **pattern maps / trigger doesn't**, or
**does not map**. Nothing here is assumed from an earlier read of either
repo.

**The headline finding, stated first because it changes the size of the
job:** the three roadmap items — swipe test bed, metronome, ambient floor —
are not proposals in Rhyme anymore. They're built, as three custom hooks,
and the floor implements the entire globule plan including the two open
questions it left. BTC shares the physics for all three byte-for-byte via
the spine. What BTC lacks is not the physics; it's the React layer that
drives it.

---

## 0. Rhyme's actual React vocabulary, counted

| feature | count | where |
|---|---|---|
| `useState` | 39 | throughout |
| `useRef` | 12 | throughout |
| `useEffect` | 12 | throughout |
| `useMemo` | 10 | throughout |
| `useLayoutEffect` | 2 | `Threads` (measurement before paint) |
| `useCallback` | 2 | `Threads` |
| `useSyncExternalStore` | **0** | — |
| custom hook `useBeatPulse` | 2 | `30_ui.jsx:80` |
| custom hook `useSwipeYield` | 2 | `30_ui.jsx:136` |
| custom hook `useAmbientFloor` | 2 | `30_ui.jsx:944` |
| `React.Fragment` | 2 | |
| `ReactDOM.createRoot` | 1 | the single mount |

Twenty-one function components, `30_ui.jsx:10-1063`.

**The zero is the important number.** Rhyme never uses
`useSyncExternalStore` because its state lives *in* React from the first
line — `useState` everywhere, nothing mutated from outside. BTC's state
lives in one global `S` object mutated by 299 vanilla functions. PATCH.md's
bridge (`OCCVM_LOCK_STORE` + `useSyncExternalStore`) is therefore
**BTC-specific and has no precedent in Rhyme to copy from.** Rhyme has
nothing to offer on the one problem BTC has that Rhyme never had.

---

## 1. `useAmbientFloor` + `ambientFloor()` — MAPS DIRECTLY, highest value

**What it is.** `ambientFloor(canvas, still, heat)` (`30_ui.jsx:714-~900`) is
the live globule floor — buoyancy drift, coil recombination, linear bridge
growth, arrested dumbbells, metaball rendering, heat modulation. Roughly two
hundred lines. `useAmbientFloor` (`30_ui.jsx:944-954`) is a **ten-line React
wrapper** managing lifecycle: mount the floor on a ref, tear it down on
unmount, pass heat through a ref-setter so a changed reading doesn't
reseed the field.

**Why it maps directly.** `ambientFloor()` itself is **plain vanilla JS** —
it takes a `<canvas>` element and returns a stop function. It does not
touch React. The hook is thin. And the physics it drives —
`OCCVM_GLOBULES.field / merged / arrestRegime / arrestedBridge / gooFilter /
MERGE_POWER` — lives in `occvm/globules.js`, which is **byte-identical in
both repos** (20,391 bytes, verified by `diff`). BTC already has every
function `ambientFloor()` calls.

**What BTC currently has instead.** A still frame. `globuleLayer()`
(`index.html:3448-3477`) generates one static SVG data URI and writes it to
`--globules`, consumed by `body::before` at opacity .55 (`:420`) and
`.tile::before` at .16 with screen blend (`:441`). `globules.js`'s own
comment names the split (`index.html:1152`): *"every other slab (30_ui.jsx:
ambientFloor); BTC writes a still frame to --globules as a data URI."* BTC
is at build-plan step 2 (static globules at λc). Rhyme finished steps 2–6.

**What it resolved that the plan left open — worth recording, since the
plan's §5 and §8 flag both as undecided:**
- **Accumulation.** Plan §5 asked what happens to an arrested pair that
  never resolves. Answer, from `ambientFloor` step 5: *"an arrested pair is
  one stuck object, so it drifts off on the cycle rather than piling up at
  the coil."* The follower is locked to the leader as one rigid object
  (`b.lockedTo = a; b.dx = …; b.dy = …`), and a third arrival "would need
  the bridge to grow again against a yield stress that already stopped it."
  No new rule was invented; the physics already answered it.
- **Conservation convention.** Plan §5 flagged 2D-area vs 3D-volume as a
  modeling choice. Resolved in the *shared* `globules.js`, not the UI:
  volume (`r³ = r₁³ + r₂³`), `MERGE_POWER`, with the arrest boundaries
  computed against that same choice "so two conventions would [not] put
  the renderer and the physics on different drops."
- **The coil needs no geometry.** A drop is at the coil exactly when it's
  in the bottom dwell of its cycle (`atCoil`), which is also when a real
  lamp's wax pools. The plan's fixed recombination point fell out of the
  motion model rather than needing its own authored height.

**One caught defect to carry over verbatim, because BTC's canvas would hit
it too.** Drawing blobs at `FLOOR_ALPHA = 0.24` puts the whole field below
Blinn's 0.5 isosurface cut, and the threshold deletes it — *"filtered at
alpha 0.24 gives max alpha 0 over 0 non-zero pixels."* The fix: draw opaque
to an offscreen buffer, threshold there, composite at the weight. *"Caught
by probing the pixels rather than by looking."* BTC's still frame never hit
this because its `<g opacity>` wraps the filtered group — a live canvas
port must replicate the buffer, not the still-frame's structure.

**Authored constants, labelled authored in the source, to carry across:**
`FLOOR_RISE_PX_S = 1.4`, `FLOOR_DWELL = 0.18`, `FLOOR_HEAT_GAIN = 0.6`,
`FLOOR_MERGE_PX_S = 2.6`, `FLOOR_ALPHA = 0.24`, `FLOOR_SEED = 0x0CCF1005`
(`30_ui.jsx:628-682`). The period derives from these plus surface height —
no second authored constant.

**The one thing that does NOT map:** the modulator. Rhyme feeds `--heat`
(drone-depth). BTC has no drone-depth. Per the globule plan §6, heat is
read-only and "the floor runs at heat 0, at the same period it ran before
heat existed" — so BTC's floor runs unmodulated unless BTC supplies its own
real, already-meaningful value. It should not invent one to fill the slot.

**Port shape:** `ambientFloor()` spliced nearly verbatim (it's vanilla); a
`<canvas class="floor">` added where `body::before` currently paints the
still frame; the wrapper as a React hook only if the hosting panel has
converted — otherwise a manual mount/stop call at init next to
`globuleLayer()`. Either way the still-frame writer stays as the
reduced-motion fallback, which is exactly what `ambientFloor`'s `still`
branch already does.

---

## 2. `Threads` — PATTERN MAPS DIRECTLY onto the chart

**What it is** (`30_ui.jsx:254-289`). Rhyme's one imperative escape hatch: a
`useRef` to an `<svg>`, a `draw` callback that measures real DOM positions
(`getBoundingClientRect`, `querySelector`) and builds paths by hand, and —
the part that matters — **two scheduling modes keyed to a `quiet` prop:**

```js
useLayoutEffect(() => {
  if (quiet) { const t = setTimeout(draw, 320); return () => clearTimeout(t); }
  const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id);
});
```

Active: redraw on RAF. Quiet: debounce 320ms. Nothing redraws when nothing
changed.

**Why it's the template for BTC's chart.** BTC's `loop` (`index.html:4876`):

```js
function loop(ts){
  if(ts-_lastFrame>33){ _lastFrame=ts; render(); }
  requestAnimationFrame(loop);
}
```

Throttled to ~30fps, but `render()` runs unconditionally every 33ms whether
or not any tick arrived. `Threads` is the same shape with the discipline
BTC's version lacks. The map is: wrap `<canvas id="chart">` in a component
that owns it via a ref, call the existing `render()` from a RAF loop **gated
on data actually having changed**, and fall to a slow timer when idle.
`renderSweep`, the drawing itself, is untouched — it's already correctly
imperative, as established. Only the scheduling changes.

**Does not require the rest of the page to be React.** `Threads` works
because it owns one element and reads external state through a ref. The
chart component can be the *second* React island (after LockBar) with
everything around it still vanilla.

---

## 3. `useSwipeYield` — PATTERN MAPS, TARGET DOESN'T EXIST YET

**What it is** (`30_ui.jsx:136-193`). The swipe test bed from the roadmap's
§4, built. Finger travel maps to applied stress at `SWIPE_YIELD_PX = 30`;
below τ₀ the row does not move at all (*"the dead band is not a tap/swipe
heuristic bolted on beside the physics — it IS the yield stress"*); above it
tracks 1:1; commits at `SWIPE_COMMIT_PX = 26`, derived to sit at 0.867 of
the k·γ̇ⁿ = τ₀ crossover with 13.3% headroom. Release short of commit is a
**driven flow, not a recoil** — *"a spring-back would be the material
claiming an elasticity it does not have"* — on the substance's own cessation
easing. Reduced motion: no translate, same commit distance. **Tap-to-remove
stays live through the whole gesture**, exactly the agreed constraint.

The gate reads `OCCVM_RHEOLOGY.shearRate` directly — "one owner per fact"
— and BTC shares `OCCVM_RHEOLOGY`. The physics ports unchanged.

**Why the target doesn't exist.** Rhyme applies it to bank-row removal — a
low-stakes irreversible delete, chosen as the test bed *because* it's
low-stakes. BTC has no equivalent. Its irreversible actions are ARM (commit
to a round — financially critical) and ledger writes. The regime ledger was
just decided read-only. **Applying a swipe-to-commit gesture to anything
with money behind it would violate the exact reason bank rows were chosen.**
The hook is portable. Nowhere in BTC is currently safe to point it at.

**Verdict:** carry the hook over only when BTC gains a low-stakes
irreversible removal. Don't manufacture one to use the hook.

---

## 4. `useBeatPulse` — PATTERN MAPS, TRIGGER DOESN'T EXIST

**What it is** (`30_ui.jsx:80-101`). A `performance.now()`-driven RAF loop
producing a phase in [0,1]: a strike then a decay over `PULSE_STRIKE = 0.32`
of each beat (*"a strike and a decay, not a sine: a beat is an onset"*),
gated on real `tempo.bpm`, null → phase 0, reduced-motion → phase 0.
This is the metronome from roadmap §3, with the gate clause from the L8
amendment honored exactly — it reads `tempo`, never a display fallback.

**Why the trigger doesn't exist.** BTC has no tempo. The pattern — a
gated, real-time, reduced-motion-aware pulse loop — is clean and reusable,
and there's a plausible-sounding BTC analog (the 15-minute window's
countdown, a settlement-approach pulse). **But that would be inventing a
trigger to fit a hook**, the same error as manufacturing a swipe target.
The L8 amendment's whole point is that the gate is a real value the user
created. No such value exists in BTC for this to read.

**Verdict:** do not port. Note the pattern; don't manufacture a tempo.

---

## 5. `Cast` — MAPS DIRECTLY, every BTC button

**What it is** (`30_ui.jsx:194-200`). The universal control: *"28 call sites
reach the interaction floor through this one component."* Carries the
`--occvm-bevel` cast-bronze treatment, `.on` → `--mineral` glow,
`.patina.on` → `--verdigris`, and one real a11y rule: `aria-pressed` is
emitted only when the caller passes `on` and has **not** marked the control
`action` — *"a button that claims to be a pressed toggle announces a state
it does not have."*

**BTC has raw `<button>` elements** — `#lockSwing`, `#lockResume`,
`#armBtn`, the rest — each carrying its own inline styling and no shared
pressed-state contract. PATCH.md's LockBar renders bare `e("button")`;
once `Cast` exists on BTC it should render `e(Cast, …)` instead. Same
component, same a11y rule, both tools.

**Verdict:** port with the second React island. LockBar becomes its first
consumer.

---

## 6. The ordinary vocabulary — `useState` / `useMemo` / `useEffect`

Thirty-nine `useState`, ten `useMemo`, twelve `useEffect`. Not features to
map — this is what BTC's panels *become* once converted: a signals table
that's a `useMemo` over the tape rather than a hand-rebuilt `<tbody>`, a
verdict panel that's a derived render rather than a `textContent` write.
The point of PATCH.md was proving this vocabulary can coexist with vanilla
`S`. It can. The bridge is the cost.

---

## 7. What Rhyme's React does NOT solve for BTC

- **The bridge.** Covered in §0. BTC's whole difficulty is state outside
  React; Rhyme never had it, so there's no pattern to copy. PATCH.md's
  `useSyncExternalStore` bridge is the answer, and it's BTC's own.
- **The canvas hot path.** `Threads` draws SVG paths; BTC draws a live
  price chart to canvas at 30fps. The *scheduling* pattern maps (§2). The
  drawing does not — and shouldn't; `renderSweep` is already right.
- **A build step.** Rhyme has `build.js` + babel. BTC's `package.json`
  says "no build step" and PATCH.md keeps it that way. Everything above
  ports as `React.createElement`, not JSX.

---

## 8. Order

1. **LockBar** (PATCH.md) — proves the bridge.
2. **`Cast`** — port the component; LockBar adopts it. Every later button
   inherits the a11y contract.
3. **Chart island** (§2) — wrap the canvas, add `Threads`' quiet-mode
   scheduling to `loop`. `renderSweep` untouched.
4. **Ambient floor** (§1) — splice `ambientFloor()`, add the canvas, carry
   the buffer-threshold fix. Runs at heat 0. Still-frame writer becomes the
   reduced-motion fallback. **Requires the `PAL`/sundial fix first** (BTC
   reduction plan §6 item 3, globule plan §7 item 1) — the floor reads
   `--vein-hi`/`--vein-lo` from computed style, and on BTC those are live
   but the canvas palette isn't.
5. **Signals / verdict panels** — the ordinary vocabulary (§6), one at a
   time.
6. `useSwipeYield`, `useBeatPulse` — **not scheduled.** No target, no
   trigger. Revisit only if one appears on its own.
