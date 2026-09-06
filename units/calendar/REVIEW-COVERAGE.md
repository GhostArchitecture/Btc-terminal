# Adversarial review - the COVERAGE upgrade

Reviewed: `code.js` (629 lines), `test.js` (347 assertions, green, exit 0), `NOTES.md`, `FILLING.md`,
`REVIEW.md`. Nothing in the repo was touched; all probing was done in a throwaway `vm` harness.

## Verdict

**The coverage mechanism itself is sound.** I could not construct a case where an unknown-coverage
window is accepted as a control through `controlEligible()`, and no fabricated or inferred date has
been added to `DATED`. The date/timezone math is still correct against an independent IANA oracle.

Four real defects and three nits below. **D1 is the important one**: the contamination hazard the
whole upgrade exists to close is still fully open through `RELEASES.RULE`, which `controlEligible`
treats as ground truth once a `"*"` period is declared, and which nothing counts or flags.

---

## What I verified independently (not the unit's own test)

Cross-checked against Node's IANA `America/New_York` via `Intl.DateTimeFormat`:

| check | samples | mismatches |
|---|---|---|
| `usEasternOffsetMinutes`, every hour 2015-01-01 -> 2036-01-01 | 184,080 | **0** |
| `etToUtc` round-trip, 8 wall times/day 2015-2036 (spring gap excluded, as documented) | 61,360 | **0** |

**The eight FOMC rows, rendered back through IANA:**

| row | UTC | ET | weekday |
|---|---|---|---|
| FOMC | 2026-01-28T19:00Z | 01/28 14:00 | Wed |
| FOMC | 2026-03-18T18:00Z | 03/18 14:00 | Wed |
| FOMC | 2026-04-29T18:00Z | 04/29 14:00 | Wed |
| FOMC | 2026-06-17T18:00Z | 06/17 14:00 | Wed |
| FOMC | 2026-07-29T18:00Z | 07/29 14:00 | Wed |
| FOMC | 2026-09-16T18:00Z | 09/16 14:00 | Wed |
| FOMC | 2026-10-28T18:00Z | 10/28 14:00 | Wed |
| FOMC | 2026-12-09T19:00Z | 12/09 14:00 | Wed |

All eight land at 14:00 ET. **September 16 is 18:00Z (EDT) and December 9 is 19:00Z (EST) - they are
correctly NOT the same UTC hour.** January 28 and December 9 are the two EST rows; the other six are
EDT. October 28 is correctly still EDT (DST 2026 ends Nov 1). All eight fall on a Wednesday, which is
the statement day of a two-day meeting, and eight is the standard FOMC year. `test.js:137-140`
hardcodes these eight ISO strings, so this is pinned from outside the unit, not by the unit's own
offset function.

**Fabricated-date audit: clean.** `RELEASES.DATED` holds exactly ten rows - the eight FOMC statements
plus CPI 2026-08-12 and CPI 2026-09-11 - which is exactly the sourced list in `NOTES.md`
("Data loaded, and its provenance"). No extra row, no interpolated monthly cadence, no PPI/PCE/GDP/
ISM/RETAIL row. `EXCEPTIONS` holds exactly the two BLS lapse corrections claimed. The NFP exception's
`was` (2026-02-06) is genuinely the first Friday of February 2026, so it really does override the
rule-generated row rather than insert beside it (verified: the Feb 2026 output contains one NFP row,
at the corrected instant, `src:"corrected"`, with `was` attached).

**Cases I tried and could not break** (all returned `unknown-coverage` or `table-errors`):
a `"*"` row one minute narrower than the exclusion band; two abutting `"*"` rows that jointly span
the band (correctly not unioned); a `"*"` row with an empty `src`; a `"*"` row with a malformed
`retrieved`; an inverted `"*"` row; a name-scoped `FOMC` row asked the full-calendar question;
`coverageAt(t,"__proto__")`; a valid `"*"` row alongside a malformed `DATED` or `EXCEPTIONS` row;
`RELEASES.DATED` replaced by a non-array. The band edges are right: 45 min out is excluded, 46 min
out clears, symmetric.

---

## D1 [MEDIUM-HIGH] `controlEligible` treats rule-derived dates as ground truth, and nothing counts the exposure

`calRuleRows()` emits NFP (first Friday) and CLAIMS (every Thursday) as ordinary rows. `NOTES.md`
is explicit that both rules have real, unmodelled exceptions - BLS moves claims to Wednesday in weeks
containing a Thursday federal holiday, several times a year. `evSrc:"rule"` carries that caveat on
the *tagged* row.

But the caveat is carried only on the row the rule *emits*. It is not carried on the window the rule
*got wrong*, and that is the window that enters the control group. Reproduced at Thanksgiving 2026
(Thursday 26 November) with a `"*"` declaration over 2026:

```
rule emits at Thanksgiving:               ["CLAIMS/rule"]
eventTag at the REAL Wednesday print:     {"ev":"CLAIMS","evMins":1440,"evTier":2,
                                           "evSrc":"rule","evCov":true}
controlEligible at the REAL Wed print:    {"eligible":true,"reason":"ok"}
controlEligible at the FICTIONAL Thu slot:{"eligible":false,"reason":"release-nearby"}
```

That is the header's own hazard, verbatim: a real release sits in a window that reports
`eligible:true, reason:"ok"`, so it is recruited into the control group as a quiet window and
contaminates the baseline. The `"*"` declaration is supposed to be the human's attestation that this
cannot happen, but nothing in the unit makes the attestation checkable - `calendarAudit()` reports
no count of rule-derived rows falling inside a `"*"` period, so the exposure of a `"*"` claim is not
even countable, let alone gated. `FILLING.md` addresses it in prose ("rule-derived; correct it with
an EXCEPTION"), which is precisely the failure mode this upgrade was written to replace.

The asymmetry is what makes it dangerous: the fictional Thursday is excluded (harmless, one control
lost) while the real Wednesday is admitted (a shock inside the baseline).

Cheap, honest fix in the spirit of the rest of the unit: have `calendarAudit()` report, per `"*"`
entry, how many emitted rows inside it carry `src:"rule"` - "this `"*"` claim rests on N inferred
dates" - and say so in `.text`. A stronger fix would give `controlEligible` a distinct reason (or a
flag on the `ok` result) when the window sits in a week whose rule row is at risk.

## D2 [MEDIUM] A chained correction can leave a phantom release at a date that never happened

`calApplyExceptions` walks `RELEASES.EXCEPTIONS` in array order, applying each exception once.
Emission is unconditional, so an exception whose `was` points at an instant produced by a *later*
exception in the array never removes it. Reproduced with a two-step reschedule (X -> Y, then
Y -> Z), which is a realistic shape: an agency revises a date it has already revised.

```
[A,B] order -> 2026-05-13/corrected                            (correct)
[B,A] order -> 2026-05-10/corrected  2026-05-13/corrected      (phantom + correct)
```

The 05-10 row is a release that never existed. The task brief names this outcome specifically -
a duplicate release at two different timestamps is worse than either alone - and here it is
produced by arithmetic in a unit whose own header says "DO NOT GUESS A DATE".

It is silent. `calendarAudit()` reports `exceptionsRejected: 0` and labels the pair
`["inserts","overrides"]`, which is individually true and collectively misleading; nothing says the
two exceptions form a chain. Correctness depends purely on array order, which is neither documented
nor enforced.

Note that iterating `calApplyExceptions` to a fixpoint does **not** fix it (unconditional emission
makes it oscillate). The fix is either a topological order on `was`/`t`, or - more in keeping with
this unit - a cross-row validation: an exception whose `was` equals another exception's `t` for the
same name is a table fault, so `controlEligible` returns `table-errors` until a human collapses the
chain into one row.

## D3 [MEDIUM] `eventTag().evCov` promises more than it checks

The doc block on `eventTag` states plainly:

> `evCov === true` t is inside declared full-calendar COVERAGE. `ev:null` therefore means
> "NO RELEASE HERE" - a genuinely quiet window, **usable as a section 11.3 time-matched control.**

`controlEligible` refuses every window while `DATED` or `EXCEPTIONS` holds a malformed row
(`reason:"table-errors"`), on the correct reasoning that a rejected row reads as "no event known".
`evCov` applies no such check, so the two documented meanings disagree:

```
clean                 evCov: true   controlEligible: ok
malformed DATED row   evCov: true   controlEligible: table-errors
malformed EXCEPTION   evCov: true   controlEligible: table-errors
```

The exception case is the sharp one. Drop `retrieved` from the seeded NFP correction and the whole
correction silently stops applying:

```
Feb 2026 NFP rows: 2026-02-06/rule      (the real 2026-02-11 release has vanished entirely)
```

The window that actually held the moved payrolls print now tags `evCov:true` - "genuinely quiet,
usable as a control" by the tag's own documentation - while `controlEligible` correctly refuses it.
A consumer that persists `evCov` on ledger rows and filters on `evCov===true` later (exactly the
use the key was added for) inherits the contamination the guard was built to stop.

Either make `evCov` false when the tables are broken, or delete the "usable as a control" sentence
from `eventTag`'s doc block and make the tag's own comment point at `controlEligible` as the only
authority. The second is one line and loses nothing.

## D4 [LOW] `RELEASES.RULE` is decorative for generation but authoritative for the audit

`calRuleRows()` hardcodes both series; it never reads `RELEASES.RULE`. The table is read only by
`calMetaFor()` and by `calendarAudit()`. So the audit reports rule series that generate nothing:

```
after adding {name:"PPI", rule:"every-monday"} to RELEASES.RULE:
  PPI rows generated in Jul 2026: 0
  calendarAudit().ruleSeries: [... , {"name":"PPI","rule":"every-monday","tier":2}]
```

Renaming `CLAIMS` to `ZZZ` in the table still emits rows named `CLAIMS`. The audit's `.text` line
"RULE series: NFP (first-friday-of-month), CLAIMS (every-thursday)" reads as a statement of what the
generator does; it is a statement of what a decorative table says.

This matters because of D1: `calendarAudit()` is the surface a human consults before declaring `"*"`
coverage. A maintainer who adds a series here, sees it in the audit, and then declares `"*"` has
declared completeness over a release type that produces zero rows - the exact "coverage without
rows" lie `FILLING.md` warns about, arrived at by following the audit. Either make `calRuleRows`
drive off `RELEASES.RULE`, or mark the table `/* read by calMetaFor and the audit only - the two
series are hardcoded in calRuleRows */` and have the audit say so.

---

## Nits (not defects, recorded so they are not rediscovered)

- **`calendarAudit().text` mislabels total rows as valid.** The line prints `out.datedRows` (total)
  under the word "valid" while the correctly-computed `out.datedValid` goes unused: with one
  malformed row among eleven it reads `DATED rows: 11 valid, 1 rejected`. The object is right, the
  human-readable line - the one `NOTES.md` asks the splice to render - is not. Related: with
  `RELEASES.DATED` set to a non-array, `datedValid` computes to `-1`.
- **Coverage bounds are UTC-shaped for an ET-shaped source.** `from:Date.UTC(2026,0,1)` is
  2025-12-31 19:00 ET, so the FOMC 2026 claim over-reaches five hours into a period the source page
  does not describe, and `to:Date.UTC(2026,11,31,23,59,59,999)` stops at 18:59 ET, leaving the last
  five ET hours of 2026 uncovered. Harmless for FOMC (nothing lands there) and the tail direction
  fails safe, but the leading five hours are an overclaim, and `FILLING.md`'s worked `"*"` example
  propagates the same pattern - where an overclaimed `"*"` hour is the expensive direction. Build
  the bounds with `etToUtc(y,0,1,0,0)` / `etToUtc(y,11,31,23,59)` instead.
- **Prototype-named rows disappear from the audit.** `const names={}` / `const covNames={}` inherit
  `Object.prototype`, so a row named `toString` or `constructor` is never counted in `datedNames`
  and reads as covered in `uncoveredNames`. Absurd input; `Object.create(null)` is the one-liner.

## Test-suite notes

The suite is genuinely non-circular where it matters: the eight FOMC UTC instants
(`test.js:137-140`), the DST transition table (`§2 KNOWN`), and the coverage rows built with
`Date.UTC` are all pinned from outside the unit, and `NOTES.md` records 13 mutation kills against
the coverage layer. Two lines carry less weight than they read:

- `eq("coverageAt() with no name asks the full-calendar question", JSON.stringify(coverageAt(JUN26)),
  JSON.stringify(coverageAt(JUN26,"*")))` compares the implementation to itself, and under the seed
  both sides are `{covered:false,entries:[]}` - it would pass if both were broken identically. The
  neighbouring "a name-scoped entry does not grant full-calendar coverage" carries the real content.
- The `§7` assertions that convert instants back to ET with the unit's own `usEasternOffsetMinutes`
  are still there (noted in `REVIEW.md` finding 5 and left as-is). My IANA cross-check above confirms
  the offset function, so the suite is not vacuous, but those lines do not pin it.

**No regression assertion exists for D1, D2 or D3** - all three are reachable from the shipped
tables plus one plausible edit.

## Re-verify when egress allows

Not a finding, but the single highest-value row to re-check: **CPI 2026-09-11 is a Friday.** BLS
publishes CPI on Tuesday-Thursday in the large majority of months. The row may well be correct
(the 2025-2026 lapse in appropriations moved several BLS dates, which is why the two `EXCEPTIONS`
rows exist), and it is internally consistent at 08:30 ET, but it is the one row whose day-of-week is
atypical, and this unit's own doctrine is that a wrong CPI date mislabels every window around it.
The `EXCEPTIONS` source page (`bls.gov/bls/2025-lapse-revised-release-dates.htm`) is likewise
unverifiable from this environment.

---

# Second adversarial review — the D1–D4 fixes (2026-09-06)

Reviewed `code.js` (895 lines), `test.js` (**440 assertions, exit 0**), `NOTES.md`, `FILLING.md`, and the
first review above. **No file was edited except this one.** All probing was done in throwaway `vm`
harnesses; `md5sum` of `code.js`/`test.js`/`NOTES.md`/`FILLING.md` is unchanged from before this review
and `node test.js` still exits 0 with 440 green.

## Verdict

**D2, D3 and D4 are closed.** D1 is closed *against the reviewer's own reproduction* and against every
holiday case I could construct — and is **reopened by three ordinary maintenance edits**, because the vouch
binds to a *series name* rather than to what the generator actually does (R1). The audit surface that
`FILLING.md` names as the check on a `"*"` declaration corroborates the wrong answer in two of those three
cases (R2).

Nothing was invented. The tables still hold exactly **10 DATED rows, 2 EXCEPTIONS, 1 COVERAGE entry, 2 RULE
series** — verified row by row against `NOTES.md`'s sourced list, with no extra row, no interpolated cadence,
and no new name.

---

## What I verified independently (not the unit's own test)

| check | samples | mismatches |
|---|---|---|
| `usEasternOffsetMinutes` vs IANA `America/New_York`, every hour 2009-01-01 → 2040-01-01 | 271,728 | **0** |
| `etToUtc` round-trip through IANA, 8 wall times/day, 2009–2040 | 83,328 | **0** |
| `controlEligible` vs brute-force "any release within ±45 min", every 15-min slot of 2026 under a fully vouched `"*"` | **35,040** | **0** |

The third row is the important one: with the whole 2026 calendar enumerated independently (106 releases
across ±90 days) and a vouched `"*"` in place, `controlEligible` agrees with brute force on **every one of
the 35,040 windows in a year**. The ±45 min band, the exception pad and the inclusive bounds are exact — I
could not make the guard *miss* a release the tables know about. Every failure below is a release the tables
**stop knowing about**.

**DST / FOMC, re-verified through IANA:** all eight 2026 rows land at **14:00 ET on a Wednesday**.
**2026-09-16 is 18:00Z (EDT) and 2026-12-09 is 19:00Z (EST) — correctly not the same UTC hour**; 01-28 and
12-09 are the two EST rows, 10-28 is correctly still EDT (DST 2026 ends Nov 1). `releasesBetween` at exactly
`CAL_MAX_SPAN_MS` returns 3,509 rows without hitting the `CAL_MAX_ITER` guard (the pad arithmetic is tight
but correct); span+1 and horizon+1 both throw `RangeError` as documented.

**CPI 2026-09-11 is still a Friday and still unchanged** — not quietly corrected, and the "Re-verify when
egress allows" flag above still stands. See the note at the end.

## D2, D3, D4 — attacked and held

- **D2 (order-dependent EXCEPTIONS).** 2-chains in both orders, 3-chains in three orderings, same-`was`
  pairs, and a *cancel* used as the second link of a chain (`t:null` whose `was` is another row's `t`, both
  orders) are **all rejected order-independently**, both rows named, `calTablesUsable()` false, zero rows
  emitted. A chain with one individually-invalid link is also refused globally. The name-scoping is right:
  the two seeded corrections that share the instant 2026-02-11 are correctly not treated as a chain.
- **D3 (validation failure that deletes).** I dropped **every field in turn from every seeded row** in all
  four tables (30 probes) and recorded the emitted calendar, `evCov`, `controlEligible` and the audit for
  each. Result: **every drop that deletes a release drives `calTablesUsable()` false**, so `evCov` goes
  false and `controlEligible` refuses globally; every drop that leaves `calTablesUsable()` true
  (`kind`/`tier`/`src`/`retrieved` on a DATED row, `kind`/`tier`/`note` on an exception) is a *defaulting*
  case that deletes nothing. Notably the sharp case from the first review — drop `retrieved` from the NFP
  correction — now reads `usable=false / evCov=false / table-errors` while emitting only the stale
  `2026-02-06/rule` row. **I found no path where a validation failure deletes a release and the unit still
  reports the period as quiet.**
- **D4 (RULE drives the generator).** Confirmed: renaming a series renames the output *and* invalidates the
  vouch (`unvouchedRules:["CLMS"]`, `controlWindowsPossible:false`); an unparseable rule string, a
  non-numeric `tier`, and a missing `et` are all rejected into `table-errors`.
- **Regression check on the headline guarantee.** A 25,508-instant sweep of 2015–2036 on the shipped tables
  returns only `unknown-coverage` (25,236) and `release-nearby` (272) — **not one `ok`**. Unknown-coverage
  windows are still never control-eligible.

---

## R1 [MEDIUM-HIGH] The vouch binds to a series NAME, not to the generator — three ordinary edits reopen D1

`calCoverageVouchGap()` compares `c.rules` (strings) against `calRuleSeriesNames()` (strings). Nothing ties
a vouch to *what the vouched row generates*, and nothing notices when a vouched series stops existing. The
documented guarantee is stated for exactly one direction — `code.js`: *"adding a rule series later correctly
invalidates an older vouch rather than inheriting it"*; `FILLING.md`: *"Add a rule series … and every older
vouch is correctly invalidated"*, *"re-check every `"*"` vouch afterwards"*. **Editing and removing a
vouched row are the other two directions, and both fail open.** All three reproductions below use the
shipped tables plus one `"*"` row vouching honestly for `["NFP","CLAIMS"]` over 2026 — i.e. a signature that
was *true when it was written*.

**R1a — edit a vouched rule row in place.** `RELEASES.RULE[1].rule: "every-thursday" → "every-wednesday"`
(equally: `et:[8,30] → [10,0]`, which I also reproduced):

```
before edit: controlEligible(Thu 2026-06-18 08:30 ET) = {"eligible":false,"reason":"release-nearby"}
after  edit: controlEligible(same window)             = {"eligible":true,"reason":"ok"}
             calCoverageVouchGap  []        tablesUsable  true      controlWindowsPossible  true
             audit: 'rests on 63 rule-derived (inferred) dates; vouched: NFP, CLAIMS'
```

This is D1's exact asymmetry restored: the window that holds the **real** every-Thursday claims print is
admitted as a quiet control, the fictional Wednesday is excluded, and every reported signal says the period
is fully vouched. The edit that redirects the generator is precisely the edit the vouch does not see.

**R1b — remove a vouched rule row.** Delete the `CLAIMS` row (a realistic move: `FILLING.md` itself says
*"Only add a series whose publication rule is genuinely deterministic. If you have to squint at it, it
belongs in `DATED`"*, and claims is the series that squints). `need` shrinks to `["NFP"]`, so the stale
`rules:["NFP","CLAIMS"]` is still a *complete* vouch:

```
controlEligible(Thu 2026-06-18 08:30 ET) = {"eligible":true,"reason":"ok"}
CLAIMS rows emitted in June 2026:          0
unvouchedRules: []   controlWindowsPossible: true   uncoveredNames: []
eventTag(a real claims Thursday):          ev:null, evCov:true      <- "quiet", persisted to the ledger
```

and `calendarAudit().text` **actively corroborates the deletion**, printing the contradiction without
flagging it:

```
  RULE series (these GENERATE rows): NFP (first-friday-of-month)  - derived, at risk in holiday/shutdown weeks
      rests on 11 rule-derived (inferred) dates; vouched: NFP, CLAIMS
  FULL-CALENDAR ("*") COVERAGE: 365 days
  NO COVERAGE AT ALL: (none)
```

A whole release series has stopped being emitted, ~52 real windows a year are now eligible controls, and the
one surface `FILLING.md` tells the maintainer to read says *vouched: NFP, CLAIMS* and *NO COVERAGE AT ALL:
(none)*. This is the "coverage without rows" lie D4 was fixed to remove, arriving through the vouch door
instead of the generator door — and it is the **deletion** direction, which `NOTES.md` (D3) itself names
*"the worst available failure direction"*.

**R1c — add a second row under an already-vouched name.** `RELEASES.RULE.push({name:"CLAIMS", …,
rule:"every-wednesday"})` → `calCoverageVouchGap` is `[]` and `controlWindowsPossible` stays `true`. A new
generator was added and no vouch was invalidated, because `calRuleSeriesNames()` de-duplicates by name.

**Why the existing tests do not catch it.** `test.js` §24 pins the two enabling behaviours as *deliberate*:

- *"vouching for a name that is not a rule series neither grants nor withholds anything"* → asserts `ok`;
- *"with no rule series in force there is nothing to vouch for, and `rules:[]` is complete"* → asserts `ok`.

Both are sound reasoning about a vouch **written after** the RULE table reached its current shape. Both are
wrong for a vouch written **before** — which is the ordinary temporal order (declare coverage in year one,
refactor the generator in year two). A surplus name is indistinguishable to the unit from the residue of a
deleted series, and the unit resolves that ambiguity in the direction that admits releases as controls.
`NOTES.md`'s *"the dangerous direction — a series in force that the vouch does not name — is the one that
refuses"* is true and incomplete: the *series the vouch names that is no longer in force* is equally
dangerous and does not refuse.

**Blast radius beyond `controlEligible`.** R1b also drives `evCov:true` on windows that held a real claims
print, so the tag persisted to thousands of ledger rows records "quiet" where the answer is "deleted". D3
tied `evCov` to `calTablesUsable()`; a removed row is not a table *error*, so it slips through the same gate.

**Direction of fix (not a patch — this is a design call for the author).** The vouch has to name what it was
given against, not just who: e.g. `rules:[{name:"CLAIMS", rule:"every-thursday", et:[8,30]}, …]`, or a
recorded fingerprint of each vouched row, so that changing a vouched row's `rule`/`et`, removing a vouched
series, or adding a second row under a vouched name each drop the vouch to `unvouched-rule` — the same
refusal `test.js` §24 already proves for the *add-a-new-name* case. Whatever the shape, the invariant worth
stating is: **a vouch is a signature on a generator specification, and it must not survive a change to what
it signed.** A cheaper interim that closes R1b alone: report `rules` entries that are not series in force as
a `staleVouch` in `calendarAudit()`, and refuse on a non-empty one.

## R2 [MEDIUM] `calendarAudit()`'s coverage lines are period-blind, so the check on a declaration is not a check

`uncovered` is computed as `all.filter(n => !(covNames[n] || covNames["*"]))`, and `covNames` records only
*that* a name appears in some coverage row, never *when*. Consequences, all reproduced:

- **Any `"*"` row of any length silences the line for every name.** A `"*"` row covering **one hour** on
  2026-06-01 yields `uncoveredNames: []` and prints `NO COVERAGE AT ALL: (none)` — for CPI, PPI, PCE, GDP,
  NFP, CLAIMS, ISM and RETAIL, across all of history.
- **The shipped tables already show the milder form**: the `FOMC` row covers 2026 only, and FOMC is reported
  as having coverage for all time.
- **`controlWindowsPossible` over-claims on a narrow period.** The same one-hour `"*"` row gives
  `controlWindowsPossible: true` while every window inside it is `{"eligible":false,"reason":
  "unknown-coverage"}` — a `"*"` period narrower than the 90-minute exclusion band can never supply a
  control, because `calCoverageSpan` (correctly) requires one entry to span the whole band.
  `FILLING.md` names this field as *"the single line that says whether section 11.3 has any controls to draw
  on"*, and the audit prints it beside `FULL-CALENDAR ("*") COVERAGE: 0 days`.

This matters because `FILLING.md`'s procedure is *"`calendarAudit().text` — read it; the counts should say
what you think you just did"* and *"Read that line before you believe your own declaration."* In R1b the
audit is the only place the deletion is visible at all, and it prints the reassuring answer. Suggested
direction: make `uncoveredNames` (and any per-name coverage claim in the text) period-scoped rather than
boolean, and require a `"*"` period to be at least `2*CAL_CONTROL_EXCL_MIN` wide before it counts toward
`controlWindowsPossible`.

## R3 [LOW] `calRuleRowFault` accepts a non-integer `et`, and the generator truncates it silently

`if(typeof r.et[0]!=="number" || … || !(r.et[0]>=0&&r.et[0]<=23) || !(r.et[1]>=0&&r.et[1]<=59))` bounds the
values but not their integrality, so `et:[8.5,30]` **validates clean** and `Date.UTC` truncates the hour to
8 — the row silently publishes at a time nobody wrote. (`et:[13,59.9]` *is* caught, but only because 59.9
happens to be inside the minute bound; `[13.9,0]` is not.) The reject message promises `[hour 0-23, minute
0-59]`, which reads as integers. Contained in practice — a sub-hour error stays inside the ±45 min exclusion
band — but this is a generator specification (`NOTES.md`: *"not a transcribed fact with a missing
annotation"*) and the validator is the only thing standing behind it. One-liner: require
`Number.isInteger`.

## R4 [LOW] `controlEligible` reports `release-nearby` ahead of `table-errors`, hiding table faults in the reason tally

The order in `controlEligible` is `bad-timestamp → release-nearby → table-errors → unknown-coverage →
unvouched-rule`. With a broken table, any window that still has a *generated* release nearby is reported as
`release-nearby`:

```
RELEASES.DATED = null  ->  controlEligible(...) = {"eligible":false,"reason":"release-nearby"}
                           calTablesUsable() === false
```

Eligibility is right either way, so this is not a contamination path. But §11.3's **"control coverage ≥ 80%"**
figure is computed by counting refusals, and `code.js` says so at `controlEligible`: *"Counting the rejects
is also how section 11.3's 'control coverage >= 80%' figure is computed honestly."* A tally built from these
reasons attributes a broken table to ordinary release proximity, so a table fault can be *invisible in the
very statistic that is supposed to expose thin control coverage*. Checking `calTablesUsable()` before
`nearestRelease` costs nothing and makes the reason honest.

## R5 [NIT] Two exceptions moving different `was` to the same `t` still emit order-dependently

`calExceptionCrossFaults` catches chains (`t === was`) and same-`was` pairs, but not two same-name rows
sharing a `t`. Reproduced: rows `X→Z` and `Y→Z` emit **one** row at `Z` (correct date, no phantom), but the
surviving row's `was`, `ref` and `retrieved` come from whichever was typed second, via the `dup` upgrade in
`calApplyExceptions`. Only provenance moves, not a date, and the shape is far-fetched — recorded so it is
not rediscovered, not to be fixed.

---

## Tests asserting the implementation back to itself

I re-scanned for the class of assertion flagged in the first review. The self-comparing `coverageAt` line is
gone (replaced with a literal, as `NOTES.md` claims). The remaining soft spots are unchanged and are
*confirmed sound from outside* by the IANA sweep at the top of this section, so the suite is not vacuous:

- §7's ET conversions still round-trip through the unit's own `usEasternOffsetMinutes`, and §24's
  Thanksgiving assertion does the same (`new Date(CLAIMS_THX_RULE - usEasternOffsetMinutes(...)*60000)`) —
  it pins "fourth Thursday" against the unit's own offset function rather than against a calendar. My
  271,728-hour IANA cross-check is what makes those lines trustworthy; nothing inside the suite does.
- **No regression assertion exists for R1a, R1b, R1c, R2, R3 or R4.** R1a/R1b/R1c are worse than uncovered:
  §24 asserts the two enabling behaviours as intended.

## Still unverifiable from this environment — do not change on a guess

- **CPI 2026-09-11 is a Friday.** Confirmed **still present, still flagged, and not quietly corrected**:
  the row is byte-identical, `test.js:152` pins `2026-08-12T12:30Z 2026-09-11T12:30Z`, and both render at
  08:30 ET through IANA. BLS publishes CPI Tuesday–Thursday in the large majority of months, so the
  day-of-week remains atypical and unchecked. One observation: the flag now lives **only in this review
  file** — `code.js`'s comment on those two rows and `NOTES.md`'s provenance table say only that these were
  the two retrievable dates, not that one of them is anomalous. If this file is ever archived the warning
  goes with it. Carrying it as a comment beside the row (a note, not a change to `t`) would cost nothing.
- The `EXCEPTIONS` source page (`bls.gov/bls/2025-lapse-revised-release-dates.htm`) and the DOL/BLS holiday
  reschedule practice behind the Thanksgiving worked case remain unfetchable here.
- Whether the **2026 federal-holiday set** is complete: I constructed Thanksgiving (Thu 2026-11-26),
  New Year (Thu 2026-01-01), Independence Day observed (Fri 2026-07-03), Juneteenth (Fri 2026-06-19) and
  Christmas (Fri 2026-12-25) by hand. Only Thanksgiving is an *unmasked* hazard for the shipped rules: the
  New Year and Independence Day shifts land on days that an every-Thursday claims row already marks busy, so
  the contamination is blocked by coincidence rather than by design. That coincidence should not be relied
  on, and it is another reason the vouch (R1) has to hold.

---

# Third adversarial review — the vouch-as-specification rebind (2026-09-06)

Reviewed `code.js` (1,143 lines), `test.js` (**508 assertions, exit 0**), `NOTES.md`, `FILLING.md` and both
dated sections above. **No file was edited except this one** — `md5sum` of `code.js` / `test.js` / `NOTES.md` /
`FILLING.md` is unchanged (`365166…`, `bb949b…`, `29dde3…`, `df53d1…`) and `node test.js` still exits 0. All
probing was in throwaway `vm` harnesses under `scratchpad/probe/`.

## Verdict

**The central question — *can a signature that was honest when written still grant eligibility after the thing
it signed has changed?* — is still YES, in one reachable shape, and it is the deletion direction.**

R1a (edit), R1c (add) and the single-row case of R1b (remove) are genuinely closed; I could not break any of
them. But `calCoverageVouchFaults` enforces set equality in **one direction by specification key and the other
direction by name**. When two rule rows share a name — a configuration `FILLING.md` explicitly contemplates
("Do not add a second row under an existing name *unless the series genuinely has two publication rules*") and
`test.js` §26 itself constructs and signs — **deleting one of them leaves the signature reading `ok`, the audit
silent, and every window that held one of the deleted releases `{eligible:true, reason:"ok"}`.** That is R1b
verbatim, wearing R1c's table shape. See **R6**.

Second, and separately: the vouch stores **live object references**, not values. A signature authored as
`rules: RELEASES.RULE.slice()` — or even `RELEASES.RULE.map(r => Object.assign({}, r))`, the literal reading of
"copy the rows out of `RELEASES.RULE`" — is permanently self-validating and no edit can ever invalidate it. See
**R7**.

Everything the fix was supposed to preserve, it preserved. Nothing was invented; the tables still hold exactly
**10 DATED rows, 2 EXCEPTIONS, 1 COVERAGE entry, 2 RULE series**, and this round the FOMC rows were checked
against the **live Federal Reserve page**, not just against `NOTES.md`.

**Not safe to splice as it stands.** Not because it is wrong today — as shipped there is no `"*"` row and no
window anywhere is eligible — but because the guarantee it is being spliced *for* fails at exactly the moment
it is first used, and the failure is silent, in the direction that contaminates the baseline. R6 is a
few-line change (key the stale check the same way the force check is keyed); R7 is a cheap identity check.

---

## What I verified independently (not the unit's own test)

| check | result |
|---|---|
| **All 8 FOMC 2026 rows against the LIVE `federalreserve.gov/monetarypolicy/fomccalendars.htm`** (HTTP 200 from this environment) | **exact, 8/8** |
| Every seeded `DATED`/`EXCEPTIONS`/`COVERAGE` instant rendered through IANA `America/New_York` (node ICU), not the unit's converter | all as documented |
| Shipped-table sweep, 173-min stride, 2009-01-01 → 2036-01-01 (**82,080 instants**) | **0 eligible**; reasons only `unknown-coverage` (81,150) and `release-nearby` (930) |
| Shipped-table sweep, **every minute of June 2026** inside the one declared (FOMC) period (**43,200 instants**) | **0 eligible**; `unknown-coverage` 42,654, `release-nearby` 546 |
| Field-drop probe: **every field of every seeded row in all four tables, 88 drops** | **0 quiet-lies** — every drop that deletes a release drives `calTablesUsable()` false, and no lost-release instant reads `eligible:true` or `evCov:true` |
| `calStarScan()` vs brute-force minute-by-minute `controlEligible()` over 24 period × rule-set combinations (incl. crowded, narrow, empty-RULE, DST-transition and Thanksgiving-week periods) | **0 disagreements** |

The 2026 FOMC block on the live Fed page reads *January 27-28, March 17-18, April 28-29, June 16-17, July
28-29, September 15-16, October 27-28, December 8-9* — eight meetings, final days `01-28, 03-18, 04-29, 06-17,
07-29, 09-16, 10-28, 12-09`, matching all eight seeded rows exactly and confirming the COVERAGE row's note
("eight is the standard FOMC year and the count matches"). **`bls.gov` returns 403 Access Denied** (plain and
with a browser UA), so the two CPI rows and both EXCEPTIONS rows remain unverified against source — as the
unit itself says.

**DST / FOMC:** all eight land 14:00 ET on a **Wednesday** per IANA; `2026-09-16` is `18:00Z` (EDT) and
`2026-12-09` is `19:00Z` (EST) — **different UTC hours**, as required.

**CPI 2026-09-11 is still present, still a Friday, still flagged, not quietly corrected.** The flag now lives
in `code.js` beside the row (the second review's request), not only in this file.

**No extra, invented, inferred or interpolated date.** Every row maps 1:1 onto `NOTES.md`'s provenance table
(lines 474–477); there is no third CPI date, no extrapolated monthly cadence, no additional exception.

---

## R6 [HIGH] Deleting one of two rule rows that share a vouched name leaves the signature valid — R1b reopened through R1c's table shape

`calCoverageVouchFaults` (code.js:565) checks the two directions with two different keys:

```js
for(...force...)  if(sigKey[calRuleSpecKey(r)]!==undefined) continue;   // force ⊆ signed, BY SPEC KEY
for(...signed...) if(forceName[v.name]===undefined) out.stale.push(...) // signed ⊆ force, BY NAME
```

`NOTES.md` states the invariant as *"the set of signed specifications and the set of rule specifications in
force must be **equal, field for field**"*, and `FILLING.md`'s table promises `removed or renamed a signed row
→ STALE VOUCH → "stale-vouch"`. Neither is true when another row keeps the name alive: a signature whose
**specification** is gone but whose **name** still matches something in force is not stale, not changed, not
unvouched — it is silently accepted.

**Reproduction** (shipped `code.js`, `DATED`/`EXCEPTIONS` emptied only to make the count legible):

```js
const NFP={name:"NFP",   kind:"scheduled-numeric",tier:1,et:[8,30],rule:"first-friday-of-month"};
const THU={name:"CLAIMS",kind:"scheduled-numeric",tier:2,et:[8,30],rule:"every-thursday"};
const WED={name:"CLAIMS",kind:"scheduled-numeric",tier:2,et:[10,0],rule:"every-wednesday"};
RELEASES.RULE.length=0; RELEASES.RULE.push(NFP,THU,WED);   // two generators under one name — the R1c end state
RELEASES.COVERAGE.push({name:"*",from:etToUtc(2026,0,1,0,0),to:etToUtc(2026,11,31,23,59)+59999,
  src:"…",retrieved:"2026-09-06",rules:[{...NFP},{...THU},{...WED}]});   // honest: all three signed
// vouch ok:true, 117 releases in 2026, controlWindowsPossible:true   <- correct so far
RELEASES.RULE.splice(2,1);                                  // delete ONE of the two CLAIMS rows
```

| | before | after the delete |
|---|---|---|
| releases generated in the declared period | 117 | **65 (52 real releases gone)** |
| `calCoverageVouchFaults(star).ok` | true | **true** |
| `unvouched / changed / stale` | 0 / 0 / 0 | **0 / 0 / 0** |
| `calTablesUsable()` | true | true |
| `calendarAudit().controlWindowsPossible` | true | **true** |
| audit text contains `STALE VOUCH` / `NOT VOUCHED` / `SIGNATURE DOES NOT MATCH` | — | **no** |
| windows that held a deleted release and are now control-**eligible** | — | **52 of 52** |

`controlEligible(2026-01-07T15:00:00Z)` → `{"eligible":true,"reason":"ok"}` and
`eventTag(...)` → `{"ev":"CLAIMS","evMins":1350,"evTier":2,"evSrc":"rule","evCov":true}` — the persisted tag
records a deleted series' window as **quiet inside a period declared complete**, which is the exact sentence
`NOTES.md` uses for the worst available failure direction.

**Degenerate form, no deletion required.** The same asymmetry means a *surplus* signature is refused or
accepted purely on whether its name coincides with something in force:

```js
RELEASES.RULE = [NFP, THU];
rules:[NFP, THU, PPI]  → ok:false, stale:1   ("a signature for a series NOT in force … refuses as stale" — test.js pins this)
rules:[NFP, THU, WED]  → ok:TRUE,  stale:0   (surplus spec under an in-force NAME — accepted)
```

So the edge `test.js` deliberately inverted ("a surplus name is harmless" → false) is inverted only for names
that vanish entirely. The bytes left behind by deleting one of two same-name rows are the *other* case, and
the unit still resolves that ambiguity in the direction that admits real releases as controls.

**Why this is reachable, not theoretical.** `FILLING.md` sanctions two rows under one name for a series with
two publication rules; `test.js` §26 [R1c] constructs precisely that table and signs both rows as the correct
repair. The very next maintenance edit in that story — dropping the second rule when the series goes back to
one publication, or moving it to `DATED` ("enter the dated rows first, then delete the rule row", which
`FILLING.md` invites) — is the edit above.

**Shape of the fix (not applied).** Build `forceKey` from `calRuleSpecKey` alongside `forceName`, and mark a
signature stale when its **key** is absent from `forceKey`; keep the `forceName` lookup only to choose which
of the three words to print (name still in force → `SIGNATURE DOES NOT MATCH`, name gone → `STALE VOUCH`).
Under that check R1a would report both `changed` and `stale` for one name, so the message selection must stay
name-based to preserve the three deliberately different words. `test.js`'s "a signature written twice is
harmless — the check is set equality, not a count" still passes, since key-set membership is not a multiset.

**Missing regression.** There is no assertion for the R1b × R1c cross. §26 tests delete-the-only-row and
add-a-second-row; the case where those two meet is the hole. A regression needs: sign both rows, delete one,
assert `controlEligible(THU_instant).eligible === false` **and** that the release count actually dropped (so
the test cannot pass by the series never having generated anything).

---

## R7 [MEDIUM] The vouch holds live object references, so an aliased signature can never be invalidated

`calCoverageVouchFaults` compares `c.rules[i]` against `RELEASES.RULE[j]` **by value at call time**. Nothing
requires the signature to be an independent snapshot. If the two share structure, the comparison is a
tautology forever:

```js
rules: RELEASES.RULE                       // direct alias
rules: RELEASES.RULE.slice()               // shallow copy — same row objects
rules: RELEASES.RULE.map(r=>Object.assign({},r))   // row copied, but `et` array SHARED
```

Measured, on shipped `code.js`, with an honest `"*"` over 2026 and then the R1a edit
(`RELEASES.RULE[1].rule = "every-wednesday"`) — the edit the unit's own test pins as `"unvouched-rule"`:

| signature authored as | `vouch ok` after the edit | `controlWindowsPossible` | guard on the real Thursday print `2026-05-07 08:30 ET` |
|---|---|---|---|
| object literals (as `FILLING.md` shows) | **false** | false | `{eligible:false, reason:"unvouched-rule"}` ✅ |
| `RELEASES.RULE.slice()` | **true** | **true** | **`{eligible:true, reason:"ok"}`** |
| `RELEASES.RULE` | **true** | **true** | **`{eligible:true, reason:"ok"}`** |

The `Object.assign` form is the subtlest: `calCoverageRowFault` passes, the audit prints the signature
correctly, R1a's *row-replacement* edits (`RELEASES.RULE[1] = {...}`) are still caught — only in-place `et`
mutation slips through. `RELEASES.RULE[1].et[0]=10` leaves `ok:true`, `reason:"ok"`, and the signature itself
now prints `[10,30]`: the audit shows a signature that matches, because it *is* the thing it is checking.

`FILLING.md` warns the human — *"Never 'fix' a refusal by editing the vouch to match the table without
re-reading the source — that turns the signature into a copy of the thing it is supposed to check"* — but that
warning is about a one-time edit a reviewer can see in a diff. An alias mechanises it permanently and leaves
no diff at all. The whole point of R1 was that a signature must not survive a change to what it signed;
aliasing makes it survive every change forever, and it is the form a programmer reaches for first.

**Shape of the fix (not applied).** In `calCoverageRowFault`, reject a `rules[i]` that is reference-identical
to any row in `RELEASES.RULE`, or whose `et` array is — *"a vouch must be an independent copy; this entry
**is** the row it claims to check"*. Cheap, exact, and it fails at authoring time rather than at the moment a
generator moves.

---

## Held under attack (no defect)

- **Every generator-relevant field is inside the fingerprint.** `calRuleRows`, `calMetaFor`,
  `calRuleSeriesNames` and `calRuleSeriesSpecs` between them read only `name`, `rule`, `et[0]`, `et[1]`,
  `kind`, `tier` off a rule row — exactly `calRuleSpecKey`'s five. I found **no** rule-row field that changes
  what the generator emits and is not signed. Adding an unrecognised key to a rule row changes nothing.
- **Re-ordering `rules`** is correctly a no-op (set equality, not sequence). **Adding** an unvouched series →
  `unvouched-rule`. **Renaming** a series → `stale-vouch`; **renaming and then re-adding the old name** with a
  new row → still refuses (`unvouched-rule` on the renamed series). **Editing** `rule`, `et`, `kind` or `tier`
  in place by row replacement → `unvouched-rule` with `SIGNATURE DOES NOT MATCH`.
- `calRuleSpecKey`'s `JSON.stringify` cannot be forged by a name containing a separator; `Object.create(null)`
  is used for every lookup, and a series named `__proto__` must be signed like any other (pinned in §26).
- **D2 (chained corrections) still closed**: a `02-11→02-13` / `02-13→02-17` chain rejects **both** rows,
  `calTablesUsable()` false, `controlEligible` → `table-errors`, one usable exception left. A duplicate `was`
  rejects both.
- **D3 (a validation failure that deletes a release) still closed** — 88 field drops, 0 quiet-lies (table above).
- **`controlWindowsPossible` now means what its name says.** It is `ctlWin!==null`, and `ctlWin` is produced by
  `calStarScan`, which hands its candidate to `controlEligible()` and only keeps it if the guard agrees. It
  cannot be true while every window is ineligible, and my brute-force cross-check found no period where it is
  false while some window *is* eligible. `controlWindowExample` is published, so the claim is re-checkable.
- **Bad timestamps**: `0`, `-1`, `NaN`, `null`, `undefined`, `"1783080000000"` and a `Date` all →
  `bad-timestamp`. `CAL_T_MIN`/`CAL_T_MAX` edges → `unknown-coverage`, never eligible.

## Observations (recorded, not defects)

- **`kind` is optional on a `DATED` row and defaults silently.** Dropping `kind` from `DATED[0]` emits the
  FOMC statement as `scheduled-numeric` with `calDatedRowFault` → `null`, `datedRejected` 0, and nothing in
  `calendarAudit()` counting it — while the other seven FOMC rows still emit `scheduled-policy`. H3 splits on
  `kind`. Pre-existing and by design (`calMetaFor` is not consulted for `DATED` rows), not a deletion, and
  outside this round's change — but `datedUnsourced` has a counter and this does not.
- **Deleting a sourced `EXCEPTIONS` row is undetectable by the vouch**, and it deletes a real release: drop
  `EXCEPTIONS[0]` under a fully signed `"*"` and the real 2026-02-11 payrolls print vanishes while
  `2026-02-11 08:30 ET` reads `{eligible:true, reason:"ok"}` / `evCov:true`, vouch `ok`, tables usable. I do
  **not** call this a vouch defect: the vouch signs *generators*, and an exception is a hand-transcribed fact
  in the same class as a `DATED` row, whose deletion is equally undetectable. It is the acknowledged limit of
  a mechanism where COVERAGE is a human claim. Worth stating out loud because the vouch's own wording — *"and
  every deviation from them is in EXCEPTIONS"* — incorporates that table by reference, so a reader may believe
  the signature covers it.

## Tests asserting the implementation back to itself

- **`test.js:1178` is tautological.** `ok("[R2] …the audit hands over the instant it is claiming", typeof
  c.controlWindowExample==="number" && controlEligible(c.controlWindowExample).eligible===true)` cannot fail:
  `calStarScan` publishes `win` **only** after `controlEligible(cur).eligible===true`. It asserts the guard
  against itself. My brute-force cross-check (24 period × rule-set combinations, 0 disagreements) is what
  makes `calStarScan` trustworthy; nothing inside the suite does.
- **`test.js:1190`** compares `d.controlWindowsPossible` against `controlEligible(F+45min).eligible ||
  controlEligible(T-45min).eligible` — two arbitrary probe instants, not a scan. Both sides are `false`, so a
  `calStarScan` that missed a clear window would pass it. Weak rather than vacuous.
- The §7/§24 ET conversions still round-trip through the unit's own `usEasternOffsetMinutes`; the second
  review's 271,728-hour IANA sweep remains the only outside evidence for them, and this round's live Fed-page
  check is the only outside evidence for the FOMC dates themselves.
- **No regression assertion exists for R6 or R7.** R6 is worse than uncovered: §26 [R1c] builds the enabling
  table shape and asserts signing both rows as the *correct* end state, one edit away from the hole.

## Re-verify when egress allows

- `bls.gov` is **403 from this environment** (plain and with a browser UA). The two CPI rows
  (2026-08-12, **2026-09-11 — a Friday**) and both `EXCEPTIONS` rows remain unverified against source. Do not
  change them on a guess.
- `federalreserve.gov` **is** reachable (HTTP 200) and the eight 2026 statement dates are now confirmed.
