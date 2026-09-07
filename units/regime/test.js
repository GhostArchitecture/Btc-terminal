/* standalone test for the regime unit: node test.js
   code.js is evaluated in a vm context whose page helpers are THROWERS/PROXIES: the unit must be pure
   arithmetic over a caller-supplied array, with no reach into S, storage, the DOM, or any page helper.
   Any accidental use fails loudly, exactly as units/detect/test.js proves the same thing for detect. */
"use strict";
const fs=require("fs"), vm=require("vm"), path=require("path");
const src=fs.readFileSync(path.join(__dirname,"code.js"),"utf8");
const thrower=n=>()=>{throw new Error("unit reached for page helper: "+n);};
const ctx={console:console,Math:Math,Date:Date,Array:Array,Number:Number,isFinite:isFinite,
  Object:Object,JSON:JSON,String:String,
  clamp:thrower("clamp"),normCdf:thrower("normCdf"),invNorm:thrower("invNorm"),randn:thrower("randn"),
  quantile:thrower("quantile"),mulberry:thrower("mulberry"),bootstrapCI:thrower("bootstrapCI"),
  calSigma:thrower("calSigma"),hourStart:thrower("hourStart"),
  S:new Proxy({},{get(){throw new Error("unit touched global S");}}),
  document:new Proxy({},{get(){throw new Error("unit touched the DOM");}}),
  localStorage:new Proxy({},{get(){throw new Error("unit touched localStorage");}}),
  fetch:thrower("fetch"),setTimeout:thrower("setTimeout"),setInterval:thrower("setInterval")};
vm.createContext(ctx);
vm.runInContext(src,ctx,{filename:"code.js"});
const EXPORTS="\n;({REGIME_T_MIN:REGIME_T_MIN,REGIME_T_MAX:REGIME_T_MAX,"+
  "REGIME_T_FUTURE_SLACK_MS:REGIME_T_FUTURE_SLACK_MS,REGIME_CATEGORIES:REGIME_CATEGORIES,"+
  "REGIME_KINDS:REGIME_KINDS,REGIME_FLAG_MIN_TRAILING:REGIME_FLAG_MIN_TRAILING,"+
  "REGIME_FLAG_PCTL:REGIME_FLAG_PCTL,regimeValidTime:regimeValidTime,"+
  "regimeEntryFault:regimeEntryFault,regimeStructurallyValid:regimeStructurallyValid,"+
  "regimeSupersededIds:regimeSupersededIds,regimeRegistryFaults:regimeRegistryFaults,"+
  "regimeBoundaries:regimeBoundaries,regimeAt:regimeAt,sameRegime:sameRegime,"+
  "regimeSpent:regimeSpent,regimeFlagInputFault:regimeFlagInputFault,"+
  "regimePercentileRank:regimePercentileRank,regimeFlagCandidate:regimeFlagCandidate})";
const L=vm.runInContext(EXPORTS,ctx,{filename:"code.js"});
const {REGIME_T_MIN,REGIME_T_MAX,REGIME_T_FUTURE_SLACK_MS,REGIME_CATEGORIES,REGIME_KINDS,
  REGIME_FLAG_MIN_TRAILING,REGIME_FLAG_PCTL,regimeValidTime,regimeEntryFault,
  regimeStructurallyValid,regimeSupersededIds,regimeRegistryFaults,regimeBoundaries,regimeAt,
  sameRegime,regimeSpent,regimeFlagInputFault,regimePercentileRank,regimeFlagCandidate}=L;

let pass=0,fail=0;
function ok(name,cond,extra){ if(cond){pass++;} else {fail++;console.log("  FAIL "+name+(extra===undefined?"":"  -> "+JSON.stringify(extra)));} }
function eq(name,a,b){ ok(name,a===b,{got:a,want:b}); }
function threw(fn){ try{ fn(); return null; }catch(e){ return e; } }
function threwName(fn){ const e=threw(fn); return e===null?null:e.name; }
const U=Date.UTC;

/* ---- fixture: a clean, hand-derived three-boundary regime history --------------------------------
   Three declared breaks at t=1000, 2000, 3000 (well inside the plausible range, offset from
   REGIME_T_MIN so REGIME_T_FUTURE_SLACK_MS arithmetic on declaredAt stays inside range too).
   Boundary reads, by hand:
     t <  1000                -> regime 0
     t == 1000                -> regime 1   (the break's own instant is already the new regime)
     1000 < t < 2000          -> regime 1
     t == 2000                -> regime 2
     2000 < t < 3000          -> regime 2
     t == 3000                -> regime 3
     t >  3000                -> regime 3                                                          */
const T0=REGIME_T_MIN+10*86400000; /* an arbitrary in-range anchor so all fixture t's are plausible */
function dt(off){ return T0+off; }
function declared(id,off,category,reason,extra){
  const e={id:id,kind:"declared",t:dt(off),category:category||"other",reason:reason||("why "+id),declaredAt:dt(off)};
  if(extra) for(const k in extra) e[k]=extra[k];
  return e;
}
function flagged(id,off,metric,extra){
  const e={id:id,kind:"flagged",t:dt(off),declaredAt:dt(off),metric:metric||{name:"rv_trailing_pctl",value:1,percentile:99}};
  if(extra) for(const k in extra) e[k]=extra[k];
  return e;
}
const FIX=[declared("b1",1000,"price-collapse","first"),
           declared("b2",2000,"price-parabola","second"),
           declared("b3",3000,"exchange-failure","third")];

/* ============================================================ 1. regimeEntryFault: single-entry shape */
eq("valid declared entry passes",regimeEntryFault(declared("x",0)),null);
eq("valid flagged entry passes",regimeEntryFault(flagged("x",0)),null);
ok("not an object",typeof regimeEntryFault(null)==="string");
ok("missing id",typeof regimeEntryFault(Object.assign({},declared("x",0),{id:undefined}))==="string");
ok("empty id",typeof regimeEntryFault(declared("",0))==="string");
ok("bad kind",typeof regimeEntryFault(Object.assign({},declared("x",0),{kind:"maybe"}))==="string");
ok("non-numeric t",typeof regimeEntryFault(Object.assign({},declared("x",0),{t:"1000"}))==="string");
ok("NaN t",typeof regimeEntryFault(Object.assign({},declared("x",0),{t:NaN}))==="string");
ok("t before REGIME_T_MIN",typeof regimeEntryFault(Object.assign({},declared("x",0),{t:REGIME_T_MIN-1,declaredAt:REGIME_T_MIN-1}))==="string");
ok("t after REGIME_T_MAX",typeof regimeEntryFault(Object.assign({},declared("x",0),{t:REGIME_T_MAX+1,declaredAt:REGIME_T_MAX+1}))==="string");
ok("missing declaredAt",typeof regimeEntryFault(Object.assign({},declared("x",0),{declaredAt:undefined}))==="string");
ok("declaredAt out of range",typeof regimeEntryFault(Object.assign({},declared("x",0),{declaredAt:REGIME_T_MAX+1}))==="string");
ok("t within future slack is fine",regimeEntryFault({id:"x",kind:"declared",category:"other",reason:"r",
  t:dt(0)+REGIME_T_FUTURE_SLACK_MS,declaredAt:dt(0)})===null);
ok("t just past future slack rejected",typeof regimeEntryFault({id:"x",kind:"declared",category:"other",
  reason:"r",t:dt(0)+REGIME_T_FUTURE_SLACK_MS+1,declaredAt:dt(0)})==="string");
ok("bad category",typeof regimeEntryFault(declared("x",0,"typo-category"))==="string");
ok("empty reason",typeof regimeEntryFault(Object.assign({},declared("x",0),{reason:""}))==="string");
ok("whitespace-only reason",typeof regimeEntryFault(Object.assign({},declared("x",0),{reason:"   "}))==="string");
ok("empty source rejected",typeof regimeEntryFault(declared("x",0,"other","r",{source:""}))==="string");
ok("present source ok",regimeEntryFault(declared("x",0,"other","r",{source:"https://example.test"}))===null);
ok("supersedes must be non-empty string",typeof regimeEntryFault(declared("x",0,"other","r",{supersedes:""}))==="string");
ok("self-supersede rejected",typeof regimeEntryFault(declared("x",0,"other","r",{supersedes:"x"}))==="string");
ok("declared carrying metric rejected",typeof regimeEntryFault(declared("x",0,"other","r",{metric:{name:"a",value:1,percentile:1}}))==="string");
ok("flagged carrying reason rejected",typeof regimeEntryFault(flagged("x",0,undefined,{reason:"nope"}))==="string");
ok("flagged carrying category rejected",typeof regimeEntryFault(flagged("x",0,undefined,{category:"other"}))==="string");
ok("flagged carrying source rejected",typeof regimeEntryFault(flagged("x",0,undefined,{source:"u"}))==="string");
ok("flagged carrying supersedes rejected",typeof regimeEntryFault(flagged("x",0,undefined,{supersedes:"y"}))==="string");
ok("flagged missing metric rejected",typeof regimeEntryFault(Object.assign({},flagged("x",0),{metric:undefined}))==="string");
ok("flagged metric missing name rejected",typeof regimeEntryFault(flagged("x",0,{value:1,percentile:1}))==="string");
ok("flagged metric non-numeric value rejected",typeof regimeEntryFault(flagged("x",0,{name:"a",value:"1",percentile:1}))==="string");
ok("flagged metric non-numeric percentile rejected",typeof regimeEntryFault(flagged("x",0,{name:"a",value:1,percentile:"1"}))==="string");
console.log("section 1 (regimeEntryFault): "+pass+" ok so far, "+fail+" fail");

/* ============================================================ 2. regimeRegistryFaults: registry-level */
eq("clean fixture has no faults",regimeRegistryFaults(FIX).length,0);
{
  const bad=[declared("b1",1000),declared("b2",2000)];
  bad[0].category="not-a-real-category";
  const faults=regimeRegistryFaults(bad);
  eq("one malformed row reported",faults.length,1);
  eq("malformed row index correct",faults[0].i,0);
}
{
  const dup=[declared("same",1000),declared("same",2000)];
  const faults=regimeRegistryFaults(dup);
  eq("duplicate id flags both rows",faults.length,2);
  ok("duplicate id message mentions id",faults[0].why.indexOf("same")>=0);
}
{
  /* two ACTIVE declared entries at the identical t: must reject, per the D2 chained-correction lesson */
  const tie=[declared("a",1000),declared("c",1000)];
  const faults=regimeRegistryFaults(tie);
  eq("same-t active pair: both flagged",faults.length,2);
  const idxs=faults.map(f=>f.i).sort();
  eq("same-t pair indices are 0 and 1",idxs.join(","),"0,1");
}
{
  /* the corrected pair: a superseded row and its correction share no ambiguity once one is inactive -
     use DIFFERENT t so this checks supersession removes an entry from the active set at all, and a
     dedicated same-t-but-superseded case follows right after. */
  const corrected=[declared("orig",1000,"other","was over-called"),
    declared("fix",2500,"other","corrected",{supersedes:"orig"})];
  eq("superseded pair (different t) has no faults",regimeRegistryFaults(corrected).length,0);
}
{
  /* same t, but one supersedes the other: NOT ambiguous, because only one is ever active */
  const samTSuperseded=[declared("orig",1000,"other","was over-called"),
    declared("fix",1000,"other","corrected, same instant",{supersedes:"orig"})];
  eq("same-t pair resolved by supersession: no faults",regimeRegistryFaults(samTSuperseded).length,0);
}
eq("non-array registry reports one fault",regimeRegistryFaults(null).length,1);
eq("non-array registry fault has i=-1",regimeRegistryFaults(null)[0].i,-1);
console.log("section 2 (regimeRegistryFaults): "+pass+" ok so far, "+fail+" fail");

/* ============================================================ 3. regimeStructurallyValid / regimeSupersededIds */
{
  const mixed=[declared("a",1000),Object.assign({},declared("b",2000),{category:"nope"}),declared("c",3000)];
  eq("structurally valid indices skip the bad row",regimeStructurallyValid(mixed).join(","),"0,2");
}
{
  const chain=[declared("a",1000),declared("b",2000,"other","fix a",{supersedes:"a"})];
  const sup=regimeSupersededIds(chain);
  ok("a is marked superseded",sup["a"]===true);
  ok("b is not marked superseded",sup["b"]!==true);
}
{
  const dangling=[declared("a",1000,"other","r",{supersedes:"nonexistent"})];
  eq("dangling supersedes resolves to no faults on the row itself",regimeRegistryFaults(dangling).length,0);
  eq("dangling supersedes marks nothing superseded",Object.keys(regimeSupersededIds(dangling)).length,0);
}
console.log("section 3 (structurallyValid/supersededIds): "+pass+" ok so far, "+fail+" fail");

/* ============================================================ 4. regimeBoundaries: ordering, exclusion */
{
  const b=regimeBoundaries(FIX);
  eq("3 active boundaries",b.length,3);
  eq("sorted ascending",b.map(x=>x.t).join(","),[dt(1000),dt(2000),dt(3000)].join(","));
}
{
  const shuffled=[FIX[2],FIX[0],FIX[1]];
  const b=regimeBoundaries(shuffled);
  eq("regimeBoundaries sorts regardless of input order",b.map(x=>x.id).join(","),"b1,b2,b3");
}
{
  const withFlag=[FIX[0],FIX[1],FIX[2],flagged("f1",1500,{name:"rv_trailing_pctl",value:99,percentile:99.9})];
  eq("flagged rows never appear in the boundary set",regimeBoundaries(withFlag).length,3);
}
{
  const corrected=[declared("orig",1000,"price-collapse","first cut"),
    declared("fix",1500,"price-collapse","re-dated correction",{supersedes:"orig"})];
  const b=regimeBoundaries(corrected);
  eq("superseded entry excluded from boundary set",b.length,1);
  eq("only the correction's t defines the boundary",b[0].t,dt(1500));
  eq("raw registry still holds both rows",corrected.length,2);
  ok("raw registry still contains the superseded row by id",corrected.some(e=>e.id==="orig"));
}
console.log("section 4 (regimeBoundaries): "+pass+" ok so far, "+fail+" fail");

/* ============================================================ 5. regimeAt: the ordinal walk, by hand */
eq("before first boundary -> 0",regimeAt(dt(500),FIX),0);
eq("at first boundary exactly -> 1",regimeAt(dt(1000),FIX),1);
eq("between boundary 1 and 2 -> 1",regimeAt(dt(1500),FIX),1);
eq("at second boundary exactly -> 2",regimeAt(dt(2000),FIX),2);
eq("between boundary 2 and 3 -> 2",regimeAt(dt(2500),FIX),2);
eq("at third boundary exactly -> 3",regimeAt(dt(3000),FIX),3);
eq("after last boundary -> 3",regimeAt(dt(5000),FIX),3);
eq("far before the first entry ever -> 0",regimeAt(REGIME_T_MIN,FIX),0);
eq("far after the last entry (in range) -> 3",regimeAt(REGIME_T_MAX,FIX),3);
{
  const shuffled=[FIX[2],FIX[0],FIX[1]];
  eq("regimeAt is order-independent (entries out of order) 1",regimeAt(dt(1500),shuffled),1);
  eq("regimeAt is order-independent (entries out of order) 2",regimeAt(dt(2500),shuffled),2);
}
{
  const corrected=[declared("orig",1000,"other","first cut"),
    declared("fix",2500,"other","corrected",{supersedes:"orig"})];
  eq("with a superseded entry: before the CORRECTED boundary -> 0",regimeAt(dt(2000),corrected),0);
  eq("with a superseded entry: at/after the CORRECTED boundary -> 1",regimeAt(dt(2500),corrected),1);
}
{
  const tie=[declared("a",1000),declared("c",1000),declared("mid",2000)];
  /* the tied pair is rejected wholesale by regimeRegistryFaults, so neither defines a boundary;
     only "mid" survives, and regimeAt must reflect exactly that -- not crash, not double count. */
  eq("two entries at the same t: rejected, so only the other boundary counts (before)",regimeAt(dt(1500),tie),0);
  eq("two entries at the same t: rejected, so only the other boundary counts (at/after)",regimeAt(dt(2000),tie),1);
}
{
  /* THE INVARIANT MOST LIKELY TO BE SILENTLY WRONG: a flagged-only registry never moves regimeAt,
     no matter how extreme the flagged statistic or how many flags exist. */
  const flagsOnly=[flagged("f1",100,{name:"rv_trailing_pctl",value:500,percentile:99.99}),
    flagged("f2",2000,{name:"rv_trailing_pctl",value:0.001,percentile:0.01}),
    flagged("f3",4000,{name:"rv_trailing_pctl",value:9999,percentile:100})];
  eq("flagged-only: before all flags -> 0",regimeAt(dt(-1000),flagsOnly),0);
  eq("flagged-only: among the flags -> 0",regimeAt(dt(500),flagsOnly),0);
  eq("flagged-only: after all flags -> 0",regimeAt(dt(9000),flagsOnly),0);
  eq("flagged-only: at REGIME_T_MAX -> 0",regimeAt(REGIME_T_MAX,flagsOnly),0);
}
eq("empty registry -> 0 everywhere",regimeAt(dt(0),[]),0);
ok("non-finite t throws",isErrThrown(()=>regimeAt(NaN,FIX)));
ok("non-numeric t throws",isErrThrown(()=>regimeAt("1000",FIX)));
ok("non-array entries throws",isErrThrown(()=>regimeAt(dt(0),null)));
function isErrThrown(fn){ return threw(fn)!==null; }
console.log("section 5 (regimeAt): "+pass+" ok so far, "+fail+" fail");

/* ============================================================ 6. sameRegime */
ok("same segment -> true",sameRegime(dt(1200),dt(1800),FIX)===true);
ok("across one boundary -> false",sameRegime(dt(500),dt(1500),FIX)===false);
ok("across two boundaries -> false",sameRegime(dt(500),dt(2500),FIX)===false);
ok("both exactly on a boundary instant -> true (same ordinal)",sameRegime(dt(1000),dt(1000),FIX)===true);
{
  const flagsOnly=[flagged("f1",1500,{name:"rv_trailing_pctl",value:500,percentile:99.99})];
  ok("flagged-only registry: everything is the same regime",sameRegime(dt(-9999),dt(9999),flagsOnly)===true);
}
console.log("section 6 (sameRegime): "+pass+" ok so far, "+fail+" fail");

/* ============================================================ 7. regimeSpent */
ok("no break inside the set -> not spent",regimeSpent(FIX,dt(3500),dt(4500))===false);
ok("break strictly inside the set -> spent",regimeSpent(FIX,dt(500),dt(1500))===true);
ok("break exactly at setOpenT -> exclusive, not spent",regimeSpent(FIX,dt(1000),dt(1500))===false);
ok("break exactly at setBoundaryT -> exclusive, not spent",regimeSpent(FIX,dt(500),dt(1000))===false);
ok("break just inside both ends -> spent",regimeSpent(FIX,dt(999),dt(1001))===true);
{
  const corrected=[declared("orig",1000,"other","first cut"),
    declared("fix",2500,"other","corrected",{supersedes:"orig"})];
  ok("superseded break's OLD t inside the set does not spend it",regimeSpent(corrected,dt(500),dt(1500))===false);
  ok("the CORRECTION's t inside the set does spend it",regimeSpent(corrected,dt(2000),dt(3000))===true);
}
{
  const flagsOnly=[flagged("f1",1500,{name:"rv_trailing_pctl",value:500,percentile:99.99})];
  ok("a flag inside the set never spends it",regimeSpent(flagsOnly,dt(1000),dt(2000))===false);
}
ok("setOpenT >= setBoundaryT throws",threwName(()=>regimeSpent(FIX,dt(2000),dt(1000)))==="RangeError");
ok("setOpenT === setBoundaryT throws",threwName(()=>regimeSpent(FIX,dt(1000),dt(1000)))==="RangeError");
ok("non-finite setOpenT throws",threw(()=>regimeSpent(FIX,NaN,dt(1000)))!==null);
ok("non-finite setBoundaryT throws",threw(()=>regimeSpent(FIX,dt(0),NaN))!==null);
ok("non-array entries throws",threw(()=>regimeSpent(null,dt(0),dt(1000)))!==null);
console.log("section 7 (regimeSpent): "+pass+" ok so far, "+fail+" fail");

/* ============================================================ 8. the flag statistic */
function range(n,lo,hi){ const out=[]; for(let i=0;i<n;i++) out.push(lo+(hi-lo)*i/(n-1)); return out; }
const TR30=range(30,1,30); /* 1,2,...,30: 30 distinct values, exactly REGIME_FLAG_MIN_TRAILING */
eq("too few trailing (29) refuses",regimeFlagCandidate(15,TR30.slice(0,29)),null);
ok("too-few fault names the constant",regimeFlagInputFault(15,TR30.slice(0,29)).indexOf("REGIME_FLAG_MIN_TRAILING")>=0);
ok("exactly REGIME_FLAG_MIN_TRAILING is usable (no input fault)",regimeFlagInputFault(15,TR30)===null);
ok("non-finite sample refuses",regimeFlagInputFault(NaN,TR30)!==null);
ok("trailing not an array refuses",regimeFlagInputFault(15,"nope")!==null);
ok("trailing with a non-finite member refuses",regimeFlagInputFault(15,TR30.concat([NaN]))!==null);

/* regimePercentileRank, hand-checked: 1..30, sample=15 already IN the set at index 14 (value 15) ->
   14 values strictly less (1..14), 1 value equal (15 itself is not in trailing here since sample is
   passed separately) -- use a trailing set that does NOT include the sample to keep this unambiguous. */
{
  const tr=[1,2,3,4,5,6,7,8,9,10]; /* 10 values, none equal to 5.5 */
  ok("percentile rank: sample above all of trailing -> 1.0",regimePercentileRank(11,tr)===1);
  ok("percentile rank: sample below all of trailing -> 0.0",regimePercentileRank(0,tr)===0);
  ok("percentile rank: sample at the midpoint",Math.abs(regimePercentileRank(5.5,tr)-0.5)<1e-12);
  /* ties: sample equals THREE of ten trailing values (5,5,5) and is greater than four (1..4) ->
     lt=4, eq=3 -> (4+1.5)/10 = 0.55 */
  const trTies=[1,2,3,4,5,5,5,8,9,10];
  ok("percentile rank: ties split evenly (mean rank)",Math.abs(regimePercentileRank(5,trTies)-0.55)<1e-12);
}
{
  /* construct a trailing set and sample landing EXACTLY on REGIME_FLAG_PCTL via percentile rank = 1.0
     (sample strictly above every trailing read) -- unambiguously >= REGIME_FLAG_PCTL for any threshold
     in (0,1). */
  const m=regimeFlagCandidate(1000,TR30);
  ok("extreme-high sample flags",m!==null);
  eq("flag metric name",m&&m.name,"rv_trailing_pctl");
  eq("flag metric value is the sample",m&&m.value,1000);
  ok("flag metric percentile is 100 (rank 1.0)",m&&Math.abs(m.percentile-100)<1e-9);
}
{
  const m=regimeFlagCandidate(-1000,TR30);
  ok("extreme-low sample flags",m!==null);
  ok("flag metric percentile is 0 (rank 0.0)",m&&Math.abs(m.percentile-0)<1e-9);
}
{
  /* a sample dead in the middle of a uniform trailing set should NOT flag */
  const mid=regimeFlagCandidate(15.5,TR30);
  eq("mid-distribution sample does not flag",mid,null);
}
{
  /* threshold edges, using a trailing set of 100 distinct values 1..100 so percentile rank lands on
     clean hundredths. REGIME_FLAG_PCTL=0.99 -> rank>=0.99 flags, rank<0.99 (and >0.01) does not. */
  const tr100=range(100,1,100);
  /* sample greater than exactly 99 of the 100 trailing values, equal to none -> rank = 99/100 = 0.99 */
  const justAtEdge=tr100[98]+0.5; /* between the 99th and 100th value */
  ok("percentile rank at the registered edge is 0.99",Math.abs(regimePercentileRank(justAtEdge,tr100)-0.99)<1e-9);
  ok("rank exactly at REGIME_FLAG_PCTL flags (>=)",regimeFlagCandidate(justAtEdge,tr100)!==null);
  const justUnder=tr100[97]+0.5; /* rank = 98/100 = 0.98, just under the registered edge */
  ok("rank just under REGIME_FLAG_PCTL does not flag",regimeFlagCandidate(justUnder,tr100)===null);
}
eq("REGIME_FLAG_PCTL is the registered 0.99",REGIME_FLAG_PCTL,0.99);
eq("REGIME_FLAG_MIN_TRAILING is the registered 30",REGIME_FLAG_MIN_TRAILING,30);
console.log("section 8 (flag statistic): "+pass+" ok so far, "+fail+" fail");

/* ============================================================ 9. closed sets, misc constants */
eq("REGIME_CATEGORIES is the six-member closed set",REGIME_CATEGORIES.join("|"),
  "price-collapse|price-parabola|sovereign-adoption|exchange-failure|contract-redefinition|other");
eq("REGIME_KINDS is declared|flagged",REGIME_KINDS.join("|"),"declared|flagged");
ok("regimeValidTime true in range",regimeValidTime(dt(0))===true);
ok("regimeValidTime false below REGIME_T_MIN",regimeValidTime(REGIME_T_MIN-1)===false);
ok("regimeValidTime false above REGIME_T_MAX",regimeValidTime(REGIME_T_MAX+1)===false);
ok("regimeValidTime false for a Date object",regimeValidTime(new Date(dt(0)))===false);
ok("regimeValidTime false for a numeric string",regimeValidTime(String(dt(0)))===false);
ok("regimeValidTime false for NaN",regimeValidTime(NaN)===false);
console.log("");
{
  /* Two-entry cycle: A supersedes B, B supersedes A. Neither is excluded by pass 2/3, and prior to the
     cycle-detection pass, regimeSupersededIds would drop BOTH from the boundary walk with zero fault
     reported - collapsing whatever span they defined into one undifferentiated regime, silently. */
  const a=declared("cyc-a",1000,"other","a",{supersedes:"cyc-b"});
  const b=declared("cyc-b",2000,"other","b",{supersedes:"cyc-a"});
  const bad2=regimeRegistryFaults([a,b]);
  eq("a 2-entry cycle faults BOTH entries",bad2.length,2);
  ok("...and neither fault is silent about being a cycle",bad2.every(function(f){return /cycle/.test(f.why);}));
  eq("a cyclic pair therefore defines ZERO boundaries, not a silently collapsed one",regimeBoundaries([a,b]).length,0);
  eq("every instant reads as regime 0 with no boundary to cross",regimeAt(dt(1500),[a,b]),0);

  /* Three-entry cycle: A->B->C->A. */
  const c1=declared("cyc3-a",1000,"other","a",{supersedes:"cyc3-c"});
  const c2=declared("cyc3-b",2000,"other","b",{supersedes:"cyc3-a"});
  const c3=declared("cyc3-c",3000,"other","c",{supersedes:"cyc3-b"});
  const bad3=regimeRegistryFaults([c1,c2,c3]);
  eq("a 3-entry cycle faults all three",bad3.length,3);
  eq("...and still defines zero boundaries",regimeBoundaries([c1,c2,c3]).length,0);

  /* A dangling supersedes (naming an id nothing carries) is NOT a cycle - must not be flagged by pass 4. */
  const d=declared("dangling",1000,"other","d",{supersedes:"nothing-here"});
  eq("a dangling supersedes is not a cycle and is not faulted by pass 4",regimeRegistryFaults([d]).length,0);
  eq("...and defines its own boundary normally",regimeBoundaries([d]).length,1);

  /* Self-reference: A supersedes A. Already caught upstream by regimeEntryFault ("an entry cannot
     supersede itself"), so pass 4 never runs on it - it is faulted, just not with the cycle message,
     since a 1-node cycle is indistinguishable from ordinary self-reference and the earlier, more specific
     diagnosis is the more useful one to report. */
  const s1=declared("self",1000,"other","s",{supersedes:"self"});
  const badSelf=regimeRegistryFaults([s1]);
  eq("A supersedes itself is faulted (caught before pass 4 even runs)",badSelf.length,1);
  ok("...with the specific self-supersession reason, not a generic cycle message",/supersede itself/.test(badSelf[0].why));

  /* A clean, non-cyclic supersession chain (X -> Y -> Z, each newer correcting the last) must NOT be
     touched by pass 4 - only Z, the head, stays active; that is ordinary supersession, not a cycle. */
  const x=declared("chain-x",1000,"other","x");
  const y=declared("chain-y",2000,"other","y",{supersedes:"chain-x"});
  const z=declared("chain-z",3000,"other","z",{supersedes:"chain-y"});
  eq("a real (non-cyclic) supersession chain is untouched by cycle detection",regimeRegistryFaults([x,y,z]).length,0);
  eq("...only the chain's head defines an active boundary",regimeBoundaries([x,y,z]).length,1);
}

console.log("section 9 (constants): "+pass+" ok so far, "+fail+" fail");

console.log((fail===0?"ALL GREEN":"FAILURES")+": "+pass+" ok, "+fail+" fail");
process.exit(fail?1:0);
