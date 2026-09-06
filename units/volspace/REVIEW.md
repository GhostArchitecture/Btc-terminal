# Adversarial review — volspace (H5 variance premium)

Reviewer: independent agent. Evidence scripts written during this review live beside the unit as
`REVIEW-probe1.js` and `REVIEW-probe2.js` (run with `node REVIEW-probe1.js`); they are review artefacts, not part
of the deliverable.

**Verdict: the unit is mathematically sound and safe to splice.** `node test.js` runs green (91 assertions,
exit 0). I could not break the arithmetic, could not make it throw, and could not find a wrong branch, sign, or
units error. One real finding is about what the unit *claims about itself*, not about what it computes — see D1.

---

## Verified sound

**Formula and units.** `vsPOver` computes `1 - normCdf((x + 0.5*sig*sig*tau)/(sig*sqrt(tau)))`, which is exactly
`index.html:2013` (`anl = 1-normCdf((x-(0-0.5*sig*sig)*tau)/sd)`) with the double negative resolved. `tau` is in
minutes and `sig` per minute throughout — matching `calSigma` (`index.html:888`) and `strikeProbs`
(`index.html:2004`). No annualisation anywhere, no ms/minute confusion. `P.sigU` genuinely exists on the object
`strikeProbs` returns (`index.html:2037`, `sigU:sig`), so `volTriple`'s `sigModel` is not reading a phantom field.

**The monotonicity correction in NOTES is right, and it matters.** With `u = sig*sqrt(tau)` the normCdf argument is
`g(u) = x/u + u/2`, `dg/du = 1/2 - x/u^2`, minimum `g = sqrt(2x)` at `u* = sqrt(2x)`. I re-derived this
independently and confirmed numerically. The brief's stated premise (monotone with direction set by `sign(x)`)
would have produced a bisection that returns an endpoint or the wrong root for every strike above spot. Catching
this is the most valuable thing in the unit.

**Bisection cannot return garbage.** Both brackets provably straddle: `[1e-9, sigStar]` has `f<0 / f>0` (guarded by
`q < pMax`), `[sigStar, 50]` has `f>0 / f<0`, `[1e-9, 50]` for `x<=0` has `f>0 / f<0`. The `up` direction flag is
correct for both an increasing and a decreasing `f` (I traced both cases). The explicit sign-change test returns
`null` instead of an endpoint, and the `VRP_TOL` residual re-check means a returned sigma always reprices `q`.
Over 700 (strike, tau, q) combinations spanning `tau` from the codebase's floor `1/60` min to 60 min: **0
mispriced, 0 non-finite, 0 throws** (`REVIEW-probe1.js` P2).

**The `normCdf` approximation does not break the inversion.** I scanned 4,000 log-spaced sigmas × 36 (x, tau) pairs
for a non-monotone step in the approximate `p_over` inside the clip band: **zero wiggles** (P1). The
Abramowitz–Stegun approximation is monotone where it is inverted, so bisection cannot land on a spurious root. The
test's use of a separate high-accuracy `normCdfExact` to *bound* the approximation cost, rather than to define
correctness, is the right call — the unit must invert the same approximate function `strikeProbs` uses.

**The low-branch default is justified, and I could not falsify it.** NOTES claims the high root is never a
plausible volatility. I swept strikes +1 to +25 bp × tau 1–14 min × q 1–49c looking for a case where *both* roots
land in 0.3–6 bp/min: **zero cases** (`REVIEW-probe2.js` F2). For `x<0` the `branch` argument is correctly ignored
(single root, `out.branch === "single"`), so there is no silent branch choice there either.

**Test is not vacuous.** `pOver` in the harness is re-derived from the formula rather than imported from the unit,
so the round-trips are genuine inversions, not self-consistency. The guard battery, the gap-drop case with its
83x counterfactual, and the ATM/cap impossibility cases all cover real failure modes.

**Splice safety.** All 16 exported/internal names (`VRP_*`, `vs*`, `impliedSigma*`, `realizedSigma*`, `varPremium`,
`volTriple`) have **0 occurrences** in `index.html` — no `const` redeclaration, which in a classic script would be
a whole-page `SyntaxError`. File is pure ASCII, parses standalone, and parses when concatenated after an existing
`const`. 5,000+ junk-argument quadruples (`undefined`, `NaN`, `±Infinity`, strings, `{}`, `[]`, `1e308`, `1e-320`)
across all five entry points: **0 throws, 0 bad non-null returns** (P7). Cost is ~140 `normCdf` calls per solve —
irrelevant at 1 Hz.

**No fabricated constants.** Every `VRP_*` is mechanical (bracket bounds, iteration count, residual tolerance) or
copied from the engine (`VRP_Q_LO/HI` = `strikeProbs`' clip). `VRP_MIN_RET = 10` is the only judgment call, and
NOTES states its sampling error (~22% relative) against itself rather than hiding it. No invented baseline, no
invented date, no calibration.

---

## D1 — real finding (moderate): the advertised conditioning guard misses the dominant implausible class

`relPerCent` is presented in NOTES assumption 4 as *the* honesty guard: *"A caller that renders `sigImplied`
without `relPerCent` beside it will present noise as signal."* The implication — that with `relPerCent` shown it
does not — is false for the majority of readings this unit will actually produce.

`relPerCent` is scale-free. It reports how *precisely* sigma is pinned down, and says nothing about whether the
level is physical. For a strike **below** spot with a quote below ~50c, the zero-drift lognormal can only reach
that quote at enormous vol, so the inversion is arithmetically exact and economically meaningless — while
reporting a comfortable ~10%/cent:

```
strike -10bp, tau=8m, q=0.40  ->  sig = 1805 bp/min   relPerCent = 10.1%
strike -10bp, tau=8m, q=0.30  ->  sig = 3715 bp/min   relPerCent =  5.5%
strike  -3bp, tau=8m, q=0.30  ->  sig = 3710 bp/min   relPerCent =  5.5%
```

Swept over strikes −40..−1 bp × tau 1–14 min × q 5–95c: **21,840 non-null readings, of which 11,728 (54%) exceed
100 bp/min** — an order of magnitude above anything the BTC tape produces — **and only 105 of those 11,728 (0.9%)
carry `relPerCent > 50%/cent`** (`REVIEW-probe2.js` F1). The guard essentially never fires on this class.

Why this is worth fixing rather than shrugging at: the unit's headline composition is
`varPremium(volTriple(...).sigImplied, realizedSigma(...))`. A panel wired straight through would render
`vrp = 1805bp − 9bp` as a colossal variance premium on an ordinary 40c quote. That is the §7.6 failure mode
("don't present noise as opportunity") arriving through a function that is individually correct at every step.

The honest reading of these numbers is not "implied vol is 1805 bp/min" but "the market's quote is inconsistent
with a zero-drift lognormal at this strike distance at any sane vol" — i.e. it measures *model misspecification*,
which is exactly what CLAUDE.md §3 already established about this market. Nothing in the unit says so.

**Suggested fix, no invented constant required.** `volTriple` already carries `sigModel`. Add a derived field —
`ratioModel: sigImplied / sigModel` (null when either is null) — and let the caller/ledger judge. That is pure
arithmetic on values already present, sets no threshold, and makes "implied is 200x the model" impossible to miss.
Amending NOTES assumption 4 to say `relPerCent` measures precision and *not* plausibility is the minimum.

This is a design/claim defect, not an arithmetic one. The numbers the unit returns are correct.

---

## Minor observations (not blocking)

- **M1 — bad data reads as thin data.** If every close is non-numeric (e.g. a caller passes strings),
  `realizedSigmaInfo` returns `reason: "too few contiguous 1-minute returns"` with `dropped: 0` and `n: 0`. The
  invalid-entry branch only increments `dropped` when `pk !== null`, so an all-junk array leaves no trace that the
  data was junk rather than short. One extra counter (`invalid`) would separate the two.
- **M2 — `minN < 2` is silently upgraded to 10.** `need = (minN >= 2) ? floor(minN) : VRP_MIN_RET`. A caller
  passing `minN: 1` gets 10. It *is* visible in `.need`, so nothing is hidden, but NOTES says "overridable per
  call" without stating the floor.
- **M3 — `VRP_SIG_MAX = 50` caps the high branch.** Once the high root exceeds 50/min the bracket misses it and the
  reason is the generic `"no root in bracket"` rather than naming the cap. This needs `tau < ~0.005` min, below the
  codebase's own `tau` floor of `1/60`, so it is unreachable in practice (P3). Noted for completeness only.
- **M4 — `relPerCent` is a local derivative and understates the true 1-cent move where the map is convex.** Worst
  case found: strike +3bp, tau 8m, q=0.48 — reported 57%/cent, actual half-tick move 122% (F3). It is still >50%
  there, so the warning fires regardless. Behaving like a derivative is not a defect.
- **M5 — unsorted `keys` silently reduce `n`.** Out-of-window entries deliberately do not reset the `pk` chain
  (correct, and it makes the window filter clean), but an out-of-order in-window key is counted as a drop.
  `barsExcludingCurrent` emits ascending keys, so there is no live exposure.
- **M6 — splice position.** The `VRP_*` are top-level `const`, so they sit in the temporal dead zone until the
  block evaluates. `index.html` ends with an immediately-invoked `init()` (line ~2849). Splice the block *above*
  that IIFE, not below it, or any future wiring of these functions into `init` will throw a ReferenceError.

## Checked and found clean (no action)

`q` orientation (`kQuoteFor` returns the yes-mid, and yes = above `floor_strike`, matching `p_over`) · zero-mean
sum-of-squares matches `rv60` at `index.html:875` · bar keys are `Math.floor(ms/60000)` per `index.html:827` ·
`[k0,k1]` inclusive window yields `k1-k0` returns, boundary-crossing return correctly excluded · duplicate bar keys
resolve to the later close and count as a drop · flat tape → `sig = 0` → `varPremium` null (documented) · negative
(pre-epoch) bar keys work · `q` exactly at `pMax` → null, one ulp below → `sigStar`, both correct · `x === 0` with
`q >= 0.5` → null with a reason · `sig - h` in `vsSens` can never go non-positive · no DOM, storage, fetch, timer,
`Date`, or order-placing code anywhere in the block.
