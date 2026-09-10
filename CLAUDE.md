# BTC Terminal — handoff

A single-file browser instrument for Kalshi's 15-minute and hourly BTC markets: a peer-verified price tape, a
calibrated probability engine, and self-grading ledgers under pre-registered decision rules. **No execution path
exists anywhere in this tool and none should be added.** Everything it does is measurement.

Current build: `build-20260910222806` (not yet deployed — 2.39 is on the branch) — §10's 22 fixes, the K1 ledger repair, the full **H-protocol
measurement layer** (§11) with the shock programme **closed** (§11's banner), the `reversal` citation
correction, and OCCVM through **2.39** (§12): the pigment palettes, the metaball globule field and its
whole build order, one confidence vocabulary across the panels, the React island (§13), the ambient
floor on the page ground, the field drawn once with the tiles frosted over it, the safe area read as
a token, and **L2's vessel worn** — the field bounded by the content column instead of running to the
screen edge, and the Fresnel rim on the column's walls. *Verified by stamp, every reading a bracket
because the preceding miss is recorded: Cloudflare missed at 21:34:54 and hit at **21:35:05**; Rhyme
missed at 21:35:06 and hit `build-20260910210243` at **21:35:17**; GitHub Pages for BTC took four
misses and hit at **21:35:37**, the slowest of the three by half a minute. Rhyme's service worker on
the wire names `tome-build-20260910210243`, the same stamp, and its artifact really changed, so that
poll answers the question it was asked. Corroborated as this release rather than a cached stamp,
which is corroboration and not the verification (§7.3): both BTC hosts serve the spliced `glass.js`
fence, `RIM_GAIN = 0.25` and `max-width:var(--column)`; Rhyme serves the column token.* Earlier
lines: `build-20260910192734` / 2.37 (19:34 UTC), `build-20260910174353` / 2.36 (17:46 UTC), `build-20260910144317` / 2.35 (14:46 UTC), `build-20260910130216` / 2.34 (13:05 UTC), `build-20260910065029` / 2.29 (06:56 UTC), `build-20260909232758` / 2.26, `build-20260909230353` / 2.24 (23:13
UTC), `build-20260909203905` / 2.23 (22:29 UTC), and `build-20260909114959` / 2.12 for the eleven releases
the deployment hold covered.* One file, **10,078 lines, 888 KB, 303 top-level functions of its own**, one pinned dependency
(React 18.3.1, spliced — §13), zero build step. *These figures were 6,331 / ~428 KB / 286 for three
releases after they stopped being true; counted, not quoted, at 2.14. The sentence that used to end
here said they were "re-counted at every release since", and they were not: they read 8,181 / 640 KB /
299 against a measured 8,530 / 664 KB / 301 for the three releases from 2.27 to 2.30 — the 2.14 defect
inside the sentence promising it would not recur. Counted again at every release since, this one
included, and the count excludes the spliced dependency. *At 2.39 the function figure read **302** against a measured **303**, counted by the header's own stated method — 312 line-start declarations less the nine inside React's vendor fences, enumerated from the fences rather than from the list of names. A drift of one is the 2.14 class at its smallest, and it is corrected here rather than quietly overwritten, because the sentence above promises this is counted every release.* The island is **156,947 bytes** as spliced,
of which the vendor payload is **142,586** and the three components 13,499 — the rest is fence
comments. *Two measurement corrections live in that sentence, and neither is a change to the file.
It read 156,881 one release ago because that count was taken over CHARACTERS and this one is taken
over bytes; the island's comments carry 66 multi-byte characters and nothing in `react/` has moved.
Before that it read 142,929 and 152,580 under a boundary that counted the fences into the vendor
half. React is byte-identical and pinned across all three readings, and what moved each time was the
instrument.* Its minified UMD puts nine names at
line-start (`D Df Id M Td mb oe oj y`) that are inside its own IIFE and are not this tool's
namespace. §7.1's duplicate check is scoped the same way, in CI and in `test/react.js`.* **§10 (audit addendum) corrects and extends
§1–§9; §11 is the pre-registered standard governing the shock programme. Where they disagree, the later section wins.**

---

## 1. Repo and hosts

```
GhostArchitecture/Btc-terminal   (main)
├─ index.html                    the entire instrument
├─ vendor/                       React 18.3.1 + ReactDOM, pinned; byte-identical to Rhyme's copy (§13)
├─ react/                        the React islands — components, and the splicer that puts them in
│   ├─ Cast.js                   the one control every island renders — one a11y contract, no skin
│   ├─ Floor.js                  the ambient floor on the page ground (L13, granted at 2.34)
│   ├─ LockBar.js                the lockbar: the first island and the S.lock bridge
│   ├─ tools/resplice.js         splices vendor/ and react/ into index.html under fences, with --check
│   └─ plans/                    REACT-MAP.md and PATCH.md as supplied; PATCH.md under a SUPERSEDED
│                                banner, since three of its four changes are wrong against the file
├─ functions/api/[[path]].js     Cloudflare Pages Function: same-origin /api relay to Kalshi
├─ _routes.json                  Pages Functions routing (/api/* only)
├─ relay/deno.ts                 Deno Deploy relay (entrypoint; alternate egress pool)
├─ worker/kalshi-relay.js        Cloudflare Worker relay (paste-deploy, separate account)
├─ manifest.webmanifest          PWA manifest
├─ icon-{180,192,512}.png, icon-maskable-512.png, favicon-32.png, icon.png
├─ test/                         page harnesses (§6, §10.1)
├─ units/                        the H-protocol units — code, suites, specs and reviews (§6, §11)
│   ├─ {volspace,calendar,detect,reversal,schema,prereg,regime}/{code.js,test.js,*.md}
│   ├─ run.js                    runs every unit suite
│   └─ tools/resplice.js         splices a unit into index.html between its markers, with assertions
├─ occvm/                        the shared visual system (§12) — the law, its parts, its instruments
│   ├─ SPINE.md                  the law; committed byte-identical to Rhyme-Instrument
│   ├─ {spine.css,serif.css,sundial.js,rheology.js,globules.js,pigments.js,yield.js}   the shared parts, spliced into both tools
│   ├─ floor.js                  the ambient floor (L13) — shared, spliced into both tools since 2.34
│   ├─ glass.js                  the vessel (L2's other half) — borosilicate, spliced into the
│                                reference surface only, worn by no tool (§12's 2.32 entry)
│   ├─ veins.js                  RETIRED at 2.25 — spliced nowhere; kept as the generator the L10 record cites
│   ├─ tools/derive-pigments.js  generates pigments.js: authored roles in, derived ramps out, checks printed
│   ├─ mono.css, fonts/          the owned numeric face (L7) — ships only where mono is rendered
│   ├─ reference/index.html      the reference surface (1.8): one live specimen per law, no values of its own
│   ├─ golden/                   the recorded baseline: record.js, verify.js, three surfaces × three instants
│   └─ tools/splice-spine.js     puts each part into each target, idempotently, under a fence
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
| `btc.regime` | the structural-break registry (§11.9): declared boundaries and flagged candidates, with `trail` |
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
(3 displaced beziers, seeded PRNG) — retired at 2.25 for the globule field. **NOAA sundial** (`solarPosition`, Dayton default, opt-in geolocation) sets
`--lx --ly --elev --night` once a minute; every bevel, sheen, cabochon highlight and cast shadow reads those four
custom properties. **Since 2.35 the globule field is drawn once, on the page ground, and the tiles are
frosted glass over it** — a partial substrate plus a backdrop blur one capillary length wide, so a tile
shows the one field rather than repainting a still copy of it. The tile carrying the sweep is the
exception and keeps an opaque substrate: OCCVM-L13 withholds a drifting mass from behind anything that
means win/lose, and `law-audit.js` measures that. Canvas colours come from `PAL`, which resolves **ten of its thirteen keys from the page** on
`sunTick`'s beat — two ink weights since 2.17, the eight outcome and authority colours since 2.27, so the
canvas reads both the sun and the chosen palette at the cadence each moves on. The other three name tokens
nothing writes and stay literals. **Those hexes are the `obsidian` palette and one of five**; a palette is
a choice of which green and which red, never of which hue means what (OCCVM-L6, §12's 2.27 entry). Serif for section heads, mono
for numbers.

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
- `test/react.js` — the React island (§13): the dependency pinned by hash and asserted byte-identical
  to Rhyme's copy, the splice and its load order (react before react-dom before any component, because
  react-dom's UMD global branch reads `self.React`), the bridge driven — `window.S` really is undefined
  and the store still reads the lock, which is the pair that proves it reads `S` lexically — the
  snapshot's indifference to lock fields the UI never renders, and the three mirrors the island
  replaced measured as *gone* rather than unused. It also carries `Cast`'s contract (§13.5) and the
  guard that nothing renders a button around it. Verified to bite: restoring `window.S` fails 2 of 43
  — and only 2, because the defect's whole character is that the lock reads as permanently released;
  putting a bare `e("button")` back into an island fails 1; swapping react and react-dom fails the
  splice assertions and then kills the harness outright, since react-dom's UMD reads `self.React` as it
  evaluates.
- `test/defects.js` (`npm run test:defects`, informational) — one reproduction per confirmed defect in §10.3; each
  prints REPRODUCED until fixed. All 16 currently print FIXED — it is the regression guard for this audit's fixes,
  not a to-do list, until the next round of findings lands here.

Always run the whole suite before a push; a change in one module has repeatedly broken another. `npm test` is
currently **1,024 assertions across 8 harnesses** (invariants 80, sweep 35, page-load 34, h-protocol 89, prereg 84,
occvm 582, rheology 77, react 43) — *unchanged in total at 2.35 and not unchanged in content: eight of
`occvm`'s assertions were retired with the configuration they described and eight replaced them, so a
reader watching only the number would see nothing happen. The composition is what moved, and §12's 2.35
entry names every retirement.* The figure here read 231 across 5, then 715, then 875, long after each had
grown, which is the same class of stale claim §7.3 warns about, caught by counting rather than by quoting this
line.

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
  function deploys with the Pages build. Verify by stamp exactly as in §1 step 4. The stamp is still
  replaced by hand — assert the replacement (§7.2) — and **since OCCVM 1.6 it lives in two places**: the
  `<!-- build-YYYYMMDDHHMMSS -->` comment at the foot of the file and `BUILD_STAMP` in the script, which
  the service worker's cache name derives from. One replace-all covers both; `test/occvm.js` fails if they
  disagree, so a missed site cannot ship.
- **Before editing:** `git status` must be clean and `git diff origin/main` empty (§7.1 in git terms). Check for
  duplicate top-level definitions: `grep -oE '^(async )?function [A-Za-z_$][A-Za-z0-9_$]*\(' index.html | sort | uniq -d`
  must print nothing.
- **Tests:** `npm install` once (jsdom is the only dev dependency; `package-lock.json` is committed so the install
  is reproducible), then `npm test` before every push. `npm run test:defects` lists which §10.3 items still
  reproduce — currently none.
- **Three splicers now write into `index.html`**, and all three are the same discipline: the source is the
  file, the spliced block is an artifact, a hand-edit inside a fence is reverted silently by the next run.
  `node occvm/tools/splice-spine.js`, `node units/tools/resplice.js <unit>...`, `node react/tools/resplice.js`
  — each takes `--check`, and CI runs all three plus a re-splice-and-diff.
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
- **The rAF loop rendering the sweep at zero width in the DATA view** — closed at §13.5 and measured on
  the way: 130 stroke calls in 500 ms into a 0×0 canvas, with `frame()` resizing the backing store to 0
  on each pass. The loop now declines a frame that cannot produce a pixel and counts the refusal in
  `S.frameSkip`: 0 strokes and 14 skips over the same 500 ms, 70 strokes and 0 skips on either side of
  the round trip.
- **The 1 Hz loop's `Math.floor(Date.now()/1000) % N === 0` duty gates** (viaSample every 5 s, `renderSwing` every
  2 s, `renderJournal` every 10 s, `renderVerdict` every 30 s, `sunTick` every 60 s) can skip a beat when the
  interval drifts across a second boundary (a throttled/backgrounded tab). None of these duties are
  scoring-critical — a missed `viaSample` beat is a missed maker-economics sample, not a wrong one — so this is a
  freshness nit, not a correctness bug. Left as-is; a last-fired-timestamp rewrite of the whole loop is a
  larger, higher-blast-radius change than its payoff justifies right now.
- ~~**iOS standalone: header sits under the status bar (no `env(safe-area-inset-top)`).** CSS-only, but needs an
  actual device to verify — untestable in this environment.~~ **Closed at 2.36, and the note was wrong twice.**
  It was not only the header: with `viewport-fit=cover` and a translucent status bar and *no* inset
  anywhere, whatever scrolled to the top went under the bar, and a recording from the owner's phone
  caught the **price readout** cut in half by the Dynamic Island. And "untestable" is what kept it
  unmeasured for eleven releases: `env()` cannot be set from a harness, but a token read from it can,
  which is the whole of the fix (§12's 2.36).
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

## 11. The shock programme — CLOSED 2026-09-10. Pre-registered evidence standard (2026-09-06)

> ## CLOSED — 2026-09-10, by owner decision, before any observation
>
> **Cause: a structural mismatch between this programme's unit of observation and the tool's actual use.**
> §11 is denominated throughout in scheduled US macro releases — the ~100–150/year planning premise
> (§11.1), the phase-1/phase-2 split (§11.5), the calendar cost table, and the 24-month deadline (§11.7
> clause 5) all descend from that one assumption. **The operator does not trade scheduled releases.** The
> tool is used continuously against 15-minute windows, of which there are ~35,040 a year. Every
> feasibility number in this section is computed against an activity that is not happening.
>
> **This is not a threshold judged too demanding.** `dBrierFloor`, `k`, `maxMonths` and the required-n
> arithmetic are internally consistent and were derived from real properties of this instrument. They
> describe a different programme than the one the tool is used for. Nothing below is relaxed, and nothing
> below may be quoted as relaxed.
>
> **No result motivated this closure, and there is no result that could have.** No shock window has been
> scored; `reversal` was never spliced; H1's shock-size percentile is still `[TBD]`, uninvented; no scorer
> exists for `regime`; the operator has not examined the tool's recorded data. **§11.7 clause 6 governs
> thresholds moved *after seeing results*. No result exists to have moved them, and none of the six
> falsification clauses fired** — this closure is outside them, which is why it is recorded here in full
> rather than as a clause number. A closure that dodged a clause would look exactly like one that fired
> one, so the distinction is stated instead of left to be inferred.
>
> **Provenance, because it is the part that matters.** The programme was authored to a framing the owner
> did not set and did not review while it accumulated across sessions, and it continued on its own
> momentum. **The structural mismatch above is the cause; owner authority is the mechanism, not the
> justification.**
>
> **Sizing note, for anyone tempted to rescue it by tuning.** The arm count is the weakest lever in the
> formula — multiplicity enters under a square root. Recomputed here against the shipped
> `shockRequiredHoldN`, not quoted:
>
> | k | CI level | required holdout n (sd = 0.05, power 0.5) | at 80% |
> |---|---|---|---|
> | 20 | 0.9950 | 197 | 333 |
> | 10 | 0.9900 | 166 | 292 |
> | 5 | 0.9800 | 136 | 251 |
> | 1 | 0.9000 | 68 | 155 |
>
> Giving up **every** exploratory arm buys a **65.5%** reduction and still leaves **68** scheduled
> releases. The real driver is `sd` — squared, and unknowable before data by construction
> (`shockRequiredHoldN` returns `null` rather than defaulting). The programme's feasibility was genuinely
> undecidable in advance. That is not a flaw in this document; it is an accurate reflection of reality,
> and it is a second, independent reason the framing does not fit an operator working alone.
>
> **The ledgers are kept**, per §11.7's own instruction. `btc.shock`, `btc.regime` and every H-protocol
> column keep recording; recording was never the thing gated (§11.5). `SHOCK_RULE` stays in the code and
> `test/prereg.js` keeps checking it against this document, so a closed programme cannot silently drift
> either.
>
> **Superseded by: nothing.** **Any successor must state its own unit of observation before its first
> number.**
>
> *Everything below this line is the standard as it stood, unaltered. It is a record, not a rule in
> force.*

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

**The calibration half is frozen as a RECORD, not as a rule** — registered 2026-09-07, and it is what
"frozen" has to mean here. When the 30th calibration window is graded, the caller writes down a **manifest**:
the identity of those thirty shock windows and, for each, the identity of the control windows it drew.
Thereafter the calibration half is **read from that manifest and never re-derived.** `sd` is computed from it
and is a fact about a fixed set, which is the only way it can be frozen at all.

*This supersedes the rule registered on 2026-09-06 — "a calibration window draws only controls that closed at
or before the boundary" — which is struck. It was a correct diagnosis with a broken remedy. Restricting the
pool makes matched-ness a function of the boundary while the boundary is derived from matched-ness, and that
cycle has no fixed point on ordinary data: of 51 measured placements, 40 required two registrations, 11
required one, and some never converged, leaving the unit refusing permanently with a message saying the
holdout was spent. Freezing by rule cannot work because the rule's inputs keep arriving; freezing by record
works because a record does not change. Recorded rather than quietly replaced, and free only because no
observation exists and no holdout is open.*

**The diagnosis it came from stands, and the manifest is what answers it.** A matching cell is (series, slot,
weekday, quarter), a combination that recurs **weekly**, so a re-derived calibration cell gains a control every
week by construction and its `sd` is recomputed from a different set on every run — observed moving §11.2a's
required n **80 → 44** from pruning one old control row, in the direction §11.2a says it may never take. A
manifest also closes the chronological leak the same way: the recorded control set cannot later acquire a
window that postdates the holdout shocks it is compared against, because it cannot acquire anything. A matching cell is (series, slot, weekday,
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

### 11.9 Structural breaks — registered 2026-09-07, before any instance exists

Everything above assumes BTC trades in one continuous regime: the same kind of asset, subject to the same kind
of price dynamics, for the life of the programme. That assumption can fail — a collapse, a sovereign adoption
as reserve or backing, an exchange failure that breaks the CF constituent basket, a Kalshi contract redefinition
— and none of those are the kind of event the calendar (§11.3) or the shock detector (§11.5) is built to see:
they are not a scheduled release and not a volume burst inside one window, they are a change in what the
underlying process *is*. Pooling data from before and after such an event is not a matching failure the way an
uncontrolled release is; it is measuring two different instruments and calling the difference a signal.

**This is a real risk to the programme's external validity, not to its arithmetic**, and it is registered now,
while it costs nothing, because a threshold or rule invented after seeing the market move is exactly the
hindsight §7.4 and §11.7 clause 6 exist to prevent.

**Declaration is operator judgment, always, and always carries a reason.** No formula decides whether BTC has
broken regime — a formula can only flag that something unusual happened, never that it *means* something. A
structural break is therefore **declared**, not detected: a human writes it down, with a category, a reason,
and a source, the same provenance discipline as the calendar's `DATED` rows (§8). The categories are a closed
set — `price-collapse`, `price-parabola`, `sovereign-adoption`, `exchange-failure`, `contract-redefinition`,
`other` — closed so a typo is caught, `other` so the set is never a reason to refuse a real one.

**The automatic half is a flag, never a decision.** A deferred pass may mark an instant as `flagged` when a
realized-volatility statistic crosses an unusual percentile of its own trailing distribution — self-normalizing,
because a fixed price level (a "$40,000" or a "70% draw-down") is exactly the kind of number this document
warns against inventing, and what counts as unusual for BTC changes with BTC. A `flagged` instant carries no
reason beyond the statistic that tripped it, is **never sufficient to define a regime boundary on its own**, and
never gates, restarts, or closes anything by itself. It exists so the operator does not have to remember to
look; the record still requires a human to say what it means, exactly as `unverified` prices still move the
tape in §2 rather than halting it.

**What a declared break does, and what it does not.**

- Nothing already recorded is deleted, edited, or reclassified. §4's ungardenable rule applies here exactly as
  everywhere else: a declaration is a new row, appended, never a rewrite of history.
- Every declared break defines a **regime boundary instant**. `regimeAt(t)` returns which regime an instant
  belongs to — an ordinal, not a judgment — derived at read time from the registry, the same pattern as
  `eventTag`/`coverageAt` (§10.2): it costs the recorder nothing and is exported on every H-protocol row, not
  only the shock programme's, because H5's premium and any future H2 both implicitly assume the vol regime is
  stable too.
- **No calibration set, no control match, and no bootstrap resample may span a regime boundary.** This binds
  §11.2's difference-in-differences and §11.3's control matching exactly as phase separation (§11.5) and series
  separation (§4) already bind them: a control drawn from a different regime than its shock is not time-matched
  in any sense §11.3 means, whatever slot, weekday and quarter it shares.
  If a declared break's effective instant falls inside an **open** calibration or holdout set — frozen or not —
  that set is spent: this is the same mechanic and the same wording as §11.6's holdout-spending clause,
  extended explicitly to a regime break. The count for the regime the break closes stops where the break falls;
  a fresh calibration set opens on the first graded shock window in the new regime. Data from the closed regime
  stays on the record and stays exportable; it simply never pools with data from the regime that follows it.
- A break declared, then found to be over-called, is not un-declared. The registry entry is superseded — a new
  entry marked `superseded`, citing the one it corrects, in the same style as §11.8's superseded bounds — so
  the record of what was believed and when is never lost. Un-declaring silently would let a boundary be moved
  after seeing whether it helped the result, which is the one thing this whole document exists to prevent.

**The registry is rendered, read-only, and declaration stays console-only.** From 11.9 until now the
registry was written, validated and exported and never *shown* — the only way to read what had been
declared was the console, which is a poor place to keep a record whose whole purpose is being consulted
later. The DATA view now carries a regime ledger. It renders four states, and its boundary column is
derived from `regimeRegistryFaults`/`regimeSupersededIds` in the same order `regimeBoundaries` applies
them, so the table and the walk cannot disagree: **excluded** (a registry fault, with its reason —
`regimeDeclare` promises this is never silent), **not a boundary** (a flagged row, which §11.9 says is
never sufficient on its own), **superseded** (kept on the record, out of the walk), and **active** —
which are exactly the entries `regimeBoundaries()` returns, asserted as a set identity in
`test/hprotocol.js` and against the rendered DOM in `test/page-load.js`.

*One in-code rule was read narrowly and the comment now says so.* `regimeDeclare`'s header read "No UI
exists or should be added"; taken flatly that forbids this. Taken as what it argues — that declaring a
break is a judgment call and must not be dressed as a control — it forbids a *form*, not a *display*.
The ledger has no button, input or editable cell, and the assertion that it never acquires one ships
with it. The comment was rewritten to say entry point rather than UI, because a flat prohibition sitting
beside a shipped exception is how a rule stops being read at all.

**This registers the concept and its effect before any scorer consumes it.** No scorer exists in the repository
right now — the one built and reviewed on 2026-09-06/07 was reset (§10.1) rather than carried forward, so that
regime-break handling could be part of a scorer's design from the start rather than retrofitted onto code
already hardened against a different set of failures. `regimeAt(t)` and the registry it reads are the contract
any future scorer must honor; nothing here depends on that scorer existing yet.

---

## 12. OCCVM — the shared visual system (2026-09-06)

The spine this tool shares with the Ghost Codex Rhyme Instrument. `occvm/SPINE.md` is the law; the rest of
this section is where it touches this repository.

**It did not exist until now.** The OCCVM roadmap and its 2.0 migration process were both written against a
spine document that had never been committed — `OCCVM` matched zero tracked files in either repository, and
the laws, defects and conformance table every release cited were unrecoverable. `occvm/SPINE-AUDIT.md` is
the measured inventory the spine was then authored from.

- **`occvm/spine.css`** is spliced into `index.html` under a fence by `occvm/tools/splice-spine.js`. **Never
  hand-edit inside the fence** — the next splice reverts it silently, exactly as §6 says about the units.
  Re-splicing is byte-identical; `--check` verifies and CI runs it.
- **1.0 changes nothing.** The spine is inlined above this tool's own CSS, so every value it declares is
  shadowed by or identical to one already here. Verified: zero deltas across 270 golden values.
- **`occvm/golden/`** is the field record the migration process assumes exists. `record.js` drives both
  tools in Chromium at three pinned sun elevations with the clock, timezone and seed injected;
  `verify.js` diffs. Two tiers: `tokens.json` is byte-stable and asserted on, the PNGs are for the eye and
  **never diffed for equality** — rasterisation differs per machine. `npm run golden` / `npm run golden:verify`.
- **`test/occvm.js`** holds the determinism seam and the spine guards. Before 1.2 two of its assertions
  deliberately pinned this tool's *current* behaviour, not desired: a binary `--night` and a 0.15 `--elev`
  night floor. They now pin the spine's law instead (`OCCVM-D2`, closed at 1.2) — a continuous `--night`
  ramp and the floor living in `--fill`. Since 1.7 the file also pins the civil/nautical/astronomical dusk
  staging (`--dusk-stage`, additive over that same ramp) and that BTC's tool-local `--bloom` surface glow
  stays deleted.
- **`veinLayer()` reads an injected session seed** (`sessionStorage["btc.seed"]`) instead of the wall clock.
  That closes §10.5's note that the veins reseeded per hour where §5 said per session.
- **This repository now has CI** (`.github/workflows/ci.yml`): the harnesses, the unit suites, the
  duplicate-definition check §7.1 required by hand, the splice-reproducibility check §6 required by hand,
  the spine check, and a BTC-only golden diff on Chromium.

**1.2 — one light, completed.** The light is now one implementation, `occvm/sundial.js`, spliced into both
tools: full NOAA position (this tool's) plus Rhyme's derivation of surface response from it. `solarPosition()`
is gone from this file and `sunTick()` is the display shape around a shared reading. `--night` is a ramp,
`--elev` drops its 1.4 scale and its 0.15 night floor moves to `--fill`, the light vector resolves neutral
overhead below −6°, `--glow` is a resolved scalar, and substrate and ink move with twilight. Closed D2, D8,
D9, D10.

*It also found that every fixed cast offset in both tools pointed the wrong way.* `(--lx, --ly)` points
**toward** the sun, so a lit bevel belongs at `+(lx, ly)` and a cast at `−(lx, ly)`; the tile's
`0 16px 36px` threw its shadow down-screen, which at noon is toward the sun. It survived because it looked
plausible and no rule connected the offset to the light meant to cause it. `test/occvm.js` now pins the
direction at three bearings — the same treatment §5's colour rule gets, and for the same reason.

**1.6 — architecture conformance.** `sw.js` ships and the page registers it, closing D5. Three rules, and
the first two are about not lying: **market data is never cached** (a cached price is a wrong price, and
this tool is only measurement — §9); the page is **network-first**, so a new stamp lands the moment the
recorder is online and no browser sits on an old one; and the **cache name is the build stamp**, passed as
`?v=`, so the worker's script URL changes every deploy and nothing is hand-bumped. `theme_color` and the
`theme-color` tag now agree, closing §8's cosmetic split.

**1.5 — the interaction floor.** Every control is at least 44×44px (`button` gained `min-height:44px` and
inline-flex centring; the `.tgl` track grew to 48 so its own buttons clear the floor rather than its
container doing it); ABOVE/BELOW carried their state in a class only and now keep `aria-pressed` in sync;
the CLOUDFLARE link had a `<button>` nested inside an `<a>`, which is two controls in one place. Reduced
motion is now one universal rule in the spine — this file's price readout carried an unguarded
`transition:color .5s` and the collapse chevron an unguarded transform, while the only media query here
tested `no-preference`, the inverse of the one that matters. Closed D7 in Rhyme; this tool's own gaps are
closed with it.

**1.3 — the numeric face.** `--mono` is an owned stack: IBM Plex Mono (OFL, `occvm/fonts/OFL.txt`),
subset to the 108 codepoints this tool renders and base64-embedded in `occvm/mono.css`, which ships only
here — Rhyme resolves zero mono elements. **Two weights, because the price readout is `font-weight:600`
and a synthesised bold changes the advance width**, which breaks the tabular column; both faces are
strictly monospaced at the same 600/1000 em advance, and `font-synthesis:none` keeps it that way.
Fifteen symbols are absent from the cut; the three that land in right-aligned numeric cells (`●`,
`✓`, `✗`) carry `.occvm-sym`, pinning their advance to `1ch` so alignment never depends on a fallback.
`--t-num` is 1 — a measurement, not a placeholder; see SPINE.md L7. Regenerate with
`python3 occvm/tools/subset-mono.py` (needs `pip install fonttools brotli`; the output is committed so
nobody needs them). Closed D3. The artifact grew 435 KB → 461 KB.

**1.9 (narrow) — closed D1.** The expired `--ink --meas --bondi` block was a shim from an earlier naming
scheme. Two of its eight names had zero call sites (dead weight); the other six carried 77 sites between
them, every one an inline JS-generated `style="color:var(--dim)"` string — the CSS rules had already moved
to the canonical names, only generated markup still spoke the old dialect, exactly as 1.2's golden diff
predicted. All 77 sites migrated to `--bone-lo`/`--bone-dim`/`--verdigris`/`--gilt-c`; the block deleted.
`test/occvm.js` pins that none of the eight names can be declared or referenced again.

**1.4 — closed D6.** The mineral set moved into `occvm/minerals.js`, a fifth spliced part shared with Rhyme
(Rhyme's own two-entry copy, missing `ruby`, was itself the "no local exceptions" gap L6 registers). This
tool gained `S.cfg.mineral` (default `amethyst`, persisted, a picker in Settings → Advanced) and
`--mineral --mineral-lo --vein-hi --vein-lo`, resolved from it — the first real consumer of the
`--amethyst`/`--amethyst-lo` tokens D6 found declared and never referenced. The scope is deliberately
narrower than Rhyme's: the mineral tints only `veinLayer()`/`veinLayerLegacy()`, never `--malachite`,
`--ruby`, `--up`, `--down`, or any surface §5 governs, because those already carry this tool's win/lose
meaning everywhere and a decorative accent has no business sitting beside it. `test/occvm.js` pins both
the vein layer's dependence on the choice and that switching it never inline-sets an outcome token.

**1.7 — the night model.** `occvm/sundial.js` gains `--dusk-stage`: one of `day`/`civil`/`nautical`/
`astronomical`/`night`, at the standard elevation boundaries (0°, −6°, −12°, −18°), additive over the
existing `--night` ramp rather than a replacement for it — same ramp, same formula, a second discrete
reading alongside it. `S.sun.stage` mirrors it for parity with this tool's other resolved sun fields;
nothing consumes it yet, and the existing sun pill's own day/night narrative ("sun rise", "morning", "sun
high") is untouched — it mixes direction with dusk state in a way plain staging doesn't replace, so
rewriting it wasn't this release's job. `--bloom`, the malachite tile glow renamed rather than resolved at
1.2, is deleted outright — not replaced with `--glow` on the surface, since `OCCVM-L9` reserves that for
ink and says plainly that no surface takes one.

**1.8 — the reference surface.** `occvm/reference/index.html` is a conforming page that exists only to be
looked at: one live specimen per law, drawn from the five spine parts spliced into it. It lives here rather
than in both repositories because it renders the numeric face (which ships only where mono is rendered) and
because it is a conformance *instrument*, like `occvm/golden/` beside it — the law and the parts are what
both repositories carry identically. It is served with the rest of this repo, so it is readable at
`btc-terminal.pages.dev/occvm/reference/`.

**It holds no values of its own, and that is enforced, not intended.** `test/occvm.js` strips the spliced
fences and fails on any hex, `rgb()`/`rgba()` triplet or colour keyword left in the page's own CSS or JS.
Everything on it resolves through a spine token or a `color-mix()` of one — so it cannot keep looking
correct after the spine stops applying to it. It is recorded into the golden set as a third surface and
checked in CI, and it is the sharpest of the three signals: a delta on this tool might be this tool's, a
delta there can only be the spine's.

It also found a real gap in its own first section: `.occvm-slab` and `.occvm-cast` both own `box-shadow`,
so no surface could wear both, which is why every surface that wanted a cut face *and* a cast re-authored
the bevel by hand. `--occvm-bevel` (spine.css, L2) is the fix. Nothing in this tool moves — the token is
added, no existing value changes, and this tool does not use `.occvm-slab`.

**2.0 — the material model (`OCCVM-L12`), and one delete that never happened.** `occvm/material.js` is a
seventh spliced part: aragonite defined once — cell, principal indices α/β/γ, hardness, density,
stiffness — with the substrate ramp **derived** from angular Fresnel at L2's cut geometry rather than
authored as three hexes. **Nothing in this tool repaints.** 2.0 defines and derives; adopting it on a
surface is a separate decision under SPINE.md §6b, and what exists now is the definition plus the measured
distance between what the material says and what the tools do, which nobody had before.

*Two derivations were tried, measured and rejected before the third was kept, and both are on the record
because each sounds more physical than the one in force.* Normal-incidence Fresnel on α/β/γ spans **1.48×**
against the **5.74×** linear-luminance spread this tool authors, so real optics taken that way is 3.9×
*flatter* than the design and the substrate would go nearly monochrome. Weighting reflectance by incident
flux (`R(θ)·cos θ`) is worse: the cosine cancels the Fresnel rise and the whole sweep collapses to
**1.13×**. What is in force is that a dark, glossy solid is seen by its **specular** return, so a face
tracks `R` at the angle it presents *to the viewer* — the slab's own cut geometry. **The sun therefore
drops out of the ratio**, which is why this derivation is the one kept: material owns structure, the
sundial keeps owning magnitude exactly as it has since 1.2, and 2.0 does not double-apply the light
pipeline. Optics gives `9.353 : 1.732 : 1.000` against the authored `5.739 : 2.539 : 1.000` — same
ordering, more convex shape — stated rather than fitted, because a per-face correction is three authored
numbers wearing a derivation's clothes. `contrast` is the one value that is judgment and is named as such;
at a derived `0.7816` the material reproduces today's spread.

*The lattice now has a single owner.* `occvm/veins.js` reads the cell from the material instead of
restating it; `occvm/fracture.js` still reads the angle from veins. The same three lengths had been typed
in two files — two copies of one fact, the defect L3 exists to prevent, one material down.

*And it found a defect this tool has shipped since 1.1b.* The splicer inserts every part after one anchor,
so parts land in **reverse** list order and `fracture.js` is evaluated *before* `veins.js` is assigned. It
captured `OCCVM_VEINS` at that moment, got null, and **`cleave()` threw on every call in the browser**,
while Node resolved it through `require` and every assertion passed. The read is now lazy, and the guard
runs the spliced blocks in the page's own order with no `require` in scope. In Rhyme — fracture's first
real consumer — the consequence was functional rather than cosmetic: the throw landed before the `done`
callback, so **deleting a draft silently did nothing** for anyone not on reduced motion. `test/occvm.js`
235 → 274.

**P1 and 2.1/P4 — two extensions derived, measured, and deliberately not wired.** Both follow 1.1b's
disposition of the twin misfit: the arithmetic is right and stays, the wiring waits for a regime where it
expresses, and raising a coefficient until something visible happened would be fudging a derived number
toward a wanted picture.

*P1, anisotropic motion.* The stiffness tensor gives each axis a settling time, and the relation is the
oscillator's rather than the spring's — `T = 2π√(m/k)`, so duration ∝ `1/√k`: **a 0.7584, b 0.9454,
c 1.0000**. Static compliance `1/k` was the other candidate and is wrong for a temporal quantity. It ships
no token because **anisotropy is only observable as a difference between two directions in the same view**,
and the census found `translateX` at **zero animated sites in either tool**, `translateY` at three, and all
eight `translate(x,y)` sites being static light-vector offsets rather than motions. Fracture is the one
animated 2D direction and its angle is fixed, so projecting the scalars onto it renames 220 ms to 194 ms
rather than making anything anisotropic. Three tokens consumed by nothing is `OCCVM-D12`, closed one
release earlier. The guard is **self-retiring**: it counts animated horizontal motion and fails the day one
appears.

*2.1/P4, unit-cell spacing.* The cell normalised to its shortest edge is **a 1.0000 : c 1.1573 : b 1.6069**.
Censused over **213 real padding/margin/gap declarations** across both tools — 19 distinct pixel values,
10.79% weighted mean error against the cell ladder, worse coverage than a plain 4 px grid — so adopting it
moves 213 declarations by ~11%, a redesign wearing a derivation's coat. And it does not survive to the
screen: spacing quantises to whole pixels, **84.5% of it is under 12 px**, and the rendered c-step wanders
**1.125–1.250** with the base rather than following the material, straddling the cell's own 1.157 without
ever equalling it. **The guard ships even though the scale does not**, because `1.6069` and the golden ratio
`1.6180` differ by 0.04 px at step 1 and do not reach a whole pixel until step 5 — past the largest spacing
either tool uses. They are the same number on screen, so somebody will eventually "correct" one to the
other. It is not a typo for φ; it is 7.97/4.96. `test/occvm.js` 274 → 294.

**2.2 — `--amb` became `--fill`, and 1.2a's last open question closed.** 1.2a recorded this term as
non-monotonic in darkness (0.450 at the horizon against 0.630 at night) and deferred to 2.0 the question
of whether a term climbing at midnight would fight a material model. Measured first: every consumer
weights it by `(1−e)`, which cuts a **28% dip in the token to a 1% dip in what reaches the surface**. There
was no physical defect — only a name. It was never sky illumination; it is the *weight of the fill*, and a
fill that rises at night is correct rather than paradoxical. Values byte-identical, proved by re-recording
the golden set across three surfaces at three instants: one key renamed, **zero value deltas**. `--amb` is
pinned out of both repositories. *Recorded and not changed:* the `0.55·elev` branch, weighted by `(1−e)`,
contributes `0.55·e·(1−e)` — a mid-afternoon bulge nothing states as intent; a rename that also moved a
curve would give the golden set a delta it could not attribute.

**2.3 — attempted, wrong, reverted, and the mistake is the entry.** 2.3 anchored the material's one free
value (`body`) to L1's floor `#0e0d13` and found the derived ramp reproduced `--sub-hi` and `--sub-lo`
**to the byte**, disagreeing only on a mid-tone 3.91 L* darker. Three generated tokens shipped and Rhyme's
`.slab` adopted them. Every assertion passed.

**All of them compared the material against the `:root` fallback declaration**, which the sundial
overwrites every minute before first paint. `#2c2a36 / #1b1a22 / #0e0d13` is not what renders — at high sun
the live substrate is `#4b4a50 / #1b1a22 / #100f14`, and its face ratio swings **2.238 → 6.413** across the
day against the material's single 3.736. The adopted slab also lost its twilight response outright, a
constant sitting beside neighbours that move. Caught by reading the golden set's recorded values rather
than the tests.

Reverted in full; the generated tokens are deleted rather than left declared and unconsumed, which would
have been `OCCVM-D12` in the release that cited it. **`body` stays anchored** — matching L1's declared
floor is an improvement whatever consumes it. `test/occvm.js` now carries the check that was missing: the
rendered substrate is sundial-written, and its face ratio is not constant.

**The real adoption target is registered, unbuilt.** The sundial already implements 2.0's decomposition —
a base colour moved by twilight, plus face offsets — but those offsets are authored constants,
`mix(sub, white, 0.14·(0.5+e))` and `mix(sub, black, 0.42)`. Replacing *those two expressions* with the
material's face ratios is what adopting L12 on a substrate actually means. It is a visible change to both
tools and is not something a correction commit does.

**2.4 — the substrate's face offsets become the material's.** `mix(sub, white, 0.14·(0.5+e))` and
`mix(sub, black, 0.42)` were the last authored values in the substrate — two magic numbers with no
derivation — and are now the material's face ratios relative to the base colour the sundial owns. This is
the adoption 2.3 should have been: it replaces the sundial's constants rather than standing a constant
beside them.

*It carries a correction of its own.* `authoredContrast` fitted to 5.739, the spread of the `:root`
**fallback** — 2.3's error one level down, shipped since 2.0. Replaced by `renderedContrast`, anchored to
the spread the tools actually paint at high sun (13.881), a **named instant** rather than an average.
`authoredContrast` is deleted rather than re-valued.

*Two things are kept, both for measured reasons.* The `(0.5+e)` directionality term stays, because
adopting the material's constant ratio without it does not flatten the day, it **inverts** it: −7.9 L* on
the noon highlight against +8.0 at night. And the operation stays a mix *toward the light* rather than a
scale of the base, because a specular return on a dielectric carries the source's colour, so a highlight
desaturates.

*What it costs, over the whole day rather than at the anchor* — anchoring at high sun guarantees high sun
barely moves, so the range is the honest figure: **+1.75 L\*** highlight at high sun, **+5.00** at low sun,
**+0.05** at night; shadow **+0.68 / +4.47 / +1.59**. The large move is at low sun and its cause is named:
the shadow face gains directionality it never had, the authored `0.42` having been flat at every
elevation. `test/occvm.js` 313 → 322.

**2.7 — the laws re-authored around a measurement, and three of the five divergences closed.** The
conformance table had read `violates: —` for six releases; `occvm/tools/law-audit.js` measured five laws
diverged. This release: **L4** — Rhyme's one fixed-offset cast now struck from the light vector. **L6** —
this tool restated `--amethyst`/`--amethyst-lo` in `:root` for a `--mineral` fallback chain that nothing
in CSS ever read; four dead declarations deleted (the token audit missed it because it accepts a `var()`
reference as consumption even when the consuming token is itself unconsumed — a chain to nowhere). **L7**
— the defect was the *serif*, not the mono the roadmap named: `--serif` was every face somebody else's,
Apple-only at the front. Now owned, 1.3's treatment applied twice: `occvm/serif.css` embeds Fraunces
(OFL, SOFT 35 / WONK 1 per the handoff, `opsz` and `wght` kept variable — this tool renders it at 12px
where the handoff's pinned 40 is wrong) into both tools; `occvm/reading.css` embeds Faustina for Rhyme's
running text, which had been sharing `--serif` with the heads. This tool drops its own `--serif`
restatement; the spine governs it. **L2** is re-authored, not fixed: the plan-view radius is the
*vessel's* — authored per tool, recorded (this tool 10–22px and pills; Rhyme 2–4px), not judged — and the
edge is the *fluid's*, a 7.15px meniscus derived from the substance. The spine's bevel is still the
crystal's 1px chisel, so L2 reads DIVERGED at the spine, honestly, and widening the bevel is the adoption
candidate — the first change that would make either tool *look* fluid. 2.6's `--occvm-r` is deleted:
derived, on an unworn class, consumed by nothing (D12). The auditor gained `--stamp` (state blocks are
regenerated, not typed once) and a two-way `--check`; it also had a bug of its own — `SIBLING` hardcoded,
so from Rhyme it measured Rhyme twice under two names and passed. **7 in force, 1 diverged, 4 unmeasured.**

*And CI was red for three pushes while every local gate read green.* Run 38 was the golden job catching
`--occvm-r` landing unrecorded (superseded by its deletion); 39 and 40 were one harness assertion that
demanded `PARTIAL` whenever a tool was `ABSENT` — written against a full checkout, where no tool ever is,
and wrong on the runner, where L2's own divergence correctly rolls up `DIVERGED` over the absent sibling.
The auditor now takes `OCCVM_SIBLING` so the harness simulates the partial checkout itself instead of
waiting for the runner to; the CI shape is asserted locally on every run. Recorded because "gates green"
was reported from the clone, and the standing rule is CI via the API.

**2.8 — the crystal leaves.** The roadmap's §3 disposition, executed with the corrections the branch
had already recorded. **Veins** are diffusion-limited *cluster* aggregation now — every particle mobile,
clusters sticking to clusters — which is how a colloid gels and what ketchup is; the layer stops being
dendrites from nuclei in clear matrix and becomes a network suspended in the material, blurred where it
was crisp. The fractal dimension is measured as an output (1.46 dilute against the 2-D literature's 1.44,
1.61 at the shipped density as a gel must), never fed in; the roadmap's 1.75 is the 3-D value and is
recorded as unreachable on a planar lattice. **`--vein-habit` is retired by measurement**: the one
meaning a fluid could give it, sticking probability, moved the dimension inside the estimator's error.
**`fracture.js` → `yield.js`**: hold, neck, pinch-off, and a retraction on the cessation curve derived in
`rheology.js` with a hard stop, which is the property that now distinguishes the irreversible vocabulary
from every elastic easing. The roadmap's cessation derivation reproduces to four figures and its
attribution is inverted: at its τ₀ the rate term dominates, at ours the yield term does, and the shape is
a power ease-out whose exponent is fixed by a free v₀ — so the curve is derived and the duration is
authored, and both are named as such. Trap depth derived from SGR's escape law (roadmap #4, "no formula
exists"; E = x·ln(t/t₀) is one), unwired. `material.js` deleted, P1 and P4 retired with the tensor and the
cell, and the splicer learned to **retire** a part — until now it could add and update but never take
away, and a dropped part would have shipped stale under its fence forever. This tool's own change is one
line: `veinLayer()` stops passing a habit. **Roadmap items closed: #1 (meaningless), #4, #5. 349
occvm assertions, 48 rheology.**

**2.9 — the patience system, as far as the foil allows.** Three things from the roadmap's §4.1, each in the
shape its own discipline permits. **The lock release relaxes** to the free sweep on the substance's cessation
curve and stops at an exact instant (`LOCK_RELAX_MS` 360, authored and named; the curve derived) — the
roadmap's "event response", wired to the one event it named that exists here. **The koan** is copy in the
idle canvas, under "awaiting validated tape". **Critical slowing down is recorded, not rendered:** each edge
snapshot carries `ac1`, the lag-1 autocorrelation of the same sixty one-minute returns `rv60` is built from,
with the count `acn`, exported as `csd_ac1`/`csd_n`. It is a column beside the variance half, not a light on
the lock, because `SEAS` raises variance every morning by construction and any reading of the pair as a
tipping point owes §11.3's time-matched controls — §11.5's rule that recording is not reporting, applied.
The roadmap's whole disposition — adopted, adapted, dropped, with reasons — is SPINE.md §9.

**2.10 — a provenance defect, and the meniscus adopted.** Reworking the roadmap's dropped concepts turned
up something bigger than the reworks: **the substance's flow constants had been misattributed for five
releases.** `k = 4.6` and `n = 0.19` were credited to Koocheki et al. (2009)'s control formulation. That
paper's Herschel-Bulkley consistency ranges 6.56–20.10 Pa·sⁿ, so **4.6 is below its entire published range
and is in it nowhere**; 0.19 is the floor of the *power-law* index across hydrocolloid-supplemented samples,
carried as the control's and paired with a Herschel-Bulkley fit that reports 0.250. The control row at 25 °C
is τ₀ 4.41 Pa, k′ 16.18, n′ 0.250, and k and n are now that row. Every number in this system had been checked
against what renders; **none had been checked against its source** — a new failure mode beside the three
render-versus-declaration errors already on the record, and the guards now assert the constants against the
paper's published ranges. Re-measured: x 0.81 → 0.75 (still glass phase), 1/n 5.26 → 4.00 (the duration
formula stays unusable, #1 stays closed), the cessation regime at v₀ = 1 0.217 → 0.765 (still
yield-dominated, so the curve keeps its shape and hard stop), the crossover **3,070 → 2.92**, trap depths
2.43/3.73 → 2.25/3.45. Nothing that does not read the flow curve moved. Also corrected: the "~10–40 Pa band"
cited for τ₀ had no citation (the measured static yield stresses 21.8–37.1 Pa do support the value), and
n = 1−x is Sollich's own result, not the "judgment" the file claimed — an understatement, fixed for the same
reason an overclaim would be.

**L2's meniscus is adopted**, on the reference surface where the law said to prototype it, closing the last
divergence (**8 in force, 0 diverged**). `--occvm-bevel` was a 1 px chisel and is now a band one capillary
length wide (7.148 px, derived) at the substance's own gloss — **68.5 GU** against ASTM D523's polished-black-
glass reference, versus 86–91 for obsidian, so a wet surface is *dimmer* than a polished one, not softer.
That is the roadmap's §5.3 "broad, soft highlight" with the one thing that made it undeliverable removed: it
asked for a highlight deforming *at rest*, which is idle motion. Take the motion away and the physics still
gives breadth, statically, because a wet edge is soft from **curvature**, not roughness. **Neither tool
moves:** `--lit-x` stays the 1 px unit each tool multiplies by its own depth, and rescaling it would have
scaled every tool-authored bevel sevenfold. Four of the six dropped concepts are re-dropped with sourced
reasons and one (a second substance for Rhyme) is closed on measurement; SPINE.md §9 carries each.

**2.11 — the meniscus is worn.** 2.10 derived the edge and adopted it on the reference surface only;
both tools kept the crystal's 1 px chisel, because `--occvm-bevel` had exactly one consumer,
`.occvm-slab`, and **zero elements in either tool wore that class** — the law described an edge neither
tool had, and had since 1.0. Six surfaces here now wear it (`button`, `.aslink`, `#armBtn`,
`header.tile`, `.tgl button.sel`, `.schip`), each passing its own amplitude through `--hi-a`/`--cut-a`
instead of re-authoring the geometry, and Rhyme's `.slab` with it. **This is the first change in the
pivot that makes this tool look fluid.** `.pill` and `.shead` are excluded and pinned excluded: they
carry OUTER highlights, and a drop shadow is not a cut face. The `button`/`.aslink` highlight goes warm
bone to white, which is 2.4's own finding (a specular return carries the source's colour) and is a
colour change riding a geometry one — named rather than folded in.

*The golden set could not see any of it.* Run against the finished adoption it passed **561 values, zero
deltas**, because it records custom properties off `:root` and everything that moved here moved on a
consumer. A `WORN` tier recording each surface's **resolved** shadow was written to close that and is
**withdrawn at 2.12**: on the runner it read the `:root` fallback at all three pinned instants while the
token it multiplies recorded correctly, so it measured the machine rather than the page. Three red CI runs,
two wrong diagnoses of mine, then reverted. The gap is `OCCVM-D13` on the register, open. The guard on
re-authored bevels stays and is self-retiring: it fails the day a surface goes back to writing its own.

**2.12 — the recess is a law too, and every surface that models depth now reads the sun.** 2.11 put
the meniscus on the raised surfaces and left the sunken ones alone. That was half a system: a well was
still hand-written, and Rhyme carried **five slightly different depths** for what is one idea.
`--occvm-well` is the second primitive — *the same capillary length at the opposite curvature*, derived
from `--occvm-meniscus` rather than authored beside it. At a concave corner the meniscus curves the other
way, so the wall facing the light is the one in shadow; that is why an engraved field reads dark where a
raised one reads bright. Here `.pill` and the chip row adopt it; in Rhyme eleven surfaces move — four
raised (`.binding`, `.edge`, `.cast`, `.cast:active`) and seven recessed (`.cut`, `.cut:focus`, `.picker`,
`.verdict`, `.shelflist`, `.share`, `.fit .track`).

*Three classes, and only two are depth.* Rings (`0 0 0 1px` inset), the cabochon glow on `.stone`, and
`.bar`'s directional heat wash are **not** depth and keep their fixed geometry — pinned, so the
self-retiring guard cannot swallow them. That guard now fails the day any surface models depth in fixed
pixels again.

*A scale consequence, stated rather than tuned away.* λc is a fixed physical length, so it occupies a
larger fraction of a small surface than a large one — Rhyme's list rows carry a 7.148 px band across a
~56 px row, and read markedly softer than BTC's chunky pills do. **That is what real fluid does** (a drop
on a teaspoon is nearly all meniscus), so it is kept rather than scaled per element, which would put an
authored number back on top of a derived one. Golden **600 → 609**; `test/occvm.js` 380 → 385.

**2.13 — the spine gets a boundary and an adoption guard, both adding coverage rather than easing it.**
Two changes, from the question of whether the law should be *more accepting of future change*. Measured,
the answer was no: what cost time was too few nouns and one blind guard, never a rule refusing too often.

*Where a new token goes is now stated.* §2a-0: **declared** by `spine.css` → §2a; **written** by
`sundial.js` → §2ab; **a surface input** read through `var(--x, fallback)` → neither, the spine only reads
it; and everything in §6b's migration table always, because that census scans the stylesheet rather than
being typed. That boundary existed only inside the guards, so the only way to learn it was to be refused —
which is what happened three times while landing `--occvm-well`.

*And a primitive must now be worn.* `OCCVM-D14`: `D12` catches a token consumed by nothing, and nothing
caught a **class** worn by nothing, so the primitive set has been decorative since 1.0 with no gate saying
a word — `.occvm-slab` carried the bevel the law describes while zero elements in either tool wore it.
Measured: **seven of nine primitives reach neither tool.** The guard pins that set **exactly, in both
directions** — a newly-unworn primitive fails, and adopting one of the seven also fails — so the record
moves with the code instead of absorbing it. `.occvm-num` and `.occvm-rule` reached no element *anywhere*,
including the reference surface whose whole claim is one live specimen per law; both have one now, and
that property is asserted permanently. `test/occvm.js` 385 → 388.

**2.14 — the auditor was carrying the defect it exists to catch.** `law-audit.js`'s L2 line ended in
a **typed string**: "(reference surface wears it; neither tool has adopted it)". True when it was written
at 2.10, false from 2.11, and it went on printing through 2.12 — the two releases that put the meniscus
and its recess onto both tools' own surfaces — and into `SPINE.md`'s generated L2 block, which is the one
place the law records what the tools do. That is §7's `violates: —` table one level down, inside the
instrument built to make that impossible. Replaced by a count taken from each tool's own CSS: **BTC 8
sites (6 raised, 2 recessed), Rhyme 12 (5, 7)**. The measured half — band 7.148px against λc 7.15px — was
right the whole time; only the sentence about who wears it was false, which is exactly how a stale claim
survives a gate. `SPINE.md` regenerated with `--stamp`, byte-identical in both repositories.

*Two more of the same class, found by counting rather than by reading:* this file's header claimed 6,331
lines / ~428 KB / 286 functions against a measured **8,093 / 630 KB / 294**, and a deploy stamp three
releases old; §6 claimed 715 assertions against a measured **738**. Both corrected, both with the
superseded figure left visible beside the new one. `<Cast>`'s own header comment in Rhyme claims 28 call
sites against 36 — recorded here, not fixed, because it is the sibling's file and nothing measures it yet.

**2.15 — L13, ambient motion: a permission written where the prohibition never was.** The rule that has
been killing motion proposals — §5.3's deforming highlight at 2.10, §5.6's caging jitter at the same
release — was never in this law. It lives in the **master roadmap's §6**, which SPINE.md only ever
*quoted* while recording a disposition. A rule that governs by being cited from another document is one
nobody can read, bound or argue with, so `OCCVM-L13` states it here as a grant with its own edges, and §6
stops being law by citation.

**A decorative layer may move on its own; the material may not.** A slow continuous floor may run
unconditionally — no gate, no triggering state — sourced from the system's own generators and palette. The
cost is named rather than absorbed: a yield-stress fluid below τ₀ does not spontaneously convect or drift,
so the floor **contradicts the substance's defining behaviour** and is recorded as the owner's aesthetic
judgment, the standard §9 already applies to the crystal's replacement. What stays closed is the material
deforming *at rest* — decoration **on** the substance is permitted, the substance lying about what it is
is not. **L8 is untouched and L13 reaffirms it:** a floor under `prefers-reduced-motion` degrades to a
static frame, never to a subtler floor.

**The scope is per tool and deliberately asymmetric — and it is measured, not merely written.** Rhyme is
granted the floor on the draft face: a reading surface is a document and nothing on it encodes an outcome.
**This tool is withheld**, from the canvas and every surface §5 governs, because every moving mark on the
sweep means something and a drifting decorative mass drawn from `PAL` beside marks that carry win/lose is
§7.6's noise-as-opportunity trade. A scope living only in prose is how §7's table came to read
`violates: —`, so `law-audit.js` measures it: a floor call site in this tool's own source reads DIVERGES,
in Rhyme's it must be reduced-motion guarded at the call, and `test/occvm.js` drives all four cases on
synthetic tools rather than waiting for a floor to exist. **UNADOPTED in both today** — the law is written
before the first floor so the first one is built against a boundary rather than negotiating one after.

*And the law-count guards were themselves a typed number.* Two assertions read `j.length === 12`, so
declaring a thirteenth law failed them **on correct code** — the 2.14 class again, a stale claim with a
test wrapped around it. Both now read the count from SPINE.md's own `### OCCVM-L` headings and assert
what the law actually promises: every law it declares is audited. `test/occvm.js` 388 → 392; §6's total
738 → 742.

**2.16 — the lock release gains a real velocity, and roadmap item #12 closes for its first consumer.**
Since 2.9 every release played the same authored 360 ms whatever the gesture: `yield.js` ran at `v₀ = 1`,
an authored placeholder, and `lockRelease` had no input at all. `S.drag` tracked `{x0,y0,x1,y1}` and no
timestamp, so there was nothing to read. It now carries a **trail** — the position tracking already
existed; this adds the clock to it — and the speed of the gesture that *seizes* a region travels on
`S.lock` to the release that undoes it. `lockSwing` is a button, carries no gesture, and keeps the
reference `v₀ = 1`, which is why the reference exists.

**Derived and authored, kept apart.** Derived: the curve's shape at each `v₀`, and the **ratio** of
stopping times `stoppingTime(v₀)/stoppingTime(1)`. Authored and named as such: `LOCK_V0_REF` (the drag
speed reading as `v₀ = 1`), the `[0.25, 2.5]` clamp, and `LOCK_RELAX_MS = 360`, which is now explicitly
the duration **at the reference** rather than the only duration. No derivation maps px/ms onto a
substance's initial velocity — `rheology.js` says so at its own #12 — so the mapping is a person's. Only
the anchor is authored; everything it is multiplied by is measured.

**The roadmap's stated feel is backwards, and the substance wins.** It asks for *"a hard drag settles
faster, a gentle release settles slower."* A yield-stress fluid does the opposite: `t_stop` is bounded by
`v₀/(τ₀ + k·v₀ⁿ)` and `v₀/τ₀`, both monotonically **increasing** in `v₀`, so more momentum takes longer to
bring to rest. Measured on the shipped constants: **101 ms at v₀ = 0.25, 360 at 1, 821 at 2.5.** Inverting
the mapping to get the wanted feel would be fudging a derived number toward a picture, which P1 and P4
both refused. A hard seize relaxes *slowly*, and that is the finding.

**The ceiling sits below the regime crossover, deliberately.** `k·v₀ⁿ/τ₀` reaches 1 at **v₀ = 2.9196**
(measured here by bisection, reproducing 2.10's 2.92 exactly), and past it the cessation exponent moves
2 → 2.235 — the same UI action rendering two different physical vocabularies depending on how hard
somebody dragged. `LOCK_V0_MAX = 2.5` keeps every release yield-dominated at ratio 0.962, **14.4% of
headroom**, and the guard fails the day the ceiling crosses the measured crossover, so the margin cannot
rot. Reduced motion and an unspliced substance both still degrade to instant, never to a different curve.

*One correction on the way, recorded because the wrong half was nearly "corrected".* The first
trailing-window fixture expected 3 px/ms from a trail whose window legitimately spanned 100 ms and
measured 1.2. The code was right and the expectation was wrong. `test/occvm.js` 392 → 403; §6's total
742 → 753.

**2.17 — the canvas reads the sun, and L6 could only see CSS.** Two findings from checking `renderSweep`,
both closed here.

**`renderSweep` contained zero references to the light.** No `--lx`, `--ly`, `--elev`, `--night`, `--glow`,
no `Math.sin`/`Math.cos`; the only time call is `Date.now()`, driving scroll and the lock relaxation.
`sunTick` wrote custom properties onto `documentElement` and mirrored into `S.sun`, and wrote **nothing** to
the canvas — so the largest visual element in the tool, the one §5 calls its centre, drew identically at 3am
and at noon. Not an L8 violation: **`OCCVM-L3` — one light — simply did not reach it**, the shape of `D13`
one level down, where the golden set cannot see an adoption and here there was no adoption to see.

**What moves is exactly what the sundial writes, measured rather than chosen.** `sundial.js` sets `--sub`,
`--sub-hi`, `--sub-lo`, `--bone` and `--bone-lo` each tick and nothing else; `PAL` carries the two ink
weights, so those two refresh and the rest stay literal. The outcome colours are untouched — not by a
judgment about win/lose, but because **the sundial never moves them**, so there is nothing to read. The
guard asserts every live key against the token list parsed out of `sundial.js` itself, so a key that stopped
being sundial-written could not stay "live". Cost: **one read a minute**, on `sunTick`'s existing beat —
resolving custom properties at ~30 fps is the wrong price for a value that changes once a minute. The
literals stay as the fallback and are load-bearing: jsdom resolves no custom property, and a palette that
silently became empty strings would paint nothing while every assertion passed.

**And `PAL` answered §5's open L6 question by being counted.** `PAL.mal`/`PAL.ruby` are the malachite and
ruby values typed a second time as JS literals, and the L6 measure read only `--token: #hex` **declarations**
— a restatement of a protected token in JavaScript was invisible to the one instrument built to find
restatements. Every mineral value is now counted wherever it appears, in four named classes: an accent
declaration or **bare accent literal** diverges; a `:root` mineral fallback overwritten at load is tolerated
and named, the same shape L12 already tolerates for the substrate; outcome colours in any syntax are the §5
exception, counted rather than hidden. Measured: **BTC 7 outcome colours** (was reported as 3), **Rhyme 4
`:root` fallbacks** (was reported as none). Both still CONFORM — `PAL` is the same granted exception in a
second file, not a new violation, which is the answer rather than a deferral. `test/occvm.js` 403 → 412;
§6's total 753 → 762.

**2.18 — swing was a label on a straight grid (Rhyme), and Reading A rides a true one.** Not this
tool's code, but the law and the guards are shared and the finding is the same class as 2.14's. Rhyme's
`SUBDIVISION` gave `straight` and `swing` the same 4, `slotMs` was `beatMs/per` for both, and nothing
carried an onset — so **`swing` produced a grid byte-identical to `straight`** while the comment three
lines above claimed it "shifts where the offbeats sit in time". Swing now splits each pair 2:1 — the
notated meaning, the value MPC swing percentage is measured against — applied at the pair, which at
`per = 4` is sixteenth-note swing. Measured at 90 bpm: straight `0 / 166.7 / 333.3 / 500`, swing
`0 / 222.2 / 333.3 / 555.6`. Slot count and bar length unmoved. Four new tests, two of which fail
against the old engine — verified by simulating it.

*2.19 corrects the claim this entry made about `pace()`.* It read "swing changes **where**, never how many
or how fast", and called that a virtue. **The writing does not swing — the beat does, and a line is written
against it**, so half a swung bar's slots are short: at 90 bpm a pair runs **222 ms long / 111 ms short**,
which is **4.5/sec against 9.0/sec** for anything landing on either side. `rate` is a bar mean and sees
neither; it reads 6.0 under both feels. A mean hiding an uneven constraint is the `meanSlotMs` defect one
level up, in the readout instead of the grid. `pace()` now carries `tightMs`, `tightRate` and `even`, and
the panel states the short side's rate — **reported, not modelled**: the tool does not know which slot a
syllable lands in, that is the writer's ear, so it states the room the beat gives and stops.

*And `slotMs` became `meanSlotMs`, which is the sharper half.* Under swing no slot has the mean's
duration and the old name claimed every slot did. No product code read it; **its only two readers were
assertions checking it tracked bpm** — true of a mean, and exactly what made the uniform-slot claim look
verified. A guarded lie is worse than an unguarded one, because the guard is what stops anybody looking
again.

**Reading A** — the metronome pulse — is the first consumer of `L13`'s gated-motion clause, and obeys the
sentence written for it: the gate is the actual value, never its display fallback. `TempoPanel`'s
`tempo || {bpm: 90, …}` exists so the panel renders before a tempo is set; reading it would leave the
pulse beating at 90 under a default nobody chose. `performance.now()`, never a frame count. Reduced motion
stops it rather than slowing it.

*The 2.13 boundary refused the change until the token was registered.* `--pulse` is new, the census caught
its absence from §6b's migration table on the first run, and this tool's suite failed until it landed
there as tool-local — a rule that only describes changes after the fact is not a rule.

**2.20 — the physics questions are staged and bounded, and the performance boundary is a rule.** Both
land in `SPINE.md` and govern both tools; neither changes a surface.

**§10 — open physical questions, each with what closes it and what it may cost.** A physical question with
no stated bound absorbs any amount of work: there is always another paper, another regime. **P-1, γ:
closed as unclosable** — it touches λc alone (one corner radius, ±2 px) and no published value exists
because ordinary tensiometry has no valid regime on a fluid that holds below τ₀; reopens only if one is
published. **P-2, disturbance → v₀: closed as authored** — no derivation exists, so each consumer names its
own anchor and clamp and states both, as 2.16 did. **P-3, coalescence: one citation pass at build time**,
not before, and if the scaling can't be confirmed there the floor merges on an authored rate named as
authored. **P-4, trap depth and η(γ̇): parked at zero cost** — both derived, neither wired, no consumer.
`D13` and `D14` are kept *out* of that table on purpose: they look unresolved and neither is physical, and
a physics register that accepts anything unresolved has a bound that means nothing.

**§11 — what the tools model, and what they refuse to.** The beat is arithmetic and may be described. **The
performance is not the tool's and never will be** — which slot a syllable lands in, whether a writer leans
early or late, what a line does in a mouth. A writer writes to the beat; the tool does not write to the
writer, and never synthesises a performance from what is typed. The guard is deliberately narrow, because a
broad "does not model performance" assertion cannot be written and a guard that cannot fail is decoration:
it fails on a public function returning a syllable→onset assignment, on a `pace()` field named for
placement, or on one carrying an entry per syllable. The grid's own onsets stay legal — those are the beat.

**2.21 — the swipe test bed (Rhyme), and the dead band is the yield stress.** Roadmap item #6, built on
bank rows only because that is what a test bed is. Not this tool's code; the law, the substance and the
guards are shared, and the finding travels.

**The gesture is the yield criterion, not a gesture with a physics label on it.** Finger travel maps to
applied stress at one authored anchor — `SWIPE_YIELD_PX = 30`, the distance at which the stress reaches
τ₀ — because SPINE.md §10 P-2 says nothing carries px into a substance's units and each consumer must
name its own. Everything after that is Herschel-Bulkley: `shearRate` is exactly **0** below τ₀, so the
row does not move at all through the first 30 px, and the transmitted fraction `(τ−τ₀)/τ` times the
imposed travel is **identically `d − 30`**, so past yield it tracks the finger 1:1. A dead band and then
an ordinary swipe — derived, with one authored number in it.

**The dead band is also the tap/swipe discriminator, and that is the part worth keeping.** Inside it
there is no movement to capture and no default to prevent, so `remove`, the stones button and the page's
own scroll all stay live through a light drag. The usual heuristic — a px threshold plus a timer — is the
same idea with an invented constant; here the constant is the substance's, and the guard asserts the
ordering (`preventDefault` and `setPointerCapture` both sit *past* the yield point, never before).

**The ceiling is derived, in the shape 2.16 established.** `k·γ̇ⁿ = τ₀` — the crossover this system has
tracked since 2.10 — is `τ = 2τ₀`, which under this map is **exactly 2·`SWIPE_YIELD_PX`** of travel. So
committing at an offset below the yield distance keeps the whole gesture yield-dominated:
`SWIPE_COMMIT_PX = 26` lands at ratio **0.867**, **13.3% of headroom**, against `LOCK_V0_MAX`'s 14.4%.
The guard fails the day the commit distance reaches the yield distance, so the margin cannot rot.

**Released short of commit, the row returns — and the return is a driven flow, not a recoil.** Flow past
τ₀ is irreversible; a spring-back would be the material claiming an elasticity it does not have, which is
L13's closed line arriving through an easing curve. What returns the row is the same yield law driven the
other way: the substance's cessation easing, over a duration that scales with the distance left to cover.
`SWIPE_RETURN_MS = 260` is that duration at full commit distance, authored and named.

*And one removal now has one vocabulary.* Both paths — button and swipe — go through one `remove()` that
pinches (L11), because the same irreversible action rendering two different physical vocabularies
depending on how it was triggered is precisely what 2.16 refused. Banked-word removal now matches draft
removal, which it did not before.

*The pinch guard was a typed count and a correct change failed it.* `spine.test.js` asserted
`pinch` call sites `=== 1` — the 2.15 class again. L11 does not say one action is irreversible; it says
the vocabulary belongs to the ones that are. It now asserts the property: every call site's own callback
names a removal, so a third real removal passes and a pinch on a save or a toggle fails.

Rhyme: **96 tests** (was 91), five new. `--slide` registered in §6b as tool-local, per the 2.13 boundary;
it carries the **transmitted** travel rather than the finger's, so the yield stress is visible in the
token itself. **Open risk, unresolved and stated:** this is a test bed. Nothing yet says the gesture
generalises past bank rows, and a dead band that is right at 56 px of row is not automatically right on a
draft line, a shelf row, or anything that scrolls horizontally.

**2.22 — L13 is worn, and the law that was written first was measured wrong the whole time.** Roadmap
item #7. Rhyme's draft face carries an ambient floor; **this tool carries none, by the law, and the
auditor now actually measures that.** L13 goes **UNADOPTED → IN FORCE** and the register reads **9 in
force, 0 diverged, 0 unadopted, 4 unmeasured**.

**The finding is in the auditor, not the floor.** `readTool` handed every measure `{raw, own}` and no
name. L13 is the one law whose measure reads the name — its grant is per tool — so `/Rhyme/.test(undefined)`
was false on every run since 2.15 and the auditor answered *withheld* for **both** tools, which is why it
printed UNADOPTED rather than a divergence and why nothing noticed. Its four synthetic guards each built
their own `{name, own}` and passed. **That is 2.7's hardcoded `SIBLING` one level along: a measure
verified against its fixture instead of its call path**, and it surfaced the only way it could — a
correct, granted, guarded floor reading DIVERGED. `readTool` and `TOOLS` are exported now and the suite
asserts the shape the *runner* produces, so the fixture and the call path cannot drift apart again. A
second, smaller half: the measure counted `function ambientFloor(` as a call site. Split by branch, and
the asymmetry is the law's — a generator sitting in **this tool's** source is the violation whether or
not anything calls it (the only reading under which the withholding cannot be walked back one commit at
a time), while in Rhyme the definition is not a call site and L8's guard is owed at each call.

**P-3 ran its one pass and is closed.** SPINE.md §10 said one citation check at the moment the floor was
built and not before; that is exactly what it cost. **Confirmed:** in the viscous regime the coalescence
bridge radius grows **linearly** in time (Eggers, Lister & Stone, *J. Fluid Mech.* **401**, 293–310,
1999). `√t` is the **inertial** law and this substance is nowhere near it. Two things came back with it,
both in SPINE.md §9. The **logarithmic correction is measured and dropped**: it is an early-time
asymptotic, `−t·ln(t/t_v)` turns over at `t/t_v = 1/e` and then predicts the bridge shrinking, and a merge
rendered to completion runs past that — an asymptotic outside its regime, the 2.8 and 2.10 error class.
And the **absolute rate is not derivable, measured rather than asserted**: the magnitude is `γ/η`, `η` is
the apparent viscosity, and it depends on the shear rate the merge itself sets — `γ̇ = 0.01` gives
`5.8×10⁻⁵ px/ms`, `γ̇ = 10` gives `3.0×10⁻² px/ms`, **417 seconds against 0.8 for the same 24 px bridge**.
That is P-4's `η(γ̇)` arriving as a consumer and demonstrating why it was parked. The magnitude is
authored, the linearity is not, and the guard proves linearity by **doubling** rather than by matching
source text.

*What the floor is, in one line each.* Its own canvas at `z-index: -1` inside `.bars`, so it is a layer
under the material and never over a bar — `.bar` carries `--heat`, a measured value, which L13 bars a
floor from. Colour from the mineral tokens only: no literal, and an unresolved palette paints **nothing**
rather than an invented accent (L6). Ungated, unmodulated, lawful at zero modulation, which is what makes
L13 a grant and not the gated-motion case. Reduced motion gets **one painted frame and no rAF at all** —
a static frame, asserted by driving the shipped code, not by reading it.

**And the standing rule was broken two releases running: CI was red and this file said green.**
Rhyme's run **50 (2.20) failed** — *"Regenerate from tome-src and check nothing drifted"* — and 2.20 was
reported here as green off the local gates, which is the one thing the rule about reading CI through the
API exists to prevent. It is on the record as a wrong report, not a footnote. **What it was hiding is
worse than a stale stamp:** 2.20's committed `index.html` bumped its two stamp sites and **carried none
of the source change 2.20 made** — the §11 performance rule added to `tome-src/10_engine.js` is absent
from that commit's artifact. It shipped a stamp and nothing else. 2.21 then shipped an `index.html` at
`build-20260909214145` against an `sw.js` naming `tome-build-20260909212530`. Both are the same defect:
the suite ran **before** the build, and the copy that followed was stale or partial. Every assertion had
passed, against the previous state. **The existing stamp assertion was never missing — it ran at the
wrong moment**, and no assertion placed after a stale copy can close an ordering hole.

*Two wrong instruments were tried first and both are recorded.* The first compared the repo root against
`dist/` with nothing guaranteeing `dist/` existed; it is not committed, so on a fresh checkout **CI failed
on the guard rather than on the code — 101 of 102, the one failure mine.** The second added a `pretest`
that built **and copied** `dist/` over the root. That one is worse than useless: it would have
**laundered** the drift, on CI as well, repairing a stale committed artifact in the working tree and then
passing every comparison downstream of it — a gate that repairs what it exists to detect. Caught by
asking what it would do to the *previous* release rather than to this one.

*What is in force.* `pretest` builds and **never** copies, so `dist/` always exists and is always fresh
while the copy into the repo root stays a deliberate act; the guard then requires the committed
`index.html`, `sw.js` and `manifest.json` to be **byte-identical to `dist/`**. A committed artifact that
is not what a build produces fails, whatever order anything ran in — and the guard asserts `pretest`'s
exact text, because the copy is the thing somebody will add back. Verified to bite on a stale worker
(two failures, the pre-existing stamp check and this one). The branch tip is consistent and reproduces
byte-for-byte; the two intermediate commits are not deployable and are left on the record rather than
amended away.

*And the floor was the wrong size on screen while every guard read green.* Driven in Chromium — the
standard this system claims and had not applied to its own new surface. `size()` measured `.bars` once
at mount, when a fresh draft has none, and nothing re-measured: **356×44 px** behind a face several times
that. A `ResizeObserver` on the container is the fix; a canvas whose backing store comes from a
measurement needs an observer on the thing it measures, or it is sized to a moment.

*Then where it sat was measured too, rather than argued.* Inside `.bars` the floor moved **0.81%** of
pixels at a mean **1.18 L\***: the bar cards are opaque and a floor between them has nowhere to show —
present, and effectively absent, which is what P1 and 2.1/P4 both refused to ship. Behind the whole face
it moves **28.35%** at a **median 0.42 L\***, p99 3.03, p999 8.66, max 22.65, with only 41 pixels past
10 — a broad sub-threshold wash with rare brighter cores, which is what a floor is. **The authored alpha
was never the lever and was not touched; the coverage was.** Widening beats brightening, and the
difference between those two is the difference between fixing a placement and tuning a number toward a
wanted picture. Both figures are from one frozen page load, toggling the canvas only, so nothing else
could have moved.

Rhyme: **103 tests** (was 96). This tool: `test/occvm.js` **412 → 416**; §6's total **762 → 766**.
**Read CI through the API before reporting a release green.** It is written in §10.1 and in the 2.7 entry
and it was still not done here.

**2.23 — Reading B, the last roadmap item, and it is a decision rather than a derivation.** Rhyme's whole
draft face carries the beat, not just the tempo control. Not this tool's code; the law and the clause it
turns on are shared.

**Gated motion, and L13's one clause about it is the whole design.** The gate is the *actual* value,
never its display fallback. `TempoPanel` keeps `tempo || {bpm: 90, …}` so it can render before a tempo
exists; if the pulse read that, a draft nobody had set a tempo on would beat at 90 forever. Measured in
Chromium: with no tempo the face reads `--pulse` **0.000** and the wash resolves fully transparent; after
one `+5` the control reads **95 bpm** and the pulse peaks at **0.993 on 21 of 120 samples** — the hook's
18% strike window, decaying 0.86 → 0.

**What it claims, stated because it is the whole question.** The tool knows one thing: a number typed
into a panel. No audio, no clock aligned to any track, and §11 says the performance is never its. A pulse
on the control claims *this is the number you set*; a pulse across the face makes a larger claim on the
same evidence. **My recommendation was not to build it.** It is built at full scope **by the owner's
decision**, recorded as one — the standard SPINE.md already applies to the floor contradicting the
substance and to every authored duration here. It is not dressed as a derivation.

**Amplitude measured, not eyeballed.** At peak the wash moves **22.4% of the face at a mean 1.00 L\*,
max 4.47** — a 114 ms strike inside a 632 ms beat. It paints on the element's own background, so it sits
under every in-flow child: no bar, no `--heat`, no measured value has it drawn over, and the guard checks
that no `.bar` rule reads `--pulse`. Under reduced motion the phase stays 0 across 120 samples **and**
the resolved `background-image` is `none` — a still face from the hook and the stylesheet independently.

*One find on the way.* The obvious class name, `.face`, was **already declared in the stylesheet and worn
by nothing**, so the new element would have silently inherited `.face + .edge`'s margin. Renamed to
`.draftface`; the orphan is **recorded rather than adopted**, and the guard pins that nothing wears it —
`OCCVM-D14`'s shape one level down, in tool-local CSS rather than in the primitive set.

Rhyme: **106 tests** (was 103). **The roadmap is complete: items 6, 7 and 8 are built.**

**Deployed.** The hold ran to the end of the roadmap, as instructed, and was lifted by the owner on
2026-09-09. `main` took the branch as one merge commit in each repository (`1463a8a` here, `268ff6b` in
Rhyme). Verified by stamp, never by feature grep: `btc-terminal.pages.dev` and the GitHub Pages fallback
both read `build-20260909203905` within 10 s; Rhyme's GitHub Pages read `build-20260909221939` at 30 s.
This tool's live surface moved from 2.12 to 2.17 in one step — the meniscus and its recess were already
worn at 2.12; what lands now is L13's boundary, the velocity-driven lock release, and the canvas reading
the sun. Rhyme's moved from 2.12 to 2.23: the true swing grid, both readings of the beat, the swipe test
bed, and the floor.

**2.24 — the field report: three defects the guards never saw, and the roadmap's visual intent delivered
a second time.** From the owner's first hour on the deployed build.

**"We're visually still displaying crystal fractals."** True, and this tool is where it showed most —
the whole body background. 2.8 wrote that the vein layer had become "a network suspended in the
material, blurred where it was crisp"; that was true of the *mechanism* and false of the *picture*, and
nobody had rendered the picture and looked. `field()` draws a wide blurred underlayer **and a 1.3 px
crisp bright trace on top**, of a lattice aggregate whose every segment is at 0°, 45° or 90° — a
snowflake, since 1.1. Worse: `field()` read `o.fine || 1.3`, so passing `0` to turn the crisp pass **off**
silently restored it, and four "diffuse" variants measured identical edge energy before that was found
by measuring rather than reading. `veins.js` now honours 0. **This tool draws the mass alone** —
`wide:10, fine:0, soft:7` — measured on the live page at **41% of pixels, mean 1.08 L\***, max 4.7: a
turbid wash, which is what a gel is at screen scale. Guarded in three directions (`fine:0` draws one
pass, the default still draws two so the change is the caller's, and `veinLayer()` passes 0). **Rhyme
retires the layer from its slabs entirely** and puts the globule field there instead — two decorative
layers on one surface is noise.

**"Hadn't we run through the roadmap resulting in globules as the visual layer?"** We had produced them
as an *underlayer on one face* at a median 0.42 L\*, by an alpha I authored and then wrote up as a
virtue, while the crystal stayed the layer that showed. Inverted from the roadmap's intent. Now the
globule field is the substrate layer on **every** Rhyme slab — live on the draft face (L13's grant), a
still frame on every other face, which is not motion and leaves the grant's scope where it was — at
**0.24**, chosen from a five-point sweep on a live slab (0.05 → 0.78, 0.10 → 1.43, 0.16 → 2.20, **0.24 →
3.21**, 0.32 → 4.20 L\* mean) to sit above this tool's vein wash and below a beat strike. The count follows
slab area rather than a fixed seven. `veinSVG`, its cache and its bezier fallback are deleted from Rhyme
rather than left declared.

**"No visible effect to setting a bpm."** Reading B measured a mean **1.00 L\*** at peak — what 1 L\* is on
a phone is nothing — and the strike lasted ~7 frames. Re-aimed on a four-point sweep: 9% → 1.66, **25% →
5.05**, 40% → 8.36, 55% → 11.65; 25% matches Reading A's measured 5.9 on the control, so face and control
state the same beat at the same weight. The strike window goes 0.18 → **0.32** of the beat (35 of 120
samples non-zero at 95 bpm). Re-measured after: peak 0.996, **4.6 L\*** mean over the moved region.

**"When cutting a bar, after the first character the space bar doesn't work."** `reading()` trims each
line before building a bar, and `BarCut` was a controlled input bound to `bar.text` — so the space that
made `"ink "` was erased by the same render that reacted to it. Pre-existing since bars existed, not the
roadmap's; no test had ever typed a space into a bar and looked. Reproduced in Chromium on the deployed
build (`"ink on the plate"` → `"inkontheplate"`), fixed by binding the editor to the raw line.

**"Dead band feels alright."** The one measured thing that reached a thumb. Recorded.

*The pattern across all four.* Every one of these was a value or a picture the guards had verified against
a fixture, a fallback, or a claim — never against an eye or a thumb. `test/occvm.js` **416 → 419**; §6's
total **766 → 769**. Rhyme **108 tests**.

**2.25 — this tool takes the globules, and the vein layer leaves both tools.** The owner's call, three
words: *also takes the globules.* The field is now the substrate layer everywhere, from **one shared
part**, `occvm/globules.js` — Rhyme paints it live on the draft face and still on every other slab; this
tool, which L13 withholds motion from, writes the same field once as a data URI, `--globules`, where
`--vein` was, on `body::before` and every `.tile::before`. `veinLayer()` and `veinLayerLegacy()` are gone;
`globuleLayer()` has **no drawn fallback** — an unspliced generator writes `none` rather than an invented
layer, which is L6's rule applied to a layer, and the guard reads the write.

**The vein layer is retired from every target.** With no tool rendering a vein, `veins.js` is retired by
the splicer's own mechanism (2.8) from `index.html`, the reference surface and Rhyme's engine, and stays
in `occvm/` unspliced as the generator L10's record cites — its DLCA mechanism was real and its dimension
was measured, and the Node tests that measure it still run against the file. `--vein-density` retires
with it: a token reaching nothing is D12. `--vein-hi`/`--vein-lo` stay; the field is tinted from them,
which is how the mineral switch reaches it (the 1.4 guard now reads ruby's tint out of the field).

**L10 re-authored around what renders — and its measure with it.** The old measure counted calls to a
drawn-bezier fallback and read CONFORMS for a tool whose grown veins rendered as a crystal, then CONFORMS
again for a tool that had stopped rendering veins at all: it could not tell *grown* from *absent* and was
never measuring the law. The new one measures the consumer — each tool must call `OCCVM_GLOBULES.field`
or `.svg`, and none may call the vein generator or the fallback it once guarded. **Both CONFORM; 9 in
force.** The reference surface's L10 specimen is three seeds of the field, and its own ground takes the
first.

**The weight is this tool's own, measured on this tool's own ground.** Through `body::before` at .55 and
the tiles at .16, one frozen load, `--globules` toggled: **0.12 → 1.01, 0.24 → 1.80, 0.36 → 2.71, 0.50 →
3.79 L\*** mean over the moved region (max 18.8 at 0.50). `GLOBULE_ALPHA = 0.36` — between the diffuse
wash it replaces (1.08) and Rhyme's slab (3.21), because a page ground under live numbers earns less than
a document face (§7.6). The same alpha weighs differently on the two surfaces, which is exactly why it is
not a spine constant.

*Golden set re-recorded:* BTC's `--vein` becomes `--globules`, Rhyme's and the reference's token lists
move with the retirement. `test/occvm.js` **419 → 424**; §6's total **769 → 774**. Rhyme **108 tests**.

**2.26 — the open question from 2.25, closed by measurement instead of by a device.** 2.25 shipped with
this line: *"if it reads as noise beside the tape, the number to move is `GLOBULE_ALPHA`."* That was a
measurable question answered with a shrug, and the owner said so. It is measured now, and **nothing
moves.**

**The field IS overlaid on the sweep**, which is worth stating because it is easy to assume otherwise:
`.tile::before` is `position:absolute`, and a positioned pseudo-element paints **above** its box's
in-flow content — so the decoration sits on top of the canvas and every win/lose mark on it, screened.
That is precisely the trade §7.6 forbids and the reason L13 withholds *motion* from this tool.

**Driven in Chromium across five states** — ABOVE winning, ABOVE losing, BELOW winning, no-call, and the
swing-activated inversion §5 designs to be most saturated — with the overlay toggled on a frozen page and
the sweep driven through `renderSweep()` on synthetic state:

- **The marks themselves never move**: ΔL\* ≤ **0.07**, Δhue ≤ **3°**, every class, every cell.
- **Local contrast to the substrate beside them** loses **0.0% to 4.9%**, worst case gilt in one cell.
- **Every mark keeps > 22 L\*** of local contrast; ruby in the swing view is the tightest at 22.9, and
  unmoved.

**Why, and it is structural rather than lucky.** `screen` is self-limiting on bright ink:
`screen(a,b) = 1 − (1−a)(1−b)`, so the lift is `(1−a)·b` — it **falls as the mark brightens** and vanishes
as `a → 1`. The field lands on the substrate and gets out of the way of the ink. Nine assertions pin that:
the blend mode, the two weights the measurement was taken at, and the arithmetic itself at the four marks'
own linear luminances, so the *reason* is in the suite and not only the number. Verified to bite —
`screen` → `normal` fails two, a raised weight fails one.

*A method correction, recorded because the first number was alarming and wrong.* The first pass paired the
dimmest pixel of a mark against the brightest globule **anywhere in the frame** and reported ruby at
**−18%**; those two pixels are nowhere near each other, and measured locally the same cell is **−0.0%**. A
global worst case that describes no pixel pair that exists is not a measurement of legibility. The
alarming number was mine, not the tool's.

*And the guard block itself did nothing on its first run.* Appended past this file's closing
`process.exit(done())`, it never executed and the suite reported **PASS** at an unchanged count — caught
by watching the count rather than the verdict. `test/occvm.js` **424 → 433**; §6's total **774 → 783**.
No code in this tool changes: the measurement's whole output is that the shipped values are right.

**2.27 — the palettes, and `PAL` finally reads the page.** From `PIGMENT-PALETTES.md`, executed in its
own stated order; `GLOBULE-BUILD-PLAN.md` §7 makes the canvas fix step 1 and the palette document §5 says
plainly that **palettes and that fix are the same piece of work**. They are, and neither half works alone:
a palette that writes CSS custom properties reaches nothing on a canvas whose colours were thirteen
literals evaluated once at load.

**The closed set died with the crystal, nineteen releases ago.** L6 read *"the mineral set is frozen"* and
named three — amethyst, malachite, ruby. That set was closed **because under aragonite a colour had to be
a mineral that exists with that colour.** The crystal left at 2.8 and the vocabulary did not notice. A dye
is not discovered, it is chosen. `occvm/minerals.js` is retired by the splicer's own mechanism and leaves
`occvm/` outright — unlike `veins.js`, whose generator L10's record still cites, nothing cites a mineral.

**What is frozen now is the relation, not the hex.** Green is positive, red is negative, gilt is
authority, verdigris-adjacent is active — in every palette. A palette is a choice of *which* green and
*which* red. That is what makes it safe where 1.4's decorative accent was not: 1.4 kept the mineral off
every surface §5 governs because an accent beside a win/lose colour is §7.6's trade, and a palette
supplies the win/lose colours themselves. **The evidence is a measurement, not the sentence above:** the
smallest positive/negative separation across the five is **CIEDE2000 62.3** (`sunset`) against this
build's own **73.1**. `OCCVM_PIGMENT_SEPARATION` records the table and the suite asserts it per palette,
so narrowing that gap means re-recording the number rather than absorbing it.

**Six values per palette authored, seven derived, and the anchor makes "no-op" a measurement.** The four
fixed roles and the decorative accent and highlight are authored — no hex among them comes from a
spectrum or a measurement, and they are labelled authored for the same reason `LOCK_RELAX_MS = 360` is.
The seven ramp members are derived by `occvm/tools/derive-pigments.js`: each is its authored parent moved
by the offset (ΔL, chroma ratio, Δh in CIE L\*C\*h) **the shipped build already puts between that same
pair**. `--malachite-lo` under a teal positive is not a design choice, it is this system's own ramp
re-hung under a new hue; authoring twenty more hexes by eye would have been inventing colour the plan
never specified. `obsidian` **is** the anchor, so the derivation applied to its six authored values
reproduces all seven derived ones **byte-identically** — asserted, which is what makes selecting obsidian
a no-op rather than a claim. Two independent checks came free: the palette document authors a *third*
decorative value for three of the five and the derivation never saw it, yet agrees to **ΔL ≤ 3.6, Δh ≤
6.3°**; and its decorative tables are **not** ordered by lightness, so which of its three becomes accent
and which becomes highlight is decided by measured L\* and the ladder is asserted monotone in all five.

**One measured negative, on the record rather than tuned away.** `active` is pinned verdigris-adjacent and
three palettes author it 4–16° off that hue — closest to `positive` in `sunset`, **1° apart**, separated
by lightness alone. This build's own positive/active separation is **CIEDE2000 14.8**; `sunset` reads
**11.7** and is the only palette below it. Rotating its `active` onto the verdigris hue was tried and
reaches **13.6** — still short, because the limit is its low-chroma green `positive`, not the hue of its
`active`. Clearing the floor would mean re-authoring a role hex by eye, which this system refuses
everywhere else, so it ships as authored and the number is in the source and pinned as the only one.

*And my first alarm about it was measuring the wrong axis.* I read the hue angles, saw 1–7°, and called it
a legibility risk. In CIEDE2000 the shipped build itself sits at 14.8 with 20° of hue — lightness was
carrying most of that separation all along. The hue reading described no pair a reader could confuse; it
was 2.26's global-worst-case error in a different coordinate.

**`PAL`, and the defect inside it that had nothing to do with palettes.** 2.17 wired two of thirteen keys
to the resolved page because those two were all the sundial moved. A palette moves eight more, so ten now
resolve on `sunTick`'s beat and on every palette change. **`UPC` and `DNC` were `const` snapshots taken at
parse** — every call-keyed colour on the sweep, the one place §5 calls a wrong colour the most dangerous
bug this tool can have, would have gone on painting whatever palette was active when the file loaded.
They are `let`, reassigned in `palTick`, and the suite pins both directions so a revert to `const` fails.

*The 2.17 guard refused three keys and was right.* My first `PAL_LIVE` listed all thirteen; the harness
failed on `--field`, `--bone-dim` and `--bronze-a`, which are fixed `:root` declarations nothing writes.
Resolving those once a minute is a no-op pretending to be a light, which is exactly what 2.17's rule
forbids. They stay literals, and that is now asserted as a negative rather than left to drift back.

**Four guards retired deliberately, each with its reason, none quietly.** Retiring a guard is the move
this project distrusts most, so every one is named. (1) **1.9's `--ruby-lo` pin** — deleted at 1.9 as dead
weight, declared and referenced nowhere. It is not dead now: `PAL` carried `rubyLo:"#6b1a2e"` as a bare
literal with *no token to resolve from*, which is the restatement L6 exists to catch sitting in the one
file the measure could not see until 2.17. Only that clause goes; `--glass-hi` and `--warn` stay pinned,
and `--ruby-lo` is held to the stronger property instead — written by the palette **and** read by `PAL`,
so it cannot go dead a second time. (2)–(3) **2.17's two `PAL_LIVE` assertions** — *every live key is a
token the sundial writes*, and *the outcome colours are not among them*. The first would refuse a correct
wiring; the second pins the exact behaviour this release changes. Replaced by: a live key must be written
by **something**, and the providers are enumerated from `sundial.js` and `OCCVM_PIGMENT_TOKENS` rather
than typed — plus the sharper half, that an outcome colour is live because the *palette* moves it and
never because the sundial does, since a sundial-written outcome colour would mean the light had acquired
an opinion about win/lose. (4) **the D6 mineral block**, whose load-bearing negative was that a mineral
switch never touches `--malachite`/`--ruby`/`--up`/`--down`. A palette does, by design, so porting it
would have failed on correct code — the 2.15 and 2.21 class. What replaces it is the property that made
the widening admissible in the first place, measured per palette.

**The L6 measure re-authored, and the §2ad condition finally checked.** The old measure asked whether a
tool restated one of three mineral *accents*, granting malachite and ruby as outcome colours that happened
to share those hexes. Under palettes that distinction dissolves. It now asks the only question left —
whether a tool carries a second source of truth — in two ways: a **non-default palette's** hex typed into
a tool diverges (and the detail names which palette it leaked from), and a `:root` fallback of a
palette-written token that has **drifted** from the default palette diverges. §2ad permits those fallbacks
on exactly that condition, because a page must paint an outcome colour before the part runs and jsdom
resolves no custom property at all — and **nothing checked the condition until this line existed.**

**`SPINE.md` gains §2ad, a fourth row in the 2.13 boundary, and it is a real gap the boundary did not
have.** Until now exactly one spliced part wrote tokens, so "written by the sundial" and "written by the
spine" were the same sentence. `pigments.js` breaks that: thirteen tokens written at load and on change,
each keeping a `:root` fallback that genuinely renders until the part runs — so neither §2ab (defined by
having no surviving default) nor §2a (fixed values). `--pigment`, `--pigment-lo` and BTC's tool-local
`--pg` are registered in §6b; the census refused the change until they were, which is the boundary working
rather than describing.

**The token auditor had L6's 2.17 blind spot one level along.** `PAL_LIVE` is `{mal: "--malachite", …}`
and `palTick` resolves every value through `getPropertyValue`, so ten tokens are consumed by a loop no
regex could see — the token is the map's **value**, and both existing object-literal rules match a token
as a **key**. It reported `--ruby-lo` as dead weight on the very run that introduced it, which is that
file's own opening paragraph happening again. Syntax cannot say whether a value-position token is read or
written, so the two maps are named rather than sniffed, per that file's stated rule for adding a way.
*And its `PARTS` list had gone stale twice over* — still naming `veins.js` and `minerals.js`, never having
gained `serif.css`, `reading.css`, `rheology.js`, `globules.js` or `yield.js`, so five spliced parts'
tokens were being attributed to the tools carrying them. It reads the splicer's own list now.

**The reference surface caught the one thing the harnesses could not.** Its L6 specimen still called
`OCCVM_MINERALS`, and the page threw on load — the golden recorder refused to record a dead page, which
is the failure mode it exists for. The specimen is now five palettes, each printing its four fixed roles
over its decorative ladder with its own measured positive/negative ΔE beside it, because that number is
the whole safety argument and printing it beats promising it. Its token-provenance table reads the palette's
own list rather than the four names typed there at 1.4. `golden` **540 values, verified**.

**What actually renders, measured rather than argued.** Chromium, rAF and the 1 Hz loop frozen so nothing
but the palette can move a pixel, each palette diffed against `obsidian` over the full 1100×1400 frame:

| palette | pixels moved | mean ΔL\* | p99 | max |
|---|---|---|---|---|
| astro | 11.58% | 0.34 | 1.83 | 2.41 |
| deepwater | 13.91% | 0.39 | 5.83 | 6.35 |
| acid | 12.73% | 1.06 | 18.98 | 20.93 |
| sunset | 15.60% | 1.55 | 5.78 | 6.93 |

**`astro` moves least and that is the plan's authoring, faithfully executed rather than corrected.** Its
four fixed roles are `#3fbf7e / #e0475f / #ffe9a3 / #3f9a86` — obsidian's, verbatim — so astro and
obsidian differ **only** in the decorative layer, and a reader choosing "the original, red-orange wax in
clear liquid" gets a change of about a third of an L\*. Recorded rather than repaired: the four roles are
§2's fixed set and re-authoring one by eye is the thing this release refused for `sunset`.

*Selection is a real preference in both tools, persisted, and a pre-2.27 stored `mineral` migrates once —
to `obsidian`, the palette that preserves what that reader was looking at — with what it migrated from
kept beside it and the old key deleted so it cannot re-fire.* BTC's picker is five swatches in
Settings → Advanced, each unselected one wearing its own palette's accent through `--pg` while the
selected one drops it and reads the live tokens, so the row shows four offers and one applied state.
Rhyme's is the same five in prefs. The choice cannot travel between the tools — `localStorage` is
per-origin and they are served from different ones, which L6 has recorded since 1.4.

`test/occvm.js` **433 → 484**; §6's total **783 → 834**. Rhyme **108 tests**. `13 laws: 9 in force, 0
diverged, 0 unadopted, 4 unmeasured.`

**2.28 — the metaball field, and the substance answers a question the plan left open.**
`GLOBULE-BUILD-PLAN.md` build order step 2: *"static globules at λc, metaball-rendered. Proves the
rendering path and the size scale before anything moves."* Executing it turned up an identity, two real
rendering defects, and an answer that settles step 5 before step 5 is built.

**γ/τ₀ IS λc, by construction rather than by luck.** Two drops of a yield-stress fluid begin merging
exactly as a Newtonian pair does — the bridge grows linearly in time — and then either close or **arrest
at a finite height**, freezing a permanent non-spherical shape. The competition is capillary stress γ/R
against yield stress τ₀, so the boundary radius is γ/τ₀. Measured: **γ/τ₀ = 7.1480 px, √(γ/ρg) =
7.1479 px, τ₀/ρg = 7.1478 px — the same number.** Not a coincidence: 2.10 fixed τ₀ by the puddle-height
identity, so γ/τ₀ = γ/(ρg·λc) = λc follows. The plan asks whether the field landing on λc is *"a lucky
coincidence or something to tune deliberately"*; it is neither, and it cost nothing to settle because
both halves already shipped. Asserted from the three formulas rather than the digits, so it survives a
change to γ or ρ and fails the day τ₀ stops being what that identity produces.

*Source, and a correction to the plan.* Kern, Sæter & Carlson, "Viscoplastic sessile drop coalescence"
(arXiv:2203.15617): the bridge height evolves as `h₀ ∼ t` "before arresting at long time prior to
minimizing its liquid/gas interfacial energy", with the arrested profile set by the **Bingham number
`τ_y·h_drop/σ`** modified by the drop's aspect ratio — which is R/ℓ inverted, so the criterion's form is
the source's rather than mine. The plan lists "Kern et al." and "arXiv:2203.15617" as two corroborating
sources. **They are the same paper**, and two citations of one result is one result.

**The two yield stresses give opposite answers, and they are not competing — they bracket.**
`rheology.js` has carried an unresolved pairing since 2.10: τ₀ static 21.15 Pa beside the dynamic
Herschel-Bulkley intercept 4.41 Pa that `k` and `n` were fitted with, recorded there as unresolved
"rather than resolved". Arrest is the first consumer that forces it, because γ/21.15 = 7.148 px says
every globule here arrests and γ/4.41 = 34.281 px says every one completes. Read as a hysteresis both
are right and each governs its own moment — the bridge **keeps flowing** while the drive exceeds the
**dynamic** stress; the arrested shape **stays put** while the residual is below the **static** one.
Two lengths, three regimes, no third constant:

| merged radius | what happens |
|---|---|
| < 7.148 px | nothing can hold the shape — the merge **completes**, one round globule |
| 7.148 – 34.281 px | the bridge grows and then locks — a **dumbbell** with a real bridge |
| > 34.281 px | the drive is under even the dynamic stress — **barely joined** |

*And 4.41 was a number in a comment.* It has been named in `rheology.js`'s own prose since 2.10 and was
unavailable to code, so any consumer needing it had to retype it — L3's defect, in prose. It is
`SUBSTANCE.tau0Dynamic` now.

**What the shipped field actually produces, and the band does not move.** Over 40,000 pairs drawn from
`R = [9, 30]`: **0.00% complete, 96.2% dumbbell, 3.8% barely joined.** The plan warns that "a system
that always completes merges is simpler and wrong". This substance at this pixel scale says the
opposite and says it decisively — the frozen dumbbell is not the rare case, it is the case. Completion
needs **both** drops under 7.148 px, since a merged radius never beats its larger parent; dropping the
floor from 9 px buys 0.00% at 5.673 (the largest floor whose own twin-merge could complete), 0.69% at
4 px and 2.68% at 2 px, while changing a look measured and approved on the page at 2.25. **Moving a
measured value to manufacture an outcome the substance does not give is what P1, 2.1/P4 and 2.16 each
refused, and this is the same refusal.** The model expresses all three regimes as real functions of the
radii; the substance selects among them. That is the difference between a model that *can* express both
outcomes — which is what the plan asks for — and a picture arranged to show both.

*A constant used outside its regime, recorded because step 2 walks straight into it.* The shipped λc is
the **air** interface's, √(γ/ρg). A globule suspended in a near-density-matched liquid — what a lava
lamp is, and what the plan's own §0 establishes — has √(γ/(Δρ·g)), and Δρ is the one quantity such a
lamp designs toward zero, so the length diverges: 7.1 px at Δρ = ρ, 30 px at Δρ/ρ = 0.056, 101 px at
0.005. Sizing a suspended globule with the air-interface value would be the 2.8/2.10/2.22 error class.
The **arrest** lengths are unaffected — γ/τ₀ carries no g and no density at all, which is why they are
the ones used. Inverted as a check rather than adopted as a derivation, the authored 30 px ceiling
implies Δρ/ρ = 0.0567; secondary sources put a real lamp's contrast at roughly 0.022–0.056. Those
sources are secondary, the bracket is reported as a bracket, and **no constant here comes from them.**

**Merge conservation: `r³ = r₁³ + r₂³`, decided and recorded.** The plan leaves it open and every number
above depends on it. Volume rather than area: the drops render as spheres in projection, and the 3-D
convention is what drop-coalescence simulation uses. Under the 2-D alternative the same pairs read
0.00% / 98.9% / 1.1% — the same verdict. Rhyme's floor had shipped the area convention locally; it reads
`OCCVM_GLOBULES.merged` now, because two conventions would put the renderer and the physics on
different drops.

**The rendering: blur + threshold, the plan's own first recommendation.** Blinn, "A Generalization of
Algebraic Surface Drawing", *ACM TOG* 1(3):235–256 (1982) — sum a density field, draw the isosurface at
a threshold. A Gaussian blur of overlapping filled circles **is** a summed density field and a hard cut
on its alpha **is** the isosurface, so it is one SVG filter rather than a field evaluation. What it buys
is not the silhouette: because fields add, **two approaching drops join with no merge code**, and an
arrested pair is rendered by stopping the approach rather than by a second special case. Rhyme's
hand-drawn bridge quad is deleted — it was geometry standing in for physics, and it could only ever draw
a merge that completes.

*The blur is the substance's own length* (`--occvm-meniscus` = λc = ℓp), not a constant authored beside
it. *The iso-level is Blinn's 0.5*, so the alpha matrix offset is `gain × 0.5` rather than the 18/−7 pair
copied around the web, which is an iso-level of 0.389 that nobody chose. `GOO_GAIN = 24` is authored and
named: it sets how many pixels the surface takes to go from transparent to opaque, and no derivation
fixes it. One `gooFilter()` definition serves BTC's still data-URI SVG and Rhyme's live canvas through
`ctx.filter = url(#…)`, so the live floor and every still frame cut at the same level.

**Two rendering defects, both found by looking at pixels rather than at code.**

*The field was stretching to its box, and had been since 2.25.* `background:var(--globules)` with no
`background-size` resolves to `auto`, and an SVG data URI with a viewBox and no intrinsic width has no
auto size — so the 1200×800 field stretched to fill whatever box it landed in. Measured on a 1100×1400
page: 0.917 in x, 1.75 in y, so **every globule rendered as a 1.9:1 vertical oval**, and a *different*
oval on each `.tile::before`. A drop's shape was a property of the element it happened to land on. That
is not cosmetic here: step 2 is the **size scale**, and a radius stretched by an unknown per-element
factor is not a length — ℓp = 7.148 px cannot mean anything on a surface where 7 px in the field is
12 px on screen one way and 6 the other. The field is generated at the viewport's own size now and
pinned to it with `--globules-size`, so a circle is a circle and a px is a px; a tile shows the top-left
of that field at 1:1. Resizing crops rather than stretches, which is why nothing listens for resize —
cropping is correct, costs nothing, and a regenerating background would be motion L13 withholds here.

*And the first metaball commit erased Rhyme's floor completely.* The isosurface cuts at 0.5, so drawing
the field **at** the display weight of 0.24 puts all of it under the cut. Measured in Chromium on a
25 px disc: filtered at α 0.24 gives **max alpha 0 over 0 non-zero pixels**, against 255 over 1,804 at
α 1. **The screenshot did not show it** — on the slab it was taken from, the floor sits behind opaque
controls, so "looks the same" and "is gone" were the same picture. Caught by probing pixels. The weight
must composite **outside** the filtered buffer, which is the shape BTC's `<g opacity>` already had and
Rhyme's canvas did not; both halves are now pinned, and the guard was verified to fail when the erasure
is put back.

**Measured on the page, rAF and the 1 Hz loop frozen, full 1100×1400 frame against no field at all:**
gradient field 12.76% of pixels at mean 2.98 L\*; metaball field **11.24% at mean 3.16** — slightly
tighter coverage at slightly greater weight, which is what a threshold does. On Rhyme's live floor
canvas, where the threshold acts: **10.31% coverage, peak alpha 61, mean alpha 59.2** — 97% of peak,
which is the signature of a thresholded field rather than a gradient one. Several frozen dumbbells are
visible in the render, produced with no merge code, which is the arrested end state §2 asked for.

`--globules-size` registered in §6b; the census refused the change until it was. `test/occvm.js`
**484 → 508**; §6's total **834 → 858**. Rhyme **108 → 110 tests**, both new ones verified to bite.

**2.28 step 3 — buoyancy, and L13's recorded cost becomes a number.** Not this tool's code; the shared
part and the law are, and the finding travels. The build plan's reframing: **a lava lamp is not one
substance getting restless, it is two immiscible phases in a heat-driven density race** — the wax sits
slightly denser at rest, heat expands it more than the carrier, past a crossover it becomes buoyant,
rises, cools and sinks. *The motion is buoyancy; rheology governs shape and merging, not drive.* Which
makes the drift Rhyme shipped at 2.22 — a random constant direction per drop — the wrong model rather
than a coarse one: it had no bottom, no top and no turnaround.

**The shape is sourced; the speed is authored; the substance says the speed is zero.** Gyüre & Jánosi,
"Basics of lava-lamp convection", *Phys. Rev. E* **80**, 046307 (2009), a real two-fluid lab analog:
blobs rise from the bottom, **attach** at the top surface, then sink — rise, dwell, sink, dwell — with
two modes, one heat-transport limited and one **viscosity-limited with constant periodicity**. The
constant-period mode is taken, so every drop shares one period and differs only in the phase the seeded
field already gives it.

**L13 has recorded since 2.15 that "a yield-stress fluid below τ₀ does not spontaneously convect or
drift". That is now measured.** A globule rises when the buoyant stress `Δρ·g·R` exceeds τ₀. At the
contrast the authored 30 px ceiling implies, that stress is **1.509 Pa at r = 9 px and 5.031 Pa at
r = 30**, against **τ₀ = 21.15** — **14× short at the smallest globule in the field, 4.2× at the
largest** — and the radius at which buoyancy could move anything at all is 33.4 mm, **126 px**, four
times the ceiling and larger than most surfaces the floor paints on. Nothing in this field can rise, by
its own physics, at any speed. That is not a reason to drop the floor (L13 grants it and records the
cost); it is the reason there is no derivation to reach for, so the pace is authored at the magnitude it
already had — `FLOOR_RISE_PX_S = 1.4`, `DRIFT_PX_S`'s number, now vertical and cyclic instead of random.

**One authored number, not three.** The period **follows** from that speed and the surface's own height
rather than sitting beside it, so a tall face cycles slowly and a short one quickly — 523 s on a 300 px
face — which is what a taller vessel does. And the turn at each end rides the substance's **own**
cessation curve (`OCCVM_RHEOLOGY.easing`, derived at 2.8 with its hard stop) rather than an invented
ease: a blob arriving at the top decelerates to rest, and this system owns exactly one curve for coming
irreversibly to rest. *Recorded as one-sided:* it owns no curve for setting off, so the departure
inherits the arrival's rather than a time-reversal being invented, which would be a shape nobody
derived. The curve is sampled **once** — `easing` integrates 4,000 steps, and it is a property of the
substance, not of the frame.

Driven in Chromium on the shipped functions: starts at 0, rises monotonically, holds exactly 1 through
the dwell, sinks monotonically, holds 0. `phase` joins the shared field as a **static** property of a
drop like its radius — a number saying where in the cycle it starts moves nothing on its own, so it is
carried by both tools alike while the cycle that reads it stays in the tool L13 grants motion to.

Rhyme **110 → 111 tests**; three of the new assertions verified to fail against an authored period, an
invented ease, and the old drift restored beside the cycle.

**2.28 steps 4 and 5 — the coil decides where, τ₀ decides what.** One piece of work, because that is the
build plan's own sentence for them. Not this tool's code; the shared part and the arrest model are.

**Recombination happens at a fixed point.** A real lava lamp carries a metallic wire coil at the base
acting as a surface-tension breaker, recombining cooled wax after it descends; free-floating pairwise
merging anywhere on screen is the easier build and is not what the object does. **And the coil needs no
geometry and no authored height**, because step 3 already put one at the bottom: a drop is at the coil
exactly when it is in the bottom dwell of its cycle, which is also when a real lamp's wax pools. Two
drops can only begin a weld while both are resting there. `cyclePos` returns exactly 0 only in that
dwell, so the position function *is* the coil predicate — one function, two jobs, no third constant.

**How far the bridge gets before it freezes is the Bingham number's.** Kern, Sæter & Carlson give the
group — the arrested profile "depends on the fluid's yield stress τ_y and coalescence angle α,
represented by the Bingham number τ_y·h_drop/σ" — not a closed form for the height, and their
aspect-ratio modification is a sessile-drop geometry this floor does not have. So what is taken is the
group and its **direction**, and the falloff `1/Bi` is named as authored. It has the one property that
matters: it reaches a full lobe exactly where Bi reaches 1, which is the completion boundary the *same
group* defines, so the three regimes meet with **no seam and no fourth constant** — asserted by
approaching Bi = 1 from both sides. Measured across the band: a 9+9 pair freezes at **63%** of the
smaller lobe, 15+15 at **38%**, 30+30 at **19%**. A pair of small globules keeps a thick waist; a pair
of large ones barely touches.

**The arrested pair is one stuck object, and that answers the plan's open accumulation question without
inventing a rule.** The plan asks what a frozen dumbbell does — drift off as one object, or pile up at
the recombination point and eventually clog the floor. It drifts off, because that is simply what a
frozen dumbbell *is*: the bridge locked, so the two lobes are bonded and travel together. It is also
self-limiting with nothing added — **a pair that has arrested is done**, since a third arrival would need
the bridge to grow again against a yield stress that already stopped it, so a locked pair never welds
again and the size distribution cannot run away. No cap, no splitting rule, no invented threshold.

**And the first version of that was wrong in a way the render hid.** The follower lobe was given the
leader's phase and left to compute its own height — but a drop's height depends on **its own radius**
(`(h − r) − pos·(h − 2r)`), so two lobes of different size drifted apart over the cycle and the frozen
bridge silently stretched. A frozen bridge does not stretch. The follower is placed from the leader plus
the offset it froze at, every frame: one rigid body. **Found by driving the shipped floor and counting,
not by looking** — the driven run reported **0 frozen pairs** where the arrest branch was firing all
along, because the detector looks for a constant separation and the pairs did not have one. With the
rigid body in place the same run reports **4 locked pairs, and all 4 of the touching pairs are locked**,
which is what a 96%-arrest substance should produce.

*The driven measurement is the guard, not a note about it.* `loadFloor` pumps the shipped `ambientFloor`
through **40,000 frames — an hour of simulated time, 4.3 full cycles** — and then reads the arrest off
the canvas: every drop is one `arc`, and a pair that has arrested holds a constant separation frame
after frame while both move, which two drops that merely passed near each other cannot fake. Guards
verified to bite against merging anywhere instead of at the coil, and against a follower left to drift.

*And the harness caught the stale-artifact hole again.* `spine.test.js` reads the **repo-root**
`index.html`, so the driven test ran against the previous release's floor and reported zero arrests from
correct code. That is 2.22's ordering defect showing up as a confusing measurement rather than as a
green build, which is the better failure mode and the reason that guard exists.

*One more curve moved to module scope:* `cyclePos` and the sampled cessation curve are functions of a
number, not of a canvas, so they sit beside their constants where a harness can drive them rather than
inside a closure it has to infer. `atCoil` stays inside — it reads that instance's own clock.

Rhyme **111 → 113 tests**.

**2.28 step 6 — `--heat` modulates, and two of my own guards were stricter than the law.** The last item
in the build order, last because it is the only piece that touches another tool's live data. Not this
tool's code; the law is, and the guard retirement is the part worth reading.

**L13 named this case before the floor existed.** Its text, unchanged since 2.15: *"a real value may
scale a floor's intensity (Rhyme's `--heat`, read-only, is the obvious first one), but the floor is
lawful at zero modulation, which is precisely why this is a grant and not a case of the gated-motion
rule."* Modulation was never forbidden. A **gate** was. So nothing in the law moves here.

**What was forbidden was in my guards, and they were the wrong shape.** Two clauses written at 2.22 are
retired: one listed `--heat` among strings the floor's source may not contain, the other pinned the
floor's inputs to exactly two — *"the only inputs are the canvas and a stillness that is never a
measured value."* Both assert the **absence of a string**, which is a proxy for "ungated" and not the
property. What replaces them is driven: **the cycle period at heat 0 must equal the period the floor ran
before heat existed — exactly, not closely** — because that identity is the whole of L13's distinction
between a grant and the gated-motion case. Measured: **836,237 ms either way, identical**; full heat
runs the cycle **1.60× faster** and no more; and the guard was verified to fail against a version where
heat *gates* rather than modulates. The rest of the forbidden list stays — no tempo, no pacing, no bpm.

*And that guard had a second defect the change exposed:* it tested the floor's source **including its
comments**, so a block explaining at length what the floor may and may not read failed for saying the
word. The L6 colour guard three tests above already strips comments for exactly this reason; this one
now does too. A vocabulary check that counts its own prose is a guard that punishes documentation.

**What heat modulates is the convection rate, which is the model's own variable rather than a parameter
picked to have something to attach.** A lamp's bulb is its heat source and the cycle rate follows it, so
heat reaching the period is the same mechanism step 3 already built. The value is the draft's own drone
depth — how far past the pop line the worst vowel run has gone, 0 when nothing is — which is the same
quantity `.bar` already carries per bar as `--heat`, read for exactly what it means. The floor never
writes it, never decides what it means, and still runs when it is 0.

*One implementation note that is a real property, not a detail.* Heat reaches the running floor through
a setter rather than the effect's dependency list, because re-running the effect tears the canvas down
and reseeds the field — **a floor that reshuffles as you type is not a floor.** The field's identity
survives the writing changing under it.

Rhyme **113 tests**, holding. Two guard retirements, each with its reason in the suite beside the
assertion that replaced it, and the replacement verified to bite.

**The `GLOBULE-BUILD-PLAN` build order is complete: 1 through 6.**

**2.29 — one confidence vocabulary, and a conflation the display could not see.** From
`BTC-REDUCTION-PLAN.md` §4.1–4.3, whose §4.4 (the regime ledger view) already shipped at 11.9.
**None of this changes a measurement.** The stated problem is that the data page needs a PhD to read,
and it is a consequence of something good: every panel that could show a clean number shows a hedge
instead, because a clean number would claim more certainty than the math has. The rigor is honest. It
lived entirely in the grammar.

**§4.2 — five dialects for one question.** The verdict panel counted criteria, viability said
`insufficient (n7)`, swing said `unverified — 7 of 30 graded reads`, the H-protocol rows carry
identifiability codes and the regime registry carries percentile flags. All five answer *how much should
I trust this*, and a reader learns it five times. There is one scale now — **`thin` / `borderline` /
`clear`** — with one `confidence()` and one `confChip()`.

**§4.1 — and the split is the point, not the wording.** A panel line blurred *what happened*, *what it
means* and *how much to trust it* into one string, so the reader parsed grammar to find out which part
was the fact and which was the hedge. Fixed positions now. **The conflation that fixes is not
cosmetic:** `NEGATIVE` rendered in ruby whether the live viability series held zero fills or five
hundred. Those are opposite epistemic states — *we measured this and it loses money* against *we have
not measured it* — and §9 says the first is the output this instrument exists for while the second is
nothing at all. One is a finding. The display could not tell them apart.

**The three levels are about evidence, never about direction, and that is what makes them compatible
with §9.** A decisive loss is a **clear** reading, not a weak one. Direction is the reading's own field
and renders beside the chip, never folded into it.

**Clarity has to be earned and cannot be defaulted.** A panel with enough rows and no interval and no
pre-registered rule reads `borderline`, not `clear` — *"we have forty of something"* is not a statement
that the reading sits outside the noise, and a scale that defaulted to `clear` would launder exactly
that. A panel whose standard **is** a registered rule (viability's "net > 0 over ≥ 30 live fills", §9)
clears on that rule, because there the rule is the standard. Verified to bite: defaulting to `clear`
fails three assertions.

**§4.3 — the plain read and its confidence in the same breath**, which is the honest form of tiered
disclosure rather than a clean headline with the caveat a click away. A summary line that reads too
clean starts *looking* like a signal, which is the one thing every `NOTES.md` here refuses. The chip is
10px mono, lower-case, no fill, no border, **never gilt and never an outcome colour** — §5 reserves gilt
for what decides and confidence decides nothing, so it must not be mistakable for the reading it sits
beside. The full `why` is on the element's title, which is the only thing kept a click away.

**Two defects of my own, both caught by rendering the line and reading it while every assertion
passed.**

*The first draft made the viability word conditional on live n*, so with no fills the strip read `—`
instead of `NEGATIVE`. **The page-load guard refused it and was right.** §9 says these panels read
negative and that this honesty is preserved above all else — and the history row is a real backtested
finding (−1.63¢ over the spine's fills), not an absence. Withholding the word until a *live* series
matured would have hidden a measurement the tool has, which is the opposite failure to the one §4.2 is
fixing. The reading now comes from the best evidence available and the chip names which.

*The second was worse and no guard saw it.* Having made the reading fall back to history, I left the
chip counting the **live** series — so the strip read **"NEGATIVE  not enough data yet"**: a decisive
backtested finding and a claim that nothing had been measured, in one breath. That is §4.1's own
conflation reintroduced one level along, inside the change meant to end it. Found by driving the page
in Chromium and reading the sentence. The chip counts the reading's own series now, pinned as arithmetic
on the shipped branch rather than as a string, and verified to bite.

*And the dialect guard hit the comment-counting trap for the second time in two releases* — the blocks
quote the old wording to explain what replaced it, so a substring check that reads its own comments
fails a correct panel for naming the thing it removed. Stripped, exactly as Rhyme's floor guard was.

Measured on the live page: `NOT READY · 0/4 criteria · not enough data yet` · `15m history −1.63¢ ·
live — no fills yet · NEGATIVE clear` · `0 graded reads · — not enough data yet`.
`test/invariants.js` **63 → 80**; §6's total **858 → 875**.

*§4 is complete: 4.1, 4.2 and 4.3 here, 4.4 at 11.9.*

**2.30 — the stamp did not move with the content, and the deploy is where that could be found.**
Rhyme's, not this tool's, but the rule is this file's §1 step 4 and §7.3 and the finding belongs beside
them. `build-20260910054846` was minted at **2.27** and then carried, unchanged, through **2.28 and its
steps 3, 4+5 and 6** — Rhyme's `build.js` mints only on `--stamp` and a plain build preserves, and every
build after the first was a plain one. **The host served four releases of content under one stamp.**

**That is not cosmetic, and it is this file's own procedure that it breaks.** *"Verify deploys by build
stamp, not feature grep"* (§7.3) and §1 step 4's poll are the whole verification, and a stamp that does
not move with the content makes them answer a question they were never asked. Had it gone unnoticed,
this deploy would have been reported verified while Rhyme's stamp identified 2.27 — which is precisely
the shape of 2.22's wrong report, arriving through the stamp instead of through the ordering.

**Preserve-unless-asked is right for iteration and blind at exactly one boundary.** A timestamp minted
on every run makes the regeneration diff spurious and teaches everyone to ignore it, which is why the
flag existed. So the rule is now the condition rather than a flag to remember: `build.js` assembles a
trial copy and compares it against the committed artifact **with both stamps masked**. Identical content
keeps its stamp, so CI's byte-identical check stays strict; changed content mints, so a stamp always
identifies what it stamps. `--stamp` still forces, and `--keep-stamp` covers the one case the comparison
cannot know about — a deliberate re-cut of an identical artifact.

*The assembly became a function both paths call.* A second copy written to answer "did anything change?"
is two sources of truth for what ships and drifts the first time a line is added to one and not the
other — this system's most-repeated defect. The guard asserts there is exactly one `<!doctype html>` in
that file, and the whole rule is proved by **driving the shipped build**: preserve on unchanged content,
mint on a real source change, `--keep-stamp` still preserves, and the probe restores the source it
touched and asserts the restore. Verified to bite — reverting to preserve-always fails it.

**The new rule prevents recurrence and cannot repair what was already live**, so the deploy forced one
mint. Rhyme now serves `build-20260910070104`, verified at 07:03 UTC with its service worker naming the
same stamp. Rhyme **114 tests**, from 113.

**2.31 — the floor becomes a shared part, and this tool does not adopt it yet.** `ambientFloor` and its
six authored constants shipped inside Rhyme's `tome-src/30_ui.jsx` from 2.22, because L13's grant was
Rhyme's alone and, in 2.25's own words, "a shared part must not carry what one tool is withheld." With
BTC's adoption under consideration that reasoning inverts: two tools running one behaviour need one
owner (L3). `occvm/floor.js` is that owner — the buoyancy cycle, the coil, the arrest, the metaball
threshold, P-3's linear bridge, all of it. `useAmbientFloor` did **not** move: it is React lifecycle,
and splicing a hook into `occvm/` would make React a dependency of every conforming tool.

*Two things are genuinely a property of the SURFACE rather than the substance, and only those two are
overridable:* `alpha` and `seed`. Everything else the caller gets is the substance's and is not the
caller's to retune.

**The move is proved inert rather than asserted.** The old floor and the new one were each driven 600
frames in a vm against a recording 2-D context: **72,601 operations, byte-identical**. A first pass
added one paint before the first rAF and the diff caught it at operation 7 — a change nobody asked for,
removed rather than explained.

*And the cessation curve is now sampled LAZILY, which is the one real change.* It was sampled at load,
and a spliced part that captures a sibling global at load is the 2.0 `fracture.js` defect exactly:
`fracture.js` captured a null `OCCVM_VEINS`, threw on every call in the browser, and passed in Node
because `require` resolved what the page could not. Driven both ways — the part evaluates with **no**
sibling in scope and still exposes its API, and the curve integrates **exactly once** however many
times it is read. That closes the ordering hazard by construction, so where the splicer happens to put
this part does not matter and nothing asserts an order.

**This tool carries the part and splices it nowhere.** `law-audit.js` reads `L13 · BTC Terminal ·
UNADOPTED` and the register is **9 in force, 0 diverged** — unchanged, which is the point. Granting the
floor here is a change to the law and is not in this commit; see §13.6 item 4 for what it costs and
§13.7 for what the first attempt measured.

**2.32 — the vessel, which is L2's other half and was already the reference.** From
`GLASS-VESSEL-PLAN.md`, step 1 of its own build order: Fresnel rim, no displacement. L2 has said since
2.7 that the plan-view radius is the vessel's and the edge is the fluid's; the fluid's half was derived
at 2.10 and worn at 2.11, and the vessel's stayed authored. `occvm/glass.js` derives it.

**No new material and no new optics, which is the whole reason this was cheap.** `fresnel(n, thetaDeg)`
has shipped in `rheology.js` since the crystal port, and `--occvm-gloss` = .685 has been computed
against polished glass since 2.10 — ASTM D523 fixes the 60° standard as polished black glass at
nD 1.567, defined as 100 GU. **The system has been measuring itself against glass since the wet edge**;
this gives the reference a body. Borosilicate nD 1.474 and a 2.0 mm wall are sourced, the wall to the
container-glass standard band because no lamp vessel spec is published.

**The plan's §3.2 reproduces exactly** — every angle, every reflectance, every displacement, recomputed
from the shipped `fresnel()` rather than compared against its table, because a guard that matched the
document digit for digit would pin the document instead of the code. Its one slip is cosmetic: 34.9°
where the refracted angle at u = 0.85 is 35.2°.

**Its §4 is wrong, and in the direction a safety threshold must not be.** The plan puts the width floor
at 48 px from a displacement range of 3.63 px across u = 0.85 → 1.0. **3.63 is `shiftPx(0.85)` itself**
— the displacement *at* the band's inner edge, not the change *across* the band. The range is
`shiftPx(1) − shiftPx(0.85) = 3.9445`, the floor is **52.6 px**, and every row of its table is 8.66%
optimistic. Derived in the part from its two inputs, and pinned as arithmetic rather than as a digit.

**The rim's stop set is adaptive, and both uniform schemes were measured before that was written.**
A CSS gradient interpolates linearly between stops and this curve does not; uniform in *position*
plateaus at |err| 0.047 however many stops are added, because no even sampling resolves a vertical, and
uniform in *reflectance* fixes the rim and moves the failure to 0.021 at u ≈ 0.63 by leaving the flat
70% as one chord. Subdividing any segment that exceeds the **8-bit alpha quantum** costs one recursion:
**16 stops, max chord error 0.003755 against a tolerance of 0.003922**, and no authored step count.

*The rim's colour is the light's and is resolved, not authored* — 2.4's finding that a specular return
carries the source's colour, so it reads `--bone` at call time and paints **nothing** if that token is
absent, which is L6's refusal applied to a highlight. Measured on the reference surface it resolves to
`rgba(237,225,202)` — the sundial's live value, not the `:root` literal — so §7 item 2's *"the vessel's
highlight must track the one light"* is satisfied by construction rather than by a later fix.

*Two guards were tripped and both were right.* The reference surface refused a `#ffffff` in its own JS
(1.8: it holds no values of its own), and the parts-parity guard refused a part on the reference
surface that no tool carries. That second one forbids exactly what 2.10 did on purpose, so it is
re-authored asymmetrically: every part the tool carries must appear there (unchanged — a part with no
specimen cannot be seen to stop applying), and an extra is permitted only if it is on a pinned list,
the D14 treatment. `PROTOTYPED_AHEAD = ["glass.js"]`.

**Worn by no tool.** Only the rim exists and it is colour with no spatial extent, hence no resolution
floor; the displacement map must clear 52.6 px with its sub-floor degradation built at the same time.
`test/occvm.js` **509 → 550**; §6's total **927 → 968**.

**2.33 — the metaball field never merged on a canvas, and the fix is 3,278× cheaper.** Step 2 of the
glass sequence was meant to be one number: the frame cost of a live floor. It found a defect in 2.28
instead, in the shared part, shipped since that release.

**What the frame cost actually is, and my own account of it was wrong.** Measured at 390×844 on the
real page: **60.1 fps without the floor, 5.0 with it.** I had recorded — in two commit messages and in
§13.7 — that the cost was the floor invalidating five `backdrop-filter` tiles every frame. It is not.
Disabling `backdrop-filter` entirely gives **5.1 fps**; hiding the whole page behind the canvas gives
**5.3**. The cost is the floor's own canvas and nothing else, and I asserted a mechanism I had not
measured. Isolated: the metaball pass costs **196.67 ms/frame** against **0.06 ms** for the plain
gradient pass it replaced, with 37 drops — **3,278×**.

**Why, and it is the same fact as the defect.** `ctx.filter` filters every **drawing operation**
separately. The part set the filter on the buffer's context and then made one `fill()` per drop, so N
drops were N independent blur-and-threshold passes composited afterwards. That is not a metaball
field: **fields cannot add if each is thresholded before the addition.** Measured on two r=24 discs,
alpha at the midpoint:

| gap between rims | 0 px | 2 px | 4 px | 6 px | 8 px |
|---|---|---|---|---|---|
| filtered per draw call — **what shipped** | 0 | 0 | 0 | 0 | 0 |
| one filtered composite | 255 | 255 | 255 | 255 | 0 |

**The canvas never joined two drops, at any separation, including touching.** 2.28 wrote that
*"because fields add, two approaching drops join with no merge code"* and that one `gooFilter()`
*"serves BTC's still data-URI SVG and Rhyme's live canvas … so the live floor and every still frame cut
at the same level."* The first is false and the second is false. **This tool's still frame was always
correct** — an SVG `<g filter>` wraps the *rendered group*, which is the summed field by construction,
and it bridges to 6 px exactly as the corrected canvas now does. Only the canvas was wrong, so the two
tools have been showing different pictures of "the same field" for five releases.

**And the fix re-created 2.28's other bug on the way, which is why it is two buffers and not one.**
Filtering on the way out and setting `globalAlpha` there reads correct and is not: `globalAlpha` on a
filtered `drawImage` applies **before** the filter, so the weight went inside the isosurface and the
threshold deleted the field — one r=25 drop at α 0.2 gave **max alpha 0 over 0 non-zero pixels**,
which is 2.28's erasure verbatim. I read the canvas model instead of driving it. Two buffers: drops
opaque into one, one filtered composite into the second, weight applied compositing that. Measured
after: **51 over 1,804 pixels at α 0.2 against 255 over 1,804 at α 1** — same coverage, weight exactly
0.2.

**Measured after the fix:** bridging identical to the still frame (255 to 6 px, 0 at 8), and
**5.0 → 54 fps** against a 60.3 baseline, 196.9 ms → 18.1 ms.

*Three of Rhyme's guards were reading a canvas the code had stopped drawing on, and could not have
caught any of this.* Its harness had no `document.createElement`, so `buf` creation threw inside its
own `try/catch`, `filtered` fell to false, and **every assertion about the metaball path was a regex
over source text while the harness drove the unthresholded fallback** — 2.22's "verified against its
fixture instead of its call path", again. The sandbox now makes real recording canvases, the display
context records every operation instead of a whitelist that had no `drawImage` in it, and the metaball
assertions are counts off the driven op streams: the buffer carries no filter, the isosurface canvas
carries exactly one, and the weight is set on the display after it. Verified to bite: putting the
filter back on the buffer fails 3.

**2.34 — L13 amended: this tool is granted the floor on its page ground, and nowhere else.** The
owner's call, and the third step of the glass sequence. What was withheld from 2.15 to 2.33 is now
granted to **one surface**: the fixed layer under the content column, which is the layer `body::before`
has occupied since 2.25. Everything L13 said about why is unchanged and is the reason the grant is
bounded rather than tool-wide — every moving mark on the sweep means something, and a drifting mass
beside marks that carry win/lose is §7.6's trade. The ground carries no mark, no number, no outcome
colour.

**The boundary is measured in three places, not promised in one.** `law-audit.js` requires that the
tool's own source name the granted surface and hold **exactly one** floor call site (one grant, one
surface — a proximity check was tried first and is a property nobody can rely on: it would pass a
second floor mounted anywhere); that `#occvm-floor` is declared `position:fixed`; and that
`#floor-mount` sits **ahead of `.wrap`** in the markup. Each case is driven with a condition dropped in
turn, because a three-part boundary only ever tested all-present is a boundary nobody has measured.
What a static check cannot say — that no §5 surface's own pixels moved — is `test/page-load.js`'s, on a
real DOM: the canvas is not inside `.wrap`, and no `.tile` contains it or is contained by it.

**What the owner is getting, measured, because a grant should not oversell itself.** Tiles cover
**87.6% of a 390×844 viewport and 93.5% of 1100×1400**, so the live ground is **6.5–12.4% of the
screen**. The other nine tenths carries the *same field frozen*, through `.tile::before`, which exists
only because the tiles are opaque. Today's picture is a moving frame around a still one. That is a real
limitation of this grant and not a defect in it: how much page ground a reader sees is a question about
the **vessel** — L2's other half, derived at 2.32 and worn by no tool — and `GLASS-VESSEL-PLAN.md` §0 is
right that retiring `.tile::before` is glass's job and not the floor's. **The two layers were never
alternatives; they are a dependency, and that is what settled the question.**

**The ground's weight is 0.20**, re-swept against the *merging* field after 2.33 (the first sweep
measured a field that never merged, so it did not count). Full frame, clock and session seed pinned,
same state shot twice as a control (0.00% moved), each state against no field at all:

| state | pixels moved | mean ΔL\* | max |
|---|---|---|---|
| today, the still frame | 2.91% | 3.011 | 11.08 |
| canvas α 0.14 | 2.62% | 1.967 | 8.31 |
| canvas α 0.17 | 2.66% | 2.391 | 9.91 |
| **canvas α 0.20** | **2.71%** | **2.906** | **12.13** |
| canvas α 0.24 | 2.74% | 3.489 | 14.14 |
| canvas α 0.30 | 2.79% | 4.438 | 18.31 |

Within 3.5% of today's mean, so the ground does not change weight when it starts moving. **Frame cost
on the shipped page: 59.5 fps live against 60.1 hidden** — free, after 2.33; before it, the same floor
ran the page at 5.0.

*Heat is a literal 0 and guarded as literal.* L13's modulation clause names Rhyme's `--heat` as the
first real value and says the floor is lawful at zero modulation. This tool has no drone depth and no
equivalent, and REACT-MAP is explicit that it "should not invent one to fill the slot".

*The still frame is retired only when the part reports it took the surface.* `.ok` is absent on all
three of the part's refusals — no canvas, no field generator, no resolved palette — and in each of
those `body::before` keeps the layer it already had rather than the ground going blank because a
decoration declined.

**And 2.31 had quietly cost Rhyme a law.** Moving the floor into a shared part took its only
`OCCVM_GLOBULES.field` call out of its own source, so **L10 read UNADOPTED for the tool whose whole
draft face is that field** — and nothing surfaced, because the rollup does not count a per-tool
UNADOPTED. Found two releases later while reading an unrelated run. The measure now counts consumption
through a mounted part, because the alternative reading is that moving code into the spine un-adopts
every law it satisfied, which would make every future part a silent regression.

*Two fixture defects on this same law, and the second is the second time.* L13's synthetic guards
passed `{name, own}` while `readTool` produces `{name, raw, own}` — so the moment the measure read
`raw`, which it must because BTC's boundary lives in markup and CSS, every case threw. That is 2.22's
"verified against its fixture instead of its call path" on the identical law. The fixtures build the
runner's shape through one helper now, and one case measures the **shipped tool through `readTool`
itself** rather than a fixture at all.

*And the reference surface shipped dead for one commit, which nothing local could see.* An edit script
raised before its write, so the call to a new painter landed and the painter did not: the page threw
`paintFloor is not defined` on every load. The whole suite passed — **nothing in Node loads that page**
— and the only thing that caught it was the golden recorder refusing to record a dead page, in CI.
That refusal is exactly what it is for and it should not have been the first line of defence. Two
structural checks now run locally, either of which would have caught it: every function the page calls
at its top level is defined in it, and every id its script paints into exists in its markup. The L13
specimen it was missing is there too — three still frames of the shared floor, and the first seed shows
a merged dumbbell, which is 2.33's correction visible rather than described.

**2.35 — the substrate carries the field, and the tiles become the glass over it.** The owner's call:
*only the substrate will carry globules; they won't be drawn per tile any more.* Until now the field
was drawn twice — live on the page ground, and again as a still copy on every `.tile::before` — which
is what 2.34's own entry was hedging when it called the picture "a moving frame around a still one".
That is closed here by deleting the second field rather than by animating it.

**The tiles show the one field by letting it through.** `--tile-fill` is how much of a tile's own
substrate survives; the rest is the ground behind it, blurred by the `backdrop-filter` this rule has
carried since the tile was built and which, against an opaque substrate, has been doing **nothing** the
whole time. The frost the owner asked for as a "text underlay" was already there and already paid for;
what this release does is give it something to work on.

**The blur stops being authored.** It was 18px; it is `--occvm-meniscus` now — λc = 7.148px, the same
length the metaball isosurface is blurred at (2.28), so the frost and the field are cut to one scale.
Measured, the radius makes no difference to legibility (37.54 against 37.42 worst core pixel) and none
to frame cost, so it is chosen on the one ground that separates them: one is derived and one is not.

**The fill is authored and the criterion that fixes it is not.** *A serif set on a tile must read no
worse than the same serif set on the bare ground beside it.* That is measurable, and it does not
degenerate the way "match the ground's weight" does — matching the ground's per-pixel weight drives tile
opacity to zero, because a tile that is not there **is** the ground. Worst core-pixel contrast of the
16px Fraunces head, six seeds, glyph core against the exact background under it:

| tile substrate | in a tile | on the bare ground | |
|---|---|---|---|
| **opaque — what shipped** | **27.79** | 37.11 | the tile was the *worse* place to read, and had been since it was built |
| 70% | 32.64 | 37.11 | |
| 46% | 35.82 | 37.11 | |
| **38% — `--tile-fill`** | **36.74** | 37.11 | parity |
| 34% | 37.54 | 37.11 | |

**That parity does not hold across the whole day, and the reason is a finding rather than a tolerance.**
At high sun the same measurement reads **35.96 in the tile against 39.38 on the ground**. The tile's
substrate is sundial-written and brightens with the light; the page ground is not, because `--field`
and the body gradient under it are literals the sundial never touches. So no single fill can hold parity
at both ends of the day. That is **`OCCVM-L3` — one light — not reaching the page ground**, which is
2.17's finding about the canvas one surface along. Recorded in SPINE.md §6b, not fixed here: making the
ground read the sun moves a colour under every surface in the tool.

**No text underlay was built, because the measurement says none is owed.** The ask was a frosted
underlay for serif legibility; measured, every serif in the tool *gains* contrast from this change or
holds flat — the section head +32% at night and +39% at high sun, the sun pill and the wordmark
unmoved. And the one serif that is genuinely exposed is not in a tile at all: the arming tray's head
sits on the bare ground with the live floor behind it and nothing frosting it. It reads **37.11**, above
the in-tile figure, because the floor's own peak on the ground is only ~11 L\*. Building a scrim would
have been machinery against a problem that does not exist.

**What the change is worth, driven on a frozen page with the floor toggled:**

| surface | pixels the floor moves | mean ΔL\* |
|---|---|---|
| the spot tile | **28.79%** | 2.410 |
| the arm bar | **9.26%** | 2.610 |
| **the sweep** | **0.00%** | **0.000** |

That last row is L13's bound and it is now the fourth condition the auditor measures. A tile may *show*
the granted ground — showing a layer is not running a floor on it — but the tile carrying the sweep may
not, because a drifting mass under marks that mean win/lose is the exact trade L13 withholds from this
tool. Demonstrated rather than asserted: giving `#chartbox` the fill takes the register from **9 in
force, 0 diverged** to **8 in force, 1 diverged** and `law-audit.js --check` exits 1.

**And the decoration is now strictly beneath the ink, which retires 2.26 rather than restating it.**
`.tile::before` was `position:absolute`, so it painted *above* its box's in-flow content — over the
sweep and over every mark on it. 2.26 measured its way out of that with the screen blend's
self-limiting arithmetic. Nothing paints above a mark now, so eight of that block's assertions are
retired: the blend mode, the weight, and the six arithmetic clauses that computed a lift onto ink that
no longer receives one. Retiring a guard is the move this project distrusts most, so the standard is
met — each is retired because *what it describes cannot be built from this stylesheet any more*, and
what replaces it is strictly stronger: the still field must have exactly one reader, no `.tile::before`
may paint, the fill and the meniscus blur must be present, and the sweep's tile must be opaque. All
eight verified to bite.

**Two defects of my own, both caught by measuring after the change rather than reasoning from it.**

*The feature query tested nothing.* Written first as `@supports ((color-mix(…)) and
(backdrop-filter:…))`, which is not a support condition — a bare value is not testable, so the whole
block was dropped and every tile silently stayed opaque while every source-text guard went on passing.
Found by re-running the reach measurement after the restructure: 28.84% of the spot tile became 0.01%.
A guard now walks every `@supports` condition in the stylesheet and fails any leaf that does not name a
property. It took three drafts — the first flagged correct code by reading its own comment (the
comment-counting trap, for the **fourth** release running, after 2.27, 2.28 step 6 and 2.29), the
second by descending into `color-mix`'s argument list as though it were a condition.

*And the fill was nearly the base declaration rather than an enhancement.* `color-mix` is four years
younger than `backdrop-filter`, so a browser with the frost and without the mix would have got an
invalid `background` and a tile with **no substrate at all** — a worse failure than not having the
effect, on a tool §8 says is used from an iOS home screen. The fill is now inside a query requiring
both, so either missing renders exactly the pre-2.35 picture.

**Frame cost is unchanged, and the desktop figure corrects 2.34's.** Phone 390×844: 60.2 fps shipped
against 60.1 frosted — free. Desktop 1100×1400: **12.8–14.9 fps across every candidate including the
shipped one**, so this change neither helps nor hurts it. *2.34 recorded "59.5 fps live against 60.1
hidden" with no viewport named, and that was a phone-only reading.* At 1100×1400 the shipped page runs
~13 fps, and the cost is `backdrop-filter` across 21 tiles: disabling it gives 23.8 fps, and the blur
radius barely matters (13.7 at 18px, 14.9 at λc). Open, not fixed here, and now measured instead of
implied. The one thing 2.35 changes about it is that the blur stops being free-and-useless and starts
being paid-for-and-visible.

*Golden re-recorded:* **546 values**, and the delta is exactly `--tile-fill` at three instants and
nothing else — no existing recorded value moved on any of the three surfaces. As `OCCVM-D13` has said
since 2.11, the golden set reads `:root` and cannot see a change on a consumer, so that is a real
statement about the tokens and not about the picture; the picture is the driven table above.

`test/occvm.js` **561 → 561** — **eight retired and eight added**, counted rather than estimated: the
2.26 block goes 9 executed assertions to 7 (its four-mark arithmetic was one call site running four
times) and L13's fixture gains the two failure shapes of the new bound. A total that does not move is
exactly the kind of figure §7.3 warns about, so the composition is stated beside it.

**Deployed.** `main` took the branch as one merge commit in each repository (`47aea62` here,
`752bbec` in Rhyme), CI green on both mains through the API (BTC run 111, Rhyme run 75) before either
was reported. Verified by stamp, never by feature grep: both BTC hosts read `build-20260910130216`
and Rhyme's GitHub Pages `build-20260910123606`, times and the bound on them in the header. This
tool's live surface moves from 2.29 to 2.34 in one step — the React island and its lockbar, `Cast`,
the frame gate, the shared floor part, the vessel on the reference surface, 2.33's canvas correction,
and the floor itself on the page ground. Rhyme's moves from 2.30 to 2.34: the floor leaves its own
source for the shared part, and its canvas merges two drops for the first time since 2.28.

*One thing this deploy does not close, stated because the grant should not oversell itself.* The live
ground is 6.5–12.4% of the screen and the rest of the field is still the frozen `.tile::before`
overlay, so what ships is a moving frame around a still one. Retiring that overlay is the vessel's
job, and the vessel is derived and worn by nothing (2.32).

**Deployed.** `main` took the branch as one merge commit in each repository (`1bf0d8b` here,
`4d28980` in Rhyme), CI green on both branch heads through the API before either merged (BTC run 114,
Rhyme run 77). Verified by stamp: both BTC hosts read `build-20260910144317`, with the Cloudflare read
**bracketed** rather than bounded — it missed at 14:45:58 and hit at 14:46:08, so it landed inside
those ten seconds. **Rhyme's page is unchanged and its stamp verifies nothing here**, which is worth
saying rather than glossing: what changed there is the law, and the law is not served. `build.js`
compared its artifact with both stamps masked, found no content change, and preserved
`build-20260910123606` — 2.30's rule, working. Polling a stamp that could not have moved and calling
the result a verification would be §7.3's error inverted.

*What a reader sees change.* The whole page ground is one live field now, and it reads *through* the
panels instead of stopping at their edges — the tiles are 38% of their own substrate over that field,
frosted at the fluid's capillary length. The sweep is the one panel that does not take it, by the
law. And the globules that used to sit **on top of** the chart, over the tape and the strikes and the
settled pips, are gone: that layer was retired, not dimmed.

**2.36 — the field report, and the defect that hid behind the word "untestable".** Two screen
recordings from the owner's phone, scrubbed frame by frame. Ordered by what obscures a number first.

**The severe one is not new code.** BTC declared `viewport-fit=cover` and a translucent status bar and
then carried **no `env(safe-area-inset-*)` anywhere in the file**, so the content column began 14 px
from the top of a screen whose top 59 px belong to the system. At rest the wordmark rendered through
the iOS clock as `b11:15rmin`. Scrolled, the **price readout** was cut in half by the Dynamic Island.
§10.5 had this filed as "header sits under the status bar … untestable in this environment", and both
halves were wrong: it was never only the header, and *untestable* is what kept it unmeasured for
eleven releases.

**`env()` cannot be driven; a token read from it can.** That is the whole fix and the whole lesson.
`--safe-top` and `--safe-bottom` are read from `env()` once, every consumer reads the property, and a
harness sets the property and measures the layout. Driven in Chromium: at an inset of 0 the header
sits at 14 px and the band is 0 tall, which is the pre-2.36 page exactly; at 59 px the header sits at
59 and the band is 59. The guard that keeps it that way is a count — **`env()` may appear exactly
twice, once per edge, and only in the token declaration** — so an inline inset nobody can drive cannot
come back. Verified to bite in both tools.

**Padding alone only fixes the page at rest**, so an opaque band exactly the inset tall sits above
everything and the page's own ground colour shows there instead of the clock. `--field-hi` is that
colour, promoted out of a literal so the band and the page cannot drift (L3). *It costs the floor the
top strip of the surface L13 grants it, opaque, about 7% of a phone screen. Taken deliberately: a
decorative ground is worth less than a legible price.*

**Rhyme had the same defect one level in.** Its sticky binding carried the inset inline and nothing
else did, so a panel header scrolled to the top collided identically. Same token, same band.

**The header was a fifth of the screen, and the controls could not be shrunk.** Measured at 393 px it
stood **166.5 px**: the wordmark and tagline took one row and `.hright` wrapped its five children over
two more, leaving PAUSE alone on the last. L8 fixes controls at 44 px and that floor is not
negotiable, so what changed is the *order* — `display:contents` dissolves `.hright` at narrow width so
the header lays out all six children itself, identity and the two actions on the first row, readouts
on the second. **166.5 → 99.4 px.** This file had no width query at all before this. The tagline
elides rather than wrapping, which is a truncation of a decorative subtitle and is named as one.

**And one finding was mine, from 2.35.** The sweep's tile kept its substrate at full strength while
its neighbours went to 38%, and on the phone that read as a seam. The law forbids that tile
*transmitting* the floor; it does not ask it to be a different colour. Mixing the same `--tile-fill`
against `--field-hi` instead of against transparency gives the resolved colour of a frosted tile over
plain ground, with no new authored number and nothing let through.

*The first measurement of that seam was confounded and the correction is the entry.* Sampling a band
at a fixed offset compares different parts of the tile's own top sheen, because the tiles differ in
height. Re-measured at the same fraction of each tile's height:

| | vs the spot tile | vs the arm bar |
|---|---|---|
| full substrate, what 2.35 shipped | 2.24 L\* | 3.38 |
| the fill against the ground, now | **0.99** | 2.13 |

The text tiles already vary **1.14 L\*** among themselves, so the sweep went from outside that spread
to inside it. The device reading of 2.16 survived the instrument being corrected, which is luck worth
naming rather than a vindication of the method.

*Two guards of mine were proxies rather than properties, and both were caught by their own bite test.*
The L13 bound read "the sweep's tile must not mention `--tile-fill`", which refused this correct
change — the property is that it must not mix toward transparency, and it says that now. The pattern
written for it then could not match at all, because `[^)]*` cannot cross the parenthesis inside
`var(--sub-hi)`, so it read IN FORCE on a tile that transmitted. A guard that cannot fail is
decoration; both were re-authored and re-verified.

**Recorded from the recordings, not fixed here.** The DATA view collides at phone width: EXPORT CSV
overlaps the head beside it, and section heads wrap to three lines against their status chip. The
sweep prints its strike twice. Rhyme's globules read as large discrete blobs on the draft face and one
sits under the `+ bar` control. And the two tools disagree about what "selected" means — Rhyme paints
it with the decorative accent `--pigment`, BTC with the active family — which is a decision for the
owner and not a defect, since the law does not currently measure it.

**What the recordings confirm is working**, since a clean launch is worth recording too: cellular with
no relay, the tape moving from "unverified, no fresh peers" to "peer-verified · index" as constituents
arrive, Kalshi loaded with both windows, the verdict reading NOT READY on 0 of 4, the field visible
through the frosted tiles with the serif legible over it, and **not one globule over the chart**.

`test/occvm.js` **561 → 565**; §6's total **985 → 989**. Rhyme **117 → 118**. Golden **546 → 561**, the
delta being exactly the three new tokens at three instants and no existing value moved.

**Deployed.** `main` took the branch as one merge commit in each repository (`9836c70` here,
`122e2dc` in Rhyme), CI green on both branch heads through the API first (BTC run 119, Rhyme run 80).
Both BTC hosts read `build-20260910174353`; Rhyme reads `build-20260910171532`, and this time that
stamp is evidence rather than a formality — its artifact really changed, so the poll is answering the
question it was asked. Times and which readings are brackets rather than bounds are in the header.

*What the owner should see change on the phone.* Nothing sits under the clock any more, at rest or
scrolled: the content column starts below the inset and an opaque band covers the strip above it. The
header takes two rows instead of three and gives back a fifth of the screen. And the sweep's tile no
longer reads as a lighter panel than the ones around it.

*Four cosmetic findings from the same recordings are recorded and not fixed*, listed in 2.36: the
DATA view's collisions at phone width, the duplicated strike label, Rhyme's globule scale on the
draft face, and the `+ bar` overlap. The fifth is not a defect and is the owner's to settle — the two
tools disagree about what "selected" means, and the law does not measure it.

**2.37 — Rhyme's floor moves to the page ground, and the thing that made it look wrong was never
the floor.** The owner's call: *the globules should behave the way BTC's do — under the glass tiles,
not drawn in them individually*, with the four cosmetic findings from 2.36 free game. Not this
tool's code, except for two of those four; the law, the parts and the guard class are shared.

**What was asked for.** Rhyme drew the field inside whichever slab was open — so the field was a
property of the open face rather than of the page: it reseeded when a face changed, it stopped at
that slab's edge, and every closed face had none. It is now one fixed full-viewport
`<canvas id="occvm-floor">` mounted ahead of the content column, exactly the layer this tool has
carried since 2.34, with `.slab` and `.edge` as 38% substrate plus a λc frost over it. **`.bar` is
deliberately excluded and the auditor measures that** — it carries `--heat`, a measured value, and
L13 does not put a drifting mass under one of those. Demonstrated rather than asserted: giving
`.bar` the fill takes the register from **9 in force, 0 diverged** to **8 in force, 1 diverged** and
`law-audit.js --check` exits 1. L13's bound, written for this tool at 2.34, is now measured against
both — one call site naming the granted surface, `#occvm-floor` declared `position:fixed`, the mount
ahead of the content column, and the measured-value surface opaque.

**And then the field report's third finding turned out not to be about globules at all.** 2.36
recorded *"Rhyme's globules read as large discrete blobs on the draft face"* and filed it as a
question of scale. It was not scale. Read off the **deployed** build's computed styles, `.slab` had
`background-image: none` and `background-color: rgba(0,0,0,0)` — **the open face had no substrate**,
so the field ran straight through it and its controls floated on the page ground. Three more
surfaces were dropped the same way: `.binding` lost its bronze, and `.text .w.override` —
`color: transparent` over a `background-clip: text` gilt gradient — **painted nothing at all**, so an
override word in a draft was invisible.

**One expression, written four times:** `linear-gradient(calc(atan2(var(--ly), var(--lx)) * 1rad +
90deg), …)`. CSS `atan2()` **already returns an angle**, so that is angle × angle. And because the
expression contains `var()`, it is invalid **at computed-value time**, which — unlike a parse error —
does *not* fall back to an earlier cascade entry: the property takes its **initial** value. No console
message, no fallback, and every source-text assertion in that repo still green. The correction is
`+ 90deg`, which is what its own `25_card.js` computes in JS as `Math.atan2(L.ly, L.lx) + Math.PI/2`.
*It was found by driving the deployed page and reading `getComputedStyle`, while chasing an unrelated
number* — which is the fourth time a defect in this system has surfaced only because something was
rendered and looked at rather than read.

**The guard is narrow on purpose and is named as not the general fix.** The general property is *no
declaration computes to its initial value by accident*, and that is only visible in a browser; the
golden recorder is where it belongs, and it is **not built here** — recorded as the gap it is, beside
`OCCVM-D13`. What ships catches the class that actually shipped: an angle-valued trig result
multiplied by a unit, comments stripped first (a guard reading its own prose has been the defect four
releases running). It is in **both** suites — the four sites in Rhyme's own, preventively in this
tool's, which writes no trig in CSS today, plus a cross-repo clause here that says *skipped, not
passed* when the sibling is absent. Both verified to bite.

**The 38% transfers as a number and not as a verdict, and that was measured rather than assumed.**
Carrying a value fixed against this tool's substrate into a second tool without re-measuring is the
error this project keeps catching in itself, so the criterion was re-run on Rhyme's own surfaces
(SPINE.md §6b carries the table): a closed face reads **47.11** worst core pixel against a
constructed ground twin's **47.40** — parity — and the open face reads **43.91**, missing by
**3.49**. It ships missing it: the pre-2.37 opaque slab was already 0.84 below, no attainable fill
closes the gap (44.37 at 34%, still 3.03 short), and the cause is that `.slab`'s own top-left radial
highlight sits exactly under its `h2`. **The frost is free** — isolated, opaque reads 46.56 unfrosted
against 46.60 frosted — so the fill is the whole cost.

**`GROUND_ALPHA` was chosen against a broken page, and the number moved when the page was repaired.**
0.24 was fixed at 2.24 against a slab-sized canvas; on a page ground it is roughly twice what this
tool carries. The criterion is that the two grounds carry the field at the same measured weight,
since 2.37 puts both tools on one law and one kind of surface. The first reading said 0.12 matched to
0.2% — taken while every slab and the binding had *no background at all*, so the field showed through
the whole frame and the moved region was not the ground. Re-measured on one instrument, both tools,
same viewport and instant, the floor canvas the only thing toggled: this tool's ground reads **3.440
mean ΔL\*** over 6.64% of the frame; Rhyme reads 3.024 at 0.10, **3.325 at 0.11**, 3.741 at 0.12.
**`GROUND_ALPHA = 0.11`**, 3.3% off against 8.8% the other way. *Coverage stays far apart — 11.5%
there against 6.6% here — and that is the two layouts, not the weight: Rhyme's column covers much
less of its page. The alpha matches the per-pixel weight and is not asked to match the coverage.*

**The four free-game findings.** *The DATA view's collisions at phone width* — `.shead` now wraps its
label and its note to their own full-width lines below 560px; four heads that stood at four lines
stand at none, verified by disabling the query. *The duplicated strike label* — `renderSweep` printed
the gate's own strike beside the armed pill that already carries it; suppressed when the armed strike
and the window strike round to the same number, driven through `renderSweep()` and counted off the
gate's own `fillStyle` rather than off the frame, because a y-axis tick under the pill's opaque gilt
rect is not a visible second copy. *Rhyme's globule scale* — closed above; it was the missing
substrate. *The `+ bar` overlap* — closed with it, for the same reason.

**And the fifth, which was the owner's to settle, is settled.** The two tools disagreed about what
*selected* means: this tool has painted its on-state from `--verdigris` all along, and Rhyme painted
it with `--pigment`, the palette's **decorative** colour. L6 names four roles and one of them is
exactly this case — verdigris-adjacent is active — so a decorative accent was carrying state through
a channel the law does not govern, and a palette change would have changed what *selected* looks
like. Rhyme's `.cast.on` reads `--verdigris` now; `.cast.patina.on` beside it already did. *The `--m`
override stays: a swatch that names its own colour, offering a palette, is not a state.*

`test/occvm.js` **565 → 568**; §6's total **989 → 994** (sweep 33 → 35 for the strike label). Rhyme
**118 → 119**. Golden holds at **564** — the atan2 repair and the alpha are both on consumers, which
is `OCCVM-D13` exactly: the golden set reads `:root` and cannot see either, and the pictures above
are the driven measurements instead.

**Deployed.** `main` took the branch as one merge commit in each repository (`7d44dab` here,
`2d7366d` in Rhyme), CI green on both branch heads through the API before either merged — **BTC run
124 and Rhyme run 83, read step by step rather than off the rollup**, because Rhyme's whole run
finished in twenty seconds and a rollup cannot tell a fast suite from a skipped one. All eight of its
steps ran, including *"Regenerate from tome-src and check nothing drifted"*, which is the artifact
guard 2.22 exists for; BTC's two jobs cover the harnesses, all three splicers, the token audit, the
law conformance, the unit suites, the duplicate-definition check and both golden surfaces on Chromium.

**Verified by stamp, and every reading is a bracket.** The header carries the times. Both BTC hosts
missed at 19:33:49 UTC and hit `build-20260910192734` eleven and twelve seconds later; Rhyme hit
`build-20260910192143` at 19:34:43 after four misses — **one of which returned no stamp at all**, a
page served mid-swap. That empty poll is recorded rather than dropped, because it is the reading that
would have looked like a failed deploy had the loop stopped there, and because §7.3's whole procedure
is a poll whose negative results are as much a part of the record as its positive one.

*What a reader sees change, and the Rhyme half is much larger than the release that caused it.* Its
open face has a substrate again — it had none on the wire, so the field ran through it and its
controls floated on the page ground — and its binding has its bronze back, and an override word in a
draft is visible rather than painting nothing. On top of that repair: one field on the page ground
under every face instead of a copy inside whichever slab was open, the slabs and closed faces frosted
at 38% over it, and *selected* painted in the active colour rather than the decorative one. On this
tool: the DATA view's section heads stop colliding at phone width, and the sweep prints each strike
once.

*Rhyme's stamp is evidence here rather than a formality* — its artifact really changed, `build.js`
minted on the content under 2.30's rule, and its service worker on the wire names the same stamp. The
distinction matters because at 2.35 the honest thing to say was that polling Rhyme proved nothing.

**One thing this deploy does not close, stated because the record should not round up.** The 38% fill
holds serif parity on Rhyme's closed faces and misses it by **3.49 L\*** on the open one, and no
attainable fill closes that gap (SPINE.md §6b). And the general property behind this release's biggest
find — *no declaration computes to its initial value by accident* — is guarded only for the one class
that shipped. It is browser-only in general, the golden recorder is where it belongs, and it is not
built.

**2.38 — the vessel: the tiles express it, and it constrains the field.** The owner's call, and the
second half of it is the one that reshaped the work: *the vessel is expressed by the tiles but is
also intended to constrain globule behaviour as in actual lava lamps.* `GLASS-VESSEL-PLAN.md` §7
leaves "per-panel vessels versus one page-level vessel" explicitly unmade; containment forces it,
because a vessel that contains needs a real boundary in the field's own coordinates. **Decided with
the owner: one vessel, the content column.** A rim between stacked tiles would draw a wall that is
not there.

**The field was a torus.** `floor.js` wrapped every drop at the screen edge — leave left, reappear
right — which is the exact opposite of what glass does.

**Neither obvious wall works, and both were measured before any code was written.** Over an hour of
simulated time, an **absorbing** wall pins **36 of 37** drops on a phone and **162 of 171** on a
desktop, emptying the middle into two stripes at the edges: peeling a drop off a wall needs the same
buoyant stress `globules.js` measures at **4.2–14× short of τ₀**, so adhesion is a one-way trap. A
**reflecting** wall survives with 0 pinned and is refused for a different reason — an elastic bounce
is the material claiming an elasticity it does not have, the recoil 2.21 already refused.

**So the constant lateral drift was the defect, not the wall.** It was a 2.22 leftover: step 3
replaced the drift vertically with the buoyancy cycle and never replaced it sideways, under a comment
still calling it "the lateral wander a real lamp shows". `DRIFT_PX_S`, `vx` and `vy` are retired,
which also leaves `RISE_PX_S` as the one home of 1.4 (L3). **`vy` was the sharper half: written onto
every drop and read by nothing** — D12 one level down, invisible because a value on an object is not
a token the auditor scans.

The replacement is the convection roll's **shape** — Gyüre & Jánosi, already this floor's source for
the cycle — traversed once per cycle on the one parameter the vertical motion already uses, with the
amplitude set to the room the drop's own lane has. **Crossing the wall is impossible by construction
rather than prevented by a check.** Bolting a streamfunction's horizontal component onto the
prescribed vertical was tried first and does not close: `cyclePos` has dwells and a roll has none —
6.8M crossings and every drop pinned.

**Three bypass paths the first version missed, each found by the driven guard rather than by reading:**
resize rescaled `x` and left the lane behind; a merged drop is bigger than either parent and may not
fit the lane it inherited; and a rigid pair must be bounded by the **body's** extent, since clamping
the lobe puts the far side through the glass and clamping the follower would stretch a bridge that by
definition cannot stretch. Spawn is clamped into the vessel too — centres were drawn anywhere in
`[0,w]`, so a drop within `r` of an edge hung over it, invisible while the field wrapped. A
replacement drop is now born **at the coil** rather than sliding in from off-screen, since a vessel
has no off-screen.

**And then the wall was still a description, because the canvas was the viewport.** `floor.js` bounds
every drop to the canvas it is handed, so whatever that element spans *is* the glass — and it spanned
the screen. This tool's column is 1180, so only a viewport wider than that could show it, and 390 and
1100 are the two widths nearly everything in this system has been driven at. **Rhyme's column is 720,
so its field was outside its vessel at 1100 as well** — the desktop width most of these measurements
have been taken at. `--column` is a token now in both tools, read by the layout rule and the floor
rule so the glass and the content cannot drift apart. Driven in Chromium, canvas against column,
matching on width **and** left offset: BTC `390→390@0, 1100→1100@0, 1600→1180@210`; Rhyme
`390→390@0, 1100→720@190, 1600→720@440`. All six agree.

**The vessel is worn.** `glass.js` was derived at 2.32 and spliced into the reference surface alone;
the tool carries it now. **The rim paints under the content, not over it** — a real wall sits between
viewer and fluid, which argues for painting on top, and that is refused: the bright band is at the
column's outer edges, the sweep tile spans the column, and a decorative overlay above marks that mean
win/lose is the `.tile::before` arrangement 2.35 retired.

**Its weight is authored and the criterion that fixes it is not:** the rim may not exceed the ground
it sits beside, on the mean **or** the peak, because both are decoration on one surface.

| gain | pixels moved | mean ΔL\* | p99 | max | |
|---|---|---|---|---|---|
| 1.00 | 54.38% | 5.054 | 37.64 | 39.69 | louder than anything else on the page |
| 0.50 | 54.24% | 2.366 | 19.09 | 20.61 | mean passes, peak does not |
| **0.25** | **46.55%** | **1.071** | **8.92** | **10.41** | **both pass** |
| 0.15 | 23.60% | 0.942 | 4.92 | 5.89 | |
| 0.08 | 18.20% | 0.537 | 2.30 | 3.39 | |

against the ground's own **3.440 mean and 12.13 peak**. `RIM_GAIN = 0.25` is the largest that clears
both. The *profile* is derived — borosilicate's Fresnel curve subdivided until no chord exceeds the
8-bit alpha quantum — and only the overall weight is judgment, named beside `GROUND_ALPHA`.

**The rim's colour is the light's, and the golden record shows it rather than promising it:** three
pinned instants carry three different rims — `#f2d9b2` at low sun, `#ece3d0` at high, `#ccd0e0` at
night. It refreshes on `palTick`'s existing beat, because `--bone` is sundial-written and a rim
computed once at load would be a frozen highlight beside a moving light (2.17, one surface along).

**A shared part had already drifted, and nothing was checking.** `occvm/` is copied between the
repositories **by hand**: SPINE.md is asserted byte-identical, the React vendor is, all three
splicers re-splice and diff — and the parts themselves, the actual shared code, had no gate.
`glass.js` differed: Rhyme carried the **pre-correction** copy authoring `#ffffff` as the rim colour,
where this repo resolves `--bone` and paints nothing without it. **That is the L6 fix 2.32 records
making** — it landed one side only, in two commits sharing a message, and stayed invisible because
`glass.js` was spliced nowhere there. The guard takes its set from the filesystem intersection rather
than a typed list (2.27's stale-list defect), pins the BTC-only exceptions, and is mirrored both
sides. **Stated limit: it only fires where both repositories are checked out, which is a development
machine and not CI.**

**Two guards retired, both because what they excepted was adopted** — the only reason this project
retires one. `PROTOTYPED_AHEAD` held `glass.js` from 2.32 and is now pinned **empty** rather than
deleted, so the next part prototyped ahead must declare itself; and "into no tool yet" becomes "into
the tool, because the vessel is what bounds the field". `--column` and `--vessel-rim` registered in
SPINE.md §6b — the census refused each change until they were. **P-5 registered in §10**: does the
substance wet the vessel. Closed as authored at one pass, because containment needs no answer — the
orbit never reaches the wall — and because the choice is forced rather than aesthetic.

*Three process failures of mine, recorded because the pattern is one thing.* **The artifact was stale
for an entire debugging pass**: `build.js` was *refusing to build* — my spliced part didn't parse —
so `dist/` stayed old and the repo-root `index.html` that both my probe and the harness read was
previous code. I reported two blockers off it, a NaN and an arrest regression, and **neither
existed**. **I skipped `golden:verify`** from the gate set and learned it from CI run 128 going red.
And **I wrote measured figures into a guard's comment before measuring them**, and had them wrong.
The through-line is running a *subset* of the verification and treating it as the whole — which is
exactly what `build.js`'s parse check and the golden job exist to catch, and both did catch it.

`test/occvm.js` **568 → 582**; §6's total **994 → 1,008** (the containment guard is Rhyme's, where
the driven floor harness lives). Rhyme **119 → 120**. Golden **564 → 573**.

**Deployed.** `main` took the branch as one merge commit in each repository (`31e4cf7` here,
`0bc66f9` in Rhyme), CI green on both branch heads through the API first (BTC run 132, Rhyme run 89).
Stamps and their brackets are in the header; BTC's GitHub Pages was the slow one at four misses.

*What a reader sees change.* On a wide screen the field now **stops at the content column** with bare
page either side, and a Fresnel rim brightens both walls — a lamp on a table rather than a wash to
the screen edge. It was never contained before: the drops wrapped, leaving one edge and reappearing
at the other. On a phone the column already filled the viewport, so what changes there is the rim and
the fact that the field no longer teleports. In Rhyme the same, and its column is 720, so the
containment is visible on any desktop.

*What this deploy does not close.* Rhyme's open-face serif parity still misses by 3.49 L\* (SPINE.md
§6b), the "no declaration computes to its initial value" property is guarded only for the one class
that shipped, desktop frame cost is still ~13 fps from `backdrop-filter` across 21 tiles, and the
chart island (§13.5) is still deferred with its cost measured.

**2.39 — the coil, measured: it fires ten times and then stops forever, and only one of the three
carrier constants is adoptable.** The owner's call: *tune up the globule behaviour — the near heat
coil re-combinations; rising peanut globules probably need to go the final distance to full merges
unless peanuts can satisfy the sink factors to rejoin at the coil; we'll probably need a constant for
the liquid.* Three asks, and measuring the shipped field first answered them in a different order
than they were given.

**THE FIELD GOES INERT, AND NOTHING IN THE CODE SAYS SO.** Driven for two hours of simulated time on
the shipped floor, the coil fires **10 welds on a phone and then nothing** — `[7, 3, 0, 0, 0, 0, 0, 0]`
per fifteen minutes — 44 on a desktop column, 48 in Rhyme's, every one of them an **arrest** and not
one a completion, and each arrest locks two drops out permanently. After thirty minutes **20 of 37
drops are inert** and the recombination the owner is asking about has already finished happening.
*It is not new: the pre-2.38 floor reads `[8, 6, 2, 1, 0, 0, 0, 0]` — 17 welds over the same two
hours. 2.38's lane-clamped orbit **aggravated** the freeze and did not cause it, which is the
opposite of my first hypothesis and is recorded that way rather than pinned on the release that
made it worse.*

**THE ROOT CAUSE IS COUNTED, NOT INFERRED.** A drop's `lane` and its `phase` are both fixed for its
whole life, and every drop shares one period (2.28 step 3 took Gyüre & Jánosi's constant-periodicity
mode), so **any two drops' phase difference is constant forever** and each drop's neighbour set is
decided at spawn. Enumerated over the whole cycle at 4,000 samples: of 666 pairs on a phone only
**25 can EVER meet at the coil** (3.75%); 136 of 6,216 in Rhyme's column, 237 of 16,836 in BTC's. The
coil consumes that fixed set and is then finished. **And the field's only mechanism for drawing a new
lane is the respawn after a COMPLETED merge — which never fires, because completion needs a merged
radius under 7.148 px and the band's own floor puts the smallest possible merged radius at 11.339.**
No completions, no lane refresh, guaranteed freeze. That is a property of the shipped code, not a
tuning observation.

**"UNLESS PEANUTS CAN SATISFY THE SINK FACTORS" IS THE BRANCH THE SUBSTANCE SUPPORTS, AND IT SHIPS.**
2.28 step 5 excluded every locked lobe from every future weld, reasoning that "a third arrival would
need the bridge to grow again against a yield stress that already stopped it". **That is true of the
frozen bridge and only of it.** A third drop touching the body elsewhere opens a *new* bridge with
its own capillary drive γ/R; Kern et al. describe arrest as the end state of one coalescence event,
not a permanent inertness of the drops in it. The conclusion was drawn wider than its premise. Two
exclusions replace it, and both are structural rather than cautious: **a follower is an interior
lobe**, not a free surface a drop can land on; and **a body accretes a free drop but never another
body**, because the rigid placement here is one level deep by construction — the extent loop reads
`fo.lockedTo === d` and the follower pass makes a single sweep — so a two-level chain would leave a
grand-follower outside its leader's extent, which is 2.38's containment bypass again.

*Measured on the shipped edit, two hours, phone: welds **10 → 16**, bodies **27 → 21**, the biggest
body **2 lobes → 5**, chain depth **1**, and containment holds at **0 of 5,328,000 lobe-frames past
the glass**.* A peanut can rejoin at the coil now, which is the "unless" clause satisfied.

**AND THE FIRST TWO ATTEMPTS AT IT WERE MEASURED AND REFUSED BEFORE ANY OF THAT WAS WRITTEN.** Simply
deleting the lock check thrashes: **3,502 welds** in the same two hours, the same pairs re-welding
every frame they touch. Allowing body-to-body welding produces the two-level chain above. Both were
driven, both are on the record, and the shipped rule is the third.

**"GO THE FINAL DISTANCE TO FULL MERGES" HAS NO MECHANISM, AND THE REFUSAL IS THE FINDING.** A rising
pair translates as a rigid body — translation imposes no shear, so nothing re-mobilises the frozen
bridge. Buoyancy cannot do it either: `buoyantStress` reads **1.51 Pa at r = 9 and 5.03 at r = 30**
against τ₀ = 21.15, and `risesAt` is false at every radius the field contains and up to **r = 126 px**.
The one mechanism that would work is thermal — the coil IS the heat source, and a lower τ₀ there
lengthens γ/τ₀ — and it is **checked against the source and refused**: Koocheki et al. Table 3, the
row this system already takes k and n from, gives the control's yield stress at four temperatures as
**4.41 / 2.18 / 2.39 / 2.57 Pa at 25 / 35 / 45 / 55 °C** — non-monotonic, and it is the **dynamic**
intercept. No temperature series exists for the **static** stress that governs completion. Softening
τ₀ at the coil would therefore be authorship with no source behind it, producing exactly the wanted
picture, which is what P1, 2.1/P4, 2.16 and 2.28 §3 each refused.

**THE CONSTANT FOR THE LIQUID IS ONE VALUE, AND TWO MORE ARE REFUSED — SPINE.md §10 P-6.** The model
has carried one phase since it began; the carrier entered only as **`0.0567` typed as a default
argument** inside `buoyantStress`, owned by nothing and invisible to the token auditor because a
fallback in a signature is not a token. It is `OCCVM_RHEOLOGY.CARRIER.contrast` now, with the carrier
density derived from it so the two cannot drift, and **it ships at the value it already had**: the
contrast is *inverted from* the authored 30 px ceiling (√(γ/(Δρ·g)) = 30 px exactly at 0.0567), so
the ceiling fixes the contrast rather than the reverse, and moving it into the 0.022–0.056 bracket
secondary sources give would change no pixel while trading a stated inversion for a secondary
decimal — 2.10's refusal for γ. **γ_wc is refused for a worse reason than P-1's:** it is not merely
unmeasured but ill-posed, since this substance is an aqueous matrix and the analogy's carrier is
aqueous, so there is no immiscible interface to have a tension. **η_c is refused as D12:** the rise
speed is authored *because* the substance says buoyancy is zero, so a derivation feeding it has no
consumer.

**AND THE DIRECTION IS THE ANSWER.** globules.js §4 exempted the arrest lengths from the two-phase
correction — "γ/τ₀ carries no g and no density at all" — which is true of the **density** half and
misses the **tension** half: both lengths are γ over a stress. Corrected, with the consequence
asserted rather than described: a *lower* liquid/liquid tension **shortens** them and the field
arrests **more** (a 9+9 pair leaves the dumbbell band below γ × 0.331), and completion would need γ
to **rise** to 0.0635 N/m for a 9+9 and 0.2115 for a 30+30. **Every honest carrier lever points away
from a more merged field.**

*Two smaller corrections carried along.* 2.38 retired `DRIFT_PX_S`, `vx` and `vy` and left a comment
one screen below still promising "`vx`/`vy` stay for the lateral wander a real lamp shows" — the 2.14
class inside the file that records the 2.14 class, found by reading the part end to end, because
nothing measures a comment. And `buoyantStress` carried **9.80665** where rheology.js, which owns this
system's physical constants, uses **9.81**; reading its `G` moves the buoyant stress by 0.034%
(1.5094 → 1.5099 Pa at r = 9) and changes no verdict, recorded because a figure in the file's own
prose moved.

*Three failures of mine, and two are the same trap this file has now recorded five releases running.*
My new driven guard read the **display** context for its arcs — the canvas 2.33 records the code
stopped drawing on — and reported a field of one lobe from correct code. I asserted a 9+9 pair goes
*barely joined* at half the shipped γ; it does not, it goes there below **γ × 0.331**, and that is
2.38's own "figures written into a guard before measuring them" inside the release recording 2.38's.
And the vx/vy guard failed on correct code by matching the sentence in the note that **retires** it —
the comment-counting trap, after 2.27, 2.28 step 6, 2.29 and 2.35. Each is fixed by asking the
property instead of the string.

**One guard retired, named with its reason** — that a locked pair never welds again, retired because
what it pinned is wrong rather than because it was inconvenient, replaced by the two narrower
structural exclusions. **Verified to bite:** restoring the blanket exclusion fails the new driven
test; restoring the hardcoded default fails three; restoring the wrong exemption sentence fails one.
*And that limit was wrong twice over, which is the last correction in this entry.* It first read:
"removing the leader ordering is caught by a **source assertion only** — the two-level chain it
produces happens, at this field size, to place its grand-follower after its parent so nothing goes
stale." Two errors. **The mechanism does not exist:** a grand-follower can never read a stale parent,
because the coil loop is `for i; for j = i + 1` and the arrest writes `join.lockedTo = lead`, so the
chain is parent-before-child in `drops` by construction rather than by luck — and with the ordering
in place a follower may take a *lower* index, which is equally harmless because leaders are
positioned in the motion loop, not in the follower sweep. Driven at four viewports, both ways:
**0 non-rigid pairs, 0.0000 px of wander**, every time. **And the instrument was too small:** the
real hazard is the extent loop, which sums DIRECT followers only, so a grand-follower hangs outside
its body's clamp. That needs a wide enough vessel *and* a deep enough chain, and the harness's
320×480 gives neither — the chain there never passes depth 1 even with the ordering removed, so the
guard written at that size **could not fail and was decoration**. Measured to find the cheapest size
that can: 390×844 reaches depth 2 and still crosses nothing over 2,664,000 lobe-frames; **520×900
over 25,000 frames crosses 486 times at 15.1 px**; 720×1400 over an hour crosses **4,984 times at
38.6 px, at chain depth 4**. The containment case is its own test at 520×900 now — the smallest that
bites, ~7 s — and it carries a floor on the lobe-frame count so a silent zero cannot pass vacuously.
**Verified to bite: removing the ordering fails it at 15.065 px over 1,299,948 lobe-frames.** The
rigidity clause stays because it is the real physics, no longer claiming to guard the ordering.
*The pattern is this release's own: a subset of the verification treated as the whole — 2.38's
lesson, arriving through the size of the fixture instead of the set of gates.*

`test/rheology.js` **61 → 77**; §6's total **1,008 → 1,024**. Rhyme **120 → 122**.

**WHAT THIS DOES NOT CLOSE, AND IT IS THE OWNER'S CALL.** The coil still exhausts its neighbour set:
16 welds instead of 10, and then quiet. The field can only coarsen, because it merges and never
breaks, and its one refresh mechanism is gated behind a completion the substance never produces.
Closing it needs one of three things, none of which is a tuning and each of which is a decision:
**(a)** a mixing mechanism so a drop's neighbours change — the lane is fixed today and the period is
shared, and the honest versions of this are either a per-drop period (which contradicts the
constant-periodicity mode the cycle is sourced from) or lateral transport along the coil; **(b)**
**pinch-off**, which this system already owns in `yield.js` and uses nowhere in the floor — a field
that merges without ever breaking must coarsen, and detachment is as much a part of the lamp Gyüre &
Jánosi describe as attachment is; or **(c)** respawning to a **body** count rather than a drop count,
which refreshes lanes but grows lobes without bound unless (b) exists. **(b) is the one that closes
the cycle rather than deferring it, and it is scope the ask did not name.**

**Open against this tool:** none. `OCCVM-D1` and `OCCVM-D6` are closed (SPINE.md §6, §7); 1.7 and 1.8 close
no numbered defect — 1.7 completes L9's dusk-stage refinement and the `--bloom` deletion it named in
advance, and 1.8 builds the conformance instrument the roadmap named but never specified.

`occvm/tools/solar-compare.js` compares the two tools' solar implementations; run it with
`TZ=America/New_York`, because Rhyme's reads the local clock.
---

## 13. React — the islands (2026-09-10)

`REACT-MAP.md` maps Rhyme's React vocabulary onto this tool and orders the work: LockBar, `Cast`, the
chart island, the ambient floor, then the ordinary panels. `PATCH.md` is the wiring for the first of
those. This section records what shipped and what the two documents got wrong.

**The headline, because it decides the shape of everything after it.** Rhyme has nothing to lend on the
one problem this tool has. Rhyme's state has been inside React since its first line — `useSyncExternalStore`
appears **zero** times in 1,198 lines of `30_ui.jsx`, counted. This tool's state is one `const S` mutated
by ~300 vanilla functions. The bridge is this repository's own, and proving it is the entire reason the
lockbar went first.

### 13.1 Why React is spliced and not `<script src>`

`PATCH.md` §1–2 wires three tags into the head. Measured, that is wrong here on three counts, and each
one was already written down somewhere in this repository:

1. **`test/page-load.js` cannot see an external script.** It loads the real page under jsdom with
   `runScripts: "dangerously"` and *deliberately without* `resources: "usable"` — the network is blocked
   so the harness can prove the page survives with none. jsdom therefore never fetches a `src`. React
   would be absent in the only harness that loads the real page into a real DOM, and the component would
   be unverifiable by construction.
2. **The foot of `index.html` states the rule.** One style block and one script block are an
   architectural property (§2), because `test/lib/load.js` reads the script by first-open to last-close.
   That comment ends *"A second tag breaks every harness."*
3. **OCCVM-D5 / roadmap 1.6.** Rhyme stopped fetching React from a CDN because *"first paint shows the
   binding, not a blank frame; no tool installs to a home screen it cannot serve"* — measured, not
   inferred: the golden recorder's first run captured a blank page. A tool that fetches its own UI
   framework at load has the same failure one origin along, and `sw.js` would need a fourth shell entry
   to cover a case that splicing does not create.

So `react/tools/resplice.js` puts `vendor/react-18.3.1.umd.min.js`, `vendor/react-dom-18.3.1.umd.min.js`
and `react/LockBar.js` into `index.html` under fences — the same five rules `occvm/tools/splice-spine.js`
and `units/tools/resplice.js` already obey, and the same `--check`. **Load order is not incidental and
the splicer cannot get it wrong**: react-dom's UMD global branch is called as `zb(self.ReactDOM={}, self.React)`,
so react must evaluate first. Each part anchors on its predecessor's closing fence rather than all three
on one anchor — which is precisely the defect occvm's splicer shipped from 1.1b to 2.0, where one anchor
per part meant parts landed in reverse list order.

**The cost, measured rather than estimated:** `index.html` 680,724 → 830,663 bytes, of which 148,914 is
the dependency. No new network request, no `sw.js` change, no build step, still one file.

### 13.2 Four defects in the supplied patch, three of them fatal

Every line citation in `PATCH.md` and `REACT-MAP.md` was checked against the file rather than trusted.
The citations are real — `index.html:666-668`, `:534-536`, `:8325`, `:8326`, `:8409`, `:4876`,
`:3448-3477`, and Rhyme's `30_ui.jsx:80 / :136 / :194 / :254 / :714 / :944` — and `occvm/globules.js` is
byte-identical between the repositories at 20,391 bytes, as claimed. What the documents missed:

- **`$("lockSwing").addEventListener` and `$("lockResume").addEventListener` at `:8410-8411`.** The patch
  enumerates three call sites and says *"nothing else in the page is touched."* Removing the static
  markup leaves these two `$()` calls returning `null` at top-level script evaluation — a TypeError
  before anything else runs. **The page would not have loaded at all.** They are deleted; the component
  carries `onClick`.
- **`#lockResume{display:none}` survives `body.locked`'s retirement.** `PATCH.md` §5 says the existing
  styling *"attaches with zero changes."* It does attach — and it hides the button permanently, because
  the only rule that ever showed it was the `body.locked` override the component retires. RESUME would
  have been in the DOM, mounted, correct, and invisible; the lock releasable only by Escape. Both CSS
  lines are deleted, and `test/page-load.js` asserts the **resolved** `display`, not the absence of a
  rule.
- **`window.S` is undefined.** `LockBar.js`'s store reads `window.S.lock` behind a null guard. `S` is a
  top-level `const` in a classic script and a `const` does not become a property of the global object —
  `test/page-load.js` already says so in its own source, one directory away. The store would have
  returned `null` forever: idle note permanent, RESUME never rendered, **nothing thrown and nothing
  logged.** The shipped store reads `S` lexically, which is only possible because the file is spliced
  into the same script block — so defects 3 and 1 of this list are the same decision: the external-file
  structure is what forced the reach for `window`.
- **A stale citation.** `PATCH.md` §3 puts the mount at `index.html:8084` beside `applyMineral()`.
  `applyMineral` has not existed since 2.27 and init's kick is at `:8521`.

### 13.3 What shipped

`react/LockBar.js`, ~95 lines. `useSyncExternalStore` over an `OCCVM_LOCK_STORE` that **does not touch
React at all** — created and exported whether React loaded or not, so `lockSwing`/`lockRect`/`lockRelease`
call `notify()` with no guard of their own. The component is a Fragment mounted into the page's own
`#lockbar`, so that element keeps the id and the CSS it has had since the tile was built and nothing
gains a wrapper.

**Three mirrors of one fact are now one.** Each of the three mutators wrote the lock into `S.lock`, then
into a `body` class, then into a note string typed by hand in code that cannot see the markup. The class
and the strings are gone; `OCCVM_LOCK_NOTE` owns the three strings and the suite asserts each appears
exactly once in the page.

**The snapshot is the mode alone.** `lockRect` writes five fields and four of them render nothing, so
the snapshot is stable across them and React skips the work — a primitive, compared by `Object.is`, with
no memo pretending to be a discipline.

**Measured on the page, not asserted.** Driven in Chromium: SWING renders at **87×44** and RESUME at
**85×44**, both clearing L8's floor from the spine's own `button` rule; the malachite gradient resolves
against the live light vector; taking a lock renders RESUME with a computed `display:flex`, and clicking
it releases and unmounts. Zero page errors. Then the strip itself, before and after, at a pinned instant
and a pinned session seed: **1050×53, 0 pixels moved.** The conversion is invisible, which is what a
conversion should be.

*The first run of that comparison read **18.30% of pixels at a mean 2.44 L\***, and the number was mine,
not the tool's.* `globuleLayer()` seeds from `sessionStorage["btc.seed"]`, minted per session, so two
page loads paint two different globule fields behind a transparent strip. A before/after diff that does
not pin every generator is measuring the generators. The same error as 2.26's global worst case, in a
different coordinate again.

*And one guard was widened rather than satisfied.* `test/occvm.js` asserted `(html.match(/<script/g)).length === 1`
— the string, anywhere in the file. React's UMD carries the literal `"<script>\x3c/script>"`, its close
escaped exactly so no parser can see it, so a correct file failed a proxy for the property. Replaced by
the property in two halves: the markup **outside** the script body declares one `<script` and one
`<style`, and **nothing inside the body can close it early**, which is the only sequence that could hand
`test/lib/load.js` a second block and had never been asserted at all.

### 13.4 `Cast` — one control, one contract (REACT-MAP step 2)

`react/Cast.js`, ~25 lines of body. Every React-rendered control in this tool goes through it, and
`test/react.js` fails on a bare `e("button")` anywhere in `react/` outside that file — so the contract
is structural from one consumer onward rather than remembered at the second.

**The rule, which is the whole reason the component exists.** `aria-pressed` is emitted only when the
caller passes `on` **and** has not marked the control `action`. Rhyme's own sentence: a button that
claims to be a pressed toggle announces a state it does not have. Both of LockBar's controls are marked
`action` — SWING looks like a toggle and is not one, because RESUME undoes it rather than a second
press. The static markup announced nothing either, so this is a port and not a behaviour change, and
`test/page-load.js` reads the attribute off the real DOM rather than the props.

**What did not port, and it is measured rather than preferred.** Rhyme's `Cast` carries `.cast occvm-act`.
`.cast` is Rhyme's bronze binding with Rhyme's own literals, and this tool's controls have worn
`--occvm-bevel` from the spine since 2.11 — importing it would be a second button treatment here, not a
shared one. `occvm-act` is the sharper case, because it is a spine primitive and therefore the obvious
thing to adopt. Driven in Chromium, adding it to this tool's controls erases exactly what the `button`
element rule sets:

| control | box | padding | border | radius |
|---|---|---|---|---|
| `#lockSwing` | **87×44 → 62×44** | 6px 14px → 0 | 1px → 0 | 999px → 0 |
| `#armBtn` | **59×44 → 32×44** | 6px 14px → 0 | 1px → 0 | 999px → 0 |
| `#callAbove` | unchanged | unchanged | unchanged | unchanged |

The third row is the explanation: `#callAbove` is styled through `.sel` / `button[aria-pressed]`, which
ties `.occvm-act` on specificity and wins on source order, while the other two are styled by the element
rule the primitive exists to neutralise. **`.occvm-act` lets a surface *class* own a button's look — that
is Rhyme's arrangement and is not this tool's**, so the primitive is right there and wrong here for a
structural reason. Cast adds no class of its own. It does emit this tool's own on-word, `sel`, which has
been paired with `aria-pressed` in one CSS rule here since before any of this.

**Two copies of one rule, named as a mitigation and not a fix.** Cast is deliberately *not* a spine part:
OCCVM's parts are CSS and framework-free JS, and splicing a React component into `occvm/` would make
React a dependency of every conforming tool — a claim nobody has made and this does not make. So the
a11y rule now exists in both repositories. What is guarded is that they cannot drift silently:
`test/react.js` reads Rhyme's `30_ui.jsx` when the sibling is present and fails if its `aria-pressed`
expression has changed, and says *skipped, not passed* when it is absent.

**Nothing moved.** The lockbar strip, before and after the Cast adoption, at a pinned instant and a
pinned session seed: **1050×53, 0 pixels moved**; SWING 87×44, RESUME 85×44, no page errors. A refactor
that changes a pixel is not a refactor.

### 13.5 The chart: one gate taken, one refused, and the island deferred

REACT-MAP §8 puts the chart third, wrapping `<canvas id="chart">` in a component that owns it via a ref
and adding `Threads`' quiet-mode scheduling to `loop`. **The scheduling half shipped. The ownership half
did not, and the plan's stated reason for the scheduling half is refuted by measurement.**

**What was refused, with the numbers.** REACT-MAP reads `loop` as running `render()` every 33 ms
*"whether or not any tick arrived"* and proposes gating on data having changed. Driven in Chromium with
a live-like tape and the tape then **frozen** — only the clock running — **10 of 12 consecutive frames
40 ms apart are distinct.** The sweep scrolls, so the frame *is* the data; the two that matched landed
inside the same scroll pixel rather than idling. A data gate would freeze a moving chart under a moving
clock. Under a **rect lock** the domain is pinned and **10 of 10 frames are identical** — that waste is
real, and it is still not taken, because no sound "nothing changed" signal exists here short of a
version counter across every writer of `S`, and a digest that can miss a write puts a stale chart under
the one rule §5 calls the most dangerous bug this tool can have.

**What shipped is the gate the plan did not name and §10.5 already had on the record**: a frame is
skipped only when it *cannot produce a pixel*. Measured before: in the DATA view the canvas is laid out
at 0×0 and the loop still issued **130 stroke calls in 500 ms**, with `frame()` resizing the backing
store to 0 on every pass. Measured after: **0 strokes and 14 skips** over the same window, **70 strokes
and 0 skips** on either side of the round trip, backing store restored to 1050×1110. `renderSweep`
costs a median **0.80 ms** (p90 1.0, max 7.8) with a live-like tape, so the reclaimed slice is ~2.7% of
a core spent where no pixel could result. The refusal is **counted** in `S.frameSkip`, because a gate
nobody can measure is a gate nobody can audit, and `test/page-load.js` drives it **both ways** — a gate
asserted only in its skipping direction is a gate that could be stuck.

*jsdom performs no layout, so every `clientWidth` there is 0 and the gate would skip every frame.* The
harness now supplies the layout it lacks, and a test puts the canvas back to zero area deliberately.
That is the correct division: a harness that wants to drive a layout-dependent path has to provide the
layout, not have the page pretend it does not need one.

**The island is deferred, and this is the cost rather than a preference.** Making the canvas
React-rendered means `const cv=$("chart"), cx=cv.getContext("2d")` at `index.html:4526` — a top-level
const binding the element **and its 2d context** at parse — can no longer bind at parse. That is the
same trap as §13.2's orphaned listeners, one element along and far worse: `cx` has **180 use sites
across 7 functions**, and the canvas's own pointer gestures (`:8420`, the drag that carries 2.16's
velocity-derived relax) attach to `$("chart")` at evaluation time and would find null. It also breaks
the harness seam: `test/sweep.js`'s 33 assertions read the recorded 2d context that `load()` binds
through that same const, and the whole call-keyed colour truth table — §5's own guard against the most
dangerous bug here — hangs off it.

So the island would cost a rewrite of the canvas seam in the harness, a move of the drag gesture, and a
relaxation of a parse-time context binding, on the tool's most dangerous surface. Its stated benefit was
the data gate, which is refuted; the remaining benefit is proving the pattern extends to a hot-path
element. **That is a bad trade at this size and it is the owner's to make, not mine** — it is left
undone and named here rather than quietly dropped.

### 13.6 What is next, and what is not

`REACT-MAP.md` §8's order stands, with one correction and one confirmation:

2. **`Cast`** — done, §13.4.
3. **Chart island** — the scheduling half is done and the ownership half is deferred with its cost
   measured, §13.5. `renderSweep` is untouched, as the plan asks.
4. **Ambient floor — done at 2.34**, and REACT-MAP never mentioned the thing that actually blocked it.
   Kept below as written, because the block was real and the record of it is the point.
   ~~**Blocked by the law.**~~ The map calls this *"MAPS
   DIRECTLY, highest value"* and gives a port shape: splice `ambientFloor()`, add a `<canvas class="floor">`
   where `body::before` paints the still frame. Two things are true and only the first is in the map.
   *The prerequisite it does name is already met* — 2.27 wired ten of `PAL`'s thirteen keys to the
   resolved page on `sunTick`'s beat and on every palette change. *The one it does not name is
   **OCCVM-L13**,* which withholds ambient motion from this tool by name — "from the canvas and every
   surface §5 governs, because every moving mark on the sweep means something and a drifting decorative
   mass drawn from `PAL` beside marks that carry win/lose is §7.6's noise-as-opportunity trade" — and
   which since 2.22 is **measured rather than written**: a floor call site in this tool's own source
   diverges whether or not anything calls it, that being the only reading under which the withholding
   cannot be walked back one commit at a time.
   Demonstrated rather than quoted: one `ambientFloor(...)` call spliced into `index.html` moves the
   register from **9 in force, 0 diverged** to **8 in force, 1 diverged**, `law-audit.js --check` exits
   1, and CI goes red. So a live floor here is **a change to the shared law governing both tools**, and
   L13's own text puts the floor's cost — that a yield-stress fluid below τ₀ does not drift, so the
   floor contradicts the substance — on the record as the owner's aesthetic judgment. That is the
   standard 2.23 was decided by. It is not a thing to slip in under "adding React", and it is left
   undone for that reason and not for a technical one. **The still frame this tool already paints is
   the L13-conforming form of exactly this field.**
6. `useSwipeYield` and `useBeatPulse` — **not scheduled, and REACT-MAP is right about both.** There is no
   low-stakes irreversible removal here to point a swipe at, and no tempo. Manufacturing either would be
   inventing a trigger to fit a hook.

### 13.7 The floor on this tool's ground — attempted, measured, backed out of the commit

L13's amendment and the floor island were built and are **not in this commit**, because the auditor
does what it was built to do: with an `ambientFloor` call site in this tool's own source the register
reads **8 in force, 1 diverged** and `law-audit.js --check` exits 1. Amending the law is the owner's
call (§13.6 item 4), and three things were measured on the way that are worth more than the code was.

**A negative z-index rendered nothing, five times.** The island mounted a fixed, full-viewport
`<canvas id="occvm-floor">` at `z-index:-1`, on the reasoning that a negative stacking level is "the
page ground". It is not, here: `html,body{background:var(--field)}` gives the root its own background,
`body` carries an opaque `linear-gradient(180deg,#100e16,#09080d 40%)`, and `body` is
`position:relative` — so body's paint lands in the positioned pass, **after** every negative level.
Measured across a five-point weight sweep: **0.00% of pixels moved at every one of them.** Found by
sweeping and getting the same zero five times, which is what a sweep is for; a single reading would
have looked like a bad alpha. `z-index:0` mounted before `.wrap` is the layer `body::before` has
actually occupied since 2.25.

**The ground's weight is 0.20, chosen against what ships today** — the point being that the ground's
weight must not move when it starts moving. Full 1100×1400 frame, clock and session seed pinned, each
state diffed against no field at all:

| state | pixels moved | mean ΔL\* | max |
|---|---|---|---|
| today (`body::before`, still) | 2.42% | 3.011 | 11.49 |
| canvas α 0.14 | 2.11% | 1.946 | 8.22 |
| canvas α 0.17 | 2.15% | 2.354 | 9.83 |
| **canvas α 0.20** | **2.19%** | **2.864** | **11.87** |
| canvas α 0.24 | 2.23% | 3.445 | 14.33 |
| canvas α 0.30 | 2.28% | 4.386 | 18.13 |

0.20 sits within 4.9% of today's mean and within 3.3% of its max. Coverage is slightly *lower* at
matched weight — tighter coverage, greater per-pixel weight, which is the threshold signature 2.28
already measured on the still field (12.76% → 11.24%).

**And the cost was real — but the mechanism written here was wrong, and §12's 2.33 entry corrects it.**
With the floor live every Chromium screenshot timed out at 15 s, and this paragraph attributed that to
the floor invalidating five `backdrop-filter` tiles every frame. **Measured afterwards, that is not the
cause**: disabling `backdrop-filter` gives 5.1 fps against the floor's 5.0, and hiding the entire page
gives 5.3. The cost was the part's own canvas — `ctx.filter` applied once per drop rather than once per
frame — and fixing it took the page from **5.0 to 54 fps** while also making the field actually merge,
which it never had on a canvas. The screenshot timeout was real evidence of *a* cost and my account of
*which* cost was a guess stated as a mechanism. Left here rather than rewritten, because the correction
is the record.

**Held in the scratchpad, not lost:** `react/Floor.js` and the page's adoption diff.

**Open against the island:** none.
