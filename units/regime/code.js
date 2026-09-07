/* ---------------------------------------------------------------- regime: structural-break registry */
/* CLAUDE.md section 11.9, registered 2026-09-07 before any instance of this registry exists. Everything
   above section 11.9 assumes BTC trades in one continuous regime for the life of the programme. That can
   fail - a collapse, a sovereign adoption, an exchange failure that breaks the CF constituent basket, a
   Kalshi contract redefinition - and none of it is the kind of event the calendar (11.3) or the shock
   detector (11.5) is built to see: it is not a scheduled release and not a volume burst inside one window,
   it is a change in what the underlying process IS. Pooling data from before and after such an event is
   not a matching failure the way an uncontrolled release is; it is measuring two different instruments and
   calling the difference a signal.

   THE REGISTRY IS AN APPEND-ONLY LOG, SUPPLIED BY THE CALLER, NOT HELD HERE. Unlike the calendar unit's
   RELEASES table - agency dates known in advance and enumerated once - a structural break is operator
   judgment recorded as it happens, so it accrues in a page-side ledger (btc.regime, section 4's
   ungardenable rule) and every function in this unit takes the current array as an argument. This unit
   holds no state, does no I/O, and knows no clock: every "now" a function needs is a parameter.

   TWO KINDS OF ROW, ONE RULE ABOUT WHICH ONE MOVES ANYTHING:
     DECLARED - a human wrote down that BTC broke regime, with a category, a non-empty reason, and when
       (t) it is asserted to have happened. Declaration is the ONLY thing that can define a boundary.
     FLAGGED - a deferred pass noticed realized volatility was unusual against its own trailing
       distribution. A flag carries a statistic and nothing else - no reason, no category - because a
       formula can only say something unusual happened, never that it MEANS something. A flagged row is
       never sufficient to define a boundary on its own and NEVER moves regimeAt(); see the assertion
       named exactly for this in test.js, because it is the one invariant a careless reading of "structural
       break" is most likely to get backwards.

   PROVENANCE, EXACTLY LIKE THE CALENDAR'S DATED ROWS (CLAUDE.md section 8): every declared row is a
   judgment call, not a computation, and this unit's job is to validate its SHAPE (closed category set,
   non-empty reason, plausible timestamps) never its CONTENT. Whether a break really happened is not a
   question code can answer.

   UNGARDENABLE, EXACTLY LIKE EVERY OTHER LEDGER (CLAUDE.md section 4): nothing here is ever deleted or
   rewritten. A break declared and later found to be over-called is not un-declared - it is SUPERSEDED, a
   new row citing the id of the one it corrects (the same style as section 11.8's superseded bounds), so
   the record of what was believed and when survives. Superseded rows stay in the registry, stay queryable,
   and are excluded from the boundary walk. Un-declaring silently would let a boundary move after seeing
   whether it helped a result, which is the one thing CLAUDE.md exists to prevent (section 7.4, 11.7 clause
   6, and now this).

   THREE FAILURE-PATH RULES, mirrored from units/calendar/code.js because a registry that mishandles hand-
   entered provenance rows is the exact failure class this file exists to avoid:
     - A MALFORMED ENTRY IS NEVER SILENTLY DROPPED OR SILENTLY ACCEPTED. regimeEntryFault() names exactly
       what is wrong; regimeRegistryFaults() lists every row currently unusable, by index, so a caller
       can refuse the write (regimeDeclare, at the wiring layer) or explain the gap in the export.
     - BAD CALLER PARAMETERS THROW. t (or a window boundary) that is not a finite epoch-ms number is a
       programmer error at the call site, not data to interpret, and this unit refuses rather than
       returning an answer that looks like one.
     - A ROW THAT SLIPS INTO THE REGISTRY MALFORMED ANYWAY (a stale export, a hand-edited localStorage
       key) DOES NOT CRASH THE WALK. regimeAt/regimeBoundaries silently skip rows regimeRegistryFaults()
       has already flagged, the same defensive posture calBaseRows takes toward a bad DATED row - the
       loud rejection lives at the validation call, not inside every downstream reader. */

/* ---- plausible-timestamp bounds, identical reasoning to units/calendar's CAL_T_MIN/CAL_T_MAX --------
   null, 0, false, a Date object and a numeric string all coerce or compare in ways that used to hand a
   1970 boundary a confident answer elsewhere in this codebase (see calValidTime's comment). Nothing this
   unit will ever see a real timestamp outside this span. */
const REGIME_T_MIN=1230768000000; /* 2009-01-01T00:00:00Z - before any tape this tool will ever see */
const REGIME_T_MAX=4102444800000; /* 2100-01-01T00:00:00Z */

/* A declared break's effective instant (t) may sit at most this far AFTER declaredAt. A break is written
   down once believed, so t normally sits AT or BEFORE declaredAt; a small forward slack is legitimate (an
   operator recording "effective at today's 00:00 UTC contract redefinition" a few hours before the
   rollover, or backdating a declaration written the same afternoon). What this bound actually catches is
   the seconds-vs-ms unit-mix CLAUDE.md section 7 warns about at the OTHER timestamp: pass declaredAt in
   seconds by mistake and a correct-ms t reads as if declared ~56 YEARS before its own effective instant -
   an error of decades, not days, so a slack measured in days cannot mistake a legitimate near-term
   declaration for it. */
const REGIME_T_FUTURE_SLACK_MS=7*86400000; /* 7 days */

/* The closed category set for a DECLARED entry (CLAUDE.md 11.9). Closed so a typo is caught at the point
   of entry rather than silently becoming its own unmatched category forever; "other" so the set is never
   itself a reason to refuse a real declaration. Frozen: adding a category is a recorded change to this
   file and to CLAUDE.md's own enumeration, exactly as calendar's CAL_KINDS is closed for the same reason. */
const REGIME_CATEGORIES=["price-collapse","price-parabola","sovereign-adoption","exchange-failure",
  "contract-redefinition","other"];
const REGIME_KINDS=["declared","flagged"];

/* ---- the flag statistic (CLAUDE.md 11.9: "the automatic half is a flag, never a decision") -----------
   Self-normalizing by construction: a fixed price level or a fixed volatility level is exactly the kind of
   invented number this document warns against (section 11.9's own words - "what counts as unusual for BTC
   changes with BTC"), so the trigger is a PERCENTILE of BTC's own trailing realized-vol distribution, never
   an absolute reading. */

/* Minimum trailing reads before a percentile means anything. 30 is not picked fresh for this unit - it is
   the same small-n floor CLAUDE.md uses everywhere a distribution gets read for the first time: VIA_HIST's
   live series needs >=30 fills before it can turn positive, SWING needs >=30 graded reads before a window
   is highlighted, VERDICT_RULE needs an edge band with n>=30, and section 11.2's own coverage-denominator
   fix (the "minimum 30" clarification) exists for exactly the same reason a ratio over a thin denominator
   is not evidence of anything. A percentile computed from 5 or 10 prior reads swings on the very next
   observation and is not a "trailing distribution" yet - it is noise wearing a statistic's clothes. */
const REGIME_FLAG_MIN_TRAILING=30;

/* PRE-REGISTERED so the trigger cannot be tuned after seeing whether a flag would have fired on an
   interesting day. Two-sided: percentile rank >= REGIME_FLAG_PCTL (an unusually violent trailing read - a
   candidate for price-collapse/price-parabola) OR <= 1-REGIME_FLAG_PCTL (an unusually DEAD trailing read -
   a candidate for exchange-failure: a frozen or starved feed reads as near-zero realized vol, not high).
   0.99 means "outside the middle 98% of the trailing distribution" - deliberately conservative so a flag
   stays a rare, informational nudge rather than routine noise an operator learns to ignore.
   THIS IS INFORMATIONAL, NOT EVIDENTIARY, and section 11.9 says so explicitly: a flag never gates,
   restarts or closes anything by itself, so it is NOT one of the thresholds CLAUDE.md section 11.7 clause
   6 forbids loosening (that clause governs numbers a READY verdict depends on; this one decides only
   whether the operator gets nudged to look). It may be moved in either direction if the false-positive or
   false-negative rate in practice warrants it. What it may NOT be is retuned to make a specific day's flag
   appear or disappear after the fact - that is hindsight with informational cover, and section 7.4 already
   named what hindsight does to this instrument's numbers. */
const REGIME_FLAG_PCTL=0.99;

/* True only for a real, plausible epoch-ms instant, matching units/calendar's calValidTime exactly:
   strict about type as well as value, so a Date object or a numeric string must be converted at the call
   site rather than silently coerced here. */
function regimeValidTime(t){
  return typeof t==="number"&&isFinite(t)&&t>=REGIME_T_MIN&&t<=REGIME_T_MAX;
}

/* ---- single-entry validation ------------------------------------------------------------------------
   Why a hand-entered/declared registry row is unusable, or null if it is fine. Checked on every write
   (the wiring layer's regimeDeclare refuses to append a row that fails this) and re-checked on every read
   (regimeRegistryFaults, so a row that reached the array some other way cannot silently drive the walk). */
function regimeEntryFault(e){
  if(!e||typeof e!=="object") return "entry is not an object";
  if(typeof e.id!=="string"||e.id==="")
    return "missing id: every entry needs a non-empty string identity so a later entry can supersede it";
  if(REGIME_KINDS.indexOf(e.kind)<0) return "kind must be one of "+REGIME_KINDS.join("|");
  if(typeof e.t!=="number"||!isFinite(e.t))
    return "missing/invalid t (epoch ms, the effective instant the break is asserted to have occurred, or the flagged statistic's instant)";
  if(e.t<REGIME_T_MIN||e.t>REGIME_T_MAX) return "t is outside the plausible range (2009-2100)";
  if(typeof e.declaredAt!=="number"||!isFinite(e.declaredAt))
    return "missing/invalid declaredAt (epoch ms, when this entry was written)";
  if(e.declaredAt<REGIME_T_MIN||e.declaredAt>REGIME_T_MAX)
    return "declaredAt is outside the plausible range (2009-2100)";
  if(e.t-e.declaredAt>REGIME_T_FUTURE_SLACK_MS)
    return "t is "+Math.round((e.t-e.declaredAt)/86400000)+"d after declaredAt, past REGIME_T_FUTURE_SLACK_MS ("+
      Math.round(REGIME_T_FUTURE_SLACK_MS/86400000)+"d) - looks like a units mistake (seconds vs ms), not a forward-dated declaration";
  if(e.kind==="declared"){
    if(REGIME_CATEGORIES.indexOf(e.category)<0) return "category must be one of "+REGIME_CATEGORIES.join("|");
    if(typeof e.reason!=="string"||e.reason.replace(/\s+/g,"")==="")
      return "declared entry needs a non-empty reason: a formula can flag, only a human writes a reason (CLAUDE.md 11.9)";
    if(e.source!==undefined&&(typeof e.source!=="string"||e.source==="")) return "source, if present, must be a non-empty string";
    if(e.supersedes!==undefined){
      if(typeof e.supersedes!=="string"||e.supersedes==="") return "supersedes, if present, must be a non-empty string id";
      if(e.supersedes===e.id) return "an entry cannot supersede itself";
    }
    if(e.metric!==undefined) return "declared entry must not carry metric: that field belongs to a flagged entry, never a declaration";
  } else { /* flagged */
    if(e.reason!==undefined)
      return "flagged entry must not carry reason: a flag is never sufficient to define a boundary on its own (CLAUDE.md 11.9)";
    if(e.category!==undefined) return "flagged entry must not carry category: only a declared entry is categorized";
    if(e.source!==undefined) return "flagged entry must not carry source: only a declared entry cites one";
    if(e.supersedes!==undefined) return "flagged entry must not carry supersedes: superseding corrects a declaration, never a flag";
    if(!e.metric||typeof e.metric!=="object") return "flagged entry needs a metric object {name,value,percentile}";
    if(typeof e.metric.name!=="string"||e.metric.name==="") return "metric.name must be a non-empty string";
    if(typeof e.metric.value!=="number"||!isFinite(e.metric.value)) return "metric.value must be a finite number";
    if(typeof e.metric.percentile!=="number"||!isFinite(e.metric.percentile)) return "metric.percentile must be a finite number";
  }
  return null;
}

/* Indices of entries that pass regimeEntryFault - the "structurally sound" subset every registry-level
   check below builds on, exactly as calUsableExceptions filters before calApplyExceptions reasons about
   pairs. Does not throw on a non-array; callers that need the throw use regimeRegistryFaults first. */
function regimeStructurallyValid(entries){
  const out=[];
  if(!Array.isArray(entries)) return out;
  for(let i=0;i<entries.length;i++) if(regimeEntryFault(entries[i])===null) out.push(i);
  return out;
}

/* The ids a structurally-sound DECLARED entry's `supersedes` names, restricted to ids that actually exist
   among structurally-sound entries. An entry whose id is a key of this object is EXCLUDED from the
   boundary walk - it stays in the registry (regimeRegistryFaults does not reject it; supersession is not a
   fault) but no longer defines a boundary, per CLAUDE.md 11.9's "superseded, not un-declared". A dangling
   `supersedes` (naming an id nothing in the registry carries - a typo, or an entry not yet loaded) resolves
   to nothing and supersedes nothing; it is not an error on the superseding row, which is otherwise a
   perfectly good declaration in its own right. */
function regimeSupersededIds(entries){
  const valid=regimeStructurallyValid(entries), out=Object.create(null), ids=Object.create(null);
  let i,e;
  for(i=0;i<valid.length;i++){ e=entries[valid[i]]; ids[e.id]=true; }
  for(i=0;i<valid.length;i++){
    e=entries[valid[i]];
    if(e.kind==="declared"&&typeof e.supersedes==="string"&&ids[e.supersedes]===true) out[e.supersedes]=true;
  }
  return out;
}

/* Every reason a row in the registry is currently unusable, as [{i, id, kind, why}] - the malformed-entry
   report this file's header promises never happens silently. Three passes, each catching a different shape
   of ambiguity:
     1. per-entry structural faults (regimeEntryFault)
     2. two entries sharing one id - supersedes can then no longer name exactly one entry
     3. two ACTIVE (structurally sound, not superseded) DECLARED entries sharing one t - the exact shape of
        D2's chained-correction lesson in units/calendar/code.js: an ambiguous ordering must fail loudly,
        never resolve itself by array position. A pair resolved by supersession (one of the two IS the
        correction for the other) is not ambiguous - only one of them is ever active - so pass 3 excludes
        superseded ids before comparing t, exactly as pass 2's id-duplicate rows are excluded so a row is
        never reported bad twice for the same underlying reason. */
function regimeRegistryFaults(entries){
  const bad=[];
  if(!Array.isArray(entries)){ bad.push({i:-1,id:null,kind:null,why:"registry is not an array"}); return bad; }
  const flagged=Object.create(null);
  function flag(i,id,kind,why){ if(flagged[i]===undefined){ flagged[i]=true; bad.push({i:i,id:id,kind:kind,why:why}); } }
  let i,e;
  for(i=0;i<entries.length;i++){
    e=entries[i];
    const why=regimeEntryFault(e);
    if(why!==null) flag(i,(e&&typeof e.id==="string")?e.id:null,(e&&typeof e.kind==="string")?e.kind:null,why);
  }
  /* pass 2: duplicate id, across every entry that at least carries a usable id string, fault or not -
     an id collision is itself an identity fault independent of whatever else is wrong with the row. */
  const byId=Object.create(null);
  for(i=0;i<entries.length;i++){
    e=entries[i];
    if(!e||typeof e!=="object"||typeof e.id!=="string"||e.id==="") continue;
    if(byId[e.id]===undefined) byId[e.id]=[]; byId[e.id].push(i);
  }
  let k,g;
  for(k in byId) if(Object.prototype.hasOwnProperty.call(byId,k)){
    const idxs=byId[k];
    if(idxs.length>1){
      const msg="entries "+idxs.join(",")+" share id \""+k+"\": ids must be unique so supersedes can reference exactly one entry";
      for(g=0;g<idxs.length;g++) flag(idxs[g],k,entries[idxs[g]].kind||null,msg);
    }
  }
  /* pass 3: duplicate t among active (structurally sound, not superseded, not already flagged) DECLARED
     entries only. */
  const superseded=regimeSupersededIds(entries), byT=Object.create(null);
  for(i=0;i<entries.length;i++){
    if(flagged[i]!==undefined) continue;
    e=entries[i];
    if(!e||e.kind!=="declared") continue;
    if(typeof e.id==="string"&&superseded[e.id]===true) continue;
    const t=String(e.t);
    if(byT[t]===undefined) byT[t]=[]; byT[t].push(i);
  }
  for(k in byT) if(Object.prototype.hasOwnProperty.call(byT,k)){
    const idxs=byT[k];
    if(idxs.length>1){
      const msg="declared entries "+idxs.join(",")+" share effective instant t="+k+
        ": two active boundaries at the same instant make the regimeAt() ordinal walk order-dependent; "+
        "reject and re-declare with one explicitly superseding the other, or a corrected t";
      for(g=0;g<idxs.length;g++) flag(idxs[g],entries[idxs[g]].id,"declared",msg);
    }
  }
  /* pass 4: a SUPERSESSION CYCLE (A supersedes B, B supersedes A, or a longer loop) among entries otherwise
     structurally sound. regimeSupersededIds would exclude every entry in the cycle from the boundary walk
     with no fault reported anywhere - the exact silent span-collapse this pass exists to prevent. Not
     reachable through append-only regimeDeclare/regimeSupersede (a superseding entry is always newer than
     what it corrects), but this registry is loaded from localStorage - hand-editable, importable from a
     stale export - and a corrupted supersedes chain must never quietly merge two regimes into one. Walk
     each declared entry's supersedes pointer; if the walk revisits a node before reaching one with no
     pointer (or an id nothing in the registry carries), every node visited is part of the cycle and is
     faulted - independent of pass 2/3, so an entry already flagged there is still reported here too, since
     a cycle is a distinct reason to distrust the row. */
  const byIdAll=Object.create(null);
  for(i=0;i<entries.length;i++){
    e=entries[i];
    if(e&&typeof e==="object"&&typeof e.id==="string"&&e.id!=="") byIdAll[e.id]=i;
  }
  const cycleChecked=Object.create(null);
  for(i=0;i<entries.length;i++){
    e=entries[i];
    if(!e||e.kind!=="declared"||typeof e.id!=="string"||cycleChecked[e.id]===true) continue;
    const seen=Object.create(null); const path=[];
    let cur=e.id, safety=0;
    while(typeof cur==="string"&&byIdAll[cur]!==undefined&&safety<=entries.length){
      if(seen[cur]===true){
        const msg="supersedes chain starting at \""+cur+"\" cycles back on itself: a cycle can never "+
          "resolve to one active boundary, so nothing in it is trustworthy";
        for(g=0;g<path.length;g++){
          const pe=entries[byIdAll[path[g]]];
          flag(byIdAll[path[g]],path[g],pe?pe.kind:null,msg);
          cycleChecked[path[g]]=true;
        }
        break;
      }
      seen[cur]=true; path.push(cur); cycleChecked[cur]=true;
      const node=entries[byIdAll[cur]];
      cur=(node&&node.kind==="declared"&&typeof node.supersedes==="string")?node.supersedes:null;
      safety++;
    }
  }
  return bad;
}

/* The corrected boundary set: every ACTIVE declared break (structurally sound, not superseded, not part of
   an unresolved same-t pair), sorted by t ascending REGARDLESS of the order entries were declared or
   inserted in - a break can be declared after the fact, dated earlier, exactly as the calendar unit's
   EXCEPTIONS rows can. This is the one place that ordering rule lives; regimeAt walks this list, never the
   raw registry. Throws on a non-array, per this unit's bad-caller-parameters rule - a caller holding
   something other than the registry array is a programmer error, not data to interpret. */
function regimeBoundaries(entries){
  if(!Array.isArray(entries)) throw new TypeError("regime: entries must be an array, got "+(typeof entries));
  const bad=regimeRegistryFaults(entries), badIdx=Object.create(null);
  for(let i=0;i<bad.length;i++) if(bad[i].i>=0) badIdx[bad[i].i]=true;
  const superseded=regimeSupersededIds(entries), out=[];
  for(let i=0;i<entries.length;i++){
    if(badIdx[i]===true) continue;
    const e=entries[i];
    if(e.kind!=="declared") continue;                       /* FLAGGED NEVER REACHES THIS LIST - see regimeAt */
    if(superseded[e.id]===true) continue;
    out.push({id:e.id,t:e.t,category:e.category,reason:e.reason,
      source:(e.source!==undefined?e.source:null),declaredAt:e.declaredAt,
      supersedes:(e.supersedes!==undefined?e.supersedes:null)});
  }
  out.sort(function(a,b){ return a.t-b.t; });
  return out;
}

/* ---- the two functions a future scorer actually calls (CLAUDE.md 11.9) -------------------------------
   "No calibration set, no control match, and no bootstrap resample may span a regime boundary" cashes out
   operationally to sameRegime(), exactly as section 11.3's control matching must go through
   controlEligible() and never be reimplemented at the call site: one function, one place it can be wrong. */

/* The ordinal regime index for instant t: 0 before the first declared break's effective instant, 1 after
   it and before the second, and so on. FLAGGED ENTRIES NEVER MOVE THIS NUMBER - regimeBoundaries() only
   ever collects kind:"declared" rows, so a registry holding nothing but flags returns 0 for every t, no
   matter how extreme the flagged statistic was. That is deliberate and is the one invariant a careless
   reading of "structural break" is most likely to get backwards (see test.js).
   Throws on a non-finite t (bad caller parameter) and on a non-array entries (via regimeBoundaries). */
function regimeAt(t,entries){
  if(typeof t!=="number"||!isFinite(t))
    throw new TypeError("regime: regimeAt t must be a finite epoch-ms number, got "+(typeof t));
  const bounds=regimeBoundaries(entries);
  let n=0;
  for(let i=0;i<bounds.length;i++){ if(bounds[i].t<=t) n++; else break; } /* bounds is t-ascending */
  return n;
}

/* Are t1 and t2 on the same side of every declared boundary? The one function most callers actually need -
   a difference-in-differences arm, a control match, a bootstrap resample all reduce to "may these two
   instants be pooled", and this is the single place that question is answered. */
function sameRegime(t1,t2,entries){
  return regimeAt(t1,entries)===regimeAt(t2,entries);
}

/* Does a declared break inside (setOpenT, setBoundaryT) - strictly between, both ends exclusive - spend an
   open calibration/holdout set, per CLAUDE.md 11.9's extension of section 11.6's holdout-spending clause?
   Pure: no clock. The caller supplies setOpenT (when the set opened, e.g. the first calibration shock
   window) and setBoundaryT (the instant up to which the set is being asked about - "now", or the freeze
   instant) as data; this function performs no lookup of its own.
   The count for the regime the break CLOSES stops where the break falls; a fresh set opens on the first
   graded window in the new regime (CLAUDE.md 11.9) - that reopening is a wiring-layer decision about which
   rows to keep, not something this pure function does, so it returns only the boolean spent/not-spent. */
function regimeSpent(entries,setOpenT,setBoundaryT){
  if(!Array.isArray(entries)) throw new TypeError("regime: entries must be an array, got "+(typeof entries));
  if(typeof setOpenT!=="number"||!isFinite(setOpenT))
    throw new TypeError("regime: setOpenT must be a finite epoch-ms number, got "+(typeof setOpenT));
  if(typeof setBoundaryT!=="number"||!isFinite(setBoundaryT))
    throw new TypeError("regime: setBoundaryT must be a finite epoch-ms number, got "+(typeof setBoundaryT));
  if(!(setOpenT<setBoundaryT))
    throw new RangeError("regime: setOpenT ("+setOpenT+") must be strictly before setBoundaryT ("+setBoundaryT+")");
  const bounds=regimeBoundaries(entries);
  for(let i=0;i<bounds.length;i++) if(bounds[i].t>setOpenT&&bounds[i].t<setBoundaryT) return true;
  return false;
}

/* ---- the flag statistic --------------------------------------------------------------------------- */

/* Why regimeFlagCandidate would refuse to answer, or null if the inputs are usable. Exposed separately
   (rather than folded silently into a null return) so a caller can COUNT why, exactly as this codebase
   already counts every other omission it makes rather than just discarding the row (vrpX in units/schema,
   CAL_DATED_BAD/CAL_EXC_BAD in units/calendar). */
function regimeFlagInputFault(sample,trailing){
  if(typeof sample!=="number"||!isFinite(sample)) return "sample must be a finite number";
  if(!Array.isArray(trailing)) return "trailing must be an array";
  if(trailing.length<REGIME_FLAG_MIN_TRAILING)
    return "trailing has "+trailing.length+" reads, fewer than REGIME_FLAG_MIN_TRAILING ("+REGIME_FLAG_MIN_TRAILING+
      "): a percentile from fewer prior reads is not a stable trailing distribution yet";
  for(let i=0;i<trailing.length;i++) if(typeof trailing[i]!=="number"||!isFinite(trailing[i]))
    return "trailing["+i+"] is not a finite number";
  return null;
}

/* The fraction of `trailing` that sample exceeds, with ties split evenly (the standard "mean rank"
   percentile): a sample equal to several trailing reads is neither above nor below them, it is among them.
   Returned in [0,1]; regimeFlagCandidate converts to a 0-100 reading on the metric it emits. Does not
   validate its inputs - callers go through regimeFlagInputFault first, exactly as regimePercentileRank has
   exactly one caller in this file and is exported for test.js to check directly against hand-built cases. */
function regimePercentileRank(sample,trailing){
  const n=trailing.length;
  let lt=0,eq=0;
  for(let i=0;i<n;i++){ if(trailing[i]<sample) lt++; else if(trailing[i]===sample) eq++; }
  return (lt+0.5*eq)/n;
}

/* null, or a metric object {name, value, percentile} ready to embed in a FLAGGED entry's `metric` field
   (the caller still supplies t, declaredAt and id - this function has no clock and mints no identity).
   `sample` is the current realized-vol read; `trailing` is the array of prior reads the caller already
   has in hand (this unit does no I/O and keeps no history of its own). Flags on EITHER tail: a percentile
   rank at or above REGIME_FLAG_PCTL (unusually violent) or at or below 1-REGIME_FLAG_PCTL (unusually dead -
   see REGIME_FLAG_PCTL's comment for why a frozen feed is a candidate signal too). percentile is reported
   0-100 for readability; the pre-registered comparison itself is done in [0,1] against REGIME_FLAG_PCTL. */
function regimeFlagCandidate(sample,trailing){
  if(regimeFlagInputFault(sample,trailing)!==null) return null;
  const pr=regimePercentileRank(sample,trailing);
  if(pr>=REGIME_FLAG_PCTL||pr<=(1-REGIME_FLAG_PCTL))
    return {name:"rv_trailing_pctl",value:sample,percentile:pr*100};
  return null;
}
