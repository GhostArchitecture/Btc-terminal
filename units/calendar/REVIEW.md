# Adversarial review — `calendar` unit

Reviewed: `code.js` (152 lines), `test.js` (102 assertions), `NOTES.md`.
Reviewer ran `node test.js` (green, exit 0) plus an independent oracle harness.

## Verdict

**Sound.** The date/timezone math is correct — not "correct on the cases the test picked", but
correct against an independent oracle across 21 years. No fabricated dates. No sign, units, or
monotonicity errors (this unit contains no volatility, tau, or root-finding math at all, so that
whole class of failure does not apply). Nothing here throws or stalls under 1 Hz.

The five findings below are **input hygiene and provenance labelling**, not broken math. Two are
worth fixing before splice; three are notes.

## Independent verification I ran (not the unit's own test)

Cross-checked against Node's IANA `America/New_York` via `Intl.DateTimeFormat` — a source entirely
separate from the unit's hand-rolled rule:

| check | samples | mismatches |
|---|---|---|
| `usEasternOffsetMinutes` at every hour, 2015-01-01 → 2036-01-01 | 184,080 | **0** |
| `etToUtc` round-trip (08:30, 14:00, 00:00, 23:59, 09:15 ET every day 2015–2035) | 38,350 | **0** (spring-gap hour excluded, as documented) |
| NFP count / first-Friday / 08:30 ET, 2024–2027 | 48 releases | **0** |
| CLAIMS count vs independently counted Thursdays, 2024–2027 | 209 releases | **0** |

Pre-2007 instants mismatch (1,344 hourly samples in 2005–2006) exactly as the code comment says
they will — the Energy Policy Act rule is hardcoded and the limitation is disclosed. Irrelevant to
this instrument's data range.

Other structural checks: no non-ASCII in `code.js`; parses under `"use strict"`; all ten exported
symbols return `grep -c == 0` against `index.html` (no collision); `eventTag` costs ~5 µs
(3,600 calls in 19 ms), so per-tick and per-ledger-row use is free; hostile ranges
(`NaN`, `±Infinity`, `undefined`, `0 → 1e15`) neither throw nor hang (`releasesBetween(0,1e15)`
returns 22,856 rows in 56 ms).

The empty `RELEASES.DATED` is the right call and is the most honest thing in the unit. Do not let
anyone fill it from memory.

---

## Findings

### 1. [MEDIUM] A non-numeric `t` yields a confident tag or a silent null, never an error

`nearestRelease` never coerces `t`. Reproduced:

```
eventTag(null)                       -> {"ev":"CLAIMS","evMins":810,"evTier":2}
eventTag(0)                          -> {"ev":"CLAIMS","evMins":810,"evTier":2}
eventTag(false)                      -> {"ev":"CLAIMS","evMins":810,"evTier":2}
eventTag(new Date(...))              -> {"ev":null,"evMins":null,"evTier":null}   // wrong: NFP is 30 min away
eventTag("1783080000000")            -> {"ev":null,"evMins":null,"evTier":null}   // wrong: same instant as the number
eventTag(undefined)                  -> {"ev":null,"evMins":null,"evTier":null}   // right, by luck
```

Two distinct mechanisms, both silent:

- `null` / `0` / `false` coerce to 0, and the unit dutifully reports the **1 Jan 1970 claims
  release, 810 minutes away**. A row whose timestamp went missing gets stamped with a
  plausible-looking, wrong, tier-2 event tag — and these tags are meant to be persisted on ledger
  rows and analysed later by event distance. This is precisely the "noise presented as signal"
  failure the project rules forbid, arriving through the back door of a missing input.
- A `Date` or a numeric **string** returns all-nulls because of line
  `const list=releasesBetween(t-H*60000,t+H*60000);` — `t-…` coerces to a number but `t+…`
  **string-concatenates** for a `Date` (ToPrimitive default hint → string) and for a string.
  `releasesBetween` then gets `(number, string)`, `t0<=t1` is `NaN`-false, and it returns `[]`.
  A CSV/JSON round-trip that hands back `"1783080000000"` therefore reports "no event" forever.

The tell that this is unintended: `undefined` returns `null` but `null` returns a 1970 tag.

Fix (one line, no behaviour change for valid input) at the top of `nearestRelease`:

```js
const T=+t; if(!isFinite(T)||T<=864e5) return null;   /* reject NaN/Date-as-string/epoch-zero stubs */
```
then use `T` in place of `t` in the three arithmetic sites (`T-H*60000`, `T+H*60000`,
`Math.abs(r.t-T)`, `(best.t-T)/60000`). `eventTag` inherits the fix for free.

### 2. [MEDIUM] The return value does not say whether a tag was computed or verified

`RELEASES` keeps the honest split — `RULE` (derived) vs `DATED` (published, must be hand-entered) —
and `NOTES.md` is explicit that the rule entries have real, unmodelled exceptions. But
`releasesBetween`/`nearestRelease`/`eventTag` **flatten that distinction away**: a hand-verified
CPI row and a guessed-by-rule NFP come back as the same shape. Once `{ev:"NFP",evMins:-3,evTier:1}`
is persisted on a ledger row, nothing downstream can tell an official date from an inference, and
the caveat lives only in a comment in a file nobody re-reads at analysis time.

This matters more than "rare" suggests. I computed the frequency of the configuration in which the
first-Friday rule is known to be at risk (the 1st of the month falling on a Friday, the case where
BLS has historically sometimes published the following Friday instead):

```
2020-2030: 19 of 132 months = 14.4%   (2021-01, 2022-04, 2024-03, 2025-08, 2026-05, 2027-01, ...)
```

One month in seven, not a decade-scale oddity. Same for CLAIMS in Thanksgiving/holiday weeks
(shifted to Wednesday), several times a year. The unit is right not to invent those dates; it
should just carry the uncertainty forward in the data instead of only in prose.

Fix: add a provenance field on each emitted row and on the tag, e.g. `src:"rule"` for the two
generated series and `src:"dated"` for `RELEASES.DATED` rows, surfaced as `evSrc` in `eventTag`.
Costs one key; makes "drop rule-derived NFP tags from the event-distance study" a one-line filter
later instead of an archaeology exercise. (If the orchestrator objects to a 4th key on every
persisted row, encode it in `ev`: `"NFP?"` vs `"CPI"`. Anything is better than nothing.)

### 3. [LOW] Hand-entered `DATED` rows fail silently — the one table a human fills has no validation

`releasesBetween` filters `DATED` with `if(!r||!(r.t>=t0&&r.t<=t1)) continue;`. Every plausible
data-entry mistake is therefore invisible:

```js
RELEASES.DATED = [{name:"CPI",tier:1,t:NaN},
                  {name:"PPI",tier:1},                            // t omitted
                  {name:"PCE",tier:1,t:"2026-07-14T12:30:00Z"}];  // ISO string, not ms
// releasesBetween over 13-15 Jul 2026 -> []   (all three dropped, no signal)
// nearestRelease(14 Jul 08:30 ET)     -> null
```

The result reads "no event known" — the unit's own defined meaning for an *empty* table — for a
table the user believes they populated. Given `NOTES.md` explicitly hands `DATED` to the user as a
data-entry task, the failure mode and the intended workflow are pointed at each other.

Fix: validate on read and make the count visible, e.g. skip a row unless
`typeof r.t==="number" && isFinite(r.t)` **and** increment a module-level `CAL_BAD_ROWS` counter the
UI can show, or expose a tiny `calValidate()` returning the list of rejected rows. Non-silent is the
whole requirement.

### 4. [LOW — not reachable in practice] `CAL_MAX_ITER` truncation returns a partial answer, not a null

The CLAIMS day-walk caps at 20,000 daily steps (~54.8 y) and the range is built as
`[t-H, t+H]`, so the walk truncates *before reaching `t`* once `H` exceeds ~27 years. It then
returns the wrong nearest release with no indication:

```
t = 5 min after the Thu 2 Jul 2026 claims print
nearestRelease(t, 2e7 min ≈ 38y) -> CLAIMS  mins -5     (correct)
nearestRelease(t, 5e7 min ≈ 95y) -> NFP     mins +1435  (wrong; the claims print 5 min ago is gone)
```

No realistic caller passes a 57-year horizon, so this is a robustness note rather than a bug that
will bite — I am flagging it only because the guard converts an over-wide request into a
confidently wrong answer rather than a refusal, which is the pattern this codebase treats as a
defect elsewhere. Cheap fix: `if(g>=CAL_MAX_ITER) return null;` (or set an `out.truncated=true`
flag) rather than returning the partial list.

### 5. [TEST NITS] two assertions carry less weight than they appear to

Not defects — the suite is genuinely good (boundary instants ±1 min on every transition,
inclusive-range edges, the pad-leak case, a real equidistant tie, DATED plumbing proven then
restored). Two caveats for whoever maintains it:

- **§7 partially asserts the unit against itself.** `"every NFP falls on a Friday in ET"`,
  `"every claims falls on a Thursday"`, `"every generated release is 08:30 ET"` and
  `"every NFP is the first Friday"` all convert the instant back to ET using the unit's own
  `usEasternOffsetMinutes`. A consistently-wrong offset would pass all four. §2's independent
  `KNOWN` transition table and §4's hardcoded ISO strings do pin it from outside, and my IANA
  cross-check confirms it is in fact correct — so the suite is not vacuous, but those four lines
  contribute less than their wording implies.
- **§11 `ok("unit did not call the poisoned helper stubs", true)` asserts the literal `true`.** The
  throwing stubs do the real work implicitly (any call would have crashed the run earlier), but the
  printed line proves nothing on its own. Also note `vm.createContext` supplies all standard
  built-ins regardless of the sandbox object, so the harness proves purity only for the specific
  names stubbed, not globally.

---

## Explicitly checked and found clean

- `mins` sign convention: negative = already happened. Correct, both directions, and `Math.round`
  behaves sanely at half-minute offsets (`±30500 ms → ±1`).
- Ambiguous fall-back hour and non-existent spring-gap hour: both resolve as documented, and the
  documentation matches the code.
- Cross-year offset lookup (`getUTCFullYear()` of the instant): safe, because Jan and Dec are EST
  under the rule in every year. Verified at Dec 31 23:59 ET → Jan 1 next year.
- `releasesBetween` month-walk across a December→January boundary: correct.
- One-UTC-day generation pad cannot leak into the result (exact-ms filter); confirmed at
  `[t,t]` and `t-1 ms`.
- Inclusive endpoints, ascending sort, stable tie-break to lower tier then earlier release.
- Fractional-ms `t` behaves.
- No DOM, no `localStorage`, no `fetch`, no timers, no page globals — confirmed by reading, not
  only by the harness's stubs.

## Recommended action before splice

Fix **#1** (five tokens of coercion, removes a fabricated-tag path) and **#2** (one provenance key,
keeps the unit's own honesty legible downstream). **#3** is worth ten minutes if a human is going
to fill `DATED`. **#4** and **#5** are optional.
