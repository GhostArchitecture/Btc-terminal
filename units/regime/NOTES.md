# Unit `regime` — structural-break registry (CLAUDE.md section 11.9)

`code.js` is the exact block to splice. `node test.js` runs green (**125 assertions, exit 0**).

Pure: no DOM, no `localStorage`, no `fetch`, no timers, no reads of `S`, no reach into any other page
helper (`clamp`, `normCdf`, `calSigma`, ...). The harness proves this the same way `units/detect/test.js`
does — every page global the vm context can see is a throwing stub or a throwing `Proxy`, so an accidental
reach for one fails the suite loudly rather than passing by coincidence. No non-ASCII, no arrow functions,
ES2019, matching every other H-protocol unit.

**This unit holds no state of its own.** Unlike `units/calendar/code.js`, whose `RELEASES` table is agency
dates known in advance and enumerated once, a structural break is operator judgment recorded as it happens.
The registry lives in a page-side ledger (`btc.regime`) and every function here takes the current array as
a parameter. There is no clock inside this file and no history of prior calls — `regimeFlagCandidate` is
told the trailing reads, `regimeSpent` is told the set boundaries, `regimeAt` is told the registry. That is
deliberate: section 11.9 registers a **contract** a future scorer must honor, not a scorer, and a scorer
that needs new "now"-shaped logic later should not have to fight state this file already owns.

## What is in `code.js`

| symbol | kind | notes |
|---|---|---|
| `REGIME_T_MIN` / `REGIME_T_MAX` | const | plausible epoch-ms bounds, 2009–2100, identical reasoning and identical values to `units/calendar`'s `CAL_T_MIN`/`CAL_T_MAX` |
| `REGIME_T_FUTURE_SLACK_MS` | const `7*86400000` | how far a declared `t` may sit after its own `declaredAt` before being refused as a probable seconds/ms mix-up (see below) |
| `REGIME_CATEGORIES` | const, closed set | `price-collapse, price-parabola, sovereign-adoption, exchange-failure, contract-redefinition, other` — exactly section 11.9's list |
| `REGIME_KINDS` | const | `declared`, `flagged` |
| `REGIME_FLAG_MIN_TRAILING` | const `30` | minimum trailing reads before a percentile is trusted (see below) |
| `REGIME_FLAG_PCTL` | const `0.99` | pre-registered, **informational only** — see below |
| `regimeValidTime(t)` | fn | plausible-epoch-ms check, `units/calendar`'s `calValidTime` verbatim in spirit |
| `regimeEntryFault(e)` | fn | single-entry shape validation for one DECLARED or FLAGGED row; string reason or `null` |
| `regimeStructurallyValid(entries)` | fn | indices passing `regimeEntryFault` |
| `regimeSupersededIds(entries)` | fn | ids a valid DECLARED row's `supersedes` names, restricted to ids that exist |
| `regimeRegistryFaults(entries)` | fn | every reason a row is currently unusable — per-entry faults, duplicate ids, unresolved same-`t` DECLARED pairs |
| `regimeBoundaries(entries)` | fn | the corrected, `t`-ascending list of active DECLARED breaks — flagged rows and superseded rows never reach this list |
| `regimeAt(t, entries)` | fn | the ordinal regime index |
| `sameRegime(t1, t2, entries)` | fn | `regimeAt(t1,·)===regimeAt(t2,·)` — the one function a scorer actually calls |
| `regimeSpent(entries, setOpenT, setBoundaryT)` | fn | did a declared break fall strictly inside an open calibration/holdout window |
| `regimeFlagInputFault(sample, trailing)` | fn | why `regimeFlagCandidate` would refuse, or `null` |
| `regimePercentileRank(sample, trailing)` | fn | mean-rank percentile of `sample` within `trailing`, in `[0,1]` |
| `regimeFlagCandidate(sample, trailing)` | fn | `null`, or `{name, value, percentile}` ready to embed in a FLAGGED entry's `metric` |

## The two field shapes, and the one field this unit adds beyond section 11.9's prose

Section 11.9 lists DECLARED's fields as `t, kind, category, reason, source?, declaredAt, supersedes?` and
FLAGGED's as `t, kind, metric, declaredAt`. Neither list spells out an `id`, but `supersedes` is defined as
"the id of an entry this one corrects" — which presupposes every entry has one. **`id` is therefore
required on every entry** (a non-empty string), added here as the one field the prose implies but does not
enumerate. Without it, supersession has nothing stable to point at, and the write-time validation in
`regimeEntryFault` treats a missing `id` exactly like a missing `t`: a named, specific rejection, never a
silent skip. The wiring layer mints it (see below) — this unit only validates and reads it, never generates
one, because generating an identifier from `Date.now()` or `Math.random()` is exactly the kind of clock-and-
entropy reach this file's purity is built to refuse.

## Validation is layered, deliberately, mirroring `units/calendar`'s DATED/EXCEPTIONS split

1. **`regimeEntryFault`** — one entry, no context. Category in the closed set, non-empty `reason` (declared
   only, and it must not be all whitespace), plausible `t`/`declaredAt`, the future-slack bound, and —
   this is the part that has no calendar analogue — **cross-checks that a DECLARED entry never carries
   `metric` and a FLAGGED entry never carries `reason`, `category`, `source` or `supersedes`.** That
   asymmetry is section 11.9's central distinction (a flag is never sufficient to define a boundary; a
   declaration is the only thing that can) given a concrete, checkable shape instead of living only in a
   comment.
2. **`regimeRegistryFaults`** — the registry as a whole. Three passes: per-entry faults; duplicate `id`
   (supersedes can then no longer name exactly one entry); and duplicate `t` among *active* DECLARED
   entries — structurally sound, not already flagged, and **not superseded**. That last exclusion is
   deliberate and is exactly `units/calendar`'s D2 lesson (`calExceptionCrossFaults`) applied to a
   registry instead of a date table: two rows genuinely trying to define two different boundaries at the
   same instant is the order-dependent ambiguity that must fail loudly; a row and the correction that
   supersedes it sharing an instant is not ambiguous at all, because only one of them is ever active. Both
   are tested (`section 2` and `section 4` in `test.js`), and getting the exclusion backwards is one of
   the four mutations verified to kill something (see **Mutation testing** below).
3. **`regimeBoundaries` / `regimeAt`** silently skip whatever `regimeRegistryFaults` has already flagged,
   the same defensive posture `calBaseRows` takes toward a bad `DATED` row. The loud rejection lives at the
   validation call (where the wiring layer's `regimeDeclare` refuses to append a malformed entry in the
   first place); a row that reaches the array malformed some other way — a hand-edited `localStorage` key,
   a stale export re-imported — does not crash the ordinal walk, it is simply excluded from it.

## `REGIME_T_FUTURE_SLACK_MS` — what it actually catches

`t` (effective instant) is normally at or before `declaredAt` (written down once believed), but a small
forward slack is legitimate — an operator recording "effective at today's 00:00 UTC contract redefinition"
a few hours ahead of the rollover. The bound is not there to police that; it is there to catch the
seconds-vs-ms unit-mix CLAUDE.md section 7 already shipped once (fee rounding) and warns about generally.
Pass `declaredAt` in seconds by mistake against a correct-ms `t` and the gap reads as roughly **56 years**,
not days — a slack measured in days cannot mistake a legitimate near-term declaration for an error that
large. 7 days was picked as comfortably inside "normal operator lag" and comfortably outside "any unit
mix-up this codebase has ever produced."

## `REGIME_FLAG_PCTL` — why 0.99, why two-sided, and why it is *not* an 11.7-clause-6 threshold

Section 11.9: "a flagged instant carries no reason beyond the statistic that tripped it, is never
sufficient to define a regime boundary on its own, and never gates, restarts, or closes anything by
itself." Because a flag cannot gate a READY verdict, it is not one of the numbers section 11.7 clause 6
forbids loosening — that clause governs evidentiary thresholds a result depends on, and a flag is
informational by construction. `REGIME_FLAG_PCTL` may move in either direction if the operator finds it
too noisy or too quiet in practice. What it must not do is get retuned **to make a specific day's flag
appear or disappear after the fact** — the informational exemption is about how the number may be
maintained going forward, not license to fit it to a result once one exists; that is section 7.4's hindsight
warning with an informational label on it, and the label does not change what it is.

The trigger is a **percentile of BTC's own trailing realized-vol distribution**, never an absolute level,
because section 11.9 says so explicitly ("what counts as unusual for BTC changes with BTC") and because a
fixed level is exactly the kind of invented number the rest of this document warns against. It is
**two-sided**: `REGIME_FLAG_PCTL=0.99` flags a trailing-percentile-rank at or above 0.99 (unusually violent
— a `price-collapse`/`price-parabola` candidate) **or** at or below `1-0.99=0.01` (unusually dead — an
`exchange-failure` candidate: a frozen or starved feed reads as near-zero realized vol, not high). One
constant, one comparison, both tails — deliberately simple rather than two independently-tunable knobs.

## `REGIME_FLAG_MIN_TRAILING=30` — not picked fresh for this unit

This is the same small-n floor CLAUDE.md already uses everywhere a distribution gets read for the first
time: `VIA_HIST`'s live series needs ≥30 fills before it can turn positive, `SWING` needs ≥30 graded reads
before a window is highlighted, `VERDICT_RULE` needs an edge band with n≥30, and section 11.2's own
coverage-denominator fix ("minimum 30... a ratio over a denominator of one is not evidence of anything")
exists for exactly the same reason. A percentile computed from 5 or 10 prior reads swings on the very next
observation and is not a "trailing distribution" yet — it is noise wearing a statistic's clothes, which is
precisely the small-n instability `test/prereg.js`'s coverage-minimum fix was written to catch. Refused
inputs are never silently dropped: `regimeFlagInputFault` names the exact reason (too few trailing reads,
a non-finite `sample`, a non-array or non-finite-containing `trailing`), so a caller can count refusals
exactly as `vrpX` counts omitted variance-premium readings in `units/schema`.

## `regimePercentileRank` — tie handling

Mean-rank percentile: a sample equal to `k` of `n` trailing reads counts as `k/2` of them, not `k` or `0` —
a value tied with several trailing reads is *among* them, not above or below all of them. `test.js` section
8 hand-derives this on `[1,2,3,4,5,5,5,8,9,10]` against a sample of `5`: four strictly-less, three
tied → `(4+1.5)/10=0.55`, checked to `1e-12`.

## Mutation testing (CLAUDE.md's own standard, applied to this unit)

Four rules were reverted one at a time in a scratch copy of `code.js`, `node test.js` was re-run, the
failures were recorded, and the original file was restored before moving to the next. **Every one of the
four kills something** — no mutation passed the suite:

| reverted rule | mechanism | assertions killed |
|---|---|---|
| flags never move the boundary | removed the `kind!=="declared"` skip in `regimeBoundaries` | **6** — `flagged-only` registry no longer reads 0 everywhere, `sameRegime`/`regimeSpent` on a flags-only registry flip, and the flagged-rows-excluded check in section 4 |
| sort-by-`t` in `regimeBoundaries` | removed the `out.sort(...)` call | **3** — out-of-order input no longer matches the ordered fixture's `regimeAt` answers |
| same-`t` DECLARED pair rejection | removed pass 3 of `regimeRegistryFaults` | **4** — the tied pair is no longer reported, and `regimeAt` around the tied instant reads as if both boundaries were live |
| superseded exclusion from `regimeBoundaries` | removed the `superseded[e.id]===true` skip | **5** — the superseded row's *original* `t` re-appears as a live boundary, `regimeAt`/`regimeSpent` around it disagree with the corrected boundary |

A mutation that killed nothing would mean the rule has no test; none of the four did. This is a one-time
manual pass (there is no mutation-testing harness wired into `npm test` for the H-protocol units), reproduced
by: copy `code.js` aside, delete/comment the named line(s), `node test.js`, confirm `FAIL` lines land where
expected, restore from the copy. `test.js` itself carries no automation for this — the point of the exercise
is that a human read the diff and confirmed each rule is load-bearing, not that a script re-verifies it on
every run.

## The one field a raw registry row does *not* need for `regimeAt`/`sameRegime`/`regimeSpent` to work

None of the three ordinal functions need `category`, `reason`, or `source` — they only ever read `t`,
`kind`, `id`, and (for `regimeBoundaries`'s bookkeeping) `supersedes`. `regimeBoundaries`'s returned rows
still carry `category`/`reason`/`source`/`declaredAt`/`supersedes` because a scorer that finds itself in a
different regime than expected needs to be able to say *why*, straight from the boundary it hit, without a
second lookup back into the raw registry.

## What this unit deliberately does not do

- **No UI, no render, no highlight.** Section 11.9 and CLAUDE.md section 7.6 both apply: this is a registry
  and a derivation, nothing displays. The minimal operator interaction surface (below) is a console
  function, not a UI addition.
- **No automatic DECLARATION.** Only `regimeFlagCandidate` runs unattended; it returns a candidate metric,
  never an entry, and never anything with `kind:"declared"`. A human always writes the declaration.
- **No deletion path.** Ungardenable, section 4, exactly like every other ledger. There is no
  `regimeRemove`/`regimeEdit` in this file, and the wiring notes below do not add one at the page layer
  either — a bad declaration is corrected by a new `superseded`-citing row, never erased.
- **No execution path of any kind.** Nothing in this file computes a price, a probability, a position size,
  or anything that could be read as a trading signal. It answers exactly one question — which regime is `t`
  in, and does a boundary fall inside a given span — and nothing else.

## Wiring (for the page-side integration — reported in full to the orchestrator)

This unit is pure and touches neither `S` nor `localStorage`; everything below is a description of the glue
`index.html` needs, to be applied outside this unit's own `code.js`:

- **`btc.regime` ledger**, loaded/saved alongside `btc.edge`/`btc.rounds`/etc. in `init()`, each with its
  *own* `try/catch` per L1 (CLAUDE.md section 10.3): a quota failure writing this ledger must never block
  any other ledger's save, exactly as `ledgerSave` already isolates the other three keys. `S.regime` holds
  the raw array; every read goes through `regimeRegistryFaults`/`regimeBoundaries`/`regimeAt` rather than
  trusting the stored array directly, so a corrupted or hand-edited key degrades to "skip the bad rows,"
  never a crash.
- **A deferred pass**, shaped like `shockTick`/`volCloseTick` (i.e. NOT the 1 Hz loop): whenever a fresh
  realized-vol read becomes available, build `trailing` from the recent realized-vol history already kept
  for `calSigma`/`rv60` (the wiring layer owns that buffer; this unit never reaches for it) and call
  `regimeFlagCandidate(sample, trailing)`. A non-null result becomes a FLAGGED entry — `{id: <minted>, kind:
  "flagged", t: now, declaredAt: now, metric: <the returned object>}` — appended to `S.regime` and
  persisted. The minted `id` can be as simple as `"f"+String(now)+"-"+String(S.regime.length)`; page code
  has the clock and the counter this pure unit deliberately does not.
- **CSV columns**: `regimeAt` for the row's own `t`, added to the windows/`maker_fills`/`h1_reversal`
  exports as a **derived-at-export-time** column, exactly the `eventTag`/`coverageAt` pattern in CLAUDE.md
  section 10.2 — never stored per row, recomputed from `S.regime` and the row's own timestamp when the file
  is written, so a row's regime label always reflects every break declared up to export time, including
  ones declared after the row itself was recorded. Suggested column name `regimeIdx`; a second column
  citing the id of the boundary just crossed (from `regimeBoundaries`) costs nothing extra and makes an
  export self-explanatory without a second lookup.
- **The operator entry point.** There is no UI and none should be added, so the one way to declare a break
  is a plain, page-scope console function:

  ```js
  function regimeDeclare(effectiveAtIso, category, reason, source){
    var t = Date.parse(effectiveAtIso);
    var now = Date.now();
    var e = { id: "d"+String(now), kind: "declared", t: t, category: category, reason: reason,
              declaredAt: now };
    if (source !== undefined) e.source = source;
    var fault = regimeEntryFault(e);
    if (fault !== null) { console.error("regimeDeclare refused: "+fault); return null; }
    S.regime.push(e);
    regimeSave();               // its own try/catch, per L1
    console.log("declared: "+JSON.stringify(e));
    return e;
  }
  ```

  Called from the browser console — `regimeDeclare("2026-11-03T14:00:00Z", "exchange-failure", "Kraken
  order book stopped updating for 40 minutes, CF constituent basket degraded to 2 of 4", "https://...")` —
  by the operator, deliberately. **This is the minimal interaction surface, stated plainly:** it is a
  record-keeping action with no trading implication, not a UI addition, and it is exactly as far as this
  instrument goes toward "detecting" a regime break — a formula flags, only a human declares (section
  11.9). A `regimeSupersede(id, effectiveAtIso, category, reason, source)` wrapper that fills in
  `supersedes: id` is the natural companion and needs no new validation beyond what `regimeEntryFault`
  already does for the `supersedes` field.
- **Scorer contract, not a scorer.** Per section 11.9's closing paragraph, no scorer exists yet. When one
  is built, its calibration/holdout logic calls `sameRegime` for every pairing it considers (control match,
  bootstrap resample, calibration-vs-holdout) and `regimeSpent` whenever a declared break needs checking
  against an open set — never reimplementing the boundary walk at the call site, for the same "one
  function, one place it can be wrong" reason section 11.3 already requires for `controlEligible`.
