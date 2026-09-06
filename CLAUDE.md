# BTC Terminal — handoff

A single-file browser instrument for Kalshi's 15-minute and hourly BTC markets: a peer-verified price tape, a
calibrated probability engine, and self-grading ledgers under pre-registered decision rules. **No execution path
exists anywhere in this tool and none should be added.** Everything it does is measurement.

Current deploy: `build-20260906195621` — §10's 22 fixes, the K1 ledger repair, and the full **H-protocol
measurement layer** (§11): H1–H5 recording, the enumerated release calendar, and the identifiability and
plausibility gates. Nothing in it renders; it computes, stores and exports. One file, 5,858 lines,
~360 KB, 269 top-level functions, zero dependencies, zero build step. **§10 (audit addendum) corrects and extends
§1–§9; §11 is the pre-registered standard governing the shock programme. Where they disagree, the later section wins.**

---

## 1. Repo and hosts

```
GhostArchitecture/Btc-terminal   (main)
├─ index.html                    the entire instrument
├─ functions/api/[[path]].js     Cloudflare Pages Function: same-origin /api relay to Kalshi
├─ _routes.json                  Pages Functions routing (/api/* only)
├─ relay/deno.ts                 Deno Deploy relay (entrypoint; alternate egress pool)
├─ worker/kalshi-relay.js        Cloudflare Worker relay (paste-deploy, separate account)
├─ manifest.webmanifest          PWA manifest
├─ icon-{180,192,512}.png, icon-maskable-512.png, favicon-32.png, icon.png
├─ test/                         page harnesses (§6, §10.1)
├─ units/                        the H-protocol units — code, suites, specs and reviews (§6, §11)
│   ├─ {volspace,calendar,detect,reversal,schema,prereg}/{code.js,test.js,*.md}
│   ├─ run.js                    runs every unit suite
│   └─ tools/resplice.js         splices a unit into index.html between its markers, with assertions
└─ .nojekyll
```

| Host | URL | Notes |
|---|---|---|
| **Primary** | `https://btc-terminal.pages.dev/` | Cloudflare Pages. Same-origin `/api` relay lives here. **Use this one** — ledgers are per-origin. |
| Fallback | `https://ghostarchitecture.github.io/Btc-terminal/` | GitHub Pages, no relay; Kalshi only via a pasted relay URL. |
| Relay (alt pool) | `https://btc-terminal.ghostarchitecture.deno.net` | Only pool that escapes Kalshi's history throttle. Blocked at TLS on the owner's home network — works on cellular. |
| Relay (CF) | `https://relay.ghostarchitectureoccvm.workers.dev` | Reachable everywhere; inherits the same history throttle as `/api`. |

### Deploy procedure (no CI)

From a git clone (Claude Code): see §10.1. The REST-API procedure below is the pre-clone workflow and still works.

Deploys go through the **GitHub REST Contents API** with a fine-grained PAT (Contents + Pages RW, scoped to this
repo). There is no local git clone in the normal workflow.

1. Fetch the deployed file, diff against the working copy, reset to deployed if they differ. **Never build on an
   unverified base** — see §7.
2. Replace the build stamp: `<!-- build-YYYYMMDDHHMMSS -->` near the top of the file.
3. `GET /repos/:owner/:repo/contents/index.html` for the blob SHA, then `PUT` with `{message, content(base64), sha}`.
4. Poll both hosts for the new stamp (`grep -o 'build-[0-9]\{14\}'`). GitHub lands in ~25 s, Cloudflare in 30–60 s.
   **Verify by stamp, never by grepping for a feature string** — CDN cache boundaries make that unreliable.

Announce every push before running it and report the commit + stamp after.

---

## 2. Architecture in one pass

Single `<style>` block, single `<script>`, no modules, no framework. State is one object `S`; render functions read
`S` and write to the DOM or the canvas. A 1 Hz `setInterval` (`loop`) drives polling, ledgers and light; a `rAF`
loop throttled to ~30 fps drives the canvas.

### Data flow

```
6 exchange WebSockets ─┐
REST cross-check ──────┤→ acceptPrint() → S.tape (one leader book, peer-verified)
                       └→ S.src[id]     → indexProxy() → S.idx (CF-constituent median)
Kraken OHLC seed ──────→ S.bars (1-min closes) → computeStats() → calSigma()
Kalshi via relay ──────→ S.k {cur, ob, hour, hourOb, sched}
```

- **`S.tape`** is the *plotted* price: one exchange at a time (the leader, by latency), every print confirmed by a
  CF-constituent peer within a dynamic tolerance (3× live constituent dispersion excluding the candidate, floored
  6 bp, capped 15 bp). Outliers demote the leader. No median, no aggregation.
- **`S.idx`** is the *settlement* price: median of fresh CF Benchmarks constituent books
  (`CF_CONST = coinbase, kraken, bitstamp, gemini`), because **Kalshi settles on the CF index, not on any single
  book**. Every settlement-relevant quantity uses `S.idxPx`: strike distance, probabilities, provisional grading,
  order economics. The line stays one book; the math uses the index. Do not conflate these.

### Kalshi client (`kGet`, `kalshiTick`)

- Series: `KXBTC15M` (15-minute, one market per window, strike revealed at open) and `KXBTCD` (hourly ladder).
- **Pacing:** at most one request per tick, ≥1.6 s apart, staggered first run.
- **Per-class backoff** (`S.k.backoff.{live,book,history}`): a 429 on history must never stall live/book polling.
  This was a real outage mode; keep the classes separate.
- **Query-class routing** (`kBases`): history → relay first, live/book → same-origin first, each falling back to
  the other. **Circuit breaker**: 3 network failures bench a pool for 5 minutes (`kNetFail`/`kNetOk`).
- **Request trail** (`S.k.reqTrail`, DATA → Sources): last 40 calls with base, class, outcome, latency. This is the
  diagnostic that resolves relay problems — use it before theorising.
- Settled markets report `status: "finalized"`; **grade on the presence of `result`, not the status literal**.

---

## 3. The engine

`strikeProbs(R, now)` returns every estimator plus a headline.

**Volatility** (`calSigma`): 60-minute realized (`rv60`) × intraday seasonal factor (`SEAS`, 24-hour table, ~2×
swing peaking 14–15 UTC) × horizon term structure (`TERM`, +8–9% at 10–14 min). All three came from the
calibration spine, not from theory.

**Headline policy:**
- With a Kalshi quote → the **residual estimator**: the market quote is the baseline, corrected by strike distance
  in realized-σ units and book spread, frozen coefficients `z = 0.072 + 0.909·logit(q) − 0.233·(x/σ√τ) − 5.023·spread`,
  tagged `fit-2026-09-05-a`.
- Without a quote → median of analytic, drift, empirical.
- **Flow is a comparator only**, never the headline, until recorded flow data grades it.
- Probabilities clipped to [0.5%, 99.5%].

**Why the market is the baseline:** on 2,000 settled windows the market's quote beat every lognormal at every
horizon (Brier 0.1457 vs 0.1473; 0.0370 vs 0.0501 at one minute). Refitting freely per horizon gained at most
0.0007. Do not reintroduce a model that competes with the quote head-on without new evidence.

---

## 4. Ledgers and decision rules

All persist to `localStorage`, all export to CSV, all are **ungardenable** — withdrawals log as `WITHDRAWN`,
provisional grades are marked and overwritten by official results, nothing is silently deleted.

| Key | Contents |
|---|---|
| `btc.edge` | per-window snapshots + results (model vs market) |
| `btc.rounds` | your armed strike calls |
| `btc.intervals` | completed window analysis |
| `btc.via` | viability samples (maker economics) |
| `btc.swing` | swing reads and grading |
| `btc.journal` | simulation trades + arm bankrolls (`{v:3, t:[], bank:{}}`) |
| `btc.round` | the live armed round, so a reload between ARM and the gate does not erase it (§10.3 R5) |
| `btc.shock` | H1 rows: one per shock per horizon, impulse + signed reversion + round-trip cost |
| `btc.repair` | the one-time K1 ledger repair record: rule, counts, and the viability counters it reset (§10.4b) |
| `btc.cfg`, `btc.sections.v2` | settings, collapsed-section state |

**Scoring discipline, applied everywhere:** one observation per window (`refSnap` — the read nearest mid-window),
never per snapshot. Per-snapshot scoring overcounts ~8× and inflated the verdict inputs before it was fixed.
15-minute and hourly series are scored separately. Kalshi's taker fee (`kFee` = `0.07·p(1−p)`) is charged on both
legs of every paper trade.

**Verdict** (`VERDICT_RULE`, pre-registered, 15-minute windows only): ≥200 graded windows · Δ Brier > 0 with a 90%
percentile-bootstrap CI excluding zero · an edge band with n ≥ 30 beating market-implied by ≥3 pt · paper P&L > 0
over ≥100 entries and positive on each of the last two days. **READY is necessary, never sufficient. No capital
until it reads READY.** Thresholds were fixed before the data arrived — do not tune them to fit results.

**Viability** (`VIA_HIST` + live sampling): spread captured vs adverse selection vs fees, per series. History rows
are backtested constants: 15m `0.92 / 1.68 / 0.87 = −1.63¢`, hourly `1.03 / 2.34 / 0.87 = −2.18¢`. Reads NEGATIVE;
turns positive only on net > 0 over ≥30 live fills.

**Swing watch** (`SWING`, `touchProb`): first-passage Monte Carlo (600 paths, digital repriced each minute so the
barrier moves as theta bites) for P(a cheap side's bid reaches 35¢ before the gate), against `SWING_BASE` — the
spine's history by ask. Graded at the gate on the best bid after each read. The sweep highlights a window **only**
when the model clears breakeven *and* the ledger holds ≥30 graded reads beating the base rate.

**Simulation journal** (`SIM`, 10 arms = 5 entry rules × {box, trail}): each arm has a $1,000 bankroll, risks 5% at
the ask, compounds. Universe: every side of the live window read at ≤15¢; `tool` and `model` arms only enter ≤9¢.
`box` sells at 35¢ else last bid; `trail` arms at 2.5×, sells on a 25% pull-back, stops at 50%, time-stops at
T−1:30. `all` and `random` are the controls. The question: does a tool arm's bankroll beat the controls over ≥30
trades.

---

## 5. The chart

`renderSweep()` — one perpetual sweep, −30/+15 minutes, continuously scrolling, never wiping.

- Kalshi gates arrive from the right and exit left; hour gates heavier. Each window's strike spans only its own
  window. Settled windows collapse to a pip (Y/N) at their gate — the ribbon record.
- **Colour keys to the call, not the strike**: green means *your call is winning*. Getting this backwards is the
  most dangerous possible bug in this tool; there's a harness for it (`test/sweep.js`).
- Domain keeps the strike in view and centres on the price–strike span; close-weighting leans into the duel in the
  final minutes. `S.lastMap` stores the current mapping for inverse (pixel → time/price) lookups.
- **Swing activation** inverts the live window: saturated mineral field, bone tape, full-gilt strike, other windows
  dimmed. **SWING** locks tight on that window; **drag a rectangle** locks any region; RESUME/Escape releases.

### Visual system (shared with the Ghost Codex Rhyme Instrument)

Obsidian substrate `#1b1a22 / #2c2a36 / #0e0d13` on `#09080d`; bone inscription `#ece3d0`; gilt ramp
`#7a5510 → #d9a52c → #ffe9a3` reserved for what decides; malachite `#3fbf7e/#1c6a45` and ruby `#e0475f/#6b1a2e`;
brushed bronze binding `#d9a866/#8f6a35/#4f3a1c` with verdigris `#3f9a86` in seams. Per-session vein layer
(3 displaced beziers, seeded PRNG). **NOAA sundial** (`solarPosition`, Dayton default, opt-in geolocation) sets
`--lx --ly --elev --night` once a minute; every bevel, sheen, cabochon highlight and cast shadow reads those four
custom properties. Canvas colours come from `PAL`. Serif for section heads, mono for numbers.

---

## 6. Testing

No test framework. Harnesses are standalone Node scripts that load the `<script>` block into a `vm` context with a
mocked DOM and canvas, drive state directly, and assert on outcomes. The shared loader is `test/lib/load.js`:

```js
const { load, runner } = require("./lib/load");
const H = load();            // H.R(code) evals in the page context; H.setNow(ms) fixes the clock; H.store is localStorage
const out = H.R(`{ /* set S.*, call functions, return assertions */ }`);
```

Suite (`npm test`, after `npm install` for jsdom):
- `test/invariants.js` — index proxy and peer tolerance, routing / per-class backoff / circuit breaker / request
  trail, calibrated engine and clipping, one-observation-per-window scoring, series split, provisional → official,
  verdict rule shape, bootstrap, round grading truth table, WITHDRAWN, reconcile, swing engine and gating, journal
  shape, CSV datasets, sundial.
- `test/sweep.js` — the call-keyed colour truth table (`h_call`), no-call tick colouring, domain, inverse mapping,
  SWING / region locks, settled pips.
- `test/page-load.js` — **jsdom full-page load** with the network blocked: zero init errors, three ticks of the 1 Hz
  loop, one frame, theme-color, NOT READY / NEGATIVE defaults, sundial properties.
- `test/hprotocol.js` — the H-protocol measurement layer (§11): that the five units are spliced and reachable, that
  implied volatility is **omitted rather than invented** at the money, that the vol triple and book depth reach a
  real snapshot through the live write path, that `volCloseTick` captures realized volatility before the bar buffer
  drops it (and retries rather than giving up early, per L2), that the release calendar refuses to invent dates or
  tag a missing timestamp, DST mapping, phase-1/phase-2 separation, the time-matched control, and the CSV columns.
  It also carries **the invariant whose absence let a quote-dependent gate ship** (§11.8): the identifiability
  verdict must be identical across a quote sweep spanning both signs of the premium, at a strike inside the band,
  outside it, and at the money.
- `test/prereg.js` — the §11 guard. Reads CLAUDE.md **from disk** and requires every `SHOCK_RULE` threshold and
  every §11.8 bound to appear in the document, with the keys enumerated from the object so a threshold added to
  the code with no document entry fails. The load-bearing values are pinned by arithmetic rather than by digit
  presence — §11.1's shares and calendar costs and §11.2a's z/B figures and power table are parsed out of the
  document and recomputed. It also asserts the pre-registration invariants behaviourally: gate exogeneity, READY
  unreachable below the registered minimum n, the CI level `1 − α/k`, the bootstrap floor, phase separation, and
  that no execution path exists. **Verified to bite:** against `899276d` it fails 6 of 77.
- `test/defects.js` (`npm run test:defects`, informational) — one reproduction per confirmed defect in §10.3; each
  prints REPRODUCED until fixed. All 16 currently print FIXED — it is the regression guard for this audit's fixes,
  not a to-do list, until the next round of findings lands here.

Always run the whole suite before a push; a change in one module has repeatedly broken another. `npm test` is
currently **231 assertions across 5 harnesses**.

`npm run test:units` runs the six H-protocol unit suites under `units/` (~1,850 assertions); `npm run test:all`
runs both. **The units are the source and `index.html` is the splice target** — edit a unit, then
`node units/tools/resplice.js <unit>...`, and never patch the spliced copy, or the next splice silently reverts
the patch. The splice is verified reproducible: re-splicing every unit from `units/` leaves `index.html`
byte-identical.

*These lived only in the session scratchpad until 2026-09-06 — ~7,400 lines of unit code, suites, specs and
adversarial reviews in an ephemeral container, including the whole calendar unit, which is not spliced anywhere.
An earlier revision of this section documented that as a property of the design rather than fixing it. It was the
same failure as the missing `test/prereg.js`: recording a gap instead of closing it.*

---

## 7. Hard-won rules — read before changing anything

1. **Diff the working copy against the deployed file before every build.** A usage-limit interruption once left
   half-written code in the working copy that got layered over and shipped: duplicate function definitions, a
   duplicate state key that turned `S.edge` into an array, and a dead ledger running by accident. Check for
   duplicate top-level definitions explicitly.
2. **Every string replacement gets an assertion.** Two silent no-op replacements shipped: a CSV extension that
   never landed and a strip readout that never rendered. If the anchor isn't found, fail loudly.
3. **Verify deploys by build stamp, not feature grep.**
4. **Beware hindsight in any backtest.** A residual model showed +8–13¢ until overlapping observations, fees and a
   period-specific coefficient were removed — then it was zero. A swing MFE showed +9.4¢ until it stopped picking
   the winning *side* retroactively — then it was +0.16¢ with perfect exit timing. Score one decision per window,
   walk-forward, fees included.
5. **Fee rounding matters at small size.** Kalshi rounds fees up per order; modelling that per contract turned a
   0.44¢ maker fee into 1¢ and inverted a result. Use per-contract economics for realistic size.
6. **Don't present noise as opportunity.** The market is well calibrated here; any displayed edge must be earned in
   the ledger before it's surfaced as a signal. Gate suggestions on evidence, tag everything else `unverified`.

---

## 8. Known state / open items

- **Theme-color meta** — resolved: the tag reads `#1b1a22` (obsidian). The manifest's `theme_color` is `#09080d`;
  pick one (cosmetic).
- **History throttle**: Kalshi 429s history queries from all Cloudflare egress. Provisional settlement from the
  index proxy covers it — it agrees with Kalshi's official result **94.7%** of the time.
- **Deno relay** is blocked at TLS on the owner's home network (confirmed via hotspot); the circuit breaker handles
  it. Not worth further work.
- **iOS cannot record in the background.** The desktop app window (Edge → ⋯ → Apps → Install this site as an app)
  is the recorder of record; the phone is for arming and viewing.
- **Untested and only testable live:** sub-minute order flow, book depth, and dislocation as predictive features.
  These are the only remaining candidates for a real edge; everything price-path-based has been ruled out.
- **Release calendar — spliced, enumerated only, deliberately simple.** 49 dated rows: BEA 2026 (GDP, PCE,
  Trade — 39 instants from `apps.bea.gov/API/signup/release_dates.json`, retrieved 2026-09-06), the eight FOMC
  2026 statements, two CPI dates, and two BLS reschedules from the 2025–26 appropriations lapses. Every row
  carries its source URL and retrieval date; **that is the whole of the provenance mechanism.**
  The unit previously generated dates from rules (first-Friday payrolls, every-Thursday claims) and gated
  control eligibility on a human-signed coverage declaration vouching for those rules. Three adversarial review
  rounds each found a fresh way for a signature to outlive what it signed, **all three about rule-derived rows**
  — and the shipped state refused every window in history, so §11.3 had zero controls and the instrument
  measured nothing. The generator and the vouch are both deleted (`units/calendar/NOTES.md` keeps the history
  under SUPERSEDED banners). An enumerated feed has no rule to be wrong about.
- **The calendar is partial, and that is a stated property of the measurement.** No BLS series is in it —
  `bls.gov` blocks this environment at the origin (their own Access Denied page, not a network policy), so CPI,
  PPI, payrolls and claims are absent except the four hand-carried rows. `controlEligible` therefore returns
  `known` alongside its verdict — the per-series spans actually in the table, and `CAL_PARTIAL_CAVEAT` — because
  a control window may contain a release nothing told the table about. Per §11.3 that biases
  difference-in-differences **toward zero**, i.e. against finding an effect. Record the caveat with the result;
  do not read a control as certified clean.
  At 47 events a year the §11.1 arithmetic worsens: 60 graded shock windows takes **~15 months**, not 7.
  `api.stlouisfed.org` is reachable and would supply the BLS schedules with a free FRED key.
  One row is flagged and unverifiable from here: CPI 2026-09-11 falls on a Friday, atypical for BLS. Do not
  "correct" it — check it against bls.gov.
- **Open defects:** §10.3.

## 9. What "done" looks like

Not a profitable strategy — an instrument that can *tell you* whether one exists. It currently says: taking the
spread loses ~4.2¢ a round trip, making loses ~1.6¢, and buying cheap sides loses ~2.5¢. Those are findings, not
failures. The verdict, viability and swing panels all read negative and will keep reading negative until the
accumulated evidence says otherwise. Preserve that honesty above all else.

---

## 10. Audit addendum — 2026-09-06 (migration into Claude Code)

Every claim in §1–§9 was checked against `build-20260906004231` by reading the code and by harness. This section
records what differs, what is broken, and how the repo is worked from a clone.

### 10.1 Working from a clone

- **Deploy = push to `main`.** Cloudflare Pages and GitHub Pages both build from it; the same-origin `/api`
  function deploys with the Pages build. Verify by stamp exactly as in §1 step 4. The stamp on line 2725
  (`<!-- build-YYYYMMDDHHMMSS -->`) is still replaced by hand — assert the replacement (§7.2).
- **Before editing:** `git status` must be clean and `git diff origin/main` empty (§7.1 in git terms). Check for
  duplicate top-level definitions: `grep -oE '^(async )?function [A-Za-z_$][A-Za-z0-9_$]*\(' index.html | sort | uniq -d`
  must print nothing.
- **Tests:** `npm install` once (jsdom is the only dev dependency; `package-lock.json` is committed so the install
  is reproducible), then `npm test` before every push. `npm run test:defects` lists which §10.3 items still
  reproduce — currently none.
- The relays (`relay/deno.ts`, `worker/kalshi-relay.js`) are still paste-deployed; nothing in the repo deploys them.
- The calibration spine and the fit scripts behind `SEAS`, `TERM`, the residual coefficients and `SWING_BASE` are
  not in the repo. Until they are, treat those constants as frozen data (§3) and do not refit.

### 10.2 Corrections to §1–§9

- **Header:** 2,726 lines and 142 top-level functions (not 136). No duplicate definitions in the deployed build.
- **§1 tree:** `icon.png` exists and was unlisted. `README.md` is a one-line title.
- **§2 tape:** the tolerance is as described, but the check is against each fresh peer individually. A print with
  **zero** fresh CF peers is still *accepted* — the tape must keep moving through a real four-way constituent
  outage — but as of the N1 fix it is tagged `S.src[id].verified=false` and the spot label reads "unverified (no
  fresh peers)" instead of falsely claiming "peer-verified" (§10.3 N1). The comment at line 780 still says "25bp".
- **§2 index:** with fewer than two fresh constituents `indexProxy` still returns the tape leader's price flagged
  `fallback:true`; this flag is informational only — nothing outside `indexProxy` reads it, and `S.idxPx` silently
  becomes a single-book price in that case. Not fixed (see §10.5). A single fresh constituent is ignored in favour
  of the tape.
- **§2 "every settlement-relevant quantity uses S.idxPx":** true for probabilities, snapshots, provisional grading,
  swing and sim. User-armed strikes that do not match the Kalshi strike settle by a 2/3 vote over all six exchange
  books at the tick (`settleRound`), and the window's open/close references are six-book mid-ranges.
- **§2 stagger:** the first order-book fetch lands at ~+7 s (the 8 s gate), not +3 s.
- **§2 request trail:** a 429 on the primary that fails over to the secondary logs one row for the secondary only;
  the primary 429 is invisible in the trail.
- **§3 seasonal factor:** `calSigma` multiplies `rv60` by `sqrt(SEAS[endHour] / SEAS[nowHour])` — a ratio, not
  the table value. Inside one clock hour the factor is exactly 1; it only acts when the window crosses an hour.
  `TERM` peaks at +8.9% (12 min) and is +6% at 14–15 min. `touchProb` applies the seasonal ratio but not `TERM`.
- **§4 keys:** section state persists under `btc.sections.v2`.
- **§4 `refSnap`:** picks the read with τ nearest **6 minutes remaining**, for both series — 9 minutes into a
  15-minute window and 54 minutes into an hourly one. Not mid-window.
- **§4 fees:** `kFee` (ceil to the cent per contract) is charged **once**, on entry, in the edge bands and the
  verdict paper P&L — hold-to-settlement has one leg. The swing/sim journal charges the **unrounded** `0.07·p(1−p)`
  on both legs. The rounds-table paper P&L is gross of fees. Two fee models coexist.
- **§4 CSV:** exports windows, called windows, swing reads and the simulation journal. `btc.intervals` and
  `btc.via` are not exported. The H-protocol columns (§11) are **derived at export time, not stored** — the event
  tag, the seasonal factor and the identifiability verdict are recomputed from each row's own measurements when
  the file is written, so an export always reads against the release calendar as it stands at export time and
  costs the recorder no bytes. `btc.edge` prunes at 1,500 windows — roughly **15 days** — so for anything
  accumulating slower than that (the shock programme needs ~7 months, §11.1) **the CSV is the record and
  localStorage is only the buffer.** Export on a schedule or the data is gone.
- **§4 swing:** the Monte Carlo tests the side's *fair value* reaching `SWING.target = 0.36`; the ledger grades the
  max **bid** ≥ 0.35 after each read (perfect-exit "touch" grading, as §7.4 warns). The sim journal carries the
  realistic exits. Verified-highlighting requires n ≥ 30 and model Brier < base-rate Brier (confirmed).
- **§4 ungardenable:** two silent-loss paths existed (§10.3 L1, R5); both fixed.
- **§5:** confirmed by `test/sweep.js` for the tape/head-dot/ghost fields — colour keys to the call in all four
  cells, the no-call line keys to tick direction, `S.lastMap` inverts the forward mapping exactly, locks behave as
  described, settled pips draw. The live odds gauge and the settled-strike ring did **not** follow this rule
  (§10.3 G1, R2b) — both fixed and now covered by the same test file.
- **§6:** the harnesses were never in the repo; they are now under `test/`.
- **§8 theme-color:** resolved; see §8.

### 10.3 Confirmed defects — all fixed in this working copy, not yet built/deployed

Every row was reproduced by a failing case in `test/defects.js` before the fix and now prints FIXED; the table is
the change record, not a to-do list. Two more (G1, R2b) surfaced from a second audit pass after the table below was
first drafted and are included for the same reason. Line numbers are for `build-20260906004231`, the state before
these fixes.

| id | where | what was wrong | fix applied |
|---|---|---|---|
| **K1** | `kalshiTick` 1108 | `K.cur` is replaced on a new market but `K.ob` is never cleared, and nothing checks the book's ticker. For ≥7 s after every roll (up to 120 s under a book backoff) the old window's 98/99 book was the new window's quote: wrong residual headline, wrong `quoteIn` at the exact moment "ARM to commit" prompts, first `btc.edge` snapshot of the new window carrying the old book, **phantom swing reads at 1–5¢ that entered sim positions and closed at 35¢ "target" for +$300–500 per arm**, and −48¢ phantom fills in the live viability series. | `K.ob`/`K.obAt` are nulled the instant the ticker rolls (or the market disappears); every consumer (`kQuoteFor`, `kSyncQuote`, `edgeSnap`, `swingSides`, `swingTick`, `viaSample`) already fell back correctly to the fresh market object when `K.ob` is null, so clearing it was the whole fix. |
| **K2** | `kQuoteFor` 1009 | Kalshi's empty-side values (`yes_bid 0.0000`, `yes_ask 1.0000`) parsed to 0/100 and passed the guard, giving `{q:0.5, spread:1.0}`; the residual's −5.023·spread term drove the headline to 0.7% whatever the strike. | added `\|\|ya>=100` to the guard, matching `edgeSnapOne`'s existing check. |
| **E1** | `autoBand` 1841 | called every 1 Hz tick from `xtResolve`; when coverage was outside [0.87, 0.93] it multiplied z by 1.04/0.98 per *tick*, not per new resolution, so `auto · band z` railed to 3.00 or 1.00 within ~20 s. | tracks the resolution count seen at the last adjustment (`S.auto.lastN`) and only adjusts when it has grown. |
| **L1** | `ledgerSave` 1251 | one bare `try/catch` around three `setItem`s with `btc.edge` first. Once the edge ledger exceeded the origin quota, rounds and intervals stopped persisting too, silently. | each of the three keys gets its own `try/catch`; a quota failure on one no longer blocks the others. `S.ledgerErr` records which key last failed. |
| **L2** | `edgeProvisional` 1303 | `provTried` was set before `tapeSettleAvg` was tried; on a reload the 1 Hz loop runs before `seed()` lands, so every window that closed while the app was down was marked tried against empty tape/bars and never provisionally graded. | `provTried` is now set only after a successful `tapeSettleAvg`, so a window is retried every tick until the tape/seed catches up. |
| **R1** | `settleRound` 1984 | the 60 s settlement average and the exchange vote were anchored at the tick time, not `R.tEnd`; a throttled tab settled a call on post-gate prices. | the index path now averages to `R.tEnd`; the vote path uses `priceAtSrc` against each exchange's historical `hist` array evaluated at `R.tEnd`, replacing the live-only `freshExch`. |
| **R2** | `showVerdict` 2044 | the WINDOW SETTLED banner was malachite when the window went UP and ruby when DOWN — price direction, not whether the call hit. | the class now keys on `hits === scored.length` / `hits === 0`, matching §5's rule. |
| **R2b** | `renderSweep` (settled-strike ring) 2545 | the same inversion as R2, one level down: the ring and its HIT/MISS label around a settled armed strike were coloured by `sk.outcome` (UP/DOWN) rather than `sk.hit`. | `col=sk.hit?UPC:DNC`. Covered by four new cases in `test/sweep.js`. |
| **G1** | `renderSweep` (live odds gauge) 2533 | the vertical odds gauge's two colours were assigned backwards relative to which segment grows with the call's own probability: as the call's odds rose, the call-coloured segment *shrank*. | swapped the `gA`/`gB` colour assignment; the segment whose height tracks the call's own odds now carries the call's colour. Covered by a 4-cell truth table in `test/sweep.js`. |
| **R3** | listeners 2680 / 2687 | the ABOVE/BELOW click handler that synced `quoteIn` ran before the one that set `S.callSel`, so the quote box showed the *other* side's ask until the next tick; arming in that gap stored the wrong `quoteAtArm`/`edgeAtArm`. | merged into one listener per button that sets `S.callSel` first. |
| **R4** | `armRound` 1960 | `strikeProbs` was called without the quote, so `probAtArm`/`pCallAtArm`/`edgeAtArm` were the lognormal-vs-market edge (`fallback-3`) that §3 says loses head-on; the tick-time headline used the residual, so the same call showed two different edges. | passes `quote: kQuoteFor(v, R.tEnd)`. |
| **R5** | `S.round` | the live round was never persisted; a reload or iOS tab kill between ARM and the gate erased the call without a WITHDRAWN row. `armRound` also discarded a stale live round from a previous window without logging it. | `roundSave`/`roundLoad` persist `S.round` to `btc.round` (saved every `roundTick`, loaded in `init`); `armRound` now calls `settleRound` on a stale live round before replacing it. |
| **R6** | `renderArmBar` 2122 | the "net edge / EV" line paired the armed call's probability with whatever side the quote box currently showed (the selected button), not the armed call's own side. | derives the ask straight from `S.k.ob`/`S.k.cur` for `act[0].call`'s side; a manually-typed quote (`quoteManual`) is still honoured when set. |
| **SEC1** | `initSections`/`setAllSections` | EXPAND/COLLAPSE ALL and a single-section toggle each kept their own closure over the persisted state; the next single toggle after ALL saved back its stale copy, discarding the ALL action. | one shared `SEC_STATE` object, loaded once and written by both paths. |
| **S1** | `simUpdate` 1618 | trail arms entered at the ask and stopped when the *bid* fell to ≤ 50% of it; cheap sides quote 2/5 or 3/7, so the stop fired on the first poll with no move — trail arms were measuring spread, not path. | the stop now references the bid observed at entry (`entryBid`, threaded from `swingTick` through `simEnter`), not the ask paid. |
| **S2** | `swingSave` 1528 | pruned by string-sorted key; Kalshi tickers embed `YYMMMDD`, and `OCT` < `SEP` as strings, so at a month boundary the newest entries (open sim positions included) were deleted on the save that created them. | prunes by each entry's `close` timestamp instead. |
| **S3** | `simEnter` 1597 | `stake = max(1, bank·5%)` had no floor: a busted arm kept buying on a $1 stake with a negative bankroll. | `simEnter` skips an arm once `bank <= 0`; the journal panel marks it "· busted". |
| **N1** | `acceptPrint` 790 | `if(peers>0 && !ok)`: with all four constituents stale, any exchange print (Binance.US, Bitfinex) was accepted unverified, took leadership, and — via the index fallback — became `S.idxPx`, while the spot label still read "peer-verified". | the print is still accepted (halting the tape during a real four-way outage is worse), but is tagged `S.src[id].verified=false` and the label reads "unverified (no fresh peers)" instead. |
| **N2** | `connectWS` 700, `stopWS` 709 | the reconnect attempt counter never reset after a healthy session, so routine 15 s-silence watchdog closes ratcheted every venue to the 30 s cap; `stopWS` didn't cancel pending reconnect timers, so pause/resume during a backoff could open a duplicate socket that double-counted `S.flow`. | `onmessage` resets the attempt counter on any frame; `scheduleWS`'s timer is tracked per source and cleared in `stopWS`. |
| **N3** | `kGet` 1062 | one `AbortController` served both the primary and failover fetch: after a 9 s timeout the failover attempt reused the already-aborted signal and failed instantly, and the trail misattributed the outcome. | each attempt gets its own controller and timeout (`doFetch`); non-429 5xx responses now also fail over and count toward the circuit breaker (`kNetFail`), matching 429's existing treatment. |
| **N4** | `kalshiTick` 1137 | the settled-history merge kept existing result-less entries first and deduped by first occurrence, so an `unopened` stub shadowed a settled result for the same ticker for 10–25 min. | the fresh (settled) entries are concatenated first, so the dedupe keeps the one with a result. |

Also fixed, lower severity (§10.4); found but deliberately not fixed here, with reasons (§10.5).

### 10.4 Also fixed, lower severity

- **Void grading.** Any truthy `result` was graded, so a `void` Kalshi settlement scored as NO and could override a
  provisional round. `kReconcile` and `edgeGrade` now require `result==="yes"||result==="no"` before grading.
- **σ inflated across a sleep/background gap.** `computeStats` built log-returns from consecutive stored bar keys
  without checking they were actually one minute apart; a gap (laptop sleep, backgrounded tab) was scored as one
  giant one-minute return. `barsExcludingCurrent` now carries the bar keys alongside the closes, and a return is
  kept only when the keys are exactly 1 apart.
- **`hourStart` used local time.** `new Date(t).setMinutes(0,0,0)` floors in the browser's zone; the "hour open"
  reaction level and the hourly anchor were off by up to 59 minutes outside UTC. Replaced with `Math.floor(t/3600000)*3600000`.
- **`edgeSnapOne` paired a fresh model probability with a stale market quote.** During a book backoff the quote
  could be minutes old with no age check. `edgeSnap` now uses `K.ob` only when `now - K.obAt <= 90000`, otherwise
  falls back to the market's own top-of-book (fresh from the same poll).
- **REST cross-check overwrote a live, fresher socket price.** `poll()` treated an in-tolerance REST read as a full
  print — overwriting `st.price`/`st.t` and re-feeding `acceptPrint` — even though REST lags the socket by seconds,
  which could demote a healthy leader on a stale REST value. REST is now a pure cross-check while the socket is
  fresh: it only sets/clears the `drift` flag and never writes the price or calls `acceptPrint`.
- **`seed()` had no fetch timeout.** A hanging Kraken (or Bitstamp) connection could delay `startPolling`/`startWS`
  indefinitely, since `await seed()` gates them in `init()`. Both fetches now carry an 8 s `AbortController` timeout.
- **DATA summary mislabelled windows as "snapshots".** `nSnap` in `edgeStatsOn` is one entry per graded *window*
  (the whole point of `refSnap`), not per snapshot; the label now says "windows".

### 10.4b Repairing the data K1 already wrote

Fixing K1 stops new phantom rows; it does nothing about the ones already in `localStorage` on the recorder. Those
are not cosmetic — a phantom sim trade entered at 1–5¢ and closed at the 35¢ "target" booked +$300–500 into an arm
bankroll, which is the exact number the simulation exists to compare. `repairLedgers()` runs once at `init`,
versioned under `btc.repair`, and is idempotent.

**What it marks.** A row is flagged `phantom:"K1"` when *all three* hold: ≥ 13 minutes remain on a 15-minute
window, the ask is ≤ 15¢, and the model's touch probability is ≥ 50%. Those three cannot describe one real book —
a KXBTC15M strike is set at the money at open, so nothing is cheap yet; and a side is only cheap *because* it sits
far from the money, which is what makes a touch unlikely. A genuine read satisfies at most one. The rule string is
stored in the repair record so the criterion travels with the data.

**What it does.** Flagged rows stay on the record and are excluded from scoring: `swingStats` drops flagged reads
(but keeps a window-side's remaining clean reads), `journalStats` drops flagged trades, `refSnap` skips a flagged
snapshot. Each phantom trade's P&L is withdrawn from its arm's bankroll, and the arm is marked `contaminated`
because trades *after* a phantom were still position-sized against the inflated bank — the per-share statistics are
clean, the bankroll curve is only approximate. `dd` is reset, since a drawdown path cannot be reconstructed once
its inputs are withdrawn. Both CSV datasets gain an `excluded` column.

**The exception is viability.** `btc.via` stores running sums, not rows, so a poisoned fill cannot be subtracted
from a total. The pre-repair counters are copied into the repair record and the live series restarts empty; the
`VIA_HIST` backtest constants are untouched. This is the one place the repair discards a number rather than
marking it, and the discarded value is preserved verbatim.

Counts are surfaced in the swing and journal panel notes, so an excluded row is visible rather than quietly gone.

### 10.5 Found but not fixed here — with reasons

- **`bootstrapCI` is unseeded (`Math.random()`).** This is not a defect — resampling variation is inherent to a
  percentile bootstrap, not a bug to remove. Seeding it would make the CI look more certain than the method
  actually supports. Leave it; if display stability matters more than statistical honesty, that's a product
  decision for the user to make explicitly.
- **`indexProxy`'s `fallback:true` flag is write-only.** Nothing downstream of `indexProxy` reads it, so `S.idxPx`
  can silently become a single-book price with no trace beyond the "(1 books …)" count already shown in the arm
  bar. A full fix needs a UI decision (where does "the index is degraded" belong?), not just a code change.
- **The 1 Hz loop's `Math.floor(Date.now()/1000) % N === 0` duty gates** (viaSample every 5 s, `renderSwing` every
  2 s, `renderJournal` every 10 s, `renderVerdict` every 30 s, `sunTick` every 60 s) can skip a beat when the
  interval drifts across a second boundary (a throttled/backgrounded tab). None of these duties are
  scoring-critical — a missed `viaSample` beat is a missed maker-economics sample, not a wrong one — so this is a
  freshness nit, not a correctness bug. Left as-is; a last-fired-timestamp rewrite of the whole loop is a
  larger, higher-blast-radius change than its payoff justifies right now.
- **iOS standalone: header sits under the status bar (no `env(safe-area-inset-top)`).** CSS-only, but needs an
  actual device to verify — untestable in this environment. `viewport-fit=cover` is already set.
- **Manifest `id: "/"` resolves to the origin root on the GitHub Pages fallback**, whose scope is `/Btc-terminal/`.
  Cosmetic (affects install identity on the fallback host only, which §1 already says to avoid).
- **Cosmetic/copy nits, not corrected:** the idle sweep header reads "SWEEP ±30m" while the span is −30/+15; the
  drag-to-lock rectangle and the SWING button's region lock are mouse-only despite the lock note promising touch;
  the swipe-hint mask on wide tables can lag the DATA-view toggle by up to 3 s; the vein layer reseeds per hour, not
  per session as §5 states; a gilt "anchor" gridline draws even with nothing armed; a region lock that excludes the
  anchor strike can let y-axis tick labels bleed over the foot clock; the rAF loop keeps rendering the sweep at
  zero width while the DATA view hides the canvas. None of these touch a number, a colour that means win/lose, or a
  ledger — they're worth a pass, just not this one.

### 10.6 What the harnesses could not verify

Live-only: Kalshi's `result` enum beyond `yes`/`no`/`void` (docs.kalshi.com was egress-blocked during this audit —
confirm the full enum before trusting the void-grading fix covers every non-binary case), whether the KXBTC15M
expiration value is a one-minute average (the code assumes so), the 94.7% proxy agreement, iOS safe-area
rendering, and every §9 economic figure (those are ledger outputs, not code).

**Two of these closed at the `build-20260906195621` deploy.** The **relay throttle** was measured rather than
inferred: on the same path and the same minute, both Cloudflare pools (`/api` and the Worker) returned
`429 too_many_requests` while the **Deno pool returned 200 with live KXBTC15M data** — §8's split, confirmed.
Note the relay's own shape while you are here: `UPSTREAM` already carries `/trade-api/v2` and `ALLOW` is
`^/(markets|events|series)`, so the path is `/api/markets`, and `/api/trade-api/v2/markets` answers
`403 path not allowed` — a 403 there is a malformed URL, not a broken relay. And **browser rendering** of the
doubled-size file is confirmed: `index.html` went 2,726 → 5,858 lines between deploys, jsdom is not a browser,
and the owner opened the deployed build and reported it running cleanly.

---

## 11. The shock programme — pre-registered evidence standard (2026-09-06)

Written before the first shock-conditioned observation exists. No number in this section was chosen with knowledge
of a result. `SHOCK_RULE` in `index.html` is the machine-readable copy of these thresholds and `test/prereg.js`
fails if the two disagree — the document and the code cannot drift apart silently.

A shock-conditioned arm is any decision rule that fires only when a macro event lands in the live window. The
programme exists because the instrument has ruled out everything price-path-based (§8) and a scheduled release is
the one remaining exogenous thing that happens to a 15-minute window. It is also the hardest thing this tool has
ever tried to measure, because there are almost none of them.

**§11.7 closes the programme if any threshold in this section is later loosened.** Loosening is the failure mode
this section exists to prevent, not a repair for a disappointing result.

### 11.1 The arithmetic that forces a separate standard

BTC-relevant scheduled US macro releases number roughly **100 per year**, or **~150 counting weekly jobless
claims**. That is a planning premise, not a measurement: the actual calendar has not been transcribed into this
repo. Phase 1 begins by committing the calendar to the repo with its source and its retrieval date, and the
observed count replaces these two figures here — upward or downward — before any window is scored.

Each release lands on exactly **one** live 15-minute window. There are 96 windows a day and **35,040 a year**, so
shock windows are **0.29% of the tape at 100 releases a year and 0.43% at 150**. Against the existing
`VERDICT_RULE` bar of ≥200 graded windows:

| graded shock windows | at 100 releases/yr | at 150/yr |
|---|---|---|
| 30 | 3.6 months | 2.4 months |
| 60 — this section's minimum | 7.2 months | 4.8 months |
| 100 | 12.0 months | 8.0 months |
| 200 — `VERDICT_RULE` | 24.0 months | 16.0 months |

**`VERDICT_RULE` is therefore unreachable for a shock arm inside two years, and it is not being relaxed.** §4 says
thresholds were fixed before the data arrived and must not be tuned to fit results; inventing a softer bar after
seeing a shock result would be exactly that. This section sets a *different* bar, in advance, and it is not softer:
it demands 60 graded windows where a naive reading of "n ≥ 30" would demand 30, it demands a matched control for
every one of them, and §11.2 shows it may demand considerably more than 60.

One consequence follows immediately and is binding: **no arm may be conditioned on a single release type.** CPI
occurs 12 times a year; a CPI-only arm reaches 30 observations in two and a half years and 200 in sixteen. Arms are
conditioned on the release *class* (scheduled US macro) or not at all.

### 11.2 The bar

One **primary** hypothesis per phase, one primary arm, one primary statistic, all three written into this file with
a build stamp before the first observation of that phase is recorded. Everything else is exploratory (§11.4).

**Primary statistic — difference-in-differences.** For the primary arm, the Brier score of the Kalshi
quote-implied probability **minus** the Brier score of the tool's headline probability, on shock windows,
*minus the same difference computed on that window's time-matched controls* (§11.3). **Brier is a loss, so the
subtraction is `market − tool` and a POSITIVE Δ means the tool is better** — the same orientation as §4's
`VERDICT_RULE` and as every Δ Brier in the instrument (`brierQ − brierM`, `mk.brier − h.brier`, `bb − bm`).

*This sentence was corrected on 2026-09-06; it previously read `tool − market`, which is the opposite
orientation and made the section contradict itself. Under the old wording the paragraph below reasons that a
market Brier of 0.1457 against a model's 0.1473 makes the model "0.0016 worse" — a **positive** number for a
**worse** model — and then requires Δ ≥ +0.010 to read READY, i.e. demands the tool be a hundredth of a Brier
worse than the market before the programme calls it an edge. `shockStatus` always tested the correct
orientation, so no code was wrong and no threshold moved; the definition was. Caught by probing `shockStatus`
directly rather than trusting the prose. It is free to fix because no shock-conditioned observation exists and
no holdout is open (§11.6) — after a holdout opened, the identical correction would have **spent** it.* Scoring is one observation per window at
`refSnap`, series split, exactly as §4 requires. The unconditional shock number is not the primary statistic and
never appears without the control-adjusted one beside it.

A shock arm reads READY only when all of the following hold on the **holdout** set alone (§11.6):

- **n ≥ 30 graded holdout shock windows**, on top of 30 calibration windows — **60 total, minimum.** §11.2a can
  raise the holdout requirement and can never lower it.
- **Control coverage ≥ 80%**, measured **on the holdout alone** like everything else in this list, over a
  denominator of **graded** shock windows whose side of the split is determinable — and evaluated **only once
  that denominator reaches 30**. Three clarifications, all registered 2026-09-06 after the scorer was built and
  its first draft was found to close the programme on a single window:
  *Graded*, because §11.2 lists "n ≥ 30 graded holdout shock windows" and coverage as **separate** conditions —
  a void, still-open or unscoreable window has as many controls as any other, it simply is not graded, and
  counting it as a matching failure fires clause 3 on something that is not one.
  *Determinable side*, because a window that cannot be placed relative to the boundary is not a calibration
  window; it is a window whose side is unknown, and it belongs in neither denominator.
  *Minimum 30*, because a ratio over a denominator of one is not evidence of anything and clause 3 is a
  **permanent closure**. Without it, the first unmatched window of a fresh holdout reads 0/1 = 0% and closes the
  programme — measured, on the fixture that produced this registration. This is not a loosening under §11.7
  clause 6: the bar is unchanged at 80%, and what is corrected is a test that returned the wrong answer at small
  n. The pooled figure it replaced passed that same input at 0.968, so the false closure was introduced by
  tightening coverage to the holdout, not inherited from the original standard.
  At least 80% of that denominator must have ≥ 5 valid matched controls. A shock
  window with fewer than 5 controls is recorded but not scored.
- **Δ Brier (difference-in-differences) ≥ 0.010** — the effect floor.
- **A two-sided percentile-bootstrap CI at the level `1 − 0.10/k` excluding zero**, where *k* is the number of arms
  scored in the phase (§11.4). **The resampling unit is the matching cell, not the window** — registered
  2026-09-06 and frozen with the rest of the primary statistic. §11.3's four matching dimensions mean every
  shock window in a cell draws the *same* control set, so a window-level bootstrap assumes an independence the
  matching design destroys by construction and assigns the shared control mean zero variance. Measured on the
  fixture that produced this registration, the window-level interval had **width exactly zero with its lower
  bound above zero** — satisfying half the READY test with certainty about a quantity the data does not
  establish — while the standard error of the shared control mean alone was 2.5× the point estimate. The cluster
  interval resamples cells, and within a drawn cell re-estimates that cell's control mean from its own controls,
  so the two travel together. It is never narrower than the window-level interval, and the excess matches an
  analytic `Var_cluster = Var_naive + Var(control resample mean)/nCells`.
- **Paper P&L > 0 over ≥ 30 holdout entries**, fees charged as §4 charges them, per-contract rounding as §7.5
  requires.

**Where 0.010 comes from.** §3 records the market's Brier at 0.1457 against the best lognormal's 0.1473 over 2,000
settled windows — the model is 0.0016 *worse* — and free per-horizon refitting bought at most 0.0007. A shock edge
that is real must be an order of magnitude clear of the noise that has already been ruled out: 0.010 is 6× the
model-vs-market gap and 14× the free-refit gain. It is deliberately above anything this instrument has ever
measured. If the true effect is smaller than 0.010, this programme cannot resolve it at any sample size it will
ever reach, and saying so now is cheaper than discovering it in year two.

#### 11.2a The one number allowed to move, and only upward

At 30 holdout windows a CI at level `1 − 0.10/k` is roughly `z` standard errors wide, with `z = invNorm(1 − 0.05/k)`:
1.645 at k=1, 2.576 at k=10, **2.807 at k=20**. The standard error is `sd/√n`, where `sd` is the standard deviation
of the *paired per-window* Brier difference — a quantity nobody has measured, because no shock window has been
recorded. The holdout size that lets a point estimate exactly equal to the 0.010 floor clear the CI is
`n = (z·sd/0.010)²`. At k=20:

| sd of paired Δ Brier | n at 50% power | n at 80% power | 80%-power calendar time @150/yr |
|---|---|---|---|
| 0.02 | 32 | 54 | 4.3 months |
| 0.03 | 71 | 120 | 9.6 months |
| 0.05 | 197 | 333 | 26.6 months |

**Both power figures are required output, not optional colour** (registered 2026-09-06): a report that carries
the 50%-power required n without the 80% figure beside it is exactly the "barely-powered design mistaken for a
good one" this subsection was written to prevent, and the at-open feasibility test against §11.7's deadline
cannot be applied without it.

**Procedure, fixed now.** `sd` is measured on the 30 calibration windows. The required holdout n is computed from
it at 50% power and reported alongside the 80%-power figure, so a barely-powered design is never mistaken for a
good one. If the required n exceeds 30, **the holdout requirement is raised to it, written into this file with its
date, and only then is the holdout opened.** It may only ever move up. If the required n cannot be reached inside
the §11.7 deadline, the programme closes at that moment rather than opening a holdout that arithmetically cannot
finish.

The percentile bootstrap has its own floor: it cannot resolve a tail finer than `1/B`. Every CI in this programme
uses **B ≥ 20/(1 − level)** resamples, so each tail carries at least 10 — 200 at k=1, 2,000 at k=10, **4,000 at
k=20**. `bootstrapCI` stays unseeded (§10.5); resampling variation is a property of the method, not a bug.

**READY on a shock arm is necessary, never sufficient, and no capital moves on it.** There is no execution path in
this tool and this programme does not add one.

### 11.3 Time-matched controls are mandatory

Scheduled US releases are not scattered across the clock. The 08:30 ET block — CPI, PPI, payrolls, retail sales,
weekly claims — lands at **12:30 UTC under EDT and 13:30 UTC under EST**, and the FOMC statement at 14:00 ET lands
at 18:00 or 19:00 UTC. Shock windows therefore cluster on the rising edge of this instrument's own seasonal curve.
`SEAS` runs **1.007 at 12 UTC, 1.298 at 13, 1.934 at 14**, against a trough of 0.804 at 07 — a **2.41× daily swing
in the table, 1.55× in σ** because `calSigma` takes the square root of the ratio.

**`SEAS` does not remove this, and assuming it does is the trap.** `calSigma` applies `sqrt(SEAS[endHour]/SEAS[nowHour])`,
which for a 12:30–12:45 window is exactly 1 (§10.2) — the seasonal factor only acts when a window crosses an hour
boundary. The seasonal level reaches the model only through `rv60`, a 60-minute trailing realized estimate that
lags a step change by up to an hour: precisely the hour a release lands in. **The control set, not the model, is
what removes the ramp.**

US DST moves the same release across that ramp twice a year. An 08:30 ET print sits in a window ending in hour 12
(`SEAS` 1.007) from March to November and hour 13 (1.298) from November to March — **1.29× in the table, 1.14× in
σ, for an identical event.** A shock ledger pooled across a DST boundary is comparing two different volatility
regimes and calling the difference an edge.

**The calendar is partial, and a control is never certified clean.** `controlEligible(t)` returns `known`
beside its verdict — the per-series spans actually in the table and `CAL_PARTIAL_CAVEAT` — because a control
window may contain a release nothing recorded. That biases this difference-in-differences **toward zero**: it
makes an effect harder to find, never easier, so it cannot manufacture one. **Record `known` with every scored
window**, or the caveat is lost at the moment the number is read. The earlier design refused to score any window
not inside a human-signed coverage declaration; it was deleted after three review rounds found the signature
could outlive what it signed, and because refusing every window is not a safer measurement than a measured one
with its limitation attached.

**Every shock claim is stated against controls matched on all four of:**

1. **The same UTC 15-minute slot** the shock window actually occupied — the slot, never the ET release time. Match
   on ET and the control set slides under the treatment at each DST transition.
2. **The same weekday.** Claims are Thursday, payrolls are Friday, FOMC is Wednesday; weekday and slot are
   confounded in the release calendar and must be held together.
3. **No scheduled release** in the control window or in the two windows either side, so a control is not a shock
   window's shoulder.
4. **The same calendar quarter**, so the control carries the same volatility regime as the shock.

Minimum **5 controls per shock window**. Below 5, the window is recorded, marked `unmatched`, and excluded from
scoring — it is not scored against a thinner control set and it is not scored against the unconditional baseline.
**No shock number is ever reported against the unconditional baseline, in the UI, in a CSV, or in this file.**

### 11.4 Multiplicity

The spine proposes five new entry rules crossed with the two existing exits, taking the simulation from 10 arms to
20. A 90% CI excludes zero for 10% of null arms — **two of twenty by chance alone**. `VERDICT_RULE` additionally
requires the point estimate to be positive, which halves that to **one of twenty in the direction anyone would act
on**. One false positive per twenty arms per phase is still too many when a phase costs a year and the retraction
costs another.

**The rule.** The required two-sided CI level for any arm in a scored family is

> **`1 − 0.10/k`, where `k` is the number of arms scored in the phase, counted whether or not they are labelled primary.**

At k=1 this is 0.90 — `VERDICT_RULE`'s existing level is the one-hypothesis case of this rule, and it is untouched.
At k=10 it is 0.990; at **k=20 it is 0.995**. Adding an arm raises the bar for every arm in the family. That is the
intended cost of adding arms, and it is the reason the 20-arm expansion is not free.

**Labelling.** Exactly one arm per phase is `primary`. Every other arm is `exploratory`, and that word appears:

- in the UI, on the arm's own row, not in a legend or a footnote;
- as an `exploratory` column in every CSV export that carries the arm, alongside the existing `excluded` column
  (§10.4b).

**An exploratory arm never sets READY, never highlights a window on the sweep, never enters a headline
probability, and never appears in a summary number.** It may be *promoted* to primary in a later phase, and only on
observations recorded after the promotion is written down. Data collected while an arm was exploratory does not
count toward its primary bar. Promotion does not reduce k.

### 11.5 Phase 1 and Phase 2 are never pooled

**Phase 1 — calendar-detected.** The window is known from a published schedule before it opens. Treatment
assignment is exogenous, detection is exact up to the accuracy of the transcribed calendar, and the false-positive
rate is zero by construction.

**Phase 2 — endogenously detected.** The tool infers a shock from its own tape: a volume burst, a dispersion
spike, a book dislocation. This is a **proxy with an uncharacterised false-positive rate**, and worse, the detector
is a function of price. Selecting a window because the price moved and then scoring whether the price moved is the
retroactive side-picking of §7.4 wearing a different hat — the same mistake that turned a +9.4¢ swing MFE into
+0.16¢.

**Rules:**

- Separate ledgers, separate `localStorage` keys, separate CSV exports, separate n, separate READY. **There is no
  pooled Brier, no pooled P&L, and no combined verdict, ever.**
- A Phase-2 arm may not be promoted on Phase-1 evidence, and a Phase-1 result may not be extended to Phase-2
  windows.
- **Phase 2 does not report at all until its detector has been scored against the Phase-1 calendar** over the same
  period, publishing precision and recall as a confusion matrix. Phase 1's calendar is the ground truth Phase 2 is
  measured against; that is the second reason Phase 1 comes first.
- Phase 2's own bar is Phase 1's bar in full, plus the confusion matrix, plus its own holdout. Being second buys it
  nothing.

**Which hypotheses this gates, written down before a single row exists.** H3 splits maker economics between a
*scheduled numeric* release and a *narrative headline*; H4 fades the side a narrative headline sent the flow
into. A narrative headline has no calendar entry — that is what makes it narrative — so **both are Phase-2
comparisons and neither may report until the detector carries its confusion matrix.** `shockStatus` already
returns `INVALID` without one; that is the rule in force, not a reminder.

**Recording is not reporting, and the distinction is the whole reason the rows exist now.** A maker fill that was
never written down cannot be recovered once the tick has passed, so H3's per-fill rows and H4's flow-asymmetry
rows are collected from the moment the instrument runs. **Stored rows are not permission to report**, and nobody
reading a CSV full of them should infer otherwise. The gate is on the statistic, never on the collection.

*H1 is not gated this way.* Its trigger is a calendar timestamp, so it is Phase 1 outright — and its arm, if it
ever earns one, is conditioned on shock **size**, which is measured from the tape rather than assigned by a
detector. It still owes §11.3 its time-matched controls like everything else.

### 11.6 Holdout discipline

§7.4 records two episodes where an edge evaporated once the hindsight was removed. Calibrating a threshold on
recorded data and then testing it on that same data reproduces both.

**The split is chronological and defined by count, fixed now:**

- **Calibration set: the first 30 graded shock windows**, in time order, per phase.
- **Holdout: every shock window after those 30**, until the required n (§11.2a) is reached.
- **Random splitting is forbidden.** Shock windows repeat monthly by release type; a random split puts June CPI in
  train and July CPI in test and leaks the regime across the boundary. Chronological only.
- The boundary is a count, not a date, and cannot be moved once the 30th calibration window is graded.

**A calibration window draws only controls that closed at or before the boundary** — registered 2026-09-06,
and part of the control-matching rule this subsection freezes. A matching cell is (series, slot, weekday,
quarter), a combination that recurs **weekly**, so without this restriction every calibration cell gains a
control every week by construction and the calibration set is never finished. That makes the frozen `sd`
non-stationary: it is recomputed from a different set on every run, and §11.2a's required holdout n moves with
it — observed moving **80 → 44** from pruning one old control row, in the direction §11.2a says it may never
take. A boundary that fixes which *shock* windows are calibration, while leaving their *controls* open to
accrual, freezes a count and not a quantity. It also closes the weaker form of the same problem: a calibration
pair could otherwise be matched against a control window that postdates the holdout shocks it is being
compared with, which is the chronological leakage §11.6 exists to prevent, arriving through the control set
rather than through the split.

**Freezing.** Every threshold, coefficient, detector parameter, control-matching rule and arm designation that the
calibration set touched is frozen, tagged `fit-YYYY-MM-DD-x` in the code and recorded in this file with a build
stamp, **before a single holdout window is scored.** READY is decided on the holdout alone. The calibration
half is never re-scored into the result and never quoted as evidence.

**Spending the holdout.** If any frozen quantity is changed after the holdout has been opened, **the holdout is
spent**: every window scored under the old freeze is retired, the holdout count restarts at zero, and only windows
recorded after the new freeze count. This is stated so that a mid-flight "small correction" carries its true price
rather than quietly resetting the evidence to a favourable state. A correction may still be right — it just costs
the holdout.

### 11.7 What falsifies the programme

Stated now, before any data. Each of these closes the programme; none of them is an invitation to collect more.

1. **The effect is not there.** At the required holdout n, the difference-in-differences point estimate is
   **< 0.005** — half the effect floor. Closed. Not "extended", not "re-specified".
2. **The effect is the seasonal curve.** The unconditional shock number is positive and the control-adjusted one is
   not. The finding is `SEAS`, which is already in the model. Closed as a duplicate of a known effect.
3. **The design cannot be executed.** Fewer than 80% of shock windows have 5 valid matched controls, **assessed
   on the denominator §11.2 defines — graded, side-determinable, holdout, and at least 30 of them.** The
   comparison this section requires cannot be built, so no shock claim can be made. Closed or redesigned, and a
   redesign restarts the count at zero. **This clause may not fire below that minimum denominator:** a permanent
   closure computed from one window is not a finding about the design, and a clause that can end the programme
   on its first holdout window ends it before the evidence exists to judge it.
4. **Phase 2's detector is a coin flip.** Precision against the Phase-1 calendar **< 0.50**. Phase 2 closes
   permanently; Phase 1 continues alone.
5. **The programme runs out of clock.** **24 months** from the first recorded shock window without reaching the
   required holdout n. Closed for lack of power, with the counts written into this file. §11.2a can close it
   earlier, on day one of the holdout, if the measured `sd` puts the required n beyond that deadline.
6. **A threshold in this section is loosened.** Any edit that lowers the effect floor, lowers a CI level, lowers a
   minimum n, lowers the control minimum or coverage, or relabels an exploratory arm as primary using data recorded
   before the relabel — **closes the programme and marks its ledgers.** The thresholds may be raised at any time.
   They may not be lowered, and a result is never a reason to revisit them.

A closure is written into this file with its date, its counts and which clause fired, and the ledgers are kept.
Negative results are the output this instrument is for (§9); a closed shock programme with its numbers on the
record is a finding, not a failure.

### 11.8 The identifiability bound — registered 2026-09-06, re-registered the same day

A variance premium is `implied σ − realized σ`. The instrument can only report one where implied σ **exists as a
measurement** rather than as an artefact of quote granularity. This subsection registers the bound that decides
that, and it is a threshold of §11 in the full sense: §11.7 clause 6 governs it.

**Why the bound is needed at all.** With `x = log(strike/S0)` and `u = σ√τ`, the analytic the engine already uses
is `p_over = 1 − Φ(x/u + u/2)`. At `x = 0` — where **every KXBTC15M window opens, by construction** — σ survives
only in the second-order `u/2` drift term, so the price is very nearly independent of σ and the inverse is very
nearly unbounded. Priced at its own model-fair value, a strike 2 bp from the money moves **86.4%** in implied σ
when the quote moves one cent, and at 1 bp one of the two neighbours has no root at all. Differencing a number
that unstable against realized σ resolves nothing, and reporting the difference as a premium is §7.6 arriving
through the tolerance rather than through the arithmetic.

*An earlier draft of this subsection illustrated the point with a reading of 1,805 bp implied against 9 bp
realized on an ordinary 40¢ quote, and called it quote-granularity noise. That was wrong and is corrected here:
that inversion is* well *conditioned — about 10% per cent — and it is caught by the plausibility gate below, not
by this one. It is a well-conditioned inversion of a misspecified model, which is a different failure needing a
different test.*

**The measured quantity.** Kalshi quotes in whole cents, so one cent is not an infinitesimal — it is the
resolution of the instrument, the smallest observable change in the input. The probe inverts at a quote and at
that quote ±1¢ and reports the **largest fractional change in implied σ across that real, finite tick**
(`VRP_TICK = 0.01`). A neighbour that does not invert is **not** zero sensitivity: it means one tick moves the
reading out of existence, which is evidence against identification. Such a one-sided reading never passes.

**Where the probe is taken is part of the registration, and is the whole of it.** The gate is
`sigmaIdentifiability(x, sigModel, τ)`, which takes **no quote argument** and probes at the **model-fair** quote.
It is never `impliedSigmaTick` at the observed quote. This is not a stylistic preference:

- The observed-quote statistic is, to three significant figures, **a function of the quote alone.**
  Analytically its relative sensitivity is `Δq / (φ(G)·√(G² − 2x))` with `G = Φ⁻¹(1 − q)`: **τ does not appear at
  all**, and `x` enters only as `2x` against `G²`. Measured on the shipped code at a fixed `q = 0.30`, it moves
  from 5.762% to 6.052% across a **240× range in strike distance and a 1200× range in τ**. It is a cut on the
  quote wearing an identifiability gate's clothes.
- And a cut on the quote is **a cut on the answer**. `vrp = implied σ − realized σ`, and at fixed strike and
  horizon implied σ is monotone in the quote. Measured at `x = +5 bp`, τ = 15, realized 9 bp/min, gating on the
  observed quote **keeps every reading whose premium is negative** (−8.2 bp through −1.6 bp) and **drops every
  reading whose premium is positive** (+1.4 bp, +9.0 bp). It would have handed H5 a guaranteed sign.

The same probe at the model-fair quote depends on `x`, `sigModel` and `τ` and on nothing the market did, so its
verdict cannot move with the answer: at that same strike it drops the whole quote sweep together, which is what a
filter is supposed to do. **Selection on the outcome biases; a noisy reading only adds variance.** A
badly-conditioned individual reading is therefore *kept*, with its conditioning recorded, not dropped.

**What that would have cost, measured.** One strike (+10 bp), one horizon (τ = 15), σ and realized both 9 bp/min,
every attainable integer-cent quote, plausibility applied to all rows so the only difference is the identifiability
filter:

| | n | premium range | mean |
|---|---|---|---|
| all plausible rows | 34 | −6.71 → **+18.13** bp | −1.97 |
| kept by the **superseded** gate | 31 | −6.71 → **+5.88** bp | **−3.41** |
| kept by the gate **in force** | 34 | −6.71 → +18.13 bp | −1.97 |

The superseded gate dropped three rows — at 44¢, 45¢ and 46¢, carrying **+8.50, +12.24 and +18.13 bp** — and
**every single one had a positive premium. None from the negative side.** It truncated the top of the
distribution, cut the maximum reportable premium by two thirds, and pushed the mean down by 1.44 bp on a quantity
whose whole purpose is to be tested against zero. On one strike. The gate in force drops none of them.

*This is a correction. The gate shipped in `899276d` read the observed quote, and was registered — wrongly — as a
strict tightening. On real inputs it was a loosening: a strike 1 bp from the money at τ = 15, which the previous
gate rejected at every quote, was admitted at any quote from 2¢ to 43¢. Caught by adversarial review before any
observation existed, which is the only reason it cost nothing.*

**The bound, derived not chosen.** Implied σ exists to be differenced against realized σ. Realized σ from *n*
contiguous one-minute returns carries relative sampling error `≈ 1/√(2n)`; a 15-minute window yields at most 15
returns, so realized carries **~18.3%** inherent error (n=10 → 22.4%, n=30 → 12.9%, n=60 → 9.1%). If one tick of
quote moves the implied reading by more than the error already carried by the number it will be differenced
against, quote granularity dominates the premium and the comparison resolves nothing.

> **`VRP_TICK_REL_MAX = 0.20`.** The tick-induced error in implied σ may not exceed the sampling error of the
> realized σ it is compared against.

**Re-registration, and why it is not tuning.** The superseded value was `VRP_REL_MAX = 0.5`, applied to
`relPerCent` — the **local derivative** of implied σ with respect to the quote. That was a mis-specified
instrument, not a mis-chosen number: the quote→σ map is convex near the money, so the derivative badly understates
what a real finite tick does. At 2 bp from the money the derivative read 0.451 and **passed** the old gate, while
the true one-cent move was **86.4%**. The change is a strict **tightening**, in the direction §11.7 clause 6
permits. It is free only because **no shock-conditioned observation has been recorded and no holdout is open**;
§11.6 is explicit that the identical edit made after a holdout opened would have **spent** it. `VRP_REL_MAX = 0.5`
stays in the source, gating nothing, so the superseded bound remains visible beside its replacement.

**The band it produces**, measured (not asserted) at σ = 9 bp/min, each strike quoted at its own model-fair value:

| distance | x/(σ√τ) | one-tick move in implied σ | verdict |
|---|---|---|---|
| 0 bp (at the money) | 0.000 | no root exists | rejected |
| 2 bp | 0.057 | 86.4% | rejected |
| 5 bp | 0.143 | 21.8% | rejected (passed the old bound) |
| 8 bp | 0.230 | 12.7% | **accepted** |
| 10–35 bp | 0.29–1.00 | 4.2–10.1% | **accepted** |
| 60 bp | 1.721 | 6.7% | **accepted** |
| 98 bp+ | 2.81+ | fair value past the clip bound | rejected |

This band is a property of **the gate** — the fair-quote probe — and of nothing else. The observed-quote
statistic has no band in `x/(σ√τ)` at all: free the quote and the coordinate disappears, which is exactly why it
cannot be the gate. The band is fixed in **standardised units, not basis points** — roughly
`0.23 ≤ |x/(σ√τ)| ≤ 1.8`. In basis points
it therefore **contracts toward the strike as τ decays**: 8–60 bp at 15 minutes, 5–35 bp at 8, 3–20 bp at 3. Two
consequences follow and both are load-bearing. A KXBTC15M window is **born unidentified**: at the opening instant
`x = 0` exactly, and no reading exists at its own strike. It becomes measurable only in the ring price has moved
into. The hourly KXBTCD ladder's off-the-money rungs, by contrast, are identified from the first poll.

**But the 15-minute series is not thereby disqualified, and an early draft of this subsection wrongly concluded it
was.** Price diffuses off the strike within a minute or two, and the standardised distance `x/(σ√τ)` it needs to
clear is not a fixed target — `√τ` is shrinking at the same time. Simulated over 400 at-the-money 15-minute
windows at σ = 9 bp/min with reads every 30 s and the book quoting near fair, **71.5% of reads yield a usable
implied σ**, and the yield traces a clean arch across the window:

| minutes left | 15 | 13 | 11 | 9 | 7 | 6 | 5 | 3 | 2 | 1 |
|---|---|---|---|---|---|---|---|---|---|---|
| usable | 50% | 73% | 83% | 83% | 85% | **79%** | 78% | 63% | 51% | 36% |

Low at the open because price has not left the strike; peaking near 85% in the middle third; falling away at the
gate because `σ√τ → 0` faster than price diffuses, so the reading runs *past* the far edge of the band rather than
failing to reach it. **`refSnap` — the one-observation-per-window scoring point (§4, §10.2) — sits at τ ≈ 6, which
is inside the high-yield zone at 79%.** That alignment is luck, not design, and it should be checked again if
`refSnap` is ever moved.

Rejections split 14.6% one-sided, 13.1% tick-move-over-bound, 0.8% no root, and **0.0% implausible ratio**. Two
caveats on that last figure, both load-bearing: the simulation drives price with the *same* σ the model uses, so
implied ≈ model by construction and the plausibility band is barely exercised; and it quotes the book near
model-fair with 1¢ of noise, where a real book carries a spread and can dislocate. **The live implausible rate is
unmeasured and this figure is an optimistic bound on it** — it says the band does not reject ordinary readings,
not that it will rarely fire.

**What is stored, and what an analyst may re-derive.** A rejected reading is omitted and the omission is
**counted** (`vrpX`), never clamped and never silently dropped. Every row carries its own measurements, not a
verdict:

| column | what it is | may it be filtered on? |
|---|---|---|
| `si_prior_rel` | the **gate's** probe — one-cent move at the model-fair quote | **yes** — exogenous to the answer |
| `si_prior_sided` | whether that probe was two-sided (one-sided never passes) | **yes** |
| `si_tick_rel` | the **observed-quote** move: how well conditioned *this* inversion was | **no — see below** |
| `si_tick_sided` | sidedness of that observed-quote probe | no |
| `si_bound` | the bound in force **when the row was written**, stored on the row | — |
| `si_gate` | `prior`, or `prior+tick` when the row also carries the diagnostic | — |
| `si_code` | why the reading was dropped | — |

**`si_tick_rel` is a diagnostic and must not be used as a filter.** Filtering on it re-introduces exactly the
selection this subsection exists to prevent: it is monotone in the quote, and the quote determines the premium.
It is on the row so that the conditioning of each reading is *visible* — for weighting, for stratified reporting,
for knowing how noisy the sample is — not so that readings can be removed by it. The re-filtering handle is
`si_prior_rel`.

**Rows are not retroactively re-gated.** `si_bound` is written onto the row at the moment it is judged, and the
export honours the row's own bound rather than whatever constant is current, so a row judged under one
registration keeps that judgment forever. *This too is a correction: until this change `si_bound` reported the
export-time constant and `si_ident` was silently recomputed under it, so the promise in this paragraph was false
for exactly as long as it had been written down.*

**The second gate, and what it censors.** Identifiability is necessary and not sufficient. A strike just *below*
spot, quoted away from fair value, inverts **exactly** — two-sided, well inside the tick bound — to a σ orders of
magnitude off the tape. Measured, at σ = 9 bp/min, τ = 15, with the quote where a real book would put it:

| strike | quote | fair value | implied σ | tick move | tick gate | implied/model |
|---|---|---|---|---|---|---|
| −10 bp | 40¢ | 61¢ | 1,318 bp/min | 0.101 | **passes** | 146× |
| −35 bp | 25¢ | 84¢ | 3,496 bp/min | 0.047 | **passes** | 388× |
| −60 bp | 15¢ | 96¢ | 5,367 bp/min | 0.042 | **passes** | 596× |
| −10 bp | 60¢ | 61¢ | 10.1 bp/min | 0.111 | passes | 1.12× |

That is model misspecification wearing an implied volatility's clothes, and **the tick gate cannot see it** — the
reading is perfectly well determined, it is just not describing volatility. A second, independent test is
therefore required, and it is the one that looks at the answer:

> **`SCHEMA_SIR_MIN = 0.25`, `SCHEMA_SIR_MAX = 4`** on `implied σ / model σ`. Within this tool's own model family
> two σ describing the same tape can differ by at most the seasonal ratio × the term factor —
> `√(1.934/0.804) × 1.089 = 1.69`. Past that it is not disagreement about volatility inside the model, it is the
> model failing. 4 is ≈2.4× that widest in-family disagreement, deliberately loose so ordinary regime
> disagreement is never excluded. It is a judgment number and is named as one.

**This gate censors the measurement, and that has to be said out loud.** H5 exists to measure a variance risk
premium. A filter that discards every reading above 4× the model σ **truncates the distribution being measured**:
a genuine premium larger than 4× would be thrown away as implausible, and the reported premium is therefore not
`E[implied − realized]` but `E[implied − realized | 0.25 ≤ implied/model ≤ 4]`. Any H5 result must be stated with
that conditioning attached. The mitigation is that nothing is destroyed: a rejected row keeps `si`, `sm`, `xs` and
`tau`, only the composite `vrp` is withheld, and the withholding is counted in `vrpX` — so the excluded set is
itself measurable and `vrp` is recomputable under any other rule from the exported columns alone.

**No premium is displayed anywhere in the UI, deliberately.** H5 computes `vrp`, stores it and exports it; it
renders nothing. Under §7.6 a displayed number reads as a signal, and this one has not earned that yet. The
premium is read by exporting and grouping on `vrp_omit` — **always tabulate the omission reasons before reading
the premium.** If the band is rejecting a large share of readings, the band is the finding, not the premium.

Both bounds are §11 thresholds in the full sense. `VRP_TICK_REL_MAX` and `SCHEMA_SIR_MIN`/`SCHEMA_SIR_MAX` may be
tightened at any time; **loosening either to admit more readings is tuning a filter against its own results and
fires §11.7 clause 6.** Any change is a recorded re-registration, not an edit.
