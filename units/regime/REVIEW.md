# Adversarial review — `units/regime` — 2026-09-07

Scope: `code.js`, `test.js`, `NOTES.md` against CLAUDE.md §11.9 line by line, plus §4 (ungardenable), §10.2
(derived-at-export pattern), §8 (calendar provenance discipline), §7 (hard-won rules). Reviewer role only —
no files edited. One careful round, matching the assigned depth for a registry/derivation rather than a
READY-deciding statistic.

## Test run

```
node test.js
ALL GREEN: 125 ok, 0 fail
```
Matches the build report's claimed count exactly.

## Purity / shape checks (independent of the harness)

- `grep -nP '[^\x00-\x7F]' code.js` — no matches. ASCII-only, as claimed.
- `grep -n '=>' code.js` — no matches. No arrow functions.
- No textual reference to `S.`, `document.`, `fetch(`, `setTimeout`, `setInterval` in code (the one
  `localStorage` hit is inside a comment, not a reach for the global). The vm harness in `test.js` backs
  this operationally: every page helper and `S`/`document`/`localStorage` is a throwing stub/Proxy, and the
  full suite runs green, so no code path silently depends on any of them.
- Confirmed `REGIME_T_MIN`/`REGIME_T_MAX` are byte-identical to `units/calendar`'s `CAL_T_MIN`/`CAL_T_MAX`
  (1230768000000 / 4102444800000), as NOTES.md claims.
- `REGIME_CATEGORIES` matches §11.9's enumerated list exactly, same order: `price-collapse, price-parabola,
  sovereign-adoption, exchange-failure, contract-redefinition, other`.

## The five focus questions

**1. Does a FLAGGED entry ever move `regimeAt`'s boundary?** No, under every construction tried, including
ones not in `test.js`: a flagged entry sharing a duplicate `id` with an active declared entry (still caught
by the pass-2 duplicate-id check, across kinds — verified), a declared entry's `supersedes` naming a
*flagged* entry's id (resolves and marks that id "superseded," but since flagged rows never reach
`regimeBoundaries` regardless of supersession status, this has zero effect on any boundary — verified), and
flagged rows interleaved at the exact same `t` as a colliding declared pair (does not interfere with pass-3
detection — verified). `regimeBoundaries`'s `if(e.kind!=="declared") continue` is the single choke point and
nothing bypasses it. This is the invariant §11.9 states as absolute, and it holds.

**2. Can a declared break be effectively un-declared?** No deletion or mutation path exists in `code.js`;
confirmed by reading every function — none takes an existing array and returns a shorter or edited one, only
`regimeBoundaries`'s *derived, read-time* filtering (which never touches the underlying registry the caller
holds). The `NOTES.md` wiring appendix likewise proposes no `regimeRemove`/`regimeEdit`. Supersession is the
only correction path, and it is additive.

**3. Does `sameRegime` route through the same boundary set as `regimeAt`, or could it disagree?** It is
`regimeAt(t1,entries)===regimeAt(t2,entries)`, textually — no separate boundary computation exists. Same
property for `regimeSpent`, which calls `regimeBoundaries(entries)` directly (the same function `regimeAt`
itself calls). All three functions are provably unable to disagree with each other because there is exactly
one function that computes the active boundary list.

**4. Ordering and ambiguity.** Out-of-order `declaredAt`/`t`/array position all resolve correctly
(`regimeBoundaries` sorts by `t` regardless of input order — verified with a shuffled fixture in `test.js`
and independently here). A same-instant pair of two *genuinely* competing declared entries is rejected
loudly (pass 3). A same-instant pair where one supersedes the other is correctly recognized as
non-ambiguous. A supersession chain of two links (A superseded by B, B superseded by C) correctly leaves only
C active. **One gap found — see Finding 1 below**: a supersession *cycle* (A supersedes B, B supersedes A;
also checked a 3-cycle) reports **zero registry faults** and silently removes every entry in the cycle from
the boundary walk, collapsing the timeline to fewer regimes than any individual entry, in each other's or a
human reader's eyes, would suggest.

**5. Is the flag statistic genuinely self-normalizing, and does a flag ever do anything beyond sit in the
registry?** Yes to both. `regimeFlagCandidate`/`regimePercentileRank` take no absolute threshold anywhere —
the only fixed number is `REGIME_FLAG_PCTL` itself, which is a **rank** (0.99), not a price or volatility
level, and it is applied to a percentile computed fresh from the caller-supplied `trailing` array every call.
No BTC price, volatility level, or other absolute number is baked into `code.js`. Could not construct an
input where a flag (or any number of flags) changes `regimeAt`'s or `sameRegime`'s answer — this is the same
guarantee as focus question 1, verified from the flag-statistic side rather than the boundary-walk side.

## Finding 1 (informational, non-blocking) — supersession cycles are not detected as a registry fault

A registry containing a supersession cycle among otherwise structurally-valid declared entries —
`A{supersedes:"B"}`, `B{supersedes:"A"}` (also checked a 3-entry cycle) — produces:

```
regimeRegistryFaults(cyc)  -> []                      (no fault reported)
regimeBoundaries(cyc)      -> only entries outside the cycle survive
regimeAt / sameRegime      -> the entire cyclic span reads as one regime, silently
```

Neither `A` nor `B` is individually malformed (each passes `regimeEntryFault`; no duplicate id; no same-`t`
collision if their `t`s differ), so none of `regimeRegistryFaults`'s three passes catches this. The result is
that a hand-edited or stale-reimported registry (a scenario `code.js`'s own header comment explicitly
anticipates — "a stale export, a hand-edited localStorage key") can silently drop real declared boundaries
from the walk with no signal in `regimeRegistryFaults`'s output at all, which is the one place the unit
promises "every reason a row is currently unusable" is listed.

This does **not** violate the FLAGGED-never-moves-the-boundary invariant (the focus point §11.9 calls out by
name) and it does **not** crash the walk, satisfying the letter of the three failure-path rules in the file's
header. It is a narrower gap: a *graph-level* malformation (two or more otherwise-valid rows whose
`supersedes` edges form a cycle) rather than a *row-level* one, and the existing validation is entirely
row-and-pairwise (duplicate id, duplicate active `t`) — it never walks the `supersedes` graph for cycles.

Reachability through the normal path (`regimeDeclare`, per NOTES.md's wiring appendix) is very limited: since
there is no edit path, an operator would need `B` to already exist before declaring `A{supersedes:"B"}`, and
then would need to somehow retroactively make `B` supersede `A` — which the append-only design does not
allow through normal operation. So a cycle can only arise via direct registry manipulation outside
`regimeDeclare` (hand-edited storage, a corrupted import) — exactly the threat model the unit's own comments
say it must tolerate without crashing, which it does. I am not marking this blocking: it requires an
out-of-band write, degrades safely (no crash, no boundary silently *appears*; boundaries silently
*disappear*, which is the less dangerous direction for a scorer that is trying not to pool across regimes it
shouldn't — though it is still a wrong regime count), and is not the invariant the task called out as the one
most likely to be gotten backwards. Worth a follow-up (a 4th pass in `regimeRegistryFaults` walking
`supersedes` edges for cycles) before or alongside a real scorer's arrival, not before splice.

## Finding 2 (cosmetic, non-blocking) — `supersedes` can name a FLAGGED entry's id

`regimeEntryFault` allows a declared entry's `supersedes` to reference any existing id, including a flagged
entry's id — verified: `regimeSupersededIds` marks it superseded and reports no fault. Semantically odd
(`supersedes` is documented, and named in `regimeEntryFault`'s own error strings, as correcting a prior
*declaration*), but functionally inert: a flagged row never reaches `regimeBoundaries` regardless of its
superseded status, so this can never change any answer. Not worth a code change on its own.

## Finding 3 (informational, wiring appendix only — not `code.js`) — `regimeDeclare` pseudocode validates the new row alone

The `regimeDeclare` sketch in `NOTES.md`'s wiring section checks the new entry with `regimeEntryFault(e)`
before pushing, but does not check the entry against the *existing* `S.regime` array with
`regimeRegistryFaults` first. A same-millisecond double-declare (`Date.now()`-derived id collision, or two
declares landing on the same `t` before either window's data makes the collision obvious) would pass the
solo check, print "declared: ...", and get pushed — then silently fail to appear in `regimeBoundaries` once
`regimeRegistryFaults` sees the full array with its new duplicate. The operator's console would say
"declared" for a row that is, from that instant on, inert. This is pseudocode for the orchestrator to apply,
not part of the pure unit under strict review, but it's flagged here since it lives in this file and touches
the same "never silently accepted" promise the unit's header makes for its own layer.

## Constants / registration cross-check against CLAUDE.md §11.9

- Closed category set: matches verbatim.
- "Declaration is operator judgment, always, and always carries a reason" — `regimeEntryFault` enforces
  non-empty, non-whitespace-only `reason` on every declared row and forbids it on flagged rows. Matches.
- "A flagged instant carries no reason beyond the statistic that tripped it" — `regimeEntryFault` explicitly
  rejects `reason`/`category`/`source`/`supersedes` on a flagged entry. Matches, and is stricter than §11.9's
  prose strictly requires (§11.9 doesn't say a flag *may not* carry those fields, only that it carries no
  reason) — a defensible tightening, not a contradiction, and it's the mechanism Finding 2's harmlessness
  depends on.
- "Nothing already recorded is deleted, edited, or reclassified" — confirmed, no such path exists.
- "No calibration set... may span a regime boundary... cashes out to `sameRegime`" — `sameRegime` exists and
  is the sole entry point, exactly as prescribed; no scorer exists yet to check the actual wiring of this
  rule, consistent with §11.9's closing paragraph ("no scorer exists in the repository right now").
- `regimeSpent`'s strict-exclusive semantics at both ends match §11.9's extension of §11.6's holdout-spending
  clause, and correctly uses the *corrected* boundary (post-supersession) rather than a superseded entry's
  original `t` — verified both in `test.js` and independently above.

## Verdict

**Safe to splice.** All 125 assertions pass, the file is pure (verified independently of the test harness),
the one invariant the task named as most likely to be gotten backwards (a FLAGGED entry never moving
`regimeAt`) holds under every construction tried including several not in `test.js`, and `sameRegime`/
`regimeSpent` are provably unable to disagree with `regimeAt` since they share its one boundary computation.
Finding 1 (supersession cycles produce zero registry faults) is real and reproducible but requires an
out-of-band write to the registry to construct, degrades safely (no crash, no phantom boundary), and is worth
a follow-up hardening pass rather than a blocker — it does not touch the invariant this unit exists to
guarantee. Findings 2 and 3 are cosmetic/appendix-only. No execution path exists anywhere in `code.js`.
