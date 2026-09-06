/* Standalone harness for the `detect` unit. node test.js  -> green, exit 0.
   code.js is evaluated in a vm context whose page helpers are THROWERS: the unit must be pure
   arithmetic with no reach into calSigma/normCdf/clamp/etc. Any accidental use fails loudly. */
"use strict";
const fs=require("fs"),vm=require("vm"),path=require("path");

const SRC=fs.readFileSync(path.join(__dirname,"code.js"),"utf8");
const thrower=n=>()=>{throw new Error("unit reached for page helper: "+n);};
const ctx={Math:Math,Date:Date,Array:Array,Number:Number,isFinite:isFinite,JSON:JSON,console:console,
  clamp:thrower("clamp"),normCdf:thrower("normCdf"),invNorm:thrower("invNorm"),randn:thrower("randn"),
  quantile:thrower("quantile"),mulberry:thrower("mulberry"),bootstrapCI:thrower("bootstrapCI"),
  termFactor:thrower("termFactor"),calSigma:thrower("calSigma"),computeStats:thrower("computeStats"),
  hourStart:thrower("hourStart"),tapeAt:thrower("tapeAt"),idxAt:thrower("idxAt"),
  priceAtSrc:thrower("priceAtSrc"),barsExcludingCurrent:thrower("barsExcludingCurrent"),
  SEAS:new Proxy({},{get(){throw new Error("unit reached for global SEAS");}}),
  TERM:thrower("TERM"),SWING:thrower("SWING"),SIM:thrower("SIM"),
  S:new Proxy({},{get(){throw new Error("unit reached for global S");}}),
  document:new Proxy({},{get(){throw new Error("unit touched the DOM");}}),
  localStorage:new Proxy({},{get(){throw new Error("unit touched localStorage");}}),
  fetch:thrower("fetch"),setTimeout:thrower("setTimeout"),setInterval:thrower("setInterval")};
vm.createContext(ctx);
/* top-level `const` in a script is a lexical binding, not a property of the context object, so the
   exported names are collected by an expression evaluated in the same context. */
const EXPORTS="\n;({SHOCK:SHOCK,SHOCK_EDGES:SHOCK_EDGES,SHOCK_LABELS:SHOCK_LABELS,"+
  "BASELINE:BASELINE,baselineSigma:baselineSigma,shockScale:shockScale,"+
  "standardisedMove:standardisedMove,shockMagnitudeBucket:shockMagnitudeBucket,"+
  "shockCalNear:shockCalNear,detectShock:detectShock,shockWindow:shockWindow,"+
  "timeMatchedControl:timeMatchedControl})";
const {SHOCK,SHOCK_EDGES,SHOCK_LABELS,BASELINE,baselineSigma,shockScale,standardisedMove,
  shockMagnitudeBucket,shockCalNear,detectShock,shockWindow,timeMatchedControl}=vm.runInContext(SRC+EXPORTS,ctx,{filename:"code.js"});

/* the real table, copied from index.html line 880 -- passed in, never global */
const SEAS_REAL=[0.905,1.157,1.074,0.933,0.879,0.949,0.97,0.804,0.836,1.075,0.993,0.954,1.007,1.298,1.934,1.855,1.323,1.257,1.113,1.012,0.953,0.931,1.018,0.961];

let pass=0,fail=0;
function ok(name,cond,extra){ if(cond){pass++;console.log("  ok  "+name);}
  else {fail++;console.log("  FAIL "+name+(extra===undefined?"":"  -> "+JSON.stringify(extra)));} }
function eq(name,a,b){ ok(name,a===b,{got:a,want:b}); }
function close(name,a,b,tol){ ok(name,typeof a==="number"&&Math.abs(a-b)<=(tol||1e-12),{got:a,want:b}); }

/* ---- helpers to build bar arrays ---------------------------------------- */
const MIN=60000;
function bars(startKey,prices){ const keys=[]; for(let i=0;i<prices.length;i++) keys.push(startKey+i);
  return {keys:keys,closes:prices.slice()}; }
function flat(startKey,n,px){ const p=[]; for(let i=0;i<n;i++) p.push(px); return bars(startKey,p); }

console.log("\n-- standardisedMove ------------------------------------------");
{
  /* 10 flat bars then a jump on the last bar; window 5 min, sigma 0.001/min */
  const b=flat(1000,10,100000); b.closes[9]=100000*Math.exp(0.005);
  const now=(1009+1)*MIN+15000;              /* newest bar key 1009 = the minute just completed */
  const m=standardisedMove(b.keys,b.closes,now,5,0.001);
  ok("returns an object",m&&typeof m==="object");
  close("ret is the 5-minute log return",m.ret,0.005,1e-12);
  close("z = ret/(sig*sqrt(w))",m.z,0.005/(0.001*Math.sqrt(5)),1e-12);
  eq("windowMin echoed",m.windowMin,5);
  eq("k1 = newest key",m.k1,1009);
  eq("k0 = newest key - w",m.k0,1004);
  close("p0 is the bar w minutes back",m.p0,100000,0);
}
{
  const b=flat(1000,10,100000); b.closes[9]=100000*Math.exp(-0.005);
  const m=standardisedMove(b.keys,b.closes,1010*MIN,5,0.001);
  ok("a down move gives negative z",m.z<0,m);
  close("absZ is the unsigned size, computed independently",m.absZ,0.005/(0.001*Math.sqrt(5)),1e-12);
}
{
  /* scale invariance: doubling sigma halves z for the same move */
  const b=flat(2000,20,50000); b.closes[19]=50000*Math.exp(0.01);
  const a=standardisedMove(b.keys,b.closes,2020*MIN,10,0.002);
  const c=standardisedMove(b.keys,b.closes,2020*MIN,10,0.004);
  close("z halves when sigma doubles",c.z,a.z/2,1e-12);
}
{
  /* sqrt-time scaling: same total move over 4x the window has half the z */
  const b=flat(3000,30,100000); b.closes[29]=100000*Math.exp(0.004);
  const w1=standardisedMove(b.keys,b.closes,3030*MIN,4,0.001);
  const w4=standardisedMove(b.keys,b.closes,3030*MIN,16,0.001);
  close("z scales as 1/sqrt(windowMin)",w4.z,w1.z/2,1e-12);
}
console.log("");
{
  const b=flat(1000,10,100000);
  eq("null when sigPerMin is 0",standardisedMove(b.keys,b.closes,1010*MIN,5,0),null);
  eq("null when sigPerMin negative",standardisedMove(b.keys,b.closes,1010*MIN,5,-0.001),null);
  eq("null when sigPerMin NaN",standardisedMove(b.keys,b.closes,1010*MIN,5,NaN),null);
  eq("null when windowMin < 1",standardisedMove(b.keys,b.closes,1010*MIN,0,0.001),null);
  eq("null when windowMin NaN",standardisedMove(b.keys,b.closes,1010*MIN,NaN,0.001),null);
  eq("null when now not finite",standardisedMove(b.keys,b.closes,Infinity,5,0.001),null);
  eq("null when keys not an array",standardisedMove(null,b.closes,1010*MIN,5,0.001),null);
  eq("null when closes not an array",standardisedMove(b.keys,"x",1010*MIN,5,0.001),null);
  eq("null when too few bars (need w+1)",standardisedMove(b.keys,b.closes,1010*MIN,10,0.001),null);
  ok("exactly w+1 bars is enough",standardisedMove(b.keys,b.closes,1010*MIN,9,0.001)!==null);
}
{
  /* the 1-apart contiguity rule -- the same rule computeStats uses to refuse a sleep gap */
  const b=flat(1000,10,100000);
  b.keys[5]=b.keys[5]+3; for(let i=6;i<10;i++) b.keys[i]+=3;      /* a 3-minute gap mid-span */
  const now=(b.keys[9]+1)*MIN;
  eq("null when a gap sits inside the span",standardisedMove(b.keys,b.closes,now,5,0.001),null);
  ok("a shorter span clear of the gap still measures",standardisedMove(b.keys,b.closes,now,3,0.001)!==null);
}
{
  /* staleness: the newest bar must be the minute just completed (lag 0 or 1) */
  const b=flat(1000,10,100000);
  ok("lag 0 accepted (caller included the live bar)",standardisedMove(b.keys,b.closes,1009*MIN+30000,5,0.001)!==null);
  ok("lag 1 accepted (barsExcludingCurrent shape)",standardisedMove(b.keys,b.closes,1010*MIN+30000,5,0.001)!==null);
  eq("lag 2 rejected as stale",standardisedMove(b.keys,b.closes,1011*MIN,5,0.001),null);
  eq("newest bar in the future rejected",standardisedMove(b.keys,b.closes,1008*MIN,5,0.001),null);
  eq("STALE_MAX_MIN is the documented 1",SHOCK.STALE_MAX_MIN,1);
}
{
  const b=flat(1000,10,100000); b.closes[4]=0;
  eq("null on a zero price in the span",standardisedMove(b.keys,b.closes,1010*MIN,9,0.001),null);
  const b2=flat(1000,10,100000); b2.closes[4]=NaN;
  eq("null on a NaN bar inside the span",standardisedMove(b2.keys,b2.closes,1010*MIN,9,0.001),null);
  ok("a span clear of the corrupt bar still measures",standardisedMove(b2.keys,b2.closes,1010*MIN,4,0.001)!==null);
  const c=flat(1000,10,100000); c.closes[9]=-1;
  eq("null on a negative price",standardisedMove(c.keys,c.closes,1010*MIN,5,0.001),null);
  const d=flat(1000,10,100000); d.closes[9]=NaN;
  eq("null on a NaN price",standardisedMove(d.keys,d.closes,1010*MIN,5,0.001),null);
}
{
  /* NOT circular: z depends on the move and on the scale, never on a vol forecast being tested.
     Identical price paths at identical scale give identical z regardless of clock hour. */
  const b=flat(1000,10,100000); b.closes[9]=100000*Math.exp(0.003);
  const a1=standardisedMove(b.keys,b.closes,1010*MIN,5,0.001);
  const c=flat(100000,10,100000); c.closes[9]=100000*Math.exp(0.003);
  const a2=standardisedMove(c.keys,c.closes,100010*MIN,5,0.001);
  close("z has no hidden time-of-day/forecast term",a1.z,a2.z,1e-15);
}

console.log("\n-- baselineSigma (D1: the scale must exclude the move) --------");
/* alternating +/-s one-minute log returns: RMS is exactly s, so the expected sigma is known exactly */
function wobble(startKey,n,px,s){ const p=[px];
  for(let i=1;i<n;i++) p.push(p[i-1]*Math.exp(i%2?s:-s)); return bars(startKey,p); }
const S0=0.0004;                       /* 0.04%/min -- the tape's own order of magnitude */
function shocked(m){ const b=wobble(1000,200,100000,S0);
  if(m!==0) b.closes[199]=b.closes[198]*Math.exp(m); return b; }
const NOWB=(1199+1)*MIN+15000;
/* computeStats()' own arithmetic (index.html:862), reproduced here to show what the OLD recommended
   sources actually do to z. These are the contaminated scales; they are never used as a fixture. */
function retsOf(b){ const r=[]; for(let i=1;i<b.closes.length;i++) r.push(Math.log(b.closes[i]/b.closes[i-1])); return r; }
function contamRv60(b){ const r60=retsOf(b).slice(-60);
  return Math.sqrt(r60.reduce((x,y)=>x+y*y,0)/r60.length); }
function contamSig(b){ const rWin=retsOf(b).slice(-240);
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length, m0=mean(rWin);
  let v=mean(rWin.map(x=>(x-m0)*(x-m0)))||1e-10;
  const L=0.94; for(const x of rWin) v=L*v+(1-L)*x*x;
  return Math.sqrt(Math.max(v,1e-12)); }
{
  const b=shocked(0);
  const base=baselineSigma(b.keys,b.closes,NOWB,1);
  ok("returns an object",base&&typeof base==="object");
  close("sigma is the RMS of the lagged returns",base.sigPerMin,S0,1e-15);
  eq("lagged flag is set",base.lagged,true);
  eq("lookback defaults to BASELINE.LOOKBACK_MIN",base.lookbackMin,BASELINE.LOOKBACK_MIN);
  eq("gap defaults to BASELINE.GAP_MIN",base.gapMin,BASELINE.GAP_MIN);
  eq("one return per lookback minute",base.nRet,60);
  eq("the sample ENDS before the measured span",base.kTo,base.kSpanFrom-BASELINE.GAP_MIN);
  eq("the sample starts lookback minutes before that",base.kFrom,base.kTo-60);
  ok("the sample never reaches the measured span",base.kTo<base.kSpanFrom);
  eq("provenance names the estimator for the ledger row",base.source,"baselineSigma");
}
{
  /* the exclusion, stated as an experiment: a 15% jump on the measured bar must not move sigma at all */
  const quiet=shocked(0),loud=shocked(0.15);
  const bq=baselineSigma(quiet.keys,quiet.closes,NOWB,1),bl=baselineSigma(loud.keys,loud.closes,NOWB,1);
  eq("the measured move does not enter its own denominator",bl.sigPerMin,bq.sigPerMin);
  /* the gap: corrupting the span's anchor bar is also excluded at GAP_MIN=1, but not at gapMin=0 */
  const anchor=shocked(0); anchor.closes[198]=anchor.closes[197]*Math.exp(0.15);
  const g1=baselineSigma(anchor.keys,anchor.closes,NOWB,1,60,1);
  const g0=baselineSigma(anchor.keys,anchor.closes,NOWB,1,60,0);
  eq("gapMin=1 also excludes the bar anchoring p0",g1.sigPerMin,bq.sigPerMin);
  ok("gapMin=0 does not (this is what the gap buys)",g0.sigPerMin>bq.sigPerMin*2,
     {g0:g0.sigPerMin,base:bq.sigPerMin});
  /* a wider measured window pushes the whole sample further back */
  const w10=baselineSigma(quiet.keys,quiet.closes,NOWB,10);
  eq("the sample lags the span for any windowMin",w10.kTo,w10.kSpanFrom-BASELINE.GAP_MIN);
  ok("a 10-minute span sees an earlier sample than a 1-minute span",w10.kTo<bq.kTo);
}
{
  const b=shocked(0);
  eq("null when there are not enough lagged bars",baselineSigma(b.keys.slice(-40),b.closes.slice(-40),NOWB,1),null);
  eq("null on a stale tape (same gate as standardisedMove)",baselineSigma(b.keys,b.closes,1203*MIN,1),null);
  eq("null when the newest bar is in the future",baselineSigma(b.keys,b.closes,1198*MIN,1),null);
  eq("null on a non-finite now",baselineSigma(b.keys,b.closes,NaN,1),null);
  eq("null on windowMin < 1",baselineSigma(b.keys,b.closes,NOWB,0),null);
  eq("null on a non-array",baselineSigma(null,b.closes,NOWB,1),null);
  eq("null on lookbackMin < 2",baselineSigma(b.keys,b.closes,NOWB,1,1),null);
  eq("null on a negative gapMin",baselineSigma(b.keys,b.closes,NOWB,1,60,-1),null);
  eq("null on a non-finite lookbackMin",baselineSigma(b.keys,b.closes,NOWB,1,NaN),null);
  const flatb=flat(1000,200,100000);
  eq("a perfectly flat baseline gives NO scale rather than an infinite z",
     baselineSigma(flatb.keys,flatb.closes,NOWB,1),null);
  /* gaps inside the sample are dropped, not measured through; too few survivors -> null */
  const holed=shocked(0); for(let i=140;i<200;i++) holed.keys[i]+=(i-139)*2;  /* every step 3 apart */
  eq("a sample full of gaps refuses rather than guessing on the survivors",
     baselineSigma(holed.keys,holed.closes,(holed.keys[199]+1)*MIN,1),null);
  const oneHole=shocked(0); for(let i=160;i<200;i++) oneHole.keys[i]+=3;
  const oh=baselineSigma(oneHole.keys,oneHole.closes,(oneHole.keys[199]+1)*MIN,1);
  ok("one gap inside the sample drops exactly that return",oh!==null&&oh.nRet===59,oh&&oh.nRet);
  close("...and does not measure the gap as a 1-minute return",oh.sigPerMin,S0,1e-15);
}
{
  /* D1 REGRESSION. The old NOTES recommended stats.rv60 / stats.sig raw. Both cap z at a ceiling that
     is independent of the move; the pre-registered tail buckets then cannot be populated honestly. */
  const CEIL_RV=Math.sqrt(60), CEIL_EWMA=1/Math.sqrt(1-0.94);
  const zOf=(m,scale)=>{ const b=shocked(m); return standardisedMove(b.keys,b.closes,NOWB,1,scale).z; };
  const lag=m=>{ const b=shocked(m); return standardisedMove(b.keys,b.closes,NOWB,1,
                   baselineSigma(b.keys,b.closes,NOWB,1)); };
  const rv=m=>{ const b=shocked(m); return zOf(m,contamRv60(b)); };
  const ew=m=>{ const b=shocked(m); return zOf(m,contamSig(b)); };
  close("lagged z is exactly move/sigma for a 1% jump",lag(0.01).z,0.01/S0,1e-9);
  ok("lagged z clears the rv60 ceiling",lag(0.01).absZ>CEIL_RV,{z:lag(0.01).z,ceil:CEIL_RV});
  ok("lagged z clears it by >40x on a 15% jump",lag(0.15).absZ>40*CEIL_RV,{z:lag(0.15).z});
  ok("contaminated rv60 z is stuck under sqrt(60) even at 15%",rv(0.15)<CEIL_RV,{z:rv(0.15)});
  ok("contaminated EWMA z is stuck under 1/sqrt(0.06) even at 15%",ew(0.15)<CEIL_EWMA+1e-9,{z:ew(0.15)});
  /* proportionality is the property the ceiling destroys (shocked() sets the log return exactly,
     so a 0.15 log move is exactly 15x a 0.01 one) */
  close("lagged z scales with the move (15x bigger move, 15x bigger z)",
        lag(0.15).absZ/lag(0.01).absZ,15,1e-9);
  ok("contaminated rv60 cannot tell a 1% move from a 15% one",rv(0.15)/rv(0.01)<1.06,
     {ratio:rv(0.15)/rv(0.01),truth:15});
  ok("contaminated EWMA cannot either",ew(0.15)/ew(0.01)<1.06,{ratio:ew(0.15)/ew(0.01)});
  /* the consequence for the pre-registered buckets */
  eq("under the EWMA scale a 15% one-minute move never reaches the top bucket",
     shockMagnitudeBucket(Math.abs(ew(0.15))).label==="z6+",false);
  eq("with the lagged baseline it does",shockMagnitudeBucket(lag(0.15).absZ).label,"z6+");
  eq("...and so does a mere 0.25% move, which is what z6+ is supposed to mean",
     shockMagnitudeBucket(lag(0.0025).absZ).label,"z6+");
  ok("the tail is ordered again: a 15% move outranks a 1% move by a wide margin",
     lag(0.15).absZ>10*lag(0.01).absZ);
}
{
  /* the scale's provenance must land on the row */
  const b=shocked(0.01);
  const base=baselineSigma(b.keys,b.closes,NOWB,1);
  const m=standardisedMove(b.keys,b.closes,NOWB,1,base);
  eq("a baselineSigma result is tagged lagged on the move row",m.sigLagged,true);
  eq("the scale used is echoed",m.sigPerMin,base.sigPerMin);
  eq("the whole baseline record travels with the row",m.sigMeta,base);
  const n=standardisedMove(b.keys,b.closes,NOWB,1,S0);
  eq("a bare number is accepted but tagged NOT lagged",n.sigLagged,false);
  eq("...with no baseline record",n.sigMeta,null);
  close("...and gives the same z for the same scale",n.z/m.z,1,1e-9);
  eq("null when a scale object carries no usable sigma",standardisedMove(b.keys,b.closes,NOWB,1,{}),null);
  eq("null when a scale object carries a negative sigma",
     standardisedMove(b.keys,b.closes,NOWB,1,{sigPerMin:-1,lagged:true}),null);
  eq("null when the scale is a string",standardisedMove(b.keys,b.closes,NOWB,1,"0.001"),null);
  eq("shockScale refuses a null scale",shockScale(null),null);
  eq("shockScale does not claim lagged for a bare number",shockScale(0.001).lagged,false);
  /* the exclusion is enforced at the point of use, not merely trusted to the caller */
  const wide=baselineSigma(b.keys,b.closes,NOWB,1);          /* sample lagged for a 1-minute span */
  eq("a baseline built for a shorter span is REFUSED on a longer one",
     standardisedMove(b.keys,b.closes,NOWB,10,wide),null);
  const right=baselineSigma(b.keys,b.closes,NOWB,10);
  ok("...and the matching baseline measures it",standardisedMove(b.keys,b.closes,NOWB,10,right)!==null);
  ok("a hand-built scale object whose sample overlaps the span is refused",
     standardisedMove(b.keys,b.closes,NOWB,1,{sigPerMin:S0,lagged:true,kTo:1199})===null);
  ok("...while one that clears it is accepted",
     standardisedMove(b.keys,b.closes,NOWB,1,{sigPerMin:S0,lagged:true,kTo:1100})!==null);
}

console.log("\n-- shockMagnitudeBucket --------------------------------------");
{
  eq("edges are the pre-registered [2,3,4,6]",SHOCK_EDGES.join(","),"2,3,4,6");
  eq("labels count matches edges+1",SHOCK_LABELS.length,SHOCK_EDGES.length+1);
  eq("0 -> bucket 0",shockMagnitudeBucket(0).i,0);
  eq("1.999 -> bucket 0",shockMagnitudeBucket(1.999).i,0);
  eq("2 -> bucket 1 (lower-inclusive)",shockMagnitudeBucket(2).i,1);
  eq("2.9 -> bucket 1",shockMagnitudeBucket(2.9).i,1);
  eq("3 -> bucket 2",shockMagnitudeBucket(3).i,2);
  eq("4 -> bucket 3",shockMagnitudeBucket(4).i,3);
  eq("5.999 -> bucket 3",shockMagnitudeBucket(5.999).i,3);
  eq("6 -> bucket 4 (open tail)",shockMagnitudeBucket(6).i,4);
  eq("40 -> bucket 4",shockMagnitudeBucket(40).i,4);
  eq("label of the tail",shockMagnitudeBucket(9).label,"z6+");
  eq("tail hi is null (open)",shockMagnitudeBucket(9).hi,null);
  eq("tail lo is the last edge",shockMagnitudeBucket(9).lo,6);
  eq("bucket 0 lo is 0",shockMagnitudeBucket(0.5).lo,0);
  eq("bucket 2 hi",shockMagnitudeBucket(3.5).hi,4);
  /* the tail must survive bucketing: 4-6 and 6+ are distinct, not one ">=4" */
  ok("z=5 and z=8 are NOT the same bucket",shockMagnitudeBucket(5).i!==shockMagnitudeBucket(8).i);
  ok("labels are unique",new Set(SHOCK_LABELS).size===SHOCK_LABELS.length);
  /* monotone ordinal */
  let mono=true,prev=-1;
  for(let v=0;v<10;v+=0.05){ const i=shockMagnitudeBucket(v).i; if(i<prev) mono=false; prev=i; }
  ok("bucket index is monotone non-decreasing in absZ",mono);
  eq("null on a negative absZ",shockMagnitudeBucket(-1),null);
  eq("null on NaN",shockMagnitudeBucket(NaN),null);
  eq("null on non-number",shockMagnitudeBucket("3"),null);
  eq("null on undefined",shockMagnitudeBucket(undefined),null);
}

console.log("\n-- detectShock -----------------------------------------------");
{
  const quiet={ev:null,evMins:null,evTier:null};
  const r=detectShock({calendarTag:quiet,z:4.2,k:3});
  eq("phase 2 fires above k",r.phase,2);
  eq("phase 2 shock true",r.shock,true);
  eq("phase 2 source",r.source,"endogenous");
  close("z passed through",r.z,4.2,0);
  eq("mag bucketed",r.mag.label,"z4-6");
  const s=detectShock({calendarTag:quiet,z:-4.2,k:3});
  eq("phase 2 fires on a negative move of the same size",s.phase,2);
  eq("mag uses |z|",s.mag.label,"z4-6");
  const t=detectShock({calendarTag:quiet,z:2.999,k:3});
  eq("just below k does not fire",t.shock,false);
  eq("no-shock phase is null",t.phase,null);
  eq("no-shock source is null",t.source,null);
  eq("no-shock mag is null (a bucket would read as a shock size)",t.mag,null);
  close("z still reported when nothing fires",t.z,2.999,0);
  eq("exactly k fires (>= not >)",detectShock({calendarTag:quiet,z:3,k:3}).phase,2);
}
{
  /* phase 1 precedence -- does not look at z at all */
  const tag={ev:"NFP",evMins:-3,evTier:1};
  const a=detectShock({calendarTag:tag,z:0.1,k:3});
  eq("a quiet scheduled release is still a phase-1 shock",a.shock,true);
  eq("phase recorded as 1",a.phase,1);
  eq("source is the event name",a.source,"NFP");
  eq("phase-1 mag still bucketed from |z|",a.mag.label,"z<2");
  const b=detectShock({calendarTag:tag,z:9,k:3});
  eq("a big move ON a release is phase 1, not 2",b.phase,1);
  eq("...and is not relabelled endogenous",b.source,"NFP");
  const c=detectShock({calendarTag:tag,z:null,k:3});
  eq("phase 1 fires with no z measurement at all",c.phase,1);
  eq("...with mag null rather than invented",c.mag,null);
  eq("...and z null",c.z,null);
}
{
  const far={ev:"CLAIMS",evMins:-240,evTier:2};
  const a=detectShock({calendarTag:far,z:5,k:3});
  eq("a release 4h away does not claim the move",a.phase,2);
  eq("...it is endogenous",a.source,"endogenous");
  const b=detectShock({calendarTag:far,z:0.2,k:3});
  eq("a far release with no move is no shock",b.shock,false);
  eq("boundary: exactly CAL_NEAR_MIN before counts",
     detectShock({calendarTag:{ev:"X",evMins:15},z:0.1}).phase,1);
  eq("boundary: exactly CAL_NEAR_MIN after counts",
     detectShock({calendarTag:{ev:"X",evMins:-15},z:0.1}).phase,1);
  eq("one minute beyond does not",
     detectShock({calendarTag:{ev:"X",evMins:-16},z:0.1}).shock,false);
  eq("caller can widen the proximity gate",
     detectShock({calendarTag:{ev:"X",evMins:-40},z:0.1,calNearMin:60}).phase,1);
}
{
  eq("bare string tag is accepted as an event name",detectShock({calendarTag:"CPI",z:0.1}).source,"CPI");
  eq("empty string is not an event",detectShock({calendarTag:"",z:5}).phase,2);
  eq("null tag -> phase 2 path",detectShock({calendarTag:null,z:5}).phase,2);
  eq("undefined tag -> phase 2 path",detectShock({calendarTag:undefined,z:5}).phase,2);
  eq("{name,mins} row shape also works",detectShock({calendarTag:{name:"NFP",mins:2},z:0.1}).source,"NFP");
  eq("named event with unusable distance resolves to phase 1 (conservative)",
     detectShock({calendarTag:{ev:"NFP",evMins:null},z:9}).phase,1);
  eq("shockCalNear returns null for a quiet tag",shockCalNear({ev:null,evMins:null},15),null);
  eq("shockCalNear returns null for a non-object",shockCalNear(7,15),null);
}
{
  eq("k defaults to the pre-registered K_DEFAULT",SHOCK.K_DEFAULT,3);
  eq("missing k uses the default",detectShock({calendarTag:null,z:3}).phase,2);
  eq("missing k: below default does not fire",detectShock({calendarTag:null,z:2.9}).shock,false);
  eq("k<=0 is refused and falls back to the default",detectShock({calendarTag:null,z:1}).shock,
     detectShock({calendarTag:null,z:1,k:0}).shock);
  eq("k NaN falls back to the default",detectShock({calendarTag:null,z:2.9,k:NaN}).shock,false);
  eq("z NaN cannot fire phase 2",detectShock({calendarTag:null,z:NaN,k:3}).shock,false);
  eq("z Infinity cannot fire phase 2",detectShock({calendarTag:null,z:Infinity,k:3}).shock,false);
  eq("z missing entirely -> z null",detectShock({calendarTag:null}).z,null);
  eq("no opts at all is safe",detectShock().shock,false);
  eq("no opts: phase null",detectShock().phase,null);
  const keys=Object.keys(detectShock({calendarTag:null,z:1})).sort().join(",");
  eq("return shape is exactly the six contracted keys",keys,"mag,magLabel,phase,shock,source,z");
}
{
  /* the phases must be distinguishable in every fired result -- never pooled silently */
  const rows=[detectShock({calendarTag:{ev:"NFP",evMins:0},z:5}),
              detectShock({calendarTag:null,z:5})];
  ok("every fired row carries a phase",rows.every(r=>r.shock&&(r.phase===1||r.phase===2)));
  ok("the two phases are distinguishable",rows[0].phase!==rows[1].phase);
}

{
  /* D2: an omitted nearMin used to make the comparison `Math.abs(m)<=undefined` -> false, silently
     discarding a release happening RIGHT NOW and filing the move as endogenous -- the one direction
     this helper exists to prevent. It must fall back to the pre-registered gate. */
  eq("D2: nearMin omitted keeps a release happening now",shockCalNear({ev:"NFP",evMins:0}),"NFP");
  eq("D2: nearMin omitted keeps one at the pre-registered boundary",shockCalNear({ev:"NFP",evMins:-15}),"NFP");
  eq("D2: nearMin omitted still excludes one beyond it",shockCalNear({ev:"NFP",evMins:16}),null);
  eq("D2: a garbage nearMin falls back to the default, not to 'discard'",
     shockCalNear({ev:"NFP",evMins:0},"x"),"NFP");
  eq("D2: a negative nearMin falls back to the default",shockCalNear({ev:"NFP",evMins:0},-5),"NFP");
  eq("D2: NaN nearMin falls back to the default",shockCalNear({name:"CPI",mins:2},NaN),"CPI");
  eq("D2: an explicit 0 gate is honoured, not replaced",shockCalNear({ev:"NFP",evMins:1},0),null);
  eq("D2: ...and admits the exact stamp",shockCalNear({ev:"NFP",evMins:0},0),"NFP");
}
{
  /* D3: mag is null on a fired row whenever z could not be measured -- routine after a backgrounded
     tab. No bucket is fabricated, but a 1 Hz render/CSV path needs a field it can read unguarded. */
  const r=detectShock({calendarTag:"CPI",z:null});
  eq("D3: still refuses to fabricate a bucket",r.mag,null);
  eq("D3: magLabel is the unmeasured sentinel",r.magLabel,SHOCK.MAG_UNMEASURED);
  eq("D3: a no-shock row is labelled none, not a bucket",detectShock({calendarTag:null,z:1}).magLabel,SHOCK.MAG_NONE);
  eq("D3: a fired row with a measured z carries its real bucket label",
     detectShock({calendarTag:null,z:5}).magLabel,"z4-6");
  eq("D3: a phase-1 row with a measured z carries its label too",
     detectShock({calendarTag:{ev:"NFP",evMins:0},z:0.4}).magLabel,"z<2");
  ok("D3: neither sentinel can be mistaken for a real bucket",
     SHOCK_LABELS.indexOf(SHOCK.MAG_UNMEASURED)===-1&&SHOCK_LABELS.indexOf(SHOCK.MAG_NONE)===-1);
  const rows=[detectShock(),detectShock({calendarTag:null,z:NaN}),detectShock({calendarTag:"CPI"}),
              detectShock({calendarTag:"CPI",z:null}),detectShock({calendarTag:null,z:7}),
              detectShock({calendarTag:{ev:"NFP",evMins:0},z:null})];
  ok("D3: magLabel is a non-empty string on every path",
     rows.every(x=>typeof x.magLabel==="string"&&x.magLabel.length>0));
  ok("D3: mag is either null or a full bucket -- never half-built",
     rows.every(x=>x.mag===null||(typeof x.mag.label==="string"&&typeof x.mag.i==="number")));
  /* end to end: a stale tape (the resumed-tab case) really does produce this row */
  const b=flat(1000,10,100000);
  const m=standardisedMove(b.keys,b.closes,1011*MIN,5,0.001);
  eq("D3: a stale tape refuses to measure",m,null);
  const live=detectShock({calendarTag:"CPI",z:m===null?null:m.z});
  eq("D3: the release is still recorded as a shock",live.shock,true);
  eq("D3: ...with an unmeasured size rather than an invented one",live.magLabel,SHOCK.MAG_UNMEASURED);
}

console.log("\n-- shockWindow -----------------------------------------------");
{
  const t0=1757000000000;
  eq("at the shock instant, in window",shockWindow(t0,t0,30).inWindow,true);
  close("minsSince 0 at the instant",shockWindow(t0,t0,30).minsSince,0,0);
  eq("mid-window",shockWindow(t0,t0+10*MIN,30).inWindow,true);
  close("minsSince mid-window",shockWindow(t0,t0+10*MIN,30).minsSince,10,1e-12);
  eq("exact end is OUT (half-open [0,len))",shockWindow(t0,t0+30*MIN,30).inWindow,false);
  eq("one ms before the end is in",shockWindow(t0,t0+30*MIN-1,30).inWindow,true);
  eq("before the shock is out",shockWindow(t0,t0-1,30).inWindow,false);
  ok("minsSince is signed before the shock",shockWindow(t0,t0-5*MIN,30).minsSince<0);
  close("fractional minutes preserved",shockWindow(t0,t0+90000,30).minsSince,1.5,1e-12);
  eq("lenMin defaults to WINDOW_MIN",shockWindow(t0,t0+29*MIN).inWindow,true);
  eq("...and excludes beyond it",shockWindow(t0,t0+31*MIN).inWindow,false);
  eq("WINDOW_MIN is the documented 30",SHOCK.WINDOW_MIN,30);
  eq("lenMin 0 admits nothing",shockWindow(t0,t0,0).inWindow,false);
  eq("negative lenMin admits nothing",shockWindow(t0,t0,-5).inWindow,false);
  eq("NaN shockT -> out, minsSince null",shockWindow(NaN,t0,30).minsSince,null);
  eq("NaN nowT -> out",shockWindow(t0,NaN,30).inWindow,false);
  eq("non-number inputs -> out",shockWindow("a","b",30).inWindow,false);
  /* tiling: consecutive 30m windows never double-count a row */
  const a=shockWindow(t0,t0+30*MIN,30).inWindow,b=shockWindow(t0+30*MIN,t0+30*MIN,30).inWindow;
  ok("adjacent windows tile without overlap",a===false&&b===true);
}

console.log("\n-- timeMatchedControl ----------------------------------------");
{
  /* 2026-09-06T12:37:00Z is a Sunday */
  const t=Date.UTC(2026,8,6,12,37,0);
  const c=timeMatchedControl(t,SEAS_REAL);
  eq("hourUTC",c.hourUTC,12);
  eq("minuteUTC",c.minuteUTC,37);
  eq("weekday (0=Sun, UTC)",c.weekday,0);
  eq("slot15 = h*4 + floor(min/15)",c.slot15,12*4+2);
  close("seas is the table value for that UTC hour",c.seas,1.007,0);
  const d=timeMatchedControl(Date.UTC(2026,8,3,14,0,0),SEAS_REAL);  /* Thursday */
  eq("weekday Thursday",d.weekday,4);
  close("seas at the 14 UTC peak",d.seas,1.934,0);
  eq("slot15 at the top of the hour",d.slot15,56);
  eq("slot15 range low",timeMatchedControl(Date.UTC(2026,0,1,0,0,0),SEAS_REAL).slot15,0);
  eq("slot15 range high",timeMatchedControl(Date.UTC(2026,0,1,23,59,0),SEAS_REAL).slot15,95);
}
{
  /* the confound this control exists to remove: the same 08:30 ET release lands in two different
     UTC hours across DST, and those hours sit on very different points of the seasonal curve. */
  const summer=timeMatchedControl(Date.UTC(2026,8,4,12,30,0),SEAS_REAL);  /* 08:30 EDT */
  const winter=timeMatchedControl(Date.UTC(2026,11,4,13,30,0),SEAS_REAL); /* 08:30 EST */
  eq("summer release hour",summer.hourUTC,12);
  eq("winter release hour",winter.hourUTC,13);
  ok("the same release sits on different seasonal factors",summer.seas!==winter.seas);
  ok("the seasonal difference is material (>25%)",Math.abs(winter.seas/summer.seas-1)>0.25,
     {summer:summer.seas,winter:winter.seas});
  /* 12 -> 14 UTC ramp quoted in the code comment */
  close("SEAS 12 UTC",SEAS_REAL[12],1.007,0);
  close("SEAS 13 UTC (the winter slot quoted in the comment)",SEAS_REAL[13],1.298,0);
  close("SEAS 14 UTC",SEAS_REAL[14],1.934,0);
  /* N1: the DST slide is 12 -> 13 UTC, which is what the code comment must say */
  close("the DST slide is one hour, 12 -> 13 UTC",winter.hourUTC-summer.hourUTC,1,0);
  close("the factors of those two slots differ by ~29%",SEAS_REAL[13]/SEAS_REAL[12]-1,0.289,0.01);
}
{
  eq("null t -> null",timeMatchedControl(NaN,SEAS_REAL),null);
  eq("non-number t -> null",timeMatchedControl("x",SEAS_REAL),null);
  const c=timeMatchedControl(Date.UTC(2026,8,6,12,0,0));
  eq("no table: seas null rather than a global read",c.seas,null);
  eq("no table: clock fields still returned",c.hourUTC,12);
  eq("short table refused",timeMatchedControl(Date.UTC(2026,8,6,12,0,0),[1,2,3]).seas,null);
  eq("table with a bad entry refused for that hour",
     timeMatchedControl(Date.UTC(2026,8,6,12,0,0),SEAS_REAL.map((v,i)=>i===12?"x":v)).seas,null);
  ok("a substitute table is honoured (no global)",
     timeMatchedControl(Date.UTC(2026,8,6,12,0,0),SEAS_REAL.map(()=>7)).seas===7);
}

console.log("\n-- purity ----------------------------------------------------");
{
  ok("code.js contains no DOM/storage/network/timer reference",
     !/document|localStorage|fetch\(|setTimeout|setInterval|window\./.test(SRC));
  ok("code.js is pure ASCII",[...SRC].every(ch=>ch.charCodeAt(0)<=126));
  const CODE=SRC.replace(/\/\*[\s\S]*?\*\//g,"");   /* comments stripped */
  ok("no SEAS/TERM/SWING/SIM global is referenced in live code",!/\b(SEAS|TERM|SWING|SIM|SIM_ARMS|S)\b/.test(CODE));
  ok("no page helper is called in live code",
     !/\b(clamp|normCdf|invNorm|randn|quantile|mulberry|bootstrapCI|termFactor|calSigma|computeStats|hourStart|tapeAt|idxAt|priceAtSrc|barsExcludingCurrent)\s*\(/.test(CODE));
}

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
