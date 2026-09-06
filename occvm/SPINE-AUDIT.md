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
| Rhyme at `build-20260906210925` | The deployed artifact carries **no build stamp of any kind**. `build-` matches zero times in 121,439 bytes. |
| A spine inlined by both tools at 1.0 | `OCCVM` appears in **zero tracked files** across both repositories. The single `git grep` hit is the substring inside the hostname `relay.ghostarchitectureoccvm.workers.dev`. |
| Laws L1–L9, defects D1–D7, the §7 conformance table | Not in either repository. Not attached. Unrecoverable — they existed only in conversation. |

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

`--glow` is the finding. Two tools, one token name, no shared range, no shared derivation. This is precisely
the failure the 2.0 migration process §9 names as the thing it exists to prevent — *"six months later the two
disagree about what `--sub` means"* — and it is already present, today, on a token both tools declare.

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

**The light direction agrees to better than 0.6° all year.** Nothing downstream of it does:

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

- **The golden set has no instrument.** Migration §3.3, §5 and §8 require field-recorded frames at three sun
  elevations, diffed. BTC's harnesses are jsdom, which does not render. Rhyme's CI runs engine tests only.
  Neither repository has a screenshot fixture, a headless renderer, or an injectable seed. Migration §4 is
  right that determinism is *"a 1.1 requirement, not a 2.0 one"* — and the harness that makes it testable is
  not a release anywhere in the roadmap.
- **BTC has no CI.** No `.github` directory. Its entire push safety is a hand-run `npm test` and a
  hand-edited build stamp. Rhyme has drift-checking CI. During a migration that touches both tools in
  sequence, the tool with more surfaces has less protection.
- **2.0 Stage 2 puts a correctness invariant in the blast radius.** Migration §2 notes BTC has *"a chart
  canvas that does not take CSS at all."* It understates. Canvas colours come from `PAL`
  (`index.html:2561`), and `renderSweep`'s colour semantics are load-bearing on correctness —
  `CLAUDE.md` §5: *"Colour keys to the call, not the strike … Getting this backwards is the most dangerous
  possible bug in this tool."* Two fixed defects (G1, R2b) were exactly that inversion. A resolver rewriting
  colour derivation must gate on `test/sweep.js` explicitly.
- **One stale file.** `Rhyme-Instrument/rhyme_instrument.jsx` — 852 lines, v1.2, last touched 2026-09-03,
  contains no `veinSVG`, is the source of nothing shipped, and sits at the repository root with the most
  source-looking name in the tree. This is the *"project-directory copy is assumed stale"* hazard of
  migration §3.1, in the repository, now.

---

## 8. What the spine has to decide

Not proposals — the decisions this audit surfaces that cannot be deferred, each with the fact that forces it.

1. **Primitive namespacing.** `.row`, `.wrap`, `.note` collide with incompatible meanings (§4). Namespace the
   spine's primitives or rename in the tools, before any spine CSS is written.
2. **Law identifiers.** `L1`/`L2` are taken by BTC defect IDs (§0). Pick a distinct prefix.
3. **`--glow`'s range and derivation.** Two non-overlapping ranges under one name (§2c). One wins, or the
   token splits.
4. **`--night`: step or ramp.** Binary in BTC, an 8° ramp in Rhyme (§3). Every `calc()` that reads it depends
   on the answer.
5. **`--elev`: scale and night floor.** ×1.4 with a 0.15 floor, or ×1.25 falling to zero (§3).
6. **Static or dynamic substrate.** `--sub`, `--sub-hi`, `--sub-lo`, `--bone` are constants in BTC and
   functions of twilight in Rhyme (§2b) — and Rhyme drifts `--bone` without `--bone-lo`.
7. **Which solar implementation is canonical.** Both are correct to 0.6°; keeping two is two things to
   maintain and two things to diverge (§3).
8. **Whether the mineral system is spine or product.** BTC has none (§5). If it is spine, 1.4 is a port; if it
   is product, D6 is not a defect.
9. **What replaces 1.4's sync criterion**, given no common origin (§5).

---

## 9. Status

This document is an inventory, not a spine. It is committed to both repositories at identical content so the
next session starts from measured facts rather than from a baseline that was never shipped.

`occvm/tools/solar-compare.js` reproduces every number in §3.
