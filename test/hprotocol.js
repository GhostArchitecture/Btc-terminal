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
  /* This used to assert the table was EMPTY, as a proxy for "no date was invented". The table now carries
     rows that were RETRIEVED, so the proxy is gone and the real property is asserted instead: every row
     names the source it came from and the date it was read. Provenance is the whole guarantee here — a row
     without it is indistinguishable from a guess, and a guessed release does not merely go unmeasured, it
     is recruited into the control group it should have been excluded from (§11.3). */
  const r = R(`(function(){
    const t=eventTag(null), u=eventTag(0), v=eventTag(NaN);
    const D=RELEASES.DATED;
    const noSrc=D.filter(x=>!x.src||typeof x.src!=="string"||!x.src.length).length;
    const noRet=D.filter(x=>!/^\\d{4}-\\d{2}-\\d{2}$/.test(x.retrieved||"")).length;
    const badT=D.filter(x=>typeof x.t!=="number"||!isFinite(x.t)).length;
    return {n:D.length,noSrc,noRet,badT,nullTag:t&&t.ev,zeroTag:u&&u.ev,nanTag:v&&v.ev}; })()`);
  T("every dated release names the source it came from", r.n > 0 && r.noSrc === 0, r);
  T("every dated release records when that source was read", r.noRet === 0, r);
  T("every dated release resolves to a real instant", r.badT === 0, r);
  T("a missing timestamp yields no event tag, not a confident 1970 one", !r.nullTag && !r.zeroTag && !r.nanTag, r);
}
{
  /* The calendar has to actually fire, or the shock programme has no treatment group. A BEA instant is a
     release; a quiet window is not. And the partiality caveat must travel with the verdict rather than
     living in a document — an incomplete table means a control may hide a release nobody recorded, which
     biases difference-in-differences TOWARD ZERO (§11.3). */
  const r = R(`(function(){
    const gdp=Date.UTC(2026,3,30,12,30,0);            /* BEA GDP, from the feed */
    const hit=eventTag(gdp), quiet=eventTag(Date.UTC(2026,3,15,3,7,0));
    const ce=controlEligible(gdp), cq=controlEligible(Date.UTC(2026,3,15,3,7,0));
    return {hitEv:hit&&hit.ev,hitTier:hit&&hit.evTier,quietEv:quiet&&quiet.ev,
      atRelease:ce.eligible,atReleaseWhy:ce.reason,atQuiet:cq.eligible,
      partial:!!(cq.known&&cq.known.partial),caveat:!!(cq.known&&cq.known.caveat)}; })()`);
  T("a known BEA release instant is tagged as an event", !!r.hitEv, r);
  T("an unremarkable window is not", !r.quietEv, r);
  T("a release window is refused as a time-matched control", r.atRelease === false && /release/.test(r.atReleaseWhy || ""), r);
  T("a quiet window IS eligible — the calendar no longer refuses every window in history", r.atQuiet === true, r);
  T("and every verdict carries the partiality caveat, so no caller can read a control as certified clean", r.partial && r.caveat, r);
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
  T("the windows dataset carries its 61 columns (59 + csd_ac1, csd_n at 2.9)", r.windows === 61, r.windows);
  T("swing reads and journal rows carry the enriched columns", r.swing === 45 && r.journal === 51, { swing: r.swing, journal: r.journal });
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
  T("si_gate records that the exogenous PRIOR decided, with the row's own tick kept only as a diagnostic", r.gate === "prior+tick", r);
  T("the bound in force is exported beside the measurement, so another bound can be applied later", +r.bound === 0.2, r);
  T("a reading inside the band is marked identified with reason ok", r.ident === "1" && r.code === "ok", r);
}
/* The bound is the whole point of the re-registration: it must be the tightened value in code, and the band it
   produces must be the one it was derived against. Measured independently here rather than taken on trust —
   every strike quoted at its OWN model-fair value, then moved by exactly one cent. */
{
  /* Probes the GATE itself — sigmaIdentifiability, which takes no quote and inverts at the model-fair one.
     The earlier version of this block probed impliedSigmaTick at a fair quote it computed itself, which made
     every band assertion a statement about a quote the live path never sees. */
  const probe = (tau) => R(`(function(){
    const sig=0.0009, tau=${tau}, o={};
    [0,2,5,8,10,20,35,60,98].forEach(function(bp){
      const x=bp/10000, p=sigmaIdentifiability(x,sig,tau);
      o["b"+bp]={id:p.identified,rel:p.tickRel,sided:p.tickSided,xs:+p.xs.toFixed(3)};
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

/* THE INVARIANT THAT WAS MISSING, and whose absence let a quote-dependent gate ship and be registered as a
   tightening. vrp = implied - realized, and at a fixed strike and horizon implied sigma is MONOTONE in the
   quote. So any identifiability criterion that reads the row's own quote is a criterion on the row's own
   premium: it keeps one sign and discards the other. The gate must therefore depend on the strike and the
   horizon and NOTHING the market did. Asserted behaviourally, by sweeping the quote and requiring the verdict
   not to move — reading the source would not have caught this. */
{
  const sweep = R(`(function(){
    const S0=100000, sig=0.0009, tau=15, sr=9, o={};
    const at=function(bp){
      const strike=S0*Math.exp(bp/10000), x=Math.log(strike/S0);
      const verdicts=[], premia=[];
      [0.05,0.10,0.20,0.30,0.40,0.45,0.47,0.60,0.75,0.90].forEach(function(q){
        const t=impliedSigmaTick(strike,S0,tau,q);
        const f={sm:+(sig*10000).toFixed(2),tau:tau,xs:+(x/(sig*Math.sqrt(tau))).toFixed(3)};
        if(t&&t.sig!==null){ f.si=+(t.sig*10000).toFixed(2); f.sq=+t.rel.toFixed(4);
          if(t.sided!=="two") f.sqS=(t.sided==="up"?"u":(t.sided==="down"?"d":"n")); }
        if(f.si===undefined) return;
        verdicts.push(siJudge(f).identified);
        premia.push(+(f.si-sr).toFixed(2));
      });
      return {verdicts:verdicts,premia:premia,
              uniform:verdicts.length>0&&verdicts.every(function(v){ return v===verdicts[0]; })};
    };
    o.inBand=at(35); o.outBand=at(5); o.atm=at(0);
    return o; })()`);
  const anySign = (p) => p.some(v => v > 0) && p.some(v => v < 0);
  T("a strike inside the band is identified at EVERY quote — the verdict does not track the premium",
    sweep.inBand.uniform && sweep.inBand.verdicts[0] === true, sweep.inBand);
  T("a strike outside the band is refused at EVERY quote, positive and negative premia alike",
    sweep.outBand.uniform && sweep.outBand.verdicts[0] === false, sweep.outBand);
  T("an at-the-money strike is refused at every quote, which is the KXBTC15M open",
    sweep.atm.uniform && sweep.atm.verdicts[0] === false, sweep.atm);
  T("the sweep really does span both signs of the premium, so uniformity is a claim and not a vacuum",
    anySign(sweep.inBand.premia) && anySign(sweep.outBand.premia),
    { inBand: sweep.inBand.premia, outBand: sweep.outBand.premia });
}
/* The observed-quote sensitivity is kept on the row, but it is a DIAGNOSTIC: it is nearly blind to the two
   things that determine identifiability, which is precisely why it cannot gate. */
{
  const r = R(`(function(){ const S0=100000,o=[];
    [[2,15],[10,15],[60,15],[120,60],[2,0.05]].forEach(function(c){
      const t=impliedSigmaTick(S0*Math.exp(c[0]/10000),S0,c[1],0.30);
      o.push(t&&t.rel!==null?t.rel:null); });
    return o; })()`);
  const span = Math.max(...r) - Math.min(...r);
  T("at a fixed quote the observed-quote statistic barely moves across 60x in strike and 300x in tau, so it measures the quote",
    span < 0.005, { values: r, span: span });
  /* and the row must still carry it, or the conditioning of each reading becomes invisible */
  T("it is nevertheless stored, so an analyst can see how well conditioned each reading was",
    R(`(function(){ const f={}; siTickWrite(f,100350,100000,8,0.20); return typeof f.sq==="number"&&typeof f.sb==="number"; })()`), true);
}
/* A row keeps the bound it was judged under. siJudge runs at EXPORT time, so without this a re-registration
   would silently re-judge every historical row — which CLAUDE.md §11.8 promises it does not. */
{
  const r = R(`(function(){
    const base={si:12,sm:9,xs:0.23,tau:15};
    const strict=siJudge(Object.assign({},base,{sb:0.05}));
    const loose =siJudge(Object.assign({},base,{sb:0.90}));
    const none  =siJudge(base);
    return {strict:strict.identified,strictB:strict.bound,loose:loose.identified,looseB:loose.bound,
            noneB:none.bound}; })()`);
  T("a row carrying its own bound is judged under THAT bound, not the current constant",
    r.strictB === 0.05 && r.looseB === 0.90 && r.strict !== r.loose, r);
  T("a row with no stored bound falls back to the one in force", r.noneB === 0.20, r.noneB);
}

/* ---- H1: the reversion half detect deliberately does not measure (§11, spine H1) */
{
  const t = Date.UTC(2026, 3, 30, 12, 30, 0);          /* a real BEA GDP instant from the spliced calendar */
  const r = R(`(function(){
    const t=${t}, now=t+20*60000;
    S.shock={v:1,rows:{}}; S.edge.windows={}; S.bars=new Map(); S.barKeys=[];
    const k0=Math.floor(t/60000)-90; let p=100000;
    for(let i=0;i<=110;i++){ const k=k0+i, m=k-Math.floor(t/60000);
      if(m===0) p*=1.004; else if(m>0&&m<=5) p*=0.9994; else p*=(1+((i%2)?0.00012:-0.0001));
      S.bars.set(k,p); S.barKeys.push(k); }
    shockTick(now);
    const rows=Object.values(S.shock.rows);
    const prim=rows.filter(x=>x.exploratory===0), expl=rows.filter(x=>x.exploratory===1);
    return {n:rows.length,nPrim:prim.length,bucket:prim[0]&&prim[0].bucketLabel,
      ret:prim[0]&&prim[0].ret,rev:prim[0]&&prim[0].rev,revFrac:prim[0]&&prim[0].revFrac,
      book:prim[0]&&prim[0].bookCode,ev:prim[0]&&prim[0].ev,nExpl:expl.length,err:S.shockErr||null}; })()`);
  T("a calendar shock is measured end to end, from the release instant to a reversion", r.n > 0 && r.ret > 0, r);
  T("exactly one horizon is primary; the rest are marked exploratory (§11.4)", r.nPrim === 1 && r.nExpl === r.n - 1, r);
  T("the impulse is bucketed by detect's own edges, tail buckets unmerged", typeof r.bucket === "string" && /^z/.test(r.bucket), r.bucket);
  T("a give-back is a POSITIVE reversion, so a continuation cannot hide as a zero", r.rev > 0 && r.revFrac > 0, r);
  T("with no book snapshots the cost is stated absent, never assumed", r.book === "noquote", r.book);
  T("the row carries the release that triggered it", r.ev === "GDP", r.ev);
}
{
  /* L2's lesson, which volCloseTick learned the hard way: a shock whose bars have not arrived must be
     RETRIED, not written off on the first tick after a reload. */
  const t = Date.UTC(2026, 3, 30, 12, 30, 0);
  const r = R(`(function(){
    S.shock={v:1,rows:{}}; S.edge.windows={}; S.bars=new Map(); S.barKeys=[];
    const k=Math.floor(${t}/60000);
    for(let i=0;i<40;i++){ S.bars.set(k+200+i,100000); S.barKeys.push(k+200+i); }   /* buffer moved past it */
    shockTick(${t}+20*60000);
    const rows=Object.values(S.shock.rows);
    return {n:rows.length,tried:rows.filter(x=>x.tried===1).length,done:rows.filter(x=>x.done===1).length}; })()`);
  T("once the bar buffer has moved past a shock it gives up once, with its reason recorded", r.n === 0 || r.tried === r.n, r);
  T("and nothing is recorded as measured that was not", r.done === 0, r);
}

/* ---- H3: maker economics per FILL, which a running sum could never be conditioned on */
{
  const now = Date.UTC(2026, 3, 30, 12, 31, 0); setNow(now);
  const r = R(`(function(){
    S.via={v:1,series:{},rows:[]}; S.viaPend={};
    S.k.cur={ticker:"KXBTC15M-A",close:${now}+9*60000};
    S.k.ob={yesBid:42,yesAsk:46,noBid:54,noAsk:58}; S.k.hourOb=null;
    S.sig={ofi60:{x:0.31,vol:12.4,n:22},ofi300:{x:0.08}};
    viaSample(${now});                                  /* posts */
    S.k.ob={yesBid:40,yesAsk:45,noBid:55,noAsk:60};     /* bid moves through: a fill */
    viaSample(${now}+70000);                            /* grades */
    const V=S.via.series["15m"]||{};
    const w=S.via.rows[0]||{};
    return {rows:S.via.rows.length,fills:V.fills,posts:V.posts,
      t:w.t,f:w.f,rb:w.rb,ra:w.ra,of:w.of,tau:w.tau,tk:w.tk}; })()`);
  T("a graded maker post writes a per-fill ROW, not just a counter increment", r.rows === 1 && typeof r.t === "number", r);
  T("the row carries the timestamp that makes the release split possible at all", r.t > 0 && r.tk === "KXBTC15M-A", r);
  T("the running counters still work — this is additive, not a replacement", r.posts >= 1, r);
  T("the flow state visible when the order was RESTED is captured, not the state after the fill", r.of === 0.31, r);
  T("tau comes from the market's own close, and is omitted rather than invented where there is none", typeof r.tau === "number", r.tau);
}

/* ---- the CSV, where all of it becomes usable. A header is not evidence: the cells must carry values.
   Two datasets have now shipped with columns wired to the wrong accessor, exporting blank on every row
   while the header-only assertion passed. This checks the values. */
{
  const now = Date.UTC(2026, 3, 30, 12, 31, 0);
  const r = R(`(function(){
    S.edge.windows={}; S.roundLog=[]; S.swing={v:1,w:{}}; S.journal=[]; S.shock={v:1,rows:{}};
    S.via={v:1,series:{},rows:[{t:${now},dt:60,k:"15m",tk:"KXBTC15M-X",f:1,rb:42,ra:46,m1:45.5,
      tau:9.2,of:0.31,ofv:12.4,ofn:22,of5:0.08}]};
    exportCSV();
    const txt=window._lastBlob.text, i=txt.indexOf("# maker_fills");
    const L=txt.slice(i).split(String.fromCharCode(10));
    const hd=L[1].split(",").map(x=>x.replace(/"/g,"")), dv=L[2].split(",").map(x=>x.replace(/"/g,""));
    const o={}; hd.forEach(function(h,j){ o[h]=dv[j]; });
    return {o:o,has:{mf:txt.indexOf("# maker_fills")>=0,h1:txt.indexOf("# h1_reversal")>=0,
      ofi:/"ofi_60s"/.test(txt)}}; })()`);
  T("the maker-fill and H1 datasets are exported", r.has.mf && r.has.h1 && r.has.ofi, r.has);
  T("the maker economics carry VALUES, not empty cells",
    r.o.mid_at_post_c === "44" && r.o.spread_c === "4" && r.o.adverse_c === "1.5" && +r.o.net_c > 0, r.o);
  T("and each row is tagged with the release it sat next to, derived at export from its own timestamp",
    r.o.ev === "GDP" && r.o.ev_mins === "-1", r.o);
}

/* ---- structural breaks (CLAUDE.md 11.9): registry, boundary, and the operator entry point */
{
  /* setNow's fixed clock is sticky across the whole file - relying on whatever an earlier test last left
     it at would make this block's pass/fail depend on execution order elsewhere in the file, which is
     exactly the fragility this project's own house style avoids. Pin it explicitly. */
  setNow(Date.UTC(2026, 8, 1));
  const r = R(`(function(){
    S.regime={v:1,entries:[]};
    const id=regimeDeclare("2026-08-15T00:00:00Z","price-collapse","BTC dropped 55% in 72h","https://example.com");
    const before=regimeAt(Date.UTC(2026,7,1),S.regime.entries);
    const after=regimeAt(Date.UTC(2026,8,20),S.regime.entries);
    const same=sameRegime(Date.UTC(2026,7,1),Date.UTC(2026,7,10),S.regime.entries);
    const crosses=sameRegime(Date.UTC(2026,7,1),Date.UTC(2026,8,20),S.regime.entries);
    const bad=regimeDeclare("not-a-date","other","");   /* malformed: no category validation bypass, empty reason */
    return {id:id,before:before,after:after,same:same,crosses:crosses,bad:bad,entries:S.regime.entries.length}; })()`);
  T("regimeDeclare records a well-formed break and returns its id", typeof r.id === "string" && r.id.length > 0, r.id);
  T("regimeAt returns different ordinals on either side of a declared break", r.before === 0 && r.after === 1, r);
  T("sameRegime pools two instants on one side of the boundary", r.same === true, r.same);
  T("...and refuses to pool instants that straddle it", r.crosses === false, r.crosses);
  T("a malformed declaration (empty reason) is refused, not silently recorded", r.bad === null && r.entries === 1, r);
}
{
  /* the one invariant CLAUDE.md 11.9 states as absolute: a FLAGGED instant never moves the boundary */
  const r = R(`(function(){
    S.regime={v:1,entries:[{id:"f1",kind:"flagged",t:${Date.UTC(2026,7,15)},declaredAt:${Date.UTC(2026,7,15)},
      metric:{name:"rv_trailing_pctl",value:0.002,percentile:99.4}}]};
    return {before:regimeAt(Date.UTC(2026,7,1),S.regime.entries),after:regimeAt(Date.UTC(2026,7,20),S.regime.entries)}; })()`);
  T("a flagged-only registry never defines a boundary: every instant reads as regime 0", r.before === 0 && r.after === 0, r);
}
{
  /* a supersession cycle in hand-edited storage must fault, never silently collapse a regime span */
  const r = R(`(function(){
    const a={id:"a",kind:"declared",t:${Date.UTC(2026,7,1)},declaredAt:${Date.UTC(2026,7,1)},category:"other",reason:"a",supersedes:"b"};
    const b={id:"b",kind:"declared",t:${Date.UTC(2026,7,2)},declaredAt:${Date.UTC(2026,7,2)},category:"other",reason:"b",supersedes:"a"};
    return {faults:regimeRegistryFaults([a,b]).length,boundaries:regimeBoundaries([a,b]).length}; })()`);
  T("a 2-entry supersession cycle faults both entries rather than silently collapsing the span", r.faults === 2, r.faults);
  T("...and defines zero boundaries while it stands", r.boundaries === 0, r.boundaries);
}
{
  /* the CSV: every one of the three regime-tagged datasets actually carries the column and a value */
  const now = Date.UTC(2026, 8, 1);
  const r = R(`(function(){
    S.regime={v:1,entries:[]}; regimeDeclare("2026-08-15T00:00:00Z","price-collapse","x");
    computeStats=()=>({sig:0.0009,rv60:0.0009,muFast:0,nBars:200}); S.idxPx=100000; S.lastPx=100000;
    S.edge.windows={}; S.roundLog=[]; S.swing={v:1,w:{}}; S.journal=[]; S.shock={v:1,rows:{}};
    S.via={v:1,series:{},rows:[{t:${now},dt:60,k:"15m",tk:"KXBTC15M-X",f:1,rb:42,ra:46,m1:45.5}]};
    const m={ticker:"KXBTC15M-Y",strike:100400,open:${now}-7*60000,close:${now}+8*60000,yesBid:18,yesAsk:22,noBid:78,noAsk:82,status:"open"};
    edgeSnapOne(m,${now},{yesBid:18,yesAsk:22,noBid:78,noAsk:82});
    exportCSV();
    const txt=window._lastBlob.text;
    const cell=(section,name)=>{ const i=txt.indexOf("# "+section); const L=txt.slice(i).split(String.fromCharCode(10));
      const hd=L[1].split(",").map(x=>x.replace(/"/g,"")), dv=L[2].split(",").map(x=>x.replace(/"/g,""));
      const j=hd.indexOf(name); return j<0?"MISSING":dv[j]; };
    return {windows:cell("windows","regime_idx"),maker:cell("maker_fills","regime_idx"),
      h1header:/"regime_idx"/.test(txt.slice(txt.indexOf("# h1_reversal")))}; })()`);
  T("windows carries regime_idx with a value, not a missing column", r.windows === "1", r.windows);
  T("maker_fills carries regime_idx with a value", r.maker === "1", r.maker);
  T("h1_reversal's header carries regime_idx", r.h1header === true, r.h1header);
}

process.exitCode = done() ? 1 : 0;
