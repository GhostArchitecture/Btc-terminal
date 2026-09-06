/* Standalone harness for the `reversal` unit. node test.js  -> green, exit 0.

   detect/code.js is evaluated FIRST in the same vm context and the same script, because that is exactly
   how the splice lands in index.html: one <script>, one lexical scope, detect above reversal. Every
   page helper in the context is a THROWER, so any accidental reach into calSigma / normCdf / S / the
   DOM fails loudly instead of quietly working in the harness and breaking on the page. */
"use strict";
const fs=require("fs"),vm=require("vm"),path=require("path");

const SRC=fs.readFileSync(path.join(__dirname,"code.js"),"utf8");
const DETECT=fs.readFileSync(path.join(__dirname,"..","detect","code.js"),"utf8");

const thrower=function(n){ return function(){ throw new Error("unit reached for page helper: "+n); }; };
function makeCtx(){
  const ctx={Math:Math,Date:Date,Array:Array,Number:Number,Object:Object,JSON:JSON,
    isFinite:isFinite,console:console,
    clamp:thrower("clamp"),normCdf:thrower("normCdf"),invNorm:thrower("invNorm"),randn:thrower("randn"),
    quantile:thrower("quantile"),mulberry:thrower("mulberry"),bootstrapCI:thrower("bootstrapCI"),
    termFactor:thrower("termFactor"),calSigma:thrower("calSigma"),computeStats:thrower("computeStats"),
    hourStart:thrower("hourStart"),tapeAt:thrower("tapeAt"),idxAt:thrower("idxAt"),
    priceAtSrc:thrower("priceAtSrc"),barsExcludingCurrent:thrower("barsExcludingCurrent"),
    kFee:thrower("kFee"),refSnap:thrower("refSnap"),strikeProbs:thrower("strikeProbs"),
    SEAS:new Proxy({},{get:function(){ throw new Error("unit reached for global SEAS"); }}),
    TERM:thrower("TERM"),SWING:thrower("SWING"),SIM:thrower("SIM"),
    S:new Proxy({},{get:function(){ throw new Error("unit reached for global S"); }}),
    document:new Proxy({},{get:function(){ throw new Error("unit touched the DOM"); }}),
    localStorage:new Proxy({},{get:function(){ throw new Error("unit touched localStorage"); }}),
    fetch:thrower("fetch"),setTimeout:thrower("setTimeout"),setInterval:thrower("setInterval")};
  vm.createContext(ctx);
  return ctx;
}
/* top-level `const` is a lexical binding, not a property of the context object, so the names are
   collected by an expression evaluated at the end of the same script. */
const EXPORTS="\n;({REV:REV,REV_HORIZONS_MIN:REV_HORIZONS_MIN,REV_OMIT:REV_OMIT,"+
  "revHasDetect:revHasDetect,revShockKey:revShockKey,revKeyIndex:revKeyIndex,revLeg:revLeg,"+
  "revImpulse:revImpulse,revReversion:revReversion,revFeeC:revFeeC,revRoundTripC:revRoundTripC,"+
  "revBookLeg:revBookLeg,revMeasure:revMeasure,revAccumulator:revAccumulator,"+
  "revAccumulate:revAccumulate,revBucketTable:revBucketTable,"+
  "SHOCK:(typeof SHOCK==='undefined'?null:SHOCK),"+
  "SHOCK_LABELS:(typeof SHOCK_LABELS==='undefined'?null:SHOCK_LABELS),"+
  "SHOCK_EDGES:(typeof SHOCK_EDGES==='undefined'?null:SHOCK_EDGES),"+
  "baselineSigma:(typeof baselineSigma==='undefined'?null:baselineSigma),"+
  "shockMagnitudeBucket:(typeof shockMagnitudeBucket==='undefined'?null:shockMagnitudeBucket)})";

const FULL=vm.runInContext(DETECT+"\n"+SRC+EXPORTS,makeCtx(),{filename:"reversal+detect.js"});
const {REV,REV_HORIZONS_MIN,REV_OMIT,revHasDetect,revShockKey,revKeyIndex,revLeg,revImpulse,
  revReversion,revFeeC,revRoundTripC,revBookLeg,revMeasure,revAccumulator,revAccumulate,
  revBucketTable,SHOCK,SHOCK_LABELS,SHOCK_EDGES,baselineSigma,shockMagnitudeBucket}=FULL;
/* the same unit with detect ABSENT, to prove it degrades to a reason code instead of throwing */
const ALONE=vm.runInContext(SRC+EXPORTS,makeCtx(),{filename:"reversal-alone.js"});

let pass=0,fail=0;
function ok(name,cond,extra){ if(cond){ pass++; console.log("  ok  "+name); }
  else { fail++; console.log("  FAIL "+name+(extra===undefined?"":"  -> "+JSON.stringify(extra))); } }
function eq(name,a,b){ ok(name,a===b,{got:a,want:b}); }
function close(name,a,b,tol){ ok(name,typeof a==="number"&&Math.abs(a-b)<=(tol||1e-12),{got:a,want:b}); }

const MIN=60000;
/* contiguous minute bars from startKey with the given closes */
function bars(startKey,prices){ const keys=[]; for(let i=0;i<prices.length;i++) keys.push(startKey+i);
  return {keys:keys,closes:prices.slice()}; }
function flat(startKey,n,px){ const p=[]; for(let i=0;i<n;i++) p.push(px); return bars(startKey,p); }
/* a lagged scale object of exactly the shape baselineSigma returns, ending strictly before kTo+1 */
function scale(sig,kTo){ return {sigPerMin:sig,lagged:true,nRet:60,lookbackMin:60,gapMin:1,
  kTo:kTo,source:"test"}; }

/* A path with a clean impulse and a clean partial reversion, built from log-return steps so the
   arithmetic under test is never the arithmetic that built the fixture. */
function walk(startKey,n,px0,steps){
  const p=[px0];
  for(let i=1;i<n;i++){ const s=steps[i]===undefined?0:steps[i]; p.push(p[i-1]*Math.exp(s)); }
  return bars(startKey,p);
}

console.log("\n-- pre-registered constants ----------------------------------");
{
  eq("IMPULSE_MIN is the spine's own definition (one minute)",REV.IMPULSE_MIN,1);
  eq("REVERSION_MIN is the primary horizon",REV.REVERSION_MIN,5);
  eq("WINDOW_MIN is the KXBTC15M window",REV.WINDOW_MIN,15);
  eq("TIME_STOP_MIN is SIM's existing T-1:30",REV.TIME_STOP_MIN,1.5);
  eq("FEE_RATE is Kalshi's 0.07",REV.FEE_RATE,0.07);
  eq("LEGS is 2: a round trip, not hold-to-settlement",REV.LEGS,2);
  ok("REV_HORIZONS_MIN is [3,5,12]",REV_HORIZONS_MIN.join(",")==="3,5,12");
  ok("the primary horizon is a member of the pre-registered set",REV_HORIZONS_MIN.indexOf(REV.REVERSION_MIN)>=0);
  ok("every horizon fits: impulse + h <= WINDOW - TIME_STOP",
     REV_HORIZONS_MIN.every(function(h){ return REV.IMPULSE_MIN+h<=REV.WINDOW_MIN-REV.TIME_STOP_MIN; }));
  ok("the ceiling is the largest whole horizon that fits, and one more does not",
     REV.IMPULSE_MIN+12<=REV.WINDOW_MIN-REV.TIME_STOP_MIN&&REV.IMPULSE_MIN+13>REV.WINDOW_MIN-REV.TIME_STOP_MIN);
  eq("and the ceiling is the top of the pre-registered set",REV_HORIZONS_MIN[REV_HORIZONS_MIN.length-1],12);
  /* the duplication of detect's sentinels is deliberate (so this unit degrades instead of throwing);
     this is the assertion that stops the two definitions drifting apart */
  eq("BUCKET_UNKNOWN restates SHOCK.MAG_UNMEASURED exactly",REV.BUCKET_UNKNOWN,SHOCK.MAG_UNMEASURED);
  eq("BUCKET_NONE restates SHOCK.MAG_NONE exactly",REV.BUCKET_NONE,SHOCK.MAG_NONE);
  ok("neither sentinel is a real bucket label",
     SHOCK_LABELS.indexOf(REV.BUCKET_UNKNOWN)<0&&SHOCK_LABELS.indexOf(REV.BUCKET_NONE)<0);
  const codes=Object.keys(REV_OMIT).map(function(k){ return REV_OMIT[k]; });
  ok("every reason code is a distinct non-empty string",
     codes.length===new Set(codes).size&&codes.every(function(c){ return typeof c==="string"&&c.length>0; }));
}

console.log("\n-- revShockKey: the anchor is the close AT OR BEFORE the stamp --");
{
  const t=Date.UTC(2026,8,4,12,30,0);
  eq("a stamp on the minute anchors on the previous bar's close",revShockKey(t),Math.floor(t/60000)-1);
  eq("a stamp mid-minute anchors on the same bar (one minute of resolution conceded)",
     revShockKey(t+31000),revShockKey(t));
  eq("non-finite stamp -> null, never a plausible key",revShockKey(NaN),null);
  eq("non-number stamp -> null",revShockKey("12:30"),null);
}

console.log("\n-- revKeyIndex / revLeg --------------------------------------");
{
  const b=flat(1000,10,100000);
  eq("finds the first key",revKeyIndex(b.keys,1000),0);
  eq("finds the last key",revKeyIndex(b.keys,1009),9);
  eq("missing key -> -1",revKeyIndex(b.keys,1100),-1);
  eq("len bounds the search",revKeyIndex(b.keys,1009,5),-1);
  const p=walk(1000,10,100000,{5:0.004});
  const leg=revLeg(p.keys,p.closes,1004,1);
  eq("a clean leg has code null",leg.code,null);
  close("ret is the exact log return",leg.ret,0.004,1e-12);
  eq("k0 is the anchor",leg.k0,1004); eq("k1 is anchor + span",leg.k1,1005);
  eq("spanMin echoed",leg.spanMin,1);
  eq("anchor absent -> BARS",revLeg(p.keys,p.closes,999,1).code,REV_OMIT.BARS);
  eq("span runs past the buffer -> BARS",revLeg(p.keys,p.closes,1008,5).code,REV_OMIT.BARS);
  eq("span ending on the last bar is allowed",revLeg(p.keys,p.closes,1008,1).code,null);
  eq("bad args -> BADARG",revLeg(null,p.closes,1004,1).code,REV_OMIT.BADARG);
  eq("span below one minute -> BADARG",revLeg(p.keys,p.closes,1004,0).code,REV_OMIT.BADARG);
  ok("a failed leg returns null ret, never a number",revLeg(p.keys,p.closes,999,1).ret===null);
  /* a gap inside the span voids it; the same rule computeStats uses */
  const g=walk(1000,10,100000,{5:0.004}); g.keys[6]=1007;
  eq("a bar gap inside the span -> GAP",revLeg(g.keys,g.closes,1004,3).code,REV_OMIT.GAP);
  eq("a shorter span clearing the gap still measures",revLeg(g.keys,g.closes,1004,1).code,null);
  /* a corrupt close INSIDE the span voids it even though the endpoints would still compute */
  const c=walk(1000,10,100000,{5:0.004}); c.closes[5]=0;
  eq("a zero close inside the span -> CLOSE",revLeg(c.keys,c.closes,1004,3).code,REV_OMIT.CLOSE);
  const c2=walk(1000,10,100000,{5:0.004}); c2.closes[5]=NaN;
  eq("a NaN close inside the span -> CLOSE",revLeg(c2.keys,c2.closes,1004,3).code,REV_OMIT.CLOSE);
}

console.log("\n-- revImpulse: detect's units, detect's buckets ---------------");
{
  const p=walk(1000,80,100000,{71:0.005});      /* a 0.5% jump in the minute after key 1070 */
  const sig=scale(0.0005,1069);                  /* lagged scale, sample ends strictly before k0=1070 */
  const imp=revImpulse(p.keys,p.closes,1070,sig,1);
  eq("clean impulse has code null",imp.code,null);
  close("ret is the one-minute log return",imp.ret,0.005,1e-12);
  close("z uses detect's arithmetic ret/(sig*sqrt(w))",imp.z,0.005/(0.0005*Math.sqrt(1)),1e-12);
  eq("absZ is unsigned",imp.absZ,Math.abs(imp.z));
  eq("sigLagged is carried onto the row",imp.sigLagged,true);
  /* the bucket must be detect's, not one of ours */
  const want=shockMagnitudeBucket(imp.absZ);
  eq("the bucket is exactly shockMagnitudeBucket's",imp.bucket.label,want.label);
  eq("bucketLabel mirrors it",imp.bucketLabel,want.label);
  ok("bucketLabel is always a non-empty string",typeof imp.bucketLabel==="string"&&imp.bucketLabel.length>0);
  /* a down move buckets identically: size is unsigned, direction lives in ret/z */
  const d=walk(1000,80,100000,{71:-0.005});
  const impD=revImpulse(d.keys,d.closes,1070,sig,1);
  eq("a mirror-image down impulse lands in the same bucket",impD.bucket.label,imp.bucket.label);
  ok("its z has the opposite sign",impD.z<0&&imp.z>0);
  /* the pre-registered edges are reachable, which is the whole point of the lagged scale (detect D1) */
  const big=walk(1000,80,100000,{71:0.05});
  const impBig=revImpulse(big.keys,big.closes,1070,scale(0.0005,1069),1);
  close("a 10x larger move gives a 10x larger z (no saturation)",impBig.z/imp.z,10,1e-9);
  eq("and it reaches the top pre-registered bucket",impBig.bucket.label,SHOCK_LABELS[SHOCK_LABELS.length-1]);
  ok("the two tail buckets are not the same cell",
     shockMagnitudeBucket(5).label!==shockMagnitudeBucket(8).label);
}
{
  const p=walk(1000,80,100000,{71:0.005});
  eq("bare positive scale accepted but tagged capped",
     revImpulse(p.keys,p.closes,1070,0.0005,1).sigLagged,false);
  eq("non-positive scale -> SCALE",revImpulse(p.keys,p.closes,1070,0,1).code,REV_OMIT.SCALE);
  eq("unusable scale object -> SCALE",revImpulse(p.keys,p.closes,1070,{lagged:true},1).code,REV_OMIT.SCALE);
  /* the non-overlap rule is ENFORCED, not trusted: a baseline reaching into the measured span is refused */
  eq("a scale whose sample ends AT the span start -> OVERLAP",
     revImpulse(p.keys,p.closes,1070,scale(0.0005,1070),1).code,REV_OMIT.OVERLAP);
  eq("a scale reaching past the span start -> OVERLAP",
     revImpulse(p.keys,p.closes,1070,scale(0.0005,1075),1).code,REV_OMIT.OVERLAP);
  eq("one minute clear is enough",revImpulse(p.keys,p.closes,1070,scale(0.0005,1069),1).code,null);
  eq("impulseMin below one -> BADARG",revImpulse(p.keys,p.closes,1070,scale(0.0005,1069),0).code,REV_OMIT.BADARG);
  eq("an unmeasurable impulse labels itself unmeasured, not a bucket",
     revImpulse(p.keys,p.closes,9999,scale(0.0005,1069),1).bucketLabel,REV.BUCKET_UNKNOWN);
  ok("and carries no bucket object",revImpulse(p.keys,p.closes,9999,scale(0.0005,1069),1).bucket===null);
}
console.log("-- revImpulse: a REAL baselineSigma result (integration) ------");
{
  /* 200 contiguous bars of alternating +/-4bp, then a jump in the minute after key 1150 */
  const st={}; for(let i=1;i<200;i++) st[i]=(i%2?1:-1)*0.0004;
  st[151]=0.01;
  const p=walk(1000,200,100000,st);
  const kEnd=p.keys[p.keys.length-1], kShock=1150;
  const now=(kEnd+1)*MIN+5000;                       /* lag 1, exactly what barsExcludingCurrent yields */
  const bs=baselineSigma(p.keys,p.closes,now,kEnd-kShock,60,1);
  ok("baselineSigma returns a lagged scale",bs!==null&&bs.lagged===true);
  eq("its sample ends exactly one bar before the impulse anchor",bs.kTo,kShock-1);
  const imp=revImpulse(p.keys,p.closes,kShock,bs,1);
  eq("a real baselineSigma result drives the impulse",imp.code,null);
  eq("sigLagged true",imp.sigLagged,true);
  close("z = ret / sigPerMin for a one-minute impulse",imp.z,0.01/bs.sigPerMin,1e-9);
  ok("that z clears the top pre-registered edge",imp.absZ>=SHOCK_EDGES[SHOCK_EDGES.length-1]);
}

console.log("\n-- revReversion: the sign convention -------------------------");
{
  const sig=scale(0.0005,1069);
  /* up 0.5% in the impulse minute, then 0.2% back down over the next 5 */
  const st={71:0.005}; for(let i=72;i<77;i++) st[i]=-0.0004;
  const p=walk(1000,90,100000,st);
  const imp=revImpulse(p.keys,p.closes,1070,sig,1);
  const rv=revReversion(p.keys,p.closes,imp,5);
  eq("clean reversion has code null",rv.code,null);
  eq("the reversion leg abuts the impulse leg",rv.k0,imp.k1);
  eq("and does not overlap it",rv.k0>=imp.k1&&rv.k1===imp.k1+5,true);
  close("laterRet is the raw later-leg return",rv.laterRet,-0.002,1e-12);
  close("a give-back after an UP impulse is POSITIVE",rv.rev,0.002,1e-12);
  eq("and is not flagged as a continuation",rv.cont,false);
  close("revFrac is the fraction of the impulse given back",rv.revFrac,0.002/0.005,1e-12);
  close("revZ standardises by the impulse's own scale",rv.revZ,0.002/(0.0005*Math.sqrt(5)),1e-12);
  /* the mirror image: an equal give-back after a DOWN impulse must be equally positive */
  const stD={71:-0.005}; for(let i=72;i<77;i++) stD[i]=0.0004;
  const d=walk(1000,90,100000,stD);
  const impD=revImpulse(d.keys,d.closes,1070,sig,1);
  const rvD=revReversion(d.keys,d.closes,impD,5);
  close("a give-back after a DOWN impulse is POSITIVE too",rvD.rev,0.002,1e-12);
  close("and the mirror image gives the same fraction",rvD.revFrac,rv.revFrac,1e-12);
  /* a CONTINUATION is a negative reversion, never a silent zero */
  const stC={71:0.005}; for(let i=72;i<77;i++) stC[i]=0.0004;
  const c=walk(1000,90,100000,stC);
  const impC=revImpulse(c.keys,c.closes,1070,sig,1);
  const rvC=revReversion(c.keys,c.closes,impC,5);
  close("a continuation is a NEGATIVE reversion",rvC.rev,-0.002,1e-12);
  eq("and is flagged as one",rvC.cont,true);
  ok("its fraction is negative too",rvC.revFrac<0);
  ok("a continuation is not folded to zero",rvC.rev!==0);
  /* a full round trip back to the start gives back exactly 100% */
  const stF={71:0.005}; for(let i=72;i<77;i++) stF[i]=-0.001;
  const f=walk(1000,90,100000,stF);
  const impF=revImpulse(f.keys,f.closes,1070,sig,1);
  close("a complete round trip gives back 1.0 of the impulse",
        revReversion(f.keys,f.closes,impF,5).revFrac,1,1e-12);
}

console.log("\n-- revReversion: omissions, never fabrications ---------------");
{
  const sig=scale(0.0005,1069);
  /* THE ZERO-IMPULSE CASE: division by zero is an omission, not an Infinity */
  const st={}; for(let i=72;i<77;i++) st[i]=-0.0004;
  const p=walk(1000,90,100000,st);                 /* nothing happens in the impulse minute */
  const imp=revImpulse(p.keys,p.closes,1070,sig,1);
  eq("the zero impulse is still measured",imp.code,null);
  eq("its ret is exactly zero",imp.ret,0);
  const rv=revReversion(p.keys,p.closes,imp,5);
  eq("a zero impulse yields the IMP0 code",rv.code,REV_OMIT.IMP0);
  eq("no reversion RATIO is produced",rv.revFrac,null);
  eq("no signed reversion is produced either (sign(0) has no meaning)",rv.rev,null);
  ok("nothing is Infinity",rv.revFrac!==Infinity&&rv.revFrac!==-Infinity);
  ok("nothing is NaN",!(typeof rv.revFrac==="number"&&isNaN(rv.revFrac)));
  close("the raw later-leg return is still kept",rv.laterRet,-0.002,1e-12);
  /* TOO FEW BARS for the reversion leg: omitted and coded, never zero-filled */
  const shortP=walk(1000,74,100000,{71:0.005});    /* last key 1073; a 5-min reversion needs 1076 */
  const impS=revImpulse(shortP.keys,shortP.closes,1070,sig,1);
  eq("the impulse still measures",impS.code,null);
  const rvS=revReversion(shortP.keys,shortP.closes,impS,5);
  eq("a reversion leg past the buffer -> BARS",rvS.code,REV_OMIT.BARS);
  eq("and no reversion is invented",rvS.rev,null);
  ok("not zero-filled",rvS.rev!==0);
  /* TOO FEW BARS for the impulse leg */
  const tiny=walk(1000,71,100000,{});
  eq("an impulse past the buffer -> BARS",revImpulse(tiny.keys,tiny.closes,1070,sig,1).code,REV_OMIT.BARS);
  /* a gap inside the reversion leg */
  const g=walk(1000,90,100000,{71:0.005}); g.keys[74]=1075;
  const impG=revImpulse(g.keys,g.closes,1070,sig,1);
  eq("a gap inside the reversion leg -> GAP",revReversion(g.keys,g.closes,impG,5).code,REV_OMIT.GAP);
  /* a failed impulse cannot produce a reversion */
  eq("a failed impulse -> BADARG on the reversion",
     revReversion(p.keys,p.closes,{code:REV_OMIT.BARS},5).code,REV_OMIT.BADARG);
  eq("a null impulse -> BADARG",revReversion(p.keys,p.closes,null,5).code,REV_OMIT.BADARG);
}

console.log("\n-- the fit rule: both legs inside the tradeable window --------");
{
  const sig=scale(0.0005,1069);
  const p=walk(1000,120,100000,{71:0.005});
  const imp=revImpulse(p.keys,p.closes,1070,sig,1);
  eq("impulse + primary horizon fits a full window",revReversion(p.keys,p.closes,imp,5).code,null);
  eq("impulse + the horizon ceiling fits",revReversion(p.keys,p.closes,imp,12).code,null);
  eq("impulse + 15 does not fit a 15-minute window -> NOFIT",
     revReversion(p.keys,p.closes,imp,15).code,REV_OMIT.NOFIT);
  /* with the real tau left in the live window, the T-1:30 time-stop bites */
  eq("tau 15 leaves room for the primary horizon",revReversion(p.keys,p.closes,imp,5,15).code,null);
  eq("tau 7 does not: 1+12 > 7-1.5 -> NOFIT",revReversion(p.keys,p.closes,imp,12,7).code,REV_OMIT.NOFIT);
  eq("tau 6.5 is exactly enough for 1+5 (=6 <= 6.5-1.5+1)",
     revReversion(p.keys,p.closes,imp,5,7.5).code,null);
  eq("tau 6 is not enough for 1+5",revReversion(p.keys,p.closes,imp,5,6).code,REV_OMIT.NOFIT);
  ok("a NOFIT row carries no reversion at all",revReversion(p.keys,p.closes,imp,15).rev===null);
}

console.log("\n-- cost: two legs, both rounding models ----------------------");
{
  /* index.html's kFee, reimplemented here rather than imported, so the two are pinned against each
     other instead of sharing a bug. kFee takes DOLLARS and returns DOLLARS; this unit works in cents. */
  const kFee=function(ask){ return Math.ceil(0.07*ask*(1-ask)*100)/100; };
  let worst=0;
  for(let c=0;c<=100;c++){ const got=revFeeC(c,true), want=kFee(c/100)*100;
    worst=Math.max(worst,Math.abs(got-want)); }
  ok("the rounded fee equals index.html's kFee at every whole cent (worst "+worst.toExponential(1)+")",worst<1e-9);
  close("the unrounded fee is 0.07*p*(1-p) in cents",revFeeC(50,false),7*0.5*0.5,1e-12);
  eq("the rounded fee rounds UP per order (7.9c/100 -> 2c)... ",revFeeC(30,true),Math.ceil(7*0.3*0.7));
  ok("rounding up is never smaller than the raw fee",
     [1,5,9,17,30,50,73,88,99].every(function(c){ return revFeeC(c,true)>=revFeeC(c,false); }));
  eq("fee at 0c is 0",revFeeC(0,false),0);
  eq("fee at 100c is 0",revFeeC(100,false),0);
  eq("a price below 0 -> null",revFeeC(-1,true),null);
  eq("a price above 100 -> null",revFeeC(101,true),null);
  eq("a non-number price -> null",revFeeC("30",true),null);
  eq("a NaN price -> null",revFeeC(NaN,true),null);
}
{
  const rt=revRoundTripC(30,40,null,"ask-bid");
  eq("ask-bid basis is clean",rt.code,null);
  eq("two legs, always",rt.legs,2);
  close("the fee is the sum of BOTH legs",rt.feeC,revFeeC(30,true)+revFeeC(40,true),1e-12);
  close("the unrounded fee is the sum of both legs too",rt.feeRawC,revFeeC(30,false)+revFeeC(40,false),1e-12);
  eq("ask-bid: the spread is already inside the gross, so it is not charged again",rt.spreadCostC,0);
  close("cost = fees + spread",rt.costC,rt.feeC+rt.spreadCostC,1e-12);
  const mm=revRoundTripC(30,40,3,"mid-mid");
  eq("mid-mid basis is clean when a spread is supplied",mm.code,null);
  eq("mid-mid: the spread IS charged",mm.spreadCostC,3);
  close("and it lands in the total",mm.costC,mm.feeC+3,1e-12);
  ok("the two bases differ by exactly the spread",Math.abs((mm.costC-rt.costC)-3)<1e-12);
  eq("mid-mid with no spread -> QUOTE, not a silent zero",revRoundTripC(30,40,null,"mid-mid").code,REV_OMIT.QUOTE);
  eq("a negative spread -> QUOTE",revRoundTripC(30,40,-1,"mid-mid").code,REV_OMIT.QUOTE);
  eq("an undeclared basis -> BASIS, never a default",revRoundTripC(30,40,3).code,REV_OMIT.BASIS);
  eq("an unknown basis -> BASIS",revRoundTripC(30,40,3,"midpoint").code,REV_OMIT.BASIS);
  ok("a refused cost carries no number",revRoundTripC(30,40,3).costC===null);
  eq("an out-of-range price -> QUOTE",revRoundTripC(-3,40,null,"ask-bid").code,REV_OMIT.QUOTE);
}

console.log("\n-- the book leg: clears cost is answerable from the row -------");
{
  const bk=revBookLeg({entryC:30,exitC:40,basis:"ask-bid"});
  eq("clean book leg",bk.code,null);
  eq("gross is exit minus entry, in cents",bk.grossC,10);
  close("net is gross minus the rounded round trip",bk.netC,10-bk.costC,1e-12);
  close("and a second net under the unrounded model",bk.netRawC,10-bk.costRawC,1e-12);
  eq("a 10c gross clears a ~4c round trip",bk.clears,true);
  ok("the rounded model is never kinder than the raw one",bk.netC<=bk.netRawC+1e-12);
  const thin=revBookLeg({entryC:30,exitC:32,basis:"ask-bid"});
  eq("a 2c gross does not clear it",thin.clears,false);
  ok("and the shortfall is on the row, signed",thin.netC<0);
  const lose=revBookLeg({entryC:40,exitC:30,basis:"ask-bid"});
  eq("an adverse book move is a negative gross, never zero",lose.grossC,-10);
  eq("no book leg supplied -> NOQUOTE",revBookLeg(null).code,REV_OMIT.NOQUOTE);
  eq("an empty book -> QUOTE",revBookLeg({}).code,REV_OMIT.QUOTE);
  eq("a price outside 0..100 -> QUOTE",revBookLeg({entryC:30,exitC:140,basis:"ask-bid"}).code,REV_OMIT.QUOTE);
  eq("no basis -> BASIS",revBookLeg({entryC:30,exitC:40}).code,REV_OMIT.BASIS);
  ok("a refused book leg carries no gross",revBookLeg({}).grossC===null);
  /* rounding can flip the verdict, which is exactly why both models are reported (7.5) */
  let flipped=false;
  for(let e=1;e<=99;e++){ for(let x=e;x<=99;x++){
    const r=revBookLeg({entryC:e,exitC:x,basis:"ask-bid"});
    if(r.code===null&&r.clears!==r.clearsRaw) flipped=true; } }
  ok("per-order rounding flips 'clears cost' for some real prices, so both are stored",flipped);
}

console.log("\n-- revMeasure: the composed row ------------------------------");
{
  const sig=scale(0.0005,1069);
  const st={71:0.005}; for(let i=72;i<77;i++) st[i]=-0.0004;
  const p=walk(1000,90,100000,st);
  const row=revMeasure(p.keys,p.closes,{kShock:1070,sigPerMin:sig,impulseMin:1,revMin:5,
    tauAtShockMin:15,book:{entryC:30,exitC:40,basis:"ask-bid"}});
  eq("impulse measured",row.impCode,null);
  eq("reversion measured",row.revCode,null);
  eq("book measured",row.bookCode,null);
  eq("horizons stamped on the row",row.impulseMin+"/"+row.revMin,"1/5");
  close("rev on the row matches revReversion",row.rev,0.002,1e-12);
  eq("bucket label on the row",row.bucketLabel,shockMagnitudeBucket(row.absZ).label);
  eq("clears is on the row",row.clears,true);
  eq("the cost basis is recorded",row.costBasis,"ask-bid");
  /* the OMIT RULE: an absent reading is undefined so JSON.stringify drops it entirely */
  const bad=revMeasure(p.keys,p.closes,{kShock:1070,sigPerMin:sig,revMin:5});
  eq("no book supplied -> bookCode NOQUOTE",bad.bookCode,REV_OMIT.NOQUOTE);
  ok("and no book keys are written at all",bad.grossC===undefined&&bad.netC===undefined&&bad.clears===undefined);
  ok("JSON.stringify drops them",Object.keys(JSON.parse(JSON.stringify(bad))).indexOf("netC")<0);
  ok("never written as null",JSON.stringify(bad).indexOf("null")<0||bad.grossC===undefined);
  /* tShock instead of kShock */
  const t=(1071)*MIN+12000;                    /* a stamp inside minute 1071 anchors on 1070 */
  const byT=revMeasure(p.keys,p.closes,{tShock:t,sigPerMin:sig,impulseMin:1,revMin:5});
  eq("a timestamp resolves to the same anchor as the key",byT.kShock,1070);
  close("and produces the same impulse",byT.ret,row.ret,1e-15);
  /* a row whose impulse failed stops there and is labelled unmeasured */
  const dead=revMeasure(p.keys,p.closes,{kShock:9999,sigPerMin:sig});
  eq("dead row: impCode set",dead.impCode,REV_OMIT.BARS);
  eq("dead row: bucketLabel is the unmeasured sentinel",dead.bucketLabel,REV.BUCKET_UNKNOWN);
  ok("dead row: no bucket, no z, no rev",dead.bucket===undefined&&dead.z===undefined&&dead.rev===undefined);
  eq("no shock key at all -> BADARG",revMeasure(p.keys,p.closes,{sigPerMin:sig}).impCode,REV_OMIT.BADARG);
  ok("the three code fields are always present",
     ["impCode","revCode","bookCode"].every(function(k){ return k in revMeasure([],[],{}); }));
  /* horizons default to the pre-registered ones when the caller omits them */
  const def=revMeasure(p.keys,p.closes,{kShock:1070,sigPerMin:sig});
  eq("impulseMin defaults to the pre-registered constant",def.impulseMin,REV.IMPULSE_MIN);
  eq("revMin defaults to the primary horizon",def.revMin,REV.REVERSION_MIN);
}

console.log("\n-- the accumulator: buckets, tails, and countable omissions ---");
{
  const sig=function(k){ return scale(0.0005,k-1); };
  /* one row per bucket: z = ret/sig, so ret 0.0005 -> z 1, 0.00125 -> 2.5, and so on */
  const mk=function(retImp,retBack,book){
    const st={71:retImp}; for(let i=72;i<77;i++) st[i]=retBack/5;
    const p=walk(1000,90,100000,st);
    return revMeasure(p.keys,p.closes,{kShock:1070,sigPerMin:sig(1070),impulseMin:1,revMin:5,book:book});
  };
  const bookAB=function(e,x){ return {entryC:e,exitC:x,basis:"ask-bid"}; };
  const acc=revAccumulator();
  const r1=mk(0.0005,-0.0001,bookAB(30,31));      /* z 1    -> z<2  */
  const r2=mk(0.00125,-0.0003,bookAB(30,32));     /* z 2.5  -> z2-3 */
  const r3=mk(0.00175,-0.0005,bookAB(30,34));     /* z 3.5  -> z3-4 */
  const r4=mk(0.0025,-0.001,bookAB(30,40));       /* z 5    -> z4-6 */
  const r5=mk(0.004,-0.002,bookAB(30,50));        /* z 8    -> z6+  */
  [r1,r2,r3,r4,r5].forEach(function(r){ revAccumulate(acc,r); });
  eq("five rows seen",acc.nSeen,5);
  eq("five tape observations",acc.nTape,5);
  eq("five book observations",acc.nBook,5);
  const tb=revBucketTable(acc);
  eq("the table has exactly one row per pre-registered bucket",tb.length,SHOCK_LABELS.length);
  eq("in the pre-registered order",tb.map(function(r){ return r.label; }).join(","),SHOCK_LABELS.join(","));
  ok("the two tail buckets are separate rows with n=1 each",
     tb[3].label==="z4-6"&&tb[3].nTape===1&&tb[4].label==="z6+"&&tb[4].nTape===1);
  ok("and they are not merged",tb[3].meanRev!==tb[4].meanRev);
  close("mean reversion in the top bucket",tb[4].meanRev,0.002,1e-12);
  close("mean gross in the top bucket",tb[4].meanGrossC,20,1e-12);
  ok("mean cost is reported beside it",tb[4].meanCostC>0);
  ok("the bottom bucket does not clear cost",tb[0].meanNetC<0);
  ok("the top bucket does",tb[4].meanNetC>0);
  eq("nClears counts the rows that cleared",tb[4].nClears,1);
  eq("and the bottom bucket cleared none",tb[0].nClears,0);
  /* an empty bucket is VISIBLE, with null means, not a zero and not a missing row */
  const acc2=revAccumulator(); revAccumulate(acc2,r5);
  const tb2=revBucketTable(acc2);
  eq("an empty bucket still has a row",tb2[0].label,SHOCK_LABELS[0]);
  eq("with n = 0",tb2[0].nTape,0);
  eq("and a NULL mean, never a zero",tb2[0].meanRev,null);
  eq("null book mean too",tb2[0].meanCostC,null);
  ok("the occupied bucket has real means",tb2[4].meanRev!==null&&tb2[4].meanCostC!==null);
}
{
  /* omissions are counted per leg, so a row can contribute to two codes */
  const sig=scale(0.0005,1069);
  const shortP=walk(1000,74,100000,{71:0.005});
  const acc=revAccumulator();
  const row=revMeasure(shortP.keys,shortP.closes,{kShock:1070,sigPerMin:sig,impulseMin:1,revMin:5});
  revAccumulate(acc,row);
  eq("the row was seen",acc.nSeen,1);
  eq("but contributed no tape observation",acc.nTape,0);
  eq("the reversion omission is counted",acc.omit[REV_OMIT.BARS],1);
  eq("the book omission is counted separately",acc.omit[REV_OMIT.NOQUOTE],1);
  ok("the bucket slot still exists, with n=0",acc.byBucket[row.bucketLabel].nTape===0);
  /* an unmeasurable impulse: counted, and NOT binned anywhere */
  const acc3=revAccumulator();
  revAccumulate(acc3,revMeasure(shortP.keys,shortP.closes,{kShock:9999,sigPerMin:sig}));
  eq("an unmeasurable impulse is counted under its own code",acc3.omit[REV_OMIT.BARS],1);
  eq("no bucket slot is created for it",Object.keys(acc3.byBucket).length,0);
  ok("the unmeasured sentinel never becomes a bucket",acc3.byBucket[REV.BUCKET_UNKNOWN]===undefined);
  const tb3=revBucketTable(acc3);
  ok("and the table stays at five pre-registered buckets, all empty",
     tb3.length===SHOCK_LABELS.length&&tb3.every(function(r){ return r.nTape===0&&r.meanRev===null; }));
  /* a hand-made row with a null bucket but a clean impulse code is refused, not binned */
  const acc4=revAccumulator();
  revAccumulate(acc4,{impCode:null,revCode:null,bookCode:null,sigLagged:true,impulseMin:1,revMin:5,
    bucket:null,bucketLabel:REV.BUCKET_UNKNOWN,rev:0.001,revZ:1,revFrac:0.2});
  eq("a row with no bucket is counted as NOBUCKET",acc4.omit[REV_OMIT.NOBUCKET],1);
  eq("and binned nowhere",Object.keys(acc4.byBucket).length,0);
  /* a foreign bucket label is never silently dropped from the table */
  const acc5=revAccumulator();
  revAccumulate(acc5,{impCode:null,revCode:null,bookCode:REV_OMIT.NOQUOTE,sigLagged:true,
    impulseMin:1,revMin:5,bucket:{label:"z99+"},rev:0.001,revZ:1,revFrac:0.2});
  const tb5=revBucketTable(acc5);
  eq("the canonical buckets are still all present",tb5.length,SHOCK_LABELS.length+1);
  eq("and the foreign label is appended, visibly, rather than dropped",tb5[tb5.length-1].label,"z99+");
  eq("carrying its own n",tb5[tb5.length-1].nTape,1);
}
{
  /* a capped (non-lagged) scale is refused by default: detect D1 says its z is not comparable */
  const p=walk(1000,90,100000,{71:0.005});
  const capped=revMeasure(p.keys,p.closes,{kShock:1070,sigPerMin:0.0005,impulseMin:1,revMin:5});
  eq("the capped row measures fine on its own",capped.impCode,null);
  eq("but is tagged",capped.sigLagged,false);
  const acc=revAccumulator(); revAccumulate(acc,capped);
  eq("and is refused by the accumulator",acc.omit[REV_OMIT.CAPPED],1);
  eq("binned nowhere",Object.keys(acc.byBucket).length,0);
  const mixed=revAccumulator({requireLagged:false}); revAccumulate(mixed,capped);
  eq("an explicitly mixed table admits it",mixed.nTape,1);
  ok("no CAPPED omission there",mixed.omit[REV_OMIT.CAPPED]===undefined);
}
{
  /* horizons never pool */
  const sig=scale(0.0005,1069);
  const st={71:0.005}; for(let i=72;i<82;i++) st[i]=-0.0002;
  const p=walk(1000,100,100000,st);
  const at=function(h){ return revMeasure(p.keys,p.closes,{kShock:1070,sigPerMin:sig,impulseMin:1,revMin:h}); };
  const acc=revAccumulator();
  revAccumulate(acc,at(5));
  eq("the accumulator locks to the first row's horizons",acc.revMin,5);
  revAccumulate(acc,at(10));
  eq("a different horizon is refused",acc.omit[REV_OMIT.HORIZON],1);
  eq("and does not enter the mean",acc.nTape,1);
  revAccumulate(acc,at(5));
  eq("the matching horizon still accumulates",acc.nTape,2);
  ok("the three pre-registered horizons give three different reversions",
     new Set(REV_HORIZONS_MIN.map(function(h){ return at(h).rev; })).size===3);
  eq("a null row is ignored safely",revAccumulate(acc,null).nSeen,3);
}

console.log("\n-- monotonicity is ANSWERABLE (the falsifier is reachable) ----");
{
  /* This asserts the INSTRUMENT can express both outcomes, not that either is true. */
  const sig=scale(0.0005,1069);
  const mk=function(retImp,frac){
    const st={71:retImp}; for(let i=72;i<77;i++) st[i]=-retImp*frac/5;
    const p=walk(1000,90,100000,st);
    return revMeasure(p.keys,p.closes,{kShock:1070,sigPerMin:sig,impulseMin:1,revMin:5,
      book:{entryC:30,exitC:30+Math.round(retImp*frac*1e4),basis:"ask-bid"}});
  };
  const flatAcc=revAccumulator();
  [[0.0005,0.4],[0.00125,0.4],[0.00175,0.4],[0.0025,0.4],[0.004,0.4]].forEach(function(a){
    revAccumulate(flatAcc,mk(a[0],a[1])); });
  const flatTab=revBucketTable(flatAcc);
  const fracs=flatTab.filter(function(r){ return r.nTape>0; }).map(function(r){ return r.meanRevFrac; });
  ok("a FLAT relationship reads flat in revRevFrac (the falsifier is visible)",
     fracs.length===5&&Math.max.apply(null,fracs)-Math.min.apply(null,fracs)<1e-9);
  const upAcc=revAccumulator();
  [[0.0005,0.1],[0.00125,0.2],[0.00175,0.3],[0.0025,0.5],[0.004,0.8]].forEach(function(a){
    revAccumulate(upAcc,mk(a[0],a[1])); });
  const upTab=revBucketTable(upAcc);
  const upFracs=upTab.map(function(r){ return r.meanRevFrac; });
  ok("a MONOTONE relationship reads monotone across all five buckets",
     upFracs.every(function(v,i){ return i===0||v>upFracs[i-1]; }));
  const nets=upTab.map(function(r){ return r.meanNetC; });
  ok("net-of-cost is reported per bucket, so 'clears only in the tail' is answerable",
     nets[0]<0&&nets[4]>0);
}

console.log("\n-- H1's [TBD] percentile: the DISTRIBUTION is recorded, not a threshold --");
{
  /* The spine leaves H1's shock-size percentile [TBD] because nobody has the data to set it. This unit
     must therefore make the size distribution recoverable and must not contain a percentile of its own. */
  const sig=scale(0.0005,1069);
  const acc=revAccumulator(); const zs=[];
  [0.0004,0.0006,0.0011,0.0013,0.0016,0.0019,0.0021,0.0035,0.0045].forEach(function(r){
    const st={71:r}; for(let i=72;i<77;i++) st[i]=-r*0.3/5;
    const p=walk(1000,90,100000,st);
    const row=revMeasure(p.keys,p.closes,{kShock:1070,sigPerMin:sig,impulseMin:1,revMin:5});
    zs.push(row.absZ); revAccumulate(acc,row);
  });
  ok("every measured row carries its own absZ, so any percentile is recoverable later",
     zs.length===9&&zs.every(function(z){ return typeof z==="number"&&isFinite(z)&&z>0; }));
  const tab=revBucketTable(acc);
  const hist=tab.map(function(r){ return r.nTape; });
  eq("the per-bucket n IS the size histogram",hist.reduce(function(a,b){ return a+b; },0),9);
  ok("and it is spread across buckets rather than collapsed",hist.filter(function(n){ return n>0; }).length>=4);
  ok("no key on any row is a percentile, a cut-off or a verdict on size",
     Object.keys(revMeasure(walk(1000,90,100000,{71:0.005}).keys,
       walk(1000,90,100000,{71:0.005}).closes,{kShock:1070,sigPerMin:sig}))
       .every(function(k){ return !/pct|percentile|thresh|cut|signal|arm|enter/i.test(k); }));
}

console.log("\n-- degradation when detect is not spliced --------------------");
{
  eq("with detect present, revHasDetect is true",revHasDetect(),true);
  eq("without detect, revHasDetect is false",ALONE.revHasDetect(),false);
  const p=walk(1000,90,100000,{71:0.005});
  const imp=ALONE.revImpulse(p.keys,p.closes,1070,scale(0.0005,1069),1);
  eq("and the impulse degrades to NODETECT rather than throwing",imp.code,ALONE.REV_OMIT.NODETECT);
  eq("with the unmeasured sentinel, not a bucket",imp.bucketLabel,ALONE.REV.BUCKET_UNKNOWN);
  const row=ALONE.revMeasure(p.keys,p.closes,{kShock:1070,sigPerMin:scale(0.0005,1069)});
  eq("and the composed row carries the code",row.impCode,ALONE.REV_OMIT.NODETECT);
  const acc=ALONE.revAccumulator(); ALONE.revAccumulate(acc,row);
  eq("which the accumulator counts",acc.omit[ALONE.REV_OMIT.NODETECT],1);
  const tab=ALONE.revBucketTable(acc);
  ok("the bucket table falls back to the accumulator's own keys and does not throw",Array.isArray(tab));
  /* the cost side needs no detect at all */
  eq("cost still measures without detect",ALONE.revBookLeg({entryC:30,exitC:40,basis:"ask-bid"}).code,null);
}

console.log("\n-- measurement only: no arm, no signal, no execution ----------");
{
  const CODE=SRC.replace(/\/\*[\s\S]*?\*\//g,"");
  ok("no order/execution vocabulary in live code",
     !/\b(placeOrder|submitOrder|buy|sell|order|execute|arm|SIM_ARMS)\s*\(/i.test(CODE));
  ok("no render/DOM/UI path",!/render|innerHTML|document|querySelector|classList/i.test(CODE));
  ok("no persistence",!/localStorage|sessionStorage|indexedDB/i.test(CODE));
  ok("no network",!/fetch\s*\(|XMLHttpRequest|WebSocket/.test(CODE));
  ok("no timers",!/setTimeout|setInterval|requestAnimationFrame/.test(CODE));
  ok("no page state or global tables",!/\b(S|SEAS|TERM|SWING|SIM|VERDICT_RULE)\b\s*[.[]/.test(CODE));
  ok("no page helper is called in live code",
     !/\b(clamp|normCdf|invNorm|randn|quantile|mulberry|bootstrapCI|termFactor|calSigma|computeStats|hourStart|tapeAt|idxAt|priceAtSrc|barsExcludingCurrent|kFee|strikeProbs|refSnap)\s*\(/.test(CODE));
  ok("the only cross-unit calls are detect's bucket and scale resolvers",
     /shockMagnitudeBucket\s*\(/.test(CODE)&&/shockScale\s*\(/.test(CODE)&&!/detectShock\s*\(/.test(CODE));
  ok("it does not re-detect",!/detectShock|standardisedMove|baselineSigma/.test(CODE));
  ok("it defines no bucket edges of its own",!/SHOCK_EDGES\s*=/.test(CODE)&&!/EDGES\s*=\s*\[/.test(CODE));
  ok("no threshold is invented for H1's shock-size percentile",
     !/PERCENTILE|percentile|MIN_Z|Z_MIN|SIZE_THRESHOLD/.test(CODE));
}

console.log("\n-- style and splice hygiene ----------------------------------");
{
  ok("code.js is pure ASCII",Array.prototype.every.call(SRC,function(ch){ return ch.charCodeAt(0)<=126; }));
  const CODE=SRC.replace(/\/\*[\s\S]*?\*\//g,"");
  ok("no arrow functions in live code",!/=>/.test(CODE));
  ok("no template literals in live code",!/`/.test(CODE));
  ok("no class/async/await/generator syntax",!/\b(class|async|await|function\s*\*)\b/.test(CODE));
  ok("no ES2020+ operators (?. ??)",!/\?\.|\?\?/.test(CODE));
  /* name collisions against the splice target: every export must be new */
  const idx=path.join(__dirname,"..","..","index.html");
  if(fs.existsSync(idx)){
    /* Check the page OUTSIDE this unit's own spliced block. Before the splice the whole page was fair game;
       after it, every one of these names is in the page precisely BECAUSE the splice worked, and comparing
       against the whole file makes the guard fire on itself. What it must still catch is a name colliding
       with page code or with another unit, so the unit's own block is excised first. */
    const whole=fs.readFileSync(idx,"utf8");
    const M="/* ---------------- H protocol: reversal ---------------- */";
    let page=whole;
    const a0=whole.indexOf(M);
    if(a0>=0){
      const a1=whole.indexOf("/* ---------------- H protocol: ",a0+M.length);
      page=whole.slice(0,a0)+(a1>=0?whole.slice(a1):"");
    }
    const names=["REV","REV_HORIZONS_MIN","REV_OMIT","revHasDetect","revNum","revInt","revSgn",
      "revShockKey","revKeyIndex","revLeg","revImpulse","revReversion","revFeeC","revRoundTripC",
      "revBookLeg","revMeasure","revAccumulator","revOmitCount","revBucketSlot","revAccumulate",
      "revBucketTable"];
    const clash=names.filter(function(n){
      return new RegExp("(function|const|let|var)\\s+"+n+"\\b").test(page); });
    ok("no exported name already exists in index.html",clash.length===0,clash);
  } else ok("index.html not present; name-collision check skipped",true);
  /* every declared name is actually exported by the harness expression, so nothing is untested */
  const declared=(SRC.match(/^(?:function|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm)||[])
    .map(function(s){ return s.replace(/^(?:function|const)\s+/,""); });
  ok("every top-level declaration is a rev*/REV* name",
     declared.every(function(n){ return /^rev|^REV/.test(n); }),declared);
}

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
