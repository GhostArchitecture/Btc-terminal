## 11. The shock programme — pre-registered evidence standard (2026-09-06)

Written before the first shock-conditioned observation exists. No number in this section was chosen with knowledge
of a result. `SHOCK_RULE` in `index.html` is the machine-readable copy of these thresholds and `test/prereg.js`
fails if the two disagree — the document and the code cannot drift apart silently.

A shock-conditioned arm is any decision rule that fires only when a macro event lands in the live window. The
programme exists because the instrument has ruled out everything price-path-based (§8) and a scheduled release is
the one remaining exogenous thing that happens to a 15-minute window. It is also the hardest thing this tool has
ever tried to measure, because there are almost none of them.

**§11.7 closes the programme if any threshold in this section is later loosened.** Loosening is the failure mode
this section exists to prevent, not a repair for a disappointing result.

### 11.1 The arithmetic that forces a separate standard

BTC-relevant scheduled US macro releases number roughly **100 per year**, or **~150 counting weekly jobless
claims**. That is a planning premise, not a measurement: the actual calendar has not been transcribed into this
repo. Phase 1 begins by committing the calendar to the repo with its source and its retrieval date, and the
observed count replaces these two figures here — upward or downward — before any window is scored.

Each release lands on exactly **one** live 15-minute window. There are 96 windows a day and **35,040 a year**, so
shock windows are **0.29% of the tape at 100 releases a year and 0.43% at 150**. Against the existing
`VERDICT_RULE` bar of ≥200 graded windows:

| graded shock windows | at 100 releases/yr | at 150/yr |
|---|---|---|
| 30 | 3.6 months | 2.4 months |
| 60 — this section's minimum | 7.2 months | 4.8 months |
| 100 | 12.0 months | 8.0 months |
| 200 — `VERDICT_RULE` | 24.0 months | 16.0 months |

**`VERDICT_RULE` is therefore unreachable for a shock arm inside two years, and it is not being relaxed.** §4 says
thresholds were fixed before the data arrived and must not be tuned to fit results; inventing a softer bar after
seeing a shock result would be exactly that. This section sets a *different* bar, in advance, and it is not softer:
it demands 60 graded windows where a naive reading of "n ≥ 30" would demand 30, it demands a matched control for
every one of them, and §11.2 shows it may demand considerably more than 60.

One consequence follows immediately and is binding: **no arm may be conditioned on a single release type.** CPI
occurs 12 times a year; a CPI-only arm reaches 30 observations in two and a half years and 200 in sixteen. Arms are
conditioned on the release *class* (scheduled US macro) or not at all.

### 11.2 The bar

One **primary** hypothesis per phase, one primary arm, one primary statistic, all three written into this file with
a build stamp before the first observation of that phase is recorded. Everything else is exploratory (§11.4).

**Primary statistic — difference-in-differences.** For the primary arm, the Brier score of the tool's headline
probability minus the Brier score of the Kalshi quote-implied probability, on shock windows, *minus the same
difference computed on that window's time-matched controls* (§11.3). Scoring is one observation per window at
`refSnap`, series split, exactly as §4 requires. The unconditional shock number is not the primary statistic and
never appears without the control-adjusted one beside it.

A shock arm reads READY only when all of the following hold on the **holdout** set alone (§11.6):

- **n ≥ 30 graded holdout shock windows**, on top of 30 calibration windows — **60 total, minimum.** §11.2a can
  raise the holdout requirement and can never lower it.
- **Control coverage ≥ 80%**: at least 80% of recorded shock windows have ≥ 5 valid matched controls. A shock
  window with fewer than 5 controls is recorded but not scored.
- **Δ Brier (difference-in-differences) ≥ 0.010** — the effect floor.
- **A two-sided percentile-bootstrap CI at the level `1 − 0.10/k` excluding zero**, where *k* is the number of arms
  scored in the phase (§11.4).
- **Paper P&L > 0 over ≥ 30 holdout entries**, fees charged as §4 charges them, per-contract rounding as §7.5
  requires.

**Where 0.010 comes from.** §3 records the market's Brier at 0.1457 against the best lognormal's 0.1473 over 2,000
settled windows — the model is 0.0016 *worse* — and free per-horizon refitting bought at most 0.0007. A shock edge
that is real must be an order of magnitude clear of the noise that has already been ruled out: 0.010 is 6× the
model-vs-market gap and 14× the free-refit gain. It is deliberately above anything this instrument has ever
measured. If the true effect is smaller than 0.010, this programme cannot resolve it at any sample size it will
ever reach, and saying so now is cheaper than discovering it in year two.

#### 11.2a The one number allowed to move, and only upward

At 30 holdout windows a CI at level `1 − 0.10/k` is roughly `z` standard errors wide, with `z = invNorm(1 − 0.05/k)`:
1.645 at k=1, 2.576 at k=10, **2.807 at k=20**. The standard error is `sd/√n`, where `sd` is the standard deviation
of the *paired per-window* Brier difference — a quantity nobody has measured, because no shock window has been
recorded. The holdout size that lets a point estimate exactly equal to the 0.010 floor clear the CI is
`n = (z·sd/0.010)²`. At k=20:

| sd of paired Δ Brier | n at 50% power | n at 80% power | 80%-power calendar time @150/yr |
|---|---|---|---|
| 0.02 | 32 | 54 | 4.3 months |
| 0.03 | 71 | 120 | 9.6 months |
| 0.05 | 197 | 333 | 26.6 months |

**Procedure, fixed now.** `sd` is measured on the 30 calibration windows. The required holdout n is computed from
it at 50% power and reported alongside the 80%-power figure, so a barely-powered design is never mistaken for a
good one. If the required n exceeds 30, **the holdout requirement is raised to it, written into this file with its
date, and only then is the holdout opened.** It may only ever move up. If the required n cannot be reached inside
the §11.7 deadline, the programme closes at that moment rather than opening a holdout that arithmetically cannot
finish.

The percentile bootstrap has its own floor: it cannot resolve a tail finer than `1/B`. Every CI in this programme
uses **B ≥ 20/(1 − level)** resamples, so each tail carries at least 10 — 200 at k=1, 2,000 at k=10, **4,000 at
k=20**. `bootstrapCI` stays unseeded (§10.5); resampling variation is a property of the method, not a bug.

**READY on a shock arm is necessary, never sufficient, and no capital moves on it.** There is no execution path in
this tool and this programme does not add one.

### 11.3 Time-matched controls are mandatory

Scheduled US releases are not scattered across the clock. The 08:30 ET block — CPI, PPI, payrolls, retail sales,
weekly claims — lands at **12:30 UTC under EDT and 13:30 UTC under EST**, and the FOMC statement at 14:00 ET lands
at 18:00 or 19:00 UTC. Shock windows therefore cluster on the rising edge of this instrument's own seasonal curve.
`SEAS` runs **1.007 at 12 UTC, 1.298 at 13, 1.934 at 14**, against a trough of 0.804 at 07 — a **2.41× daily swing
in the table, 1.55× in σ** because `calSigma` takes the square root of the ratio.

**`SEAS` does not remove this, and assuming it does is the trap.** `calSigma` applies `sqrt(SEAS[endHour]/SEAS[nowHour])`,
which for a 12:30–12:45 window is exactly 1 (§10.2) — the seasonal factor only acts when a window crosses an hour
boundary. The seasonal level reaches the model only through `rv60`, a 60-minute trailing realized estimate that
lags a step change by up to an hour: precisely the hour a release lands in. **The control set, not the model, is
what removes the ramp.**

US DST moves the same release across that ramp twice a year. An 08:30 ET print sits in a window ending in hour 12
(`SEAS` 1.007) from March to November and hour 13 (1.298) from November to March — **1.29× in the table, 1.14× in
σ, for an identical event.** A shock ledger pooled across a DST boundary is comparing two different volatility
regimes and calling the difference an edge.

**Every shock claim is stated against controls matched on all four of:**

1. **The same UTC 15-minute slot** the shock window actually occupied — the slot, never the ET release time. Match
   on ET and the control set slides under the treatment at each DST transition.
2. **The same weekday.** Claims are Thursday, payrolls are Friday, FOMC is Wednesday; weekday and slot are
   confounded in the release calendar and must be held together.
3. **No scheduled release** in the control window or in the two windows either side, so a control is not a shock
   window's shoulder.
4. **The same calendar quarter**, so the control carries the same volatility regime as the shock.

Minimum **5 controls per shock window**. Below 5, the window is recorded, marked `unmatched`, and excluded from
scoring — it is not scored against a thinner control set and it is not scored against the unconditional baseline.
**No shock number is ever reported against the unconditional baseline, in the UI, in a CSV, or in this file.**

### 11.4 Multiplicity

The spine proposes five new entry rules crossed with the two existing exits, taking the simulation from 10 arms to
20. A 90% CI excludes zero for 10% of null arms — **two of twenty by chance alone**. `VERDICT_RULE` additionally
requires the point estimate to be positive, which halves that to **one of twenty in the direction anyone would act
on**. One false positive per twenty arms per phase is still too many when a phase costs a year and the retraction
costs another.

**The rule.** The required two-sided CI level for any arm in a scored family is

> **`1 − 0.10/k`, where `k` is the number of arms scored in the phase, counted whether or not they are labelled primary.**

At k=1 this is 0.90 — `VERDICT_RULE`'s existing level is the one-hypothesis case of this rule, and it is untouched.
At k=10 it is 0.990; at **k=20 it is 0.995**. Adding an arm raises the bar for every arm in the family. That is the
intended cost of adding arms, and it is the reason the 20-arm expansion is not free.

**Labelling.** Exactly one arm per phase is `primary`. Every other arm is `exploratory`, and that word appears:

- in the UI, on the arm's own row, not in a legend or a footnote;
- as an `exploratory` column in every CSV export that carries the arm, alongside the existing `excluded` column
  (§10.4b).

**An exploratory arm never sets READY, never highlights a window on the sweep, never enters a headline
probability, and never appears in a summary number.** It may be *promoted* to primary in a later phase, and only on
observations recorded after the promotion is written down. Data collected while an arm was exploratory does not
count toward its primary bar. Promotion does not reduce k.

### 11.5 Phase 1 and Phase 2 are never pooled

**Phase 1 — calendar-detected.** The window is known from a published schedule before it opens. Treatment
assignment is exogenous, detection is exact up to the accuracy of the transcribed calendar, and the false-positive
rate is zero by construction.

**Phase 2 — endogenously detected.** The tool infers a shock from its own tape: a volume burst, a dispersion
spike, a book dislocation. This is a **proxy with an uncharacterised false-positive rate**, and worse, the detector
is a function of price. Selecting a window because the price moved and then scoring whether the price moved is the
retroactive side-picking of §7.4 wearing a different hat — the same mistake that turned a +9.4¢ swing MFE into
+0.16¢.

**Rules:**

- Separate ledgers, separate `localStorage` keys, separate CSV exports, separate n, separate READY. **There is no
  pooled Brier, no pooled P&L, and no combined verdict, ever.**
- A Phase-2 arm may not be promoted on Phase-1 evidence, and a Phase-1 result may not be extended to Phase-2
  windows.
- **Phase 2 does not report at all until its detector has been scored against the Phase-1 calendar** over the same
  period, publishing precision and recall as a confusion matrix. Phase 1's calendar is the ground truth Phase 2 is
  measured against; that is the second reason Phase 1 comes first.
- Phase 2's own bar is Phase 1's bar in full, plus the confusion matrix, plus its own holdout. Being second buys it
  nothing.

### 11.6 Holdout discipline

§7.4 records two episodes where an edge evaporated once the hindsight was removed. Calibrating a threshold on
recorded data and then testing it on that same data reproduces both.

**The split is chronological and defined by count, fixed now:**

- **Calibration set: the first 30 graded shock windows**, in time order, per phase.
- **Holdout: every shock window after those 30**, until the required n (§11.2a) is reached.
- **Random splitting is forbidden.** Shock windows repeat monthly by release type; a random split puts June CPI in
  train and July CPI in test and leaks the regime across the boundary. Chronological only.
- The boundary is a count, not a date, and cannot be moved once the 30th calibration window is graded.

**Freezing.** Every threshold, coefficient, detector parameter, control-matching rule and arm designation that the
calibration set touched is frozen, tagged `fit-YYYY-MM-DD-x` in the code and recorded in this file with a build
stamp, **before a single holdout window is scored.** READY is decided on the holdout alone. The calibration
half is never re-scored into the result and never quoted as evidence.

**Spending the holdout.** If any frozen quantity is changed after the holdout has been opened, **the holdout is
spent**: every window scored under the old freeze is retired, the holdout count restarts at zero, and only windows
recorded after the new freeze count. This is stated so that a mid-flight "small correction" carries its true price
rather than quietly resetting the evidence to a favourable state. A correction may still be right — it just costs
the holdout.

### 11.7 What falsifies the programme

Stated now, before any data. Each of these closes the programme; none of them is an invitation to collect more.

1. **The effect is not there.** At the required holdout n, the difference-in-differences point estimate is
   **< 0.005** — half the effect floor. Closed. Not "extended", not "re-specified".
2. **The effect is the seasonal curve.** The unconditional shock number is positive and the control-adjusted one is
   not. The finding is `SEAS`, which is already in the model. Closed as a duplicate of a known effect.
3. **The design cannot be executed.** Fewer than 80% of shock windows have 5 valid matched controls. The comparison
   this section requires cannot be built, so no shock claim can be made. Closed or redesigned, and a redesign
   restarts the count at zero.
4. **Phase 2's detector is a coin flip.** Precision against the Phase-1 calendar **< 0.50**. Phase 2 closes
   permanently; Phase 1 continues alone.
5. **The programme runs out of clock.** **24 months** from the first recorded shock window without reaching the
   required holdout n. Closed for lack of power, with the counts written into this file. §11.2a can close it
   earlier, on day one of the holdout, if the measured `sd` puts the required n beyond that deadline.
6. **A threshold in this section is loosened.** Any edit that lowers the effect floor, lowers a CI level, lowers a
   minimum n, lowers the control minimum or coverage, or relabels an exploratory arm as primary using data recorded
   before the relabel — **closes the programme and marks its ledgers.** The thresholds may be raised at any time.
   They may not be lowered, and a result is never a reason to revisit them.

A closure is written into this file with its date, its counts and which clause fired, and the ledgers are kept.
Negative results are the output this instrument is for (§9); a closed shock programme with its numbers on the
record is a finding, not a failure.
