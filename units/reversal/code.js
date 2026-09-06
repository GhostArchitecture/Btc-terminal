/* ---------------------------------------------------------------- H1 reversal: shock-magnitude reversion (measurement only)
   Nothing here arms, prices, highlights, suggests or executes anything. It records. Something else,
   much later, and only after section 11.3's time-matched controls exist, may decide.

   detect/ detects a shock and SIZES it, and its own notes close with: "No reversal/H1 outcome
   measurement. This unit detects and sizes; it does not score." THIS IS THE SCORING HALF. It re-uses
   detect's pre-registered bucket edges through shockMagnitudeBucket() and detect's scale resolver
   through shockScale(). It does NOT re-detect, it does NOT bin, and it defines no edge of its own.

   THE CLAIM UNDER TEST, stated precisely, because "reversal exists" is not it. Roll 1984 /
   Jegadeesh-Titman 1995 / Eross et al: reversion after a large move is real but USUALLY TOO SMALL TO
   SURVIVE COSTS -- occasionally enough. H1 therefore lives in the TAIL of shock sizes, and the question
   with an answer is whether mean reversion crosses ROUND-TRIP COST only in the top buckets. The
   falsifier is that reversion is FLAT across buckets, or scales so gently it never clears cost even at
   the largest observed shock. Both readings need cost ON THE ROW, in the same unit as the reversion it
   is compared against, which is why revRoundTripC() lives here instead of being assumed downstream.

   THE UNIT PROBLEM, which is the one thing a reader of these rows must not get wrong. There are two
   different reversions and they are not interchangeable:
     - TAPE reversion: BTC give-back in log-return / standardised-z units. This is the mechanism the
       literature is about, and it is the axis detect buckets on, so it is what makes "monotonic in
       shock size" a meaningful sentence.
     - BOOK reversion: the move in the KALSHI contract's own price, in cents. The binary is a
       probability, non-linear in spot, and it pins toward 0/1 as the gate approaches, so a 20 bp tape
       give-back is worth wildly different numbers of cents at tau=12 mid-strike and at tau=2 far from
       it -- and near the pin it can be worth nothing at all while the tape reverts perfectly.
   BOTH are measured here and they are kept in separate fields with separate omission codes. Cost is in
   cents, so "clears cost" is answered ON THE BOOK LEG ONLY. The tape leg never touches cost, in this
   code or in the accumulator. See NOTES.md, which says which one the paper-sim arm would trade and why.

   OMIT RATHER THAN FABRICATE. Every failure here produces a REASON CODE, never a zero, never a clamp,
   never an Infinity. Absence is diagnosable; a default is invisible. The accumulator counts codes so an
   exclusion is measurable rather than silent -- the same discipline vrpX enforces for H5.
*/

/* PRE-REGISTERED horizons and cost model. Fixed before a single shock-conditioned observation exists;
   under section 11.7 clause 6 they may be tightened, never loosened to admit a result.

   IMPULSE_MIN = 1. Not a choice: the spine defines shock magnitude as "BTC's move in the minute after a
   known news timestamp". One minute is its definition, restated here as a constant instead of a literal.

   REVERSION_MIN = 5, the PRIMARY horizon. The set REV_HORIZONS_MIN = [3,5,12] has BOUNDS that are
   derived rather than picked. The floor, 3, is the shortest span carrying three one-minute returns; a
   two-return reversion is one bar's noise wearing a horizon's name. The ceiling, 12, is arithmetic: a
   shock landing at the very open of a KXBTC15M window leaves WINDOW_MIN minutes, the impulse consumes
   IMPULSE_MIN of them, and the existing simulation's time-stop is T-1:30, so the tradeable span after
   the impulse is WINDOW_MIN - IMPULSE_MIN - TIME_STOP_MIN = 12.5 minutes -- 12 is the largest whole
   horizon inside it and 13 is outside, so a 13-minute reversion would describe a trade that could not
   be taken. WHICH OF THE THREE IS PRIMARY IS A JUDGMENT AND IS NAMED AS ONE: 5 sits between the bounds,
   and it is designated primary NOW, before any observation, so that reporting all three later does not
   become three shots at one hypothesis (section 11.4 -- k counts arms whether or not they are labelled).
   The two non-primary horizons are EXPLORATORY in section 11.4's sense and any consumer must carry that
   word onto the row. Rows measured at different horizons are never pooled; revAccumulate refuses.

   WINDOW_MIN = 15 and TIME_STOP_MIN = 1.5 are descriptions of the instrument, not tunables: the
   KXBTC15M window length, and SIM's existing T-1:30 time-stop.

   FEE_RATE = 0.07 and LEGS = 2 are the fee model. TWO legs, deliberately: H1's arm fades the impulse and
   exits on box/trail BEFORE the gate, so it is a round trip and pays entry and exit. Section 4's
   one-leg model applies to hold-to-settlement, which this is not. Section 7.5's per-order round-up is
   carried by revFeeC's `rounded` form and BOTH forms are reported, because rounding 0.44c up to 1c has
   already inverted one result in this codebase and picking one silently would hide that. */
const REV={
  IMPULSE_MIN:1,
  REVERSION_MIN:5,
  WINDOW_MIN:15,
  TIME_STOP_MIN:1.5,
  FEE_RATE:0.07,
  LEGS:2,
  /* These two deliberately RESTATE SHOCK.MAG_UNMEASURED / SHOCK.MAG_NONE rather than reading them, so
     this unit degrades to a reason code instead of throwing when detect is absent from the splice.
     test.js asserts the two definitions are identical, so they cannot drift apart unnoticed.
     BUCKET_UNKNOWN is the label of a shock that fired and whose size could not be measured -- the
     normal state after a backgrounded tab, exactly as detect's notes warn. BUCKET_NONE means no
     impulse was even attempted (no shock key). Neither is a member of SHOCK_LABELS, so a GROUP BY
     can never absorb an unmeasured row into a real bucket. */
  BUCKET_UNKNOWN:"unmeasured",
  BUCKET_NONE:"none"
};
const REV_HORIZONS_MIN=[3,5,12];

/* Reason codes. Every one of these is a row that WAS observed and could not be measured truthfully; a
   count of them beside any H1 table is what says how much of the sample the table describes. */
const REV_OMIT={
  NODETECT:"nodetect",  /* the detect unit is not present in this scope: no buckets, no scale resolver */
  BADARG:"badarg",      /* an argument was not a usable number/array */
  SCALE:"scale",        /* sigPerMin did not resolve to a positive per-minute scale */
  OVERLAP:"overlap",    /* the baseline scale's sample does not end strictly before the impulse span */
  BARS:"bars",          /* the anchor key is absent, or the span runs past the end of the buffer */
  GAP:"gap",            /* a bar gap inside the span: not a contiguous one-minute path */
  CLOSE:"close",        /* a non-finite or non-positive close inside the span */
  NOFIT:"nofit",        /* impulse + reversion do not fit inside the window they would be traded in */
  IMP0:"imp0",          /* the impulse was exactly zero: no direction to revert against, no ratio */
  NOQUOTE:"noquote",    /* no book leg was supplied, so nothing can be said about cost */
  QUOTE:"quote",        /* a supplied quote was outside 0..100 cents */
  BASIS:"basis",        /* the cost basis was not declared, so the spread would be double-counted or lost */
  NOBUCKET:"nobucket",  /* the row's shock size is unknown: it is NOT binned anywhere */
  CAPPED:"capped",      /* the row was measured on a non-lagged (capped) scale; see detect D1 */
  HORIZON:"horizon"     /* the row's horizons differ from the accumulator's; pooling them would be a lie */
};

/* Is detect spliced above us? Everything that buckets or resolves a scale goes through this. */
function revHasDetect(){
  return typeof shockMagnitudeBucket==="function"&&typeof shockScale==="function";
}

function revNum(v){ return typeof v==="number"&&isFinite(v); }
function revInt(v){ return revNum(v)&&Math.floor(v)===v; }
/* explicit rather than Math.sign, because the zero case is a decision here and not a rounding detail:
   a zero impulse has no direction, so it yields no signed reversion and no ratio (REV_OMIT.IMP0). */
function revSgn(v){ return v>0?1:(v<0?-1:0); }

/* The bar whose close is the last price at or before a shock instant.
   Bar key k covers [k*60000, (k+1)*60000) and its close is stamped at the END of that minute, so the
   bar CONTAINING the stamp already contains part of the shock and cannot anchor it. The anchor is
   therefore floor(t/60000) - 1, whose close lands exactly at the start of the shock's own minute, and a
   1-minute impulse then measures the minute containing the stamp -- the spine's own definition.
   HONEST LIMIT, the same one BASELINE.GAP_MIN carries: for a stamp landing mid-minute this concedes up
   to one minute of resolution, and there is no way to recover it from minute bars. */
function revShockKey(tShock){
  if(!revNum(tShock)) return null;
  return Math.floor(tShock/60000)-1;
}

/* Index of key k in an ascending keys array, or -1. Binary search; the array may contain gaps.
   `len` bounds the search to the parallel region shared with `closes`, so a keys array longer than
   closes can never return an index with no price behind it. */
function revKeyIndex(keys,k,len){
  if(!Array.isArray(keys)||!revNum(k)) return -1;
  const n=(revInt(len)&&len>=0&&len<=keys.length)?len:keys.length;
  let lo=0,hi=n-1;
  while(lo<=hi){
    const mid=(lo+hi)>>1, v=keys[mid];
    if(!revNum(v)) return -1;
    if(v===k) return mid;
    if(v<k) lo=mid+1; else hi=mid-1;
  }
  return -1;
}

/* One leg: the log return from the close of bar kFrom to the close of bar kFrom+spanMin.
   ALWAYS returns an object. `code` is null exactly when `ret` is a number; there is no null return and
   no thrown error, because every refusal here has to be countable.

   Key-anchored, not end-anchored -- which is why detect's standardisedMove() is not called for it.
   standardisedMove measures the last windowMin minutes relative to `now` and refuses a tape staler than
   SHOCK.STALE_MAX_MIN, both correct for a live flag and both wrong for scoring a shock that happened
   forty minutes ago. The DISCIPLINE is copied exactly: every step must be 1 apart (computeStats' rule
   for refusing a sleep/background gap as a one-minute return) and a non-finite or non-positive close
   ANYWHERE in the span voids the leg, not merely at the endpoints -- the endpoints alone would still
   compute a plausible number, and a broken bar inside means the tape was broken across the span. */
function revLeg(keys,closes,kFrom,spanMin){
  const out={ret:null,spanMin:null,k0:null,k1:null,p0:null,p1:null,code:REV_OMIT.BADARG};
  if(!Array.isArray(keys)||!Array.isArray(closes)) return out;
  if(!revNum(kFrom)||!revNum(spanMin)) return out;
  const w=Math.round(spanMin); if(w<1) return out;
  const n=Math.min(keys.length,closes.length); if(n<1) return out;
  const i=revKeyIndex(keys,kFrom,n);
  if(i<0||i+w>n-1){ out.code=REV_OMIT.BARS; return out; }
  for(let j=i;j<=i+w;j++){
    if(j>i&&keys[j]-keys[j-1]!==1){ out.code=REV_OMIT.GAP; return out; }
    const c=closes[j];
    if(!revNum(c)||c<=0){ out.code=REV_OMIT.CLOSE; return out; }
  }
  const p0=closes[i],p1=closes[i+w],r=Math.log(p1/p0);
  if(!revNum(r)){ out.code=REV_OMIT.CLOSE; return out; }
  return {ret:r,spanMin:w,k0:keys[i],k1:keys[i+w],p0:p0,p1:p1,code:null};
}

/* THE IMPULSE. The move over impulseMin minutes from the shock anchor, standardised by the SAME
   arithmetic detect standardises with -- z = ret / (sig * sqrt(w)) -- fed by the SAME scale resolver
   (shockScale) and bucketed by the SAME pre-registered edges (shockMagnitudeBucket). That is the point:
   impulse and bucket cannot disagree about what "size" means, because there is one definition of size
   and this function does not own it.

   sigPerMin must be a baselineSigma() result for any row that will be pooled. A bare positive number is
   accepted (a fixed constant scale is legitimately uncontaminated) but comes back sigLagged:false, and
   detect's D1 applies: a scale estimated over a window containing the measured span caps |z| at
   sqrt(60)=7.746 or 4.082 and empties the very tail buckets H1 lives in. revAccumulate refuses such a
   row by default rather than pooling a capped z with an uncapped one.

   The non-overlap rule is ENFORCED, not trusted, exactly as standardisedMove enforces it: if the scale
   object's sample does not end strictly before the impulse span, the impulse is REFUSED (OVERLAP)
   rather than measured on a denominator that contains its own numerator.

   `bucketLabel` is ALWAYS a non-empty string, following detect's magLabel contract, so a grouping key
   can never silently absorb an unmeasured row into a real bucket. `bucket` is null whenever the size is
   unknown and a caller must branch on it before reading .label. */
function revImpulse(keys,closes,kShock,sigPerMin,impulseMin){
  const out={ret:null,z:null,absZ:null,impulseMin:null,k0:null,k1:null,p0:null,p1:null,
             sigPerMin:null,sigLagged:null,sigMeta:null,bucket:null,bucketLabel:REV.BUCKET_UNKNOWN,
             code:REV_OMIT.BADARG};
  if(!revHasDetect()){ out.code=REV_OMIT.NODETECT; return out; }
  const w=revNum(impulseMin)?Math.round(impulseMin):REV.IMPULSE_MIN;
  if(w<1) return out;
  const sc=shockScale(sigPerMin);
  if(sc===null){ out.code=REV_OMIT.SCALE; return out; }
  const leg=revLeg(keys,closes,kShock,w);
  if(leg.code!==null){ out.code=leg.code; return out; }
  if(sc.meta&&revNum(sc.meta.kTo)&&sc.meta.kTo>=leg.k0){ out.code=REV_OMIT.OVERLAP; return out; }
  const z=leg.ret/(sc.sig*Math.sqrt(w));
  if(!revNum(z)){ out.code=REV_OMIT.SCALE; return out; }
  const absZ=Math.abs(z), b=shockMagnitudeBucket(absZ);
  return {ret:leg.ret,z:z,absZ:absZ,impulseMin:w,k0:leg.k0,k1:leg.k1,p0:leg.p0,p1:leg.p1,
          sigPerMin:sc.sig,sigLagged:sc.lagged===true,sigMeta:sc.meta,
          bucket:b,bucketLabel:b===null?REV.BUCKET_UNKNOWN:b.label,code:null};
}

/* THE REVERSION. How much of the impulse is given back over the revMin minutes that FOLLOW it, measured
   from the impulse's own end bar so the two legs abut and never overlap.

   SIGN CONVENTION, which is the whole reason this function is not just another revLeg:
       rev = -sgn(impulse.ret) * laterRet
   so a positive `rev` is a give-back and a NEGATIVE `rev` is a continuation. A continuation is a real,
   signed, adverse outcome and is recorded as one; nothing here folds it to zero, takes an absolute
   value, or drops it. Averaging |reversion| would report a bounce on a market that only ever trended.

   Three views of the same number, all stored, because they answer different questions:
     rev      log-return give-back  -- the raw quantity, recoverable
     revZ     rev / (sig*sqrt(revMin)) -- standardised, so a give-back is comparable across regimes
     revFrac  rev / |impulse.ret|   -- the FRACTION of the impulse given back, the literature's quantity
   revFrac is OMITTED, never Infinity and never a clamp, when the impulse is exactly zero: there is then
   no direction to revert against and no denominator, so `rev` and `revZ` are withheld too and the raw
   later-leg return is kept under `laterRet` so nothing measured is thrown away. Code: IMP0.

   THE FIT RULE. impulseMin + revMin must fit inside the window the row would be traded in, or the
   measurement describes a trade nobody could take. Two bounds, both enforced: the hard structural one
   (WINDOW_MIN), and -- when the caller passes tauAtShockMin, the minutes left in the live Kalshi window
   at the shock -- the actual one, allowing for SIM's T-1:30 time-stop. A row that does not fit is
   REFUSED with NOFIT rather than measured and quietly compared against rows that did fit. */
function revReversion(keys,closes,imp,revMin,tauAtShockMin){
  const out={rev:null,revZ:null,revFrac:null,laterRet:null,cont:null,revMin:null,
             k0:null,k1:null,p0:null,p1:null,code:REV_OMIT.BADARG};
  if(!imp||typeof imp!=="object"||imp.code!==null||!revNum(imp.ret)||!revNum(imp.k1)) return out;
  if(!revNum(imp.sigPerMin)||imp.sigPerMin<=0){ out.code=REV_OMIT.SCALE; return out; }
  const h=revNum(revMin)?Math.round(revMin):REV.REVERSION_MIN;
  if(h<1) return out;
  const span=imp.impulseMin+h;
  if(span>REV.WINDOW_MIN){ out.code=REV_OMIT.NOFIT; return out; }
  if(revNum(tauAtShockMin)&&span>tauAtShockMin-REV.TIME_STOP_MIN){ out.code=REV_OMIT.NOFIT; return out; }
  const leg=revLeg(keys,closes,imp.k1,h);
  if(leg.code!==null){ out.code=leg.code; return out; }
  const s=revSgn(imp.ret);
  if(s===0){
    return {rev:null,revZ:null,revFrac:null,laterRet:leg.ret,cont:null,revMin:h,
            k0:leg.k0,k1:leg.k1,p0:leg.p0,p1:leg.p1,code:REV_OMIT.IMP0};
  }
  const rev=-s*leg.ret, revZ=rev/(imp.sigPerMin*Math.sqrt(h));
  if(!revNum(revZ)){ out.code=REV_OMIT.SCALE; return out; }
  return {rev:rev,revZ:revZ,revFrac:rev/Math.abs(imp.ret),laterRet:leg.ret,cont:rev<0,revMin:h,
          k0:leg.k0,k1:leg.k1,p0:leg.p0,p1:leg.p1,code:null};
}

/* --- cost, in Kalshi cents ---------------------------------------------------------------------- */
/* One leg's taker fee, in CENTS, for a contract priced at pC cents. This unit works in cents
   throughout, because that is what Kalshi quotes in and what the ledgers store; index.html's kFee takes
   dollars. The two are the same number: kFee(p) = ceil(0.07*p*(1-p)*100)/100 dollars, which in cents is
   ceil(7*p*(1-p)) -- reproduced here rather than called so this stays a pure function of its argument
   and the suite can pin the two against each other.
   `rounded` true reproduces section 7.5's per-order round-up (the pessimistic, per-contract reading);
   false is the unrounded 0.07*p*(1-p) the swing/sim journal charges. Both are reported by revRoundTripC
   and neither is chosen here, because rounding a 0.44c fee up to 1c has already inverted a result in
   this codebase once and a silent choice would hide that it can happen again. */
function revFeeC(pC,rounded){
  if(!revNum(pC)||pC<0||pC>100) return null;
  const p=pC/100, raw=REV.FEE_RATE*p*(1-p)*100;
  return rounded?Math.ceil(raw):raw;
}

/* Round-trip cost in cents: LEGS (=2) fees plus, when it is not already inside the measured gross, the
   spread crossed.

   THE DOUBLE-COUNT TRAP, which is why `basis` is required and is not defaulted:
     basis "ask-bid"  the caller's gross was measured buying at the ask and selling at the bid, so the
                      spread is ALREADY paid inside it. spreadCostC is 0 and adding spreadC would charge
                      it twice.
     basis "mid-mid"  the caller's gross was measured mid to mid, so the spread has NOT been paid and
                      spreadC must be supplied and charged.
   Anything else returns code BASIS and no cost at all. A defaulted basis would silently double or halve
   the hurdle that decides H1's entire claim, and a wrong hurdle is worse than a missing one. */
function revRoundTripC(entryC,exitC,spreadC,basis){
  const out={feeC:null,feeRawC:null,spreadCostC:null,costC:null,costRawC:null,
             legs:REV.LEGS,basis:null,code:REV_OMIT.BADARG};
  const fIn=revFeeC(entryC,true), fOut=revFeeC(exitC,true);
  const rIn=revFeeC(entryC,false), rOut=revFeeC(exitC,false);
  if(fIn===null||fOut===null||rIn===null||rOut===null){ out.code=REV_OMIT.QUOTE; return out; }
  let sp;
  if(basis==="ask-bid") sp=0;
  else if(basis==="mid-mid"){
    if(!revNum(spreadC)||spreadC<0){ out.code=REV_OMIT.QUOTE; return out; }
    sp=spreadC;
  } else { out.code=REV_OMIT.BASIS; return out; }
  return {feeC:fIn+fOut,feeRawC:rIn+rOut,spreadCostC:sp,costC:fIn+fOut+sp,costRawC:rIn+rOut+sp,
          legs:REV.LEGS,basis:basis,code:null};
}

/* THE BOOK LEG: what the contract itself did, in cents, and whether that clears the round trip.
   `entryC` is the price paid for the faded side at the end of the impulse, `exitC` the price it was
   worth revMin later. The caller determines WHICH side that is from the sign of the impulse -- a
   deterministic consequence of the measurement, not an entry rule, and no rule of any kind is applied
   here. `clears` is a FACT ABOUT THIS ROW under this cost model, not a signal and not a recommendation;
   nothing in this unit renders, highlights or aggregates it into one.
   The rounded and unrounded fee models produce two net figures and BOTH are returned. */
function revBookLeg(book){
  const out={grossC:null,feeC:null,feeRawC:null,spreadCostC:null,costC:null,costRawC:null,
             netC:null,netRawC:null,clears:null,clearsRaw:null,basis:null,code:REV_OMIT.NOQUOTE};
  if(!book||typeof book!=="object") return out;
  const e=book.entryC,x=book.exitC;
  if(!revNum(e)||!revNum(x)||e<0||e>100||x<0||x>100){ out.code=REV_OMIT.QUOTE; return out; }
  const c=revRoundTripC(e,x,book.spreadC,book.basis);
  if(c.code!==null){ out.code=c.code; return out; }
  const gross=x-e;
  return {grossC:gross,feeC:c.feeC,feeRawC:c.feeRawC,spreadCostC:c.spreadCostC,
          costC:c.costC,costRawC:c.costRawC,netC:gross-c.costC,netRawC:gross-c.costRawC,
          clears:(gross-c.costC)>0,clearsRaw:(gross-c.costRawC)>0,basis:c.basis,code:null};
}

/* --- the composed row ---------------------------------------------------------------------------- */
/* One shock -> one row. Keys that could not be measured are left UNDEFINED, never null and never zero,
   so JSON.stringify drops them and a row with no reading is byte-identical to one written before this
   unit existed -- the same backward-compatibility contract schema/ documents as THE OMIT RULE. The
   three code fields are always present (null when that part measured cleanly).

   opts: {tShock | kShock, sigPerMin, impulseMin, revMin, tauAtShockMin, book:{entryC,exitC,spreadC,basis}}
   No default sigPerMin exists and none should: the scale is the caller's pre-registered choice and
   silently supplying one would decide the bucketing of every row in the study. */
function revMeasure(keys,closes,opts){
  const o=opts||{};
  const k=revNum(o.kShock)?Math.round(o.kShock):revShockKey(o.tShock);
  const impMin=revNum(o.impulseMin)?Math.round(o.impulseMin):REV.IMPULSE_MIN;
  const revMin=revNum(o.revMin)?Math.round(o.revMin):REV.REVERSION_MIN;
  const row={kShock:revNum(k)?k:undefined,impulseMin:impMin,revMin:revMin,
             bucketLabel:REV.BUCKET_NONE,impCode:REV_OMIT.BADARG,revCode:REV_OMIT.BADARG,
             bookCode:REV_OMIT.NOQUOTE};
  if(!revNum(k)) return row;
  const imp=revImpulse(keys,closes,k,o.sigPerMin,impMin);
  row.impCode=imp.code;
  if(imp.code===null){
    row.ret=imp.ret; row.z=imp.z; row.absZ=imp.absZ;
    row.k0=imp.k0; row.k1=imp.k1; row.p0=imp.p0; row.p1=imp.p1;
    row.sigPerMin=imp.sigPerMin; row.sigLagged=imp.sigLagged;
    row.bucket=imp.bucket; row.bucketLabel=imp.bucketLabel;
  } else {
    row.bucketLabel=REV.BUCKET_UNKNOWN;
    return row;                                    /* no impulse, no reversion and no bucket: stop here */
  }
  const rv=revReversion(keys,closes,imp,revMin,o.tauAtShockMin);
  row.revCode=rv.code;
  row.revMin=rv.revMin===null?revMin:rv.revMin;
  if(revNum(rv.laterRet)) row.laterRet=rv.laterRet;
  if(rv.code===null){
    row.rev=rv.rev; row.revZ=rv.revZ; row.revFrac=rv.revFrac; row.cont=rv.cont;
    row.rk0=rv.k0; row.rk1=rv.k1; row.rp0=rv.p0; row.rp1=rv.p1;
  }
  const bk=revBookLeg(o.book);
  row.bookCode=bk.code;
  if(bk.code===null){
    row.grossC=bk.grossC; row.feeC=bk.feeC; row.feeRawC=bk.feeRawC; row.spreadCostC=bk.spreadCostC;
    row.costC=bk.costC; row.costRawC=bk.costRawC; row.netC=bk.netC; row.netRawC=bk.netRawC;
    row.clears=bk.clears; row.clearsRaw=bk.clearsRaw; row.costBasis=bk.basis;
  }
  return row;
}

/* --- the per-bucket accumulator ------------------------------------------------------------------- */
/* The only thing that makes H1's monotonicity question answerable: n, mean reversion and mean cost PER
   PRE-REGISTERED BUCKET, with the top two buckets never merged. detect keeps z4-6 and z6+ apart on
   purpose because the tail is where the mechanism is claimed to live; merging them here would delete
   the hypothesis one layer further down, so revBucketTable walks SHOCK_LABELS and merges nothing.

   TAPE AND BOOK ARE ACCUMULATED SEPARATELY, with separate n. They are in different units and only the
   book series is comparable with cost. A single "n" spanning both would let a bucket report a mean
   reversion over 40 rows beside a mean cost over 3 and invite the reader to subtract them.

   Rows are REFUSED, and the refusal counted, when:
     - the bucket is unknown (NOBUCKET) -- an unsized shock is never silently binned anywhere;
     - the scale was not lagged (CAPPED) -- detect's D1: a capped z is not comparable with an uncapped
       one, so pooling them would flatten exactly the tail the table exists to show. Pass
       {requireLagged:false} to build a deliberately mixed table, which is then labelled as one;
     - the horizons differ from the ones the accumulator was opened on (HORIZON). The accumulator locks
       to the first row's (impulseMin, revMin) precisely so that a 3-minute and a 10-minute reversion can
       never end up in the same mean. */
function revAccumulator(opts){
  const o=opts||{};
  return {impulseMin:null,revMin:null,requireLagged:o.requireLagged!==false,
          byBucket:{},omit:{},nSeen:0,nTape:0,nBook:0};
}
function revOmitCount(acc,code){
  if(!acc||!acc.omit||typeof code!=="string") return;
  acc.omit[code]=(acc.omit[code]||0)+1;
}
function revBucketSlot(acc,label){
  let b=acc.byBucket[label];
  if(b===undefined){
    b={label:label,nTape:0,sumRev:0,sumRevZ:0,sumRevFrac:0,
       nBook:0,sumGrossC:0,sumCostC:0,sumCostRawC:0,sumNetC:0,nClears:0};
    acc.byBucket[label]=b;
  }
  return b;
}
function revAccumulate(acc,row){
  if(!acc||!row||typeof row!=="object") return acc;
  acc.nSeen++;
  if(row.impCode!==null){ revOmitCount(acc,row.impCode); return acc; }
  if(!row.bucket||typeof row.bucket.label!=="string"){ revOmitCount(acc,REV_OMIT.NOBUCKET); return acc; }
  if(acc.requireLagged&&row.sigLagged!==true){ revOmitCount(acc,REV_OMIT.CAPPED); return acc; }
  if(acc.impulseMin===null){ acc.impulseMin=row.impulseMin; acc.revMin=row.revMin; }
  else if(acc.impulseMin!==row.impulseMin||acc.revMin!==row.revMin){
    revOmitCount(acc,REV_OMIT.HORIZON); return acc;
  }
  const b=revBucketSlot(acc,row.bucket.label);
  if(row.revCode===null&&revNum(row.rev)&&revNum(row.revZ)&&revNum(row.revFrac)){
    b.nTape++; acc.nTape++;
    b.sumRev+=row.rev; b.sumRevZ+=row.revZ; b.sumRevFrac+=row.revFrac;
  } else revOmitCount(acc,row.revCode||REV_OMIT.BADARG);
  if(row.bookCode===null&&revNum(row.grossC)&&revNum(row.costC)&&revNum(row.netC)){
    b.nBook++; acc.nBook++;
    b.sumGrossC+=row.grossC; b.sumCostC+=row.costC; b.sumCostRawC+=row.costRawC; b.sumNetC+=row.netC;
    if(row.netC>0) b.nClears++;
  } else revOmitCount(acc,row.bookCode||REV_OMIT.NOQUOTE);
  return acc;
}
/* One row per pre-registered bucket, IN ORDER, including buckets with n = 0 -- an empty tail bucket is
   the most important cell in the table and must be visibly empty rather than missing. Means are NULL
   when n is 0; a zero mean would read as "measured, and it was zero". Nothing is ranked, sorted by
   result, or highlighted, and no cell is a signal: five buckets is five cells and section 7.6 applies
   to every one of them. */
function revBucketTable(acc){
  if(!acc||!acc.byBucket) return [];
  const labels=(typeof SHOCK_LABELS!=="undefined"&&Array.isArray(SHOCK_LABELS))?
    SHOCK_LABELS.slice():Object.keys(acc.byBucket).sort();
  /* a label the canonical list does not contain would otherwise vanish from the table -- a silent drop,
     which is the one thing this unit is not allowed to do. Append it instead, so it is visible and
     obviously foreign. It should never occur; if it does, something upstream invented a bucket. */
  const seen=Object.keys(acc.byBucket);
  for(let s2=0;s2<seen.length;s2++) if(labels.indexOf(seen[s2])<0) labels.push(seen[s2]);
  const mean=function(s,n){ return n>0?s/n:null; };
  const rows=[];
  for(let i=0;i<labels.length;i++){
    const lab=labels[i], b=acc.byBucket[lab];
    const nT=b?b.nTape:0, nB=b?b.nBook:0;
    rows.push({label:lab,i:i,
      nTape:nT,meanRev:b?mean(b.sumRev,nT):null,meanRevZ:b?mean(b.sumRevZ,nT):null,
      meanRevFrac:b?mean(b.sumRevFrac,nT):null,
      nBook:nB,meanGrossC:b?mean(b.sumGrossC,nB):null,meanCostC:b?mean(b.sumCostC,nB):null,
      meanCostRawC:b?mean(b.sumCostRawC,nB):null,meanNetC:b?mean(b.sumNetC,nB):null,
      nClears:b?b.nClears:0});
  }
  return rows;
}
