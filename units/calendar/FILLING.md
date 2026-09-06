# Filling the release calendar

The table in `code.js` is **5% full** and that is fine. Run `calendarAudit()` and read `.text` to
see exactly how full it is today. This file is how you add to it without breaking anything.

## The one rule

There are two kinds of table and you must move them **together**:

- `RELEASES.DATED` / `RELEASES.EXCEPTIONS` — the individual releases you know about.
  `RELEASES.RULE` — the series this unit *generates* rather than stores.
- `RELEASES.COVERAGE` — the periods whose schedule you have actually **checked**.

**Rows without coverage:** honest but useless. The releases are tagged, but every quiet window in
that period stays `evCov:false` / `controlEligible → "unknown-coverage"`, so no window there can
be used as a section 11.3 time-matched control. Nothing is wrong; nothing is gained either.

**Coverage without rows:** a lie, and the expensive kind. Declaring coverage says "I checked; if
this unit shows no release, none happened." Every quiet-looking window in that period then becomes
an eligible control — including the windows that held the CPI prints you did not enter. A real
shock lands inside the control group, the baseline it is being measured against moves with it, and
the difference-in-differences estimate is biased toward zero **invisibly**. That is a corrupted
result, not a missing one.

**Coverage over a wrong rule row:** the same lie, arrived at by arithmetic instead of omission.
`NFP` and `CLAIMS` are *generated* from `RELEASES.RULE` — first Friday, every Thursday — and both
rules have real exceptions (BLS moves initial claims to Wednesday in weeks containing a Thursday
federal holiday; payrolls do not always land on the first Friday). When the rule is wrong, the
generated row marks the **wrong** window busy and leaves the window that held the **real** print
looking quiet. That real window then enters the control group. `src:"rule"` on the emitted row
cannot warn you about this, because it is attached to the date the rule got *right* in its own
terms, not to the one it got wrong.

That is why a `"*"` row must carry `rules:` — see "Declaring coverage" below. There is no way for
this unit to check a rule against an agency schedule it cannot fetch, so the vouch is your
signature, not a validation.

So: **enter the rows first, then declare exactly the period you actually read.**

## Where each release type comes from

Open the page, read the dates off it, and enter them. Do not extrapolate a cadence from the ones
you already have — "CPI lands mid-month", "PPI follows CPI", "ISM is early-month" are exactly the
inferences this table exists to refuse.

| name | agency page | time (ET) | tier | kind |
|---|---|---|---|---|
| `CPI` | https://www.bls.gov/schedule/news_release/cpi.htm | 08:30 | 1 | `scheduled-numeric` |
| `PPI` | https://www.bls.gov/schedule/news_release/ppi.htm | 08:30 | 2 | `scheduled-numeric` |
| `NFP` | https://www.bls.gov/schedule/news_release/empsit.htm | 08:30 | 1 | rule-derived; correct it with an EXCEPTION |
| `CLAIMS` | https://www.dol.gov/ui/data.pdf schedule / BLS release calendar | 08:30 | 2 | rule-derived; correct it with an EXCEPTION |
| `PCE`, `GDP` | https://www.bea.gov/news/schedule | 08:30 | 1 (PCE), 2 (GDP) | `scheduled-numeric` |
| `RETAIL` | https://www.census.gov/retail/marts/www/martsdates.html | 08:30 | 2 | `scheduled-numeric` |
| `ISM` | https://www.ismworld.org/ (Report On Business schedule) | 10:00 | 2 | `scheduled-numeric` |
| `FOMC` | https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm | 14:00 | 1 | **`scheduled-policy`** |
| BLS reschedules | https://www.bls.gov/schedule/ (and any lapse-in-appropriations notice) | — | — | EXCEPTIONS |

`FOMC` is `scheduled-policy`, not `scheduled-numeric`: a rate decision is an announcement, not a
data print, and H3 splits informed from narrative flow by release **type**. Filing it as a print
blurs the distinction H3 exists to test.

## Adding a release — worked example

You open the BLS CPI page on 2026-11-02 and read the October-reference date: **13 November 2026,
08:30 ET**. Add to `RELEASES.DATED`:

```js
{name:"CPI", kind:"scheduled-numeric", tier:1, t:etToUtc(2026,10,13,8,30),
 src:"https://www.bls.gov/schedule/news_release/cpi.htm", retrieved:"2026-11-02"},
```

- `t` is **epoch ms built by `etToUtc`** — never an ISO string, never a hand-computed UTC number.
  `etToUtc(y, monthIndex, day, hh, mm)`: months are **0-based**, so November is `10`. It handles
  EST/EDT, which is the whole reason it exists (08:30 ET is 13:30Z in winter, 12:30Z in summer).
- `src` is the page you read. `retrieved` is the day you read it, `YYYY-MM-DD`.
- Then run `calValidateDated()` — it must return `[]`. Anything it returns is a rejected row, with
  the reason; a rejected row is invisible to the rest of the unit.

## Correcting a rule-derived date — worked example

The first-Friday NFP rule and the every-Thursday claims rule are *derived*, and both have real
exceptions (holiday weeks, shutdown reschedules). When an agency publishes a different date, do
not edit the rule — add to `RELEASES.EXCEPTIONS`:

```js
{name:"NFP", was:etToUtc(2026,1,6,8,30), t:etToUtc(2026,1,11,8,30),
 src:"https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm", retrieved:"2026-09-06",
 note:"Employment Situation, Jan 2026 ref: 2026-02-06 -> 2026-02-11 (Wed), 08:30 ET"},
```

- `was` is the date the unit would otherwise produce (build it the same way, from the rule).
- `t` is the real date. The emitted row comes back `src:"corrected"` with `was` attached, so a
  persisted tag reads `evSrc:"corrected"` and the correction survives into the ledger.
- **Cancelled, not moved?** `t:null`. The release is removed and nothing is emitted. Leaving `t`
  out entirely is a rejected row, not a cancellation — the two cases must stay distinct.
- An exception whose `was` matches nothing still emits its release (`calendarAudit()` labels it
  `inserts`). That is deliberate: a correction is agency evidence in its own right, and dropping
  it would put a real release back into the control pool.
- **One row per release, never a chain.** If the agency revises a date it has already revised
  (X → Y, then Y → Z), do **not** add a second row: edit the existing one to X → Z. Two rows where
  one override's `t` is another's `was` — or two rows overriding the same `was` — are **both**
  rejected, because whichever order they are typed in decides whether the intermediate date is
  emitted as a release that never happened. The reject says `CHAIN` and names the repair, and the
  whole calendar refuses control windows (`controlEligible → "table-errors"`) until you collapse
  it. This is name-scoped: two corrections that merely share an instant for *different* releases
  are unrelated, not a chain.
- Check with `calValidateExceptions()` — must return `[]`.

## Declaring coverage — worked example

Only after the rows are in. You read the **whole** 2027 CPI schedule page and entered **all twelve**
dates on 2026-12-02:

```js
{name:"CPI", from:etToUtc(2027,0,1,0,0), to:etToUtc(2027,11,31,23,59)+59999,
 src:"https://www.bls.gov/schedule/news_release/cpi.htm", retrieved:"2026-12-02"},
```

- `from`/`to` are **inclusive UTC ms built with `etToUtc`, exactly like a release row** — never
  `Date.UTC`. The page you read is an ET-shaped schedule, so "2027" means 2027 **in New York**.
  `Date.UTC(2027,0,1)` is 2026-12-31 19:00 ET and would claim five hours of a period you never
  read. **Over-claiming is the expensive direction**: it is five hours in which a release you did
  not enter becomes an eligible control. `+59999` carries the last second's milliseconds so the
  final ET minute of the period is inside the claim. Read the bounds back off
  `calendarAudit().text`, which renders them as **ET** dates — they must be the period you read.
- `name:"CPI"` claims completeness **for CPI only**. It says nothing about PPI.
- `name:"*"` claims the **whole calendar** is known for that period — every release of every type.
  Only a `"*"` period can produce a control window, so `"*"` is the entry that turns the programme
  on, and the one that costs a corrupted result if it is not literally true. Declare it only when
  every row in the table above has been entered for that period.

### The vouch — mandatory on a `"*"` row

A `"*"` row must also say which **generators** you checked against the agency schedule over that
period. **A vouch is a signature on a generator specification, so you copy the rows themselves —
not their names:**

```js
{name:"*", from:etToUtc(2027,0,1,0,0), to:etToUtc(2027,11,31,23,59)+59999,
 rules:[{name:"NFP",   kind:"scheduled-numeric", tier:1, et:[8,30], rule:"first-friday-of-month"},
        {name:"CLAIMS",kind:"scheduled-numeric", tier:2, et:[8,30], rule:"every-thursday"}],
 src:"https://www.bls.gov/schedule/  (+ each page in the table above)", retrieved:"2026-12-02"},
```

- `rules` must hold **one entry per row in `RELEASES.RULE`, copied field for field** (`name`,
  `kind`, `tier`, `et`, `rule` — the five the row already requires). Writing it means: *"I read
  the published schedule over this period for exactly these generators, and every deviation from
  them is in `EXCEPTIONS`."*
- **A bare name is a rejected row.** `rules:["NFP"]` used to be the shape and it could not see the
  row it named being edited, deleted, or joined by a second one — in all three cases the
  signature kept reading complete while the generator had moved, and the windows holding the real
  releases became eligible controls. The reject message says so.
- A `"*"` row **without** `rules` is likewise rejected and grants nothing.
- **Any change to a signed row invalidates the signature**, and `controlEligible()` refuses the
  whole period until a human re-signs it:

  | you did this | the audit says | `controlEligible` |
  |---|---|---|
  | added a rule series | `NOT VOUCHED: <spec>` | `"unvouched-rule"` |
  | edited a signed row (`rule`, `et`, `kind`, `tier`) | `SIGNATURE DOES NOT MATCH: <in force> … signed against <spec>` | `"unvouched-rule"` |
  | removed or renamed a signed row | `STALE VOUCH: <spec> … no longer a rule series in force` | `"stale-vouch"` |

  That is the intended cost of touching a generator, and re-signing is one edit: copy the rows as
  they now stand, having actually re-read the schedule.
- Vouches are **not** combined across entries: one entry must vouch for everything itself, exactly
  as coverage periods are never unioned.
- `calendarAudit().text` prints, under each `"*"` entry, how many **rule-derived (inferred)** dates
  the claim rests on, which signatures are wrong and in which of the three ways, and **the first
  instant inside the period that `controlEligible()` actually accepts** (or `NONE`). Read those
  lines before you believe your own declaration.

`rules` is optional on a name-scoped row: a named entry grants no control windows either way.
- One entry per **contiguous** confirmed period. Adjacent entries are deliberately not unioned; a
  band that straddles a seam reads as uncovered, so a gap can never be papered over by arithmetic.
- Check with `calValidateCoverage()` — must return `[]`. `src` and `retrieved` are mandatory on a
  coverage row: a claim that somebody checked a page, with no page, is the exact lie this
  mechanism exists to prevent.

## After every edit

```
node test.js          # must stay green
calendarAudit().text  # read it; the counts should say what you think you just did
```

`calendarAudit()` reports rejected rows (from all four tables), rows with no `src`, which
overrides override something and which merely insert, the declared periods with their **ET**
bounds, the total days of `"*"` coverage, the inferred-date count and the signature faults under
each `"*"` entry, **the periods that cover each release name** (`COVERAGE BY NAME` — a claim
covers a period, never "always"), and which names have no declared period anywhere.

Read `controlWindowsPossible`. It is `true` only when some instant inside a declared period is
**actually** accepted by `controlEligible()` — the audit finds that instant, hands it to the guard,
and prints it as `controlWindowExample`, so you can re-check the claim by calling
`controlEligible()` on it yourself. It is the single line that says whether section 11.3 has any
controls to draw on, and it is `false` when a `"*"` period is narrower than the ±45 min exclusion
band or has no clear gap in it, even though the period is declared and fully signed. As shipped it
is `false` and `controlEligible()` returns false for every timestamp in history. That is the honest
state of a 5%-full calendar, not a bug.

## Adding, editing or removing a rule-derived series

`RELEASES.RULE` **drives the generator** — a series you add here really does produce rows, and a
row you edit or delete really does change or stop them.

```js
{name:"CLAIMS", kind:"scheduled-numeric", tier:2, et:[8,30], rule:"every-thursday"},
```

- `rule` must be one of the closed forms `every-<weekday>` or
  `first|second|third|fourth|last-<weekday>-of-month`, lower case. Anything else is a **rejected
  row**, and a rejected rule row is a whole release series that stops being emitted — so it takes
  `controlEligible()` to `"table-errors"` rather than quietly generating nothing.
- `kind`, `tier` and `et` are **mandatory** here (they are optional on a `DATED` row): a rule row
  is a generator specification, not a transcribed fact with a missing annotation. `et` must be
  **whole numbers** — `[8.5,30]` is a rejected row, not an 08:30 publication.
- Only add a series whose publication rule is genuinely deterministic. If you have to squint at it,
  it belongs in `DATED`, one dated row at a time.

**Editing or deleting a row is not a tidy-up — it is a change to what the calendar knows.**

- **Deleting a series that still publishes is the worst edit available here.** Its releases vanish
  from the calendar entirely and every window that held one reads *quiet*, which is the
  contamination `controlEligible()` exists to prevent. If a series belongs in `DATED` instead,
  **enter the dated rows first, then delete the rule row** — never the other way round.
- **Editing a row in place redirects the generator.** The old day is now reported quiet and the new
  one busy; if you were wrong about the new rule, the real print's window becomes an eligible
  control. Change a cadence only from a page you have just read.
- **Do not add a second row under an existing name** unless the series genuinely has two
  publication rules. It is a separate generator and needs its own signature.
- Every one of these invalidates any `"*"` vouch that signed the row. The unit **refuses** rather
  than guessing: re-read the schedule for that period and re-sign the claim with the rows as they
  now stand. Never "fix" a refusal by editing the vouch to match the table without re-reading the
  source — that turns the signature into a copy of the thing it is supposed to check.
- Check with `calValidateRule()` — must return `[]` — then read `calendarAudit().text` and re-sign
  every `"*"` entry it flags.
