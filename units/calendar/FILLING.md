# Filling the release calendar

The table in `code.js` holds **49 enumerated rows plus 2 agency corrections**, and it is nowhere
near a full US macro calendar. Run `calendarAudit()` and read `.text` to see exactly how partial
it is today, which series are absent entirely, and where the BLS gap sits. This file is how you
add to it without breaking anything.

---

## The one rule

> **If a date is not enumerated and sourced, it does not go in the table.**

Every row carries a `src` (the URL you read it from) and a `retrieved` (the date you read it).
That pair *is* the provenance. There is no declaration to write, no coverage period to claim and
no signature to sign — the previous design had all three and they are deleted; see "The deletion"
in `NOTES.md` for why. Adding a row is the whole of adding a row.

### Never reintroduce a rule-derived series

The unit used to generate payrolls as "first Friday of the month" and initial claims as "every
Thursday". Both rules are **confidently wrong** in holiday and shutdown weeks. A wrong generated
row is worse than a missing one in a specific and expensive way: it marks the **wrong** window
busy and leaves the window that held the **real** print looking quiet, and that real window then
gets recruited into a CLAUDE.md section 11.3 control group. A provenance tag on the emitted row
cannot warn you, because it is attached to the date the rule got right in its own terms, not to
the one it got wrong.

Three rounds of adversarial review tried to police that generator with a human signature and each
found a fresh way for the signature to outlive what it signed. The generator is gone. **Do not
add `RELEASES.RULE` back, in any form** — not as a helper, not as a "just for claims" special
case, not as a comment-documented convention. `test.js` section 6 asserts that every deleted
symbol is still `undefined`, so an attempt to reintroduce one turns the suite red.

If you know a series' cadence but not its dates: that is a gap, and a gap is the correct state.
Leave it out and let `calendarAudit().absentNames` say so.

---

## Which constructor to use — this is about the SOURCE, not style

| the source publishes | use | example |
|---|---|---|
| an **ET wall time** ("08:30 ET", "2:00 p.m. ET") | `etToUtc(y, mo, d, hh, mm)` | `etToUtc(2026,0,13,8,30)` |
| a **UTC instant** (a feed with `Z` or `+00:00`) | `Date.UTC(y, mo, d, hh, mm)` | `Date.UTC(2026,0,22,13,30)` |

`mo` is **0-based** in both.

A feed that publishes UTC instants has **already resolved DST**, and that is the entire reason a
machine-readable feed beats a schedule page or a rule. Passing such an instant through `etToUtc`
re-derives something the source had settled and can only introduce an hour of error. The BEA rows
are pinned in `test.js` against the feed's own strings precisely so that "tidying" a `Date.UTC`
into an `etToUtc` turns the suite red instead of shifting an hour silently.

Never build `t` from an ISO string. `calDatedRowFault` rejects one, loudly, by design.

---

## Adding enumerated rows from a feed — worked example

This is the BEA load, start to finish. It is the pattern to copy.

**1. Fetch the feed and keep the raw bytes.**

```
curl -s "https://apps.bea.gov/API/signup/release_dates.json" -o bea.json
```

**2. Read the instants out of it mechanically.** Do not retype them by eye. Generate the row
lines from the file with a throwaway script, so a transcription slip is impossible:

```
python3 - <<'EOF'
import json, datetime
d = json.load(open('bea.json'))
for x in sorted(set(x for x in d['Gross Domestic Product']['release_dates'] if x.startswith('2026'))):
    t = datetime.datetime.fromisoformat(x)
    assert t.utcoffset().total_seconds() == 0        # the feed really is UTC
    print('{name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(%d,%d,%d,%d,%d),'
          'src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},'
          % (t.year, t.month-1, t.day, t.hour, t.minute))
EOF
```

**3. Deduplicate identical instants, and only those.** BEA lists `2026-06-09T12:30Z` twice for
the trade release. One instant listed twice is **one release**. Two *different* series at the
*same* instant (BEA publishes GDP and Personal Income and Outlays together twelve times in 2026)
are **two releases**, and both rows stay.

**4. Paste the block into `RELEASES.DATED`** with a comment naming the feed, the retrieval date,
and anything surprising you decided not to change.

**5. Pin the instants in `test.js`** against the feed's own strings, as section 6c does. This is
the step that makes the rows re-checkable a year later without re-fetching.

**6. Cross-check if a second source exists, and record what happened.** BEA's `.ics` subscription
file was fetched as a cross-reference and turned out to cover only 2025-01 to 2025-09, so it
could not corroborate a single 2026 date. That is written down in `NOTES.md` rather than left as
an unstated assumption that two sources agreed.

**7. If a list you were working from disagrees with the feed, the feed wins — and say so.** The
2026 BEA dates in circulation when this load was done disagreed with the feed on five GDP dates,
nine PCE dates and three trade dates. Every one was taken from the feed, and the disagreements
are reported. A silent reconciliation is indistinguishable from a fabrication.

---

## Adding a single row by hand

```js
{name:"CPI", kind:"scheduled-numeric", tier:1, t:etToUtc(2026,0,13,8,30),
 src:"https://www.bls.gov/schedule/news_release/cpi.htm", retrieved:"2026-09-06"},
```

- `name` — short, stable, upper case. Reuse an existing name where the series is the same one;
  a new spelling makes a new series and a new span.
- `kind` — `"scheduled-numeric"` for a data print, `"scheduled-policy"` for a rate decision.
  They are **not** interchangeable: H3 splits informed from narrative flow by release type.
- `tier` — 1 = high BTC relevance (CPI, payrolls, FOMC, PCE, GDP); 2 = lower (claims, trade,
  ISM, retail).
- `src` / `retrieved` — the URL and the day you read it. Omitting them is not a fault (a correct
  date with no URL is still a real release) but the audit counts the row as `unsourced`, and a
  span built only from unsourced rows prints `NO SOURCE ON THESE ROWS`.

**Do not guess a date.** A wrong date mislabels every window around it; a missing one leaves a
real release unrecorded inside a window this unit will call eligible. Both are worse than an
honest gap, and only the gap is visible.

**Do not "correct" a sourced date on a hunch.** The CPI 2026-09-11 row is a Friday, which is
atypical for BLS, and it is flagged and left alone for exactly this reason. If it turns out
wrong, fix it as an **edit to the row with a fresh `retrieved`** — not as an exception. An
exception records an agency correction; an unchecked transcription is not one.

---

## Recording an agency correction — worked example

An agency moves a date it had already published:

```js
{name:"NFP", kind:"scheduled-numeric", tier:1,
 was:etToUtc(2026,1,6,8,30), t:etToUtc(2026,1,11,8,30),
 src:"https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm", retrieved:"2026-09-06",
 note:"Employment Situation, Jan 2026 ref: 2026-02-06 -> 2026-02-11 (Wed), 08:30 ET"}
```

- Any `DATED` row with the same `name` and `t === was` is **removed**.
- The corrected row is emitted **whether or not** a base row matched. An exception is agency
  evidence in its own right; dropping it for want of a base row would put a real print back into
  the control pool. `calendarAudit()` reports an unmatched one as `inserts`, so an override that
  overrides nothing is visible rather than silent.
- **State `kind`/`tier` on the row when nothing can supply them.** Metadata falls back to the
  removed base row, then to any `DATED` row of the same name (`calMetaFor`), then to the
  `scheduled-numeric` / tier-2 default. The seeded payrolls correction has no base row and no
  other payrolls row anywhere, so it carries `tier:1` explicitly — without it, payrolls would
  emit at tier 2.
- `t:null` means **cancelled**, not moved: the base row is removed and nothing is emitted. A
  merely *absent* `t` is a fault, so the two cases can never be confused.
- A shift larger than `CAL_EXC_MAX_SHIFT_MS` (45 days) is rejected: a move that large is a
  data-entry error, not a reschedule.

### Two things the exceptions table refuses outright

- **Chains.** `X -> Y` and then `Y -> Z` (what an agency produces when it revises a revision).
  Both rows are refused, in either order, because applying half a chain leaves a release standing
  at a date that never happened. **Collapse it into one row, `X -> Z`.**
- **Two rows overriding the same `was`.** Both refused; keep exactly one.

Both refusals are loud: `calValidateExceptions()` names them, `CAL_EXC_BAD` lists them, the audit
counts them, and `controlEligible()` returns `"table-errors"` for **every** window until they are
fixed. That last part is deliberate — a refused row is a release this unit does not emit, and a
release it does not emit reads as a quiet window.

---

## Coverage: there is nothing to declare

`calSeriesSpans()` computes, per series name, the span its own rows actually cover, the row
count, and the sources and retrieval dates those rows carry. `coverageAt()` and
`calCoverageSpan()` ask the same fact at an instant and over a band. Add a row and the span
widens on the next call; remove it and the span retracts. Nothing to sign, nothing to keep in
step, nothing that can go stale.

**A span is not a completeness claim.** "GDP: 2026-01-22 … 2026-12-23, 13 rows" says thirteen GDP
dates were read off a feed and they run from January to December. It does not say those are all
of them, and nothing in this unit can say that.

That limitation is real and directional, and the code returns it rather than hiding it:
`controlEligible(t)` hands back `known.caveat` (`CAL_PARTIAL_CAVEAT`) on **every** answer, plus
`known.series` and `known.inSpan`. A control window this unit accepts may still contain a release
nobody has told the table about, which biases a difference-in-differences estimate **toward
zero**. Record the caveat with the control. Do not let a caller read `{eligible:true}` as a
certificate that the window is clean.

---

## After every edit

```
node test.js          # must print "all passed"
node ../run.js        # every unit suite, in case something else reads this one
```

Then read the audit and check it says what you expect:

```js
console.log(calendarAudit().text);
```

Look for, in order:

1. `DATED rows: N valid, 0 rejected` — a rejected row is a release that is **not emitted**, and
   while any exists `controlEligible()` refuses every window. Fix it before anything else.
2. The **spans**, and whether the series you just touched moved the way you expected.
3. `ABSENT ENTIRELY` — the expected series with no row anywhere. Today: **PPI, CLAIMS, ISM,
   RETAIL**.
4. `THE BLS GAP` — payrolls, CPI, PPI and claims are the highest-relevance US releases for this
   instrument, and `bls.gov` is not reachable from the environment these tables were entered in.
   Two CPI dates and one payrolls correction are **fragments, not coverage**. If you have egress
   that reaches bls.gov, that gap is the single most valuable thing to close, and closing it is
   an enumeration job: open the schedule page, read the dates, enter them with the URL and the
   date you read it.

Finally, add the assertions. Every row set added here should be pinned in `test.js` the way the
BEA and FOMC rows are — count, instants, tier, and source — so that a later edit that changes a
date has to change a test on purpose.
