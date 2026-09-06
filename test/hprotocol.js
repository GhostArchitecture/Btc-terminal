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
  T("the windows dataset carries its 50 columns", r.windows === 50, r.windows);
  T("swing reads and journal rows carry the enriched columns", r.swing === 43 && r.journal === 49, { swing: r.swing, journal: r.journal });
  T("the premium, event, depth and identifiability columns are all exported", r.hasVrp && r.hasEv && r.hasDepth && r.hasIdent, r);
}
/* A header is not evidence. This asserts the decider's own numbers reach a DATA ROW: the schema dropped the
   sim/sic/sid fields the export still read, and the header-only assertion above passed throughout. `btc.edge`
   holds ~15 days, so a column that exports blank is the measurement being lost, not merely hidden. */
{
  const now = Date.UTC(2026, 8, 6, 14, 7, 0); setNow(now);
  const r = R(`(function(){
    computeStats=()=>({sig:0.0009,rv60:0.0009,muFast:0,nBars:200}); S.idxPx=100000; S.lastPx=100000;
    S.edge.windows={}; S.edge.lastSnap=0; S.roundLog=[]; S.swing={v:1,w:{}}; S.journal=[];
    const close=${now}+8*60000;
    /* 35bp above spot: inside the identifiable band, so this row must be judged by the tick and pass */
    const m={ticker:"KXBTC15M-T",strike:100350,open:${now}-7*60000,close,yesBid:18,yesAsk:22,noBid:78,noAsk:82,status:"open"};
    edgeSnapOne(m,${now},{yesBid:18,yesAsk:22,noBid:78,noAsk:82,depthYes:340,depthNo:512});
    const snap=S.edge.windows["KXBTC15M-T"].snaps[0];
    exportCSV();
    const text=window._lastBlob.text;
    const sec=text.slice(text.indexOf("# windows"));
    const lines=sec.split("\\n");
    const cell=(name)=>{ const h=lines[1].split(","), d=lines[2].split(","), i=h.indexOf('"'+name+'"');
      return i<0?"__MISSING__":d[i].replace(/^"|"$/g,""); };
    return {sq:snap.sq,sqS:snap.sqS,cols:lines[1].split(",").length,
      tickRel:cell("si_tick_rel"),gate:cell("si_gate"),code:cell("si_code"),bound:cell("si_bound"),
      ident:cell("si_ident"),sided:cell("si_tick_sided")}; })()`);
  T("an identifiable strike stores the true tick sensitivity on the row itself", typeof r.sq === "number" && r.sq >= 0, { sq: r.sq, sqS: r.sqS });
  T("si_tick_rel reaches the CSV as a number, not an empty cell", r.tickRel !== "" && r.tickRel !== "__MISSING__" && isFinite(+r.tickRel), r);
  T("si_gate records that the TICK decided this row, not the superseded prior", r.gate === "tick", r);
  T("the bound in force is exported beside the measurement, so another bound can be applied later", +r.bound === 0.2, r);
  T("a reading inside the band is marked identified with reason ok", r.ident === "1" && r.code === "ok", r);
}
/* The bound is the whole point of the re-registration: it must be the tightened value in code, and the band it
   produces must be the one it was derived against. Measured independently here rather than taken on trust —
   every strike quoted at its OWN model-fair value, then moved by exactly one cent. */
{
  const probe = (tau) => R(`(function(){
    const S0=100000, sig=0.0009, tau=${tau}, o={};
    [0,2,5,8,10,20,35,60,98].forEach(function(bp){
      const strike=S0*Math.exp(bp/10000), x=Math.log(strike/S0);
      const q=1-normCdf((x+0.5*sig*sig*tau)/(sig*Math.sqrt(tau)));
      const t=impliedSigmaTick(strike,S0,tau,q);
      o["b"+bp]={id:t?t.identified:false,rel:(t&&t.rel!==null)?t.rel:null,sided:t?t.sided:null,
                 xs:+(x/(sig*Math.sqrt(tau))).toFixed(3)};
    });
    return o; })()`);
  const c = R(`[VRP_TICK_REL_MAX,VRP_TICK,VRP_REL_MAX]`);
  T("the tick bound is the re-registered 0.20, measured across one real cent", c[0] === 0.20 && c[1] === 0.01, c);
  T("the superseded derivative bound survives as a diagnostic but gates nothing", c[2] === 0.5, c[2]);

  const w = probe(15);   /* a full 15-minute window, the horizon the bound was derived on */
  T("at the money there is no reading at all, and the reason says so", w.b0.id === false && w.b0.rel > 5, w.b0);
  T("2bp is REJECTED: one tick moves implied sigma ~86%", w.b2.id === false && w.b2.rel > 0.8, w.b2);
  T("5bp is REJECTED at ~22%, having been admitted by the superseded bound", w.b5.id === false && w.b5.rel > 0.20 && w.b5.rel < 0.25, w.b5);
  T("the 8-60bp core is ACCEPTED, every reading moving under 15% on a tick", w.b8.id && w.b10.id && w.b20.id && w.b35.id && w.b60.id && [w.b8, w.b10, w.b20, w.b35, w.b60].every(v => v.rel < 0.15), w);
  T("the deep tail is REJECTED — fair value past the clip bound inverts to nothing", w.b98.id === false && w.b98.rel === null, w.b98);

  /* The band is fixed in STANDARDISED units, so in basis points it contracts toward the strike as tau decays.
     A KXBTC15M window is therefore unidentifiable at its own strike for its whole life, and the bp width of the
     usable ring shrinks as the gate approaches — this is why the band cannot be stated as a fixed bp range. */
  const l = probe(3);
  T("the band tracks x/(sig*sqrt(tau)), not basis points: 5bp is unidentifiable at 15 min and identifiable at 3", w.b5.id === false && l.b5.id === true, { at15: w.b5, at3: l.b5 });
  /* The inner edge is the load-bearing claim: whatever the horizon, the first identifiable strike sits at
     roughly the same standardised distance. Asserted as a band on xs, so a change in tau cannot quietly
     widen or narrow what counts as a reading. */
  const inner = (p) => ["b2","b5","b8","b10","b20","b35","b60"].map(k => p[k]).filter(v => v && v.id)[0];
  T("the first identifiable strike sits at the same standardised distance at 15 min and at 3 min",
    inner(w).xs > 0.15 && inner(w).xs < 0.40 && inner(l).xs > 0.15 && inner(l).xs < 0.40,
    { at15: inner(w).xs, at3: inner(l).xs });
  T("a strike 35bp out is inside the band at 15 min and past it at 3 min", w.b35.id === true && l.b35.id === false, { at15: w.b35, at3: l.b35 });

  /* A neighbour that does not invert must never score as zero sensitivity — the failure the brief called out. */
  T("a one-sided reading is rejected, not credited with the sensitivity of its surviving neighbour", l.b35.sided === "up" && l.b35.rel !== null && l.b35.rel < 0.20 && l.b35.id === false, l.b35);
}

process.exitCode = done() ? 1 : 0;
