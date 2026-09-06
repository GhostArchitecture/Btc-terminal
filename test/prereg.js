/* Pre-registration guard (CLAUDE.md §11). This file is the thing §11 already claims exists: the check that
   stops the pre-registration DOCUMENT and the CODE drifting apart silently. It reads CLAUDE.md off disk and
   compares it against the live objects, so a threshold edited in one place and not the other fails here.

   Two rules govern everything below, and they are why this is not an ordinary unit suite:
     - Nothing the document says is retyped into this file. Every value compared comes from CLAUDE.md at run
       time or from index.html at run time. A test that hardcoded the document would pass on a document that
       had been edited to match a lowered threshold, which is the exact failure §11.7 clause 6 exists to catch.
     - Keys are enumerated from SHOCK_RULE itself, never from a list here. A threshold added to the code with
       no entry in the document must FAIL, and a hardcoded list would never notice it.

   Run: node test/prereg.js */
"use strict";
const fs = require("fs");
const path = require("path");
const { load, runner, ROOT } = require("./lib/load");

const H = load();
const { R } = H;
const { T, done } = runner("prereg");

const MD = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
/* §11 runs to the end of the file; slice on the heading rather than a line number so a section added above
   it cannot silently move the window this harness reads. */
const S11_AT = MD.indexOf("## 11. The shock programme");
const S11 = S11_AT < 0 ? "" : MD.slice(S11_AT);
const S118_AT = S11.indexOf("### 11.8");
const S118 = S118_AT < 0 ? "" : S11.slice(S118_AT);
T("CLAUDE.md §11 is present and readable — everything below compares against it", S11.length > 2000 && S118.length > 1000, { s11: S11.length, s118: S118.length });

/* ---------------------------------------------------------------- 1. every SHOCK_RULE threshold is in the document

   THE MATCHING RULE, stated because a loose one is worse than none. A numeric value counts as "present" only
   when one of its acceptable spellings occurs in §11 as a WHOLE number token — not inside a longer number and
   not inside a date. Acceptable spellings are generated from the VALUE, never from the document:
     - the plain form and any trailing-zero form that round-trips exactly (0.01 -> "0.01", "0.010");
     - thousands-grouped form for integers >= 1000 (35040 -> "35,040"), because prose writes them that way;
     - percent form for a fraction whose x100 is a whole number >= 5 (0.80 -> "80%"), because §11 states
       coverage and precision as percentages.
   The percent floor of 5 is deliberate: it stops 0.010 from being "found" as the "1%" that a document might
   use for something else entirely. Bare decimal forms additionally refuse a following "%", or ctrlCoverage
   0.80 would match the "0.8% no root" figure in §11.8 — a real near-miss this rule was tightened to exclude.

   WHAT THIS CATCHES AND WHAT IT DOES NOT. It catches a value changed in the code to something the document
   never states — the drift this file exists for. It cannot tell WHICH sentence a small integer came from, so
   a change from one small integer to another that also appears in §11 for an unrelated reason would slip
   past. The arithmetic cross-checks further down close most of that gap by pinning the load-bearing values
   through the document's own tables rather than through their bare digits. */
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function spellings(v) {
  const out = new Set([String(v)]);
  for (let d = 0; d <= 4; d++) { const t = v.toFixed(d); if (Math.abs(+t - v) < 1e-12) out.add(t); }
  if (Number.isInteger(v) && v >= 1000) out.add(v.toLocaleString("en-US"));
  const pc = v * 100;
  if (v > 0 && v < 1 && Number.isInteger(pc) && pc >= 5) out.add(pc + "%");
  return [...out];
}
function foundIn(text, v) {
  return spellings(v).filter(t => {
    /* not preceded by a digit, dot or comma (so "24" never matches inside "0.24" or "1,240"), not followed by
       a digit or a decimal digit (so "0.01" never matches inside "0.0105"), and a bare decimal is not
       followed by "%" (so "0.8" never matches inside "0.8%"). */
    const pct = /%$/.test(t);
    const re = new RegExp("(?<![0-9.,])" + esc(t) + (pct ? "" : "(?![0-9])(?!\\.[0-9])(?!%)"));
    return re.test(text);
  });
}

const RULE = R("JSON.parse(JSON.stringify(SHOCK_RULE))");
const numKeys = Object.keys(RULE).filter(k => typeof RULE[k] === "number");
const otherKeys = Object.keys(RULE).filter(k => typeof RULE[k] !== "number");

/* The only non-numeric key permitted is the registration stamp. A new string key means a new promise that
   this harness is not comparing against anything, so it fails here rather than going unnoticed. */
T("SHOCK_RULE carries exactly one non-numeric key, the registration stamp", otherKeys.length === 1 && otherKeys[0] === "version", otherKeys);
T("the registration stamp's date is the date §11 was registered under", typeof RULE.version === "string" && /\d{4}-\d{2}-\d{2}/.test(RULE.version) && S11.indexOf(RULE.version.match(/\d{4}-\d{2}-\d{2}/)[0]) >= 0, RULE.version);
T("SHOCK_RULE actually carries thresholds to check (a hollowed-out object must not pass silently)", numKeys.length >= 12, numKeys.length);

for (const k of numKeys) {
  const hits = foundIn(S11, RULE[k]);
  T("§11 states SHOCK_RULE." + k + " = " + RULE[k], hits.length > 0, { value: RULE[k], tried: spellings(RULE[k]) });
}

/* ---------------------------------------------------------------- the document's own tables, recomputed

   Bare-digit presence is weak for small integers. These pin the load-bearing values through arithmetic
   instead: the document's published tables are PARSED out of CLAUDE.md and recomputed by the code's own
   functions. If relLo, relHi, winPerYear, alpha or dBrierFloor moved in either place, the recomputation
   stops reproducing the printed table. */
{
  /* §11.1: "0.29% at 100 releases a year and 0.43% at 150" — the share of the tape that is shock windows. */
  const pct = v => (v * 100).toFixed(2) + "%";
  const lo = R(`shockWindowShare(SHOCK_RULE.relLo)`), hi = R(`shockWindowShare(SHOCK_RULE.relHi)`);
  T("the shock-window share the code computes at relLo is the share §11.1 prints", S11.indexOf(pct(lo)) >= 0, { computed: pct(lo) });
  T("the shock-window share the code computes at relHi is the share §11.1 prints", S11.indexOf(pct(hi)) >= 0, { computed: pct(hi) });
  /* §11.1's calendar-cost table: minTotal windows at each release rate. */
  const a = R(`shockMonths(SHOCK_RULE.minTotal,SHOCK_RULE.relLo)`), b = R(`shockMonths(SHOCK_RULE.minTotal,SHOCK_RULE.relHi)`);
  T("the calendar cost of the minimum shock sample matches §11.1's table at both release rates",
    S11.indexOf(a.toFixed(1)) >= 0 && S11.indexOf(b.toFixed(1)) >= 0, { atRelLo: a, atRelHi: b });
}
{
  /* §11.2a prints "z at k=N" and "B at k=N" in one prose sentence each, and a power table under "At k=20:".
     Both are parsed, never retyped. The z figures carry a decimal point and the B figures do not, which is
     what separates the two sentences without hardcoding either. */
  const pairs = [];
  const re = /([\d,]+(?:\.\d+)?)\s+at\s+k=(\d+)/g;
  let m; while ((m = re.exec(S11))) pairs.push({ lit: m[1], v: +m[1].replace(/,/g, ""), k: +m[2] });
  const zs = pairs.filter(p => /\./.test(p.lit)), Bs = pairs.filter(p => !/\./.test(p.lit));
  T("§11.2a's z-by-k and B-by-k figures are parseable (this cross-check is only as good as its parse)", zs.length >= 3 && Bs.length >= 3, { z: zs.length, B: Bs.length });
  const zBad = zs.filter(p => {
    const z = R(`invNorm(1-(1-shockCiLevel(${p.k}))/2)`);
    return Math.abs(z - p.v) > 5e-4;                       /* the document quotes z to three decimals */
  });
  T("the code's CI level reproduces every z §11.2a publishes, at every k it publishes", zBad.length === 0, zBad);
  const bBad = Bs.filter(p => R(`shockBootstrapB(shockCiLevel(${p.k}))`) !== p.v);
  T("the code's bootstrap floor reproduces every B §11.2a publishes, at every k it publishes", bBad.length === 0, bBad);

  /* the power table: | sd | n at 50% | n at 80% | ... | under a line that names its k. */
  const kAt = S11.match(/At k=(\d+):/);
  const tbl = [];
  const rowRe = /^\|\s*(0\.\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/gm;
  let r; while ((r = rowRe.exec(S11))) tbl.push({ sd: +r[1], n50: +r[2], n80: +r[3] });
  T("§11.2a's required-holdout table is parseable and names the k it was computed at", !!kAt && tbl.length >= 3, { k: kAt && kAt[1], rows: tbl.length });
  if (kAt && tbl.length) {
    const k = +kAt[1];
    const bad = tbl.filter(row => R(`shockRequiredHoldN(${row.sd},${k},0.5)`) !== row.n50 || R(`shockRequiredHoldN(${row.sd},${k},0.8)`) !== row.n80);
    T("shockRequiredHoldN reproduces §11.2a's published holdout sizes at 50% and 80% power", bad.length === 0, bad);
  }
}

/* ---------------------------------------------------------------- 2. the identifiability bounds (§11.8)

   Stronger than digit-presence: the document must pair the CONSTANT'S NAME with its value, so a bound
   renamed or re-pointed at a different number cannot pass on the number happening to appear elsewhere. */
const BOUNDS = R(`({VRP_TICK_REL_MAX:VRP_TICK_REL_MAX,VRP_TICK:VRP_TICK,SCHEMA_SIR_MIN:SCHEMA_SIR_MIN,SCHEMA_SIR_MAX:SCHEMA_SIR_MAX,VRP_REL_MAX:VRP_REL_MAX})`);
{
  for (const name of Object.keys(BOUNDS)) {
    const v = BOUNDS[name];
    const ok = spellings(v).some(t => new RegExp(esc(name) + "\\s*=\\s*" + esc(t) + "(?![0-9])(?!\\.[0-9])").test(S118));
    T("§11.8 records " + name + " = " + v + " by name", ok, { value: v, tried: spellings(v) });
  }
}
{
  /* The superseded bound must still exist in the source — §11.8 keeps it visible beside its replacement —
     and must gate nothing. Asserted twice, structurally and behaviourally, because either alone is weak:
     a source scan cannot prove a value is unused if the scan is wrong, and a behavioural probe cannot prove
     a dormant branch does not exist. */
  const src = H.script;
  const mask = src.split("");                       /* blank out every block comment, then count what is left */
  for (let i = 0; i < src.length - 1; i++) {
    if (src[i] === "/" && src[i + 1] === "*") { let j = src.indexOf("*/", i + 2); if (j < 0) j = src.length; for (let p = i; p < Math.min(j + 2, src.length); p++) mask[p] = " "; i = j + 1; }
  }
  const code = mask.join("");
  const count = s => (code.match(new RegExp(esc(s), "g")) || []).length;
  /* guard the stripper itself: a bound that IS a gate must survive it several times over, or a broken
     stripper would make the assertion below pass by deleting the whole program. */
  T("the comment stripper leaves executable code intact (guards the assertion below)", count("VRP_TICK_REL_MAX") >= 3 && count("SHOCK_RULE") >= 5, { tickMax: count("VRP_TICK_REL_MAX"), rule: count("SHOCK_RULE") });
  T("VRP_REL_MAX survives in source but appears in executable code exactly once, its own declaration", count("VRP_REL_MAX") === 1 && /const\s+VRP_REL_MAX\s*=/.test(code) && /VRP_REL_MAX/.test(src), count("VRP_REL_MAX"));

  /* behavioural: §11.8's own worked example. 2bp from the money on a 15-minute window has a local derivative
     UNDER the superseded 0.5 and a true one-cent move far over the bound in force. If the old bound were
     still gating anything, this reading would be admitted. */
  const r = R(`(function(){ const id=sigmaIdentifiability(Math.log(1.0002),0.0009,15);
    return {relPerCent:id.relPerCent,tickRel:id.tickRel,identified:id.identified}; })()`);
  T("a reading the superseded bound would have admitted is rejected by the bound in force",
    r.relPerCent < BOUNDS.VRP_REL_MAX && r.tickRel > BOUNDS.VRP_TICK_REL_MAX && r.identified === false, r);
}

/* ---------------------------------------------------------------- 3. THE PRE-REGISTRATION INVARIANT

   This is not a unit test and it must not be read as one. It is the standing condition on which any variance
   premium §11.8 produces can be interpreted at all.

   vrp = si - sr. At a fixed strike and horizon, si is monotone in the quote — that is the inversion's whole
   definition. So a gate that consults the ROW'S OWN QUOTE to decide whether the row may be kept is selecting
   on a monotone transform of the very quantity being measured: the surviving rows are the ones whose implied
   sigma sat in a particular part of its range, and the reported premium is that selection, not the market's.
   No sample size fixes it and no CI widens to cover it, because the bias is in which rows exist.

   The condition, therefore: for one strike and one horizon, the IDENTIFIABILITY verdict must be the same
   whatever quote the market happens to be showing. Identifiability is a property of WHERE THE STRIKE SITS —
   §11.8 derives the band in x/(sigma*sqrt(tau)) and in nothing else. It is asserted behaviourally rather
   than by reading the source, because the defect it guards against was not visible in any single line.

   The sweep is run at a strike BELOW spot, where the analytic guarantees a root at every quote in (0,1)
   (p_over falls monotonically from 1 to 0 as sigma rises). Every quote in the sweep therefore yields a real
   reading, so a verdict that changes across it cannot be excused as "no reading existed there".

   PLAUSIBILITY is deliberately out of scope here. §11.8 states in the open that SCHEMA_SIR_MIN/MAX censor
   the measurement and that any premium must be reported with that conditioning attached. That gate looks at
   the answer BY DESIGN and is declared. This assertion is about the identifiability gate, which is not. */
{
  const sweep = (bp, tau) => R(`(function(){
    const S0=100000, sig=0.0009, tau=${tau};
    const strike=S0*Math.exp(${bp}/10000), x=Math.log(strike/S0), xs=x/(sig*Math.sqrt(tau));
    const rows=[];
    for(let c=1;c<=99;c++){
      const q=c/100;
      const f=siTickWrite({},strike,S0,tau,q);
      const base={si:f.si,sm:sigBp(sig),xs:+xs.toFixed(3),tau:tau,t:1};
      const withTick=siJudge(Object.assign({},base,{sq:f.sq,sqS:f.sqS}));
      const noTick=siJudge(base);                     /* no stored sensitivity: the quote-free fallback path */
      rows.push({c:c,si:(f.si===undefined?null:f.si),gate:withTick.gate,
                 inForce:withTick.identified,prior:noTick.identified,code:withTick.code});
    }
    return {xs:+xs.toFixed(3),rows:rows}; })()`);

  const s = sweep(-20, 8);
  const rows = s.rows;
  const uniq = a => [...new Set(a)];

  /* the premise: every quote in this sweep inverts, and si really is monotone in the quote. Without both,
     the invariant below would be asserting nothing. */
  T("every quote in the sweep yields a reading, so no verdict can be excused as a missing root",
    rows.every(r => r.si !== null), rows.filter(r => r.si === null).map(r => r.c));
  T("implied sigma is monotone in the quote at this strike — the reason a quote-reading gate selects on the outcome",
    rows.every((r, i) => i === 0 || r.si < rows[i - 1].si), { first: rows[0].si, last: rows[rows.length - 1].si });

  /* the positive control, and an anti-regression clause in its own right. The quote-free probe IS invariant,
     so the bar below is attainable and is not demanding something the mathematics forbids. Asserting the two
     paths AGREE row by row additionally forbids the stored observed-quote sensitivity from ever creeping back
     into the verdict: carrying it must change nothing. */
  T("the quote-free probe returns one verdict for the whole quote sweep (the bar is attainable)",
    uniq(rows.map(r => r.prior)).length === 1, { verdicts: uniq(rows.map(r => r.prior)) });
  T("a row carrying its own observed-quote sensitivity is judged exactly as one carrying none",
    rows.every(r => r.inForce === r.prior),
    rows.filter(r => r.inForce !== r.prior).map(r => ({ c: r.c, withTick: r.inForce, without: r.prior })).slice(0, 6));

  /* THE INVARIANT. */
  const verdicts = uniq(rows.map(r => r.inForce));
  const flips = rows.filter((r, i) => i > 0 && r.inForce !== rows[i - 1].inForce).map(r => r.c);
  T("PRE-REGISTRATION INVARIANT: the identifiability verdict is the same at every quote for one strike and horizon",
    verdicts.length === 1,
    { xs: s.xs, verdicts, flipsAtCents: flips, admitted: rows.filter(r => r.inForce).length, rejected: rows.filter(r => !r.inForce).length });

  /* the same condition stated as the harm it prevents: if the verdict does vary, the admitted rows are a
     biased slice of si, and this reports by how much. */
  const kept = rows.filter(r => r.inForce).map(r => r.si);
  T("the admitted readings span the full range of implied sigma the strike can produce, not a slice of it",
    kept.length === rows.length,
    { keptMin: Math.min.apply(null, kept.length ? kept : [NaN]), keptMax: Math.max.apply(null, kept.length ? kept : [NaN]),
      allMin: rows[rows.length - 1].si, allMax: rows[0].si });

  /* and it must hold at a second horizon: a gate that happened to be flat at one tau is not exogenous. */
  const s2 = sweep(-35, 14).rows;
  T("the invariant holds at a second strike and horizon too", uniq(s2.map(r => r.inForce)).length === 1,
    { verdicts: uniq(s2.map(r => r.inForce)), flipsAtCents: s2.filter((r, i) => i > 0 && r.inForce !== s2[i - 1].inForce).map(r => r.c) });
}

/* ---------------------------------------------------------------- 4. the direction rule (§11.7 clause 6)

   A test cannot see history, so it cannot tell a raise from a lower. What it CAN do is pin the values in
   force to the ones registered, so that any movement at all is a deliberate, visible edit to this file.

   READ THIS BEFORE CHANGING A NUMBER BELOW. Editing one of these assertions UPWARD is a tightening and is
   permitted — record the re-registration in CLAUDE.md §11 and the document check above will demand it there
   too. Editing one DOWNWARD is not a test update: under §11.7 clause 6 it CLOSES THE PROGRAMME and marks its
   ledgers. There is no third option, and "the test was too strict" is not one of them.

   What this cannot catch: a threshold lowered in the code AND in CLAUDE.md AND here, in one commit, by
   someone who has decided to. Nothing mechanical can. It makes that a three-place deliberate act with the
   consequence written next to it, which is the whole of what a guard can do. */
{
  const v = R(`({calN:SHOCK_RULE.calN,holdN:SHOCK_RULE.holdN,minTotal:SHOCK_RULE.minTotal,alpha:SHOCK_RULE.alpha,
    floor:SHOCK_RULE.dBrierFloor,abandon:SHOCK_RULE.dBrierAbandon,ctrlN:SHOCK_RULE.minCtrlPerShock,
    cov:SHOCK_RULE.ctrlCoverage,pnlN:SHOCK_RULE.pnlMinN,prec:SHOCK_RULE.phase2MinPrecision,months:SHOCK_RULE.maxMonths,
    tickMax:VRP_TICK_REL_MAX,tick:VRP_TICK,sirMin:SCHEMA_SIR_MIN,sirMax:SCHEMA_SIR_MAX})`);
  /* raising these is permitted; lowering any one of them is a programme closure, not a test edit */
  T("calibration set is 30 windows", v.calN === 30, v.calN);
  T("holdout floor is 30 windows on top of the calibration set", v.holdN === 30, v.holdN);
  T("60 graded shock windows is the registered minimum total", v.minTotal === 60 && v.minTotal >= v.calN + v.holdN, v);
  T("family-wise alpha is 0.10", v.alpha === 0.10, v.alpha);
  T("the effect floor is 0.010 delta Brier", v.floor === 0.010, v.floor);
  T("the abandonment threshold is half the effect floor", v.abandon === 0.005 && v.abandon === v.floor / 2, v);
  T("5 matched controls per shock window is the minimum", v.ctrlN === 5, v.ctrlN);
  T("control coverage must reach 80%", v.cov === 0.80, v.cov);
  T("paper P&L needs 30 holdout entries", v.pnlN === 30, v.pnlN);
  T("phase-2 detector precision floor is 0.50", v.prec === 0.50, v.prec);
  T("the programme's clock is 24 months", v.months === 24, v.months);
  /* lowering a bound admits MORE readings, which is the tuning-a-filter-against-its-own-results case §11.8
     names explicitly. Raising VRP_TICK_REL_MAX toward 1 would admit more, so for THIS one the permitted
     direction is downward — §11.8 says "may be tightened at any time", and tightening here means smaller. */
  T("the identifiability tick bound is 0.20 (tightening means a SMALLER number here)", v.tickMax === 0.20, v.tickMax);
  T("sensitivity is measured across one real cent, the instrument's resolution", v.tick === 0.01, v.tick);
  T("the plausibility band is [0.25, 4] and admitting more than it is a closure", v.sirMin === 0.25 && v.sirMax === 4, v);
}

/* ---------------------------------------------------------------- 5. structural promises, against the real surface */
{
  /* READY must be unreachable below the registered counts. Swept rather than spot-checked: every combination
     of calibration and holdout size around the thresholds, with everything else set to pass. */
  const bad = R(`(function(){
    const out=[];
    for(let nCal=0;nCal<=40;nCal+=2) for(let nHold=0;nHold<=40;nHold+=2){
      const st={phase:1,nCal:nCal,nHold:nHold,arms:1,sd:0.001,dBrier:0.05,ciLo:0.02,
                ctrlMatched:100,ctrlTotal:100,pnlN:500,pnlNet:99,monthsElapsed:1,frozen:true,holdoutSpent:false};
      const s=shockStatus(st);
      if(s.status==="READY"&&(nCal<SHOCK_RULE.calN||nHold<SHOCK_RULE.holdN||(nCal+nHold)<SHOCK_RULE.minTotal))
        out.push({nCal:nCal,nHold:nHold,holdNReq:s.holdNReq});
    }
    return out; })()`);
  T("shockStatus never reads READY below the registered calibration, holdout or total counts", bad.length === 0, bad.slice(0, 5));

  /* and never below a holdout requirement that the measured sd has RAISED above the floor */
  const raised = R(`(function(){
    const st={phase:1,nCal:60,arms:20,sd:0.03,dBrier:0.05,ciLo:0.02,ctrlMatched:100,ctrlTotal:100,
              pnlN:500,pnlNet:99,monthsElapsed:1,frozen:true,holdoutSpent:false};
    const need=shockRequiredHoldN(0.03,20,0.5);
    const below=shockStatus(Object.assign({},st,{nHold:need-1})), at=shockStatus(Object.assign({},st,{nHold:need}));
    return {need:need,below:below.status,at:at.status}; })()`);
  T("a raised holdout requirement is binding: READY only at or above it", raised.need > 30 && raised.below !== "READY" && raised.at === "READY", raised);

  /* a missing sd cannot be defaulted into a passing state */
  const noSd = R(`shockStatus({phase:1,nCal:60,nHold:500,arms:1,sd:null,dBrier:0.05,ciLo:0.02,ctrlMatched:100,ctrlTotal:100,pnlN:500,pnlNet:99,monthsElapsed:1,frozen:true}).status`);
  T("an unmeasured paired-difference sd is INVALID, never a default that lets READY through", noSd === "INVALID", noSd);

  /* an unfrozen threshold set may not open a holdout, and a spent holdout cannot report */
  const gates = R(`(function(){
    const base={phase:1,nCal:60,nHold:500,arms:1,sd:0.001,dBrier:0.05,ciLo:0.02,ctrlMatched:100,ctrlTotal:100,pnlN:500,pnlNet:99,monthsElapsed:1};
    return {unfrozen:shockStatus(Object.assign({},base,{frozen:false})).status,
            spent:shockStatus(Object.assign({},base,{frozen:true,holdoutSpent:true})).status}; })()`);
  T("thresholds not frozen and stamped: the holdout may not be opened", gates.unfrozen !== "READY" && /FROZEN/.test(gates.unfrozen), gates);
  T("a holdout spent by a post-freeze change cannot report at all (§11.6)", gates.spent === "INVALID", gates);

  /* the CI level rule, and its k=1 identity with the verdict rule already in force */
  const ci = R(`(function(){
    const bad=[]; for(let k=1;k<=40;k++){ const want=1-SHOCK_RULE.alpha/k; if(Math.abs(shockCiLevel(k)-want)>1e-12) bad.push(k); }
    return {bad:bad,k1:shockCiLevel(1),verdict:VERDICT_RULE.brierCI,sub1:shockCiLevel(0)}; })()`);
  T("the required CI level is 1 - alpha/k at every k", ci.bad.length === 0, ci.bad);
  T("at k=1 it is 0.90, identical to VERDICT_RULE's existing level — the one-hypothesis case, untouched", ci.k1 === 0.90 && ci.k1 === ci.verdict, ci);
  T("k below 1 is not a family and returns nothing rather than a flattering level", ci.sub1 === null, ci.sub1);

  /* the bootstrap floor, at the three k the document publishes and across the range */
  const B = R(`(function(){
    const bad=[]; for(let k=1;k<=40;k++){ const lvl=shockCiLevel(k), b=shockBootstrapB(lvl);
      if(!(b>=20/(1-lvl)-1e-6)) bad.push({k:k,lvl:lvl,B:b}); }
    return {bad:bad,k1:shockBootstrapB(shockCiLevel(1)),k10:shockBootstrapB(shockCiLevel(10)),k20:shockBootstrapB(shockCiLevel(20))}; })()`);
  T("B >= 20/(1-level) holds at every k, so each tail carries at least 10 resamples", B.bad.length === 0, B.bad);
  T("the published resample counts hold at k=1, 10 and 20", B.k1 === 200 && B.k10 === 2000 && B.k20 === 4000, B);

  /* phase 1 and phase 2 are never pooled */
  const pool = R(`(function(){
    return {mixed:shockPoolGuard([{phase:1},{phase:2}]),one:shockPoolGuard([{phase:1},{phase:1}]),
            p2NoMatrix:shockStatus({phase:2,nCal:60,nHold:500,arms:1,sd:0.001,dBrier:0.05,ciLo:0.02,ctrlMatched:100,ctrlTotal:100,pnlN:500,pnlNet:99,monthsElapsed:1,frozen:true,detPrecision:null}).status,
            p2Coin:shockStatus({phase:2,nCal:60,nHold:500,arms:1,sd:0.001,dBrier:0.05,ciLo:0.02,ctrlMatched:100,ctrlTotal:100,pnlN:500,pnlNet:99,monthsElapsed:1,frozen:true,detPrecision:0.4}).status}; })()`);
  T("a row set spanning both phases is reported as pooled, never scored", pool.mixed.ok === false && pool.one.ok === true, pool);
  T("phase 2 does not report without a confusion matrix against the phase-1 calendar (§11.5)", pool.p2NoMatrix === "INVALID", pool.p2NoMatrix);
  T("a phase-2 detector below the precision floor abandons rather than degrading (§11.7 clause 4)", pool.p2Coin === "ABANDON", pool.p2Coin);

  /* control coverage, and the labelling rule that keeps an exploratory arm out of every headline */
  const lab = R(`(function(){
    return {thin:shockStatus({phase:1,nCal:60,nHold:500,arms:1,sd:0.001,dBrier:0.05,ciLo:0.02,ctrlMatched:70,ctrlTotal:100,pnlN:500,pnlNet:99,monthsElapsed:1,frozen:true}).status,
            expReady:shockMayHeadline(false,"READY"),primReady:shockMayHeadline(true,"READY"),primNot:shockMayHeadline(true,"NEGATIVE"),
            tag:shockTag(false),flag:shockCsvFlag(false),two:shockPrimaryOk([{primary:true},{primary:true}]),one:shockPrimaryOk([{primary:true},{primary:false}])}; })()`);
  T("control coverage below the registered 80% abandons (§11.7 clause 3)", lab.thin === "ABANDON", lab.thin);
  T("an exploratory arm never headlines, even at READY (§11.4)", lab.expReady === false && lab.primReady === true && lab.primNot === false, lab);
  T("an exploratory arm is labelled in the UI word and in the CSV column", lab.tag === "exploratory" && lab.flag === 1, lab);
  T("exactly one primary arm per phase; two is a mis-specified phase", lab.two.ok === false && lab.one.ok === true, lab);
}

/* ---------------------------------------------------------------- 6. no execution path

   §11.2a ends "There is no execution path in this tool and this programme does not add one." Asserted rather
   than trusted: the pre-registration surface is scanned for anything that could reach the network or the
   ledger, and the whole page for an order endpoint. The prereg unit's own header claims purity — no DOM, no
   storage, no clock, no fetch — so that claim is the thing checked. */
{
  const src = H.script;
  const a = src.indexOf("/* ---------------- H protocol: prereg");
  const b = src.indexOf("clock / loop", a);
  const block = a >= 0 && b > a ? src.slice(a, b) : "";
  T("the pre-registration block is locatable in source", block.length > 1500, block.length);
  const impure = ["fetch(", "XMLHttpRequest", "WebSocket", "localStorage", "sessionStorage", "document.", "navigator.", "Date.now("]
    .filter(t => block.indexOf(t) >= 0);
  T("the pre-registration surface touches no network, storage, DOM or clock", impure.length === 0, impure);
  /* nothing in the page names an order endpoint or issues a non-GET request */
  const orderish = ["placeOrder", "createOrder", "submitOrder", "sendOrder", "cancelOrder", "/portfolio", "/orders", "batched_orders"]
    .filter(t => src.indexOf(t) >= 0);
  T("no order endpoint is named anywhere in the page", orderish.length === 0, orderish);
  T("no non-GET request is issued anywhere in the page", !/method\s*:\s*["'](POST|PUT|DELETE|PATCH)/i.test(src), (src.match(/method\s*:\s*["'][A-Z]+/gi) || []).slice(0, 5));
  /* and the exported surface exposes no callable that could place one */
  const exec = R(`Object.getOwnPropertyNames(globalThis).filter(function(n){ return /order|trade|execut|submit|buy|sell/i.test(n)&&typeof globalThis[n]==="function"; })`);
  T("no page-scope function name suggests execution", exec.length === 0, exec);
}

process.exitCode = done() ? 1 : 0;
