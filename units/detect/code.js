/* ---------------------------------------------------------------- shock detection (H-protocol phase 1/2)
   Measurement only. Nothing here prices, arms, or executes anything.

   The spine's original phase-2 rule was "flag when realized vol exceeds rv60*SEAS by a multiple".
   That is circular: rv60*SEAS is the same quantity calSigma() feeds the pricing engine, so the rule
   flags "the pricing model is currently surprised" and then invites trading on the surprised model.
   Corrected here: recent vol is used ONLY as a SCALE to standardise an observed move. Nothing below
   ever compares a realized quantity against a forecast of that same quantity.

   SECOND circularity, mechanical rather than conceptual, and the reason baselineSigma() exists:
   computeStats() builds sig and rv60 from the TRAILING window, which contains the very minutes being
   standardised. A move then inflates its own denominator and z saturates at a ceiling that does not
   depend on how big the move was -- sqrt(60)=7.746 for an rv60 scale, 1/sqrt(1-0.94)=4.082 for the
   EWMA sig. SHOCK_EDGES tops out at 6, so under those scales the tail buckets are unreachable or
   collapse into one bin, and H1 -- whose entire mechanism lives in the TAIL of shock sizes -- would
   be measured with the tail deleted. The scale must therefore be estimated from bars that END BEFORE
   the standardised span. baselineSigma() does exactly that and is the intended source. */

/* PRE-REGISTERED constants. Fixed before any outcome was scored; they are not fitted to data and
   must not be tuned once results exist. Tuning any of these after seeing a result manufactures the
   effect it is supposed to test. */
const SHOCK={
  K_DEFAULT:3,        /* |z| threshold for a phase-2 (endogenous) flag, in standardised-move units */
  CAL_NEAR_MIN:15,    /* a scheduled release counts as "nearby" within +/-15 min of its stamp */
  WINDOW_MIN:30,      /* default post-shock analysis window, minutes */
  STALE_MAX_MIN:1,    /* the newest bar may lag `now` by at most this many minutes (see standardisedMove) */
  MAG_UNMEASURED:"unmeasured", /* magLabel when a shock fired but no z could be measured */
  MAG_NONE:"none"     /* magLabel when nothing fired (a bucket here would read as a shock size) */
};

/* PRE-REGISTERED bucket edges for H1's size-conditioning, in standard deviations of the standardised
   move. Half-open [lo,hi): absZ exactly 2 lands in "z2-3". Lowest bucket exists because a phase-1
   calendar shock can carry any |z|, including a tiny one.
   The top two buckets are kept SEPARATE rather than merged into one ">=4" on purpose: H1's whole
   mechanism is that reversal only clears cost in the TAIL of shock sizes, so the tail has to survive
   the bucketing instead of being averaged into a fat top bucket. DO NOT retune these later.
   These edges are only reachable if the scale is lagged -- see baselineSigma(). */
const SHOCK_EDGES=[2,3,4,6];
const SHOCK_LABELS=["z<2","z2-3","z3-4","z4-6","z6+"];

/* PRE-REGISTERED baseline-scale settings. LOOKBACK_MIN 60 mirrors the spine's rv60 horizon; GAP_MIN 1
   drops the bar that anchors the move's own p0, because a shock frequently starts mid-minute before
   the span's first key; MIN_FRAC 0.5 / MIN_RET 10 reproduce rv60's own "at least 30 of 60 usable
   returns" gate at the default lookback, and keep a shorter lookback from being estimated off a
   handful of bars. Not fitted. */
const BASELINE={LOOKBACK_MIN:60,GAP_MIN:1,MIN_FRAC:0.5,MIN_RET:10};

/* LAGGED per-minute volatility scale: sigma estimated STRICTLY FROM BARS BEFORE the span that
   standardisedMove() will measure, so the move cannot enter its own denominator.

   Given the same keys/closes/now/windowMin that standardisedMove() receives, the measured span is
   bars [n-1-windowMin .. n-1]. This function uses only bars at or before index (n-1-windowMin-gapMin),
   taking `lookbackMin` one-minute returns ending there:

       ... [ s .......... e ] --gapMin-- [ k0 ............ k1 ]
           |<- baseline ->|              |<- measured span ->|

   sigma is the uncentered RMS of those returns, sqrt(mean(r^2)) -- the same functional form as
   computeStats()' rv60, which is what calSigma() uses as its base, so the units and the estimator
   match the rest of the codebase. Returns across a bar gap or through a corrupt close are DROPPED
   (computeStats()' 1-apart rule), not measured through.

   Returns null -- never a plausible number -- when: bad args; lookbackMin < 2; gapMin < 0; the tape
   is staler than SHOCK.STALE_MAX_MIN (the same gate standardisedMove applies, so the two agree);
   there are not enough bars for the whole lagged sample; fewer than max(MIN_RET, ceil(lookback/2))
   usable returns survive; or sigma comes out non-positive (a perfectly flat baseline gives no scale,
   and dividing by it would manufacture an infinite z).

   The result is an OBJECT, not a bare number, so the scale's provenance can land on the ledger row:
   {sigPerMin, lagged:true, nRet, lookbackMin, gapMin, windowMin, kFrom, kTo, kSpanFrom, kSpanTo, source}.
   Pass it straight to standardisedMove() as `sigPerMin`.

   HONEST LIMITS. Lagging removes the mechanical self-inflation (numerator inside its own denominator).
   It does NOT remove volatility clustering: a shock arriving after an already-elevated hour still has
   a larger denominator, so the second shock of a burst reads smaller than the first. It does not
   remove sub-minute leakage beyond gapMin minutes. And the uncentered RMS carries any drift inside
   the baseline into sigma, exactly as rv60 does. z is a standardised move, not a p-value. */
function baselineSigma(keys,closes,now,windowMin,lookbackMin,gapMin){
  if(!Array.isArray(keys)||!Array.isArray(closes)) return null;
  if(typeof now!=="number"||!isFinite(now)) return null;
  if(typeof windowMin!=="number"||!isFinite(windowMin)) return null;
  const w=Math.round(windowMin); if(w<1) return null;
  let L=BASELINE.LOOKBACK_MIN;
  if(lookbackMin!==undefined&&lookbackMin!==null){
    if(typeof lookbackMin!=="number"||!isFinite(lookbackMin)) return null;
    L=Math.round(lookbackMin);
  }
  if(L<2) return null;
  let g=BASELINE.GAP_MIN;
  if(gapMin!==undefined&&gapMin!==null){
    if(typeof gapMin!=="number"||!isFinite(gapMin)) return null;
    g=Math.round(gapMin);
  }
  if(g<0) return null;
  const n=Math.min(keys.length,closes.length); if(n<1) return null;
  const kEnd=keys[n-1]; if(typeof kEnd!=="number"||!isFinite(kEnd)) return null;
  const lag=Math.floor(now/60000)-kEnd;
  if(lag<0||lag>SHOCK.STALE_MAX_MIN) return null;
  const j0=n-1-w;                 /* first bar of the span standardisedMove will measure */
  const e=j0-g;                   /* last bar admitted to the baseline */
  const s=e-L;                    /* first bar admitted; L returns run s+1..e */
  if(s<0) return null;
  let sum=0,cnt=0;
  for(let i=s+1;i<=e;i++){
    const ka=keys[i-1],kb=keys[i];
    if(typeof ka!=="number"||typeof kb!=="number"||kb-ka!==1) continue;    /* a gap is not a 1-minute return */
    const ca=closes[i-1],cb=closes[i];
    if(typeof ca!=="number"||!isFinite(ca)||ca<=0) continue;
    if(typeof cb!=="number"||!isFinite(cb)||cb<=0) continue;
    const r=Math.log(cb/ca); if(!isFinite(r)) continue;
    sum+=r*r; cnt++;
  }
  const need=Math.max(BASELINE.MIN_RET,Math.ceil(L*BASELINE.MIN_FRAC));
  if(cnt<need) return null;
  const sig=Math.sqrt(sum/cnt);
  if(!isFinite(sig)||sig<=0) return null;
  return {sigPerMin:sig,lagged:true,nRet:cnt,lookbackMin:L,gapMin:g,windowMin:w,
          kFrom:keys[s],kTo:keys[e],kSpanFrom:keys[j0],kSpanTo:kEnd,source:"baselineSigma"};
}

/* Resolve the `sigPerMin` argument of standardisedMove into {sig,lagged,meta} or null.
   A baselineSigma() result is the intended input and carries lagged:true. A bare positive number is
   still accepted -- a FIXED constant scale is a legitimate, uncontaminated choice -- but it is tagged
   lagged:false so a ledger row records that the ceiling of D1 may apply to it. */
function shockScale(sigPerMin){
  if(typeof sigPerMin==="number")
    return (isFinite(sigPerMin)&&sigPerMin>0)?{sig:sigPerMin,lagged:false,meta:null}:null;
  if(sigPerMin&&typeof sigPerMin==="object"){
    const v=sigPerMin.sigPerMin;
    if(typeof v==="number"&&isFinite(v)&&v>0)
      return {sig:v,lagged:sigPerMin.lagged===true,meta:sigPerMin};
  }
  return null;
}

/* Log return over the last `windowMin` completed minutes, standardised by a per-minute sigma.
   keys/closes are the parallel arrays from barsExcludingCurrent(); keys are minute indices
   (Math.floor(ms/60000)) and MUST be exactly 1 apart across the whole span, the same rule
   computeStats() uses to refuse a sleep/background gap as a one-minute return.

   `sigPerMin` is a SCALE only -- z is a standardised move, never a model error. Pass either:
     - a baselineSigma(keys,closes,now,windowMin,...) result  <-- REQUIRED FORM for H-protocol rows;
       its sample ends before the measured span, so the move cannot inflate its own denominator; or
     - a bare positive number, for a FIXED constant scale.
   DO NOT pass computeStats().rv60, computeStats().sig or calSigma(...): those are estimated over a
   trailing window that CONTAINS the measured span, which caps z at sqrt(60)=7.746 and 4.082
   respectively regardless of how large the move is, and so empties the pre-registered tail buckets.
   The result carries `sigLagged` and `sigMeta` so which scale was used is reconstructable from the row.
   If a scale object's sample does NOT end before the measured span (a caller who built the baseline
   for a different windowMin), the move is REFUSED rather than measured on an overlapping scale.

   Returns null (rather than a plausible number) when the span cannot be measured truthfully:
   bad args, an unusable scale, fewer than windowMin+1 bars, any gap inside the span, a non-positive
   or non-finite close ANYWHERE in the span (the endpoints alone would still compute, but a corrupt
   bar inside means the tape was broken across the span), or a newest bar staler than
   SHOCK.STALE_MAX_MIN relative to `now` -- a stale tape would otherwise report an old move as "the
   last windowMin minutes". */
function standardisedMove(keys,closes,now,windowMin,sigPerMin){
  if(!Array.isArray(keys)||!Array.isArray(closes)) return null;
  if(typeof now!=="number"||!isFinite(now)) return null;
  if(typeof windowMin!=="number"||!isFinite(windowMin)) return null;
  const sc=shockScale(sigPerMin); if(sc===null) return null;
  const w=Math.round(windowMin); if(w<1) return null;
  const n=Math.min(keys.length,closes.length); if(n<w+1) return null;
  const kEnd=keys[n-1]; if(typeof kEnd!=="number"||!isFinite(kEnd)) return null;
  const lag=Math.floor(now/60000)-kEnd;
  if(lag<0||lag>SHOCK.STALE_MAX_MIN) return null;
  for(let i=n-1-w;i<n;i++){
    if(i>n-1-w&&keys[i]-keys[i-1]!==1) return null;                          /* a gap is not a 1-minute step */
    const c=closes[i];
    if(typeof c!=="number"||!isFinite(c)||c<=0) return null;                 /* a corrupt bar anywhere in the span voids it */
  }
  /* the exclusion is ENFORCED here, not merely trusted: a caller who builds the baseline for one
     windowMin and then measures another would otherwise slide the sample back inside the span. */
  if(sc.meta&&typeof sc.meta.kTo==="number"&&isFinite(sc.meta.kTo)&&sc.meta.kTo>=keys[n-1-w]) return null;
  const p1=closes[n-1],p0=closes[n-1-w];
  const ret=Math.log(p1/p0);
  const z=ret/(sc.sig*Math.sqrt(w));
  if(!isFinite(z)) return null;
  return {ret:ret,z:z,absZ:Math.abs(z),windowMin:w,k0:keys[n-1-w],k1:kEnd,p0:p0,p1:p1,
          sigPerMin:sc.sig,sigLagged:sc.lagged,sigMeta:sc.meta};
}

/* Ordinal magnitude bucket for absZ. Returns {i,label,lo,hi} (hi null in the open top bucket)
   or null when absZ is not a measurable non-negative number. `i` is the ordinal; `label` is the
   CSV/grouping key. */
function shockMagnitudeBucket(absZ){
  if(typeof absZ!=="number"||!isFinite(absZ)||absZ<0) return null;
  let i=0; while(i<SHOCK_EDGES.length&&absZ>=SHOCK_EDGES[i]) i++;
  return {i:i,label:SHOCK_LABELS[i],lo:i===0?0:SHOCK_EDGES[i-1],hi:i<SHOCK_EDGES.length?SHOCK_EDGES[i]:null};
}

/* Is a named scheduled release near enough to claim this observation? Accepts the calendar unit's
   tag {ev,evMins,evTier}, a {name,mins} row, or a bare event-name string (caller already gated).
   `nearMin` defaults to SHOCK.CAL_NEAR_MIN when absent or unusable: an omitted argument used to make
   the comparison `Math.abs(m)<=undefined` -> false, which silently DISCARDED a release happening
   right now and filed the move as endogenous -- the exact direction this function exists to avoid.
   A named event with no usable distance still returns the name: the dangerous error is filing a
   scheduled move into the endogenous bucket, so ambiguity resolves toward phase 1. */
function shockCalNear(tag,nearMin){
  if(tag===null||tag===undefined||tag===false) return null;
  if(typeof tag==="string") return tag.length?tag:null;
  if(typeof tag!=="object") return null;
  const nm=(typeof nearMin==="number"&&isFinite(nearMin)&&nearMin>=0)?nearMin:SHOCK.CAL_NEAR_MIN;
  let name=null;
  if(typeof tag.ev==="string"&&tag.ev.length) name=tag.ev;
  else if(typeof tag.name==="string"&&tag.name.length) name=tag.name;
  if(name===null) return null;
  let m=null;
  if(typeof tag.evMins==="number") m=tag.evMins;
  else if(typeof tag.mins==="number") m=tag.mins;
  if(m===null||!isFinite(m)) return name;
  return Math.abs(m)<=nm?name:null;
}

/* opts: {calendarTag, z, k, calNearMin}
   -> {shock, phase, z, mag, magLabel, source}
   Phase 1 (scheduled) takes precedence and does NOT look at z at all: a release is a known event
   whether or not the price moved, and a quiet release is still a release.
   Phase 2 (endogenous) fires on |z| >= k ONLY when no scheduled release is nearby.
   `phase` is always recorded because the two have very different reliability -- a phase-1 flag is a
   fact from a calendar, a phase-2 flag is an inference from the tape. They must never be pooled
   into one "shock" population without carrying this field.

   `mag` is NULL in two distinct situations and a caller MUST branch on it before reading .label:
     - nothing fired: a bucket on a non-shock would read as a shock magnitude;
     - a phase-1 shock whose z could not be measured (bar gap, stale tape after a backgrounded tab,
       cold start). The size is genuinely unknown and inventing a bucket for it would corrupt H1's
       size-conditioning. This is COMMON, not exotic -- it is the normal state after a tab resume.
   `magLabel` is therefore ALWAYS a non-empty string and is the field a render or CSV path running at
   1 Hz should read: mag.label when a bucket exists, else SHOCK.MAG_UNMEASURED ("unmeasured") for a
   fired-but-unmeasured row, else SHOCK.MAG_NONE ("none"). Neither sentinel is a member of
   SHOCK_LABELS, so a grouping key can never silently absorb them into a real bucket.
   Call shockMagnitudeBucket() directly to bucket control windows. */
function detectShock(opts){
  const o=opts||{};
  const z=(typeof o.z==="number"&&isFinite(o.z))?o.z:null;
  const k=(typeof o.k==="number"&&isFinite(o.k)&&o.k>0)?o.k:SHOCK.K_DEFAULT;
  const near=(typeof o.calNearMin==="number"&&isFinite(o.calNearMin)&&o.calNearMin>=0)?o.calNearMin:SHOCK.CAL_NEAR_MIN;
  const cal=shockCalNear(o.calendarTag,near);
  const lab=(m,fired)=>m===null?(fired?SHOCK.MAG_UNMEASURED:SHOCK.MAG_NONE):m.label;
  if(cal!==null){
    const m=z===null?null:shockMagnitudeBucket(Math.abs(z));
    return {shock:true,phase:1,z:z,mag:m,magLabel:lab(m,true),source:cal};
  }
  if(z!==null&&Math.abs(z)>=k){
    const m=shockMagnitudeBucket(Math.abs(z));
    return {shock:true,phase:2,z:z,mag:m,magLabel:lab(m,true),source:"endogenous"};
  }
  return {shock:false,phase:null,z:z,mag:null,magLabel:SHOCK.MAG_NONE,source:null};
}

/* Post-shock gate. Half-open [0,lenMin) so consecutive windows tile without double-counting a row.
   minsSince is signed and unrounded (negative = nowT precedes the shock). */
function shockWindow(shockT,nowT,lenMin){
  if(typeof shockT!=="number"||!isFinite(shockT)||typeof nowT!=="number"||!isFinite(nowT))
    return {inWindow:false,minsSince:null};
  const L=(typeof lenMin==="number"&&isFinite(lenMin))?lenMin:SHOCK.WINDOW_MIN;
  const mins=(nowT-shockT)/60000;
  return {inWindow:mins>=0&&mins<L,minsSince:mins};
}

/* Time-matched control keys. Without these every shock result is confounded with time of day:
   the releases that drive phase 1 cluster at 12:30-13:30 UTC, on the rising limb of this
   instrument's own seasonal curve (SEAS 1.007 at 12 UTC -> 1.298 at 13 UTC -> 1.934 at 14 UTC), and
   US DST slides the same 08:30 ET release between the 12 and 13 UTC slots twice a year (08:30 EDT =
   12:30 UTC, 08:30 EST = 13:30 UTC), whose seasonal factors differ by ~29%. A shock/non-shock
   comparison must be made WITHIN a clock stratum, not pooled across the day. Randomising the side
   (the spine's shock_random control) does not address this at all -- it randomises the call, not the
   clock. seasTable is passed in (never read off the global) so this is testable; if it is not a
   24-entry numeric table, seas comes back null rather than silently wrong.
   weekday is the UTC day (0=Sun). slot15 is the 15-minute slot of the UTC day, 0..95 -- the natural
   stratum for KXBTC15M windows, though it is sparse; hourUTC is the coarser stratum to fall back to. */
function timeMatchedControl(t,seasTable){
  if(typeof t!=="number"||!isFinite(t)) return null;
  const d=new Date(t),h=d.getUTCHours(),mi=d.getUTCMinutes();
  let s=null;
  if(Array.isArray(seasTable)&&seasTable.length===24){ const v=seasTable[h]; if(typeof v==="number"&&isFinite(v)) s=v; }
  return {hourUTC:h,minuteUTC:mi,weekday:d.getUTCDay(),slot15:h*4+Math.floor(mi/15),seas:s};
}
