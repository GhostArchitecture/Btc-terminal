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
| **1.2** | landed | one light, completed. Closed D2, D8, D9, D10. |
| **1.3** | landed | the numeric face: an owned mono, embedded and subset, two weights. Closed D3. |
| 1.4 | outstanding | mineral as preference. D6. |
| **1.5** | landed | the interaction floor. Closed D7. |
| **1.6** | landed | architecture conformance. Closed D4, D5. |
| 1.7 | outstanding | the night model. |
| 1.8 | outstanding | the reference surface. |
| 1.9 | outstanding | freeze and stage. |

Two of eleven defects remain: **D1** (BTC's expired alias block, 1.9) and **D6** (BTC has no mineral
system, 1.4). D1's aliases were shown to be load-bearing by 1.2's golden diff —
`--ink --meas --dim` all moved with the tokens they alias — so the block is a live dependency, not dead
weight, and sweeping it is a migration rather than a deletion.

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

## 1. The nine laws

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

There is exactly one light, and it is the real sun.

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
--amb          ambient floor: 0.45 + 0.55·elev·(1−night) + 0.18·night
--rake         cast length in px, from the sun's angle
--sheen --hi-a --cut-a --shade-a    specular, highlight, cut and shade alphas
--glow         night bloom on ink only  (OCCVM-L9)
```

`--elev` falls to zero at night and **the night floor lives in `--amb`, not in `--elev`** — a bevel stays
legible after dark because ambient light is 0.53 there, not because elevation is pretended to be 0.15. BTC
floors `--elev` at 0.15 and has no `--amb`: `OCCVM-D2`.

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
this law. Completed at **1.4**. BTC has no mineral system at all: `OCCVM-D6`.

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
anisotropy of the walk, 0 for the equant dendrite of a manganese oxide and 1 for an elongated acicular
form.

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

### OCCVM-L9 — night

Night is a **continuous quantity**, not a state flag: `--night` ramps from 0 at −2° elevation to 1 at −10°.
A binary step cannot express the civil / nautical / astronomical dusk stages that 1.7 refines it into, so the
ramp is the 1.0 law and the staging is additive over it.

Night acts on **ink only**. No surface takes a glow. `--glow` is the ink bloom and nothing reads it for a
substrate.

BTC's `--night` is a binary step at −2°: `OCCVM-D2`.

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

`--serif` is spine-governed in one canonical spelling. Both tools also still declare their own — the same five
faces in the same order, differing only in whitespace — and at 1.0 that shadowing declaration **stays**. The
spine is inlined above the tool's CSS and nothing else changes (2.0 migration process §3.2); deleting a
now-redundant tool declaration is per-surface adoption work, done at the release whose law covers it.

### 2ab. Governed since 1.2 — written by the sundial

`--lx --ly --elev --night --amb --rake --sheen --hi-a --cut-a --shade-a --glow --lxpx --lypx --nglow
--nglow-s --sub --sub-hi --sub-lo --bone --bone-lo`

All resolved scalars or hexes, all written by `occvm/sundial.js` at most once a minute, none a `calc()`.
`--bone-lo` is derived from `--bone` rather than authored beside it (L1).

### 2b. Registered, not yet spine — promoted at the release named

Declared by one tool or by both with divergent derivations. Each is spine at the release that unifies it;
until then the tools' own declarations stand and the gap is a defect.

| token | today | spine at |
|---|---|---|
| `--mineral --mineral-lo --vein-hi --vein-lo --veins` | Rhyme only | **1.4** (L6) |
| `--ruby --ruby-lo` | BTC only; Rhyme has no negative mineral | **1.4** (L6) |

### 2c. Tool-local — not spine, not promised

Semantic tokens that belong to one tool's subject matter: BTC's `--up --down --err --warn --model
--bondi --field --rule --glass`, Rhyme's `--thick --bthick --stone-h --pad --c --k --text`.

`--bloom` is BTC's malachite glow on `.tile`, renamed at 1.2 so it stops colliding with the spine's
`--glow`. OCCVM-L9 reserves `--glow` for ink and 1.7's exit is that no surface has taken a glow, so the
bloom is deleted at 1.7 — by the release that owns the law, not by this one. A tool-local
token is not a fork. Promoting one is a minor release.

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
| **D1** | BTC | the expired `--ink --meas --bondi` alias block, past its removal window and still referenced (lines 26–27, 352, 359, 388, 1253) | 1.9 |
| **D2** | BTC | one light incomplete: no `--amb --rake --sheen --hi-a --cut-a --shade-a`, 15 fixed `box-shadow` offsets, `--elev` on a different scale with a 0.15 night floor, `--night` a binary step | **closed 1.2** |
| **D3** | BTC | the numeric face is OS-supplied; metrics vary per platform under a column | **closed 1.3** |
| **D4** | Rhyme | a runtime compiler: JSX compiled in the browser by `babel-standalone`, fetched with React and ReactDOM from a CDN. **With cdnjs unreachable the tool renders nothing** — measured, not inferred | **closed 1.6** |
| **D5** | BTC | half-installed PWA: `manifest.webmanifest` and four icons ship, with zero `serviceWorker` registration | **closed 1.6** |
| **D6** | BTC | no mineral system at all. `--amethyst` is declared once and referenced zero times | **1.4** |
| **D7** | Rhyme | no interaction floor: 0 `<button>`, 53 `onClick`, 0 `aria-*`, 0 `role`, 0 `tabIndex` | **closed 1.5** |
| **D8** | BTC | `--glow` is a `calc()` expression, so it never resolves to a number at token level and no law can read it (L3) | **closed 1.2** |
| **D9** | BTC | the light vector keeps tracking the sun below the horizon (−0.516, −0.856 at −39°) instead of resolving neutral overhead (L3) | **closed 1.2** |
| **D10** | Rhyme | `--bone` is derived from twilight while `--bone-lo` stays fixed, separating a pair that must move together (L1) | **closed 1.2** |
| **D11** | both | `.row`, `.wrap`, `.note` are defined in both tools with incompatible meanings, so an un-namespaced spine primitive would break a tool on inline (L3 §3) | closed at 1.0 by namespacing |

---

## 7. Conformance table

| tool | version | build stamp | violates |
|---|---|---|---|
| **BTC Terminal** | 1.0, 1.1, 1.2, 1.3, 1.5, 1.6 | `build-20260907153431` | D1, D6 |
| **Rhyme Instrument** | 1.0, 1.1, 1.2, 1.5, 1.6 | `build-20260907011503` | — (renders no mono; D3 does not apply) |
| **Reference surface** | — | not built | — (1.8) |

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

A spine no tool has adopted is a proposal. This one is inlined in both.
