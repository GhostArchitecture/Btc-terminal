# OCCVM — spine audit, 2026-09-06

What the two tools actually share, measured against the deployed artifacts. This document contains no
proposals and no law. It exists because the OCCVM roadmap and the 2.0 migration process are both scoped
against a spine document that does not exist, so the only available source for a 1.0 spine is the tools
themselves.

Read this before writing the spine. Everything here is reproducible from the commands in §1.

---

## 0. The declared baseline does not exist

The roadmap opens: *"Current: **1.0** — BTC `build-20260906210313`, Rhyme `build-20260906210925`."*

| Claim | Measured |
|---|---|
| BTC at `build-20260906210313` | Deployed and repo HEAD both read `build-20260906195621`. The declared stamp exists in no commit, no artifact, no host. |
| Rhyme at `build-20260906210925` | The deployed artifact carried **no build stamp of any kind** — `build-` matched zero times in 121,439 bytes. *Since corrected: the tool now mints one through `build.js --stamp` (§10).* |
| A spine inlined by both tools at 1.0 | `OCCVM` appeared in **zero tracked files** across both repositories — the single `git grep` hit was the substring inside `relay.ghostarchitectureoccvm.workers.dev`. *Since authored from this inventory and inlined in both: `occvm/SPINE.md`, `occvm/spine.css` (§11).* |
| Laws L1–L9, defects D1–D7, the §7 conformance table | Not in either repository. Not attached. Unrecoverable — they existed only in conversation. *Re-authored in `occvm/SPINE.md`; the roadmap's own references to L2, L6 and L9 pinned three of the nine, and the release sequence placed the rest.* |

Two further consequences of that last row, both load-bearing:

- **The law identifiers collide with an existing namespace.** `Btc-terminal/CLAUDE.md` §10.3 already uses `L1`
  and `L2` as *defect* IDs (`ledgerSave` quota isolation; `edgeProvisional` retry). The roadmap uses `L2`,
  `L6`, `L9` as *law* IDs. Same shape, same repository, different meanings. The spine must not reuse `L*`.
- **`Btc-terminal/CLAUDE.md` is machine-parsed.** `test/prereg.js` reads it from disk and recomputes §11's
  thresholds arithmetically; 77 assertions depend on its structure. Any OCCVM section added to that file is
  additive only, and `npm test` is the check.

The roadmap is not a plan for 1.1. It is a plan written from a 1.0 that was never shipped.

---

## 1. Method

Every figure below comes from these, against `Btc-terminal@882be16` and `Rhyme-Instrument@634e63f`, both of
which are byte-identical to their deployed artifacts (verified by `diff` against a live `curl`).

```
# token inventory — custom properties declared inside <style>
python3 - <<'PY'
import re
s="\n".join(re.findall(r'<style[^>]*>(.*?)</style>', open('index.html').read(), re.S))
print(sorted({m.group(1) for m in re.finditer(r'(--[a-zA-Z0-9-]+)\s*:', s)}))
PY

# tokens rewritten at runtime
grep -o 'setProperty("--[a-z-]*"' index.html | sort -u     # BTC
grep -o 'set("--[a-z-]*"'         index.html | sort -u     # Rhyme

# host / artifact agreement
curl -sS https://btc-terminal.pages.dev/ | diff - Btc-terminal/index.html
curl -sS https://ghostarchitecture.github.io/Rhyme-Instrument/ | diff - Rhyme-Instrument/index.html
```

The solar comparison in §3 is `occvm/tools/solar-compare.js`, which lifts both implementations verbatim and
runs them against each other. It is committed so the numbers can be re-derived rather than trusted.

---

## 2. The token surface

BTC declares **48** custom properties in its style block; Rhyme declares **42**. **20 names are common.**

### 2a. Genuinely shared — identical value, static in both (10)

`--bone-lo` `#b7ad9c` · `--bronze-a` `#d9a866` · `--bronze-b` `#8f6a35` · `--bronze-c` `#4f3a1c` ·
`--edge` `#0b0a10` · `--gilt-a` `#ffe9a3` · `--gilt-b` `#d9a52c` · `--gilt-c` `#7a5510` ·
`--verdigris` `#3f9a86` · `--verdigris-lo` `#23574c`

Plus `--serif` — the same five-face stack, whitespace aside.

**This is the whole of the shared spine as it exists today: ten hex values and one font stack.**

### 2b. Identical at cold start, divergent in behaviour (4)

`--sub` `#1b1a22` · `--sub-hi` `#2c2a36` · `--sub-lo` `#0e0d13` · `--bone` `#ece3d0`

Static hexes in BTC. In Rhyme they are **recomputed every minute** by `apply()`: `--sub` is mixed toward
`#281c1e` by twilight and toward `#0e0e1a` by night; `--sub-hi` and `--sub-lo` are re-derived from it;
`--bone` is mixed toward `#f4d6aa` at twilight and `#ccd0e0` at night.

Two things follow. First, a token inventory that samples the CSS at rest records these as agreeing, and they
only agree at solar noon-ish daylight with the twilight term at zero. Second, Rhyme rewrites `--bone` but
**not** `--bone-lo` — the primary ink drifts warm at dusk and cool at night while its own dimmed companion
stays fixed, so the pair separates in hue across the day. That is an internal inconsistency in Rhyme, not a
cross-tool one, and it is the kind of thing the spine has to decide rather than inherit.

### 2c. Shared name, divergent meaning (4)

| token | BTC | Rhyme | verdict |
|---|---|---|---|
| `--lx` | `.35` static default, overwritten each minute | `0` static default, overwritten each minute | cosmetic — both converge on the same convention (§3) |
| `--ly` | `-.85` | `1` | cosmetic — Rhyme's default is its *night* fallback value |
| `--elev` | `sin(elev)·1.4`, floored at **0.15 at night** | `sin(elev)·1.25`, falls to **0.000 at night** | **divergent**: ~11% apart in daylight, and BTC keeps a bevel at night where Rhyme goes flat |
| `--glow` | `calc(var(--night)*.28)` — CSS-derived, **0.00 in daylight**, 0.28 at night | JS-set `0.45 + 0.25(1−e) + 0.30·night` — **never below 0.45**, 1.00 at night | **incompatible**: the two ranges do not overlap in daylight |

`--glow` is the finding, and browser measurement (§10) sharpened it past "incompatible ranges". BTC's
`--glow` *computes to the literal string* `calc(0*.28)` — a custom property is substitution-only, so it never
resolves to a number at the token level, only where it is consumed. Rhyme's resolves to `0.68` / `0.45` / `1.00`.
The two are not the same kind of thing: **any spine law that reads `--glow` arithmetically works in Rhyme and
silently no-ops in BTC.** This is precisely the failure the 2.0 migration process §9 names as the thing it exists
to prevent — *"six months later the two disagree about what `--sub` means"* — already present, today, on a token
both tools declare.

### 2d. BTC only (28)

The **semantic** layer, which Rhyme has no equivalent of:
`--up` `--down` `--err` `--warn` `--model` `--model-dim` `--bondi` `--bondi-deep` — call outcome, model
provenance, and alert state. Plus `--field` `--rule` `--ink2` `--glass` `--glass-hi` `--lit` `--shade`
`--mono` `--sans` `--bone-dim`, the mineral tokens `--malachite(-lo)` `--ruby(-lo)` `--amethyst(-lo)`, and the
expired alias block `--ink` `--meas` `--dim` `--faint` `--ink2`.

### 2e. Rhyme only (22)

The **material and light-response** layer, which BTC has no equivalent of:
`--rake` `--amb` `--sheen` `--hi-a` `--cut-a` `--shade-a` `--lxpx` `--lypx` `--nglow` `--nglow-s` — everything
that turns a light vector into a surface response. Plus geometry `--thick` `--bthick` `--stone-h` `--pad`,
the mineral system `--mineral` `--mineral-lo` `--vein-hi` `--vein-lo` `--veins`, and locals `--c` `--k` `--text`.

**The two tools have partitioned the design system, not shared it.** BTC owns meaning; Rhyme owns material.
Neither has the other's half. A spine is the union, and neither tool currently implements it.

---

## 3. The light layer, measured

Both tools compute solar position from latitude/longitude with a Dayton default and an opt-in geolocation,
and both project it to screen space **with the same convention**: `lx = sin(az)`, `ly = −cos(az)`, north up.
That convention is the one thing in the light layer that is genuinely shared, and it means the 1.2 port is a
port rather than a reconciliation.

Underneath it, the implementations are different algorithms.

| | BTC `solarPosition` | Rhyme `solar` |
|---|---|---|
| Algorithm | NOAA general — Julian century, equation of centre, obliquity with nutation | Spencer Fourier approximation |
| Clock | `getUTCHours/Minutes/Seconds` | local `getHours()`, corrected by `−getTimezoneOffset()/60` |
| Elevation → `--elev` | `sin(elev)·1.4`, forced to `0.15` at night | `sin(elev)·1.25`, unforced |
| `--night` | **binary**, `elev < −2 ? 1 : 0` | **continuous**, `clamp((−elev−2)/8)` — a ramp from −2° to −10° |
| Derived tokens written | 5 | 19 |

Both time bases are correct; the divergence is precision, not error. Measured at Dayton, 10-minute steps,
`TZ=America/New_York`:

| date | max \|Δ elevation\| | max \|Δ azimuth\|, sun up |
|---|---|---|
| 2026-03-21 | 0.771° | 0.560° |
| 2026-06-21 | 0.110° | 0.435° |
| 2026-09-06 | 0.865° | 0.506° |
| 2026-12-21 | 0.077° | 0.092° |

**The light direction agrees to better than 0.6° all year — in daylight.** At night it does not agree at all,
and this audit missed it by comparing only sun-up azimuth. Measured in-browser (§10): at 2026-09-07T04:00Z BTC
writes `--lx -0.516, --ly -0.856`, still tracking a sun 39° below the horizon; Rhyme writes `0.000, 1.000`,
clamping to a neutral overhead vector below −6°. Two tools, one convention, opposite night behaviour.

Nothing else downstream agrees either:

| instant (UTC) | BTC `--elev`, `--night`, `--glow` | Rhyme `--elev`, `--night`, `--glow` |
|---|---|---|
| 2026-09-06 12:00 | 0.214 · 0.000 · **0.00** | 0.197 · 0.000 · **0.65** |
| 2026-09-06 22:30 | 0.396 · 0.000 · **0.00** | 0.361 · 0.000 · **0.61** |
| 2026-09-07 01:00 | 0.150 · 1.000 · 0.28 | **0.000** · 1.000 · 1.00 |

And because `--night` is a step in one tool and a ramp in the other, there is an 8° band of civil twilight in
which BTC reports `1` and Rhyme reports a fraction. Any law written as `calc(… var(--night) …)` means two
different things depending on which tool reads it.

**Consequence for roadmap 1.2.** Its exit criterion — *"at dawn and dusk, every cast shadow in a screenshot
points the same direction"* — is satisfiable, because azimuth agrees. Its intent, that every shadow *derives
from the sun*, is not reachable by porting `--rake --amb --sheen --hi-a --cut-a --shade-a` alone: those six are
computed from `e` and `night`, and BTC's `e` and `night` are on different scales with different night
behaviour. **The port has to unify the derivation, not just copy the tokens.** That is a larger release than
the roadmap scopes, and it is the one place where D2 was under-estimated rather than over-estimated.

---

## 4. There is no shared primitive layer

BTC's style block defines **33** classes; Rhyme's defines **97**. Four names appear in both, and all four
collide rather than agree:

| class | BTC | Rhyme |
|---|---|---|
| `.row` | `display:grid` with a six-column `grid-template-columns` | `display:flex; gap:6px` |
| `.wrap` | the page container — `max-width:1180px; margin:0 auto` | a modifier — `.row.wrap { flex-wrap: wrap }` |
| `.note` | 10px, uppercase, `.12em` tracking, `--bone-dim` | 12.5px, sentence case, `line-height:1.5`, `--bone-lo` |
| `.mark` | the wordmark — serif, 19px | **not defined in CSS** |

So the roadmap's *primitives* — the things 1.2 applies `.occvm-cast` to, the things 1.8's reference page is
meant to exercise, the things 2.0 resolves materials into — **do not exist as shared code in either tool.**
`.occvm-cast` appears in neither. `.tile` exists only in BTC; `.slab`, `.stone`, `.edge`, `.cast`, `.binding`
only in Rhyme.

**This is a hazard for the 1.0 inline step, not just an absence.** A spine that defines `.row` or `.wrap`
breaks one of the two tools on the day it is inlined. The spine either namespaces every primitive
(`.occvm-row`) or the collisions are renamed in the tools first. That decision has to be made before a line
of spine CSS is written.

---

## 5. Roadmap claims about the tools — verified

Held up:

- **D2 incomplete in BTC** — confirmed. BTC exposes `--lx --ly --elev --night`; Rhyme adds six more. BTC has
  15 `box-shadow` declarations and no cast-shadow primitive.
- **1.1 bezier veins** — confirmed. `veinLayer()` at `Btc-terminal/index.html:1602`,
  `veinSVG()` at `Rhyme-Instrument/index.html:925`.
- **D7 keyboard floor** — confirmed, and worse than stated. Rhyme ships **0** `<button>` elements, **53**
  `onClick` handlers, **0** `aria-*` attributes, **0** `role=`, **0** `tabIndex`, **1**
  `prefers-reduced-motion` query. The tool is entirely keyboard-inoperable and announces no state. BTC has 14
  `<button>` and 2 reduced-motion queries.
- **1.6 half-installed PWA** — confirmed. BTC ships `manifest.webmanifest` and four icons with **zero**
  `serviceWorker` references. Rhyme registers `sw.js`.
- **`babel-standalone` at runtime** — confirmed live in the deployed Rhyme artifact, version 7.26.4.
- **The expired alias block** — confirmed at `Btc-terminal/index.html:26–27`, and `--bondi` is still
  *referenced* at lines 352, 359, 388 and 1253, so it is a live dependency, not dead weight.

Did not hold up:

- **D6 is mis-diagnosed.** The roadmap says *"BTC hardcodes amethyst."* `--amethyst` is **declared once and
  referenced zero times**. There is no mineral system in BTC at all — no `MINERALS` map, no preference, no
  vein derivation from a chosen mineral. 1.4 is therefore not a preference-sharing release; it is a feature
  port into BTC. Different size, different risk, different exit criterion.
- **1.4's exit criterion is unreachable.** *"A mineral chosen in one tool is honored by the other"* requires
  shared storage. Rhyme stores `tome:*` on `ghostarchitecture.github.io`; BTC stores `btc.*` on
  `btc-terminal.pages.dev`. `localStorage` is per-origin — `Btc-terminal/CLAUDE.md` §1 already says so about
  the ledgers — and no common origin is available. Rhyme's existing manual export/import (`41b6b35`) is a
  paste-a-string flow, not honouring. The criterion has to become conformance (same frozen set, same meanings,
  each tool storing its own choice) or 1.4 has to be cut.
- **1.3 overstates its premise.** `--mono` is
  `ui-monospace,"SF Mono","Cascadia Code",Menlo,Consolas,"Liberation Mono",monospace` — a stack, not an Apple
  dependency. Non-Apple visitors get a mono face; they get a *different* one. Column alignment is already
  defended by `font-variant-numeric:tabular-nums` on `.num`. The defect is metric variance, not absence, and
  the remedy — an embedded subsetted face — needs a byte budget against a 406 KB single file that has none.

---

## 6. Author-time generation already exists, twice

The 2.0 migration process §0b states: *"This is the second such step — 1.6's JSX pre-transpile is the first."*
Both halves are wrong.

**Rhyme.** `build.js` assembles `tome-src/{00_data,10_engine,20_style,25_card,30_ui}` into `dist/index.html`.
The shipped `index.html` is that assembly — 127 of 127 sampled long lines from all three major source files
appear in it verbatim. `.github/workflows/ci.yml` runs the build, diffs `dist/index.html` against the shipped
file, and runs `git diff --exit-code` on the three extracted `engine-node/*` modules. **§0b rule 3 —
regeneration is idempotent — is already enforced by GitHub Actions.** `build.js` already requires
`@babel/core` and `@babel/preset-react`; it transpiles every block at build time purely to *validate* it, then
ships the untranspiled source for `babel-standalone` to compile again in the browser.

**BTC.** `units/tools/resplice.js` splices `units/*/code.js` into `index.html` between markers, with
assertions. `CLAUDE.md` §6: *"the units are the source and `index.html` is the splice target … never patch the
spliced copy."* Verified byte-reproducible.

So 1.6's real content is smaller and different than written: **emit the transpile `build.js` already
computes** — roughly a twenty-line change — and **unify two existing rituals** rather than establish a first
one. §0b should be derived from Rhyme's CI job, which is a working implementation of it.

---

## 7. Unscoped work the plans depend on

- **The golden set had no instrument.** Migration §3.3, §5 and §8 require field-recorded frames at three sun
  elevations, diffed. BTC's harnesses are jsdom, which does not render. Rhyme's CI runs engine tests only.
  Neither repository had a screenshot fixture, a headless renderer, or an injectable seed. **Built — see §10.**
- **BTC had no CI.** No `.github` directory. Its entire push safety was a hand-run `npm test` and a
  hand-edited build stamp, while Rhyme had drift-checking CI — the tool with more surfaces had less
  protection. **Built — see §10.**
- **2.0 Stage 2 puts a correctness invariant in the blast radius.** Migration §2 notes BTC has *"a chart
  canvas that does not take CSS at all."* It understates. Canvas colours come from `PAL`
  (`index.html:2561`), and `renderSweep`'s colour semantics are load-bearing on correctness —
  `CLAUDE.md` §5: *"Colour keys to the call, not the strike … Getting this backwards is the most dangerous
  possible bug in this tool."* Two fixed defects (G1, R2b) were exactly that inversion. A resolver rewriting
  colour derivation must gate on `test/sweep.js` explicitly.
- **One stale file.** `Rhyme-Instrument/rhyme_instrument.jsx` — 852 lines, v1.2, last touched 2026-09-03,
  containing no `veinSVG`, the source of nothing shipped, at the repository root under the most
  source-looking name in the tree: the *"project-directory copy is assumed stale"* hazard of migration §3.1.
  **Deleted — see §10.**

---

## 8. What the spine has to decide — resolved

Every item below is now decided in `occvm/SPINE.md`, defaulting to whatever the OCCVM roadmap already
states or implies. Where the roadmap is silent, the derivation is named. Kept here with its resolution so
the reasoning survives next to the fact that forced it.

| # | forced by | resolution | authority |
|---|---|---|---|
| 1 | `.row` `.wrap` `.note` collide with incompatible meanings (§4) | every spine primitive is namespaced `.occvm-*` | the roadmap already writes `.occvm-cast` at 1.2; this generalises it |
| 2 | `L1`/`L2` are taken by BTC defect IDs (§0) | laws are `OCCVM-L1…L9`, defects `OCCVM-D1…`, bare forms as shorthand | minimal deviation preserving the roadmap's own vocabulary |
| 3 | `--glow`: two non-overlapping ranges, and BTC's never resolves (§2c) | every light-derived token is a **resolved scalar** written by the sundial, never a `calc()`. Rhyme's curve stands until 1.7 | 1.7 refines the night model, so it must be readable arithmetically first |
| 4 | `--night`: step in BTC, ramp in Rhyme (§3) | the **continuous ramp**, 0 at −2° to 1 at −10° | 1.7 requires civil / nautical / astronomical dusk as distinct states; a binary step cannot express them |
| 5 | `--elev`: ×1.4 with a 0.15 night floor, or ×1.25 to zero (§3) | Rhyme's ×1.25 to zero; **the night floor moves to `--amb`** | 1.2 ports Rhyme's six response tokens, all computed from `e`; a different `e` would make the ported tokens mean different things in each tool |
| 6 | substrate static in BTC, derived in Rhyme (§2b) | **derived**, and a derived token derives with its whole family | 1.2's "no fixed offsets survive" and 2.0's "no hex is authored outside a material definition" both eliminate static values |
| 7 | two solar implementations, both correct to 0.6° (§3) | **BTC's full NOAA position** is canonical; **Rhyme's derivation** of response from it is canonical | the roadmap is silent; each tool keeps its better half, and two implementations is two things to drift |
| 8 | BTC has no mineral system (§5) | minerals are **spine**: a frozen set with fixed meanings | 1.4 states "mineral set frozen with fixed meanings (L6)"; 2.0's non-goal guard defers *properties* |
| 9 | no common origin, so 1.4's sync criterion is unreachable (§5) | **conformance replaces sharing**: one set, one meaning, one behaviour, stored twice | the only departure from a stated roadmap exit in the spine, and it departs because the criterion is physically unreachable |

---

## 9. Status

This document is an inventory, not a spine — `occvm/SPINE.md` is the spine, authored from it (§11). It is committed to both repositories at identical content so the
next session starts from measured facts rather than from a baseline that was never shipped.

`occvm/tools/solar-compare.js` reproduces every number in §3 (run it as
`TZ=America/New_York node occvm/tools/solar-compare.js` — Rhyme's `solar()` reads the local clock, so its
output moves with the runner's timezone).

---

## 10. Built since this audit — the instrument, not the spine

The seven decisions in §8 are unchanged and still open. What has been built is the equipment that makes each
of them a measurable one-line edit instead of a taste argument, plus the two hygiene items §7 flagged.

**`occvm/golden/` — the golden set.** `record.js` drives both tools in Chromium under three injected pins:
the clock (a fixed instant), the timezone (`America/New_York`), and the seed (written to `sessionStorage`
before any page script evaluates). Two tiers, and the split is deliberate: `tokens.json` carries every OCCVM
token's computed value at each instant — pure numbers and hexes, byte-stable on any machine, and the only
thing CI asserts on; `<case>.png` is recorded for the eye and **never diffed for equality**, because font
rasterisation and GPU compositing differ per machine and a pixel gate would be red everywhere but the
recording machine. `verify.js` re-records and diffs tier 1. Verified to bite: perturbing `--gilt-b` by one hex
digit surfaces 12 values across three instants, including the `--model` and `--warn` aliases derived from it.
Recording twice produces byte-identical manifests — migration §4's determinism requirement, demonstrated.

Instants, over Dayton: `low` 2026-09-06T11:30Z (elev +3.06°, az 84.3°), `high` 2026-09-06T17:45Z (+56.40°,
184.5°), `night` 2026-09-07T04:00Z (−39.21°).

**The seed is now injected in both tools.** BTC's `veinLayer()` derived its seed from the wall clock, so it
was neither injectable nor stable; it now reads `sessionStorage("btc.seed")`, adopting Rhyme's existing
pattern verbatim so the spine can state one law. That also closes the divergence `Btc-terminal/CLAUDE.md`
§10.5 recorded but did not fix — the veins reseeded per hour where §5 said per session.

**BTC has CI**, mirroring Rhyme's: the harnesses, the unit suites, the duplicate-definition check
(`CLAUDE.md` §7.1) and the splice-reproducibility check (§6), plus a `--tool btc` golden diff on Chromium.
Rhyme is skipped there — it lives in a sibling repository that checkout does not have.

**Rhyme has a build stamp** (`build.js --stamp` mints; a plain build preserves, so CI's byte-identical check
stays strict), and `rhyme_instrument.jsx` is deleted.

**Two findings surfaced from building it**, both now in §2c and §3 above: BTC's `--glow` never resolves to a
number, and the two light vectors disagree completely at night. A third is new here:

**Rhyme cannot boot without three external CDN requests.** React, ReactDOM and `babel-standalone` all come
from cdnjs; with cdnjs unreachable the tool renders nothing — measured, not inferred, when the recorder's
first run captured a blank page. That is roadmap 1.6's *"first paint shows the binding, not a blank frame"*,
with a number on it. The recorder vendors those three locally, because a determinism instrument must not
depend on a CDN.

**One caveat on the instrument itself, and it cost a recording.** The first version pinned the clock with
Playwright's `clock.install()`, which also fakes timers — React 18 schedules through them, so Rhyme never
mounted and the recorder captured `:root` defaults as though they were live values, reporting 37 clean
tokens for a blank page. Fixed two ways: `setFixedTime` pins only `Date`, and readiness is now a DOM
predicate (`.binding` exists) rather than a token being non-empty, because a token can have a CSS default and
pass while the tool's own JS never ran. A recording of a tool that never booted is worse than no recording —
it looks like a clean baseline, and every later diff is measured against a blank page — so that check is now
fatal by design.

**The cross-repo seam.** `record.js` reaches the sibling `Rhyme-Instrument` clone by relative path and skips
it with a clear message when absent. With no monorepo and no shared origin, sibling clones are the available
arrangement; Rhyme's own CI therefore cannot run the golden diff.


---

## 11. OCCVM 1.0, constituted

`occvm/SPINE.md` is the law, `occvm/spine.css` its machine-readable half, `occvm/tools/splice-spine.js`
the fenced idempotent splice. All three are committed identically to both repositories; the splice targets
BTC's `index.html` and Rhyme's `tome-src/20_style.css` — the source stylesheet, never the assembled
artifact, per migration §0b#2.

**1.0 changes nothing, and that is measured rather than claimed: zero deltas across all 270 golden values
in both tools.** The spine is inlined above each tool's own CSS, so every value it declares is either
identical to the tool's or shadowed by it — migration §1's parallel-spine pattern, where an untouched tool
still renders because the names it references are still defined. Adoption is deleting the shadowing
declarations, per surface, at the release whose law covers it.

Guards, so the document and the code cannot drift apart: `test/occvm.js` asserts the block is spliced
exactly once, matches `spine.css`, sits above the tool's `:root`, declares **nothing SPINE.md §2a does not
list and everything it does**, and namespaces every primitive. Verified to bite — an undocumented token
added to `spine.css` fails it by name. Rhyme carries the equivalent in `engine-node/test/spine.test.js`,
and both CIs run `splice-spine.js --check`.

The eleven defects in SPINE.md §6 are the roadmap's D1–D7 renumbered onto the same releases, plus four
found by measurement: `--glow` unresolvable (D8), the night light vector (D9), Rhyme's `--bone` deriving
without `--bone-lo` (D10), and the primitive collisions (D11, closed at 1.0 by namespacing).
