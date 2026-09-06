# Unit: `reversal` — H1 shock-magnitude reversion (the scoring half)

`code.js` is the exact block to splice. `node test.js` runs green: **245 assertions, 0 failed, exit 0**.
450 lines, 21 top-level declarations, pure ASCII (asserted), ES2019, no arrow functions, no template
literals, no `?.`/`??` (all asserted over the comment-stripped source).

Pure: no DOM, no `localStorage`, no `fetch`, no timers, no `S`, no `SEAS`, no page helpers. The harness
stubs every page helper — including `kFee`, `strikeProbs` and `refSnap` — with **throwers**, plus `S`,
`SEAS`, `document` and `localStorage` as throwing Proxies, so any accidental reach fails the suite
loudly. Static checks over the comment-stripped source assert the same thing textually.

**It depends on `detect` and on nothing else.** `detect/code.js` is loaded into the same vm context in
the same script, exactly as the splice lands in `index.html` (one `<script>`, one lexical scope, detect
above reversal). A second context loads `reversal` **alone** and asserts it degrades to the reason code
`nodetect` rather than throwing.

## Why this unit exists

`detect`'s notes end with: *"No reversal/H1 outcome measurement. This unit detects and sizes; it does
not score."* This is the scoring half. It re-uses `shockMagnitudeBucket` for the bins and `shockScale`
for the scale, calls neither `detectShock` nor `standardisedMove`, and **defines no bucket edge and no
size threshold of its own** (asserted by source scan).

The claim under test is not "reversal exists". Roll 1984 / Jegadeesh-Titman 1995 / Eross et al. say
reversion after a large move is real but **usually too small to survive costs — occasionally enough**.
H1 therefore lives in the *tail* of shock sizes, and the answerable question is whether mean reversion
crosses **round-trip cost** only in the top buckets. Its falsifier is that reversion is **flat** across
buckets, or scales so gently it never clears cost even at the largest observed shock. Both readings need
cost **on the row**, in the same unit as the reversion it is compared against — which is why
`revRoundTripC` lives here rather than being assumed downstream. The suite asserts the instrument can
express **both** outcomes: a fixture with a constant give-back fraction reads flat across all five
buckets, and a fixture with a rising one reads monotone, with net-of-cost negative in the bottom bucket
and positive in the top.

## Exports

| symbol | kind | notes |
|---|---|---|
| `REV` | const | pre-registered horizons and cost model (below) |
| `REV_HORIZONS_MIN` | const | `[3,5,12]` — bounds derived, primary named |
| `REV_OMIT` | const | 15 reason codes; every one is a *countable* refusal |
| `revHasDetect()` | fn | is `detect` spliced above us |
| `revShockKey(tShock)` | fn | ms → the anchor bar key, or `null` |
| `revKeyIndex(keys,k,len)` | fn | binary search over ascending minute keys, or `-1` |
| `revLeg(keys,closes,kFrom,spanMin)` | fn | `{ret,spanMin,k0,k1,p0,p1,code}` — key-anchored log return |
| `revImpulse(keys,closes,kShock,sigPerMin,impulseMin)` | fn | `{ret,z,absZ,…,bucket,bucketLabel,sigLagged,code}` |
| `revReversion(keys,closes,imp,revMin,tauAtShockMin)` | fn | `{rev,revZ,revFrac,laterRet,cont,…,code}` |
| `revFeeC(pC,rounded)` | fn | one leg's taker fee **in cents**, or `null` |
| `revRoundTripC(entryC,exitC,spreadC,basis)` | fn | `{feeC,feeRawC,spreadCostC,costC,costRawC,legs,basis,code}` |
| `revBookLeg(book)` | fn | `{grossC,costC,netC,netRawC,clears,clearsRaw,…,code}` |
| `revMeasure(keys,closes,opts)` | fn | one shock → one row (the composer) |
| `revAccumulator(opts)` / `revAccumulate(acc,row)` / `revBucketTable(acc)` | fn | the per-bucket table |

`revNum`, `revInt`, `revSgn`, `revOmitCount`, `revBucketSlot` are internal and exported only because a
spliced block has no module boundary. Every top-level name matches `^rev|^REV` (asserted), and a
`grep` of `index.html` for `function|const|let|var <name>` returns nothing for all 21 (asserted, and
skipped gracefully if `index.html` is absent).

Splice anywhere at top level **below `detect`**. `REV`, `REV_HORIZONS_MIN` and `REV_OMIT` are `const`,
so they are in TDZ until the script reaches them — fine, since every call site runs from `init`/`loop`
after full evaluation, but do not call these from a top-level statement placed above the block.

---

## THE TWO THINGS A LATER READER WILL ASSUME WRONGLY

### 1. Reversion on the TAPE is not reversion in the KALSHI PRICE

These are different numbers and they are not proportional.

The binary is a **probability**, not the underlying. Its price is a monotone but strongly non-linear
function of spot: the sensitivity `dp/dS` is near zero when the strike is far away or when `tau` is
nearly gone, and it peaks at the money — where it *diverges* as `tau -> 0`. So one fixed tape give-back
of, say, 20 bp is worth anywhere from **zero cents to tens of cents** depending on where the strike sits
and how much of the window is left, and near the gate the contract **pins toward 0/1** and can capture
essentially none of a give-back the tape performs perfectly.

For H1 specifically this is worse than a nuisance, and it runs in a direction that matters:

> The larger the shock, the further spot has been pushed from the strike, and the **smaller** the
> contract's sensitivity to the give-back that follows. The tail buckets — the ones H1's entire
> mechanism lives in — are systematically the buckets whose Kalshi price has already moved toward its
> pin and can monetise the least of the reversion.

A study that measured only the tape would therefore make H1 look **best exactly where it is least
tradeable**. That is not a caveat to add later; it is the reason both legs are measured here.

### 2. Which one this unit measured — **both**, in separate fields, and only one of them may be compared with cost

| | field(s) | unit | what it is for |
|---|---|---|---|
| **TAPE** | `rev`, `revZ`, `revFrac`, `laterRet` | log-return / sigma | the **mechanism**, and the axis `detect` buckets on. It is what makes "monotonic in shock size" a meaningful sentence. |
| **BOOK** | `grossC`, `costC`, `netC`, `clears` | Kalshi **cents** | the **money**. It is the only leg comparable with cost. |

**The paper-sim arm would trade the BOOK**, so the book leg is what answers "clears cost". The arm in
the spine is `SIM_ENTRY`-shaped: it buys a side of the live Kalshi window at the ask and exits on
`box`/`trail`. Its bankroll moves in cents of that contract; it never holds BTC and never realises a
tape return. Any statement of the form "reversion clears the round trip" is therefore a statement about
`netC`, and the tape numbers cannot substitute for it under any transformation the row carries.

The tape leg is kept because it is the only axis on which the *hypothesis* is stated — Roll and
Jegadeesh-Titman are about the underlying, `detect` buckets on the underlying, and a book-only study
could not say whether size-conditioning works at all, only whether one particular contract paid.

**Enforced, not merely documented:** cost never touches the tape leg anywhere in this code, the
accumulator keeps `nTape` and `nBook` as separate counts, and `revBucketTable` reports `meanRev`,
`meanRevZ`, `meanRevFrac` beside `meanGrossC`, `meanCostC`, `meanNetC` without ever combining them. A
single `n` spanning both would let a bucket show a mean reversion over 40 rows next to a mean cost over
3 and invite the reader to subtract them.

---

## The horizons (pre-registered, named constants)

| constant | value | why |
|---|---|---|
| `REV.IMPULSE_MIN` | 1 | **Not a choice.** The spine *defines* shock magnitude as "BTC's move in the minute after a known news timestamp". |
| `REV.REVERSION_MIN` | 5 | the **primary** horizon. A judgment, named as one (below). |
| `REV_HORIZONS_MIN` | `[3,5,12]` | floor and ceiling derived; see below |
| `REV.WINDOW_MIN` | 15 | the KXBTC15M window — a description of the instrument, not a tunable |
| `REV.TIME_STOP_MIN` | 1.5 | `SIM`'s existing T−1:30 time-stop — likewise |

**The bounds are arithmetic, not taste.** The floor 3 is the shortest span carrying three one-minute
returns; a two-return reversion is one bar's noise wearing a horizon's name. The ceiling is the fit
rule: a shock landing at the very open of a 15-minute window leaves 15 minutes, the impulse consumes 1,
and the simulation's time-stop is T−1:30, so the tradeable span after the impulse is
`15 − 1 − 1.5 = 12.5` minutes. **12 is the largest whole horizon inside it and 13 is outside** — both
asserted. A 13-minute reversion would describe a trade that could not be taken.

**Which of the three is primary is a judgment and is named as one.** 5 sits between the bounds and is
designated primary **now, before any observation**, so that reporting all three later does not become
three shots at one hypothesis. Under §11.4 `k` counts arms whether or not they are labelled: the two
non-primary horizons are **exploratory** in §11.4's exact sense, and any consumer must carry that word
onto the row and into the CSV, exactly as §11.4 requires of an exploratory arm.

**The fit rule is enforced twice.** `impulseMin + revMin` must not exceed `WINDOW_MIN` (structural), and
when the caller supplies `tauAtShockMin` — the minutes actually left in the live Kalshi window at the
shock — it must not exceed `tau − TIME_STOP_MIN` either. A row that does not fit returns `nofit` and
carries **no reversion at all**; it is never measured and then quietly averaged beside rows that did
fit.

**Rows measured at different horizons are never pooled.** `revAccumulate` locks to the first row's
`(impulseMin, revMin)` and refuses any later row with different ones, counting `horizon`. A 3-minute and
a 12-minute reversion cannot end up in the same mean.

## Cost: which model, and it is two legs

**Two legs, deliberately.** H1's arm fades the impulse and exits on `box`/`trail` **before the gate**, so
it is a round trip and pays entry and exit. §4's one-leg model applies to hold-to-settlement, which this
is not. `REV.LEGS = 2` is the constant and it is asserted.

**Both rounding models are reported, and neither is chosen here.**

- `feeC` / `costC` / `netC` / `clears` — §7.5's per-order round-up: `ceil(7·p·(1−p))` cents. This is
  exactly `index.html`'s `kFee` in cent units; the suite reimplements `kFee` independently and asserts
  the two agree at **every whole cent from 0 to 100**.
- `feeRawC` / `costRawC` / `netRawC` / `clearsRaw` — the unrounded `0.07·p·(1−p)` the swing/sim journal
  charges on both legs.

§7.5 records that modelling the round-up per contract turned a 0.44¢ fee into 1¢ and **inverted a
result**. The suite asserts that the two models still disagree about `clears` for real integer prices,
so a silent choice would hide a live failure mode rather than a theoretical one. Consumers must report
which they used.

**The spread double-count trap** is why `basis` is required and has no default:

| `basis` | meaning | `spreadCostC` |
|---|---|---|
| `"ask-bid"` | the caller's gross was measured buying at the ask and selling at the bid, so the spread is **already inside it** | 0 |
| `"mid-mid"` | the gross was measured mid to mid, so the spread has **not** been paid | the supplied `spreadC` (required) |
| anything else | — | refused, code `basis` |

A defaulted basis would silently double or halve the hurdle that decides H1's entire claim. A wrong
hurdle is worse than a missing one, so an undeclared basis produces no cost at all.

## The per-bucket accumulator

`revAccumulator()` → `revAccumulate(acc,row)` → `revBucketTable(acc)`.

- **One row per pre-registered bucket, in `SHOCK_LABELS` order, including buckets with n = 0.** An
  empty tail bucket is the most important cell in the table and must be *visibly* empty rather than
  missing. Means are `null` when n is 0 — a zero mean would read as "measured, and it was zero".
- **The tail buckets are never merged.** `detect` keeps `z4-6` and `z6+` apart because the tail is where
  the mechanism is claimed to live; merging them here would delete the hypothesis one layer further
  down. Asserted: two rows, n = 1 each, different means.
- A bucket label the canonical list does not contain is **appended** to the table rather than dropped,
  so an upstream invention is visible instead of silent.
- **Rows refused, and the refusal counted:** unknown bucket (`nobucket`), non-lagged scale (`capped` —
  `detect`'s D1: a capped `z` is not comparable with an uncapped one, and pooling them flattens exactly
  the tail the table exists to show; pass `{requireLagged:false}` for a deliberately mixed table),
  mismatched horizons (`horizon`), and any impulse-level code.
- Omissions are counted **per leg**, so one row can contribute to two codes (e.g. `bars` for the tape
  leg and `noquote` for the book leg). `acc.omit` totals can therefore exceed `acc.nSeen`; that is
  intended and is what makes each leg's coverage separately readable.
- Nothing is ranked, sorted by result, or highlighted. **Five buckets is five cells and §7.6 applies to
  every one of them.**

## H1's `[TBD]` shock-size percentile — not invented, recorded

The spine writes `[TBD]` for H1's shock-size percentile *because nobody has the data to set it*.
Inventing one is what §11.7 clause 6 and §4 forbid.

This unit therefore contains **no percentile, no size cut-off, no minimum `z`, and no verdict on size**
(asserted by source scan for `PERCENTILE|percentile|MIN_Z|Z_MIN|SIZE_THRESHOLD`, and by a scan of every
key on a produced row for `pct|percentile|thresh|cut|signal|arm|enter`). What it records instead is the
**distribution**:

- every measured row carries its own `absZ`, so **any** percentile is recoverable later from the rows
  alone, without re-deriving anything;
- `revBucketTable`'s `nTape` / `nBook` per bucket **are** the size histogram.

A threshold can then be pre-registered from calibration data under §11.6's chronological split, with a
build stamp, before the holdout opens — which is the only legitimate way it can ever exist.

## The honesty requirements, and where each is asserted

| requirement | behaviour | assertions |
|---|---|---|
| too few bars for **either** leg is omitted, coded and counted, never zero-filled | `revLeg` → `bars`; the row keeps no `rev`, and `revMeasure` leaves the key **undefined** so `JSON.stringify` drops it | `an impulse past the buffer -> BARS`, `a reversion leg past the buffer -> BARS`, `and no reversion is invented`, `not zero-filled`, `the reversion omission is counted` |
| a zero impulse yields **no ratio** — division by zero is an omission, not an `Infinity` | `imp0`; `revFrac`, `rev` and `revZ` all withheld (`sgn(0)` has no meaning either), `laterRet` kept so nothing measured is discarded | `a zero impulse yields the IMP0 code`, `no reversion RATIO is produced`, `nothing is Infinity`, `nothing is NaN`, `the raw later-leg return is still kept` |
| a shock whose bucket is unknown is **not silently binned** | `bucketLabel` becomes `"unmeasured"` (never a member of `SHOCK_LABELS`); the accumulator creates **no** slot | `an unmeasurable impulse labels itself unmeasured, not a bucket`, `no bucket slot is created for it`, `the unmeasured sentinel never becomes a bucket`, `a row with no bucket is counted as NOBUCKET` |
| a continuation is a **negative** reversion, never a silent zero | `rev = −sgn(impulse)·laterRet`; `cont` flag | `a continuation is a NEGATIVE reversion`, `and is flagged as one`, `a continuation is not folded to zero`, plus the up/down mirror-image pair |
| the scale cannot contain its own numerator | the non-overlap rule is **enforced**, as `standardisedMove` enforces it | `a scale whose sample ends AT the span start -> OVERLAP`, `a scale reaching past the span start -> OVERLAP` |
| a gap or a corrupt close **inside** a span voids it | same rule `computeStats` uses; stricter than arithmetic requires | `a bar gap inside the span -> GAP`, `a zero close inside the span -> CLOSE`, `a NaN close inside the span -> CLOSE` |
| detect absent must degrade, not throw | `nodetect` on every path that needs a bucket or a scale; the cost side still works | the whole `degradation when detect is not spliced` block |

## What this unit CANNOT establish

Stated here because a table of per-bucket means is very easy to read as a result.

1. **It is correlational. It says nothing about causation.** It measures that a move of a given
   standardised size was followed by a given give-back. It cannot distinguish "the shock overshot and
   the market re-priced" from "large moves and subsequent moves share a common driver" from "the
   baseline sigma was mis-estimated for that hour and both legs are the same estimation error." No
   arrangement of these columns identifies a mechanism.

2. **Nothing here is a shock claim until it is stated against time-matched controls (§11.3).** A
   per-bucket table built only from shock windows is confounded with **time of day**: scheduled releases
   cluster at 12:30–13:30 UTC on the rising limb of `SEAS` (1.007 at 12 → 1.298 at 13 → 1.934 at 14
   against a 0.804 trough), and US DST slides the same 08:30 ET release between those slots twice a
   year. §11.3 requires ≥ 5 controls per shock window matched on **UTC slot, weekday, no scheduled
   release within ±1 window, and calendar quarter**, and §11.7 clause 2 closes the programme outright if
   the unconditional number is positive and the control-adjusted one is not. **No number produced by
   this unit may be reported against the unconditional baseline** — not in the UI, not in a CSV, not in
   CLAUDE.md. The unit does not compute the difference-in-differences and deliberately does not: it
   produces the *ingredients* for one, and the orchestrator must build the control accumulator with the
   same functions (`shockMagnitudeBucket` directly on a control window's `absZ`, as `detect`'s notes
   instruct) and report the two tables side by side.

3. **`clears` on a row is a fact under a stated cost model, not a signal.** It says this row's gross
   exceeded this row's round trip. It is not evidence, not a recommendation, and not an entry rule.
   Nothing renders it.

4. **It does not dedupe shocks.** `detect` deliberately leaves burst-collapsing to the orchestrator, and
   so does this unit. Feeding it every flag inside one real shock produces overlapping impulse/reversion
   spans and heavily overcounts n. §4's one-observation-per-window discipline is **not enforced here**
   and must be enforced upstream.

5. **`z` is a surprise relative to recent conditions, not an absolute move size.** `detect`'s honest
   limits carry through unchanged: volatility clustering is not removed, so the second shock of a burst
   reads smaller than the first; sub-minute leakage is bought down by one minute, not eliminated; and
   `z` carries no distributional claim — crypto minute returns are fat-tailed and `|z| >= 3` is
   emphatically not a 0.3% event.

6. **The anchor concedes up to one minute.** `revShockKey` anchors on `floor(t/60000) − 1` because the
   bar *containing* the stamp already contains part of the shock. For a stamp landing mid-minute this
   loses up to 60 seconds of the impulse, and minute bars cannot recover it. Sub-minute measurement
   would need tick data this instrument does not store.

7. **Book legs recovered from 60-second snapshots are up to ~30 s late.** See the wiring note; the
   orchestrator must record the actual snap timestamps beside the prices so the lag is measurable rather
   than assumed.

## Wiring — where and how the orchestrator calls this

**Splice.**

1. Insert `/* ---------------- H protocol: reversal ---------------- */` in `index.html` **after**
   `detect`'s block and **before** `/* ---------------- H protocol: schema ---------------- */`
   (currently line 4298). `reversal` must sit below `detect`, whose `shockMagnitudeBucket` and
   `shockScale` it calls.
2. Add `"reversal"` to `ORDER` in `units/tools/resplice.js`, between `"detect"` and `"schema"`.
3. Add `"reversal"` to the `units` array in `units/run.js`.
4. `node units/tools/resplice.js reversal`, then `npm run test:all`. **Never patch the spliced copy.**

**Call site — a deferred pass, not the 1 Hz loop, and no render path.**

The reversion leg needs bars that only exist after the fact, so this belongs beside `volCloseTick` as
its own pass (`shockTick(now)`), run at most once a minute, with `volCloseTick`'s exact L2 discipline:
set a `revTried` flag **only on give-up** (`schemaVolGiveUp`-style; `S.bars` holds 360 minutes), never
on a failed attempt, or every shock that closed while the app was down is lost permanently.

```
const B = barsExcludingCurrent();
const row = revMeasure(B.keys, B.closes, {
  tShock:        sh.t,                       // the recorded shock stamp
  sigPerMin:     baselineSigma(B.keys, B.closes, now, lastKey - revShockKey(sh.t), 60, 1),
  impulseMin:    REV.IMPULSE_MIN,
  revMin:        REV.REVERSION_MIN,          // and, separately, each exploratory horizon
  tauAtShockMin: (w.close - sh.t) / 60000,   // minutes left in the live Kalshi window
  book:          { entryC, exitC, basis: "ask-bid" }
});
```

`sigPerMin` **must** be a `baselineSigma` result, built so its sample ends strictly before the impulse
anchor — pass `windowMin = lastKey − revShockKey(t)` and the unit's own `overlap` check will refuse it
if that is wrong. Never pass `computeStats().rv60`, `.sig` or `calSigma(...)`: `detect`'s D1 caps `|z|`
at 7.746 / 4.082 and empties the very tail buckets H1 lives in. A bare number is accepted but comes back
`sigLagged:false` and the accumulator refuses it by default.

**The book legs must come from the edge ledger's own snaps, because the order book is not recoverable
later.** For the window carrying the shock, take the snap nearest `(kShock + impulseMin)·60000` and the
snap nearest `(kShock + impulseMin + revMin)·60000`, require each within ±45 s (otherwise pass no
`book`, and let the row carry `noquote`), and **record both snap timestamps on the row** so the lag is
measurable. Prices come from what the snap already stores: `ya` is the yes ask and `qm` the mid, so
`yb = 2·qm − ya`, `noAsk = 100 − yb`, `noBid = 100 − ya`. The faded side is a deterministic consequence
of the impulse's sign — an **up** impulse makes the above-strike side expensive, so the fade buys NO; a
**down** impulse buys YES. That is arithmetic, not an entry rule, and no rule of any kind is applied.
Enter at that side's **ask**, exit at its **bid**, and pass `basis:"ask-bid"` so the spread is not
charged twice.

**Storage.** One row per shock per horizon, under a new `btc.shock` key (its own `try/catch` — L1: a
quota failure on one ledger must not block the others). Do **not** store it inside `btc.edge`: that
ledger prunes at 1,500 windows / ~15 days and the shock programme needs ~7 months (§10.2), so the CSV is
the record and localStorage is only the buffer.

**CSV.** Append the row's fields to the `# windows` dataset and add a fourth dataset,
`# h1_reversal_buckets`, built at export time from `revAccumulator` / `revAccumulate` /
`revBucketTable` — plus a **second, identically-built table over the §11.3 time-matched controls**,
emitted beside it and never subtracted into a single number in the file. Carry `impulseMin`, `revMin`,
`costBasis` and an `exploratory` column (1 for every horizon other than `REV.REVERSION_MIN`, per §11.4)
on every row, and emit the `acc.omit` counts as their own rows so coverage is readable. The horizons are
stamped on the row by `revMeasure` itself, so a row keeps the horizon it was measured under — the same
discipline `si_bound` enforces for H5.

**UI: none.** No panel, no sweep highlight, no readout, no colour. §7.6 — a displayed number reads as a
signal, and nothing here has earned that. H5 already set this precedent: it computes `vrp`, stores it,
exports it, and renders nothing. Read this the same way — by exporting and grouping, with the omission
counts tabulated **before** the means.

**Harnesses.** `test/hprotocol.js` should gain a case that the block is spliced and reachable and that a
row with an unmeasurable leg omits rather than zero-fills. If §11 is amended to name `REV`'s constants,
`test/prereg.js` must gain them — it enumerates thresholds from the object, so a constant added to the
code with no document entry fails, which is the point.

## Deliberately NOT done

- **No arm, no entry rule, no signal, no gate, no highlight, no UI.** Measurement only. Asserted by
  source scan for order/execution vocabulary, render/DOM paths, persistence, network and timers.
- **No threshold for H1's `[TBD]` percentile.** The distribution is recorded instead.
- **No re-detection.** `detectShock`, `standardisedMove` and `baselineSigma` are not called from this
  unit (asserted). The orchestrator detects; this unit scores what it is handed.
- **No bucket edges of its own.** `SHOCK_EDGES` is `detect`'s and stays `detect`'s.
- **No difference-in-differences, no control matching, no bootstrap.** §11.3 controls and §11.2's
  primary statistic are the orchestrator's, built from two accumulators; putting them here would let a
  shock number exist without its control.
- **No dedupe, no burst collapsing, no one-observation-per-window enforcement.** Each of those is a
  pre-registered choice and belongs upstream, exactly as `detect` argues.
- **No persistence, no CSV writing, no `S`.** The orchestrator decides where rows land; `impulseMin`,
  `revMin`, `costBasis`, `sigLagged`, `bucketLabel` and the three code fields **must** all land
  somewhere, or the result is not reconstructable.
- **`index.html` and every other repo file untouched.**
