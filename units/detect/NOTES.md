# Unit: `detect` - endogenous shock detector (phase 1/2) + H1 shock-magnitude measurement

`code.js` is the exact block to splice. `node test.js` runs green: **225 assertions, 0 failed, exit 0**.

**Revision 2 (post-review).** Fixes D1 (contaminated volatility scale capped `z` and emptied the
pre-registered tail buckets), D2 (`shockCalNear` with `nearMin` omitted discarded a live release),
D3 (`mag` null on fired rows was an unguarded throw at the 1 Hz call site), N1, N2. **Two contract
changes, called out loudly: `detectShock` now returns SIX keys, not five (`magLabel` added), and
`standardisedMove`'s `sigPerMin` argument now also accepts a `baselineSigma()` result object.**

Pure: no DOM, no `localStorage`, no `fetch`, no timers, no page globals, no page helpers. It uses
**none** of the provided helpers - the harness stubs every one of them (`clamp`, `normCdf`,
`invNorm`, `randn`, `quantile`, `mulberry`, `bootstrapCI`, `termFactor`, `calSigma`, `computeStats`,
`hourStart`, `tapeAt`, `idxAt`, `priceAtSrc`, `barsExcludingCurrent`) plus `S`, `SEAS`, `document`
and `localStorage` with **throwers**, so any accidental reach fails the suite loudly. Two static
checks over the comment-stripped source assert the same thing textually.

No non-ASCII anywhere in `code.js` (asserted in the suite), so the `\uXXXX` convention has nothing
to escape. Name-collision check against `index.html`: all eight exported symbols return `grep -c` = 0.
`/home/user/Btc-terminal` was not touched (`git status --porcelain` clean).

## Exports

| symbol | kind | notes |
|---|---|---|
| `SHOCK` | const | `{K_DEFAULT:3, CAL_NEAR_MIN:15, WINDOW_MIN:30, STALE_MAX_MIN:1, MAG_UNMEASURED:"unmeasured", MAG_NONE:"none"}` - pre-registered |
| `SHOCK_EDGES` | const | `[2,3,4,6]` - pre-registered bucket edges in sigma |
| `SHOCK_LABELS` | const | `["z<2","z2-3","z3-4","z4-6","z6+"]` |
| `BASELINE` | const | `{LOOKBACK_MIN:60, GAP_MIN:1, MIN_FRAC:0.5, MIN_RET:10}` - pre-registered |
| `baselineSigma(keys,closes,now,windowMin,lookbackMin,gapMin)` | fn | **lagged** scale `{sigPerMin,lagged,nRet,lookbackMin,gapMin,windowMin,kFrom,kTo,kSpanFrom,kSpanTo,source}` or `null` |
| `shockScale(sigPerMin)` | fn | internal resolver, exported only for the harness: `{sig,lagged,meta}` or `null` |
| `standardisedMove(keys,closes,now,windowMin,sigPerMin)` | fn | `{ret,z,absZ,windowMin,k0,k1,p0,p1,sigPerMin,sigLagged,sigMeta}` or `null` |
| `shockMagnitudeBucket(absZ)` | fn | `{i,label,lo,hi}` or `null` |
| `shockCalNear(tag,nearMin)` | fn | event name or `null`; `nearMin` defaults to `SHOCK.CAL_NEAR_MIN` |
| `detectShock(opts)` | fn | `{shock,phase,z,mag,magLabel,source}` - exactly these **six** keys |
| `shockWindow(shockT,nowT,lenMin)` | fn | `{inWindow,minsSince}` |
| `timeMatchedControl(t,seasTable)` | fn | `{hourUTC,minuteUTC,weekday,slot15,seas}` or `null` |

Splice anywhere at top level. `SHOCK`/`SHOCK_EDGES`/`SHOCK_LABELS`/`BASELINE` are `const`, so they are in TDZ
until the script reaches them - fine, since every call site in this app runs from `init`/`loop`
after full evaluation, but do not call these from a top-level statement placed above the block.

## The circularity fix (the point of this unit)

The spine's phase-2 rule - "flag when realized vol exceeds `rv60 * SEAS` by a multiple" - is
circular. `rv60 * SEAS` is literally what `calSigma()` returns and what the pricing engine uses, so
that rule flags **"my own pricing model is currently surprised"**, and the H-protocol would then be
testing whether you can trade on the model at exactly the moments the model is least trustworthy.

Corrected form implemented here: recent vol enters **only as a scale**. `z = ret / (sig * sqrt(w))`
standardises an observed move; it is never a realized-vs-forecast comparison of the same quantity.
`sigPerMin` is supplied by the caller and can be *any* per-minute scale (`stats.sig`, `stats.rv60`,
`calSigma(...)`, or a fixed constant) - the unit does not care and does not read one itself. A test
asserts `z` is identical for an identical price path at an identical scale regardless of clock hour,
i.e. there is no hidden time-of-day or forecast term inside it.

### The SECOND circularity - mechanical, and the reason `baselineSigma()` exists (D1)

Revision 1 of these notes recommended `stats.rv60` or `stats.sig` "raw" as the scale-neutral option.
**That recommendation was wrong and is withdrawn.** `computeStats()` (index.html:862) estimates both
from the *trailing* window, which contains the very minutes being standardised. The move then enters
its own denominator and `z` saturates at a ceiling that does not depend on the size of the move:

| scale as previously recommended | ceiling on `\|z\|` | why |
|---|---|---|
| `stats.rv60` = `sqrt(mean(r^2))` over the last 60 returns | `sqrt(60)` = **7.746** | one dominant return `m` gives `rv60 -> m/sqrt(60)` |
| `stats.sig`, EWMA `L=0.94` | `1/sqrt(1-0.94)` = **4.082** | a one-minute shock enters with weight `1-L`, so `sig -> sqrt(0.06)*m` |
| `calSigma(...)` | same as `rv60`, times `SEAS`/`TERM` | it is `rv60` with the engine's own factors on top |

`SHOCK_EDGES` tops out at 6. Under the EWMA scale `z6+` is therefore **unreachable by any move at
all** - a 15% one-minute jump reads `z = 4.07` - and `z4-6` collapses to the sliver `[4.02, 4.08]`
into which a 1% and a 15% move fall identically. Under `rv60` everything from ~0.5% up is one
undifferentiated `z6+`. H1's entire mechanism is that reversal only clears cost in the **tail** of
shock sizes, so a saturating `z` deletes the hypothesis it exists to measure. The edges are
pre-registered, so the correction had to happen on the sigma side, and it did.

**`baselineSigma(keys, closes, now, windowMin, lookbackMin, gapMin)`** estimates the scale strictly
from bars that end **before** the measured span:

```
... [ kFrom .......... kTo ] --gapMin-- [ k0 ............ k1 ]
    |<-- lookbackMin -->|                |<- standardisedMove ->|
```

Same functional form as `rv60` (uncentered RMS of one-minute log returns, gaps dropped by the
1-apart rule), same 60-minute horizon, same "at least half the returns usable" gate - lagged. Pass
the whole result object to `standardisedMove` as `sigPerMin`; it carries its own provenance
(`kFrom/kTo/kSpanFrom/kSpanTo/nRet/lookbackMin/gapMin`) so the scale that produced a `z` is
reconstructable from the ledger row, which is what makes the choice auditable rather than folklore.

The overlap is **enforced, not trusted**: if a scale object's sample does not end strictly before the
measured span (a caller who built the baseline for a different `windowMin`), `standardisedMove`
returns `null` rather than measuring on an overlapping scale.

The suite proves the ceiling is gone: with a lagged 0.04%/min baseline, a 1% one-minute move reads
`z = 25` and a 15% move `z = 375`, exactly 15x apart, while the same paths read `7.74` / `7.74`
under contaminated `rv60` and `4.02` / `4.07` under the contaminated EWMA. The bucket consequence is
asserted directly: `z6+` is unreachable under the old scale and is reached by a 0.25% move under the
new one.

**What is still contaminated, stated honestly:**

1. **Volatility clustering is not removed, and cannot be.** Lagging removes the *mechanical*
   dependence of the denominator on the numerator. It does not remove the fact that vol is
   autocorrelated: a shock arriving after an already-elevated hour has a genuinely larger baseline,
   so **the second shock of a burst reads smaller than the first**. `z` is a surprise-relative-to-
   recent-conditions measure, not an absolute move size, and any H1 result conditioned on `z` is
   conditioned on that. `ret`, `p0` and `p1` are on every row precisely so the raw move can be
   recovered and the two views compared.
2. **Sub-minute leakage.** `GAP_MIN = 1` drops the bar anchoring `p0`, because a move often starts
   mid-minute before the span's first key. It buys one minute, not immunity.
3. **Uncentered RMS carries drift** into sigma, exactly as `rv60` does. At 60 minutes this is small
   but it is not zero.
4. **A bare number is still accepted** as `sigPerMin`, because a *fixed constant* scale is a
   legitimate uncontaminated choice. Nothing stops a caller from passing `computeStats().rv60` and
   getting the capped `z` back. The result is tagged `sigLagged:false` in that case; **any
   H-protocol row whose `sigLagged` is not `true` should be treated as measured on a capped scale
   and must not be pooled with lagged rows.**
5. If a caller passes `calSigma(st,now,tEnd)` the scale additionally carries `SEAS` and `TERM`, so
   the threshold becomes seasonally adaptive and partly the engine's own view. That was the
   conceptual circularity the unit was written to avoid; it is now doubly discouraged.

## `standardisedMove` - every null case

Returns `null` rather than a plausible number when:
- `keys`/`closes` are not arrays; `now`, `windowMin` or `sigPerMin` are not finite numbers.
- `sigPerMin <= 0` (would give infinite or sign-flipped z).
- `windowMin` rounds below 1. `windowMin` is rounded to whole minutes because bars are minute bars.
- fewer than `windowMin + 1` bars are available (`n >= w+1` is exactly enough - tested at the edge).
- **any gap in the span**: every one of the `w` steps must satisfy `keys[i]-keys[i-1] === 1`, the same
  rule `computeStats` uses to refuse a sleep/background gap as a one-minute return. A shorter window
  that clears the gap still measures (tested).
- **any corrupt close in the span** (non-number, non-finite, `<= 0`). Note the endpoints alone would
  still compute a finite return, so this is stricter than arithmetic requires: a zero/NaN bar inside
  the span means the tape was broken across it, and measuring through that is not honest.
- **staleness**: `floor(now/60000) - keys[last]` must be in `[0, SHOCK.STALE_MAX_MIN]` (= `[0,1]`).
  `barsExcludingCurrent()` yields lag 1 in normal operation and lag 0 if the caller includes the live
  bar; lag 2+ means a resumed/throttled tab, where reporting an old move as "the last `w` minutes"
  would be a silent lie. A bar newer than `now` is also refused.

Verified properties: `ret` is the exact log return; `z` halves when sigma doubles; `z` scales as
`1/sqrt(windowMin)` for the same total move; `absZ` is unsigned; sign of `z` follows the move; and
with a lagged scale `z` is exactly proportional to the move over a 15x range (the saturation test).

`sigPerMin` may be a `baselineSigma()` result (the required form for H-protocol rows) or a bare
positive number (a fixed constant scale). Anything else - a string, an object without a usable
`sigPerMin`, a non-positive number - returns `null` rather than a plausible `z`.

Extra provenance fields (`windowMin,k0,k1,p0,p1`) are returned beyond the three in the contract, so a
ledger row can record exactly which bars produced the number. Destructuring `{ret,z,absZ}` is unaffected.

## `detectShock` - phases are never pooled

- **Phase 1 (scheduled) has strict precedence and never looks at `z`.** A release is a known event
  whether or not the price moved; a quiet CPI print is still a CPI print. A `z=9` move sitting on NFP
  is phase 1, not phase 2 - it is *not* endogenous and must not be counted as evidence for one.
- **Phase 2 (endogenous)** fires on `|z| >= k` (inclusive; tested at exactly k) only when no scheduled
  release is nearby.
- `phase` is on every returned row. A phase-1 flag is a fact from a calendar; a phase-2 flag is an
  inference from the tape with a false-positive rate set by `k` and by whatever `sigPerMin` was used.
  **They must never be aggregated into one "shock" population without this field**, and any headline
  count of shocks that does not split by phase is misreporting.
- `mag` is `null` when `shock` is false - a bucket on a non-shock reads as a shock magnitude. To bucket
  a *control* window (which you must, for the size-matched comparison), call `shockMagnitudeBucket`
  directly on its `absZ`.
- `mag` is also `null` when `z` is `null` (phase 1 with no measurable move): the size is genuinely
  unknown, and inventing a bucket for it would corrupt H1's size-conditioning.

### `mag` vs `magLabel` (D3) - CONTRACT CHANGE

`mag` is `null` far more often than it looks: **every** routine `standardisedMove` refusal (bar gap,
stale tape after a backgrounded tab, cold start, fewer than `w+1` bars) produces `z === null`, and a
nearby calendar tag then yields `{shock:true, phase:1, mag:null}`. CLAUDE.md section 8 says the
recorder is backgrounded regularly, so this is the *normal* state after a resume, not an exotic one.
The splice target runs at 1 Hz inside `loop`, where an unguarded `r.mag.label` in a render or CSV
path throws and takes the whole tick with it.

The unit still **refuses to fabricate a bucket** - that has not changed and must not. Instead the
return now carries a sixth key, `magLabel`, which is **always a non-empty string**:

| situation | `mag` | `magLabel` |
|---|---|---|
| fired, `z` measured | `{i,label,lo,hi}` | that bucket's label |
| fired, `z` unmeasurable | `null` | `SHOCK.MAG_UNMEASURED` = `"unmeasured"` |
| nothing fired | `null` | `SHOCK.MAG_NONE` = `"none"` |

Neither sentinel is a member of `SHOCK_LABELS` (asserted), so a `GROUP BY magLabel` can never
silently absorb an unmeasured row into a real bucket - the omission stays visible and countable,
which is the same discipline the cross-cutting implied-vol finding demands of every selection.
**Read `magLabel` in display/CSV paths; read `mag` only behind a null check.**

- Return shape is asserted to be **exactly** `{shock, phase, z, mag, magLabel, source}` - six keys.

### `calendarTag` shapes accepted
The `calendar` unit's `eventTag()` output `{ev, evMins, evTier}`; a `{name, mins}` row; a bare
non-empty string (caller has already applied its own proximity gate); `null`/`undefined`/`false`/
`{ev:null,...}` = quiet. A **named event whose distance is unusable** (`evMins` null/NaN) resolves to
phase 1 anyway - the conservative direction, because the dangerous error is filing a scheduled move
into the endogenous bucket, which is the bucket the whole H-protocol is trying to isolate.

### `k` and `calNearMin`
`k` defaults to `SHOCK.K_DEFAULT = 3` if absent, non-finite, or `<= 0` (`k <= 0` would make every
observation a shock). `calNearMin` defaults to `SHOCK.CAL_NEAR_MIN = 15`, inclusive at the boundary,
symmetric before and after the stamp. **(D2)** `shockCalNear`'s own `nearMin` argument now defaults
the same way. Previously, omitting it made the comparison `Math.abs(m) <= undefined`, which is
`false`, so a *well-formed* tag for a release happening right now was silently discarded and the move
was filed as endogenous - failing toward the noisy inferred bucket, the exact direction the rest of
this function is built to avoid. A bare string or an unusable distance still resolves to phase 1;
an explicitly passed `0` is honoured as a zero-tolerance gate, not replaced. Both are **pre-registered**: they were chosen from the structure
of the problem (a 15-minute window; ~3 sigma as the conventional tail entry) before any outcome was
scored, and tuning either after seeing results manufactures the effect the protocol is testing.

## `shockMagnitudeBucket` - pre-registered edges

Edges `[2,3,4,6]` sigma, half-open `[lo,hi)`, five ordinal buckets. **Do not retune.** The comment in
`code.js` says so explicitly.

`z4-6` and `z6+` are kept **separate** rather than merged into one `>=4`: H1's mechanism is that
reversal only clears cost in the *tail* of shock sizes, so the tail has to survive the bucketing
instead of being averaged into a fat top bucket. A test asserts `z=5` and `z=8` do not share a bucket.

The bottom bucket `z<2` exists because a phase-1 shock can carry any `|z|`, including a tiny one.

**Reachability warning:** the edges are only reachable if the scale is lagged. Bucketing a `z`
computed from `computeStats()` output puts a ceiling of 7.746 (or 4.082) on the whole distribution
and quietly empties the top of it - see the D1 section above. If a row's `sigLagged` is not `true`,
its bucket is not comparable with one whose is.

**Statistical warning for the orchestrator:** five buckets crossed with two phases is ten cells, and
the top cells will be very thin. Reporting a per-cell result before the cell has real n is exactly the
"noise as opportunity" failure §7.6 warns about. The bucketing is a pre-registered *stratification*,
not a licence to report whichever cell looks best.

## `shockWindow`

Half-open `[0, lenMin)`, so consecutive windows tile without double-counting a row (asserted:
`shockWindow(t0, t0+30m, 30).inWindow === false` while `shockWindow(t0+30m, t0+30m, 30).inWindow === true`).
`minsSince` is **signed and unrounded** - negative means `nowT` precedes the shock, which is how you
build the pre-event leg of an event-time plot. Non-finite inputs give `{inWindow:false, minsSince:null}`;
`lenMin <= 0` admits nothing; `lenMin` defaults to `SHOCK.WINDOW_MIN = 30`.

## `timeMatchedControl` - the control the spine misses

Returns `{hourUTC, minuteUTC, weekday, slot15, seas}` (`weekday` 0=Sun, UTC; `slot15` = the 15-minute
slot of the UTC day, 0..95).

Why it exists: scheduled releases cluster at **12:30-13:30 UTC**, right on the steepest part of this
instrument's *own* seasonal curve (`SEAS[12] = 1.007` rising to `SEAS[14] = 1.934`), and **US DST slides
the same 08:30 ET release between those two UTC slots twice a year**. Comparing shock windows to a pool
of all non-shock windows therefore confounds "shock" with "the most volatile hours of the day". The
suite asserts the confound directly: the same 08:30 ET release lands at 12 UTC in summer and 13 UTC in
winter, and the seasonal factors of those two hours differ by more than 25%.

The spine's proposed `shock_random` control randomises the **side**, not the **clock**, and does not
touch this at all. It controls for direction-picking; it does not control for time-of-day. Both are
needed, and they are not substitutes.

**How to use it:** stratify. For each shock window, draw controls from non-shock windows with the same
`hourUTC` (and ideally the same weekday class). `slot15` is the exact-position stratum but is sparse -
96 cells per weekday - so it will usually be a diagnostic rather than the matching key. `seas` is
provided so a caller can weight or residualise instead of matching, if n forces that.

`seasTable` is a required argument by design. If it is not a 24-entry numeric table, or the entry for
that hour is not a finite number, `seas` comes back **`null`** - the unit never falls back to the global
`SEAS`, because a silent global read is exactly what makes a "testable" function untestable. The clock
fields are still returned in that case. Invalid `t` returns `null` for the whole object.

## The cross-cutting implied-volatility finding, as it bears on this unit

This unit produces **realized** quantities only: `z` standardises an observed move by a realized,
lagged sigma. It never inverts a quote, so the at-the-money identifiability failure - `p_over` depends
on sigma only through `-0.5*sig^2*tau` once the strike sits at spot, so implied sigma is unbounded
in the inverse there and not even single-valued for an above-spot strike - does not arise inside it.

It bears on the unit at **integration**. If the orchestrator joins these shock rows to a variance-
premium column, that column is only meaningful on rungs where sigma is identified: away from the
money on the hourly `KXBTCD` ladder, or a 15-minute window late in its life once price has left the
strike. A KXBTC15M strike opens *at the money*, which is exactly when a shock is most likely to be
detected here, so a naive join would pair this unit's most interesting rows with that column's least
identified readings and render "1805 bp implied minus 9 bp realized" as a colossal premium on an
ordinary 40c quote. Failed readings must be **omitted, not clamped**, and the omission count must be
recoverable. This unit follows the same rule in its own domain: every refusal returns `null` rather
than a plausible number, and `magLabel`'s two sentinels keep the refusals countable instead of
silently pooled.

## Assumptions

1. `keys` are minute indices (`Math.floor(ms/60000)`), ascending, parallel to `closes` - the
   `barsExcludingCurrent()` contract. The unit does **not** sort or re-index; it trusts the ordering
   and only checks the 1-apart step.
2. `sigPerMin` is a **per-minute** sigma. Everything in this codebase is per-minute and `tau` is in
   minutes; passing an annualised or per-second sigma would silently rescale every `z`. There is no way
   for the unit to detect this, so it is the caller's contract.
3. `now` is epoch ms in the same clock as the bar keys.
4. Log returns (not simple returns), matching `computeStats`.
5. `z` is treated as unitless sigma; no distributional claim is made about it. Crypto minute returns
   are fat-tailed, so `|z| >= 3` is emphatically **not** a 0.3% event - the empirical phase-2 rate must
   be measured from the data, never assumed from the normal. Do not let `k=3` be read as a p-value.
   This is a *distributional* caveat and is separate from D1, which was a mechanical dependence of the
   denominator on the numerator that no distributional caveat addresses.
6. Bucket edges and `k` were fixed before scoring, from problem structure, not from data.

## Deliberately NOT done

- **No `S` read, no global `SEAS` read, no page state.** Everything is threaded in as arguments.
- **No calendar data.** This unit consumes a tag; it does not know what a release is or when one is.
  Producing that is the `calendar` unit's job, and it has correctly left its dated table empty rather
  than inventing dates. This unit works fine with a permanently-null tag: every flag is then phase 2,
  which is the honest state of the world when no calendar is loaded, and it must be reported as such
  rather than as "no scheduled events occurred".
- **No default `k` tuning, no adaptive threshold, no per-hour k.** An hour-varying `k` would reintroduce
  the circularity through the back door.
- **No reversal/H1 outcome measurement.** This unit detects and sizes; it does not score. Scoring
  belongs downstream and must carry `phase` and `mag` through to every row.
- **No persistence, no CSV columns, no UI.** The orchestrator decides where `phase`, `magLabel`, the
  `sigPerMin` source (`sigLagged` plus `sigMeta`), and the time-matched control keys land on a ledger
  row - but all four **must** land somewhere, or the results are not reconstructable. `sigLagged` is
  load-bearing, not bookkeeping: it is what separates a comparable `z` from a capped one.
- **No sigma of its own beyond `baselineSigma`.** The unit still reads no state; `baselineSigma` takes
  the same `keys`/`closes` the caller already holds and returns a value, nothing more.
- **No dedupe / no shock-clustering logic.** Consecutive ticks inside one real shock will each flag.
  Collapsing a burst into one event needs a debounce rule that is itself a pre-registered choice, so it
  is left to the orchestrator; naively counting flags will heavily overcount shocks (the same
  one-observation-per-window discipline as §4 applies here and is not enforced by this unit).
- **No order-placing logic of any kind**, and nothing here feeds a price.
- **`index.html` and every repo file untouched.**
