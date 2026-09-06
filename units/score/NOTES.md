# Unit: `score` — the half that computes `st`

`code.js` is the exact block to splice. `node test.js` runs green: **453 assertions, 0 failed, exit 0**.
902 lines, 49 top-level declarations, pure ASCII (asserted), ES2019, no arrow functions, no template
literals. (Was 255 assertions and 545 lines before the 2026-09-06 adversarial review; §"What the review
changed" at the foot records every difference.) Pure: no DOM, no `localStorage`, no `fetch`, no timers, no `S`, no page helpers — the harness
stubs every page helper with **throwers** and `S`/`SEAS`/`document`/`localStorage` with throwing
Proxies, and a static scan over the comment-stripped source asserts the same thing textually.

It depends on **`calendar`** (for `controlEligible`) and **`prereg`** (for `SHOCK_RULE`, `shockCiLevel`,
`shockBootstrapB`, `shockStatus`, `shockPoolGuard`), and on `bootstrapCI` handed in from the page. A
third vm context loads it **alone** and asserts every path degrades to a reason code rather than
throwing.

## Why this unit exists

`shockStatus(st)` in `index.html` is **a judge that takes a verdict object nothing computes.** It
applies every §11 rule correctly to fifteen fields — `arms, ciLo, ctrlMatched, ctrlTotal, dBrier,
detPrecision, frozen, holdoutSpent, monthsElapsed, nCal, nHold, phase, pnlN, pnlNet, sd` — and nothing
in the codebase produces any of them. There is no control matcher, no difference-in-differences, no
holdout split, no paired Brier difference. The instrument records everything and can score nothing.

This is the other half. It computes `st` and hands it over. **It does not re-judge**: `shockStatus`
owns the verdict, this owns the arithmetic, and `scReport` calls `shockStatus` once at the end rather
than re-deriving any threshold. `shockStatus`'s contract was read first and is matched exactly; nothing
about it was redesigned.

## Why it is written now, before any data

§11.6 freezes every threshold, coefficient, detector parameter, **control-matching rule** and arm
designation the calibration set touched, and **spends the holdout** if any of them changes afterwards —
every window scored under the old freeze retired, the count restarted at zero. The control-matching
rule below is one of those rules. It is written now, with zero shock-conditioned rows in existence
anywhere, precisely so it cannot be fitted to a result. Nothing in `code.js` depends on having seen an
outcome, and no fixture in `test.js` contains real data, because none exists.

## THE SIGN — the most dangerous line in the unit

`shockStatus` tests `dBrier >= dBrierFloor && ciLo > 0` for READY, so **a positive `dBrier` must mean
the tool is better.** Brier is a *loss* — lower is better — so the subtraction has to run **market −
tool**, and writing the natural-sounding `(tool − market)` instead fires READY on the arm being
**worse** than the market.

§11.2 states `market − tool` explicitly and says so in words. It **did not until 2026-09-06**, when the
prose was corrected from `tool − market` after contradicting itself — so a reader working from an older
copy of the document will reach for exactly the wrong ordering, and this unit was written against the
correct one. `test/prereg.js` guards the document; `units/score/test.js` guards it again locally,
because this unit's sign depends on it.

The subtraction happens **exactly once**, in `scSkill()`, which returns `bMkt − bTool` and is named
`skill` rather than `dBrier` so the two orderings cannot be confused by reading a variable name. This is
the house convention, not a new one: `computeVerdict()`'s `dB` is already `(market − y)² − (model − y)²`.
`scDid()` reports both orderings side by side (`controlled` and `toolMinusMarket`, exact negations) so
the flip is visible rather than asserted in a comment.

Pinned by four assertions and one end-to-end pair:

| fixture | tool | market | y | tool Brier | market Brier | skill | verdict |
|---|---|---|---|---|---|---|---|
| unambiguously better | 0.80 | 0.50 | 1 | 0.04 | 0.25 | **+0.21** | positive |
| unambiguously worse | 0.40 | 0.90 | 1 | 0.36 | 0.01 | **−0.35** | negative |

and, through the full pipeline against a control mean of exactly 0.05: `controlled = +0.16` for the
better tool, `−0.40` for the worse one, whose `shockStatus` is **ABANDON**, not READY.

## Exports

| symbol | kind | notes |
|---|---|---|
| `SCORE` | const | `CTRL_MIN 5`, `CAL_N 30`, `CLEAR_HALF_MIN 45`, `REF_TAU_MIN 6`, `SLOT_MIN 15` |
| `SC_OMIT` | const | 22 reason codes; every refusal is countable, none is a default |
| `SC_CALLER_FIELDS` | const | the seven `st` fields the caller owns (the other eight are measured here) |
| `SC_VERDICT_FIELDS` / `scRequiredFields(phase)` / `scMissingRequired(missing,phase)` | const, fn | which caller fields the verdict actually depends on; `detPrecision` only at phase 2 |
| `SC_REFUSALS` / `SC_REFUSAL_WHY` / `scIsRefusal(code)` / `scRefused(code,why,k)` | const, fn | the codes that must be REPORTED as refusals, and the refusal object |
| `scHasOwn(o,k)` | fn | own-property lookup for every caller-keyed map |
| `scRowId(w)` / `scDedupe(rows)` | fn | window identity `(ticker, open)`, and first-occurrence-wins dedupe with a count |
| `scHasCalendar()` / `scHasPrereg()` | fn | is the neighbour spliced above us |
| `scSlotUtc(t)` | fn | UTC 15-minute slot, 0–95 |
| `scWeekdayUtc(t)` / `scQuarterUtc(t)` | fn | UTC weekday 0–6; `"YYYYQn"` |
| `scSeriesOf(ticker)` | fn | `"15m"` / `"hourly"` / `null` |
| `scMatchKey(w)` / `scKeyEqual(a,b)` / `scCellKey(w)` | fn | the four-dimension key, its equality, and the same four fields as one **cell** string |
| `scClearProbes(open,close,lenMin)` | fn | the instants dimension 3 is queried at |
| `scWindowClear(w)` | fn | `{clear, reason, known, probes}` — §11.3 dimension 3 |
| `scRefSnap(w)` | fn | `refSnap`'s rule, restated |
| `scSkill(w)` | fn | **market Brier − tool Brier** at `refSnap` |
| `scMatchControls(shock,pool)` | fn | `{n, controls, matched, reason, known, rejects}` |
| `scPhaseGuard(rows)` / `scSeriesGuard(rows)` | fn | §11.5 and §4: what may never be pooled |
| `scPairs(rows)` | fn | one paired difference per matched shock window |
| `scSplit(pairs)` / `scSplitStable(a,b)` / `scSplitCheck(computed,registered)` | fn | §11.6 chronological split; boundary-move detector; the registered-boundary gate `scReport` calls |
| `scRatchet(computed,registered)` / `scRatchetStatus(...)` / `scMaxMonths()` | fn | §11.2a's "may only ever move up", applied to the required holdout n and then to the judge's answer |
| `scAfterBoundary(w,b)` / `scCoverage(P,boundary)` | fn | which side of the boundary a recorded window sits on; coverage on the holdout, the calibration half and pooled |
| `scCells(pairs)` / `scClusterStat(cells)` | fn | the matching cells the CI resamples, and one two-stage replicate |
| `scSd(cal)` | fn | sample sd of the paired difference, calibration half, else `null` |
| `scDid(pairs)` | fn | the difference-in-differences (`controlled` = market − tool), the negation, and the unconditional sibling |
| `scCi(pairs,k,bootstrapFn)` | fn | **cluster** percentile bootstrap over matching cells, at `shockCiLevel(k)`, `shockBootstrapB` |
| `scAssemble(measured,opts)` | fn | `{st, missing}` — exactly fifteen fields, nothing defaulted |
| `scReport(rows,opts)` | fn | the whole pass, ending in `shockStatus` |

## The control matcher (§11.3), dimension by dimension

**All four, none optional, no weighting, no nearest-neighbour fallback.** A dimension that can be
relaxed under pressure is not a matching rule, it is a knob, and §11.6 froze the rule, not the knob.

1. **The same UTC 15-minute slot the shock window actually occupied.** The slot, never the ET release
   time. Match on ET and the control set slides *under* the treatment at each DST transition: 08:30 ET
   is UTC slot **50** from March to November and slot **54** from November to March — `SEAS` 1.007
   against 1.298, 1.14× in σ, for an identical event. Asserted with `etToUtc` from the real calendar.
   The key is cut on the window's **open** — the slot it occupied — not its close, which would mislabel
   every window by one slot.
2. **The same UTC weekday.** Claims are Thursday, payrolls Friday, FOMC Wednesday, all at fixed ET
   times, so weekday and slot are confounded in the release calendar and are held together or not at
   all. Holding the slot alone compares Thursday 12:30 against Monday 12:30 and calls the weekday
   effect a shock effect.
3. **No scheduled release in the control window or in the two windows either side.** Through
   `controlEligible(t)`, which §11.3 requires by name. See below — this is the one dimension with real
   arithmetic in it.
4. **The same calendar quarter** (`"YYYYQn"`, UTC), so the control carries the shock's volatility
   regime.

Plus §4's series split, which is enforced *inside the key*: an hourly window is never a 15-minute
window's control even when it opens in the same slot, on the same weekday, in the same quarter, and is
perfectly clear.

Both the slot and the quarter are computed from epoch arithmetic and `getUTC*`, never from local
getters. The suite re-runs `scSlotUtc`/`scWeekdayUtc`/`scQuarterUtc` in a **child process under
`TZ=Asia/Kolkata`** and requires identical answers, because under `TZ=UTC` a local-time implementation
is indistinguishable from a correct one.

### Dimension 3 is not one query, and assuming it is would be a silent bug

`controlEligible(t)` answers *"no release this table knows about is within `CAL_CONTROL_EXCL_MIN` = 45
minutes either side of `t`"*. For a **15-minute** window one probe at the open covers the required span
with room to spare: 45 minutes of clearance from one instant is ±3 windows and §11.3 asks for 2.

An **hourly** window is 60 minutes long, so window-plus-two-either-side is **300 minutes**, and one
probe covers 90. A single-probe implementation admits an hourly control with a release 90 minutes away
and reports it as clean. `scClearProbes` therefore **derives** the probe set from the window's own
length: cover `[open − 2L, close + 2L]` with instants spaced no more than `2 × CLEAR_HALF_MIN` apart —
the smallest set whose exclusion discs union to a contiguous span. A 15-minute window gets 1 probe, an
hourly window gets 4. The suite asserts the discs are contiguous and reach both ends, and pins the
concrete case: *an hourly window with a release 90 minutes past its close is not clear; one with a
release 200 minutes past its close is.*

### `known` travels with the number, always

The calendar is **partial** — no BLS series is in it — so `{eligible:true}` is not a certificate that a
window is clean, only that no release the table holds is near it. `controlEligible`'s `known` block
(the per-series spans and `CAL_PARTIAL_CAVEAT`) is carried out of `scWindowClear`, up through
`scMatchControls`, onto **every scored pair**, onto **every unmatched record**, and onto the report
itself. `inSpan` is **unioned across the probes**, because an hourly window's clearance span can start
inside one series' coverage and end outside it. Per §11.3 an unrecorded release inside a control window
biases the difference-in-differences **toward zero** — against finding an effect, never toward one —
but a null result cannot be read as "no effect" without saying how full the calendar was, and the
caveat is lost at the moment the number is read if it does not travel with it.

### The 5-control minimum

Below 5 eligible controls the shock window is **recorded**, marked `unmatched` with its reason and its
`known` block, and **excluded from scoring**. It is not scored against four controls and it is not
scored against the unconditional baseline. The unmatched record carries **no `skill` field** — putting
its score on the record beside the matched ones is how it gets scored by accident. Both counts feed
`ctrlMatched`/`ctrlTotal`, which is what §11.7 clause 3's 80% coverage rule reads; a fixture with
coverage stripped below 80% reads **ABANDON**.

## The paired difference, the split, and `sd`

`scPairs` produces **one number per matched shock window**: that window's `skill`, minus the **mean
skill of its own matched controls**. `scDid` averages them — so the difference-in-differences is a mean
of per-window paired differences, not a difference of two group means.

`scSplit` is §11.6's split: chronological, by **count**, first `CAL_N = 30` in time order, everything
after is holdout. Random splitting is forbidden — shock windows repeat monthly by release type, so a
random split puts June CPI in train and July CPI in test.

**Moving the boundary is made structurally hard, not merely discouraged.** `scSplit` takes **one
argument**. There is no `n` parameter, no options object, no override, and nothing a call site can pass
that changes where the line falls; the suite asserts `scSplit.length === 1`, so adding a parameter fails
the suite rather than shipping. The order key is the window's `close`, tie-broken by ticker, so the sort
is total and deterministic and does not depend on the order `localStorage` was enumerated in — shuffling
the input is asserted to produce an identical calibration set.

**A backfill is not the only way the boundary moves, and saying so was wrong.** Matched-ness is
recomputed from the *current* control pool on every call, so anything that changes whether an **old**
shock window still has five controls reshuffles the pair list and slides the count boundary. A control
ageing out of the buffer does it; so does one arriving late. Measured on a 35-cell fixture, pruning
exactly **one** old control row moved the boundary by one window and the required holdout n from **78 to
74** — and §11.2a says that number may only ever move **up**. Against §10.2's ~15-day `btc.edge` prune
and §8's ~15-month programme, control attrition is not a hazard the programme *might* hit; it is
guaranteed, repeatedly.

So the boundary is an **input once it exists**. This unit is pure and can persist nothing, so the caller
supplies `boundary` (the stamp `scSplit` returned when the 30th calibration window was graded) and
`holdNRegistered` (the required n written into `CLAUDE.md` §11.2a at that same moment). Before either is
registered, `scReport` reports what it computed and says it is unregistered. After, a disagreement
**stops the pass**: `scSplitCheck` refuses, nothing is scored against a boundary nobody registered, and
`rep.status` is `REFUSED / boundary-moved`. Whether that spends the holdout is §11.6's question and the
caller's to answer — this unit reports `moved` and refuses; the caller sets `st.holdoutSpent`.

`scRatchet` applies the other half: a registered required n is never traded down for a smaller
recomputed one, the downward computation is reported (`movedDown`) rather than hidden, and
`scRatchetStatus` applies the registered figure to the judge's answer — READY/NEGATIVE become HOLDOUT
when the registered n is not reached, or ABANDON when §11.7 clause 5's deadline has also passed. It may
only ever tighten: an INVALID, ABANDON, FROZEN-PENDING or CALIBRATING answer is untouched.

`scSd` is the **sample** sd (n−1) of the **paired** value, on the **calibration half alone**, and
returns `null` below 30. `shockRequiredHoldN(null, …)` returns `null`, `shockStatus` turns that into
INVALID, and the count check reads CALIBRATING first — so a short calibration set cannot open a holdout
through this path. n−1 matters: `shockRequiredHoldN` **squares** the sd, so the population form
understates the requirement.

## The CI — and the one statistics decision in this unit

Level and resample count come from **prereg**, not from here: `shockCiLevel(k)` and
`shockBootstrapB(level)`. k=1 gives 0.90 and B=200, identical to `VERDICT_RULE`'s one-hypothesis case;
k=20 gives **0.995 and B=4000**, the figures §11.2a states. **Neither moved.** What changed on
2026-09-06, before any observation exists, is the **resampling unit**.

### The resampling unit is the matching cell, not the window

Each paired value is `shock skill − mean(control skills)`. Resampling the **paired column alone** treats
that control mean as a *constant with zero sampling error*. But §11.3's four matching dimensions — same
UTC slot, same weekday, same quarter, same series — partition the tape into cells, and **every shock
window in a cell draws the same control set.** That is not a fixture artefact: §11.3 says in as many
words that scheduled releases cluster on the clock and the weekday, which is exactly what forces the
shocks into few cells. Inside a cell the control-mean term is not merely correlated across pairs — it is
*literally the same number*, estimated from as few as five windows.

Measured, on the reviewer's fixture (one cell; five controls with skills −0.24 −0.12 0 +0.12 +0.24; seven
shock windows reading alike):

| | 90% interval | width | `ciLo > 0` |
|---|---|---|---|
| window-level bootstrap | [+0.0341, +0.0341] | **0** | yes, with certainty |
| cluster bootstrap (5 fixed seeds) | covers zero on every seed | ≥ 0.08 | no |

The standard error of that single shared control mean is **0.0848 — 2.5× the point estimate itself.**
`shockStatus` tests `dBrier >= floor && ciLo > 0`, so the old interval passed **half the READY test with
certainty about a quantity the data does not establish.** That is §7.4's failure mode arriving through
the CI instead of through the backtest.

**Why the cell and not the window.** Shared controls induce within-cell dependence by construction; a
window-level bootstrap assumes an independence *the matching design destroys on purpose*. The cluster is
the smallest unit inside which the design is exchangeable.

**Two stages, both unseeded (§10.5).**

1. Resample the **cells** with replacement — this is the handed-in `bootstrapCI`, applied to an array of
   cells instead of an array of numbers, so the level, `B` and the percentile rule are untouched.
2. Inside each drawn cell, resample **its own controls** and **its own shock windows** with replacement
   and rebuild the paired values from the **re-estimated** control mean.

Stage 1 alone does not fix it: with a single cell every replicate is that same cell and the interval
stays degenerate. Stage 2 is what puts the control mean's sampling error into the interval. The cell's
shocks and its control set travel **together**, so no replicate ever pairs one cell's shocks against
another cell's controls. The **point estimate is not taken from the bootstrap** — it is the
deterministic mean of the observed paired values; a single draw of a stochastic replicate is not an
estimate. Stage 2's draw uses `Math.random`, the same unseeded source the page's `bootstrapCI` uses;
this unit still neither seeds it nor routes around it.

**The alternative that was rejected, stated so the choice is visible:** keep the window-level bootstrap
and register in §11 that `ciLo` is conditional on the control means, declaring the omitted variance
component. That is honest arithmetic and a dishonest gate — §11.2 uses `ciLo > 0` as half of READY, and
a bound that conditions away the dominant variance component is not evidence that the sign is
established. The cluster interval is **wider**, which is the correct direction for a bar meant to be
hard to clear.

**This is a §11.6-frozen quantity and it is being fixed now for that reason.** The primary statistic and
its interval are exactly what freezing covers; the identical change made after the holdout opened would
**spend the holdout**. There is no shock-conditioned row anywhere yet, so it costs nothing today. It
will not be free again. **When `score` is spliced, §11.2's primary-statistic paragraph should gain one
sentence naming the resampling unit** — this file is not the register of record, `CLAUDE.md` is.

**What did not change with it.** `scSd` is still the sample sd of the *paired* value on the calibration
half, and `shockRequiredHoldN` still squares that — both are prereg's pre-registered §11.2a arithmetic
and neither is this unit's to redefine. Clustering means the true required n is **larger** than that
formula returns (the effective sample size is nearer the number of cells than the number of windows), so
the ratchet below, and `scCi.cells` on every report, exist so the caller can see it. Recording the gap
rather than closing it is deliberate: closing it would move a pre-registered threshold.

### What the suite may assert about a bootstrap

Two kinds of claim hold for **every possible draw**, and those are still the backbone: a fully
degenerate sample (identical controls *and* identical shocks) has an interval that is a point, and an
all-positive sample has `lo > 0`. Beyond them, the harness installs a **seeded `Math.random` around one
block at a time** and restores it immediately — the seed lives in the *test*, never in the unit — and
every seeded claim is run over several fixed seeds, so none of them can be passing on a lucky one. The
one place a seeded assertion is a *statement about seeds* rather than about every draw is the realistic
grid, where the fixture's 0.03 edge is smaller than the 0.0415 standard error of its own five-window
control mean: the window-level bootstrap called it decisive on **40 of 40** seeds, the cluster bootstrap
is strictly less certain on **40 of 40** and covers zero on most of them, and the end-to-end verdict is
no longer READY every time. That is the finding, and it is stated as a seed count rather than dressed up
as a certainty.

## The refusals, and where each is asserted

| §11 requirement | how it is refused | assertions |
|---|---|---|
| No shock number against the unconditional baseline, ever (§11.3) | `scDid` computes the unconditional mean in a **local** and attaches it only on the branch where `controlled` is a real number; with no controlled estimate both are `null` | the suite scans **every export**, called across nine argument shapes, for the fixture's known unconditional mean (0.15, chosen not to coincide with any individual measurement) and requires it to appear nowhere |
| An unmatched window is never silently scored | `matched = n >= 5`; unmatched rows carry no `skill` | recorded / not in `ctrlMatched` / no pair produced |
| Phases are never pooled (§11.5) | `scPhaseGuard` (prereg's `shockPoolGuard` when present) | `scPairs` and `scReport` both refuse, and produce no `did` |
| Series are never pooled (§4) | `scSeriesGuard`, plus series inside the match key | refused in `scPairs`; an hourly window is not a 15-minute control |
| A short calibration set cannot open a holdout | `scSd` returns `null` below 30 | 29 pairs → `null`; report reads CALIBRATING |
| Nothing is defaulted to a permissive value | `scAssemble` copies caller fields verbatim, names the absent ones in `missing` | absent `frozen` → `undefined` → **FROZEN-PENDING**; absent `detPrecision` on phase 2 → **INVALID**; `frozen:"true"` is still refused |
| A void settlement is not a NO (§10.4) | `result === "yes" \|\| "no"` only | void and `null` both read `ungraded` |
| An empty-side book is not a quote (§10.3 K2) | `qm === 0` and `qm === 100` are refused before any Brier is formed | `empty-book`, and such a control is rejected and counted |
| Coverage is read on the **holdout alone** (§11.2) | `scCoverage` splits recorded windows on the boundary; only `hold` reaches `st`, and all three sides are reported | pooled 0.857 passes while holdout 0.750 abandons, with the pooled counterfactual asserted beside it; before a boundary exists the holdout is empty, the gate reads nothing, and `coverage.cal` is on the report so §11.7 clause 3 can still be asked during calibration |
| A row set with no `phase` is not scorable (§11.5) | `scPhaseGuard` refuses an absent or non-numeric phase before anything else | `no-phase` / `bad-phase`; and the assertion that a null phase sails past `shockStatus`, which is why the gate is here |
| A window is `(ticker, open)` (§10.2's overlapping exports) | `scDedupe` on the control pool and on the rows, first occurrence wins, drops counted | three windows in five rows do **not** meet the 5-control minimum |
| The boundary is registered, not recomputed (§11.6) | `scSplitCheck`; a disagreement stops the pass | pruning one old control row moves it, and the registered call refuses |
| The required n only ratchets up (§11.2a) | `scRatchet` + `scRatchetStatus` | a registered 999 turns the same evidence from READY into HOLDOUT |
| A hole is not a verdict | `scMissingRequired`; a missing verdict-bearing caller field is a refusal | omitting `holdoutSpent` refuses instead of reading absent as "not spent" |
| A refused call reports the refusal | `scIsRefusal` / `scRefused`, status `"REFUSED"` | a mixed-phase call no longer reads "CALIBRATING / calibration set incomplete" |

## Testing, and how it was checked

There is no real data and there never will be until the programme runs, so **every expected number is
derived by hand from the definition and written as a literal.** The control set is five windows with
market Brier 0.16 throughout and tool Briers 0.09/0.04/0.16/0.25/0.01, giving skills
+0.07/+0.12/0.00/−0.09/+0.15 and a mean of **exactly 0.05**; the shock window's skill is **+0.21**; the
paired difference is therefore **0.16**, asserted as a literal. Where the bulk grid needs more numbers
than are worth writing out, the expectation is built from `brier(p,y) = (p−y)²` — the definition, two
terms — and the sign, which is the thing that can silently invert, is pinned separately by the
hand-computed literals above.

Fixtures decoy on purpose. Every window's snaps carry a **phantom row at the `refSnap` target, placed
first**, a garbage read at the window's **midpoint** (which is where §4's own prose wrongly says
`refSnap` sits, before §10.2 corrects it), and a post-gate read at `tau < 0`. Any of `refSnap`'s three
rules going missing picks a different snap and changes the answer.

The matcher fixture carries six decoys, each violating exactly one rule: wrong slot, wrong weekday,
wrong quarter, release-in-shoulder, another shock window, and an ungraded window.

### Mutation testing

Each fix is reverted in a throwaway copy of `code.js` run against the unmodified suite. **No survivors.**
The seventeen below are the 2026-09-06 review's fixes; the eight after them are pre-existing rules
re-checked because the suite changed around them (the full thirty-mutation first-round table is in the
git history of this file — every one of those was killed then and the sample here confirms the suite did
not lose its grip while growing).

| mutation | assertions killed |
|---|---|
| S1 resample the paired column, not the matching cell | 12 |
| S1 resample cells but carry the control mean as a constant (stage 2 removed) | 10 |
| S2 coverage pooled over calibration and holdout | 5 |
| S3 an absent phase defaults to null instead of refusing | 7 |
| S4 no dedupe of the control pool | 6 |
| S4 no dedupe of the shock rows | 4 |
| S5 silently adopt a moved boundary instead of refusing | 5 |
| S5 no ratchet: the recomputed requirement wins | 7 |
| S5 `scSplitStable` exported but never wired into `scReport` | 7 |
| S6 compute the verdict even when a caller field is missing | 19 |
| S6 the mislabelled `no-prereg` code for a missing `k` | 3 |
| S7 answer a refused call on the window count | 10 |
| S8 the miscounted MEASURED/caller sentence | **1** |
| S9 take the CI over the shock skills, not the paired differences | 5 |
| S9 hand the unconditional aggregate back from `scPairs` | 2 |
| S10 score an empty-side book (`qm` 0 / `qm` 100) | 5 |
| S10 let `phase: 1` and `phase: "1"` pool | 4 |
| OLD flip the skill sign (market − tool becomes tool − market) | 47 |
| OLD `refSnap` targets mid-window | 65 |
| OLD calibration boundary moves from 30 to 10 | 39 |
| OLD the 5-control minimum drops to 1 | 7 + abort |
| OLD drop the series from the match key | 3 |
| OLD grade any truthy result (a void settlement becomes a NO) | 14 + abort |
| OLD sd measured on every pair, not the calibration half | 2 |
| OLD `dBrier` over every pair, not the holdout | 2 |

**S8 is killed by a single assertion and is recorded as thin**: it is a comment, and the only guard is
the assertion that reads `code.js` and requires "EIGHT are MEASURED here … SEVEN are the caller's" in
that order. A reader deleting that assertion removes the only thing holding the sentence to the count.
`+ abort` means the suite failed that many assertions and then stopped on a downstream `TypeError`.

## Wiring — how `index.html` should call this

**Splice position.** Add `"score"` to `ORDER` in `units/tools/resplice.js` (after `"prereg"`) and to
the `units` list in `units/run.js`, and insert the marker

```
/* ---------------- H protocol: score ---------------- */
```

into `index.html` immediately **above** the `/* ------- clock / loop */` anchor, so `prereg`'s block
ends at it and `score`'s block ends at the anchor. `score` must land **below** `calendar` and `prereg`,
because it reads `controlEligible`, `SHOCK_RULE`, `shockCiLevel`, `shockBootstrapB`, `shockPoolGuard`
and `shockStatus` from the same lexical scope.

**What it reads.** One array of window records for **one phase and one series**, built from
`S.edge.windows`:

```js
var rows = Object.values(S.edge.windows)
  .filter(function(w){ return (w.result==="yes"||w.result==="no") && w.snaps.length
                              && w.ticker.indexOf("KXBTC15M")===0; })
  .map(function(w){
    return {ticker:w.ticker, open:w.open, close:w.close, result:w.result, snaps:w.snaps,
            phase:1,
            shock: releasesBetween(w.open, w.close).length > 0};   /* phase 1: the calendar decides */
  });
```

`shock` is the **caller's** field, not this unit's: deciding what a shock *is* belongs to `calendar/`
(phase 1, a release inside the window) and `detect/` (phase 2, its own detector). Phase 2 builds the
same array with `phase:2` and its detector's flag, into a **separate** call — §11.5 forbids pooling, and
`scPairs` refuses a mixed array rather than merging it. Hourly windows are a third separate call.

**The caller-supplied `st` fields**, none of which this unit may invent:

| field | where it comes from |
|---|---|
| `arms` | the number of arms scored in the phase, counted whether or not labelled primary (§11.4). Today that is `SIM`'s 10, or 20 after the spine's expansion — **not** 1 |
| `pnlN`, `pnlNet` | the paper simulation's holdout entries and net, fees as §4 charges them, per-contract rounding as §7.5 requires |
| `detPrecision` | phase 2 only: precision of the detector against the phase-1 calendar (§11.5). Absent → `INVALID`, which is correct |
| `monthsElapsed` | months since the **first recorded shock window** (§11.7 clause 5) |
| `frozen` | `true` only once every threshold, coefficient, detector parameter, matching rule and arm designation is frozen and stamped in `CLAUDE.md` §11 with a build stamp (§11.6). **Absent must stay absent** — defaulting it to `true` opens a holdout nobody froze |
| `holdoutSpent` | `true` if any frozen quantity changed after the holdout opened, or if `scSplitStable` reports the boundary moved after it opened |
| `bootstrap` | the page's `bootstrapCI`, passed straight in. It now receives an array of **matching cells**, not an array of numbers — it resamples what it is given, so nothing about it changes |
| `boundary` | §11.6's registered split stamp, `{n, close, ticker}`, exactly as `rep.split.boundary` returned it when the 30th calibration window was graded. **Persist it the moment it first appears and pass it on every later call**; a disagreement is refused, not adopted |
| `holdNRegistered` | §11.2a's registered required holdout n, written into `CLAUDE.md` with its date at the same moment. It ratchets: a smaller recomputed value never wins |

```js
var rep = scReport(rows, {arms:20, pnlN:n, pnlNet:net, monthsElapsed:m,
                          frozen:false, holdoutSpent:false, bootstrap:bootstrapCI,
                          boundary:registeredBoundary,        /* null until the 30th window is graded */
                          holdNRegistered:registeredHoldN});  /* null until 11.2a is written */
```

**Every caller field the verdict depends on must be supplied**, or `rep.status.status` is `"REFUSED"`
with `rep.status.code === "missing-caller-fields"` naming the holes: `arms`, `pnlN`, `pnlNet`,
`monthsElapsed`, `frozen`, `holdoutSpent`, and `detPrecision` at phase 2. `"REFUSED"` is deliberately
**not** one of `shockStatus`'s statuses — it is this unit declining to hand the judge an input it does
not have, and a caller switching on the seven real statuses sees an unknown string, which is safe in the
only direction that matters: it is not READY. `rep.dupRows`, `rep.coverage` (holdout, calibration and
pooled) and `rep.holdN` belong in the export beside the estimate.

**Every row must carry a numeric `phase`.** An absent one is refused (`no-phase`) and a string one is
refused (`bad-phase`) — `shockStatus` compares with `===`, so `"2"` would skip §11.5's phase-2 gate
exactly as a null phase did.

**Where the result belongs: nowhere on screen.** `rep.status.status` will read `CALIBRATING` for
months, then `FROZEN-PENDING`, then `HOLDOUT`. That is the correct answer and §7.6 says it must not be
softened. `scReport` renders nothing, stores nothing and decides nothing. It is a **CSV/export-time
computation**, exactly as §10.2 records for the other H-protocol columns: derived from each row's own
measurements when the file is written, so it costs the recorder no bytes and always reads against the
release calendar as it stands at export time. `rep.caveat`, `rep.known`, `rep.ctrlMatched`,
`rep.ctrlTotal` and every `unmatched` row belong in that export beside the estimate — per §11.3 the
caveat travels with the number or it is lost.

If a status ever *is* surfaced, it is `rep.status.status` and `rep.status.why` verbatim, with the
coverage fraction and the caveat beside them, and never a bare `dBrier`.

**No execution path.** Nothing here arms, prices, sizes, highlights or suggests anything, and this unit
does not add one.

## Deliberately NOT done

- **No UI, no rendering, no `localStorage`.** §7.6, and the status will read NOT READY for months.
- **No arm.** This unit scores an arm handed to it; it defines none. Which rule fires on a shock window
  is a §11.4 designation that costs `k`, and inventing one here would be choosing the arm before the
  data exists.
- **No `shock` detection.** `calendar/` and `detect/` own that; taking it here would let a scoring unit
  decide its own treatment assignment.
- **No re-judging.** No threshold from `SHOCK_RULE` is re-implemented, no verdict is derived, and
  `shockStatus` is called once with the assembled `st`.
- **`bootstrapCI` is not seeded and not replaced.** §10.5: resampling variation is a property of the
  method. The suite was written around that constraint instead.
- **The unconditional shock figure is not exposed on its own, and no "just for diagnostics" accessor
  was added for it.** §11.3 is categorical, and a diagnostics accessor is how a forbidden number gets
  reported.
- **No promotion, labelling or `exploratory` handling.** `shockTag`/`shockCsvFlag`/`shockMayHeadline`
  already exist in `prereg/`; duplicating them here would create a second definition of a §11.4 rule.
- **Phase 2's confusion matrix is not computed here.** It is a detector property scored against the
  phase-1 calendar; this unit consumes `detPrecision` and refuses without it.
- **`scSd` and `shockRequiredHoldN` are not made cluster-aware.** §11.2a's power arithmetic is
  pre-registered on the sd of the paired difference, and rewriting it here would move a threshold rather
  than fix a bug. The gap is *reported* instead — `rep.ci.cells` beside `rep.ci.n` says how much smaller
  the effective sample is than the window count — and the §11.2a ratchet is the mechanism for raising the
  requirement once a real `sd` exists. Recorded as a known understatement, not closed.
- **The registered boundary and required n are not persisted here, and cannot be.** The unit is pure.
  They are caller state, and the caller that does not persist them gets an unregistered pass that says so.
- **No re-gating of old rows.** A window is scored under the rule in force when the pass runs; this unit
  stores nothing, so the export, as §10.2 already records for the other H-protocol columns, is the record.

## What the 2026-09-06 adversarial review changed

`REVIEW.md` found ten defects, four of which reached `READY` on evidence §11 does not permit. All ten
are closed here, each with the reviewer's own input turned into a regression assertion, and each
mutation-tested. **None of it cost anything, because no shock-conditioned observation exists and no
holdout is open — §11.6 is explicit that the same corrections after a holdout opened would have spent
it.** That is the whole argument for doing this before the splice rather than after.

| # | finding | what it did | closed by |
|---|---|---|---|
| S1 | the bootstrap could not see the sampling error in the **shared** control means | a 90% interval of width **exactly zero** with `ciLo = +0.0341`, against a shared-control-mean standard error of 0.0848 — half the READY test satisfied with certainty | **cluster bootstrap over matching cells**, two stages, level and `B` unchanged |
| S2 | control coverage pooled over calibration **and** holdout | pooled 0.857 passed and read READY while holdout-only 0.750 should have abandoned | `scCoverage`; only the **holdout** figure reaches `st`, all three are reported |
| S3 | a row set with `phase` omitted skipped §11.5's phase-2 gate | `st.phase` came back `null`, `if(st.phase===2)` never ran, a phase-2 arm reached READY with no confusion matrix | absent or non-numeric `phase` is a hard refusal, like every other §11.5 dimension |
| S4 | nothing deduplicated | three distinct control windows present twice satisfied the 5-control minimum; a cloned shock scored twice | `scRowId` / `scDedupe` on the pool **and** the rows, drops counted |
| S5 | the split boundary moved under ordinary control churn | pruning one old control row moved the required holdout n **80 → 44**, which §11.2a forbids | the boundary is a caller **input** and a disagreement refuses; the required n **ratchets**; `scSplitStable` is wired into `scReport` |
| S6 | `scReport` returned READY while `missing` was non-empty | omitting `holdoutSpent` let §11.6's spent-holdout flag default to the value that advances the programme | a missing verdict-bearing field is a **refusal**; `no-prereg` for an absent `k` is now `no-arms` |
| S7 | a mixed-phase call reported `CALIBRATING` | a benign progress message for a call §11.5 forbids outright | refusals report themselves as `REFUSED` with their code |
| S8 | "Seven are MEASURED here; eight are the caller's" was backwards, an assertion name contradicted its value, `NOTES` had the line count wrong | a reader auditing by assertion name was told the wrong number | all three corrected, and the source sentence is now asserted from disk |
| S9 | the unconditional-leak scan was **vacuous** (it ran where every window was unmatched), and several grid assertions compared the unit to itself | the interesting half — a controlled estimate exists — was untested; `st.ciLo === rep.ci.lo` cannot fail | the scan is rebuilt on a **matched** fixture and requires the unconditional figure never to appear without its controlled sibling; `sd` and `ciLo` are pinned against independently derived values |
| S10 | `qm 0` / `qm 100` were scored; `phase: 1` and `phase: "1"` pooled | §10.3 K2's empty-side book became a Brier of exactly 1 or 0 | `empty-book` refusal; strict numeric phase check |

Two things the review got right that are **not** fixed and are recorded instead: `shock` is still
caller-supplied and never cross-checked against `releasesBetween` (treatment assignment belongs to
`calendar/`), and `scClearProbes`'s `-1` can leave a 1 ms sliver for a window that is not minute-aligned
(unreachable for Kalshi windows).
