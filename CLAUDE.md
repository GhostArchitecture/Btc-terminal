# BTC Terminal — handoff

A single-file browser instrument for Kalshi's 15-minute and hourly BTC markets: a peer-verified price tape, a
calibrated probability engine, and self-grading ledgers under pre-registered decision rules. **No execution path
exists anywhere in this tool and none should be added.** Everything it does is measurement.

Current deploy: `build-20260906004231`. One file, 2,726 lines, ~186 KB, 142 top-level functions, zero dependencies,
zero build step. **§10 (audit addendum, 2026-09-06) corrects and extends the sections below; where they disagree,
§10 wins.**

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
  prints REPRODUCED until fixed.

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
- **Tests:** `npm install` once (jsdom is the only dev dependency), then `npm test` before every push.
  `npm run test:defects` lists which §10.3 items still reproduce.
- The relays (`relay/deno.ts`, `worker/kalshi-relay.js`) are still paste-deployed; nothing in the repo deploys them.
- The calibration spine and the fit scripts behind `SEAS`, `TERM`, the residual coefficients and `SWING_BASE` are
  not in the repo. Until they are, treat those constants as frozen data (§3) and do not refit.

### 10.2 Corrections to §1–§9

- **Header:** 2,726 lines and 142 top-level functions (not 136). No duplicate definitions in the deployed build.
- **§1 tree:** `icon.png` exists and was unlisted. `README.md` is a one-line title.
- **§2 tape:** the tolerance is as described, but the check is against each fresh peer individually, and a print
  with **zero** fresh CF peers is accepted unverified (§10.3 N1). The comment at line 780 still says "25bp".
- **§2 index:** with fewer than two fresh constituents `indexProxy` returns the tape leader's price (any of the six
  books) flagged `fallback:true`; `idxTick` drops the flag, so `S.idxPx` silently becomes a single-book price. The
  only visible trace is the "(1 books …)" count in the arm bar. A single fresh constituent is ignored in favour of
  the tape.
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
- **§4 ungardenable:** two silent-loss paths exist (§10.3 L1, R5).
- **§5:** confirmed by `test/sweep.js` — colour keys to the call in all four cells, the no-call line keys to tick
  direction, `S.lastMap` inverts the forward mapping exactly, locks behave as described, settled pips draw.
- **§6:** the harnesses were never in the repo; they are now under `test/`.
- **§8 theme-color:** resolved; see §8.

### 10.3 Confirmed defects (each reproduced by `test/defects.js`)

Ordered by what reaches the user. Line numbers are for `build-20260906004231`.

| id | where | what | fix |
|---|---|---|---|
| **K1** | `kalshiTick` 1108 | `K.cur` is replaced on a new market but `K.ob` is never cleared, and nothing checks the book's ticker. For ≥7 s after every roll (up to 120 s under a book backoff) the old window's 98/99 book is the new window's quote: wrong residual headline, wrong `quoteIn` at the exact moment "ARM to commit" prompts, first `btc.edge` snapshot of the new window carries the old book, **phantom swing reads at 1–5¢ that enter sim positions and close at 35¢ "target" for +$300–500 per arm**, and −48¢ phantom fills in the live viability series. | null `K.ob`/`K.obAt` when `pm.ticker !== K.cur.ticker`, or stamp the parsed book with its ticker and require a match in `kQuoteFor`, `kSyncQuote`, `edgeSnap`, `swingSides`, `swingTick`, `viaSample`. |
| **K2** | `kQuoteFor` 1009 | Kalshi's empty-side values (`yes_bid 0.0000`, `yes_ask 1.0000`) parse to 0/100 and pass the guard, giving `{q:0.5, spread:1.0}`; the residual's −5.023·spread term drives the headline to 0.7% whatever the strike. Realistic at window open and near expiry. `edgeSnapOne` already guards `ya>=100`. | reject `yb<=0 || ya>=100` in `kQuoteFor`. |
| **E1** | `autoBand` 1841 | called every 1 Hz tick from `xtResolve`; when coverage is outside [0.87, 0.93] it multiplies z by 1.04/0.98 per *tick*, not per new resolution, so `auto · band z` rails to 3.00 or 1.00 within ~20 s. | adjust only when a resolution was added. |
| **L1** | `ledgerSave` 1251 | bare `try/catch` around three `setItem`s with `btc.edge` first. Once the edge ledger exceeds the origin quota (estimated 4–9 days of hourly-window snapshots) **rounds and intervals stop persisting too**, silently; a reload drops everything since the last good save. | prune snapshots harder, write rounds/intervals before edge, surface the failure in the UI. |
| **L2** | `edgeProvisional` 1303 | `provTried` is set before `tapeSettleAvg` is tried; on a reload the 1 Hz loop runs before `seed()` lands, so every window that closed while the app was down is marked tried with empty tape/bars and never provisionally graded. | do not set `provTried` when `tapeSettleAvg` returns null (or wait for the seed). |
| **R1** | `settleRound` 1984 | the 60 s settlement average and the exchange vote are anchored at the tick time, not `R.tEnd`; a throttled tab (hidden desktop window, sleep) settles a call on post-gate prices. | pass `R.tEnd`; freeze the vote at the gate. |
| **R2** | `showVerdict` 2044 | the WINDOW SETTLED banner is malachite when the window went UP and ruby when DOWN — price direction, not whether the call hit. A winning BELOW call renders ruby. §5's rule applied to the one banner that announces the result. | key the class to hits vs misses. |
| **R3** | listeners 2680 / 2687 | the ABOVE/BELOW click handler that syncs `quoteIn` runs before the one that sets `S.callSel`, so the quote box shows the *other* side's ask until the next tick; arming in that gap stores the wrong `quoteAtArm`/`edgeAtArm`. | set `S.callSel` first (merge the two listeners). |
| **R4** | `armRound` 1960 | `strikeProbs` is called without the quote, so `probAtArm`/`pCallAtArm`/`edgeAtArm` are the lognormal-vs-market edge (`fallback-3`) that §3 says loses head-on and §7.6 says not to surface; the tick-time headline uses the residual, so the same call shows two edges. | pass `quote: kQuoteFor(v, R.tEnd)`. |
| **R5** | `S.round` | the live round is never persisted; a reload or iOS tab kill between ARM and the gate erases the call without a WITHDRAWN row. `armRound` also discards a stale live round from a previous window without logging it. | persist the live round; settle or WITHDRAW before replacing. |
| **R6** | `renderArmBar` 2122 | the "net edge / EV" line pairs the armed call's probability with whatever side the quote box currently shows (the selected button, not the armed call). | use the ask matching `act[0].call`. |
| **S1** | `simUpdate` 1618 | trail arms enter at the ask and stop when the *bid* ≤ 50% of it; cheap sides quote 2/5 or 3/7, so the stop fires on the first poll with no move. Trail arms measure spread, not path. | reference the stop to the bid at entry, or widen it. |
| **S2** | `swingSave` 1528 | prunes by string-sorted key; Kalshi tickers embed `YYMMMDD`, and `OCT` < `SEP` as strings, so at a month boundary the newest entries (open sim positions included) are deleted on the save that created them. | prune by `close` timestamp. |
| **S3** | `simEnter` 1597 | `stake = max(1, bank·5%)`: below $20 the arm no longer risks 5%, and a busted arm keeps buying until the bankroll is negative. | stop the arm at bank ≤ 0 and show it busted. |
| **N1** | `acceptPrint` 790 | `if(peers>0 && !ok)`: with all four constituents stale, any exchange print (Binance.US, Bitfinex) is accepted unverified, becomes the leader, and via the index fallback becomes `S.idxPx`, while the spot label still says "peer-verified". | require ≥1 fresh peer, or mark the tape unverified. |
| **N2** | `connectWS` 700, `stopWS` 709 | the reconnect attempt counter never resets after a healthy session, so routine 15 s-silence watchdog closes ratchet every venue to the 30 s cap; `stopWS` does not cancel pending reconnect timers, so pause/resume during a backoff opens a duplicate socket that double-counts `S.flow`. | reset the attempt on the first print; track and clear the timers. |
| **N3** | `kGet` 1062, 1088 | one `AbortController` for both attempts: after a 9 s timeout the failover fetch aborts instantly and the trail blames the secondary. Non-429 HTTP errors (502 from a relay) never fail over and never count toward the circuit breaker; they set a class backoff instead. | fresh controller per attempt; treat 5xx like a network failure for routing. |
| **N4** | `kalshiTick` 1137 | the settled-history merge keeps existing result-less entries first and dedupes by first occurrence, so an `unopened` stub shadows the settled result for the same ticker for 10–25 min: late reconcile/grade, "unopened" shown for a closed window, no Y/N pip. | prefer the entry with a result. |

Also confirmed, lower severity: any truthy `result` is graded, so a `void` market grades as NO and overrides a
provisional round (grade only `yes`/`no`); `rv60`/EWMA treat stored closes across a sleep gap as consecutive
minutes (σ inflated for the next hour); `hourStart` uses local time; `edgeSnapOne` pairs a fresh model probability
with a quote of unknown age during a backoff (no `obAt` check); the REST cross-check overwrites a live socket price
with a value up to 25 bp stale and can demote a healthy leader as an outlier; `bootstrapCI` is unseeded, so the
verdict's CI (and READY at the boundary) can differ between renders; the 1 Hz loop gates duties on
`Math.floor(Date.now()/1000) % N === 0`, which skips a duty whenever the interval drifts across a second;
`seed()` has no fetch timeout, so a hanging Kraken connection delays polling and sockets indefinitely.

### 10.4 What the harnesses could not verify

Live-only: Kalshi's `result` enum beyond `yes`/`no`, whether the KXBTC15M expiration value is a one-minute
average (the code assumes so), the 94.7% proxy agreement, the relay throttle behaviour, and every §9 economic
figure (those are ledger outputs, not code).
