# Unit: `score` — the half that computes `st`

`code.js` is the exact block to splice. `node test.js` runs green: **255 assertions, 0 failed, exit 0**.
545 lines, 30 top-level declarations, pure ASCII (asserted), ES2019, no arrow functions, no template
literals. Pure: no DOM, no `localStorage`, no `fetch`, no timers, no `S`, no page helpers — the harness
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
| `SC_OMIT` | const | 14 reason codes; every refusal is countable, none is a default |
| `SC_CALLER_FIELDS` | const | the seven `st` fields the caller owns |
| `scHasCalendar()` / `scHasPrereg()` | fn | is the neighbour spliced above us |
| `scSlotUtc(t)` | fn | UTC 15-minute slot, 0–95 |
| `scWeekdayUtc(t)` / `scQuarterUtc(t)` | fn | UTC weekday 0–6; `"YYYYQn"` |
| `scSeriesOf(ticker)` | fn | `"15m"` / `"hourly"` / `null` |
| `scMatchKey(w)` / `scKeyEqual(a,b)` | fn | the four-dimension key and its equality |
| `scClearProbes(open,close,lenMin)` | fn | the instants dimension 3 is queried at |
| `scWindowClear(w)` | fn | `{clear, reason, known, probes}` — §11.3 dimension 3 |
| `scRefSnap(w)` | fn | `refSnap`'s rule, restated |
| `scSkill(w)` | fn | **market Brier − tool Brier** at `refSnap` |
| `scMatchControls(shock,pool)` | fn | `{n, controls, matched, reason, known, rejects}` |
| `scPhaseGuard(rows)` / `scSeriesGuard(rows)` | fn | §11.5 and §4: what may never be pooled |
| `scPairs(rows)` | fn | one paired difference per matched shock window |
| `scSplit(pairs)` / `scSplitStable(a,b)` | fn | §11.6 chronological split; boundary-move detector |
| `scSd(cal)` | fn | sample sd of the paired difference, calibration half, else `null` |
| `scDid(pairs)` | fn | the difference-in-differences (`controlled` = market − tool), the negation, and the unconditional sibling |
| `scCi(pairs,k,bootstrapFn)` | fn | percentile bootstrap at `shockCiLevel(k)`, `shockBootstrapB` |
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

The remaining way a boundary moves is a **backfill**: a window recorded late but dated before the 30th.
`scSplit` stamps the boundary it used and `scSplitStable` compares two stamps. Under §11.6 a boundary
that moved after the holdout opened is a post-freeze change, which **spends the holdout** — but that is
not this unit's call to make. It reports `moved`; the caller sets `st.holdoutSpent`.

`scSd` is the **sample** sd (n−1) of the **paired** value, on the **calibration half alone**, and
returns `null` below 30. `shockRequiredHoldN(null, …)` returns `null`, `shockStatus` turns that into
INVALID, and the count check reads CALIBRATING first — so a short calibration set cannot open a holdout
through this path. n−1 matters: `shockRequiredHoldN` **squares** the sd, so the population form
understates the requirement.

## The CI

Level and resample count come from **prereg**, not from here: `shockCiLevel(k)` and
`shockBootstrapB(level)`. k=1 gives 0.90 and B=200, identical to `VERDICT_RULE`'s one-hypothesis case;
k=20 gives **0.995 and B=4000**, the figures §11.2a states. The bootstrap itself is the page's
`bootstrapCI`, passed in (a unit may not reach a page global) and **deliberately unseeded** per §10.5 —
this unit neither seeds it nor routes around it.

Which forces a discipline on the suite: **every bootstrap assertion holds for every possible draw.**
A degenerate sample (all paired values identical) has an interval that is a point, exactly, whatever the
RNG does. An all-positive sample has `lo > 0` on every draw. Those are the only two kinds of bootstrap
claim an unseeded RNG permits, and they are the two the suite makes. A spy bootstrap additionally pins
that the values resampled are the **paired differences** and not the raw shock skills, and that the
level and B handed to it are the ones prereg computes.

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

Thirty mutations, each reverting one rule in a throwaway copy of `code.js` run against the unmodified
suite. **All thirty are killed; there are no survivors.** `+abort` means the suite failed that many
assertions and then aborted on a downstream `TypeError`.

| mutation | assertions killed |
|---|---|
| refSnap targets mid-window instead of 6 minutes remaining | 40 |
| refSnap stops skipping phantom rows | 39 |
| **flip the `dBrier` sign** | **31** |
| move the calibration boundary from 30 to 10 | 18 |
| grade any truthy result (a void settlement becomes a NO) | 13 + abort |
| drop dimension 3 (release clearance) from the matcher | 12 + abort |
| drop the SLOT / WEEKDAY / QUARTER matching dimension | 11 + abort (each) |
| randomise the holdout split | 7–10 (the mutation is itself random) |
| lower the 5-control minimum to 1 | 7 + abort |
| let a shock window serve as a control | 6 |
| drop the SERIES check in the match key | 2 |
| score unmatched windows anyway | 5 + abort |
| probe clearance once, at the window open | 5 |
| take the CI over the shock skills, not the paired differences | 5 |
| hardcode the CI level instead of using `shockCiLevel` | 4 |
| drop the sd floor below 30 calibration windows | 4 |
| hardcode B instead of using `shockBootstrapB` | 3 |
| default `frozen` to true | 2 |
| use the population sd (n) not the sample sd (n−1) | 2 |
| pool the phases | 2 |

| match on the window close instead of the open | 2 |
| measure sd on all pairs, not the calibration half | 2 |
| compute `dBrier` over all pairs, not the holdout | 2 |
| leak the unconditional mean on the refusal branch | 2 |
| pool the series | 1 |
| use local time for the UTC slot | 1 |
| expose the unconditional mean as its own function | 1 |
| hand the unconditional mean back from `scPairs` | 1 |

The last four are killed by a **single assertion each**. That is thin and is recorded as thin: the
local-time mutation is caught only by the `TZ=Asia/Kolkata` child process, and the two
unconditional-leak mutations only by the generic every-export scan. Both of those assertions are
structural rather than enumerated — the scan iterates `Object.keys`, so a leaking function added later
is caught too — but a reader deleting either one silently removes the only guard on its rule.

Four mutations **survived the first round** and the suite was strengthened until they did not: dropping
the series check from the match key, exposing the unconditional mean as a new function, using local time
for the slot, and matching on the window close instead of its open. Recorded because "the mutation
survived" is the finding, not the fix.

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
| `bootstrap` | the page's `bootstrapCI`, passed straight in |

```js
var rep = scReport(rows, {arms:20, pnlN:n, pnlNet:net, monthsElapsed:m,
                          frozen:false, holdoutSpent:false, bootstrap:bootstrapCI});
```

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
