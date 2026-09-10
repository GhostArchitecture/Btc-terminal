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
| **2.3** | **reverted** | tried to adopt L12 on Rhyme's `.slab` and matched the material against the `:root` **fallback** rather than the rendered substrate, which the sundial overwrites every minute. The adopted surface lost its twilight response. Reverted; `body` stays anchored to L1's floor; the real adoption target — replacing the sundial's two authored face offsets with the material's ratios — is registered in L12, unbuilt. |
| **2.4** | landed | **L12 adopted where it belongs.** The sundial's two authored face offsets (`0.14·(0.5+e)`, `0.42`) become the material's face ratios; `authoredContrast` — fitted to the fallback, 2.3's error one level down — is deleted for `renderedContrast`, anchored to the rendered high-sun spread. Directionality and mix-toward-light are kept, both for measured reasons. Costs +1.75 L* at noon and +5.00 at low sun, the latter because the shadow face gains directionality it never had. |
| **2.5** | landed | **The rheological pivot, step A.** `occvm/rheology.js` — ketchup as a Herschel-Bulkley fluid with SGR beneath it — spliced *beside* `material.js` as a strangler, and the sundial's face offsets re-derived from the fluid's optics (one index, three angles: 14.148× against the crystal's 9.353×, legibility exponent 0.9928). The substance reaches 2 of 70 rendered tokens; measured, not fudged. Two roadmap errors corrected on the way: the optics port and the unusable duration formula. |
| **2.6** | landed | **L2 from capillarity.** λc = √(γ/ρg) = 1.891 mm = 7.15 px, and τ₀ corrected 0.03 → 21.15 Pa by a consistency criterion (the range floor holds a 2.7 µm blob). The derived radius was measured against L2's *declared* 4px rather than the rendered radii — the third time a declaration was read as a render — and `--occvm-r` was later deleted as D12. |
| **2.7** | landed | **The laws re-authored around a measurement.** `occvm/tools/law-audit.js` measures every law per tool; each carries a generated STATE block; the conformance table is generated. L4, L6 fixed; L7's real defect was the serif, now owned (Fraunces, Faustina); L2 re-authored as vessel and meniscus and honestly DIVERGED at the spine's 1px bevel. |
| **2.10** | landed | **A provenance defect, and the meniscus adopted.** `k` and `n` were credited to Koocheki 2009's control row and are in that paper nowhere — k = 4.6 sits below its whole published range. Corrected to the control row (16.18 / 0.250) with every downstream figure re-measured; the shape of L11's curve and the closure of #1 both survive, and the one claim that moved is recorded. L2's meniscus is adopted on the reference surface: the bevel becomes a band one λc wide at the substance's own 68.5 GU, which is the roadmap's §5.3 highlight with its idle motion removed. Four of the six dropped concepts are re-dropped with sourced reasons and one is closed. **8 in force, 0 diverged.** |
| **2.8** | landed | **The crystal leaves.** Veins re-derived as diffusion-limited *cluster* aggregation — a gel suspended in the fluid, dimension measured (1.46 dilute, 1.61 at the shipped density) against the literature rather than quoted; `--vein-habit` retired by measurement. `fracture.js` → `yield.js`: hold, neck, pinch-off, retraction on the derived cessation curve with a hard stop. Cessation and trap depth derived, the roadmap's attribution of the former corrected, its open items #1, #4, #5 closed. `material.js` deleted; P1 and P4 retired with the tensor and the cell; the splicer learned to retire a part. |
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

**Every law below carries a generated STATE block: what the tools measurably do about it, per tool, from
`occvm/tools/law-audit.js`.** Read the state before the rule. A law with the rule and no state is what this
document was until now, and it let five divergences stand for six releases behind a hand-typed `—`.

**A diverged law is still the law.** Divergence is a fact about the tools, not a repeal, and the fix is
either to bring the tool under the rule or to change the rule deliberately and say so. What is not
available any more is not noticing.

Each law names the release that completes it. A law is stated at 1.0 whether or not both tools satisfy it
yet; the gap is a defect, and the defect names the release that closes it.

### OCCVM-L1 — substrate and inscription

> **STATE: UNMEASURED** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **UNMEASURED** — token families are guarded by token-audit.js and the golden set
> - Rhyme Instrument: **UNMEASURED** — token families are guarded by token-audit.js and the golden set
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

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

> **STATE: IN FORCE** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **CONFORMS** — vessel 16 radii 2-22px + 9 pills; meniscus: bevel band 7.148px against lc 7.15px — worn at 9 site(s): 7 raised, 2 recessed
> - Rhyme Instrument: **CONFORMS** — vessel 34 radii 1-9px; meniscus: bevel band 7.148px against lc 7.15px — worn at 14 site(s): 7 raised, 7 recessed
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

**A surface is a contained fluid, and its geometry is two things that used to be conflated.** Until 2.7
this law read "a surface is cut, not rounded: corner radius ≤ 4px" — a crystal's arris, written as if it
governed both tools, while BTC painted 10–22px with nine full pills and Rhyme painted 2–4px. The audit
measured that as diverged in both. Re-authored on the fluid basis, and the physics separates the two
quantities the old law fused:

**The plan-view radius is the vessel's, not the fluid's.** A fluid at rest on an open plate has no
corners at all — its outline is a circle. A rectangular surface is therefore a *contained* fluid, and its
corner radius belongs to whatever contains it. That is an authored quantity, per tool, and this law
**records it rather than judging it**: BTC's vessel is round-cornered (16–22px panels, pill controls),
Rhyme's is tight (2–4px). Two vessels, one fluid. The conformance block above lists each tool's radii as
the record of its vessel; neither is a violation of the other.

**The vessel has a material too, and from 2.32 it is derived rather than authored.** The paragraph
above records the vessel's *radius* per tool and declines to judge it. What it left unsaid for
twenty-five releases is what the vessel is *made of* — and the answer was already in the file. A lava
lamp is not wax and liquid, it is wax and liquid **in glass**; `fresnel(n, thetaDeg)` has shipped in
`occvm/rheology.js` since the crystal port; and `--occvm-gloss` has been computed against polished
glass since 2.10, because ASTM D523 fixes the 60° standard as polished black glass at nD 1.567 defined
as 100 GU. This system had been measuring itself against glass since the wet edge. `occvm/glass.js`
gives that reference a body: **borosilicate, nD 1.474, 2.0 mm wall** — sourced, the wall to the
container-glass standard band (2.0–3.0 mm standard, below 2.0 lightweight) because no lamp-specific
vessel spec is published.

*For a cylinder seen head-on the incidence **is** the offset*, `sin θ = u`, so there is no angle table
to author and `CUT`'s three flat-face angles are the crystal's and are not used. Two independent
calculations then say the same thing: reflectance is flat near **3.7%** across the middle 70% and goes
vertical past the turn — 5% at u = 0.74, 10% at 0.89, 20% at 0.95, 45% at 0.99 — and Snell's
displacement runs half a pixel at quarter-width to 6.5 px at the silhouette. **The vessel announces
itself at its edges and gets out of the way in the middle.** That is derived, not a preference.

*And the inner face is why a floor survives being put behind glass.* The interface that matters for
what is inside is glass→substance, not glass→air: `n_rel = 1.0673`, `R(0°) = 0.00106` — one part in a
thousand — so the globules are seen essentially directly rather than through two surfaces of
distortion. Total internal reflection at **69.54°** is the mechanism behind a real vessel's rim reading
mirror-bright while its face reads clear, and it is a computed angle rather than an authored effect.

*One authored number and one corrected one.* `U_RIM = 0.85` is where the curve turns, named authored at
its declaration, and the width floor for the displacement half scales with it. That floor is
**52.6 px**, not the 48 px `GLASS-VESSEL-PLAN.md` §4 states: the plan's displacement range of 3.63 px is
`shiftPx(0.85) = 3.6145` itself — the value *at* the band's inner edge rather than the change *across*
the band, which is `shiftPx(1) − shiftPx(0.85) = 3.9445`. Every row of that table is 8.66% optimistic,
and a safety threshold reading safer than it is, is the one direction the error must not go. Derived in
the part from its two inputs so it cannot be typed wrong again.

*A coincidence, recorded so nobody makes it a dependency.* The 2.0 mm wall is **7.559 px** and λc is
**7.148 px** — 1.06× apart, 0.41 px, under half a pixel on screen. They are unrelated: surface tension
over density on one side, a glass manufacturing standard on the other. Borrowing λc for the wall would
be exactly the cross-domain reuse this project has caught before, and it is not even necessary. The
guard asserts they are close **and** that neither is computed from the other.

**Prototyped on the reference surface and worn by no tool**, which is the shape 2.10 established: the
meniscus was adopted there a release before either tool took it. Only the **rim** ships — a colour
operation with no spatial extent and therefore no resolution floor at all, its stop set subdivided
adaptively until the chord never departs from the curve by more than the 8-bit alpha quantum, so the
stop count is derived and no step count is authored. The **displacement map** is a separate decision
and must clear the 52.6 px floor with its sub-floor degradation built at the same time, not after.

**The edge is the fluid's, and it is derived.** Where a fluid meets a wall it forms a meniscus of width
`λc = √(γ/ρg)` — the capillary length, **7.15 px** for the substance in force (`occvm/rheology.js`,
`radiusPx()`), and not fitted: it is what the substance's density and surface tension produce. On a
surface that is the fillet along every edge, and in these tools the edge is the **bevel**. A fluid's edge
is not a hairline; it is a 7 px meniscus, soft, and that is the single largest visible difference between
a cut mineral and a held fluid — larger than the substrate ramp (one gradient stop, measured at 2.5) and
larger than any border-radius (an unworn class, measured at 2.6).

**Adopted at 2.10, on the reference surface, which is where this law said to prototype it.**
`--occvm-bevel` was `inset ±1px 0` — the crystal's chisel, a hard line. It is now a band one meniscus
wide: `--occvm-meniscus` (λc = 7.148 px) as both the offset and the blur, so the highlight is a graded lip
instead of a hairline. **Two derived quantities, and the second is the half nobody had:**

- **Width** is λc, above.
- **Amplitude** is `--occvm-gloss` = **0.685**. ASTM D523 and NIST SP250-70 fix the 60° gloss standard as
  polished black glass, nD 1.567, *defined* as 100 GU; the substance's own Fresnel against that reference
  is **68.5 GU** at 60° (52.6 at 20°, 96.0 at 85°) — "semi-gloss" by ASTM's own angle rule — against
  86–91 GU for polished obsidian. **A wet surface is dimmer than a polished one, not softer.** That is the
  sourced correction to the roadmap's §5.3, which asked for a highlight that "subtly deforms over time,
  present even at rest" — idle motion, which its own §6 forbids and which below τ₀ cannot happen. Take the
  motion away and the physics still delivers a broad soft highlight, statically: a liquid at rest is the
  smoothest specular surface in the literature, so a wet edge is soft because it is **curved**, not because
  it is rough. Across a meniscus the normal sweeps through the reflecting direction, so a point source
  returns a band rather than a line. No motion is required and none is used.

The gloss ratio scales the **highlight only**. The dark side of a meniscus is a shaded face, not a
specular return, so `--cut-a` is untouched; applying it to both would have looked tidier and been wrong.

**Neither tool moves, deliberately.** `--lit-x/--lit-y` remain the 1 px unit vector that each tool's own
surfaces multiply by their own depth — BTC does it at two sites — and rescaling that unit would have
scaled every tool-authored bevel sevenfold, uncontrolled. The meniscus lives in the composed value, whose
only consumers are the reference surface's slabs. Adoption by a tool is a separate decision under §6b,
unmade. *2.6's `--occvm-r` was derived, on an unworn class, read by nothing — `OCCVM-D12`, and deleted.
These two tokens are read by the bevel on the line below them, which is the whole difference; both are
pinned to `rheology.js` so neither can drift from its derivation.*

Bevels are struck from the light vector (`OCCVM-L3`), never from a fixed offset — unchanged.

### OCCVM-L3 — one light

> **STATE: IN FORCE** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **CONFORMS** — no local solar implementation
> - Rhyme Instrument: **CONFORMS** — no local solar implementation
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

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

> **STATE: IN FORCE** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **CONFORMS** — 16 casts, all light-derived or inset
> - Rhyme Instrument: **CONFORMS** — 25 casts, all light-derived or inset
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

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

> **STATE: UNMEASURED** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **UNMEASURED** — whether a surface DECIDES is a judgment; no script can make it
> - Rhyme Instrument: **UNMEASURED** — whether a surface DECIDES is a judgment; no script can make it
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

The gilt ramp `--gilt-c #7a5510 → --gilt-b #d9a52c → --gilt-a #ffe9a3` marks **what decides** and nothing
else. Malachite and ruby carry outcome; verdigris carries seams and age; bronze carries binding.

A surface that is merely important is not gilt. A number that settles something is.

### OCCVM-L6 — the palette is a choice of colour, never of meaning

> **STATE: IN FORCE** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **CONFORMS** — 9 :root fallback(s) and 9 mirrored hex(es), all the obsidian palette's own
> - Rhyme Instrument: **CONFORMS** — 9 :root fallback(s) and 9 mirrored hex(es), all the obsidian palette's own
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

**The hue-to-meaning relation is what is frozen. The hexes are not.**

| role | meaning | fixed to |
|---|---|---|
| positive | rising, confirmed, won | always green |
| negative | falling, failed, lost | always red |
| gilt | human authority, override | always gilt |
| active | live state | always verdigris-adjacent |

A palette is not a remapping of meaning; it is a choice of *which* green and *which* red. Nothing a
reader can select makes a won window and a lost one read alike, and that is measured rather than
promised: the smallest positive/negative separation across the shipped five is **CIEDE2000 62.3**
(`sunset`), against this system's own **73.1**. `OCCVM_PIGMENT_SEPARATION` carries the table and both
suites assert it, so a palette edit that narrowed the gap would have to re-record the number.

**Everything else is open** — the decorative accent and its ladder, the globule field's tint, ambient
surface wash. Nothing depends on those, so nothing breaks when they change.

#### What replaced the mineral set, and why the closed set died with the crystal

Until 2.27 this law read *"the mineral set is frozen"* and named three: `amethyst` the default field,
`malachite` affirmed, `ruby` negated. That set was closed **because under aragonite a colour had to be a
mineral that exists with that colour.** The crystal left at 2.8. A dye is not discovered, it is chosen —
a lamp manufacturer picks what they want and the wax does not constrain it — so the constraint that
produced a closed three-colour set had been gone for nineteen releases and the vocabulary had not
noticed. `occvm/minerals.js` is retired; `occvm/pigments.js` replaces it, and unlike `veins.js` it leaves
`occvm/` outright, because nothing cites a mineral the way L10's record cites the vein generator.

**The easement is recorded rather than slid in.** Every other name in this system was chosen to be
defensible: Fraunces replaced Cinzel because the incised-stone justification died, `--amb` became
`--fill` because it was never sky illumination. Those were corrections *toward* accuracy. This is not
that — some palette handles are invented where no real pigment fits. **The decorative layer does not
answer to the derivation standard the rest of this law does**, and saying so here is cheaper than a later
reader mistaking it for the naming discipline quietly eroding. It is the same line L13 already draws:
decoration sitting *on* the substance is permitted, the substance lying about itself is not. Naming a dye
after a compound it does not contain would be the dressed-up version; naming it plainly is the honest one.

*Direction of travel, stated as a principle and bounded.* The aesthetic has been **deriving** the design —
the crystal gave sharp corners, the yield-stress fluid gave a dead band and a meniscus. **For the
decorative layer this inverts: the aesthetic serves the design rather than constraining it.** That applies
to colour and naming in the decorative layer only. It does not touch material physics (L12), motion law
(L13), or the four fixed roles above.

#### Authored, derived, and the anchor that makes "no-op" a measurement

Six values per palette are **authored**: the four fixed roles, the decorative accent, the decorative
highlight. No hex among them comes from a spectrum, a compound or a measurement, and they are labelled
authored for the same reason `LOCK_RELAX_MS = 360` is — a table of colours that looked derived would be
the dishonest version.

Seven per palette are **derived**, by `occvm/tools/derive-pigments.js`: each is its authored parent moved
by the offset (ΔL, chroma ratio, Δh in CIE L\*C\*h) that **the shipped build already puts between that
same pair**. `--malachite-lo` under a teal `positive` is not a design choice; it is the ramp this system
already has, re-hung under a new hue. Chroma travels as a ratio rather than a difference because a hue
with less chroma available cannot absorb an absolute step, and an out-of-gamut result is clipped by
reducing chroma at fixed L and h — the two axes a ramp member must not move.

`obsidian` **is** that anchor, so selecting it is a no-op and the no-op is measured, not claimed: the
derivation applied to its six authored values reproduces all seven derived ones **byte-identically**, and
both suites assert it. Independently, the palette document authors a *third* decorative value for three
of the five palettes and the derivation was built without reference to it; where both exist they agree to
**ΔL ≤ 3.6 and Δh ≤ 6.3°**, which is reported rather than assumed.

#### One measured negative, on the record rather than tuned away

`active` is pinned verdigris-adjacent above, and three palettes author it 4–16° off that hue — closest to
`positive` in `sunset`, **1° apart**, separated by lightness alone. This system's own positive/active
separation is **CIEDE2000 14.8**; `sunset` reads **11.7** and is the only palette below it. Rotating its
`active` onto the verdigris hue was tried and reaches 13.6 — still short, because the limit is its
low-chroma green `positive`, not the hue of its `active`. Clearing the floor would mean re-authoring a
role hex by eye, which is the thing this system refuses everywhere else, so the value ships as authored
and the number is in the source.

#### Both tools, one write

`occvmApplyPigment(name, style)` writes all thirteen tokens (§2ad). Before 2.27 each tool carried its own
`applyMineral()` setting four properties by hand, which is how a shared set acquires a local exception —
and Rhyme's pre-1.4 two-entry copy, missing `ruby` entirely, was exactly that. **Selection is a real user
preference, not a build constant**: user-facing and persisted in both tools, per-origin, and the tools are
served from different origins so a choice cannot travel between them. That is `localStorage`, not a gap
in this law; the 1.4-era exit criterion asking for a shared choice was physically unreachable and is
replaced by conformance — one set, one meaning, one behaviour, stored twice.

**BTC's scope widened at 2.27 and that is the substantive change.** 1.4 kept the mineral off every surface
§5 of CLAUDE.md governs, because a decorative accent beside a win/lose colour is §7.6's noise-as-signal
trade. A palette is the other thing: it supplies the outcome colours themselves. That is safe where the
accent was not for exactly one reason — the hue-to-meaning relation is not the reader's to change — and
the separation table above is the evidence rather than the assurance. `test/occvm.js` pins both halves:
every palette clears the recorded separation, and the `:root` fallbacks are the default palette's values
as a set identity.

### OCCVM-L7 — figure discipline

> **STATE: IN FORCE** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **CONFORMS** — stack leads with an embedded face ("OCCVM Serif")
> - Rhyme Instrument: **CONFORMS** — stack leads with an embedded face ("OCCVM Serif")
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

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

> **STATE: IN FORCE** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **CONFORMS** — 3 explicit 44px floor(s)
> - Rhyme Instrument: **CONFORMS** — 3 explicit 44px floor(s)
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

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

### OCCVM-L10 — the substrate layer

> **STATE: IN FORCE** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **CONFORMS** — 2 direct consumer(s) and 1 through the shared floor of the field, no vein trace
> - Rhyme Instrument: **CONFORMS** — 0 direct consumer(s) and 1 through the shared floor of the field, no vein trace
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

**2.25 — re-authored around what renders.** The substrate decoration in both tools is the **globule
field**: a seeded field of droplets from one shared generator, `occvm/globules.js`, painted live on
Rhyme's draft face (L13's grant), and as a **still frame** on every other Rhyme slab and on BTC's ground —
which L13 withholds motion from and which therefore takes the same field written once, as a data URI. The
weight is each tool's own, measured on its own surface (Rhyme 0.24 on a slab, §9 2.24; BTC in §9 2.25),
because a slab and a page ground are not the same surface. The auditor measures the consumer: a tool
must call `OCCVM_GLOBULES.field` or `.svg`, and may not call the vein generator or the fallback it once
guarded. `--vein-density` is retired with the layer it governed; `--vein-hi`/`--vein-lo` stay, because
the field is tinted from them.

*Everything below this line is the record of the layer this one replaced — the DLCA veins, 1.1–2.24 —
kept because its mechanism was real and its dimension was measured, and struck through nowhere because
a record is not a rule. The generator, `occvm/veins.js`, stays in `occvm/` unspliced and ships in neither
tool.*

Veins were **grown, not drawn**. From 2.8 the generator was diffusion-limited **cluster** aggregation
(Meakin 1983; Kolb, Botet & Jullien 1983): every particle in the suspension diffuses, two that touch stick,
the cluster they form diffuses in turn with a mobility that falls as `s^-½`, and the flocs join until the
suspension has gelled into one network. That is how a colloidal suspension actually aggregates and it is what
the substance *is* — ketchup is a particulate gel of tomato cell-wall fragments. Nobody authors the branching;
the screening effect that makes a protruding tip intercept walkers before the interior does is the same as
before, one level up, between clusters rather than between a walker and a seed.

**What the mechanism change did to the picture, measured.** Particle-cluster DLA (1.1–2.7) grew a few
dendrites radiating from nuclei in clear matrix: how a crystal grows from a nucleation point, and it was
grown as one, with aragonite's threefold twin read from the material's cell. Cluster-cluster aggregation
produces a network **suspended in** the material — open, tenuous, everywhere at once — which is what the
roadmap's visual note (§5.4) asked for and turns out not to be a rendering choice: it is what the mechanism
yields at the density the tools already ship. `--vein-density` is the **volume fraction**, the same number
it has been since 1.1 under the walker-budget reading, and it is the one axis a suspension has:

| `--vein-density` | what the suspension is | mass–radius dimension, measured |
|---|---|---|
| .08 | isolated flocs | 1.38 |
| .15 | separate flocs, matrix between | **1.46** — the 2-D DLCA literature's 1.44 |
| **.30** — shipped | **past the gel point**; the network spans the field | 1.61, climbing toward 2 as a space-filling gel must |

**2.24 — and none of that was what rendered.** The paragraph above was true of the *mechanism* and false
of the *picture*, and nobody had rendered the picture and looked. Drawn at scale, `field()`'s output was a
**1.3 px crisp bright trace of a lattice aggregate** — every segment at 0°, 45° or 90°, a snowflake — on
every slab in both tools, and the owner said so: *"we're visually still displaying crystal fractals."* The
"blurred where it was crisp" claim described only the wide underlayer; the fine pass on top was the
crystal, and it had been drawn since 1.1. Worse, `field()` read `o.fine || 1.3`, so a caller passing `0`
to switch the crisp pass **off** silently got it back — four "diffuse" variants measured identical edge
energy before that was found. `0` now means none. **BTC** draws the mass alone (wide 10, soft 7):
measured on the live page, **41% of pixels at a mean 1.08 L\***, max 4.7 — a turbid wash, which is what
a gel at screen scale is. **Rhyme retires the layer from its slabs entirely** and puts the globule field
in its place (L13, §9 2.24); two decorative layers on one surface is noise. The mechanism, the density
axis and the measured dimension above all stand; the sentence about what it looked like did not.

The dimension is an **output** of the process. The literature values are recorded in `rheology.js` so the
generator is held to them rather than quoting them: **1.44** for a planar lattice (Meakin; Kolb, Botet &
Jullien) and **1.75** in three dimensions (Weitz & Oliveria 1984; Lin et al. 1989 put the same regime at 1.86
and the reaction-limited one at 2.1). The roadmap carried 1.75 as "the DLCA fractal dimension"; a 2-D lattice
cannot produce it and this document does not claim it. `test/occvm.js` measures the generator in the dilute
regime against 1.44, with an estimator validated on a disk and a line first.

**`--vein-habit` is retired, by measurement.** The crystal's habit was attachment anisotropy — which
crystallographic directions accept a particle — and a suspension has no direction to be anisotropic along.
The one axis colloid science does offer is the sticking probability that separates diffusion-limited from
reaction-limited aggregation. It was tried as the token's new meaning and **does not express on this
lattice**: at the shipped density the dimension moved 1.61 → 1.54 across a 20× range in sticking
probability, and in the dilute regime 1.38 → 1.39 — inside the estimator's own error both times. A token
whose effect is below measurement is `OCCVM-D12` with a physical story attached, so the declaration is gone
(§2a, §6b), the generator accepts and ignores the argument so a 1.1-era caller does not throw, and both
tools stopped reading it. The reference surface's three specimens now run along concentration instead.

**No curve is fitted over the aggregate.** Every stroke is a straight segment between two particles that
bonded — the record of how the network formed. A fitted curve is the bezier arriving back through the
renderer, and both tools previously drew three displaced cubic beziers and called the result a vein.
**The deep stroke is now blurred** and the fine one sits lower in opacity: a seam in a solid reads crisp; a
floc in a fluid has no hard boundary against it. The blur is the one authored rendering value in the file
and is named as one — the mechanism gives the structure, not the focus.

**The generator reads no substance module.** DLCA takes no constant from the fluid, so the load-order
dependency that had `material.js` needing to precede this file is gone with the file: `veins.js` loads and
aggregates with nothing spliced before it, and `test/occvm.js` runs it that way.

**What was verified, and what was not.** No bezier, verified structurally (`M` and `L` and nothing else,
asserted on the path data). Deterministic under the injected seed (§4). **9 ms per aggregation in Node** at
the lattice each tool uses, against the 30 ms exit; a cold mobile load still cannot be measured from here and
is still not claimed. The side-by-side against a photograph has still not been performed — what was done is
that the output was rendered and looked at, the way it was at 1.1, and the first prototype was rejected on
sight: it recorded bonds as coordinates at the moment of contact, the clusters kept moving, and it rendered
confetti. Bonds are indices now, resolved where the particles ended.

*One thing the mechanism change did not alter, recorded because it was found the hard way at 1.1:* the layer
is a **data URI, and both the fragment references and the colours carry a literal `#`.** Left raw inside the
URI it ends the URI at a fragment; pre-encoded to `%23` it survives into the parsed SVG as two literal
characters and `href="%23v"` resolves to nothing — the layer renders empty while every string check still
passes. `field()` therefore returns raw SVG and the caller encodes the whole document.

*History.* 1.1 replaced the beziers with particle-cluster DLA. 1.1a grew it as aragonite: radial from a
nucleation point, cyclic-twinned in threes, with the anisotropy moved from the walk to attachment after a
walker-drift bias was measured and found to do nothing. 1.1b tested the twin's re-entrant misfit as an
attachment boost and recorded that it does not express in arrival-limited growth (0.15× the plain matrix, flat
across a 10× range in particle count). 2.0 moved the cell to a single owner in `material.js`. All of it was
right about a crystal, and all of it left with the crystal at 2.8.

### OCCVM-L11 — yield

> **STATE: UNMEASURED** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **UNADOPTED** — no pinch call site
> - Rhyme Instrument: **UNMEASURED** — 2 call site(s); whether each is irreversible needs an eye
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

**A destructive action does not share a physical vocabulary with a reversible one.** Everything else in
these tools fades, slides or settles. Those are elastic behaviours, and elastic behaviour implies the thing
could come back. Irreversible actions get a different vocabulary and nothing else does.

**Since 2.8 that vocabulary is yield.** A yield-stress fluid below τ₀ *holds* — nothing moves, not slowly,
not at all (`rheology.js`, `shearRate`). Past it the material flows, and a filament of it that is pulled
thins at one point — capillary **necking** — until it **pinches off** into two bodies that retract from the
break and come to rest. Hold → neck → pinch-off, and the last is what makes the event irreversible: a
filament that has pinched does not rejoin. The primitive is `occvm/yield.js`, `pinch(el, done)`; the
vocabulary word is *pinch*, and `cleave` is pinned out of both repositories.

**What distinguishes it from the elastic vocabulary, now that speed does not.** Fracture claimed "faster
than any elastic curve in the system"; a fluid has no reason to be quick. The distinction is the **stop**.
Every elastic easing approaches rest asymptotically and never technically arrives. A yield-stress fluid
stops in finite time, at an exact instant, with the velocity reaching zero rather than tending to it — the
cessation derivation in L12 — and the retraction runs on that curve, sampled from the integrated
Herschel-Bulkley decay and handed to CSS as `linear()`. It is the only motion in either tool that *ends*.
At the substance's τ₀ the curve is the quadratic `1 − (1−u)²` with a hard stop; `test/occvm.js` asserts the
last step of the sampled curve is under a tenth of the first.

**What is authored, named.** The roadmap wanted the duration derived from `γ̇ = ((τ−τ₀)/k)^(1/n)`. With
n = 0.250 that exponent is 4.00 and a 100× range in stress spans 10⁸ in rate; no monotone map from that
onto a few hundred milliseconds exists that is not doing all the work itself (2.5, pinned). So the two
millisecond counts — 140 ms of necking, 260 ms of retraction — are authored, as fracture's 220 ms was, and
the **shape** is derived. The hold is zero for a click-driven action: the click is the stress, above τ₀ by
definition, which is what makes it a deletion; a hold that showed would read as lag, not as material
refusing to move. The roadmap's "3×τ₀ click multiple" (its open item #1) is not an unexamined constant; it is
a stress that produces a shear rate of ~10⁻¹² s⁻¹, and it is closed as meaningless.

**What is kept from fracture, because it was right for reasons that survive the substance.** No fade at any
point: yielded material does not become transparent, it becomes absent. Two clones carrying the element's
**resolved** style, so an `#id`-styled element does not pinch blank. Seeded off the element, so a replayed
deletion looks the same and the golden set can pin one. Reduced motion honoured from the spine's rule. And
the dependency is **resolved at call time** — the lesson of the null capture below — so the splicer's
reverse insertion order cannot leave the primitive throwing in a page while Node resolves it through
`require`.

**No angle.** A fluid has no plane. The neck forms at a jittered point in the middle third of the
filament's width, the two bodies taper to it, and they retract along the filament's own axis with no
rotation, because a fluid body has no edge to torque about.

**Scope is the discipline, not the coverage.** Delete, discard, disconnect. Never a cancel, never a
dismiss, never a close. A vocabulary that marks everything marks nothing. *BTC has no call site and that is
not a gap:* CLAUDE.md §4 makes its ledgers ungardenable — withdrawals log as `WITHDRAWN`, nothing is silently
deleted — so the tool has very little that is irreversible by construction. Rhyme's shelf removal is the
consumer, as it was fracture's. The reference surface carries one live specimen that restores itself so the
event can be seen twice, which a real deletion never can.

*History.* 1.1b shipped fracture: two clipped halves torquing apart along aragonite's {110} composition
plane, `2·arctan(b/a) = 116.209°`, imported from the vein generator rather than recomputed because two
derivations of one angle is the defect L3 exists to prevent. A `|| 116.209` fallback was caught one commit
later as a second copy of the angle that silently *was* the value in Node. 2.0 found that the primitive
captured `OCCVM_VEINS` into a module binding while its IIFE ran — the splicer lands parts in reverse list
order, so the binding was null in every browser and `cleave()` threw on every call from 1.1b to 2.0, while
Node resolved it through `require` and every assertion passed; in Rhyme the throw landed before the `done`
callback, so **deleting a draft silently did nothing**. And the first clone stripped its `id` and rendered
blank, every assertion passing on an invisible fracture. Each of those lessons is carried into yield; the
angle is not, because there is nothing for it to be the angle of.

### OCCVM-L12 — the material

> **STATE: IN FORCE** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **CONFORMS** — 3 :root fallback(s), overwritten by the sundial
> - Rhyme Instrument: **CONFORMS** — 3 :root fallback(s), overwritten by the sundial
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

**A hex is not authored. A substance is defined, and the surface values are derived from it.** Until 2.0
`--sub-hi`, `--sub` and `--sub-lo` were three separate decisions that happened to look related. They are now
one substance, one body colour and one cut geometry, and their **ratios** fall out of the arithmetic.

**The substance, since 2.5, is tomato ketchup as a Herschel-Bulkley fluid**, τ = τ₀ + k·γ̇ⁿ, with Soft
Glassy Rheology (Sollich 1997/98) beneath it as the mechanism — mesoscopic elements caged in energy wells,
escaping by *yielding*, which is why yield is the right word for L11 rather than a metaphor. It replaced
aragonite on the owner's aesthetic judgment, which is a legitimate call and is recorded as one rather than
dressed as a defect. `occvm/rheology.js` is the definition, and it names the substance by its **role**
(`SUBSTANCE`) at every consumer, because the pivot cost what it did partly because the consumers named the
mineral.

| property | value | source | governs |
|---|---|---|---|
| yield stress τ₀ | **21.15 Pa** | consistency criterion (below); sits at the foot of the measured static yield stresses 21.8–37.1 Pa | hold (L11), stopping time, puddle height |
| consistency k′ | **16.18 Pa·sⁿ** | Koocheki et al. 2009, Table 3, control, 25 °C — **corrected at 2.10** | flow, cessation regime |
| flow index n′ | **0.250** | same row | shear thinning; noise temperature x = 1 − n = **0.75** |
| refractive index | 1.381 | ICUMSA at 30 °Brix, 20 °C — Brix is *defined* refractometrically | the three faces' reflectance |
| density | 1.14 g/cm³ | composition tables | capillary length, standing stress |
| surface tension γ | 0.040 N/m | **estimate**, the least-sourced number here, flagged | capillary length (L2) |
| body | `#0e0d13` | L1's declared floor | the one free colour value, anchored |

**τ₀ was corrected, and the roadmap's choice of it was the problem.** The handoff fixed τ₀ at 0.03 Pa,
"the published range floor", which reads conservative and is the one value that breaks the model: a layer
stands only while τ₀ ≥ ρgh, so at 0.03 Pa the tallest standing blob is **2.7 µm** and this ketchup sheets
off the plate like water. Re-entered at 21.15 Pa by a consistency criterion rather than by position in the
range: the stress at which the puddle height τ₀/ρg equals the capillary length √(γ/ρg) — the blob is as
tall as surface tension makes it round. Inside the published band, not chosen from it.

**What derives from the substance, and where each lands:**

- **The three faces (2.5).** The roadmap said the optics "have no fluid equivalent — deleted, not ported";
  deleting them would have stopped both tools painting, because since 2.4 the sundial calls `faceRatios()`
  every tick. They port because 2.4's mechanism was never biaxiality: **one slab presents three angles to
  the viewer**, and Fresnel varies with angle at any fixed index. At L2's cut — front 0°, chamfer 45°, edge
  80° — one index gives 2.56% / 3.41% / 36.23%, a spread of **14.148×** against the crystal's 9.353× and the
  **13.881×** the tools render at high sun. The legibility exponent that reproduces the rendered spread is
  **0.9928**, within 1% of unity: the substance carries the substrate essentially unaided, where the crystal
  needed 1.177. One fewer authored decision as well — the crystal paired each face with a principal index
  and flagged the pairing as a convention; a fluid has one index and the convention is gone.
- **The capillary length (2.6, L2).** λc = √(γ/ρg) = 1.891 mm = **7.15 px** at 96 dpi, the radius surface
  tension puts on every free edge whether anyone wants it or not. L2 records it as the fluid's meniscus and
  the spine's 1px bevel as the divergence.
- **The noise temperature (2.5, open item #5 closed).** x = 1 is SGR's glass transition and a yield stress
  exists only below it, so x < 1 is a constraint the measured τ₀ imposes; near the transition n and x are
  complementary, **x = 1 − n = 0.75** (0.81 until 2.10 corrected n). *2.10 also corrected this sentence in
  the rarer direction: it called the functional form "judgment", and it is not — it is Sollich's own result,
  since in the glass phase σ = σ_y + O(γ̇^(1−x)). The judgment that remains, and it is real, is the
  IDENTIFICATION of an asymptotic SGR exponent with a coefficient fitted over a finite range of shear rates
  on a rheometer. An understated derivation is corrected for the same reason an overclaimed one is.*
- **Cessation (2.8, the roadmap's §6, checked rather than cited).** A Newtonian fluid never stops; a
  yield-stress fluid stops in finite, provable time (Huilgol, Mena & Piau 2002). The reduced model
  `dv/dt = −(τ₀ + k·vⁿ)` and its bracket `v₀/(τ₀ + k·v₀ⁿ) ≤ t_stop ≤ v₀/τ₀` are both reproduced, and the
  integration matches the roadmap's three printed stopping times to the figures it gave. **Its attribution
  is inverted.** At the roadmap's τ₀ the rate term dominates until v ≈ 3×10⁻¹²; the lower bound is tight
  because its n = 0.19 makes vⁿ nearly flat, so the *rate* term stays at its maximum, and the "linear
  terminal phase" occupies the last 10⁻¹² of the decay. At the substance's τ₀ the yield term dominates from
  t = 0 up to **v₀ = 2.92** — a claim that read "~3,000" until 2.10, and the one documented figure that
  correction moved by three orders. `yield.js` runs at v₀ = 1, so it is still inside the yield-dominated
  regime, with a thousandth of the headroom the document had been claiming; the curve there is *near* the
  quadratic (0.016 from it, 0.040 from the power law) rather than equal to it, and both suites now say
  "near" rather than "is". Two regimes, one ratio deciding: `k·v₀ⁿ/τ₀`. Both have a closed-form position —
  yield-dominated `1 − (1−u)²`, rate-dominated `1 − (1−u)^2.235` — so the shape is a power ease-out with a
  **hard stop**, which no `cubic-bezier` keyword has and CSS `linear()` encodes exactly. **What is authored,
  named:** v₀ (the roadmap's #12 — nothing maps a click onto it, and with v₀ free the regime is chosen by
  choosing v₀) and the absolute duration (the model's units carry no milliseconds). The derivation owns the
  curve and the stop; a person owns how long it lasts. L11 consumes it.
- **Trap depth (2.8, open item #4 closed, unwired).** The roadmap says no formula converts a poll interval to
  an energy. SGR's escape law is one: residence time τ = τ_a·exp(E/x), so E = x·ln(τ/τ_a). With the fastest
  tier as the attempt time, BTC's three cadences sit at **0, 2.25, 3.45** in units of x·kT (2.43 and 3.73
  before 2.10 corrected x). Derived and
  consumed by nothing, recorded for the reason P1's durations were: wiring it before a surface expresses it
  is a token nobody reads. The roadmap's #7, the scale mismatch of ensemble statistics on six named elements,
  stands.
- **The vein's dimension (2.8, L10).** Recorded as an output the generator is held to, never fed in: 1.44
  on a planar lattice, 1.75 in three dimensions.

**2.10 — THE TRIPLE WAS MISATTRIBUTED, AND THE PAPER HAD NEVER BEEN OPENED.** From 2.5 to 2.9 this law
and `rheology.js` both carried k = 4.6 Pa·sⁿ and n = 0.19 as "the control formulation of Koocheki et al.
(2009), fixed at the published range floor". Checked against the paper: its Herschel-Bulkley consistency
k′ ranges **6.56–20.10 Pa·sⁿ** across every formulation and temperature it reports, so **4.6 is below the
entire published range and appears in that paper nowhere**; its flow indices are n 0.189–0.228 (power law)
and n′ 0.216–0.263 (Herschel-Bulkley), so 0.19 is the floor of the *power-law* index across
hydrocolloid-supplemented samples, carried as the control's and paired with a Herschel-Bulkley fit that
reports 0.250. The control row at 25 °C is τ₀ 4.41 Pa, k′ 16.18, n′ 0.250. **k and n are now that row.**

*What the correction moved, measured:* x 0.81 → 0.75 (still below 1, so the glass phase and the yield
stress hold); 1/n 5.26 → 4.00 (a 100× stress range still spans 10⁸ in rate, so the roadmap's duration
formula stays unusable and #1 stays closed); the cessation regime at v₀ = 1 0.217 → 0.765 (still
yield-dominated, so L11's curve keeps its shape and its hard stop); the crossover 3,070 → 2.92; trap depths
2.43/3.73 → 2.25/3.45. **Nothing that does not read k or n moves** — λc, the optical spread, the legibility
exponent and the vein dimension are unchanged, because none is a function of the flow curve, and that
containment is why this is a correction rather than a re-derivation.

*Two smaller repairs ride with it.* The "~10–40 Pa published band" this table used to cite for τ₀ **had no
citation in either file, and none was found.** What exists are static yield stresses on commercial ketchup
— 21.88 / 29.02 / 37.10 Pa (Ebatco) and 21.8 Pa (NETZSCH) — and τ₀ = 21.15 sits at the foot of them. Note
what they are: *static* yield stresses from ramps and creep, not the *dynamic* Herschel-Bulkley intercept
(4.41 Pa) that k and n come from. This file pairs the two, which is recorded rather than resolved, because
a static yield stress is the right quantity for a substance at rest and the wrong one to sit in a
flow-curve triple.

*The lesson is the one this document keeps relearning, arriving somewhere new.* Every value here has been
checked against what renders. None of these three was ever checked against its source. **A provenance
claim is a claim**, and it is now guarded like one: both suites assert the constants against the paper's
published ranges, and that the retired pair cannot come back.

**THE SURFACE TENSION IS STILL AN ESTIMATE, AND NOW A BRACKETED ONE.** γ was the last unsourced input
in the substance and, since 2.10 closed τ₀, the only one the meniscus still depends on. Searched: **there
is no published surface tension for ketchup, and the reason is methodological rather than a gap in the
search.** Ordinary tensiometry assumes the fluid relaxes to an equilibrium shape, and a yield-stress fluid
does not — a pendant drop of a Bingham material moves as a *plug*, necks into a "torpedo" and steps
through pinch-off, so the Young-Laplace fit those instruments rest on has no valid regime here (Balmforth
et al., *Applied Mathematical Modelling*, 2007). That the measurement is an open problem is itself
published: Boujlel & Coussot, *Measuring the surface tension of yield stress fluids*, Soft Matter
9(25):5898 (2013), which withdraws a blade from a bath precisely because the ordinary instruments cannot
be used. Paywalled from here, and cited for the problem's existence only — **no number in it is quoted.**

The nearest *measured* matrix brackets the estimate: fermented tomato juice at 12.5 °Brix on a force
tensiometer, **40.5 mN/m** and **42.6 mN/m** (PMC11393597). Read the caveats with the numbers — juice, not
ketchup, at under half this substance's Brix, fermented, and **both published values carry an added
hydrocolloid, with no untreated control printed.** γ = 0.040 sits about 1% under the lower of them, in a
matrix thinner and differently surfaced than this one, so it is **kept unchanged**: moving it to 0.0405
shifts the radius 7.148 → 7.192 px, under half a pixel, and would trade a stated estimate for a proxy's
decimal. What the search does settle is the opposite direction — **water's 0.072 is ruled out as a
stand-in**, 78% high, and adopting it would carry τ₀ to 28.4 Pa and the meniscus to 9.59 px. The suite
pins the bracket, the shipped radius, and that water's value cannot quietly become the input.

**2.11 — THE MENISCUS IS WORN.** 2.10 derived the edge and adopted it on the reference surface; both
tools kept the crystal's 1 px chisel, because `--occvm-bevel` was consumed by exactly one rule,
`.occvm-slab`, and **zero elements in either tool wore that class**. The law described an edge neither
tool had, and had since 1.0. It is worn now: **six BTC surfaces** — `button`, `.aslink`, `#armBtn`,
`header.tile`, `.tgl button.sel`, `.schip` — and **Rhyme's `.slab`**, each passing its own amplitude
through `--hi-a`/`--cut-a` rather than re-authoring the geometry. This is the first change in the pivot
that makes either tool *look* fluid, and it is a change to what renders, not to what is declared.

*Two surfaces are excluded, and the exclusions are the measurement.* `.pill` and `.shead` carry **outer**
highlights, not bevels — a drop shadow is not a cut face, and the meniscus is an inset band, so replacing
them would have been a substitution rather than an adoption. And **Rhyme's `.cut` is inverted on purpose**:
it reads dark on the side the light hits, because an engraved groove's near wall shadows it. The meniscus
there would turn a sunken input into a raised bead. Both exclusions are pinned so neither is later
"corrected".

*What it also cost, stated because it is not geometry.* BTC's `button` and `.aslink` highlights were warm
bone (`rgba(255,236,190,·)`) and are now white, because the token's highlight is the source's colour —
2.4's own finding that a specular return on a dielectric desaturates toward the light. The warm value was
authored; the white one is derived. Anyone preferring the warm cast should change it in the token, once,
rather than per surface.

**AND THE GOLDEN SET COULD NOT SEE ANY OF IT.** Run against the finished adoption, `golden:verify` passed
**561 values, zero deltas** — because it records custom properties off `:root`, and every value that moved
here moved on a *consumer*. An instrument whose whole claim is that a delta on the reference surface can
only be the spine's could not see the spine reaching a tool for the first time. *A `WORN` tier recording
each surface's resolved shadow was written here to close it and is **withdrawn at 2.12** after three red
CI runs: it read the machine rather than the page. The gap is `OCCVM-D13`, open, on the register in §6.*

**What retired with the crystal, and why nothing replaces it.** The unit cell owned the vein's twin angle,
fracture's cleavage plane and P4's spacing triple; the stiffness tensor owned P1's per-axis durations; the
three principal indices owned a face-to-index convention. A fluid has none of those, so each retires rather
than being ported to a substance that cannot carry it — a derivation whose input is gone is an authored
number wearing its old name. P1 and P4 had shipped no token and carried self-retiring guards; the guards
retire with them (2.8). `material.js` and `fracture.js` are deleted, listed as `RETIRED` in the splicer, and
`--check` fails while a block of either lingers in any target.

**The roadmap's other errors about this substance, recorded so they are not re-imported:** `sundial.js`
"survives unchanged, substance-agnostic" (it was the first file that had to change); the duration formula
above; the mono stack as the open L7 defect (it was owned since 1.3; the serif was the defect, 2.7);
`--w-name/--w-head/--w-mark` "carry over" (they exist in neither repository); and Faustina "untouched"
(it had never shipped until 2.7).

**What is judgment here, each named in the place someone would otherwise mistake it for measurement:** the
body colour; γ; the functional form of x; v₀ and the two durations in L11; the vein layer's blur. Everything
else in the table is a published value or follows from one.

**A reflectance ratio is a ratio in linear light.** The body colour is decoded out of sRGB, scaled by one
gain across all three channels, and re-encoded. *Recorded because the first resolver did neither:* it scaled
the sRGB bytes directly, so a 9.35× optical spread rendered as **116×** — the transfer function applied
twice — and it shifted hue. One gain in linear light is hue-preserving by construction, and both suites pin
it on the fluid now as they did on the crystal.

**The sun does not enter the ratio.** The substance owns *structure* — how far the lit and shaded faces sit
from the base — and the sundial owns *magnitude*: the base colour and the `(0.5+e)` directionality term.
That division was established under the crystal and the reason survives the substance: adopting a constant
ratio without the directionality term does not flatten the day, it **inverts** it, measured at −7.9 L* on
the noon highlight against +8.0 at night. The operation stays a mix *toward the light* rather than a scale of
the base, because on a dielectric the specular return carries the source's colour and a highlight
desaturates.

#### The first basis — aragonite, 2.0 to 2.4 — and what it taught

The crystal was not wrong and did not fail a measurement. What it established is still in force under the
fluid, so it is kept here rather than deleted.

**Three derivations were measured at 2.0 and two are recorded as wrong**, because each sounds more physical
than the one in force. Normal-incidence Fresnel on α/β/γ spans **1.48×** against the 5.74× the tools
authored — real optics taken that way is 3.9× *flatter* than the design. Weighting reflectance by incident
flux, `R(θ)·cos θ`, is worse: the cosine nearly cancels the Fresnel rise and the sweep collapses to
**1.13×**. What is in force is the third: on a dark, glossy surface you see the **specular** return, so a face
tracks `R` at the angle it presents *to the viewer* — the slab's own cut geometry, not the sun's position.
That is the mechanism the fluid inherited, and it is why the port at 2.5 was one index and three angles.

**2.3 tried to spend the derivation on one surface and was wrong, and the mistake is more instructive than
the result.** It anchored `body` to `#0e0d13`, found the derived ramp reproduced `--sub-hi` and `--sub-lo`
**to the byte**, spliced three generated tokens, and Rhyme's `.slab` adopted them. Every assertion passed.
All of them compared the material against the `:root` **fallback declaration**, which the sundial overwrites
every minute before first paint. Nobody has ever seen those hexes. The **rendered** substrate, from the
golden set:

| instant | `--sub-hi` | `--sub` | `--sub-lo` | face ratio hi : sub : lo |
|---|---|---|---|---|
| high sun | `#4b4a50` | `#1b1a22` | `#100f14` | 6.413 : 1.000 : 0.462 |
| low sun | `#362e31` | `#251c1f` | `#151012` | 2.238 : 1.000 : 0.434 |
| night | `#1f1f2a` | `#0e0e1a` | `#08080f` | 2.984 : 1.000 : 0.539 |

The live face ratios **swing 2.9× across the day** against the material's single value, and the adopted slab
lost its twilight response outright. Reverted in full; `body` stays anchored; `test/occvm.js` carries the
check that was missing — the rendered substrate is sundial-written, and its face ratio is not constant.
*The lesson this document keeps relearning:* every assertion passed because every assertion compared a
declaration against a declaration. Measure against what renders.

**2.4 adopted the material where it belongs**: the sundial's two authored face offsets,
`mix(sub, white, 0.14·(0.5+e))` and `mix(sub, black, 0.42)`, became the material's face ratios relative to
the base colour the sundial owns — and it corrected `authoredContrast`, fitted to the fallback's 5.739
(2.3's error one level down), into `renderedContrast`, anchored to the rendered high-sun spread at a named
instant. What it cost, over the whole day rather than at the anchor, because anchoring at high sun
*guarantees* high sun barely moves:

| instant | ΔL* highlight | ΔL* shadow | spread before → after |
|---|---|---|---|
| high sun | +1.75 | +0.68 | 13.88 → 13.44 |
| low sun | **+5.00** | **+4.47** | 5.16 → 4.05 |
| night | +0.05 | +1.59 | 5.54 → 3.32 |

The large move was at low sun and its cause was named: the shadow face gained directionality it never had,
the authored `0.42` having been flat at every elevation. 2.5 then swapped the substance under that same
mechanism and moved the substrate by +6.98 L* on the noon highlight — measured, two tokens at every instant
and nothing else — which is the first time a substance swap in this system was a contained, attributable
change rather than a redesign.

**P1 and P4** were derived from the tensor and the cell at 2.1, measured, and deliberately not wired: P1
because `translateX` had zero animated sites in either tool and a per-axis duration with nothing beside it
to differ from is 220 renamed to 194; P4 because a spacing scale censused over 213 declarations at 10.79%
mean error does not survive integer-pixel rounding at the sizes 84.5% of spacing uses (rendered c-step
1.125–1.250, straddling the cell's 1.157 without ever equalling it), and 1.6069 is indistinguishable on
screen from the golden ratio it would have been "corrected" to. Both retired at 2.8 with the quantities they
derived from.

### OCCVM-L9 — night

> **STATE: UNMEASURED** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **UNMEASURED** — written by the spliced sundial; pinned behaviourally by test/occvm.js
> - Rhyme Instrument: **UNMEASURED** — written by the spliced sundial; pinned behaviourally by test/occvm.js
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

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

### OCCVM-L13 — ambient motion

> **STATE: IN FORCE** — measured by `occvm/tools/law-audit.js`, not asserted.
> - BTC Terminal: **CONFORMS** — 1 floor call site(s), each reduced-motion guarded, on the page ground alone
> - Rhyme Instrument: **CONFORMS** — 1 floor call site(s), each reduced-motion guarded, on the page ground alone
>
> *This block is generated. If it disagrees with the tools, the tools are what is true.*

**A decorative layer may move on its own. The material may not.** That sentence is the whole law and the
two halves are not the same claim.

**What this grants, and why it is a grant rather than a repeal.** Nothing in this document ever forbade
ambient motion. The prohibition that has been cited to kill features — §5.3's deforming highlight at 2.10,
§5.6's always-on caging jitter at the same release — lives in the **master roadmap's §6**, a source
document this law quotes when recording a disposition (see §9). A rule that governs by being quoted from
somewhere else is a rule nobody can read, argue with, or bound. So it is written here, as a permission with
its own edges, and §6 stops being law by citation.

A slow, continuous decorative floor may run **unconditionally** — no gate, no triggering state, motion at
rest — provided every clause below holds. It is sourced from the system's own generators, constants and
palette rather than from invented animation.

**The cost, named so it is decided rather than absorbed.** The substance does not do this. A yield-stress
fluid below τ₀ holds: it does not spontaneously convect, coalesce or drift, and that is the defining
property L11's whole vocabulary rests on. An ambient floor therefore **contradicts the substance's own
behaviour** — it is decoration on the material, not a deeper expression of it. Recorded as the owner's
aesthetic judgment, a legitimate call recorded as one rather than dressed as a derivation, the same
standard §9 applies to the crystal's replacement.

**The line that stays closed.** A floor is a **layer sitting on** the material. The material's own surface
does not deform, breathe, settle or shimmer at rest — that is the substance lying about what it is, and
§5.3 stays dropped for exactly the reason it was dropped: below τ₀ it cannot happen. Decoration on the
substance is permitted; the substance pretending to a behaviour it does not have is not.

**L8 is untouched and this law reaffirms it.** Every motion respects `prefers-reduced-motion`. A floor
under that setting degrades to a **static frame** — never to a slower floor, a subtler floor, or a
different curve. `lockRelease` already models the pattern: no snapshot, no animation, the end state
immediately.

**Scope is per tool, and it is deliberately not symmetric.**

| tool | ambient floor | why |
|---|---|---|
| **Rhyme Instrument** | **granted at 2.37 on the page ground alone** — the fixed layer under the content column; **withheld** from `.bar`, which carries `--heat`. ~~Granted on the draft face from 2.22, with the same field as a still frame on every other slab from 2.24.~~ | a reading surface is a document and nothing on it encodes an outcome, which is why this tool was granted a floor first. What changed at 2.37 is not the permission but the **address**: the field had been drawn inside whichever slab was open, so it reseeded when a face changed, stopped at that slab's edge, and left every closed face with none — the field was a property of the open face rather than of the page. One fixed layer under everything, with the slabs as glass over it, is the same arrangement the sibling has run since 2.34, and it removes the per-surface copies rather than adding a surface. The bar keeps an opaque substrate because a measured value never gets the ground behind it. |
| **BTC Terminal** | **granted at 2.34 on the page ground alone** — the fixed layer under the content column; still **withheld** from the canvas and from every surface §5 governs | every moving mark on the sweep means something — green means your call is winning, and getting that backwards is the most dangerous possible bug in that tool. A drifting decorative mass drawn in `PAL`, beside marks that carry win/lose, is noise presented next to signal, and §7.6 of the handoff forbids exactly that trade. **None of that reasoning is repealed; it is why the grant is bounded to a surface rather than given to the tool.** The ground carries no mark, no number and no outcome colour. |

The withholding was a **decision, not an omission**, and the grant is the same: reversible the way a law
is reversible — by editing this table with a reason — never by a commit that quietly adds a floor and
lets the audit catch up. What changed at 2.34 is the *scope*, and the boundary is measured rather than
promised. `law-audit.js` requires three things of BTC's floor, each of them something a stylesheet or a
markup file can actually state: the call names the granted surface's id; that id is declared
`position:fixed`, so it is a layer over the page rather than a box inside it; and its mount sits
**outside the content column**, so no rearrangement of a panel can carry it into one. A floor that fails
any of the three reads DIVERGED, exactly as any floor at all used to.

**What a static check cannot say is named here rather than implied**: that no §5 surface's own pixels
moved. That is `test/page-load.js`'s, driven on a real DOM, and the split is deliberate — a measure that
claimed to prove it from source text would be the kind of proxy 2.14 and 2.32 both had to undo.

*What the owner is actually getting, measured, because a grant should not oversell itself.* Tiles cover
**87.6% of a 390×844 viewport and 93.5% of 1100×1400**, so the live ground is **6.5–12.4% of the screen**
— gutters and the gaps between panels. ~~The other nine tenths carries the *same field* as a still frame
through `.tile::before`, which exists only because the tiles are opaque, so the picture is a moving frame
around a still one.~~ **Closed at 2.35, and by deleting the second field rather than by animating it.**
The per-tile copy is retired: there is one field, on the substrate, and a tile shows it by letting it
through a partial fill rather than by repainting it. The live ground is still 6.5–12.4% of the screen —
that number is about the *vessel* and has not moved — but the field a reader sees through the tiles is
now the same one, at the same instant, frosted at the substance's own capillary length. And the trade is
better than the one this paragraph was hedging: the still copy was a positioned pseudo-element, so it
painted **above** the sweep and every mark on it, and nothing paints above a mark any more.

**Two further bounds, both narrow.** A floor never draws on a surface carrying an outcome colour or a
measured value. And **modulation is not what makes it legal**: a real value may scale a floor's intensity
(Rhyme's `--heat`, read-only, is the obvious first one), but the floor is lawful at zero modulation, which
is precisely why this is a grant and not a case of the gated-motion rule.

*That clause has its first consumer at 2.28.* Rhyme's floor reads the draft's own drone depth — the same
quantity `.bar` already carries per bar as `--heat` — and it scales the **convection rate**, which is the
one variable the buoyancy model already has a heat-driven mechanism for: a lamp's bulb is its heat source
and the cycle rate follows it, so the value lands on the model's own term rather than on a parameter
chosen to have something to attach. At heat 0 the period is **byte-identical** to the unmodulated one,
driven and asserted rather than described, and full heat runs the cycle **1.60×** faster and no more.
**Two guards written at 2.22 were retired to allow it, and neither retirement is a loosening of this
law — both were stricter than it.** They forbade the string `--heat` anywhere in the floor and pinned the
floor's inputs to exactly two, which is a proxy for "ungated" rather than the property; the property is
now driven. Recorded here because a guard removed without its reason on the record is how a rule stops
being a rule.

**Gated motion is a different question and is not this law.** Motion conditional on a real, actively
created state — a lock held, a tempo set — was never prohibited and needs nothing from here. One clause
belongs beside it and is stated here because this is where motion is now written down: **the gate is the
actual value, never its display fallback.** A variable that exists so a panel can render a default
(`tempo || {bpm: 90, …}`) may not be the variable a motion's trigger reads, or the motion runs forever
under a default nobody set.

*Both readings of that clause are now built, and the second one is a decision rather than a derivation.*
**Reading A** (2.18) put the pulse on the tempo control, where the claim is bounded to *this is the
number you set*. **Reading B** (2.23) puts it across Rhyme's whole draft face. The tool knows exactly one
thing here — a number typed into a panel. It has no audio, no clock aligned to any track, and §11 says
the performance is never its; so a face-wide pulse makes a larger claim on the same evidence than the
control-sized one does. **It is built at full scope by the owner's decision, recorded as one**, the
standard this document already applies to the floor contradicting the substance and to every authored
duration in the system. Measured rather than asserted: with no tempo set the face reads `--pulse` 0.000
and the wash resolves fully transparent; with a real 95 bpm it peaks at 0.993 on 21 of 120 samples, and
at peak the wash moves **22.4% of the face at a mean 1.00 L\*, max 4.47**. Under reduced motion the phase
stays 0 across 120 samples and the resolved `background-image` is `none` — a still face, from the hook
and from the stylesheet independently.

**Written at 2.15, first worn at 2.22.** The law existed before the first floor, so the first floor was
built against a written boundary rather than negotiating one afterwards — which is what it was for, and
it is the first law here that can say so. Rhyme's draft face carries one; BTC carries none, and the
auditor measures the split rather than trusting this table.

*The measure could not tell the tools apart until the day it was needed.* `readTool` handed each measure
`{raw, own}` and no name, so L13 — the one law whose measure reads the name, because its grant is per
tool — saw `undefined` and answered *withheld* for **both** tools on every run since 2.15. Four synthetic
guards built their own `{name, own}` and passed. That is 2.7's hardcoded `SIBLING` one level along: a
measure verified against its fixture instead of its call path. Found at 2.22 by a correct floor reading
DIVERGED, fixed, and guarded through `readTool` itself so the fixture and the runner cannot drift again.

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

**Added at 2.12 (OCCVM-L2):** `--occvm-well`. Its two amplitudes are surface inputs read through
fallbacks (well-a, rim-a), exactly as the bevel reads hi-a and cut-a — a consumer supplies them, the
spine does not declare them, and neither is a token this section governs. The recess is the same capillary length at the opposite curvature: at a concave corner the
meniscus curves the other way, so the wall facing the light is the one in shadow. That is why an engraved
field reads dark where a raised one reads bright — and why hand-writing it produced five slightly
different depths in one tool before it was a primitive. Derived from `--occvm-meniscus`, not authored
beside it; its default amplitude is shallower than the bevel's because a recess occludes more light than
it returns.

**Added at 2.10 (OCCVM-L2):** `--occvm-meniscus` and `--occvm-gloss`, both derived and both read by
`--occvm-bevel` on the line below them — see L2. Neither is authored: the first is λc from `rheology.js`,
the second the substance's 60° gloss against the ASTM D523 reference, and `test/occvm.js` fails if either
drifts from its derivation.

**Added at 1.1 (OCCVM-L10), retired at 2.25:** the vein-density token. Retired with the vein layer it governed; the globule field's density is a number in `globules.js`, and a token reaching nothing is D12. The growth-anisotropy token added beside it was **retired at
2.8** (L10, §6b): a suspension has no direction to be anisotropic along, and the one axis colloid science
offers was measured on the lattice and does not express.

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

### 2a-0. Where a new token goes — the boundary, stated because it was not

Three sections take tokens and a fourth thing is not a token at all. The distinction is mechanical, and
until 2.13 it existed only in the guards, so the only way to learn it was to be refused three times:

| it is | it belongs in | test |
|---|---|---|
| **declared by `spine.css`** at `:root`, one fixed value | **§2a** | is it a literal in the stylesheet? |
| **written by `sundial.js`** every tick, no CSS default that survives | **§2ab** | does the sundial `setProperty` it? |
| **written by another spliced part** — `pigments.js` since 2.27 — over a `:root` fallback that does survive until it runs | **§2ad** | does a spine part other than the sundial write it? |
| **a surface input** read through `var(--x, fallback)` and supplied per consumer | **neither** — it is not spine-governed | does the spine only ever *read* it? |
| anything above, once it exists | **§6b's migration table**, always | the census scans `spine.css` and requires every `--name` it finds |

`--hi-a`, `--cut-a`, `--well-a` and `--rim-a` are the third row: the spine reads them and never declares
them, so a surface chooses its own amplitude without the law having an opinion. Putting one in §2a fails
"the spine declares every token §2a lists"; putting one in §2ab fails the census; **omitting it from §6b
fails whatever else you did**, because that table is fed by scanning the stylesheet rather than by hand.

**The fourth row is new at 2.27 and the boundary did not have it.** Until then exactly one spliced part
wrote tokens, so "written by the sundial" and "written by the spine" were the same sentence and nothing
had to tell them apart. `pigments.js` breaks that: it writes thirteen tokens at load and on every palette
change, and they are unlike the sundial's in the one way that matters here — **each keeps a `:root`
fallback that is genuinely what renders until the part runs**, because a page that painted no outcome
colour for one frame would be worse than one that painted the default palette's. So they are neither
§2ab (which is defined by having no surviving default) nor §2a (whose values are fixed). §2ad is that
class, and the rule for it is the one the fallbacks make necessary: **a §2ad token's `:root` declaration
must be its default palette's value exactly, and the suite asserts the set identity** — a fallback that
has drifted from what the part writes is a second source of truth wearing a safety net's clothes.

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

### 2ad. Governed since 2.27 — written by the palette, over a surviving fallback

`--malachite --malachite-lo --ruby --ruby-lo --gilt-a --gilt-b --gilt-c --verdigris --verdigris-lo
--pigment --pigment-lo --vein-hi --vein-lo`

Thirteen, all written by `occvm/pigments.js` through `occvmApplyPigment` — at load and on every palette
change, never on a tick. The list is `OCCVM_PIGMENT_TOKENS` and not a sentence here; a count typed into a
document is the 2.14 defect and this document has made it twice.

**What separates this class from §2ab is the fallback, and the fallback is load-bearing.** A sundial token
has no CSS default that survives its first write, by design: a light vector's placeholder is meaningless.
An outcome colour's is not. A page that painted no malachite for one frame — or worse, painted nothing
where a won window should be green — would be a worse failure than one that painted the default palette,
so every token here keeps a `:root` declaration and that declaration is what renders until the part runs.
It is also what renders in jsdom, which resolves no custom property at all: a palette that silently became
empty strings would paint nothing while every assertion passed, and the suite would report green.

**The rule that makes a surviving fallback safe rather than a second source of truth:** each `:root`
declaration must carry the DEFAULT PALETTE's value exactly, and the suite asserts that as a set identity
in both tools. A fallback allowed to drift from the palette it mirrors is precisely the restatement L6
exists to catch, dressed as a safety net. The same rule binds `PAL`, BTC's canvas palette, whose thirteen
JS literals are the same set for the same reason.

### 2b. Registered, not yet spine — promoted at the release named

Declared by one tool or by both with divergent derivations. Each is spine at the release that unifies it;
until then the tools' own declarations stand and the gap is a defect.

*Empty as of 1.4.* `--mineral --mineral-lo --vein-hi --vein-lo` were the last entries here: Rhyme declared
them alone, and BTC had no `ruby` mineral to declare at all. Both were then driven from the single shared
`occvm/minerals.js`, so the gap this table exists to track closed.

*2.27 moves that whole group again and the row stays empty.* `minerals.js` is retired and
`occvm/pigments.js` replaces it; `--mineral --mineral-lo` are renamed `--pigment --pigment-lo`, and the
palette now also writes the four fixed roles and their ramps. Every one of those is **§2ad** — written by
a spliced part, over a `:root` fallback — so none of them is a *registered-not-yet-spine* gap. `--ruby-lo`
returns here after 1.9 deleted it as dead weight: it has a consumer now (`PAL`, BTC's canvas palette, read
it as a bare literal `#6b1a2e` with no token to resolve from, which is the restatement L6 exists to catch
sitting in the one file the measure could not see until 2.17), and the 1.9 guard that pinned it deleted is
retired **in name only** — the two tokens beside it, `--glass-hi` and `--warn`, stay pinned, and
`--ruby-lo` is now held to the stronger property instead: it must be written by the palette *and* read by
`PAL`, so it cannot go dead a second time.

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
**`OCCVM-D14` — seven of nine primitives are worn by neither tool. Open, recorded 2.13.** `OCCVM-D12`
catches a *token* consumed by nothing. Nothing caught a *class* worn by nothing, so the primitive set has
been decorative since 1.0 and no gate said a word: `.occvm-slab` carried the bevel this law describes
while **zero elements in either tool wore it**, which is why 2.11's adoption had to be found by hand.

Measured 2.13, `class=`/`className=` in each tool's own markup:

```
.occvm-act      btc  0   rhyme 14   worn
.occvm-sym      btc  2   rhyme  0   worn
.occvm-cast     btc  0   rhyme  0   UNWORN
.occvm-cast-1   btc  0   rhyme  0   UNWORN
.occvm-cast-3   btc  0   rhyme  0   UNWORN
.occvm-focus    btc  0   rhyme  0   UNWORN
.occvm-num      btc  0   rhyme  0   UNWORN   — and reached nothing anywhere until 2.13
.occvm-rule     btc  0   rhyme  0   UNWORN   — likewise
.occvm-slab     btc  0   rhyme  0   UNWORN
```

*The guard is an EXACT-SET assertion, in both directions.* A newly-unworn primitive fails it, and adopting
one of these seven **also** fails it, so the record moves with the code instead of absorbing it. A ledger
that only ever grows is how §7's conformance table came to read `violates: —` for six releases; this one
cannot grow quietly and cannot shrink quietly either.

*Two of the seven were worse than unworn and are fixed here.* `.occvm-num` and `.occvm-rule` reached **no
element anywhere**, including the reference surface — whose entire claim is one live specimen per law. A
primitive absent from it cannot be seen to stop applying, which is the one thing that surface exists to
show. Both now have a specimen, and the guard asserts every declared primitive has one, permanently.

**What closes D14 is adoption or deletion, per primitive, and neither is a correction commit's business.**
A cast that no surface wears is either a shape both tools should be using or a shape the law should stop
promising; deciding which is a design call, and the point of this entry is that it is now a visible one.


**`OCCVM-D13` — the golden set cannot see an adoption. Open.** It records custom properties off `:root`,
so a change to a *consumer* — a `box-shadow` on `.tile`, on `button`, on `.slab` — is invisible to it.
Measured, not supposed: run against 2.11's finished adoption, the largest visual change this system has
made, `golden:verify` passed **561 values, zero deltas**.

*The fix was attempted at 2.11, failed three times on CI, and was reverted at 2.12.* A `WORN` tier
recorded each surface's **resolved** box-shadow beside the tokens. On the runner it read the `:root`
fallback (`--lx .35 / --ly -.85`) at all three pinned instants, while the token it multiplies recorded
correctly at each — so the recording differed by machine rather than by anything the page declares.
Neither collapsing two `page.evaluate` calls into one nor forcing layout before the read moved it.
A baseline that reads differently on the runner than on the clone measures the machine, not the page,
and is worse than the gap it closes. Withdrawn; the gap stands recorded.



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

*`--pigment` and `--pigment-lo` replace `--mineral` and `--mineral-lo` at 2.27, and change class doing
it.* The old pair was tool-local: each tool's own `applyMineral()` wrote four properties by hand, which is
how a shared set acquires a local exception. The new pair is written by `occvm/pigments.js` — one part,
one call, both tools — so it is **§2ad**, and so are the nine role tokens the palette now drives
(`--malachite --malachite-lo --ruby --ruby-lo --gilt-a --gilt-b --gilt-c --verdigris --verdigris-lo`) and
the two field tints it inherited (`--vein-hi --vein-lo`, which keep their names: the generator they were
named for retired at 2.25 and the tint did not, and renaming a token whose meaning did not change would
put a second migration in a release that already has one). Thirteen in all, and the count is what
`occvmApplyPigment` writes rather than a number typed here — `OCCVM_PIGMENT_TOKENS` is the list.

*`--safe-top` and `--safe-bottom` join the tool-local row at 2.36, in BOTH tools, and the reason they
are tokens rather than inline `env()` is the defect that produced them.* A screen recording from the
owner's phone showed the price readout cut in half by the Dynamic Island: BTC declared
`viewport-fit=cover` and a translucent status bar, and then carried **no `env(safe-area-inset-*)`
anywhere**, so the content column began 14 px from the top of a screen whose top 59 px belong to the
system. Rhyme had the inset on its sticky binding and nowhere else, so a panel header that reached the
top collided the same way. **An inset written inline into each rule is an inset nobody can test** —
`env()` cannot be set from a harness and no engine here emulates a notch, which is exactly why this
was listed as "untestable in this environment" and shipped unmeasured. Read once into a custom
property, every consumer becomes `var(--safe-top)` and a test drives the property and measures the
layout move: at 0 the page is byte-identical to before, at 59 px the header moves down 45 px and the
band below appears at 59 px tall.

*BTC's `--field-hi` joins with them* — the top colour of the page's own ground gradient, promoted out
of a literal so the status-bar band and the page cannot drift: one value, two readers, which is L3
applied to a colour that was already written twice in effect. It also does the work of matching the
sweep's opaque tile to its frosted neighbours (2.36), since compositing the fill against the ground
rather than against transparency needs the ground to have a name.

*`--tile-fill` joins the tool-local row at 2.35 for BTC and **at 2.37 for Rhyme as well*** — how much of a tile's own substrate survives,
the rest being the page ground behind it seen through the frost. It exists because 2.35 retired the
per-tile copy of the globule field: there is one field in that tool now, on the substrate, and a tile
shows it by letting it through rather than by repainting it. **The value is authored and the criterion
that fixes it is not.** A serif set on a tile must read no worse than the same serif set on the bare
ground beside it; measured over six seeds at the sundial's night instant the two cross at 38%, and what
shipped before read 27.79 L\* worst core pixel in the tile against 36.69 on the ground — the tile was
the worse surface to read on, and had been since it was built. Tool-local for the same reason
`--globules` is: neither spine-declared nor spine-written.

*It stops being BTC's alone at 2.37, when Rhyme's floor moved to its page ground and its slabs and
closed faces became the glass over it — the same token and the same criterion. **The number
transfers; the verdict does not, and that was measured rather than assumed.*** Chromium, the
sundial's night instant, five samples per surface, glyph core against the exact background under it,
with a **constructed** ground twin — that tool carries no serif on its bare ground, so the twin is
the same node at the same height with the same computed face, size, weight, colour and shadow, and
only what is under it differs:

| Rhyme, at 38% | worst core pixel | against its ground twin |
|---|---|---|
| a closed face (`.edge`, 22px) | **47.11** | 47.40 — **0.29 below: parity, the criterion holds** |
| the open face (`.slab`, 30px) | **43.91** | 47.40 — **3.49 below: the criterion is missed** |

**The open face misses it and ships missing it, which is recorded rather than tuned away.** Three
things make that the honest disposition. *It is a widening, not a new gap:* the pre-2.37 opaque slab
read 46.56 against the same 47.40, so that head has never been at parity with its ground and 2.37
costs it a further 2.65. *No attainable fill closes it:* the sweep runs 42.66 at 70%, 43.52 at 46%,
43.91 at 38%, 44.37 at 34% — monotone, and still 3.03 short at 34%, so parity would need a substrate
that is not there. *And the cause is structural rather than the fill's:* `.slab` carries a
`radial-gradient(140% 90% at 20% 0%, …)` highlight and its `h2` sits in it, so that head is on the
brightest part of its own substrate by design. **The frost is free** — isolated, opaque reads 46.56
unfrosted against 46.60 frosted, and 38% reads 44.42 against 44.49, so the fill is the whole cost.

*That parity does not hold across the whole day, and the reason is a finding rather than a tolerance.*
At high sun the same measurement reads 36.00 in the tile against 39.38 on the ground. The tile's
substrate is sundial-written and brightens with the light; **the page ground is not, because `--field`
and the body gradient beneath it are literals the sundial never touches.** So the gap opens at noon and
closes at night, and no single fill can hold parity at both. That is `OCCVM-L3` — one light — not
reaching the page ground, which is 2.17's finding on the canvas one surface along. Recorded here, not
fixed here: making the ground read the sun moves a colour under every surface in the tool and is not
something a tile change does.

*BTC's `--globules-size` joins the tool-local row at 2.28* — the pixel dimensions the globule field was
generated at, written beside `--globules` by the same call and read by `body::before` and every
`body::before` as its `background-size` (`.tile::before` read it too until 2.35 retired the per-tile
copy). It exists because of a defect it makes impossible to
reintroduce: an SVG data URI carrying a viewBox and no intrinsic width has no `auto` background size, so
the field had been STRETCHING to fill whatever box it landed in — a 1.9:1 vertical oval on a tall
viewport, a different oval on every tile. A globule's shape was a property of the element rather than of
the fluid, and no length in the field meant anything on screen. Tool-local for the same reason
`--globules` is.

*BTC's `--pg` joins the tool-local row at 2.27* — the palette picker's own swatch colour, set inline on
each unselected button from that palette's accent so the row is five real swatches rather than five
labels. The selected button *removes* it and reads the live tokens, which is the whole reason it is a
token and not a background: the offer and the applied state have to be able to disagree. Tool-local for
the same reason `--pulse` and `--slide` are — neither spine-declared nor spine-written.

*BTC's `--globules` joins the tool-local row at 2.25* — the still frame of the globule field, written by
`globuleLayer()` once per mineral change and read by `body::before`, where `--vein` was — and by
`.tile::before` too until 2.35 retired that second copy, so the still frame now has exactly one reader
and `test/occvm.js` counts it. Tool-local for the same reason `--pulse` and `--slide` are.

*Rhyme's `--slide` joins the tool-local row at 2.21* — the bank row's **transmitted** travel under a
swipe, written by `useSwipeYield` and read by `.bankrow`. Tool-local for the same reason `--pulse` is:
neither spine-declared nor sundial-written. It carries the flowed displacement rather than the finger's,
so the yield stress is visible in the token itself — below τ₀ it reads exactly `0px` however far the
thumb has gone.

*Rhyme's `--pulse` joins the tool-local row at 2.18* — the metronome's beat phase, written by
`useBeatPulse` and read by `.cast`, and since 2.23 by `.draftface` as well (Reading B). It lands here rather than in §2a or §2ab because §2a-0 says where a
token goes and this is neither spine-declared nor sundial-written. The census caught its absence from this
table on the first run after it was written, which is the boundary refusing a change rather than
describing one afterwards.

### What 2.0 does to each class

2.0's break is that **a hex stops being authored and starts being derived**: `--sub: #1b1a22` becomes
`material(obsidian)` resolving to a surface response. At 2.0 the anchor was aragonite (CaCO₃, orthorhombic,
biaxial) for substrate and vein alike; since 2.5 it is a yield-stress fluid (L12), and the crystal left at 2.8. The table is by class, because the class is what decides the fate:

| class | tokens | at 2.0 | what a migrator does |
|---|---|---|---|
| **Substrate & ink** | `--sub --sub-hi --sub-lo --edge --bone --bone-lo --bone-dim` | **derived from the material.** Three substrate weights become the three faces an orthorhombic crystal actually has — lit face, shade face, edge — each taking its own principal refractive index (α/β/γ) rather than one scaled response. | Stop declaring them. Declare a material; read the same names back. The names do not change, which is deliberate: the migration is in where the value comes from, not in what a surface calls it. |
| **Faces (L7)** | `--serif --reading` | **Owned since 2.7.** `--serif` leads with "OCCVM Serif" (Fraunces, `occvm/serif.css`, both tools); `--reading` is "OCCVM Reading" (Faustina, `occvm/reading.css`, Rhyme only — the one tool that sets running text in a serif). The fallback stacks stay behind the owned face. Neither tool restates either token; the spine governs both. | Nothing; delete any local `--serif` restatement. |
| **Light (sun)** | `--lx --ly --elev --fill --rake --sheen --hi-a --cut-a --shade-a --lxpx --lypx` | **Unchanged in meaning.** Real astronomy already; 2.0 gives it real optics to interact with rather than replacing it. *One name changed at 2.2:* `--amb` → `--fill`, values byte-identical — see OCCVM-L3. | Rename `--amb` to `--fill`; nothing else. |
| **Night & moon** | `--night --dusk-stage --phosphor --glow --nglow --nglow-s --moon-alt --moon-illum --moon-light --moon-x --moon-y` | **unchanged.** Emission from materials is 2.0's, but it is additive over these, not a replacement. | Nothing. |
| **Cut & cast** | `--occvm-bevel --occvm-well --well-a --rim-a --occvm-meniscus --occvm-gloss --occvm-cast-1 --occvm-cast-2 --occvm-cast-3 --lit-x --lit-y --cut-x --cut-y` | **gain a density term.** Cast weight and apparent mass become functions of the material's density rather than three fixed depths. The three depths survive as the named steps. | Nothing, unless the surface authored its own offset — which no conforming surface does. |
| **Gilt, bronze, verdigris** | `--gilt-a --gilt-b --gilt-c --bronze-a --bronze-b --bronze-c --verdigris --verdigris-lo` | **verdigris becomes a process.** Oxidation as a function of exposure rather than a hex. Gilt and bronze stay authored: they are *finishes*, not minerals, and 2.0's non-goal clause covers them. | Read `--verdigris` as before; stop treating it as constant across time. |
| **Mineral** | `--mineral --mineral-lo --vein-hi --vein-lo` | **become material properties.** The three-mineral set stays closed with its fixed meanings (L6); what changes is that a mineral carries hardness, cleavage, birefringence and luster rather than two hexes. | Nothing at the token level. A tool that wants the new properties opts in. |
| **Vein → Globules** | `--globules` (BTC, written by `globuleLayer()`); `--vein-density --vein --veins` all **retired at 2.25/2.24** | **`--vein-habit` retired at 2.8, by measurement** (L10): a suspension has no direction to be anisotropic along, and the sticking-probability axis does not express on the lattice. `--vein-density` is the volume fraction; the generator is DLCA and reads no substance module. | Stop passing `habit`; nothing else. The generator ignores the argument for a 1.1-era caller. |
| **Face** | `--mono --serif --sans --t-num` | **unchanged.** A typeface is not a mineral. `--sans` is BTC-local and stays OS-supplied by deliberate design — the roadmap's own non-goal for a sans. | Nothing. |
| **Tool-local semantics** | BTC: `--up --down --err --field --rule --glass --lit --shade --ink2 --malachite --malachite-lo --ruby --amethyst --amethyst-lo --globules`; Rhyme: `--thick --bthick --stone-h --pad --c --k --text --heat --m --vk --pulse --slide` | **not spine, not promised, unchanged by 2.0.** These name a tool's own subject matter. | Nothing. They are yours. |

### What the audit found once it stopped trusting the checkout

**BTC wrote `--mineral`, `--mineral-lo`, `--vein-hi` and `--vein-lo` and read none of them.** Four tokens,
declared and rewritten on every mineral change, consumed by nothing in that tool — `veinLayer()` took its
tint straight from `occvm/minerals.js` while taking density and habit from CSS, an inconsistency 1.4
introduced and nobody looked at again. Rhyme consumes all four, so with both clones on the machine the
audit saw them consumed and said nothing. **CI checks out one repository, and that is where it surfaced.**

Both halves are fixed. `veinLayer()` now reads `--vein-hi`/`--vein-lo` the same way it already read
`--vein-density` (and, until 2.8, the habit), so the tokens `applyMineral()` writes are the ones the layer is
grown from; and BTC's mineral picker wears the mineral it is offering, which is what `--mineral`/`--mineral-lo`
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

## 7. Conformance — measured, not asserted

**This table was hand-typed and false for six releases.** It read `violates: —` for both tools from 1.0
until now, was never re-measured, and stated conformance to laws the tools plainly break: BTC paints corner
radii up to 999px against L2's declared ≤4px, and both tools name serif faces they do not embed against L7's
"no font the tool does not own". Nothing caught either, because nothing was looking — every other claim in
this system is guarded (`token-audit.js`, `splice-spine.js --check`, `occvm/golden/`, `test/prereg.js`
reading CLAUDE.md from disk) and **the laws were the last thing left saying "this is true" with no
instrument behind it.**

`occvm/tools/law-audit.js` measures each law against both tools and CI runs it with `--check`, which fails
when a law measured as DIVERGED is not recorded as such here. The table below and the state block on each
law are generated from that run.

| law | | state | BTC Terminal | Rhyme Instrument |
|---|---|---|---|---|
| **L1** | substrate and inscription | UNMEASURED | UNMEASURED | UNMEASURED |
| **L2** | geometry: the vessel and the meniscus | IN FORCE | CONFORMS | CONFORMS |
| **L3** | one light | IN FORCE | CONFORMS | CONFORMS |
| **L4** | cast shadow | IN FORCE | CONFORMS | CONFORMS |
| **L5** | gilt is reserved | UNMEASURED | UNMEASURED | UNMEASURED |
| **L6** | the palette is a choice of colour, never of meaning | IN FORCE | CONFORMS | CONFORMS |
| **L7** | figure discipline | IN FORCE | CONFORMS | CONFORMS |
| **L8** | the interaction floor | IN FORCE | CONFORMS | CONFORMS |
| **L9** | night | UNMEASURED | UNMEASURED | UNMEASURED |
| **L10** | the substrate layer | IN FORCE | CONFORMS | CONFORMS |
| **L11** | yield | UNMEASURED | UNADOPTED | UNMEASURED |
| **L12** | the material | IN FORCE | CONFORMS | CONFORMS |
| **L13** | ambient motion | IN FORCE | CONFORMS | CONFORMS |

**9 in force · 0 diverged · 4 unmeasured · 0 unadopted**

### What the four states mean, and why four rather than two

Collapsing these is how "declared and unadopted since 1.0" came to read as a working law.

- **IN FORCE** — measured, and at least one tool conforms with none diverging.
- **DIVERGED** — measured, and a tool does not conform. The numbers are on the law itself. A diverged law
  is still the law; divergence is a fact about the tools, not a repeal.
- **UNADOPTED** — the law is real and nothing wears the surface it governs yet.
- **UNMEASURED** — conformance is a judgment a script cannot make. Whether the gilt marks what *decides*
  (L5) needs an eye. This is not an excuse and not a pass; it is the honest label, and it is better than a
  `—` that reads as a clean bill.

A tool absent from the checkout is reported ABSENT and never counted as conforming. That bug has been fixed
twice in this repository already — the golden recorder and the token audit's gate — and it is the same bug
both times: a sweep that finds nothing concluding nothing is wrong.

### The divergences, and what each one is waiting on

- **L2, both tools.** BTC runs 10–22px with nine full pills; Rhyme runs 2–4px with two strays. **The two
  tools have different geometry and the shared law describes one of them.** Whether BTC's radii are a
  violation to bring back under L2 or a divergence to write into the law is a design decision. It is open,
  and it blocks any derived radius — including the capillary length 2.6 puts in `--occvm-r` — because
  adopting one silently picks an answer.
- **L4, Rhyme.** One cast of twenty-three uses a fixed offset instead of the light vector. Small, local,
  and the same defect class 1.2 swept out of both tools; it survived the sweep.
- **L6, BTC.** The `--amethyst` pair is restated in the tool's own `:root` where `minerals.js` owns it —
  the duplicate 1.4 was meant to close. BTC's `--malachite`/`--ruby` are **not** counted: §5 grants those as
  outcome colours, a different meaning on the same hexes.
- **L7, both tools.** Both name `Iowan Old Style` and `Palatino` with no `@font-face`. BTC embeds its mono
  and not its serif; Rhyme embeds neither. So most viewers already read the section heads in a fallback,
  which is the same class of defect as a token resolving to nothing — and it is the *serif*, not the mono
  stack the roadmap named.

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

**2.8** is the release the pivot was for, and it is the first one that changes what either tool *looks*
like below the substrate ramp. The vein layer is a different object: not dendrites from nuclei in clear
matrix but a network suspended in the material, everywhere at once, blurred where it was crisp — produced by
changing the mechanism to the one a colloid actually has, not by restyling the old one. Deleting a draft in
Rhyme now necks and pinches off and *stops*, on a curve the substance derived, where it used to cleave along
a crystal's plane. And a token died: `--vein-habit`, retired because the one meaning a fluid could give it
was measured and found below the estimator's error. That is the disposition this document has given every
derived quantity since 1.1b — the twin misfit, P1, P4, trap depth — applied for the first time to something
already shipped. **What 2.8 did not do:** it did not widen the meniscus bevel (L2 stays DIVERGED at the
spine's 1px), and it did not touch BTC's lock, the koan, or anything from the roadmap's foil pair; those are
2.9, with the disposition of the whole roadmap written into §9.

---

## 9. The 2.0 master roadmap — disposition (2.9)

The roadmap's second revision (§0–§10 of `OCCVM 2.0 — Master Roadmap`) is the directive for these tools. It
was written without the branch in view, so its §2–§3 restated nine things the branch had already measured
otherwise (L12 records them). What follows is every concept it proposes, with the one of three verdicts each
earned, and the reason. The ratio was priced in advance at roughly a third dropped; it came out at that.

| roadmap item | verdict | why, in one line |
|---|---|---|
| Ketchup as Herschel-Bulkley, SGR beneath (§2) | **adopted** (2.5) | τ₀ corrected 0.03 → 21.15 Pa; the rest as published |
| Electromagnetic layer retired (§2) | **adopted** | a 0.43 nm Debye length is not a UI dimension |
| Three-tier cadence → trap depth (§2, #4) | **adapted** (2.8) | "no formula exists" was wrong: E = x·ln(t/t₀); derived, unwired |
| `S.lock` → caging (§2, §5.6) | **adapted** (2.9) | expressed at the *release*, on the cessation curve; never as always-on jitter |
| `veins.js` re-derived to DLCA (§3, §5.4) | **adopted** (2.8) | the mechanism a colloid has; "diffuse, suspended" fell out of it unasked |
| `fracture.js` → `yield.js` (§3) | **adopted** (2.8) | hold, neck, pinch-off; duration authored, shape derived |
| Yield duration from γ̇ (§3, #1) | **dropped** | 1/n = 5.26 spans 10¹⁸ in rate over 100× in stress; #1 is meaningless, closed |
| Cessation motion (§6) | **adopted, corrected** (2.8, 2.9) | reproduces to four figures; its attribution of the regime is inverted (L12) |
| Koan as copy (§4.1) | **adopted** (2.9) | BTC's idle canvas; free, as the roadmap said |
| Critical slowing down on `S.edge.windows` (§4.1) | **adapted** (2.9) | recorded as a column beside `rv60` under §11.5's recording-is-not-reporting; never a lock animation — SEAS raises variance every morning by construction |
| Threshold-as-zone / critical opalescence (§4.1, §5.5) | **dropped, sourced** (2.10) | yielding is a *subcritical* bifurcation — the viscosity jumps discontinuously and hysteretically (Coussot 2002), the opposite of a critical point's continuous divergence. The real zone is delay + hysteresis + aging, and every quantitative form on record is Carbopol, clays or carbon-black gels — **none from ketchup** |
| Zeno / anti-Zeno (§4.1) | **not scheduled** | the roadmap's own disposition |
| `bomb.js`, one-way commit, Fisher-KPP front (§4.2, §5.7) | **deferred** | on the roadmap's own #11: Rhyme has no commit action to hang it on (its model is a shelf of drafts edited in place) |
| Fisher-KPP speed from ketchup's k/n (§5.7) | **dropped, and the reason is stronger than the original** (2.10) | Fisher-KPP requires `f′(0) = r > 0` — the propagating quantity must promote its own production. Every sourced description of the mustard-oil bomb is first-order substrate depletion at fixed enzyme, and AITC does not catalyse sinigrin hydrolysis. **There is no r in the chemistry at all**, not merely none in the rheology. After disruption the contact advances as √(Dt) and never at constant speed; the only true front is the mechanical damage front |
| Substrate from scattering (§5.1) | **dropped, sourced** (2.10) | the gap it names closed at 2.5. Kubelka-Munk coefficients for ketchup **do not exist in the literature**; the one measured row is Jensen et al. (SIGGRAPH 2001) — σ′s 0.18/0.07/0.03 mm⁻¹, σa 0.061/0.97/1.45 mm⁻¹, Rd 0.16/0.01/0.00 — and it says bulk ketchup is a dark **red** (L\* 31–36) against the substrate's L\* 3.8, so a derivation needs an authored hue-strip *and* an authored ~8× darkening: two judgments replacing one. In green and blue it is absorption-dominated (σa/σ′s 14 and 48), outside the diffusion regime its own source flags. Recorded here so nobody re-sources it |
| Wet, deforming highlight at rest (§5.3) | **ADOPTED** (2.10), once the motion was removed | the deformation was idle motion, which §6 forbids and which below τ₀ cannot happen. Everything else survives statically: breadth is **curvature**, a band one λc wide, and amplitude is the substance's own **68.5 GU** against the ASTM reference — dimmer than polished, not softer. Both derived; see L2 |
| Always-on caging jitter (§5.6) | **dropped, sourced** (2.10) | SGR says an undisturbed caged element shows **nothing**: the readout is `E − kl²/2` and at zero applied load the stored strain is zero, so there is no thermal rattle to draw. What *is* observable at rest is a cost, not an amplitude — the static yield stress rises with rest time — and no ketchup measurement of it exists (the delay laws on record are Carbopol's and colloidal gels'). Unwired, like trap depth |
| Fraunces SOFT 35 / WONK 1 (§7) | **adopted** (2.7) | `opsz` kept variable against the pinned 40: BTC renders it at 12px |
| Wordmark caps by `text-transform` (§7) | **recorded as false** | both wordmarks are lowercase by authored markup — `btc terminal`, `rhyme instrument` — with no transform; an identity constant sitting on the font, unchanged |
| Mono stack as the open L7 defect (§7, #6) | **recorded as false** | owned since 1.3; the serif was the defect (2.7) |
| Second substance for Rhyme (§4) | **closed: one substance** (2.10) | measured rather than argued. Mustard's sourced density (1.052) moves λc only **7.15 → 7.44 px** and its estimated index moves the spread 14.15 → 14.7–16.6×, so nothing L2 or L12 renders would visibly differ; and its own Herschel-Bulkley triple is paywalled everywhere reachable, so adopting it would trade a sourced substance for an unsourced one. What it would genuinely add is thixotropic stress-history memory — which is `bomb.js`'s hook and nothing else, and defers with it |

**The foil, as a rule.** The roadmap's one governing test is adopted as written and applies to every proposal
that follows: *does it make BTC more patient, or Rhyme more reactive — or does it make them resemble each
other?* A feature that would work equally well in either tool is the failure mode. Nothing from the patience
system goes into Rhyme; nothing from the reaction system goes into BTC.

**What 2.9 wired, and where it stopped.** BTC's lock release relaxes to the free sweep on the derived curve and
stops (`LOCK_RELAX_MS` authored, the curve the substance's). The koan sits in the idle canvas. Each snapshot
carries `ac1` and `acn` — the lag-1 autocorrelation of the same sixty one-minute returns `rv60` is built
from, and their count — exported as `csd_ac1`, `csd_n`, rendered nowhere. Nothing in Rhyme moved, by the
foil's own rule.

**2.10** did two things and the smaller one is the more important. The meniscus finally landed — L2's last
divergence, closed on the reference surface where the law itself said to prototype it, and the first edge in
this system whose softness is a *measured* consequence of the substance rather than a taste. The larger thing
is that the substance's own flow constants had been misattributed for five releases. `k` and `n` were
credited to a paper that contains neither, and k sat below that paper's entire published range. Every number
in this system had been checked against what renders; **not one of them had been checked against its
source.** That is a new failure mode for a document that had already recorded three variants of the old one,
and the guard that closes it — assert the constants against the paper's published ranges, and that the
retired pair cannot return — is the first in either suite to treat a citation as a claim.

*And the law gate had the partial-checkout blind spot a third time.* Its "a law recorded as diverged that
now conforms" half fired only when the rollup read IN FORCE, which no law does when a sibling is missing —
so on CI, which is always a partial checkout, a block claiming a divergence no tool had would have passed
unnoticed. It now fires whenever no tool measures a divergence, whatever the rollup. Found because the
bite test manufactures its own divergence rather than borrowing a real one, which is exactly the property
it was given in this release; the old form could not have found it, because it needed a real divergence to
exist and there are none left.

*Two things about the correction are worth keeping.* It was contained: nothing that does not read the flow
curve moved, so the meniscus, the optics and the vein dimension are all exactly where 2.8 left them, and the
release is publishable as a correction rather than a re-derivation. And it broke three assertions that had
been passing — a regime claim, a curve identity, and a gate test that could only prove itself while the code
was broken. Each was rewritten to say the smaller true thing rather than the larger convenient one, which is
the only reason the correction improved the suites instead of just moving them.

**2.22 — P-3's one pass, and the two things it returned.** The bound was one citation check at the moment
the floor was built, and that is exactly what it cost. **The scaling is confirmed:** in the viscous regime
the coalescence bridge radius grows *linearly* in time — Eggers, Lister & Stone, *J. Fluid Mech.* **401**,
293–310 (1999). The `√t` everybody reaches for is the **inertial** law, `r_b = D(γa/ρ)^{1/4} t^{1/2}`, and
a yield-stress tomato matrix is nowhere near that regime. So the floor merges linearly, and that is not a
preference.

*The logarithmic correction was measured and dropped, with the reason.* ELS carry
`r_m ~ (γt/πη)·ln[γt/(ηR)]`. It is an **early-time asymptotic**, valid for `t ≪ t_v = ηR/γ`; the form
`−t·ln(t/t_v)` turns over at `t/t_v = 1/e` and past that predicts the bridge *shrinking*. A merge rendered
to completion runs straight through that point, so carrying the log here would be using an asymptotic
outside its regime — the class of error 2.8 caught in the 3-D fractal dimension on a planar lattice, and
2.10 in `k` and `n`. Linear, without the correction, and the guard proves linearity by doubling rather
than by matching source text.

*And the absolute rate is not derivable, which is measured rather than asserted.* The linear rate's
magnitude is `γ/η`, and `η` is the substance's apparent viscosity — which depends on the shear rate the
merge itself sets. Across a plausible range: `γ̇ = 0.01` gives `η = 2,627 Pa·s` and `5.8×10⁻⁵ px/ms`;
`γ̇ = 10` gives `η = 4.99` and `3.0×10⁻² px/ms`. **The same 24 px bridge takes 417 seconds at one end and
0.8 s at the other**, and nothing fixes `γ̇` independently of the rate it would produce. That is P-4's
`η(γ̇)` arriving as a consumer and showing precisely why it was parked: the arithmetic is right and the
input is undetermined. Per P-3's own disposition the magnitude is authored and named as authored, the
`LOCK_RELAX_MS` treatment. P-4 stays parked; a consumer that cannot use it is not a consumer.

**2.24 — the field report, and the globules become the layer.** Three things from the owner's first hour on
the deployed build, each one a measurement this system had not taken. *The space bar did not work in a
bar*: the editor was bound to the reading's **trimmed** text, so every trailing space was erased on the
keystroke that typed it — pre-existing, reproduced on the deployed build (`"ink on the plate"` →
`"inkontheplate"`), fixed at source. *Setting a bpm had no visible effect*: Reading B measured a mean
**1.00 L\*** at peak and the strike lasted ~7 frames; re-aimed on a four-point sweep to **25%** (5.05 L\*,
matching Reading A's measured 5.9 on the control) and a **0.32** strike. *The tools were still displaying
crystal fractals*: they were — see L10. And the question that reframed all of it: **hadn't the roadmap
produced globules as the visual layer?** It had produced them as an underlayer on one face at a median
0.42 L\*, by an authored alpha named as a virtue, while the crystal stayed the layer that showed. **Now the
globule field is the substrate layer on every Rhyme slab** — live on the draft face, a still frame
elsewhere — at **0.24**, chosen from a five-point sweep (0.78 / 1.43 / 2.20 / **3.21** / 4.20 L\* mean) to sit
above BTC's vein wash and below a beat strike. Rhyme's vein functions are deleted rather than left
declared. What this release is, plainly: the roadmap's visual intent, delivered a second time, because the
first delivery was measured against its own guards and never against an eye.

**2.25 — BTC takes the globules, and the vein layer leaves both tools.** The owner's call, three words:
*also takes the globules.* So the field is the substrate layer everywhere, from **one shared part**,
`occvm/globules.js`: Rhyme paints it live on the draft face and still on every other slab; BTC — withheld
from motion by L13 — writes the same field once as a data URI, `--globules`, where `--vein` was. With no
tool rendering a vein, `veins.js` is **retired from every target** (the splicer's own retire mechanism,
2.8) and stays in `occvm/` unspliced as the generator L10's record cites; `--vein-density` retires with
it, a token reaching nothing. **L10 is re-authored around what renders**, and its measure with it: the
old one counted calls to a drawn fallback and read CONFORMS for a tool rendering a crystal and CONFORMS
again for a tool rendering nothing — it could not tell *grown* from *absent* and was never measuring the
law. The new one measures the consumer. The reference surface's L10 specimen is three seeds of the field.

*The weight is each tool's own, measured on its own ground.* On BTC's page, through `body::before` at
.55 and the tiles at .16: **0.12 → 1.01, 0.24 → 1.80, 0.36 → 2.71, 0.50 → 3.79 L\*** mean over the
moved region. **0.36** is chosen to sit between the vein wash it replaces (1.08) and Rhyme's slab (3.21) —
a page ground under live numbers earns less than a document face. The same alpha weighs differently on
the two surfaces, which is why it is not a spine constant.

A spine no tool has adopted is a proposal. This one is inlined in both.

---

## 10. Open physical questions — staged, and each one bounded

**Every open question in this system that is genuinely about the substance rather than about a tool sits
here, with what closes it and what it is allowed to cost.** The register exists because a physical question
with no stated bound absorbs any amount of work: there is always another paper, another regime, another
correction. A question nobody has bounded is not research, it is an appetite.

The bound is part of the entry. If closing a question would cost more than the bound, the honest outcome is
to record it as unclosed with the reason, exactly as §9 records a dropped concept — never to keep spending
against it quietly.

| # | question | what it touches | what would close it | bound |
|---|---|---|---|---|
| **P-1** | **γ, the substance's surface tension.** Carried at 0.040 N/m as an estimate, bracketed against fermented tomato juice at 40.5 / 42.6 mN/m and against water's 0.072, which is ruled out. | **λc alone** — one corner radius, ±2 px. Not τ₀ (anchored independently), not k/n, not cessation, not trap depth. | A published surface tension for a yield-stress tomato matrix. **None exists, and the reason is methodological**: ordinary tensiometry has no valid regime on a fluid that holds below τ₀. | **Closed as unclosable.** Reopens only if such a measurement is published. No further search. |
| **P-2** | **The disturbance → v₀ map.** Closed for its first consumer at 2.16 with an authored `LOCK_V0_REF` and a clamp below the 2.9196 crossover. The *general* map — any UI gesture to a substance's initial velocity — is still authored. | Any future consumer of `yield.js` that wants a real v₀ rather than the reference. | Nothing in physics. There is no derivation from px/ms to a substance's velocity, and 2.16's entry says so. | **Closed as authored.** Each new consumer names its own anchor and its own clamp, and states both. Not a research question. |
| **P-3** | ~~**Droplet coalescence, if an ambient floor is ever built (L13, Rhyme).**~~ **CLOSED at 2.22 — the pass ran and the scaling is confirmed.** Viscous regime, `r ∝ t`, linear (Eggers, Lister & Stone, *J. Fluid Mech.* **401**, 293–310, 1999). `√t` is the *inertial* law and is not this substance's. | The floor's merge behaviour. Built. | Done: one pass, at build time, as this row said. | **Spent, in full.** The bound was one pass and one pass is what it cost. Two findings came with it and are in §9. |
| **P-4** | **Trap depth, and the shear-thinning form η(γ̇).** Both derived and both unwired: trap depth from SGR's escape law at 2.8, η(γ̇) surveyed and parked with no consumer in either tool. | Nothing. Neither reaches a surface. | A consumer. Not a measurement — the arithmetic is already right. | **Parked, zero cost.** Revisited only when something wants to read one. |

**Two questions that look physical and are not, kept out of this table on purpose.** `OCCVM-D13` — the
golden set cannot see an adoption — is an instrument defect. `OCCVM-D14` — seven primitives worn by nothing —
is a design decision per primitive. Both are in §6 where defects live; putting them here would make the
physics register a place where anything unresolved can be filed, which is how a bound stops meaning anything.

---

## 11. What the tools model, and what they refuse to

**A tool here describes what is written down and what is arithmetic. It does not model performance.**

The distinction is not a limitation being apologised for; it is the line that keeps every readout honest, and
it is the same line §9 draws between a derived curve and an authored duration.

- **The beat is arithmetic and the tool may describe it.** BPM, time signature, subdivision, and — since
  2.18 — where a swung pair actually places its two onsets. These follow from numbers a person entered.
  Nothing is inferred and nothing is heard.
- **The performance is not the tool's, and never will be.** Which slot a syllable lands in, how a writer
  leans early or late against the grid, what a line does in a mouth — the tool has no access to any of it and
  no business estimating it. 2.19 states the room the beat gives and stops there deliberately.
- **A writer writes to the beat; the tool does not write to the writer.** The engine's own restraint —
  *"reading what's written, not prescribing what to write"* — is this rule at the scale of one panel.

**What this forbids, concretely.** No function may return an assignment of syllables to onsets. No readout
may claim a line is late, early, wrong, or in the pocket. No feature may synthesise a performance from a
draft, and none may treat using the tool as a substitute for having said the words out loud. A guard in
`engine-node/test/engine.test.js` fails the day the engine's public surface acquires a syllable→onset map,
and it is deliberately narrow: it catches the one shape this rule is most likely to be broken by.

A tool that measured performance would be guessing, and a guess dressed as a measurement is the failure this
whole document is organised against.

