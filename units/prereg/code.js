/* ---------------------------------------------------------------- shock programme: pre-registered evidence standard (CLAUDE.md 11)
   Machine-readable copy of the thresholds written in CLAUDE.md 11. Pure: no DOM, no storage, no clock, no fetch.
   Fixed 2026-09-06, before any shock-conditioned observation existed. These numbers may be raised. Lowering any of
   them closes the programme (CLAUDE.md 11.7 clause 6) - it does not lower the bar. test/prereg.js asserts that
   every value here appears in CLAUDE.md 11, so the document and the code cannot drift apart silently. */
const SHOCK_RULE={
  version:"prereg-2026-09-06-a",
  calN:30,                /* calibration set: first 30 graded shock windows, chronological, per phase */
  holdN:30,               /* holdout floor; shockRequiredHoldN may raise it, never lower it */
  minTotal:60,
  alpha:0.10,             /* k=1 level is 1-alpha=0.90, identical to VERDICT_RULE.brierCI */
  dBrierFloor:0.010,      /* 6x the 0.0016 model-vs-market gap, 14x the 0.0007 free-refit gain (CLAUDE.md 3) */
  dBrierAbandon:0.005,    /* below half the floor at the required n: programme closed (11.7 clause 1) */
  minCtrlPerShock:5,
  ctrlCoverage:0.80,
  pnlMinN:30,
  phase2MinPrecision:0.50,
  maxMonths:24,
  relLo:100, relHi:150,   /* scheduled US macro releases per year: planning premise, NOT a measurement (11.1) */
  winPerYear:35040        /* 96 fifteen-minute windows per day x 365 */
};
/* required two-sided CI level for a family of k scored arms (11.4). k=1 reproduces VERDICT_RULE's 0.90 exactly. */
function shockCiLevel(k){ if(!(k>=1)) return null; return 1-SHOCK_RULE.alpha/Math.floor(k); }
/* percentile bootstrap cannot resolve a tail finer than 1/B; 20/(1-level) puts >=10 resamples in each tail (11.2a) */
function shockBootstrapB(level){ if(!(level>0&&level<1)) return null; return Math.ceil(20/(1-level)-1e-9); } /* -1e-9: 1-0.90 is 0.09999999999999998 in binary float and would bill 201 resamples for 200 */
/* calendar cost of n graded shock windows, in months, at a given releases-per-year rate (11.1) */
function shockMonths(n,perYear){ if(!(n>=0)||!(perYear>0)) return null; return 12*n/perYear; }
/* share of the tape that is shock windows, at a given releases-per-year rate */
function shockWindowShare(perYear){ if(!(perYear>=0)) return null; return perYear/SHOCK_RULE.winPerYear; }
/* holdout n at which a point estimate equal to dBrierFloor clears the k-arm CI, given the paired-difference sd (11.2a).
   power is the probability of clearing at that n: 0.5 is the bare "just clears" case, 0.8 the planning case.
   sd is measured on the calibration half. It cannot be guessed, so a null sd returns null - never a default. */
function shockRequiredHoldN(sd,k,power){
  const lvl=shockCiLevel(k); if(lvl===null) return null;
  if(sd===null||sd===undefined||!(sd>0)) return null;
  const p=(power===null||power===undefined)?0.5:power; if(!(p>0&&p<1)) return null;
  const z=invNorm(1-(1-lvl)/2)+invNorm(p);
  return Math.max(SHOCK_RULE.holdN,Math.ceil(Math.pow(z*sd/SHOCK_RULE.dBrierFloor,2)));
}
/* can the required holdout be reached inside the 11.7 clause 5 deadline? monthsUsed is time already spent. */
function shockFeasible(sd,k,monthsUsed,perYear){
  const n=shockRequiredHoldN(sd,k,0.5); if(n===null) return null;
  const mo=shockMonths(n,perYear); if(mo===null) return null;
  const used=(monthsUsed>0)?monthsUsed:0;
  return {holdN:n,months:mo,n80:shockRequiredHoldN(sd,k,0.8),
    ok:(used+mo)<=SHOCK_RULE.maxMonths,deadline:SHOCK_RULE.maxMonths};
}
/* labelling (11.4). Exactly one primary per phase; everything else is exploratory in the UI and the CSV. */
function shockTag(isPrimary){ return isPrimary?"primary":"exploratory"; }
function shockCsvFlag(isPrimary){ return isPrimary?0:1; }
function shockMayHeadline(isPrimary,status){ return isPrimary===true&&status==="READY"; }
/* exactly one primary per phase; anything else is a mis-specified phase, not a scoring question */
function shockPrimaryOk(arms){
  if(!Array.isArray(arms)) return null;
  const n=arms.filter(function(a){ return a&&a.primary===true; }).length;
  return {ok:n===1,nPrimary:n};
}
/* Phase-1 and Phase-2 results are never pooled (11.5). Any call that mixes phases is a bug, so say so loudly. */
function shockPoolGuard(rows){
  if(!Array.isArray(rows)) return null;
  const ph={}; for(const r of rows){ if(r&&r.phase!==undefined&&r.phase!==null) ph[r.phase]=1; }
  const ks=Object.keys(ph);
  return {ok:ks.length<=1,phases:ks.map(Number).sort()};
}
/* the whole standard as one decision. Pure: every input is a number the caller measured.
   st = {phase, nCal, nHold, arms, sd, dBrier, ciLo, ctrlMatched, ctrlTotal, pnlN, pnlNet,
         detPrecision, monthsElapsed, frozen, holdoutSpent}
   Returns {status, why, ciLevel, bootstrapB, holdNReq}. A missing number required for the decision returns
   INVALID with the reason - it never falls back to a plausible default. */
function shockStatus(st){
  if(!st) return null;
  const k=(st.arms>=1)?st.arms:1;
  const lvl=shockCiLevel(k), B=shockBootstrapB(lvl);
  const need=shockRequiredHoldN(st.sd,k,0.5);
  const out=function(s,w){ return {status:s,why:w,ciLevel:lvl,bootstrapB:B,holdNReq:need}; };
  if(st.holdoutSpent===true) return out("INVALID","holdout spent by a post-freeze change (11.6); count restarts at zero");
  if(st.phase===2){
    if(st.detPrecision===null||st.detPrecision===undefined) return out("INVALID","phase 2 does not report without a confusion matrix against the phase-1 calendar (11.5)");
    if(st.detPrecision<SHOCK_RULE.phase2MinPrecision) return out("ABANDON","detector precision below 0.50 (11.7 clause 4)");
  }
  if(st.ctrlTotal>0&&(st.ctrlMatched/st.ctrlTotal)<SHOCK_RULE.ctrlCoverage) return out("ABANDON","control coverage below 80% (11.7 clause 3)");
  if(!(st.nCal>=SHOCK_RULE.calN)) return out("CALIBRATING","calibration set incomplete");
  if(st.frozen!==true) return out("FROZEN-PENDING","thresholds not frozen and stamped; the holdout may not be opened (11.6)");
  if(need===null) return out("INVALID","paired-difference sd not measured on the calibration half (11.2a)");
  if(st.monthsElapsed>SHOCK_RULE.maxMonths&&st.nHold<need) return out("ABANDON","24 months without the required holdout n (11.7 clause 5)");
  if(st.nHold<need) return out("HOLDOUT","holdout incomplete");
  if(st.dBrier===null||st.dBrier===undefined||st.ciLo===null||st.ciLo===undefined) return out("INVALID","holdout complete but the primary statistic or its CI is missing");
  if(st.dBrier<SHOCK_RULE.dBrierAbandon) return out("ABANDON","difference-in-differences below half the floor at the required n (11.7 clause 1)");
  if(st.dBrier>=SHOCK_RULE.dBrierFloor&&st.ciLo>0){
    if(!(st.pnlN>=SHOCK_RULE.pnlMinN)) return out("NEGATIVE","statistical bar met, fewer than 30 holdout entries");
    if(!(st.pnlNet>0)) return out("NEGATIVE","statistical bar met, paper P&L not positive");
    return out("READY","control-adjusted \u0394 Brier clears the floor and the CI at level "+lvl.toFixed(3)+"; necessary, never sufficient");
  }
  return out("NEGATIVE","effect present but below the floor or the CI touches zero");
}
