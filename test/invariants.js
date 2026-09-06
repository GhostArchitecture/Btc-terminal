/* Invariants: the CLAUDE.md claims that hold in the current build, asserted against the live script.
   Run: node test/invariants.js   (or npm test for the whole suite) */
"use strict";
const { load, runner } = require("./lib/load");

const H = load();
const { R, $, store, setNow } = H;
const { T, done } = runner("invariants");

/* ---- constants and calibration spine (§3, §4) */
{
  const c = R(`({FIT:FIT_VERSION, SEAS, TERM, CF:CF_CONST, VR:VERDICT_RULE, VH:VIA_HIST, SIM, SWING, SB:SWING_BASE, MAKER:MAKER_RATE, ARMS:SIM_ARMS.map(a=>a.id)})`);
  T("fit tag is fit-2026-09-05-a", c.FIT === "fit-2026-09-05-a", c.FIT);
  T("SEAS has 24 hourly entries, peak at 14 UTC, ~2x swing", c.SEAS.length === 24 && c.SEAS.indexOf(Math.max(...c.SEAS)) === 14 && Math.max(...c.SEAS) / Math.min(...c.SEAS) > 2, c.SEAS);
  T("TERM is flat to 6 min and rises to +8.9% at 12 min", c.TERM[1][1] === 1 && Math.abs(c.TERM[4][1] - 1.089) < 1e-9, c.TERM);
  T("residual coefficients frozen: 0.072 + 0.909·logit(q) − 0.233·x/σ√τ − 5.023·spread", /0\.072\+0\.909\*lq-0\.233\*xs-5\.023\*spr/.test(H.script));
  T("CF constituents: coinbase, kraken, bitstamp, gemini", JSON.stringify(c.CF) === JSON.stringify(["coinbase", "kraken", "bitstamp", "gemini"]), c.CF);
  T("VERDICT_RULE frozen", JSON.stringify(c.VR) === JSON.stringify({ minWindows: 200, brierCI: 0.9, bandMinN: 30, bandMargin: 3, pnlMinN: 100, pnlDays: 2 }), c.VR);
  T("VIA_HIST nets −1.63¢ (15m) and −2.18¢ (hourly)", Math.abs((c.VH["15m"].spread - c.VH["15m"].adv - c.VH["15m"].fee) + 1.63) < 1e-9 && Math.abs((c.VH.hourly.spread - c.VH.hourly.adv - c.VH.hourly.fee) + 2.18) < 1e-9, c.VH);
  T("SIM: $1,000 banks, 5% risk, ≤9¢ aggressive, trail 2.5×/25%/50%, time-stop 1.5 min", c.SIM.bank0 === 1000 && c.SIM.risk === 0.05 && c.SIM.aggressiveMax === 0.09 && c.SIM.trailArm === 2.5 && c.SIM.trailPull === 0.25 && c.SIM.stop === 0.5 && c.SIM.timeStop === 1.5, c.SIM);
  T("SIM: ten arms = five entries × {box, trail}", c.ARMS.length === 10 && c.ARMS.every(id => /\/(box|trail)$/.test(id)), c.ARMS);
  T("SWING: 600 paths, fair-value target 36¢ for a 35¢ payout, cheap ≤15¢", c.SWING.paths === 600 && c.SWING.target === 0.36 && c.SWING.payout === 0.35 && c.SWING.cheapMax === 0.15, c.SWING);
  T("SWING_BASE is monotone in ask", c.SB.every((r, i) => i === 0 || (r[0] > c.SB[i - 1][0] && r[1] >= c.SB[i - 1][1])), c.SB);
}

/* ---- fees (§4, §7.5): taker fee rounded up to the cent per contract */
{
  const f = R(`[kFee(0.5), kFee(0.10), kFee(0.09), kFee(0.01)]`);
  T("kFee rounds up per contract: 50¢→2¢, 10¢→1¢, 9¢→1¢, 1¢→1¢", JSON.stringify(f) === JSON.stringify([0.02, 0.01, 0.01, 0.01]), f);
}

/* ---- index proxy (§2): median of fresh constituents, tape fallback flagged */
{
  const now = Date.UTC(2026, 8, 6, 14, 7, 0); setNow(now);
  const r = R(`(function(){
    const set=(id,p,age)=>{ S.src[id].price=p; S.src[id].t=${now}-age; };
    for(const id of Object.keys(S.src)){ S.src[id].price=null; S.src[id].t=0; }
    S.lastPx=100500;
    set("coinbase",100000,100); set("kraken",100100,100); set("bitstamp",100050,100); set("gemini",100200,100); set("binanceus",99000,100);
    const four=indexProxy(${now});
    S.src.gemini.t=${now}-20000; const three=indexProxy(${now});
    S.src.bitstamp.t=${now}-20000; const two=indexProxy(${now});
    S.src.kraken.t=${now}-20000; const one=indexProxy(${now});
    return {four,three,two,one}; })()`);
  T("4 fresh constituents → median of the middle two (non-constituent ignored)", r.four.p === 100075 && r.four.n === 4 && !r.four.fallback, r.four);
  T("3 fresh → the middle one", r.three.p === 100050 && r.three.n === 3, r.three);
  T("2 fresh → mean of the two", r.two.p === 100050 && r.two.n === 2, r.two);
  T("<2 fresh → falls back to the tape and says so", r.one.fallback === true && r.one.p === 100500 && r.one.n === 1, r.one);
}

/* ---- peer-verified tape (§2): tolerance 3× dispersion, floored 6 bp, capped 15 bp; outliers demote the leader */
{
  const now = Date.UTC(2026, 8, 6, 14, 7, 0); setNow(now);
  const r = R(`(function(){
    const set=(id,p)=>{ S.src[id].price=p; S.src[id].t=${now}; S.src[id].status="ok"; };
    const bp=x=>100000*Math.exp(x/1e4);
    for(const id of Object.keys(S.src)){ S.src[id].price=null; S.src[id].t=0; }
    S.tape=[]; S.leader=null; S.lastPx=null;
    set("coinbase",bp(0)); set("kraken",bp(0.5)); set("bitstamp",bp(1)); set("gemini",bp(0.8));   /* dispersion ~1 bp → tol floors at 6 bp */
    acceptPrint("coinbase",bp(0),${now}); const leader0=S.leader;
    /* peers sit at 0.5/0.8/1 bp: a 7.5 bp print is 6.5 bp from the nearest peer (> 6 bp floor); 6.9 bp is 5.9 from it (accepted) */
    acceptPrint("coinbase",bp(7.5),${now}+300); const afterOutlier={status:S.src.coinbase.status,leader:S.leader,tape:S.tape.length};
    S.src.coinbase.status="ok"; acceptPrint("kraken",bp(6.9),${now}+600); const accepted={leader:S.leader,tape:S.tape.length,last:S.tape[S.tape.length-1].src};
    /* dispersion 6 bp → tol 15 (cap): 14 bp accepted, 16.5 rejected */
    set("coinbase",bp(0)); set("kraken",bp(2)); set("bitstamp",bp(6)); set("gemini",bp(4));
    acceptPrint("bitstamp",bp(14),${now}+1000); const wide=S.src.bitstamp.status;
    acceptPrint("bitstamp",bp(16.5),${now}+1300); const tooWide=S.src.bitstamp.status;
    return {leader0,afterOutlier,accepted,wide,tooWide}; })()`);
  T("first confirmed print takes leadership", r.leader0 === "coinbase", r.leader0);
  T("print 6.5 bp beyond the nearest peer → outlier, leader demoted, not plotted", r.afterOutlier.status === "outlier" && r.afterOutlier.leader === null && r.afterOutlier.tape === 1, r.afterOutlier);
  T("print 5.9 bp from a peer accepted and a new leader elected", r.accepted.leader === "kraken" && r.accepted.tape === 2 && r.accepted.last === "kraken", r.accepted);
  T("tolerance capped at 15 bp: 14 bp ok, 16.5 bp outlier", r.wide === "ok" && r.tooWide === "outlier", { wide: r.wide, tooWide: r.tooWide });
}

/* ---- Kalshi client (§2): query-class routing, per-class backoff, circuit breaker */
{
  const r = R(`(function(){
    S.cfg.kproxy="https://relay.example"; S.k.sameOrigin=true; S.k.bench={};
    const hist=kBases("/markets?series_ticker=KXBTC15M&status=settled&limit=40");
    const live=kBases("/markets?series_ticker=KXBTC15M&status=open&limit=1");
    kNetFail("/api"); kNetFail("/api"); const twoFails=kBases("/markets?status=open")[0];
    kNetFail("/api"); const benched=kBases("/markets?status=open");
    kNetFail("https://relay.example"); kNetFail("https://relay.example"); kNetFail("https://relay.example"); const both=kBases("/markets?status=open");
    S.k.bench={}; kNetFail("/api"); kNetFail("/api"); kNetOk("/api"); kNetFail("/api"); const afterOk=kBases("/markets?status=open")[0];
    S.k.bench={}; S.cfg.kproxy="";
    return {hist,live,twoFails,benched,both,afterOk}; })()`);
  T("history queries route relay-first, live queries same-origin-first", r.hist[0] === "https://relay.example" && r.hist[1] === "/api" && r.live[0] === "/api" && r.live[1] === "https://relay.example", r);
  T("circuit breaker: two failures keep the pool, the third benches it for the other pool", r.twoFails === "/api" && r.benched[0] === "https://relay.example" && r.benched.length === 1, r);
  T("both pools benched → still returns routes (never 'no base')", r.both.length === 2, r.both);
  T("kNetOk resets the failure count", r.afterOk === "/api", r.afterOk);
}
{
  /* per-class backoff: a history backoff must not stall a live request */
  const all = [];
  const H2 = load({ fetch: (u) => { all.push(String(u)); return Promise.resolve({ status: 200, ok: true, headers: { get: () => null }, json: async () => ({ markets: [] }) }); } });
  const api = () => all.filter(u => u.startsWith("/api")).length;
  const base = api();                                                        /* init already probed /api once; seed() fetches Kraken/Bitstamp */
  const calls = { get length() { return api() - base; } };
  const out = H2.R(`(async function(){
    S.k.sameOrigin=true; S.k.backoff={history:Date.now()+60000}; S.k.nextSlot=0;
    let histErr=null; try{ await kGet("/markets?series_ticker=KXBTC15M&status=settled&limit=40"); }catch(e){ histErr=String(e.message); }
    S.k.nextSlot=0; const live=await kGet("/markets?series_ticker=KXBTC15M&status=open&limit=1");
    S.k.nextSlot=0; const book=await kGet("/markets/X/orderbook?depth=5");
    return {histErr, live:!!live, book:!!book, trail:S.k.reqTrail.map(t=>t.cls+":"+t.outcome+"@"+t.base)}; })()`);
  out.then(o => {
    T("history backoff rejects the history query only", /^history backoff/.test(o.histErr), o.histErr);
    T("live and book queries still go out during a history backoff", o.live && o.book && calls.length === 2, { calls: all, trail: o.trail });
    T("request trail records class, outcome and base, newest first", o.trail[0] === "book:200@/api" && o.trail[1] === "live:200@/api", o.trail);
    part2();
  }).catch(e => { T("kGet harness ran", false, String(e && e.stack)); part2(); });
}

function part2() {
  /* ---- engine (§3): headline policy, clipping, units */
  {
    const now = Date.UTC(2026, 8, 6, 14, 7, 0); setNow(now);
    const r = R(`(function(){
      computeStats=()=>({sig:0.00045,rv60:0.00045,muFast:0,nBars:200}); S.idxPx=100000; S.lastPx=100000; S.sig=null;
      const tEnd=${now}+8*60000;
      const withQ=strikeProbs({strike:100000,tEnd,quote:{q:0.55,spread:0.02}},${now});
      const noQ=strikeProbs({strike:100000,tEnd},${now});
      const far=strikeProbs({strike:130000,tEnd},${now});
      const near=strikeProbs({strike:70000,tEnd},${now});
      const sigNow=calSigma(computeStats(),${now},tEnd);
      return {withQ:{fit:withQ.fit,over:withQ.over,res:withQ.res,flo:withQ.flo},noQ:{fit:noQ.fit,over:noQ.over,res:noQ.res},far:far.over,near:near.over,sigNow}; })()`);
    T("with a Kalshi quote the headline is the residual estimator", r.withQ.fit === "fit-2026-09-05-a" && r.withQ.over === r.withQ.res, r.withQ);
    T("flow is a comparator only (never the headline)", r.withQ.flo === null || r.withQ.over !== r.withQ.flo, r.withQ);
    T("without a quote the headline is the fallback median", r.noQ.fit === "fallback-3" && r.noQ.res === null, r.noQ);
    T("probabilities clipped to [0.5%, 99.5%]", r.far === 0.005 && r.near === 0.995, { far: r.far, near: r.near });
    T("σ within one hour = rv60 × term factor (seasonal ratio is 1 inside the hour)", Math.abs(r.sigNow - 0.00045 * 1.014) < 1e-9, r.sigNow);
  }

  /* ---- ledgers (§4): one observation per window; refSnap at τ≈6; series split; provisional overwritten by official */
  {
    const r = R(`(function(){
      const w={ticker:"KXBTC15M-T",strike:1,open:0,close:15*60000,result:"yes",snaps:[]};
      for(let tau=14;tau>=1;tau--) w.snaps.push({t:(15-tau)*60000,tau,pm:0.6,qm:50,ya:52,na:50,pr:0.6,pa:0.5,pd:0.5,pe:null,pf:null,fit:"x"});
      const ref=refSnap(w).tau;
      const st=edgeStatsOn([w]);
      S.edge.windows={};
      S.edge.windows["KXBTC15M-A"]=Object.assign({},w,{ticker:"KXBTC15M-A"});
      S.edge.windows["KXBTCD-B"]=Object.assign({},w,{ticker:"KXBTCD-B",result:"no"});
      const s15=edgeStatsFor("15m"), sH=edgeStatsFor("hourly"), sAll=edgeStatsFor("all");
      /* provisional → official */
      const p=S.edge.windows["KXBTC15M-A"]; p.result="no"; p.provisional=true; p.provSrc="index";
      S.k.sched=[{ticker:"KXBTC15M-A",result:"yes",expVal:1.5}];
      edgeGrade();
      return {ref,nWin:st.nWin,nSnap:st.nSnap,headlineN:st.skill.headline.n,s15:s15.nWin,sH:sH.nWin,sAll:sAll.nWin,after:{result:p.result,prov:p.provisional,provResult:p.provResult,agree:p.agree,expVal:p.expVal}}; })()`);
    T("refSnap picks the read at τ≈6 min", r.ref === 6, r.ref);
    T("edge stats score one observation per window, never per snapshot", r.nWin === 1 && r.nSnap === 1 && r.headlineN === 1, r);
    T("15-minute and hourly series are scored separately", r.s15 === 1 && r.sH === 1 && r.sAll === 2, r);
    T("official result overwrites a provisional grade and keeps the provisional on record", r.after.result === "yes" && r.after.prov === false && r.after.provResult === "no" && r.after.agree === false && r.after.expVal === 1.5, r.after);
  }

  /* ---- verdict (§4): empty ledger reads NOT READY; bootstrap CI brackets the point */
  {
    const r = R(`(function(){ S.edge.windows={}; const V=computeVerdict(); const ci=bootstrapCI([1,2,3,4,5,6,7,8,9,10],a=>a.reduce((x,y)=>x+y,0)/a.length,0.9,400); return {ready:V.ready,n:V.crit.length,names:V.crit.map(c=>c.name),ci}; })()`);
    T("verdict has the four pre-registered criteria and reads NOT READY on an empty ledger", r.ready === false && r.n === 4, r.names);
    T("bootstrapCI: lo ≤ point ≤ hi", r.ci.lo <= r.ci.point && r.ci.point <= r.ci.hi && r.ci.point === 5.5, r.ci);
  }

  /* ---- rounds (§4, §5): the grade keys to the call; withdrawals log WITHDRAWN; official result reconciles */
  {
    const tEnd = Date.UTC(2026, 8, 6, 14, 15, 0); setNow(tEnd);
    const truth = R(`(function(){
      const out=[];
      for(const call of ["ABOVE","BELOW"]) for(const settle of [200,100]){
        S.idx=[]; for(let t=${tEnd}-60000;t<=${tEnd};t+=1000) S.idx.push({t,p:settle,n:4});
        S.roundLog=[]; S.intervalLog=[]; S.tally={calls:0,hits:0};
        const R={state:"live",tStart:${tEnd}-900000,tEnd:${tEnd},opens:{},openRef:null,settles:{},settledAt:0,
          strikes:[{id:1,strike:150,call,tArm:${tEnd}-600000,probAtArm:null,prob:null,probFinal:null,outcome:null,hit:null,withdrawn:false,kalshiTicker:"KXBTC15M-T"}]};
        settleRound(R,${tEnd});
        out.push({call,settle,outcome:R.strikes[0].outcome,hit:R.strikes[0].hit,logged:S.roundLog.length,provisional:S.roundLog[0].provisional});
      }
      return out; })()`);
    T("ABOVE + settle above strike → UP / HIT", truth[0].outcome === "UP" && truth[0].hit === true, truth[0]);
    T("ABOVE + settle below strike → DOWN / MISS", truth[1].outcome === "DOWN" && truth[1].hit === false, truth[1]);
    T("BELOW + settle above strike → UP / MISS", truth[2].outcome === "UP" && truth[2].hit === false, truth[2]);
    T("BELOW + settle below strike → DOWN / HIT", truth[3].outcome === "DOWN" && truth[3].hit === true, truth[3]);
    T("every settled call is logged as provisional (index proxy) pending Kalshi", truth.every(x => x.logged === 1 && x.provisional === true), truth);
    const wd = R(`(function(){ S.roundLog=[]; S.round={state:"live",tStart:${tEnd}-900000,tEnd:${tEnd},strikes:[{id:9,strike:150,call:"ABOVE",tArm:1,withdrawn:false,outcome:null}],settles:{},opens:{}};
      withdrawStrike(9); return {outcome:S.roundLog[0]&&S.roundLog[0].outcome,flag:S.round.strikes[0].withdrawn,rows:S.roundLog.length}; })()`);
    T("withdrawal logs a WITHDRAWN row and keeps the strike on record", wd.outcome === "WITHDRAWN" && wd.flag === true && wd.rows === 1, wd);
    const rc = R(`(function(){ S.roundLog=[{tStart:1,tEnd:${tEnd},tArm:1,strike:150,call:"BELOW",outcome:"UP",hit:false,kalshiTicker:"KXBTC15M-T",provisional:true}];
      S.k.sched=[{ticker:"KXBTC15M-T",result:"no",strike:150,expVal:149.5,close:${tEnd}}]; S.edge.windows={}; kReconcile();
      return {outcome:S.roundLog[0].outcome,hit:S.roundLog[0].hit,prov:S.roundLog[0].provisional,tally:S.tally,kalshi:S.roundLog[0].kalshi}; })()`);
    T("Kalshi's official result overrides a provisional round grade and retallies", rc.outcome === "DOWN" && rc.hit === true && rc.prov === false && rc.tally.hits === 1, rc);
  }

  /* ---- swing (§4): touch probability sane and stable within a second; verified needs n≥30 beating the base */
  {
    const now = Date.UTC(2026, 8, 6, 14, 5, 0), close = now + 10 * 60000; setNow(now);
    const r = R(`(function(){
      computeStats=()=>({sig:0.00045,rv60:0.00045,muFast:0,nBars:200}); S.idxPx=100000;
      const a=touchProb(100000,${close},"YES",${now}), b=touchProb(100000,${close},"YES",${now});
      const far=touchProb(150000,${close},"YES",${now}); const late=touchProb(100000,${now}+5000,"YES",${now});
      const mk=(n,good)=>{ S.swing={v:1,w:{}}; for(let i=0;i<n;i++){ const hit=i%2; S.swing.w["T"+i+"|YES"]={ticker:"T"+i,side:"YES",graded:true,reads:[{p:good?(hit?0.9:0.1):(hit?0.1:0.9),base:0.5,hit,ask:0.05,ofi:null}]}; } return swingStats().verified; };
      return {a,b,far,late,v29:mk(29,true),v30:mk(30,true),v30bad:mk(30,false)}; })()`);
    T("touchProb ∈ [0,1], deterministic within the same second", r.a >= 0 && r.a <= 1 && r.a === r.b, { a: r.a, b: r.b });
    T("touchProb: far strike → ~0; inside 15 s of the gate → null", r.far < 0.02 && r.late === null, { far: r.far, late: r.late });
    T("swing 'verified' requires ≥30 graded reads with model Brier below the base rate", r.v29 === false && r.v30 === true && r.v30bad === false, r);
  }

  /* ---- journal persistence shape and CSV export (§4) */
  {
    const r = R(`(function(){ S.journal=[]; S.simBank={}; jLoad(); jSave(); const j=JSON.parse(localStorage.getItem("btc.journal"));
      S.edge.windows={}; S.roundLog=[]; S.swing={v:1,w:{}}; S.journal=[]; exportCSV();
      const text=window._lastBlob.text; const a=document.body.children[document.body.children.length-1];
      return {v:j.v,keys:Object.keys(j),banks:Object.keys(j.bank).length,sections:(text.match(/^# (\\w+)$/mg)||[]),download:a&&a.download}; })()`);
    T("journal persists as {v:3, t, bank} with ten arm bankrolls", r.v === 3 && JSON.stringify(r.keys) === JSON.stringify(["v", "t", "bank"]) && r.banks === 10, r);
    T("CSV export carries four datasets and a .csv filename", r.sections.length === 4 && /\.csv$/.test(r.download), r);
  }

  /* ---- ledger repair (§10.3 K1): phantom rows are marked and excluded, never deleted; the pass is idempotent */
  {
    const r = R(`(function(){
      localStorage.removeItem("btc.repair"); S.repair=null;
      /* one phantom read (13.9 min left on a 3c side the model calls a 96% touch) and one genuine one (2 min left, 5c, 12%) */
      S.swing={v:1,w:{
        "KXBTC15M-P|NO":{ticker:"KXBTC15M-P",side:"NO",strike:100000,close:1,graded:true,hit:true,
          reads:[{t:1,tau:13.9,ask:0.03,p:0.963,base:0.024,be:0.16,ofi:null,maxAfter:0.48,hit:1},
                 {t:2,tau:6.0,ask:0.05,p:0.30,base:0.042,be:0.16,ofi:null,maxAfter:0.10,hit:0}],
          sim:{"all/box":{arm:"all/box",tau:13.9,entry:0.03,p:0.963,open:false,pnl:503.2}}},
        "KXBTC15M-G|YES":{ticker:"KXBTC15M-G",side:"YES",strike:100000,close:1,graded:true,hit:false,
          reads:[{t:3,tau:2.0,ask:0.05,p:0.12,base:0.042,be:0.16,ofi:null,maxAfter:0.08,hit:0}],sim:{}}}};
      localStorage.removeItem("btc.journal"); S.journal=[]; S.simBank={}; jLoad();   /* jLoad reloads from storage, so seed the fixture after it */
      S.journal=[{arm:"all/box",tau:13.9,entry:0.03,p:0.963,base:0.024,be:0.16,pnl:503.2,pnlShare:30.2,ticker:"KXBTC15M-P",side:"NO",reason:"target",hit:true},
                 {arm:"all/box",tau:6.0,entry:0.05,p:0.30,base:0.042,be:0.16,pnl:-5.0,pnlShare:-5.0,ticker:"KXBTC15M-G",side:"YES",reason:"gate",hit:false}];
      S.simBank["all/box"].bank=1498.20;
      S.edge.windows={"KXBTC15M-P":{ticker:"KXBTC15M-P",strike:1,open:0,close:1,result:"yes",
        snaps:[{t:1,tau:14.5,pm:0.5,qm:98,ya:99,na:2},{t:2,tau:6,pm:0.5,qm:50,ya:52,na:50}]}};
      S.via={v:1,series:{"15m":{posts:9,fills:1,spread:2,adv:-48,fee:0.07,flow:{with:{n:0,adv:0},against:{n:0,adv:0},none:{n:1,adv:-48}}}}};
      const first=repairLedgers();
      const readsKept=S.swing.w["KXBTC15M-P|NO"].reads.length, journalKept=S.journal.length;
      const bankAfter=S.simBank["all/box"].bank, contaminated=S.simBank["all/box"].contaminated;
      const genuineFlagged=!!S.swing.w["KXBTC15M-G|YES"].reads[0].phantom;
      const scored=refSnap(S.edge.windows["KXBTC15M-P"]);
      const second=repairLedgers(); const bankTwice=S.simBank["all/box"].bank;
      return {first,readsKept,journalKept,bankAfter,contaminated,genuineFlagged,scoredTau:scored&&scored.tau,
        viaReset:Object.keys(S.via.series).length,viaKept:!!(first.via&&first.via["15m"]),repeated:second.t===first.t,bankTwice,
        jStats:journalStats()["all/box"],sStats:swingStats()}; })()`);
    T("the phantom read, its sim position, its journal row and the stale-quote snap are all marked", r.first.swingReads === 1 && r.first.simTrades === 1 && r.first.journalRows === 1 && r.first.edgeSnaps === 1, r.first);
    T("nothing is deleted — every row is still on the record", r.readsKept === 2 && r.journalKept === 2, r);
    T("a genuine cheap read late in the window is not flagged", r.genuineFlagged === false, r);
    T("the phantom's P&L is withdrawn from its arm bank and the arm is marked contaminated", r.bankAfter === 995 && r.contaminated === true, { bank: r.bankAfter, contaminated: r.contaminated });
    /* the withdrawal must never be the thing that retires an arm: an under-water result is an artifact of sizing
       against money the arm never had, so a contaminated arm restarts rather than tripping the bankruptcy floor */
    const under = R(`(function(){
      localStorage.removeItem("btc.repair"); localStorage.removeItem("btc.journal"); S.repair=null; S.journal=[]; S.simBank={}; jLoad(); S.swing={v:1,w:{}};
      S.journal=[{arm:"all/box",tau:14.2,entry:0.03,p:0.96,base:0.024,be:0.16,pnl:900,pnlShare:30,ticker:"T",side:"NO",reason:"target",hit:true},
                 {arm:"all/box",tau:6,entry:0.06,p:0.2,base:0.042,be:0.16,pnl:-400,pnlShare:-9,ticker:"U",side:"YES",reason:"gate",hit:false}];
      S.simBank["all/box"].bank=850;    /* 1000 + 900 phantom - 1050 of real losses: withdrawing the phantom leaves it under water */
      const rep=repairLedgers(); const B=S.simBank["all/box"];
      /* would the arm still take a new position? */
      const e={ticker:"V",side:"YES",strike:1,close:${Date.UTC(2026,8,6,14,0,0)}+600000,reads:[],graded:false,hit:null};
      const read={t:1,tau:10,ask:0.05,p:0.5,base:0.05,be:0.16,ofi:null,maxAfter:0}; e.reads.push(read); simEnter(e,read,"V|YES",0.03);
      return {bank:B.bank,restarted:!!B.restarted,contaminated:!!B.contaminated,rec:rep.banks["all/box"],stillTrades:!!(e.sim&&e.sim["all/box"])}; })()`);
    T("a withdrawal that would leave an arm under water restarts it instead of retiring it", under.bank === 1000 && under.restarted === true && under.contaminated === true && under.stillTrades === true, under);
    T("the restart records what the bank was and what was removed", under.rec && under.rec.was === 850 && under.rec.removed === 900 && under.rec.restarted === true, under.rec);
    /* only the bad ROW drops out: the affected window-side keeps scoring its remaining clean reads */
    T("stats exclude the flagged rows and keep the clean ones", r.jStats.n === 1 && r.jStats.total === -5 && r.sStats.n === 2, { journal: r.jStats.n, total: r.jStats.total, swingSides: r.sStats.n });
    T("refSnap skips a flagged snapshot and scores the clean one", r.scoredTau === 6, r.scoredTau);
    T("viability counters are reset but preserved in the repair record", r.viaReset === 0 && r.viaKept === true, r);
    T("the repair is versioned and idempotent — a second pass moves no bank", r.repeated === true && r.bankTwice === 995, { repeated: r.repeated, bank: r.bankTwice });
    /* a phantom position still OPEN when the repair runs must not re-book its fabricated P&L when the gate closes it */
    const open = R(`(function(){
      localStorage.removeItem("btc.repair"); localStorage.removeItem("btc.journal"); S.repair=null; S.journal=[]; S.simBank={}; jLoad();
      S.swing={v:1,w:{"KXBTC15M-O|NO":{ticker:"KXBTC15M-O",side:"NO",strike:100000,close:2,graded:false,hit:null,lastBid:0.35,
        reads:[{t:1,tau:14.2,ask:0.03,p:0.96,base:0.024,be:0.16,ofi:null,maxAfter:0.35}],
        sim:{"all/box":{arm:"all/box",exitRule:"box",tIn:1,tau:14.2,entry:0.03,entryBid:0.02,shares:1666,stake:49.98,p:0.96,base:0.024,be:0.16,ofi:null,open:true,peak:0.35,armed:false}}}}};
      const bankBefore=S.simBank["all/box"].bank;
      repairLedgers();
      const flagged=S.swing.w["KXBTC15M-O|NO"].sim["all/box"].phantom;
      simClose(S.swing.w["KXBTC15M-O|NO"]);            /* the gate arrives and closes it */
      return {flagged,bankBefore,bankAfter:S.simBank["all/box"].bank,rowPhantom:S.journal[0]&&S.journal[0].phantom,
        counted:journalStats()["all/box"].n}; })()`);
    T("a phantom position open at repair time closes without re-booking its P&L, and its journal row stays flagged", open.flagged === "K1" && open.bankAfter === open.bankBefore && open.rowPhantom === "K1" && open.counted === 0, open);
  }

  /* ---- sundial (§5): NOAA position for Dayton at the equinox */
  {
    const r = R(`(function(){ const p=solarPosition(SUN_DEF.lat,SUN_DEF.lon,new Date(Date.UTC(2026,8,22,17,30,0))); const n=solarPosition(SUN_DEF.lat,SUN_DEF.lon,new Date(Date.UTC(2026,8,22,5,0,0))); return {noon:p,night:n,name:SUN_DEF.name}; })()`);
    T("Dayton default; solar noon at the equinox ≈ 50° elevation due south", /Dayton/.test(r.name) && Math.abs(r.noon.elev - 50.2) < 1.5 && Math.abs(r.noon.az - 180) < 6, r.noon);
    T("night reads below the horizon", r.night.elev < -10, r.night);
  }

  process.exitCode = done() ? 1 : 0;
}
