# Adversarial review — `units/score` — 2026-09-06

Reviewer role. **Nothing in the repository was edited**; this file is the only artefact. Working tree
clean, `node units/score/test.js` green (255/255), `node units/run.js` green (7 units),
`npm test` green (5 harnesses) before and after.

Everything below was reproduced against `units/score/code.js` in a `vm` context with a controllable
`controlEligible` stub whose ±45-minute contract was first checked against the **real**
`units/calendar/code.js` at the boundary minute (see "What I verified and could not break", item 3).
Every arithmetic claim was checked against a throwaway implementation written from CLAUDE.md §11 rather
than from `code.js`, per the brief.

---

## Verdict

**Mechanically splice-clean. NOT safe to splice yet.**

The unit is pure, ASCII, ES2019, arrow-free, collides with no name in `index.html`, degrades to reason
codes without its neighbours, and its arithmetic — the sign, the CI level, `B`, the sample sd, the
clearance probes — is correct against independent computation. I could not break the sign, and I tried
hard to.

But **four separate constructed inputs reach `READY` on evidence §11 does not permit**, and §11.6 makes
the cost of finding them later enormous: the control-matching rule and the primary statistic are
exactly the quantities that get frozen, and correcting any of them after the holdout opens **spends the
holdout**. Every one of these must be settled *before* the splice makes the unit reachable, not after.

Findings 1–4 are each independently sufficient to produce a wrong verdict. Finding 1 is the expensive
one.

---

## 1. The bootstrap cannot see the sampling error in the control means, and they are *shared*

**Where:** `scPairs` (code.js:348–354) collapses each shock window's controls to `cm = scMean(cs)` and
stores only `paired = sk.skill - cm`. `scCi` (code.js:471–475) then resamples **`paired` alone**.

**Why it bites here specifically.** §11.3's four matching dimensions — same UTC slot, same weekday,
same quarter, same series — partition the tape into cells, and **every shock window in a cell draws the
same control set**. That is not a fixture artefact: §11.3 says in as many words that scheduled releases
cluster on the clock and the weekday, which is precisely what forces the shocks into few cells. So the
control-mean term is not merely correlated across pairs — inside a cell it is *literally the same
number*, estimated from as few as five windows, and the bootstrap over `paired` assigns it zero
variance.

**Concrete input** (`/tmp/.../a10.js`, reproduced below): one cell, five controls whose skills are
−0.24, −0.12, 0, +0.12, +0.24 (mean 0, sample sd 0.1897), seven shock windows with identical reads
(pm 0.53, qm 50, y=1).

```
n pairs 7   all paired values identical: true
CI: {"level":0.9,"B":200,"lo":0.03410,"hi":0.03410,"point":0.03410,"n":7}
standard error of that 5-window control mean, on its own: 0.0848
```

The reported 90% interval has **width exactly zero** and `ciLo = 0.0341 > 0`, while the standard error
of the single shared control mean the estimate is built on is **0.0848 — 2.5× the point estimate
itself.** `shockStatus` tests `dBrier >= 0.010 && ciLo > 0`; this passes both, with certainty, on a
quantity whose sign the data does not establish.

This is the §7.4 failure mode arriving through the CI instead of through the backtest: an interval that
looks decisive because the estimator was resampled at the wrong level.

**What it needs.** Either resample the shock windows *and* their control windows together (a cluster
bootstrap over matching cells, so a cell's control draw is re-drawn with it), or register in §11 that
`ciLo` is conditional on the control means and state the omitted variance component. It is a
registration decision either way — but it must be made now, because §11.6 says making it after the
holdout opens spends the holdout.

---

## 2. Control coverage is pooled over calibration **and** holdout; §11.2 requires it on the holdout alone

**Where:** `scPairs` counts `ctrlTotal` (code.js:334) and `ctrlMatched` (code.js:352) over **every**
shock row in `rows`, and `scReport` hands those two totals straight to `st` (code.js:541). The split
happens afterwards (code.js:536) and never re-derives coverage.

§11.2 lists the READY conditions and prefixes them: *"on the **holdout** set alone (§11.6)"* — and
"Control coverage ≥ 80%" is the second item in that list.

**Concrete input** (`/tmp/.../a4.js`): 30 cells × 5 controls × 2 shocks = 60 matched shock windows, plus
10 late-dated cells with only 4 controls each = 10 unmatched shock windows dated after the boundary.

```
ctrlTotal 70  ctrlMatched 60  pooled coverage 0.8571
cal 30  hold 30  sd 0.000575
HOLDOUT-ONLY coverage: 30/40 = 0.7500
STATUS: READY | control-adjusted Δ Brier clears the floor and the CI at level 0.900
```

Holdout coverage is **75%**. §11.7 clause 3's ABANDON does not fire because the calibration half's
perfect coverage carries the pooled figure over 80%. The unit reads READY.

Note the direction: this is not conservative. Coverage failures that land in the holdout — which is
where they matter — are diluted by calibration windows that have already been spent.

---

## 3. A row set with `phase` omitted skips §11.5's phase-2 gate entirely and reads READY

**Where:** `scPhaseGuard` (code.js:294–301) only records rows where `r.phase !== undefined && !== null`.
With no row carrying `phase`, `pg.phases` is empty, so `scPairs` sets `out.phase = null`
(code.js:328), `scAssemble` copies `null` through (code.js:496), and `shockStatus`'s
`if(st.phase===2)` block — the one that returns INVALID without `detPrecision` — never runs.

`phase` is not in `SC_CALLER_FIELDS` (code.js:491), so it is **not reported in `missing`** either. The
caller gets no signal at all.

**Concrete input** (`/tmp/.../a6.js`): the same 60-window fixture built three ways.

```
phase:1 on rows            -> st.phase 1     status READY
phase:2, no detPrecision   -> st.phase 2     status INVALID   (correct)
phase OMITTED on the rows  -> st.phase null  status READY
   scReport `missing`: ["detPrecision"]      scReport `code`: null
```

A phase-2 arm reaches READY without a confusion matrix by omitting one field. §11.5 is the section that
says Phase 2 "does not report at all until its detector has been scored against the Phase-1 calendar",
and the NOTES say `shockStatus` "already returns INVALID without one; that is the rule in force". It is
not in force when `phase` is absent. Every other §11.5 dimension in this unit (mixed phase, mixed
series) is a hard refusal; this one is a silent pass. `scPairs` should refuse a null phase the way it
refuses a mixed one.

---

## 4. Nothing deduplicates. The 5-control minimum is a count of **rows**, not of windows

**Where:** `scMatchControls` pushes every passing candidate (code.js:279) and sets
`matched = out.n >= 5` (code.js:284). The only identity check in the function is between a candidate
and *the shock* (code.js:265–266, `c===shock`, then `c.ticker===shock.ticker && c.open===shock.open`) —
so the author already settled that a window's identity is `(ticker, open)`, and then did not apply it to
the pool. `scPairs` likewise iterates `rows` with no identity check on shock rows.

**Concrete input** (`/tmp/.../a7.js`):

```
distinct control windows: 3 | scMatchControls n = 5 | matched = true
control tickers: c0, c1, c2, c0, c1
```

Three distinct control windows, each ledger row present twice, satisfies §11.3's minimum of five. And
on the shock side:

```
a CLONE of the same shock window -> pairs: 2  ctrlTotal: 2  paired values: 0.1400, 0.1400
```

One shock window scores twice: `n` inflated, `ctrlTotal`/`ctrlMatched` inflated, the value duplicated
into the bootstrap sample (which narrows the interval), and the split boundary shifted.

**This is the expected input shape, not an exotic one.** §10.2 records that `btc.edge` prunes at 1,500
windows — *"roughly 15 days"* — and *"for anything accumulating slower than that (the shock programme
needs ~7 months, §11.1) the CSV is the record and localStorage is only the buffer."* §8 revises that to
**~15 months** at 47 calendar events a year. The real scoring input is therefore a concatenation of
dozens of overlapping CSV exports. Duplicate rows are what that produces.

---

## 5. The calibration/holdout boundary moves under ordinary control churn, not only under a backfill

`code.js:369–379` and `NOTES.md:174` both state that the one remaining way the boundary moves is a
backfill. That is not the case. Because `scSplit` is fed `P.pairs` — the **matched** shock windows — and
matched-ness is recomputed from the current control pool on every call, anything that changes whether an
*old* shock window has five controls reshuffles the pair list and slides the count boundary.

**Concrete input A — a control ages out** (`/tmp/.../a5.js`). 35 cells, 5 controls + 1 shock each.
Remove exactly one control row from the earliest cell; add nothing:

```
run 1 boundary: {"n":30,"close":1771399800000,"ticker":"KXBTC15M-s29"}
run 2 boundary: {"n":30,"close":1771400700000,"ticker":"KXBTC15M-s30"}
scSplitStable: {"moved":true,"why":"boundary window close changed"}
```

**Concrete input B — a control arrives late.** Cell 0 starts with 4 controls; the 5th lands later. The
boundary moves back the other way.

**Concrete input C — the required holdout n moves DOWNWARD** (`/tmp/.../a9.js`), which §11.2a says it
"may only ever move up":

```
run 1: sd 0.05431  required holdout n = 80
run 2: sd 0.04012  required holdout n = 44      (one old control row pruned)
```

Given §10.2's 15-day prune against §8's 15-month programme, control attrition is not a hazard the
programme *might* hit — it is guaranteed, repeatedly, unless the caller persists its own control
ledger. The NOTES' wiring section builds `rows` straight from `S.edge.windows` and does not mention it.

Two further gaps sit on top of this: `scSplitStable` is exported but **never called by `scReport`**, and
`scReport` never returns a "the boundary moved" signal — detection is entirely the caller's, from a
stamp the caller must persist itself. And `shockRequiredHoldN` is stateless, so nothing ratchets `need`.

---

## 6. `scReport` returns `READY` while `missing` is non-empty

`scAssemble` is scrupulous — it defaults nothing (verified: a truthy-but-not-`true` `frozen` is passed
through verbatim and still refused). But `scReport` computes `rep.status` unconditionally
(code.js:545) and never consults `a.missing`.

**Concrete input** (`/tmp/.../a6.js`), same 60-window READY fixture with one caller field dropped:

```
omit holdoutSpent   -> status READY   | missing: detPrecision,holdoutSpent
omit monthsElapsed  -> status READY   | missing: detPrecision,monthsElapsed
omit arms           -> status INVALID | missing: arms,detPrecision   (safe — ciLo is null)
omit detPrecision   -> status READY   | missing: detPrecision        (phase 1: correct)
```

`holdoutSpent` absent is the sharp one: §11.6's spent-holdout flag defaults, at `shockStatus`, to *not
spent*, i.e. to the value that lets the programme advance — exactly what the brief asked me to look for.
`missing` names it and then nothing acts on it. A caller reading `rep.status.status` gets READY.

(The `arms`-absent path is safe by accident rather than by design: `scCi` returns `code:"no-prereg"` —
a **mislabelled** reason, since prereg is present and it is `arms` that is missing — which nulls `ciLo`,
which `shockStatus` turns into INVALID.)

---

## 7. A mixed-phase call reports `status: "CALIBRATING"`

`scReport`'s early-return branch (code.js:529–535) assembles `nCal:0, nHold:0` and calls `shockStatus`,
which answers on the count rather than on the violation.

```
rep.code: mixed-phase | rep.ok: false | rep.status.status: CALIBRATING | "calibration set incomplete"
```

The §11.5 violation is visible only in `rep.code`. The headline status reads as ordinary progress. The
NOTES themselves say that if a status is ever surfaced it is `rep.status.status` and `rep.status.why`
verbatim — which here would print a benign message for a call that §11.5 forbids outright. It cannot
reach READY, so this is a mislabel rather than a wrong verdict, but it hides a caller bug indefinitely.

---

## 8. Documentation and test defects

- **`code.js:482`** — *"Seven are MEASURED here; eight are the caller's"*. It is the other way round:
  eight are measured (`phase, nCal, nHold, sd, dBrier, ciLo, ctrlMatched, ctrlTotal`) and seven are the
  caller's. `SC_CALLER_FIELDS.length === 7`. The NOTES wiring table lists seven correctly.
- **`test.js:631`** — `eq("SC_CALLER_FIELDS names the eight the caller owns", ..., 7)`. The assertion
  name contradicts the value it asserts. A reader auditing by assertion name is told the wrong number.
- **`test.js:432–460` — the unconditional-leak scan is vacuous.** It runs on a fixture where *every*
  shock window is unmatched, so `P.pairs` is `[]` and the `ARGSETS` entries that take pairs are all
  empty arrays. It proves nothing about the case where a controlled estimate exists. In that case
  `scPairs` does hand back `shockSkill` on every pair, so the unconditional aggregate is one `reduce`
  from a caller — which is defensible (they are per-window measurements, not an aggregate, and §11.3
  governs *reporting*), but it is not what "no export returns the unconditional shock mean" implies and
  the test does not test the interesting half. The stronger claim in NOTES ("structurally
  inseparable") is not established by the suite.
- **`NOTES.md:4`** says 545 lines; `code.js` is 547.
- Several assertions in the big grid block compare one part of the unit to another
  (`st.ciLo === rep.ci.lo` is tautological; `st.sd` vs `U.scSd(sp.cal)` re-uses the code under test).
  These are not wrong — `scSd` and `paired` are separately pinned by hand-derived literals
  (`sqrt(30/29)`, `skillOf(p,60,1)-0.05`) — but the composition assertions carry less weight than their
  names suggest.

---

## Minor, not worth blocking on

- `scSkill` (code.js:237) accepts `qm === 0` and `qm === 100`. §10.3 **K2** records that Kalshi's
  empty-side book parses to exactly those values and that a quote built from them is meaningless. The
  recorder-side guard exists, so a 0/100 row should never reach the ledger — but this is the layer that
  would catch it if one did, and it does not.
- `shock` is caller-supplied and never cross-checked against `releasesBetween` even in phase 1, where
  the calendar could verify it. Deliberate (`calendar/` owns treatment assignment) and stated, but it
  means a mis-flagged shock window is undetectable here.
- `scClearProbes` (code.js:159) uses `p < to-half-1`; for a window whose `open`/`close` are not on a
  60 000 ms grid this can leave a 1 ms uncovered sliver between the last loop probe and the endpoint
  probe. Unreachable for Kalshi windows (minute-aligned) — noted only so the `-1` is not mistaken for a
  safety margin.
- `scPhaseGuard` inherits `shockPoolGuard`'s object-key coercion: `phase: 1` and `phase: "1"` pool
  silently. Harmless as long as both mean phase 1, but it is not a type check.

---

## What I verified and could not break

1. **The sign.** `scSkill` returns `bMkt - bTool`; a positive value means the tool beat the market,
   matching §11.2's prose, `computeVerdict`'s existing `dB = (market−y)² − (model−y)²` at
   `index.html:2007`, and `shockStatus`'s `dBrier >= floor && ciLo > 0`. Checked against my own DiD
   written from §11.2: on a fixture where the tool is definitively worse (shock tool 0.10 vs market
   0.90, y=1; controls neutral) and one where it is definitively better (0.90 vs 0.10), the unit and my
   implementation agree to 1e−12 in both directions (−0.7999999999999999 / +0.7999999999999999). The
   worse case cannot reach READY even with a hand-forced positive `ciLo` — §11.7 clause 1's ABANDON at
   `dBrier < 0.005` fires first. **No sign error.**
2. **Dimension 3 is exact.** Minute-by-minute sweep of a release offset against a 15-minute control
   ([open−30, close+30]) and an hourly control ([open−120, close+120]): **zero** offsets inside the
   required span are declared clear, and the first clear offset outside it is exactly +181 min / −121
   min for the hourly case. The multi-probe derivation is right and a single-probe implementation would
   indeed admit an hourly control with a release 90 minutes out.
3. **Eligibility genuinely routes through `controlEligible`.** Against the real
   `units/calendar/code.js` and its 51 real 2026 rows: a window opening at release−45 min is refused,
   at release−46 min accepted; +45 refused, +46 accepted — identical to `controlEligible` called
   directly, confirming the ±45-inclusive contract and that nothing is reimplemented.
4. **DST.** 08:30 ET is UTC slot 54 in January (EST) and slot 50 in July (EDT); a late-March EDT window
   and a January EST window in the *same* quarter do not share a slot key. Matching is on the slot the
   window occupied. Correct per §11.3 dimension 1.
5. **UTC discipline.** The suite's `TZ=Asia/Kolkata` child-process probe is a real test and passes; I
   re-read `scSlotUtc`/`scWeekdayUtc`/`scQuarterUtc` and they use epoch modulo and `getUTC*` only.
6. **CI level and B.** Independently recomputed `1 − 0.10/⌊k⌋` and `⌈20/(1−level)⌉` for
   k ∈ {1,2,3,5,10,20,50}: exact match, and `scCi` reports what it hands the bootstrap
   (0.90/200 at k=1, 0.995/4000 at k=20). Values resampled are the `paired` differences, statistic is
   their mean, `lo`/`hi` passed through untouched.
7. **`scSd`** is the sample (n−1) sd of `paired` and nothing else — matched my implementation to 1e−15
   and is provably distinct from the sd of `shockSkill` on the same fixture. Returns `null` below 30.
8. **Holdout discipline in the arithmetic.** `sd` from `sp.cal` only, `dBrier` and `ciLo` from
   `sp.hold` only; `scSplit` takes one argument, sorts by `close` with a ticker tiebreak, and produces
   an identical split from a shuffled input.
9. **`scAssemble` defaults nothing** — including a truthy-but-not-`true` `frozen`, which is still
   refused.
10. **Mixed phase and mixed series are refused**, not merged.
11. **No execution path**, no DOM/storage/fetch/timers/`S`, pure ASCII, no arrow functions, backticks
    only inside comments, and **zero name collisions** with `index.html` (re-derived independently, 30
    declarations).
12. **Degradation.** Loaded alone, every path returns a reason code and nothing throws.

---

## What has to happen before this is spliced

Findings 1–4 each change either the **control-matching rule** or the **primary statistic** — the two
things §11.6 freezes. Fixing any of them after the splice is in service and observations exist is a
post-freeze change that **spends the holdout** and restarts the count at zero. There is no shock-
conditioned row anywhere yet, so right now all four are free. That will not be true again.


---

# Adversarial re-review — `units/score` — 2026-09-06 (second round)

Reviewer role. **Nothing in the repository was edited**; this section is the only artefact. Working tree
carries the previous round's fixes; `node units/score/test.js` green (453/453), `node units/run.js` green
(7 units), `npm test` green (5 harnesses) before and after.

Everything below was reproduced in a `vm` context built independently of `test.js` (same three-context
shape: real `calendar` + real `prereg`, a controllable `controlEligible` stub, and `score` alone), with
fixtures whose expected values are derived from CLAUDE.md §11 and written as literals. The cluster
bootstrap was checked against a **separate reimplementation** and against an analytic standard error,
not against the unit's own output.

---

## Part 1 — the ten previous findings, re-run from their original reproductions

All ten are closed. Each was re-run from the symptom described in the first round, not from the diff.

| # | original symptom | re-run result |
|---|---|---|
| 1 | 7 identical pairs in one cell → 90% CI width **exactly 0**, `lo = +0.0341` | width **0.240–0.264** over 5 seeds, `lo` −0.091 to −0.115 — the interval covers zero. `level 0.9`, `B 200` unchanged |
| 2 | pooled coverage 0.857 → READY while holdout-only was 0.750 | `st.ctrlMatched/ctrlTotal` = **30/40**, status **ABANDON**; `rep.coverage.all` still reports the 0.857 counterfactual |
| 3 | `phase` omitted → `st.phase null`, phase-2 gate skipped, READY | **REFUSED / `no-phase`**. `phase:1` READY, `phase:2` without `detPrecision` refused |
| 4 | 3 control windows each duplicated satisfied the 5-minimum; a cloned shock scored twice | `n 3, matched false, dupControls 2`; cloned shock → `pairs 1, ctrlTotal 1, dupRows 1` |
| 5 | boundary slid when one old control row was pruned | with the run-1 stamp registered: **REFUSED / `boundary-moved`**, `why "boundary window close changed"` |
| 6 | `holdoutSpent` / `monthsElapsed` / `pnlN` absent → READY | every one of them **REFUSED / `missing-caller-fields`**; `detPrecision` at phase 1 correctly does not block |
| 7 | mixed phase reported `CALIBRATING / calibration set incomplete` | **REFUSED / `mixed-phase`** with the §11.5 sentence; `no-matched-windows` still answers on the counts, which is right |
| 8 | "Seven are MEASURED … eight are the caller's"; assertion named "eight" | code.js:693 reads EIGHT/SEVEN; test.js:1003 reads SEVEN; NOTES line count 902 = `wc -l` |
| 9 | leak scan vacuous on an all-unmatched fixture; tautological assertions | rebuilt on a matched fixture, `sdRef` written independently (test.js:152), attainable-range bound for `ciLo` |
| 10 | `qm` 0 / 100 scored | `{ok:false, code:"empty-book"}` at both ends; such a control is rejected and counted (`rejects:{"empty-book":1}`); `phase:"1"`, `phase:"2"`, `phase:true` all **REFUSED / `bad-phase`** |

---

## Part 2 — verification of the cluster bootstrap (S1), by independent reimplementation

I wrote a second two-stage cluster bootstrap from the definition (group pairs by cell; resample cells with
replacement; inside each drawn cell resample its own controls and its own shocks; rebuild the paired mean)
and compared replicate distributions over 40,000 draws.

- **It does resample cells, carrying each cell's controls with its shocks.** `scCells` groups on
  `p.cell`, unions each cell's control ids once, and `scClusterStat` re-estimates the control mean inside
  the drawn cell before subtracting. Every shock in a cell draws the same control set by construction
  (`scMatchControls` applies identical criteria to every shock sharing a match key), so the cell's
  unioned control list *is* each member's control set — I checked this on a mixed fixture rather than
  assuming it.
- **The width on the zero-width fixture is defensible.** One cell, controls {−0.24, −0.12, 0, +0.12,
  +0.24}, seven identical shocks. The replicate is `shock − mean(resample of 5 controls)`; the population
  variance of the controls is 0.0288, so the resample-mean sd is `sqrt(0.0288/5) = 0.0759` and a 90%
  interval is `2 × 1.645 × 0.0759 = 0.250` wide. Measured: **0.240–0.264**. Agrees.
- **Never narrower than naive, and the excess is the right size.** Analytic prediction
  `Var_cluster = Var_naive + Var(control resample mean)/nCells`, checked on a 30-cell fixture with
  large control dispersion: analytic naive sd 0.002582 / cluster 0.011832 (ratio 4.583); measured
  0.002579 / 0.011871 (ratio **4.603**). On a fixture with small control dispersion the ratio is 1.011.
  Across every configuration I built — 1 cell × 7 shocks, 30 cells × 1 shock, 10 cells × 3, 3 cells × 10,
  and a deliberately lopsided 20+1+1+1+1 — the cluster replicate sd was **never below** the naive one.
- **Degenerate shapes behave.** One cell with one shock: the interval is the within-cell control
  resample (width 0.040 against a naive width of 0.000). Unequal cells: 0.106 against a naive 0.063.
  With a single cell there is no between-cell variance to estimate and stage 2 alone carries the
  interval, which is what the comment claims and what the numbers show.
- **Level and B have not moved.** `k=1 → 0.900 / 200`, `k=7 → 0.9857142857142858 / 1400`,
  `k=20 → 0.995 / 4000`, matching `1 − 0.10/⌊k⌋` and `⌈20/(1−level)⌉` recomputed independently. I
  instrumented the handed-in `bootstrapFn` and confirmed it receives exactly `(cells, fn, lvl, B)` with
  the cell objects, and that `out.point` is the deterministic mean of the observed paired values, not a
  replicate.

**The S1 fix is correct.** I could not make the cluster interval narrower than the window-level one, and
could not make it disagree with an analytic standard error I derived myself.

---

## Part 3 — new findings

Nine below. **Findings 1 and 2 are each independently sufficient to produce a wrong verdict**; finding 1
produces a wrong *closure*, which §11.7 makes permanent.

### 1. One unmatched window at the start of the holdout ABANDONS the programme. This is the S2 fix's own shadow

**Where:** `scCoverage` (code.js:743–757) counts holdout coverage over `pairs + unmatched` after the
boundary and hands `cov.hold` to `st` (code.js:884); `shockStatus` applies
`ctrlTotal>0 && ctrlMatched/ctrlTotal < 0.80 → ABANDON` **before** any count check and with **no minimum
denominator**.

Finding 2 of the first round was right and the fix is right, but moving the denominator from the pooled
set to the holdout alone made it *tiny at exactly the moment the holdout opens*. §11.2 budgets for up to
20% unmatched; the first unmatched window to arrive before the fifth matched one closes the programme.

**Concrete input.** 30 matched calibration windows (30 cells × 5 controls × 1 shock), then one shock
window with only 4 eligible controls, dated after the boundary:

```
unmatched 1  extra matched  0 | holdout coverage 0/1  = 0.000 | nCal 30 nHold 0  -> ABANDON  control coverage below 80% (11.7 clause 3)
unmatched 1  extra matched  3 | holdout coverage 3/4  = 0.750 | nCal 30 nHold 3  -> ABANDON  control coverage below 80% (11.7 clause 3)
unmatched 2  extra matched 10 | holdout coverage 10/12= 0.833 | nCal 30 nHold 10 -> HOLDOUT
unmatched 3  extra matched 30 | holdout coverage 30/33= 0.909 | nCal 30 nHold 30 -> READY
```

Under the pre-fix pooled figure the first row read 30/31 = 0.968 and passed. §11.7 clause 3 is a
**closure** — "Closed or redesigned, and a redesign restarts the count at zero" — and §11.7 opens by
saying each clause "closes the programme; none of them is an invitation to collect more". Against §8's
~47 calendar events a year, the holdout spends its first months in exactly this regime, so this is not a
corner: it fires on the ordinary first pass after calibration completes.

The coverage test is a statement about the holdout **as a whole**; evaluating it on a denominator of one
is not a conservative reading of §11.2, it is a different test. Either `score` must withhold
`ctrlMatched`/`ctrlTotal` until the holdout denominator can carry the 80% question (the same discipline
`scSd` already applies by returning `null` below `CAL_N`), or `prereg`'s gate needs a minimum n — and
which of those it is, is a §11 registration decision, so it belongs before the splice.

### 2. `boundary` and `holdNRegistered` are optional, so §11.6's freeze and §11.2a's ratchet are advisory — and READY is reachable with both unregistered

**Where:** `scSplitCheck` (code.js:512–518) returns `refuse:false` when `registered` is null; nothing
downstream consults `bchk.registeredOk`. `scRatchet` (code.js:535–543) returns `effective = computed`
when `registered` is null. Neither field is in `SC_CALLER_FIELDS` or `SC_VERDICT_FIELDS`, so neither
appears in `missing` and neither is a refusal — while `frozen`, `holdoutSpent`, `arms`, `pnlN`, `pnlNet`
and `monthsElapsed` all are.

The previous round's finding 6 established the principle: a verdict derived from a hole is worth less
than no verdict. These are the two remaining holes, and they are the two that implement the clauses
§11.6 and §11.2a exist for.

**Concrete input A — READY with the boundary never registered.** 30 cells × 5 controls × 2 shocks, 60
matched windows, `{arms:1, pnlN:50, pnlNet:5, monthsElapsed:6, frozen:true, holdoutSpent:false,
bootstrap:bootstrapCI}` and **no `boundary`, no `holdNRegistered`**:

```
status READY | code null | missing ["detPrecision"]
boundary: {"registered":null,"registeredOk":false,"moved":false,"why":"boundary computed; not yet registered by the caller","refuse":false}
holdN:    {"computed":30,"registered":null,"effective":30,"ratcheted":false,"movedDown":false}
```

`frozen:true` and an unregistered boundary are accepted together. By the time `nCal >= 30` the 30th
calibration window *has* been graded, which is the exact moment §11.6 says the boundary can no longer
move — the state "boundary computed, nobody registered it, verdict READY" is one §11.6 does not admit.

**Concrete input B — HOLDOUT becomes READY because the ratchet was not supplied.** 35 cells × 5 controls
× 2 shocks (cal 30, hold 40); control skills constant within a cell at `((c%13)−6)·0.0105`, shock skill
0.045. Then one extra control per cell arrives later at `−2×` that offset — every shock was already
matched, so the pair list, its order and the boundary stamp are **identical**:

```
run 1 (no 6th control):        sd 0.04086  need 46  -> HOLDOUT
run 2 (6th control, no ratchet):sd 0.02043 need 30  -> READY   dBrier 0.0474  ciLo 0.0407
run 2 with holdNRegistered:46:  need 46             -> HOLDOUT
```
(stable across seeds 31/32/33.)

§11.2a: "It may only ever move up." Here it moves 46 → 30 and the holdout "completes" at 40 windows on a
requirement that was never met. The ratchet is implemented correctly; it is simply switched off by
omission, silently, on the permissive side.

### 3. `shock` is the treatment-assignment flag and the only caller field with no type discipline; a truthy-but-not-`true` value moves a window from the treatment set into its own cell's control pool

**Where:** `scPairs` (code.js:412) `if(!w||w.shock!==true) continue;` and `scMatchControls`
(code.js:326) `if(c.shock===true){ bump(SC_OMIT.IS_SHOCK); continue; }`. The two tests are exact-`true`,
so any other truthy value falls through **both**: the window is not a shock, and it is not excluded from
the control pool.

The previous round hardened `phase` against exactly this (`bad-phase`, "1 and \"1\" must never pool"),
and the same argument applies with more force here: `phase` only selects which gate runs, `shock`
decides who is treated. `units/detect/code.js:244` returns `{shock:true, …}`, but `detect` is the phase-2
source and its shape is not what the unit is defending against — a caller mapping a detector score, a
CSV `"true"`, or a `1/0` column is.

**Concrete input.** One cell, five controls at skill 0, two shock windows — one where the tool wins
(+0.20) and one where it loses (−0.20). The honest DiD is 0.

```
clean (both shock:true)   n 2   controlled  0.00000
shock:1 on the LOSER      n 1   controlled +0.23333
```

The losing window vanishes from `ctrlTotal` (no `unmatched` row, no reason code, nothing in `missing`)
**and** joins the control mean, so both terms of the difference move the same way. `"true"`, `{}` and
`[]` behave identically. This is §7.4's retroactive side-picking reachable through a type coercion, and
unlike the §7.4 episodes it leaves no trace on the record.

### 4. An unmatched shock window with a missing or non-numeric `close` is counted on the **calibration** side of the holdout coverage

**Where:** `scAfterBoundary` (code.js:737–742) returns `false` unless `scNum(w.close)`, and `scCoverage`
routes a `false` to `out.cal`. `scPairs` copies `close` verbatim into the `unmatched` row, so a shock row
whose `close` is absent or a string is invisible to the holdout coverage count that decides the gate.

**Concrete input.** 30 cells × 2 shocks matched, plus 10 unmatched shock windows dated after the
boundary, identical except for `close`:

```
10 unmatched, well formed        holdout coverage 30/40 = 0.750 -> ABANDON
10 unmatched, `delete w.close`   holdout coverage 30/30 = 1.000 -> READY
10 unmatched, close = "17714..." holdout coverage 30/30 = 1.000 -> READY
```

The malformed rows are still refused as *pairs* (correctly — `scSkill` returns `bad-window`), so the
estimate is unaffected; it is only the coverage denominator that loses them, and it loses them in the
permissive direction. A row that cannot be placed relative to the boundary is not a calibration row; it
is a row whose side is unknown, and §11.2's coverage figure should refuse rather than assume.

### 5. Ungraded, void and no-refsnap shock windows are counted as **control-coverage** failures, so §11.7 clause 3 fires on something that is not a control-matching failure

**Where:** `scPairs` (code.js:414–421) pushes any shock window whose `scSkill` fails into `unmatched`
with its own reason code, and `scCoverage` counts every `unmatched` row against the denominator without
consulting that code.

§11.7 clause 3 closes the programme when "fewer than 80% of shock windows have 5 valid matched controls
— the comparison this section requires cannot be built". A window that settled `void` (§10.4), a window
still open, or a window whose only snapshots are post-gate has as many controls as any other; it simply
is not graded yet. §11.2's own list separates the two conditions ("n ≥ 30 **graded** holdout shock
windows" and "control coverage ≥ 80%").

**Concrete input**, same 60-window fixture with 10 holdout shock windows differing only in that field:

```
10 windows result:"void"      holdout coverage 30/40 = 0.750 -> ABANDON (11.7 clause 3)
10 windows with no `result`   holdout coverage 30/40 = 0.750 -> ABANDON (11.7 clause 3)
10 windows, snaps all tau<0   holdout coverage 30/40 = 0.750 -> ABANDON (11.7 clause 3)
```

Ungraded windows are the normal state of a recent export — every currently-live shock window is one —
so this compounds finding 1 rather than being independent of it: it enlarges the numerator of the false
closure with rows that have nothing to do with control matching. The reason codes to separate them are
already on each `unmatched` row (`ungraded`, `no-refsnap`, `thin-controls`); nothing reads them.

### 6. The registered boundary stamp does not fingerprint the calibration set, so a frozen quantity can be re-derived from a changed calibration half while the check reports "unchanged"

**Where:** `scSplitStable` (code.js:503–509) compares `{n, close, ticker}` only. `scSd` (code.js:549) is
then recomputed from whatever the calibration half currently contains.

The previous round's finding 5 is fixed for the case where the boundary *window* moves. The case where
the boundary window is the same but the calibration half's **contents** changed is not detected, and
§11.6 freezes the sd and every quantity derived from it, not the identity of the 30th window.

**Concrete input.** The finding-2B fixture, with `holdNRegistered:46` correctly supplied, so the ratchet
does its job:

```
run 1  sd 0.04086  registeredOk true  moved false  dBrier 0.04972  ciLo 0.04000  -> HOLDOUT
run 2  sd 0.02043  registeredOk true  moved false  dBrier 0.04736  ciLo 0.04086  -> HOLDOUT
       holdN {"computed":30,"registered":46,"effective":46,"ratcheted":true,"movedDown":true}
```

`rep.holdN.movedDown` is the *only* signal that anything changed, and it exists solely because the caller
happened to register a required n. The calibration sd halved and both holdout numbers moved, and
`rep.boundary` says `moved:false, registeredOk:true`. A stamp that included, say, the calibration
half's contributing control identities would catch it; the current one cannot.

### 7. `rep.ctrlMatched` / `rep.ctrlTotal` are the **pooled** figures while `rep.st.ctrlMatched` / `rep.st.ctrlTotal` are the **holdout** ones — and NOTES tells the caller to export the pooled pair

**Where:** `scReport` (code.js:849) sets `rep.ctrlTotal:P.ctrlTotal, rep.ctrlMatched:P.ctrlMatched` from
the whole recorded set, while `st` (code.js:884) receives `cov.hold.*`. `NOTES.md`'s wiring section says
"`rep.caveat`, `rep.known`, `rep.ctrlMatched`, `rep.ctrlTotal` and every `unmatched` row belong in that
export beside the estimate".

```
rep.ctrlMatched/ctrlTotal (POOLED):  60/65   = 0.923
rep.st.ctrlMatched/ctrlTotal (HOLDOUT): 30/35 = 0.857
```

Two identically-named pairs on one object, differing by denominator, and the one the NOTES route into
the CSV is the one §11.2 says is not the gate. The whole point of the S2 fix was that the pooled figure
is not the coverage that matters; it should not be the figure that travels with the number. `rep.coverage`
carries all three cuts correctly and is the field the export should name.

### 8. `holdoutSpent` truthy-but-not-`true` reads as **not spent**

`shockStatus` tests `st.holdoutSpent===true`, and `scAssemble` copies the caller's value verbatim (which
is right — defaulting it would be worse). But `SC_VERDICT_FIELDS` only requires the field to be
*present*, so the one value §11.6 uses to invalidate everything is accepted in any shape:

```
holdoutSpent:true    -> INVALID   (correct)
holdoutSpent:1       -> READY
holdoutSpent:"yes"   -> READY
```

`frozen` fails safe under the same treatment (`frozen:1` → FROZEN-PENDING) because only `=== true` opens
the gate; `holdoutSpent` fails open. It is the mirror image of the `bad-phase` check the previous round
added, on the field with the largest blast radius in §11.

### 9. §11.2a's 80%-power figure and its at-open feasibility test are computed nowhere

§11.2a: "The required holdout n is computed from it at 50% power **and reported alongside the 80%-power
figure**, so a barely-powered design is never mistaken for a good one" — and "If the required n cannot be
reached inside the §11.7 deadline, the programme closes at that moment rather than opening a holdout that
arithmetically cannot finish."

`scReport` calls `shockRequiredHoldN(sd, arms, 0.5)` (code.js:887) and nothing else. `rep.holdN` carries
`{computed, registered, effective, ratcheted, movedDown}` and no `n80`; `shockFeasible` — which already
returns `n80` and an `ok` against `maxMonths` — is never called by anything in the repository. On the
fixture above, `n@50% = 46` and `n@80% = 120`: the 80% figure is the one that says whether the design is
worth opening, and it is not on the report the caller is told to export.

### Minor, not worth blocking on

- **`scSd` on identical paired values returns 1.76e−17, not 0.** `shockRequiredHoldN` guards on
  `sd > 0`, so the "sd not measured on the calibration half → INVALID" refusal is reachable only at exact
  binary zero; a floating-point residue silently becomes the `holdN` floor of 30 instead.
- **Dedupe evasion.** `(ticker, open)` is the identity, so three real controls plus two copies with
  `open + 1` — or two copies under a renamed ticker — still give `n 5, matched true`. Both require the
  caller to corrupt an identity Kalshi supplies verbatim, so this is a residual limitation of the chosen
  key rather than a reachable defect; it is worth one line in NOTES beside the dedupe comment.
- **`arms:"20"`** refuses correctly (`no-arms` → `ciLo` null → INVALID) but `rep.status.ciLevel` still
  reports 0.995, because `shockStatus` coerces `"20" >= 1`. A refused call should not report a level.
- **Controls straddle the split.** A cell with shocks on both sides of the boundary uses the same control
  windows for the calibration sd and for the holdout estimate, and a control may postdate the holdout
  shocks it is matched to (same slot/weekday/quarter, later week). §11.6 defines the split on shock
  windows only, so the unit is following the registration — but the chronological separation it buys is
  weaker than §11.6's prose implies, and that is a §11 sentence to sharpen, not a code change.
- **`rep.status` is `null`** when `prereg` is absent (`scRatchetStatus` passes a null status through), so
  the documented `rep.status.status` read throws at the call site rather than returning a reason code.
  Unreachable under the prescribed splice order.

---

## What I checked and could not break, beyond Part 2

1. **The sign, again.** `scSkill` returns `bMkt − bTool`; on a fixture where the tool is unambiguously
   worse (−0.20) and one where it is unambiguously better (+0.20) the unit agrees with a DiD written from
   §11.2 to 1e−12. The `pmFor(skill)` inverse used throughout these fixtures is built from
   `skill = (q−y)² − (pm−y)²`, so every expected value in Part 3 is arithmetic, not measurement.
2. **Splice hygiene, re-derived.** 49 top-level declarations, all `sc*`/`SC*`, no internal duplicates,
   **zero collisions** with `index.html`'s declarations, zero non-ASCII bytes, zero arrow functions, zero
   backticks outside comments, and no `document` / `localStorage` / `fetch` / timer / `S.` reference in
   the comment-stripped source.
3. **`refSnap` parity.** `scRefSnap` matches `index.html:1383`'s rule including the tie-break (strict
   `<`, first snapshot wins) and the `phantom` / `tau < 0` skips, and adds a finite-`tau` guard the page
   does not have.
4. **Refusal completeness for the caller fields that *are* required.** Dropping each of `arms`, `pnlN`,
   `pnlNet`, `monthsElapsed`, `frozen`, `holdoutSpent` individually refuses; `detPrecision` blocks at
   phase 2 only. `arms:0.5`, `arms:Infinity` and `arms:"20"` all fail closed.
5. **Mixed series, mixed phase, absent phase, string phase** are all hard refusals with the right code.
6. **The unconditional aggregate** is still unreachable on its own: `scDid` attaches it only beside a real
   controlled estimate, and no other export returns an aggregate at all.
7. **Level/B/point discipline** — see Part 2.

---

## Verdict

**NOT safe to splice.**

Finding 2 is the fifth path to `READY` on evidence §11 does not permit, and it is the same shape as the
four the first round found: a permissive default on a field the document makes mandatory. Finding 3 is a
second one, reachable through a type coercion, and it moves the estimate itself rather than the gate.

Finding 1 is the one I would fix first even though it cannot produce a false READY, because it produces a
false **ABANDON**, and §11.7 makes that permanent and writes it into CLAUDE.md with its counts. It is also
the clearest instance of the thing the brief warned about: the S2 fix is correct in direction and moved
the failure to the other end of the same denominator. Whether the answer is a minimum holdout denominator
in `score` or a minimum n in `shockStatus` is a §11 registration decision, which is precisely why it has to
be settled before the splice makes the unit reachable — §11.6 prices it at the whole holdout afterwards.

Findings 4–8 are each smaller but all sit on the same fault line: every input this unit does not police is
policed on the permissive side. Nothing here has a shock-conditioned row behind it yet, so all nine are
still free.
