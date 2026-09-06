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

