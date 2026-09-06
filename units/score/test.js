/* Standalone harness for the `score` unit. node test.js -> green, exit 0.

   THREE CONTEXTS, because what this unit does depends on which neighbours are spliced beside it:
     REAL  calendar + prereg + score. The genuine controlEligible, the genuine SHOCK_RULE. Used for the
           drift guards (a restated constant must equal its source) and for the DST arithmetic.
     STUB  prereg + score, with a controlEligible STUB whose release list the fixture controls. Every
           matcher and scoring fixture runs here, because a fixture whose answer depends on the real
           release table is a fixture that changes when the table does. The stub reimplements
           controlEligible's CONTRACT (+/-CAL_CONTROL_EXCL_MIN of any known instant) and the REAL context
           asserts that contract is still what the calendar implements.
     ALONE score by itself. Proves every path degrades to a reason code instead of throwing.

   Page helpers are THROWERS, with three deliberate exceptions: normCdf and invNorm, which prereg's
   shockRequiredHoldN needs, and bootstrapCI, which is scCi's documented fallback. All three are the page's
   own implementations, copied verbatim; bootstrapCI is copied UNSEEDED because 10.5 says its resampling
   variation is a property of the method, so every bootstrap assertion here is one that holds for EVERY
   possible resample rather than for a lucky one.

   NO REAL DATA APPEARS IN THIS FILE AND NONE EXISTS ANYWHERE. Every expected number is derived by hand
   from the definition, written as a literal, and stated in the assertion name. Where the bulk grid needs
   more numbers than are worth writing out, the expectation is built from brier(p,y)=(p-y)^2 -- the
   definition, two terms -- and the SIGN, which is the thing that can silently invert, is pinned
   separately by hand-computed literals in the "sign" block. */
"use strict";
const fs=require("fs"),vm=require("vm"),path=require("path");

const SRC=fs.readFileSync(path.join(__dirname,"code.js"),"utf8");
const CAL=fs.readFileSync(path.join(__dirname,"..","calendar","code.js"),"utf8");
const PRE=fs.readFileSync(path.join(__dirname,"..","prereg","code.js"),"utf8");
const IDX=path.join(__dirname,"..","..","index.html");
const DOC=path.join(__dirname,"..","..","CLAUDE.md");

/* --- the three page helpers this unit's neighbours genuinely need, copied from index.html ------------- */
function normCdf(z){ return 0.5*(1+erf(z/Math.SQRT2)); }
function erf(x){ const s=x<0?-1:1; x=Math.abs(x);
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const t=1/(1+p*x); const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
  return s*y; }
function invNorm(p){ p=Math.min(0.999999,Math.max(0.000001,p));
  let lo=-8,hi=8;
  for(let i=0;i<60;i++){ const m=(lo+hi)/2; if(normCdf(m)<p) lo=m; else hi=m; }
  return (lo+hi)/2; }
/* index.html's bootstrapCI, verbatim and UNSEEDED (10.5). */
function bootstrapCI(vals,fn,level,B){
  if(!vals.length) return null;
  const n=vals.length, out=[];
  for(let b=0;b<B;b++){ const s=new Array(n); for(let i=0;i<n;i++) s[i]=vals[(Math.random()*n)|0]; out.push(fn(s)); }
  out.sort(function(a,b){ return a-b; });
  const a=(1-level)/2;
  return {lo:out[Math.floor(a*(B-1))],hi:out[Math.ceil((1-a)*(B-1))],point:fn(vals)};
}

const thrower=function(n){ return function(){ throw new Error("unit reached for page helper: "+n); }; };
function makeCtx(){
  const ctx={Math:Math,Date:Date,Array:Array,Number:Number,Object:Object,JSON:JSON,String:String,
    isFinite:isFinite,console:console,TypeError:TypeError,RangeError:RangeError,Error:Error,
    normCdf:normCdf,invNorm:invNorm,bootstrapCI:bootstrapCI,
    clamp:thrower("clamp"),randn:thrower("randn"),quantile:thrower("quantile"),mulberry:thrower("mulberry"),
    termFactor:thrower("termFactor"),calSigma:thrower("calSigma"),computeStats:thrower("computeStats"),
    hourStart:thrower("hourStart"),tapeAt:thrower("tapeAt"),idxAt:thrower("idxAt"),
    priceAtSrc:thrower("priceAtSrc"),barsExcludingCurrent:thrower("barsExcludingCurrent"),
    kFee:thrower("kFee"),refSnap:thrower("refSnap"),strikeProbs:thrower("strikeProbs"),
    edgeStatsOn:thrower("edgeStatsOn"),computeVerdict:thrower("computeVerdict"),
    SEAS:new Proxy({},{get:function(){ throw new Error("unit reached for global SEAS"); }}),
    TERM:thrower("TERM"),SWING:thrower("SWING"),SIM:thrower("SIM"),
    S:new Proxy({},{get:function(){ throw new Error("unit reached for global S"); }}),
    document:new Proxy({},{get:function(){ throw new Error("unit touched the DOM"); }}),
    localStorage:new Proxy({},{get:function(){ throw new Error("unit touched localStorage"); }}),
    fetch:thrower("fetch"),setTimeout:thrower("setTimeout"),setInterval:thrower("setInterval")};
  vm.createContext(ctx);
  return ctx;
}
const EXPORTS="\n;({SCORE:SCORE,SC_OMIT:SC_OMIT,SC_CALLER_FIELDS:SC_CALLER_FIELDS,"+
  "SC_VERDICT_FIELDS:SC_VERDICT_FIELDS,SC_REFUSALS:SC_REFUSALS,SC_REFUSAL_WHY:SC_REFUSAL_WHY,"+
  "scHasOwn:scHasOwn,scRowId:scRowId,scDedupe:scDedupe,scCellKey:scCellKey,scCells:scCells,"+
  "scClusterStat:scClusterStat,scSplitCheck:scSplitCheck,scRatchet:scRatchet,"+
  "scAfterBoundary:scAfterBoundary,scCoverage:scCoverage,scRequiredFields:scRequiredFields,"+
  "scMissingRequired:scMissingRequired,scIsRefusal:scIsRefusal,scRefused:scRefused,"+
  "scMaxMonths:scMaxMonths,scRatchetStatus:scRatchetStatus,scMissingAll:scMissingAll,"+
  "SC_ROW_FIELDS:SC_ROW_FIELDS,SC_SNAP_FIELDS:SC_SNAP_FIELDS,SC_OPT_FIELDS:SC_OPT_FIELDS,"+
  "SC_SPLIT_FIELDS:SC_SPLIT_FIELDS,SC_NEIGHBOUR_FIELDS:SC_NEIGHBOUR_FIELDS,"+
  "scTypeNum:scTypeNum,scTypeBool:scTypeBool,scTypeStr:scTypeStr,scTypeArr:scTypeArr,scTypeFn:scTypeFn,"+
  "scTypeStamp:scTypeStamp,scFieldOf:scFieldOf,scFieldCheck:scFieldCheck,scRowCheck:scRowCheck,"+
  "scRowsCheck:scRowsCheck,scOptsCheck:scOptsCheck,scHash:scHash,scFpNum:scFpNum,scCalFp:scCalFp,"+
  "shockFeasible:(typeof shockFeasible==='undefined'?null:shockFeasible),"+
  "scHasCalendar:scHasCalendar,scHasPrereg:scHasPrereg,scNum:scNum,scMean:scMean,scSdOf:scSdOf,"+
  "scSlotUtc:scSlotUtc,scWeekdayUtc:scWeekdayUtc,scQuarterUtc:scQuarterUtc,scSeriesOf:scSeriesOf,"+
  "scMatchKey:scMatchKey,scKeyEqual:scKeyEqual,scClearProbes:scClearProbes,scWindowLenMin:scWindowLenMin,"+
  "scWindowClear:scWindowClear,scRefSnap:scRefSnap,scSkill:scSkill,scMatchControls:scMatchControls,"+
  "scPhaseGuard:scPhaseGuard,scSeriesGuard:scSeriesGuard,scPairs:scPairs,scSplit:scSplit,"+
  "scSplitStable:scSplitStable,scSd:scSd,scDid:scDid,scCi:scCi,scAssemble:scAssemble,scReport:scReport,"+
  "SHOCK_RULE:(typeof SHOCK_RULE==='undefined'?null:SHOCK_RULE),"+
  "shockStatus:(typeof shockStatus==='undefined'?null:shockStatus),"+
  "shockCiLevel:(typeof shockCiLevel==='undefined'?null:shockCiLevel),"+
  "shockBootstrapB:(typeof shockBootstrapB==='undefined'?null:shockBootstrapB),"+
  "shockRequiredHoldN:(typeof shockRequiredHoldN==='undefined'?null:shockRequiredHoldN),"+
  "CAL_CONTROL_EXCL_MIN:(typeof CAL_CONTROL_EXCL_MIN==='undefined'?null:CAL_CONTROL_EXCL_MIN),"+
  "CAL_PARTIAL_CAVEAT:(typeof CAL_PARTIAL_CAVEAT==='undefined'?null:CAL_PARTIAL_CAVEAT),"+
  "releasesBetween:(typeof releasesBetween==='undefined'?null:releasesBetween),"+
  "etToUtc:(typeof etToUtc==='undefined'?null:etToUtc)})";

const REAL=vm.runInContext(CAL+"\n"+PRE+"\n"+SRC+EXPORTS,makeCtx(),{filename:"score+calendar+prereg.js"});
const ALONE=vm.runInContext(SRC+EXPORTS,makeCtx(),{filename:"score-alone.js"});

/* the STUB context: prereg is real, the calendar is a controllable stub of controlEligible's contract */
const STUB_CTX=makeCtx();
const STUB_RELEASES=[];
const STUB_CAVEAT="STUB CAVEAT: this table is partial and a control is never certified clean.";
const STUB_SPANS=[{name:"FOMC",from:0,to:4e12,n:8,srcs:["stub"],retrieved:"2026-09-06"}];
STUB_CTX.controlEligible=function(t){
  const known={series:STUB_SPANS,inSpan:["FOMC"],partial:true,caveat:STUB_CAVEAT};
  if(typeof t!=="number"||!isFinite(t)) return {eligible:false,reason:"bad-timestamp",known:known};
  for(let i=0;i<STUB_RELEASES.length;i++)
    if(Math.abs(t-STUB_RELEASES[i])<=45*60000) return {eligible:false,reason:"release-nearby",known:known};
  return {eligible:true,reason:"ok",known:known};
};
const U=vm.runInContext(PRE+"\n"+SRC+EXPORTS,STUB_CTX,{filename:"score+prereg-stubcal.js"});

/* A SEEDED RNG, INSTALLED OVER Math.random FOR ONE BLOCK AT A TIME.
   The unit's CI is a two-stage cluster bootstrap: stage 1 is the handed-in (unseeded) bootstrapCI, stage 2 is
   the within-cell resample inside scClusterStat. 10.5 says the resampling variation is a property of the
   method and must not be seeded IN THE UNIT -- so it is seeded HERE, in the harness, around the assertions
   that need a reproducible draw, and restored immediately after. Every seeded assertion below is additionally
   run over several seeds, so none of them can be passing on a lucky one. */
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296; }; }
function seeded(seed,body){ const real=Math.random; Math.random=mulberry32(seed);
  try{ return body(); } finally { Math.random=real; } }
/* the naive, WINDOW-level bootstrap the unit used to run: kept here as the reference the cluster interval is
   compared against, never in the unit. */
function naiveCi(pairs,level,B){
  const v=pairs.map(function(p){ return p.paired; });
  return bootstrapCI(v,function(a){ let s=0; for(let i=0;i<a.length;i++) s+=a[i]; return s/a.length; },level,B);
}
/* a synthetic pair of exactly the shape scPairs emits, including the cell key and the identified control set
   the cluster bootstrap resamples. `ctrl` defaults to five distinct controls whose mean is the pair's own
   ctrlMeanSkill, so paired = shockSkill - mean(ctrl) holds by construction. */
function mkPair(ticker,close,paired,cell,ctrlSkills,shockSkill){
  const cs=ctrlSkills||[0,0,0,0,0];
  let m=0; for(let i=0;i<cs.length;i++) m+=cs[i]; m/=cs.length;
  const ctrl=[]; for(let i=0;i<cs.length;i++) ctrl.push({id:(cell||"z")+"-ctrl"+i+"|"+i,skill:cs[i]});
  const sk=(shockSkill===undefined)?paired+m:shockSkill;
  return {ticker:ticker,open:close-15*MIN,close:close,cell:(cell||"15m|50|3|2026Q1"),
    paired:paired,shockSkill:sk,ctrlMeanSkill:m,nCtrl:ctrl.length,ctrl:ctrl};
}

let pass=0,fail=0;
function ok(name,cond,extra){ if(cond){ pass++; console.log("  ok  "+name); }
  else { fail++; console.log("  FAIL "+name+(extra===undefined?"":"  -> "+JSON.stringify(extra))); } }
function eq(name,a,b){ ok(name,a===b,{got:a,want:b}); }
function close(name,a,b,tol){ ok(name,typeof a==="number"&&Math.abs(a-b)<=(tol||1e-12),{got:a,want:b}); }
function sect(s){ console.log("\n-- "+s); }

const MIN=60000, WEEK=7*86400000;
/* the SAMPLE (n-1) sd, from the definition, written here so an assertion about the unit's sd is not the unit
   compared with itself. */
function sdRef(v){ let m=0; for(let i=0;i<v.length;i++) m+=v[i]; m/=v.length;
  let s2=0; for(let i=0;i<v.length;i++) s2+=(v[i]-m)*(v[i]-m); return Math.sqrt(s2/(v.length-1)); }
/* Brier, from the definition. Two terms; used only where writing every literal out would be noise. */
function brier(p,y){ return (p-y)*(p-y); }
function skillOf(pm,qm,y){ return brier(qm/100,y)-brier(pm,y); }

/* A window record of exactly the shape the edge ledger produces, plus {phase, shock}.
   The snaps are DECOYED on purpose: a phantom row sits at the refSnap target and comes FIRST, a garbage
   read sits at the window's MIDPOINT, and a post-gate read sits at tau<0. Any of refSnap's three rules
   going missing picks a different snap and changes the skill. */
function mkWin(id,open,lenMin,result,pm,qm,extra){
  const close=open+lenMin*MIN;
  const tau=function(m){ return {t:close-m*MIN,tau:m}; };
  const bad={pm:0.5,qm:50};
  const snaps=[
    Object.assign(tau(6),bad,{phantom:true}),
    Object.assign(tau(lenMin/2),bad),
    Object.assign(tau(6),{pm:pm,qm:qm}),
    Object.assign(tau(2),bad),
    Object.assign(tau(-1),bad)
  ];
  const w={ticker:id,open:open,close:close,strike:100000,result:result,snaps:snaps,phase:1,shock:false};
  if(extra) for(const k in extra) w[k]=extra[k];
  return w;
}

/* THE CALLER'S REGISTRATION LOOP, ONCE, AS A HELPER. 11.6's boundary and 11.2a's required holdout n are
   caller REGISTRATIONS, and since the second review they are refusals rather than optional: a verdict computed
   against a boundary nobody registered, or against a requirement that was silently recomputed downward, is a
   verdict 11.6 and 11.2a do not admit. Neither can be supplied before the state that defines it exists, so the
   documented loop is: run, read rep.split.boundary and rep.holdN.computed off the refusal, write them into
   CLAUDE.md with a date, register them, run again. This helper is that loop, and every fixture below that
   expects a VERDICT (rather than a refusal) goes through it. */
function reg(rows,base){
  const r0=U.scReport(rows,base);
  const o={}; for(const k in base) o[k]=base[k];
  if(r0.split&&r0.split.boundary) o.boundary=r0.split.boundary;
  if(r0.holdN&&typeof r0.holdN.computed==="number") o.holdNRegistered=r0.holdN.computed;
  return o;
}

/* ==================================================================================================== */
sect("drift guards: every restated constant equals its source");
eq("CTRL_MIN restates SHOCK_RULE.minCtrlPerShock",REAL.SCORE.CTRL_MIN,REAL.SHOCK_RULE.minCtrlPerShock);
eq("CAL_N restates SHOCK_RULE.calN",REAL.SCORE.CAL_N,REAL.SHOCK_RULE.calN);
eq("CLEAR_HALF_MIN restates CAL_CONTROL_EXCL_MIN",REAL.SCORE.CLEAR_HALF_MIN,REAL.CAL_CONTROL_EXCL_MIN);
eq("CTRL_MIN is 5 (11.3)",REAL.SCORE.CTRL_MIN,5);
eq("CAL_N is 30 (11.6)",REAL.SCORE.CAL_N,30);
eq("REF_TAU_MIN is 6 minutes REMAINING, not mid-window (10.2)",REAL.SCORE.REF_TAU_MIN,6);
if(fs.existsSync(IDX)){
  const page=fs.readFileSync(IDX,"utf8");
  const m=page.match(/function refSnap\(w\)\{[\s\S]{0,400}?\n\}/);
  ok("index.html still has refSnap",!!m);
  if(m){
    ok("refSnap still targets tau-6",/Math\.abs\(s\.tau-6\)/.test(m[0]),m[0]);
    ok("refSnap still skips post-gate and phantom reads",/s\.tau<0\|\|s\.phantom/.test(m[0]),m[0]);
  }
}
if(fs.existsSync(DOC)){
  const doc=fs.readFileSync(DOC,"utf8");
  ok("CLAUDE.md 11.3 still says 5 controls minimum",/Minimum \*\*5 controls per shock window\*\*/.test(doc));
  ok("CLAUDE.md 11.6 still says the first 30 graded shock windows",
     /first 30 graded shock windows/.test(doc));
  ok("CLAUDE.md 11.2 still says control coverage 80%",/Control coverage .{0,4}80%/.test(doc));
  /* THE SIGN, against the document. 11.2's prose read tool - market until 2026-09-06, which is the
     orientation that fires READY on a worse-than-market arm; this unit's skill is market - tool and
     must fail loudly if the document ever states the opposite again. */
  ok("CLAUDE.md 11.2 still states the subtraction as market minus tool",
     /quote-implied probability \*\*minus\*\* the Brier score of the tool/.test(doc));
  ok("CLAUDE.md 11.2 still says a positive delta means the tool is better",
     /positive .{0,3} means the tool is better/i.test(doc));
}

/* ==================================================================================================== */
sect("11.3 dimension 1: the UTC 15-minute slot, and why it is not the ET release time");
eq("00:00 UTC is slot 0",U.scSlotUtc(Date.UTC(2026,0,7,0,0)),0);
eq("12:30 UTC is slot 50",U.scSlotUtc(Date.UTC(2026,0,7,12,30)),50);
eq("12:44:59 UTC is still slot 50",U.scSlotUtc(Date.UTC(2026,0,7,12,44,59)),50);
eq("12:45 UTC is slot 51",U.scSlotUtc(Date.UTC(2026,0,7,12,45)),51);
eq("23:45 UTC is slot 95",U.scSlotUtc(Date.UTC(2026,0,7,23,45)),95);
eq("a bad timestamp has no slot",U.scSlotUtc(null),null);
if(REAL.etToUtc){
  /* THE DST TRAP, in one assertion. 08:30 ET is one release time; it is TWO UTC slots. */
  const jan=REAL.etToUtc(2026,0,14,8,30), jul=REAL.etToUtc(2026,6,15,8,30);
  eq("08:30 ET in January is UTC slot 54 (13:30, EST)",REAL.scSlotUtc(jan),54);
  eq("08:30 ET in July is UTC slot 50 (12:30, EDT)",REAL.scSlotUtc(jul),50);
  ok("the same ET release time is a DIFFERENT UTC slot across DST",REAL.scSlotUtc(jan)!==REAL.scSlotUtc(jul));
}
sect("UTC discipline: the answers do not move with the host clock");
{
  /* getUTCDay and the epoch modulo are UTC by construction; a Date built from local getters is not.
     Re-evaluating the three key functions under a +05:30 zone is the only way to prove it from here:
     under TZ=UTC a local-time implementation is indistinguishable from a correct one. */
  const probe="const fs=require('fs'),vm=require('vm');"+
    "const c={Math:Math,Date:Date,Array:Array,Number:Number,Object:Object,String:String,JSON:JSON,"+
    "isFinite:isFinite};vm.createContext(c);"+
    "const r=vm.runInContext(fs.readFileSync(process.argv[1],'utf8')+"+
    "'\\n;({s:scSlotUtc,d:scWeekdayUtc,q:scQuarterUtc})',c);"+
    "const t=[Date.UTC(2026,0,7,12,30),Date.UTC(2026,0,7,23,45),Date.UTC(2026,2,31,23,59)];"+
    "console.log(JSON.stringify(t.map(function(x){return [r.s(x),r.d(x),r.q(x)];})));";
  const child=require("child_process").spawnSync(process.execPath,
    ["-e",probe,path.join(__dirname,"code.js")],
    {encoding:"utf8",env:Object.assign({},process.env,{TZ:"Asia/Kolkata"})});
  const here=[Date.UTC(2026,0,7,12,30),Date.UTC(2026,0,7,23,45),Date.UTC(2026,2,31,23,59)]
    .map(function(x){ return [U.scSlotUtc(x),U.scWeekdayUtc(x),U.scQuarterUtc(x)]; });
  ok("the +05:30 probe ran",child.status===0,(child.stderr||"").slice(0,300));
  eq("slot, weekday and quarter are identical under a +05:30 host clock",
     (child.stdout||"").trim(),JSON.stringify(here));
}

sect("11.3 dimensions 2 and 4: weekday and calendar quarter");
eq("2026-01-07 is a Wednesday",U.scWeekdayUtc(Date.UTC(2026,0,7,12,30)),3);
eq("2026-01-03 is a Saturday",U.scWeekdayUtc(Date.UTC(2026,0,3,12,30)),6);
eq("March is Q1",U.scQuarterUtc(Date.UTC(2026,2,31,23,59)),"2026Q1");
eq("April is Q2",U.scQuarterUtc(Date.UTC(2026,3,1,0,0)),"2026Q2");
eq("December is Q4",U.scQuarterUtc(Date.UTC(2026,11,31)),"2026Q4");
ok("the quarter key carries the year",U.scQuarterUtc(Date.UTC(2026,0,7))!==U.scQuarterUtc(Date.UTC(2027,0,7)));
sect("section 4 series split");
eq("KXBTC15M is the 15-minute series",U.scSeriesOf("KXBTC15M-26JAN07-B100000"),"15m");
eq("KXBTCD is the hourly series",U.scSeriesOf("KXBTCD-26JAN07-B100000"),"hourly");
eq("a non-string ticker has no series",U.scSeriesOf(null),null);
ok("two windows differing ONLY in series do not match",
   !U.scKeyEqual(U.scMatchKey({ticker:"KXBTC15M-a",open:Date.UTC(2026,0,7,12,30)}),
                 U.scMatchKey({ticker:"KXBTCD-a",open:Date.UTC(2026,0,7,12,30)})));
ok("two windows agreeing on all four keys match",
   U.scKeyEqual(U.scMatchKey({ticker:"KXBTC15M-a",open:Date.UTC(2026,0,7,12,30)}),
                U.scMatchKey({ticker:"KXBTC15M-b",open:Date.UTC(2026,0,7,12,30)+WEEK})));

/* ==================================================================================================== */
sect("11.3 dimension 3: clearance probes cover the window and two windows either side");
{
  const p15=U.scClearProbes(0,15*MIN,15);
  eq("a 15-minute window needs one probe",p15.length,1);
  /* the required span is [open-30, close+30] = [-30, +45] minutes; one disc of +/-45 from t=0 covers it */
  ok("that probe's +/-45 disc covers open-2 windows",p15[0]-45*MIN<=-30*MIN);
  ok("that probe's +/-45 disc covers close+2 windows",p15[0]+45*MIN>=45*MIN);
  const p60=U.scClearProbes(0,60*MIN,60);
  ok("an hourly window needs more than one probe",p60.length>1,p60);
  /* union of the discs must be contiguous and cover [open-120, close+120] */
  let covLo=p60[0]-45*MIN, covHi=p60[0]+45*MIN, contiguous=true;
  for(let i=1;i<p60.length;i++){
    if(p60[i]-45*MIN>covHi){ contiguous=false; break; }
    covHi=Math.max(covHi,p60[i]+45*MIN);
  }
  ok("the hourly probe discs are contiguous",contiguous,p60);
  ok("they reach open - 2 hourly windows",covLo<=-120*MIN);
  ok("they reach close + 2 hourly windows",covHi>=180*MIN);
  eq("a zero-length window has no probes",U.scClearProbes(0,0,15),null);
  eq("a non-numeric window has no probes",U.scClearProbes(null,1,15),null);
}
{
  /* the assertion a single-probe implementation fails: an hourly control with a release 90 minutes
     after its close is a shock window's shoulder, and +/-45 from the open cannot see it. */
  STUB_RELEASES.length=0;
  const open=Date.UTC(2026,0,7,12,0), close=open+60*MIN;
  STUB_RELEASES.push(close+90*MIN);
  const w={ticker:"KXBTCD-x",open:open,close:close};
  eq("an hourly window with a release 90 min past its close is NOT clear",U.scWindowClear(w).clear,false);
  eq("...and says why",U.scWindowClear(w).reason,"release-nearby");
  STUB_RELEASES.length=0;
  STUB_RELEASES.push(close+200*MIN);
  eq("an hourly window with a release 200 min past its close IS clear",U.scWindowClear(w).clear,true);
  STUB_RELEASES.length=0;
}
sect("11.3: the `known` block travels with every ruling");
{
  STUB_RELEASES.length=0;
  const w=mkWin("KXBTC15M-a",Date.UTC(2026,0,7,12,30),15,"yes",0.7,60);
  const c=U.scWindowClear(w);
  eq("a clear window still carries the partial-calendar caveat",c.known.caveat,STUB_CAVEAT);
  eq("...and is marked partial",c.known.partial,true);
  ok("...and carries the per-series spans",Array.isArray(c.known.series)&&c.known.series.length>0);
  STUB_RELEASES.push(w.open+5*MIN);
  const c2=U.scWindowClear(w);
  eq("a REFUSED window carries the caveat too",c2.known.caveat,STUB_CAVEAT);
  STUB_RELEASES.length=0;
}
if(REAL.CAL_PARTIAL_CAVEAT){
  const sat=Date.UTC(2026,0,3,12,30);   /* a Saturday: no US macro release lands here */
  const c=REAL.scWindowClear({ticker:"KXBTC15M-s",open:sat,close:sat+15*MIN});
  eq("against the REAL calendar a Saturday window is clear",c.clear,true);
  eq("...and carries the real CAL_PARTIAL_CAVEAT verbatim",c.known.caveat,REAL.CAL_PARTIAL_CAVEAT);
  const rels=REAL.releasesBetween(Date.UTC(2026,0,1),Date.UTC(2026,11,31));
  ok("the real calendar has releases to test against",rels.length>0);
  if(rels.length){
    const r=rels[0].t;
    const c2=REAL.scWindowClear({ticker:"KXBTC15M-r",open:r-5*MIN,close:r+10*MIN});
    eq("a window containing a REAL release is not clear",c2.clear,false);
    eq("...for the reason the calendar gives",c2.reason,"release-nearby");
  }
}

/* ==================================================================================================== */
sect("one observation per window: refSnap's rule, restated");
{
  const w=mkWin("KXBTC15M-r",Date.UTC(2026,0,7,12,30),15,"yes",0.8,50);
  const s=U.scRefSnap(w);
  eq("the chosen snap is the tau-6 read",s.tau,6);
  eq("...and it is the real one, not the phantom at the same tau",s.pm,0.8);
  eq("a window with no snaps has no refSnap",U.scRefSnap({snaps:[]}),null);
  const allPhantom=mkWin("KXBTC15M-p",Date.UTC(2026,0,7,12,30),15,"yes",0.8,50);
  for(let i=0;i<allPhantom.snaps.length;i++) allPhantom.snaps[i].phantom=true;
  eq("a window whose reads are all phantom has no refSnap",U.scRefSnap(allPhantom),null);
}
sect("THE SIGN. positive skill MUST mean the tool beat the market");
{
  /* y=1, tool 0.80 -> Brier 0.04; market 0.50 -> Brier 0.25. The tool is unambiguously better. */
  const better=mkWin("KXBTC15M-better",Date.UTC(2026,0,7,12,30),15,"yes",0.8,50);
  const sb=U.scSkill(better);
  close("tool Brier is 0.04",sb.bTool,0.04);
  close("market Brier is 0.25",sb.bMkt,0.25);
  close("skill is +0.21",sb.skill,0.21);
  ok("TOOL BETTER => POSITIVE skill",sb.skill>0);
  /* y=1, tool 0.40 -> Brier 0.36; market 0.90 -> Brier 0.01. The tool is unambiguously worse. */
  const worse=mkWin("KXBTC15M-worse",Date.UTC(2026,0,7,12,30),15,"yes",0.4,90);
  const sw=U.scSkill(worse);
  close("tool Brier is 0.36",sw.bTool,0.36);
  close("market Brier is 0.01",sw.bMkt,0.01);
  close("skill is -0.35",sw.skill,-0.35);
  ok("TOOL WORSE => NEGATIVE skill",sw.skill<0);
  ok("the two fixtures do not merely differ, they differ in SIGN",sb.skill>0&&sw.skill<0);
}
sect("grading discipline");
{
  const t=Date.UTC(2026,0,7,12,30);
  eq("a void settlement is UNGRADED, not a NO (10.4)",
     U.scSkill(mkWin("KXBTC15M-v",t,15,"void",0.8,50)).code,U.SC_OMIT.UNGRADED);
  eq("an unsettled window is ungraded",
     U.scSkill(mkWin("KXBTC15M-u",t,15,null,0.8,50)).code,U.SC_OMIT.UNGRADED);
  const noProb=mkWin("KXBTC15M-n",t,15,"yes",0.8,50);
  noProb.snaps[2].qm=null;
  eq("a snap with no market quote is not scored",U.scSkill(noProb).code,U.SC_OMIT.BAD_PROB);
  /* S10 / 10.3 K2: Kalshi's empty-side book parses to yes_bid 0.0000 and yes_ask 1.0000 -- qm 0 and qm 100
     exactly. A quote built from those is not a quote, and scoring one hands the market a Brier of exactly 1
     (making the tool look unbeatable) or exactly 0 (making it look hopeless), on no information at all. */
  eq("qm = 0 is an empty book, not a market probability of zero",
     U.scSkill(mkWin("KXBTC15M-e0",t,15,"yes",0.8,0)).code,U.SC_OMIT.EMPTY_BOOK);
  eq("qm = 100 is an empty book too",
     U.scSkill(mkWin("KXBTC15M-e1",t,15,"yes",0.8,100)).code,U.SC_OMIT.EMPTY_BOOK);
  ok("...and neither is scored",U.scSkill(mkWin("KXBTC15M-e2",t,15,"yes",0.8,0)).ok===false&&
     U.scSkill(mkWin("KXBTC15M-e3",t,15,"yes",0.8,100)).ok===false);
  eq("a real one-cent quote is still scored",U.scSkill(mkWin("KXBTC15M-e4",t,15,"yes",0.8,1)).ok,true);
  eq("...and so is 99",U.scSkill(mkWin("KXBTC15M-e5",t,15,"yes",0.8,99)).ok,true);
  /* an empty-book control is rejected by the matcher for that reason, and counted */
  STUB_RELEASES.length=0;
  const F=matcherFixture(false);
  F.rows[1].snaps[2].qm=0;
  const m=U.scMatchControls(F.shock,F.rows);
  eq("an empty-book control is not a control",m.n,4);
  eq("...and the rejection is counted by reason",m.rejects[U.SC_OMIT.EMPTY_BOOK],1);
  STUB_RELEASES.length=0;
}

/* ==================================================================================================== */
sect("THE CONTROL MATCHER: all four dimensions, none optional");
/* One quarter, one weekday, one slot. Five clear candidates that must match, four decoys that must not. */
function matcherFixture(withShockDecoy){
  STUB_RELEASES.length=0;
  const base=Date.UTC(2026,0,7,12,30);              /* Wednesday, slot 50, 2026Q1 */
  const rows=[];
  const shock=mkWin("KXBTC15M-shock",base+6*WEEK,15,"yes",0.8,50,{shock:true});
  STUB_RELEASES.push(shock.open+5*MIN);
  rows.push(shock);
  /* the five that match: same slot, same weekday, same quarter, clear, graded */
  const cp=[0.7,0.8,0.6,0.5,0.9];
  for(let i=0;i<5;i++) rows.push(mkWin("KXBTC15M-c"+i,base+i*WEEK,15,"yes",cp[i],60));
  /* decoys, each violating exactly one rule */
  rows.push(mkWin("KXBTC15M-dSlot",base+7*WEEK+15*MIN,15,"yes",0.7,60));      /* wrong slot */
  rows.push(mkWin("KXBTC15M-dDow",base+8*WEEK+86400000,15,"yes",0.7,60));     /* wrong weekday */
  rows.push(mkWin("KXBTC15M-dQtr",base+13*WEEK,15,"yes",0.7,60));             /* wrong quarter */
  const near=mkWin("KXBTC15M-dNear",base+9*WEEK,15,"yes",0.7,60);             /* release nearby */
  STUB_RELEASES.push(near.open+20*MIN);
  rows.push(near);
  if(withShockDecoy!==false)
    rows.push(mkWin("KXBTC15M-dShock",base+10*WEEK,15,"yes",0.7,60,{shock:true})); /* another shock */
  rows.push(mkWin("KXBTC15M-dVoid",base+11*WEEK,15,"void",0.7,60));           /* ungraded */
  return {rows:rows,shock:shock,base:base};
}
{
  const F=matcherFixture();
  const m=U.scMatchControls(F.shock,F.rows);
  eq("exactly the five matching candidates are controls",m.n,5);
  eq("...which meets the 5-control minimum",m.matched,true);
  const names=m.controls.map(function(c){ return c.ticker; }).sort().join(",");
  eq("...and they are the right five",names,
     "KXBTC15M-c0,KXBTC15M-c1,KXBTC15M-c2,KXBTC15M-c3,KXBTC15M-c4");
  ok("the wrong-slot decoy is not a control",names.indexOf("dSlot")<0);
  ok("the wrong-weekday decoy is not a control",names.indexOf("dDow")<0);
  ok("the wrong-quarter decoy is not a control",names.indexOf("dQtr")<0);
  ok("the release-shoulder decoy is not a control",names.indexOf("dNear")<0);
  ok("another shock window is not a control",names.indexOf("dShock")<0);
  ok("an ungraded window is not a control",names.indexOf("dVoid")<0);
  eq("the shoulder rejection is counted by reason",m.rejects["release-nearby"],1);
  eq("the shock-window rejection is counted by reason",m.rejects[U.SC_OMIT.IS_SHOCK],1);
  eq("the ungraded rejection is counted by reason",m.rejects[U.SC_OMIT.UNGRADED],1);
  /* the key is cut on the slot the window OCCUPIED, which is its open's -- not its close's. A 12:30
     window ends at 12:45, the first instant of the NEXT slot; keying on the close mislabels every
     window by one slot and stops matching a 15-minute window against an hourly one correctly. */
  eq("the match key is the slot the window occupied",
     U.scMatchKey({ticker:"KXBTC15M-q",open:Date.UTC(2026,0,7,12,30),close:Date.UTC(2026,0,7,12,45)}).slot,50);
  /* the series is part of the key, so an hourly window is never a 15-minute window's control even when
     it opens in the same slot on the same weekday in the same quarter and is perfectly clear */
  const hourly=mkWin("KXBTCD-same",F.shock.open-3*WEEK,60,"yes",0.7,60);
  eq("...and the hourly decoy shares slot, weekday and quarter with the shock",
     U.scMatchKey(hourly).slot+","+U.scMatchKey(hourly).dow+","+U.scMatchKey(hourly).quarter,
     U.scMatchKey(F.shock).slot+","+U.scMatchKey(F.shock).dow+","+U.scMatchKey(F.shock).quarter);
  eq("...and is clear of releases",U.scWindowClear(hourly).clear,true);
  eq("...and is gradeable",U.scSkill(hourly).ok,true);
  const withHourly=U.scMatchControls(F.shock,F.rows.concat([hourly]));
  eq("an HOURLY window is still not a 15-minute window's control (section 4 series split)",withHourly.n,5);
  eq("the control set carries the caveat",m.known.caveat,STUB_CAVEAT);
  /* control skills, by hand: market Brier 0.16 throughout (q=0.60, y=1);
     tool 0.70/0.80/0.60/0.50/0.90 -> 0.09/0.04/0.16/0.25/0.01 -> skills .07/.12/.00/-.09/.15 */
  const sk=m.controls.slice().sort(function(a,b){ return a.ticker<b.ticker?-1:1; })
    .map(function(c){ return c.skill; });
  close("control 0 skill is +0.07",sk[0],0.07);
  close("control 1 skill is +0.12",sk[1],0.12);
  close("control 2 skill is 0.00",sk[2],0);
  close("control 3 skill is -0.09",sk[3],-0.09);
  close("control 4 skill is +0.15",sk[4],0.15);
  close("the control mean skill is exactly 0.05",U.scMean(sk),0.05);
}
sect("the 5-control minimum: recorded, unmatched, EXCLUDED from scoring");
{
  const F=matcherFixture(false);
  F.rows.splice(5,1);                                /* drop one control: four remain */
  const m=U.scMatchControls(F.shock,F.rows);
  eq("four controls is four",m.n,4);
  eq("...and does not meet the minimum",m.matched,false);
  eq("...and says thin-controls",m.reason,U.SC_OMIT.THIN);
  const P=U.scPairs(F.rows);
  eq("the shock window is RECORDED as unmatched",P.unmatched.length,1);
  eq("...counted in ctrlTotal",P.ctrlTotal,1);
  eq("...and not in ctrlMatched",P.ctrlMatched,0);
  eq("...and produces no scored pair",P.pairs.length,0);
  ok("the unmatched record carries NO skill field",P.unmatched[0].skill===undefined);
  ok("the unmatched record carries its reason",typeof P.unmatched[0].code==="string");
  ok("the unmatched record carries the caveat",P.unmatched[0].known.caveat===STUB_CAVEAT);
}

sect("S4: a window is (ticker, open), and the 5-control minimum counts WINDOWS");
{
  STUB_RELEASES.length=0;
  const base=Date.UTC(2026,0,7,12,30);
  const shock=mkWin("KXBTC15M-shock",base+6*WEEK,15,"yes",0.8,50,{shock:true});
  STUB_RELEASES.push(shock.open+5*MIN);
  const c=[]; for(let i=0;i<3;i++) c.push(mkWin("KXBTC15M-c"+i,base+i*WEEK,15,"yes",0.7,60));
  /* what a concatenation of two overlapping CSV exports looks like: three windows, five rows */
  const pool=[shock].concat(c,[c[0],c[1]]);
  eq("the pool carries five control ROWS",pool.length-1,5);
  const m=U.scMatchControls(shock,pool);
  eq("...but only three control WINDOWS, so the minimum is not met",m.n,3);
  eq("...and the shock is unmatched",m.matched,false);
  eq("...for the stated reason",m.reason,U.SC_OMIT.THIN);
  eq("...and the duplicates are COUNTED, not silently swallowed",m.dupControls,2);
  ok("no control window appears twice",
     m.controls.map(function(x){ return x.ticker; }).sort().join(",")==="KXBTC15M-c0,KXBTC15M-c1,KXBTC15M-c2");
  /* a re-exported row that is byte-identical is the same window, and a distinct OBJECT is still a duplicate */
  const clone=JSON.parse(JSON.stringify(c[0]));
  ok("a cloned row is a different object",clone!==c[0]);
  eq("...and still the same window",U.scRowId(clone),U.scRowId(c[0]));
  eq("...so it does not count twice",U.scMatchControls(shock,[shock].concat(c,[clone])).n,3);
  /* the same identity rule the matcher already used to keep a shock out of its own control pool */
  eq("identity is ticker and open, nothing else",U.scRowId({ticker:"T",open:5}),"T|5");
  eq("...a row with no identity has none",U.scRowId({open:5}),null);
  eq("...and is passed through rather than swallowed",U.scDedupe([{open:5},{open:5}]).rows.length,2);
  /* and on the shock side: one window scored twice inflates n, ctrlTotal, the bootstrap sample and the split */
  const F=matcherFixture(false);
  const P1=U.scPairs(F.rows);
  const P2=U.scPairs(F.rows.concat([F.shock]));
  eq("the shock window scores once",P1.pairs.length,1);
  eq("...and a duplicate of it does not score again",P2.pairs.length,1);
  eq("...nor inflate the coverage denominator",P2.ctrlTotal,P1.ctrlTotal);
  eq("...and the drop is counted",P2.dupRows,1);
  const P3=U.scPairs(F.rows.concat([JSON.parse(JSON.stringify(F.shock))]));
  eq("a cloned shock row is caught the same way",P3.pairs.length,1);
  eq("scPairs on a clean set reports no drops",P1.dupRows,0);
  STUB_RELEASES.length=0;
}

/* ==================================================================================================== */
sect("11.3: the unconditional figure is not returnable on its own");
{
  /* two shock windows with skills +0.21 and +0.09; unconditional mean 0.15, which is not any
     individual measurement in the fixture. Neither has 5 controls, so there is NO controlled estimate. */
  STUB_RELEASES.length=0;
  const base=Date.UTC(2026,0,7,12,30);
  const s1=mkWin("KXBTC15M-s1",base+6*WEEK,15,"yes",0.8,50,{shock:true});   /* .25-.04 = .21 */
  const s2=mkWin("KXBTC15M-s2",base+7*WEEK,15,"yes",0.6,50,{shock:true});   /* .25-.16 = .09 */
  STUB_RELEASES.push(s1.open+MIN,s2.open+MIN);
  const rows=[s1,s2];
  for(let i=0;i<3;i++) rows.push(mkWin("KXBTC15M-k"+i,base+i*WEEK,15,"yes",0.7,60));  /* only 3 controls */
  close("shock 1 skill is +0.21",U.scSkill(s1).skill,0.21);
  close("shock 2 skill is +0.09",U.scSkill(s2).skill,0.09);
  const UNCOND=0.15;                                  /* (0.21 + 0.09) / 2, by hand */
  const P=U.scPairs(rows);
  eq("no shock window is matched",P.ctrlMatched,0);
  const D=U.scDid(P.pairs);
  eq("there is no controlled estimate",D.controlled,null);
  eq("...so the unconditional one is withheld",D.uncontrolled,null);
  eq("...with a reason",D.code,U.SC_OMIT.NO_MATCHED);
  /* scan every export's output for the unconditional mean */
  function deepHas(v,x,seen){
    if(typeof v==="number") return isFinite(v)&&Math.abs(v-x)<1e-12;
    if(!v||typeof v!=="object") return false;
    seen=seen||[]; if(seen.indexOf(v)>=0) return false; seen.push(v);
    for(const k in v) if(deepHas(v[k],x,seen)) return true;
    return false;
  }
  /* EVERY export, not a hand-picked list: a function added later that hands back the unconditional
     figure alone is caught by this too, because the scan is over Object.keys, not over a literal. */
  const opts={arms:1,pnlN:0,pnlNet:0,detPrecision:null,monthsElapsed:0,frozen:false,holdoutSpent:false};
  const ARGSETS=[[rows,opts],[s1,rows],[s1],[P.pairs],[P.pairs,1,null],[rows],[{},opts],[s2,rows],[s2]];
  const leaked=[];
  for(const name in U){
    if(typeof U[name]!=="function"||!/^sc/.test(name)) continue;
    for(let a=0;a<ARGSETS.length;a++){
      let r=null;
      try{ r=U[name].apply(null,ARGSETS[a]); }catch(e){ continue; }
      if(deepHas(r,UNCOND)) leaked.push(name+"#"+a);
    }
  }
  eq("no export returns the unconditional shock mean when there is no controlled estimate",
     leaked.join(","),"");
  /* AND THE HALF THAT MATTERS: a fixture where a controlled estimate genuinely EXISTS. The scan above runs on
     a fixture where every shock window is unmatched, so `P.pairs` is empty and most of the argument sets it
     sweeps are empty arrays -- it proves the refusal branch withholds the figure and nothing at all about the
     branch that produces one. Two shock windows, skills +0.21 and +0.16, sharing one control set of mean 0.05:
     paired 0.16 and 0.11, CONTROLLED estimate 0.135, UNCONDITIONAL mean 0.185. 0.185 is not equal to any
     individual measurement anywhere in the fixture, so finding it is finding the aggregate. */
  STUB_RELEASES.length=0;
  const MF=matcherFixture(false);
  const m2=mkWin("KXBTC15M-shock2",MF.shock.open+WEEK,15,"yes",0.7,50,{shock:true});
  STUB_RELEASES.push(m2.open+5*MIN);
  MF.rows.push(m2);
  const MP=U.scPairs(MF.rows);
  eq("both shock windows are matched",MP.ctrlMatched,2);
  close("shock skills are +0.21 and +0.16",MP.pairs[0].shockSkill+MP.pairs[1].shockSkill,0.37,1e-12);
  const MD=U.scDid(MP.pairs);
  const CONTROLLED=0.135, UNCOND2=0.185;         /* by hand: (0.16+0.11)/2 and (0.21+0.16)/2 */
  close("the controlled estimate is 0.135",MD.controlled,CONTROLLED,1e-12);
  close("the unconditional one is 0.185",MD.uncontrolled,UNCOND2,1e-12);
  ok("...and 0.185 is not any individual measurement in the fixture",
     ![0.21,0.16,0.11,0.05,0.07,0.12,0,-0.09,0.15,0.135].some(function(x){ return Math.abs(x-UNCOND2)<1e-12; }));
  const opts2={arms:1,pnlN:0,pnlNet:0,detPrecision:null,monthsElapsed:0,frozen:false,holdoutSpent:false};
  const ARG2=[[MF.rows,opts2],[MF.shock,MF.rows],[MF.shock],[MP.pairs],[MP.pairs,1,null],[MF.rows],
              [{},opts2],[m2,MF.rows],[m2]];
  const alone=[];
  for(const name in U){
    if(typeof U[name]!=="function"||!/^sc/.test(name)) continue;
    for(let a=0;a<ARG2.length;a++){
      let r=null;
      try{ r=U[name].apply(null,ARG2[a]); }catch(e){ continue; }
      if(deepHas(r,UNCOND2)&&!deepHas(r,CONTROLLED)) alone.push(name+"#"+a);
    }
  }
  eq("with a controlled estimate available, no export hands back the unconditional mean WITHOUT it",
     alone.join(","),"");
  ok("scPairs does not compute the unconditional aggregate at all",!deepHas(MP,UNCOND2));
  ok("scDid carries it only beside the controlled estimate",deepHas(MD,UNCOND2)&&deepHas(MD,CONTROLLED));
  /* and when there IS one, the two arrive together or not at all */
  const F=matcherFixture(false);
  const P2=U.scPairs(F.rows);
  const D2=U.scDid(P2.pairs);
  ok("a real controlled estimate is a number",typeof D2.controlled==="number");
  ok("...and the unconditional figure is its sibling, never its substitute",typeof D2.uncontrolled==="number");
  ok("the two are different numbers",D2.controlled!==D2.uncontrolled);
  /* shock skill 0.21, control mean 0.05 -> paired 0.16 */
  close("the controlled estimate is 0.21 - 0.05 = 0.16",D2.controlled,0.16);
  close("the unconditional one is 0.21",D2.uncontrolled,0.21);
  close("the loss-ordered reading is reported as the exact negation",D2.toolMinusMarket,-0.16);
  ok("SIGN: the tool is better, so the CONTROLLED estimate is POSITIVE",D2.controlled>0);
}
sect("THE SIGN, end to end: a worse tool must never produce a positive dBrier");
{
  const F=matcherFixture(false);
  /* same fixture, but the shock window's tool read is catastrophically worse than the market's */
  const bad=mkWin("KXBTC15M-shock",F.shock.open,15,"yes",0.4,90,{shock:true});
  F.rows[0]=bad;
  const P=U.scPairs(F.rows);
  eq("the window is still matched",P.ctrlMatched,1);
  close("shock skill is -0.35",P.pairs[0].shockSkill,-0.35);
  close("...paired against a control mean of 0.05 gives -0.40",P.pairs[0].paired,-0.40);
  const D=U.scDid(P.pairs);
  ok("SIGN: the tool is worse, so the controlled estimate is NEGATIVE",D.controlled<0);
  const st=U.scAssemble({phase:1,nCal:30,nHold:30,sd:0.01,dBrier:D.controlled,ciLo:-0.5,
    ctrlMatched:1,ctrlTotal:1},{arms:1,pnlN:100,pnlNet:999,detPrecision:null,monthsElapsed:1,
    frozen:true,holdoutSpent:false}).st;
  const v=U.shockStatus(st);
  ok("shockStatus does NOT read READY on a worse-than-market arm",v.status!=="READY",v);
  eq("...it abandons under 11.7 clause 1",v.status,"ABANDON");
}

/* ==================================================================================================== */
sect("11.5 / section 4: what may never be pooled");
{
  STUB_RELEASES.length=0;
  const base=Date.UTC(2026,0,7,12,30);
  const a=mkWin("KXBTC15M-p1",base,15,"yes",0.7,60); a.phase=1;
  const b=mkWin("KXBTC15M-p2",base+WEEK,15,"yes",0.7,60); b.phase=2;
  eq("mixed phases are refused",U.scPhaseGuard([a,b]).ok,false);
  eq("one phase is fine",U.scPhaseGuard([a]).ok,true);
  eq("scPairs refuses a mixed-phase set",U.scPairs([a,b]).code,U.SC_OMIT.MIXED_PHASE);
  eq("...and returns no pairs",U.scPairs([a,b]).pairs.length,0);
  const h=mkWin("KXBTCD-h1",base+2*WEEK,60,"yes",0.7,60);
  eq("mixed series are refused",U.scSeriesGuard([a,h]).ok,false);
  eq("one series is fine",U.scSeriesGuard([a]).ok,true);
  eq("scPairs refuses a mixed-series set",U.scPairs([a,h]).code,U.SC_OMIT.MIXED_SERIES);
  eq("...and returns no pairs",U.scPairs([a,h]).pairs.length,0);
  const FULL={arms:1,frozen:true,holdoutSpent:false,pnlN:99,pnlNet:9,monthsElapsed:1};
  const rep=U.scReport([a,b],FULL);
  eq("scReport refuses a mixed-phase set",rep.code,U.SC_OMIT.MIXED_PHASE);
  eq("...and computes no difference-in-differences",rep.did,null);
  ok("...and its status is not READY",rep.status.status!=="READY",rep.status);
  /* S7: a call 11.5 forbids outright used to report "CALIBRATING / calibration set incomplete" -- a benign
     progress message, visible as a violation only in rep.code, which nothing surfaces. */
  eq("...and it REPORTS the refusal, rather than answering on the window count",rep.status.status,"REFUSED");
  eq("...naming the rule it broke",rep.status.code,U.SC_OMIT.MIXED_PHASE);
  ok("...in words that say so",/never pooled \(11\.5\)/.test(rep.status.why),rep.status.why);
  ok("...and never as CALIBRATING",rep.status.status!=="CALIBRATING");
  const repS=U.scReport([a,h],FULL);
  eq("a mixed-series call reports its refusal too",repS.status.status,"REFUSED");
  eq("...naming section 4's split",repS.status.code,U.SC_OMIT.MIXED_SERIES);
  /* "no shock windows yet" and "none matched yet" are progress, not violations, and stay with the judge */
  const none=mkWin("KXBTC15M-none",base+20*WEEK,15,"yes",0.7,60);
  const repN=U.scReport([none],FULL);
  eq("a set with no shock windows is not a refusal",repN.status.status,"CALIBRATING");
  eq("...it is simply nothing to score yet",repN.code,U.SC_OMIT.NO_SHOCKS);
}
sect("S3 / S10: the phase is required, is a NUMBER, and an absent one refuses");
{
  STUB_RELEASES.length=0;
  const base=Date.UTC(2026,0,7,12,30);
  const a=mkWin("KXBTC15M-q1",base,15,"yes",0.7,60);
  const b=mkWin("KXBTC15M-q2",base+WEEK,15,"yes",0.7,60);
  const noPhase=mkWin("KXBTC15M-q3",base+2*WEEK,15,"yes",0.7,60); delete noPhase.phase;
  eq("a row set with no phase at all is refused",U.scPhaseGuard([noPhase]).ok,false);
  eq("...with its own reason code",U.scPhaseGuard([noPhase]).code,U.SC_OMIT.NO_PHASE);
  eq("one row missing its phase refuses the whole set",U.scPhaseGuard([a,noPhase]).ok,false);
  eq("scPairs refuses it, rather than reporting phase null",U.scPairs([a,noPhase]).code,U.SC_OMIT.NO_PHASE);
  eq("...and reports no phase",U.scPairs([a,noPhase]).phase,null);
  /* THE FINDING: with phase absent, shockStatus's `if(st.phase===2)` block never ran, so a phase-2 arm with
     no confusion matrix reached READY by OMITTING a field. */
  const st2=U.scAssemble({phase:2,nCal:30,nHold:30,sd:0.01,dBrier:0.02,ciLo:0.01,ctrlMatched:10,ctrlTotal:10},
    {arms:1,pnlN:30,pnlNet:1,monthsElapsed:3,frozen:true,holdoutSpent:false}).st;
  eq("phase 2 without a confusion matrix is INVALID (11.5)",U.shockStatus(st2).status,"INVALID");
  const stNull=U.scAssemble({phase:null,nCal:30,nHold:30,sd:0.01,dBrier:0.02,ciLo:0.01,
    ctrlMatched:10,ctrlTotal:10},{arms:1,pnlN:30,pnlNet:1,monthsElapsed:3,frozen:true,holdoutSpent:false}).st;
  eq("...but a NULL phase sails past that gate, which is why the gate cannot be here",
     U.shockStatus(stNull).status,"READY");
  const FULL={arms:1,frozen:true,holdoutSpent:false,pnlN:99,pnlNet:9,monthsElapsed:1};
  const repNP=U.scReport([a,noPhase],FULL);
  eq("so scReport refuses a phaseless row set outright",repNP.status.status,"REFUSED");
  eq("...naming the absent phase",repNP.status.code,U.SC_OMIT.NO_PHASE);
  ok("...and never reaches READY through it",repNP.status.status!=="READY");
  /* S10: phase 1 and phase "1" pooled silently, because shockPoolGuard collects phases as object keys */
  const strPhase=mkWin("KXBTC15M-q4",base+3*WEEK,15,"yes",0.7,60); strPhase.phase="1";
  eq("a string phase is refused, not coerced",U.scPhaseGuard([a,strPhase]).ok,false);
  eq("...with its own reason code",U.scPhaseGuard([a,strPhase]).code,U.SC_OMIT.BAD_PHASE);
  eq("scPairs refuses it too",U.scPairs([a,strPhase]).code,U.SC_OMIT.BAD_PHASE);
  eq("prereg's own guard would have pooled them, which is why the check is here",
     U.shockPoolGuard?U.shockPoolGuard([a,strPhase]).ok:true,true);
  const strPhase2=mkWin("KXBTC15M-q5",base+4*WEEK,15,"yes",0.7,60); strPhase2.phase="2";
  eq("a string \"2\" cannot creep past shockStatus's === comparison either",
     U.scPairs([strPhase2]).code,U.SC_OMIT.BAD_PHASE);
}

/* ==================================================================================================== */
sect("11.6 the holdout split: chronological, by count, and hard to move");
{
  function pair(i,close){ return {ticker:"KXBTC15M-"+i,open:close-15*MIN,close:close,
    paired:i/1000,shockSkill:i/1000,ctrlMeanSkill:0,nCtrl:5}; }
  const base=Date.UTC(2026,0,7,12,30);
  const ordered=[]; for(let i=0;i<40;i++) ordered.push(pair(i,base+i*WEEK));
  const shuffled=ordered.slice();
  for(let i=shuffled.length-1;i>0;i--){ const j=(i*7+3)%(i+1); const t=shuffled[i]; shuffled[i]=shuffled[j]; shuffled[j]=t; }
  const A=U.scSplit(ordered), B=U.scSplit(shuffled);
  eq("scSplit takes exactly one argument (there is no n to pass)",U.scSplit.length,1);
  eq("calibration is the first 30",A.cal.length,30);
  eq("holdout is everything after",A.hold.length,10);
  const idOf=function(s){ return s.map(function(p){ return p.ticker; }).join(","); };
  eq("shuffling the input does not change the calibration set",idOf(A.cal),idOf(B.cal));
  eq("shuffling the input does not change the holdout set",idOf(A.hold),idOf(B.hold));
  let asc=true; for(let i=1;i<A.cal.length;i++) if(A.cal[i].close<A.cal[i-1].close) asc=false;
  ok("calibration is in time order",asc);
  ok("every calibration close precedes every holdout close",
     A.cal[A.cal.length-1].close<A.hold[0].close);
  eq("the boundary is stamped with the 30th window",A.boundary.ticker,"KXBTC15M-29");
  eq("...and its count",A.boundary.n,30);
  eq("below 30 pairs there is no boundary yet",U.scSplit(ordered.slice(0,29)).boundary,null);
  /* the backfill hazard: a window recorded late but dated early shifts the line */
  const back=ordered.slice(); back.push(pair(999,base+5*WEEK+3600000));
  const C=U.scSplit(back);
  eq("a backfilled early window moves the boundary",U.scSplitStable(A.boundary,C.boundary).moved,true);
  eq("...and says which way",U.scSplitStable(A.boundary,C.boundary).why,"boundary window close changed");
  eq("an unchanged boundary is not a move",U.scSplitStable(A.boundary,A.boundary).moved,false);
  /* ties are broken deterministically, so the boundary cannot wobble on enumeration order */
  const tie=[{ticker:"b",close:1,paired:0},{ticker:"a",close:1,paired:0}];
  eq("a tie is broken by ticker",U.scSplit(tie).cal[0].ticker,"a");
}
sect("S5: the boundary is REGISTERED, not recomputed, and the required n only ratchets up");
{
  /* scSplitCheck first, on stamps alone */
  const b1={n:30,close:1000,ticker:"KXBTC15M-a",fp:"deadbeef-30"};
  const b2={n:30,close:1900,ticker:"KXBTC15M-b",fp:"deadbeef-30"};
  eq("an unregistered boundary is reported, not refused",U.scSplitCheck(b1,null).refuse,false);
  ok("...and says it is unregistered",/not yet registered/.test(U.scSplitCheck(b1,null).why));
  eq("a registered boundary that matches is accepted",U.scSplitCheck(b1,b1).registeredOk,true);
  eq("...and not refused",U.scSplitCheck(b1,b1).refuse,false);
  eq("a computed boundary that DIFFERS is refused",U.scSplitCheck(b2,b1).refuse,true);
  eq("...and says which way it moved",U.scSplitCheck(b2,b1).why,"boundary window close changed");
  eq("a registered boundary with nothing to compare against is refused",U.scSplitCheck(null,b1).refuse,true);
  eq("garbage in the registered slot is refused",U.scSplitCheck(b1,{n:30}).refuse,true);
  eq("...and so is a stamp with no calibration-set fingerprint",
     U.scSplitCheck(b1,{n:30,close:1000,ticker:"KXBTC15M-a"}).refuse,true);
  /* the ratchet, on numbers alone (11.2a: "it may only ever move up") */
  eq("with nothing registered the computed requirement stands",U.scRatchet(80,null).effective,80);
  eq("a LARGER registered requirement wins",U.scRatchet(44,80).effective,80);
  eq("...and is flagged as a ratchet",U.scRatchet(44,80).ratcheted,true);
  eq("...and the downward computation is reported, not hidden",U.scRatchet(44,80).movedDown,true);
  eq("a larger COMPUTED requirement also wins, because it only moves up",U.scRatchet(120,80).effective,120);
  eq("...and is not a ratchet",U.scRatchet(120,80).ratcheted,false);
  eq("a requirement that cannot be computed falls back to the registered one",U.scRatchet(null,80).effective,80);
  /* END TO END: ordinary control churn -- one control row ageing out of a 15-day buffer -- moves the boundary.
     10.2 prunes btc.edge at ~15 days and section 8 puts this programme at ~15 months, so this is guaranteed. */
  STUB_RELEASES.length=0;
  const base=Date.UTC(2026,0,7,12,30), cps=[0.700,0.705,0.695,0.700,0.700];
  const rows=[];
  for(let i=0;i<35;i++){
    const t0=base+i*15*MIN;
    for(let j=0;j<5;j++) rows.push(mkWin("KXBTC15M-c"+i+"-"+j,t0+j*WEEK,15,"yes",cps[j],60));
    const w=mkWin("KXBTC15M-s"+i,t0+6*WEEK,15,"yes",[0.80,0.60,0.90][i%3],60,{shock:true});
    STUB_RELEASES.push(w.open+5*MIN); rows.push(w);
  }
  const OPT={arms:1,pnlN:30,pnlNet:1,monthsElapsed:6,frozen:true,holdoutSpent:false};
  const r1=U.scReport(rows,OPT);
  const pruned=[]; for(let i=0;i<rows.length;i++) if(rows[i].ticker!=="KXBTC15M-c0-0") pruned.push(rows[i]);
  const r2=U.scReport(pruned,OPT);
  ok("run 1 establishes a boundary",!!r1.split.boundary,r1.split);
  ok("pruning ONE old control row moves it",U.scSplitStable(r1.split.boundary,r2.split.boundary).moved,
     {a:r1.split.boundary,b:r2.split.boundary});
  eq("...which the unit itself reports, rather than leaving it to the caller to notice",
     U.scReport(pruned,Object.assign({},OPT,{boundary:r1.split.boundary})).boundary.moved,true);
  const rMoved=U.scReport(pruned,Object.assign({},OPT,{boundary:r1.split.boundary}));
  eq("...and it REFUSES rather than silently adopting the new boundary",rMoved.status.status,"REFUSED");
  eq("...naming the rule",rMoved.status.code,U.SC_OMIT.BOUNDARY_MOVED);
  eq("...and computes no difference-in-differences against it",rMoved.did,null);
  eq("...and no CI",rMoved.ci,null);
  ok("...and says 11.6 spends the holdout for it",/spends the holdout/.test(rMoved.status.why),rMoved.status.why);
  const rOk=U.scReport(rows,reg(rows,OPT));
  eq("the SAME rows against their own registered boundary are not refused",rOk.boundary.registeredOk,true);
  ok("...and score normally",rOk.ok===true&&rOk.did!==null);
  ok("...and reach a verdict rather than a refusal",rOk.status.status!=="REFUSED",rOk.status);
  /* the required n ratchets: a registered requirement is never traded down for a smaller computed one */
  const R=grid(120,[0.80,0.81,0.79],[0.700,0.705,0.695,0.700,0.700]);
  const RBASE={arms:1,pnlN:30,pnlNet:12.5,monthsElapsed:6,frozen:true,holdoutSpent:false};
  const RREG=reg(R.rows,RBASE);
  seeded(5150,function(){
    const good=U.scReport(R.rows,RREG);
    eq("this fixture reaches READY once both registrations are supplied",good.status.status,"READY",good.status);
    ok("...on a computed requirement of its own",typeof good.holdN.computed==="number",good.holdN);
    const held=U.scReport(R.rows,Object.assign({},RREG,{holdNRegistered:999}));
    eq("a REGISTERED requirement of 999 is not traded down for the computed one",held.holdN.effective,999);
    eq("...so the same evidence reads HOLDOUT, not READY",held.status.status,"HOLDOUT");
    ok("...against the registered requirement",/may only ever move up/.test(held.status.why),held.status.why);
    eq("...and the status reports the registered n, not the recomputed one",held.status.holdNReq,999);
    eq("...and the downward move is on the record",held.holdN.movedDown,true);
    const late=U.scReport(R.rows,Object.assign({},RREG,{holdNRegistered:999,monthsElapsed:25}));
    eq("...and past 24 months an unreachable registered n abandons (11.7 clause 5)",late.status.status,"ABANDON");
    const smaller=U.scReport(R.rows,Object.assign({},RREG,{holdNRegistered:U.SCORE.HOLD_N_MIN}));
    eq("a registered requirement SMALLER than the computed one changes nothing",smaller.holdN.effective,
       smaller.holdN.computed);
    eq("...and READY still stands",smaller.status.status,"READY");
    /* 11.2a's floor is 30 and a registration BELOW it is a loosening, which 11.7 clause 6 closes the
       programme for. It is refused rather than clamped. */
    const under=U.scReport(R.rows,Object.assign({},RREG,{holdNRegistered:1}));
    eq("a registered requirement below 11.2a's floor of 30 is refused",under.status.status,"REFUSED");
    eq("...as a caller-field violation",under.status.code,U.SC_OMIT.BAD_OPT);
  });
  /* the ratchet may only tighten: a status that is already a refusal or an abandonment is untouched */
  const abandoned={status:"ABANDON",why:"w",ciLevel:0.9,bootstrapB:200,holdNReq:30};
  eq("the ratchet never upgrades an ABANDON",U.scRatchetStatus(abandoned,0,{effective:999},1).status,"ABANDON");
  eq("...nor a FROZEN-PENDING",
     U.scRatchetStatus({status:"FROZEN-PENDING",why:"w"},0,{effective:999},1).status,"FROZEN-PENDING");
  eq("...and leaves READY alone once the registered n is reached",
     U.scRatchetStatus({status:"READY",why:"w"},999,{effective:999},1).status,"READY");
  STUB_RELEASES.length=0;
}
sect("11.2a: sd of the PAIRED difference, calibration half only");
{
  function pairs(vals){ const a=[]; for(let i=0;i<vals.length;i++)
    a.push({ticker:"t"+i,close:i,paired:vals[i],shockSkill:vals[i]+9,ctrlMeanSkill:9,nCtrl:5}); return a; }
  const v30=[]; for(let i=0;i<30;i++) v30.push(i%2?1:-1);
  /* mean 0; every deviation is 1; 30 of them; sample variance 30/29 */
  close("sd is the SAMPLE sd (n-1) of the paired values",U.scSd(pairs(v30)),Math.sqrt(30/29),1e-12);
  ok("...which is not the population sd",Math.abs(U.scSd(pairs(v30))-1)>1e-6);
  const v29=v30.slice(0,29);
  eq("29 calibration windows yield NO sd",U.scSd(pairs(v29)),null);
  eq("an empty calibration set yields no sd",U.scSd([]),null);
  const flat=[]; for(let i=0;i<30;i++) flat.push(0);
  eq("an identical calibration set has sd exactly zero",U.scSd(pairs(flat)),0);
  eq("...and a zero sd cannot open a holdout",U.shockRequiredHoldN(U.scSd(pairs(flat)),1,0.5),null);
  eq("a null sd cannot open a holdout either",U.shockRequiredHoldN(null,1,0.5),null);
  /* the sd is of the PAIRED value, not of the shock skills: same fixture, shock skills are paired+9,
     which has the same spread -- so use a fixture where they differ */
  const mixed=[{ticker:"a",close:1,paired:0,shockSkill:0,ctrlMeanSkill:0,nCtrl:5}];
  for(let i=1;i<30;i++) mixed.push({ticker:"x"+i,close:i+1,paired:0,shockSkill:i,ctrlMeanSkill:i,nCtrl:5});
  close("sd ignores the shock skills entirely",U.scSd(mixed),0);
}
sect("11.4 / 11.2a: the CI level, B, and what it is taken over");
{
  const cap=[];
  const spy=function(vals,fn,level,B){ cap.push({vals:vals.slice(),level:level,B:B,stat:fn(vals)});
    return {lo:0.011,hi:0.09,point:0.5}; };
  /* two shock windows in ONE cell, sharing one five-window control set */
  const CS=[-0.04,-0.02,0,0.02,0.04];                       /* mean 0 */
  const P=[mkPair("a",1,0.02,"15m|50|3|2026Q1",CS,0.02),
           mkPair("b",2,0.04,"15m|50|3|2026Q1",CS,0.04)];
  const c1=U.scCi(P,1,spy);
  close("k=1 is the 0.90 level, identical to VERDICT_RULE",c1.level,0.90,1e-12);
  eq("...and 200 resamples, 10 per tail",c1.B,200);
  const c20=U.scCi(P,20,spy);
  close("k=20 is the 0.995 level (11.4)",c20.level,0.995,1e-12);
  eq("...and 4000 resamples (11.2a)",c20.B,4000);
  eq("scCi uses prereg's shockCiLevel, not its own",c20.level,U.shockCiLevel(20));
  eq("scCi uses prereg's shockBootstrapB, not its own",c20.B,U.shockBootstrapB(U.shockCiLevel(20)));
  eq("the bootstrap is handed the level scCi reports",cap[0].level,c1.level);
  eq("the bootstrap is handed B, not some other count",cap[0].B,c1.B);
  /* THE RESAMPLING UNIT. What reaches the bootstrap is the array of matching CELLS, not the paired column:
     two shock windows sharing one control set are ONE resampling unit, not two. */
  const drew=(cap[0].vals[0]&&typeof cap[0].vals[0]==="object")?cap[0].vals[0]:{};
  eq("the bootstrap resamples CELLS, not paired values",cap[0].vals.length,1);
  ok("...and what it resamples is a cell, not a number",typeof cap[0].vals[0]==="object",cap[0].vals[0]);
  eq("...and the cell carries both its shock windows",(drew.shocks||[]).length,2);
  eq("...and its whole control set with them",(drew.ctrl||[]).length,5);
  eq("scCi says what its resampling unit is",c1.unit,"cell");
  eq("...and how many there were",c1.cells,1);
  eq("the point estimate is the observed mean paired difference, not a bootstrap replicate",c1.point,0.03);
  eq("the CI's lower bound is passed through untouched",c1.lo,0.011);
  eq("a pair with no cell has no resampling unit and no interval",
     U.scCi([{ticker:"x",close:1,paired:0.02,shockSkill:0.02}],1,spy).code,U.SC_OMIT.NO_CELL);
  eq("...and a cell with no control set does not either",
     U.scCi([{ticker:"x",close:1,paired:0.02,shockSkill:0.02,cell:"c",ctrl:[]}],1,spy).code,U.SC_OMIT.NO_CELL);
  /* k is the caller's, and its absence is its own reason code -- not `no-prereg` while prereg is in scope */
  eq("an absent k says so, and does not blame prereg",U.scCi(P,undefined,spy).code,U.SC_OMIT.NO_ARMS);
  eq("...nor does k=0",U.scCi(P,0,spy).code,U.SC_OMIT.NO_ARMS);
  ok("...and prereg IS present, which is what makes the old label wrong",U.scHasPrereg());
  /* the analytic bootstrap: with every control identical AND every shock identical there is nothing left to
     resample at either stage, so the interval is a point -- true for EVERY draw */
  const D=[]; for(let i=0;i<12;i++) D.push(mkPair("d"+i,i,0.04,"15m|50|3|2026Q1",[0,0,0,0,0],0.04));
  const cd=U.scCi(D,1,null);
  close("a fully degenerate sample gives lo == the value",cd.lo,0.04);
  close("...and hi == the value",cd.hi,0.04);
  close("...and point == the value",cd.point,0.04);
  /* strictly-positive samples: every possible two-stage replicate is positive, so lo>0 on every draw */
  const Pp=[];
  for(let i=0;i<20;i++) Pp.push(mkPair("p"+i,i,0.01+i/1000,"15m|"+i+"|3|2026Q1",[0,0,0,0,0],0.01+i/1000));
  const cp=U.scCi(Pp,1,null);
  ok("an all-positive sample has a strictly positive lower bound",cp.lo>0,cp);
  ok("lo <= point <= hi",cp.lo<=cp.point&&cp.point<=cp.hi,cp);
  eq("an empty holdout has no CI",U.scCi([],1,null).code,U.SC_OMIT.NO_MATCHED);
}
sect("S1: the CI must see the sampling error in a SHARED control mean (11.3, 11.2a)");
{
  /* THE REVIEWER'S FIXTURE, verbatim in shape. One matching cell. Five controls with skills
     -0.24 -0.12 0 +0.12 +0.24 -- mean 0, sample sd 0.1897, so the standard error of that five-window mean is
     0.0848. Seven shock windows reading identically, so every paired value is the SAME number.
     The window-level bootstrap resamples seven copies of one value: width exactly zero, lo = +0.0341 > 0,
     which is half of READY asserted with certainty about a quantity whose sign the data does not establish. */
  const CS=[-0.24,-0.12,0,0.12,0.24];
  const SH=0.0341;
  const pairs=[];
  for(let i=0;i<7;i++) pairs.push(mkPair("KXBTC15M-s"+i,i,SH,"15m|50|3|2026Q1",CS,SH));
  close("every paired value is identical, so the naive resample has nothing to vary",
        pairs[0].paired-pairs[6].paired,0);
  const seSharedMean=U.scSdOf(CS)/Math.sqrt(5);
  close("the sample sd of the shared control set is 0.1897",U.scSdOf(CS),0.18973665961010275,1e-12);
  close("...so the standard error of the mean it contributes is 0.0848",seSharedMean,0.08485281,1e-7);
  ok("...which is 2.5x the point estimate itself",seSharedMean/SH>2.4,seSharedMean/SH);
  const widths=[],naive=[];
  for(let sd=1;sd<=5;sd++){
    seeded(sd*7919,function(){
      const naiveCI=naiveCi(pairs,0.90,200);
      const ci=U.scCi(pairs,1,bootstrapCI);
      naive.push(naiveCI.hi-naiveCI.lo);
      widths.push({w:ci.hi-ci.lo,lo:ci.lo,hi:ci.hi,point:ci.point});
    });
  }
  ok("the WINDOW-level bootstrap returns width exactly zero on this fixture",
     naive.every(function(w){ return w===0; }),naive);
  ok("the CLUSTER bootstrap returns a NON-DEGENERATE interval, on every seed",
     widths.every(function(x){ return x.w>0; }),widths);
  ok("...and it is WIDER than the naive one, on every seed",
     widths.every(function(x,i){ return x.w>naive[i]; }),{cluster:widths.map(function(x){return x.w;}),naive:naive});
  ok("...wide enough to carry the shared control mean's own error",
     widths.every(function(x){ return x.w>=seSharedMean; }),widths);
  ok("...and it no longer asserts the sign with certainty: lo <= 0 on this fixture, on every seed",
     widths.every(function(x){ return x.lo<=0; }),widths);
  ok("the point estimate is unchanged by the change of resampling unit",
     widths.every(function(x){ return Math.abs(x.point-SH)<1e-12; }),widths);
}
sect("S1: the cluster interval is wider than the naive one where the control means genuinely vary too");
{
  /* three cells, five controls each with real spread, four shock windows each. The naive bootstrap sees only
     the spread of the paired column; the cluster one also sees the control means being estimates. */
  const cells=[{k:"15m|50|3|2026Q1",cs:[-0.20,-0.10,0,0.10,0.20]},
               {k:"15m|54|4|2026Q1",cs:[-0.16,-0.08,0,0.08,0.16]},
               {k:"15m|58|5|2026Q1",cs:[-0.24,-0.12,0,0.12,0.24]}];
  const pairs=[]; let n=0;
  for(let i=0;i<cells.length;i++) for(let j=0;j<4;j++){
    const v=0.02+0.004*j;
    pairs.push(mkPair("KXBTC15M-w"+(n++),n,v,cells[i].k,cells[i].cs,v));
  }
  let wider=0,seeds=0;
  for(let sd=1;sd<=5;sd++) seeded(sd*104729,function(){
    seeds++;
    const nv=naiveCi(pairs,0.90,200), cl=U.scCi(pairs,1,bootstrapCI);
    if((cl.hi-cl.lo)>(nv.hi-nv.lo)) wider++;
  });
  eq("the cluster interval is wider than the naive one on every seed",wider,seeds);
  seeded(20260906,function(){
    const cl=U.scCi(pairs,1,bootstrapCI);
    eq("twelve shock windows in three cells are THREE resampling units",cl.cells,3);
    eq("...and n still reports the twelve windows",cl.n,12);
  });
}
sect("S1: what the cluster bootstrap carries together, and what it re-estimates");
{
  const cells=[{key:"c1",shocks:[1,1,1],ctrl:[0,0,0,0,0]}];
  eq("a cell whose controls are identical re-estimates the same mean every time",U.scClusterStat(cells),1);
  const many=[{key:"c1",shocks:[1],ctrl:[-1,1]}];
  const seen={};
  seeded(4242,function(){ for(let i=0;i<200;i++) seen[U.scClusterStat(many)]=1; });
  ok("a cell whose controls differ re-estimates a DIFFERENT mean across replicates",
     Object.keys(seen).length>1,Object.keys(seen));
  eq("...and every value it can take is 1 - (a mean of a resample of {-1,+1})",
     Object.keys(seen).sort().join(","),"0,1,2");
  /* the union: two shock windows in one cell must not multiply that cell's control set */
  const CS=[0.1,0.2,0.3,0.4,0.5];
  const two=[mkPair("a",1,0,"K",CS,0.3),mkPair("b",2,0,"K",CS,0.3)];
  const cl=U.scCells(two);
  eq("two shock windows in one cell are one cell",cl.cells.length,1);
  eq("...whose control set is counted ONCE, not once per shock window",cl.cells[0].ctrl.length,5);
  eq("...and which carries both shock windows",cl.cells[0].shocks.length,2);
  const split=[mkPair("a",1,0,"K1",CS,0.3),mkPair("b",2,0,"K2",CS,0.3)];
  eq("two shock windows in two cells are two cells",U.scCells(split).cells.length,2);
  eq("scClusterStat on nothing is null, never zero",U.scClusterStat([]),null);
}
/* ==================================================================================================== */
sect("assembling st: exactly fifteen fields, nothing defaulted to permissive");
{
  const WANT=["phase","nCal","nHold","arms","sd","dBrier","ciLo","ctrlMatched","ctrlTotal",
    "pnlN","pnlNet","detPrecision","monthsElapsed","frozen","holdoutSpent"].sort();
  const a=U.scAssemble({phase:1,nCal:30,nHold:30,sd:0.01,dBrier:0.02,ciLo:0.01,
    ctrlMatched:10,ctrlTotal:10},{arms:1,pnlN:30,pnlNet:1,detPrecision:0.9,monthsElapsed:3,
    frozen:true,holdoutSpent:false});
  eq("st carries exactly the fifteen fields shockStatus reads",Object.keys(a.st).sort().join(","),WANT.join(","));
  eq("...and nothing was reported missing",a.missing.length,0);
  const b=U.scAssemble({phase:1,nCal:30,nHold:30,sd:0.01,dBrier:0.02,ciLo:0.01,
    ctrlMatched:10,ctrlTotal:10},{arms:1,pnlN:30,pnlNet:1,monthsElapsed:3});
  eq("an absent `frozen` is NOT defaulted to true",b.st.frozen,undefined);
  ok("...and is named as missing",b.missing.indexOf("frozen")>=0,b.missing);
  eq("...so shockStatus refuses to open the holdout",U.shockStatus(b.st).status,"FROZEN-PENDING");
  eq("an absent holdoutSpent is not defaulted",b.st.holdoutSpent,undefined);
  ok("...and is named as missing",b.missing.indexOf("holdoutSpent")>=0);
  const c=U.scAssemble({phase:2,nCal:30,nHold:30,sd:0.01,dBrier:0.02,ciLo:0.01,
    ctrlMatched:10,ctrlTotal:10},{arms:1,pnlN:30,pnlNet:1,monthsElapsed:3,frozen:true,holdoutSpent:false});
  eq("an absent detPrecision is not defaulted for phase 2",c.st.detPrecision,undefined);
  eq("...so phase 2 is INVALID until its confusion matrix exists (11.5)",U.shockStatus(c.st).status,"INVALID");
  const d=U.scAssemble({phase:1,nCal:30,nHold:30,sd:0.01,dBrier:0.02,ciLo:0.01,
    ctrlMatched:10,ctrlTotal:10},{arms:1,pnlN:30,pnlNet:1,monthsElapsed:3,frozen:"true"});
  eq("a truthy-but-not-true frozen is passed through verbatim",d.st.frozen,"true");
  eq("...and shockStatus still refuses it",U.shockStatus(d.st).status,"FROZEN-PENDING");
  eq("SC_CALLER_FIELDS names the SEVEN fields the caller owns",U.SC_CALLER_FIELDS.length,7);
  eq("...and the other EIGHT are measured here",Object.keys(a.st).length-U.SC_CALLER_FIELDS.length,8);
  eq("...which is the fifteen shockStatus reads",Object.keys(a.st).length,15);
  /* the same count, stated in the source: the comment above scAssemble had it backwards */
  ok("code.js states the split the right way round",
     /EIGHT are MEASURED here[\s\S]{0,200}SEVEN are the caller's/.test(SRC),
     (SRC.match(/are MEASURED here[\s\S]{0,120}/)||[""])[0]);
}
sect("S6: a caller field the verdict depends on is a REFUSAL when it is missing, not a verdict");
{
  /* scAssemble defaults nothing -- and then the verdict used to be computed anyway. `holdoutSpent` is the
     sharp one: 11.6's spent-holdout flag arrives at shockStatus as undefined, which is NOT true, which is the
     value that lets the programme advance. `missing` named it and nothing acted on it. */
  const R=grid(120,[0.80,0.81,0.79],[0.700,0.705,0.695,0.700,0.700]);
  const FULL=reg(R.rows,{arms:1,pnlN:30,pnlNet:12.5,monthsElapsed:6,frozen:true,holdoutSpent:false,
    bootstrap:null});
  seeded(60606,function(){
    eq("the complete call reaches a verdict",U.scReport(R.rows,FULL).status.status,"READY");
    /* R2: `boundary` and `holdNRegistered` are in this list now. They were the two verdict-bearing caller
       fields left optional and unpoliced, which made 11.6's registered split and 11.2a's upward-only ratchet
       advisory -- see the dedicated block below for what each omission bought. */
    const drops=["holdoutSpent","monthsElapsed","arms","pnlN","pnlNet","frozen",
      "boundary","holdNRegistered"];
    for(let i=0;i<drops.length;i++){
      const o={}; for(const k in FULL) if(k!==drops[i]) o[k]=FULL[k];
      const rp=U.scReport(R.rows,o);
      eq("omitting "+drops[i]+" refuses instead of answering",rp.status.status,"REFUSED",rp.status);
      eq("...naming the hole",rp.status.code,U.SC_OMIT.MISSING_FIELDS);
      ok("...and saying which field it was",rp.status.why.indexOf(drops[i])>=0,rp.status.why);
      ok("...and it is never READY",rp.status.status!=="READY");
      ok("...while the measurements it DID make stay on the report",rp.did!==null&&rp.split!==null);
    }
    /* detPrecision is required only where 11.5 requires it */
    ok("a phase-1 call with no detPrecision is not refused for it",
       U.scReport(R.rows,FULL).missing.indexOf("detPrecision")>=0&&
       U.scReport(R.rows,FULL).status.status==="READY");
    eq("...because the required set is phase-dependent",U.scRequiredFields(1).indexOf("detPrecision"),-1);
    ok("...and phase 2 does require it",U.scRequiredFields(2).indexOf("detPrecision")>=0);
    eq("scMissingRequired names only the fields that decide the verdict",
       U.scMissingRequired(["detPrecision"],1).length,0);
    eq("...and does name detPrecision at phase 2",U.scMissingRequired(["detPrecision"],2).join(","),
       "detPrecision");
  });
  /* the mislabelled scCi code: `arms` missing is not prereg missing */
  const P=[mkPair("a",1,0.02,"15m|50|3|2026Q1",[0,0,0,0,0],0.02)];
  eq("an absent k is reported as no-arms",U.scCi(P,undefined,null).code,U.SC_OMIT.NO_ARMS);
  ok("...and prereg is present, which is what made `no-prereg` a lie",U.scHasPrereg());
  eq("a genuinely absent prereg still says no-prereg",ALONE.scCi([{paired:1}],1,null).code,
     ALONE.SC_OMIT.NO_PREREG);
}

/* ==================================================================================================== */
sect("the whole pass: a grid big enough to reach a holdout");
/* Weekly windows at one UTC slot and weekday. Within each calendar quarter the first five are controls and
   the rest are shocks, so every shock has exactly its own quarter's five controls -- which is also how the
   quarter dimension is tested: drop it and every shock sees every quarter's controls. */
function grid(nWeeks,shockP,ctrlP){
  STUB_RELEASES.length=0;
  const base=Date.UTC(2026,0,7,12,30);
  const byQ={},order=[];
  for(let k=0;k<nWeeks;k++){ const t=base+k*WEEK; const q=U.scQuarterUtc(t);
    if(!byQ[q]){ byQ[q]=[]; order.push(q); } byQ[q].push(t); }
  const rows=[],shocks=[],cps=ctrlP||[0.7,0.8,0.6,0.5,0.9];
  for(let i=0;i<order.length;i++){
    const ts=byQ[order[i]];
    if(ts.length<8) continue;                       /* a short quarter cannot host 5 controls and shocks */
    for(let j=0;j<5;j++) rows.push(mkWin("KXBTC15M-c-"+order[i]+"-"+j,ts[j],15,"yes",cps[j],60));
    for(let j=5;j<ts.length;j++){
      const p=shockP[(rows.length+j)%shockP.length];
      const w=mkWin("KXBTC15M-s-"+order[i]+"-"+j,ts[j],15,"yes",p,60,{shock:true});
      STUB_RELEASES.push(w.open+5*MIN);
      rows.push(w); shocks.push(w);
    }
  }
  return {rows:rows,shocks:shocks};
}
{
  const SHOCK_P=[0.70,0.71,0.72];
  const G=grid(120,SHOCK_P);
  ok("the grid has enough shock windows to reach a holdout",G.shocks.length>=60,G.shocks.length);
  const P=U.scPairs(G.rows);
  eq("every shock window is matched",P.ctrlMatched,P.ctrlTotal);
  eq("...to exactly five controls each",P.pairs[0].nCtrl,5);
  let allFive=true; for(let i=0;i<P.pairs.length;i++) if(P.pairs[i].nCtrl!==5) allFive=false;
  ok("EVERY shock window has exactly five controls (the quarter dimension holds)",allFive);
  eq("no shock window is unmatched",P.unmatched.length,0);
  /* the control mean skill is 0.05 in every quarter, by hand (see the matcher block) */
  close("the control mean skill is 0.05 in every quarter",P.pairs[0].ctrlMeanSkill,0.05);
  /* paired = (0.16 - (1-p)^2) - 0.05 for p in {0.70, 0.71, 0.72} */
  const wantPaired=SHOCK_P.map(function(p){ return skillOf(p,60,1)-0.05; });
  ok("every paired difference is one of the three the fixture builds",
     P.pairs.every(function(r){ return wantPaired.some(function(x){ return Math.abs(r.paired-x)<1e-12; }); }));
  /* every pair carries the cell it was matched in, and the identified control set behind its mean */
  ok("every pair carries its matching cell",P.pairs.every(function(r){ return typeof r.cell==="string"&&r.cell.length>0; }));
  ok("...and the five identified controls its mean came from",
     P.pairs.every(function(r){ return r.ctrl.length===5&&r.ctrl.every(function(c){ return typeof c.id==="string"; }); }));
  ok("...and the cell key is the four matching dimensions, nothing else",
     /^15m\|\d+\|\d\|\d{4}Q\d$/.test(P.pairs[0].cell),P.pairs[0].cell);
  const sp=U.scSplit(P.pairs);
  eq("calibration is 30 windows",sp.cal.length,30);
  eq("holdout is the rest",sp.hold.length,P.pairs.length-30);
  const sd=U.scSd(sp.cal);
  ok("the calibration half yields an sd",typeof sd==="number"&&sd>0,sd);
  /* sd, from the definition, computed HERE rather than by calling the code under test */
  const calVals=sp.cal.map(function(r){ return r.paired; });
  close("the calibration sd is the n-1 sd of the calibration paired values, computed independently",
        sd,sdRef(calVals),1e-15);
  const holdVals=sp.hold.map(function(r){ return r.paired; });
  const wantMean=holdVals.reduce(function(a,b){ return a+b; },0)/holdVals.length;
  const did=U.scDid(sp.hold);
  close("dBrier is the mean paired difference over the HOLDOUT",did.controlled,wantMean);
  ok("...and it is positive, because this fixture's tool is better",did.controlled>0);
  ok("...and above 11.2's effect floor",did.controlled>=U.SHOCK_RULE.dBrierFloor,did.controlled);

  const opts=reg(G.rows,{arms:1,pnlN:30,pnlNet:12.5,monthsElapsed:6,frozen:true,holdoutSpent:false,
    bootstrap:null});
  const rep=U.scReport(G.rows,opts);
  eq("the report is for phase 1",rep.st.phase,1);
  eq("nCal is the calibration count",rep.st.nCal,30);
  eq("nHold is the holdout count",rep.st.nHold,sp.hold.length);
  close("st.sd is the calibration sd, independently derived",rep.st.sd,sdRef(calVals),1e-15);
  ok("...and NOT the sd of every pair (11.6: measured on the calibration half)",
     Math.abs(rep.st.sd-sdRef(P.pairs.map(function(r){ return r.paired; })))>1e-9,rep.st.sd);
  close("st.dBrier is the holdout difference-in-differences",rep.st.dBrier,wantMean);
  const allMean=P.pairs.reduce(function(a,r){ return a+r.paired; },0)/P.pairs.length;
  ok("...and NOT the mean over every pair (11.6: READY is decided on the holdout alone)",
     Math.abs(rep.st.dBrier-allMean)>1e-9,{hold:rep.st.dBrier,all:allMean});
  /* ciLo is INDEPENDENTLY bounded rather than compared to rep.ci.lo, which would be tautological: every
     paired value in the holdout is one of three known constants, so every possible bootstrap replicate --
     naive or clustered -- lies between the smallest and largest attainable mean paired value. */
  const loB=Math.min.apply(null,holdVals)-0.5, hiB=Math.max.apply(null,holdVals)+0.5;
  ok("st.ciLo lies inside the range the fixture's own paired values can produce",
     rep.st.ciLo>loB&&rep.st.ciLo<hiB,{ciLo:rep.st.ciLo,lo:loB,hi:hiB});
  eq("coverage on the fixture that has all its controls is 100%",rep.st.ctrlMatched,rep.st.ctrlTotal);
  ok("the caveat travels with the report",rep.caveat===STUB_CAVEAT);
  ok("every scored pair carries its own known block",
     rep.split.calN===30&&P.pairs.every(function(r){ return r.known&&r.known.caveat===STUB_CAVEAT; }));
  ok("the required holdout n is reported",typeof rep.status.holdNReq==="number",rep.status);
  ok("detPrecision is reported missing rather than invented",rep.missing.indexOf("detPrecision")>=0,rep.missing);

  /* S1, ON THE REALISTIC GRID. This fixture's five controls carry a real spread (skills .07/.12/0/-.09/.15,
     sd 0.0929, so the mean each pair is built on carries a standard error of 0.0415 -- larger than the
     0.03 effect). Every paired value is positive, so the WINDOW-level bootstrap has a positive lower bound on
     every possible draw and the pass used to read READY. The CLUSTER bootstrap sees the control mean for what
     it is -- an estimate from five windows -- and the interval covers zero. */
  let naiveLoPos=0,clusterCoversZero=0,clusterLower=0,seeds=0;
  for(let sdi=1;sdi<=40;sdi++) seeded(sdi*1000003,function(){
    seeds++;
    const nv=naiveCi(sp.hold,0.90,200);
    const cl=U.scCi(sp.hold,1,bootstrapCI);
    if(nv.lo>0) naiveLoPos++;
    if(cl.lo<=0) clusterCoversZero++;
    if(cl.lo<nv.lo) clusterLower++;
  });
  /* the naive lower bound is positive for EVERY possible draw, not merely these seeds: every paired value in
     this fixture is positive, so every resample mean of them is. */
  eq("the window-level bootstrap called this fixture decisive on all 40 seeds",naiveLoPos,seeds);
  eq("...and the cluster bootstrap is strictly less certain on all 40",clusterLower,seeds);
  ok("...and its interval actually covers zero on most of them",clusterCoversZero>=seeds/2,
     {coversZero:clusterCoversZero,of:seeds});
  /* which is the whole finding at the level of the verdict: this fixture's edge (0.03) is smaller than the
     standard error of the five-window control mean each pair is built on (0.0415), so whether it reads READY
     is a coin flip across seeds -- where the window-level bootstrap called it READY every time. */
  let readies=0;
  for(let sdi=1;sdi<=20;sdi++) seeded(sdi*99991,function(){
    if(U.scReport(G.rows,opts).status.status==="READY") readies++;
  });
  ok("a fixture whose control noise swamps its edge no longer reads READY every time",readies<20,readies);

  /* the READY path, on a fixture whose CONTROL MEAN is precisely estimated: five controls reading nearly
     alike, so the cluster bootstrap has little control-side variance to add, and a large tool edge. */
  const TIGHT=[0.700,0.705,0.695,0.700,0.700];
  const R=grid(120,[0.80,0.81,0.79],TIGHT);
  const ropts=reg(R.rows,opts);
  seeded(777001,function(){
    const rr=U.scReport(R.rows,ropts);
    eq("a fixture with a tight control set and a real edge reaches READY",rr.status.status,"READY",rr.status);
    ok("...and READY is necessary, never sufficient",/necessary, never sufficient/.test(rr.status.why));
    ok("...on a strictly positive cluster lower bound",rr.ci.lo>0,rr.ci);
    ok("...taken over cells, not windows",rr.ci.unit==="cell"&&rr.ci.cells>0&&rr.ci.cells<rr.ci.n,rr.ci);
  });
  for(let sdi=1;sdi<=4;sdi++) seeded(sdi*31337,function(){
    eq("...on every seed",U.scReport(R.rows,ropts).status.status,"READY");
  });

  /* the same grid with the tool WORSE must not read READY */
  const W=grid(120,[0.40,0.41,0.42]);
  const repW=U.scReport(W.rows,reg(W.rows,opts));
  ok("a worse-than-market tool gives a NEGATIVE dBrier",repW.st.dBrier<0,repW.st.dBrier);
  ok("...and does not read READY",repW.status.status!=="READY",repW.status);
  eq("...it abandons",repW.status.status,"ABANDON");
}
sect("S2: control coverage is read on the HOLDOUT ALONE (11.2)");
{
  /* the reviewer's fixture. 30 cells x 5 controls x 2 shocks = 60 matched shock windows, all early; then 10
     cells with only FOUR controls and one shock each, dated after the boundary: recorded, unmatched, unscored.
     Pooled coverage 60/70 = 0.857 PASSES. Holdout coverage 30/40 = 0.750 fails, and 11.7 clause 3 abandons. */
  STUB_RELEASES.length=0;
  const base=Date.UTC(2026,0,7,12,30);
  const cps=[0.700,0.705,0.695,0.700,0.700];     /* tight, so the CI is not what decides this fixture */
  const rows=[];
  for(let i=0;i<30;i++){
    const t0=base+i*15*MIN;                       /* one cell per UTC slot, same weekday and quarter */
    for(let j=0;j<5;j++) rows.push(mkWin("KXBTC15M-c"+i+"-"+j,t0+j*WEEK,15,"yes",cps[j],60));
    for(let k=0;k<2;k++){
      /* the tool read varies a little across shock windows so the calibration half has a MEASURED spread:
         with every paired value identical the sd is exactly zero, shockRequiredHoldN returns null and the
         judge answers INVALID before coverage is reached, which would make this fixture about something
         else. The controls stay tight, so the CI is still not what decides it. */
      const w=mkWin("KXBTC15M-s"+i+"-"+k,t0+(6+k)*WEEK,15,"yes",[0.80,0.81,0.79][(i+k)%3],60,{shock:true});
      STUB_RELEASES.push(w.open+5*MIN); rows.push(w);
    }
  }
  for(let i=30;i<40;i++){
    const t0=base+i*15*MIN;
    for(let j=0;j<4;j++) rows.push(mkWin("KXBTC15M-c"+i+"-"+j,t0+j*WEEK,15,"yes",cps[j],60));
    const w=mkWin("KXBTC15M-s"+i+"-0",t0+9*WEEK,15,"yes",0.80,60,{shock:true});
    STUB_RELEASES.push(w.open+5*MIN); rows.push(w);
  }
  const opts=reg(rows,{arms:1,pnlN:30,pnlNet:12.5,monthsElapsed:6,frozen:true,holdoutSpent:false,
    bootstrap:null});
  const rep=U.scReport(rows,opts);
  eq("70 shock windows are recorded",rep.coverage.recorded,70);
  eq("...all of them graded and side-determinable, so all 70 are in the pooled denominator",
     rep.coverage.all.total,70);
  eq("...60 of them matched",rep.coverage.all.matched,60);
  close("...so POOLED coverage is 0.857, which passes the 80% bar",rep.coverage.all.frac,60/70,1e-12);
  eq("the holdout carries 40 recorded shock windows",rep.coverage.hold.total,40);
  eq("...of which 30 are matched",rep.coverage.hold.matched,30);
  close("...so HOLDOUT coverage is 0.750",rep.coverage.hold.frac,0.75,1e-12);
  eq("the calibration half's own coverage is reported too",rep.coverage.cal.total,30);
  close("...and it is perfect, which is exactly what diluted the pooled figure",rep.coverage.cal.frac,1,1e-12);
  eq("st carries the HOLDOUT count, not the pooled one",rep.st.ctrlTotal,40);
  eq("...and the holdout matched count",rep.st.ctrlMatched,30);
  eq("...so 11.7 clause 3 abandons",rep.status.status,"ABANDON");
  ok("...for the coverage reason",/coverage/.test(rep.status.why),rep.status.why);
  /* and the counterfactual, which is the finding: the SAME fixture judged on the pooled figure reads READY */
  const pooled=U.scAssemble({phase:rep.st.phase,nCal:rep.st.nCal,nHold:rep.st.nHold,sd:rep.st.sd,
    dBrier:rep.st.dBrier,ciLo:rep.st.ciLo,
    ctrlMatched:rep.coverage.all.matched,ctrlTotal:rep.coverage.all.total},opts).st;
  eq("the pooled coverage this fixture used to hand the judge reads READY",
     U.shockStatus(pooled).status,"READY",U.shockStatus(pooled));
  /* R7: the pooled figures are still reported -- the calibration half is worth seeing -- but they are NOT a
     second `ctrlMatched`/`ctrlTotal` pair on the report object beside the holdout one. rep.ctrlMatched and
     rep.ctrlTotal were the POOLED figures while rep.st.ctrlMatched and rep.st.ctrlTotal were the HOLDOUT
     ones: two identically-named pairs differing only by denominator, and NOTES routed the pooled pair into
     the CSV -- the one 11.2 says is not the gate, which was the whole point of the holdout-only fix. */
  eq("there is no second ctrlTotal on the report to export by mistake",rep.ctrlTotal,undefined);
  eq("...nor a second ctrlMatched",rep.ctrlMatched,undefined);
  eq("the pooled counts are reported under rep.coverage, which names its denominator",
     rep.coverage.all.total,70);
  eq("...beside the holdout cut and the calibration cut",
     rep.coverage.hold.total+","+rep.coverage.cal.total,"40,30");
  eq("...and the gate cut, which is the one st receives",rep.coverage.gate.total,rep.st.ctrlTotal);
  /* BEFORE a boundary exists there is no holdout, so the gate has nothing to read -- and the calibration
     coverage is still reported, so 11.7 clause 3's question can be asked during calibration by the caller
     rather than answered here on a set that is not the holdout. */
  const early=[]; for(let i=0;i<rows.length;i++) if(!/-s3\d-/.test(rows[i].ticker)) early.push(rows[i]);
  const shortRep=U.scReport(early.slice(0,60),reg(early.slice(0,60),opts));
  eq("with no boundary yet the holdout carries nothing",shortRep.coverage.hold.total,0);
  eq("...so the gate reads nothing",shortRep.st.ctrlTotal,0);
  ok("...but the calibration coverage is on the report to be read",shortRep.coverage.cal.total>0,
     shortRep.coverage);
  ok("...and the status is progress, not a coverage verdict",
     shortRep.status.status==="CALIBRATING"||shortRep.status.status==="REFUSED",shortRep.status);
}
sect("a short calibration set cannot open a holdout");
{
  const G=grid(60,[0.70,0.71,0.72]);
  const P=U.scPairs(G.rows);
  const short=P.pairs.slice(0,20);
  eq("twenty pairs is fewer than the calibration minimum",U.scSd(U.scSplit(short).cal),null);
  const rows=[];
  const keep={}; for(let i=0;i<short.length;i++) keep[short[i].ticker]=1;
  for(let i=0;i<G.rows.length;i++) if(G.rows[i].shock!==true||keep[G.rows[i].ticker]) rows.push(G.rows[i]);
  const rep=U.scReport(rows,{arms:1,pnlN:30,pnlNet:1,monthsElapsed:1,frozen:true,holdoutSpent:false});
  ok("fewer than 30 calibration windows yields no sd",rep.sd===null,rep.sd);
  eq("...and the code says so",rep.code,U.SC_OMIT.CAL_SHORT);
  eq("...and the status is CALIBRATING, never READY",rep.status.status,"CALIBRATING");
}

/* ====================================================================================================
   THE SECOND REVIEW'S FOURTEEN FINDINGS. One reproduction each, from the concrete input the reviewer
   published, before the fix and as a regression assertion after it. The five that share a fault -- 2, 3, 4, 5
   and 8 -- are reproduced separately here because the reproductions are what pin the CLASS fix: the contract
   is one table, and each of these is a different field falling through it. */

/* the inverse the reviewer's fixtures are written in: skill = (q-y)^2 - (pm-y)^2, so pmFor(skill) is the
   tool read that produces a WANTED skill against a given quote. Every expected number below is arithmetic. */
function pmFor(skill,qm,y){
  const b=brier(qm/100,y)-skill;
  return (y===1)?1-Math.sqrt(b):Math.sqrt(b);
}
/* cells of the shape 11.3's four dimensions produce: one UTC slot each, controls in weeks 0..4, shock windows
   in weeks 6.. -- so cell order is time order and the calibration half is the first 30 cells' first shocks. */
const CELL_BASE=Date.UTC(2026,0,7,12,30);
function mkCells(o){
  const rows=[],shocks=[],qm=o.qm||60;
  for(let i=0;i<o.n;i++){
    const t0=CELL_BASE+(o.slot0||0)*15*MIN+i*15*MIN;
    for(let j=0;j<o.nCtrl;j++)
      rows.push(mkWin("KXBTC15M-"+o.tag+"c"+i+"-"+j,t0+j*WEEK,15,"yes",o.ctrl(i,j),qm));
    for(let k=0;k<o.nShock;k++){
      const res=o.result?o.result(i,k):"yes";
      const w=mkWin("KXBTC15M-"+o.tag+"s"+i+"-"+k,t0+(6+k)*WEEK,15,res,o.shock(i,k),qm,{shock:true});
      STUB_RELEASES.push(w.open+5*MIN);
      if(o.mangle) o.mangle(w,i,k);
      rows.push(w); shocks.push(w);
    }
  }
  return {rows:rows,shocks:shocks};
}
/* the reviewer's control-skill pattern: constant within a cell, ((i%13)-6)*0.0105 across cells, so the
   calibration half has a real spread and the 6th-control variant halves it exactly. */
function cellSkill(i){ return ((i%13)-6)*0.0105; }
const SHOCK_SKILL=0.045;
function baseOpts(){ return {arms:1,pnlN:30,pnlNet:12.5,monthsElapsed:6,frozen:true,holdoutSpent:false,
  bootstrap:null}; }

sect("R1 + R5: 11.2's REGISTERED coverage denominator -- holdout, GRADED, side-determinable, and not asked below 30");
{
  /* THE FALSE CLOSURE, verbatim from the review. 30 matched calibration windows, then ONE holdout shock
     window with only four eligible controls. Holdout coverage reads 0/1 = 0.000, and 11.7 clause 3 is a
     PERMANENT closure -- "closed or redesigned, and a redesign restarts the count at zero". Against section
     8's ~47 events a year the holdout spends its first months in exactly this regime.
     11.2 now defines the denominator and 11.7 clause 3 carries the same sentence: the clause may not fire
     below 30. The bar is still 80%. */
  STUB_RELEASES.length=0;
  const cal=mkCells({tag:"f1",n:30,nCtrl:5,nShock:1,
    ctrl:function(i){ return pmFor(cellSkill(i),60,1); },
    shock:function(){ return pmFor(SHOCK_SKILL,60,1); }});
  const thin=mkCells({tag:"f1t",slot0:30,n:1,nCtrl:4,nShock:1,
    ctrl:function(i){ return pmFor(cellSkill(i),60,1); },
    shock:function(){ return pmFor(SHOCK_SKILL,60,1); }});
  const rows=cal.rows.concat(thin.rows);
  const rep=U.scReport(rows,reg(rows,baseOpts()));
  eq("the calibration half is complete",rep.st.nCal,30);
  eq("the one holdout shock window is recorded, unmatched",rep.unmatched.length,1);
  eq("...for the reason 11.7 clause 3 is about",rep.unmatched[0].code,U.SC_OMIT.THIN);
  eq("...and it IS in the holdout coverage denominator, which is measured and reported",
     rep.coverage.hold.total,1);
  close("...at 0.000",rep.coverage.hold.frac,0,1e-12);
  /* the counterfactual, which is the finding: handed to the judge, that ratio is a permanent closure */
  const wouldClose=U.scAssemble({phase:1,nCal:30,nHold:0,sd:rep.sd,dBrier:null,ciLo:null,
    ctrlMatched:0,ctrlTotal:1},baseOpts()).st;
  eq("0/1 handed to shockStatus ABANDONS under 11.7 clause 3",U.shockStatus(wouldClose).status,"ABANDON");
  /* and what the registered denominator does instead */
  eq("...but 11.2 does not evaluate the clause at a denominator of one",rep.coverage.hold.evaluable,false);
  ok("...and says so in words",/only at 30 or more/.test(rep.coverage.hold.why),rep.coverage.hold.why);
  eq("...so the gate receives nothing rather than 0/1",rep.st.ctrlTotal,0);
  eq("...and nothing matched with it",rep.st.ctrlMatched,0);
  ok("THE PROGRAMME IS NOT CLOSED BY ITS FIRST UNMATCHED HOLDOUT WINDOW",rep.status.status!=="ABANDON",
     rep.status);
  eq("...it is simply an incomplete holdout",rep.status.status,"HOLDOUT",rep.status);
  eq("the minimum denominator is reported so the caller can see why",rep.coverage.minN,30);

  /* the reviewer's second and third rows: 3/4 and 10/12 are the same regime, and 30/33 is not */
  const mid=mkCells({tag:"f1m",slot0:40,n:3,nCtrl:5,nShock:1,
    ctrl:function(i){ return pmFor(cellSkill(i+3),60,1); },
    shock:function(){ return pmFor(SHOCK_SKILL,60,1); }});
  const r2=U.scReport(rows.concat(mid.rows),reg(rows.concat(mid.rows),baseOpts()));
  eq("3 matched holdout windows beside 1 unmatched is still a denominator of 4",r2.coverage.hold.total,4);
  close("...reading 0.750",r2.coverage.hold.frac,0.75,1e-12);
  ok("...and 11.7 clause 3 still does not fire on it",r2.status.status!=="ABANDON",r2.status);
}
sect("R5: a void, ungraded or post-gate-only window is NOT a control-matching failure");
{
  /* Same 60-window fixture as S2, but the 10 extra holdout shock windows differ ONLY in that they are not
     GRADED. 11.2 lists "n >= 30 graded holdout shock windows" and control coverage as SEPARATE conditions;
     an ungraded window has as many controls as any other. Ungraded windows are the normal state of a recent
     export -- every currently-live shock window is one -- so this compounded the false closure rather than
     being independent of it. */
  const variants=[
    {name:"result \"void\" (10.4: a void settlement is not a NO)",result:function(){ return "void"; }},
    {name:"no result at all: the window is still open",result:function(){ return null; }},
    {name:"snapshots all post-gate (tau < 0)",mangle:function(w){
      for(let i=0;i<w.snaps.length;i++) w.snaps[i].tau=-1; }}
  ];
  for(let v=0;v<variants.length;v++){
    STUB_RELEASES.length=0;
    const good=mkCells({tag:"f5g"+v,n:30,nCtrl:5,nShock:2,
      ctrl:function(i){ return pmFor(cellSkill(i),60,1); },
      shock:function(){ return pmFor(SHOCK_SKILL,60,1); }});
    const un=mkCells({tag:"f5u"+v,slot0:30,n:10,nCtrl:5,nShock:1,
      ctrl:function(i){ return pmFor(cellSkill(i),60,1); },
      shock:function(){ return pmFor(SHOCK_SKILL,60,1); },
      result:variants[v].result,mangle:variants[v].mangle});
    const rows=good.rows.concat(un.rows);
    const rep=U.scReport(rows,reg(rows,baseOpts()));
    eq("30 calibration and 30 holdout windows are matched ["+variants[v].name+"]",
       rep.st.nCal+","+rep.st.nHold,"30,30");
    eq("...the 10 ungraded ones are recorded",rep.unmatched.length,10);
    ok("...and marked ungraded rather than unmatched",
       rep.unmatched.every(function(u){ return u.graded===false; }),rep.unmatched[0]);
    eq("...and excluded from the coverage denominator, counted",rep.coverage.excluded.ungraded,10);
    eq("...so the denominator is the 30 GRADED holdout windows",rep.coverage.hold.total,30);
    close("...at 100%",rep.coverage.hold.frac,1,1e-12);
    eq("...which IS evaluable, and passes",rep.coverage.hold.evaluable,true);
    ok("...so 11.7 clause 3 does not fire",rep.status.status!=="ABANDON",rep.status);
    /* the counterfactual: counted as failures, the same fixture reads 30/40 and closes the programme */
    const wouldClose=U.scAssemble({phase:1,nCal:30,nHold:30,sd:rep.sd,dBrier:rep.st.dBrier,ciLo:rep.st.ciLo,
      ctrlMatched:30,ctrlTotal:40},baseOpts()).st;
    eq("...where counting them as matching failures ABANDONS",U.shockStatus(wouldClose).status,"ABANDON");
  }
  /* and the control: 10 GRADED windows that genuinely have too few controls still close it (the S2 fixture
     above asserts the same thing end to end) */
  STUB_RELEASES.length=0;
}
sect("R4: a window whose SIDE of the split cannot be determined is in NEITHER denominator");
{
  /* The review's input: 10 unmatched shock windows after the boundary, identical except for `close`.
     Well formed -> 30/40 -> ABANDON. `delete w.close` or a STRING close -> 30/30 -> READY, because
     scAfterBoundary returned false for anything it could not compare and false routed to CALIBRATION.
     Two answers now: the row contract refuses the malformed row outright (a close is required and must be a
     number), and scCoverage counts an undeterminable side in neither denominator. */
  STUB_RELEASES.length=0;
  const good=mkCells({tag:"f4g",n:30,nCtrl:5,nShock:2,
    ctrl:function(i){ return pmFor(cellSkill(i),60,1); },
    shock:function(){ return pmFor(SHOCK_SKILL,60,1); }});
  const mangles=[{name:"close deleted",f:function(w){ delete w.close; }},
                 {name:"close as a string",f:function(w){ w.close=String(w.close); }}];
  for(let v=0;v<mangles.length;v++){
    const bad=mkCells({tag:"f4b"+v,slot0:30,n:10,nCtrl:4,nShock:1,
      ctrl:function(i){ return pmFor(cellSkill(i),60,1); },
      shock:function(){ return pmFor(SHOCK_SKILL,60,1); },mangle:mangles[v].f});
    const rows=good.rows.concat(bad.rows);
    const rep=U.scReport(rows,reg(rows,baseOpts()));
    eq("a shock row with a "+mangles[v].name+" is refused, not counted as calibration",
       rep.status.status,"REFUSED");
    eq("...naming the field",rep.status.code,U.SC_OMIT.BAD_ROW);
    eq("...and which row",(rep.badRow||{}).field,"close");
    ok("...and it never reaches READY",rep.status.status!=="READY");
  }
  /* scCoverage's own rule, exercised directly: a row the boundary cannot place is in neither denominator */
  const b={n:30,close:1000,ticker:"t",fp:"x-30"};
  const P={pairs:[{ticker:"a",close:2000},{ticker:"b",close:500}],
    unmatched:[{ticker:"c",close:2000,graded:true},{ticker:"d",graded:true},
               {ticker:"e",close:"2000",graded:true}]};
  const cov=U.scCoverage(P,b);
  eq("five recorded windows",cov.recorded,5);
  eq("...two of which cannot be placed relative to the boundary",cov.excluded.undetermined,2);
  eq("...so the holdout denominator is the two that can",cov.hold.total,2);
  eq("...one matched",cov.hold.matched,1);
  eq("...and the calibration side keeps its own",cov.cal.total,1);
  eq("scAfterBoundary says `undeterminable` rather than `calibration`",
     U.scAfterBoundary({ticker:"d"},b),null);
  eq("...and with no boundary at all there is simply no holdout yet",
     U.scAfterBoundary({ticker:"d",close:5},null),false);
}

sect("R3 [WORST]: `shock` is the treatment assignment and is now strictly boolean");
{
  /* THE REVIEWER'S FIXTURE. One cell, five controls at skill 0, two shock windows -- one where the tool wins
     (+0.20) and one where it loses (-0.20). The honest difference-in-differences is 0.
     scPairs tested `w.shock!==true` and scMatchControls tested `c.shock===true`, so `shock:1` fell through
     BOTH: the losing window was not treated AND not excluded from its own cell's control pool. It vanished
     from ctrlTotal with no unmatched row, no reason code and nothing in `missing`, and it joined the control
     mean -- so both terms of the difference moved the same way and the ESTIMATE moved, not just a gate:
     0.00000 -> +0.23333, which is 0.20 + 0.20/6. That is 7.4's retroactive side-picking reachable through a
     type coercion, leaving no trace on the record. */
  STUB_RELEASES.length=0;
  const base=Date.UTC(2026,0,7,12,30);
  const rows=[];
  for(let j=0;j<5;j++) rows.push(mkWin("KXBTC15M-r3c"+j,base+j*WEEK,15,"yes",pmFor(0,50,1),50));
  const win=mkWin("KXBTC15M-r3win",base+6*WEEK,15,"yes",pmFor(0.20,50,1),50,{shock:true});
  const lose=mkWin("KXBTC15M-r3lose",base+7*WEEK,15,"yes",pmFor(-0.20,50,1),50,{shock:true});
  STUB_RELEASES.push(win.open+5*MIN); STUB_RELEASES.push(lose.open+5*MIN);
  rows.push(win); rows.push(lose);
  const clean=U.scPairs(rows);
  eq("both shock windows are treated",clean.pairs.length,2);
  close("the winning window's skill is +0.20",clean.pairs[0].shockSkill,0.20,1e-12);
  close("the losing window's skill is -0.20",clean.pairs[1].shockSkill,-0.20,1e-12);
  close("...and every control is skill 0",clean.pairs[0].ctrlMeanSkill,0,1e-12);
  close("SO THE HONEST DIFFERENCE-IN-DIFFERENCES IS EXACTLY 0",U.scDid(clean.pairs).controlled,0,1e-12);
  /* what the coercion bought, computed from the definition rather than from the unit: the loser leaves the
     treatment set and joins its own cell's controls, so the estimate becomes 0.20 - (-0.20/6) */
  const corrupted=0.20-(-0.20/6);
  close("...against +0.23333 if the loser is silently demoted to a control",corrupted,0.2333333333333333,1e-15);
  const truthy=[1,"true","yes",{},[],0.5];
  for(let i=0;i<truthy.length;i++){
    const bad=rows.slice(); bad[bad.length-1]=Object.assign({},lose,{shock:truthy[i]});
    const P=U.scPairs(bad);
    eq("shock:"+JSON.stringify(truthy[i])+" is refused, not coerced",P.code,U.SC_OMIT.BAD_SHOCK);
    eq("...and produces no pairs at all",P.pairs.length,0);
    eq("...so no estimate exists to be moved",U.scDid(P.pairs).controlled,null);
    const rep=U.scReport(bad,reg(bad,baseOpts()));
    eq("...and the whole call is REFUSED",rep.status.status,"REFUSED");
    eq("...naming the treatment flag",rep.status.code,U.SC_OMIT.BAD_SHOCK);
    ok("...and saying which row",rep.badRow&&rep.badRow.field==="shock",rep.badRow);
  }
  /* an ABSENT shock flag cannot default to false either: a shock window whose flag was dropped in an export
     would become a CONTROL for its own cell, which is the same corruption in the same direction */
  const noFlag=rows.slice(); const nf=Object.assign({},lose); delete nf.shock;
  noFlag[noFlag.length-1]=nf;
  eq("an ABSENT shock flag is refused, not defaulted to false",U.scPairs(noFlag).code,U.SC_OMIT.BAD_SHOCK);
  /* and the other half of the gap: called on its own, the matcher must not admit such a row as a CONTROL */
  const pool=rows.slice(); pool[pool.length-1]=Object.assign({},lose,{shock:1});
  const m=U.scMatchControls(win,pool);
  eq("a shock:1 row is not admitted to the control pool",m.n,5);
  eq("...and the rejection is counted by its own code",m.rejects[U.SC_OMIT.BAD_SHOCK],1);
  ok("...so the control mean is untouched by it",Math.abs(U.scMean(m.controls.map(function(c){
    return c.skill; })))<1e-12);
  STUB_RELEASES.length=0;
}

sect("R2: 11.6's boundary and 11.2a's required n are REGISTRATIONS, not optional extras");
{
  /* INPUT A -- READY with the boundary never registered. 30 cells x 5 controls x 2 shocks, a complete opts
     set, and no `boundary`. scSplitCheck returned refuse:false when `registered` was null and nothing
     downstream consulted registeredOk, so `frozen:true` and an unregistered boundary were accepted together
     -- at a point where nCal >= 30 means the 30th calibration window IS graded, which 11.6 says is exactly
     when the boundary can no longer move. */
  STUB_RELEASES.length=0;
  const G=mkCells({tag:"r2a",n:30,nCtrl:5,nShock:2,
    ctrl:function(i){ return pmFor(cellSkill(i),60,1); },
    shock:function(){ return pmFor(SHOCK_SKILL,60,1); }});
  const full=reg(G.rows,baseOpts());
  const noB={}; for(const k in full) if(k!=="boundary") noB[k]=full[k];
  const repA=U.scReport(G.rows,noB);
  eq("a computed boundary exists, so 11.6 requires it to be registered",!!repA.split.boundary,true);
  eq("...and an unregistered one is now a REFUSAL",repA.status.status,"REFUSED");
  eq("...as a missing caller field",repA.status.code,U.SC_OMIT.MISSING_FIELDS);
  ok("...naming the boundary",repA.status.why.indexOf("boundary")>=0,repA.status.why);
  ok("...and it appears in `missing`",repA.missing.indexOf("boundary")>=0,repA.missing);
  ok("...while every measurement it DID make stays on the report",
     repA.did!==null&&repA.sd!==null&&repA.split.boundary!==null);
  eq("...so the caller can register what it read",repA.boundary.registeredOk,false);
  eq("the same call WITH the registration reaches a verdict",
     U.scReport(G.rows,full).status.status!=="REFUSED",true);

  /* INPUT B -- HOLDOUT becomes READY because the ratchet was not supplied. 35 cells x 5 controls x 2 shocks
     (cal 30, hold 40), control skills constant within a cell, shock skill 0.045. Then ONE extra control per
     cell arrives later at -2x the cell's offset: every shock was already matched, so the pair list, its order
     and the {n, close, ticker} boundary stamp are IDENTICAL -- only the control means moved. */
  STUB_RELEASES.length=0;
  const H1=mkCells({tag:"r2b",n:35,nCtrl:5,nShock:2,
    ctrl:function(i){ return pmFor(cellSkill(i),60,1); },
    shock:function(){ return pmFor(SHOCK_SKILL,60,1); }});
  const sixth=[];
  for(let i=0;i<35;i++){
    const t0=CELL_BASE+i*15*MIN;
    sixth.push(mkWin("KXBTC15M-r2bc"+i+"-5",t0+5*WEEK,15,"yes",pmFor(-2*cellSkill(i),60,1),60));
  }
  const R1=U.scReport(H1.rows,reg(H1.rows,baseOpts()));
  const rows2=H1.rows.concat(sixth);
  const B2=U.scReport(rows2,baseOpts()).split.boundary;    /* run 2's OWN computed stamp */
  /* the sd, from the definition, computed here: paired = 0.045 - mean(control skills) in each cell */
  const calVals1=[],calVals2=[];
  for(let i=0;i<30;i++){ calVals1.push(SHOCK_SKILL-cellSkill(i));
    calVals2.push(SHOCK_SKILL-(5*cellSkill(i)+(-2*cellSkill(i)))/6); }
  close("run 1's calibration sd is the n-1 sd of the fixture's own paired values",R1.sd,sdRef(calVals1),1e-12);
  close("...which is 0.040862",R1.sd,0.04086217372313067,1e-12);
  eq("run 1 is 30 calibration and 40 holdout windows",R1.st.nCal+","+R1.st.nHold,"30,40");
  eq("...requiring 46 holdout windows at 50% power",R1.holdN.computed,46);
  eq("...so it reads HOLDOUT",R1.status.status,"HOLDOUT",R1.status);
  close("run 2's calibration sd is exactly half of run 1's",sdRef(calVals2),R1.sd/2,1e-12);
  /* run 2 judged against its OWN boundary, so this assertion is about the RATCHET alone. (Judged against
     run 1's registered boundary it is refused for a different reason -- see R6 immediately below.) */
  const R2noRatchet=U.scReport(rows2,{arms:1,pnlN:30,pnlNet:12.5,monthsElapsed:6,frozen:true,
    holdoutSpent:false,bootstrap:null,boundary:B2});
  close("...and the unit measures that halving",R2noRatchet.sd,sdRef(calVals2),1e-12);
  eq("...so the recomputed requirement falls to the floor of 30",R2noRatchet.holdN.computed,30);
  ok("...which is the downward move 11.2a forbids",R2noRatchet.holdN.computed<R1.holdN.computed);
  eq("omitting holdNRegistered no longer buys that requirement",R2noRatchet.status.status,"REFUSED");
  eq("...it is a missing registration",R2noRatchet.status.code,U.SC_OMIT.MISSING_FIELDS);
  ok("...named",R2noRatchet.status.why.indexOf("holdNRegistered")>=0,R2noRatchet.status.why);
  ok("...while the measurements stay on the report for the caller to register from",
     R2noRatchet.sd!==null&&R2noRatchet.holdN.computed!==null);
  const R2=U.scReport(rows2,{arms:1,pnlN:30,pnlNet:12.5,monthsElapsed:6,frozen:true,holdoutSpent:false,
    bootstrap:null,boundary:B2,holdNRegistered:R1.holdN.computed});
  eq("...and with the registration supplied the requirement stays at 46",R2.holdN.effective,46);
  eq("...so the same 40 holdout windows do not complete it",R2.status.status,"HOLDOUT");
  eq("...and the downward computation is on the record rather than hidden",R2.holdN.movedDown,true);

  /* R6: the same two runs, judged against run 1's REGISTERED boundary. The boundary WINDOW never moved --
     every shock was already matched, so the pair list, its order and {n, close, ticker} are identical -- and
     the old stamp therefore reported `moved:false, registeredOk:true` while the frozen sd halved underneath
     it. 11.6 freezes the sd and everything derived from it, not the identity of the 30th window. */
  eq("the boundary WINDOW is identical across the two runs",
     B2.ticker+"|"+B2.close+"|"+B2.n,
     R1.split.boundary.ticker+"|"+R1.split.boundary.close+"|"+R1.split.boundary.n);
  ok("...so a {n, close, ticker} stamp cannot tell them apart",
     U.scSplitStable({n:B2.n,close:B2.close,ticker:B2.ticker,fp:"same"},
                     {n:R1.split.boundary.n,close:R1.split.boundary.close,
                      ticker:R1.split.boundary.ticker,fp:"same"}).moved===false);
  ok("...but the calibration-set fingerprint differs",B2.fp!==R1.split.boundary.fp,
     {run1:R1.split.boundary.fp,run2:B2.fp});
  const R2vs1=U.scReport(rows2,{arms:1,pnlN:30,pnlNet:12.5,monthsElapsed:6,frozen:true,holdoutSpent:false,
    bootstrap:null,boundary:R1.split.boundary,holdNRegistered:R1.holdN.computed});
  eq("...so run 2 against run 1's registered boundary is REFUSED",R2vs1.status.status,"REFUSED");
  eq("...as a moved boundary (11.6: a post-freeze change spends the holdout)",
     R2vs1.status.code,U.SC_OMIT.BOUNDARY_MOVED);
  ok("...saying the calibration set changed",
     /calibration set changed/.test(R2vs1.boundary.why),R2vs1.boundary.why);
  ok("...and computing no difference-in-differences against it",R2vs1.did===null);
  STUB_RELEASES.length=0;
}
sect("R6: the boundary stamp fingerprints the calibration SET, not the identity of its last window");
{
  const b1={n:30,close:1000,ticker:"KXBTC15M-a",fp:"aaa-30"};
  const b2={n:30,close:1000,ticker:"KXBTC15M-a",fp:"bbb-30"};
  eq("the same window with a different calibration set is a MOVED boundary",U.scSplitStable(b1,b2).moved,true);
  eq("...and says which way",U.scSplitStable(b1,b2).why,
     "the calibration set changed under an unchanged boundary window");
  eq("...and scSplitCheck refuses it",U.scSplitCheck(b2,b1).refuse,true);
  eq("an identical set is not a move",U.scSplitStable(b1,b1).moved,false);
  /* the fingerprint is over the pairs' identities, their paired values AND their control sets, because 11.6
     freezes the sd and everything derived from it -- not the identity of the 30th window */
  function fpPairs(paired,ctrlSkill){
    const a=[]; for(let i=0;i<30;i++) a.push(mkPair("KXBTC15M-"+i,i,paired,"c",[ctrlSkill,0,0,0,0],paired));
    return a;
  }
  const A=fpPairs(0.02,0), B=fpPairs(0.02,0.5);
  ok("a changed CONTROL skill changes the fingerprint",U.scCalFp(A)!==U.scCalFp(B),U.scCalFp(A));
  ok("a changed PAIRED value changes it",U.scCalFp(A)!==U.scCalFp(fpPairs(0.03,0)));
  eq("...and an unchanged set does not",U.scCalFp(A),U.scCalFp(fpPairs(0.02,0)));
  eq("the fingerprint carries the count",U.scCalFp(A).split("-")[1],"30");
  eq("it is deterministic under enumeration order",U.scCalFp(A),U.scCalFp(A.slice().reverse()));
  eq("scCalFp on a non-array is null, never a value",U.scCalFp(null),null);
}

sect("R8: holdoutSpent failed OPEN; both 11.6 flags are strictly boolean now");
{
  STUB_RELEASES.length=0;
  const G=mkCells({tag:"r8",n:30,nCtrl:5,nShock:2,
    ctrl:function(i){ return pmFor(cellSkill(i),60,1); },
    shock:function(){ return pmFor(SHOCK_SKILL,60,1); }});
  const full=reg(G.rows,baseOpts());
  seeded(818181,function(){
    ok("the fixture reaches a verdict with holdoutSpent:false",
       U.scReport(G.rows,full).status.status!=="REFUSED");
    eq("holdoutSpent:true INVALIDATES it (11.6)",
       U.scReport(G.rows,Object.assign({},full,{holdoutSpent:true})).status.status,"INVALID");
    /* THE FINDING: shockStatus tests ===true, and SC_VERDICT_FIELDS only required the field to be PRESENT,
       so the one value 11.6 uses to invalidate everything was accepted in any shape and read as NOT SPENT.
       `frozen` failed SAFE under identical treatment only because ===true is the value that OPENS its gate;
       that asymmetry was luck, not design. */
    const shapes=[1,"yes","true",{},[]];
    for(let i=0;i<shapes.length;i++){
      const bad=Object.assign({},full,{holdoutSpent:shapes[i]});
      const rep=U.scReport(G.rows,bad);
      eq("holdoutSpent:"+JSON.stringify(shapes[i])+" is refused, not read as NOT SPENT",
         rep.status.status,"REFUSED");
      eq("...as a caller-field type violation",rep.status.code,U.SC_OMIT.BAD_OPT);
      ok("...and it never reaches READY",rep.status.status!=="READY");
      /* the counterfactual: handed to the judge verbatim, it sails through 11.6's own gate */
      const st=U.scAssemble({phase:1,nCal:30,nHold:30,sd:0.01,dBrier:0.02,ciLo:0.01,ctrlMatched:30,
        ctrlTotal:30},Object.assign({},baseOpts(),{holdoutSpent:shapes[i]})).st;
      eq("...where shockStatus would have read it as not spent",U.shockStatus(st).status,"READY");
      /* frozen, for the same shapes, is refused here too rather than relying on ===true failing safe */
      eq("frozen:"+JSON.stringify(shapes[i])+" is refused as well",
         U.scReport(G.rows,Object.assign({},full,{frozen:shapes[i]})).status.code,U.SC_OMIT.BAD_OPT);
    }
  });
  STUB_RELEASES.length=0;
}

sect("R12: a REFUSED call reports no CI level");
{
  STUB_RELEASES.length=0;
  const G=mkCells({tag:"r12",n:30,nCtrl:5,nShock:2,
    ctrl:function(i){ return pmFor(cellSkill(i),60,1); },
    shock:function(){ return pmFor(SHOCK_SKILL,60,1); }});
  const full=reg(G.rows,baseOpts());
  const rep=U.scReport(G.rows,Object.assign({},full,{arms:"20"}));
  eq("arms:\"20\" is refused",rep.status.status,"REFUSED");
  eq("...as a caller-field type violation",rep.status.code,U.SC_OMIT.BAD_OPT);
  eq("...and reports NO CI level, because there is no arm count to derive one from",rep.status.ciLevel,null);
  eq("...nor a resample count",rep.status.bootstrapB,null);
  /* why the check has to be here: shockStatus coerces the string through `st.arms >= 1` and reports 0.995 */
  const st=U.scAssemble({phase:1,nCal:30,nHold:30,sd:0.01,dBrier:0.02,ciLo:null,ctrlMatched:30,ctrlTotal:30},
    Object.assign({},baseOpts(),{arms:"20"})).st;
  close("shockStatus would have reported a level of 0.995 for a refused call",
        U.shockStatus(st).ciLevel,0.995,1e-12);
  eq("a non-integer k is refused too",U.scReport(G.rows,Object.assign({},full,{arms:1.5})).status.code,
     U.SC_OMIT.BAD_OPT);
  eq("...and k below 1",U.scReport(G.rows,Object.assign({},full,{arms:0})).status.code,U.SC_OMIT.BAD_OPT);
  STUB_RELEASES.length=0;
}

sect("R9: 11.2a requires BOTH power figures, and the at-open feasibility test");
{
  STUB_RELEASES.length=0;
  const G=mkCells({tag:"r9",n:35,nCtrl:5,nShock:2,
    ctrl:function(i){ return pmFor(cellSkill(i),60,1); },
    shock:function(){ return pmFor(SHOCK_SKILL,60,1); }});
  const rep=U.scReport(G.rows,reg(G.rows,baseOpts()));
  /* both figures, from 11.2a's own formula n = (z*sd/0.010)^2 with z = invNorm(1-(1-lvl)/2) + invNorm(power),
     computed here rather than by calling the code under test */
  const nFor=function(power){ const z=invNorm(1-(1-0.90)/2)+invNorm(power);
    return Math.max(30,Math.ceil(Math.pow(z*rep.sd/0.010,2))); };
  eq("the required n at 50% power is 46",rep.holdN.computed,46);
  eq("...which is 11.2a's formula, computed independently",rep.holdN.computed,nFor(0.5));
  eq("...and the 80%-power figure is BESIDE it, not absent",rep.holdN.n80,104);
  eq("...also from the formula",rep.holdN.n80,nFor(0.8));
  eq("...and it is prereg's, not a second implementation",rep.holdN.n80,
     U.shockRequiredHoldN(rep.sd,1,0.8));
  eq("...and the report says which power each figure is",rep.holdN.power.computed+"/"+rep.holdN.power.alongside,
     "0.5/0.8");
  ok("the 80% figure is the larger one, which is why it is the one that says whether to open",
     rep.holdN.n80>rep.holdN.computed);
  /* shockFeasible existed in prereg and was called by NOTHING in the repository */
  ok("the at-open feasibility test is computed",!!rep.holdN.feasible,rep.holdN);
  eq("...at 11.1's low release-rate premise",rep.holdN.feasible.lo.holdN,46);
  eq("...and its high one",rep.holdN.feasible.hi.holdN,46);
  ok("...carrying n80 with it",rep.holdN.feasible.lo.n80===104&&rep.holdN.feasible.hi.n80===104);
  ok("...and an `ok` against 11.7 clause 5's deadline",
     typeof rep.holdN.feasible.lo.ok==="boolean"&&typeof rep.holdN.feasible.hi.ok==="boolean");
  eq("...which is 24 months",rep.holdN.feasible.lo.deadline,U.SHOCK_RULE.maxMonths);
  close("...and the months it implies at 100 releases a year",rep.holdN.feasible.lo.months,12*46/100,1e-12);
  close("...and at 150",rep.holdN.feasible.hi.months,12*46/150,1e-12);
  ok("the premise is LABELLED a premise, not a measurement",
     /NOT a measurement/.test(rep.holdN.feasible.premise),rep.holdN.feasible.premise);
  /* it is output, not a gate: closing the programme at the holdout's open is 11.2a's decision for the caller
     to record, exactly like holdoutSpent -- but it cannot be made without the number */
  ok("the feasibility figure does not itself change the verdict",
     rep.status.status==="HOLDOUT"||rep.status.status==="READY"||rep.status.status==="NEGATIVE",rep.status);
  STUB_RELEASES.length=0;
}

sect("R10: a floating-point residue is not a measured sd");
{
  /* scSd returned 1.41e-17 on thirty identical paired values, and shockRequiredHoldN guards on `sd > 0`, so
     11.2a's "sd not measured on the calibration half" refusal was reachable only at EXACT binary zero and the
     residue silently became the holdN floor of 30 instead. */
  const same=[]; for(let i=0;i<30;i++) same.push(0.0341);
  let m=0; for(let i=0;i<same.length;i++) m+=same[i]; m/=same.length;
  let ss=0; for(let i=0;i<same.length;i++) ss+=(same[i]-m)*(same[i]-m);
  const residue=Math.sqrt(ss/(same.length-1));
  ok("the two-pass sd of thirty identical values is NOT zero in binary float",residue>0,residue);
  ok("...it is about 1.4e-17",residue<1e-16&&residue>1e-18,residue);
  eq("scSdOf returns exactly zero on it",U.scSdOf(same),0);
  const pairs=[]; for(let i=0;i<30;i++) pairs.push({ticker:"t"+i,close:i,paired:0.0341,shockSkill:0.0341,
    ctrlMeanSkill:0,nCtrl:5});
  eq("...so scSd does too",U.scSd(pairs),0);
  eq("...and 11.2a's refusal is reachable: no required n is derivable from it",
     U.shockRequiredHoldN(U.scSd(pairs),1,0.5),null);
  eq("...where the residue would have bought the floor of 30 instead",U.shockRequiredHoldN(residue,1,0.5),30);
  /* the floor is RELATIVE and only ever turns a number into a refusal */
  ok("a genuine spread is untouched",U.scSdOf([0,1])>0.7);
  close("...exactly",U.scSdOf([0,1]),Math.sqrt(0.5),1e-15);
  ok("a spread just above the relative floor survives",U.scSdOf([1,1+1e-9])>0);
  eq("scSdOf on an all-zero sample is zero, not a residue",U.scSdOf([0,0,0]),0);
}

sect("THE CONTRACT IS TOTAL: one table, exhaustive against what the code actually reads");
{
  /* THE CLASS FIX, asserted as a class rather than field by field. The reviewer's closing sentence was
     "every input this unit does not police, it policies on the permissive side" -- one fault wearing nine
     fields. So the enumeration is in ONE place, and this block is what stops a field being added later
     without one: the source is parsed, every property name it READS is collected, the names this unit itself
     ASSIGNS and a fixed list of JS builtins are subtracted, and the remainder must be a subset of the
     contract tables. A new `w.something` or `o.something` fails here unless it is declared. */
  /* comments AND string literals are stripped: a `.md` inside a refusal message is not a property read */
  const CODE=SRC.replace(/\/\*[\s\S]*?\*\//g,"").replace(/"(?:[^"\\]|\\.)*"/g,'""');
  const reads={},assigned={};
  let m;
  const reRead=/\.([A-Za-z_$][\w$]*)/g;
  while((m=reRead.exec(CODE))) reads[m[1]]=(reads[m[1]]||0)+1;
  const reKey=/([A-Za-z_$][\w$]*)\s*:/g;
  while((m=reKey.exec(CODE))) assigned[m[1]]=1;
  const reSet=/\.([A-Za-z_$][\w$]*)\s*=[^=]/g;
  while((m=reSet.exec(CODE))) assigned[m[1]]=1;
  /* the JS surface this unit uses. Fixed, short, and nothing caller-supplied can hide in it. */
  const BUILTIN=["abs","call","ceil","charCodeAt","filter","floor","getUTCDay","getUTCFullYear","getUTCMonth",
    "hasOwnProperty","imul","indexOf","isArray","join","keys","length","map","max","min","pow","prototype",
    "push","random","replace","reverse","round","slice","sort","split","sqrt","toFixed","toString"];
  const declared={};
  const tables=[U.SC_ROW_FIELDS,U.SC_SNAP_FIELDS,U.SC_OPT_FIELDS,U.SC_NEIGHBOUR_FIELDS];
  for(let i=0;i<tables.length;i++) for(let j=0;j<tables[i].length;j++) declared[tables[i][j].name]=1;
  const undeclared=Object.keys(reads).filter(function(k){
    return !assigned[k]&&BUILTIN.indexOf(k)<0&&!declared[k]; }).sort();
  eq("every field this unit reads and does not itself produce is in the contract",undeclared.join(","),"");
  /* and the other direction, so the table cannot rot: every declared field is actually read */
  const dead=Object.keys(declared).filter(function(k){ return !reads[k]; }).sort();
  eq("...and every declared field is actually read",dead.join(","),"");
  /* the tables agree with the field lists the rest of the unit already had */
  const optNames=U.SC_OPT_FIELDS.map(function(f){ return f.name; });
  for(let i=0;i<U.SC_CALLER_FIELDS.length;i++)
    ok("SC_OPT_FIELDS covers the st-bound caller field "+U.SC_CALLER_FIELDS[i],
       optNames.indexOf(U.SC_CALLER_FIELDS[i])>=0);
  for(let i=0;i<U.SC_SPLIT_FIELDS.length;i++)
    ok("...and the split-bound field "+U.SC_SPLIT_FIELDS[i],optNames.indexOf(U.SC_SPLIT_FIELDS[i])>=0);
  eq("...and nothing else but bootstrap",optNames.length,
     U.SC_CALLER_FIELDS.length+U.SC_SPLIT_FIELDS.length+1);
  ok("every contract entry states a permitted shape in words",
     tables.every(function(t){ return t.every(function(f){
       return typeof f.shape==="string"&&f.shape.length>0; }); }));
  ok("every ROW and OPT entry carries a predicate, so nothing is merely `read`",
     U.SC_ROW_FIELDS.every(function(f){ return typeof f.ok==="function"; })&&
     U.SC_OPT_FIELDS.every(function(f){ return typeof f.ok==="function"; }));
  /* THE FAILURE MODE OF A FIELD THAT SKIPPED THE CONTRACT IS REFUSAL, NOT PASSAGE */
  STUB_RELEASES.length=0;
  const G=mkCells({tag:"ct",n:30,nCtrl:5,nShock:2,
    ctrl:function(i){ return pmFor(cellSkill(i),60,1); },
    shock:function(){ return pmFor(SHOCK_SKILL,60,1); }});
  const full=reg(G.rows,baseOpts());
  const stray=U.scReport(G.rows,Object.assign({},full,{newThresholdNobodyDeclared:0.5}));
  eq("an opts key that is not in the table is REFUSED, not ignored",stray.status.status,"REFUSED");
  eq("...with its own code",stray.status.code,U.SC_OMIT.UNKNOWN_OPT);
  ok("...naming the key",stray.status.why.indexOf("newThresholdNobodyDeclared")>=0,stray.status.why);
  eq("...and scOptsCheck says which field",U.scOptsCheck({zzz:1}).field,"zzz");
  /* a ROW key that is not in the table is NOT an error: an edge-ledger row legitimately carries columns this
     unit does not read, and the exhaustiveness scan above is what enforces the enumeration there instead */
  const extra=G.rows.map(function(w){ return Object.assign({},w,{strike:100000,vrp:0.001}); });
  ok("an unread ROW column is not an error",U.scPairs(extra).ok===true);
  STUB_RELEASES.length=0;
}
sect("the row contract, field by field: present-and-wrong-typed is a refusal, absent-and-load-bearing too");
{
  const good=mkWin("KXBTC15M-ct",Date.UTC(2026,0,7,12,30),15,"yes",0.7,60);
  eq("a well-formed row passes",U.scRowCheck(good).ok,true);
  const cases=[
    {f:"ticker",v:42,code:U.SC_OMIT.BAD_ROW},{f:"ticker",v:"",code:U.SC_OMIT.BAD_ROW},
    {f:"open",v:"1771",code:U.SC_OMIT.BAD_ROW},{f:"open",v:NaN,code:U.SC_OMIT.BAD_ROW},
    {f:"close",v:Infinity,code:U.SC_OMIT.BAD_ROW},
    {f:"phase",v:"1",code:U.SC_OMIT.BAD_PHASE},{f:"phase",v:true,code:U.SC_OMIT.BAD_PHASE},
    {f:"shock",v:1,code:U.SC_OMIT.BAD_SHOCK},{f:"shock",v:"true",code:U.SC_OMIT.BAD_SHOCK},
    {f:"shock",v:0,code:U.SC_OMIT.BAD_SHOCK},
    {f:"snaps",v:{},code:U.SC_OMIT.BAD_ROW},{f:"snaps",v:"[]",code:U.SC_OMIT.BAD_ROW},
    {f:"result",v:1,code:U.SC_OMIT.BAD_ROW},{f:"result",v:true,code:U.SC_OMIT.BAD_ROW}
  ];
  for(let i=0;i<cases.length;i++){
    const w=Object.assign({},good); w[cases[i].f]=cases[i].v;
    const r=U.scRowCheck(w);
    eq(cases[i].f+" = "+JSON.stringify(cases[i].v)+" is refused",r.ok,false);
    eq("...with the right code",r.code,cases[i].code);
    eq("...naming the field",r.field,cases[i].f);
  }
  const required=["ticker","open","close","phase","shock","snaps"];
  for(let i=0;i<required.length;i++){
    const w=Object.assign({},good); delete w[required[i]];
    eq("an absent "+required[i]+" is a refusal, not a default",U.scRowCheck(w).ok,false);
    eq("...naming it",U.scRowCheck(w).field,required[i]);
  }
  /* the two that are legitimately absent or legitimately not "yes"/"no" */
  const noRes=Object.assign({},good); delete noRes.result;
  eq("an absent result is NOT a contract violation: the window is simply ungraded",U.scRowCheck(noRes).ok,true);
  eq("...and scSkill is what refuses to grade it",U.scSkill(noRes).code,U.SC_OMIT.UNGRADED);
  const voided=Object.assign({},good,{result:"void"});
  eq("a void result is a legitimate string",U.scRowCheck(voided).ok,true);
  eq("...and ungraded (10.4)",U.scSkill(voided).code,U.SC_OMIT.UNGRADED);
  const empty=Object.assign({},good,{snaps:[]});
  eq("an EMPTY snaps array is legitimate: the window has no usable read yet",U.scRowCheck(empty).ok,true);
  eq("...and refuses as no-refsnap, which is a measurement state",U.scSkill(empty).code,U.SC_OMIT.NO_REFSNAP);
  /* cross-field */
  eq("close must be strictly after open",U.scRowCheck(Object.assign({},good,{close:good.open})).ok,false);
  eq("...naming close",U.scRowCheck(Object.assign({},good,{close:good.open})).field,"close");
  eq("a row that is not an object at all",U.scRowCheck(null).ok,false);
  eq("...nor an array",U.scRowCheck([1,2]).ok,false);
  /* scRowsCheck reports the first failure, its index, and how many rows failed */
  const rs=U.scRowsCheck([good,Object.assign({},good,{shock:1}),Object.assign({},good,{shock:"x"})]);
  eq("one bad row refuses the whole set",rs.ok,false);
  eq("...at its index",rs.at,1);
  eq("...counting every failure",rs.bad,2);
  eq("scRowsCheck on a non-array",U.scRowsCheck(null).ok,false);
}
sect("the opts contract, field by field");
{
  const okOpts={arms:1,pnlN:30,pnlNet:1,monthsElapsed:6,frozen:true,holdoutSpent:false};
  eq("a well-formed opts passes",U.scOptsCheck(okOpts).ok,true);
  eq("an absent opts is not a violation: the required-field pass answers for it",U.scOptsCheck(null).ok,true);
  eq("...nor is an empty one",U.scOptsCheck({}).ok,true);
  eq("opts must be an object",U.scOptsCheck([1]).ok,false);
  const bad=[["arms","20"],["arms",0],["arms",1.5],["arms",Infinity],
    ["pnlN",-1],["pnlN","30"],["pnlNet","1"],["monthsElapsed",-1],
    ["frozen",1],["frozen","true"],["holdoutSpent",1],["holdoutSpent","yes"],
    ["detPrecision",1.5],["detPrecision","0.9"],
    ["holdNRegistered",29],["holdNRegistered",46.5],["holdNRegistered","46"],
    ["boundary",{n:30,close:1,ticker:"t"}],["boundary",42],
    ["bootstrap",{}]];
  for(let i=0;i<bad.length;i++){
    const o=Object.assign({},okOpts); o[bad[i][0]]=bad[i][1];
    const r=U.scOptsCheck(o);
    eq("opts."+bad[i][0]+" = "+JSON.stringify(bad[i][1])+" is refused",r.ok,false);
    eq("...naming the field",r.field,bad[i][0]);
    eq("...as a caller-field violation",r.code,U.SC_OMIT.BAD_OPT);
  }
  eq("a registered n at exactly 11.2a's floor is permitted",
     U.scOptsCheck(Object.assign({},okOpts,{holdNRegistered:30})).ok,true);
  eq("...and 30 is SHOCK_RULE.holdN, restated",U.SCORE.HOLD_N_MIN,U.SHOCK_RULE.holdN);
  eq("a boundary stamp with a fingerprint is permitted",
     U.scOptsCheck(Object.assign({},okOpts,{boundary:{n:30,close:1,ticker:"t",fp:"a-30"}})).ok,true);
  eq("an explicit null reads as absent, not as a type violation",
     U.scOptsCheck(Object.assign({},okOpts,{frozen:null})).ok,true);
  eq("scRequiredFields adds `boundary` once a boundary exists",
     U.scRequiredFields(1,{boundaryExists:true}).indexOf("boundary")>=0,true);
  eq("...and `holdNRegistered` once the sd is measured",
     U.scRequiredFields(1,{sdMeasured:true}).indexOf("holdNRegistered")>=0,true);
  eq("...and neither before that",U.scRequiredFields(1,{}).length,U.SC_VERDICT_FIELDS.length);
  eq("scMissingAll reports both split fields when they are absent",
     U.scMissingAll([],{}).join(","),"boundary,holdNRegistered");
  eq("...and neither when they are supplied",
     U.scMissingAll([],{boundary:{},holdNRegistered:30}).length,0);
}
sect("the contract looks where the READ looks, and a declared shape IS its predicate (third review)");
{
  /* R3-2. scOptsCheck gated on hasOwnProperty while scAssemble/scMissingRequired/scRatchet read with plain
     member access, which walks the prototype chain - so an INHERITED value was consumed having never been
     validated. holdoutSpent is the field 11.6 gives the largest blast radius, shockStatus tests it with
     ===true, and an inherited 1 read as NOT SPENT and reached READY. */
  const proto = function(own, inherited){
    const P = {}; for(const k in inherited) P[k] = inherited[k];
    const o = Object.create(P); for(const k in own) o[k] = own[k];
    return o;
  };
  const OWN = {arms:1,pnlN:30,pnlNet:1,monthsElapsed:6,frozen:true,holdoutSpent:false};
  const cases = [["holdoutSpent",1],["holdoutSpent","yes"],["pnlN","50"],["pnlNet","5"],
                 ["monthsElapsed",-5],["holdNRegistered",5],["arms","20"],["frozen",1]];
  for(let i=0;i<cases.length;i++){
    const k = cases[i][0], v = cases[i][1];
    const own = {}; for(const q in OWN) if(q!==k) own[q] = OWN[q];
    const inh = {}; inh[k] = v;
    ok("an INHERITED "+k+"="+JSON.stringify(v)+" is refused, exactly as an own one is",
       U.scOptsCheck(proto(own, inh)).ok === false && U.scOptsCheck(Object.assign({}, own, inh)).ok === false);
  }
  ok("...while an inherited WELL-FORMED value is still accepted, so the fix is not merely refusing everything",
     U.scOptsCheck(proto({arms:1,pnlN:30,pnlNet:1,monthsElapsed:6,frozen:true}, {holdoutSpent:false})).ok === true);

  /* R3-3. `phase` was typed as any finite number while the table's own shape string said "1 or 2", so an
     out-of-domain number skipped 11.5's phase-2 gate exactly as an ABSENT phase used to (round 1, finding 3).
     shockStatus gates on st.phase===2, so anything that is not 1 or 2 silently means "not phase 2". */
  const bad = [3, 1.5, 0, -1, 2.0000001, -0, NaN, Infinity];
  for(let i=0;i<bad.length;i++)
    ok("phase "+String(bad[i])+" is refused, not treated as 'not phase 2'",
       U.scFieldCheck(U.SC_ROW_FIELDS,"phase",bad[i]).ok === false);
  ok("phase 1 and phase 2 are the only accepted values",
     U.scFieldCheck(U.SC_ROW_FIELDS,"phase",1).ok === true &&
     U.scFieldCheck(U.SC_ROW_FIELDS,"phase",2).ok === true);
  ok("the declared shape string and the predicate now agree, so an auditor reading either is told the truth",
     /exactly 1 or 2/.test((function(){ for(let i=0;i<U.SC_ROW_FIELDS.length;i++)
       if(U.SC_ROW_FIELDS[i].name==="phase") return U.SC_ROW_FIELDS[i].shape; return ""; })()));
}

sect("the four 2026-09-06 registrations are in CLAUDE.md, not only in this unit");
{
  if(fs.existsSync(DOC)){
    const doc=fs.readFileSync(DOC,"utf8");
    ok("11.2 registers the coverage denominator as GRADED",
       /over\s+a\s+denominator\s+of\s+\*\*graded\*\*\s+shock\s+windows/.test(doc));
    ok("...whose side of the split is determinable",/whose side of the split is determinable/.test(doc));
    ok("...and evaluated only once that denominator reaches 30",
       /evaluated \*\*only once\s+that denominator reaches 30\*\*/.test(doc));
    ok("11.7 clause 3 carries the same minimum",
       /This clause may not fire below that minimum denominator/.test(doc));
    ok("11.2 registers the matching CELL as the resampling unit",
       /The resampling unit is the matching cell, not the window/.test(doc));
    ok("11.2a requires BOTH power figures as output",
       /Both power figures are required output/.test(doc));
    ok("...and 11.2 still says control coverage is 80%",/Control coverage .{0,4}80%/.test(doc));
  } else ok("CLAUDE.md not present; registration guards skipped",true);
}

/* ==================================================================================================== */
sect("degradation: the unit alone, with no calendar and no prereg");
{
  const w={ticker:"KXBTC15M-x",open:Date.UTC(2026,0,7,12,30),close:Date.UTC(2026,0,7,12,45),
    result:"yes",snaps:[{t:0,tau:6,pm:0.8,qm:50}],phase:1,shock:true};
  eq("scHasCalendar is false",ALONE.scHasCalendar(),false);
  eq("scHasPrereg is false",ALONE.scHasPrereg(),false);
  eq("scWindowClear degrades to a reason code",ALONE.scWindowClear(w).reason,ALONE.SC_OMIT.NO_CALENDAR);
  eq("scMatchControls degrades to a reason code",ALONE.scMatchControls(w,[w]).reason,ALONE.SC_OMIT.NO_CALENDAR);
  eq("scPairs degrades to a reason code",ALONE.scPairs([w]).code,ALONE.SC_OMIT.NO_CALENDAR);
  eq("scCi degrades to a reason code",ALONE.scCi([{paired:1}],1,null).code,ALONE.SC_OMIT.NO_PREREG);
  const rep=ALONE.scReport([w],{arms:1});
  eq("scReport still returns a report",rep.ok,false);
  /* a REFUSAL needs no judge: it is this unit declining to score, not a verdict on the evidence */
  eq("...whose status is a refusal, not a verdict",(rep.status||{}).status,"REFUSED");
  eq("...naming the missing neighbour",(rep.status||{}).code,ALONE.SC_OMIT.NO_CALENDAR);
  ok("...and it does not throw",true);
  /* scSkill is pure arithmetic and works with no neighbours at all */
  close("scSkill still works alone",ALONE.scSkill(w).skill,0.21);
}
sect("garbage in");
{
  eq("scPairs on a non-array",U.scPairs(null).code,U.SC_OMIT.NO_SHOCKS);
  eq("scPairs on an empty array",U.scPairs([]).code,U.SC_OMIT.NO_SHOCKS);
  eq("scSplit on a non-array",U.scSplit(null).n,0);
  eq("scDid on a non-array",U.scDid(null).controlled,null);
  eq("scSd on a non-array",U.scSd(null),null);
  eq("scMean on an empty array",U.scMean([]),null);
  eq("scMean with a NaN member",U.scMean([1,NaN]),null);
  eq("scSdOf on one point",U.scSdOf([1]),null);
  eq("scWindowLenMin on a zero-length window",U.scWindowLenMin({open:1,close:1}),null);
  eq("scMatchKey on a window with no ticker",U.scMatchKey({open:1}),null);
  ok("scReport on garbage does not throw",!!U.scReport(null,null));
  /* the contract is what keeps this true: every one of these is refused by name rather than reaching the
     matcher, the split or the bootstrap */
  const junk=[null,42,"row",[],{},{ticker:"x"},{ticker:"x",open:1,close:0,phase:1,shock:true,snaps:[]}];
  for(let i=0;i<junk.length;i++){
    const r=U.scReport([junk[i]],{arms:1,pnlN:1,pnlNet:1,monthsElapsed:1,frozen:true,holdoutSpent:false});
    ok("a junk row ["+JSON.stringify(junk[i])+"] does not throw",!!r&&!!r.status);
    ok("...and is never scored",r.ok!==true||r.did===null);
  }
  ok("scPairs on a row list containing a number does not throw",!!U.scPairs([1,2,3]));
  eq("...it refuses it",U.scPairs([1,2,3]).code,U.SC_OMIT.BAD_ROW);
}

/* ==================================================================================================== */
sect("hygiene");
{
  ok("no arrow functions",SRC.indexOf("=>")<0);
  ok("ASCII only",!/[^\x00-\x7F]/.test(SRC));
  /* comments talk ABOUT the page; the check is on the code, and the thrower context proves the rest */
  const CODE=SRC.replace(/\/\*[\s\S]*?\*\//g,"");
  ok("no DOM, storage, fetch, timers or S in the code",
     !/\bdocument\b|\blocalStorage\b|\bfetch\(|setTimeout|setInterval|\bS\./.test(CODE));
  ok("no execution path: nothing here orders, buys or sells",
     !/\border\(|\bplaceOrder|\bexecute\(|\bsubmitOrder/.test(CODE));
  const declared=(SRC.match(/^(?:function|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm)||[])
    .map(function(s){ return s.replace(/^(?:function|const)\s+/,""); });
  ok("every top-level declaration is an sc*/SC* name",
     declared.every(function(n){ return /^sc|^SC/.test(n); }),declared);
  const exported=Object.keys(U);
  const unexported=declared.filter(function(n){ return exported.indexOf(n)<0; });
  ok("every declaration is exported to the harness, so nothing is untested",unexported.length===0,unexported);
  if(fs.existsSync(IDX)){
    const whole=fs.readFileSync(IDX,"utf8");
    const M="/* ---------------- H protocol: score ---------------- */";
    let page=whole;
    const a0=whole.indexOf(M);
    if(a0>=0){
      const a1=whole.indexOf("/* ---------------- H protocol: ",a0+M.length);
      const a2=whole.indexOf("/* ------------------------------------------------------------"+
        "---- clock / loop */",a0+M.length);
      const end=a1>=0?a1:(a2>=0?a2:whole.length);
      page=whole.slice(0,a0)+whole.slice(end);
    }
    const clash=declared.filter(function(n){
      return new RegExp("(function|const|let|var)\\s+"+n+"\\b").test(page); });
    ok("no exported name already exists in index.html",clash.length===0,clash);
  } else ok("index.html not present; name-collision check skipped",true);
}

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
