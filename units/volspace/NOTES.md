# volspace — H5 variance-premium measurement

Pure functions only: no DOM, no storage, no fetch, no timers, no clock. Nothing here places an order.
`code.js` splices verbatim; `node test.js` runs green (241 assertions, exit 0).

## The correction you need to read first

**The brief's premise that `p_over` is monotone in sigma with a direction set by `sign(x)` is wrong for `x > 0`,
and building the bisection on it would have returned silent garbage for every strike above spot.**

With `u = sig*sqrt(tau)`, the normCdf argument is `g(u) = x/u + u/2`, so `dg/du = 1/2 - x/u^2`:

| case | shape | roots |
|---|---|---|
| `x < 0` | `g` rises for all `u>0`; `p_over` falls monotonically from 1 to 0 | exactly one, any `q` in (0,1) |
| `x = 0` | `g = u/2`; `p_over` falls from 0.5 (**approached, never attained**) to 0 | one for `q < 0.5`; **none for `q >= 0.5`** |
| `x > 0` | `g` is U-shaped, min `sqrt(2x)` at `u* = sqrt(2x)`; `p_over` rises to a cap then falls | **two** for `q < pMax`, **none** for `q >= pMax` |

`pMax = 1 - normCdf(sqrt(2x)) < 0.5` for every `x > 0`. This is the standard digital-call vega sign flip: under the
martingale drift `-0.5*sig^2*tau` the probability of finishing above a strike above spot can never reach 1/2, no
matter the volatility. Verified numerically in the test (`x>0: p_over is NON-monotone`).

**Practical consequence, and it bites:** KXBTC15M strikes are set at the money at open, so `x` is tiny and `pMax`
sits just barely under 0.50. For a strike 5bp above spot, `pMax = 0.4874` — so a perfectly ordinary market quote of
49c on that strike has **no implied sigma at all**. `impliedSigma` returns `null` and `impliedSigmaInfo().reason`
says why. It does not clamp, does not fall back, does not invent a number.

## Correction 2026-09-06 — the identifiability gate was measuring the wrong quantity

**This supersedes what assumptions 4b/4c used to say. Read it before either.**

`sigmaIdentifiability()` gated on `relPerCent`, which comes from `vsSens` — the **local derivative** of implied
sigma with respect to the quote — against `VRP_REL_MAX = 0.5`. Two things were wrong with that, and only the
second is arithmetic:

1. **Kalshi quotes in whole cents.** One cent is not an infinitesimal to be differentiated through, it is the
   *resolution of the instrument*: the smallest observable change in the input. A derivative is a quantity this
   market never exhibits, so comparing it against a bound was a category error before any number was chosen.
2. **The quote → sigma map is convex near the money, so the derivative badly understates a real tick.** Measured
   on a 15-minute window at sigma 9 bp/min, quoting each strike at its own model-fair value and then moving the
   quote by exactly one cent:

| distance | `xs` | `relPerCent` (old gate) | true one-cent move in implied sigma |
|---|---|---|---|
| 0 bp | 0.000 | 14.382 | **+1c has no root at all** |
| 1 bp | 0.029 | 0.931 | **+1c has no root at all** |
| 2 bp | 0.057 | 0.451 **← passed 0.5** | **86.4%** ← noise, admitted |
| 5 bp | 0.143 | 0.179 | 21.8% |
| 10 bp | 0.287 | 0.092 | 10.1% |
| 20 bp | 0.574 | 0.052 | 5.4% |
| 35 bp | 1.004 | 0.041 | 4.2% |
| 60 bp | 1.721 | 0.064 | 6.7% (6.3% up-side) |
| 120 bp | 3.443 | 2.745 ← rejected | fair value 0.0003, below the clip floor |

The old gate admitted a reading whose implied sigma moves **86% on a single tick of quote**. That is the
CLAUDE.md §7.6 failure mode arriving through the *tolerance* rather than the arithmetic: every step correct, the
output dominated by quote granularity, and nothing in the record saying so.

### Part 1 — measure the true tick (`vsTickSens`, `impliedSigmaTick`)

Invert at `q`, at `q + VRP_TICK` and at `q - VRP_TICK`; report the **largest** fractional change in implied sigma
across that real tick. No derivative anywhere in the verdict. `VRP_TICK = 0.01` is a named constant and the only
place a cent appears; `vsSens` was rewritten to use it too, so there is no literal left in the file.

**A neighbour that does not invert is NOT zero sensitivity.** This is the case that decides the design. Near the
analytic cap for a strike above spot (`pMax < 0.5`) the `+1c` neighbour frequently has no root; exactly at the
money `q + 1c` crosses 0.5, which no sigma reaches; in the tail a neighbour falls past the engine's clip bound.
In every such case one tick does not merely move the reading, **it moves it out of existence** — the honest
sensitivity is unbounded, and treating a missing neighbour as a zero (or skipping it) would have been the same
defect in a new place.

**One-sided policy, and why.** When only one neighbour inverts:

- the surviving one-sided move **is** computed and returned (`rel`, with `sided: "up" | "down"`), because hiding
  it hides the magnitude — at the money it reads 1438%, which is itself the finding;
- but one-sided **can never pass**. `identified` requires `sided === "two"`.

The alternative — letting a one-sided move pass when it is small — fails on a case that actually occurs. At
`xs = ±2.5` (tau 8, sigma 9 bp/min) the surviving one-sided move is **16.9%, inside the 0.20 bound**, while one
tick in the *other* direction takes the reading out of existence entirely. Passing that would be reporting the
small half of an asymmetric move and calling the reading clean: the old defect wearing a new hat. The test asserts
both signs of this case.

### Part 2 — the bound is re-registered at 0.20, and it is derived

**`VRP_TICK_REL_MAX = 0.20`.** Implied sigma exists in this unit only to be differenced against **realized**
sigma. Realized sigma from `n` contiguous one-minute returns carries relative sampling error `~1/sqrt(2n)`:

| n | 10 | 14 | 15 | 30 | 60 |
|---|---|---|---|---|---|
| `1/sqrt(2n)` | 22.4% | 18.9% | **18.3%** | 12.9% | 9.1% |

A 15-minute window yields at most 15 one-minute returns, so the realized number carries ~18–19% inherent error no
matter how clean the tape is (assumption 9 says the same thing about `VRP_MIN_RET`). **If one tick of quote moves
the implied reading by more than the error already carried by the realized number it is differenced against, then
quote granularity dominates the premium and the comparison cannot resolve anything.** 0.20 is the round bound
immediately above both the 15-return and 14-return figures and below the n=30 figure. It is not a preference:
change the window length and the arithmetic changes it. The test asserts all three inequalities, so the number
cannot drift away from its derivation silently.

**This is a RE-REGISTRATION, not an edit, and the direction matters.** The old value stays visible in `code.js`
beside its replacement with the date and the reason. It is a **strict tightening**: 0.5 applied to a derivative
that understated the true move → 0.20 applied to the true move itself. CLAUDE.md §11.7 clause 6 permits raising a
threshold at any time and **closes the programme if one is ever lowered**, which is why the direction is stated
rather than left to be inferred. A test asserts the tightening mechanically: over ±400 bp of strike distance,
**no** reading is admitted by the new gate that the old gate rejected, and at least one is rejected that the old
gate admitted.

**Why this is free, and the one reason it is free.** No VRP data has been collected under the old bound and no
holdout is open, so this corrects a **mis-specified instrument before its first observation** rather than tuning a
threshold against a result. Recorded explicitly so the precedent is not misread: had a holdout been open,
CLAUDE.md §11.6 says this same change would have **spent** it — every window scored under the old freeze retired,
the count restarted at zero. Being early is the only thing that makes it cheap.

### The band that survives, on a 15-minute window at sigma 9 bp/min

Strike distance **|d| ≈ 5.4 bp to 75.6 bp** — precisely +5.37…+75.58 bp above spot and −5.22…−75.70 bp below,
i.e. `|xs|` from **0.154 to 2.17**. It is a single contiguous interval on each side (asserted: no holes, no second
island). Under the old gate the inner edge sat at roughly 2 bp.

- The **inner** edge is the near-money convexity: the reading is unidentified because sigma barely enters an ATM
  binary at all (see 4b).
- The **outer** edge is where the `−1c` probe reaches the engine's clip floor (`q ≈ 0.015`, so `q − 1c ≈ 0.005`).
  That is not an artefact of `VRP_Q_LO`: solving the neighbours *without* the clip guard moves the outer edge by
  under 2 bp (75.6 → ~77.5), because the true tick move is crossing 20% right there anyway. Sensitivity closes the
  band, not the clip constant.

**KXBTC15M strikes are set at the money at open, so a 15-minute window opens well inside the dead zone** and only
becomes measurable once price has moved ≳5 bp off the strike — twice as far as the old gate demanded.

### The split, made explicit in the API

| | question | needs a quote? | use it for |
|---|---|---|---|
| `sigmaIdentifiability(x, sigModel, tau)` | *could* sigma be recovered at this strike distance at all? | no — probes the model's own fair value as a stand-in quote (returned as `qFair`) | choosing strikes, greying out a rung, explaining a blank, before any quote exists |
| `impliedSigmaTick(strike, S0, tau, q)` | does **this** reading, at the price the market is actually showing, survive one tick? | yes | **deciding whether a reading is stored.** This one, never the prior |

The prior is an approximation of the decider evaluated at `q = model-fair`. When the market disagrees with the
model — which is the entire point of measuring a variance premium — the two differ, and **the decider wins**. The
test asserts a live disagreement: a 30 bp strike at tau 8 is identified by the prior, and rejected by the decider
at a 99c market quote because `+1c` would be clipped. To make it impossible to reach for the prior by mistake,
`impliedSigmaInfo` and `volTriple` now carry the decider's verdict (`identified`, `tickRel`, `tickRelUp`,
`tickRelDown`, `tickSided`, `tickReason`, `bound`) on every reading. `identified` is `false` in every null case —
never undefined, never true.

**Identification is still not plausibility.** The two guards remain separate and neither substitutes for the
other: an ATM strike at a 30c market quote is *tick-identified* (both neighbours invert, 5.5% move) and still
returns an implied sigma ~412× the model's (`ratioModel`, assumption 4). Asserted in the test.

## Functions

- `impliedSigma(strike, S0, tau, q, branch)` -> per-minute sigma or `null`. `branch` is optional, `"low"` (default)
  or `"high"`, and only means anything for `x > 0`.
- `impliedSigmaInfo(...)` -> **always** an object
  `{sig, x, pMax, sigStar, branch, relPerCent, identified, tickRel, tickRelUp, tickRelDown, tickSided, tickReason,
  tick, bound, reason}`. Added so a caller can display *why* there is no reading rather than a blank, and (since
  the 2026-09-06 correction) so the identifiability verdict travels with every reading. `impliedSigma` is a
  one-line wrapper on it.
- `impliedSigmaTick(strike, S0, tau, q, branch)` -> `{identified, rel, relUp, relDown, sig, sigUp, sigDown, sided,
  x, tick, bound, reason}`. **The decider**: the true one-tick sensitivity of a reading that has a quote. Gate a
  stored reading on this, not on the prior.
- `realizedSigma(keys, closes, t0, t1, minN)` -> per-minute sigma or `null`.
- `realizedSigmaInfo(...)` -> `{sig, n, dropped, invalid, k0, k1, need, reason}`. `n` matters enormously here (see
  below), so the caller needs access to it; `invalid` separates bad data from thin data (assumption 10).
- `varPremium(sigImplied, sigRealized)` -> `{vrp, ratio}` or `null`.
- `volTriple(P, quote, strike, S0, tau)` -> `{sigModel, sigImplied, x, xs, ratioModel, identified, tickRel,
  tickSided, tickReason, bound}`, every field independently null-safe. `ratioModel = sigImplied / sigModel` (null when either is null) is the **plausibility** diagnostic --
  see assumption 4.
- `sigmaIdentifiability(x, sigModel, tau)` -> `{identified, xs, relPerCent, tickRel, tickRelUp, tickRelDown,
  tickSided, tickReason, qFair, tick, bound, prior, reason}`. **The prior**, needs no quote: it answers whether a
  quote at this strike distance could have identified sigma at all, probing the model's own fair value (`qFair`).
  See assumption 4b and the correction section.
- Internal: `vsPOver`, `vsBisect`, `vsSolveInfo` (the shared inversion, so a neighbour quote is solved by exactly
  the same code path and guards as the quote itself), `vsTickSens` (the true tick probe), `vsSens` (the legacy
  derivative, diagnostic only). Constants `VRP_*`. No name collides with anything in `index.html` (checked by grep
  over the whole file, including the new `VRP_TICK`, `VRP_TICK_REL_MAX`, `vsSolveInfo`, `vsTickSens`,
  `impliedSigmaTick`).

## Decisions and assumptions

1. **Branch default is the low-vol root** for `x > 0`. Both roots reprice the quote exactly; they are not
   interchangeable. The low root is the one that lives at realized-vol scale: BTC per-minute sigma runs ~5–15bp,
   while `sig* = sqrt(2x/tau)` for a 5bp strike distance at tau=10 is ~100bp/min, an order of magnitude above
   anything the tape produces. The high root is a real solution of the model but not a plausible volatility.
   The test asserts both roots exist, differ, and reprice the same `q`.
2. **`q` at or beyond the clip bounds (`<=0.005`, `>=0.995`) returns null.** Those are the engine's clip values —
   a quote sitting on them has been clamped and carries no volatility information. Inverting a clamp produces a
   fabricated sigma.
3. **Residual check before returning.** Every non-null sigma is fed back through `vsPOver` and must reproduce `q`
   to within `2e-6`, else `null`. Bisection with a bracket that does not straddle the root returns `null` rather
   than an endpoint — the classic silent-garbage path.
4. **`relPerCent` measures PRECISION, not PLAUSIBILITY — correcting what this file used to claim.** The earlier
   text here said *"a caller that renders `sigImplied` without `relPerCent` beside it will present noise as
   signal"*, with the implication that showing `relPerCent` is sufficient. **That was wrong, and it was wrong for
   the majority of readings this unit will actually produce.** `relPerCent` is the fractional move in implied sigma
   caused by a one-cent move in `q` at the solution (Kalshi quotes in 1c ticks, so it is the resolution limit of
   the reading). It is scale-free: it says how tightly the inversion pinned sigma down and **nothing at all** about
   whether the level is physical.

   The class it misses: a strike **below** spot quoted under ~50c. The zero-drift lognormal can reach such a quote
   only at enormous volatility, so the inversion is arithmetically exact and economically meaningless while
   reporting a perfectly comfortable conditioning number.

   | strike | tau | q | implied sigma | `relPerCent` | `ratioModel` vs a 9bp tape |
   |---|---|---|---|---|---|
   | -10bp | 8m | 0.40 | 1805 bp/min | 10.1%/cent | **200x** |
   | -10bp | 8m | 0.30 | 3715 bp/min | 5.5%/cent | **413x** |
   | -3bp | 8m | 0.30 | 3710 bp/min | 5.5%/cent | **412x** |

   Swept over strikes -40..-1bp x tau 1-14m x q 5-95c, 54% of non-null readings exceed 100 bp/min against a tape
   that produces about 9, and only 0.9% of those carry `relPerCent > 50%/cent`. The precision guard essentially
   never fires on this class. A panel wiring `varPremium(volTriple(...).sigImplied, realizedSigma(...))` straight
   through would render `1805bp - 9bp` as a colossal variance premium on an ordinary 40c quote — every step
   individually correct, the output pure noise presented as opportunity, which is exactly the CLAUDE.md §7.6
   failure mode.

   **Fix: `volTriple` now returns `ratioModel = sigImplied / sigModel`** (null when either is null). Pure arithmetic
   on two fields already present, no threshold invented. "Implied is 200x the model's own volatility" is then
   impossible to miss. The honest reading of such a row is not "implied vol is 1805 bp/min" but "the market's quote
   is inconsistent with a zero-drift lognormal at this strike distance at any sane vol" — it measures **model
   misspecification**, which is what CLAUDE.md §3 already established about this market.

   **Both numbers are needed and neither substitutes for the other.** `relPerCent` catches unidentified-but-sane;
   `ratioModel` catches exact-but-absurd. The test asserts a case where they disagree.

4b. **`sigmaIdentifiability(x, sigModel, tau)` — the prior question, asked before any inversion.** `relPerCent`
   and `ratioModel` are both computed *after* a sigma comes back. This one needs no quote from the caller and
   answers whether a quote at this strike distance could have carried volatility information in the first place.
   `xs = x / (sigModel*sqrt(tau))` — the strike distance in **model-sigma units** — is the coordinate that decides
   recoverability:

   with `u = sig*sqrt(tau)`, `d p_over/d sig * sig = -phi(xs + u/2)*(u/2 - xs)`, and since `u` is ~1e-3 this is
   `~= phi(xs)*xs`, so `relPerCent ~= VRP_TICK/(phi(xs)*|xs|)`. At the money `xs -> 0`, that denominator goes to
   zero, and the inverse map is unbounded: **sigma enters an ATM binary only through the second-order
   `-0.5*sig^2*tau` term.** An ATM binary prices near 50c almost regardless of volatility, which is precisely why
   it carries almost no volatility information. `phi` also decays, so the identified region is a **band** in
   `|xs|`, not a half-line — the far tail fails too.

   **That closed form explains the SHAPE of the band. Since 2026-09-06 it no longer sets the verdict** (see the
   correction section): `identified` is decided by the **true one-tick move** at the model-fair quote, because the
   derivative understates a real tick wherever the map is convex — which is exactly the near-money region the band
   edge sits in. `relPerCent` and `qFair` are both still returned so the two can be compared and the probe point
   is never hidden.

   **KXBTC15M strikes are set at the money at open, so the 15-minute series is born unidentified** and becomes
   identifiable only once price has moved ~5 bp off the strike (twice the old gate's ~2 bp). The hourly KXBTCD
   ladder has rungs away from spot that are identified immediately. **This is where a variance premium is
   measurable: on the wings, not at the money.** Computing a vrp column indiscriminately is the §7.6 failure mode.

   The band edges move with `tau`, which is why no `xs` cut point is hardcoded: 8 bp below spot is identified at
   `tau = 30` and not at `tau = 60`. The test asserts that flip.

4c. **`VRP_TICK_REL_MAX = 0.20` is PRE-REGISTERED and may be raised, never lowered.** It replaces
   `VRP_REL_MAX = 0.5` as of 2026-09-06; the full re-registration — what was wrong, the derivation of 0.20 from
   `1/sqrt(2n)`, the direction argument under CLAUDE.md §11.7 clause 6, and the note that this would have spent a
   holdout had one been open — is in the correction section above and repeated verbatim at the constant in
   `code.js`. `VRP_REL_MAX` is retained in the file so the superseded bound stays visible beside its replacement,
   and it **gates nothing**; do not reintroduce it as a gate.

   These two are the **only** thresholds in this unit, and only one of them decides anything. A caller that
   disagrees can ignore `identified` entirely and rule on `xs`, `tickRel` and `relPerCent`, all of which are
   returned; the pre-registered rule for what enters the ledger lives elsewhere, not here.

4d. **Omit, never clamp; and keep the omissions countable.** Every one of these guards returns `null`/`false` with
   a `reason` string rather than a substituted number, and every diagnostic that decided so is returned alongside.
   A caller filtering on `identified` must record how many readings it dropped, so the selection is visible in the
   panel rather than silent — this unit gives it the counters (`reason`, `relPerCent`, `xs`, `ratioModel`,
   `.n`/`.dropped`/`.invalid`) but cannot enforce that.
5. **`vrp = implied - realized` in sigma units**, per the brief. Note that "variance premium" in the literature is
   usually in *variance* units: `sigImplied*sigImplied - sigRealized*sigRealized`. Both are computable from the
   returned fields; I did not add a second field to avoid guessing which the panel wants.
6. **`varPremium` returns null when `sigRealized <= 0`** because `ratio` is undefined there, even though `vrp`
   alone would be computable. A flat tape (all identical closes) yields exactly 0 realized sigma and hits this.
7. **`realizedSigma` uses zero-mean sum-of-squares**, matching `computeStats`' `rv60` exactly, not a sample stdev.
   This keeps implied-vs-realized comparable to the `rv60` that feeds `calSigma`.
8. **Contiguity rule reused verbatim from the codebase:** a return counts only when consecutive bar keys differ by
   exactly 1. Bar keys are `Math.floor(ms/60000)`. Window selection is `k0 = floor(t0/60000)` to
   `k1 = floor(t1/60000)` inclusive. A sleep/background gap is dropped and counted in `.dropped`. The test proves
   this matters: a single 5% gap jump would inflate sigma **83x** if scored as a one-minute return.
9. **Minimum sample defaults to 10 contiguous returns** (`VRP_MIN_RET`), overridable per call **but floored at 2**:
   `minN` is honoured only when it is a finite number `>= 2` (and is then floored to an integer); anything else,
   including `0` and `1`, silently becomes `VRP_MIN_RET = 10`. It is not hidden — the effective value is always
   returned as `.need` — but a caller passing `minN: 1` gets 10, and the earlier "overridable per call" wording
   did not say so.

   The default itself is a low bar and I want it on the record: RV's relative sampling error is roughly `1/sqrt(2n)`, so **n=10 is ~22% relative error
   and a full 15-minute window (14 returns max) is still ~19%**. A single-window VRP reading is therefore mostly
   noise; only pooling many windows makes the premium measurable. That is a property of the estimator, not a bug —
   but the panel should show `n`, and should not let a user read one window's `vrp` as a signal.
10. **A non-positive or non-finite close breaks the return chain** rather than producing NaN or Infinity from
    `log`, and the two counters mean different things: **`invalid` counts unusable entries, `dropped` counts broken
    returns.** Previously an all-junk array (a caller passing strings, say) came back as
    `reason: "too few contiguous 1-minute returns"` with `dropped: 0, n: 0` — indistinguishable from a legitimately
    short window, because the invalid branch only incremented `dropped` when it actually broke a chain. Now
    `invalid` counts every unusable entry, and when *every* entry is unusable the reason says so directly:
    `"no valid closes (every entry invalid)"`. Partial junk keeps the sample-size reason but the count is visible
    in `.invalid`.

## Numerical notes

- Bisection: 140 iterations over a per-minute sigma bracket `[1e-9, 50]`, matching `invNorm`'s fixed-iteration
  style. Round-trip recovery is exact to **5e-14 relative** (both signs of `x`, taus 0.5–60min, sigmas 2e-5–6e-3).
- The page's `normCdf` is the 5-term Abramowitz–Stegun approximation (~7.5e-8 absolute). Generating `q` from a
  high-accuracy erfc and inverting with the page's approximation costs at most **0.001% relative** on the tested
  grid. The unit inherits the page's approximation deliberately — it must invert the *same* function `strikeProbs`
  uses, or implied and model sigma would not be comparable.
- Below roughly `sig = 3e-5` (tau=10) the far tail underflows and `p_over` is **exactly 1.0** in floating point,
  so sigma is unrecoverable there. The `q < 0.995` guard excludes that region entirely, so the flat spot is never
  bisected on. Asserted in the test.
- `p_over` is only *weakly* decreasing in sigma for `x<0` across the full float range (because of that saturation);
  it is *strictly* decreasing everywhere inside the clip band, which is the only region ever inverted.

## Minor observations recorded, not fixed

Each is real, each is bounded, and none of them can move a number in a live reading. Recorded so the next pass
finds them already triaged rather than rediscovering them.

- **`VRP_SIG_MAX = 50` caps the high branch.** Once the `x>0` high root exceeds 50/min the bracket misses it and
  `reason` is the generic `"no root in bracket"` rather than naming the cap. Reaching it needs `tau < ~0.005`
  minutes, well below the codebase's own `tau` floor of `1/60`, so it is unreachable in practice. Left generic
  rather than adding a reason string for a state that cannot occur.
- ~~**`relPerCent` is a local derivative and understates the true one-tick move where the map is convex.**~~
  **RESOLVED 2026-09-06, and it was not minor.** This observation was recorded here as harmless on the grounds
  that "the identifiability verdict does not change". That was checked on one case (+3bp, tau 8, q=0.48) and was
  false in general: at 2bp on a 15-minute window the derivative reads 0.451 and **passes** the old 0.5 bound while
  the true one-cent move is 86.4%. Triaging a finding as cosmetic on a single supporting example is the mistake
  worth remembering here. The verdict now runs on the true tick (`vsTickSens`); `relPerCent` survives as a
  diagnostic only. See the correction section.
- **Unsorted `keys` silently reduce `n`.** Out-of-window entries deliberately do not reset the `pk` chain (correct,
  and it keeps the window filter clean), but an out-of-order *in-window* key is counted as a drop rather than
  reordered. `barsExcludingCurrent` emits ascending keys, so there is no live exposure; the alternative is sorting
  the caller's data behind its back, which would hide a real upstream fault.
- **Splice position.** The `VRP_*` are top-level `const`, so they sit in the temporal dead zone until the block
  evaluates. `index.html` ends with an immediately-invoked `init()`. **Splice this block above that IIFE**, or any
  future wiring of these functions into `init` throws a ReferenceError.

## Deliberately NOT done

- **No signal, no trading arm, no ledger, no "sell vol here" verdict.** Per the brief this unit is pure
  measurement. Whether a variance premium exists at these horizons is a question for the ledger after data
  accumulates, not for a constant in this file. **`VRP_TICK_REL_MAX = 0.20` is the single gating threshold in the
  file** and it gates only `identified` (on the prior, on `impliedSigmaInfo` and on `impliedSigmaTick`) — never a
  value, never a verdict, never an omission the caller cannot see (assumption 4c, 4d). Nothing else here is gated
  on anything: `impliedSigma`, `impliedSigmaInfo` and `volTriple` still return the reading with its diagnostics
  attached even when it is unidentified, so the caller's omission count stays recoverable.
- **No fabricated constants.** There is no seasonal/term adjustment applied to implied sigma, no historical VRP
  baseline, no calibration. The repo's calibration spine is not present (per CLAUDE.md §10.1), so any baseline I
  wrote down would be invented. `SWING_BASE` has an equivalent for swing; VRP has none, and I did not manufacture one.
- **No `identified` gate inside `volTriple` or `impliedSigma`.** Since 2026-09-06 they *carry* the verdict
  (`volTriple.identified`, `impliedSigmaInfo.identified`) but they still **return** the reading with its
  diagnostics attached rather than suppressing it; deciding what to omit is the caller's pre-registered rule, and
  hiding rows here would make the omission count unrecoverable (assumption 4d). Attaching the verdict and enforcing
  it are different things, and only the first belongs in this unit.
- **No variance-unit VRP field** (see assumption 5) — one line for the caller, and I would be guessing at the panel.
- **No wiring:** no call site, no `S.*` key, no render, no CSV column. State is threaded in as arguments, per brief.
- **No change to `strikeProbs`.** `volTriple` reads `P.sigU` off the object it already returns.
- **Untested by me and untestable here:** whether Kalshi's `yes_bid/yes_ask` midpoint is the right `q` to invert
  (spread handling is the caller's call — I take `quote.q` as given, the same field `strikeProbs`' residual term
  uses), and whether KXBTC15M settles on a one-minute average (CLAUDE.md §10.6 flags this as unconfirmed; if it is
  an average rather than a point, implied sigma from a point-settlement model is biased low near expiry).
