# OCCVM — the spine

The shared visual system of the Ghost Codex tools. This document is the law; `occvm/spine.css` is the
machine-readable half; `occvm/tools/splice-spine.js` puts it into a tool. All three are committed identically
to every conforming repository.

**Constituted at 1.0 on 2026-09-06 from measurement, not from memory.**

**Releases have landed out of sequence, by choice, and this table is the version rather than a single
number** — a lone "1.6" after shipping 1.5 would read as a regression, and a renumbering to tidy the
order would be exactly the drift the ledger law exists to prevent.

| release | state | what it did |
|---|---|---|
| **1.0** | landed | constituted the spine from measurement; inlined it in both tools at zero deltas. Closed D11. |
| **1.1** | landed | generative fidelity: DLA veins, `--vein-density --vein-habit`. Closed nothing; added L10. Its determinism requirement was met at 1.0. |
| **1.1b** | landed | the {110} twin angle computed from the unit cell (116.209°, resolving P2's blocker), the first **behaviour** primitive — `occvm/fracture.js`, OCCVM-L11 — and a **tested negative**: the twin misfit has no measurable growth consequence in a diffusion-limited regime, so it is recorded rather than shipped. |
| **1.1a** | landed | the vein grows **aragonite**, not a generic dendrite: radial from a nucleation point, cyclic-twinned in threes, anisotropy moved from the walk to attachment. 2.0 prep the amended roadmap asks for early, so vein and substrate can become one material without a rework. |
| **1.2** | landed | one light, completed. Closed D2, D8, D9, D10. |
| **1.2a** | landed | closed `OCCVM-D12`: the night floor 1.2 recorded as *moved* to `--amb` had in fact been deleted. Ambient now fills what direct light does not, so the bevel after dark is held up by the term the law always said held it up. First visible change in six releases. |
| **2.0** | landed | **OCCVM-L12, the material model.** Aragonite defined once in `occvm/material.js` — cell, principal indices, hardness, density, stiffness — with the lattice's single owner moved here and `veins.js` reading it. The substrate ramp is **derived** from angular Fresnel at L2's cut geometry rather than authored, with two rejected derivations recorded and pinned. Also fixed a load-order defect that had `cleave()` throwing in the browser since 1.1b. |
| **2.1** | landed | **P1 and P4, both derived, measured, and not wired.** Anisotropic motion (`1/√k`: a 0.7584, b 0.9454, c 1.0000) has no second axis to be observed against — `translateX` is at zero animated sites in either tool. Unit-cell spacing (a 1.0000 : c 1.1573 : b 1.6069) does not survive integer-pixel rounding at the sizes 84.5% of spacing uses. Both keep their arithmetic, ship no token, and carry self-retiring guards; the golden-ratio guard ships regardless. |
| **2.2** | landed | `--amb` renamed **`--fill`**, values byte-identical. The non-monotonicity 1.2a deferred to 2.0 was measured and is not a defect: consumers weight the term by `(1−e)`, which cuts a 28% dip in the token to 1% in what reaches the surface, so the token was only ever mis-named. `--amb` is pinned out of both repositories. |
| **2.3** | landed | **L12 adopted, on one surface.** The material's free `body` anchored to L1's floor, after which it predicts `--sub-hi` and `--sub-lo` **to the byte, unfitted**, and disagrees only on the mid-tone (3.91 L* darker). `occvm/substrate.css` is generated from `material.js` and gated in CI. Rhyme's `.slab` wears it; BTC does not. |
| **1.3** | landed | the numeric face: an owned mono, embedded and subset, two weights. Closed D3. |
| **1.4** | landed (narrow) | mineral as preference: one shared implementation, `occvm/minerals.js`, spliced into both tools like `sundial.js`/`veins.js`. Ruby was added to complete the 3-mineral set (Rhyme had never carried a negative mineral). Closed D6. |
| **1.5** | landed | the interaction floor. Closed D7. |
| **1.6** | landed | architecture conformance. Closed D4, D5. |
| **1.7** | landed | the night model, complete: dusk stages additive over the `--night` ramp, ink on a **phosphor curve** rather than a linear one, and the **moon** as a second light reaching ink alone (real lunar theory, gated on illumination). Deleted BTC's `--bloom` surface glow. |
| **1.8** | landed | the reference surface, to its full brief: a conforming page holding no values of its own, one live specimen per law, **the light vector swept on a slider rather than a clock**, slabs at every depth, controls in every state, ink at every scale. Recorded into the golden set as a third surface. Added `--occvm-bevel` (L2) — a gap it found on itself. |
| **1.9** | landed | freeze and stage, in full. D1 closed at the narrow pass (the expired `--ink --meas --bondi` block swept). The rest landed after the amended roadmap surfaced it: a **full token audit as a re-runnable instrument** (`occvm/tools/token-audit.js`, in CI with `--check`), three dead tool-local tokens removed, every divergence promoted to an amendment or a documented exception, the **2.0 migration table** (§6b), and one real defect found — `OCCVM-D12`. |

**All twelve defects are closed.** `OCCVM-D12` was opened by 1.9's own audit and closed at 1.2a — the
last thing between here and 2.0 that was a bug rather than a decision. D1's aliases were shown to be load-bearing by 1.2's golden diff —
`--ink --meas --dim` all moved with the tokens they alias — so the block was a live dependency, not dead
weight, and sweeping it (1.9) was a migration rather than a deletion. D6 (1.4) closed the same way 1.9
did: BTC gets the mineral system, but only where it was already load-bearing for this tool — the vein
layer — not ported wholesale as an ambient UI accent the way Rhyme uses it (§L6, and see 1.4's own note
below).

**1.6 — *architecture conformance*** — closes `OCCVM-D4` and `D5`. Rhyme's JSX is compiled at author time
and React is inlined from a committed vendor copy, so the artifact fetches nothing at load and
`babel-standalone` is gone; BTC ships the service worker its manifest had been promising since the
beginning. Both tools now derive their cache name from the build stamp rather than a hand-bumped literal.

*The roadmap's note on this release — "this release introduces the first author-time generated region" —
was already false when written and is now false four times over: Rhyme's `build.js` and BTC's
`resplice.js` both predate it, and the spine's two spliced parts arrived at 1.0. 1.6 adopts the practice
those established rather than founding it.*

**1.2 — *one light, completed*** —
closes `OCCVM-D2`, `D8`, `D9` and `D10`, promotes twelve tokens from registered to governed, and puts the
whole light layer in one shared implementation (`occvm/sundial.js`).

**1.1 was not shipped and the number is not reused.** Its determinism requirement — a seeded, injected
generator — was met at 1.0 (§4); its DLA vein generator and the two tokens `--vein-density --vein-habit`
are outstanding and remain unregistered. A gap in the sequence is honest; renumbering a release to close
it would not be.
 No prior spine document existed — the roadmap
and the 2.0 migration process were both written against one that had never been committed, and its laws,
defects and conformance table were unrecoverable. `occvm/SPINE-AUDIT.md` is the inventory this was authored
from; every value below is one the tools were already carrying.

**Consumers:** BTC Terminal, Rhyme Instrument. That is the whole scope, and §8 of the roadmap is right that
two consumers cannot falsify a law.

---

## 0. Versioning contract

| | Triggers | Consumer cost |
|---|---|---|
| **Patch** `1.0.x` | Value corrections, defect fixes inside an existing token. | None. |
| **Minor** `1.x` | New tokens, new primitives, new laws. Nothing renamed, nothing removed. | Opt-in. Tools keep working untouched. |
| **Major** `x.0` | Token renamed or removed, primitive's meaning changed, law repealed. | Mandatory migration, same push. |

**Deprecation.** A token slated for removal survives one full minor cycle as an alias, marked
`/* deprecated → newname (2.0) */`. BTC's `--ink --meas --bondi` block was an expired window nobody swept —
that is `OCCVM-D1`, and this policy exists to prevent its recurrence.

**Ledger law.** No release closes without: build stamps on every conforming tool, §7 updated, and any
divergence documented as a divergence rather than left as drift.

**Conformance.** A tool is *conforming* at version N when it inlines that spine and violates no law. A tool
may lag. A tool may not silently fork. **A law a tool does not yet satisfy is a registered defect (§6), not a
fork** — that is how a tool lags honestly.

**Identifiers.** Laws are `OCCVM-L1…L9`, defects `OCCVM-D1…`. The bare forms `L6`, `D2` are shorthand where
unambiguous. The prefix is not decoration: `Btc-terminal/CLAUDE.md` §10.3 already uses `L1` and `L2` as its
own defect IDs, and two ID spaces of the same shape in one repository is how a reader ends up reading the
wrong table.

---

## 1. The twelve laws

Each law names the release that completes it. A law is stated at 1.0 whether or not both tools satisfy it
yet; the gap is a defect, and the defect names the release that closes it.

### OCCVM-L1 — substrate and inscription

The ground is obsidian; the mark on it is bone. Three substrate weights and three ink weights, no more.

```
--sub #1b1a22   --sub-hi #2c2a36   --sub-lo #0e0d13   --edge #0b0a10
--bone #ece3d0  --bone-lo #b7ad9c  --bone-dim #8e8778
```

Substrate and ink are **derived, not authored** (`OCCVM-L9`): the values above are the noon anchor from which
the day's ramp is computed, not constants. **A derived token derives with its whole family** — deriving
`--bone` while leaving `--bone-lo` fixed separates a pair that must move together. Rhyme does exactly that
today: `OCCVM-D10`.

### OCCVM-L2 — cut geometry

A surface is cut, not rounded. Corner radius **≤ 4px** on any slab, tile, control or binding. Bevels are
struck from the light vector (`OCCVM-L3`), never from a fixed offset.

An element too small to read as a cut slab at 4px takes an exception in §5 rather than a larger radius.

### OCCVM-L3 — one light

There is exactly one light on any **surface**, and it is the real sun.

**Amended at 1.7, and the amendment is narrow on purpose.** The moon is a second light and it reaches
**ink only** — `--bone` and `--nglow`, at night. It casts nothing, bevels nothing, and moves no substrate,
so every statement below about surfaces is unchanged and there is still exactly one thing that can put a
shadow on this page. The moon's own terms are governed under `OCCVM-L9`, which is where night lives; this
clause exists so that the sentence "exactly one light" cannot be read as forbidding what 1.7 shipped.
Nothing else may become a light without amending this law again, in the open, with its own release.

- **Position** is computed from latitude, longitude and the clock. The canonical implementation is the **full
  NOAA algorithm** — Julian century, equation of centre, obliquity with nutation — evaluated in **UTC**. The
  Spencer Fourier approximation is a permitted lag, not a second standard: it tracks NOAA to 0.87° in
  elevation and 0.56° in azimuth over a year at Dayton (`occvm/tools/solar-compare.js`), which is inside the
  tolerance of everything downstream, but two implementations is two things to maintain and two things to
  drift.
- **Screen projection** is north-up: `--lx = sin(azimuth)`, `--ly = −cos(azimuth)`. Both tools already agree
  here and this law ratifies it.
- **Below the horizon the vector does not keep tracking a sun nobody can see.** Below −6° elevation it
  resolves to neutral overhead: `--lx 0, --ly 1`. BTC tracks the sun to −39° and beyond: `OCCVM-D9`.
- **Every light-derived token is a resolved scalar written by the sundial, never a CSS `calc()` expression.**
  A custom property is substitution-only until consumed, so a `calc()` never resolves at token level and
  cannot be read arithmetically by a law, a test, or the golden set. BTC's `--glow` is
  `calc(var(--night)*.28)`: `OCCVM-D8`.

The sundial writes, at most once a minute:

```
--lx --ly      screen light vector, unit length
--elev         sin(elevation) · 1.25, clamped [0,1], falling to 0 at night
--night        continuous ramp, 0 at −2° to 1 at −10°  (OCCVM-L9)
--fill         fill weight:   0.45 + 0.55·elev·(1−night) + 0.18·night
--rake         cast length in px, from the sun's angle
--sheen --hi-a --cut-a --shade-a    specular, highlight, cut and shade alphas
--glow         night bloom on ink only  (OCCVM-L9)
```

`--elev` falls to zero at night and **the night floor lives in `--fill`, not in `--elev`** — a bevel stays
legible after dark because ambient light fills what direct light does not, rather than because elevation is
pretended to be 0.15. BTC floored `--elev` at 0.15 and had no `--fill`: `OCCVM-D2`, closed at 1.2.

*This sentence was false from 1.2 until 1.2a, in both of its halves.* Ambient held nothing up — `--fill`
was computed, written, and read by nothing, while `--hi-a` and `--cut-a` collapsed to 0.060 after dark —
and the figure it quoted, 0.53, was not even the value the formula produced (0.630). A floor recorded as
*moved* had in fact been *deleted*, and it survived seven releases because a write-only token looks
exactly like a working one from every angle except a census. `OCCVM-D12`, found by 1.9's audit, closed at
**1.2a**: the alphas now admit ambient in proportion to `1 − e`, the share of the surface direct light is
not reaching. At full sun that term is worth 0.007 and the daylight frames barely move; after dark it is
the whole of the bevel — 0.060 → 0.161 and 0.060 → 0.186.

*Settled at 2.2, and the name was the whole of it.* 1.2a recorded this term as **not monotonic in
darkness** — 0.450 at the horizon against 0.630 at full night, so it rises as the sun disappears — and
left the question of whether that was a defect for 2.0, on the grounds that a term climbing at midnight
would fight a material model. Measured before renaming anything, it does not:

| | noon | low sun | horizon | civil | night |
|---|---|---|---|---|---|
| the term alone | 1.000 | 0.542 | **0.450** | 0.480 | 0.630 |
| what reaches the surface, `0.16·fill·(1−e)` | 0.0000 | 0.0722 | 0.0720 | 0.0768 | **0.1008** |

(the composite's own peak is 0.07272 at 5° elevation, against 0.07200 at the horizon — the 1% dip)

**Every consumer multiplies it by `(1−e)`, and that very nearly — not exactly — cancels the daytime
branch.** The token dips **28%** between noon and the horizon. The composite peaks at 5° elevation and
dips **1%** into the horizon before climbing through dusk to its maximum at night. *An earlier draft of
this paragraph said the composite was monotonic; the guard written beside it failed that claim, and 1%
is the measured number.* A one-percent dip across the last five degrees of daylight is not a term that
will fight a material model, which was 1.2a's actual question. So there was no physical defect to fix —
only a name claiming to be something it is not. It was never a
model of sky illumination; it is **the weight of the fill**, and `(1−e)` is how much of the fill applies.
A fill that rises at night is correct rather than paradoxical, which is why `--amb` became **`--fill`**:
the word the law was already using for it two paragraphs above.

*One thing the measurement did surface and 2.2 did not change:* the `0.55·elev·(1−night)` branch, once
weighted by `(1−e)`, contributes `0.55·e·(1−e)` — zero at both ends and peaking mid-afternoon, where it
nearly doubles the fill (0.0436 against 0.024 at 40° elevation). Nothing states that bulge as intent. It
is recorded rather than removed, because 2.2 is a rename and a rename that also moves a curve gives the
golden set a delta it cannot attribute.

### OCCVM-L4 — cast shadow

Every cast shadow derives from `--lx --ly --rake --shade-a`. **No fixed `box-shadow` offset exists outside
the primitives.** The primitive is `.occvm-cast` (§3).

**`(--lx, --ly)` points toward the sun**, so a lit bevel sits at `+(lx, ly)` and **a cast falls at
`−(lx, ly)`**. `ly = −cos(azimuth)`: at noon the sun is due south and `ly = +1`, which is screen-down.

Every fixed offset 1.2 replaced had the cast sign backwards — BTC's tile threw `0 16px 36px` down-screen,
toward the noon sun, and Rhyme's one derived drop-shadow used `+(lx, ly)` for the same reason. Both read
plausible; both were inverted. That is the argument for this law being worth more than tidiness, and it is
why 1.2's exit criterion is about direction and not only about the absence of literals.

Completed at **1.2**. BTC carries 15 fixed offsets today: `OCCVM-D2`.

### OCCVM-L5 — gilt is reserved

The gilt ramp `--gilt-c #7a5510 → --gilt-b #d9a52c → --gilt-a #ffe9a3` marks **what decides** and nothing
else. Malachite and ruby carry outcome; verdigris carries seams and age; bronze carries binding.

A surface that is merely important is not gilt. A number that settles something is.

### OCCVM-L6 — the mineral set is frozen, with fixed meanings

The mineral is the reader's choice of accent, and the set is closed:

| mineral | meaning | accent | deep |
|---|---|---|---|
| `amethyst` | the default field | `#8d5cf0` | `#4a2a8c` |
| `malachite` | affirmed, won, positive | `#3fbf7e` | `#1c6a45` |
| `ruby` | negated, lost, failed | `#e0475f` | `#6b1a2e` |

Both tools implement the same set with the same meanings and **no local exceptions**. Each tool stores its
own choice.

**Cross-tool preference sharing is not attainable and is not required by this law.** `localStorage` is
per-origin; the tools are served from `btc-terminal.pages.dev` and `ghostarchitecture.github.io`, and no
common origin exists. The roadmap's 1.4 exit criterion — *"a mineral chosen in one tool is honored by the
other"* — is therefore replaced by conformance: one set, one meaning, one behaviour, stored twice. This is
the only place this spine departs from a stated roadmap exit, and it departs because the criterion is
physically unreachable, not because it is inconvenient.

Mineral **properties** — hardness, cleavage, refractive index — are 2.0's substance and are explicitly not in
this law. Completed at **1.4**, closing `OCCVM-D6`.

**One implementation, `occvm/minerals.js`, spliced into both tools** — the same treatment as `sundial.js`
and `veins.js`, and the correct fix for what D6 actually was: not just that BTC had no mineral system, but
that Rhyme's own two-entry copy (no `ruby` — it had never needed a negative mineral) was a *local*
implementation of a law that says "no local exceptions." Rhyme's `MINERALS` is now `OCCVM_MINERALS` under
its old name, unchanged at every other call site; ruby exists there for the first time.

**BTC's use is deliberately narrower than Rhyme's, and that is not a partial close.** Rhyme spends the
mineral pervasively — page wash, slab edges, focus rings, rhyme-match highlighting, picker borders —
because none of that surface carries any other meaning. BTC's malachite and ruby already carry a fixed
meaning everywhere (§5 of CLAUDE.md: "the most dangerous possible bug in this tool" is inverting it), so
widening the mineral onto BTC's chrome risks a reader mistaking a decorative accent for the outcome
signal. The mineral is wired to the one surface that was already load-bearing for this tool and carries no
outcome meaning: the vein layer (`veinLayer`/`veinLayerLegacy`), plus a picker in Settings → Advanced. The
roadmap's 1.4 exit criterion is met — BTC has a working, chosen, persisted mineral preference — without
touching `--malachite`, `--ruby`, `--up`, `--down`, or any surface §5 governs. `test/occvm.js` pins both
halves: the mineral drives the vein layer, and switching it never inline-sets an outcome token.

### OCCVM-L7 — figure discipline

Numerals in a column are tabular. Numerals in running text are lining. A tool depends on **no font the
visitor's operating system supplies** for any numeral that carries meaning.

The face is `occvm/mono.css` — IBM Plex Mono under the SIL Open Font License, subset to the 108
codepoints these tools actually render and base64-embedded. It ships **only where mono is rendered**:
Rhyme resolves zero mono elements, measured, so it does not carry 22 KB of a face it never paints.

**Two weights, and that is not a luxury.** The largest number in BTC — the live price — is set at
`font-weight: 600`. With a single 400 face the browser synthesises the bold by smearing the outline,
which changes the advance width and breaks the very column this law exists to hold. Both faces are
strictly monospaced at **600/1000 em, the same advance in both**, verified in the browser: a ten-digit
string measures 600px at 100px in weight 400 and in weight 600 alike. `font-synthesis: none` stops
anything reintroducing a synthesised weight.

**Fifteen symbols fall back, and the column still holds.** The upstream latin cut has no Greek, arrows,
geometric shapes or check marks; three of those (`●`, `✓`, `✗`) land inside right-aligned numeric cells,
where a fallback glyph's own advance would shift every digit before it. Those sites carry `.occvm-sym`,
which pins the advance to `1ch` — the owned face's own advance — so alignment never depends on the
visitor's font even for a glyph this face does not carry.

**`--t-num` is 1, and that is a measurement rather than a placeholder.** At 100px the face's digit ink is
71px against a serif cap of 65 and a sans cap of 68 — figures 4% to 8% taller than the text beside them,
which a global 0.94 would correct. It is not applied. The text faces are OS-supplied *by deliberate
design* (the roadmap's own non-goal for a sans), so that ratio is against one machine's fallbacks and
does not generalise; and these numerals sit in mono runs — tables, tape rows, the price readout — far
more often than inline beside prose. Shipping a six-percent shrink across every number in the tool,
justified by a figure that changes with the visitor's operating system, would be worse than shipping no
adjustment. The token is governed so a surface that genuinely mixes the two has one place to say so.

Completed at **1.3** for BTC. `OCCVM-D3` closed.

### OCCVM-L8 — the interaction floor

Every action is a real control: correct element semantics, reachable by keyboard, state announced
(`aria-pressed` on a toggle), a target of at least 44×44px, and one focus ring shared across the system.
Every motion respects `prefers-reduced-motion`.

**The size floor exempts a target inline within a flow of text**, and that exemption is not a convenience.
It is WCAG 2.5.8's own carve-out for targets in a sentence, and it exists because a reading surface is a
document, not a control panel. Rhyme's stones are 25×20px gems sitting inside a word inside a line of a
poem: enlarging them restructures the poem, and an overlay large enough to reach 44px overlaps the
neighbouring stone it exists to distinguish — trading a size floor for a wrong target. Anything that is
*chrome* — a control, a list row, a chip in a picker — takes the floor with no exemption.

The primitives are `.occvm-act` (§3), a reset that lets a `<button>` carry a surface's existing class
unchanged, and the shared focus ring.

Completed at **1.5**. Before it, Rhyme had no `<button>`, no `aria-*`, no `role`, no `tabIndex`: `OCCVM-D7`.

### OCCVM-L10 — vein habit

Veins are **grown, not drawn**. The generator is diffusion-limited aggregation: a walker enters the
matrix, moves at random, and sticks the instant it touches the aggregate. Branching is dendritic because a
protruding tip intercepts walkers before they reach the shielded interior — the screening effect, which
nobody authors. `--vein-density` is the walker budget as a fraction of the lattice; `--vein-habit` is the
anisotropy of growth, 0 for the equant dendrite of a manganese oxide and 1 for an elongated acicular
form.

**The mineral is aragonite, and since 1.1a the generator encodes that rather than labelling it** (roadmap
2.0: substrate and vein anchor to one crystal, because a vein is not a foreign material embedded in a slab
— it is the same crystal grown differently). Two properties of real aragonite are grown here:

- **Fibres radiate from a nucleation point.** Anisotropy is measured from the growth's own nucleus, a
  direction in the material's frame. Until 1.1a it was a bias toward *horizontal steps* — a direction in
  the viewport, which is a fact about the browser window. A crystal has no idea which way the screen is.
- **It twins in threes.** Aragonite's signature is cyclic twinning on {110}: three individuals near 120°,
  mimicking a hexagonal prism closely enough that the pseudo-hexagonal form is what the mineral is known
  for. Each nucleus carries three sectors with its own rotation.

**The mechanism is attachment, not travel**, and that distinction was established by measurement rather
than chosen. The first implementation biased the walker's *drift* toward its sector axis; the angular
harmonics of the result were identical at threefold, onefold and sixfold, all dominated by a single lobe.
A walker pushed radially outward is pushed *away* from the aggregate and is abandoned rather than
sticking, so the bias spent walkers instead of shaping growth — and snapping an axis to the nearest
lattice step collapses three directions 120° apart into four. A real crystal is not anisotropic because
the diffusing atom travels differently; it is anisotropic because **attachment differs by crystallographic
direction**. The walk is now a pure unbiased random walk and the anisotropy lives in whether a contact is
accepted. Measured on the exact owner and rotation of each growth, the angular harmonic at the twin order
dominates: **0.665 at the shipped habit of .55**, against 0.116 for the next strongest, and it tracks the
parameter — fourfold gives k=4, sixfold gives k=6, and habit 0 gives no angular structure at all, which is
what an equant habit is.

*`twin` is a generator parameter and deliberately **not** a CSS token. Twinning is a material property,
material properties are 2.0's substance, and a `--vein-twin` token would put one into the 1.x token
surface — the leak the 1.4 note warns about. At 2.0 it comes from the material definition.*

**No curve is fitted over the aggregate.** Every stroke is a straight segment between a particle and the
particle it stuck to — the record of how it grew. A fitted curve is the bezier arriving back through the
renderer, and both tools previously drew three displaced cubic beziers and called the result a vein.

This law is 2.0's discipline arriving early: *simulate the process, never the resulting shape.* It is the
first test of whether that discipline survives contact with a real surface, which is why 1.1 comes before
everything else in the roadmap's sequence.

Completed at **1.1**. The generator is `occvm/veins.js`, seeded and pure (§4), with each tool falling back
to its previous generator if growth fails.

**What was verified, and what was not.** The roadmap's exit is *"veins pass a side-by-side against
photographed mineral without the eye catching a bezier"* and *"generation under 30 ms on a cold mobile
load."* Recorded honestly:

- **No bezier, verified structurally.** The traced path uses `M` and `L` and nothing else, asserted in both
  tools against the path data rather than the surrounding markup.
- **The side-by-side against a photograph was not performed.** There is no photographed mineral in this
  environment to hold it against. What was done instead: the output was rendered and looked at, and the
  first two attempts were rejected on sight — a von Neumann lattice produced axis-aligned staircases that
  read as circuit routing, and an edge seed grew a comb with all its mass banked against one side. Moore
  sticking, scattered nuclei, a full particle budget and a sub-cell trace offset fixed both. That is a
  weaker test than the criterion names and is recorded as such.
- **Timing: 6.4 ms warm and ~30 ms on the first call, measured in Chromium in this container** at the
  lattice each tool actually uses. The first call is dominated by JIT compilation of the generator, not by
  growth — every later call is single-digit. **A cold mobile load cannot be measured from here**, so the
  criterion is not claimed as met; the measurement is on the record with its instrument named.

The layer is a **data URI, and both the fragment reference and the colours carry a literal `#`.** Left raw
inside the URI it ends the URI at a fragment; pre-encoded to `%23` it survives into the parsed SVG as two
literal characters and `href="%23v"` resolves to nothing — the layer renders empty while every string
check still passes. `field()` therefore returns raw SVG and the caller encodes the whole document. Both
tools shipped this bug during 1.1 and neither the golden token diff nor a substring check saw it; it was
found by decoding the URI into an `<img>` and counting inked pixels.

### OCCVM-L11 — fracture

**A destructive action does not share a physical vocabulary with a reversible one.** Everything else in
these tools fades, slides or settles. Those are elastic behaviours, and elastic behaviour implies the
thing could come back. Aragonite does not deform past its limit — it **cleaves**, along fixed planes, at
an angle its own lattice decides. Irreversible actions get that vocabulary and nothing else does.

**The angle is not chosen.** It is `2·arctan(b/a) = 116.209°` from the unit cell — the same {110}
composition plane the vein generator's cyclic twin is built on — imported from `occvm/veins.js` rather
than recomputed, because two derivations of one angle is the defect `OCCVM-L3` exists to prevent, one
material down. An eyeballed crack is decoration wearing this law's clothes. *Since 2.0 the chain runs one
link further back:* the cell itself lives in `occvm/material.js` (L12) and veins reads it, so the angle
has one derivation and the lattice it comes from has one owner.

*A second load-order defect, found at 2.0 and shipped since 1.1b:* this file captured `OCCVM_VEINS` into a
module-scope binding while its own IIFE ran. The splicer inserts every part after one anchor, so parts land
in **reverse** list order and fracture is evaluated *before* veins is assigned — the binding was null and
`cleave()` threw on every call in the browser, while Node resolved it through `require` and every assertion
passed. The read is now lazy, which is order-independent, and `test/occvm.js` runs the spliced blocks in
the page's own order with no `require` available so the guard tests the real condition. 1.1b's replacement
of a `|| 116.209` fallback with a throw is what made the failure loud instead of silently wrong; the throw
was right and the capture was not.

The primitive is `occvm/fracture.js`, the spine's **first shared behaviour** rather than shared
appearance: two clipped halves separating along the split normal, each torquing ≤6° because real cleavage
does not slide parallel; 220 ms, faster than any elastic curve in the system, because sharing a duration
with a settle would put it back in the vocabulary it exists to leave; and **no fade at any point** —
cleaved material does not become transparent, it becomes absent.

**Scope is the discipline, not the coverage.** Delete, discard, disconnect. Never a cancel, never a
dismiss, never a close. A vocabulary that marks everything marks nothing.

*BTC has almost no call sites for this and that is not a gap:* CLAUDE.md §4 makes its ledgers
ungardenable — withdrawals log as `WITHDRAWN`, nothing is silently deleted — so the tool has very little
that is irreversible by construction. Rhyme's shelf removal is the first real consumer.

*What the clone taught, recorded because the assertions did not catch it:* the first version cloned the
element and stripped its `id`, which is necessary (two elements with one id breaks `getElementById`) and
which rendered the halves **blank** — everything an `#id` rule had been supplying was gone. Two clones,
opposite torque, no fade, host cleaned up: every assertion passed on an invisible fracture. The clone now
carries its **resolved** style, so it is indifferent to how the element was selected. Some things are only
visible by looking at the frame.

### OCCVM-L12 — the material

**A hex is not authored. A material is defined, and the surface values are derived from it.** Until 2.0
`--sub-hi`, `--sub` and `--sub-lo` were three separate decisions that happened to look related, and the
only thing holding them in a ramp was that one person mixed them on one afternoon. They are now one
material, one body colour and one cut geometry, and their **ratios** fall out of the arithmetic.

The material is **aragonite**, CaCO₃, orthorhombic, space group Pmcn. It is not chosen for its looks; it
is chosen because it has three of everything a slab needs one of. `occvm/material.js` is the definition
and it owns the lattice:

| property | value | governs |
|---|---|---|
| unit cell | a 4.96 · b 7.97 · c 5.74 Å | the {110} twin angle (L10, L11) |
| principal indices | α 1.530 · β 1.680 · γ 1.685 | the three faces' reflectance |
| hardness | Mohs 3.5–4 | how sharply a face may be cut (L2) |
| density | 2.93 g/cm³ | cast weight (L4) |
| stiffness C11/C22/C33 | 171.1 / 110.1 / 98.4 GPa | anisotropic motion (P1, registered) |

**The lattice has exactly one owner.** `occvm/veins.js` reads the cell from here rather than restating it,
and `occvm/fracture.js` reads the angle from veins. Before 2.0 the same three lengths were typed in two
files — two copies of one fact, which is the defect `OCCVM-L3` exists to prevent, one material down, and
it would have gone unnoticed until somebody edited one of them.

**Three derivations were measured; two are recorded as wrong.** The argument for an orthorhombic system is
that a slab has three faces sharing one scaled response today, and three principal indices give each its
own value. That argument is right and the two obvious ways to cash it in are not:

1. **Normal-incidence Fresnel** on α/β/γ gives 4.39% / 6.44% / 6.51% — a spread of **1.48×**, against the
   **5.74×** linear-luminance spread the tools actually author. Real optics, taken that way, is 3.9×
   *flatter* than the design. A substrate derived from it is nearly monochrome and both tools lose the
   structure they are read by.
2. **Weighting reflectance by incident flux** — `R(θ)·cos θ`, the intuitive fix, adding the sun — is
   **worse**: the cosine very nearly cancels the Fresnel rise and the whole 0–90° sweep collapses to
   **1.13×**, peaking at 76.9°. Flux-weighting cannot produce a ramp at all. It is written down because it
   sounds more physical than what replaced it, and the next person to have the idea should not spend the
   hour. `test/occvm.js` pins the measurement so it cannot be quietly re-adopted.

**What is in force** is the third: on a dark, glossy solid you do not see a diffuse return, you see the
**specular** one, so a face's brightness tracks `R` at the angle it presents **to the viewer**. Those
angles are the slab's own cut geometry — the thing L2 already fixes — not the sun's position:

| face | angle from view normal | index | R |
|---|---|---|---|
| front | 0° | α | 4.39% |
| chamfer | 45° | β | 7.60% |
| edge | 80° | γ | 41.04% |

**The sun drops out of the ratio, and that is why this derivation is the one kept.** The material owns
*structure*; the sundial owns *magnitude*, exactly as it has since 1.2. 2.0 therefore does not fight the
light pipeline or double-apply it — which is precisely what the elevation-parameterised version did: it
re-sorted its own faces as the sun moved, and let `mid` collide with `hi` at noon and with `lo` at dawn.

**Which index sits on which face is a convention and is flagged as one.** Crystallography establishes that
there are three principal indices and that they differ; it does not tell you how a rendered rectangle is
oriented in a lattice, because a rendered rectangle is not in a lattice. α on the front and γ on the edge
is chosen so the ordering runs the same direction as the ramp the tools already read. This is the same
honesty flag P1 carries about mapping crystal axes onto screen axes, and it is stated here rather than
buried in a comment.

**Where the material and the hand disagree, stated rather than fitted:**

| | edge : chamfer : front |
|---|---|
| optics | 9.353 : 1.732 : 1.000 |
| authored today | 5.739 : 2.539 : 1.000 |

Same **ordering**, different **shape**. The material is more convex — it makes the edge carry more of the
range and the mid-tone less, which is what a cut mineral does and what a hand-mixed ramp tends not to.
This is **not** corrected by a per-face fudge: a per-face correction is three authored numbers wearing a
derivation's clothes, which is the exact thing this law exists to remove.

**One value here is not derived, and it is named.** `contrast` is a legibility parameter: an exponent on
the optical ratio setting how much of the available range the substrate spends. Physics fixes the order
and the shape; it does not know how readable a terminal has to be at 3am. At contrast 1 the substrate is
the mineral's; at **0.7816** — derived, `log 5.739 / log 9.353`, and it moves if the material moves — its
spread equals what the tools author today. It is named in the material for the same reason L7 names
`--t-num`: a judgment gets called judgment in the place somebody would otherwise mistake it for
measurement.

**A reflectance ratio is a ratio in linear light.** The body colour is decoded out of sRGB, scaled by one
gain across all three channels, and re-encoded. *Recorded because the first resolver did neither:* it
scaled the sRGB bytes directly, so a 9.35× optical spread rendered as **116×** — the transfer function
applied twice — and it shifted hue, because saturating one channel before another is a colour change
nobody asked the material for. One gain in linear light is hue-preserving by construction, and
`test/occvm.js` pins both.

**2.0 defined and derived without repainting.** What it produced was the definition, the resolver, and the
measured distance between what the material says and what the tools do — the input any repaint needs and
which nobody had before. **2.3 spends it, on one surface.**

**The free parameter is anchored, and the anchoring is the argument.** `body` is the material's one
judgment value: a mineral's colour comes from trace chemistry, not from its lattice, so no amount of
crystallography produces it. At 2.3 it is set to **L1's own substrate floor `#0e0d13`**, replacing an
arbitrary `#12111a`. That is the same move `contrast` makes and it carries the same objection — setting
the material's free value *from* the tools is fitting, and it should be said out loud. The answer is that
a free parameter has to be set from something, the alternative was a number with no reason at all, and
**the fit is to one value while the derivation then predicts the other two**:

| | derived | authored | |
|---|---|---|---|
| `--m-sub-hi` | `#2c2a36` | `#2c2a36` | **exact, and not fitted** |
| `--m-sub` | `#131219` | `#1b1a22` | 3.91 L* darker |
| `--m-sub-lo` | `#0e0d13` | `#0e0d13` | exact — this is the anchor |

**The authored substrate's endpoints are aragonite**, at L2's cut geometry, to the byte. The hand got the
endpoints right and the middle wrong, and the middle is exactly where 2.0 said the two disagree: at the
adopted contrast the *spread* matches by construction (5.739) and the *shape* does not (1.536 against
2.539), because the material is more convex and spends more of its range on the edge.

**The value reaches the stylesheet without passing through a hand.** `occvm/tools/gen-substrate.js` emits
`occvm/substrate.css` from the material; it is spliced like any other part, and CI runs it with `--check`.
L12's claim is about *provenance*, and provenance does not survive a hand-copied hex. **A generated
constant rather than a runtime token**, because 2.0's finding was that the sun drops out of the ratio —
the ramp is constant, and recomputing a constant every tick buys nothing and adds a second place to be
wrong.

**Adoption is per-surface (§6b) and the first surface is Rhyme's `.slab`.** BTC has not adopted: its
substrate sits under the win/lose colours L5 governs, which is not the place to prove a new derivation.
The three tokens are therefore *declared spine-wide and consumed only in the other repository* — the one
case where `OCCVM-D12`'s rule does not apply, because a spine token's consumer need not live in the
repository that declares it. `test/occvm.js` pins both halves: that the endpoints still predict, and that
BTC's own CSS has not quietly adopted.

**P1 — anisotropic motion: derived, measured, and deliberately not wired.** The stiffness tensor gives
each axis a settling time, and the relation is the oscillator's rather than the spring's: `T = 2π√(m/k)`,
so duration ∝ `1/√k`. The other candidate — static compliance, `1/k` — is wrong for a *temporal* quantity;
it describes how far a thing deflects, not how long it takes. Both are recorded because they differ enough
to matter:

| | a | b | c |
|---|---|---|---|
| `1/√k` — in force | **0.7584** | 0.9454 | 1.0000 |
| `1/k` — rejected, static not temporal | 0.5751 | 0.8937 | 1.0000 |

**It ships no token, and the census is why.** Anisotropy is only observable as a difference between **two
directions in the same view**. Across both tools and the spine at 2.0:

- `translateX` — **zero animated sites**, in either tool;
- `translateY` — three (`.edge:active` 260 ms, `rise` 380 ms, BTC's chevron);
- `translate(x, y)` — eight sites, and **every one is a static light-vector offset**, `calc(var(--lx) * Npx)`,
  not a motion.

There is no pair. The one genuinely animated 2D direction anywhere is fracture's separation along the twin
normal, and projecting the per-axis scalars onto it gives **194.4 ms against the isotropic 220 ms**, an
11.6% change. But the fracture angle is **fixed** — one direction, every time, with nothing beside it to be
faster or slower than. That is not anisotropy; it is 220 renamed to 194.

Shipping `--dur-a/--dur-b/--dur-c` would be three tokens computed and consumed by nothing, which is
`OCCVM-D12` exactly — closed at 1.2a, one release before this one. **The arithmetic stays because it is
right and cheap; the wiring waits for a second axis to exist.** Each repository's suite holds a
**self-retiring guard** over its own files: it counts animated horizontal motion and asserts the count is
still zero, so the day somebody adds one the suite fails and says P1 has become expressible. *This is the
same disposition 1.1b gave the twin misfit, and for the same reason:* a physically-motivated extension that
produces nothing measurable in the regime these tools are actually in is a finding, and raising a
coefficient until it produced a visible result would be fudging a derived number to reach a wanted picture.

**P4 — unit-cell spacing: derived, measured, and not wired.** The three cell edges normalised to the
shortest are a spacing triple with a reason behind them where an 8 px grid has none:
**a 1.0000 : c 1.1573 : b 1.6069**. Two measurements kill it, and the second is the one that matters.

**It does not describe the tools.** Censused over **213 real padding/margin/gap declarations** across both
tools: 19 distinct pixel values, weighted mean error against the cell ladder **10.79%**, and a plain 4 px
grid covers more of them (42.3% within 6%, against 32.4%). Adopting the cell scale would move 213
declarations by ~11% — a redesign wearing a derivation's coat, and the exact opposite of what the substrate
did at 2.0, where the material *reproduced* the authored ramp at a derived contrast.

**It does not survive to the screen.** Spacing quantises to whole pixels, and **84.5% of both tools'
spacing is under 12 px**, where rounding destroys the ratio:

| base | renders | rendered ratio |
|---|---|---|
| 2 px | 2 / 2 / 3 | **two of the three steps collapse** |
| 4 px | 4 / 5 / 6 | 1.000 : 1.250 : 1.500 |
| 6 px | 6 / 7 / 10 | 1.000 : 1.167 : 1.667 |
| 8 px | 8 / 9 / 13 | 1.000 : 1.125 : 1.625 |

The rendered c-step wanders **1.125–1.250** across the bases these tools use — a function of the base, not
of the material — and straddles the cell's own 1.157 without ever equalling it. The derivation is present
in the source and absent from the render, which is a value computed and consumed by nothing wearing a third
disguise.

**And the ratio is not distinguishable from the one it would replace.** `b/a = 1.6069` against the golden
ratio 1.6180 differs by **0.04 px at step 1**, 0.35 px at step 3, and does not reach a whole pixel until
step 5 — past the largest spacing either tool uses. Over the range where all the spacing actually lives
they are the same number. What the cell buys is **provenance, not appearance**. That is worth having; it is
not worth 213 moved declarations.

**The guard ships even though the scale does not, and precisely because they are indistinguishable.**
Somebody will eventually "correct" 1.6069 to 1.6180 on the grounds that it looks like a typo for φ. It is
not a typo. It is 7.97/4.96, and the whole point of L12 is that a value has a reason. The suite fails on a
golden-ratio constant appearing in the spine, and fails on a spacing token shipping while P4 is unexpressed.

### OCCVM-L9 — night

Night is a **continuous quantity**, not a state flag: `--night` ramps from 0 at −2° elevation to 1 at −10°.
A binary step cannot express the civil / nautical / astronomical dusk stages, so the ramp is the 1.0 law
and the staging is additive over it — `--dusk-stage`, landed at **1.7**: `day` at or above the horizon,
then `civil` (0° to −6°), `nautical` (−6° to −12°), `astronomical` (−12° to −18°), `night` below that. The
boundaries are the standard astronomical ones, evaluated against the raw elevation the sundial already
computes — neither `--night` nor the internal `dusk` blend fraction is redefined by this; the ramp is
unchanged, `--dusk-stage` is a second, independent, discrete reading alongside it.

Night acts on **ink only**. No surface takes a glow. `--glow` is the ink bloom and nothing reads it for a
substrate. BTC's `--bloom` — a malachite glow on `.tile`, renamed rather than removed at 1.2 specifically
so 1.7 could retire it under this law — is deleted, not replaced: the tile takes no glow of any kind now.

**Ink's response to night is a phosphor curve, not a ramp** (1.7). `--phosphor` is `1 − e^(−3.2·night)`,
normalised so the ends stay exactly 0 and 1: 0.58 by a quarter of the way into night, 0.83 by half, then
flat. The linear ramp it replaced went on brightening the page through a range where the eye has long
since adapted, which is what a placeholder looks like once you plot it. `--glow` and `--nglow` ride the
curve; `--night` itself is untouched, exactly as the staging above is.

**The moon is a second light, and it reaches ink alone** (1.7, amending L3 for this case and no other).
`OCCVM-L3`'s "exactly one light" still governs every **surface**: the moon casts nothing, bevels nothing,
and moves no substrate. What it touches is `--bone` and `--nglow`, at night, and that is the whole of its
authority. Position is real low-precision lunar theory (Meeus ch. 47) in the same shared implementation as
the sun — verified against its own physics rather than asserted: synodic period 29 d against a true 29.53,
illumination spanning exactly 0.000 to 1.000, transit sliding 44–50 min later each day against a true ~50,
with the variation itself real orbital eccentricity.

**Illumination is not optional and altitude is not enough.** `--moon-light` is the product of three terms
that must all hold — the moon is up, the moon is lit, and the sun is gone — so a new moon at the zenith
contributes exactly nothing rather than a little. Over sixty nights at Dayton the term spends 57% of night
hours at essentially zero and 9% near full, which is the distribution a real sky has.

**Where it is routed was decided by reading the consumers, not by assuming.** `--glow` is used as an
*opacity* (Rhyme's `.stone::before`) and already reaches 1.0 on a moonless night, so a moon term there
would have been clamped away invisibly. `--nglow` is a blur radius in px and has headroom; `--bone` is the
ink itself. A full moon recovers ink about 30% of the way back toward its daylight value.

**The 1.7 exit, measured rather than claimed.** The roadmap asks that *"a screenshot at 21:40 and one at
23:10 are visibly different tools."* Over thirty nights at Dayton the two frames differ on **18**. On the
other twelve the moon is below the horizon at both instants, so there is no light to differ by — and
manufacturing one would be authoring a sky. The criterion is met whenever there is a moon to meet it with,
and that is the honest form of it.

*BTC's `--night` was a binary step at −2° before 1.2: closed `OCCVM-D2`.*

---

## 2. Tokens

### 2a. Spine tokens — governed at 1.0

Measured identical in both tools at all three golden instants. These are what `occvm/spine.css` declares.

```
--edge          #0b0a10     the cut edge, darkest
--bone-lo       #b7ad9c     dimmed inscription
--gilt-c #7a5510   --gilt-b #d9a52c   --gilt-a #ffe9a3      the deciding ramp (L5)
--bronze-c #4f3a1c --bronze-b #8f6a35 --bronze-a #d9a866    binding
--verdigris #3f9a86  --verdigris-lo #23574c                 seam, age
--serif         "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif
```

**Added at 1.1 (OCCVM-L10):** `--vein-density` and `--vein-habit`.

**Added at 1.3 (OCCVM-L7):** `--mono`, now an owned stack whose first entry ships with the tool, and
`--t-num`. Both are declared in `occvm/mono.css` rather than `spine.css`, because the part that declares
them is the part that carries the face.

**Added at 1.2 (OCCVM-L4, L2):** the cast depths `--occvm-cast-1 --occvm-cast-2 --occvm-cast-3` and the
bevel components `--lit-x --lit-y --cut-x --cut-y`. A surface picks a depth or multiplies a bevel component
by its own; it never authors an offset. The depth multipliers are anchored so each reproduces at high sun
the offset it replaced, so the noon frame barely moves and the low-sun frames carry the change.

**Added at 1.8 (OCCVM-L2):** `--occvm-bevel`, the whole cut face as a single composable value. `.occvm-slab`
and `.occvm-cast` both own `box-shadow`, so a surface could not wear both — the later rule won and the other
was silently lost, which meant every surface wanting a cut face *and* a cast re-authored the bevel by hand,
which is how channel literals get back into a tool that had removed them. A surface now writes
`box-shadow: var(--occvm-bevel), var(--occvm-cast-2)`. `.occvm-slab` is defined in terms of it, so the
primitive and the composable value cannot drift. **Found by the reference surface on its own first
section** — the instrument built to catch this class of gap caught one before it had finished being built.
Neither tool's rendering moves: the token is added, no existing value changes, and neither tool uses
`.occvm-slab` yet.

`--serif` is spine-governed in one canonical spelling. Both tools also still declare their own — the same five
faces in the same order, differing only in whitespace — and at 1.0 that shadowing declaration **stays**. The
spine is inlined above the tool's CSS and nothing else changes (2.0 migration process §3.2); deleting a
now-redundant tool declaration is per-surface adoption work, done at the release whose law covers it.

### 2ab. Governed since 1.2 — written by the sundial

`--lx --ly --elev --night --dusk-stage --phosphor --fill --rake --sheen --hi-a --cut-a --shade-a --glow
--lxpx --lypx --nglow --nglow-s --moon-alt --moon-illum --moon-light --moon-x --moon-y --sub --sub-hi
--sub-lo --bone --bone-lo`

All resolved scalars or hexes, all written by `occvm/sundial.js` at most once a minute, none a `calc()`.
`--bone-lo` is derived from `--bone` rather than authored beside it (L1). `--dusk-stage`, added at 1.7, is
the one entry here that is neither a scalar nor a hex — a discrete stage name — because the quantity it
carries (which of day/civil/nautical/astronomical/night the instant falls in) has no continuous value. The five `--moon-*`
entries and `--phosphor` arrived at 1.7: the moon is a second light reaching ink alone (see L9), and it
is measured in the same shared implementation rather than a second sky.

### 2b. Registered, not yet spine — promoted at the release named

Declared by one tool or by both with divergent derivations. Each is spine at the release that unifies it;
until then the tools' own declarations stand and the gap is a defect.

*Empty as of 1.4.* `--mineral --mineral-lo --vein-hi --vein-lo` were the last entries here: Rhyme declared
them alone, and BTC had no `ruby` mineral to declare at all. Both are now driven from the single shared
`occvm/minerals.js` (§ OCCVM-L6), so the gap this table exists to track is closed. `--ruby --ruby-lo`
remain BTC-only as *raw* CSS custom properties — that pair names BTC's fixed win/lose colour, §2c's kind of
tool-local token, not the mineral naming scheme — but the concept the row was tracking, Rhyme having no
negative mineral, closed with the shared map.

### 2c. Tool-local — not spine, not promised

Semantic tokens that belong to one tool's subject matter: BTC's `--up --down --err --warn
--field --rule --glass`, Rhyme's `--thick --bthick --stone-h --pad --c --k --text`.

`--bloom` was BTC's malachite glow on `.tile`, renamed at 1.2 so it stopped colliding with the spine's
`--glow` — a tool-local token is not a fork, and renaming one is not the same as resolving what it stands
for. OCCVM-L9 reserves `--glow` for ink and 1.7's exit was that no surface has taken a glow: `--bloom` is
deleted, not renamed again and not replaced with `--glow` on the surface, since the law says a surface
gets none. Closed at **1.7**.

---

## 3. Primitives

**Every spine primitive is namespaced `.occvm-*`.** This is not a style preference: `.row`, `.wrap` and
`.note` are already defined in both tools with incompatible meanings — `.row` is a six-column grid in BTC and
a flex row in Rhyme — so an un-namespaced spine primitive breaks a tool on the day it is inlined
(`OCCVM-D11`). The roadmap already writes `.occvm-cast`; this generalises it.

| primitive | governs | law | at |
|---|---|---|---|
| `.occvm-cast` | cast shadow from the light vector | L4 | 1.2 |
| `.occvm-slab` | a cut surface: radius, bevel, edge | L2 | 1.0 |
| `.occvm-rule` | a hairline division | L1 | 1.0 |
| `.occvm-focus` | the one focus ring | L8 | 1.5 |
| `.occvm-act` | a real control wearing a surface's own class | L8 | 1.5 |
| `.occvm-num` | tabular figures in a column | L7 | 1.3 |

At 1.0 these are declared and unused. Adoption is per-surface and per-release; nothing is rewired by the
splice.

---

## 4. Determinism

Every generator in a conforming tool is **seeded and pure**: same seed, same sun, same material yields the
same bytes. The seed is **injected, not generated internally** — written to `sessionStorage` before any page
script evaluates (`btc.seed`, `tome:seed`) — so a harness can pin it. A per-session seed remains the product
behaviour; injection only makes it observable.

Without this there is no golden set, no diff, and no way to tell a regression from a session. It is a **1.1
requirement, not a 2.0 one**, and it is satisfied in both tools as of 2026-09-06.

The golden set is `occvm/golden/`: two tiers, tier 1 (`tokens.json`, every token's computed value at three
pinned instants) is byte-stable and asserted on; tier 2 (PNGs) is for the eye and never diffed for equality.

---

## 5. Exception ledger

A surface that cannot conform gets an entry, not a workaround. One exception is a special case; two of the
same kind is a missing law.

```
SURFACE: rhyme .stone
LAW: OCCVM-L2 (cut geometry, radius <= 4px)
CONFLICT: stones are 25x20px; a 3px radius on a 20px height reads as a rectangle,
          losing the gem read that carries rhyme-class identity
RESOLUTION: exception granted — .stone resolves as crystal habit, not cut slab
STATUS: promotes to a law amendment in 2.1 if a second surface needs it
```

---

## 6. Defect register

`D1`–`D7` keep the numbering the roadmap was written against, so its release notes still resolve. `D8`+ were
found by measurement after it was written.

| id | tool | defect | closes at |
|---|---|---|---|
| **D1** | BTC | the expired `--ink --meas --bondi` alias block, past its removal window and still referenced | **closed 1.9** |
| **D2** | BTC | one light incomplete: no `--amb --rake --sheen --hi-a --cut-a --shade-a`, 15 fixed `box-shadow` offsets, `--elev` on a different scale with a 0.15 night floor, `--night` a binary step | **closed 1.2** |
| **D3** | BTC | the numeric face is OS-supplied; metrics vary per platform under a column | **closed 1.3** |
| **D4** | Rhyme | a runtime compiler: JSX compiled in the browser by `babel-standalone`, fetched with React and ReactDOM from a CDN. **With cdnjs unreachable the tool renders nothing** — measured, not inferred | **closed 1.6** |
| **D5** | BTC | half-installed PWA: `manifest.webmanifest` and four icons ship, with zero `serviceWorker` registration | **closed 1.6** |
| **D6** | BTC | no mineral system at all. `--amethyst` is declared once and referenced zero times | **closed 1.4** |
| **D7** | Rhyme | no interaction floor: 0 `<button>`, 53 `onClick`, 0 `aria-*`, 0 `role`, 0 `tabIndex` | **closed 1.5** |
| **D8** | BTC | `--glow` is a `calc()` expression, so it never resolves to a number at token level and no law can read it (L3) | **closed 1.2** |
| **D9** | BTC | the light vector keeps tracking the sun below the horizon (−0.516, −0.856 at −39°) instead of resolving neutral overhead (L3) | **closed 1.2** |
| **D10** | Rhyme | `--bone` is derived from twilight while `--bone-lo` stays fixed, separating a pair that must move together (L1) | **closed 1.2** |
| **D11** | both | `.row`, `.wrap`, `.note` are defined in both tools with incompatible meanings, so an un-namespaced spine primitive would break a tool on inline (L3 §3) | closed at 1.0 by namespacing |
| **D12** | spine | **`--amb` is written and read by nothing.** 1.2 recorded that `--elev`'s 0.15 night floor *moved* to `--amb`; measured, it was deleted. `--amb` resolves to 0.630 at night while the bevel alphas it was supposed to hold up, `--hi-a` and `--cut-a`, both collapse to 0.060. The law's claim that "a bevel stays legible after dark because ambient light is 0.53 there" is false as shipped. Found by 1.9's audit | **closed 1.2a** — ambient now fills what direct light does not; night bevel 0.060 → 0.161 |

---

## 6b. The 2.0 migration table (1.9)

**1.9's exit is that a reader who has never seen these tools can migrate a conforming tool to 2.0 from
this table alone.** It is therefore written for that reader and not as a summary for someone who already
knows. The census below is produced by `occvm/tools/token-audit.js`, which derives it from the artifacts
every time it runs; it is not a list kept by hand, and CI runs it with `--check`.

**Census at 1.9: 81 distinct tokens.** 27 written by the sundial each minute, 22 declared by the spine's
CSS, 32 tool-local (17 BTC, 11 Rhyme, 4 in both since 1.4).

### What 2.0 does to each class

2.0's break is that **a hex stops being authored and starts being derived**: `--sub: #1b1a22` becomes
`material(obsidian)` resolving to a surface response, with aragonite (CaCO₃, orthorhombic, biaxial) as the
anchor for substrate and vein alike. The table is by class, because the class is what decides the fate:

| class | tokens | at 2.0 | what a migrator does |
|---|---|---|---|
| **Substrate & ink** | `--sub --sub-hi --sub-lo --edge --bone --bone-lo --bone-dim` | **derived from the material.** Three substrate weights become the three faces an orthorhombic crystal actually has — lit face, shade face, edge — each taking its own principal refractive index (α/β/γ) rather than one scaled response. | Stop declaring them. Declare a material; read the same names back. The names do not change, which is deliberate: the migration is in where the value comes from, not in what a surface calls it. |
| **Material (L12)** | `--m-sub-hi --m-sub --m-sub-lo` | **Generated, never authored.** Emitted from `occvm/material.js` by `occvm/tools/gen-substrate.js`; CI fails on drift. Declared spine-wide, adopted per-surface — Rhyme's `.slab` at 2.3, BTC nowhere yet. | Run the generator; adopt on a surface when you choose to. |
| **Light (sun)** | `--lx --ly --elev --fill --rake --sheen --hi-a --cut-a --shade-a --lxpx --lypx` | **Unchanged in meaning.** Real astronomy already; 2.0 gives it real optics to interact with rather than replacing it. *One name changed at 2.2:* `--amb` → `--fill`, values byte-identical — see OCCVM-L3. | Rename `--amb` to `--fill`; nothing else. |
| **Night & moon** | `--night --dusk-stage --phosphor --glow --nglow --nglow-s --moon-alt --moon-illum --moon-light --moon-x --moon-y` | **unchanged.** Emission from materials is 2.0's, but it is additive over these, not a replacement. | Nothing. |
| **Cut & cast** | `--occvm-bevel --occvm-cast-1 --occvm-cast-2 --occvm-cast-3 --lit-x --lit-y --cut-x --cut-y` | **gain a density term.** Cast weight and apparent mass become functions of the material's density rather than three fixed depths. The three depths survive as the named steps. | Nothing, unless the surface authored its own offset — which no conforming surface does. |
| **Gilt, bronze, verdigris** | `--gilt-a --gilt-b --gilt-c --bronze-a --bronze-b --bronze-c --verdigris --verdigris-lo` | **verdigris becomes a process.** Oxidation as a function of exposure rather than a hex. Gilt and bronze stay authored: they are *finishes*, not minerals, and 2.0's non-goal clause covers them. | Read `--verdigris` as before; stop treating it as constant across time. |
| **Mineral** | `--mineral --mineral-lo --vein-hi --vein-lo` | **become material properties.** The three-mineral set stays closed with its fixed meanings (L6); what changes is that a mineral carries hardness, cleavage, birefringence and luster rather than two hexes. | Nothing at the token level. A tool that wants the new properties opts in. |
| **Vein** | `--vein-density --vein-habit --vein --veins` | **`twin` joins them from the material.** The generator already grows aragonite's habit as of 1.1a; at 2.0 the twin order stops being a default and comes from the material definition. | Nothing. |
| **Face** | `--mono --serif --sans --t-num` | **unchanged.** A typeface is not a mineral. `--sans` is BTC-local and stays OS-supplied by deliberate design — the roadmap's own non-goal for a sans. | Nothing. |
| **Tool-local semantics** | BTC: `--up --down --err --field --rule --glass --lit --shade --ink2 --malachite --malachite-lo --ruby --amethyst --amethyst-lo`; Rhyme: `--thick --bthick --stone-h --pad --c --k --text --heat --m --vk` | **not spine, not promised, unchanged by 2.0.** These name a tool's own subject matter. | Nothing. They are yours. |

### What the audit found once it stopped trusting the checkout

**BTC wrote `--mineral`, `--mineral-lo`, `--vein-hi` and `--vein-lo` and read none of them.** Four tokens,
declared and rewritten on every mineral change, consumed by nothing in that tool — `veinLayer()` took its
tint straight from `occvm/minerals.js` while taking density and habit from CSS, an inconsistency 1.4
introduced and nobody looked at again. Rhyme consumes all four, so with both clones on the machine the
audit saw them consumed and said nothing. **CI checks out one repository, and that is where it surfaced.**

Both halves are fixed. `veinLayer()` now reads `--vein-hi`/`--vein-lo` the same way it already read
`--vein-density`/`--vein-habit`, so the tokens `applyMineral()` writes are the ones the layer is grown
from; and BTC's mineral picker wears the mineral it is offering, which is what `--mineral`/`--mineral-lo`
are for.

**And the instrument had the golden recorder's own old defect, one level up.** Its `--check` gated on
"dead tool-local token" using a census that depends on which clones happen to be present — the exact
failure mode the recorder had before it was fixed earlier in this migration, where a measured token set
narrowed silently in CI. Here it did the opposite and failed a green build. Class [A] (a token consumed
and provided nowhere) is decidable from one repository and is still gated everywhere. Classes [B] and [C]
are not, and the audit now says so and declines to judge rather than reporting a partial picture as a
verdict. The harness assertion follows the same rule.

*Recorded here rather than quietly patched, because "the audit found four dead tokens" and "the audit
could not tell dead from consumed-next-door" are different sentences, and only the second one is true.*

### Aliases outstanding: none

The deprecation policy (§0) requires a token slated for removal to survive one minor cycle as an alias
marked `/* deprecated → newname (2.0) */`. **There are no such aliases**, and that is a finding rather
than an omission: the only alias block either tool ever carried was BTC's `--ink --meas --bondi`, and 1.9
swept it. Nothing is currently scheduled for rename at 2.0 — the break is in derivation, not in naming,
which is why this table's right-hand column so often reads "nothing".

### Divergences, each resolved

| divergence | resolution |
|---|---|
| L3 said "exactly one light"; 1.7 added the moon | **Law amended**, narrowly and in the open (§L3): one light on any *surface*; the moon reaches ink alone. |
| L6's roadmap exit asked that a mineral chosen in one tool be honoured by the other | **Documented exception** (§L6): `localStorage` is per-origin and the tools have no common origin. Replaced by conformance — one set, one meaning, stored twice. Physically unreachable, not inconvenient. |
| BTC spends the mineral only on its vein layer; Rhyme spends it across its chrome | **Documented exception** (§L6): BTC's malachite and ruby already carry a fixed win/lose meaning, and a decorative accent may not sit beside an outcome signal. |
| `--t-num` is governed and applied by nobody | **Documented exception** (§L7): measured at 1.0 on one machine's fallbacks, deliberately not generalised. |
| `--amb` is written and read by nobody | **Defect**, `OCCVM-D12`. Not an exception — the law makes a false claim about it. |
| Rhyme's vein layer is never measured by the golden set | **Defect-adjacent, recorded here**: Rhyme sets `--veins` per-slab inline rather than on `documentElement`, and the recorder reads `documentElement`. Its vein output has never been diffed. Fixing it means either moving the write or teaching the recorder to sample an element, and both are 2.0-scale decisions about where a per-instance token lives. |
| BTC's reference surface and golden set are not duplicated into Rhyme | **Documented exception** (§1.8): they are conformance instruments, not spine content. The law and the five parts are what every repository carries identically. |

---

## 7. Conformance table

| tool | version | build stamp | violates |
|---|---|---|---|
| **BTC Terminal** | 1.0, 1.1, 1.1a, 1.1b, 1.2, 1.2a, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9 | `build-20260907190822` | — |
| **Rhyme Instrument** | 1.0, 1.1, 1.1a, 1.1b, 1.2, 1.2a, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9 | `build-20260907190822` | — (renders no mono; D3 does not apply) |
| **Reference surface** | every part, spliced (1.0–1.9) | `build-20260907175747` | — (holds no values of its own) |

**At 1.0 the splice was a no-op by construction, and the golden set proved it: zero deltas in either tool.**

That is the point, not a weak result. The spine is inlined *above* each tool's own CSS, so every value it
declares is either identical to the tool's or shadowed by it — the parallel-spine pattern of migration §1,
where a tool that has not been touched still renders because the names it references are still defined.
Adoption is deleting the shadowing declarations, per surface, at the release whose law covers that surface
(migration §3, steps 4–6). Any delta at the splice itself is a splice bug, not a design change, and halts
the release (§3.5).

---

## 8. What each release did, and did not

**1.0** did not change a pixel — measured, not asserted, at zero deltas. It ported no token and closed no
defect except D11. It wrote down what is true, named what is wrong, and numbered the releases that fix each
one, so that everything after it had a baseline that exists.

**1.2** changed 104 values across the two tools, every one of them accounted for before the baseline moved
(migration §3.5: expected deltas only). The categories: the six response tokens and their companions
arriving in BTC, which is 1.2's stated Add; the new cast and bevel tokens; `--glow` becoming a scalar;
`--elev` rescaled with its night floor moved to `--amb`; the light vector resolving overhead below the
horizon; substrate and ink moving with twilight; `--bone-lo` deriving with `--bone`. Rhyme's eighteen are
the NOAA-versus-Spencer difference the audit measured, propagated — plus one real value change, the
substrate anchor unifying on the documented `#1b1a22` against an internal `#1c1a24`.

**What 1.2 found that nobody had written down:** every fixed cast offset in both tools had its direction
inverted, throwing shadows toward the sun rather than away from it. It survived because it looked
plausible and because no rule connected the offset to the light that was supposed to cause it. That is the
argument for L4, and it is pinned now by a directional assertion at three bearings rather than by a string
match.

**1.6** removed a 2.98 MB runtime compiler and 143 KB of CDN dependency from Rhyme by inlining 144 KB of
pinned, committed React — a net simplification measured in requests, not bytes: **three external requests
to zero.** The tool now renders with the network entirely refused, which is the exit criterion rather than
a harness convenience, and it is what makes its service-worker shell complete: before 1.6 the shell
precached the libraries only *after* a successful online load, which is precisely the load that failed
when the CDN was unreachable.

BTC's half was the missing worker. Three rules govern it and the first two are about not lying: market
data is **never** cached, because a cached price is a wrong price and this tool is only measurement; the
page is **network-first**, because the deploy procedure verifies by build stamp and a cache-first shell
would let a browser sit on an old one; and the cache name is the stamp, passed as `?v=`, so the worker's
own script URL changes on every deploy and nothing is hand-bumped. `theme_color` and the `theme-color`
tag now agree, closing the cosmetic split CLAUDE.md §8 had left open.

1.6 changed **no rendered value in either tool** — the golden set moved by three metadata entries, all of
them the vendored-request list going empty. An architectural release that moves a pixel has done something
it did not say it would.

**1.5** made every action in Rhyme a real control. 53 handlers on divs and spans became 20 button call
sites, 30 of them through two components — `Cast` (28 call sites) and `Stone` — so the tree reached the
floor without 50 hand edits. `.occvm-act` is the spine reset that lets a `<button>` wear a surface's own
class unchanged, which is what made the conversion a semantics change rather than a redesign: the golden
set moved by nothing.

The size floor took a refinement, not an exception. L8 now states WCAG 2.5.8's own carve-out for targets
inline within a flow of text, because Rhyme's stones are 25×20px gems inside a word inside a line of a
poem: enlarging them restructures the poem, and an overlay wide enough to reach 44px covers the
neighbouring stone it exists to distinguish — trading a size floor for a wrong target. Everything that is
chrome takes the floor with no exemption, and BTC — which the roadmap called "largely conforming" — turned
out to have six controls between 25 and 31px, plus a `<button>` nested inside an `<a>`.

Reduced motion became one rule in the spine rather than a list of selectors per tool. BTC's price readout
carried an unguarded half-second colour transition and its collapse chevron an unguarded transform, while
its only media query tested `no-preference` — the inverse of the one that matters. A selector list is a
rule the next animation escapes; a universal rule is not.

**1.2 did not** delete BTC's surface bloom, adopt any primitive class onto a surface beyond the cast, or
touch the numeric face, the mineral system or the interaction floor. Those are 1.7, 1.3, 1.4 and 1.5.

**1.9 (narrow)** closed D1. `--ink`, `--meas`, `--dim`, `--faint`, `--bondi`, `--bondi-deep`, `--model`
and `--model-dim` were a shim from an earlier naming scheme, kept "so nothing downstream breaks" past the
point anything still depended on the names rather than the values. Two of the eight — `--ink`, `--meas`,
`--bondi-deep`, `--model` — turned out to have **zero** call sites: pure dead weight. The other four had
77 call sites between them, every one an inline `style="color:var(--dim)"` string inside JS-generated
markup — the tool's CSS rules had already moved to the canonical names (`.lbl`, `.srcname`, `.tgl button`
all read `var(--bone-dim)`/`var(--bone-lo)` directly); only the generated HTML still spoke the old
dialect. That confirms 1.2's finding: the block was load-bearing, not dead, and the fix is a migration —
77 call sites moved to their real names (`--dim`→`--bone-lo`, `--faint`→`--bone-dim`,
`--bondi`→`--verdigris`, `--model-dim`→`--gilt-c`) — not a deletion.

The golden set's own token-set guard (added mid-session, §7's note on it) fired exactly as designed: the
declared-token scan found eight fewer names and failed the diff on `@token_names` before touching a single
value. Every one of the 24 value-level deltas that followed was one of those eight tokens going from a
resolved hex to absent at each of the three instants — nothing else moved. Re-recorded at 338 values.

The roadmap's fuller 1.9 sketch — a full token audit across the whole spine, a migration table for every
remaining divergence, promoting each to a law amendment or a documented exception — was not performed.
Nothing else in the spine currently carries an open alias that needs it; when one does, that work is still
owed under this same release number.

**1.4** closed D6 by moving the mineral set itself, not just BTC's copy of it, into `occvm/minerals.js` —
the fifth shared part, spliced the same way as `sundial.js`/`veins.js`. Rhyme's local `MINERALS` object
(two entries: no `ruby`) is now one line, `const MINERALS = OCCVM_MINERALS`, with all 4 of its existing
call sites unchanged. BTC gained `S.cfg.mineral` (default `amethyst`, persisted in `btc.cfg`), a picker in
Settings → Advanced, and `--mineral --mineral-lo --vein-hi --vein-lo` custom properties resolved from it —
consuming, for the first time, the `--amethyst`/`--amethyst-lo` tokens D6 found declared and never
referenced. `veinLayer()` and its fallback `veinLayerLegacy()` both now tint from the chosen mineral
instead of a hardcoded malachite hex.

**What 1.4 deliberately did not do.** Rhyme spends its mineral everywhere — background wash, slab edges,
focus rings, rhyme-match highlighting — because none of that surface means anything else. BTC's
malachite and ruby already mean something everywhere (§5 of CLAUDE.md, "the most dangerous possible bug
in this tool" is inverting which one a reader sees): `.up`/`.down`, the verdict banner, the settled-strike
ring, the live odds gauge, `--up`/`--down` themselves. Widening BTC's mineral onto any of that surface
would let a decorative preference sit beside — and eventually be mistaken for — the outcome signal the
whole instrument exists to keep honest. So BTC's mineral touches exactly one surface, the vein layer,
which carried no outcome meaning before or after. The roadmap's 1.4 exit — "a mineral system exists and is
a stored preference" — is met; the pervasive-accent shape Rhyme has is not, and is not owed by this law
(§L6 already states each tool stores its own choice; nothing in it requires the same *extent* of use).
`test/occvm.js` pins both directions: the vein layer's output changes with the mineral, and switching it
never inline-sets `--malachite`, `--ruby`, `--up`, or `--down`. Golden-verified: exactly five values moved
per instant (`--mineral`, `--mineral-lo`, `--vein-hi`, `--vein-lo`, `--vein`) against a token count that
grew from 62 to 66; nothing else in either tool's recording changed.

**1.7** added `--dusk-stage` to `occvm/sundial.js`'s `respond()` — one of five discrete names (`day`,
`civil`, `nautical`, `astronomical`, `night`) at the standard elevation boundaries (0°, −6°, −12°, −18°),
evaluated against the raw solar elevation the position algorithm already produces. Nothing about the
existing `--night` ramp or the internal `dusk` blend changed: the law states the ramp is the 1.0 law and
the staging is additive, and it is — same formula, same output, a second field alongside it. `tick()`
mirrors it as `stage` in its return value; BTC threads it onto `S.sun.stage` for parity with every other
resolved reading it already carries, though nothing consumes it yet — this release makes the classification
available at the spine level, it does not mandate a UI for it. (BTC's own sun pill keeps its existing
day/night narrative — "sun rise", "morning", "sun high" — unchanged; that copy mixes direction with dusk
state in a way plain staging doesn't replace, and rewriting it wasn't this release's job.)

`--bloom` — BTC's malachite tile glow, renamed at 1.2 rather than resolved — is deleted outright: the
`:root` declaration and the `.tile` box-shadow term both gone, not replaced with `--glow` on the surface,
because OCCVM-L9 reserves the glow for ink and states plainly that no surface takes one. `test/occvm.js`
gains eleven guards: the five stage boundaries (including the exact edges, −6/−12/−18, which belong to the
stage *below* them per the law's own inequalities), that the ramp is untouched at its own reference points
(0.000 at −2°, 1.000 at −10°), that `sunTick` mirrors the stage, and that `--bloom` is neither declared,
referenced, nor present in the tile's box-shadow list.

Also corrected in passing: `SPINE.md` itself carried a line — "BTC's `--night` is a binary step at −2°:
`OCCVM-D2`" — stating the *pre-1.2* condition as if current, three releases after D2 closed it. Retitled as
history. `CLAUDE.md` §12 had the same drift: a bullet describing `test/occvm.js` as pinning the old binary
step and 0.15 `--elev` floor "deliberately, not as desired," directly contradicted by the 1.2 paragraph
immediately below it. Both are artifacts of documenting a release before it shipped and never revisiting
the sentence once it did — the same failure class as the `--model`/`--bondi` mention 1.4 caught in the
tool-local token list.

**1.8** built the reference surface, `occvm/reference/index.html`: one live specimen per law, drawn from
the five spine parts spliced into it rather than from a copy of their values. It is a *conformance
instrument*, not spine content, so it is not duplicated into Rhyme — it renders the numeric face, which
ships only where mono is rendered, and it sits beside `occvm/golden/` for the same reason that directory
does. What every repository carries identically is the law and the five parts; what checks them lives in
one place.

**Its whole claim is that it holds no values of its own**, and that claim is checked rather than asserted.
`test/occvm.js` strips the spliced fences out of the file — inside them the spine may of course state
values, that is what a spine is — and fails on any hex, any `rgb()`/`rgba()` triplet and any colour keyword
left in the page's own CSS or JS. Every surface, rule and piece of ink on it resolves through a spine token
or a `color-mix()` of one. The consequence is that this page cannot keep looking right after the spine
underneath it has stopped applying: it does not degrade to something that looks deliberate, it goes flat
and obviously wrong, which is the behaviour a reference surface should have and the reason the no-colour
rule is worth enforcing rather than merely intending.

It is recorded into the golden set as a third surface, and it is the sharpest of the three: a difference on
BTC or Rhyme might be that tool's, while a difference here can only be the spine's. `verify.js` no longer
carries its own copy of the surface list — it reads it from the recorder, because 1.8 added a surface to
`record.js` and the hardcoded `["btc", "rhyme"]` in the verifier would have recorded it and then never
diffed it. A golden set that quietly stops covering what it grew is the same failure the token-set guard
was added for.

**It found a real gap on its own first section, before it was finished.** `.occvm-slab` and `.occvm-cast`
both own `box-shadow`, so no surface could wear both — the later rule won and the other was silently lost.
The first draft of this page therefore hand-wrote the bevel, putting channel literals straight back into a
file whose entire point is that it has none. The fix is `--occvm-bevel` (§2a, added at 1.8): the cut face as
one composable value, with `.occvm-slab` defined in terms of it so the primitive and the value cannot drift.
Neither tool moves — the token is added, nothing existing changes, and neither tool uses `.occvm-slab` yet.

**The sweep, added when the amended roadmap surfaced 1.8's full brief.** The first pass shipped five
fixed dusk cells; the release actually asks for *the light vector swept from dawn to night on a slider
rather than a clock*, and the difference is not cosmetic. The slider holds an instant and the sundial is
driven from it, so **the whole page re-resolves** — every surface, bevel, cast, swatch and token, because
they all read what the sundial writes and none of them knows the clock was overridden. RESUME hands it
back. It is also the only way to see 1.7's moon do anything without waiting for a particular night, and
the page says on its own face why 21:40 and 23:10 can still resolve identically. Slabs at every depth,
controls in every state — each printing its own measured box rather than claiming the floor — and ink at
every scale landed with it.

**What it is not.** It cannot tell you a tool conforms. Conformance is decided by `test/occvm.js`, the unit
suites and the golden diff — assertions that run. This is the eye's instrument beside those, and the page
says so in its own first section rather than leaving a reader to assume otherwise.

A spine no tool has adopted is a proposal. This one is inlined in both.
