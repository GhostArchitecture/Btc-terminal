# Unit `schema` — notes

Deliverables in this directory:

| file | what |
|---|---|
| `SPEC.md` | **the deliverable.** Field-by-field enrichment spec for the three row types, CSV column additions, backward-compatibility contract, storage cost. |
| `code.js` | the exact block to splice: 18 pure functions + 5 consts. Nothing else. |
| `test.js` | `node test.js` → **167 assertions, all green, exit 0**. |
| `sizing.js` | the storage measurement behind SPEC §8. `node sizing.js` reproduces every number in that table. Not for splicing. |

`code.js` is pure: no DOM, no `localStorage`, no `fetch`, no timers, no reads of `S`. The test enforces
this rather than asserting it in prose — the vm context installs throwing getters on `document`,
`window`, `localStorage`, `fetch`, `setTimeout`, `setInterval` and `S`, and every entry point is called
inside it.

## What is in `code.js`

| symbol | kind | notes |
|---|---|---|
| `SCHEMA_VERSION` | const `2` | row provenance; **not** any ledger's `v` literal |
| `SCHEMA_BP` | const `1e4` | sigma stored as basis points per minute |
| `SCHEMA_VOL_GIVEUP_MS` | const `300*60000` | inside the 360-minute `S.bars` buffer |
| `SCHEMA_SIR_MIN/MAX` | const `0.25 / 4` | **pre-registered** plausibility band on `si/sm` (SPEC §7.6) |
| `schemaNum(v,dp)` | fn | finite → rounded; anything else → `undefined` |
| `sigBp(sig)` | fn | per-minute sigma → bp/min, 2 dp; a positive sub-resolution value is **omitted**, never rounded to a fabricated `0` |
| `seasFactor(now,tEnd)` | fn | `√(SEAS[hE]/SEAS[hN])` — the factor actually applied |
| `utcHour(t)`, `seasAt(t)` | fn | export-time derivations |
| `touchSigma(st,now,tEnd)` | fn | the sigma `touchProb` runs on; one definition for two readers |
| `schemaSet(f,k,v)` | fn | assign only when defined |
| `schemaPut(row,f)` | fn | merge a bundle onto a row, skipping absent values |
| `bookDepth(ob)`, `depthAtAsk(side,dy,dn)` | fn | the discarded depth, and its correct orientation |
| `edgeSnapFields(P,quote,strike,ob)` | fn | §2.1 bundle |
| `swingReadFields(st,side,ob,S0,strike,now,tEnd)` | fn | §2.3 bundle |
| `journalEntryFields(r,t)` | fn | §2.4 bundle |
| `siJudge(ref)` | fn | can this row's `si` be believed — `{sir, xs, relPerCent, identified, ok, code}` (SPEC §7.6). One definition for the `vrp` gate and the CSV. |
| `volCloseFields(ref,keys,closes,t0,t1,minN)` | fn | §2.2 bundle. **Takes the reference ROW, not a bare sigma** — see below. |
| `schemaVolGiveUp(now,close)` | fn | when to stop retrying |
| `misRatio(pQuoteFree,qMidCents,spreadC)` | fn | the restated H2 measure |
| `edgeSpreadC(qm,ya)`, `swingSpreadC(ask,bid)` | fn | spread in cents from each dataset's own units |

Name-collision check against `index.html`: all 23 symbols return `grep -c` **0** (`siJudge`, `SCHEMA_SIR_MIN`,
`SCHEMA_SIR_MAX`, and the new row keys `vrpX`/`sir` included; also 0 across every sibling unit). No non-ASCII anywhere
in `code.js`, so the `\uXXXX` convention has nothing to escape. All comments are plain ASCII.

## Dependencies on sibling units

- **`volspace`** — `impliedSigma`, `realizedSigmaInfo`, **`sigmaIdentifiability`**. Called through `typeof … === "function"` guards,
  so a partial splice loses `si`/`sr`/`vrp` and nothing else. `test.js` builds a second vm context with
  both left undefined and asserts the page still writes `sm`/`xs`/`bid`/depth and never fabricates `si`.
- **`calendar`** — `eventTag(t)`. Not called from `code.js` at all; event proximity is an export-time
  derivation (SPEC §2.5), so this unit has no hard dependency on the calendar landing.
- Neither dependency is duplicated here. `sigBp` deliberately does not reimplement `impliedSigma`.

## THE ONE CHANGE A REVIEWER MUST NOT SKIM

**Implied volatility is not identifiable from an at-the-money binary, and KXBTC15M strikes open at the money.**
The variance premium — the flagship field, the one H5 turns on — is therefore ill-posed on the primary dataset,
and computing it indiscriminately would render an ordinary 40c quote as "1805 bp implied minus 9 bp realized",
a colossal premium that is pure noise. Each arithmetic step correct, the output meaningless. That is the exact
failure CLAUDE.md §7 rule 6 exists to prevent, and it took three independent reviewers to surface it.

What changed as a result, all of it in **SPEC §7.6**:

1. `si` is **never written without `sm` and `xs` beside it**, so `si/sm` and the standardised strike distance
   are always available and an absurd reading is visibly absurd (200x the model's own sigma is model failure,
   not implied volatility).
2. `vrp` is written **only** when the reading passes two pre-registered tests — quote-free identifiability
   (`volspace`'s `VRP_REL_MAX`) and plausibility (`SCHEMA_SIR_MIN/MAX`). Otherwise it is **omitted, not
   clamped**.
3. Every omission is **counted** in `vrpX` (`noref | nosi | nodiag | atm | tail | cond | impl`), exported as
   `vrp_omit`, so the selection effect is a measurable quantity instead of a silence. A window that gets `sr`
   gets either `vrp` or `vrpX` — there is no third state, so the count is complete by construction.
4. Nothing is destroyed: a rejected row keeps `si`, `sm`, `xs`, `tau`, so `vrp` is recomputable under any
   other rule and the exclusion is fully reversible.
5. The SPEC says plainly, in §0 and in §7.6, that **the 15-minute at-the-money window is the worst case for
   this measurement and the hourly ladder's off-the-money rungs are the best.**

Measured, not argued: `FIX-probe-gate.js` (real `volspace` + real `code.js`, ~57,000 simulated KXBTC15M
snapshots against a perfectly calibrated market whose true variance premium is **exactly zero**) reports
**+0.62 bp/min of premium that does not exist** ungated on a true 9.20, and **+0.05** through the gate. The
gate removes ~92% of it. It does not remove all of it and is not meant to — that is what `si_cond` and the
`vrp_omit` tally are exported for, and the SPEC says so rather than claiming the problem is solved.

`volCloseFields`'s first parameter changed from a bare implied sigma to the **reference row**. Saying it
loudly because it is a signature change: the gate needs `si`, `sm`, `xs` and `tau` together, and `vrpT` is now
stamped inside the function only when `vrp` was written, so a provenance stamp can no longer outlive the value
it points at.

## The four decisions that shaped this, and why

**1. Omit, never null.** Absent-means-unknown is one tolerance rule that covers both pre-existing rows
and new rows with nothing to report, and it makes them literally the same bytes. Writing `null` instead
would have cost ~1.5 MB of `"ev":null,"evMins":null,"evTier":null` across the edge ledger for the
privilege of saying nothing.

**2. Store only what is not derivable.** `hour_utc`, the SEAS multipliers, event proximity, spread,
mispricing and the depth-at-ask orientation are all exact functions of fields already on the row. They
became computed CSV columns and cost zero bytes. That removed ~2.4 MB from an addition that started out
at ~4.4 MB. The `spread_c` identity is worth noting: `qm` and `ya` are written from the same
`(yesBid, yesAsk)` pair on the same line, so `spread = 2·(ya − qm)` exactly, to the 0.2 c the two 1 dp
roundings allow.

**3. `si` is inverted from the mid, and the missingness has a sign.** *(This was the smaller of the two
missingness mechanisms — see the section above and SPEC §7.6 for the larger one.)* The analytic fair value has a hard
cap when the strike is above spot: `p_over` peaks at `1 − Φ(√(2x))` and no sigma reproduces a quote past
it. KXBTC15M strikes are set at the money at open, so this bites exactly where the market is thickest,
and `si` will be null far more often when spot is *below* strike. Dropping nulls without conditioning
would select on the sign of `xs` and bias H5. `xs` is stored on every row so this is diagnosable rather
than invisible — that is the whole reason it is stored rather than derived (deriving it would need `S0`,
which no row carries). `test.js` asserts both branches: an attainable quote yields `si`, a quote past
`pMax` yields none, and the unattainable row still carries `xs`.

**4. H2 restated, and the trap named.** "Trade when the spread is widest" gates you into the most
expensive moment to cross. The coherent question is whether mispricing outgrows spread. The trap is that
the obvious numerator, `pm − qm`, is circular: when a Kalshi quote exists `pm` *is* the residual
estimator, whose baseline is the quote and whose third term is `−5.023·spread`. `(pm − qm)/spread` would
show a strong relationship that is an artifact of the fit, not a property of the market. `misRatio` takes
a quote-free probability and the spec names `pa` (analytic) as the one to pass. `mis_head_c` stays in the
export purely as the contrast that makes the artifact visible.

## What I verified rather than assumed

- **`depthYes`/`depthNo` are written and never read.** Two occurrences repo-wide: the write in
  `kParseBook` (index.html:1043) and a literal in a test fixture. `grep -rn "\.depth"` across the repo
  returns nothing. Enumerating every property access on a parsed book gives `yesAsk, noAsk, yesBid,
  noBid, over, under, orderbook` — no depth. **Confirmed: H2's core input is fetched every 8 s and
  discarded.**
- **`isPhantomK1` reads exactly `tau`, `ask`/`entry`, `p`**; the edge-snap variant reads `tau`, `qm`.
  None of the twelve keys this spec adds uses those names. `test.js` checks the emitted key set against a
  53-name reserved list mechanically, and runs a transcribed `isPhantomK1` over a phantom row and a clean
  row before and after enrichment, asserting the verdict is unchanged.
- **`refSnap` reads `tau` and `phantom` only.** `test.js` enriches every snap in a window and asserts the
  same snap is still selected, and that a v1 snap with none of the new fields is still selectable.
- **`e.reads` is append-only** (`push` only, no `shift`), so `t.readIdx` stays valid and `simCloseOne`
  can reach the originating read as `e.reads[t.readIdx]` with **no signature change**.
- **`swingLoad`/`jLoad`/`viaLoad` discard the whole ledger on a `v` mismatch.** This is why row-level
  provenance is `sv` and why the spec says in bold not to touch any `v` literal.
- **`S.bars` holds 360 minutes**, which is why realized sigma must be computed after the close or lost,
  and why the give-up threshold is 300 minutes.
- **Storage:** measured, not estimated, except for the window mix (~4 fifteen-minute + ~13 hourly rungs
  per clock hour, from the 150 bp filter at line 1310 against a ~$250 ladder).

## What the test suite now pins that it did not before

- **Which root.** Above the money `p_over` is not monotone in sigma, so a quote below `pMax` has **two**
  implied sigmas and *both reprice it exactly*. The old suite's only `si` value assertion was "si reprices
  the quote it came from", which both roots satisfy, and every value case used a strike *below* spot where
  only one root exists. A low/high branch swap in `volspace` would have stored sigmas ~137x too large on
  every above-the-money row and left the suite green. It is now a **recovery** test — a quote generated from
  a known sigma at a strike above spot must invert back to that sigma — and a deliberately mutated harness
  confirms it fails when the branch is swapped (1234.57 bp against a true 9.00).
- **The shape of the gate.** The identified region is asserted to be a **band** in `|xs|`, contiguous and
  symmetric, excluded at the at-the-money end and at the deep-tail end, with the two ends counted under
  different reason codes.
- **The 200x case.** Asserted that the conditioning test alone does *not* catch it, so the plausibility band
  is demonstrably necessary rather than decorative.
- **`si` never travels alone**, swept over 200 degraded input combinations.
- **Sub-resolution sigmas** are omitted rather than written as `0`, on both `sigBp` and `volCloseFields`,
  while an exactly flat tape still records `sr: 0`.
- **Null timestamps.** `new Date(null)` is the epoch, not an Invalid Date, so `seasFactor(null, null)` used
  to return a plausible `1`. Both it and `touchSigma` now reject non-numeric timestamps.

## The finding I did not go looking for

**`btc.edge` already exceeds a 5 MB localStorage quota at its own cap — 5.98 MB across ~39,700 snaps —
and reaches that cap in about 3.7 days of continuous recording.** *(Unchanged by the §7.6 work: a container
carries either `vrp`+`vrpT` or the smaller `vrpX`, never both, and the three new diagnostic columns are
derived at export and stored on no row. The honesty fix costs nothing; the storage problem is exactly as bad
as it was.)* Defect L1 (silent ledger loss on quota
exhaustion) is not a hypothetical; on the desktop recorder of record it is the steady state. The L1 fix
stopped one ledger's failure from killing the other two; it did not stop the edge ledger from failing,
and `S.ledgerErr` records which key last failed while nothing surfaces it.

This spec makes that worse by 1.35 MB (+23%). I said so plainly in SPEC §8 rather than burying it, and
proposed three fixes in order: a byte-budget trim in `ledgerSave` (correct, needed regardless), hoisting
the constant `fit` string off every snap (−0.91 MB, more than two thirds of what this costs), and cutting
the window cap to 900 (−2.93 MB, but it discards real data so it ranks last). **If none is taken, the
honest position is that the edge enrichment should not ship** — the swing and journal additions are
+624 KB and affordable on their own. Adding 1.35 MB to a store that already silently drops writes loses
more data than the new fields are worth.

## Deliberately not done

- **No implementation.** This unit is a spec plus glue. The ~12 impure call sites are the orchestrator's,
  and SPEC §3 gives each one by function name, line number and anchor.
- **No fabricated constants, dates or thresholds.** The only numbers invented here are two rounding
  precisions (2 dp of a bp, 3 dp of a standardised distance) and one give-up bound (300 min, derived from
  the 360-minute bar buffer). Every other figure is measured or read out of the code.
- **Event tags are not persisted.** SPEC §2.5. Deriving them at export is exact, free, and gets *better*
  when `RELEASES.DATED` is eventually filled in by hand. The caveat that two exports across a calendar
  update will disagree is stated in the spec, not hidden.
- **`hourUTC`/`seas` are not persisted** — exact functions of stored timestamps and a frozen table. The
  condition attached (SPEC §2.6) is that `SEAS` stays frozen, per §10.1. I did not add a per-row hedge
  against a refit that CLAUDE.md forbids; I named the one-line mitigation to apply *if* it ever happens.
- **Spread at exit is not specified.** `simUpdate` only receives `bid`; capturing it means changing that
  function's signature and threading an ask through the exit machinery the S1 fix just touched. It is a
  real follow-up, written out in SPEC §4.4, not smuggled into a schema change.
- **The hourly ATM book (`K.hourOb`) is not wired into `edgeSnapOne`.** It is fetched every 20 s and
  would give depth on hourly rungs, but it would change which market object `edgeSnapOne` is called with.
  Flagged in SPEC §2.1, not assumed.
- **`impliedSigmaInfo`'s `reason` string is not persisted.** ~30 characters per row to record something
  reconstructible from `xs`, `sm` and `tau`.
- **No gating, no highlight, no signal.** Every field is measurement. Nothing here may drive a
  suggestion until a ledger has earned it (CLAUDE.md §7.6). The H2 ratio in particular will look alive
  long before it means anything, and the spec says so.

## One thing a reviewer should push back on if they disagree

I chose to make `si` on a **swing read** the implied sigma of the *window's yes-mid*, not of the cheap
side's own ask. A one-sided ask embeds the spread and is not a probability, so inverting it would report
the spread as volatility — but it does mean both sides of a window carry the same `si`, which looks
redundant in the CSV. The alternative (invert the side's ask and accept the contamination) would give two
different numbers that are each partly a spread reading. I think the mid is right and the redundancy is
honest, but it is a judgement call and it is cheap to reverse.

---

# Addendum — H3 / H4 measurement layer (2026-09-06)

`SPEC.md` §10–§17 is the deliverable; the block below in `code.js` is the pure glue it names.
`node test.js` → **491 assertions, all green, exit 0** (was 370; 121 new).

## New symbols in `code.js`

| symbol | kind | notes |
|---|---|---|
| `VIA_FLOW_BUCKET` | const `0.15` | **transcribed** from the shipped `viaSample` line, not chosen here. **Not an H4 threshold.** |
| `VIA_ROW_CAP` | const `6000` | storage bound (~2.1 days, ~570 KB), not a decision rule |
| `flowFields(G)` | fn | the H4 bundle from `S.sig`: `{of, ofv, ofn, of5}` or an `ofX` code |
| `flowSide(x)` | fn | `YES` / `NO` / `null`; an exact zero **never** breaks the tie |
| `flowSideAsk(side,ya,na)` | fn | the favoured side's ask, in cents |
| `flowSideMidC(side,qm)` | fn | the favoured side's mid — the right price for "wins below its price" |
| `flowSideWon(side,result)` | fn | `1`/`0`/`null`; grades only on `"yes"`/`"no"` (void never scores) |
| `flowBurst(x60,x300)` | fn | 60 s against 5 m. **A magnitude, never a verdict** |
| `viaFlowBucket(x)` | fn | the shipped panel bucket; `null` (not `"none"`) when unmeasured — §11.9 |
| `viaMid`, `viaSpreadC`, `viaAdvC`, `viaFeeC` | fn | the four maker-economics primitives, **unrounded** |
| `viaFillEcon(p,c,rate)` | fn | one graded post, exactly as `viaSample` computes it today |
| `viaFillFields(p,c,now,econ,fl)` | fn | the per-fill row bundle |
| `viaPrune(rows,cap)` | fn | oldest-first **by `t`** — the S2 regression |

Name-collision check: all 14 symbols `grep -c` **0** in `index.html` and **0** across every sibling unit.
New row keys (`of, ofv, ofn, of5, ofX` on a snap; `t, dt, k, tk, f, rb, ra, m1, tau` on a via row) collide
with no existing key, with nothing `isPhantomK1` reads (`tau`, `ask`/`entry`, `p`, `qm`), and with nothing
`refSnap` reads (`tau`, `phantom`). Asserted mechanically, not reasoned about. No non-ASCII, no arrow
functions in the new block.

## The three rules, and where each one bit

**1. Measurement only.** Nothing added computes, renders, highlights, sizes or decides. The two functions
that come closest are `flowSideWon` (which scores an outcome that already happened, at export, from a
settlement already on the row) and `viaFlowBucket` (a display bucket transcribed from shipped code).
`renderViability` and `viaRows` are untouched — no panel gains a number and no note gains a count, even
though §10.4b's precedent for surfacing excluded counts would have justified one.

**2. Do not invent a threshold.** H4's one-sidedness cut is `[TBD]` in the spine and is `[TBD]` here.
`flowBurst` returns a number at every input and classifies nothing; `of`, `ofv`, `ofn`, `of5` are stored
raw so the **distribution** exists and a cut can be pre-registered later, from the calibration half, under
§11.6's freeze. `test.js` asserts positively that no `OFI_*` / `FLOW_*` / `ONE_SIDED` constant exists
anywhere in the unit — an inverted assertion, so adding one later fails the suite rather than passing
silently. `VIA_FLOW_BUCKET = 0.15` is the one number that looks like a threshold and is not: it is
`viaSample`'s own shipped bucket boundary, named so the panel and CSV cannot drift, and the SPEC says in
two places that it must never be used as H4's cut.

**3. Omit rather than fabricate.** `ofX` has four codes and they are genuinely different questions —
`n` (write site not wired) is a **defect**, `s` (no signals object) and `t` (thin-sample guard fired) are
**measurements**, `x` (non-finite reading) should be impossible and is counted so it cannot happen
quietly. `tau` is omitted, never invented, when the caller supplies no market close. A post with no
timestamp writes **no row at all** — a row that could be conditioned on nothing is the exact defect this
layer exists to remove — and the refusal is countable for free as `V.posts − rows.length` (§11.8).

## The design decisions worth arguing with

- **A row for every graded post, not only for fills.** H3's mechanism is Glosten-Milgrom: a maker is
  filled precisely when the flow knows something, so the **fill rate is half the hypothesis**. Rows for
  fills alone would give mean P&L per fill and silently delete the selection channel being tested. Cost:
  roughly 2,880 rows a day instead of a few hundred. I think the mechanism is worth the bytes; if the
  quota forces a choice, dropping unfilled rows is the first cut to make and it should be made
  deliberately, with §11.3 read first.
- **The economics are derived, not stored.** `rb`, `ra`, `m1` are the measurements; spread, adverse
  selection and fee are exact functions of them. This follows §2.5/§2.6 and saves ~35 B/row, but it makes
  `fee_c` depend on whatever `MAKER_RATE` is in force **at export**. That is the same exposure `seas_*`
  has to `SEAS`, mitigated the same way — one line in the export header (§12.3), not a per-row field.
- **H4 lives on the edge snap, not the swing read.** The swing read already carries `ofi` but its outcome
  is a 35¢ touch, not a settlement, so it cannot answer "did that side win below its price". The edge
  ledger has the settlement, both sides' prices, and `refSnap`'s one-observation rule already in place.
  The swing read's `ofi` is left untouched — no second flow measure anywhere.
- **`flowFields` is a separate call, not a fifth parameter to `edgeSnapFields`.** A fifth parameter cannot
  distinguish "the orchestrator did not wire it" from "`S.sig` is null", and that distinction is what
  `ofX: "n"` versus `ofX: "s"` exists for. Two lines at the write site, zero signature churn.
- **`viaFlowBucket(null)` returns `null` where the shipped counter says `"none"`.** The shipped line
  conflates "balanced tape" with "no reading". I did not fix it — that would move a shipped panel's
  numbers — but I did not reproduce it either, because the CSV is where the conflation would do real
  damage. Every *measured* input agrees exactly, boundary included, and `test.js` pins that.

## Not built, deliberately

- **No narrative-vs-scheduled classifier, and no comparison statistic across the two classes.** A
  narrative shock has no calendar entry by definition, so it is Phase 2; CLAUDE.md §11.5 says Phase 2
  does not report until its detector is scored against the Phase-1 calendar as a confusion matrix, and
  `shockStatus` already returns `INVALID` without one. H3 and H4 are both gated on that matrix.
  **Recording is not gated** — a fill that was not recorded cannot be recovered — and SPEC §15 exists so
  that nobody later mistakes stored rows for permission to report.
- **No `# maker_fills` panel, note or count in the UI.** Export-only.
- **No `tau` on hourly maker rows.** `K.hourOb` carries `{ticker, ob, t}` and no close; deriving one from
  the ticker needs a `YYMMMDD` parser this unit does not have. Omitted and diagnosable from `k`, not
  invented.
- **No change to the hypothetical-fill model** (`c.yb < p.yb`), the 55–125 s grading window, the full-spread
  capture convention, or the `±0.15` bucket. All transcribed. This layer records what the instrument
  measures; it does not re-specify the maker model.
- **No `S.via` version bump.** `viaLoad` gates on `j.v===1` and discards the ledger on mismatch (design
  rule 4); `rows` is added inside the existing object and survives the round trip untouched.
