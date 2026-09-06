/* standalone: node test.js
   Loads code.js into a vm with the page helpers stubbed, then asserts (a) the decision functions behave, and
   (b) every threshold in code.js is literally present in prereg.md. (b) is the point: CLAUDE.md 11 is the
   pre-registration, code.js is its machine-readable copy, and a silent edit to either is the failure mode. */
const fs=require("fs"), vm=require("vm"), path=require("path");
const DIR=__dirname;

/* ---- page helpers, reimplemented here (index.html defines these; the unit must not redefine them) ---- */
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
/* Acklam inverse normal CDF; the page's invNorm is equivalent to ~1e-9 over the range used here */
function invNorm(p){
  if(!(p>0&&p<1)) return NaN;
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
  const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
  const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
  const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
  const pl=0.02425;
  let q,r;
  if(p<pl){ q=Math.sqrt(-2*Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  if(p>1-pl){ q=Math.sqrt(-2*Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  q=p-0.5; r=q*q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}
/* VERDICT_RULE as it stands in index.html line 1861 - used to prove shockCiLevel(1) reproduces it */
const VERDICT_RULE={minWindows:200,brierCI:0.90,bandMinN:30,bandMargin:3,pnlMinN:100,pnlDays:2};

const ctx=vm.createContext({clamp,invNorm,Math,Object,Array,Number,JSON,console});
const src=fs.readFileSync(path.join(DIR,"code.js"),"utf8");
const EXPORTS=["SHOCK_RULE","shockCiLevel","shockBootstrapB","shockMonths","shockWindowShare","shockRequiredHoldN",
  "shockFeasible","shockTag","shockCsvFlag","shockMayHeadline","shockPrimaryOk","shockPoolGuard","shockStatus"];
vm.runInContext(src+";__x={"+EXPORTS.map(function(n){return n+":"+n;}).join(",")+"};",ctx);
const X=ctx.__x;
const DOC=fs.readFileSync(path.join(DIR,"prereg.md"),"utf8");

let fails=0;
function ok(name,cond,detail){
  if(cond){ console.log("  ok  "+name); }
  else { console.log("  FAIL "+name+(detail?" — "+detail:"")); fails++; }
}
function near(a,b,eps){ return a!==null&&a!==undefined&&Math.abs(a-b)<=(eps===undefined?1e-9:eps); }

/* ---------------------------------------------------------------- 11.4 multiplicity: the CI level */
ok("ciLevel k=1 reproduces VERDICT_RULE.brierCI exactly",
  near(X.shockCiLevel(1),VERDICT_RULE.brierCI),"got "+X.shockCiLevel(1));
ok("ciLevel k=10 is 0.990",near(X.shockCiLevel(10),0.990),"got "+X.shockCiLevel(10));
ok("ciLevel k=20 is 0.995",near(X.shockCiLevel(20),0.995),"got "+X.shockCiLevel(20));
ok("ciLevel is monotone non-decreasing in k (adding an arm never lowers the bar)",
  (function(){ let prev=0; for(let k=1;k<=64;k++){ const v=X.shockCiLevel(k); if(v<prev-1e-15) return false; prev=v; } return true; })());
ok("ciLevel rejects k<1 with null, not a default",X.shockCiLevel(0)===null&&X.shockCiLevel(-3)===null);

/* ---------------------------------------------------------------- 11.2a bootstrap resolution */
ok("bootstrapB 0.90 -> 200",X.shockBootstrapB(0.90)===200,"got "+X.shockBootstrapB(0.90));
ok("bootstrapB 0.99 -> 2000",X.shockBootstrapB(0.99)===2000,"got "+X.shockBootstrapB(0.99));
ok("bootstrapB 0.995 -> 4000",X.shockBootstrapB(0.995)===4000,"got "+X.shockBootstrapB(0.995));
ok("bootstrapB rejects a non-level with null",X.shockBootstrapB(1)===null&&X.shockBootstrapB(0)===null);

/* ---------------------------------------------------------------- 11.1 sample arithmetic, against the doc's table */
const TBL=[[30,3.6,2.4],[60,7.2,4.8],[100,12.0,8.0],[200,24.0,16.0]];
ok("months table matches CLAUDE.md 11.1 at 100 and 150 releases/yr",
  TBL.every(function(r){ return near(X.shockMonths(r[0],100),r[1],0.05)&&near(X.shockMonths(r[0],150),r[2],0.05); }));
ok("VERDICT_RULE's 200 windows costs 24 months at 100/yr - the reason 11 exists",
  near(X.shockMonths(VERDICT_RULE.minWindows,100),24,1e-9));
ok("shock windows are 0.29% / 0.43% of the tape",
  near(X.shockWindowShare(100)*100,0.2854,0.001)&&near(X.shockWindowShare(150)*100,0.4281,0.001));
ok("a single release type (12/yr) needs 30 months for 30 windows - 11.1's binding consequence",
  near(X.shockMonths(30,12),30,1e-9));
ok("shockMonths rejects a zero rate with null",X.shockMonths(30,0)===null);

/* ---------------------------------------------------------------- 11.2a required holdout n */
ok("requiredHoldN k=20 power .5: sd .02/.03/.05 -> 32/71/197 (the doc's table)",
  X.shockRequiredHoldN(0.02,20,0.5)===32&&X.shockRequiredHoldN(0.03,20,0.5)===71&&X.shockRequiredHoldN(0.05,20,0.5)===197,
  [X.shockRequiredHoldN(0.02,20,0.5),X.shockRequiredHoldN(0.03,20,0.5),X.shockRequiredHoldN(0.05,20,0.5)].join("/"));
ok("requiredHoldN k=20 power .8: sd .02/.03/.05 -> 54/120/333 (the doc's table)",
  X.shockRequiredHoldN(0.02,20,0.8)===54&&X.shockRequiredHoldN(0.03,20,0.8)===120&&X.shockRequiredHoldN(0.05,20,0.8)===333,
  [X.shockRequiredHoldN(0.02,20,0.8),X.shockRequiredHoldN(0.03,20,0.8),X.shockRequiredHoldN(0.05,20,0.8)].join("/"));
ok("requiredHoldN never returns below the pre-registered floor of 30",
  X.shockRequiredHoldN(0.001,20,0.5)===30&&X.shockRequiredHoldN(0.0001,1,0.5)===30);
ok("requiredHoldN is monotone non-decreasing in sd and in k",
  X.shockRequiredHoldN(0.05,20,0.5)>=X.shockRequiredHoldN(0.03,20,0.5)&&
  X.shockRequiredHoldN(0.03,20,0.5)>=X.shockRequiredHoldN(0.03,10,0.5)&&
  X.shockRequiredHoldN(0.03,10,0.5)>=X.shockRequiredHoldN(0.03,1,0.5));
ok("requiredHoldN with no measured sd returns null, never a plausible default",
  X.shockRequiredHoldN(null,20,0.5)===null&&X.shockRequiredHoldN(undefined,20,0.5)===null&&X.shockRequiredHoldN(0,20,0.5)===null);

/* ---------------------------------------------------------------- 11.7 clause 5 feasibility */
const F1=X.shockFeasible(0.05,20,0,150);
ok("feasible sd=.05 k=20 from a standing start: 197 windows, 15.8 months, inside 24",
  F1.holdN===197&&near(F1.months,15.76,0.05)&&F1.ok===true,JSON.stringify(F1));
const F2=X.shockFeasible(0.05,20,10,150);
ok("same design with 10 months already spent is infeasible - closes on day one of the holdout",F2.ok===false);
const F3=X.shockFeasible(0.05,20,0,100);
ok("same design at 100/yr needs 23.6 months of holdout - inside 24 only from a standing start",
  near(F3.months,23.64,0.05)&&F3.ok===true,JSON.stringify(F3));
ok("feasible with no sd returns null",X.shockFeasible(null,20,0,150)===null);

/* ---------------------------------------------------------------- 11.4 labelling */
ok("tag/csv flag",X.shockTag(true)==="primary"&&X.shockTag(false)==="exploratory"&&X.shockCsvFlag(false)===1&&X.shockCsvFlag(true)===0);
ok("an exploratory arm never headlines, even at READY",X.shockMayHeadline(false,"READY")===false);
ok("a primary arm headlines only at READY",
  X.shockMayHeadline(true,"READY")===true&&X.shockMayHeadline(true,"HOLDOUT")===false&&X.shockMayHeadline(true,"NEGATIVE")===false);
ok("exactly one primary per phase",
  X.shockPrimaryOk([{primary:true},{primary:false}]).ok===true&&
  X.shockPrimaryOk([{primary:true},{primary:true}]).ok===false&&
  X.shockPrimaryOk([{primary:false}]).ok===false);

/* ---------------------------------------------------------------- 11.5 phases are never pooled */
ok("pool guard rejects mixed phases",
  X.shockPoolGuard([{phase:1},{phase:1}]).ok===true&&X.shockPoolGuard([{phase:1},{phase:2}]).ok===false);
ok("pool guard reports which phases were mixed",
  JSON.stringify(X.shockPoolGuard([{phase:2},{phase:1}]).phases)==="[1,2]");

/* ---------------------------------------------------------------- shockStatus truth table */
const BASE={phase:1,nCal:30,nHold:40,arms:20,sd:0.02,dBrier:0.020,ciLo:0.004,ctrlMatched:90,ctrlTotal:100,
  pnlN:40,pnlNet:12,detPrecision:null,monthsElapsed:10,frozen:true,holdoutSpent:false};
function W(o){ const s=Object.assign({},BASE); for(const k in o) s[k]=o[k]; return X.shockStatus(s); }
ok("READY when every clause is met",W({}).status==="READY",JSON.stringify(W({})));
ok("READY carries the k=20 level and 4000 resamples",W({}).ciLevel===0.995&&W({}).bootstrapB===4000);
ok("CALIBRATING before 30 calibration windows",W({nCal:12}).status==="CALIBRATING");
ok("FROZEN-PENDING until thresholds are frozen and stamped",W({frozen:false}).status==="FROZEN-PENDING");
ok("HOLDOUT until the required n is reached",W({nHold:31}).status==="HOLDOUT",JSON.stringify(W({nHold:31})));
ok("INVALID when sd was never measured on the calibration half",W({sd:null}).status==="INVALID");
ok("INVALID when the holdout was spent by a post-freeze change",W({holdoutSpent:true}).status==="INVALID");
ok("INVALID when the holdout is complete but the statistic is missing - never a default",
  W({dBrier:null}).status==="INVALID"&&W({ciLo:null}).status==="INVALID");
ok("ABANDON on control coverage below 80% (11.7 c3)",W({ctrlMatched:70,ctrlTotal:100}).status==="ABANDON");
ok("coverage exactly 80% is not an abandonment",W({ctrlMatched:80,ctrlTotal:100}).status==="READY");
ok("ABANDON on the 24-month clock with the holdout short (11.7 c5)",
  W({monthsElapsed:30,nHold:12}).status==="ABANDON",JSON.stringify(W({monthsElapsed:30,nHold:12})));
ok("ABANDON when the effect is below half the floor (11.7 c1)",W({dBrier:0.004}).status==="ABANDON");
ok("NEGATIVE when the effect is present but under the floor",W({dBrier:0.007}).status==="NEGATIVE");
ok("NEGATIVE when the CI touches zero",W({ciLo:-0.001}).status==="NEGATIVE");
ok("NEGATIVE when paper P&L is not positive or has too few entries",
  W({pnlNet:-3}).status==="NEGATIVE"&&W({pnlN:12}).status==="NEGATIVE");
ok("phase 2 INVALID without a confusion matrix against the phase-1 calendar (11.5)",
  W({phase:2}).status==="INVALID");
ok("phase 2 ABANDON at detector precision below 0.50 (11.7 c4)",
  W({phase:2,detPrecision:0.41}).status==="ABANDON");
ok("phase 2 READY is reachable once the detector is characterised",
  W({phase:2,detPrecision:0.72}).status==="READY");
ok("the floor is a floor: 0.010 exactly clears, 0.0099 does not",
  W({dBrier:0.010}).status==="READY"&&W({dBrier:0.0099}).status==="NEGATIVE");

/* ---------------------------------------------------------------- doc <-> code: no silent drift */
const MUST=[
  ["calN/holdN 30",["30"]],["minTotal 60",["60"]],["alpha 0.10",["0.10/k","1 − 0.10/k","1 - 0.10/k"]],
  ["dBrierFloor 0.010",["0.010"]],["dBrierAbandon 0.005",["0.005"]],["minCtrlPerShock 5",["5 controls","5 valid matched controls"]],
  ["ctrlCoverage 0.80",["80%"]],["pnlMinN 30",["30 holdout entries"]],["phase2MinPrecision 0.50",["0.50"]],
  ["maxMonths 24",["24 months"]],["relLo 100",["100 per year","100 releases"]],["relHi 150",["150"]],
  ["winPerYear 35040",["35,040"]],
  ["derived level k=20 0.995",["0.995"]],["derived level k=10 0.990",["0.990"]],
  ["derived B 4000",["4,000"]],["derived B 2000",["2,000"]],["derived B 200",["200 at k=1"]],
  ["z at k=20",["2.807"]],["z at k=1",["1.645"]],["z at k=10",["2.576"]],
  ["SEAS 1.007 at 12 UTC",["1.007"]],["SEAS 1.298 at 13 UTC",["1.298"]],["SEAS 1.934 at 14 UTC",["1.934"]],
  ["SEAS daily swing 2.41x table",["2.41\u00d7"]],["SEAS daily swing 1.55x in sigma",["1.55\u00d7"]],
  ["DST ratio 1.29x table",["1.29\u00d7"]],["DST ratio 1.14x in sigma",["1.14\u00d7"]],
  ["required-n row sd .02",["| 32 | 54 |"]],["required-n row sd .03",["| 71 | 120 |"]],["required-n row sd .05",["| 197 | 333 |"]],
  ["months row 30",["3.6 months"]],["months row 60",["7.2 months"]],["months row 100",["12.0 months"]],["months row 200",["24 months"]],
  ["market Brier 0.1457",["0.1457"]],["model Brier 0.1473",["0.1473"]],["gap 0.0016",["0.0016"]],["refit gain 0.0007",["0.0007"]],
  ["falsification clause 1",["1. **The effect is not there.**"]],
  ["falsification clause 6",["6. **A threshold in this section is loosened.**"]]
];
/* any-of semantics: each row passes if at least one of its spellings appears in the document */
MUST.forEach(function(m){
  const hits=m[1].filter(function(s){ return DOC.indexOf(s)>=0; });
  ok("prereg.md states "+m[0],hits.length>0,"none of: "+m[1].join(" | "));
});
ok("every SHOCK_RULE numeric threshold is a number, not a string",
  Object.keys(X.SHOCK_RULE).filter(function(k){return k!=="version";}).every(function(k){return typeof X.SHOCK_RULE[k]==="number";}));
ok("code.js is pure ASCII (the file's \\uXXXX convention)",!/[^\x00-\x7F]/.test(src));
const CODE=src.replace(/\/\*[\s\S]*?\*\//g,"");   /* strip comments: the purity check is about code, not prose about code */
ok("code.js touches no DOM, storage, network or clock",
  !/\bdocument\b|\blocalStorage\b|\bsessionStorage\b|\bfetch\b|\bXMLHttpRequest\b|\bsetInterval\b|\bsetTimeout\b|Date\.now|new Date/.test(CODE));
ok("code.js does not redefine a page helper",
  !/function (clamp|normCdf|invNorm|randn|quantile|mulberry|bootstrapCI|termFactor|calSigma|computeStats|hourStart)\s*\(/.test(src));
ok("the doc forbids reporting against the unconditional baseline",
  DOC.indexOf("never reported against the unconditional baseline")>=0||DOC.indexOf("No shock number is ever reported against the unconditional baseline")>=0);
ok("the doc states READY is necessary, never sufficient, and adds no execution path",
  DOC.indexOf("necessary, never sufficient")>=0&&DOC.indexOf("does not add one")>=0);

console.log(fails?("\n"+fails+" FAILED"):"\nall passed");
process.exit(fails?1:0);
