# Unit `schema` — ledger enrichment spec

Target: the working copy at `build-20260906070014` (2,859 lines). Line numbers are given **as of that
stamp** and are advisory only — other agents are editing the same file in parallel, so every insertion
point below is also identified by function name and by an exact anchor string. Follow §7.2 of CLAUDE.md:
**assert every anchor before replacing it.**

The deliverable is this spec. `code.js` is the pure glue it names; the orchestrator writes the ~12 impure
call sites. `node test.js` runs green (167 assertions).

> **Read §7.6 before you use `si` or `vrp` for anything.** Implied volatility is not identifiable from an
> at-the-money binary, and a KXBTC15M strike opens at the money. That single fact governs how both fields are
> written, why `vrp` is often absent, and which series the measurement can honestly be taken on.

---

## 0. The problem, stated precisely

Every ledger row records an **outcome** and almost no **state**. A settled `btc.edge` window says the
model thought 51.2% and the market thought 51.5% and it settled YES. It does not say what the volatility
was, what the book looked like, how wide the spread was, how deep it was, or what else was happening in
the world at that minute. So none of the five H-protocol hypotheses can be asked of the exported CSV —
not because the data was never available, but because it was in scope at the write site and thrown away.

The most literal instance: **`kParseBook` computes `depthYes` and `depthNo` on every order-book poll and
nothing in the repository ever reads either one.** Verified, not assumed:

```
$ grep -rn "depthYes\|depthNo" --include=*.html --include=*.js --include=*.ts .
./index.html:1043:   depthYes:ys.reduce(...), depthNo:ns.reduce(...) };     <- the write
./test/defects.js:26: S.k.ob={...,depthYes:1,depthNo:1};                     <- a test fixture literal
$ grep -rn "\.depth" --include=*.html --include=*.js --include=*.ts .
(no output)
```

**And one caveat that outranks the rest, stated here because it decides what the flagship field is worth.**
The variance premium (H5) is measured by inverting the market's quote for sigma. That inversion is **ill-posed
at the money**, and KXBTC15M strikes are set at the money at open, so the primary dataset is born in the worst
possible place for the primary measurement. This is not a coding error and no code change removes it; it is a
property of digital options. It is handled by *omitting* the reading and *counting* the omission (§2.2's
`vrpX`), never by clamping or by quietly dropping rows. The mechanism, the magnitude, and which series to
trust are in §7.6. Everything below assumes you have read it.

Two occurrences in the whole repo, neither of them a read. The `depth=5` order book is fetched every 8 s
for the live 15-minute market and every 20 s for the hourly ATM rung; both depths are summed and
discarded each time. **H2's core input is being paid for on every poll and thrown away.** Wiring it into
the rows costs one extra network byte (zero — it is already in the response) and 22 characters of storage.

---

## 1. Design rules that govern every field below

1. **Omit, never null.** A value that cannot be derived truthfully is left `undefined`, so
   `JSON.stringify` drops the key. A new row with no reading is byte-for-byte identical to a row written
   by the old build. This is simultaneously the backward-compatibility contract (§6) and the largest
   single storage saving (§8) — a nulled field costs bytes on every quiet row forever.
2. **Never store what is exactly derivable from what is already stored.** Derivable quantities become
   *computed CSV columns at export time* and cost nothing. §4 lists which ones and gives the identity.
3. **Append only.** New CSV columns go at the **end** of their dataset, after any existing trailing
   column (including `excluded`). Never insert, never reorder, never rename — a positional parser
   written against today's export must keep working.
4. **Never touch a version literal.** `swingLoad` gates on `j.v===1`, `jLoad` on `j.v===3`, `viaLoad` on
   `j.v===1`, and each **discards the entire ledger** on mismatch. Bumping any of those three literals
   silently wipes every existing row on the user's recorder. Row-level provenance is carried by the new
   `sv` field instead (§2.4). **Do not change `v` anywhere.**
5. **Sigma is stored in basis points per minute** (`sigma * 1e4`, 2 dp). Live BTC runs ~5–15 bp/min, so
   2 dp of a basis point is finer than the tape resolves, and 4 characters replace 9. Every CSV column
   carrying one is suffixed `_bpm` so the unit cannot be mistaken downstream.
6. **A missing sibling unit costs a field, not the page.** `edgeSnapFields` / `volCloseFields` call the
   `volspace` unit through `typeof impliedSigma==="function"` guards, so a partial splice degrades to
   fewer fields rather than a init-time `ReferenceError`.

---

## 2. Field catalogue

### 2.1 Edge snapshot — `w.snaps[]`, written in `edgeSnapOne`

**Write site:** `index.html:1298`, the `w.snaps.push({...})` inside `edgeSnapOne` (fn starts 1288).

Existing keys, unchanged in name, type, unit and meaning:
`t, tau, pm, qm, ya, na, pa, pd, pe, pf, pr, fit` (+ `phantom` added by `repairLedgers`).

| new key | type | unit | computed from, at the write site |
|---|---|---|---|
| `sm` | number, 2 dp | bp/min | `sigBp(P.sigU)` — the model sigma `calSigma` produced for this snap (rv60 × seasonal ratio × term factor). Already returned by `strikeProbs` as `sigU` and currently discarded. |
| `si` | number, 2 dp | bp/min | `sigBp(impliedSigma(m.strike, P.S0, P.tau, (yb+ya)/200))` — the per-minute sigma that reprices the market's mid under the same analytic fair value the engine uses. Requires the additive `S0` on `strikeProbs` (§3.1). **The LOW root** where two exist — see §7.6. **Written only when `sm` and `xs` are written too**: an implied sigma with nothing beside it cannot be judged, so the whole reading is omitted rather than shipped unjudgeable (§7.6). |
| `xs` | number, 3 dp | dimensionless | `log(strike/S0) / (sigU·√tau)` — standardised strike distance. This is literally the residual fit's third regressor, and it is also what makes a missing `si` diagnosable (§7.2). |
| `dy` | integer | contracts | `ob.depthYes` — total resting size across the returned YES **bid** levels (top ≤5, from `depth=5`). |
| `dn` | integer | contracts | `ob.depthNo` — total resting size across the returned NO **bid** levels. Because `yesAsk = 100 − bestNoBid`, **`dn` is the depth backing the YES ask** and `dy` the depth backing the NO ask. Getting this round the wrong way inverts H2. |

**Glue:** `schemaPut(snapObject, edgeSnapFields(P, quote, m.strike, ob))` immediately after the existing
`w.snaps.push(...)` — i.e. capture the pushed object and enrich it, do not rebuild the literal.

```js
const sn={t:now,tau:...,pm:...,/* unchanged literal */};
schemaPut(sn,edgeSnapFields(P,{q:((yb+ya)/2)/100,spread:(ya-yb)/100},m.strike,ob));
w.snaps.push(sn);
```

**`dy`/`dn` availability, stated honestly:** `edgeSnap` calls `edgeSnapOne(K.cur, now, freshOb)` for the
live 15-minute market and `edgeSnapOne(m, now, **null**)` for every hourly ladder rung (line 1310). So
depth lands on 15-minute snaps only; hourly rungs carry none, and their absence means "not fetched", not
"empty book". The hourly ATM rung's book *is* fetched into `K.hourOb` every 20 s and is never passed to
`edgeSnapOne` — wiring it is a real option but it changes which market `edgeSnapOne` is called with, so
it is **out of scope here** and flagged rather than silently assumed.

### 2.2 Edge window container — `w`, written by the new deferred pass

**Write site:** a new function `edgeVolClose(now)`, called from the 1 Hz loop at `index.html:2833`
alongside `edgeProvisional(now)`. See §5 for why this cannot live inside `edgeProvisional` or `edgeGrade`.

| new key | type | unit | computed from |
|---|---|---|---|
| `sv` | integer | — | `SCHEMA_VERSION` (2). Set when the window object is created. |
| `sr` | number, 2 dp | bp/min | `sigBp(realizedSigma(keys, closes, w.open, w.close))` over `barsExcludingCurrent()`, contiguity rule as in `computeStats` (a return counts only when bar keys differ by exactly 1). |
| `srN` | integer | count | contiguous 1-minute returns actually used. Without it `sr` is uninterpretable: a 15-minute window spans 16 bar keys inclusive and so yields at most **15** returns. |
| `vrp` | number, 2 dp | bp/min | `si_ref − sr`, where `si_ref` is the `si` of `refSnap(w)`. Positive = the market priced more volatility than the tape realized. **Written only when that reading passes both identifiability tests in §7.6.** Otherwise it is absent and `vrpX` says why. |
| `vrpT` | integer | ms | `refSnap(w).t` — which snap fed `si_ref`, so the pairing is auditable and does not depend on a future reader reimplementing `refSnap`. **Written by `volCloseFields` itself, and only when `vrp` was written**, so a provenance stamp can never outlive the value it points at. |
| `vrpX` | string | — | the reason `vrp` was **not** written, when `sr` was: `noref`, `nosi`, `nodiag`, `atm`, `tail`, `cond`, `impl` (§7.6). Present exactly when `vrp` is absent. This is what makes the selection **countable**: `GROUP BY vrp_omit` gives the whole excluded set and its composition, so a filter that removes most of the flagship dataset cannot hide. |
| `srTried` | `1` | — | set **only** when the bar buffer can no longer cover the window (§5), so a window is retried every tick until then. Mirrors the L2 lesson exactly. |

`vrp` obeys **one observation per window**: it is paired with `refSnap`, the same read every other score
uses. Not the mean of the window's `si`, not the last one.

### 2.3 Swing read — `e.reads[]`, written in `swingTick`

**Write site:** `index.html:1570`, the `e.reads.push({...})` inside `swingTick` (fn starts 1556).

Existing keys unchanged: `t, tau, ask, p, base, be, ofi, v60, disl, maxAfter` (+ `hit`, `phantom`).

| new key | type | unit | computed from |
|---|---|---|---|
| `bid` | number, 3 dp | dollars | `(side==="YES"?ob.yesBid:ob.noBid)/100`. **Not derivable** — the read stores only `ask`. It gives the spread, and it is the price the side could actually have been exited at. |
| `dy`, `dn` | integer | contracts | as §2.1, from the same `K.ob` `swingTick` already requires to be non-null. |
| `sm` | number, 2 dp | bp/min | `sigBp(touchSigma(st, now, e.close))` — the sigma `touchProb` actually ran its Monte Carlo on: rv60 × seasonal ratio, **no term factor** (§10.2). |
| `si` | number, 2 dp | bp/min | inverted from the **window's yes-mid** `((ob.yesBid+ob.yesAsk)/2)/100`, not from the cheap side's ask. A one-sided ask embeds the spread and is not a probability; inverting it would report the spread as volatility. Both sides of a window therefore carry the same `si`, by design. Same two rules as §2.1: **the low root**, and **never written without `sm` and `xs` beside it** (§7.6). |
| `xs` | number, 3 dp | dimensionless | `log(strike/S.idxPx)/(sm·√tau)`, same as §2.1 but on the touch sigma. |

Swing entry container `e` additionally gets `sv`, `sr`, `srN`, `vrp`, `vrpT`, `vrpX`, `srTried` exactly as §2.2,
filled by the same deferred pass, with `si_ref` taken from the entry's **mid-life clean read** —
`rr[Math.floor(rr.length/2)]` where `rr = e.reads.filter(r=>!r.phantom)`, which is precisely the read
`swingStats` already scores. Same one-observation rule, same selection function.

**Glue:** `schemaPut(rd, swingReadFields(computeStats(), s.side, K.ob, S.idxPx, s.strike, now, s.close))`
on the pushed object. Call `computeStats()` **once** outside the per-side loop and pass it in — it walks
240 bars and `swingTick` already loops over both sides.

### 2.4 Journal trade — `S.journal[]` row, written in `simCloseOne`

**Write site:** `index.html:1639`, the `const row={...}` inside `simCloseOne` (fn starts 1632).

Existing keys unchanged: `arm, exitRule, ticker, strike, close, side, tIn, tOut, tau, entry, exit,
reason, shares, stake, pnlShare, pnl, hit, peak, be, base, p, ofi, bank` (+ `phantom`).

A journal row **outlives** the swing read it came from — 3,000 rows are kept while only 400 window-sides
are — so entry-time state must be copied, not joined.

| new key | type | unit | computed from |
|---|---|---|---|
| `sv` | integer | — | `SCHEMA_VERSION` (2). Journal rows are standalone, so they carry it themselves. |
| `sm`, `si`, `xs`, `dy`, `dn` | as §2.3 | | copied verbatim from the originating read, `e.reads[t.readIdx]`. `readIdx` is already stored by `simEnter` and `e.reads` is append-only (no `shift`), so the index is stable. **No signature change to `simCloseOne` is needed** — it already has `e` and `t`. |
| `bidIn` | number, 3 dp | dollars | `t.entryBid` — the bid observed at entry. It is already threaded through `simEnter` for the S1 fix and is currently dropped on the floor when the row is built. With `entry` it gives the entry spread. |
| `sr`, `vrp` | as §2.2 | bp/min | **backfilled**, not written at close time — see §5. |

**Glue:** `schemaPut(row, journalEntryFields(e.reads[t.readIdx], t))` after the `const row={...}` literal
and before `S.journal.unshift(row)`.

### 2.5 Event proximity — `ev`, `evMins`, `evTier`: **derived at export, stored on no row**

| field | type | unit | value |
|---|---|---|---|
| `ev` | string \| null | — | `eventTag(rowT).ev` — release name, e.g. `"NFP"`, `"CLAIMS"` |
| `evMins` | integer \| null | minutes | signed whole minutes from the row to the release; **negative = it already happened** |
| `evTier` | 1 \| 2 \| null | — | 1 = high BTC relevance, 2 = lower |

Computed at export time by calling the `calendar` unit's `eventTag(t)` on the row's own timestamp
(`s.t`, `r.t`, `t.tIn`). **Nothing is persisted.** Three reasons, in order of weight:

1. **Cost.** The horizon is ±24 h and `CLAIMS` is weekly, so a tag is present on roughly half of all
   rows. `,"ev":"CLAIMS","evMins":-312,"evTier":2` is 39 characters; at the edge cap that is **1.5 MB of
   pure redundancy**, against a ledger that already does not fit (§8).
2. **It is exactly derivable.** Every row already stores its own timestamp, and the calendar is
   deterministic UTC arithmetic with no hidden state.
3. **Deriving is strictly better.** `RELEASES.DATED` is intentionally empty today (CPI, PCE, FOMC, ISM
   are not guessed). When it is filled in by hand from the official calendars, **every historical row is
   retroactively re-taggable** — which is impossible if a stale tag was frozen into storage.

The one caveat, stated because it is real: derivation uses the calendar as it exists **at export time**,
not at write time. Two exports of the same ledger across a calendar update will disagree, and that is the
correct behaviour, but an analyst comparing two CSVs must know it. Record the calendar's state in the
export header (§4.5).

### 2.6 Seasonality control — `hourUTC` and `seas`: **derived at export, stored on no row**

| field | type | unit | value |
|---|---|---|---|
| `hour_utc` | integer 0–23 | — | `utcHour(rowT)` — exact from the stored timestamp |
| `seas_hour` | number, 3 dp | multiplier | `seasAt(rowT)` = `SEAS[hour_utc]` — the raw table value, which is the seasonality **control regressor** |
| `seas_factor` | number, 4 dp | multiplier | `seasFactor(rowT, windowClose)` = `√(SEAS[hEnd]/SEAS[hNow])` — the factor `calSigma`/`touchProb` actually **applied**. Exactly `1.0000` whenever the row and the window close fall in the same clock hour, which is most 15-minute rows (§10.2). |

Both are exact functions of two already-stored timestamps and a frozen table, so storing them would be
pure duplication (24 characters per row = 0.9 MB at the edge cap).

**The one condition attached to this decision:** it holds *only while `SEAS` is frozen*. §10.1 says the
calibration spine is not in the repo and these constants must not be refit. If `SEAS` is ever changed,
historical rows would be re-derived against a table that was not in force when they were written. The
mitigation is one line, not a per-row field: record the table's identity once per export
(`# seas: <sha of the SEAS literal>`) and, if `SEAS` is ever edited, stamp `w.seasFit` on new windows
from that day forward. Do not solve this problem before it exists.

### 2.7 The H2 mispricing measure

The spine's H2 as written is self-contradictory: it gates you into trading when spreads are **widest**,
which is the most expensive moment to cross and the worst moment to rest an order. Restated coherently:

> **Does mispricing grow faster than spread?** — i.e. is the edge *per cent of spread* rising?

Both components must be stored or derivable, and the numerator must come from a **quote-independent**
estimator:

| CSV column | formula | source |
|---|---|---|
| `spread_c` | `edgeSpreadC(qm, ya)` = `2·(ya − qm)` | derived; exact, see §4.1 |
| `mis_anl_c` | `100·pa − qm` | derived from the stored analytic probability |
| `mis_over_spread` | `mis_anl_c / spread_c`, null when `spread_c ≤ 0` | derived |
| `mis_head_c` | `100·pm − qm` | derived, **labelled not-for-H2** |

**Why `pm` must not be the numerator.** When a Kalshi quote exists the headline `pm` *is* the residual
estimator, whose baseline is the quote itself and whose third term is `−5.023·spread`. So `pm − qm` is a
mechanical, monotone function of spread by construction, and `(pm − qm)/spread` would produce a strong,
entirely spurious relationship. It would look like a finding. It would be an artifact of the fit. `pa`
(analytic) is the quote-free estimator already stored on every snap; use it, and keep `mis_head_c` in the
export only as the contrast that makes the point visible.

`misRatio(pQuoteFree, qMidCents, spreadC)` in `code.js` is the single definition of this measure so the
CSV exporter and any later panel cannot drift apart.

---

## 3. Required changes to existing functions (all additive)

### 3.1 `strikeProbs` gains `S0` in its return — `index.html:2037`

```
-  return {over,under:1-over,anl,drf,emp,flo,res,tau,t:now,sigU:sig,w,fit:...,
+  return {over,under:1-over,anl,drf,emp,flo,res,tau,t:now,sigU:sig,S0,w,fit:...,
```

One new key on a returned object. No existing key changes name, type, unit or meaning; no caller
enumerates the return. Without it, `si` and `xs` cannot be computed at the edge write site at all, and
recomputing `S.idxPx` there would risk inverting the quote against a *different* spot than the model used
— which would put the error straight into the vol triple.

### 3.2 `touchProb` delegates its sigma to `touchSigma` — `index.html:1521–1522`

```
-  const hN=new Date(now).getUTCHours(), hE=new Date(tEnd).getUTCHours();
-  const sig=base*Math.sqrt(SEAS[hE]/SEAS[hN]);
+  const sig=touchSigma(st,now,tEnd);
+  if(sig===null||!(sig>0)) return null;
```

Behaviour-identical: `test.js` asserts `touchSigma` returns exactly `base·√(SEAS[hE]/SEAS[hN])`,
which is the expression being replaced, for both the `rv60` and the `sig`-fallback branch. The point is that the swing read's `sm` must be *the same
number the Monte Carlo used*, not a re-derivation that can drift from it. One definition, two readers.

### 3.2b `volspace` must supply `sigmaIdentifiability`

`siJudge` calls it through the same `typeof … === "function"` guard as `impliedSigma`, so a partial splice
costs `vrp` (every container reads `vrpX: "nodiag"`) rather than throwing. But without it **no `vrp` is ever
written**, by design: an unjudged variance premium is the thing §7.6 exists to prevent. If `volspace` lands
without that symbol, the H5 column is honestly empty rather than dishonestly full.

### 3.3 Three new call sites and one new function

| where | what |
|---|---|
| `edgeSnapOne` @1298 | capture the pushed snap, `schemaPut(sn, edgeSnapFields(...))` |
| `swingTick` @1570 | capture the pushed read, `schemaPut(rd, swingReadFields(...))`; hoist `computeStats()` out of the per-side loop |
| `simCloseOne` @1639 | `schemaPut(row, journalEntryFields(e.reads[t.readIdx], t))` |
| 1 Hz loop @2833 | `try{ volCloseTick(Date.now()); }catch(e){}` next to `edgeProvisional` |

---

## 4. CSV columns — exact additions, in order

`exportCSV` is at `index.html:1425`. **Every new column is appended after the current last column of its
dataset.** Nothing is inserted, reordered or renamed.

Shared derivations, computed once per row in the exporter:

```js
const tag=(typeof eventTag==="function")?eventTag(T):{ev:null,evMins:null,evTier:null};
const hU=utcHour(T), sH=seasAt(T), sF=seasFactor(T,CLOSE);
const J=siJudge(ROW);   // {sir, xs, relPerCent, identified, ok, code} - the SAME function that gates vrp
```

`siJudge` is the single definition shared by the exporter and the `vrp` gate, so an export and a panel can
never disagree about which readings count. Its three diagnostic columns are **derived, not stored**: `sir` is
`si/sm` and `relPerCent` is a function of `xs`, `sm` and `tau`, all of which are already on the row (design
rule 2). They cost zero bytes and are always computable, because §2.1/§2.3 guarantee `si` is never written
without `sm` and `xs` beside it.

Empty cells are written as `""` (the existing convention for a missing value), never as `0`.

### 4.1 `# windows` — currently 20 columns, ending `fit`
Columns 21–45 are appended in this order.

| # | column | value |
|---|---|---|
| 21 | `sig_model_bpm` | `s.sm` |
| 22 | `sig_implied_bpm` | `s.si` |
| 23 | `x_std` | `s.xs` |
| 24 | `si_over_sm` | `siJudge(s).sir` — implied sigma as a multiple of the model's own. **~1 is a volatility disagreement; 200 is model misspecification** (§7.6) |
| 25 | `si_cond` | `siJudge(s).relPerCent` — fractional move in the implied sigma per **cent** of quote, at the model sigma. 14–31 at the money, ~0.04–0.45 on the wings |
| 26 | `si_ident` | `siJudge(s).ok ? 1 : 0` — did this reading pass both §7.6 tests |
| 27 | `depth_yes` | `s.dy` |
| 28 | `depth_no` | `s.dn` |
| 29 | `spread_c` | `edgeSpreadC(s.qm, s.ya)` |
| 30 | `mis_anl_c` | `misRatio(s.pa, s.qm, spread_c).mis` |
| 31 | `mis_over_spread` | `misRatio(s.pa, s.qm, spread_c).ratio` |
| 32 | `mis_head_c` | `misRatio(s.pm, s.qm, spread_c).mis` — quote-anchored, **not for H2** |
| 33 | `hour_utc` | `utcHour(s.t)` |
| 34 | `seas_hour` | `seasAt(s.t)` |
| 35 | `seas_factor` | `seasFactor(s.t, w.close)` |
| 36 | `ev` | `eventTag(s.t).ev` |
| 37 | `ev_mins` | `eventTag(s.t).evMins` |
| 38 | `ev_tier` | `eventTag(s.t).evTier` |
| 39 | `sig_realized_bpm` | `w.sr` (window level, repeated on each of its snaps) |
| 40 | `sig_realized_n` | `w.srN` |
| 41 | `vrp_bpm` | `w.vrp` |
| 42 | `vrp_ref_t` | `w.vrpT` as ISO, `""` when absent. Present **only** when `vrp_bpm` is |
| 43 | `vrp_omit` | `w.vrpX` — why `vrp` was not written: `noref/nosi/nodiag/atm/tail/cond/impl`. **`GROUP BY` this column before reporting any variance premium** (§7.6) |
| 44 | `is_ref_snap` | `1` when `s.t === w.vrpT`, else `0` — makes the one-observation-per-window rule filterable in the CSV instead of requiring the analyst to reimplement `refSnap` |
| 45 | `excluded` | `s.phantom \|\| ""` |

**Column 45 (`excluded`) is a bug fix, not an enrichment.** `repairLedgers` flags K1 edge snaps with `s.phantom`
(index.html:1729) and `refSnap` skips them, but the `# windows` dataset exports no such column — so an
analyst working from the CSV today silently re-includes rows the tool itself excludes. §10.4b claims
"both CSV datasets gain an `excluded` column"; that is true of swing and journal, and false of windows.

**The `spread_c` identity (col 29).** `qm` is written as `(yb+ya)/2` and `ya` as `yesAsk` from the *same
pair on the same line* (1298), so `yb = 2·qm − ya` and `spread = ya − yb = 2·(ya − qm)`. Both are stored
at 1 dp, so the recovered spread is exact to 0.2 c. Nothing is stored for it. Asserted in `test.js`.

### 4.2 `# windows_called` — unchanged

The rounds ledger is the user's own armed calls, not one of the three continuous row types, and no
H-protocol hypothesis is asked of it. Left exactly as it is.

### 4.3 `# swing_reads` — currently 16 columns, ending `excluded`
Columns 17–38 are appended in this order.

| # | column | value |
|---|---|---|
| 17 | `bid` | `r.bid` (dollars) |
| 18 | `spread_c` | `swingSpreadC(r.ask, r.bid)` — **cents**, converted from the dollar quotes so it is comparable with `# windows` |
| 19 | `depth_yes` | `r.dy` |
| 20 | `depth_no` | `r.dn` |
| 21 | `depth_at_ask` | `depthAtAsk(e.side, r.dy, r.dn)` |
| 22 | `sig_touch_bpm` | `r.sm` |
| 23 | `sig_implied_bpm` | `r.si` |
| 24 | `x_std` | `r.xs` |
| 25 | `si_over_sm` | `siJudge(r).sir` — as §4.1 |
| 26 | `si_cond` | `siJudge(r).relPerCent` — as §4.1 |
| 27 | `si_ident` | `siJudge(r).ok ? 1 : 0` — as §4.1 |
| 28 | `hour_utc` | `utcHour(r.t)` |
| 29 | `seas_hour` | `seasAt(r.t)` |
| 30 | `seas_factor` | `seasFactor(r.t, e.close)` |
| 31 | `ev` | `eventTag(r.t).ev` |
| 32 | `ev_mins` | `eventTag(r.t).evMins` |
| 33 | `ev_tier` | `eventTag(r.t).evTier` |
| 34 | `sig_realized_bpm` | `e.sr` |
| 35 | `sig_realized_n` | `e.srN` |
| 36 | `vrp_bpm` | `e.vrp` |
| 37 | `vrp_omit` | `e.vrpX` — as §4.1 |
| 38 | `is_ref_read` | `1` when `r.t === e.vrpT`, else `0` |

**Unit trap, flagged because it already exists:** swing rows quote in **dollars** (`ask` 0.05) while edge
rows quote in **cents** (`ya` 5). Both `spread_c` columns are in cents; `bid` stays in dollars to match
its neighbouring `ask`. Do not "fix" the existing units — that would change the meaning of a shipped
field.

### 4.4 `# simulation_journal` — currently 24 columns, ending `excluded`
Columns 25–45 are appended in this order.

| # | column | value |
|---|---|---|
| 25 | `bid_at_entry` | `t.bidIn` |
| 26 | `spread_at_entry_c` | `swingSpreadC(t.entry, t.bidIn)` |
| 27 | `depth_yes_at_entry` | `t.dy` |
| 28 | `depth_no_at_entry` | `t.dn` |
| 29 | `depth_at_ask_entry` | `depthAtAsk(t.side, t.dy, t.dn)` |
| 30 | `sig_touch_bpm` | `t.sm` |
| 31 | `sig_implied_bpm` | `t.si` |
| 32 | `x_std` | `t.xs` |
| 33 | `si_over_sm` | `siJudge(t).sir` — journal rows carry `si`, `sm`, `xs` and `tau`, so the same judgement applies unchanged |
| 34 | `si_cond` | `siJudge(t).relPerCent` |
| 35 | `si_ident` | `siJudge(t).ok ? 1 : 0` |
| 36 | `sig_realized_bpm` | `t.sr` |
| 37 | `vrp_bpm` | `t.vrp` |
| 38 | `vrp_omit` | `t.vrpX` — as §4.1 |
| 39 | `hour_utc` | `utcHour(t.tIn)` |
| 40 | `seas_hour` | `seasAt(t.tIn)` |
| 41 | `seas_factor` | `seasFactor(t.tIn, t.close)` |
| 42 | `ev` | `eventTag(t.tIn).ev` |
| 43 | `ev_mins` | `eventTag(t.tIn).evMins` |
| 44 | `ev_tier` | `eventTag(t.tIn).evTier` |
| 45 | `schema_v` | `t.sv \|\| ""` |

**Not specified, and why:** *spread at exit.* `simUpdate` receives only `bid`; capturing the exit spread
means changing its signature to take the ask as well and threading it from both call sites in `swingTick`
and `simClose`. That is a behavioural change to the exit machinery, which is exactly the code the S1 fix
just touched. It is a legitimate follow-up — `simUpdate(e, bid, ask, now)`, `t.askOut=ask` in
`simCloseOne` — but it is not a schema change and is deliberately left out rather than smuggled in.

### 4.5 Export header

Prepend one provenance line to the blob so a CSV is self-describing about the two things that are derived
rather than stored:

```
# schema v2 · exported <ISO> · fit <FIT_VERSION> · calendar DATED=<RELEASES.DATED.length> rows
```

---

## 5. The deferred settlement-volatility pass — `volCloseTick(now)`

**Realized sigma over a closed window is unrecoverable later.** `S.bars` keeps 360 minutes
(`acceptPrint`, index.html:822) and then drops the bars it needs. If it is not computed after the close
and stored, it is gone for good. This is the one new field that cannot be backfilled from an old export.

It cannot live inside `edgeProvisional`, because that function `continue`s on any window that already has
`w.result` — and `edgeGrade` may have set it first from Kalshi's own settlement. A window graded by
Kalshi would silently never get its realized sigma. So: one pass, run from the 1 Hz loop, independent of
the grading path.

```
for each edge window w with w.close < now-65000 and w.sr undefined and !w.srTried:
    ref  = refSnap(w)                                 // may be null
    B    = barsExcludingCurrent()
    f    = volCloseFields(ref, B.keys, B.closes, w.open, w.close)      // the ROW, not a bare sigma
    if f has sr:  schemaPut(w, f); changed=true                        // f carries vrp/vrpT/vrpX already
    else if schemaVolGiveUp(now, w.close): w.srTried=1; changed=true
for each swing entry e, same shape, with ref = the mid-life clean read (swingStats' selection)
    and, on success, stamp sr/vrp/vrpX onto every S.journal row with row.ticker===e.ticker
if changed: ledgerSave() / swingSave() / jSave()
```

**`volCloseFields` takes the reference ROW, not a bare implied sigma.** This is a deliberate signature change
from an earlier draft and it removes two whole classes of caller bug. The gate in §7.6 needs `si`, `sm`, `xs`
and `tau` *together* — a bare number cannot be judged — and `vrpT` is now stamped inside the function, only
when `vrp` was actually written, so a provenance stamp can never point at a read that produced no value.
Callers pass `refSnap(w)` (or the mid-life clean read) straight through and do nothing else.

Three properties this shape has, each deliberate:

- **`srTried` is set only on give-up, never on a failed attempt.** This is L2's exact lesson: on a
  reload, the 1 Hz loop runs before `seed()` lands, so the first attempts see empty bars. Marking tried
  there would permanently lose the reading for every window that closed while the app was down.
- **Give-up is bounded.** `schemaVolGiveUp` fires at 300 minutes past the close, inside the 360-minute
  bar buffer. Past that the answer is genuinely unavailable and retrying every second forever is waste.
- **A partial result is never written.** `volCloseFields` returns `{}` when `realizedSigmaInfo` cannot
  produce a sigma — and also when the realized sigma is positive but below the 0.005 bp/min storage
  resolution, because rounding that to `sr: 0` would fabricate a measurement of no volatility and propagate
  as `vrp = si − 0`. A window is retried rather than stamped with a wrong number.
- **A window that gets `sr` always gets either `vrp` or `vrpX`.** There is no third state, so the count of
  omissions is complete by construction rather than by the caller remembering to record it.

Backfilling `sr`/`vrp` onto existing journal rows mutates rows already in the ledger. That is safe under
the compatibility contract — it only *adds* optional keys to rows that lacked them, and touches no
existing key, no P&L, and no bankroll.

---

## 6. Backward compatibility — behaviour of each new field on a pre-existing row

Thousands of rows already exist on the recorder from `build-20260906004231`, plus whatever the K1 repair
just marked. The contract:

| new field | on a pre-existing row | consumer rule |
|---|---|---|
| `sm`, `si`, `xs`, `dy`, `dn`, `bid`, `bidIn` | **absent** (`undefined`) | `row.sm===undefined ? null : row.sm`. CSV writes `""`. |
| `sv` | **absent** — treat as schema 1 | `row.sv \|\| 1` |
| `sr`, `srN`, `vrp`, `vrpT`, `vrpX` | **absent**, and they stay absent: `volCloseTick` will attempt an old window once and hit `schemaVolGiveUp` immediately (its close is far past 300 min), setting `srTried` and never trying again | absence means "the bars for that window were gone before this build shipped" — an honest, permanent, correctly-recorded gap |
| `srTried` | **absent** → falsy → the pass will consider it once, and immediately give up as above | no consumer reads it except the pass |
| `ev`, `evMins`, `evTier`, `hour_utc`, `seas_*`, `spread_c`, `mis_*`, `depth_at_ask` | **fully populated** — they are derived from `t`, which every existing row already has | none; they are export-time only |

**Nothing about an existing field changes.** No key is renamed, no unit is converted, no rounding is
altered, no meaning is redefined, and no `v` literal is touched. A row written by the old build and a row
written by the new build with nothing to report are the same bytes.

**Loading is already tolerant.** `ledgerLoad`, `swingLoad` and `jLoad` `JSON.parse` and shape-check the
container only; nothing validates row keys, and every consumer (`edgeStatsOn`, `swingStats`,
`journalStats`, `refSnap`, `computeVerdict`, `renderEdge`, `renderSwing`, `renderJournal`) reads named
fields. There is no schema validation to update and no migration to run.

### 6.1 `repairLedgers` / `isPhantomK1` — confirmed unaffected

`isPhantomK1` reads exactly three properties: `o.tau`, `o.ask ?? o.entry`, and `o.p`. The edge-snap
variant of the rule (index.html:1729) reads `s.tau` and `s.qm`. **None of the eleven fields this spec
adds — `sm, si, xs, dy, dn, bid, bidIn, sv, sr, srN, vrp` (plus `vrpT`, `srTried` on containers) — uses
any of those names**, and the collision check is asserted mechanically in `test.js` against a
reserved list of every existing ledger key, not merely reasoned about. `test.js` also runs the transcribed `isPhantomK1`
against a phantom row and a clean row before and after enrichment and asserts the verdict is identical.

The repair is versioned under `btc.repair` with `REPAIR_VERSION=1` and returns early when it has already
run, so shipping this spec does not re-run it. **Do not bump `REPAIR_VERSION` for a schema change** —
these fields are not phantom-detectable and re-running would achieve nothing while risking a second pass
over already-withdrawn bankrolls.

### 6.2 `refSnap` — confirmed unaffected

`refSnap` reads `s.tau` and `s.phantom` only. Neither is touched. `test.js` asserts that enriching every
snap in a window does not change which snap `refSnap` selects, and that a v1 snap with none of the new
fields is still selectable. The one-observation-per-window rule is untouched, and `vrp` is explicitly
built on top of it rather than beside it: `vrpT` records the *same* snap `refSnap` chose.

---

## 7. Honest caveats a downstream analyst must be told

### 7.1 `si` is not the whole vol surface
It is inverted from the **mid**, so it inherits half the spread as noise. `spread_c` is exported beside
it precisely so that can be conditioned on.

### 7.2 `si` is missing **not at random**, and the bias has a sign
**This subsection describes one of two missingness mechanisms. The larger one is §7.6 — read that too.**

Inverting the analytic fair value for sigma has a hard structural cap when the strike sits **above** spot
(`x > 0`): `p_over` peaks at `pMax = 1 − Φ(√(2x))` and no sigma reproduces a quote at or beyond it. A
KXBTC15M strike is set **at the money at open**, so `x ≈ 0` at exactly the moment the market is most
liquid, and near-ATM quotes above `pMax` are common. Consequently:

- `si` will be **null far more often when spot is below the strike than above it.**
- Dropping null `si` rows without conditioning would silently select on the sign of `xs` and bias any
  H5 result.

`xs` is stored on every row specifically so this is diagnosable: the analyst can compute `pMax` from
`xs`, `sm` and `tau` and separate "unattainable" from "not computed". `impliedSigmaInfo` in the
`volspace` unit returns a `reason` string live; it is deliberately **not** persisted (it would cost ~30
characters per row to record something reconstructible from `xs`).

### 7.3 `dy`/`dn` are top-5 depth, not full book
`kParseBook` sums whatever `depth=5` returned. It is a *proxy* for liquidity, bounded above by the five
best levels on each side. Call it `depth_top5` in any writeup; do not present it as book size.

### 7.4 `vrp` is one observation per window, by construction
It is not the window's average variance premium. It is the premium implied by the single reference read,
minus the realized sigma of the whole window. That asymmetry is intentional (it is the only pairing
consistent with every other score in the tool) and must be stated wherever `vrp` is reported.

### 7.5 Nothing here is a signal
Every field above is measurement. None of it may drive a highlight, a suggestion or an arm until it has
earned it in a ledger, per §7.6 of CLAUDE.md. The H2 ratio in particular will look alive long before it
means anything.

### 7.6 `si` and `vrp` are **ill-posed at the money**. The 15-minute series is the worst case for this
measurement; the hourly ladder's off-the-money rungs are the best

**This is the most important caveat in the document and it governs the field H5 turns on.**

**The mechanism.** With `x = log(strike/S0)` and `u = sigma*sqrt(tau)`, the analytic fair value the whole
codebase uses is `p_over = 1 - Phi(x/u + u/2)`. Away from the money sigma enters at **first order** through
`x/u`. At `x = 0` that term vanishes and sigma survives only in the **second-order** drift `u/2`, so the
price is nearly independent of sigma and the inverse is nearly unbounded. Quantitatively, `relPerCent` — the
fractional move in implied sigma caused by **one cent** of quote — reads **14–31 at the money against
~0.04–0.45 on the wings**, a hundredfold separation. Half a cent of quote granularity moves the implied sigma
from 9 bp/min to 75 (154 at `tau = 3`).

**Why that lands on the flagship dataset.** A **KXBTC15M strike is set at the money at open**, so the
15-minute series is *born unidentified* and becomes identifiable only later in the window, once price has
moved off the strike. The **hourly KXBTCD ladder** has rungs away from spot that are identified from the
first poll. If you want a variance premium you can defend, **measure it on the hourly off-the-money rungs**
and treat the 15-minute series as the hard case, not the other way round.

**A second, nastier failure that conditioning does not catch.** For a strike **above** spot, `p_over` is not
monotone in sigma: it rises to a cap `pMax = 1 - Phi(sqrt(2x))` and falls back, so there are **two** roots
below the cap and **none** above — an ordinary 49c quote on a 5 bp OTM strike has no implied sigma at all.
For a strike **below** spot with a quote under 50c the root exists but is economically absurd: a −10 bp
strike at an ordinary 40c quote inverts, exactly and with a comfortable 10%/cent conditioning, to about
**1805 bp/min** against a tape that produces about **9**. Each step is individually correct and the output is
noise. Wired straight through, `vrp` would render it as a colossal premium — the exact failure CLAUDE.md §7
rule 6 exists to prevent.

**What this spec does about it, and what it deliberately does not.**

1. **`si` never travels alone.** It is written only when `sm` (the model's own sigma for the same row) and
   `xs` (the standardised strike distance) are written too. So `si/sm` and `xs` are always available and an
   absurd reading is *visibly* absurd: 1805 against a model 9 is a ratio of 200, and 200 is the number that
   says "model misspecification", not "implied volatility".
2. **`vrp` is written only when the reading is identified and plausible**, per `siJudge` in `code.js`:
   - **identifiability, quote-free** — `sigmaIdentifiability(x, sigModel, tau)` against `volspace`'s
     pre-registered `VRP_REL_MAX = 0.5` (one cent of quote may move sigma by at most 50% of itself). It looks
     only at where the strike sits in model-sigma units, so it selects on the **strike**, never on the answer.
     Gating on the conditioning of the *solution* instead would select on the quote's own inversion and bias
     whatever `vrp` then measures. The identified region is a **band in `|xs|`**, not a half-line: it
     collapses at the money because `xs -> 0` and in the far tail because `phi(xs) -> 0`.
   - **plausibility** — `si/sm` inside the pre-registered band `[SCHEMA_SIR_MIN, SCHEMA_SIR_MAX] = [0.25, 4]`.
     This one *does* look at the answer, and is labelled as such. It is necessary because conditioning does
     not catch the 200x case above. Its floor is derived: within this tool's own model family two sigmas
     describing the same tape differ by at most `sqrt(1.934/0.804) * 1.089 = 1.69` (the SEAS ratio times the
     TERM factor), so anything past that is the model failing rather than a disagreement about volatility.
     4 is roughly 2.4x that widest in-family disagreement, deliberately loose. **It is a judgment number,
     fixed before any `vrp` data existed, exactly as `VERDICT_RULE`'s thresholds were. Changing it to admit
     more readings is tuning a filter against its own results; any change is a recorded re-registration, not
     an edit.**
3. **The omission is countable, not silent.** Every window that produced an `sr` but no `vrp` carries
   `vrpX` — `noref | nosi | nodiag | atm | tail | cond | impl` — exported as `vrp_omit`. Group by it and the
   selection effect is a measured quantity. A filter that removes most of the dataset cannot hide.
4. **Nothing is destroyed.** A rejected row keeps `si`, `sm`, `xs` and `tau`. Only the *composite* `vrp` is
   withheld, so an analyst can recompute it under any other rule and measure exactly what this rule excluded.
   That is the ungardenable property (CLAUDE.md §4) applied to a derived field.
5. **Which root.** Where two roots exist (`x > 0`, `q < pMax`) the **low** one is stored. It is the branch
   continuous with realized-vol magnitudes: BTC per-minute sigma runs ~5–15 bp, while `u* = sqrt(2x)` for a
   5 bp strike distance sits ~10x above that, so the high root is ~250x the tape's volatility and is never a
   volatility reading. `test.js` pins this with a **recovery** test — a quote generated from a known sigma at
   a strike above spot must invert back to that sigma — because a repricing test cannot tell the roots apart:
   *both* reprice the quote they came from, exactly.

**How much it actually buys, measured.** `FIX-probe-gate.js` splices the real `volspace` and the real
`code.js` into one context and simulates ~57,000 KXBTC15M snapshots in which the market quotes the *true*
probability on Kalshi's 1c grid — so the market is perfectly calibrated by construction and **the true
variance premium is exactly zero**. Against a true sigma of 9.20 bp/min:

```
mean implied sigma, all rows (ungated)   9.82 bp   -> +0.62 bp/min of premium that does not exist
mean implied sigma, rows the gate keeps  9.25 bp   -> +0.05 bp/min
omissions: atm 2800 | tail 3709 | cond 146        (written 53003)
```

The gate removes ~92% of the spurious premium. **It does not remove all of it**, and it is not supposed to:
tick granularity still biases what survives. That is what `si_cond` is exported for. Report the omission
tally beside the number, condition on `si_cond`, and do not treat a small positive `vrp` as a finding.

**What it does not do:** it does not clamp, it does not substitute the model sigma for a missing implied one,
and it does not choose the threshold after looking at the `vrp` distribution. Choosing `SCHEMA_SIR_MAX` or
`VRP_REL_MAX` to fit results would be exactly the tuning CLAUDE.md §4 forbids.

**The honest bottom line for H5:** on the 15-minute series a large share of readings will be omitted, mostly
`atm`, and mostly early in each window. That is not a defect in the data; it is the measurement telling you
where it has nothing to say. **Report the omission counts beside any variance-premium number, or the number
means nothing.**

---

## 8. Storage cost — **material, and the ledger already does not fit**

Measured with `node sizing.js` (in this directory; JSON character counts of realistic row shapes taken
from the write sites). The only estimates are the window mix — ~4 fifteen-minute windows and ~13 hourly
ladder rungs within 150 bp per clock hour, ~17 windows/hour — everything else is measured.

| row | now | added | |
|---|---|---|---|
| edge snap, live 15m (book attached) | 149 B | **+50 B** | +34% |
| edge snap, hourly rung (no book) | 147 B | **+31 B** | +21% |
| edge window container, `vrp` written | 245 B | +58 B | +24% |
| edge window container, `vrp` omitted (`vrpX`) | 245 B | +39 B | +16% |
| swing read | 127 B | +61 B | +48% |
| journal trade | 349 B | +91 B | +26% |

| ledger, at its existing cap | now | added | total |
|---|---|---|---|
| `btc.edge` (1,500 windows ≈ 39,700 snaps) | **5.98 MB** | +1.35 MB | **7.33 MB** |
| `btc.swing` (6,000 reads) | 750 KB | +357 KB | 1.08 MB |
| `btc.journal` (3,000 trades) | 1.00 MB | +267 KB | 1.26 MB |
| **total** | **7.71 MB** | **+1.96 MB** | **9.67 MB** |
| typical localStorage quota | | | **5.00 MB** |

**The §7.6 gate does not make this cheaper.** A container carries *either* `vrp` + `vrpT` *or* `vrpX`, never
both and never neither once `sr` exists, so the worst case is unchanged and the table above bills it. The
three diagnostic columns `si_over_sm`, `si_cond` and `si_ident` are **derived at export and stored on no
row**, so the honesty fix costs zero bytes. Gating `si` on `sm`/`xs` (§7.6) removes a handful of rows'
worth and is not counted as a saving.

**Say it plainly: `btc.edge` alone exceeds a 5 MB origin quota at its own cap, before a single new field
is added, and it reaches that cap in about 3.7 days of continuous recording.** Defect L1 — the silent
ledger loss — is therefore not a hypothetical edge case; on the desktop recorder of record it is the
steady state. The L1 fix stopped one ledger's quota failure from killing the other two; it did not stop
the edge ledger from failing. `S.ledgerErr` records which key last failed and nothing surfaces it.

This addition makes a real problem worse by 25%. It should not ship without a cap fix. Three options,
in the order I would take them:

**A. Fix the cap properly (recommended, and needed regardless of this spec).** `ledgerSave` should trim
to a **byte budget**, not a window count: serialize, and while the string exceeds ~3.5 MB drop the oldest
window and re-serialize. Same policy as the existing 1,500 cap (oldest-first), but with a bound that is
true. Record the drop count in `S.ledgerErr`'s neighbourhood so it is visible rather than silent.

**B. Hoist `fit` from the snap to the window — saves 0.91 MB, more than two thirds of what this spec
costs.** `"fit":"fit-2026-09-05-a"` is 25 characters repeated on all ~39,700 snaps for a value that is
constant per build. Reading it back as `const fit = s.fit || w.fit || ""` is tolerant of both layouts, so
no existing row changes and no meaning changes — only the location of a new row's copy. It does relocate
a shipped key, so it is listed as a **separate decision for the user to approve**, not folded into this
spec.

**C. Reduce the window cap 1,500 → 900** — saves 2.93 MB and still holds ~2 days of windows, which is
more than the 200-window verdict rule needs. Cheapest to implement, but it discards real data, so it
ranks below A and B.

**What I would not do:** drop `pd`/`pe`/`pf` to make room. They are the comparator estimators the verdict
is scored against; deleting recorded observations to fit a new field is exactly the gardening the tool
exists to prevent.

If none of A/B/C is taken, the honest position is that **this spec should not be implemented on the edge
ledger** — the swing and journal additions (+624 KB total) are affordable on their own, and the edge
enrichment can wait for a cap fix. Adding 1.35 MB to a store that already silently drops writes would
mean losing *more* data than the new fields are worth.

---

## 9. Summary of what is stored vs derived

| | stored on the row | derived at export |
|---|---|---|
| H5 vol triple | `sm`, `si` (per row); `sr`, `srN`, `vrp`, `vrpT`, `vrpX` (per container) | `si_over_sm`, `si_cond`, `si_ident` |
| H2 liquidity | `dy`, `dn`, `bid`/`bidIn` | `spread_c`, `depth_at_ask` |
| H2 mispricing | — | `mis_anl_c`, `mis_over_spread`, `mis_head_c` |
| event proximity | — | `ev`, `ev_mins`, `ev_tier` |
| seasonality control | — | `hour_utc`, `seas_hour`, `seas_factor` |
| provenance | `sv` | `schema_v`, export header |
| scoring rule | `vrpT` | `is_ref_snap`, `is_ref_read` |
| vrp selection | `vrpX` | `vrp_omit` |
| repair state | `phantom` (existing) | `excluded` (**new on `# windows`**) |

Twelve stored keys, nineteen derived columns, zero changes to any existing field.

**And one line to carry away:** `vrp` is a measurement with a domain. Outside that domain it is omitted and
the omission is counted, because at the money the quote contains almost no volatility information and a
number computed there would be noise wearing the clothes of an opportunity. §7.6.
