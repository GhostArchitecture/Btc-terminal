# Adversarial review — the identifiability bound (commit 899276d, `VRP_TICK_REL_MAX = 0.20`)

Read-only review. Nothing in `index.html`, `test/` or the units was edited.

## Method

I did not use the unit's arithmetic, its NOTES, or the brief's numbers. I wrote an independent inversion of
`p_over = 1 - Phi(x/u + u/2)`, `u = sigma*sqrt(tau)`, `tau` in minutes, with a **high-precision `erfc`**
(Numerical Recipes, ~1e-16 rel) rather than the page's Abramowitz–Stegun `normCdf`, and my own bisection.
Scripts: `scratchpad/hproto/verify.js`, `hunt1..5.js`, `cmp.js`, `live.js`.

**The CLAUDE.md §11.8 table reproduces exactly**, at sigma 9 bp/min, tau 15, each strike quoted at its own
model-fair value:

| distance | xs | my tickRel | §11.8 | verdict |
|---|---|---|---|---|
| 0 bp | 0.000 | one-sided 1438% (`+1c` has no root: ATM `q>=0.5`) | "no root exists" | reject ✔ |
| 2 bp | 0.057 | 86.43% | 86.4% | reject ✔ |
| 5 bp | 0.143 | 21.79% | 21.8% | reject ✔ |
| 8 bp | 0.230 | 12.72% | 12.7% | accept ✔ |
| 10–35 bp | 0.29–1.00 | 10.06% → 4.24% | 4.2–10.1% | accept ✔ |
| 60 bp | 1.721 | **6.68%** | 6.7% | accept ✔ |
| 98 bp+ | 2.81+ | fair value 0.00245 < `VRP_Q_LO` | past clip | reject ✔ |

Both `normCdf`s agree to 5 significant figures throughout, so nothing below is an artefact of the page's
approximation. The band **does** contract in bp as tau decays (5 bp is identified at tau=3, not at tau=15).
Confirmed. Every claim §11.8 makes *at the model-fair quote* is true.

Everything that follows is about the fact that **a real book does not quote at model-fair value**, which is the
live case and the only case the stored gate ever runs on.

---

## D1 — CRITICAL. The gate is a cut on the quote, not on identifiability, and on real inputs it is a **loosening** of the bound it replaced

`vsTickSens` measures `|d log sigma_impl|` across one cent **evaluated at the implied sigma the quote itself
produced**. That quantity is, to three significant figures, a function of `q` alone — it is nearly blind to
strike distance and to horizon, the two things that actually determine whether sigma is identifiable.

Measured with the real page functions (`live.js`), `impliedSigmaTick(...).rel` at a fixed `q = 0.30`:

```
  x=2bp  tau=15   -> 5.762%
  x=10bp tau=15   -> 5.781%
  x=60bp tau=15   -> 5.900%
  x=120bp tau=60  -> 6.052%
  x=2bp  tau=0.05 -> 5.762%
```

A 60× range in strike distance and a 1200× range in tau move the gate's own statistic by 0.29 percentage
points. The pass set is essentially `q <= ~0.43` (strike above spot) or `q <= ~0.45` / `q >= ~0.55` (below
spot) — **for every strike and every horizon**.

**Concrete loosening witness** (real page code):

> `impliedSigmaTick(100000*exp(1e-4), 100000, 15, 0.43)` → `identified: true`, `rel = 0.169`, `sig = 1.5 bp/min`.

A strike **1 bp** from the money on a 15-minute window. The superseded gate —
`sigmaIdentifiability(x, sigModel, tau).identified` against `VRP_REL_MAX = 0.5` — rejected that strike at
**every** quote: `relPerCent = 0.9307 > 0.5`. Same at 0.5 bp (`relPerCent = 1.9894`), rejected before, accepted
now at any quote from 2c to 43c. §11.7 clause 6 permits raising a threshold and closes the programme on a
lowering; this edit is registered in `index.html:2861` and CLAUDE.md §11.8 as "a strict TIGHTENING", and on
these inputs it is not one. It is a tightening on the (measure-zero) set where the market quotes exactly
model-fair, and a loosening off it.

**Worse: the new gate selects on the outcome variable.** The superseded code carried the warning that says so,
and the warning was deleted along with the gate. `git show 0c36bbc:index.html:3683-3685`:

> "It asks only where the strike sits in model-sigma units, so it **selects on the STRIKE and never on the
> answer** — gating on the conditioning of the solution instead would select on the quote's own inversion and
> **bias whatever vrp then measures**."

That is precisely what the replacement does. `vrp = si - sr`, and at a fixed strike/horizon `si` is a monotone
function of `q`, so a cut on `q` is a cut on `vrp`. Demonstrated at x = +5 bp, tau = 15, sr = 9 bp/min:

```
  q     si(bp/min)   vrp        gate
  0.05     0.78     -8.22bp     KEPT
  ...
  0.40     5.12     -3.88bp     KEPT
  0.45    10.44     +1.44bp     DROPPED   <-- the only quote producing a positive premium
  0.50+   no root
```

Composed with the plausibility band (`SCHEMA_SIR_MIN/MAX`, the only other live filter), the reachable `vrp` set
is one-sided for near-money strikes. Under the exact null — implied = realized = model = 9 bp/min — here is
what the instrument is *able* to record:

```
  x= -2bp tau=15: recordable si 2.27-3.41 bp  => vrp -6.73 .. -5.59 bp   vrp CANNOT BE POSITIVE
  x= +2bp tau=15: recordable si 2.27-2.94 bp  => vrp -6.73 .. -6.06 bp   vrp CANNOT BE POSITIVE
  x= -5bp tau=15: recordable si 2.33-8.46 bp  => vrp -6.67 .. -0.54 bp   vrp CANNOT BE POSITIVE
  x= +5bp tau=15: recordable si 2.33-7.38 bp  => vrp -6.67 .. -1.62 bp   vrp CANNOT BE POSITIVE
```

H5 would report a large negative variance premium on near-money rows from a tape with no premium in it at all.
That is §7.4 (hindsight / retroactive selection) arriving through the gate rather than through the backtest.

---

## D2 — HIGH. §11.8's own motivating example passes the bound that was registered to stop it

CLAUDE.md §11.8, "Why the bound is needed at all":

> "Inverting anyway on an ordinary 40¢ quote yields readings like *1805 bp implied against 9 bp realized*:
> every step arithmetically correct, the output **pure quote-granularity noise**, presented as a colossal
> premium."

Run against the shipped code (`live.js`), strike 10 bp below spot, tau 8 min, q = 0.40:

```
impliedSigmaTick -> { identified: true, rel: 0.101, sided: "two", sig: 1805.3 bp/min }
```

`identified: true`. The gate admits it, at 10.1% — half the bound. The same holds at the money: x = 0 exactly
(the KXBTC15M open strike), q = 0.40 → `identified: true`, `sig = 1308 bp/min`, `rel = 10.25%`; q = 0.20 →
`identified: true`, `sig = 4346 bp/min`, `rel = 4.31%`.

Two things are wrong here, and they are separable:

1. **The bound does not do what §11.8 says it does.** Only `SCHEMA_SIR_MIN/MAX` withholds `vrp` on that row
   (code `impl`), and that band is registered for an explicitly different reason ("PLAUSIBILITY … this test
   does look at the answer"). The identifiability gate contributes nothing on the case that motivates it.
2. **The characterisation is wrong.** 1805 bp at a 40c quote is *not* quote-granularity noise — the inversion
   is well conditioned there (10.1% per cent). It is a well-conditioned inversion of a misspecified model.
   `volTriple`'s own comment (`index.html:3149-3153`) states this correctly — "It is not implied vol at all, it
   is model misspecification" — so the code and the registration contradict each other on the same reading.

---

## D3 — HIGH. §11.8's band, and both of its "load-bearing" consequences, hold only at model-fair quotes; the suite never tests anything else

§11.8: *"The band is fixed in **standardised units, not basis points** — roughly `0.23 ≤ |x/(σ√τ)| ≤ 1.8`"*, and
from it: *"A KXBTC15M window is **born unidentified and stays unidentified at its own strike for its entire
life**"*.

Both are refuted by the shipped code the moment the quote leaves fair value. At sigma 9 bp/min, tau 15, the
integer-cent quotes that pass `impliedSigmaTick`:

```
  x =  0.0 bp (xs 0.000, fair 49.9c):  2c-44c PASS
  x =  2.0 bp (xs 0.057, fair 47.6c):  2c-43c PASS   <- §11.8 says 2bp is never identifiable
  x = 60.0 bp (xs 1.721, fair  4.2c):  2c-42c PASS
  x = -5.0 bp (xs -0.143, fair 55.6c): 2c-45c and 56c-98c PASS
```

There is no band in `xs`. The apparent band in the §11.8 table is an artefact of holding `q = fair(xs)`, which
makes `q` a monotone function of `xs`; free the quote and the coordinate disappears.

`test/hprotocol.js:169-208` reproduces the same artefact: its `probe(tau)` helper computes
`q = 1-normCdf((x+0.5*sig*sig*tau)/(sig*sqrt(tau)))` — the model's own fair value — for **every** band
assertion, including the two the comments call load-bearing ("the first identifiable strike sits at the same
standardised distance", "a KXBTC15M window is therefore unidentifiable at its own strike for its whole life").
No test anywhere feeds the decider a quote away from model-fair, i.e. no test exercises the only regime the
live write path ever runs in. The suite asserts the implementation back to the special case the registration
was measured on.

*(The one-sided assertion at `test/hprotocol.js:207` is real and does hold — see D5 for where its analogue is
missing.)*

---

## D4 — MEDIUM. Rounding makes the operative bound 0.2005, and the write-site verdict and the settlement verdict disagree on the same row

`siTickWrite` (`index.html:3854`) stores `sq = schemaNum(t.rel, 3)` and **discards `t.identified`**. `siJudge`
(`index.html:4007`) re-decides from the rounded number: `if(!(out.tickRel <= out.bound))`. So a true `rel` in
`(0.2000, 0.2005]` rounds to `0.200` and passes a bound it exceeds. The effective registered bound is 0.2005.

Verified on the real page code: `impliedSigmaTick(100000*exp(80e-4), 100000, 15, 0.42)` →
`identified: false`, true `rel = 0.2003483`; stored `sq = 0.2`; `siJudge({si:115, sm:9, xs:2.295, tau:15, sq:0.2})`
→ `identified: true`.

Four inputs reach it *and* clear the plausibility band, so a `vrp` is actually written for a reading the
pre-registered decider refused. The cleanest:

> **strike 1 bp below spot, tau = 8 min, quote 56c** — true `rel = 0.200239`, `si = 2.34 bp/min`,
> `si/sm = 0.26` (inside `[0.25, 4]`). Write site: reject. `volCloseFields`: `j.ok === true`, `vrp` written.

(Also `x=-1bp` at tau 1 and 3 with q=56c, and `x=-32bp` tau 60 q=55c.) Small, but it is a pre-registered
threshold moving in the one direction §11.7 clause 6 forbids, and it is a silent disagreement between the two
places that evaluate the same rule.

---

## D5 — MEDIUM. On the prior path `siJudge` never sets `tickSided`, so a one-sided reading under the bound exports as an unmarked, re-filterable row

`siJudge`'s tick path sets `out.tickSided` (`index.html:4002`). Its **prior** path does not:

```js
out.gate="prior";
if(typeof sigmaIdentifiability!=="function"){ out.code="nodiag"; return out; }
const id=sigmaIdentifiability(x,sig,tau);
if(fin(id.bound)) out.bound=id.bound;
if(fin(id.tickRel)) out.tickRel=id.tickRel;   // <- id.tickSided exists and is dropped
out.identified=!!id.identified;
```

`sigmaIdentifiability` returns `tickSided` (`index.html:3111`); `siJudge` reads `tickRel` beside it and throws
`tickSided` away. Verified on the real code:

> `siJudge({si:12, sm:9, xs:2.295, tau:15})` (no `sq`) →
> `{gate:"prior", tickRel: 0.1277, tickSided: null, identified:false, code:"tail", bound:0.2}`

The underlying probe there is **one-sided "up"** — at x = 80 bp the `-1c` neighbour falls past `VRP_Q_LO` and
does not invert — and its surviving one-sided move, 12.77%, is **under** the 0.20 bound. `siJudge` itself gets
the verdict right (`identified:false`, via `sigmaIdentifiability`), but the CSV exports
`si_tick_rel = 0.1277`, `si_tick_sided = ""`.

§11.8 instructs the analyst: *"An analyst re-filtering at a different bound reads `si_tick_rel` and ignores
`si_ident`."* Do that, plus the documented "one-sided never passes" rule, and this row is admitted at any bound
≥ 0.13 — because nothing in the exported columns says it is one-sided. `x = 78–85 bp` at sigma 9 bp/min /
tau 15 is a whole contiguous family of such rows. The fix is one line (`out.tickSided = id.tickSided`), but I
am read-only; reporting it.

This affects pre-`sq` rows and any row written while the decider was not spliced — i.e. exactly the population
§11.8 says must remain separable.

---

## D6 — LOW/MEDIUM. `si_bound` is the export-time bound, and `si_ident` **is** retroactively re-gated

§11.8: *"`si_bound` (the bound in force **when the row was judged**)"* and *"**Rows written under the superseded
bound are not retroactively re-gated**"*.

`siJudge` sets `out.bound = VRP_TICK_REL_MAX` (`index.html:4004`) — the constant as it stands when `siJudge`
runs — and `exportCSV` calls `siJudge` **at export time** (`index.html:1476`, `sic(o)`). Nothing about the
bound is stored on the row. So:

- `si_bound` names the bound in force at export, not at judging.
- `si_ident` is recomputed at export under the current bound, i.e. rows *are* retroactively re-gated.
- `vrp` / `vrp_omit` are the stored settlement-time verdicts and are *not*.

Today the two coincide because there has been exactly one re-registration and no data. After the next one, a
single CSV row can carry `si_ident = 1` (new bound) next to `vrp_omit = "tick"` (old bound), with `si_bound`
naming only the new one and nothing on the row recording the old. `SCHEMA_VERSION` distinguishes containers,
not the bound.

---

## D7 — LOW. A number in the in-code registration tables that does not reproduce

Both comment tables — `index.html:2847` (volspace) and `index.html:3715` (schema) — give the true one-cent move
at 60 bp / tau 15 / sigma 9 bp/min as **6.3%**. My independent computation gives **6.68%**, with both `normCdf`
implementations, and CLAUDE.md §11.8 gives 6.7% (correct). The two in-code copies of the registration table
disagree with the registration itself on the very row that anchors the outer edge of the claimed band.

---

## Checks that PASSED — no defect found

- **One-sided readings never pass, on both branches.** `vsTickSens` leaves `identified:false` for `sided`
  `"up"`/`"down"`/`null` (`index.html:2966-2977`); `siJudge` maps `sqS` `"u"`/`"d"` → `tick1` and `"n"` →
  `tick0` and returns before `ok` (`4005-4006`); a two-sided marker with no number → `tick0` (`4006`). No path
  treats a missing neighbour as zero sensitivity. `siTickWrite` writes `sqS:"n"` with **no** `sq` when
  `t.rel` is null, and `schemaNum(null,3)` correctly yields `undefined` (key omitted), so `hasSqS` alone
  routes it to the tick branch. Verified by construction and by `test/hprotocol.js:207`.
- **Prior vs decider: the fallback cannot admit what the decider refuses.** The prior rejects everything with
  `|xs| < ~0.23` at any quote; the decider accepts almost any quote ≤ 43c at any `xs`. The decider is the
  strictly more permissive rule (which is D1). The fallback fires only for rows with `si` and no `sq`/`sqS`,
  and `siTickWrite` never produces that combination while `impliedSigmaTick` is defined — so in live code it
  reaches only pre-v3 rows, and `si_gate` separates them.
- **No inverted or mis-scaled comparison.** `VRP_REL_MAX = 0.5` is declared at `index.html:2873` and appears
  nowhere else except comments — it gates nothing, as registered. Every `<=`/`!(<=)` against
  `VRP_TICK_REL_MAX` compares a dimensionless fractional move to a dimensionless bound, in the right sense
  (`2970`, `4007`). `relPerCent` is never compared to `VRP_TICK_REL_MAX` anywhere.
- **`tau` units.** Minutes at both write sites: `swingReadFields` computes `(tEnd-now)/60000`;
  `edgeSnapFields` takes `P.tau` from `strikeProbs`, which is `max((R.tEnd-now)/60000, 1/60)`.
  `strikeProbs`'s `anl` is `clip(1-normCdf((x+0.5*sig*sig*tau)/sd))`, algebraically identical to `vsPOver`,
  so the volspace really does invert the engine's own analytic.
- **The mid-quote probe in `swingReadFields` is conservative, as claimed.** One cent on the mid is two cents of
  one-sided book, so the probe overstates the perturbation and can only tighten.
- **Rejections stay counted.** Every snap/read/trade row is exported whether or not it passes; `si_code` and
  `vrp_omit` carry the reason; `si_ident` is muted only for `noref`/`nosi`/`nodiag`, where there is nothing to
  judge. No silent absence found.
- **Tau extremes.** `tau = 1/60` min (the `strikeProbs` floor at the gate) and `tau = 60` (hourly ladder) both
  invert cleanly with no NaN, no unbounded branch, and no change in gate behaviour — which is itself D1.

## Informational

`volTriple`, `impliedSigmaInfo` and `varPremium` are not called anywhere outside the volspace unit. The
`ratioModel` diagnostic that volTriple exists to surface ("that reading is 200x the model's own volatility")
never reaches a panel, a ledger or the CSV. The only live plausibility check is `SCHEMA_SIR_MIN/MAX` inside
`siJudge` — which, per D1/D2, is currently carrying the entire load the identifiability gate was registered to
carry.
