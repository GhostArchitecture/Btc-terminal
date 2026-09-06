# Adversarial review — unit `schema`

Reviewed: `code.js` (200 lines, 21 symbols), `test.js` (109 assertions), `SPEC.md`, `NOTES.md`, `sizing.js`.
`node test.js` reproduces green, exit 0, 109/109.

Method: rather than trusting `test.js`'s reimplementation of `impliedSigma` / `realizedSigmaInfo`, I spliced
the **real** `volspace/code.js`, the **real** `normCdf` lifted out of `index.html`, and `schema/code.js` into
one vm context and drove it with realistic and adversarial inputs. Two probes are checked in beside this file:

    node REVIEW-probe-si.js        # F1 — a calibrated-market simulation of si / vrp
    node REVIEW-probe-branch.js    # F3 recovery + branch coverage, F2 false zero

---

## Verdict

**The unit is sound as code.** The math is right, the units are right, the omit-never-null discipline holds
under fuzzing, and nothing in it can throw in the browser. One finding is material and it is not a coding
error — it is a caveat that `SPEC.md §7` was written to catch and misses, on the flagship dataset. Two are
small. One is a test gap that would let a real regression through.

What I verified as correct, by construction rather than by reading:

- **The analytic inversion recovers the sigma that generated the quote, exactly.** Over
  `tau ∈ {1, 3, 6, 9, 14.5}` × strike offsets `−40 … +40 bp`, max `|si − true|` = **0.0000 bp**
  (probe B §1). Units are consistent throughout: per-minute sigma, `tau` in minutes, `x = log(strike/S0)`,
  `si = sigma · 1e4`. No annualisation, no ms/minute slip. The low branch is the right branch in every
  realistic cell — `volspace`'s claim about it holds up.
- **`depthAtAsk`'s orientation is right**, which is the one place a silent inversion would flip H2's sign.
  `kParseBook` (index.html:1042) sets `yesAsk = 100 − bestNoBid`, so YES offers *are* resting NO bids;
  `depthAtAsk("YES", dy, dn) → dn` is correct.
- **`touchSigma` matches `touchProb` line for line** (index.html:1521–1522): `base · √(SEAS[hE]/SEAS[hN])`,
  `rv60` preferred over `sig`, no `termFactor`. `sm` on a swing read really is the sigma that produced `p`.
- **`edgeSpreadC`'s identity is exact.** `edgeSnapOne` writes `qm = +((yb+ya)/2).toFixed(1)` and
  `ya = +ya.toFixed(1)` from the same pair on the same line, so `2(ya − qm) = ya − yb`; the stated 0.2¢
  bound from the two 1 dp roundings is right. `swingSpreadC` agrees with it for both sides, because
  `noAsk − noBid = (100−yb) − (100−ya) = ya − yb` under `kParseBook`'s construction.
- **`misRatio`'s circularity argument is correct.** `pm` is the residual whose `z` carries `−5.023·spread`
  (index.html:2027), so `(pm − qm)/spread` would be mechanically related to its own denominator. Passing
  `pa` is the right call and the reasoning is stated where a future reader will find it.
- **Purity and robustness.** 57,375 junk-input cases across every public entry point: **zero throws**, zero
  `null`s or non-finite values emitted into a bundle. `typeof impliedSigma === "function"` is safe against an
  undeclared identifier, and both volspace symbols are hoisted function declarations, so there is no TDZ risk
  whichever order the orchestrator splices the blocks.
- **No name collisions.** All 21 symbols grep 0 in `index.html` *and* 0 across the sibling units
  (`volspace`, `detect`, `prereg`, `calendar`). No non-ASCII. No ES2020+ syntax.
- **`SCHEMA_VOL_GIVEUP_MS = 300 min` is derived, not invented** — the 360-bar buffer at index.html:822.
  The backward-compatibility checks against `isPhantomK1` and `refSnap` are mechanical, not prose.

---

## F1 — MATERIAL. `si`/`vrp` are noise at the money, and the CSV ships no way to see it

`si` is a correct inversion, but near the money it is an **ill-posed** one, and the primary dataset —
KXBTC15M, whose strike is set *at the money at open* — lives exactly there.

The mechanism: away from the money, sigma enters `p_over` at first order through `x/(σ√τ)`. At `x ≈ 0` that
term vanishes and sigma survives only in the second-order drift `−½σ²τ`, so the price is nearly independent
of sigma and the inverse is nearly unbounded. `volspace`'s own conditioning number says so out loud —
`impliedSigmaInfo().relPerCent` is **14–31 at the money against ~0.04–0.45 everywhere else**, a hundredfold
separation. Concretely, at `tau = 14.5` and a strike within a basis point of spot, **half a cent** of
quote-mid granularity moves the stored `si` from 9.2 bp/min to 75 bp/min (93 at `tau = 9`, 112 at 6, 154 at 3).

`REVIEW-probe-si.js` puts a number on the consequence. It simulates 4,000 KXBTC15M windows in which the
market quotes the *true* probability on Kalshi's 1¢ grid, so the market is perfectly calibrated by
construction and **the true variance premium is exactly zero**:

```
snaps 57014   si present 53988 (94.7%)
TRUE sigma 9.2 bp/min -> true vrp is exactly 0 by construction
mean si 13.39 bp   median si 9.23 bp
=> mean vrp reports 4.19 bp/min of premium that does not exist        <-- +46%

by |xs|:      0-0.05   n=6776    mean si 42.60   median si 64.72      <-- the entire distortion
           0.05-0.2    n=8108    mean si  9.20   median si  9.18
            0.2-0.5    n=13317   mean si  9.20   median si  9.20
            0.5-1      n=12831   mean si  9.20   median si  9.20
              1-99     n=15982   mean si  9.21   median si  9.21
by sign of xs:   xs<0  n=25353   mean si  9.26
                 xs>=0 n=31661   mean si 17.05
```

Two things follow, and neither is in `SPEC.md §7`:

1. **`vrp` will report a large positive variance premium against a market that has none.** +4.19 bp/min on
   a true 9.2 — a 46% overstatement — from tick granularity alone, before any real effect exists. H5 asks
   whether a variance premium exists; as specified, the answer is yes whatever the market does.
2. **§7.2 warns about the wrong failure mode.** It tells the analyst that `si` is missing non-at-random and
   to condition on the *sign* of `xs`. That split does not remove this: `xs ≥ 0` reads 17.05 and `xs < 0`
   reads 9.26, so the sign split alone still leaves a spurious premium. The variable that does separate it
   is `|xs|` (or equivalently `relPerCent`) — 11.9% of snaps sit in `|xs| < 0.05` and carry a **median**
   `si` of 64.7 against a truth of 9.2. Not a fat tail: the whole near-ATM distribution is displaced.

This is cheap to fix and needs no extra storage, so it does not disturb §8's byte budget. `relPerCent` is
exactly reconstructible offline from the fields already stored — `x = xs · (sm/1e4) · √tau`, `σ = si/1e4` —
so under the spec's own design rule 2 it stays a computed CSV column. What is missing is that the spec
never names it. Recommend:

- add `si_cond` (= `relPerCent`) to the `# windows` and `# swing_reads` column lists in §4, beside `si`;
- rewrite §7.2 (or add §7.6) to state that **`si` and `vrp` are uninterpretable near the money**, give the
  measured magnitude, and pre-register the filter — e.g. `|xs| ≥ 0.05` or `si_cond ≤ 1` — *before* the data
  arrives, per CLAUDE.md §7.6 and the verdict-rule precedent. Choosing that threshold after seeing the
  `vrp` distribution is exactly the tuning §4 forbids.

The unit's charter is that it must never present noise as signal. Everything else in it honours that; this
one number does not, and it is the number H5 turns on.

## F2 — MINOR but real. `sigBp` can write a fabricated `si: 0`

`sigBp` rounds to 2 dp of a basis point and `schemaSet` writes a legitimate zero, so a strictly-positive
implied sigma below 0.005 bp/min is stored as `si: 0` — indistinguishable from a genuine reading of zero
volatility, and it propagates as `vrp = 0 − sr`, a large negative premium out of nowhere. Probe B §3:

```
strike = S0+$0.01  raw 1.858e-3 bp/min -> stored si = 0   <-- a fabricated zero
strike = S0+$0.05  raw 9.288e-3 bp/min -> stored si = 0.01
```

Reachability is low — it needs `|strike − S.idxPx| ≲ $0.05` — but it is not zero across ~40,000 snaps at
the cap, and each such row is an outlier in the one series H5 reads. It is also the only place in the unit
where an unrepresentable value becomes a number instead of an omission, which is the exact inversion of the
rule the unit is built around. One-line fix in `sigBp`: when `sig > 0` and the rounded result is `0`, return
`undefined` (or widen to 3 dp). `sr` and `sm` are unaffected in practice — neither `rv60` nor a realized
sigma over contiguous minute bars gets that small — so the guard costs nothing.

## F3 — TEST GAP. The suite cannot tell the low root from the high root

`test.js`'s only `si` value assertion is *"si reprices the quote it was inverted from"* — which a bisection
with a tolerance check guarantees by construction, and which **both** roots satisfy wherever `x > 0`. Every
`si` value case in the file uses `strike = 112400 < S0 = 112500`, i.e. `x < 0`, where only one root exists;
the two `x > 0` cases assert presence/absence, never a value. Probe B §2:

```
strike 5bp ABOVE spot, tau 9, q 0.40:
   low root     6.60 bp/min  reprices to 0.400000
   high root 1682.38 bp/min  reprices to 0.400000
```

So a low/high branch swap in `volspace` — a sibling unit that can still change — would store sigmas ~250×
too large on every above-the-money row and leave all 109 assertions green. The branch choice is the single
most consequential decision in the `si` pipeline and it is untested.

Fix: one assertion. Generate `q` from a known sigma at a strike **above** spot and assert `si ≈ that sigma`
(a recovery test, not a fixed-point test). It passes today — probe B §1 measures max error 0.0000 bp across
the whole realistic grid — so this is a regression guard, not a bug report. Worth adding the same shape for
`swingReadFields`, whose `si` is likewise only checked for repricing.

## F4 — MINOR hardening. `seasFactor(null, null)` returns 1, not `undefined`

`new Date(null)` is the epoch, not an Invalid Date, so `getUTCHours()` returns 0, `SEAS[0]` is valid, and
`seasFactor(null, null) === 1`. `touchSigma({rv60: 0.001}, null, null)` therefore returns `0.001` and
`swingReadFields` writes an `sm` — the one input class in the unit where junk yields a number instead of an
omission. (`undefined`, `NaN` and strings all correctly yield `undefined`.) Not reachable from the call site
`SPEC §2.3` specifies — `swingTick` always passes real timestamps — so this is hardening, not a live bug.
`if(typeof now!=="number"||typeof tEnd!=="number") return undefined;` closes it.

## F5 — SPEC nit for the orchestrator. `vrpT` can be stamped with no `vrp`

`SPEC §5`'s pseudocode does `if(ref) w.vrpT = ref.t` unconditionally, but `volCloseFields` omits `vrp` when
`ref.si` is absent (an unattainable near-ATM quote — see F1 — is the common case). The result is a window
carrying a provenance stamp pointing at a read that produced no value. Gate it: `if(ref && f.vrp !== undefined)`.

## F6 — SPEC nit. Off by one on the contiguous-return count

`§2.2` says a 15-minute window "yields at most 14" returns. `realizedSigmaInfo` keeps keys in
`[floor(open/60000), floor(close/60000)]` inclusive — 16 keys, hence **15** returns. Immaterial (the default
`minN` is 10 either way), but it is a stated count in a spec whose value is its precision.

---

## Considered and dismissed — not defects

- **`vrp` pairs an implied sigma read at `refSnap` (τ ≈ 6 min) against realized sigma over the whole
  window.** This is a genuine asymmetry, but `SPEC §7.4` states it explicitly and justifies it as the only
  pairing consistent with the one-observation-per-window rule. Disclosed, therefore honest.
- **`si` inherits half the spread as noise** — disclosed in §7.1, with `spread_c` exported to condition on.
- **Both sides of a swing window carry the same `si`.** `NOTES.md` flags this as the judgement call to push
  back on. The mid is right: a one-sided ask is not a probability, and inverting it would report the spread
  as volatility. Keep it.
- **`dy`/`dn` are top-5 depth only** — disclosed in §7.3, with the right instruction (call it `depth_top5`).
- **`swingSpreadC` can return a negative spread** when `swingSides` takes `ask` from the market object while
  `bid` comes from `K.ob`. It is a visible anomaly in an exported column, not a silent wrong number, and
  `misRatio` already guards `s > 0`.
- **`xs` uses `P.sigU` (with `termFactor`) on an edge snap and `touchSigma` (without it) on a swing read.**
  Correct in both places — each row's `xs` is standardised by the sigma that row's own model used, and both
  are recoverable because `sm` travels with `xs`. Worth one sentence in §7 so nobody pools the two columns
  naively, but it is not an error.
- **`strikeProbs` does not return `S0` today** (index.html:2037), so `si` *and* `xs` both depend on the §3.1
  change landing. The guards degrade to omission rather than throwing, which is the right failure. Note for
  the orchestrator: `strikeProbs` already computes `xs = x/sd` internally at line 2028 — returning that
  alongside `S0` would make `xs` independent of the `S0` addition and remove a recomputation.
- **`sizing.js`'s finding that `btc.edge` already exceeds a 5 MB quota** is outside this unit's code but is
  the most important thing in `NOTES.md`, and it is stated against the author's own interest rather than
  buried. That is the standard the rest of the review is held to.
