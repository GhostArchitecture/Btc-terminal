# Adversarial review — `detect` unit

Reviewed: `code.js` (138 lines, 6 functions + 3 consts), `test.js` (154 assertions).
`node test.js` -> **154 passed, 0 failed, exit 0** (re-run by this reviewer, not taken on trust).
`index.html` and every repo file untouched by this review.

**Verdict: the arithmetic is sound. One substantive defect, in the caller contract the unit
documents for itself, plus two small ones and two nits.** The defect is not a wrong formula — it is
that the three `sigPerMin` sources the unit recommends are all contaminated by the move being
standardised, and that contamination puts an analytic ceiling on `z` that lands below or barely
above the pre-registered top bucket edges. Since those edges are pre-registered and must not be
retuned, the correction has to happen on the sigma side, before this unit is wired up.

---

## D1 — MAJOR. The recommended `sigPerMin` sources cap `z`, and the cap kills the tail buckets

**Where:** `code.js` line 33 docblock (`sigPerMin is a SCALE only (calSigma()/stats.sig/stats.rv60
are all per-minute)`) and `NOTES.md` "The circularity fix" — *"The scale-neutral option is
`stats.rv60` or `stats.sig` raw."*

**What is wrong.** `computeStats()` (index.html:862) builds both `sig` and `rv60` from
`barsExcludingCurrent()` — the *trailing* window, which **contains the very minutes being
standardised**. A large move therefore inflates its own denominator. `z` stops being proportional
to the move and saturates:

- `rv60 = sqrt(mean(r_i^2))` over the last 60 one-minute returns. For a move of total log return
  `m` spread over `w` minutes that dominates the window, `rv60 -> m/sqrt(60w)`, so
  `z = m/(rv60*sqrt(w)) -> sqrt(60) = 7.746`, **independent of `m`**.
- `sig` is EWMA with `L=0.94`. A one-minute shock enters with weight `1-L`, so
  `sig -> sqrt(0.06)*|m|` and `z -> 1/sqrt(1-0.94) = 4.082`, **independent of `m`**.

Measured (this reviewer's probe, using the real `computeStats` arithmetic copied from index.html;
baseline 0.04%/min, one-minute shock, `w=1`), with the bucket each `z` lands in:

| jump | z, sigma **lagged** (pre-shock) | z, `stats.rv60` as written | z, `stats.sig` as written |
|---|---|---|---|
| 0.1% | 2.5  `z2-3` | 2.40 `z2-3` | 2.18 `z2-3` |
| 0.2% | 5.0  `z4-6` | 4.23 `z4-6` | 3.20 `z3-4` |
| 0.5% | 12.5 `z6+`  | 6.60 `z6+`  | 3.88 `z3-4` |
| 1%   | 25.0 `z6+`  | 7.40 `z6+`  | 4.02 `z4-6` |
| 2%   | 50.0 `z6+`  | 7.66 `z6+`  | 4.06 `z4-6` |
| 5%   | 125  `z6+`  | 7.73 `z6+`  | 4.07 `z4-6` |
| 15%  | 375  `z6+`  | 7.74 `z6+`  | 4.07 `z4-6` |

Consequences, in the unit's own terms:

- With `stats.sig`, **`z6+` can never be populated** — not by a 15% one-minute move, not by any
  move, at any `w` (`w=5` caps at 4.32). `z4-6` collapses to the sliver `[4.02, 4.08]`, into which a
  1% jump and a 15% jump fall identically.
- With `stats.rv60`, every move from ~0.5% upward is `z6+`. A 0.5% move and a 15% move are the same
  magnitude stratum.
- `code.js` line 23 says the top two buckets are kept separate because *"H1's whole mechanism is
  that reversal only clears cost in the TAIL of shock sizes, so the tail has to survive the
  bucketing"*. Under both recommended scales the tail does **not** survive: it is either unreachable
  or it is one undifferentiated bin. `test.js`'s `z=5 and z=8 are NOT the same bucket` passes on
  hand-fed numbers that the recommended pipeline cannot actually produce.
- `|z| >= 3` also stops being a fixed sensitivity: because the denominator grows with the move, the
  phase-2 hit rate is a nonlinear function of shock size, not a threshold on it.

**Why the existing NOTES paragraph does not cover this.** NOTES *does* warn that `calSigma()` drags
`SEAS`/`TERM` into the threshold — a real and separate point — and then recommends `rv60`/`sig` raw
as the fix. That recommendation is precisely the failing case. Nothing in either file mentions the
estimation window overlapping the measured span.

**Fix (sigma side — do NOT retune `SHOCK_EDGES`, they are pre-registered).** `sigPerMin` must be
estimated from bars ending at or before `k0`, i.e. lagged past the measured span. Concretely: pass a
sigma computed over the 60 minutes ending at `keys[n-1-w]`, not `computeStats().rv60`. Either make
the unit compute that itself from the `keys`/`closes` it already receives (it has everything it
needs), or make the lag a hard, stated requirement and delete `stats.sig` / `stats.rv60` /
`calSigma()` from the list of acceptable scales in both the docblock and NOTES. Whichever the
orchestrator picks, the `sigPerMin` source must land on every ledger row — NOTES already says so,
and this makes it load-bearing rather than bookkeeping.

**Note this is not a "z is fat-tailed" objection.** NOTES assumption 5 already handles that
correctly. This is a mechanical dependence of the denominator on the numerator, which no
distributional caveat addresses.

---

## D2 — LOW/MODERATE. `shockCalNear(tag)` with `nearMin` omitted silently drops a nearby release

`code.js:88` — `return Math.abs(m)<=nearMin?name:null;`. With `nearMin` undefined the comparison is
`false`, so:

```
shockCalNear({ev:"NFP", evMins:0})   ->  null     // an NFP release happening right now, discarded
shockCalNear("NFP")                  ->  "NFP"    // bare string still works
shockCalNear({ev:"NFP", evMins:null})->  "NFP"    // unusable distance still works
```

Only the *well-formed* tag fails, and it fails toward the endogenous bucket — the exact direction
the same docblock calls "the dangerous error", and the opposite of the stated policy that ambiguity
resolves toward phase 1. `detectShock` always passes a resolved `near`, so this bites only a direct
caller; but the function is exported, documented as a usable helper, and `test.js` only ever calls
it with an explicit `15`, so the suite cannot see it.

Fix, one line, at the top of `shockCalNear`:
`const nm=(typeof nearMin==="number"&&isFinite(nearMin)&&nearMin>=0)?nearMin:SHOCK.CAL_NEAR_MIN;`
then compare against `nm`. (`SHOCK` is declared above it, so there is no TDZ problem at call time.)

---

## D3 — LOW, integration hazard. `mag` is null on fired rows more often than it looks

`detectShock` returns `{shock:true, phase:1, mag:null}` whenever a calendar tag is near and `z` is
null — and `z` is null on every routine `standardisedMove` refusal: a bar gap, staleness (`lag>=2`),
cold start, fewer than `w+1` bars. All of those are normal after a backgrounded tab, which §8 of
CLAUDE.md says is the recorder's daily reality. Verified:

```
detectShock({calendarTag:"CPI", z:null}) -> {shock:true,phase:1,z:null,mag:null,source:"CPI"}
r.mag.label -> TypeError: Cannot read properties of null (reading 'label')
```

This is documented and correct behaviour for the unit (a bucket on an unmeasured move would be a
fabrication). It is called out here only because the splice target runs this at 1 Hz inside `loop`,
where an unguarded `r.mag.label` in a render or CSV path throws and takes the tick with it. Every
downstream read of `mag` needs a null branch.

---

## Nits

- **N1, `code.js:125`:** *"US DST slides the same 08:30 ET release between those two slots"* — the
  nearest antecedent is "1.007 at 12 UTC -> 1.934 at 14 UTC", but the release slides **12 -> 13**
  UTC, not 12 -> 14. `test.js` asserts the correct 12/13. Reword so the factual claim in the comment
  matches the one in the test.
- **N2, `test.js`:** `ok("no page helper was reached during the whole suite", true)` is a hardcoded
  `true` padding the count (the thrower stubs do the real work, and they do it well);
  `close("absZ", m.absZ, Math.abs(m.z), 0)` restates the implementation back to itself. Cosmetic,
  but in a project whose product is intellectual honesty a literal `true` assertion is worth
  deleting.

---

## Checked and clean (attempted to break, could not)

- **Arithmetic:** `ret` is the exact log return; `z` sign follows the move; `z` monotone increasing
  in move size at fixed sigma across 200 sizes; exact `1/sqrt(sigma)` and `1/sqrt(w)` scaling. No
  sign error, no units error — everything is per-minute and minutes, consistent with `calSigma`/`tau`.
- **Contiguity guard:** the loop checks all `w` steps including the **first and last** of the span
  (`test.js` only exercises a mid-span gap; a gap at the final step is correctly refused), and
  correctly *ignores* gaps and corrupt bars that sit outside the span — verified both directions.
  Matches `computeStats`' 1-apart rule exactly.
- **Staleness:** `lag = floor(now/60000) - keys[n-1]`, accepting 0..1, matches the real
  `barsExcludingCurrent()` (index.html:826), which filters `k >= cur` and so yields lag 1 in live
  operation. Future-dated newest bar refused.
- **Misaligned arrays:** `n = min(len)` keeps `keys[i]`/`closes[i]` aligned and takes `kEnd` from
  `keys[n-1]`, not `keys[keys.length-1]` — a truncated `closes` fails closed via the staleness gate
  rather than mis-timestamping. Correct.
- **Buckets:** half-open `[lo,hi)` at every edge, monotone ordinal, `lo`/`hi` consistent with
  `SHOCK_EDGES`, open top bucket `hi:null`, labels unique, `-0` handled.
- **`detectShock`:** exactly five keys; phase-1 precedence and its non-dependence on `z`; `k<=0`,
  `k` NaN, `z` NaN/Infinity, missing `opts` all fail closed to the default or to no-shock.
- **`shockWindow`:** half-open, tiles without double-count, signed unrounded `minsSince`, non-finite
  inputs return `{inWindow:false, minsSince:null}`, `lenMin` 0/negative admit nothing.
- **`timeMatchedControl`:** UTC throughout (does not repeat the `hourStart` local-time bug of
  §10.4); `slot15` 0..95; refuses a non-24-entry or bad-entry `seasTable` rather than reading the
  global; pre-1970 epochs fine.
- **No fabricated constants or dates.** `SEAS[12]=1.007` and `SEAS[14]=1.934` verified against
  index.html:880. The DST arithmetic (08:30 EDT = 12:30 UTC, 08:30 EST = 13:30 UTC) is correct, and
  2026-09-06 is indeed a Sunday. `SHOCK.K_DEFAULT`/`CAL_NEAR_MIN`/`WINDOW_MIN`/`SHOCK_EDGES` are
  presented as pre-registered choices from problem structure, not as fitted values — honest.
  The unit correctly holds no calendar of its own.
- **Purity and splice safety:** no DOM, storage, network, timer, `S`, or global `SEAS`; verified
  under a vm context where all of those are throwers, and none was reached. Pure ASCII, so no
  `\uXXXX` question arises. All eight exported names grep to **zero** occurrences in `index.html` —
  no collision, no duplicate top-level definition. The `const`/TDZ caveat in NOTES is accurate.
- **1 Hz re-firing** (the same `z` flags on ~60 consecutive ticks) is real but explicitly disclosed
  in NOTES as the orchestrator's debounce decision, consistent with the one-observation-per-window
  discipline in §4. Not counted as a defect.
