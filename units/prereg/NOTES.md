# unit: prereg

## What this is

**`prereg.md` is the deliverable.** It is CLAUDE.md §11 — the pre-registered evidence standard for
shock-conditioned work, written before any shock observation exists. Splice it into `/home/user/Btc-terminal/CLAUDE.md`
after §10.6 (the current end of the file). Nothing else in CLAUDE.md needs to change; §11 adds a standard, it does
not amend `VERDICT_RULE`.

`code.js` and `test.js` exist to stop the document rotting. The unit brief called this a prose unit, and it is —
but a pre-registration that lives only in prose can be edited by one careless `sed` and nobody notices. So:

- `code.js` is the machine-readable copy of every threshold in §11 (`SHOCK_RULE` plus ten pure decision functions).
  It is spliceable into `index.html` as-is, ES2019, pure ASCII, no DOM/storage/network/clock, and it redefines none
  of the existing page helpers. It does use `invNorm`, which the page already defines.
- `test.js` asserts the functions behave **and** that every number in `SHOCK_RULE` is literally present in
  `prereg.md`. Change one without the other and the suite goes red. Runs green with `node test.js` (81 assertions,
  exit 0). It reads `code.js` and `prereg.md` from its own directory; if the orchestrator moves the prose into
  CLAUDE.md, repoint the `DOC` path at CLAUDE.md and the check keeps working.

Mutation-checked, so the guard is not vacuous: loosening `dBrierFloor` to 0.008 in the code fails 14 assertions;
rewording "24 months" in the doc fails 2; capping the multiplicity correction at k=10 fails 5.

## Every number, and where it came from

Verified against the working copy, not from memory:

| number | source |
|---|---|
| `SEAS` 1.007 / 1.298 / 1.934 at 12 / 13 / 14 UTC, trough 0.804 at 07 | `index.html` line 880 |
| 2.41× daily swing in the table, 1.55× in σ | 1.934/0.804 = 2.4055; `calSigma` takes `sqrt` of the ratio (line 890) |
| 1.29× / 1.14× DST ratio | 1.298/1.007 = 1.2890, sqrt = 1.1353 |
| Brier 0.1457 / 0.1473, gap 0.0016, refit gain 0.0007 | CLAUDE.md §3 |
| `VERDICT_RULE` 200 windows, 0.90 CI, n≥30 band, 100 P&L entries | `index.html` line 1861 |
| 96 windows/day, 35,040/year | 24×4, ×365 |
| months table (3.6 / 7.2 / 12.0 / 24.0 at 100 per year) | 12·n/rate, computed |
| z = 1.645 / 2.576 / 2.807 at k = 1 / 10 / 20 | `invNorm(1 − 0.05/k)`, computed |
| required-n table 32/71/197 and 54/120/333 | `(z·sd/0.010)²`, computed |
| B = 200 / 2,000 / 4,000 | `20/(1 − level)`, computed |

Two corrections I made to figures handed to me in the brief, because stating them as given would have been wrong:

1. **"At a 90% CI roughly two of twenty clear by chance alone."** True for a two-sided CI excluding zero in either
   direction (10% → 2 of 20). But `VERDICT_RULE` also requires the point estimate to be positive, which is a
   one-sided 5% test — **one** of twenty in the direction anyone would act on. §11.4 states both numbers and then
   says one per twenty per phase is still too many. Repeating "two" flatly would have been a fabricated number in a
   document whose whole subject is not fabricating numbers.
2. **"Shock windows sit on the rising edge of the seasonal curve"** — correct, but the natural next sentence
   ("so `SEAS` handles it") is false. §10.2 already records that `calSigma` uses `sqrt(SEAS[endHour]/SEAS[nowHour])`,
   which is **exactly 1** for a 15-minute window that does not cross an hour boundary — i.e. for essentially every
   shock window. The seasonal level reaches the model only through `rv60`, a 60-minute trailing estimate that lags
   a step change by up to an hour: precisely the hour a release lands in. §11.3 says this explicitly and concludes
   that the control set, not the model, is what removes the ramp. This is the substantive reason the section exists.

## Assumptions, stated as assumptions

- **~100 / ~150 releases per year is a planning premise, not a measurement.** The brief supplied it; the calendar is
  not in the repo. §11.1 says so in the document and requires Phase 1 to commit the calendar with its source and
  retrieval date, replacing both figures — in either direction — before any window is scored. I did not invent a
  release count, a release list, or a date.
- **08:30 ET → 12:30 UTC under EDT, 13:30 under EST; FOMC 14:00 ET → 18:00/19:00 UTC.** UTC−4 / UTC−5 arithmetic on
  well-established release times. I named the release *classes* (CPI, PPI, payrolls, retail sales, weekly claims)
  and deliberately gave no specific dates for any of them.
- **`sd` of the paired per-window Brier difference is unknown and unknowable before data.** This is the crux of
  §11.2a. I did not guess it. `shockRequiredHoldN(null, …)` returns `null`, and `shockStatus` returns `INVALID`
  with "sd not measured on the calibration half" rather than substituting a default. The three sd values in the
  doc's table (0.02 / 0.03 / 0.05) are labelled as a range to plan against, not as an estimate of the truth.
- **The 0.010 effect floor is a judgement, and the document shows its working** — 6× the model-vs-market gap and
  14× the free-refit gain, both from §3. It is deliberately above anything this instrument has ever measured, and
  §11.2 admits outright that an effect smaller than 0.010 is unresolvable at any sample size this programme will
  reach.
- **The multiplicity rule generalises the existing one rather than replacing it.** `1 − 0.10/k` at k=1 is exactly
  0.90, so `VERDICT_RULE`'s level is the one-hypothesis case. The test asserts this against the literal
  `VERDICT_RULE` object. That was a deliberate design choice: a new bar that contradicted the old one would have
  invited a re-litigation of the old one.
- **`k` counts arms scored in the phase, primary or not.** The alternative (k = 1 because the primary was
  pre-registered) is defensible in principle and I rejected it: the primary is chosen from a family the author
  already has intuitions about, and n≈30 makes the bootstrap unstable. Counting all arms makes the cost of the
  10→20 expansion explicit, which is the point of §11.4.

## Edge cases handled in code.js

- `shockBootstrapB(0.90)` returns 200, not 201. `1 − 0.90` is `0.09999999999999998` in binary float and the naive
  `ceil` bills an extra resample. Caught by the test, fixed with a `−1e-9` epsilon and a comment saying why.
- `shockRequiredHoldN` is floored at the pre-registered 30 and is monotone non-decreasing in both `sd` and `k` —
  asserted, because the whole section turns on the number only ever moving up.
- `shockCiLevel(0)` and negative k return `null`, not 0.90.
- `shockStatus` returns `INVALID` (never a status that could be mistaken for a result) whenever a number needed for
  the decision is missing: no `sd`, no `dBrier`, no `ciLo`, or a Phase-2 arm with no detector confusion matrix.
- Control coverage of exactly 0.80 passes; 0.79 abandons. The floor is a floor, likewise `dBrier` exactly 0.010.
- `shockMayHeadline(false, "READY")` is `false` — an exploratory arm cannot headline even when it clears.
- `shockPoolGuard` exists so that mixing Phase-1 and Phase-2 rows is a caught bug rather than a plausible number.

## What I deliberately did not do

- **Did not touch `/home/user/Btc-terminal/index.html`, CLAUDE.md, or any repo file.** Read-only throughout.
- **Did not weaken `VERDICT_RULE`, retune any existing threshold, or refit `SEAS`, `TERM`, `SWING_BASE` or the
  residual coefficients.** §10.1 freezes those; this unit treats them as data.
- **Did not write any UI, storage, or CSV code.** §11 specifies that exploratory arms carry an `exploratory` column
  next to the existing `excluded` column and are labelled on their own row — implementing that is a separate unit,
  and it needs decisions about panel layout I have no basis to make.
- **Did not build a shock detector, a release calendar, or a Phase-2 anything.** §11.5 requires Phase 2 to be
  measured against Phase 1's calendar, so Phase 1 has to exist first.
- **Did not invent a start date, a release schedule, or a projected result.** No calendar date appears anywhere in
  `prereg.md` except the authorship date 2026-09-06 (today, per the environment) and the `fit-YYYY-MM-DD-x` tag
  *format*.
- **Did not add a seed to `bootstrapCI`.** §10.5 settled that; §11.2a restates the reasoning rather than reopening it.
- **Wrote no order-placing logic of any kind**, and §11.2 restates that a shock READY moves no capital and that the
  programme adds no execution path.

## The one thing a reviewer should push back on

§11.2a lets the required holdout n rise above 30 once `sd` is measured, and the table shows that at sd = 0.05 and
k = 20 it rises to 197 — which at the conservative release rate is 23.6 months and collides with the §11.7 clause 5
deadline of 24. **The programme may therefore be arithmetically impossible, and the document says so before any
data exists rather than discovering it in year two.** That is intentional. If it is judged too harsh, the honest
remedy is to reduce `k` by running fewer arms, or to raise the effect floor — not to lower the CI level after
seeing a result, which §11.7 clause 6 closes the programme for.
