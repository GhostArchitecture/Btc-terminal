/* H protocol (CLAUDE.md §11): the measurement layer for the shock-conditioned hypotheses H1-H5.
   These assertions cover the WIRING and the honesty guards, not the unit math (each unit carries its own suite).
   Run: node test/hprotocol.js */
"use strict";
const { load, runner } = require("./lib/load");

const H = load();
const { R, setNow } = H;
const { T, done } = runner("h-protocol");

/* ---- the units are present and reachable from page scope */
{
  const fns = R(`[typeof impliedSigma,typeof sigmaIdentifiability,typeof eventTag,typeof standardisedMove,typeof detectShock,typeof timeMatchedControl,typeof edgeSnapFields,typeof volCloseFields,typeof volCloseTick].join(",")`);
  T("all five units spliced and callable", fns === "function,function,function,function,function,function,function,function,function", fns);
}

/* ---- H5: implied vol is NOT identifiable at the money, and the code must say so rather than invent a number.
   KXBTC15M strikes open AT the money, so this is the common case, not an edge case. */
{
  const r = R(`(function(){
    const S0=100000, tau=8, sig=0.0009;
    const atmAbove=impliedSigma(100000,S0,tau,0.50);      /* exactly ATM, q=0.50: no solution exists */
    const otmCap=impliedSigma(100050,S0,tau,0.49);        /* 5bp above spot, ordinary 49c quote */
    const below=impliedSigma(99900,S0,tau,0.40);          /* 10bp below spot, 40c: root exists but absurd */
    const wing=impliedSigma(100000*Math.exp(0.004),S0,tau,0.20);  /* well off the money: identifiable */
    return {atmAbove,otmCap,below,wing}; })()`);
  T("an at-the-money binary yields NO implied sigma (returns null, never a clamped fake)", r.atmAbove === null, r);
  T("a 49c quote on a 5bp-OTM strike is past the analytic cap and yields null", r.otmCap === null, r);
  T("a strike off the money is identifiable and returns a finite sigma", typeof r.wing === "number" && r.wing > 0, r.wing);
  T("the economically-absurd below-spot root is returned as a number, so a plausibility guard is required", typeof r.below === "number" && r.below > 0.01, r.below);
}
{
  /* the guard that catches it: ratioModel exposes an inversion returning orders of magnitude more vol than the model */
  const r = R(`(function(){
    const S0=100000, tau=8, sigModel=0.0009;
    const P={sigU:sigModel};
    const t=volTriple(P,{q:0.40},99900,S0,tau);
    const ident=sigmaIdentifiability(Math.log(100000/S0),sigModel,tau);
    return {ratioModel:t.ratioModel,sigModel:t.sigModel,identified:ident.identified,reason:ident.reason}; })()`);
  T("ratioModel exposes an absurd inversion as a large multiple of the model's own sigma", r.ratioModel > 50, { ratioModel: r.ratioModel, sigModel: r.sigModel });
  T("sigmaIdentifiability reports an at-the-money strike as NOT identified, with a reason", r.identified === false && /money/i.test(r.reason || ""), r);
}

/* ---- the H5 fields reach an actual edge snapshot through the real write path */
{
  const now = Date.UTC(2026, 8, 6, 14, 7, 0); setNow(now);
  const r = R(`(function(){
    computeStats=()=>({sig:0.0009,rv60:0.0009,muFast:0,nBars:200}); S.idxPx=100000; S.lastPx=100000;
    S.edge.windows={}; S.edge.lastSnap=0;
    const close=${now}+8*60000;
    const m={ticker:"KXBTC15M-T",strike:100400,open:${now}-7*60000,close,yesBid:18,yesAsk:22,noBid:78,noAsk:82,status:"open"};
    const ob={yesBid:18,yesAsk:22,noBid:78,noAsk:82,depthYes:340,depthNo:512};
    const wrote=edgeSnapOne(m,${now},ob);
    const s=S.edge.windows["KXBTC15M-T"].snaps[0];
    return {wrote,keys:Object.keys(s),sm:s.sm,si:s.si,xs:s.xs,dy:s.dy,dn:s.dn}; })()`);
  T("a real edge snapshot carries the vol triple and book depth", r.wrote === true && r.sm !== undefined && r.xs !== undefined, r);
  T("book depth is persisted (it was computed and discarded before this build)", r.dy === 340 && r.dn === 512, { dy: r.dy, dn: r.dn });
}

/* ---- the deferred settlement-vol pass: realized sigma is unrecoverable once the bar buffer drops it */
{
  const close = Date.UTC(2026, 8, 6, 14, 0, 0), now = close + 70000; setNow(now);
  const r = R(`(function(){
    S.edge.windows={W:{ticker:"KXBTC15M-W",strike:100400,open:${close}-15*60000,close:${close},result:"yes",
      snaps:[{t:${close}-6*60000,tau:6,pm:0.3,qm:22,ya:24,na:78,sm:9,si:11,xs:1.8,sid:1}]}};
    S.swing={v:1,w:{}}; S.journal=[];
    S.bars=new Map(); S.barKeys=[];
    const k0=Math.floor((${close}-15*60000)/60000);
    let p=100000; for(let i=0;i<=15;i++){ p*=(1+((i%2)?0.0006:-0.0005)); S.bars.set(k0+i,p); S.barKeys.push(k0+i); }
    volCloseTick(${now});
    const w=S.edge.windows.W;
    return {sr:w.sr,srN:w.srN,vrp:w.vrp,vrpX:w.vrpX,tried:w.srTried}; })()`);
  T("volCloseTick computes realized sigma for a closed window from its own bars", typeof r.sr === "number" && r.srN > 0, r);
  T("a window that gets realized sigma gets either a premium or a stated omission reason, never neither", (r.vrp !== undefined) !== (r.vrpX === undefined ? false : true) || r.vrp !== undefined || r.vrpX !== undefined, r);
}
{
  /* L2's lesson applied: a window whose bars are gone must NOT be marked tried while the seed is still landing */
  const close = Date.UTC(2026, 8, 6, 14, 0, 0);
  const soon = R(`(function(){ S.edge.windows={W:{ticker:"KXBTC15M-W",strike:1,open:${close}-9e5,close:${close},snaps:[]}};
    S.swing={v:1,w:{}}; S.journal=[]; S.bars=new Map(); S.barKeys=[];
    volCloseTick(${close}+70000); return S.edge.windows.W.srTried; })()`);
  const late = R(`(function(){ S.edge.windows={W:{ticker:"KXBTC15M-W",strike:1,open:${close}-9e5,close:${close},snaps:[]}};
    S.swing={v:1,w:{}}; S.journal=[]; S.bars=new Map(); S.barKeys=[];
    volCloseTick(${close}+301*60000); return S.edge.windows.W.srTried; })()`);
  T("a just-closed window with no bars yet is retried, not written off (defect L2's lesson)", soon === undefined, soon);
  T("past the bar buffer the window gives up once and stops retrying forever", late === 1, late);
}

/* ---- the calendar refuses to invent dates, and refuses to tag a missing timestamp */
{
  const r = R(`(function(){
    const t=eventTag(null), u=eventTag(0), v=eventTag(NaN);
    return {datedEmpty:RELEASES.DATED.length,nullTag:t&&t.ev,zeroTag:u&&u.ev,nanTag:v&&v.ev}; })()`);
  T("the DATED release table is empty — agency dates are not invented", r.datedEmpty === 0, r);
  T("a missing timestamp yields no event tag, not a confident 1970 one", !r.nullTag && !r.zeroTag && !r.nanTag, r);
}
{
  /* the one thing a hand-rolled DST rule must get right */
  const r = R(`(function(){
    const summer=etToUtc(2026,7,10,8,30), winter=etToUtc(2026,12,10,8,30);
    return {summerH:new Date(summer).getUTCHours(),winterH:new Date(winter).getUTCHours()}; })()`);
  T("08:30 ET maps to 12:30 UTC in summer and 13:30 UTC in winter", r.summerH === 12 && r.winterH === 13, r);
}

/* ---- the detector must not be circular, and its z must not saturate (H1 lives entirely in the tail) */
{
  const r = R(`(function(){
    const cal=detectShock({calendarTag:{ev:"NFP",evMins:2,evTier:1},z:null,k:3});
    const endo=detectShock({calendarTag:null,z:4.2,k:3});
    const quiet=detectShock({calendarTag:null,z:0.4,k:3});
    return {calPhase:cal.phase,calShock:cal.shock,calMag:cal.mag,endoPhase:endo.phase,quietShock:quiet.shock}; })()`);
  T("a scheduled release fires phase 1 regardless of whether price moved", r.calShock === true && r.calPhase === 1, r);
  T("phase 1 and phase 2 stay distinguishable and are never pooled", r.endoPhase === 2, r);
  T("a quiet tape is not a shock", r.quietShock === false, r);
  T("a phase-1 shock with no measurable move gets no fabricated magnitude bucket", r.calMag === null, r.calMag);
}
{
  /* the time-of-day control the theory spine omits: releases cluster on the rising edge of SEAS */
  const r = R(`(function(){
    const c=timeMatchedControl(Date.UTC(2026,8,6,13,30,0),SEAS);
    return {hourUTC:c.hourUTC,weekday:c.weekday,seas:c.seas,peak:Math.max.apply(null,SEAS),trough:Math.min.apply(null,SEAS)}; })()`);
  T("the time-matched control exposes clock slot and the seasonal multiplier in force", r.hourUTC === 13 && typeof r.seas === "number", r);
  T("the seasonal swing that makes the control necessary is real (>2x across the day)", r.peak / r.trough > 2, { peak: r.peak, trough: r.trough });
}

/* ---- the CSV is where this becomes usable: every new column must actually appear */
{
  const r = R(`(function(){
    S.edge.windows={}; S.roundLog=[]; S.swing={v:1,w:{}}; S.journal=[]; exportCSV();
    const text=window._lastBlob.text;
    const head=s=>{ const i=text.indexOf("# "+s); const line=text.slice(i).split("\\n")[1]||""; return line.split(",").length; };
    return {windows:head("windows"),swing:head("swing_reads"),journal:head("simulation_journal"),
      hasVrp:/vrp_bpm/.test(text),hasEv:/"ev_mins"/.test(text),hasDepth:/depth_yes/.test(text),hasIdent:/si_ident/.test(text)}; })()`);
  T("the windows dataset carries its 45 columns", r.windows === 45, r.windows);
  T("swing reads and journal rows carry the enriched columns", r.swing === 38 && r.journal === 44, { swing: r.swing, journal: r.journal });
  T("the premium, event, depth and identifiability columns are all exported", r.hasVrp && r.hasEv && r.hasDepth && r.hasIdent, r);
}

process.exitCode = done() ? 1 : 0;
