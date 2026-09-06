# Unit: `calendar` — scheduled-release detector + event-proximity tag

`code.js` is the exact block to splice. `node test.js` runs green (508 assertions, exit 0).
**Second-review revision (2026-09-06)** - see "Fixes applied after the second coverage review" at
the very end, which is the latest word and supersedes anything earlier that disagrees: a `"*"`
coverage row's vouch is now a **signature on a generator specification** rather than a list of
names, `calendarAudit()` reports coverage as **periods** and `controlWindowsPossible` means an
actual window is eligible, a rule row's `et` must be whole numbers, and `controlEligible()`
reports a broken table ahead of release proximity.
**Coverage-review revision (2026-09-06)** - see "Fixes applied after the coverage review" at the
end, which is the latest word and supersedes anything earlier that disagrees: `RELEASES.RULE` now
DRIVES the generator, a `"*"` coverage row must VOUCH for the rule series it rests on, an
order-dependent pair of `EXCEPTIONS` is refused outright, and `evCov` no longer claims to be a
control-eligibility flag.
**Coverage revision (2026-09-06)** - see "The coverage upgrade", which supersedes the
older "`DATED` is empty" text below: `eventTag` now returns **five** keys (`evCov` added), the
table carries verified FOMC/CPI rows plus agency corrections, and `controlEligible()` is a new
**mandatory** gate for CLAUDE.md section 11.3 control selection.
**Post-review revision** - see "Fixes applied after review": `eventTag` gained `evSrc`,
`nearestRelease` returns an extra `src`, and caller-parameter errors (an over-wide horizon, a
non-numeric range) **throw** instead of answering.
Pure: no DOM, no `localStorage`, no `fetch`, no timers, no page globals. It uses **none** of the
provided helpers (`clamp`, `normCdf`, `calSigma`, …) — the test harness deliberately stubs
`normCdf`/`calSigma` with throwers to prove that.

## What is in it

| symbol | kind | notes |
|---|---|---|
| `CAL_HORIZON_MIN` | const `1440` | documented ±24h proximity horizon |
| `CAL_MAX_ITER` | const `20000` | generation guard (~54y of daily walk) |
| `nthDowUtc(y,mo,dow,n)` | fn | Nth weekday of a UTC month, 00:00 UTC |
| `usDstBoundsUtc(y)` | fn | `{start,end}` UTC instants of the year's DST transitions |
| `usEasternOffsetMinutes(utcMs)` | fn | `240` (EDT) or `300` (EST) |
| `etToUtc(y,mo,d,hh,mm)` | fn | ET wall clock → epoch ms |
| `RELEASES` | const | `{RULE:[…2…], DATED:[…10…], EXCEPTIONS:[…2…], COVERAGE:[…1…]}`; `RULE` drives the generator |
| `CAL_T_MIN` / `CAL_T_MAX` | const | plausibility window for any instant (2009-01-01 … 2100-01-01) |
| `CAL_MAX_SPAN_MS` | const | widest range the generator covers (~54.7 y) |
| `CAL_MAX_HORIZON_MIN` | const | widest `horizonMin` (~27.4 y); past it `nearestRelease` refuses |
| `CAL_DATED_BAD` | const array | malformed `DATED` rows seen by the last `releasesBetween` call |
| `calValidTime(t)` | fn | `true` only for a plausible **number** of epoch ms |
| `calDatedRowFault(r)` | fn | why a hand-entered row is unusable, or `null` |
| `calValidateDated(rows?)` | fn | rejected rows as `[{i,name,why}]` — defaults to `RELEASES.DATED` |
| `releasesBetween(t0,t1)` | fn | inclusive range, both sources, sorted by `t`, each row `src`-tagged |
| `nearestRelease(t,horizonMin)` | fn | `{name,kind,tier,src,t,mins}` or `null` |
| `eventTag(t,horizonMin)` | fn | `{ev,evMins,evTier,evSrc,evCov}` — 5 keys, nulls when quiet |
| `CAL_EXC_MAX_SHIFT_MS` | const | largest legal `EXCEPTIONS` shift (45 d); bounds the generation pad |
| `CAL_CONTROL_EXCL_MIN` | const `45` | control exclusion half-width: the window plus two windows either side |
| `CAL_EXPECTED_NAMES` | const | audit checklist of release types — never a source of dates |
| `CAL_KINDS` | const | `["scheduled-numeric","scheduled-policy"]`, validated as a closed set |
| `CAL_EXC_BAD` / `CAL_COVERAGE_BAD` | const arrays | malformed `EXCEPTIONS` / `COVERAGE` rows from the last call |
| `calExceptionRowFault(e)` / `calValidateExceptions(rows?)` | fn | as the `DATED` pair, for overrides |
| `calCoverageRowFault(c)` / `calValidateCoverage(rows?)` | fn | as above, for coverage claims |
| `calMetaFor(name)` | fn | `{kind,tier}` from whichever table describes the name, else `null` |
| `coverageAt(t,name?)` | fn | `{covered,entries}` — is `t` inside declared coverage |
| `calCoverageSpan(t0,t1,name?)` | fn | `{covered,entries}` — is the whole band inside ONE declaration |
| `controlEligible(t)` | fn | `{eligible,reason}` — **the section 11.3 gate**; see below |
| `calendarAudit()` | fn | plain summary + `.text`: how full the calendar actually is |
| `calParseRule(str)` | fn | closed rule vocabulary → `{every}` / `{nth,dow}` / `null`; prototype-free lookup |
| `calRuleRowFault(r)` / `calValidateRule(rows?)` | fn | as the `DATED` pair, for the generator table |
| `CAL_RULE_BAD` | const array | malformed `RULE` rows from the last `releasesBetween` call |
| `calRuleSeriesNames()` | fn | the rule series in force — what a `"*"` claim has to vouch for |
| `calCoverageVouchGap(c)` | fn | rule series a coverage entry does **not** vouch for; `[]` = vouches for all |
| `calUsableExceptions()` | fn | the `EXCEPTIONS` rows the generator will actually apply |
| `calTablesUsable()` | fn | are `RULE`/`DATED`/`EXCEPTIONS` all clean — read by `evCov` and `controlEligible` |
| `calEtDateIso(ms)` | fn | a UTC instant as the **ET** calendar date it falls on (audit rendering) |
| `lastDowUtc(y,mo,dow)` | fn | last weekday of a UTC month — backs `last-<weekday>-of-month` |

Name-collision check against `index.html`: every symbol above that appears in the deployed file
appears **only inside the previously spliced copy of this same unit** (`index.html` 3170-3372,
the block beginning `const CAL_HORIZON_MIN`), which the splice replaces wholesale. The single
exception is one call site: `exportCSV` calls `eventTag(s.t)` at `index.html:1465` and writes
`ev`/`ev_mins`/`ev_tier`. That call keeps working unchanged - the added keys are additive - but
see the export note under the fixes below. The ten symbols added by the
coverage review (`calParseRule`, `calRuleRowFault`, `calValidateRule`, `CAL_RULE_BAD`,
`calRuleSeriesNames`, `calCoverageVouchGap`, `calUsableExceptions`, `calTablesUsable`,
`calEtDateIso`, `lastDowUtc`) return **0** hits anywhere in `index.html`, inside the block or out.
Re-run the scan before the splice; it is the only check that the block can be dropped in blind.
No non-ASCII anywhere in `code.js` (verified), so the `\uXXXX` convention has nothing to escape.

## The DST rule, from first principles

US DST (Energy Policy Act of 2005, in force since 2007): **second Sunday in March at 02:00 EST**
→ **first Sunday in November at 02:00 EDT**. Converted to fixed UTC instants once per year:

- spring: `nthDowUtc(y,2,0,2) + 7h` (02:00 EST = 07:00 UTC)
- fall:   `nthDowUtc(y,10,0,1) + 6h` (02:00 EDT = 06:00 UTC)

No `toLocaleString`, no timezone database, no year-specific table. Tested against independently
known transition dates for **2023–2030** (Mar 12/Nov 5, Mar 10/Nov 3, Mar 9/Nov 2, Mar 8/Nov 1,
Mar 14/Nov 7, Mar 12/Nov 5, Mar 11/Nov 4, Mar 10/Nov 3), plus the offset one minute either side
of every boundary for 2023–2027.

The headline requirement is asserted directly: **08:30 ET → 12:30 UTC in summer, 13:30 UTC in
winter**, including the Thursdays/Fridays immediately before and after both transitions.

### Cross-year safety
`usEasternOffsetMinutes` looks up only the *current UTC year's* bounds. That is safe because
January and December are EST under the rule in every year, so an instant whose ET date falls in
the neighbouring year is still classified correctly. Asserted for Jan 1 00:00Z and Dec 31 23:59Z.

### `etToUtc` edge resolutions (deliberate, documented, tested)
- **Ambiguous fall-back hour** (01:00–01:59 on the November Sunday, which happens twice):
  returns the **first (EDT) occurrence**. 01:30 ET → 05:30 UTC.
- **Non-existent spring-forward gap** (02:00–02:59 on the March Sunday): no offset is
  self-consistent; resolves **forward** via the standard offset, so 02:30 ET → 07:30 UTC = 03:30 EDT.
Neither case can arise for the releases in this unit (08:30 ET), but a hand-entered `DATED` row
could hit them, so the behaviour is pinned by tests rather than left to chance.

## The release table — the honest split

### (a) `RELEASES.RULE` — computed, because the rule really is deterministic
- **NFP** — first Friday of each month, 08:30 ET, **tier 1**
- **CLAIMS** — every Thursday, 08:30 ET, **tier 2**

These are generated by date arithmetic on demand, never stored.

### (b) `RELEASES.DATED` — partial, sourced, and honest about it

**Superseded by "The coverage upgrade" below.** The table is no longer empty: it holds the eight
2026 FOMC statement dates (complete for 2026) and the two CPI dates that could be verified, every
row carrying the agency URL it was read from and the date it was read. Nothing was inferred,
interpolated or extrapolated — the rest of the 2026 CPI schedule was not retrievable and is
therefore simply absent. The original argument stands unchanged and is why the table will stay
partial rather than be filled from memory: a fabricated CPI date silently mislabels every window
around it and poisons the whole event-distance analysis, and it would look like a finding rather
than a bug. What changed is that partial no longer *reads* as complete — see `RELEASES.COVERAGE`.

## Known limits of the rule-derived entries (NOT modelled — read this)

These are real exceptions I chose to leave unhandled rather than approximate:

1. **BLS moves initial claims to Wednesday** in weeks containing a Thursday federal holiday
   (e.g. Thanksgiving). Those weeks will be tagged one day off.
2. **NFP is not always the first Friday.** BLS occasionally shifts it (release-schedule quirks,
   government shutdowns, the 2013 and 2018–19 backlogs). Rare, but real.
3. Neither exception is derivable, so modelling it would mean inventing dates — the same failure
   mode as guessing CPI. If precision matters for a given month, add an explicit `DATED` row; a
   `DATED` row and a rule row for the same event will both appear (the unit does not dedupe across
   sources — see below).
4. No federal-holiday suppression at all: if a market holiday cancels a release, the rule still
   emits it.

## Other deliberate choices

- **`mins` sign convention:** `(release.t - t)/60000`, rounded to whole minutes. **Negative means
  the release already happened**, as specified. Rounded because it is persisted on thousands of rows.
- **Tie-breaking** in `nearestRelease`: exact-distance ties break to the **lower tier number**
  (higher BTC relevance), then to the earlier release. Tested with the genuine Thu-claims /
  Fri-NFP midpoint at 00:30Z, where NFP correctly wins, and one minute either side where pure
  distance correctly wins instead.
- **`horizonMin` is an optional argument**, defaulting to `CAL_HORIZON_MIN` (1440). `<= 0` or
  non-numeric returns `null`; above `CAL_MAX_HORIZON_MIN` (~27.4 y) it throws rather than search a
  range the generator cannot cover. Most 15-minute windows will legitimately tag as `null` under a ±24h horizon — that is
  the correct answer, not a failure, and the orchestrator should not widen the horizon to make
  rows "look tagged".
- **Range endpoints are inclusive** (`t >= t0 && t <= t1`). The generator pads one UTC day either
  side internally and then filters on exact ms, so the pad cannot leak (tested).
- **No dedupe across sources.** If someone adds an NFP row to `DATED`, both it and the rule-derived
  one appear. Silently dropping one would hide a data-entry mistake; surfacing both makes it visible.
- **`kind` is always `"scheduled-numeric"`** for everything here. Unscheduled events (ETF flows,
  exchange outages, Fed speakers) are a different kind and are out of scope for this unit.

## What I deliberately did NOT do

- Did not invent any CPI/PPI/PCE/GDP/ISM/FOMC/retail-sales date.
- Did not fetch a calendar over the network to fill `DATED` (unverifiable inside this unit, and it
  would make a pure function impure).
- Did not model holiday shifts for claims or NFP (see limits above).
- Did not add any caching/memoisation. `releasesBetween` over a ±24h window walks 3 days and 1–2
  months — trivial — but a caller sweeping a multi-year range should hoist the call rather than
  invoke `eventTag` per row inside a tight loop.
- Did not touch `index.html` or any repo file.
- Did not write any order-placing logic.

---

## Fixes applied after review (2026-09-06)

`node test.js`: **186 assertions, exit 0**. Every fix below has a regression assertion that fails
against the pre-fix code — verified by reconstructing the un-fixed unit and running this same
suite against it (36 failures, including the literal
`eventTag(null) -> {"ev":"CLAIMS","evMins":810,"evTier":2}`).

### 1. [MEDIUM] A corrupt or missing timestamp can no longer produce a tag

`nearestRelease` never coerced or checked `t`. `null`, `0` and `false` coerced to 0 and were
answered with the **1 Jan 1970 claims release, 810 minutes away** — a confident tier-2 tag on a
row whose timestamp went missing, persisted and then analysed by event distance. A `Date` or a
numeric string failed the other way (`t+H*60000` string-concatenated inside the range
computation) and reported "no event known" 30 minutes before NFP.

`calValidTime(t)` now gates `nearestRelease`: `typeof t==="number" && isFinite(t) &&
CAL_T_MIN <= t <= CAL_T_MAX`. Everything else returns `null` / the all-null tag. It is
deliberately strict about **type**: a `Date` and `"1783080000000"` are rejected rather than
coerced, so a caller holding either must convert at the call site (`+d`, `Number(s)`) where the
conversion is visible. The plausibility bounds (2009-01-01 … 2100-01-01) are what turn
`0`/`false`/`""` from "a date in 1970" into "not a timestamp".

**The all-null tag for bad `t` is intentionally identical to the all-null tag for a quiet
window.** The only safe thing to say about a row with no clock is nothing; what must be
impossible is the reverse, and that is what the regression cases pin.

### 2. [MEDIUM] Provenance now travels with the data (`src` / `evSrc`) — **API CHANGE**

`RELEASES` keeps `RULE` (inferred) apart from `DATED` (agency-published), and this file records
that the rule entries have real unmodelled exceptions — the 1st-of-month-is-a-Friday NFP case is
**14.4% of months (19 of 132, 2020-2030)** — the at-risk configuration, not the error rate — and
claims shift to Wednesday in holiday weeks
several times a year. The emitted tag flattened that away, so a stored `ev:"NFP"` could not be
told from a published date at analysis time.

Every row from `releasesBetween` now carries `src:"rule"` or `src:"dated"`; `nearestRelease`
returns it as `src`; `eventTag` returns it as **`evSrc`**, a fourth key.

- **`eventTag` now returns 4 keys, not 3.** Anything that asserts the key set, writes a fixed CSV
  header, or diffs stored tags must be updated. The key is present (as `null`) on the all-null
  tag too, so the column set is stable across rows.
- Serialised size is unchanged in practice: 49 bytes for a live tag (the suite asserts < 60).
- This makes "drop rule-derived NFP tags from the event-distance study" a one-line filter instead
  of an archaeology exercise. **Do not strip the key to save bytes.**

### 3. [LOW] Hand-entered `DATED` rows now fail loudly

`DATED` is the one table handed to a human as a data-entry task, and every plausible mistake
(`t:NaN`, `t` omitted, an ISO string instead of epoch ms, a hole in the array) was dropped by the
range filter with no signal — so a populated table read back as "no event known", this unit's
defined meaning for an *empty* table.

- `calDatedRowFault(r)` gives the reason a row is unusable (or `null`): not an object, missing
  `t`, `t` not a number, `t` not finite, `t` outside 2009-2100, missing `name`, `tier` not 1 or 2.
- `calValidateDated(rows?)` returns the rejects as `[{i,name,why}]` — call it after editing.
- `releasesBetween` refreshes `CAL_DATED_BAD` with the same list on **every** call, so the count
  is always current. Clean rows in the same table still flow through normally.

**Splice requirement: surface `CAL_DATED_BAD.length` somewhere in the UI** (a line in the DATA
section is enough). A recorded reject nobody renders is only marginally better than a silent one.

### 4. [LOW] Over-wide requests refuse instead of truncating

The `CAL_MAX_ITER` day-walk used to stop mid-range and return the partial list, so a horizon past
~27 years produced a confidently wrong nearest release (the claims print 5 minutes ago simply
vanished, and NFP +1435 was reported instead).

Now: `releasesBetween` throws `RangeError` when `t1-t0 > CAL_MAX_SPAN_MS` (~54.7 y) and
`nearestRelease` throws when `horizonMin > CAL_MAX_HORIZON_MIN` (~27.4 y); the in-loop guards
throw rather than fall out. `releasesBetween` also throws `TypeError` for a non-finite or
non-numeric range (it used to return `[]`, i.e. "no releases", for a `Date` or a string bound).

The split is deliberate and is the rule for this unit: **bad data returns null, bad caller
parameters throw.** `eventTag`/`nearestRelease` are called per ledger row with a caller-fixed
horizon, so the throw is a development-time failure on the first call, never a mid-run surprise —
and no data value can reach it. A horizon of `0`, a negative, or a non-numeric one still returns
`null` as documented, unchanged.

### Also strengthened in the suite

`ok("unit did not call the poisoned helper stubs", true)` asserted the literal `true`. It now
exercises `eventTag` / `nearestRelease` / `releasesBetween` inside a `threw()` wrapper, so the
throwing stubs are a real assertion. (Errors raised inside the `vm` realm are matched by
`e.name`, not `instanceof` — cross-realm `instanceof` silently fails.)

Finding 5's other nit stands as written: four of §7's assertions convert instants back to ET with
the unit's own offset function. §2's independent transition table and §4's hardcoded ISO strings
pin it from outside, so the suite is not circular, but those four lines carry less weight than
their wording implies. Left as-is — the honest fix is an IANA cross-check, which needs `Intl` in
the harness sandbox.

### How this lines up with the H-protocol selection rule

The cross-cutting finding for this build is about implied volatility, which this unit does not
compute — but its discipline is the same one applied above, and the event tag is likely to be a
grouping column in exactly that study:

- **Omit, never fabricate.** A row with no usable timestamp gets no tag, rather than a clamped or
  coerced one. Same reason a non-identified implied sigma must be dropped rather than pinned to a
  bound: a fabricated value is indistinguishable from a measured one once it is in the ledger.
- **Make the selection countable.** `CAL_DATED_BAD.length` is the omission count for the
  hand-entered table, refreshed on every call, so "what did the calendar throw away" is answerable
  from the data rather than from this file.
- **Carry the caveat in the row.** `evSrc` is the calendar's analogue of shipping the
  identifiability inputs alongside an implied-sigma reading: a rule-derived NFP tag is wrong in
  the ~14% of months whose 1st is a Friday (the configuration where BLS has historically
  sometimes published the following Friday) — not wrong that often, at risk that often — and
  `evSrc:"rule"` is what lets those be filtered at analysis time instead of being discovered
  later, or not at all.

### Untouched by these fixes

The date/timezone math, the DST rule, the tie-break, the `mins` sign convention, the inclusive
range semantics, and the empty `RELEASES.DATED`. **`DATED` is still empty and must stay empty
until filled by hand from the official calendars.** No date was invented here.


---

## The coverage upgrade (2026-09-06)

`node test.js`: **436 assertions, exit 0** (347 at the time this section was written; the
coverage-review fixes below added the rest). Every behaviour below was pinned by mutating the
fixed code and checking the suite goes red: dropping `evCov`, making `controlEligible` ignore coverage,
making it ignore table errors, skipping exception application, emitting a correction only when it
matched a base row, mislabelling corrected rows as `dated`, treating `t:null` as a no-op, letting a
malformed coverage row grant coverage, removing the generation pad, answering the full-calendar
question with a name-scoped entry, unioning coverage across a gap, dropping the audit's uncovered
list, and letting an unusable timestamp buy coverage — **13 mutations, all caught.**

### The hazard this closes

The dated table cannot be completed: the agency schedule pages are blocked by this environment's
egress policy and only fragments are reachable. Partial is fine. Partial *pretending to be
complete* is not, and the unit could not tell the difference: a timestamp with no matching release
returned the same all-null tag whether it meant "no release happened here" or "this unit has never
been told about this period".

That is a correctness hazard with a specific mechanism. CLAUDE.md **section 11.3** requires every
shock claim to be stated against time-matched controls — same UTC slot, same weekday, same quarter,
**no scheduled release** in the window or the two windows either side. If a real CPI print is
missing from the table, that window is not merely unmeasured: it is **silently recruited into the
control group as a quiet window**. The shock contaminates the baseline it is being measured
against, biasing the difference-in-differences estimate toward zero, invisibly, in every downstream
number. **A missing release is worse than a missing observation.**

### `RELEASES.COVERAGE` — what the table claims to know

A list of `{name, from, to, src, retrieved}` (inclusive UTC ms bounds), plus `rules` — mandatory
on a `"*"` row, see "the vouch" below. A period appears **only** when a human has actually
confirmed the schedule for it against the page named in `src`.

**Build `from`/`to` with `etToUtc`, not `Date.UTC`.** Every source page is an ET-shaped schedule,
so a "2026" claim means 2026 in New York. `Date.UTC(2026,0,1)` is 2025-12-31 19:00 ET and
**overclaims five hours of a period nobody read** — and an overclaimed hour is the expensive
direction, because it is an hour in which an unentered release becomes an eligible control. The
seeded FOMC row was rebuilt this way; `calendarAudit()` renders both bounds through
`calEtDateIso`, so what the audit prints is the ET period the human actually claimed.

- `name:"X"` claims every release named X is known in that period, and says nothing about any
  other name. `name:"*"` claims the **whole** calendar is known — every release of every type.
- Adding a release row does **not** add coverage. The two are separate claims on purpose.
- `src` and `retrieved` are **mandatory** here (they are optional on a `DATED` row): a coverage
  entry is the claim that somebody read a page, and a claim with no page is precisely the lie the
  mechanism exists to prevent. A malformed coverage row grants nothing.
- Adjacent entries are **not unioned**. A band straddling the seam between two separately-confirmed
  periods reads as uncovered, so a gap can never be closed by arithmetic. One entry per contiguous
  confirmed period.

**Seeded with exactly one entry: FOMC, 2026, from federalreserve.gov.** That is the only schedule
the verified data establishes as complete. In particular **CPI has two verified rows and no
coverage** — rows are not a claim of completeness, and that pair is the clearest statement of the
distinction in the unit.

**There is deliberately no `"*"` entry.** Nobody has confirmed a complete calendar for any period,
so `controlEligible()` currently returns `false` for every timestamp in history. The suite asserts
this as the shipped state (`AS SHIPPED, no window anywhere in 2026 is a usable control`) so that
nobody mistakes it for a bug. It is a 5%-full calendar reporting itself accurately.

### `eventTag().evCov` — the two kinds of silence

Fifth key, boolean or null. `ev/evMins/evTier/evSrc` keep their exact previous meanings.

| `ev` | `evCov` | means |
|---|---|---|
| `null` | `true` | **no release here** — inside a declared period, with the generating tables currently clean |
| `null` | `false` | **unknown** — never told about this period, *or* a table this calendar is generated from holds a rejected row. Not a usable control, and not a usable shock window either |
| `null` | `null` | `t` is not a usable timestamp; the whole tag is null, exactly as before |
| set | either | a real release. `evCov` is **not** a confidence flag on `ev`: a release can be known inside a period whose completeness is not |

**`evCov` is not control eligibility and nothing may read it as such** — that promise was withdrawn
by the coverage review (D3 below). `controlEligible(t)` is the only authority: it additionally
requires the ±45 min band to be clear, coverage to span the **whole** band rather than merely
contain `t`, and the covering `"*"` entry to vouch for every rule series in force. `evCov:true` is
a necessary condition of eligibility, never a sufficient one — a window five minutes from CPI
inside declared coverage has `evCov:true`. The key exists so a *persisted* row can tell "quiet"
from "unknown" months later; the ruling is always re-taken by calling `controlEligible`.

Serialised size 66 bytes for a live tag (the suite asserts < 80; it was < 60 at four keys). **Do not
strip the key to save bytes** — without it the ledger cannot distinguish a control from an unknown
after the fact, which is the entire point.

### `controlEligible(t)` — the gate that makes coverage load-bearing

Returns `{eligible, reason}` with `reason` one of `"ok"`, `"release-nearby"`, `"table-errors"`,
`"unknown-coverage"`, `"unvouched-rule"`, `"bad-timestamp"`.

> **CLAUDE.md section 11.3 control selection MUST call `controlEligible(t)` and keep only
> `{eligible:true}` candidates.** Without it the COVERAGE declaration is decoration: an uncovered
> window would pass the slot/weekday/quarter match, look quiet because this unit has no row for it,
> and pull a real shock into the control group.

- The exclusion band is `CAL_CONTROL_EXCL_MIN = 45` minutes either side — the window itself plus
  two windows either side (section 11.3), taken symmetrically from any instant in the window so a
  caller may pass a window start, mid or gate without changing the answer. Asserted at 45 (excluded)
  and 46 (clear).
- Coverage must span the **whole** band, not merely contain `t`.
- `"table-errors"`: if `RELEASES.RULE`, `RELEASES.DATED` or `RELEASES.EXCEPTIONS` currently holds a
  rejected row, **no** window is eligible. A table with a rejected row cannot be trusted to be
  complete even where it claims to be, and a rejected row reads as "no event known", which is the
  failure mode here. `RULE` was added to that set when the table became the generator: a rejected
  rule row is a whole release *series* that stops being emitted.
- `"unvouched-rule"`: the period is declared, but its `"*"` entry does not vouch for every rule
  series in force. See D1 below — this is the reason the reviewer's Thanksgiving case now refuses.
- It is also how section 11.3's "control coverage >= 80%" is computed honestly: a shock window with
  fewer than five *eligible* controls is unmatched and unscored, not scored against a thinner set.

### `RELEASES.EXCEPTIONS` — the rule provably has exceptions

`{name, was, t, src, retrieved, note}`, optional `kind`/`tier`.

- Any generated or dated row with the same `name` and `t === was` is **removed**; a row is then
  emitted at `t` with `src:"corrected"` and the superseded instant in `was`, so the correction
  survives into the persisted tag as `evSrc:"corrected"` rather than living in a comment.
- Emission is **unconditional** for a non-null `t` — an exception is agency evidence in its own
  right. The seeded CPI reschedule has no base row at its original date and therefore *inserts*;
  dropping it for want of a base row would put a real CPI print back into the control pool.
  `calendarAudit()` labels each override `overrides` / `inserts` / `cancels` so an override that
  overrides nothing is visible rather than silent.
- A correction landing on a date the table already lists **collapses** onto that row and re-tags it
  `corrected`, rather than duplicating it.
- **Suppression** is `t:null` — cancelled, not moved: the base row is removed and nothing is
  emitted. `t` merely *absent* is a rejected row, and the reject message points at `t:null`, so the
  two cases can never be confused.
- A shift larger than `CAL_EXC_MAX_SHIFT_MS` (45 d) is rejected. That bound is what makes the
  generation pad provably sufficient: `releasesBetween` generates over `[t0-pad, t1+pad]` (pad = the
  largest shift actually present, 0 when there are none), applies the exceptions, then filters to
  the exact range — so a moved release lands where the agency says it landed, and a correction can
  read the metadata of the row it corrects even when that row sits outside the queried range.

**Seeded from the BLS lapse-in-appropriations notice:** NFP (Employment Situation, Jan-2026 ref)
`2026-02-06 -> 2026-02-11`, and CPI (Jan-2026 ref) `2026-02-11 -> 2026-02-13`. The first matters
beyond its own date: **February 2026 jobs came out on a Wednesday**, so the first-Friday rule is
wrong inside the live data period, and silently wrong is the failure mode this unit exists to
avoid. The suite pins that the window which actually held the moved NFP is excluded from controls
and the window it would have occupied under the rule is not.

### `calendarAudit()` — one call, and you can see it is 5% full

Returns a plain object (counts, names, coverage entries with ISO bounds, per-override effect,
rejects with reasons, `datedUnsourced`, `fullCoverageDays`, `controlWindowsPossible`,
`uncoveredNames`) plus `.text`, which reads:

```
calendar audit - the table is PARTIAL by construction; this is how partial.
  DATED rows: 10 valid, 0 rejected  [FOMC x8, CPI x2]
  RULE series (these GENERATE rows): NFP (first-friday-of-month), CLAIMS (every-thursday)  - derived, at risk in holiday/shutdown weeks
  EXCEPTIONS: 2 (0 rejected)
    NFP 2026-02-06 -> 2026-02-11 [overrides]
    CPI 2026-02-11 -> 2026-02-13 [inserts]
  COVERAGE declared: 1 entry (0 rejected)
    FOMC  2026-01-01 .. 2026-12-31 (ET)  (https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm, read 2026-09-06)
  FULL-CALENDAR ("*") COVERAGE: NONE - controlEligible() returns false for every timestamp, so no window anywhere is a usable section 11.3 control yet
  NO COVERAGE AT ALL: CPI, PPI, PCE, GDP, NFP, CLAIMS, ISM, RETAIL
  A name with rows but no coverage is honest and unusable for control matching; see FILLING.md.
```

Verbatim from `calendarAudit().text` on the shipped tables. Three things in it are load-bearing
and were wrong or missing before the coverage review: the `DATED` line prints the **valid** count
(it printed the row total under the word "valid"); the `RULE` line says *these GENERATE rows*,
because they now do; and the coverage bounds are rendered as **ET** dates, because that is the
shape of the source page. A `"*"` entry additionally prints how many inferred dates it rests on
and which rule series it vouches for.

**Splice requirement, extending the earlier `CAL_DATED_BAD.length` one:** surface
`calendarAudit().fullCoverageDays`, `controlWindowsPossible`, and the **four** reject counts
(`ruleRejected`, `datedRejected`, `exceptionsRejected`, `coverageRejected`) in the DATA section. A
calendar that reports itself as empty and is never rendered is only marginally better than one
that lies — and `controlWindowsPossible` is the one line that says whether section 11.3 has any
controls to draw on at all: it is `false` unless a `"*"` entry exists, vouches for every rule
series in force, and the generating tables are clean.

### Data loaded, and its provenance

| what | source | note |
|---|---|---|
| 8 FOMC 2026 statements, 14:00 ET, tier 1, `kind:"scheduled-policy"` | federalreserve.gov FOMC calendar | complete for 2026 (eight meetings, count checked) — the only thing COVERAGE claims |
| CPI 2026-08-12, 2026-09-11, 08:30 ET, tier 1 | bls.gov CPI schedule | **only** these two were retrievable; no coverage claimed. **2026-09-11 is a FRIDAY — atypical for CPI (BLS publishes Tue–Thu in the large majority of months), unverifiable from this environment, and deliberately NOT changed.** The flag is carried in `code.js` beside the row itself, not only here: re-verify against the `src` page when egress allows, and if it is wrong, fix it as an edit to that row with a fresh `retrieved`, never as an `EXCEPTION` (there is no agency correction, only an unchecked transcription). |
| NFP 2026-02-06 -> 2026-02-11 | bls.gov 2025 lapse revised release dates | proves the first-Friday rule has live exceptions |
| CPI 2026-02-11 -> 2026-02-13 | same | inserts (no base row at the original date) |

`kind:"scheduled-policy"` for FOMC is deliberate and is validated as a closed set with
`scheduled-numeric`: a rate decision is a policy announcement, not a data print, and **H3 splits
informed vs narrative flow by release type**, so conflating the two would blur the very distinction
H3 exists to test. Nothing else in the table is a policy announcement.

Not one date beyond that list was added, inferred, interpolated or extrapolated. The obvious
patterns (CPI mid-month, PPI after CPI, ISM early-month) are exactly the inferences that would
poison the analysis; every row in the table is checkable against the page in its `src`.

### Cost and compatibility

- `eventTag` is now ~29 µs (was ~5 µs): each call re-validates the hand-entered tables and applies
  the exceptions, which is what keeps `CAL_*_BAD` current. Fine per tick and per ledger row (~29 ms
  per thousand rows); a multi-year sweep should still hoist `releasesBetween` rather than call
  `eventTag` in a tight loop.
- **API changes:** `eventTag` returns 5 keys (was 4) — anything asserting the key set or writing a
  fixed CSV header must add `evCov`. Emitted release rows and `nearestRelease` gained `ref` (the
  agency URL, `null` for rule rows), `retrieved`, and `was` on corrected rows; `src` gained a third
  value, `"corrected"`. Everything previously exported still exists and behaves as before.
- On a table row, `src` is the **agency URL**; on an emitted row and in the tag, `src`/`evSrc` is
  the **provenance class**. The two meanings are deliberate and are documented at the table.

---

## Fixes applied after the coverage review (2026-09-06)

`node test.js`: **440 assertions, exit 0** (was 347). Four defects from the adversarial review of
the coverage upgrade, plus its three nits. Each fix has a regression case built from **the
reviewer's own reproduction**, not from the implementation.

**Mutation kills — 14 attempted, 14 caught, 0 survivors.** Reverting each fix in a throwaway copy
takes the suite red: `controlEligible` ignoring the vouch (4 kills); a `"*"` row not needing
`rules` (1); vouches combined across entries (1); the chain check disabled (4); only the *later*
row of a chain rejected (8); `evCov` dropping `calTablesUsable()` (4); the generator hardcoding a
series name in either branch (1 each); the generator ignoring the table's `et` (1); the audit
listing rule rows the generator rejects (1); a rejected `RULE` row not blocking controls (2);
`.text` printing the row total under "valid" (1); the audit's name maps inheriting
`Object.prototype` (2); and the coverage bounds rebuilt with `Date.UTC` (5). That last one is the
check that the ET/UTC nit is pinned rather than merely fixed.

Nothing here loosened an existing guarantee, and **no date was added to any table**: still the
same 10 `DATED` rows, 2 `EXCEPTIONS`, 1 `COVERAGE` entry and 2 `RULE` series, with the eight FOMC
instants and both CPI rows unchanged (re-rendered through IANA `America/New_York`: all eight FOMC
at 14:00 ET on a Wednesday, both CPI at 08:30 ET).

### D1 [MEDIUM-HIGH] — a `"*"` declaration must now VOUCH for the rule series it rests on

**The hole.** `COVERAGE` protects against a **missing `DATED` row**. It did nothing about a
**wrong `RULE` row**, and `RELEASES.RULE` is a generator that can be confidently wrong: BLS moves
initial claims to Wednesday in weeks containing a Thursday federal holiday, and NFP is not always
the first Friday. `src:"rule"` marks the row the rule **emits**; it cannot mark the window the rule
**got wrong**, and that window — a real release the rule placed a day away — is exactly the one
that reads quiet and is recruited into the control group.

Reproduced by the reviewer at Thanksgiving 2026 (Thursday 26 November): with a bare `"*"` over
2026, the rule marks the *fictional* Thursday busy (`release-nearby`, harmless: one control lost)
while the **real Wednesday claims print** returned `{eligible:true, reason:"ok"}`. That asymmetry
is the whole hazard in one case: the fiction is excluded and the shock is admitted.

**The fix — approach (a), the vouch.** A `"*"` coverage row must carry
`rules:["NFP","CLAIMS", …]` (**the name-shaped form, superseded by R1 — see the last section**):
the human declaring the period states, in data, which rule series they
checked against the agency schedule over it. A `"*"` row with no `rules` field is a **rejected
row** (it grants nothing). `controlEligible()` returns the new reason `"unvouched-rule"` for any
window whose covering entry does not vouch for **every** series currently in `RELEASES.RULE`.
The check is against the live table, so adding a rule series later correctly invalidates an older
vouch instead of being carried by it, and vouches are never combined across entries — one entry
must carry the whole claim itself, for the same reason adjacent coverage periods are never unioned.

**Why (a) and not (b) — the derived federal-holiday table.** (b) is stronger *only if the holiday
set is complete*, and completeness is exactly what this environment cannot establish: the
statutory dates are rule-derivable, but **which day is observed is not always the statutory date**
(a fixed-date holiday falling at a weekend is observed on an adjacent weekday, and the adjustment
rule is itself a convention rather than something this unit has read off an agency page), an
inauguration day is a DC holiday on a four-year cycle, and a president may declare a one-off
closure — a national day of mourning is on no calendar in advance. An incomplete holiday table
recreates *exactly* the false confidence being removed, one level down, and does it with
inference rather than with a human's signature. (b) also cannot see the failure mode that actually
produced both seeded `EXCEPTIONS`: a **lapse in appropriations**, which is not a holiday and is not
on any calendar in advance. Deriving a holiday set here would mean writing dates this unit was
never told, which is the one thing its header forbids.

(a) invents nothing, adds no new inference, and puts the burden on the
human declaring coverage — which is where the rest of this design already puts it. A vouch is
falsifiable in the way this unit requires: it names the series, next to `src` and `retrieved`, and
`calendarAudit()` prints it alongside the count of inferred dates the claim rests on.

**Regression** (`test.js` §24): 2026-11-26 is pinned as the fourth Thursday of
November from outside the unit; a `"*"` vouching only for `NFP` refuses the real Wednesday print
with `"unvouched-rule"`; the refusal is period-wide rather than a special case for the holiday; a
fully vouched period **plus** the Wednesday correction entered in `EXCEPTIONS` then flips the pair
the right way round (Wednesday `release-nearby`, Thursday `ok`) — which is what the vouch is
claiming, and why the burden belongs there; adding a rule series invalidates the older vouch; two
half-vouches do not add up to a whole one; a `"*"` row with no `rules` is rejected and grants
nothing; and **as shipped there is still no `"*"` entry at all**, so no window anywhere is
control-eligible.

Two edges the vouch creates are pinned as deliberate, not left to accident: vouching for a name
that is **not** a rule series is harmless surplus (the gap is computed from the series *in force*),
and an **empty** `RELEASES.RULE` makes `rules:[]` a complete vouch — with no generator, every
release in the period must have been hand-entered as a `DATED` row, which is exactly what a `"*"`
declaration asserts. The dangerous direction — a series in force that the vouch does not name — is
the one that refuses.

> **The first of those two edges is SUPERSEDED by R1 (last section).** A surplus name and the
> residue of a *deleted* rule series are the same bytes, and the second review showed the unit
> was resolving that ambiguity in the direction that admits real releases as controls. A
> signature for a series not in force now refuses as `"stale-vouch"`. The second edge survives
> unchanged. The name-shaped `rules:["NFP","CLAIMS"]` in this section is also superseded: a vouch
> is now a copy of the rule rows themselves, and a bare name is a rejected coverage row.

**What the vouch does not do.** It is an attestation, not a check — a human who vouches carelessly
still poisons the control group. That is deliberate: the unit cannot verify an agency schedule it
cannot fetch, and pretending otherwise is the failure this whole layer exists to prevent. What it
does buy is that the claim is now *recorded, scoped and countable*: `calendarAudit()` reports, per
`"*"` entry, how many **rule-derived (inferred)** dates the period rests on and which series are
`NOT VOUCHED`.

### D2 [MEDIUM] — an order-dependent pair of `EXCEPTIONS` is refused outright

`calApplyExceptions` walks the table in array order applying each row once, and emission is
unconditional, so a **chain** (X → Y, then Y → Z — the shape an agency produces when it revises a
date it has already revised) gave a different calendar depending on where a human typed the rows:
`[A,B]` yielded the single correct date, `[B,A]` yielded the correct date **and a phantom release
at the intermediate date, which never happened**. Silent: `exceptionsRejected` read 0 and the two
rows were labelled `["inserts","overrides"]`, individually true and collectively misleading.

Iterating to a fixpoint does not fix it (unconditional emission makes it oscillate), so the fix is
a **cross-row validation**: `calExceptionCrossFaults()` rejects both rows of a pair where one
override's `t` is the other's `was`, or where two rows override the same `was`, for the same name.
Both rows, not just the later one — applying half a chain leaves the intermediate date standing as
if it were the answer, which is the phantom again wearing a deterministic hat. The reject message
names the fault as a `CHAIN` and says the repair (collapse it into one row, original → final).
A chain therefore takes `controlEligible()` to `"table-errors"` and `evCov` to `false` until a
human fixes it: **a loud rejection beats a phantom release.**

`calUsableExceptions()` is the single list both `calApplyExceptions` and `calExcPad` read, so what
the generator applies and what the validator accepts cannot diverge. The check is deliberately
**name-scoped**: the two seeded corrections share an instant (NFP moves *to* 2026-02-11, CPI moves
*from* it) and are unrelated events, not a chain — asserted.

**Regression** (`test.js` §22): both orders now emit nothing and reject 2 rows; the message names
CHAIN and the repair; the audit no longer lists the pair as two independently-true effects; a
chain disqualifies every control window; a single unchained correction still applies exactly as
before; and the seeded pair is still not treated as a chain.

### D3 [MEDIUM] — `evCov` no longer promises what it does not check

The doc block said `evCov===true` meant the window was **usable as a section 11.3 control**, but
unlike `controlEligible` it applied no table-error check, so a malformed `DATED` or `EXCEPTIONS`
row left `evCov` reading `true`. The sharp case is the one a hand-filling human will actually hit:
drop `retrieved` from the seeded NFP correction and the whole correction stops applying — February
2026 emits only `2026-02-06/rule` and **the real 2026-02-11 payrolls print vanishes from the
calendar entirely**, while the window that held it still sits inside a declared period. A
validation failure that *deletes* a known release is the worst available failure direction.

Both halves of the review's recommendation were taken, because they close different holes:

1. `evCov` now requires `calTablesUsable()` as well as coverage — a rejected `RULE`, `DATED` or
   `EXCEPTIONS` row drives it `false`, so a deletion can no longer read as quiet.
2. The "usable as a control" sentence is **deleted** from the doc block and replaced with
   `evCov IS NOT CONTROL ELIGIBILITY, and nothing downstream may treat it as such` plus a pointer
   to `controlEligible` as the only authority. Even with (1), `evCov:true` is necessary and not
   sufficient — a window five minutes from CPI has it.

The rejection is loud, not silent: the row is listed in `CAL_EXC_BAD` with its reason, counted by
`calendarAudit().exceptionsRejected`, printed in `.text` under `TABLES REJECTED` with the sentence
"a refused row is a release this unit does NOT emit", and `controlEligible()` refuses **every**
window with `"table-errors"` until it is fixed.

**Regression** (`test.js` §23): the reviewer's three-row table is asserted directly — the dropped
`retrieved` case, the malformed `DATED` case, and a rejected `RULE` row — all now read
`evCov:false` and agree with `controlEligible`; `evCov:true` five minutes from a release is
asserted **not** to imply eligibility; an unusable timestamp still returns the all-null tag; the
tag is still exactly five keys.

### D4 [LOW] — `RELEASES.RULE` now drives the generator it is audited as driving

`calRuleRows()` hardcoded both series and never read the table, while `calendarAudit()` reported
the table. A maintainer adding `{name:"PPI", rule:"every-monday"}` saw PPI in the audit and got
zero PPI rows; renaming `CLAIMS` still emitted `CLAIMS`. That compounds D1, because the audit is
precisely the surface a human consults before declaring `"*"` — it was possible to add a series,
see it in the audit, and declare completeness over a release type generating nothing.

The generator was made to read the table (the stronger of the two options offered: the alternative
was a comment saying the table is decorative, which leaves the audit's most consulted line still
describing something other than the output). `calParseRule()` defines a **closed** vocabulary —
`every-<weekday>` and `first|second|third|fourth|last-<weekday>-of-month` — over prototype-free
lookup tables, so `every-constructor` cannot parse. `calRuleRowFault()` validates each row with
`kind`/`tier`/`et` **mandatory** (a rule row is a generator specification, not a transcribed fact
with a missing annotation), rejects go to `CAL_RULE_BAD` and to the audit, and a rejected rule row
takes `controlEligible()` to `"table-errors"` — a series that silently stops generating is a whole
missing release stream, the same failure direction as D3.

**Regression** (`test.js` §25): adding a series to the table really emits rows, with the table's
own `et`, `tier` and `kind`; renaming a series renames the output; an underspecified or unparseable
row is rejected with an actionable reason, appears nowhere in the audit's series list, is counted
as rejected, is announced in `.text`, and makes every control window impossible; `calParseRule`
cannot be fooled by a prototype key; `last-<weekday>-of-month` lands on the last one.

### The three nits, all taken

- `calendarAudit().text` prints `datedValid` under the word "valid" (it printed the row total),
  and `datedValid` is 0 rather than `-1` when `RELEASES.DATED` is not an array — which is itself
  reported as a rejected table.
- Coverage bounds are built with `etToUtc`, not `Date.UTC`. The seeded FOMC 2026 row no longer
  over-reaches five hours into 2025, and `FILLING.md`'s worked example was corrected the same way,
  since an over-claimed `"*"` hour is the expensive direction.
- `calendarAudit()` builds its name maps with `Object.create(null)`, so a row named `toString` or
  `constructor` is counted like any other rather than swallowed by `Object.prototype`.
- Test-suite: the `coverageAt()` assertion that compared the implementation to itself was replaced
  with one that pins the answer against a literal. `test.js` §26 covers the audit's own arithmetic.

### Preserved, and re-asserted

- **No unknown-coverage window is control-eligible.** The reviewer could not break this across a
  dozen attack paths and the vouch only ever *adds* a refusal — `unvouched-rule` is reachable only
  from inside a declared period. A 25,069-instant sweep of 2015-2036 returns only
  `unknown-coverage` (24,791) and `release-nearby` (278) — not one `ok`.
- **As shipped, no window anywhere is a usable control.** There is still no `"*"` entry, vouched or
  otherwise; `fullCoverageDays` is 0 and `controlWindowsPossible` is `false`. Asserted at the end
  of the run along with the exact contents of all four tables.
- No date, source, statistic or threshold was invented. `RELEASES` is byte-identical to the
  reviewed seed apart from the two coverage bounds being rebuilt with `etToUtc` (the same claimed
  ET period, honestly expressed) and the mandatory `rules` field, which the one seeded row does
  not carry because it is name-scoped and grants no controls either way.

### Splice note for the consumer at `index.html:1465`

`exportCSV` calls `eventTag(s.t)` and writes `ev`, `ev_mins`, `ev_tier`. That keeps working
unchanged. It does **not** currently write `ev_src` or `ev_cov`, so nothing downstream can be
reading control-eligibility off `evCov` today — and when those columns are added, the CSV header
must be extended and `evCov` must be documented in the export as "quiet vs unknown", never as
"control-eligible". Section 11.3 control selection calls `controlEligible(t)`; a persisted `evCov`
is a filter for finding candidates, not a ruling on them.

---

## Fixes applied after the second coverage review (2026-09-06)

`node test.js`: **508 assertions, exit 0** (was 440). The second review confirmed D2, D3 and D4
closed and D1 closed *against its own reproduction*, and then reopened D1 through three ordinary
maintenance edits (R1a/R1b/R1c). Those three, plus R2, R3 and R4, are fixed here. **R5 is a nit
the reviewer asked not to have fixed and it is recorded below rather than closed.**

**Mutation kills — 9 attempted, 9 caught, 0 survivors.** Reverting each fix in a throwaway copy
takes the suite red: the signature reduced to a name (7 failing assertions); the stale-signature
check disabled (7); a bare-name vouch accepted again (1); `controlEligible` back to a gap-only
check (3); the audit's per-name coverage back to a boolean (3); `controlWindowsPossible` back to
"a vouched `"*"` row exists" (3); the `et` integrality check removed (6); the `table-errors` /
`release-nearby` order swapped back (2); `evCov` untied from the vouch (2).

**No date, source, statistic or threshold was invented, and no row was added or removed:** still
exactly **10 `DATED` rows, 2 `EXCEPTIONS`, 1 `COVERAGE` entry, 2 `RULE` series**, with the eight
FOMC instants and both CPI rows byte-identical. The only change to `RELEASES` is the comment
carrying the CPI 2026-09-11 flag (below).

### R1 [MEDIUM-HIGH] — a vouch is a SIGNATURE ON A GENERATOR SPECIFICATION, not a name

**The hole.** The vouch bound to a *series name*: `calCoverageVouchGap` compared the strings in
`c.rules` against `calRuleSeriesNames()`. Nothing tied a signature to what the vouched row
actually generates, so three edits — each starting from a signature that was **true when it was
written** — walked straight back into D1's asymmetry, in which the window holding a **real**
release reads `{eligible:true, reason:"ok"}` and is recruited into the control group:

| | edit | what the name-shaped vouch saw | what it should have seen |
|---|---|---|---|
| **R1a** | edit a vouched row in place (`every-thursday` → `every-wednesday`, or `et [8,30]` → `[10,0]`) | nothing: the name is still vouched | the generator was redirected; the real print's window now reads quiet |
| **R1b** | **remove** a vouched row — the move `FILLING.md` itself invites | nothing: `need` shrank too, so the stale name was still a *complete* vouch | a whole release series stopped being emitted; ~52 real windows a year became eligible controls |
| **R1c** | add a second row under an already-vouched name | nothing: `calRuleSeriesNames()` de-duplicates by name | a second generator nobody checked, covered by a signature written against the other row |

R1b is the deletion direction, which this file already calls the worst available failure
direction — and `calendarAudit()` *corroborated* it, printing `vouched: NFP, CLAIMS` and
`NO COVERAGE AT ALL: (none)` while the series generated nothing.

**The fix.** A `"*"` row's `rules` is now an array of **rule-row specifications** — copies of the
rows the human checked — validated by `calRuleRowFault`, the same validator the generator uses:

```js
rules:[{name:"NFP",   kind:"scheduled-numeric", tier:1, et:[8,30], rule:"first-friday-of-month"},
       {name:"CLAIMS",kind:"scheduled-numeric", tier:2, et:[8,30], rule:"every-thursday"}]
```

A bare name is a **rejected coverage row** with a reason that says why a name cannot do the job.
The invariant is stated in `code.js` at the table and at `calRuleSpecKey`:

> **A vouch is a signature on a generator specification, and it must not survive a change to what
> it signed.** The set of signed specifications and the set of rule specifications in force must
> be equal, field for field.

**Which fields are signed, and why exactly those.** `calRuleSpecKey` signs `name`, `rule`, `et`,
`kind`, `tier` — precisely the five fields `calRuleRowFault` makes **mandatory**, because a rule
row is a generator specification rather than a transcribed fact. `rule` and `et` decide *which
instants* are emitted and are non-negotiable. `kind` and `tier` do not move a date, but they decide
what the emitted row *says the release is*: H3 splits informed from narrative flow by `kind`, and
`evTier` is persisted on every ledger row. Including them costs a maintainer one re-signature and
buys a refusal when a release is silently re-classified; excluding them would need an argument
about where inside the mandatory five to draw the line, and this unit cannot check that argument.
The mandatory set is the one boundary that is not a judgment call, so it is the boundary used.
The key is `JSON.stringify` of the five, so no separator can be forged by a name containing one.

**Three refusals, in three deliberately different words**, because the three repairs differ:

| audit says | `controlEligible` | means |
|---|---|---|
| `NOT VOUCHED: <spec>` | `"unvouched-rule"` | a generator in force that no signature names — a series was added |
| `SIGNATURE DOES NOT MATCH: <in force> ... signed against <spec>` | `"unvouched-rule"` | a signed name whose specification changed — R1a, and R1c's second row |
| `STALE VOUCH: <spec> ... no longer a rule series in force` | `"stale-vouch"` | a signature whose series is gone — R1b |

**The default is refusal.** `calCoverageVouchFaults(c).ok` — nothing wrong in any of the three
directions — is the **only** sufficient condition, and `calCoverageVouchGap()` returning `[]` is
explicitly *not* permission (R1b leaves the gap empty). The audit prints the full specification on
both sides of a mismatch, so the repair is visible without diffing anything.

**One earlier edge is inverted, deliberately.** The first round pinned "vouching for a name that is
not a rule series neither grants nor withholds anything" as intended. It is not: a surplus name and
the residue of a deleted series are the same bytes, and the unit was resolving that ambiguity in
the direction that admits releases as controls. It now refuses as `"stale-vouch"`. The other
edge survives: with an **empty** `RELEASES.RULE` there is nothing to sign, so `rules:[]` is a
complete vouch — but a signature *left behind* after the table was emptied still refuses.

**Blast radius beyond `controlEligible`, also closed.** R1b drove `evCov:true` on windows that held
a real claims print, and that tag is persisted on thousands of ledger rows and read months later as
"quiet". D3 had tied `evCov` to `calTablesUsable()`, and a *removed* row is not a table error — the
remaining table is perfectly valid — so it slipped through. `evCov` now additionally requires at
least one covering claim whose signature still matches the generators in force. This is a
strengthening: `evCov` becomes rarer, never more permissive, and it remains **not** control
eligibility (`controlEligible` is still the only authority).

**Regression** (`test.js` §24): all three reproductions are built from the review's own text —
R1a for the cadence and for the publication time, plus `kind`/`tier` to pin the signed set; R1b
including the empty-gap assertion that shows why a gap check alone could not see it; R1c including
`calRuleSeriesSpecs().length === 3` against `calRuleSeriesNames()` unchanged, which is the
de-duplication the old check relied on. Each asserts the refusal, the audit's wording, the
`controlWindowsPossible` collapse and (for R1a/R1b) `evCov:false`. The suite's vouch literals are
written out **as literals** rather than copied from `RELEASES.RULE` at run time, so an edit to the
rule table takes the suite red instead of silently re-signing itself.

### R2 [MEDIUM] — the audit reports coverage as PERIODS, and `controlWindowsPossible` is measured

`uncovered` was `all.filter(n => !(covNames[n] || covNames["*"]))`: it recorded only *that* a name
appeared in some coverage row, never *when*. A `"*"` row covering **one hour** reported every
series as covered across all of history, and the shipped FOMC-2026 row read as covering FOMC for
all time — on the one surface `FILLING.md` tells a maintainer to read before believing a
declaration.

- `calendarAudit()` now returns `coverageByName` — per name, the **periods** that cover it, with
  the entry each came from — and `.text` prints them: `FOMC: 2026-01-01 .. 2026-12-31 ET`,
  `CPI: no coverage declared - windows here are UNKNOWN, not quiet`.
- The old summary line is renamed and qualified: `NAMES WITH NO DECLARED PERIOD ANYWHERE: … -
  this is NOT a statement that anything is covered NOW; read the periods above for when.`
  `uncoveredNames` keeps its narrow meaning (no declared period *anywhere*), which is what the
  existing consumers and tests use.
- **`controlWindowsPossible` now means what its name says.** It used to mean "a vouched `"*"` row
  exists", which over-claims twice: a period narrower than the ±45 min band can never *span* the
  band (every window inside it reads `unknown-coverage`), and a period packed with releases has no
  clear window either. `calStarScan()` finds the earliest instant at least `CAL_CONTROL_EXCL_MIN`
  from both period edges and from every release inside, **hands it to `controlEligible()`, and
  only counts it if the guard agrees**. That instant is returned as `controlWindowExample` and
  printed, so the audit's headline claim is checkable rather than asserted. A claim wider than
  `CAL_AUDIT_SCAN_MAX_MS` (5×366 days) is scanned over its first slice and **says so** in the text.

Cross-checked outside the unit: with a fully signed `"*"` over 2026, `controlEligible` agrees with
a brute-force "any release within ±45 min" on **all 35,040 15-minute windows of the year, zero
mismatches**, and the audit's `controlWindowExample` is exactly the earliest eligible instant
(`2026-01-01T05:45:00Z`, i.e. `from + 45 min`).

### R3 [LOW] — a rule row's `et` must be whole numbers

`et:[8.5,30]` validated clean and `Date.UTC` truncated the hour to 8, so the series published at a
time nobody wrote; `et:[13.9,0]` was not caught at all. `Number.isInteger` on both elements, and
the message now says "whole numbers" as well as promising a range. A fractional `et` is a
**rejected row**, so the series generates nothing and `controlEligible()` refuses everything with
`"table-errors"` — the same treatment as any other unusable generator specification. A vouch
carrying a fractional `et` is refused by the same validator, since a signature is a rule row.

### R4 [LOW] — a broken table is reported as a broken table, not as release proximity

`controlEligible` checked `release-nearby` before `table-errors`, so a window that still had a
*generated* release nearby reported ordinary proximity while the tables were unusable. Eligibility
was correct either way, so this was never a contamination path — but `code.js` states at
`controlEligible` that counting these reasons is how section 11.3's **"control coverage ≥ 80%"**
figure is computed, and a table fault that hides inside the proximity tally is invisible in the one
statistic meant to expose thin coverage. `calTablesUsable()` is now checked first (after
`bad-timestamp`, which still outranks everything because there is no window to reason about).

### R5 [NIT] — recorded, deliberately not fixed

Two same-name `EXCEPTIONS` rows moving **different** `was` to the **same** `t` emit one row at the
correct instant, but that row's `was`/`ref`/`retrieved` come from whichever was typed second (the
`dup` upgrade in `calApplyExceptions`). Only provenance moves, never a date, and the shape is
far-fetched. The reviewer recorded it so it would not be rediscovered and asked for it to be left
alone; it is left alone, and this paragraph is the note.

### Still unverifiable from this environment — do not change on a guess

- **CPI 2026-09-11 is a Friday.** Atypical for BLS CPI (Tue–Thu in the large majority of months),
  unchanged, and **now flagged in three places instead of one**: beside the row in `code.js`, on
  the row's own trailing comment, and in the provenance table above. The review file is no longer
  the only carrier of the warning. The date itself is untouched: changing a sourced date on a guess
  is the single thing this unit's header forbids.
- The `EXCEPTIONS` source page (`bls.gov/bls/2025-lapse-revised-release-dates.htm`), the rest of
  the 2026 CPI schedule, and the completeness of the 2026 federal-holiday set remain unfetchable.
  The Thanksgiving worked case in `test.js` §24 is constructed by hand and pinned as the fourth
  Thursday of November.

### Preserved, and re-asserted

- **No unknown-coverage window is control-eligible.** A **29,611-instant sweep of 2015–2036** on
  the shipped tables (`test.js` §30, stepping 6 h 13 min so it lands on many different slots of
  day rather than the same four) returns **only** `unknown-coverage` and `release-nearby` — not
  one `ok`, and the sweep asserts the reason *set*, so a new reason cannot appear unnoticed.
- **As shipped, no window anywhere is a usable control.** There is still no `"*"` entry;
  `fullCoverageDays` is 0, `controlWindowsPossible` is `false` and `controlWindowExample` is
  `null`. Asserted at the end of the run, along with the exact contents of all four tables.
- Nothing was loosened to achieve any of this: every change either adds a refusal
  (R1, R3, `evCov`) or renames a refusal more honestly (R4), and R2 makes a claim measurable that
  was previously merely asserted.
