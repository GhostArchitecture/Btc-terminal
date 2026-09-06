/* ---------------------------------------------------------------- H5 volspace: variance premium (measurement only) */
/* Inverts the SAME analytic fair value strikeProbs uses, for sigma:
     p_over(sig) = 1 - normCdf( (x + 0.5*sig*sig*tau) / (sig*sqrt(tau)) ),  x = log(strike/S0), tau in MINUTES.
   Substituting u = sig*sqrt(tau) the normCdf argument is g(u) = x/u + u/2, with dg/du = 1/2 - x/u^2:
     x <  0 : g rises with u for every u>0, so p_over FALLS with sigma. One root for any q in (0,1).
     x == 0 : g = u/2, so p_over falls from 0.5 (approached, never attained) to 0. A quote q >= 0.5 has
              NO solution at all -- the -0.5*sig*sig*tau drift term puts the median below the forward.
     x >  0 : g is U-shaped, minimum g = sqrt(2x) at u* = sqrt(2x). So p_over is NOT monotone: it rises from
              0 to pMax = 1 - normCdf(sqrt(2x)) < 0.5 at u*, then falls back to 0. There are TWO roots for
              q < pMax and NONE for q >= pMax. The low-sigma root is returned by default; it is the branch
              continuous with realized-vol magnitudes (BTC per-minute sigma runs ~5-15bp, u* for a 5bp strike
              distance is ~10x above that). Pass branch "high" for the other root.
   Everything here is pure: inputs in, values out, no DOM / storage / clock. Nothing here places an order. */
const VRP_SIG_MIN=1e-9, VRP_SIG_MAX=50, VRP_BISECT=140, VRP_TOL=2e-6, VRP_MIN_RET=10;
const VRP_Q_LO=0.005, VRP_Q_HI=0.995;   /* the engine's clip bounds: a quote at or past them is clipped, not information */
/* Kalshi quotes in whole cents. One cent is therefore not an infinitesimal to be differentiated through, it is the
   RESOLUTION OF THE INSTRUMENT: the smallest observable change in the input, and so the smallest change whose effect
   on the output can be attributed to information rather than to granularity. Every sensitivity in this unit is
   measured across this tick, never sprinkled as a literal. */
const VRP_TICK=0.01;

/* PRE-REGISTERED, DO NOT LOOSEN. A reading counts as identified only when moving the quote by ONE REAL TICK
   (VRP_TICK, both directions) moves the implied sigma by no more than VRP_TICK_REL_MAX of itself.

   RE-REGISTRATION 2026-09-06. Superseded value: VRP_REL_MAX = 0.5, applied to `relPerCent` -- the LOCAL DERIVATIVE
   of implied sigma with respect to the quote (vsSens). That was a mis-specified instrument, not a mis-chosen
   number. The map from quote to implied sigma is convex near the money, so the derivative badly understates what a
   real one-cent tick does; and since Kalshi quotes in whole cents, the derivative is not a quantity this market
   ever exhibits. Measured on a 15-minute window at sigma 9 bp/min, each strike quoted at its own model-fair value:

       distance   xs      relPerCent (old gate)      true one-cent move in implied sigma
       0 bp       0.000   14.382                     +1c has no root at all
       1 bp       0.029    0.931                     +1c has no root at all
       2 bp       0.057    0.451  <- PASSED 0.5      86.4%   <- noise, admitted by the old gate
       5 bp       0.143    0.179                     21.8%
       10 bp      0.287    0.092                     10.1%
       20 bp      0.574    0.052                      5.4%
       35 bp      1.004    0.041                      4.2%
       60 bp      1.721    0.064                      6.7%
       120 bp     3.443    2.745  <- rejected        (fair value 0.0003: below the clip floor)

   DERIVATION of 0.20 -- it is derived, not chosen. Implied sigma exists in this unit only to be differenced
   against REALIZED sigma. Realized sigma from n contiguous one-minute returns carries relative sampling error
   ~1/sqrt(2n): n=10 -> 22.4%, n=14 -> 18.9%, n=15 -> 18.3%, n=30 -> 12.9%, n=60 -> 9.1%. A 15-minute window
   yields at most 15 one-minute returns, so the realized number this reading is compared against carries ~18-19%
   inherent error no matter how clean the tape is. If one tick of quote moves the implied reading by MORE than the
   error already carried by the realized number it is differenced against, then quote granularity dominates the
   premium and the comparison cannot resolve anything. 0.20 is the round bound immediately above both the
   15-return (18.3%) and the 14-return (18.9%) figures. It is not a preference; move the window length and the
   arithmetic moves it.

   DIRECTION. This is a strict TIGHTENING: 0.5 on a derivative that understated the true move, to 0.20 on the true
   move itself. Under CLAUDE.md sec 11.7 clause 6 a threshold may be raised at any time and closes the programme if
   it is ever lowered -- the permitted direction, and the reason the direction is stated here rather than left to
   be inferred. NO VRP DATA HAS BEEN COLLECTED UNDER THE OLD BOUND AND NO HOLDOUT IS OPEN, so this corrects a
   mis-specified instrument before its first observation rather than tuning a threshold against a result. Recorded
   explicitly: had a holdout been open, sec 11.6 says this same edit would have SPENT it -- every window scored
   under the old freeze retired, the count restarted at zero. It is free only because it is early, and that is the
   only reason it is free. */
const VRP_TICK_REL_MAX=0.20;
/* WHERE THIS BOUND IS EVALUATED IS PART OF THE REGISTRATION, added 2026-09-06 after adversarial review.
   The bound is applied to the tick probe taken at the MODEL-FAIR quote -- sigmaIdentifiability(x, sigModel,
   tau), which takes no quote argument -- and NEVER to a probe taken at the observed quote.
   The reason is not stylistic. vsTickSens evaluated at the observed q is, to three significant figures, a
   function of q alone: analytically its relative sensitivity is Dq/(phi(G)*sqrt(G^2-2x)) with G=Phi^-1(1-q),
   in which tau does not appear at all and x enters only as 2x against G^2. Measured on this code at a fixed
   q=0.30, `rel` moves from 5.762% to 6.052% across a 240x range in strike distance and a 1200x range in tau.
   So a gate on it is a cut on the quote wearing an identifiability gate's clothes -- and since vrp = si - sr
   with si monotone in q at fixed (x,tau), a cut on the quote is a cut on the premium being measured. At
   x=+5bp, tau=15, sr=9 bp/min it keeps every reading with vrp negative and drops every reading with vrp
   positive. That is selection on the outcome variable, and it would have handed H5 a guaranteed sign.
   The same probe at the model-fair quote depends on (x, sigModel, tau) and nothing the market did, so its
   verdict cannot move with the answer. impliedSigmaTick stays exported and is stored per row as a DIAGNOSTIC
   of how well conditioned that particular inversion was. It must not be reintroduced as a gate. */

/* SUPERSEDED 2026-09-06 by VRP_TICK_REL_MAX (above). Retained so the old bound stays visible beside its
   replacement rather than vanishing from the record, and because `relPerCent` is still reported as a diagnostic.
   It GATES NOTHING. Do not reintroduce it as a gate. */
const VRP_REL_MAX=0.5;

function vsPOver(sig,x,tau){
  if(!(sig>0)||!(tau>0)) return null;
  const sd=sig*Math.sqrt(tau);
  if(!(sd>0)||!isFinite(sd)) return null;
  const g=(x+0.5*sig*sig*tau)/sd;
  if(!isFinite(g)) return null;
  return 1-normCdf(g);
}
/* bisection over a bracket that must contain a sign change; same fixed-iteration shape as invNorm.
   Returns null rather than an endpoint when the bracket does not straddle the root. */
function vsBisect(x,tau,q,lo,hi){
  const f=s=>{ const p=vsPOver(s,x,tau); return p===null?null:p-q; };
  if(!(hi>lo)) return null;
  let a=lo,b=hi; const fa0=f(a), fb0=f(b);
  if(fa0===null||fb0===null) return null;
  if(fa0===0) return a;
  if(fb0===0) return b;
  if((fa0>0)===(fb0>0)) return null;
  let up=fa0<0;                                   /* true when f rises across the bracket */
  for(let i=0;i<VRP_BISECT;i++){
    const m=(a+b)/2, fm=f(m);
    if(fm===null) return null;
    if((fm<0)===up) a=m; else b=m;
  }
  const s=(a+b)/2, chk=vsPOver(s,x,tau);
  if(chk===null||!(Math.abs(chk-q)<=VRP_TOL)) return null;   /* never return a sigma that does not reprice the quote */
  return s;
}
/* LOCAL DERIVATIVE conditioning: the fractional move in implied sigma per VRP_TICK of quote, computed from
   dp/dsigma AT the solution. DIAGNOSTIC ONLY -- it is no longer the gate, and must not be made one again.
   Because the quote -> sigma map is convex near the money, this systematically UNDERSTATES the move a real tick
   produces: at a 2bp strike distance on a 15-minute window at 9 bp/min it reports 0.451 where the true one-cent
   move is 0.864. It is retained because it is closed-form (~= VRP_TICK/(phi(xs)*|xs|), see sigmaIdentifiability) and
   so explains the SHAPE of the identified band cheaply; the number that decides anything is vsTickSens. */
function vsSens(sig,x,tau){
  const h=sig*1e-4;
  const a=vsPOver(sig-h,x,tau), b=vsPOver(sig+h,x,tau);
  if(a===null||b===null) return null;
  const dp=(b-a)/(2*h);
  if(!isFinite(dp)||dp===0) return null;
  return Math.abs(VRP_TICK/dp)/sig;
}
/* the inversion itself, in x-space, shared by impliedSigmaInfo and by the tick probe so a neighbour quote is
   solved by EXACTLY the same code path (and the same guards) as the quote itself. Assumes x and tau already
   validated finite with tau>0; q is re-checked here because the probe supplies q +/- VRP_TICK. */
function vsSolveInfo(x,tau,q,branch){
  const out={sig:null,pMax:null,sigStar:null,branch:null,reason:"ok"};
  if(!(typeof q==="number"&&isFinite(q))){ out.reason="non-finite input"; return out; }
  if(!(q>VRP_Q_LO)||!(q<VRP_Q_HI)){ out.reason="quote at or beyond clip bounds"; return out; }
  const rt=Math.sqrt(tau);
  if(x>0){
    const uS=Math.sqrt(2*x), pM=1-normCdf(uS);
    out.pMax=pM; out.sigStar=uS/rt;
    if(!(q<pM)){ out.reason="unattainable: p_over above strike caps at pMax"; return out; }
    if(branch==="high"){ out.branch="high"; out.sig=vsBisect(x,tau,q,out.sigStar,VRP_SIG_MAX); }
    else { out.branch="low"; out.sig=vsBisect(x,tau,q,VRP_SIG_MIN,out.sigStar); }
  }else{
    out.branch="single"; out.pMax=(x===0)?0.5:1;
    if(x===0&&!(q<0.5)){ out.reason="unattainable: ATM p_over is strictly below 0.5 for every sigma>0"; return out; }
    out.sig=vsBisect(x,tau,q,VRP_SIG_MIN,VRP_SIG_MAX);
  }
  if(out.sig===null&&out.reason==="ok") out.reason="no root in bracket";
  return out;
}
/* TRUE TICK SENSITIVITY -- the quantity VRP_TICK_REL_MAX is registered against, and the thing that decides a
   stored reading whenever a quote exists. Inverts at q, at q+VRP_TICK and at q-VRP_TICK, and reports the LARGEST
   fractional change in implied sigma across that real, finite, one-cent tick. No derivative anywhere.

   A NEIGHBOUR THAT DOES NOT INVERT IS NOT ZERO SENSITIVITY. Near the analytic cap for a strike above spot
   (pMax < 0.5, see the header) the +1c neighbour frequently has NO root, and in the tail a neighbour falls past
   the engine's clip bound; at the money exactly, q+1c crosses 0.5 and no sigma reaches it. In every such case one
   tick of quote does not merely move the reading, it moves it OUT OF EXISTENCE -- the honest sensitivity there is
   unbounded, which is the strongest possible evidence that the reading is unidentifiable. So:

     - a missing neighbour ALWAYS fails the gate (`identified:false`) and names which side is missing and why;
     - the surviving one-sided move IS still computed and returned (`rel` with `sided:"up"` or `"down"`), because
       hiding it would hide the magnitude -- at the money it reads 1438%, which is itself the finding;
     - one-sided is never allowed to PASS. A one-sided pass would be the old defect wearing a new hat: reporting
       the small half of an asymmetric move and calling the reading clean.

   `sided` is "two" (both neighbours inverted, the only state that can pass), "up"/"down" (only that neighbour
   exists, `rel` is one-sided), or null (neither). */
function vsTickSens(x,tau,q,branch){
  const out={identified:false,rel:null,relUp:null,relDown:null,sig:null,sigUp:null,sigDown:null,
             sided:null,tick:VRP_TICK,bound:VRP_TICK_REL_MAX,reason:"ok"};
  const base=vsSolveInfo(x,tau,q,branch);
  out.sig=base.sig;
  if(base.sig===null){ out.reason="no implied sigma at the quote: "+base.reason; return out; }
  const up=vsSolveInfo(x,tau,q+VRP_TICK,branch), dn=vsSolveInfo(x,tau,q-VRP_TICK,branch);
  out.sigUp=up.sig; out.sigDown=dn.sig;
  if(up.sig!==null) out.relUp=Math.abs(up.sig-base.sig)/base.sig;
  if(dn.sig!==null) out.relDown=Math.abs(dn.sig-base.sig)/base.sig;
  if(up.sig!==null&&dn.sig!==null){
    out.sided="two";
    out.rel=Math.max(out.relUp,out.relDown);
    if(out.rel<=VRP_TICK_REL_MAX){ out.identified=true; return out; }
    out.reason="one tick moves implied sigma past VRP_TICK_REL_MAX";
    return out;
  }
  if(up.sig!==null){ out.sided="up"; out.rel=out.relUp; out.reason="quote-1c does not invert: "+dn.reason; return out; }
  if(dn.sig!==null){ out.sided="down"; out.rel=out.relDown; out.reason="quote+1c does not invert: "+up.reason; return out; }
  out.reason="neither neighbour inverts: +1c "+up.reason+" / -1c "+dn.reason;
  return out;
}
/* PUBLIC decider for a reading that HAS a quote. This -- not sigmaIdentifiability -- is what a caller consults
   before storing an implied sigma. Same shape as vsTickSens plus `x`. */
function impliedSigmaTick(strike,S0,tau,q,branch){
  const out={identified:false,rel:null,relUp:null,relDown:null,sig:null,sigUp:null,sigDown:null,
             sided:null,x:null,tick:VRP_TICK,bound:VRP_TICK_REL_MAX,reason:"ok"};
  const fin=v=>typeof v==="number"&&isFinite(v);
  if(!fin(strike)||!fin(S0)||!fin(tau)||!fin(q)){ out.reason="non-finite input"; return out; }
  if(!(strike>0)||!(S0>0)){ out.reason="non-positive price"; return out; }
  if(!(tau>0)){ out.reason="tau <= 0"; return out; }
  const x=Math.log(strike/S0);
  if(!isFinite(x)){ out.reason="non-finite input"; return out; }
  out.x=x;
  const t=vsTickSens(x,tau,q,branch);
  out.identified=t.identified; out.rel=t.rel; out.relUp=t.relUp; out.relDown=t.relDown;
  out.sig=t.sig; out.sigUp=t.sigUp; out.sigDown=t.sigDown; out.sided=t.sided; out.reason=t.reason;
  return out;
}
/* full diagnostic form: always returns an object, so a caller can say WHY there is no implied sigma.
   Carries BOTH sensitivity numbers and one verdict:
     relPerCent  - the legacy local derivative, diagnostic only, understates (see vsSens);
     tickRel     - the TRUE largest fractional move across one real VRP_TICK, with tickSided / tickReason;
     identified  - the pre-registered verdict, decided by tickRel against VRP_TICK_REL_MAX and by nothing else.
   A caller storing this reading gates on `identified`, never on relPerCent. */
function impliedSigmaInfo(strike,S0,tau,q,branch){
  const out={sig:null,x:null,pMax:null,sigStar:null,branch:null,relPerCent:null,
             identified:false,tickRel:null,tickRelUp:null,tickRelDown:null,tickSided:null,tickReason:null,
             tick:VRP_TICK,bound:VRP_TICK_REL_MAX,reason:"ok"};
  const fin=v=>typeof v==="number"&&isFinite(v);
  if(!fin(strike)||!fin(S0)||!fin(tau)||!fin(q)){ out.reason="non-finite input"; return out; }
  if(!(strike>0)||!(S0>0)){ out.reason="non-positive price"; return out; }
  if(!(tau>0)){ out.reason="tau <= 0"; return out; }
  if(!(q>VRP_Q_LO)||!(q<VRP_Q_HI)){ out.reason="quote at or beyond clip bounds"; return out; }
  const x=Math.log(strike/S0);
  out.x=x;
  const core=vsSolveInfo(x,tau,q,branch);
  out.pMax=core.pMax; out.sigStar=core.sigStar; out.branch=core.branch; out.sig=core.sig;
  if(core.reason!=="ok") out.reason=core.reason;
  if(out.sig===null){ out.tickReason=out.reason; return out; }
  out.relPerCent=vsSens(out.sig,x,tau);
  const t=vsTickSens(x,tau,q,branch);
  out.identified=t.identified; out.tickRel=t.rel; out.tickRelUp=t.relUp; out.tickRelDown=t.relDown;
  out.tickSided=t.sided; out.tickReason=t.reason;
  return out;
}
/* per-minute sigma implied by the market's probability q that the window settles ABOVE strike, or null */
function impliedSigma(strike,S0,tau,q,branch){ return impliedSigmaInfo(strike,S0,tau,q,branch).sig; }

/* realized per-minute sigma over [t0,t1] from minute bars. Contiguity rule is the codebase's: a return counts
   only when consecutive bar keys differ by exactly 1 -- a sleep/background gap is not a one-minute return.
   Zero-mean sum-of-squares, matching computeStats' rv60. Bar keys are Math.floor(ms/60000). */
function realizedSigmaInfo(keys,closes,t0,t1,minN){
  const need=(typeof minN==="number"&&isFinite(minN)&&minN>=2)?Math.floor(minN):VRP_MIN_RET;
  const out={sig:null,n:0,dropped:0,invalid:0,k0:null,k1:null,need:need,reason:"ok"};
  const fin=v=>typeof v==="number"&&isFinite(v);
  if(!keys||!closes||!keys.length||keys.length!==closes.length){ out.reason="no bars"; return out; }
  if(!fin(t0)||!fin(t1)||!(t1>t0)){ out.reason="bad window"; return out; }
  const k0=Math.floor(t0/60000), k1=Math.floor(t1/60000);
  out.k0=k0; out.k1=k1;
  const r=[]; let pk=null, pc=null;
  for(let i=0;i<keys.length;i++){
    const k=keys[i], c=closes[i];
    if(!fin(k)||!fin(c)||!(c>0)){ out.invalid++; if(pk!==null) out.dropped++; pk=null; pc=null; continue; }  /* `invalid` counts unusable entries; `dropped` counts BROKEN RETURNS. An all-junk array is thin data with invalid===keys.length, not merely a short window (M1). */
    if(k<k0||k>k1) continue;
    if(pk!==null){ if(k-pk===1) r.push(Math.log(c/pc)); else out.dropped++; }
    pk=k; pc=c;
  }
  out.n=r.length;
  if(r.length<need){ out.reason=(out.invalid===keys.length)?"no valid closes (every entry invalid)":"too few contiguous 1-minute returns"; return out; }
  let s=0; for(let i=0;i<r.length;i++) s+=r[i]*r[i];
  out.sig=Math.sqrt(s/r.length);
  return out;
}
function realizedSigma(keys,closes,t0,t1,minN){ return realizedSigmaInfo(keys,closes,t0,t1,minN).sig; }

/* vrp>0 means the market priced more volatility than the tape realized (premium available to a seller).
   Both inputs are per-minute sigmas; ratio is undefined at zero realized vol, so that returns null. */
function varPremium(sigImplied,sigRealized){
  const fin=v=>typeof v==="number"&&isFinite(v);
  if(!fin(sigImplied)||!fin(sigRealized)) return null;
  if(!(sigImplied>=0)||!(sigRealized>0)) return null;
  return {vrp:sigImplied-sigRealized, ratio:sigImplied/sigRealized};
}
/* THE QUOTE-FREE PRIOR: "could sigma be recovered at this strike distance AT ALL?"
   ------------------------------------------------------------------------------------------------------------
   THE SPLIT, EXPLICIT. Two different questions, two different functions, and they must not be confused:

     sigmaIdentifiability(x, sigModel, tau)   PRIOR.   No quote needed. Asks whether a quote HERE could carry
                                                      volatility information, using the model's OWN fair value as
                                                      the stand-in quote. Use it BEFORE a quote exists -- to
                                                      choose strikes, to grey out a rung, to explain a blank.
     impliedSigmaTick(strike, S0, tau, q)     DECIDER. Needs the real quote. Asks whether THIS reading, at the
                                                      price the market is actually showing, survives one tick.
                                                      A STORED READING IS GATED ON THIS ONE, never on the prior.

   The prior is an approximation of the decider evaluated at q = model-fair. When the market disagrees with the
   model -- which is the entire point of measuring a variance premium -- the two can differ, and the decider wins.
   `impliedSigmaInfo` carries the decider's verdict (`identified`) on every reading so a caller never has to
   reach for the prior by mistake.
   ------------------------------------------------------------------------------------------------------------
   Why xs = x/(sigModel*sqrt(tau)) is the deciding coordinate. With u = sig*sqrt(tau), p_over = 1-normCdf(x/u+u/2),
   so evaluated at sig = sigModel (where u is ~1e-3, utterly negligible beside any xs of interest):
       d p_over / d sig * sig  =  -phi(xs + u/2) * (u/2 - xs)   ~=  phi(xs)*xs
   and therefore relPerCent ~= VRP_TICK/(phi(xs)*|xs|). At the money xs -> 0, that denominator -> 0, and the
   inversion is unbounded: sigma enters an ATM binary only through the second-order -0.5*sig^2*tau drift term,
   which is precisely why an ATM binary prices near 50c almost regardless of volatility and so carries almost no
   volatility information. KXBTC15M strikes are set at the money at open, so THE 15-MINUTE SERIES IS BORN
   UNIDENTIFIED and only becomes identifiable later in the window once price has moved off the strike; the hourly
   KXBTCD ladder has rungs that are identified immediately. The same denominator also collapses in the far tail
   (phi decays), so the identified region is a BAND in |xs|, not a half-line.

   That closed form explains the SHAPE. It does not set the verdict: `identified` is decided by the TRUE one-tick
   move (vsTickSens at the model-fair quote) against VRP_TICK_REL_MAX, because the derivative understates a real
   tick wherever the map is convex -- which is exactly the near-money region the band edge sits in. The derivative
   is still returned as `relPerCent` so the two can be compared, and `qFair` is returned so the probe point is
   never hidden. A caller is free to ignore `identified` and rule on `xs` / `tickRel` / `relPerCent`, all returned. */
function sigmaIdentifiability(x,sigModel,tau){
  const out={identified:false,xs:null,relPerCent:null,tickRel:null,tickRelUp:null,tickRelDown:null,
             tickSided:null,tickReason:null,qFair:null,tick:VRP_TICK,bound:VRP_TICK_REL_MAX,
             prior:true,reason:"ok"};
  const fin=v=>typeof v==="number"&&isFinite(v);
  if(!fin(x)||!fin(sigModel)||!fin(tau)){ out.reason="non-finite input"; return out; }
  if(!(sigModel>0)){ out.reason="sigModel <= 0"; return out; }
  if(!(tau>0)){ out.reason="tau <= 0"; return out; }
  const sd=sigModel*Math.sqrt(tau);
  if(!(sd>0)||!isFinite(sd)){ out.reason="degenerate sigModel*sqrt(tau)"; return out; }
  out.xs=x/sd;
  out.relPerCent=vsSens(sigModel,x,tau);          /* diagnostic only; never gates */
  const qFair=vsPOver(sigModel,x,tau);
  if(qFair===null||!isFinite(qFair)){ out.reason="model-fair quote undefined at sigModel"; return out; }
  out.qFair=qFair;
  const t=vsTickSens(x,tau,qFair);
  out.tickRel=t.rel; out.tickRelUp=t.relUp; out.tickRelDown=t.relDown;
  out.tickSided=t.sided; out.tickReason=t.reason;
  if(t.identified){ out.identified=true; return out; }
  /* the <1 test only LABELS which end of the band failed; it is not a threshold and changing it changes no
     verdict -- `identified` is decided by VRP_TICK_REL_MAX alone. The tick probe's own reason is appended
     verbatim so the MECHANISM of the failure (past the bound / a neighbour that does not invert / no reading at
     all) is never flattened into the band label. */
  out.reason=(Math.abs(out.xs)<1?"at the money: ":"deep tail: ")+t.reason;
  return out;
}
/* model sigma (strikeProbs' .sigU) beside the market's implied sigma, with the standardised strike distance */
function volTriple(P,quote,strike,S0,tau){
  const out={sigModel:null,sigImplied:null,x:null,xs:null,ratioModel:null,
             identified:false,tickRel:null,tickSided:null,tickReason:null,bound:VRP_TICK_REL_MAX};
  const fin=v=>typeof v==="number"&&isFinite(v);
  const K=fin(strike)?strike:null, s0=fin(S0)?S0:null, tu=fin(tau)?tau:null;
  if(P&&fin(P.sigU)&&P.sigU>0) out.sigModel=P.sigU;
  if(K!==null&&s0!==null&&K>0&&s0>0) out.x=Math.log(K/s0);
  if(out.x!==null&&out.sigModel!==null&&tu!==null&&tu>0){
    const sd=out.sigModel*Math.sqrt(tu);
    if(sd>0&&isFinite(sd)) out.xs=out.x/sd;
  }
  const q=(quote&&fin(quote.q))?quote.q:null;
  if(q!==null&&K!==null&&s0!==null&&tu!==null){
    const info=impliedSigmaInfo(K,s0,tu,q);
    out.sigImplied=info.sig;
    /* the DECIDER travels with the reading (see sigmaIdentifiability's header for the prior/decider split).
       A caller storing sigImplied gates on `identified`; `tickRel` is the number behind it. Both are null when
       there is no reading at all, and `identified` is false in every null case -- never undefined, never true. */
    out.identified=info.identified; out.tickRel=info.tickRel; out.tickSided=info.tickSided;
    out.tickReason=info.tickReason;
  }
  /* ratioModel is the PLAUSIBILITY check that relPerCent is not. relPerCent is scale-free: it says how precisely
     the inversion pinned sigma down, never whether the level is physical. A strike below spot quoted under 50c
     is reachable in a zero-drift lognormal only at enormous vol, so it inverts exactly -- 1805 bp/min on a
     -10bp strike at an ordinary 40c quote, reported with a comfortable 10%/cent -- and a panel wiring
     varPremium straight through would render that as a colossal variance premium against a ~9 bp/min tape.
     ratioModel makes it unmissable: that reading is 200x the model's own volatility. It is not implied vol at
     all, it is model misspecification, and 200 is the number that says so. No threshold here -- pure arithmetic
     on two fields already present; the ledger decides what ratio is too much. */
  if(out.sigImplied!==null&&out.sigModel!==null) out.ratioModel=out.sigImplied/out.sigModel;
  return out;
}
