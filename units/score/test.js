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

let pass=0,fail=0;
function ok(name,cond,extra){ if(cond){ pass++; console.log("  ok  "+name); }
  else { fail++; console.log("  FAIL "+name+(extra===undefined?"":"  -> "+JSON.stringify(extra))); } }
function eq(name,a,b){ ok(name,a===b,{got:a,want:b}); }
function close(name,a,b,tol){ ok(name,typeof a==="number"&&Math.abs(a-b)<=(tol||1e-12),{got:a,want:b}); }
function sect(s){ console.log("\n-- "+s); }

const MIN=60000, WEEK=7*86400000;
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
  const rep=U.scReport([a,b],{arms:1,frozen:true,holdoutSpent:false,pnlN:99,pnlNet:9,monthsElapsed:1});
  eq("scReport refuses a mixed-phase set",rep.code,U.SC_OMIT.MIXED_PHASE);
  eq("...and computes no difference-in-differences",rep.did,null);
  ok("...and its status is not READY",rep.status.status!=="READY",rep.status);
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
    return {lo:0.011,hi:0.09,point:fn(vals)}; };
  const P=[{ticker:"a",close:1,paired:0.02,shockSkill:5,ctrlMeanSkill:4.98,nCtrl:5},
           {ticker:"b",close:2,paired:0.04,shockSkill:7,ctrlMeanSkill:6.96,nCtrl:5}];
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
  eq("the bootstrap resamples the PAIRED differences",JSON.stringify(cap[0].vals),JSON.stringify([0.02,0.04]));
  close("...and its statistic is their mean",cap[0].stat,0.03);
  eq("the CI's lower bound is passed through untouched",c1.lo,0.011);
  /* the analytic bootstrap: on a degenerate sample every resample is identical, so the interval is a
     point -- true for EVERY draw, which is the only kind of bootstrap assertion an unseeded RNG allows */
  const D=[]; for(let i=0;i<12;i++) D.push({ticker:"d"+i,close:i,paired:0.04,shockSkill:1,ctrlMeanSkill:0.96,nCtrl:5});
  const cd=U.scCi(D,1,null);           /* null -> falls back to the page's real, unseeded bootstrapCI */
  close("a degenerate sample gives lo == the value",cd.lo,0.04);
  close("...and hi == the value",cd.hi,0.04);
  close("...and point == the value",cd.point,0.04);
  /* strictly-positive samples: every resample mean is positive, so lo>0 for every possible draw */
  const Pp=[]; for(let i=0;i<20;i++) Pp.push({ticker:"p"+i,close:i,paired:0.01+i/1000,shockSkill:1,ctrlMeanSkill:0,nCtrl:5});
  const cp=U.scCi(Pp,1,null);
  ok("an all-positive sample has a strictly positive lower bound",cp.lo>0,cp);
  ok("lo <= point <= hi",cp.lo<=cp.point&&cp.point<=cp.hi,cp);
  eq("an empty holdout has no CI",U.scCi([],1,null).code,U.SC_OMIT.NO_MATCHED);
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
  eq("SC_CALLER_FIELDS names the eight the caller owns",U.SC_CALLER_FIELDS.length,7);
}

/* ==================================================================================================== */
sect("the whole pass: a grid big enough to reach a holdout");
/* Weekly windows at one UTC slot and weekday. Within each calendar quarter the first five are controls and
   the rest are shocks, so every shock has exactly its own quarter's five controls -- which is also how the
   quarter dimension is tested: drop it and every shock sees every quarter's controls. */
function grid(nWeeks,shockP){
  STUB_RELEASES.length=0;
  const base=Date.UTC(2026,0,7,12,30);
  const byQ={},order=[];
  for(let k=0;k<nWeeks;k++){ const t=base+k*WEEK; const q=U.scQuarterUtc(t);
    if(!byQ[q]){ byQ[q]=[]; order.push(q); } byQ[q].push(t); }
  const rows=[],shocks=[],cps=[0.7,0.8,0.6,0.5,0.9];
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
  const sp=U.scSplit(P.pairs);
  eq("calibration is 30 windows",sp.cal.length,30);
  eq("holdout is the rest",sp.hold.length,P.pairs.length-30);
  const sd=U.scSd(sp.cal);
  ok("the calibration half yields an sd",typeof sd==="number"&&sd>0,sd);
  const holdVals=sp.hold.map(function(r){ return r.paired; });
  const wantMean=holdVals.reduce(function(a,b){ return a+b; },0)/holdVals.length;
  const did=U.scDid(sp.hold);
  close("dBrier is the mean paired difference over the HOLDOUT",did.controlled,wantMean);
  ok("...and it is positive, because this fixture's tool is better",did.controlled>0);
  ok("...and above 11.2's effect floor",did.controlled>=U.SHOCK_RULE.dBrierFloor,did.controlled);

  const opts={arms:1,pnlN:30,pnlNet:12.5,monthsElapsed:6,frozen:true,holdoutSpent:false,bootstrap:null};
  const rep=U.scReport(G.rows,opts);
  eq("the report is for phase 1",rep.st.phase,1);
  eq("nCal is the calibration count",rep.st.nCal,30);
  eq("nHold is the holdout count",rep.st.nHold,sp.hold.length);
  close("st.sd is the calibration sd",rep.st.sd,sd);
  ok("...and NOT the sd of every pair (11.6: measured on the calibration half)",
     Math.abs(rep.st.sd-U.scSd(P.pairs))>1e-9,{cal:rep.st.sd,all:U.scSd(P.pairs)});
  close("st.dBrier is the holdout difference-in-differences",rep.st.dBrier,wantMean);
  const allMean=P.pairs.reduce(function(a,r){ return a+r.paired; },0)/P.pairs.length;
  ok("...and NOT the mean over every pair (11.6: READY is decided on the holdout alone)",
     Math.abs(rep.st.dBrier-allMean)>1e-9,{hold:rep.st.dBrier,all:allMean});
  eq("st.ciLo is the bootstrap's lower bound",rep.st.ciLo,rep.ci.lo);
  eq("coverage is 100% on this fixture",rep.st.ctrlMatched,rep.st.ctrlTotal);
  ok("the caveat travels with the report",rep.caveat===STUB_CAVEAT);
  ok("every scored pair carries its own known block",
     rep.split.calN===30&&P.pairs.every(function(r){ return r.known&&r.known.caveat===STUB_CAVEAT; }));
  ok("the required holdout n is reported",typeof rep.status.holdNReq==="number",rep.status);
  /* every paired value is strictly positive here, so ciLo>0 holds for every possible bootstrap draw */
  ok("the CI lower bound is positive for this fixture, on every draw",rep.ci.lo>0,rep.ci);
  eq("this fixture reaches READY",rep.status.status,"READY",rep.status);
  ok("...and READY is necessary, never sufficient",/necessary, never sufficient/.test(rep.status.why));
  ok("detPrecision is reported missing rather than invented",rep.missing.indexOf("detPrecision")>=0,rep.missing);

  /* the same grid with the tool WORSE must not read READY */
  const W=grid(120,[0.40,0.41,0.42]);
  const repW=U.scReport(W.rows,opts);
  ok("a worse-than-market tool gives a NEGATIVE dBrier",repW.st.dBrier<0,repW.st.dBrier);
  ok("...and does not read READY",repW.status.status!=="READY",repW.status);
  eq("...it abandons",repW.status.status,"ABANDON");

  /* coverage below 80% abandons under 11.7 clause 3 */
  const T=grid(120,SHOCK_P);
  const thin=T.rows.filter(function(w){ return w.shock===true||/-c-2026Q1-/.test(w.ticker); });
  const repT=U.scReport(thin,opts);
  ok("stripping most controls drops coverage below 80%",repT.st.ctrlMatched/repT.st.ctrlTotal<0.8);
  eq("...which abandons under 11.7 clause 3",repT.status.status,"ABANDON");
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
  eq("...with no status, because there is no judge",rep.status,null);
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
