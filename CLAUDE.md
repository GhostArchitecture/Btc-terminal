# BTC Terminal — handoff

A single-file browser instrument for Kalshi's 15-minute and hourly BTC markets: a peer-verified price tape, a
calibrated probability engine, and self-grading ledgers under pre-registered decision rules. **No execution path
exists anywhere in this tool and none should be added.** Everything it does is measurement.

Current deploy: `build-20260906004231`. This working copy is ahead of that deploy — §10 lists 22 fixes and a one-time
ledger repair applied since, not yet built and pushed. One file, 2,845 lines, ~194 KB, 150 top-level functions, zero
dependencies, zero build step. **§10 (audit addendum, 2026-09-06) corrects and extends the sections below; where
they disagree, §10 wins.**

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
├─ test/                         harnesses (§6, §10.1)
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
- `test/defects.js` (`npm run test:defects`, informational) — one reproduction per confirmed defect in §10.3; each
  prints REPRODUCED until fixed. All 16 currently print FIXED — it is the regression guard for this audit's fixes,
  not a to-do list, until the next round of findings lands here.

Always run the whole suite before a push; a change in one module has repeatedly broken another.

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
  `btc.via` are not exported.
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
expiration value is a one-minute average (the code assumes so), the 94.7% proxy agreement, the relay throttle
behaviour, iOS safe-area rendering, and every §9 economic figure (those are ledger outputs, not code).
