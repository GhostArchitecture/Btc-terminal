/* standalone test for the `schema` unit.  run: node test.js
   Loads code.js into a vm context with the page helpers it needs reimplemented in the harness.
   The volspace dependencies (impliedSigma, realizedSigmaInfo) are provided as honest reimplementations
   in one context, and deliberately LEFT UNDEFINED in a second context, to prove the guards hold. */
const fs=require("fs"), vm=require("vm"), path=require("path");

const SRC=fs.readFileSync(path.join(__dirname,"code.js"),"utf8");

/* ---- page helpers, reimplemented (not stubbed away) ---- */
const SEAS=[0.905,1.157,1.074,0.933,0.879,0.949,0.97,0.804,0.836,1.075,0.993,0.954,1.007,1.298,1.934,1.855,1.323,1.257,1.113,1.012,0.953,0.931,1.018,0.961];
function normCdf(x){
  const t=1/(1+0.2316419*Math.abs(x));
  const d=0.3989423*Math.exp(-x*x/2);
  const p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));
  return x>0?1-p:p;
}
/* the analytic fair value the whole codebase uses, and a bisection inverse for sigma */
function pOver(sig,x,tau){ const sd=sig*Math.sqrt(tau); if(!(sd>0)) return null; return 1-normCdf((x+0.5*sig*sig*tau)/sd); }
/* --- volspace, reimplemented (not stubbed) at the CONTRACT IN FORCE ---------------------------------
   The gate on a stored implied sigma is the TRUE one-cent tick move against VRP_TICK_REL_MAX (0.20). The
   superseded local derivative (relPerCent, bound VRP_REL_MAX = 0.5) is still produced, because the unit
   still reports it as a diagnostic - and because the regression assertions below need to show that the old
   quantity PASSES readings the true tick move rejects. */
const VRP_TICK=0.01, VRP_TICK_REL_MAX=0.20, VRP_REL_MAX=0.5;
/* the inversion in x-space: the sigma that reprices q, LOW root where two exist, null when none does. */
function xSolve(x,tau,q){
  if(!(tau>0)||typeof q!=="number"||!isFinite(q)||!(q>0.005)||!(q<0.995)) return null;
  let lo=1e-9, hi=50;
  if(x>0){ const pM=1-normCdf(Math.sqrt(2*x)); if(!(q<pM)) return null; hi=Math.sqrt(2*x)/Math.sqrt(tau); }
  else if(x===0&&!(q<0.5)) return null;
  if(!(hi>lo)) return null;
  const f=s=>{ const p=pOver(s,x,tau); return p===null?null:p-q; };
  let a=lo,b=hi; const fa=f(a), fb=f(b);
  if(fa===null||fb===null||(fa>0)===(fb>0)) return null;
  const up=fa<0;
  for(let i=0;i<140;i++){ const m=(a+b)/2, fm=f(m); if(fm===null) return null; if((fm<0)===up) a=m; else b=m; }
  const s=(a+b)/2, chk=pOver(s,x,tau);
  return (chk!==null&&Math.abs(chk-q)<=2e-6)?s:null;
}
function impliedSigma(strike,S0,tau,q){
  if(!(strike>0)||!(S0>0)) return null;
  return xSolve(Math.log(strike/S0),tau,q);
}
/* the LOCAL DERIVATIVE, kept only as the diagnostic it now is */
function vsSens(sig,x,tau){
  const h=sig*1e-4;
  const a=pOver(sig-h,x,tau), b=pOver(sig+h,x,tau);
  if(a===null||b===null) return null;
  const dp=(b-a)/(2*h);
  if(!isFinite(dp)||dp===0) return null;
  return Math.abs(VRP_TICK/dp)/sig;
}
/* THE TRUE TICK MOVE: invert at q, q+1c and q-1c and take the LARGEST fractional change. A neighbour that
   does not invert is NOT zero sensitivity - it is one tick moving the reading out of existence - so it is
   reported one-sided and can never pass. */
function tickSens(x,tau,q){
  const out={identified:false,rel:null,relUp:null,relDown:null,sig:null,sided:null,reason:"ok"};
  const b=xSolve(x,tau,q); out.sig=b;
  if(b===null){ out.reason="no implied sigma at the quote"; return out; }
  const u=xSolve(x,tau,q+VRP_TICK), d=xSolve(x,tau,q-VRP_TICK);
  if(u!==null) out.relUp=Math.abs(u-b)/b;
  if(d!==null) out.relDown=Math.abs(d-b)/b;
  if(u!==null&&d!==null){ out.sided="two"; out.rel=Math.max(out.relUp,out.relDown);
    out.identified=out.rel<=VRP_TICK_REL_MAX; if(!out.identified) out.reason="past VRP_TICK_REL_MAX"; return out; }
  if(u!==null){ out.sided="up"; out.rel=out.relUp; out.reason="quote-1c does not invert"; return out; }
  if(d!==null){ out.sided="down"; out.rel=out.relDown; out.reason="quote+1c does not invert"; return out; }
  out.reason="neither neighbour inverts";
  return out;
}
/* THE DECIDER a write site consults when it has the real quote */
function impliedSigmaTick(strike,S0,tau,q){
  const out={identified:false,rel:null,relUp:null,relDown:null,sig:null,sided:null,x:null,
             tick:VRP_TICK,bound:VRP_TICK_REL_MAX,reason:"ok"};
  const fin=v=>typeof v==="number"&&isFinite(v);
  if(!fin(strike)||!fin(S0)||!fin(tau)||!fin(q)||!(strike>0)||!(S0>0)||!(tau>0)){ out.reason="bad input"; return out; }
  const x=Math.log(strike/S0);
  if(!isFinite(x)){ out.reason="bad input"; return out; }
  out.x=x;
  const t=tickSens(x,tau,q);
  out.identified=t.identified; out.rel=t.rel; out.relUp=t.relUp; out.relDown=t.relDown;
  out.sig=t.sig; out.sided=t.sided; out.reason=t.reason;
  return out;
}
/* THE QUOTE-FREE PRIOR: the same probe run at the MODEL-FAIR quote, so it needs no market price. */
function sigmaIdentifiability(x,sigModel,tau){
  const out={identified:false,xs:null,relPerCent:null,tickRel:null,tickSided:null,qFair:null,
             bound:VRP_TICK_REL_MAX,prior:true,reason:"ok"};
  const fin=v=>typeof v==="number"&&isFinite(v);
  if(!fin(x)||!fin(sigModel)||!fin(tau)||!(sigModel>0)||!(tau>0)){ out.reason="non-finite input"; return out; }
  const sd=sigModel*Math.sqrt(tau);
  if(!(sd>0)||!isFinite(sd)){ out.reason="degenerate"; return out; }
  out.xs=x/sd;
  out.relPerCent=vsSens(sigModel,x,tau);
  const qFair=pOver(sigModel,x,tau);
  if(qFair===null||!isFinite(qFair)){ out.reason="model-fair quote undefined"; return out; }
  out.qFair=qFair;
  const t=tickSens(x,tau,qFair);
  out.tickRel=t.rel; out.tickSided=t.sided;
  if(t.identified){ out.identified=true; return out; }
  out.reason=(Math.abs(out.xs)<1?"at the money: ":"deep tail: ")+t.reason;
  return out;
}
/* THE SUPERSEDED PRIOR, kept verbatim for the LEGACY context: a pre-2026-09-06 volspace, which knows nothing
   of the tick and rules on the local derivative against VRP_REL_MAX = 0.5. It is what a row with no stored
   `sq` used to be judged by, and the fallback path must still work against it. */
function sigmaIdentifiabilityLegacy(x,sigModel,tau){
  const out={identified:false,xs:null,relPerCent:null,reason:"ok"};
  const fin=v=>typeof v==="number"&&isFinite(v);
  if(!fin(x)||!fin(sigModel)||!fin(tau)||!(sigModel>0)||!(tau>0)){ out.reason="non-finite input"; return out; }
  const sd=sigModel*Math.sqrt(tau);
  if(!(sd>0)||!isFinite(sd)){ out.reason="degenerate"; return out; }
  out.xs=x/sd;
  const rel=vsSens(sigModel,x,tau);
  if(rel===null||!isFinite(rel)){ out.reason="conditioning undefined"; return out; }
  out.relPerCent=rel;
  if(rel<=VRP_REL_MAX){ out.identified=true; return out; }
  out.reason=(Math.abs(out.xs)<1)?"at the money":"deep tail";
  return out;
}
/* an INDEPENDENT root finder used only by the branch test: scan sigma on a log grid and refine every sign
   change, so the test knows how many roots exist and which one is the small one without asking the code
   under test or its dependency. */
function allRoots(x,tau,q){
  const f=s=>{ const p=pOver(s,x,tau); return p===null?null:p-q; };
  const out=[]; const N=20000, lo=Math.log(1e-7), hi=Math.log(5);
  let ps=Math.exp(lo), pf=f(ps);
  for(let i=1;i<=N;i++){
    const cs=Math.exp(lo+(hi-lo)*i/N), cf=f(cs);
    if(pf!==null&&cf!==null&&((pf<0)!==(cf<0))){
      let a=ps,b=cs,fa=pf;
      for(let k=0;k<200;k++){ const m=(a+b)/2, fm=f(m); if((fm<0)===(fa<0)){a=m;fa=fm;} else b=m; }
      out.push((a+b)/2);
    }
    ps=cs; pf=cf;
  }
  return out;
}
function realizedSigmaInfo(keys,closes,t0,t1,minN){
  const need=(typeof minN==="number"&&isFinite(minN)&&minN>=2)?Math.floor(minN):10;
  const out={sig:null,n:0,dropped:0,need};
  if(!keys||!closes||!keys.length||keys.length!==closes.length) return out;
  if(!(t1>t0)) return out;
  const k0=Math.floor(t0/60000), k1=Math.floor(t1/60000);
  const r=[]; let pk=null,pc=null;
  for(let i=0;i<keys.length;i++){
    const k=keys[i], c=closes[i];
    if(k<k0||k>k1) continue;
    if(pk!==null){ if(k-pk===1) r.push(Math.log(c/pc)); else out.dropped++; }
    pk=k; pc=c;
  }
  out.n=r.length;
  if(r.length<need) return out;
  let s=0; for(const v of r) s+=v*v;
  out.sig=Math.sqrt(s/r.length);
  return out;
}

function mkCtx(mode){
  const ctx={SEAS,normCdf,Math,Date,JSON,Object,isFinite,console};
  if(mode==="full"){ ctx.impliedSigma=impliedSigma; ctx.realizedSigmaInfo=realizedSigmaInfo;
                     ctx.sigmaIdentifiability=sigmaIdentifiability;
                     ctx.impliedSigmaTick=impliedSigmaTick; ctx.VRP_TICK_REL_MAX=VRP_TICK_REL_MAX; }
  if(mode==="legacy"){ ctx.impliedSigma=impliedSigma; ctx.realizedSigmaInfo=realizedSigmaInfo;
                       ctx.sigmaIdentifiability=sigmaIdentifiabilityLegacy; }
  vm.createContext(ctx);
  /* forbid the impure surfaces outright: touching any of them throws */
  const trap=n=>{ Object.defineProperty(ctx,n,{get(){ throw new Error("unit touched "+n); }}); };
  ["document","window","localStorage","fetch","setTimeout","setInterval","S"].forEach(trap);
  vm.runInContext(SRC,ctx,{filename:"code.js"});
  /* top-level `const` in a vm script lives in the script's lexical scope, not on the context object.
     In index.html the whole page is one script so the consts are plainly visible; expose them here the
     same way, by evaluating the identifier inside the context. */
  ctx.R=code=>vm.runInContext(code,ctx);
  return ctx;
}
const C=mkCtx("full");      /* full page: volspace spliced at the contract in force (tick decider present) */
const N=mkCtx("none");      /* degraded page: volspace absent */
const L=mkCtx("legacy");    /* partial splice: a pre-2026-09-06 volspace with no tick decider */

/* ---- runner ---- */
let fails=0, ran=0;
function ok(name,cond,detail){
  ran++;
  if(cond) console.log("  ok  "+name);
  else { fails++; console.log("  FAIL "+name+(detail===undefined?"":("  -> "+detail))); }
}
function eq(name,a,b){ ok(name,Object.is(a,b),JSON.stringify(a)+" !== "+JSON.stringify(b)); }
function near(name,a,b,tol){ ok(name,typeof a==="number"&&Math.abs(a-b)<=tol,a+" not within "+tol+" of "+b); }
function keys(o){ return Object.keys(o).sort().join(","); }

const HOUR=3600000, MIN=60000;
/* a fixed UTC instant: 2026-09-06T14:07:00Z -> hour 14 (SEAS peak 1.934) */
const T0=Date.UTC(2026,8,6,14,7,0);

console.log("schema unit");

/* ---------- schemaNum / sigBp ---------- */
eq("schemaNum rounds to dp",C.schemaNum(1.23456,2),1.23);
eq("schemaNum drops NaN",C.schemaNum(NaN,2),undefined);
eq("schemaNum drops Infinity",C.schemaNum(Infinity,2),undefined);
eq("schemaNum drops null",C.schemaNum(null,2),undefined);
eq("schemaNum drops string",C.schemaNum("3",2),undefined);
eq("schemaNum dp 0 gives integer",C.schemaNum(1240.7,0),1241);
eq("sigBp converts per-minute sigma to bp",C.sigBp(0.000842),8.42);
eq("sigBp keeps 2dp of a bp",C.sigBp(0.00012345),1.23);
eq("sigBp drops null (impliedSigma miss)",C.sigBp(null),undefined);
eq("sigBp drops negative sigma",C.sigBp(-0.001),undefined);
eq("sigBp accepts zero",C.sigBp(0),0);
/* F2: 2dp of a bp cannot represent a positive sigma below 0.005 bp/min. Rounding it to 0 would fabricate a
   measurement of no volatility and propagate as vrp = 0 - sr, a large negative premium out of nowhere. */
eq("sigBp omits a positive sub-resolution sigma rather than writing a fabricated 0",C.sigBp(1.858e-7),undefined);
eq("sigBp omits the smallest sigma that still rounds to 0",C.sigBp(4.9e-7),undefined);
eq("sigBp keeps the smallest representable sigma",C.sigBp(5.1e-7),0.01);
ok("an exact zero is a measurement and survives; a sub-resolution positive is an omission",
   C.sigBp(0)===0&&C.sigBp(1e-9)===undefined);

/* ---------- seasFactor / seasAt / utcHour ---------- */
eq("utcHour of the fixture",C.utcHour(T0),14);
eq("utcHour of a non-number",C.utcHour(null),null);
eq("seasAt reads the table",C.seasAt(T0),SEAS[14]);
near("seasFactor is 1 inside one clock hour",C.seasFactor(T0,T0+5*MIN),1,1e-12);
near("seasFactor across an hour boundary",C.seasFactor(Date.UTC(2026,8,6,13,58),Date.UTC(2026,8,6,14,2)),Math.sqrt(SEAS[14]/SEAS[13]),1e-12);
ok("seasFactor across the SEAS peak is >1",C.seasFactor(Date.UTC(2026,8,6,7,58),Date.UTC(2026,8,6,14,2))>1);

/* ---------- touchSigma ---------- */
eq("touchSigma null without stats",C.touchSigma(null,T0,T0+9*MIN),null);
near("touchSigma prefers rv60",C.touchSigma({rv60:0.0009,sig:0.002},T0,T0+9*MIN),0.0009,1e-15);
near("touchSigma falls back to sig",C.touchSigma({rv60:null,sig:0.002},T0,T0+9*MIN),0.002,1e-15);
near("touchSigma applies the seasonal ratio and NOT the term factor",
  C.touchSigma({rv60:0.001,sig:0.002},Date.UTC(2026,8,6,13,58),Date.UTC(2026,8,6,14,10)),
  0.001*Math.sqrt(SEAS[14]/SEAS[13]),1e-15);
eq("touchSigma null on a bad base",C.touchSigma({rv60:null,sig:null},T0,T0+9*MIN),null);
/* F4: new Date(null) is the EPOCH, not an Invalid Date. Unguarded, seasFactor(null,null) reads SEAS[0] twice
   and returns a perfectly plausible 1, and touchSigma then returns a number for junk input - the one input
   class in the unit where junk would yield a value instead of an omission. */
eq("seasFactor of two nulls is undefined, not 1",C.seasFactor(null,null),undefined);
eq("seasFactor of one null is undefined",C.seasFactor(T0,null),undefined);
eq("seasFactor of a Date object is undefined (numbers only)",C.seasFactor(new Date(T0),new Date(T0)),undefined);
eq("seasFactor of NaN is undefined",C.seasFactor(NaN,T0),undefined);
eq("touchSigma with null timestamps is null, not the raw rv60",C.touchSigma({rv60:0.001},null,null),null);
eq("touchSigma with one null timestamp is null",C.touchSigma({rv60:0.001},T0,null),null);
eq("a swing read with null timestamps writes no sm",C.swingReadFields({rv60:0.001},"YES",{yesBid:3,yesAsk:6,noBid:94,depthYes:1,depthNo:2},112500,112400,null,null).sm,undefined);

/* ---------- schemaPut: the omit rule ---------- */
{
  const row={t:1,tau:8.42,ask:0.05,p:0.12};
  const before=JSON.stringify(row);
  C.schemaPut(row,{sm:undefined,si:undefined,xs:undefined});
  eq("schemaPut with an empty bundle changes nothing",JSON.stringify(row),before);
  C.schemaPut(row,{sm:8.42,si:undefined,dy:0});
  eq("schemaPut writes only real values",keys(row),"ask,dy,p,sm,t,tau");
  eq("schemaPut keeps a legitimate zero",row.dy,0);
  ok("schemaPut never introduces a null",JSON.stringify(row).indexOf("null")<0,JSON.stringify(row));
  eq("schemaPut leaves existing keys alone",row.p,0.12);
  eq("schemaPut tolerates a null bundle",C.schemaPut(row,null),row);
  eq("schemaPut tolerates a null row",C.schemaPut(null,{a:1}),null);
}

/* ---------- bookDepth / depthAtAsk ---------- */
{
  const ob={yesBid:4,yesAsk:6,noBid:94,noAsk:96,depthYes:1240,depthNo:880};
  eq("bookDepth reads the two discarded fields",keys(C.bookDepth(ob)),"dn,dy");
  eq("bookDepth dy",C.bookDepth(ob).dy,1240);
  eq("bookDepth dn",C.bookDepth(ob).dn,880);
  eq("bookDepth of null book is empty",keys(C.bookDepth(null)),"");
  eq("bookDepth omits a non-numeric depth",C.bookDepth({depthYes:null,depthNo:5}).dy,undefined);
  /* the orientation that H2 depends on */
  eq("a YES ask is backed by resting NO bids",C.depthAtAsk("YES",1240,880),880);
  eq("a NO ask is backed by resting YES bids",C.depthAtAsk("NO",1240,880),1240);
  eq("depthAtAsk of an unknown side",C.depthAtAsk("MAYBE",1,2),null);
  eq("depthAtAsk with a missing depth",C.depthAtAsk("YES",1240,undefined),null);
}

/* ---------- edgeSnapFields ---------- */
{
  const S0=112500, strike=112400, tau=8.42, sigU=0.00085;
  const P={sigU,tau,S0,over:0.55};
  const quote={q:0.53,spread:0.02};
  const ob={depthYes:1240,depthNo:880};
  const f=C.edgeSnapFields(P,quote,strike,ob);
  /* `sb` joined the set on 2026-09-06: the identifiability bound in force AT THE WRITE. siJudge runs at
     EXPORT time, so without a bound stored on the row every historical row would be silently re-judged
     under whatever bound is current - which CLAUDE.md 11.8 explicitly promises does not happen. */
  eq("edge snap carries the seven non-derivable fields",keys(f),"dn,dy,sb,si,sm,sq,xs");
  eq("...and sb is the bound that was in force when the row was written",f.sb,VRP_TICK_REL_MAX);
  eq("a two-sided reading carries no sided marker: sq present IS the two-sided state",f.sqS,undefined);
  eq("edge snap sm is the model sigma in bp",f.sm,8.5);
  const x=Math.log(strike/S0);
  near("edge snap xs is the standardised strike distance",f.xs,x/(sigU*Math.sqrt(tau)),0.001);
  ok("edge snap xs is negative when the strike sits below spot",f.xs<0,f.xs);
  /* si must actually reprice the quote */
  const sigI=f.si/1e4;
  near("edge snap si reprices the quote it was inverted from",pOver(sigI,x,tau),quote.q,1e-4);
  eq("edge snap carries no sv (containers carry it)",f.sv,undefined);
  /* an hourly ladder rung is snapped with ob=null: no depth at all, everything else intact */
  const g=C.edgeSnapFields(P,quote,strike,null);
  eq("hourly rung snap has no depth",keys(g),"sb,si,sm,sq,xs");
  /* no quote -> no implied sigma, but the model sigma and xs survive */
  const h=C.edgeSnapFields(P,null,strike,ob);
  eq("no quote means no implied sigma",h.si,undefined);
  eq("no quote still yields sm and xs",[h.sm!==undefined,h.xs!==undefined].join(","),"true,true");
  /* no P at all */
  eq("null P still records the book depth",keys(C.edgeSnapFields(null,quote,strike,ob)),"dn,dy");
  /* strikeProbs without the additive S0 key (an un-migrated build) */
  eq("missing S0 costs si and xs, not sm",keys(C.edgeSnapFields({sigU,tau},quote,strike,ob)),"dn,dy,sm");
}
/* the missing-not-at-random caveat, asserted rather than asserted-in-prose:
   above-the-money (x>0) quotes have a hard cap pMax, so si is unavailable for a whole region. */
{
  const S0=112400, strike=112500, tau=8.0, sigU=0.00085;  /* strike ABOVE spot -> x > 0 */
  const x=Math.log(strike/S0), pMax=1-normCdf(Math.sqrt(2*x));
  const lo=C.edgeSnapFields({sigU,tau,S0},{q:pMax*0.5},strike,null);
  const hi=C.edgeSnapFields({sigU,tau,S0},{q:Math.min(0.99,pMax+0.05)},strike,null);
  ok("above-strike: an attainable quote yields si",lo.si!==undefined,JSON.stringify(lo));
  ok("above-strike: a quote past pMax yields NO si (omitted, not guessed)",hi.si===undefined,JSON.stringify(hi));
  ok("the unattainable row still carries xs, so the omission is diagnosable offline",hi.xs!==undefined);
}
/* ---- F3: WHICH ROOT. Above the money p_over is NOT monotone in sigma - it rises to pMax = 1-Phi(sqrt(2x))
   and falls back, so a quote below pMax has TWO implied sigmas and both reprice it exactly. A "si reprices
   the quote" assertion therefore cannot tell a low/high branch swap in volspace from a correct answer, and
   such a swap would store sigmas ~250x too large on every above-the-money row. This is a RECOVERY test: the
   quote is generated from a known sigma and si must come back as that sigma, which pins the branch. ---- */
{
  const S0=112500, x=0.0005, strike=S0*Math.exp(x), tau=9, trueSig=0.0009;   /* strike 5bp ABOVE spot */
  const q=pOver(trueSig,x,tau);
  const rs=allRoots(x,tau,q);
  eq("the test is discriminating: this quote really does have two implied sigmas",rs.length,2);
  ok("the two roots are far apart, so a branch swap could not hide",rs[1]/rs[0]>100,JSON.stringify(rs));
  near("the low root is the sigma the quote was generated from",rs[0],trueSig,1e-7);
  const f=C.edgeSnapFields({sigU:trueSig,tau,S0},{q},strike,null);
  near("edge snap si RECOVERS the generating sigma above the money (low root, not high)",f.si,trueSig*1e4,0.02);
  ok("edge snap si is nowhere near the high root",Math.abs(f.si-rs[1]*1e4)>100,String(f.si));
  ok("above the money xs is positive",f.xs>0,String(f.xs));
  /* the same, through the swing path, whose quote comes from the book mid rather than from strikeProbs */
  const qc=Math.round(q*1000)/10;                                  /* mid in cents, on a half-cent grid */
  const ob={yesBid:qc-0.5,yesAsk:qc+0.5,noBid:100-(qc+0.5),noAsk:100-(qc-0.5),depthYes:9,depthNo:9};
  const sw=C.swingReadFields({rv60:trueSig},"YES",ob,S0,strike,T0,T0+tau*MIN);
  const swRoots=allRoots(x,tau,qc/100);
  eq("the swing case is discriminating too",swRoots.length,2);
  near("swing si takes the low root above the money",sw.si,swRoots[0]*1e4,0.02);
  ok("swing si is nowhere near the high root",Math.abs(sw.si-swRoots[1]*1e4)>100,String(sw.si));
}
/* ---- F1: an implied sigma never travels alone. si is written only when sm and xs are written too, so the
   ratio si/sm and the standardised strike distance are ALWAYS available to judge it. A bare si is a number
   no analyst can tell from noise. ---- */
{
  const S0=112500, strike=112400, tau=8.42, quote={q:0.53};
  const ob={depthYes:1,depthNo:2};
  eq("no model sigma means no si either, not a bare unjudgeable reading",
     keys(C.edgeSnapFields({tau,S0},quote,strike,ob)),"dn,dy");
  eq("a zero model sigma means no si either",
     keys(C.edgeSnapFields({sigU:0,tau,S0},quote,strike,ob)),"dn,dy,sm");
  const full=C.edgeSnapFields({sigU:0.00085,tau,S0},quote,strike,ob);
  ok("wherever si is written, sm and xs are written beside it",
     full.si===undefined||(full.sm!==undefined&&full.xs!==undefined),keys(full));
  /* the same on the swing path: rv60 = 0 gives a zero touch sigma, hence no xs, hence no si */
  const sob={yesBid:3,yesAsk:6,noBid:94,noAsk:97,depthYes:1,depthNo:2};
  const z=C.swingReadFields({rv60:0,sig:0},"YES",sob,S0,strike,T0,T0+9*MIN);
  eq("a zero touch sigma means no si on a swing read either",z.si,undefined);
  /* and the invariant stated as a sweep, so a future edit cannot reintroduce a bare si anywhere */
  let bare=0;
  for(let i=0;i<200;i++){
    const P={sigU:[undefined,0,-1,0.00085,NaN][i%5],tau:[8.42,0,undefined,14.2][i%4],S0:[112500,0,null][i%3]};
    const a=C.edgeSnapFields(P,{q:0.2+0.6*(i/200)},strike,ob);
    const b=C.swingReadFields({rv60:P.sigU},"YES",sob,P.S0,strike,T0,T0+9*MIN);
    if((a.si!==undefined&&(a.sm===undefined||a.xs===undefined))||
       (b.si!==undefined&&(b.sm===undefined||b.xs===undefined))) bare++;
  }
  eq("no input in 200 degraded combinations produces an si with nothing to judge it by",bare,0);
}

/* ---------- THE ONE-CENT TICK PROBE, AND WHERE IT IS EVALUATED - corrected 2026-09-06 --------------
   Three registrations, in order, and the assertions below pin the third:

     1. relPerCent (a LOCAL DERIVATIVE of implied sigma w.r.t. the quote) against VRP_REL_MAX = 0.5.
        Wrong QUANTITY: Kalshi quotes in whole cents, so a derivative is a move this market never makes,
        and the quote -> sigma map is convex near the money, so the derivative understates a real tick by
        about half. A 2bp reading whose implied sigma moves 86% of itself on one cent PASSED it.
     2. impliedSigmaTick(strike, S0, tau, q).identified - the true one-cent move, but measured at the
        OBSERVED quote and stored per row as `sq`. Right instrument, wrong place, and the error is not a
        matter of degree: see below.
     3. IN FORCE: sigmaIdentifiability(x, sigModel, tau) - the SAME one-cent finite-tick probe, evaluated
        at the MODEL-FAIR quote. It takes no quote argument at all.

   WHY (2) HAD TO GO, which is the principle every assertion in this block encodes. Two facts:
     (i) the observed-quote tick statistic is, to three significant figures, a function of the QUOTE alone.
         Analytically its relative sensitivity is Dq/(phi(G)*sqrt(G^2-2x)) with G = Phi^-1(1-q): tau does not
         appear at all and x enters only as 2x against G^2. At a fixed q = 0.30 it moves 5.762% -> 6.052%
         across a 240x range in strike distance and a 1200x range in tau. It is a cut on the quote.
     (ii) vrp = si - sr, and at a fixed strike and horizon si is monotone in the quote. So a cut on the
         quote is a cut on the premium - the gate would have SELECTED ON THE OUTCOME VARIABLE and handed
         H5 a guaranteed sign. The sweep block further down measures exactly that, on real inputs.

   SELECTION ON THE OUTCOME BIASES; A NOISY READING ONLY ADDS VARIANCE. Bias is fatal and variance is not.
   So a badly conditioned individual reading is now KEPT, with its conditioning RECORDED (`sq`, `sqS`)
   rather than used to drop it, and `sb` records the bound the row was judged under. The old suite asserted
   "a reading that moves 86% on one tick writes no vrp"; that assertion was wrong by design and is rewritten
   here to assert the opposite, for the reason above. ---- */
{
  const S0=112500, sig=0.0009, tau=15;
  const at=bp=>{ const strike=S0*Math.exp(bp/1e4), x=Math.log(strike/S0), q=pOver(sig,x,tau);
                 return {strike,x,q,f:C.edgeSnapFields({sigU:sig,tau,S0},{q},strike,null)}; };
  /* recomputed here from the harness solver, independently of whatever the unit stored */
  const trueRel=(x,q)=>{ const b=xSolve(x,tau,q); if(b===null) return null;
    const u=xSolve(x,tau,q+0.01), d=xSolve(x,tau,q-0.01), r=[];
    if(u!==null) r.push(Math.abs(u-b)/b); if(d!==null) r.push(Math.abs(d-b)/b);
    return r.length?Math.max.apply(null,r):null; };
  const J=a=>C.siJudge({t:T0,tau,si:a.f.si,sm:a.f.sm,xs:a.f.xs,sq:a.f.sq,sqS:a.f.sqS});

  /* --- an identified reading, 10bp off the money --- */
  const a10=at(10);
  ok("a reading stores si AND the sensitivity that judges it",a10.f.si!==undefined&&a10.f.sq!==undefined,keys(a10.f));
  near("the stored sq is the TRUE one-cent move, recomputed independently",a10.f.sq,trueRel(a10.x,a10.q),1e-3);
  near("...and it reproduces the measured 10bp figure",a10.f.sq,0.1006,0.003);
  eq("a 10bp reading passes the gate in force",J(a10).ok,true);
  /* "prior+tick" = the quote-free prior RULED; the row also carries its own tick diagnostic, which rode
     along and decided nothing. A row with no `sq` reads plain "prior", so the two populations stay
     separable in analysis even though they were judged by the same rule. */
  eq("...and it is the quote-free prior that ruled, with the row's own tick riding along as a diagnostic",
     J(a10).gate,"prior+tick");
  eq("...the bound reported is the one in force",J(a10).bound,C.R("typeof VRP_TICK_REL_MAX")==="number"?0.2:null);
  near("...and the row's own sensitivity is reported back for re-filtering",J(a10).tickRel,a10.f.sq,1e-9);
  eq("...with the two-sided state named explicitly",J(a10).tickSided,"2");

  /* --- THE DEFECT ITSELF, as a regression --- */
  const a2=at(2);
  near("2bp off the money: one cent of quote moves the implied sigma 86% of itself",a2.f.sq,0.864,0.006);
  eq("...so the gate in force rejects it",J(a2).ok,false);
  /* the prior probes at the model-fair quote, so it measures the same 86% - and the code names WHERE in
     the band the strike failed (|xs| < 1, the at-the-money end) rather than restating the instrument. */
  near("...and the prior, probing at the model-fair quote, measures the same move",J(a2).priorRel,0.864,0.015);
  eq("...counted as atm: the at-the-money end of the band, both neighbours still inverting",J(a2).code,"atm");
  ok("the SUPERSEDED derivative would have PASSED this reading - the defect, pinned",
     vsSens(sig,a2.x,tau)<VRP_REL_MAX,String(vsSens(sig,a2.x,tau)));
  near("...because the derivative understates the true move by about half here",
     vsSens(sig,a2.x,tau)/trueRel(a2.x,a2.q),0.52,0.06);
  const a5=at(5);
  near("5bp: 21.8% on one tick",a5.f.sq,0.218,0.006);
  eq("...rejected, though the first registration's derivative passed it at 0.179",J(a5).code,"atm");
  ok("...the old gate really did pass 5bp too",vsSens(sig,a5.x,tau)<VRP_REL_MAX);
  const a35=at(35);
  ok("35bp is comfortably inside the bound",a35.f.sq<0.2&&J(a35).ok===true,String(a35.f.sq));

  /* --- a neighbour that does not invert is NOT zero sensitivity --- */
  const a0=at(0);                       /* strike exactly at spot: q+1c crosses 0.5, where no sigma reaches */
  eq("at the money the +1c neighbour has no root at all, and the row says so",a0.f.sqS,"d");
  near("...the surviving one-sided move is still recorded, at 1438% of itself",a0.f.sq,14.384,0.05);
  eq("...it never passes the gate",J(a0).ok,false);
  eq("...and it is counted as tick1, a missing neighbour, not as a small move",J(a0).code,"tick1");
  eq("...and the PRIOR is the one that saw the missing neighbour, so it is visible as priorSided",
     J(a0).priorSided,"down");
  ok("...si is still stored, so nothing is destroyed and the row is re-filterable",a0.f.si!==undefined);
  const a1=at(1);
  eq("1bp: the +1c neighbour is past the analytic cap, one-sided again",a1.f.sqS,"d");
  eq("...rejected as tick1 even though its one-sided move is 0.47",J(a1).code,"tick1");
  eq("...one-sided on the prior too, and marked",J(a1).priorSided,"down");
  /* a synthetic deep strike where the +1c neighbour is past the cap AND the -1c neighbour is past the
     engine's clip floor: neither exists, so there is no sensitivity to report at all */
  {
    const deep=S0*Math.exp(2), q=0.014;
    const f=C.edgeSnapFields({sigU:0.3,tau,S0},{q},deep,null);
    eq("neither neighbour inverts: the marker is written and sq is absent",f.sqS+"/"+f.sq,"n/undefined");
    ok("...si is still stored",f.si!==undefined,JSON.stringify(f));
    /* the row's own marker stays "n" on the record; the VERDICT comes from the prior, which at this strike
       is one-sided "up". The two are reported in different fields precisely so they cannot be confused. */
    const dj=C.siJudge({tau,si:f.si,sm:f.sm,xs:f.xs,sq:f.sq,sqS:f.sqS});
    eq("...the row's own marker survives judging, unchanged",dj.tickSided,"n");
    eq("...while the verdict is the prior's, and the prior is one-sided up here",dj.priorSided,"up");
    eq("...so the code names the prior's mechanism, not the row's",dj.code,"tick1");
    eq("...and it is rejected either way",dj.ok,false);
  }
  /* the two failure modes are counted apart from each other and from the prior's codes */
  const codes={};
  [a0,a1,a2,a5,a10,a35].forEach(a=>{ const c=J(a).code; codes[c]=(codes[c]||0)+1; });
  eq("the tally separates a missing neighbour from a move past the bound",
     JSON.stringify(codes),JSON.stringify({tick1:2,atm:2,ok:2}));

  /* --- siJudge's own contract on the stored pair, independent of any write path.
     CORRECTED 2026-09-06: `sq`/`sqS` are a DIAGNOSTIC of how well conditioned THIS ROW's own inversion
     was. They do not gate. The six rows below differ in nothing but their stored conditioning - same si,
     same sm, same xs, same tau - so if any of them reached a different verdict the gate would be reading
     the row's own quote, and reading the row's own quote is reading the row's own premium. --- */
  const row=(o)=>{ const r={t:T0,tau:9,si:9.5,sm:9,xs:-0.4}; for(const k in o) r[k]=o[k]; return r; };
  const same=(a,b)=>a.identified===b.identified&&a.ok===b.ok&&a.code===b.code&&a.priorRel===b.priorRel;
  eq("the strike itself is identified, by the quote-free prior",C.siJudge(row({})).identified,true);
  eq("a stored tick exactly at the old bound is kept",C.siJudge(row({sq:0.2})).ok,true);
  eq("a hair past it is kept TOO - the row's own tick decides nothing",C.siJudge(row({sq:0.201})).ok,true);
  eq("...and its conditioning is on the record at full stored precision, so an analyst can see it",
     C.siJudge(row({sq:0.201})).tickRel,0.201);
  eq("a one-sided row is kept, its sidedness recorded rather than used to drop it",
     C.siJudge(row({sq:0.001,sqS:"u"})).ok,true);
  eq("...marker preserved verbatim",C.siJudge(row({sq:0.001,sqS:"u"})).tickSided,"u");
  eq("...on the other side too",C.siJudge(row({sq:0.001,sqS:"d"})).tickSided,"d");
  eq("a row whose neighbours both failed is kept, marked n",C.siJudge(row({sqS:"n"})).ok,true);
  eq("...and that marker survives judging",C.siJudge(row({sqS:"n"})).tickSided,"n");
  eq("a two-sided row is marked explicitly, so absence of sqS is never read as absence of a reading",
     C.siJudge(row({sq:0.05})).tickSided,"2");
  ok("all six reach the SAME verdict: the stored conditioning moves nothing",
     [row({}),row({sq:0.2}),row({sq:0.201}),row({sq:0.001,sqS:"u"}),row({sqS:"n"}),row({sq:9})]
       .map(r=>C.siJudge(r)).every(j=>same(j,C.siJudge(row({})))));
  /* the plausibility band is the OTHER test, and it does look at the answer - registered as such in
     CLAUDE.md 11.8, which requires any H5 result to be stated with that conditioning attached. */
  eq("the plausibility band still applies AFTER identifiability",C.siJudge(row({si:1805,sq:0.05})).code,"impl");
  ok("...and such a row is recorded as identified but not ok",
     C.siJudge(row({si:1805,sq:0.05})).identified===true&&C.siJudge(row({si:1805,sq:0.05})).ok===false);
  eq("a row with NO stored sensitivity is judged by the same rule, and says so",C.siJudge(row({})).gate,"prior");
  eq("...a row WITH one says prior+tick, so the two populations stay separable",C.siJudge(row({sq:0.05})).gate,"prior+tick");
  eq("the superseded derivative is still reported as a diagnostic",
     typeof C.siJudge(row({sq:0.05})).relPerCent,"number");
  ok("...and it is not what decides either: a row the derivative loves is judged on the strike, not on it",
     C.siJudge(row({sq:9})).ok===true&&C.siJudge(row({sq:9})).relPerCent<VRP_REL_MAX);
  ok("...nor does a stored tick of 900% of itself drop the row - dropping it would select on its quote",
     C.siJudge(row({sq:9})).ok===true&&C.siJudge(row({sq:9})).tickRel===9);

  /* --- a partial splice: the tick decider missing, everything else present --- */
  const lf=L.edgeSnapFields({sigU:sig,tau,S0},{q:a10.q},a10.strike,null);
  ok("without the tick decider si is still written",lf.si!==undefined,keys(lf));
  eq("...but no sensitivity is invented for it",lf.sq,undefined);
  eq("...and such a row is judged by the prior, which the gate field records",L.siJudge({tau,si:lf.si,sm:lf.sm,xs:lf.xs}).gate,"prior");
  eq("with no volspace at all there is no si and no sq",
     [N.edgeSnapFields({sigU:sig,tau,S0},{q:a10.q},a10.strike,null).si,
      N.edgeSnapFields({sigU:sig,tau,S0},{q:a10.q},a10.strike,null).sq].join(","),",");
  eq("a row carrying sq but no bound to judge it against cannot be judged, and says nodiag",
     N.siJudge(row({sq:0.05})).code,"nodiag");

  /* --- the swing path measures the same quantity --- */
  {
    const qc=Math.round(a10.q*100);
    const ob={yesBid:qc-1,yesAsk:qc+1,noBid:100-(qc+1),noAsk:100-(qc-1),depthYes:5,depthNo:5};
    const sw=C.swingReadFields({rv60:sig},"YES",ob,S0,a10.strike,T0,T0+tau*MIN);
    ok("a swing read stores the tick sensitivity too",sw.sq!==undefined,keys(sw));
    near("...measured on the mid it inverted, one full cent, the conservative probe",
         sw.sq,trueRel(a10.x,qc/100),1e-3);
    /* both sides of the window carry the same reading, sensitivity included */
    const sn=C.swingReadFields({rv60:sig},"NO",ob,S0,a10.strike,T0,T0+tau*MIN);
    eq("both sides agree on sq, as they do on si",sw.sq+"/"+String(sw.sqS),sn.sq+"/"+String(sn.sqS));
  }

  /* --- the journal row carries it forward, because it outlives the read --- */
  {
    const r={t:T0,tau,sm:9,si:9.5,xs:-0.4,dy:1,dn:2,sq:0.104};
    const jf=C.journalEntryFields(r,{entryBid:0.03});
    eq("a journal row copies the tick sensitivity with the reading",jf.sq,0.104);
    /* the bound travels too, or a journal row that outlives its read would be re-judged at export under
       whatever bound is current - the exact retroactive re-gating CLAUDE.md 11.8 forbids. */
    eq("a journal row copies the bound the read was judged under",
       C.journalEntryFields({sm:9,si:9.5,xs:-0.4,sq:0.104,sb:0.2},null).sb,0.2);
    eq("a read with no bound yields none on the journal row",C.journalEntryFields({sm:9,sq:0.1},null).sb,undefined);
    eq("a one-sided marker travels too",C.journalEntryFields({sq:0.4,sqS:"d"},null).sqS,"d");
    eq("a junk marker is not copied",C.journalEntryFields({sq:0.4,sqS:"maybe"},null).sqS,undefined);
    eq("a read with no sensitivity yields none on the journal row",C.journalEntryFields({sm:9},null).sq,undefined);
    /* the journal row's own `tau` comes from the existing simCloseOne literal, not from this bundle */
    const jrow={tau}; for(const k in jf) jrow[k]=jf[k];
    eq("the journal row can be re-judged on its own, diagnostic included",C.siJudge(jrow).gate,"prior+tick");
    eq("...and it reaches the same verdict as the read it came from",C.siJudge(jrow).ok,true);
  }
  eq("the schema version records which gate wrote the row",C.R("SCHEMA_VERSION"),3);
}

/* ---------- THE GATE MUST NOT MOVE WITH THE QUOTE ------------------------------------------------
   This is the block whose absence let the defect ship, and it is the central assertion of the unit.

   An identifiability gate answers "could sigma be recovered from a binary at THIS STRIKE and THIS
   HORIZON at all?". That question has nothing to do with what the market happened to quote. Wire the
   probe to the observed quote and two things follow, both measured below on real inputs:

     (i) the statistic stops tracking identifiability. The observed-quote one-cent move is, to three
         significant figures, a function of the quote alone - analytically Dq/(phi(G)*sqrt(G^2-2x)) with
         G = Phi^-1(1-q), in which tau does not appear and x enters only as 2x against G^2.
     (ii) it starts tracking the ANSWER. vrp = si - sr, and si is monotone in the quote at a fixed strike
         and horizon, so a cut on the quote is a cut on the premium.

   Selection on the outcome BIASES; a noisy reading only adds VARIANCE. So the test is: fix a strike and a
   horizon, judge a row at every attainable integer-cent quote, and require ONE identifiability verdict for
   the whole ladder. Then move the strike and require the verdict to move - the verdict must track the
   strike, and only the strike. Both branches (strike above spot and below) are swept, because the two have
   different attainable quote ranges: above the money p_over is capped at pMax, below it is not. ---- */
{
  const S0=112500, sig=0.0009, tau=15, sr=9;
  /* every attainable integer-cent quote at one strike, written through the real write path and judged */
  const sweep=bp=>{
    const K=S0*Math.exp(bp/1e4), rows=[];
    for(let c=2;c<=98;c++){
      const f=C.edgeSnapFields({sigU:sig,tau,S0},{q:c/100},K,null);
      if(f.si===undefined) continue;              /* past the analytic cap: no reading at all, not a verdict */
      rows.push({c,si:f.si,sq:f.sq,sqS:f.sqS,
                 j:C.siJudge({t:T0,tau,si:f.si,sm:f.sm,xs:f.xs,sq:f.sq,sqS:f.sqS,sb:f.sb}),
                 vrp:+(f.si-sr).toFixed(2)});
    }
    return rows;
  };
  const uniq=(rows,f)=>[...new Set(rows.map(f))];
  const check=(label,bp,expectIdent,expectCode)=>{
    const r=sweep(bp);
    ok(label+": the sweep is wide enough to be a test at all",r.length>=40,String(r.length));
    /* the readings themselves are nothing alike - this is not a sweep over near-identical rows */
    ok(label+": si varies by more than 10x across the ladder, so the rows really do differ",
       Math.max.apply(null,r.map(a=>a.si))/Math.min.apply(null,r.map(a=>a.si))>10,
       Math.min.apply(null,r.map(a=>a.si))+".."+Math.max.apply(null,r.map(a=>a.si)));
    /* and the OLD statistic crosses the bound inside the ladder, so the old gate really would have split it */
    ok(label+": the row's own stored tick crosses 0.20 inside the ladder",
       r.some(a=>a.sq<=0.20)&&r.some(a=>a.sq>0.20),
       Math.min.apply(null,r.map(a=>a.sq))+".."+Math.max.apply(null,r.map(a=>a.sq)));
    /* THE ASSERTION: one verdict for the whole ladder */
    eq(label+": ONE identifiability verdict for every quote",
       JSON.stringify(uniq(r,a=>a.j.identified)),JSON.stringify([expectIdent]));
    eq(label+": one prior measurement, identical to the last bit, at every quote",
       uniq(r,a=>a.j.priorRel).length,1);
    eq(label+": one prior sidedness at every quote",uniq(r,a=>a.j.priorSided).length,1);
    eq(label+": one bound at every quote",uniq(r,a=>a.j.bound).length,1);
    if(expectCode!==null)
      eq(label+": and one reason code",JSON.stringify(uniq(r,a=>a.j.code)),JSON.stringify([expectCode]));
    return r;
  };
  /* a strike INSIDE the band: identified at every quote from 2c to the cap. The reason code is allowed to
     move here and only here, because the plausibility band (si/sm) is the OTHER test and it does look at
     the answer - CLAUDE.md 11.8 registers that censoring explicitly. Identifiability does not move. */
  const in10=check("10bp above spot",10,true,null);
  ok("10bp above spot: the only codes are ok/impl - identifiability never rejects, plausibility may",
     uniq(in10,a=>a.j.code).every(c=>c==="ok"||c==="impl"),JSON.stringify(uniq(in10,a=>a.j.code)));
  const in10n=check("10bp below spot",-10,true,null);
  ok("10bp below spot: same, on the branch with no cap and a 97-cent ladder",
     uniq(in10n,a=>a.j.code).every(c=>c==="ok"||c==="impl"),JSON.stringify(uniq(in10n,a=>a.j.code)));
  check("35bp above spot",35,true,null);
  /* strikes OUTSIDE the band, at each end, on each branch: rejected at every quote, for the same reason */
  check("2bp above spot (at-the-money end)",2,false,"atm");
  check("2bp below spot (at-the-money end)",-2,false,"atm");
  check("80bp above spot (tail end)",80,false,"tick1");
  check("80bp below spot (tail end)",-80,false,"tick1");
  /* and the verdict tracks the strike: same ladder, same horizon, three different strikes, three verdicts */
  eq("the verdict tracks the strike and only the strike",
     [sweep(2)[0].j.identified,sweep(10)[0].j.identified,sweep(80)[0].j.identified].join(","),
     "false,true,false");

  /* ---- the outcome-selection defect itself, measured as a regression ----
     Take the plausible rows at an identified strike and apply the SUPERSEDED gate (the row's own stored
     tick, two-sided and <= 0.20) to them. It does not remove a random slice: it removes the top of the
     premium distribution and nothing from the bottom. That is the bias, in the units H5 reports. */
  const oldGate=a=>a.sqS===undefined&&a.sq<=0.20;
  const pl=in10.filter(a=>a.j.ok);
  const dropped=pl.filter(a=>!oldGate(a));
  ok("the superseded gate would have dropped some plausible rows here",dropped.length>0,String(dropped.length));
  ok("...and every single one of them carries a POSITIVE premium",dropped.every(a=>a.vrp>0),
     JSON.stringify(dropped.map(a=>a.vrp)));
  eq("...it drops nothing from the negative side at all",dropped.filter(a=>a.vrp<0).length,0);
  const mean=xs=>xs.reduce((s,a)=>s+a.vrp,0)/xs.length;
  ok("...so it truncates the positive tail: the largest premium it can report is far below the true one",
     Math.max.apply(null,pl.filter(oldGate).map(a=>a.vrp))<Math.max.apply(null,pl.map(a=>a.vrp)),
     Math.max.apply(null,pl.filter(oldGate).map(a=>a.vrp))+" vs "+Math.max.apply(null,pl.map(a=>a.vrp)));
  ok("...and the mean premium it reports is biased DOWNWARD, which is the whole objection",
     mean(pl.filter(oldGate))<mean(pl)-0.5,mean(pl.filter(oldGate)).toFixed(3)+" vs "+mean(pl).toFixed(3));
  ok("the gate in force drops none of them: every plausible row survives, however conditioned",
     pl.every(a=>a.j.ok),String(pl.length));
}

/* ---------- A ONE-SIDED PRIOR NEVER PASSES, AND ITS SIDEDNESS IS VISIBLE --------------------------
   A neighbour that does not invert is not zero sensitivity - it is one tick moving the reading out of
   existence, which is the strongest available evidence AGAINST identification. The trap is that the
   surviving one-sided move can be small: at x = 78-88 bp with sigma 9 bp/min and tau 15 the prior's -1c
   neighbour falls past the engine's clip floor while the surviving up-move measures 12-18%, comfortably
   under the 0.20 bound. Judged on the number alone such a row passes. It must not, and `priorSided` must
   be populated so that an analyst re-filtering the CSV at some other bound can see why. This was dropped
   on the prior path before the correction and had no test. ---- */
{
  const sm=9, tau=15, sig=sm/1e4;
  const fam=(bp)=>{ const x=bp/1e4, xs=+(x/(sig*Math.sqrt(tau))).toFixed(3);
                    return {bp,xs,j:C.siJudge({t:T0,tau,si:12,sm,xs})}; };
  const up=[78,80,85,88].map(fam), dn=[-78,-80,-85,-88].map(fam);
  ok("the family really is one-sided on the prior, above spot",up.every(f=>f.j.priorSided==="up"),
     JSON.stringify(up.map(f=>f.j.priorSided)));
  ok("...and below spot, on the mirror branch",dn.every(f=>f.j.priorSided==="down"),
     JSON.stringify(dn.map(f=>f.j.priorSided)));
  ok("the surviving move is UNDER the bound, so only the sidedness can reject them",
     up.concat(dn).every(f=>f.j.priorRel<C.R("VRP_TICK_REL_MAX")),
     JSON.stringify(up.concat(dn).map(f=>+f.j.priorRel.toFixed(4))));
  ok("...yet not one of them is identified",up.concat(dn).every(f=>f.j.identified===false));
  ok("...each counted as tick1, the missing-neighbour code, not as a small move",
     up.concat(dn).every(f=>f.j.code==="tick1"));
  ok("...and priorSided is populated on every one, so the rejection is visible offline",
     up.concat(dn).every(f=>f.j.priorSided==="up"||f.j.priorSided==="down"));
  /* the contrast case, so this is not a test that everything at the tail fails */
  const nearer=fam(70);
  eq("a little nearer the money the prior is two-sided and the same reading passes",
     nearer.j.priorSided+"/"+nearer.j.identified,"two/true");
}

/* ---------- `sb`: A ROW IS JUDGED UNDER THE BOUND IT WAS WRITTEN UNDER ----------------------------
   siJudge runs at EXPORT time. Without a bound stored on the row, every historical row would be silently
   re-judged under whatever bound is current, which is exactly the retroactive re-gating CLAUDE.md 11.8
   promises does not happen ("rows written under the superseded bound are not retroactively re-gated").
   `sb` is written beside `sq` at the write site and siJudge prefers it over the live constant. The bounds
   used below are hypothetical earlier registrations, not recorded ones - the point is the mechanism. ---- */
{
  const r=o=>{ const b={t:T0,tau:15,si:9.5,sm:9,xs:0.143}; for(const k in o) b[k]=o[k]; return b; };
  near("the witness reading sits just past the bound in force",C.siJudge(r({})).priorRel,0.2188,0.002);
  eq("under the live bound it is rejected",C.siJudge(r({})).identified,false);
  eq("...and a row storing that same bound agrees",C.siJudge(r({sb:0.2})).identified,false);
  eq("a row written under a LOOSER earlier bound keeps the judgment it was made under",
     C.siJudge(r({sb:0.25})).identified,true);
  eq("...and reports the bound it was actually judged under, not the live one",C.siJudge(r({sb:0.25})).bound,0.25);
  /* the other direction, so this is a promise about provenance and not a one-way escape hatch */
  eq("a row written under a TIGHTER earlier bound keeps that judgment too",
     C.siJudge(r({xs:0.287,sb:0.05})).identified,false);
  eq("...while the same reading with no stored bound is judged live, and passes",
     C.siJudge(r({xs:0.287})).identified,true);
  eq("...reporting the live bound in that case",C.siJudge(r({xs:0.287})).bound,VRP_TICK_REL_MAX);
  eq("the two verdicts on one reading differ only by the stored bound, which is the point",
     C.siJudge(r({xs:0.287,sb:0.05})).identified===C.siJudge(r({xs:0.287})).identified,false);
}

/* ---------- `sq` IS STORED AT 4dp, AND THAT IS LOAD-BEARING ---------------------------------------
   At 3dp the operative bound was 0.2005, not 0.20: a true one-cent move of 0.20024 rounded to 0.200 and
   read as inside a bound it exceeded. The row's own sq no longer gates, so this no longer moves a verdict
   - but it is the exact column CLAUDE.md 11.8 tells an analyst to re-filter on ("an analyst re-filtering
   at a different bound reads si_tick_rel"), so a rounding that silently admits readings past a bound is
   still a defect, one level further out. ---- */
{
  const S0=112500, K=S0*Math.exp(-1/1e4), x=Math.log(K/S0), tau=15, q=0.45;
  const b=xSolve(x,tau,q), u=xSolve(x,tau,q+0.01), d=xSolve(x,tau,q-0.01);
  const exact=Math.max(Math.abs(u-b)/b,Math.abs(d-b)/b);
  ok("the witness really does straddle the bound at 3dp: past 0.20, but rounding to 0.200",
     exact>0.20&&Math.round(exact*1000)/1000<=0.20,String(exact));
  const f=C.edgeSnapFields({sigU:0.0009,tau,S0},{q},K,null);
  eq("sq is stored at 4dp",f.sq,Math.round(exact*1e4)/1e4);
  eq("...which is 0.2002 here - a 3dp store would have written 0.200 and hidden the excess",f.sq,0.2002);
  ok("...and 4dp is the actual precision, not an accident of this one witness",
     [0,1,2,5,10,35,60].every(bp=>{
       const KK=S0*Math.exp(bp/1e4);
       const g=C.edgeSnapFields({sigU:0.0009,tau,S0},{q:0.3},KK,null);
       return g.sq===undefined||Math.abs(g.sq*1e4-Math.round(g.sq*1e4))<1e-9;
     }));
}

/* ---------- swingReadFields ---------- */
{
  const st={rv60:0.0009,sig:0.002};
  const ob={yesBid:3,yesAsk:6,noBid:94,noAsk:97,depthYes:1240,depthNo:880};
  const S0=112500, strike=112400, now=T0, tEnd=T0+9*MIN;
  const f=C.swingReadFields(st,"NO",ob,S0,strike,now,tEnd);
  eq("swing read carries bid + depth + the vol triple inputs",keys(f),"bid,dn,dy,sb,si,sm,sq,xs");
  eq("swing read bid is the NO bid in dollars",f.bid,0.94);
  eq("swing read sm is touchSigma in bp",f.sm,C.sigBp(C.touchSigma(st,now,tEnd)));
  const y=C.swingReadFields(st,"YES",ob,S0,strike,now,tEnd);
  eq("swing read bid for YES",y.bid,0.03);
  eq("both sides of a window agree on si (it is the window's, not the side's)",y.si,f.si);
  eq("both sides of a window agree on depth",y.dy+"/"+y.dn,f.dy+"/"+f.dn);
  /* si must be inverted from the window mid, never from the cheap ask */
  const qMid=((ob.yesBid+ob.yesAsk)/2)/100;
  near("swing si reprices the window mid",pOver(f.si/1e4,Math.log(strike/S0),9),qMid,1e-4);
  /* degraded inputs */
  eq("no book: only the model sigma survives",keys(C.swingReadFields(st,"YES",null,S0,strike,now,tEnd)),"sm");
  eq("no index price: no si, no xs",keys(C.swingReadFields(st,"YES",ob,null,strike,now,tEnd)),"bid,dn,dy,sm");
  eq("no stats: no sm",C.swingReadFields(null,"YES",ob,S0,strike,now,tEnd).sm,undefined);
  eq("tau <= 0 at the gate: no si/xs",keys(C.swingReadFields(st,"YES",ob,S0,strike,tEnd,tEnd)),"bid,dn,dy,sm");
  /* an empty side (Kalshi's yes_ask 1.0000 -> 100) must not be inverted, matching the K2 guard */
  eq("an empty ask side is not inverted",C.swingReadFields(st,"YES",{yesBid:0,yesAsk:100,noBid:0,noAsk:100},S0,strike,now,tEnd).si,undefined);
}

/* ---------- journalEntryFields ---------- */
{
  const r={t:T0,tau:8.42,ask:0.05,p:0.12,sm:8.42,si:9.13,xs:-0.42,dy:1240,dn:880};
  const t={entry:0.05,entryBid:0.03,readIdx:0};
  const f=C.journalEntryFields(r,t);
  eq("journal row copies entry-time state and stamps sv",keys(f),"bidIn,dn,dy,si,sm,sv,xs");
  eq("journal sv",f.sv,C.R("SCHEMA_VERSION"));
  eq("journal bidIn is the entryBid the S1 fix already threads in",f.bidIn,0.03);
  eq("journal sm copied verbatim",f.sm,8.42);
  /* a pre-enrichment read produces a row with sv and nothing else - which is honest, not broken */
  eq("a v1 read yields sv only",keys(C.journalEntryFields({t:1,tau:8,ask:0.05,p:0.1},null)),"sv");
  eq("a missing entryBid is omitted",C.journalEntryFields(r,{entry:0.05}).bidIn,undefined);
  eq("no read at all still stamps sv",keys(C.journalEntryFields(null,null)),"sv");
}

/* ---------- volCloseFields ---------- */
{
  /* 20 contiguous 1-minute bars with a known constant log step */
  const k0=Math.floor(T0/60000);
  const keysArr=[], closes=[]; let p=112000;
  for(let i=0;i<20;i++){ keysArr.push(k0+i); closes.push(p); p*= (i%2? Math.exp(-0.0008):Math.exp(0.0008)); }
  const t0=T0, t1=T0+19*MIN;
  /* a reference row that IS identified: xs = -0.4 (off the money in model-sigma units, one cent of quote
     moves sigma ~7%), and an implied sigma 1.14x the model's - a volatility disagreement, not a model failure */
  const REF={t:T0+6*MIN,tau:9,si:9.13,sm:8,xs:-0.4};
  const f=C.volCloseFields(REF,keysArr,closes,t0,t1);
  eq("volClose returns sr, srN, vrp and the provenance stamp",keys(f),"sr,srN,vrp,vrpT");
  near("sr is the realized per-minute sigma in bp",f.sr,8,0.01);
  eq("srN counts the contiguous returns used",f.srN,19);
  near("vrp is implied minus realized, both bp/min",f.vrp,9.13-f.sr,1e-9);
  ok("vrp is positive when the market priced more vol than the tape realized",f.vrp>0);
  eq("vrpT is the reference read's own timestamp",f.vrpT,REF.t);
  eq("an identified, plausible reading writes no omission code",f.vrpX,undefined);
  /* no reference read at all -> sr is still recorded, vrp omitted AND the omission is countable */
  const g=C.volCloseFields(null,keysArr,closes,t0,t1);
  eq("no reference read: sr recorded, vrp omitted, reason recorded",keys(g),"sr,srN,vrpX");
  eq("...and the reason is noref",g.vrpX,"noref");
  /* too few bars -> nothing at all, so the caller retries rather than storing a wrong number */
  eq("too few bars yields nothing to write",keys(C.volCloseFields(REF,keysArr.slice(0,4),closes.slice(0,4),t0,t1)),"");
  eq("no bars yields nothing to write",keys(C.volCloseFields(REF,[],[],t0,t1)),"");
  /* a sleep gap must not be scored as one giant one-minute return */
  const gk=[k0,k0+1,k0+2,k0+400,k0+401,k0+402,k0+403,k0+404,k0+405,k0+406,k0+407,k0+408];
  const gc=gk.map((_,i)=>112000*Math.exp(0.0008*i));
  const gapF=C.volCloseFields(REF,gk,gc,T0,T0+500*MIN,3);
  ok("a bar gap is dropped, not counted as a one-minute return",gapF.srN===10,JSON.stringify(gapF));
  near("sigma survives the gap unchanged",gapF.sr,8,0.01);

  /* ---- F1: vrp is NOT written when the implied sigma is unidentifiable, and the omission is COUNTABLE ---- */
  const vc=(ref)=>C.volCloseFields(ref,keysArr,closes,t0,t1);
  /* AT THE MONEY - the KXBTC15M case at open. xs = 0.02: one cent of quote moves sigma by ~125% of itself. */
  const atm=vc({t:T0+6*MIN,tau:9,si:64.72,sm:8,xs:0.02});
  eq("at the money: no vrp",atm.vrp,undefined);
  /* the code names the MECHANISM the prior hit, not just which end of the band failed. At xs = 0.02 the
     model-fair quote sits just under 0.5 and its +1c neighbour has no root at all - one tick moves the
     reading out of existence - so this is tick1. Further out, where both neighbours still invert and the
     move is merely past the bound, the code is "atm"; the band block below pins both. */
  eq("at the money: the omission is counted as tick1, the mechanism, not just the band label",atm.vrpX,"tick1");
  eq("at the money: no provenance stamp for a value that was never written",atm.vrpT,undefined);
  eq("at the money: realized sigma is still recorded (it is a real measurement)",atm.sr!==undefined,true);
  /* DEEP TAIL - the other end of the identified band, where phi(xs) collapses instead of xs */
  const tail=vc({t:T0+6*MIN,tau:9,si:9.2,sm:8,xs:4});
  eq("deep tail: no vrp",tail.vrp,undefined);
  eq("deep tail: the omission is counted as tail",tail.vrpX,"tail");
  /* IMPLAUSIBLE LEVEL - identified and well conditioned, but 200x the model's own sigma. This is the reading
     that would render "1805 bp implied minus 9 bp realized" as a colossal premium on an ordinary quote. */
  const impl=vc({t:T0+6*MIN,tau:9,si:1805,sm:9,xs:-0.4});
  eq("a 200x reading is identified but implausible: no vrp",impl.vrp,undefined);
  eq("...and it is counted as impl, not silently dropped",impl.vrpX,"impl");
  ok("the conditioning test alone would NOT have caught it",
     C.siJudge({tau:9,si:1805,sm:9,xs:-0.4}).identified===true);
  /* ---- CORRECTED 2026-09-06, and this is the assertion the correction turns on.
     The vrp gate does NOT read the reference row's own stored one-cent sensitivity, and the assertions
     this block replaced ("a reading that moves 86% on one tick writes no vrp") were encoding a defect.
     vrp = si - sr, and at a fixed strike and horizon si is monotone in the quote, so a gate on the row's
     own quote-time conditioning is a gate on the row's own premium - selection on the outcome variable.
     That BIASES. Keeping a badly conditioned reading only adds VARIANCE, and variance is survivable where
     bias is not. So the five rows below, which differ ONLY in their stored conditioning, must all write
     the SAME vrp; the conditioning stays on the row so it can be modelled, weighted or re-filtered
     offline. What decides is the quote-free prior, on xs/sm/tau alone. ---- */
  const RTK={t:T0+6*MIN,tau:9,si:9.13,sm:8,xs:-0.4};
  const rtk=o=>{ const r={}; for(const k in RTK) r[k]=RTK[k]; for(const k in o) r[k]=o[k]; return r; };
  const tk10=vc(rtk({sq:0.104}));
  eq("a stored tick inside the old bound writes vrp",tk10.vrp!==undefined,true);
  eq("...and no omission code",tk10.vrpX,undefined);
  const tk86=vc(rtk({sq:0.864}));
  eq("a reading that moves 86% on one tick is KEPT - dropping it would select on this row's own quote",
     tk86.vrp,tk10.vrp);
  eq("...so there is no omission to count",tk86.vrpX,undefined);
  eq("...and the provenance stamp is written, as for any value that WAS written",tk86.vrpT,RTK.t);
  eq("...while its conditioning stays on the record, visible and re-filterable",
     C.siJudge(rtk({sq:0.864})).tickRel,0.864);
  eq("...and realized sigma, a real measurement, is recorded as always",tk86.sr!==undefined,true);
  const tk1s=vc(rtk({sq:0.02,sqS:"d"}));
  eq("a one-sided reading is kept too, and writes the same vrp",tk1s.vrp,tk10.vrp);
  eq("...its sidedness recorded rather than used to drop it",C.siJudge(rtk({sq:0.02,sqS:"d"})).tickSided,"d");
  const tk0s=vc(rtk({sqS:"n"}));
  eq("a row whose neighbours both failed is kept, and writes the same vrp",tk0s.vrp,tk10.vrp);
  eq("...marked n",C.siJudge(rtk({sqS:"n"})).tickSided,"n");
  eq("the SAME row with no stored sensitivity at all writes that same vrp",vc(RTK).vrp,tk10.vrp);
  eq("five rows, five different conditionings, one premium: the gate cannot touch the answer",
     [tk10.vrp,tk86.vrp,tk1s.vrp,tk0s.vrp,vc(RTK).vrp].join(","),
     new Array(5).fill(tk10.vrp).join(","));
  eq("...and gate still separates the populations: which rule ruled, and whether a diagnostic rode along",
     C.siJudge(RTK).gate+"/"+C.siJudge(rtk({sq:0.864})).gate,"prior/prior+tick");

  /* a reference read with no implied sigma at all, and a pre-enrichment row that cannot be judged */
  eq("no implied sigma on the reference read is counted as nosi",vc({t:T0,tau:9,sm:8,xs:-0.4}).vrpX,"nosi");
  eq("a row carrying si with nothing to judge it by is counted as nodiag",vc({t:T0,tau:9,si:9.1}).vrpX,"nodiag");
  /* the band is symmetric: an implied sigma far BELOW the model's is model failure too */
  eq("an implied sigma at a tenth of the model's is counted as impl",vc({t:T0,tau:9,si:0.8,sm:8,xs:-0.4}).vrpX,"impl");
  ok("a reading at the edge of the band is kept, not clamped",
     vc({t:T0,tau:9,si:8*C.R("SCHEMA_SIR_MAX"),sm:8,xs:-0.4}).vrp!==undefined);

  /* ---- F2: a sub-resolution realized sigma is omitted, never written as a fabricated zero ---- */
  const tk=[], tc=[]; let tp=112000;
  for(let i=0;i<20;i++){ tk.push(k0+i); tc.push(tp); tp*=Math.exp(1e-8); }
  const tiny=C.volCloseFields(REF,tk,tc,t0,t1);
  eq("a sub-resolution realized sigma writes nothing at all",keys(tiny),"");
  ok("...so it can never produce vrp = 0 - si out of nowhere",tiny.vrp===undefined&&tiny.sr===undefined);
  /* an exactly flat tape IS a measurement of zero and is still recorded */
  const flat=C.volCloseFields(REF,tk,tk.map(()=>112000),t0,t1);
  eq("an exactly flat tape records sr = 0",flat.sr,0);

  /* ---- siJudge, the single definition the exporter shares with the gate ---- */
  const j=C.siJudge(REF);
  eq("siJudge reports the ratio of implied to the model's own sigma",j.sir,+(9.13/8).toFixed(3));
  eq("siJudge passes an identified, plausible reading",j.ok,true);
  eq("siJudge code for a good reading",j.code,"ok");
  ok("siJudge reports the conditioning so an absurd reading is visibly absurd",j.relPerCent>0&&j.relPerCent<0.5);
  eq("siJudge on nothing at all",C.siJudge(null).code,"noref");
  eq("siJudge never throws on junk",C.siJudge({si:"x",sm:null,xs:{},tau:NaN}).code,"nosi");
  eq("without volspace siJudge cannot judge, and says so",N.siJudge({si:9,sm:8,xs:-0.4,tau:9}).code,"nodiag");

  /* ---- the shape of the gate, asserted rather than described: the identified region is a BAND in |xs|.
     At the money sigma enters p_over only through the second-order -0.5*sig^2*tau drift, so the inverse is
     unbounded; in the far tail phi(xs) collapses and it is unbounded again. A KXBTC15M strike opens AT the
     money, so the 15-minute series starts OUTSIDE the band and walks into it; an hourly KXBTCD rung away
     from spot is inside it from the first poll. This is the whole reason vrp is gated. ---- */
  {
    const band=[], sm=9;
    for(let i=0;i<=60;i++){
      const xs=+(i*0.1).toFixed(1);
      band.push([xs,C.siJudge({tau:9,si:sm*1.1,sm,xs}).ok]);
    }
    const kept=band.filter(b=>b[1]).map(b=>b[0]);
    ok("the at-the-money end is excluded",band[0][1]===false&&C.siJudge({tau:9,si:9.9,sm,xs:0}).ok===false);
    ok("the far-tail end is excluded",band[band.length-1][1]===false);
    ok("something in between is kept",kept.length>0,JSON.stringify(kept));
    ok("the kept region is contiguous - a band, not two half-lines",
       kept.length===0||(kept[kept.length-1]-kept[0]-0.1*(kept.length-1))<1e-9,JSON.stringify(kept));
    eq("the band is symmetric in the sign of xs",
       C.siJudge({tau:9,si:9.9,sm,xs:kept[0]}).ok,C.siJudge({tau:9,si:9.9,sm,xs:-kept[0]}).ok);
    /* and the reason code names which end failed, so the two selection effects are counted separately */
    /* the code names the MECHANISM, not merely which end failed. At xs = 0.01 the prior's +1c neighbour
       has no root at all, so the reading is one-sided and the code is tick1. At xs = 0.1 both neighbours
       still invert and the move is simply past the bound, which is the band label proper. Flattening the
       two would lose the distinction CLAUDE.md 11.8 asks an analyst to tabulate before reading a premium. */
    eq("the ATM end, where a neighbour vanishes, is counted as tick1",C.siJudge({tau:9,si:9.9,sm,xs:0.01}).code,"tick1");
    eq("...and it is the PRIOR that is one-sided there, reported as priorSided",
       C.siJudge({tau:9,si:9.9,sm,xs:0.01}).priorSided,"down");
    eq("the ATM end, where both neighbours survive but the move is past the bound, is counted as atm",
       C.siJudge({tau:9,si:9.9,sm,xs:0.1}).code,"atm");
    eq("the tail end is counted as tail",C.siJudge({tau:9,si:9.9,sm,xs:6}).code,"tail");
  }
  /* give-up window */
  eq("do not give up 10 minutes after the close",C.schemaVolGiveUp(T0+10*MIN,T0),false);
  eq("give up once the 360-minute bar buffer can no longer cover it",C.schemaVolGiveUp(T0+301*MIN,T0),true);
  eq("give-up is false on bad input",C.schemaVolGiveUp(null,T0),false);
}

/* ---------- integration: the REAL volspace, not this harness's reimplementation ----------
   The harness reimplements its dependency, so it can only prove the unit is self-consistent. This block
   splices the actual sibling unit and asserts the gate end to end, against the numbers in the
   re-registration note. Skipped (loudly) if the sibling is not on disk. ---- */
{
  const sib=path.join(__dirname,"..","volspace","code.js");
  if(!fs.existsSync(sib)){ console.log("  skip  volspace not on disk - integration assertions not run"); }
  else{
    const ictx={SEAS,normCdf,Math,Date,JSON,Object,isFinite,console};
    vm.createContext(ictx);
    vm.runInContext(fs.readFileSync(sib,"utf8")+"\n"+SRC,ictx,{filename:"volspace+schema.js"});
    const I=c=>vm.runInContext(c,ictx);
    const S0=112500, sig=0.0009, tau=15, ES=I("edgeSnapFields"), JG=I("siJudge");
    const at=bp=>{ const K=S0*Math.exp(bp/1e4), x=Math.log(K/S0);
      const q=1-normCdf((x+0.5*sig*sig*tau)/(sig*Math.sqrt(tau)));
      const f=ES({sigU:sig,tau,S0},{q},K,null);
      return {f,j:JG({tau,si:f.si,sm:f.sm,xs:f.xs,sq:f.sq,sqS:f.sqS})}; };
    eq("real volspace: the bound in force is 0.20",I("VRP_TICK_REL_MAX"),0.2);
    eq("real volspace: the superseded bound is still visible, and gates nothing",I("VRP_REL_MAX"),0.5);
    near("real volspace: 2bp moves 86.4% on one cent",at(2).f.sq,0.864,0.004);
    eq("real volspace: and is rejected, at the at-the-money end of the band",at(2).j.code,"atm");
    near("real volspace: 10bp moves 10.1%",at(10).f.sq,0.1006,0.002);
    eq("real volspace: and is kept",at(10).j.ok,true);
    eq("real volspace: at the money the +1c neighbour does not exist",at(0).f.sqS,"d");
    eq("real volspace: which is counted, not read as zero sensitivity",at(0).j.code,"tick1");
    eq("real volspace: 35bp is inside the band",at(35).j.ok,true);
    eq("real volspace: 120bp has no reading at all (fair value past the clip floor)",at(120).f.si,undefined);
    /* and the whole point: an ATM-ish reading the OLD gate admitted is now excluded */
    const x2=Math.log(S0*Math.exp(2/1e4)/S0);
    ok("real volspace: the superseded derivative passes the 2bp reading the tick rejects",
       I("sigmaIdentifiability")(x2,sig,tau).relPerCent<I("VRP_REL_MAX"));
    /* ---- and the central claim, against the real sibling rather than the harness's reimplementation:
       the identifiability verdict does not move with the quote. The harness can only show the unit is
       self-consistent; this shows the two units agree on the thing that matters. ---- */
    const ladder=bp=>{ const K=S0*Math.exp(bp/1e4), rows=[];
      for(let c=2;c<=98;c++){ const f=ES({sigU:sig,tau,S0},{q:c/100},K,null);
        if(f.si===undefined) continue;
        rows.push({c,si:f.si,sq:f.sq,j:JG({tau,si:f.si,sm:f.sm,xs:f.xs,sq:f.sq,sqS:f.sqS,sb:f.sb})}); }
      return rows; };
    const only=(rows,f)=>[...new Set(rows.map(f))];
    [[10,true],[-10,true],[2,false],[-2,false],[80,false],[-80,false]].forEach(function(p){
      const bp=p[0], want=p[1], rows=ladder(bp);
      ok("real volspace: "+bp+"bp sweeps a real ladder",rows.length>=40,String(rows.length));
      ok("real volspace: "+bp+"bp - the row's own tick crosses 0.20 inside that ladder",
         rows.some(a=>a.sq<=0.2)&&rows.some(a=>a.sq>0.2));
      eq("real volspace: "+bp+"bp - one identifiability verdict for every quote",
         JSON.stringify(only(rows,a=>a.j.identified)),JSON.stringify([want]));
    });
    /* real volspace: a one-sided PRIOR under the bound still never passes, and says so */
    const os=JG({tau,si:12,sm:9,xs:2.295});
    eq("real volspace: the 80bp prior is one-sided up",os.priorSided,"up");
    ok("real volspace: its surviving move is under the bound",os.priorRel<I("VRP_TICK_REL_MAX"),String(os.priorRel));
    eq("real volspace: and it is still rejected, as tick1",os.identified+"/"+os.code,"false/tick1");
    /* real volspace: the stored bound, not the live constant, is what judges an old row */
    eq("real volspace: a row carrying an older, looser bound is judged under it",
       JG({tau,si:9.5,sm:9,xs:0.143,sb:0.25}).bound+"/"+JG({tau,si:9.5,sm:9,xs:0.143,sb:0.25}).identified,
       "0.25/true");
    eq("real volspace: the same row judged live is rejected",
       JG({tau,si:9.5,sm:9,xs:0.143}).identified,false);
  }
}

/* ---------- misRatio / edgeSpreadC / swingSpreadC ---------- */
{
  eq("edge spread recovered from qm and ya",C.edgeSpreadC(51.5,53),3);
  eq("edge spread of a one-tick book",C.edgeSpreadC(52.5,53),1);
  eq("edge spread of a missing quote",C.edgeSpreadC(null,53),null);
  /* the identity itself: spread == ya - yb for the pair the snap was written from */
  const yb=48, ya=53, qm=(yb+ya)/2;
  eq("edgeSpreadC equals ya - yb exactly",C.edgeSpreadC(qm,ya),ya-yb);
  eq("swing spread in cents from dollar quotes",C.swingSpreadC(0.06,0.03),3);
  eq("swing spread with no bid",C.swingSpreadC(0.06,undefined),null);
  const m=C.misRatio(0.55,51.5,3);
  eq("mispricing in cents",m.mis,3.5);
  /* the ratio is stored/reported at 3dp: assert the rounding, do not pretend to more precision */
  eq("mispricing per cent of spread",m.ratio,+(3.5/3).toFixed(3));
  near("the 3dp ratio is within half a milli of the exact value",m.ratio,3.5/3,5e-4);
  eq("a crossed or zero spread yields no ratio",C.misRatio(0.55,51.5,0).ratio,null);
  eq("a negative spread yields no ratio",C.misRatio(0.55,51.5,-1).ratio,null);
  eq("a missing analytic probability yields no mispricing",C.misRatio(null,51.5,3).mis,null);
  const neg=C.misRatio(0.45,51.5,3);
  ok("mispricing is signed",neg.mis<0&&neg.ratio<0,JSON.stringify(neg));
}

/* ---------- degraded splice: volspace absent ---------- */
{
  const P={sigU:0.00085,tau:8.42,S0:112500};
  const f=N.edgeSnapFields(P,{q:0.53},112400,{depthYes:10,depthNo:20});
  ok("without volspace the page still writes sm/xs/depth",keys(f)==="dn,dy,sm,xs",keys(f));
  eq("without volspace si is omitted, not fabricated",f.si,undefined);
  eq("without volspace volCloseFields writes nothing",keys(N.volCloseFields(9,[1,2],[1,1],0,1e9)),"");
  const s=N.swingReadFields({rv60:0.0009},"YES",{yesBid:3,yesAsk:6,noBid:94,depthYes:1,depthNo:2},112500,112400,T0,T0+9*MIN);
  eq("without volspace the swing read still records bid/depth/sm/xs",keys(s),"bid,dn,dy,sm,xs");
}

/* ---------- backward compatibility: the repair + refSnap invariants ---------- */
{
  /* isPhantomK1 reads exactly tau, ask|entry, p.  refSnap reads tau and phantom.
     Assert that no field this unit can emit collides with any of them. */
  const emitted=new Set();
  const P={sigU:0.00085,tau:8.42,S0:112500};
  const ob={depthYes:1,depthNo:2,yesBid:3,yesAsk:6,noBid:94,noAsk:97};
  [C.edgeSnapFields(P,{q:0.53},112400,ob),
   C.edgeSnapFields({sigU:0.0009,tau:15,S0:112500},{q:0.4993},112500,null),   /* ATM: one-sided, emits sqS */
   C.swingReadFields({rv60:0.0009,sig:0.002},"YES",ob,112500,112400,T0,T0+9*MIN),
   C.journalEntryFields({sm:1,si:2,xs:3,dy:4,dn:5},{entryBid:0.03}),
   C.volCloseFields({t:6e5,tau:9,si:11,sm:10,xs:-0.4},[1,2,3,4,5,6,7,8,9,10,11,12],new Array(12).fill(100).map((v,i)=>v*Math.exp(0.001*i)),0,12*60000,3),
   C.volCloseFields(null,[1,2,3,4,5,6,7,8,9,10,11,12],new Array(12).fill(100).map((v,i)=>v*Math.exp(0.001*i)),0,12*60000,3)
  ].forEach(o=>Object.keys(o).forEach(k=>emitted.add(k)));
  /* "sq"/"sqS" grep 0 in index.html (only Math.sqrt / "squares" match the substring) and 0 across the
     sibling units, so the two new keys collide with nothing. */
  const reserved=["tau","ask","entry","p","phantom","t","qm","pm","ya","na","pa","pd","pe","pf","pr","fit",
                  "hit","maxAfter","base","be","ofi","v60","disl","result","provisional","provSrc","settleAvg",
                  "expVal","provTried","snaps","reads","sim","graded","lastBid","arm","exit","reason","pnl",
                  "pnlShare","shares","stake","peak","bank","exitRule","ticker","strike","close","open","side",
                  "tIn","tOut","v","w"];
  const clash=reserved.filter(k=>emitted.has(k));
  eq("no emitted field collides with an existing ledger key",clash.join(","),"");
  /* the full roster this unit is allowed to write. `sq`/`sqS`/`sb` post-date SPEC.md's field tables, which
     have not been updated for them - the roster here, not the SPEC prose, is the enforced one. */
  ok("the emitted set is exactly the roster this unit is allowed to write",
     [...emitted].sort().join(",")==="bid,bidIn,dn,dy,sb,si,sm,sq,sqS,sr,srN,sv,vrp,vrpT,vrpX,xs",[...emitted].sort().join(","));
  /* isPhantomK1, transcribed from index.html, must give the same verdict before and after enrichment */
  const isPhantomK1=o=>{ if(!o) return false;
    const tau=o.tau, ask=(o.ask!==undefined&&o.ask!==null)?o.ask:o.entry, p=o.p;
    return tau!==undefined&&tau!==null&&tau>=13 && ask!==undefined&&ask!==null&&ask<=0.15 && p!==undefined&&p!==null&&p>=0.5; };
  const phantom={t:T0,tau:14.2,ask:0.03,p:0.62,base:0.024,be:0.16,maxAfter:0};
  const clean={t:T0,tau:8.2,ask:0.05,p:0.12,base:0.042,be:0.163,maxAfter:0};
  const before=[isPhantomK1(phantom),isPhantomK1(clean)].join(",");
  C.schemaPut(phantom,C.swingReadFields({rv60:0.0009,sig:0.002},"YES",ob,112500,112400,T0,T0+14*MIN));
  C.schemaPut(clean,C.swingReadFields({rv60:0.0009,sig:0.002},"YES",ob,112500,112400,T0,T0+8*MIN));
  eq("enrichment does not change the K1 phantom verdict",[isPhantomK1(phantom),isPhantomK1(clean)].join(","),before);
  eq("the phantom rule still fires on the enriched row",isPhantomK1(phantom),true);
  /* refSnap, transcribed: picks the snap with tau nearest 6, skipping tau<0 and flagged rows */
  const refSnap=w=>{ let best=null; for(const s of w.snaps){ if(s.tau<0||s.phantom) continue;
    if(best===null||Math.abs(s.tau-6)<Math.abs(best.tau-6)) best=s; } return best; };
  const w={snaps:[{tau:14,qm:50},{tau:6.4,qm:51},{tau:1.2,qm:52}]};
  const pick=refSnap(w).tau;
  w.snaps.forEach(s=>C.schemaPut(s,C.edgeSnapFields(P,{q:0.51},112400,ob)));
  eq("enrichment does not change which snap refSnap picks",refSnap(w).tau,pick);
  eq("a v1 snap with no new fields is still selectable",refSnap({snaps:[{tau:6.1,qm:50}]}).tau,6.1);
}

/* ---------- purity ---------- */
{
  /* the vm context traps document/window/localStorage/fetch/setTimeout/setInterval/S.
     Re-running every entry point inside it proves none of them is touched. */
  let threw=null;
  try{
    const P={sigU:0.00085,tau:8.42,S0:112500};
    const ob={depthYes:1,depthNo:2,yesBid:3,yesAsk:6,noBid:94,noAsk:97};
    C.edgeSnapFields(P,{q:0.53},112400,ob);
    C.swingReadFields({rv60:0.0009,sig:0.002},"YES",ob,112500,112400,T0,T0+9*MIN);
    C.journalEntryFields({sm:1},{entryBid:0.03});
    C.volCloseFields(9,[1,2],[1,1],0,1e9);
    C.misRatio(0.5,50,2); C.edgeSpreadC(50,51); C.swingSpreadC(0.05,0.03);
    C.touchSigma({rv60:0.001},T0,T0+MIN); C.seasAt(T0); C.utcHour(T0); C.schemaVolGiveUp(T0,T0);
    C.depthAtAsk("YES",1,2); C.bookDepth(ob); C.sigBp(0.001); C.schemaNum(1.5,1);
  }catch(e){ threw=e.message; }
  eq("no entry point touches the DOM, storage, network, timers or S",threw,null);
  /* and the bundles are fresh objects, never shared state */
  const a=C.bookDepth({depthYes:1,depthNo:2}), b=C.bookDepth({depthYes:1,depthNo:2});
  ok("each call returns a fresh object",a!==b);
}

console.log("\n"+(fails?("FAILED "+fails+" of "+ran):("all "+ran+" assertions pass")));
process.exit(fails?1:0);
