/* Sweep harness (§5, h_call): colour keys to the CALL, not the strike; region-lock inverse mapping matches the forward mapping.
   Run: node test/sweep.js */
"use strict";
const { load, runner } = require("./lib/load");

const H = load();
const { R, setNow, canvasCalls } = H;
const { T, done } = runner("sweep");
const PAL = R("PAL");
const now = Date.UTC(2026, 8, 6, 14, 7, 30); setNow(now);
const tStart = Date.UTC(2026, 8, 6, 14, 0, 0), tEnd = tStart + 15 * 60000;

function scene(call, price, opts) {
  opts = opts || {};
  R(`(function(){
    S.lock=null; S.drag=null; S.swingActive=null; S.k.cur=null; S.k.sched=[]; S.k.hour=[]; S.leader="coinbase";
    S.tape=[]; for(let t=${now}-25*60000;t<=${now};t+=15000) S.tape.push({t,p:${price}${opts.trend ? "+(t-" + now + ")/60000*" + opts.trend : ""},src:"coinbase"});
    S.lastPx=S.tape[S.tape.length-1].p; S.idxPx=S.lastPx;
    S.round=${call ? `{state:"live",tStart:${tStart},tEnd:${tEnd},opens:{},openRef:null,settles:{},settledAt:0,strikes:[{id:1,strike:100000,call:"${call}",tArm:${tStart}+60000,probAtArm:0.5,prob:null,probFinal:null,outcome:null,hit:null,withdrawn:false}]}` : "null"};
    ys.c=null; ys.s=null;
  })()`);
  const calls = canvasCalls(); calls.length = 0;
  R("renderSweep()");
  const tapeStrokes = calls.filter(c => c.op === "stroke" && c.lineWidth === 1.8).map(c => c.strokeStyle);
  const head = (() => { for (let i = 0; i < calls.length; i++) if (calls[i].op === "arc" && calls[i].args[2] === 3) { const f = calls.slice(i).find(c => c.op === "fill"); return f && f.fillStyle; } return null; })();
  const ghosts = calls.filter(c => c.op === "fillRect" && /\.07\)$/.test(c.fillStyle)).map(c => ({ y: c.args[1], fill: c.fillStyle }));
  const M = R("S.lastMap");
  return { tapeStrokes, head, ghosts, M, calls };
}
const name = c => c === PAL.mal ? "green" : c === PAL.ruby ? "red" : c === PAL.giltB ? "gilt" : c === PAL.bone ? "bone" : c;

/* the truth table: green = the call is winning */
const cells = [
  { call: "ABOVE", price: 100100, want: "green" },
  { call: "ABOVE", price: 99900, want: "red" },
  { call: "BELOW", price: 100100, want: "red" },
  { call: "BELOW", price: 99900, want: "green" },
];
for (const c of cells) {
  const s = scene(c.call, c.price);
  const cols = [...new Set(s.tapeStrokes.map(name))];
  T(`call ${c.call}, price ${c.price > 100000 ? "above" : "below"} strike → tape ${c.want}`, cols.length === 1 && cols[0] === c.want, { strokes: cols, head: name(s.head) });
  T(`call ${c.call}, price ${c.price > 100000 ? "above" : "below"} strike → head dot ${c.want}`, name(s.head) === c.want, name(s.head));
  const top = s.ghosts.find(g => g.y === 30);   /* padT = 30: the field above the strike */
  T(`call ${c.call}: ghost field above the strike is ${c.call === "ABOVE" ? "green" : "red"}`, top && (c.call === "ABOVE" ? /63,191,126/ : /224,71,95/).test(top.fill), s.ghosts);
}

/* no call armed: the line keys to tick direction, head dot gilt */
{
  const up = scene(null, 100000, { trend: 5 }), dn = scene(null, 100000, { trend: -5 });
  T("no call: rising tape green, head dot gilt", [...new Set(up.tapeStrokes.map(name))].join() === "green" && name(up.head) === "gilt", { strokes: up.tapeStrokes.map(name), head: name(up.head) });
  T("no call: falling tape red", [...new Set(dn.tapeStrokes.map(name))].join() === "red", dn.tapeStrokes.map(name));
}

/* domain keeps the strike in view; S.lastMap inverts the forward mapping used to draw */
{
  const s = scene("ABOVE", 100100);
  const M = s.M;
  T("strike and price both inside the plotted domain", M.lo < 100000 && M.hi > 100100, M);
  const tAt = x => M.t0 + (x - M.padL) / M.iw * (M.t1 - M.t0), pAt = y => M.hi - (y - M.padT) / M.ih * (M.hi - M.lo);
  const Xt = t => M.padL + (t - M.t0) / (M.t1 - M.t0) * M.iw, Y = p => M.padT + (1 - (p - M.lo) / (M.hi - M.lo)) * M.ih;
  const t = now - 10 * 60000, p = 100050;
  T("pixel → time/price inverse round-trips the forward mapping", Math.abs(tAt(Xt(t)) - t) < 1 && Math.abs(pAt(Y(p)) - p) < 1e-6, { t: tAt(Xt(t)) - t, p: pAt(Y(p)) - p });
  T("sweep spans −30/+15 minutes around now", M.t0 === now - 30 * 60000 && M.t1 === now + 15 * 60000, { t0: M.t0 - now, t1: M.t1 - now });
}

/* locks: swing lock follows the live window; region lock fixes the domain; release restores the sweep */
{
  R(`S.k.cur={ticker:"KXBTC15M-T",strike:100000,open:${tStart},close:${tEnd},yesBid:48,yesAsk:52,noBid:48,noAsk:52,result:""}; lockSwing();`);
  R("renderSweep()"); const sw = R("S.lastMap");
  T("SWING lock frames the live window (±30 s)", sw.t0 === tStart - 30000 && sw.t1 === tEnd + 30000, { t0: sw.t0 - tStart, t1: sw.t1 - tEnd });
  R(`lockRect(${now - 5 * 60000},${now},99950,100150)`); R("renderSweep()"); const rc = R("S.lastMap");
  T("region lock fixes time and price domain exactly", rc.t0 === now - 5 * 60000 && rc.t1 === now && rc.lo === 99950 && rc.hi === 100150, rc);
  /* 2.9 — a released lock does not snap: it relaxes to the sweep on the substance's cessation curve and STOPS.
     The curve is the derived one (relaxEase reads OCCVM_RHEOLOGY); the 360 ms is authored and named as such. */
  R("lockRelease(); renderSweep()"); const at0 = R("S.lastMap");
  T("at the instant of release the domain is still the lock's, and the lock itself is gone", at0.t0 === now - 5 * 60000 && R("S.lock") === null && R("S.lockRelax") !== null);
  setNow(now + 180); R("renderSweep()"); const mid = R("S.lastMap");
  const held = (mid.t0 - (now - 30 * 60000)) / ((now - 5 * 60000) - (now - 30 * 60000));   /* fraction of the lock still held */
  T("half-way through, the domain sits between lock and sweep on the derived curve, not on a bezier",
    held > 0 && held < 1 && Math.abs(held - (1 - R("relaxEase(0.5)"))) < 0.01, { held: held.toFixed(4), curve: 1 - R("relaxEase(0.5)") });
  T("the curve is the substance's: the yield-dominated quadratic", Math.abs(R("relaxEase(0.5)") - 0.75) < 0.01, R("relaxEase(0.5)"));
  setNow(now + 360); R("renderSweep()"); const rl = R("S.lastMap");
  T("release returns to the sweep EXACTLY at the stop — not asymptotically — and nothing lingers",
    rl.t0 === now + 360 - 30 * 60000 && R("S.lockRelax") === null, { t0: rl.t0 - now - 360 });
  setNow(now);
}

/* settled windows collapse to a Y/N pip at the gate */
{
  R(`S.lock=null; S.round=null; S.k.cur=null; S.k.sched=[{ticker:"KXBTC15M-P",strike:100000,open:${tStart - 900000},close:${tStart},result:"yes",expVal:100010}];`);
  const calls = canvasCalls(); calls.length = 0; R("renderSweep()");
  const pip = calls.find(c => c.op === "fillText" && c.args[0] === "Y");
  T("a settled window draws its Y pip at the gate", !!pip, pip && pip.args);
}

/* the live odds gauge (§10.3 G1): the segment that grows with the call's own odds must be the call's colour, not its opposite */
function gaugeScene(call, over) {
  R(`(function(){
    S.lock=null; S.drag=null; S.swingActive=null; S.k.cur=null; S.k.sched=[]; S.k.hour=[]; S.leader="coinbase";
    S.tape=[]; for(let t=${now}-5*60000;t<=${now};t+=15000) S.tape.push({t,p:100050,src:"coinbase"});
    S.lastPx=100050; S.idxPx=100050;
    S.round={state:"live",tStart:${tStart},tEnd:${tEnd},opens:{},openRef:null,settles:{},settledAt:0,
      strikes:[{id:1,strike:100000,call:"${call}",tArm:${tStart}+60000,probAtArm:${over},prob:{over:${over},under:${1 - over}},probFinal:${over},outcome:null,hit:null,withdrawn:false}]};
  })()`);
  const calls = canvasCalls(); calls.length = 0;
  R("renderSweep()");
  const gaugeColor = c => /63,191,126/.test(c) ? "green" : /224,71,95/.test(c) ? "red" : c;   /* the gauge paints raw rgba literals, not the PAL hex values `name()` matches */
  return calls.filter(c => c.op === "fillRect" && c.args[2] === 5).map(c => ({ fill: gaugeColor(c.fillStyle), height: c.args[3] }));
}
for (const [call, over] of [["ABOVE", 0.9], ["ABOVE", 0.1], ["BELOW", 0.9], ["BELOW", 0.1]]) {
  const g = gaugeScene(call, over);
  const favored = (call === "ABOVE") === (over > 0.5);
  const big = g.length === 2 ? (g[0].height > g[1].height ? g[0] : g[1]) : null;
  T(`live odds gauge: call ${call} at P(above)=${over} is mostly ${favored ? "green" : "red"} (call ${favored ? "winning" : "losing"})`, !!big && big.fill === (favored ? "green" : "red"), g);
}

/* the settled armed-strike ring and HIT/MISS label (§10.3 R2b): keyed to the call, not to price direction — same rule as showVerdict */
function settledMarkerScene(call, outcome, hit) {
  R(`(function(){
    S.lock=null; S.drag=null; S.swingActive=null; S.k.cur=null; S.k.sched=[]; S.k.hour=[]; S.leader="coinbase";
    S.tape=[]; for(let t=${now}-5*60000;t<=${now};t+=15000) S.tape.push({t,p:100050,src:"coinbase"});
    S.lastPx=100050; S.idxPx=100050;
    S.round={state:"settled",tStart:${tStart},tEnd:${tEnd},settledAt:${now},strikes:[{id:1,strike:100000,call:"${call}",outcome:"${outcome}",hit:${hit},withdrawn:false,probFinal:0.9}]};
  })()`);
  const calls = canvasCalls(); calls.length = 0;
  R("renderSweep()");
  const ring = calls.find(c => c.op === "arc" && c.args[2] === 6);
  return ring ? name(ring.strokeStyle) : null;
}
T("settled marker: a BELOW call that settled DOWN (a HIT) rings green, not red-by-direction", settledMarkerScene("BELOW", "DOWN", true) === "green", null);
T("settled marker: an ABOVE call that settled DOWN (a MISS) rings red", settledMarkerScene("ABOVE", "DOWN", false) === "red", null);
T("settled marker: a BELOW call that settled UP (a MISS) rings red", settledMarkerScene("BELOW", "UP", false) === "red", null);
T("settled marker: an ABOVE call that settled UP (a HIT) rings green", settledMarkerScene("ABOVE", "UP", true) === "green", null);

process.exitCode = done() ? 1 : 0;
