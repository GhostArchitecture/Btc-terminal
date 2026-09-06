/* ---------------------------------------------------------------- schema: ledger enrichment (H-protocol state capture) */
/* Pure glue for SPEC.md. Builds the OPTIONAL, NULLABLE field bundles that edgeSnapOne / swingTick /
   simCloseOne attach to each row, plus the deferred settlement-volatility bundle and the two offline
   analysis measures the CSV needs. No DOM, no localStorage, no fetch, no timers, no reads of S.

   THE OMIT RULE, which is the whole backward-compatibility contract: a value that cannot be derived
   truthfully is OMITTED (left undefined), never written as null and never guessed. JSON.stringify drops
   an undefined value, so a new row with no reading is byte-for-byte identical to a row written by the
   previous build. Every consumer therefore needs exactly one tolerance rule - "absent means unknown" -
   and it covers both the old rows and the new ones.

   Two return conventions, deliberately different:
     *Fields(...)  -> an object for schemaPut: absent keys are UNDEFINED (so they never reach storage).
     the analysis helpers (depthAtAsk, misRatio, edgeSpreadC, swingSpreadC, utcHour, seasAt)
                   -> NULL for "no value", because they feed the CSV, where a cell must be written. */
/* SCHEMA_VERSION 3 -- was 2 until 2026-09-06. Bumped for exactly one reason: the gate that decides whether a
   stored implied sigma may be believed changed from the LOCAL DERIVATIVE (relPerCent against VRP_REL_MAX=0.5) to
   the TRUE ONE-CENT TICK move (against VRP_TICK_REL_MAX=0.20) -- see THE STORED IDENTIFIABILITY GATE below. A
   container or journal row written under the old gate is not interchangeable with one written under the new
   gate, and sv is the only thing that says which wrote it. It is NOT any ledger's `v` literal and nothing loads
   or discards on it (SPEC design rule 4). Snaps and swing reads carry no sv, so on those the discriminator is
   the presence of `sq`. */
const SCHEMA_VERSION=3;              /* stamped on containers and on standalone journal rows, never on a snap */
const SCHEMA_BP=1e4;                 /* sigma is stored as basis points of PER-MINUTE log-return sigma */
const SCHEMA_VOL_GIVEUP_MS=300*60000;/* S.bars holds 360 minutes; past this a window's realized sigma is gone for good */
/* PRE-REGISTERED, DO NOT TUNE. The plausibility band on si/sm - the implied sigma as a multiple of the model's
   own sigma for the same row. Fixed before any vrp data exists, exactly as VERDICT_RULE's thresholds were
   (CLAUDE.md sec 4, sec 7.6). Derivation of the floor: within this tool's own model family two sigmas describing
   the same tape can differ by at most the seasonal ratio times the term factor - sqrt(1.934/0.804)=1.55 times
   1.089 = 1.69. Anything past that is not a disagreement about volatility inside the model, it is the model
   failing. 4 is roughly 2.4x that widest in-family disagreement, deliberately loose so ordinary regime
   disagreement is never excluded; it is a judgment number and it is named as one. Changing it to admit more
   readings would be tuning a filter against its own results - any change is a recorded re-registration, not an
   edit. Nothing is destroyed by it: a failing row keeps si/sm/xs/tau, only the composite vrp is withheld and the
   withholding is counted in vrpX, so the excluded set is measurable and vrp is recomputable under any other rule. */
const SCHEMA_SIR_MIN=0.25, SCHEMA_SIR_MAX=4;

/* --- THE STORED IDENTIFIABILITY GATE: RE-REGISTERED 2026-09-06 ------------------------------------------
   This is a RE-REGISTRATION, not an edit. The superseded bound stays visible here beside its replacement.

     SUPERSEDED: sigmaIdentifiability(x, sigModel, tau).identified against VRP_REL_MAX = 0.5 -- a bound on
                 `relPerCent`, the LOCAL DERIVATIVE of implied sigma with respect to the quote.
     IN FORCE:   impliedSigmaTick(strike, S0, tau, q).identified against VRP_TICK_REL_MAX = 0.20 -- a bound on
                 the TRUE largest fractional move in implied sigma across one real tick (one cent) of quote,
                 measured by re-inverting at q+1c and at q-1c.

   WHY THE OLD ONE WAS THE WRONG QUANTITY, not merely the wrong number. Kalshi quotes in whole cents, so one
   cent IS the resolution of this instrument -- a derivative is a move this market never makes. And the map
   from quote to implied sigma is convex near the money, so the derivative badly understates what a real tick
   does. Measured on a 15-minute window at sigma 9 bp/min, each strike quoted at its own model-fair value:

       distance   xs      relPerCent (old gate)      TRUE one-cent move in implied sigma
       0 bp       0.000   14.382                     +1c has no root at all
       1 bp       0.029    0.931                     +1c has no root at all (one-sided 47.5%)
       2 bp       0.057    0.451  <- PASSED 0.5      86.4%   <- noise, admitted as a clean reading
       5 bp       0.143    0.179                     21.8%
       10 bp      0.287    0.092                     10.1%
       20 bp      0.574    0.052                      5.4%
       35 bp      1.004    0.041                      4.2%
       60 bp      1.721    0.064                      6.7%
       120 bp     3.443    2.745  <- rejected        (fair value below the engine's clip floor)

   So the old gate admitted a reading whose implied sigma moves 86% on a single tick of quote. That is the
   exact failure CLAUDE.md sec 7 rule 6 exists to prevent, arriving through the TOLERANCE rather than through
   the arithmetic: every step correct, the output dominated by quote granularity, nothing in the record saying so.

   WHERE 0.20 COMES FROM. It is DERIVED, and the derivation lives in volspace beside the constant itself so
   there is exactly one definition of the number (this unit reads VRP_TICK_REL_MAX, it never restates it).
   Implied sigma exists here only to be differenced against REALIZED sigma. Realized sigma from n contiguous
   one-minute returns carries relative sampling error ~1/sqrt(2n) -- n=10 -> 22.4%, n=15 -> 18.3%, n=30 -> 12.9%.
   A 15-minute window yields at most 15 returns, so the realized number carries ~18.3% inherent error. If one
   tick of quote moves the implied reading by more than the error already carried by the number it is
   differenced against, quote granularity dominates the premium and the comparison resolves nothing.

   DIRECTION, which is the part that matters under the pre-registration rules. This is a strict TIGHTENING:
   0.5 on a quantity that understated the move, to 0.20 on the true move itself. CLAUDE.md sec 11.7 clause 6
   permits RAISING a threshold at any time and CLOSES the programme if one is ever lowered, so the direction is
   stated here rather than left to be inferred. NO DATA HAS BEEN COLLECTED UNDER THE OLD BOUND AND NO HOLDOUT
   IS OPEN: this corrects a mis-specified instrument before its first observation, it does not tune a threshold
   against a result. Recorded explicitly: had a holdout been open, sec 11.6 says this same change would have
   SPENT it -- every window scored under the old freeze retired and the count restarted at zero. It is free
   only because it is early, and that is the only reason it is free.

   THE SPLIT -- two questions, two functions, and they must not be confused:
     sigmaIdentifiability(x, sigModel, tau)   PRIOR.   Quote-free: "could sigma be recovered at this strike at
                                                       all?" Still useful, still used -- before a quote exists,
                                                       and as the FALLBACK for a row that carries no stored tick
                                                       sensitivity. It never decides a reading that has one.
     impliedSigmaTick(strike, S0, tau, q)     DECIDER. Needs the real quote. It is what edgeSnapFields and
                                                       swingReadFields consult at the write site, and what
                                                       siJudge honours through the stored `sq`.

   WHY THE SENSITIVITY IS STORED RATHER THAN RECOMPUTED. By settlement time the quote is gone -- siJudge is
   handed a ROW, not a book -- so the tick probe can only run where the quote is, at the write site. Storing the
   NUMBER rather than a boolean also lets a later analyst re-filter at any other bound, and see why a reading
   was dropped, without re-deriving anything.

   THE (sq, sqS) CONTRACT. Four states, read as a pair, never one without the other:
   CORRECTION 2026-09-06, after adversarial review. `sq` and `sqS` DO NOT GATE and never did legitimately.
   They are a DIAGNOSTIC of how well conditioned this row's own inversion was. The gate is
   sigmaIdentifiability(x, sigModel, tau), which takes no quote and therefore cannot select on the answer;
   see the note above siJudge. The four states below still describe what the pair means, they just no longer
   describe a verdict. `sb`, written beside them, is the bound in force at the WRITE, so a row keeps the
   judgment it was made under when siJudge re-runs at export.

     sq absent,  sqS absent    - no tick reading: a pre-3 row, no quote, no volspace, or no si at all.
     sq present, sqS absent    - TWO-SIDED: both q+1c and q-1c inverted; sq is the LARGER of the two fractional
                                 moves. This is the only state that can pass the gate.
     sq present, sqS "u"/"d"   - ONE-SIDED: only that neighbour inverts; sq is that one-sided move. A missing
                                 neighbour means one tick moves the reading OUT OF EXISTENCE, which is the
                                 strongest available evidence of unidentifiability, so this NEVER passes. A
                                 missing neighbour is not zero sensitivity and must never be read as one.
     sq absent,  sqS "n"       - NEITHER neighbour inverts. Unbounded; never passes.
   sqS is omitted in the two-sided case only because that is the common case and the edge ledger is already
   over quota (SPEC sec 8): `sq` present is what says a tick reading exists, sqS is the exception marker. */

/* finite -> rounded number; anything else -> undefined, so the key is omitted. */
function schemaNum(v,dp){
  if(typeof v!=="number"||!isFinite(v)) return undefined;
  const m=Math.pow(10,dp||0), r=Math.round(v*m)/m;
  return isFinite(r)?r:undefined;
}
/* per-minute sigma -> basis points per minute (sigma*1e4), 2dp. Live BTC runs roughly 5-15 bp/min, so
   2dp of a bp is finer than the tape can resolve and 4 characters replace 9. */
function sigBp(sig){
  if(typeof sig!=="number"||!isFinite(sig)||sig<0) return undefined;
  const r=schemaNum(sig*SCHEMA_BP,2);
  /* a strictly positive sigma below 0.005 bp/min rounds to 0. Storing that would be a FABRICATED zero: it reads
     as a legitimate measurement of no volatility and propagates as vrp = 0 - sr, a large negative premium out of
     nowhere. Sub-resolution is not zero - omit it, which is what every other unrepresentable value here does.
     An exact zero (a genuinely flat tape) is still stored, because that one IS the measurement. */
  if(r===0&&sig>0) return undefined;
  return r;
}

/* the seasonal factor calSigma and touchProb actually apply: sqrt(SEAS[endHour]/SEAS[nowHour]).
   Exactly 1 inside one clock hour - it only bites when the window crosses an hour boundary (10.2). */
function seasFactor(now,tEnd){
  /* new Date(null) is the EPOCH, not an Invalid Date, so an unguarded null would silently read SEAS[0] and
     return a plausible 1. Both timestamps must be real numbers or there is no factor. */
  if(typeof now!=="number"||typeof tEnd!=="number"||!isFinite(now)||!isFinite(tEnd)) return undefined;
  const hN=new Date(now).getUTCHours(), hE=new Date(tEnd).getUTCHours();
  const a=SEAS[hE], b=SEAS[hN];
  if(!(a>0)||!(b>0)) return undefined;
  return Math.sqrt(a/b);
}
function utcHour(t){ return (typeof t==="number"&&isFinite(t))?new Date(t).getUTCHours():null; }
/* the raw seasonality control regressor: the table multiplier for the row's own UTC hour. */
function seasAt(t){ const h=utcHour(t); return h===null?null:(SEAS[h]===undefined?null:SEAS[h]); }

/* the sigma touchProb runs its Monte Carlo on: the rv60 base times the seasonal ratio and NO term factor.
   Defined here so there is one definition; touchProb should call it rather than repeat the two lines. */
function touchSigma(st,now,tEnd){
  if(!st) return null;
  if(typeof now!=="number"||typeof tEnd!=="number"||!isFinite(now)||!isFinite(tEnd)) return null;
  const base=(st.rv60!==null&&st.rv60!==undefined)?st.rv60:st.sig;
  const s=seasFactor(now,tEnd);
  if(typeof base!=="number"||!isFinite(base)||s===undefined) return null;
  return base*s;
}

/* assign a key only when it carries a real value. Using this rather than a plain assignment matters:
   `f.sm=undefined` CREATES the key, so Object.keys(f) would report a field the row does not have and any
   consumer that enumerates the bundle would see a phantom. A bundle contains only what was measured. */
function schemaSet(f,k,v){ if(v!==undefined) f[k]=v; return f; }

/* copy only the keys that carry a real value onto an existing row. Never writes null, never overwrites
   a key with undefined, never touches a key the bundle does not mention. */
function schemaPut(row,f){
  if(!row||!f) return row;
  const ks=Object.keys(f);
  for(let i=0;i<ks.length;i++){ const k=ks[i]; if(f[k]!==undefined) row[k]=f[k]; }
  return row;
}

/* kParseBook already computes depthYes/depthNo on every poll and nothing in the page reads either one.
   depthYes = contracts resting as YES bids; depthNo = contracts resting as NO bids, which are the same
   book as the YES offers (yesAsk = 100 - bestNoBid). Getting that round the wrong way inverts H2. */
function bookDepth(ob){
  const f={};
  if(!ob) return f;
  schemaSet(f,"dy",schemaNum(ob.depthYes,0));
  schemaSet(f,"dn",schemaNum(ob.depthNo,0));
  return f;
}
/* which stored depth backs THIS side's ask: a YES ask is made of resting NO bids, and vice versa. */
function depthAtAsk(side,dy,dn){
  const y=schemaNum(dy,0), n=schemaNum(dn,0);
  if(side==="YES") return n===undefined?null:n;
  if(side==="NO") return y===undefined?null:y;
  return null;
}

/* Write si and its tick sensitivity TOGETHER, from ONE inversion. The sensitivity has to describe the same
   reading that got stored, so si is taken from the tick probe's own solution rather than from a second call.
   No si -> no sq and no sqS: the reading does not exist at all, which is the pre-existing unattainable-quote
   missingness (SPEC 7.2), diagnosable from xs and counted at container level as vrpX="nosi".
   Guarded by typeof, per the unit's convention: a partial splice costs a field, not the page. With the tick
   decider missing but impliedSigma present, si is still written and carries NO sq -- siJudge then falls back
   to the quote-free prior, exactly as it does for a row written before this change. */
function siTickWrite(f,strike,S0,tau,q){
  if(typeof impliedSigmaTick==="function"){
    const t=impliedSigmaTick(strike,S0,tau,q);
    const si=t?sigBp(t.sig):undefined;
    if(si===undefined) return f;                 /* no root at the quote itself: nothing truthful to store */
    schemaSet(f,"si",si);
    /* a stored 0 here means "measured, below 0.0005 of itself", not "absent" - the pair (sq,sqS) says which. */
    schemaSet(f,"sq",schemaNum(t.rel,4));
    /* the bound in force AT THE WRITE, so siJudge (which runs at export) cannot re-judge this row under a
       later registration -- SPEC 7.6 and CLAUDE.md 11.8 both promise exactly that. */
    if(typeof VRP_TICK_REL_MAX==="number"&&isFinite(VRP_TICK_REL_MAX)) schemaSet(f,"sb",VRP_TICK_REL_MAX);
    if(t.sided!=="two") schemaSet(f,"sqS",t.sided==="up"?"u":(t.sided==="down"?"d":"n"));
    return f;
  }
  if(typeof impliedSigma==="function") schemaSet(f,"si",sigBp(impliedSigma(strike,S0,tau,q)));
  return f;
}

/* --- edge snapshot ------------------------------------------------------------------------------- */
/* P is strikeProbs' return, which must carry the additive S0 key (SPEC 3.1); quote is the {q,spread}
   object it was handed; ob is the fresh order book, or null for the hourly ladder rungs, which
   edgeSnapOne is called with ob=null and which therefore carry no depth at all. */
function edgeSnapFields(P,quote,strike,ob){
  const f={};
  if(!P) return schemaPut(f,bookDepth(ob));
  schemaSet(f,"sm",sigBp(P.sigU));
  const S0=(typeof P.S0==="number"&&isFinite(P.S0))?P.S0:null;
  const tau=(typeof P.tau==="number"&&isFinite(P.tau))?P.tau:null;
  const q=(quote&&typeof quote.q==="number"&&isFinite(quote.q))?quote.q:null;
  if(S0!==null&&S0>0&&tau!==null&&tau>0&&typeof strike==="number"&&isFinite(strike)&&strike>0){
    const x=Math.log(strike/S0);
    if(typeof P.sigU==="number"&&isFinite(P.sigU)&&P.sigU>0){
      const sd=P.sigU*Math.sqrt(tau);
      if(sd>0) schemaSet(f,"xs",schemaNum(x/sd,3));
    }
    /* si is written ONLY when sm and xs are written too. An implied sigma with nothing beside it cannot be
       judged - the reading that matters is not the level but the level relative to the model's own sigma and
       to where the strike sits (SPEC 7.6). A bare si would be a number no analyst could tell from noise, so
       the whole reading is omitted rather than shipped unjudgeable. si now travels with `sq` as well, the
       TRUE one-tick sensitivity measured at this quote - the quote is gone by settlement time, so this is the
       only moment the gate's own quantity can be measured (see THE STORED IDENTIFIABILITY GATE). */
    if(q!==null&&f.sm!==undefined&&f.xs!==undefined) siTickWrite(f,strike,S0,tau,q);
  }
  return schemaPut(f,bookDepth(ob));
}

/* --- swing read ---------------------------------------------------------------------------------- */
/* st = computeStats(); side = "YES"|"NO"; ob = S.k.ob, which swingTick already requires to be non-null;
   S0 = the settlement index price (S.idxPx, the same one touchProb used). si is inverted from the
   WINDOW's yes-mid, not from the cheap side's ask: a one-sided ask embeds the spread and is not a
   probability, so inverting it would report the spread as volatility. */
function swingReadFields(st,side,ob,S0,strike,now,tEnd){
  const f={};
  const sig=touchSigma(st,now,tEnd);
  schemaSet(f,"sm",sigBp(sig));
  const bidC=ob?(side==="YES"?ob.yesBid:ob.noBid):null;
  if(typeof bidC==="number"&&isFinite(bidC)) schemaSet(f,"bid",schemaNum(bidC/100,3));
  const yb=ob?ob.yesBid:null, ya=ob?ob.yesAsk:null;
  const tau=(typeof tEnd==="number"&&typeof now==="number")?(tEnd-now)/60000:null;
  if(typeof yb==="number"&&isFinite(yb)&&typeof ya==="number"&&isFinite(ya)&&ya>0&&ya<100
     &&tau!==null&&tau>0&&typeof S0==="number"&&isFinite(S0)&&S0>0
     &&typeof strike==="number"&&isFinite(strike)&&strike>0){
    const x=Math.log(strike/S0), q=((yb+ya)/2)/100;
    if(typeof sig==="number"&&isFinite(sig)&&sig>0){
      const sd=sig*Math.sqrt(tau);
      if(sd>0) schemaSet(f,"xs",schemaNum(x/sd,3));
    }
    /* same rule as the edge snap: no si without sm and xs beside it, and none without its tick sensitivity
       when the decider is spliced (SPEC 7.6). The tick is taken on the MID, which is the quantity inverted:
       one cent on the mid is the whole book moving a tick, i.e. the larger of the two readings a single-side
       tick could produce, so it is the conservative probe and cannot loosen the gate. */
    if(f.sm!==undefined&&f.xs!==undefined) siTickWrite(f,strike,S0,tau,q);
  }
  return schemaPut(f,bookDepth(ob));
}

/* --- journal trade ------------------------------------------------------------------------------- */
/* A journal row outlives the swing read it came from (3000 rows kept vs 400 window-sides), so the
   entry-time state has to be copied, not joined. r is that read (e.reads[t.readIdx]); t is the open
   position, whose entryBid was threaded in for the S1 fix but never reached the journal row. */
function journalEntryFields(r,t){
  const f={sv:SCHEMA_VERSION};
  if(r){
    schemaSet(f,"sm",schemaNum(r.sm,2)); schemaSet(f,"si",schemaNum(r.si,2)); schemaSet(f,"xs",schemaNum(r.xs,3));
    /* the tick sensitivity travels with si onto the journal row for the same reason si does: a journal row
       outlives its read, and without sq the row could only ever be re-judged by the weaker quote-free prior. */
    schemaSet(f,"sq",schemaNum(r.sq,4));
    schemaSet(f,"sb",schemaNum(r.sb,4));
    if(r.sqS==="u"||r.sqS==="d"||r.sqS==="n") schemaSet(f,"sqS",r.sqS);
    schemaSet(f,"dy",schemaNum(r.dy,0)); schemaSet(f,"dn",schemaNum(r.dn,0));
  }
  if(t&&typeof t.entryBid==="number"&&isFinite(t.entryBid)) schemaSet(f,"bidIn",schemaNum(t.entryBid,3));
  return f;
}

/* --- is this implied sigma worth anything? (SPEC 7.6) --------------------------------------------- */
/* CAN THIS ROW'S IMPLIED SIGMA BE BELIEVED? Single definition, used by the vrp gate below and by the CSV
   exporter, so a panel and an export can never disagree about which readings count.

   Why a gate exists at all. Implied volatility is NOT identifiable from an at-the-money binary, and a
   KXBTC15M strike is set AT THE MONEY AT OPEN. With x = log(strike/S0) and u = sig*sqrt(tau), p_over =
   1-normCdf(x/u + u/2); at x = 0 sigma survives only in the second-order u/2 drift term, so the price is
   nearly independent of sigma and the inverse is nearly unbounded. The 15-minute series is therefore BORN
   UNIDENTIFIED and becomes identifiable only later in a window once price has moved off the strike; the
   hourly KXBTCD ladder's off-the-money rungs are identified from the first poll. Priced at its own model-fair
   value a strike 2bp from the money moves 86.4% in implied sigma on one cent of quote, and at 1bp one
   neighbour has no root at all; differencing a number that unstable against realized sigma resolves nothing.
   vrp is OMITTED there and the omission is COUNTED (vrpX), never clamped and never silently dropped.
   (An earlier version of this comment illustrated the point with "1805 bp implied minus 9 bp realized" on a
   40c quote and called it noise. That was wrong: that inversion is WELL conditioned, about 10% per cent. It
   is a well-conditioned inversion of a misspecified model and is caught by test 2 below, not test 1.)

   Two independent tests, in order, because they catch different failures:
     1. IDENTIFIABILITY, and it is EXOGENOUS: sigmaIdentifiability(x, sigModel, tau), which takes no quote at
        all and probes at the MODEL-FAIR one, against volspace's pre-registered VRP_TICK_REL_MAX. The row's
        own stored `sq`/`sqS` DO NOT participate; see the note above the gate below for why, and the top of
        this unit for the derivation. A ONE-SIDED probe never passes: a neighbour that does not invert means
        one tick moves the reading out of existence, which is evidence against identification, not an absence
        of sensitivity. The bound comes from the ROW (`sb`) when it carries one, so a row is never
        retroactively re-gated by a later registration.
     2. PLAUSIBILITY, si/sm against the pre-registered band. Necessary because identifiability does NOT catch
        the second failure: a strike just below spot quoted under 50c inverts exactly, and survives the tick
        test at both ends, to a sigma ~200x the tape's. That is model misspecification wearing an implied
        volatility's clothes. This test does look at the answer; it is labelled as such, its rejections are
        counted, and the underlying si/sm/xs/tau stay on the row so the exclusion is fully reversible.

   Returns, beyond the verdict:
     `priorRel`/`priorSided` - THE GATE's own probe at the model-fair quote. Exogenous to this row's premium,
        so this is the column an analyst may legitimately re-filter on at another bound.
     `tickRel`/`tickSided`   - this row's OBSERVED-quote conditioning, carried so the noisiness of each
        reading is visible. DIAGNOSTIC ONLY: it is monotone in the quote and the quote determines vrp, so
        filtering on it selects on the outcome. Do not gate on it and do not re-filter on it.
     `bound` - the bound this row was judged under (`sb` if the row carries one, else the one in force).
     `gate`  - "prior", or "prior+tick" when the row also carries the diagnostic. Both mean the prior ruled.
     `relPerCent` - the superseded local derivative, diagnostic only; it GATES NOTHING.
     `code`  - noref | nosi | nodiag | tick1 | atm | tail | cond | impl.
        `tick1` is a one-sided prior probe. Two values the old gate could emit are now UNREACHABLE and are
        deliberately absent: `tick` (a two-sided move past the bound is labelled atm/tail by band position)
        and `tick0` (volspace's probe returns "two"/"up"/"down"/null and never "n" - "n" is siTickWrite's
        storage alphabet for the ROW's marker, which no longer decides anything). */
function siJudge(ref){
  const out={si:null,sm:null,sir:null,xs:null,tau:null,relPerCent:null,tickRel:null,tickSided:null,
             priorRel:null,priorSided:null,bound:null,gate:null,identified:false,ok:false,code:"noref"};
  if(!ref) return out;
  const fin=v=>typeof v==="number"&&isFinite(v);
  const si=fin(ref.si)?ref.si:null, sm=fin(ref.sm)?ref.sm:null,
        xs=fin(ref.xs)?ref.xs:null, tau=fin(ref.tau)?ref.tau:null;
  out.si=si; out.sm=sm; out.xs=xs; out.tau=tau;
  if(si===null){ out.code="nosi"; return out; }                       /* unattainable quote, or never computed */
  if(sm===null||!(sm>0)||xs===null||tau===null||!(tau>0)){ out.code="nodiag"; return out; }  /* pre-enrichment row */
  out.sir=+(si/sm).toFixed(3);
  const sig=sm/SCHEMA_BP, x=xs*sig*Math.sqrt(tau);                    /* exact inverse of how xs was written */
  /* the local derivative is still reported wherever it can be computed, because SPEC 4's si_cond column is
     defined on it and because the two numbers side by side are what make the re-registration auditable. It
     is NOT consulted for the verdict on either path. */
  if(typeof sigmaIdentifiability==="function"){
    const id=sigmaIdentifiability(x,sig,tau);
    if(fin(id.relPerCent)) out.relPerCent=id.relPerCent;
  }
  /* THE GATE IS EXOGENOUS TO THE QUOTE, AND IT HAS TO BE. See THE STORED IDENTIFIABILITY GATE at the top of
     this unit for the full argument; the short form is that `vrp = si - sr`, and at a fixed strike and horizon
     `si` is a monotone function of the quote, so ANY criterion that reads this row's own quote is a criterion
     on this row's own premium. Measured at x = +5bp, tau = 15, sr = 9 bp/min, a gate on the observed-quote
     tick keeps every reading from q=5c to q=43c (vrp -8.2bp to -1.6bp, all negative) and drops q>=45c (vrp
     +1.4bp, +9.0bp) -- it discards positive premia and keeps negative ones, and would hand H5 a guaranteed
     sign. sigmaIdentifiability takes (x, sigModel, tau) and no quote at all, so its verdict cannot move with
     the answer: at that same strike and horizon it drops the whole sweep together, which is what a filter is
     supposed to do.
     The instrument is the same one-cent finite tick either way -- the fix is WHERE it is evaluated, not what
     it measures. sigmaIdentifiability probes at the MODEL-FAIR quote, so it reproduces the registered band
     exactly (86.4% at 2bp, 21.8% at 5, 12.7% at 8, 4.2% at 35, 6.7% at 60) while depending on nothing the
     market did. */
  out.gate="prior";
  if(typeof sigmaIdentifiability!=="function"){ out.code="nodiag"; return out; }   /* refuse, never fall back to the quote */
  const id=sigmaIdentifiability(x,sig,tau);
  /* The bound is taken from the ROW when the row carries one, so a row judged under an earlier registration
     keeps that judgment: SPEC 7.6 and CLAUDE.md 11.8 both promise rows are not retroactively re-gated, and
     siJudge runs at EXPORT time, so reading the live constant here would silently re-judge every historical
     row under whatever bound is current. `sb` is written beside `sq` at the write site. */
  out.bound=fin(ref.sb)?ref.sb:(fin(id.bound)?id.bound:null);
  out.priorRel=fin(id.tickRel)?id.tickRel:null;
  out.priorSided=id.tickSided||null;              /* was dropped here, so a one-sided prior exported unmarked */
  out.identified=(out.bound===null)?!!id.identified
    :(id.tickSided==="two"&&fin(id.tickRel)&&id.tickRel<=out.bound);
  /* The row's OWN quote-time sensitivity is kept as a DIAGNOSTIC and never consulted above. It is the honest
     description of how well conditioned this particular inversion was, which is worth having on the record and
     is worth nothing as a filter. */
  const hasSq=fin(ref.sq), hasSqS=(typeof ref.sqS==="string"&&ref.sqS!=="");
  if(hasSq||hasSqS){ out.tickRel=hasSq?ref.sq:null; out.tickSided=hasSqS?ref.sqS:"2"; out.gate="prior+tick"; }
  if(!out.identified){
    out.code=(out.priorRel===null&&out.relPerCent===null)?"cond"
      :(id.tickSided&&id.tickSided!=="two")?(id.tickSided==="n"?"tick0":"tick1")
      :(Math.abs(xs)<1?"atm":"tail");
    return out;
  }
  if(!(out.sir>=SCHEMA_SIR_MIN&&out.sir<=SCHEMA_SIR_MAX)){ out.code="impl"; return out; }   /* identified stays true: it WAS identified, it is just not physical */
  out.ok=true; out.code="ok";
  return out;
}

/* --- deferred settlement volatility -------------------------------------------------------------- */
/* Realized sigma over a closed window is UNRECOVERABLE later: S.bars keeps 360 minutes and then drops the
   bars this needs. It has to be computed after the close and stored, or it is lost for good.
   ref is the REFERENCE ROW - refSnap(w) for an edge window, the mid-life clean read for a swing entry - not a
   bare implied sigma. It has to be the row: the gate above needs si, sm, xs and tau together, and vrpT is
   stamped here from ref.t rather than by the caller so a provenance stamp can never outlive the value it
   points at (a bare-number signature made both of those the caller's problem to get right).
   Returns {} - nothing to write, retry next tick - when the bars cannot yet cover the window. */
function volCloseFields(ref,keys,closes,t0,t1,minN){
  const f={};
  if(typeof realizedSigmaInfo!=="function") return f;
  const info=realizedSigmaInfo(keys,closes,t0,t1,minN);
  if(!info||info.sig===null||typeof info.sig!=="number"||!isFinite(info.sig)) return f;
  const sr=sigBp(info.sig);
  if(sr===undefined) return f;          /* sub-resolution realized sigma: nothing truthful to write (F2) */
  schemaSet(f,"sr",sr);
  schemaSet(f,"srN",schemaNum(info.n,0));
  const j=siJudge(ref);
  if(j.ok){
    schemaSet(f,"vrp",schemaNum(j.si-sr,2));
    /* the provenance stamp is written HERE and only when vrp was: a vrpT pointing at a read that produced no
       value is a stamp on nothing. */
    if(f.vrp!==undefined&&typeof ref.t==="number"&&isFinite(ref.t)) schemaSet(f,"vrpT",schemaNum(ref.t,0));
  }
  /* the omission is a COUNTABLE field, not a silence. Group by vrpX and the selection effect is measurable:
     noref | nosi | nodiag | tick1 | atm | tail | cond | impl.
     ALL of these now come from the exogenous prior - the row's own stored sensitivity contributes to no code.
     atm/tail say where the strike sat when the two-sided probe went past the bound; tick1 says the probe was
     one-sided; cond says no probe existed. (An earlier version of this comment told the analyst that
     tick/tick1/tick0 came from the row's own sensitivity and atm/tail/cond from a fallback, and that a pooled
     dataset could be split on which rule ruled. That distinction no longer exists: one rule gates.) */
  if(f.vrp===undefined) schemaSet(f,"vrpX",j.code);
  return f;
}
/* stop retrying once the bar buffer can no longer cover the window; the caller records srTried then. */
function schemaVolGiveUp(now,close){
  if(typeof now!=="number"||typeof close!=="number"||!isFinite(now)||!isFinite(close)) return false;
  return (now-close)>SCHEMA_VOL_GIVEUP_MS;
}

/* --- offline analysis measures (CSV columns, computed at export; nothing extra is stored) ---------- */
/* H2, restated so that it is not self-contradicting. As written in the spine, H2 gates you into trading
   when the spread is WIDEST - the most expensive moment to cross and the worst moment to rest an order.
   The question that actually has an answer is whether MISPRICING outgrows SPREAD, i.e. whether the edge
   per cent of spread is rising. The numerator must come from a QUOTE-INDEPENDENT estimator: using the
   headline pm would be circular, because the residual fit takes the quote as its baseline and carries
   spread as a regressor with coefficient -5.023, so pm-qm is a mechanical function of spread and any
   relationship found would be an artifact of the fit. pa (analytic) is the quote-free estimator that is
   already stored on every snap. */
function misRatio(pQuoteFree,qMidCents,spreadC){
  const p=(typeof pQuoteFree==="number"&&isFinite(pQuoteFree))?pQuoteFree:null;
  const q=(typeof qMidCents==="number"&&isFinite(qMidCents))?qMidCents:null;
  const s=(typeof spreadC==="number"&&isFinite(spreadC))?spreadC:null;
  if(p===null||q===null) return {mis:null,ratio:null};
  const mis=+(p*100-q).toFixed(3);
  return {mis,ratio:(s!==null&&s>0)?+(mis/s).toFixed(3):null};
}
/* spread in cents at an edge snap, recovered exactly from the two stored quote fields: qm is written as
   (yesBid+yesAsk)/2 and ya as yesAsk from the SAME pair on the same line, so yesBid = 2*qm - ya and the
   spread is 2*(ya-qm). Both are stored at 1dp, so the recovered spread is exact to 0.2c. Nothing is
   stored for this. */
function edgeSpreadC(qm,ya){
  if(typeof qm!=="number"||typeof ya!=="number"||!isFinite(qm)||!isFinite(ya)) return null;
  return +(2*(ya-qm)).toFixed(2);
}
/* swing rows quote in DOLLARS (ask 0.05) while edge rows quote in CENTS (ya 5). Both spreads are
   reported in cents so the two datasets can be compared without a unit trap. */
function swingSpreadC(ask,bid){
  if(typeof ask!=="number"||typeof bid!=="number"||!isFinite(ask)||!isFinite(bid)) return null;
  return +(100*(ask-bid)).toFixed(2);
}

/* ================================================================================================
   H3 / H4 measurement layer -- per-fill maker rows, and the flow asymmetry on a graded row.
   ADDED 2026-09-06. Everything below is RECORDING. Nothing below decides, highlights, sizes, enters
   or reports. Two things in particular are NOT here and must not be added to it:

     1. NO NARRATIVE-VS-SCHEDULED CLASSIFIER, and no statistic that compares the two classes.
        A narrative shock has no calendar entry by definition, so classifying one is PHASE 2
        (endogenously detected). CLAUDE.md 11.5 is categorical: phase 2 does not report at all until
        its detector has been scored against the phase-1 calendar as a confusion matrix, phases are
        never pooled, and prereg's shockStatus() already returns INVALID for a phase-2 caller with no
        matrix. H3 (informed vs narrative maker P&L) and H4 (fade the narrative longshot) are BOTH
        gated on that matrix.
     2. NO ONE-SIDEDNESS THRESHOLD for H4. The spine writes "[threshold TBD]" because nobody has the
        data to set it. Choosing one here would be exactly the tuning CLAUDE.md 4 and 11.7 clause 6
        forbid. What is stored instead is the RAW flow asymmetry on every row, so the DISTRIBUTION
        exists and a threshold can be pre-registered later from calibration data. VIA_FLOW_BUCKET
        below is NOT that threshold -- see its comment.

   WHAT IS NOT GATED IS RECORDING, and that is the whole reason this ships before the gate lifts: a
   maker fill that was not recorded cannot be recovered later. The gate governs REPORTING. Stored
   rows are not permission to report; SPEC section 10 says this again where an analyst will read it.

   THE BLOCKER THIS EXISTS TO REMOVE. viaSample accumulates RUNNING SUMS per series -- posts, fills,
   spread, adv, fee -- with no per-fill row and no timestamp. A running total cannot be conditioned
   on anything after the fact, so maker P&L cannot be split by release type, by hour, or by anything
   else, and H3 is unanswerable no matter how long the tool runs. CLAUDE.md 10.4b already records
   what that shape costs: when the K1 repair had to remove poisoned fills it could not subtract them
   from a total and had to DISCARD the entire live viability series. Rows are subtractable; totals
   are not.

   THE RELEASE TAG IS NOT STORED, deliberately, exactly as sections 2.5/2.6 above do it: the row
   carries its own timestamp and the event tag is derived at export from the calendar as it stands
   at export time. A stored tag would freeze a classification the calendar can still correct, and
   the calendar is ~5% full (CLAUDE.md 8). The timestamp is what makes the split possible; the tag
   is derived from it and costs the recorder no bytes. */

/* --- flow asymmetry (H4), one bundle, two write sites ---------------------------------------- */
/* THE INSTRUMENT ALREADY MEASURES THIS. computeSignals() produces ofi60 = {x, vol, n} -- signed
   order-flow imbalance over 60 s, behind a thin-sample guard (>=6 prints and >=0.25 BTC, else null)
   -- and ofi300 over 5 minutes. swingTick already stores ofi60.x on every swing read as `ofi`, and
   viaSample already stashes it on a pending post. NOTHING HERE COMPUTES A SECOND FLOW MEASURE; this
   copies the one that exists onto rows that can be scored against a settlement.

   WHY THE EDGE SNAP IS H4's HOME. H4 asks whether the side flow favours then wins BELOW its price.
   That needs (a) a flow reading, (b) that side's price, (c) a settled binary outcome, and (d) one
   observation per window. The edge ledger is the only dataset with all four: w.result is the
   settlement, s.ya/s.na/s.qm are the two sides' prices at the read, and refSnap already fixes the
   one scored read per window (CLAUDE.md 4). A swing read has flow and price but its "outcome" is a
   35c touch, not a settlement, so it cannot answer H4; its existing `ofi` field is left untouched.

   WHAT IS STORED AND WHAT IS DERIVED. Only the flow reading is stored. Which side it favours, that
   side's ask and mid, and whether that side won are EXACT functions of fields the row already
   carries (design rule 2), so they are computed at export and cost zero bytes. That also means a
   later correction to how the favoured side is defined re-derives over all history instead of
   freezing a mistake into storage.

   THE OMISSION CODE. `of` is missing NOT AT RANDOM: the thin-sample guard fires exactly when the
   tape is quiet, and a quiet tape is the opposite of the conditions H4 is about, so a silent
   absence would be a selection nobody could measure. ofX makes it countable, in the same spirit as
   vrpX:
     "n" - the caller supplied no argument at all: the write site is NOT WIRED. Never confuse this
           with a measurement; it is a splice/wiring defect and should appear on zero rows.
     "s" - no signals object (computeSignals returned null, or the first tick has not run).
     "t" - signals exist but ofi60 is null: THE THIN-SAMPLE GUARD FIRED. This is a real measurement
           of "not enough side-bearing prints to speak", not an error.
     "x" - ofi60 exists but its x is not a finite number. Should not happen; counted rather than
           silently dropped so that it cannot happen quietly.
   `of5` has no code of its own: `of` present with `of5` absent says the 5-minute window was thin,
   which is already the whole message. */
function flowFields(G){
  const f={};
  if(G===undefined){ f.ofX="n"; return f; }
  if(G===null||typeof G!=="object"){ f.ofX="s"; return f; }
  const o=G.ofi60;
  if(!o||typeof o!=="object"){ f.ofX="t"; return f; }
  const x=schemaNum(o.x,2);
  if(x===undefined){ f.ofX="x"; return f; }
  schemaSet(f,"of",x);                       /* signed imbalance in [-1,1]; an exact 0 IS a reading */
  schemaSet(f,"ofv",schemaNum(o.vol,2));     /* BTC behind it: +1.0 on 0.3 BTC is not +1.0 on 40 BTC */
  schemaSet(f,"ofn",schemaNum(o.n,0));       /* prints behind it, same reason */
  const o3=G.ofi300;
  if(o3&&typeof o3==="object") schemaSet(f,"of5",schemaNum(o3.x,2));
  return f;
}
/* which side the flow favours. Positive imbalance is net buying of BTC, which pushes the underlying
   UP, which is the YES/above-strike side of a Kalshi BTC window (strikeProbs' `over` is P(above) and
   qm is the YES mid). Exactly zero favours NEITHER side and returns null rather than breaking the
   tie -- a tie broken by convention would put a fabricated side into the H4 sample. */
function flowSide(x){
  if(typeof x!=="number"||!isFinite(x)||x===0) return null;
  return x>0?"YES":"NO";
}
/* that side's ask, in cents, from the two asks the edge snap already stores. */
function flowSideAsk(side,ya,na){
  const y=schemaNum(ya,2), n=schemaNum(na,2);
  if(side==="YES") return y===undefined?null:y;
  if(side==="NO") return n===undefined?null:n;
  return null;
}
/* that side's MID, in cents, from the stored YES mid. The mid is the right price for a
   "wins below its price" test; the ask carries half the spread and would understate the win rate
   needed to break even. Both are exported so the test can be run either way and the difference
   between them is visible rather than assumed. */
function flowSideMidC(side,qm){
  const q=schemaNum(qm,2);
  if(q===undefined) return null;
  if(side==="YES") return q;
  if(side==="NO") return +(100-q).toFixed(2);
  return null;
}
/* did the favoured side win. Grades on the settlement literal, and ONLY on "yes"/"no": a `void`
   settlement is not a loss for either side and must not be scored as one (CLAUDE.md 10.4). */
function flowSideWon(side,result){
  if(side!=="YES"&&side!=="NO") return null;
  if(result!=="yes"&&result!=="no") return null;
  return ((side==="YES")===(result==="yes"))?1:0;
}
/* the 60 s reading against the 5 m reading, both already computed by the instrument. This is the
   raw material for "did flow SPIKE toward one side", and it is DELIBERATELY NOT A VERDICT: no
   threshold is applied to it here or anywhere, because the spine writes "[threshold TBD]" and the
   data to set one does not exist yet. Record the distribution; pre-register the cut later. */
function flowBurst(x60,x300){
  if(typeof x60!=="number"||!isFinite(x60)) return null;
  if(typeof x300!=="number"||!isFinite(x300)) return null;
  return +(x60-x300).toFixed(3);
}

/* --- maker fills (H3): the per-fill row viaSample never wrote ---------------------------------- */
/* TRANSCRIBED, NOT CHOSEN. 0.15 is the bucket boundary already shipped inside viaSample
   (`p.ofi>0.15?"with":p.ofi<-0.15?"against":"none"`), named here so the panel and the CSV cannot
   drift apart. IT IS NOT AN H4 THRESHOLD and must never be used as one: it is a display bucket for
   the existing viability table, it predates this layer, and H4's one-sidedness cut is [TBD] and
   stays [TBD]. Any analysis of the H3/H4 rows uses the raw `of`, not this bucket. */
const VIA_FLOW_BUCKET=0.15;
/* Storage bound, not a decision rule. viaSample grades at most one post per market per minute and
   tracks two markets, so ~2,880 graded posts a day; 6,000 rows is ~2.1 days of buffer at roughly
   95 bytes a row (~570 KB). SPEC section 8 already shows btc.edge alone exceeding a 5 MB origin
   quota, so this is not free -- and CLAUDE.md 10.2 already says the CSV is the record and
   localStorage only the buffer. EXPORT ON A SCHEDULE OR THE ROWS ARE GONE. */
const VIA_ROW_CAP=6000;

/* the shipped bucket, as a function. NOTE THE ONE DELIBERATE DIFFERENCE FROM THE SHIPPED LINE: an
   UNMEASURED imbalance returns null here, where viaSample's counters call it "none". Conflating
   "balanced" with "no reading" is a pre-existing flaw in the live counters and is left exactly as
   it is (changing it would silently move a shipped panel's numbers); the CSV uses this function so
   the unmeasured case is visible in the rows even though it is invisible in the panel. */
function viaFlowBucket(x){
  if(typeof x!=="number"||!isFinite(x)) return null;
  return x>VIA_FLOW_BUCKET?"with":(x<-VIA_FLOW_BUCKET?"against":"none");
}
/* the four economics primitives. ONE definition each, read by the live counters (through
   viaFillEcon) and by the CSV exporter, so a total and a row can never disagree. All UNROUNDED:
   the live counters accumulate these exact values today and rounding here would silently move a
   shipped number. Rounding is the exporter's job and is stated per column in SPEC section 4.6.
   Cents throughout, matching the order book (kParseBook returns cents). */
function viaMid(rb,ra){
  if(typeof rb!=="number"||typeof ra!=="number"||!isFinite(rb)||!isFinite(ra)) return null;
  return (rb+ra)/2;
}
function viaSpreadC(rb,ra){ return viaMid(rb,ra)===null?null:(ra-rb); }
function viaAdvC(rb,ra,m1){
  const m0=viaMid(rb,ra);
  if(m0===null||typeof m1!=="number"||!isFinite(m1)) return null;
  return m1-m0;
}
/* the maker fee, charged on both legs at the resting mid. `rate` is passed in rather than read off
   a global so nothing here depends on a page constant it cannot see; a missing rate omits the fee
   rather than defaulting one. The expression is the shipped one, character for character. */
function viaFeeC(rb,ra,rate){
  const m0=viaMid(rb,ra);
  if(m0===null||typeof rate!=="number"||!isFinite(rate)||rate<0) return null;
  return 100*rate*(m0/100)*(1-m0/100)*2;
}
/* the whole grade of one resting post, exactly as viaSample computes it today. p is the pending
   post {t,ticker,yb,ya}; c is the current candidate {key,ticker,yb,ya}; rate is MAKER_RATE.
   `filled` is the shipped fill model -- the best bid traded through our resting price -- and is
   reproduced, not improved: this layer records what the instrument already measures. */
function viaFillEcon(p,c,rate){
  if(!p||!c) return null;
  const m0=viaMid(p.yb,p.ya), m1=viaMid(c.yb,c.ya);
  if(m0===null||m1===null) return null;
  const fee=viaFeeC(p.yb,p.ya,rate);
  if(fee===null) return null;
  return {filled:c.yb<p.yb,mid0:m0,mid1:m1,spread:viaSpreadC(p.yb,p.ya),adv:viaAdvC(p.yb,p.ya,m1),fee:fee};
}

/* ONE GRADED POST -> ONE ROW.

   A ROW IS WRITTEN FOR EVERY GRADED POST, FILLED OR NOT, and `f` says which. This is not padding.
   H3's mechanism is Glosten-Milgrom adverse selection, whose whole content is that a maker gets
   filled precisely when the flow knows something -- so the FILL RATE is half the hypothesis. Rows
   for fills alone would give the mean P&L per fill and would silently delete the selection channel,
   which is the thing being tested. The unfilled row is also the natural control: it records how the
   mid moved for a maker who was NOT hit, at the same minute, on the same book.

   WHAT IS STORED IS THE INPUTS, NOT THE ARITHMETIC. rb, ra and m1 are the three measurements; the
   spread captured, the adverse selection and the fee are exact functions of them (and of the fee
   rate) and are derived at export -- design rule 2, and the same choice sections 2.5/2.6 make for
   the event tag and the seasonality control. The one condition attached, stated because it is real:
   the fee re-derives under whatever MAKER_RATE is in force at export. It is a frozen page constant
   today; if it ever changes, historical rows would re-derive under a rate that was not in force
   when they were written, and the mitigation is one line in the export header, not a per-row field.

   THE TIMESTAMP IS THE POST TIME, and that choice is load-bearing. `t` is the instant the order was
   rested -- the decision moment, the moment the release tag has to be derived against. The grade
   happens `dt` seconds later (viaSample grades between 55 s and 125 s after the post), so the grade
   instant is t + dt*1000 and nothing is lost by storing the elapsed seconds instead of a second
   absolute stamp. dt is stored because adverse selection accrues over it and a row whose elapsed
   time is unknown cannot be compared with one whose is.

   `tau` (minutes from the post to the market's close) is written ONLY when the caller supplies the
   close on the candidate. It is not derivable from a Kalshi ticker without a parser this unit does
   not have, and inventing one would be fabrication; its absence therefore means "the write site did
   not supply a close", which is diagnosable from `k` because the 15-minute candidate carries one
   and the hourly one currently does not. */
function viaFillFields(p,c,now,econ,fl){
  const f={};
  if(!p||!c||!econ) return f;
  const t=schemaNum(p.t,0);
  /* no timestamp is not a missing field, it is a row that cannot be conditioned on anything, which
     is the exact defect this layer exists to remove. Refuse to write it rather than write a row
     that would silently join to no release, no hour and no control. */
  if(t===undefined) return f;
  schemaSet(f,"t",t);
  if(typeof now==="number"&&isFinite(now)) schemaSet(f,"dt",schemaNum((now-p.t)/1000,0));
  if(typeof c.key==="string"&&c.key!=="") schemaSet(f,"k",c.key);
  /* the ticker is what lets a row be joined to its window (strike, close, settlement) and, if a K1
     ever happens again, lets poisoned fills be removed one at a time instead of discarding a series
     (CLAUDE.md 10.4b). It is the field whose absence cost the last repair its data. */
  if(typeof p.ticker==="string"&&p.ticker!=="") schemaSet(f,"tk",p.ticker);
  schemaSet(f,"f",econ.filled?1:0);
  schemaSet(f,"rb",schemaNum(p.yb,2));
  schemaSet(f,"ra",schemaNum(p.ya,2));
  schemaSet(f,"m1",schemaNum(econ.mid1,3));
  if(typeof c.close==="number"&&isFinite(c.close)) schemaSet(f,"tau",schemaNum((c.close-p.t)/60000,2));
  /* the flow bundle is captured at POST time, not here: what a maker could see when the order was
     rested is the state that could have informed the decision, and the state at the grade is
     downstream of the fill itself. An absent bundle is a wiring defect and is stamped "n". */
  return schemaPut(f,(fl&&typeof fl==="object")?fl:flowFields(undefined));
}
/* Oldest-first prune by the row's own timestamp. NOT by array position and NOT by any string key:
   defect S2 pruned a ledger by string-sorted key and deleted the newest entries at a month boundary
   because "OCT" < "SEP". Rows without a numeric t sort first and are dropped first, which cannot
   arise because viaFillFields refuses to build one. Returns a new array; the caller assigns it. */
function viaPrune(rows,cap){
  if(!Array.isArray(rows)) return [];
  const n=(typeof cap==="number"&&isFinite(cap)&&cap>=1)?Math.floor(cap):VIA_ROW_CAP;
  if(rows.length<=n) return rows;
  const s=rows.slice();
  s.sort(function(a,b){
    const at=(a&&typeof a.t==="number"&&isFinite(a.t))?a.t:-Infinity;
    const bt=(b&&typeof b.t==="number"&&isFinite(b.t))?b.t:-Infinity;
    return at-bt;
  });
  return s.slice(s.length-n);
}
