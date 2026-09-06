/* Known-defect reproductions from the 2026-09-06 audit (CLAUDE.md §10). Each case prints REPRODUCED while the defect
   is present and FIXED once it is not. Informational: always exits 0. Run: node test/defects.js */
"use strict";
const { load } = require("./lib/load");

const rows = [];
const D = (id, title, fn) => {
  const p = Promise.resolve().then(fn).catch(e => ({ repro: null, detail: "harness threw: " + String(e && e.stack || e) }));
  rows.push({ id, title, p });
};
const finish = async () => {
  for (const r of rows) Object.assign(r, await r.p);
  for (const r of rows) console.log((r.repro === null ? "  ???        " : r.repro ? "  REPRODUCED " : "  FIXED      ") + r.id + " " + r.title + (r.detail !== undefined ? "\n         " + JSON.stringify(r.detail) : ""));
  const n = rows.filter(r => r.repro).length;
  console.log(`defects: ${n} of ${rows.length} still reproduce`);
};

const NOW = Date.UTC(2026, 8, 6, 14, 0, 3);
const okJson = body => Promise.resolve({ status: 200, ok: true, headers: { get: () => null }, json: async () => body });

D("K1", "the previous window's order book is served as the new window's quote after a roll (index.html:1108, kQuoteFor 1010)", () => {
  const H = load({ fetch: u => okJson(/status=open/.test(String(u)) ? { markets: [{ ticker: "KXBTC15M-B", event_ticker: "E", status: "open", floor_strike: "100000", open_time: new Date(NOW - 3000).toISOString(), close_time: new Date(NOW + 897000).toISOString(), yes_bid_dollars: "0.45", yes_ask_dollars: "0.55", no_bid_dollars: "0.45", no_ask_dollars: "0.55", result: "" }] } : { markets: [] }) });
  H.setNow(NOW);
  return H.R(`(async function(){ S.k.sameOrigin=true; S.k.t0=${NOW}; S.k.lastMkt=0; S.k.lastOb=${NOW}; S.k.lastHour=${NOW}; S.k.lastHourOb=${NOW}; S.k.lastSched=${NOW}; S.k.lastUnopened=${NOW}; S.k.nextSlot=0;
    S.k.cur={ticker:"KXBTC15M-A",strike:99000,open:${NOW}-903000,close:${NOW}-3000,yesBid:98,yesAsk:99,noBid:1,noAsk:2};
    S.k.ob={yesBid:98,yesAsk:99,noBid:1,noAsk:2,depthYes:1,depthNo:1}; S.k.obAt=${NOW}-4000;
    await kalshiTick(${NOW}); const q=kQuoteFor(100000,${NOW}+897000);
    return {repro:!!(q&&q.q>0.9), detail:{cur:S.k.cur.ticker,q:q&&q.q,expected:0.5}}; })()`);
});
D("K2", "an empty or one-sided book passes as a quote and the residual headline collapses (kQuoteFor 1009)", () => {
  const H = load(); H.setNow(NOW);
  const r = H.R(`(function(){ computeStats=()=>({sig:0.00045,rv60:0.00045,muFast:0,nBars:200}); S.idxPx=100000; S.lastPx=100000;
    S.k.cur={ticker:"T",strike:100000,open:${NOW},close:${NOW}+600000,yesBid:0,yesAsk:100,noBid:0,noAsk:100}; S.k.ob=null;
    const q=kQuoteFor(100000,${NOW}+600000); const P=q?strikeProbs({strike:100000,tEnd:${NOW}+600000,quote:q},${NOW}):null;
    return {q,over:P&&P.over}; })()`);
  return { repro: !!(r.q && r.q.spread >= 0.99), detail: { quote: r.q, headline: r.over } };
});
D("E1", "autoBand multiplies z every 1 Hz tick instead of per new resolution (autoBand 1841)", () => {
  const H = load(); H.setNow(NOW);
  const r = H.R(`(function(){ S.xt.stats={1:{n:20,inB:15,sumAbs:0,sumFlat:0,dn:0,dh:0}}; S.xt.pinned=[]; S.auto.z=1.645; const z=[]; for(let i=0;i<20;i++){ xtResolve(${NOW}+i*1000); z.push(+S.auto.z.toFixed(3)); } return z; })()`);
  return { repro: r[19] >= 2.9, detail: { z_after_20_ticks: r[19], path: r.slice(0, 6) } };
});
D("L1", "ledgerSave swallows a storage quota error, so rounds and intervals stop persisting too (ledgerSave 1251)", () => {
  const H = load({ quota: 2000 });
  const r = H.R(`(function(){ S.edge.windows={}; const w={ticker:"KXBTC15M-BIG",strike:1,open:0,close:1,result:null,snaps:[]}; for(let i=0;i<40;i++) w.snaps.push({t:i,tau:i,pm:0.5,qm:50,ya:51,na:50,pa:0.5,pd:0.5,pe:0.5,pf:null,pr:0.5,fit:"fit-2026-09-05-a"}); S.edge.windows[w.ticker]=w;
    S.roundLog=[{tStart:1,tEnd:2,tArm:1,strike:1,call:"ABOVE",outcome:"UP",hit:true}]; S.intervalLog=[{tStart:1,tEnd:2}];
    let threw=null; try{ ledgerSave(); }catch(e){ threw=String(e); } return {threw, keys:Object.keys(localStorage.length!==undefined?{}:{})}; })()`);
  return { repro: r.threw === null && !("btc.rounds" in H.store), detail: { threw: r.threw, stored: Object.keys(H.store) } };
});
D("L2", "edgeProvisional marks provTried before the seed lands, so windows closed while the app was down are never graded (1303)", () => {
  const H = load(); const close = NOW - 120000; H.setNow(NOW);
  const r = H.R(`(function(){ S.idx=[]; S.tape=[]; S.bars=new Map(); S.barKeys=[]; S.edge.windows={W:{ticker:"KXBTC15M-W",strike:100000,open:${close}-900000,close:${close},result:null,snaps:[{t:1,tau:6,pm:0.5,qm:50,ya:51,na:50}]}};
    edgeProvisional(${NOW}); const first={tried:S.edge.windows.W.provTried,result:S.edge.windows.W.result};
    const mk=Math.floor(${close}/60000)-1; S.bars.set(mk,100010); S.barKeys.push(mk); edgeProvisional(${NOW}+1000);
    return {first, after:S.edge.windows.W.result}; })()`);
  return { repro: r.first.tried === true && r.after === null, detail: r };
});
D("R1", "settleRound anchors the settlement average at the tick time, not the gate (1984)", () => {
  const H = load(); const tEnd = NOW; H.setNow(tEnd + 60000);
  const r = H.R(`(function(){ S.idx=[]; for(let t=${tEnd}-60000;t<=${tEnd}+60000;t+=1000) S.idx.push({t,p:t<=${tEnd}?100:200,n:4});
    S.roundLog=[]; S.intervalLog=[]; S.tally={calls:0,hits:0};
    const R={state:"live",tStart:${tEnd}-900000,tEnd:${tEnd},opens:{},openRef:null,settles:{},settledAt:0,strikes:[{id:1,strike:150,call:"BELOW",tArm:1,withdrawn:false,kalshiTicker:"T",outcome:null,hit:null}]};
    settleRound(R,${tEnd}+60000); return {outcome:R.strikes[0].outcome,hit:R.strikes[0].hit,atGate:tapeSettleAvg(${tEnd}).avg}; })()`);
  return { repro: r.outcome === "UP", detail: r };
});
D("R2", "the WINDOW SETTLED banner colours by price direction, not by whether the call hit (showVerdict 2044)", () => {
  const H = load();
  const r = H.R(`(function(){ const R={tEnd:${NOW},strikes:[{call:"BELOW",outcome:"DOWN",hit:true,withdrawn:false}]}; showVerdict(R); const v=document.getElementById("verdict"); return {cls:v.className,text:v.textContent}; })()`);
  return { repro: /down/.test(r.cls), detail: r };
});
D("R3", "clicking ABOVE/BELOW syncs the quote box to the previously selected side (listener order 2680 vs 2687)", () => {
  const H = load();
  const r = H.R(`(function(){ S.k.ob={yesBid:60,yesAsk:62,noBid:38,noAsk:40}; S.k.quoteManual=false; S.callSel="ABOVE"; kSyncQuote(); const before=document.getElementById("quoteIn").value;
    document.getElementById("callBelow").dispatch("click"); return {before, after:document.getElementById("quoteIn").value, sel:S.callSel}; })()`);
  return { repro: r.sel === "BELOW" && r.after === "62.0", detail: { ...r, expected: "40.0" } };
});
D("R4", "the arm-time headline ignores the Kalshi quote (armRound 1960: fit 'fallback-3' instead of the residual)", () => {
  const H = load(); H.setNow(NOW + 60000);
  const r = H.R(`(function(){ computeStats=()=>({sig:0.00045,rv60:0.00045,muFast:0,nBars:200}); S.idxPx=100000; S.lastPx=100000; S.callSel="ABOVE";
    const nb=nextBoundary(${NOW}+60000); S.k.cur={ticker:"T",strike:100000,open:nb-900000,close:nb,yesBid:48,yesAsk:52,noBid:48,noAsk:52}; S.k.ob={yesBid:48,yesAsk:52,noBid:48,noAsk:52};
    document.getElementById("strikeIn").value="100000"; document.getElementById("quoteIn").value="52"; armRound(); const sk=S.round&&S.round.strikes[0];
    return {fitAtArm:sk&&sk.prob&&sk.prob.fit, quoteFound:!!kQuoteFor(100000,nb)}; })()`);
  return { repro: r.quoteFound && r.fitAtArm === "fallback-3", detail: r };
});
D("S1", "the trail arm's 50% stop sits inside a normal cheap-side spread and fires on the first poll (simUpdate 1618)", () => {
  const H = load(); H.setNow(NOW);
  const r = H.R(`(function(){ S.journal=[]; S.simBank={}; jLoad(); const e={ticker:"T",side:"YES",strike:1,close:${NOW}+600000,reads:[],graded:false,hit:null};
    const read={t:${NOW},tau:10,ask:0.05,p:0.5,base:0.05,be:0.16,ofi:null,maxAfter:0}; e.reads.push(read); simEnter(e,read,"T|YES");
    simUpdate(e,0.02,${NOW}+1000); const t=e.sim["all/trail"]; return {open:t.open,reason:t.reason,exit:t.exit}; })()`);
  return { repro: r.open === false && r.reason === "stop", detail: r };
});
D("S2", "swingSave prunes by string order; month abbreviations in tickers delete the newest entries at a month boundary (1528)", () => {
  const H = load();
  const r = H.R(`(function(){ S.swing={v:1,w:{}}; for(let d=1;d<=400;d++) S.swing.w["KXBTC15M-26SEP"+String(d).padStart(2,"0")+"T0000|YES"]={ticker:"x",reads:[],graded:true};
    S.swing.w["KXBTC15M-26OCT01T0000|YES"]={ticker:"live",reads:[],graded:false,sim:{"all/box":{open:true}}}; swingSave();
    return {octSurvives:"KXBTC15M-26OCT01T0000|YES" in S.swing.w, n:Object.keys(S.swing.w).length}; })()`);
  return { repro: r.octSurvives === false, detail: r };
});
D("S3", "no bankruptcy floor: a busted arm keeps trading on a $1 stake and the bankroll goes negative (simEnter 1597)", () => {
  const H = load(); H.setNow(NOW);
  const r = H.R(`(function(){ S.journal=[]; S.simBank={}; jLoad(); S.simBank["all/box"].bank=0.40; const e={ticker:"T",side:"YES",strike:1,close:${NOW}+600000,reads:[],graded:false,hit:null,lastBid:0};
    const read={t:${NOW},tau:10,ask:0.05,p:0.5,base:0.05,be:0.16,ofi:null,maxAfter:0}; e.reads.push(read); simEnter(e,read,"T|YES"); const sh=e.sim["all/box"].shares; simClose(e); return {shares:sh,bank:S.simBank["all/box"].bank}; })()`);
  return { repro: r.shares > 0 && r.bank < 0, detail: r };
});
D("N1", "a print with zero fresh CF peers is accepted unverified and becomes the leader (acceptPrint 790)", () => {
  const H = load(); H.setNow(NOW);
  const r = H.R(`(function(){ for(const id of Object.keys(S.src)){ S.src[id].price=null; S.src[id].t=0; } S.src.coinbase.price=100000; S.src.coinbase.t=${NOW}-11000; S.tape=[]; S.leader=null; S.lastPx=null;
    acceptPrint("binanceus",105000,${NOW}); return {leader:S.leader,tape:S.tape.length,lastPx:S.lastPx}; })()`);
  return { repro: r.leader === "binanceus" && r.tape === 1, detail: r };
});
D("N2", "WebSocket reconnect delay never resets after a healthy session (connectWS 700, scheduleWS 704)", () => {
  const H = load();
  const r = H.R(`(function(){ const delays=[]; setTimeout=(fn,ms)=>{ delays.push(ms); return 0; }; const f=WSFEEDS[0]; let attempt=0;
    for(let i=0;i<6;i++){ connectWS(f,attempt); const st=S.src[f.id]; st.sock.onmessage({data:"{}"}); st.sock.onclose(); attempt=i+1; }
    return delays; })()`);
  return { repro: r[r.length - 1] === 30000, detail: r };
});
D("N3", "after a 9 s timeout the failover fetch reuses the aborted signal and fails instantly (kGet 1062)", () => {
  const calls = [];
  const H = load({ fetch: (u, init) => { calls.push(String(u)); if (init && init.signal && init.signal.aborted) { const e = new Error("aborted"); e.name = "AbortError"; return Promise.reject(e); } return okJson({ markets: [] }); } });
  return H.R(`(async function(){ S.cfg.kproxy="https://relay.example"; S.k.sameOrigin=true; S.k.nextSlot=0;
    const real=setTimeout; setTimeout=(fn,ms)=>{ if(ms>=9000){ fn(); return 0; } return real(fn,ms); };
    let err=null; try{ await kGet("/markets?series_ticker=KXBTC15M&status=open&limit=1"); }catch(e){ err=e.name; }
    setTimeout=real; return {repro:err==="AbortError", detail:{err, trail:S.k.reqTrail.map(t=>t.outcome+"@"+t.base)}}; })()`);
});
D("N4", "a settled result is dropped from the schedule when an unopened stub for the same ticker is already present (kalshiTick 1137)", () => {
  const H = load({ fetch: u => okJson(/status=settled/.test(String(u)) ? { markets: [{ ticker: "KXBTC15M-X", event_ticker: "E", status: "finalized", floor_strike: "100000", open_time: new Date(NOW - 1800000).toISOString(), close_time: new Date(NOW - 900000).toISOString(), result: "yes", expiration_value: "100010" }] } : { markets: [] }) });
  H.setNow(NOW);
  return H.R(`(async function(){ S.k.sameOrigin=true; S.k.t0=${NOW}; S.k.lastMkt=${NOW}; S.k.lastOb=${NOW}; S.k.lastHour=${NOW}; S.k.lastHourOb=${NOW}; S.k.lastSched=${NOW}-700000; S.k.lastUnopened=${NOW}; S.k.nextSlot=0; S.k.hour=[];
    S.k.cur={ticker:"KXBTC15M-Y",strike:100000,open:${NOW},close:${NOW}+900000}; S.k.ob={yesBid:48,yesAsk:52,noBid:48,noAsk:52};
    S.k.sched=[{ticker:"KXBTC15M-X",status:"unopened",result:"",strike:100000,open:${NOW}-1800000,close:${NOW}-900000}];
    await kalshiTick(${NOW}); const x=S.k.sched.find(m=>m.ticker==="KXBTC15M-X"); return {repro:!(x&&x.result==="yes"), detail:{result:x&&x.result,status:x&&x.status}}; })()`);
});

finish();
