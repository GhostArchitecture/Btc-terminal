/* standalone harness for the volspace unit: loads code.js into a vm context with the page helpers
   reimplemented verbatim, then asserts. Run: node test.js   */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");

/* --- helpers reimplemented exactly as index.html defines them ------------------------------------ */
function normCdf(x){
  const t=1/(1+0.2316419*Math.abs(x));
  const d=0.3989423*Math.exp(-x*x/2);
  const p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));
  return x>0?1-p:p;
}
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function invNorm(p){ p=Math.min(0.999999,Math.max(0.000001,p)); let lo=-8,hi=8;
  for(let i=0;i<60;i++){ const m=(lo+hi)/2; if(normCdf(m)<p) lo=m; else hi=m; } return (lo+hi)/2; }

/* high-accuracy reference normal CDF (Cody-style erfc), used ONLY to bound the cost of the page's
   Abramowitz-Stegun approximation. Not used by the unit. */
function normCdfExact(x){
  const z=Math.abs(x)/Math.SQRT2;
  const t=1/(1+0.5*z);
  const y=t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(0.37409196+t*(0.09678418+t*(-0.18628806+
    t*(0.27886807+t*(-1.13520398+t*(1.48851587+t*(-0.82215223+t*0.17087277)))))))));
  const erfc=x>=0?y:2-y;
  return 1-0.5*erfc;
}

const ctx = { normCdf, clamp, invNorm, Math, isFinite, console };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "code.js"), "utf8"), ctx, { filename: "code.js" });
const { impliedSigma, impliedSigmaInfo, realizedSigma, realizedSigmaInfo, varPremium, volTriple,
        sigmaIdentifiability, impliedSigmaTick } = ctx;
/* top-level `const` does not become a property of a vm context (only `function` declarations do),
   so the unit's constants are read by evaluating them inside the context. In index.html the spliced
   block shares one script scope with the rest of the page, exactly like SEAS / TERM / FIT_VERSION. */
const VRP_MIN_RET = vm.runInContext("VRP_MIN_RET", ctx);
const VRP_SIG_MAX = vm.runInContext("VRP_SIG_MAX", ctx);
const VRP_REL_MAX = vm.runInContext("VRP_REL_MAX", ctx);
const VRP_TICK = vm.runInContext("VRP_TICK", ctx);
const VRP_TICK_REL_MAX = vm.runInContext("VRP_TICK_REL_MAX", ctx);

/* --- runner ------------------------------------------------------------------------------------- */
let fails = 0;
function ok(name, cond, detail) {
  if (cond) console.log("  ok  " + name);
  else { fails++; console.log("  FAIL " + name + (detail ? "  -> " + detail : "")); }
}
function close(a, b, rel) { return a !== null && b !== null && isFinite(a) && Math.abs(a - b) <= rel * Math.abs(b); }

/* the fair value under test, computed independently of the unit's own helper */
const pOver = (sig, x, tau) => 1 - normCdf((x + 0.5 * sig * sig * tau) / (sig * Math.sqrt(tau)));

console.log("-- impliedSigma: round-trip, strike BELOW spot (x<0, single decreasing branch)");
{
  const S0 = 100000; let worst = 0, n = 0;
  for (const dbp of [-1, -5, -20, -100, -500]) {
    for (const tau of [0.5, 1, 3, 7.5, 14, 60]) {
      for (const sig of [2e-5, 1e-4, 5e-4, 1.5e-3, 6e-3]) {
        const strike = S0 * Math.exp(dbp / 1e4);
        const x = Math.log(strike / S0);
        const q = pOver(sig, x, tau);
        if (!(q > 0.005 && q < 0.995)) continue;      /* outside the clip band the unit refuses by design */
        const got = impliedSigma(strike, S0, tau, q);
        n++;
        const err = got === null ? Infinity : Math.abs(got - sig) / sig;
        if (err > worst) worst = err;
      }
    }
  }
  ok("x<0 round-trip recovers sigma (" + n + " cases, worst rel err " + worst.toExponential(2) + ")",
     n >= 40 && worst < 1e-9, "worst=" + worst);
}

console.log("-- impliedSigma: round-trip, strike ABOVE spot (x>0, low branch)");
{
  const S0 = 100000; let worst = 0, n = 0, skipped = 0;
  for (const dbp of [1, 5, 20, 100, 500]) {
    for (const tau of [0.5, 1, 3, 7.5, 14, 60]) {
      for (const sig of [2e-5, 1e-4, 5e-4, 1.5e-3, 6e-3]) {
        const strike = S0 * Math.exp(dbp / 1e4);
        const x = Math.log(strike / S0);
        const uStar = Math.sqrt(2 * x), sigStar = uStar / Math.sqrt(tau);
        if (sig >= sigStar) { skipped++; continue; }   /* that sigma lives on the high branch, tested below */
        const q = pOver(sig, x, tau);
        if (!(q > 0.005 && q < 0.995)) continue;
        const got = impliedSigma(strike, S0, tau, q);
        n++;
        const err = got === null ? Infinity : Math.abs(got - sig) / sig;
        if (err > worst) worst = err;
      }
    }
  }
  ok("x>0 low-branch round-trip recovers sigma (" + n + " cases, worst rel err " + worst.toExponential(2) + ")",
     n >= 20 && worst < 1e-9, "worst=" + worst + " skipped=" + skipped);
}

console.log("-- impliedSigma: the x>0 HIGH branch is real and reachable");
{
  const S0 = 100000, strike = S0 * Math.exp(20 / 1e4), tau = 10;
  const x = Math.log(strike / S0), sigStar = Math.sqrt(2 * x) / Math.sqrt(tau);
  const sigHi = sigStar * 4;
  const q = pOver(sigHi, x, tau);
  const hi = impliedSigma(strike, S0, tau, q, "high");
  const lo = impliedSigma(strike, S0, tau, q, "low");
  ok("high branch recovers the high root", close(hi, sigHi, 1e-9), "got " + hi + " want " + sigHi);
  ok("low branch returns a DIFFERENT, smaller root for the same quote",
     lo !== null && lo < sigStar && Math.abs(lo - sigHi) / sigHi > 0.5, "lo=" + lo + " sigStar=" + sigStar);
  ok("both roots reprice the same q", close(pOver(lo, x, tau), q, 1e-6) && close(pOver(hi, x, tau), q, 1e-6));
  ok("default branch is the low root", impliedSigma(strike, S0, tau, q) === lo);
}

console.log("-- impliedSigma: the p_over cap for x>0 (no solution above pMax)");
{
  const S0 = 100000, strike = S0 * Math.exp(5 / 1e4), tau = 10;
  const x = Math.log(strike / S0), pMax = 1 - normCdf(Math.sqrt(2 * x));
  ok("pMax is strictly below 0.5", pMax < 0.5 && pMax > 0.48, "pMax=" + pMax);
  ok("q just above pMax -> null", impliedSigma(strike, S0, tau, pMax + 1e-4) === null);
  ok("q = 0.49 on a 5bp-OTM strike -> null (unattainable, not a fake sigma)",
     0.49 > pMax ? impliedSigma(strike, S0, tau, 0.49) === null : true, "pMax=" + pMax);
  const info = impliedSigmaInfo(strike, S0, tau, pMax + 1e-4);
  ok("info explains the cap", info.sig === null && /unattainable/.test(info.reason) && close(info.pMax, pMax, 1e-12));
  const sigStar = Math.sqrt(2 * x) / Math.sqrt(tau);
  const nearCap = impliedSigma(strike, S0, tau, pMax - 1e-6);
  ok("q just below pMax -> a root below sigStar that reprices q",
     nearCap !== null && nearCap < sigStar && close(pOver(nearCap, x, tau), pMax - 1e-6, 1e-6),
     "got " + nearCap + " sigStar=" + sigStar);
  /* it is NOT close to sigStar: the cap is a quadratic turning point, so sigma is barely identified there */
  ok("near the cap sigma is ill-conditioned, and the code does not pretend otherwise (" +
     ((1 - nearCap / sigStar) * 100).toFixed(2) + "% below sigStar for a 1e-6 move in q)",
     (1 - nearCap / sigStar) > 0.005);
}

console.log("-- impliedSigma: the degenerate ATM case (x=0)");
{
  const S0 = 100000, tau = 10;
  ok("ATM q=0.50 -> null (no sigma>0 reproduces it)", impliedSigma(S0, S0, tau, 0.5) === null);
  ok("ATM q=0.60 -> null", impliedSigma(S0, S0, tau, 0.6) === null);
  ok("ATM q=0.5000001 -> null", impliedSigma(S0, S0, tau, 0.5000001) === null);
  const i = impliedSigmaInfo(S0, S0, tau, 0.5);
  ok("ATM info reason names the drift term", i.sig === null && /ATM/.test(i.reason), i.reason);
  const sig = 8e-4, q = pOver(sig, 0, tau);
  ok("ATM q<0.5 is solvable and round-trips", close(impliedSigma(S0, S0, tau, q), sig, 1e-9),
     "q=" + q + " got=" + impliedSigma(S0, S0, tau, q));
  ok("ATM p_over is strictly below 0.5 for every sigma tested",
     [1e-6, 1e-4, 1e-2, 1].every(s => pOver(s, 0, tau) < 0.5));
}

console.log("-- impliedSigma: monotonicity directions are what the code assumes");
{
  const tau = 10, grid = [1e-5, 3e-5, 1e-4, 3e-4, 1e-3, 3e-3, 1e-2, 3e-2, 1e-1];
  const xNeg = Math.log(0.999), xPos = Math.log(1.001);
  let weak = true, strictInBand = true;
  for (let i = 1; i < grid.length; i++) {
    const a = pOver(grid[i-1], xNeg, tau), b = pOver(grid[i], xNeg, tau);
    if (!(b <= a)) weak = false;
    if (a < 0.995 && !(b < a)) strictInBand = false;   /* the clip band is the only region we invert on */
  }
  ok("x<0: p_over is weakly decreasing in sigma over the whole grid", weak);
  ok("x<0: strictly decreasing wherever q is inside the clip band", strictInBand);
  /* below some sigma the tail underflows and p is exactly 1.0 in float -- sigma is unrecoverable there.
     The q<0.995 guard excludes that region, so the flat spot is never bisected on. */
  ok("p_over saturates to exactly 1 at tiny sigma (why the clip guard matters)",
     pOver(1e-5, xNeg, tau) === 1 && impliedSigma(1e5 * Math.exp(xNeg), 1e5, tau, 0.9999) === null);
  const ps = grid.map(s => pOver(s, xPos, tau));
  let up = 0, dn = 0; for (let i = 1; i < ps.length; i++) (ps[i] > ps[i-1] ? up++ : dn++);
  ok("x>0: p_over is NON-monotone (rises then falls) -- brief's premise corrected", up > 0 && dn > 0,
     "up=" + up + " dn=" + dn);
}

console.log("-- impliedSigma: reported conditioning (relPerCent)");
{
  const S0 = 100000, tau = 10;
  const mid = impliedSigmaInfo(S0 * Math.exp(-30 / 1e4), S0, tau, 0.72);
  ok("a mid-band read reports a finite, modest sensitivity (" +
     (100 * mid.relPerCent).toFixed(1) + "% sigma per 1c of q)",
     mid.sig !== null && mid.relPerCent !== null && mid.relPerCent > 0 && mid.relPerCent < 0.5,
     "relPerCent=" + mid.relPerCent);
  const K = S0 * Math.exp(5 / 1e4), x = Math.log(K / S0), pMax = 1 - normCdf(Math.sqrt(2 * x));
  const cap = impliedSigmaInfo(K, S0, tau, pMax - 1e-5);
  ok("near the cap the reported sensitivity explodes (" + (100 * cap.relPerCent).toFixed(0) +
     "% sigma per 1c) -- the caller can see the reading is noise",
     cap.sig !== null && cap.relPerCent > 1);
  ok("relPerCent is null when there is no sigma", impliedSigmaInfo(S0, S0, tau, 0.5).relPerCent === null);
  const deep = impliedSigmaInfo(S0 * Math.exp(-300 / 1e4), S0, tau, 0.99);
  ok("a deep-tail read is flagged by a large sensitivity too",
     deep.sig === null || deep.relPerCent > mid.relPerCent, "deep=" + (deep.relPerCent));
}

console.log("-- impliedSigma: guards");
{
  const S0 = 100000, K = 100050, tau = 10;
  ok("q at the low clip bound -> null", impliedSigma(K, S0, tau, 0.005) === null);
  ok("q at the high clip bound -> null", impliedSigma(K, S0, tau, 0.995) === null);
  ok("q below the clip band -> null", impliedSigma(K, S0, tau, 0.001) === null);
  ok("q above the clip band -> null", impliedSigma(K, S0, tau, 0.999) === null);
  ok("q=0 -> null", impliedSigma(K, S0, tau, 0) === null);
  ok("q=1 -> null", impliedSigma(K, S0, tau, 1) === null);
  ok("tau=0 -> null", impliedSigma(K, S0, 0, 0.3) === null);
  ok("tau<0 -> null", impliedSigma(K, S0, -5, 0.3) === null);
  ok("S0=0 -> null", impliedSigma(K, 0, tau, 0.3) === null);
  ok("S0<0 -> null", impliedSigma(K, -1, tau, 0.3) === null);
  ok("strike=0 -> null", impliedSigma(0, S0, tau, 0.3) === null);
  ok("NaN q -> null", impliedSigma(K, S0, tau, NaN) === null);
  ok("Infinity tau -> null", impliedSigma(K, S0, Infinity, 0.3) === null);
  ok("undefined args -> null", impliedSigma(undefined, undefined, undefined, undefined) === null);
  ok("string args -> null", impliedSigma("100050", "100000", "10", "0.3") === null);
  ok("null quote -> null", impliedSigma(K, S0, tau, null) === null);
  const i = impliedSigmaInfo(K, S0, tau, NaN);
  ok("info always returns an object with a reason", i && i.sig === null && typeof i.reason === "string");
}

console.log("-- impliedSigma: returned sigma always reprices the quote (residual check)");
{
  const S0 = 100000; let bad = 0, n = 0;
  for (const dbp of [-200, -50, -3, 3, 50, 200]) {
    for (const tau of [1, 5, 15, 60]) {
      for (const q of [0.02, 0.1, 0.25, 0.4, 0.47, 0.6, 0.9]) {
        const K = S0 * Math.exp(dbp / 1e4);
        const s = impliedSigma(K, S0, tau, q);
        if (s === null) continue;
        n++;
        if (!(Math.abs(pOver(s, Math.log(K / S0), tau) - q) < 1e-6)) bad++;
      }
    }
  }
  ok("every non-null sigma reprices q to <1e-6 (" + n + " solved)", n > 40 && bad === 0, "bad=" + bad);
}

console.log("-- impliedSigma: cost of the page's normCdf approximation");
{
  /* generate q with the ACCURATE cdf, invert with the page's approximate one: this is the real-world error */
  const S0 = 100000; let worst = 0, arg = "";
  for (const dbp of [-100, -20, -5, 5, 20, 100]) {
    for (const tau of [1, 5, 15]) {
      for (const sig of [1e-4, 5e-4, 2e-3]) {
        const K = S0 * Math.exp(dbp / 1e4), x = Math.log(K / S0);
        const uStar = x > 0 ? Math.sqrt(2 * x) / Math.sqrt(tau) : Infinity;
        if (sig >= uStar) continue;
        const q = 1 - normCdfExact((x + 0.5 * sig * sig * tau) / (sig * Math.sqrt(tau)));
        if (!(q > 0.005 && q < 0.995)) continue;
        const got = impliedSigma(K, S0, tau, q);
        if (got === null) continue;
        const e = Math.abs(got - sig) / sig;
        if (e > worst) { worst = e; arg = "dbp=" + dbp + " tau=" + tau + " sig=" + sig; }
      }
    }
  }
  /* documented in NOTES: this is approximation error inherited from normCdf, not inversion error */
  ok("approximation-induced rel err < 1% (worst " + (100 * worst).toFixed(3) + "% at " + arg + ")", worst < 0.01);
}

console.log("-- realizedSigma");
{
  const mk = (n, step, k0) => { const keys = [], closes = []; let p = 100000;
    for (let i = 0; i < n; i++) { keys.push((k0 || 1000) + i); closes.push(p); p *= Math.exp(step); } return { keys, closes }; };
  const T = k => k * 60000;
  {
    const step = 1e-4, { keys, closes } = mk(21, step);
    const s = realizedSigma(keys, closes, T(1000), T(1020));
    ok("constant 1e-4 log steps -> sigma = 1e-4", close(s, step, 1e-9), "got " + s);
    ok("n counted correctly (20 returns from 21 bars)", realizedSigmaInfo(keys, closes, T(1000), T(1020)).n === 20);
  }
  {
    /* a gap: keys 1000..1004 then 1010..1014. Contiguous returns = 4 + 4 = 8, one gap dropped. */
    const keys = [], closes = []; let p = 100000;
    for (let i = 0; i < 5; i++) { keys.push(1000 + i); closes.push(p); p *= Math.exp(2e-4); }
    p *= Math.exp(0.05);                                   /* the sleep gap: a huge jump that must NOT be scored */
    for (let i = 0; i < 5; i++) { keys.push(1010 + i); closes.push(p); p *= Math.exp(2e-4); }
    const info = realizedSigmaInfo(keys, closes, T(1000), T(1014), 8);
    ok("gap return is dropped, not scored", close(info.sig, 2e-4, 1e-9), "got " + info.sig);
    ok("gap is counted in .dropped", info.dropped === 1 && info.n === 8, JSON.stringify(info));
    const naive = Math.sqrt((8 * 4e-8 + 0.05 * 0.05) / 9);
    ok("dropping matters (naive sigma would be " + naive.toExponential(2) + ", " +
       (naive / 2e-4).toFixed(0) + "x larger)", naive / info.sig > 50);
  }
  {
    const { keys, closes } = mk(40, 1e-4, 1000);
    const info = realizedSigmaInfo(keys, closes, T(1010), T(1019));
    ok("window filter keeps only bars in [k0,k1]", info.n === 9, "n=" + info.n);
    ok("t0/t1 mid-minute floors to the bar key", realizedSigmaInfo(keys, closes, T(1010) + 33000, T(1019) + 59999).n === 9);
  }
  {
    const { keys, closes } = mk(5, 1e-4);
    ok("below the minimum sample -> null", realizedSigma(keys, closes, T(1000), T(1004)) === null);
    ok("default minimum is VRP_MIN_RET", realizedSigmaInfo(keys, closes, T(1000), T(1004)).need === VRP_MIN_RET);
    ok("reason names the shortfall", /too few/.test(realizedSigmaInfo(keys, closes, T(1000), T(1004)).reason));
    ok("explicit minN=4 lets it through", close(realizedSigma(keys, closes, T(1000), T(1004), 4), 1e-4, 1e-9));
  }
  {
    const { keys, closes } = mk(21, 1e-4);
    ok("empty input -> null", realizedSigma([], [], T(1000), T(1020)) === null);
    ok("null input -> null", realizedSigma(null, null, T(1000), T(1020)) === null);
    ok("length mismatch -> null", realizedSigma(keys, closes.slice(0, 5), T(1000), T(1020)) === null);
    ok("t1 <= t0 -> null", realizedSigma(keys, closes, T(1020), T(1000)) === null);
    ok("NaN window -> null", realizedSigma(keys, closes, NaN, T(1020)) === null);
    ok("window with no bars -> null", realizedSigma(keys, closes, T(9000), T(9100)) === null);
    const bad = { keys: keys.slice(), closes: closes.slice() }; bad.closes[10] = 0;
    const bi = realizedSigmaInfo(bad.keys, bad.closes, T(1000), T(1020), 4);
    ok("a non-positive close breaks the chain instead of producing NaN", bi.sig !== null && isFinite(bi.sig) && bi.n === 18,
       JSON.stringify({ n: bi.n, d: bi.dropped, s: bi.sig }));
  }
  {
    /* zero-mean sum-of-squares, matching computeStats' rv60 (not a sample stdev) */
    const keys = [1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010];
    const rs = [1e-4, -2e-4, 3e-4, 1e-4, 0, -1e-4, 2e-4, -3e-4, 1e-4, 1e-4];
    const closes = [100000]; for (const r of rs) closes.push(closes[closes.length - 1] * Math.exp(r));
    const want = Math.sqrt(rs.reduce((a, b) => a + b * b, 0) / rs.length);
    ok("uses zero-mean RV like rv60", close(realizedSigma(keys, closes, T(1000), T(1010)), want, 1e-9));
  }
}

console.log("-- varPremium");
{
  const v = varPremium(1.2e-3, 1.0e-3);
  ok("vrp = implied - realized", close(v.vrp, 2e-4, 1e-12));
  ok("ratio = implied / realized", close(v.ratio, 1.2, 1e-12));
  const n = varPremium(8e-4, 1e-3);
  ok("negative premium is reported, not suppressed", n.vrp < 0 && n.ratio < 1);
  ok("realized = 0 -> null (ratio undefined)", varPremium(1e-3, 0) === null);
  ok("negative realized -> null", varPremium(1e-3, -1e-3) === null);
  ok("negative implied -> null", varPremium(-1e-3, 1e-3) === null);
  ok("null implied -> null", varPremium(null, 1e-3) === null);
  ok("null realized -> null", varPremium(1e-3, null) === null);
  ok("NaN -> null", varPremium(NaN, 1e-3) === null && varPremium(1e-3, NaN) === null);
  ok("Infinity -> null", varPremium(Infinity, 1e-3) === null);
  ok("implied = 0 is a legitimate reading", varPremium(0, 1e-3).vrp === -1e-3);
}

console.log("-- volTriple");
{
  const S0 = 100000, tau = 10, sigModel = 5e-4;
  const K = S0 * Math.exp(-30 / 1e4), x = Math.log(K / S0);
  const q = pOver(6e-4, x, tau);
  const t = volTriple({ sigU: sigModel }, { q, spread: 0.02 }, K, S0, tau);
  ok("sigModel is taken from P.sigU", t.sigModel === sigModel);
  ok("x is the log strike distance", close(t.x, x, 1e-12));
  ok("xs is x / (sigModel*sqrt(tau))", close(t.xs, x / (sigModel * Math.sqrt(tau)), 1e-12));
  ok("sigImplied inverts the quote", close(t.sigImplied, 6e-4, 1e-9), "got " + t.sigImplied);
  ok("implied > model here, so vrp is positive", varPremium(t.sigImplied, t.sigModel).vrp > 0);

  const noQ = volTriple({ sigU: sigModel }, null, K, S0, tau);
  ok("no quote -> sigImplied null, rest intact", noQ.sigImplied === null && noQ.sigModel === sigModel && noQ.x !== null);
  const noP = volTriple(null, { q }, K, S0, tau);
  ok("no P -> sigModel and xs null, sigImplied still computed", noP.sigModel === null && noP.xs === null && noP.sigImplied !== null);
  const bad = volTriple({ sigU: 0 }, { q }, K, S0, tau);
  ok("sigU=0 -> sigModel null (no divide by zero)", bad.sigModel === null && bad.xs === null);
  const nanP = volTriple({ sigU: NaN }, { q }, K, S0, tau);
  ok("sigU NaN -> sigModel null", nanP.sigModel === null);
  const noS = volTriple({ sigU: sigModel }, { q }, K, null, tau);
  ok("no S0 -> x and xs and sigImplied null", noS.x === null && noS.xs === null && noS.sigImplied === null);
  const badQ = volTriple({ sigU: sigModel }, { q: 0.999 }, K, S0, tau);
  ok("clipped quote -> sigImplied null, sigModel/x/xs intact",
     badQ.sigImplied === null && badQ.sigModel === sigModel && badQ.xs !== null);
  const allBad = volTriple(undefined, undefined, undefined, undefined, undefined);
  ok("all-undefined -> all four fields null",
     allBad.sigModel === null && allBad.sigImplied === null && allBad.x === null && allBad.xs === null);
  ok("volTriple never throws on junk", (() => { try { volTriple({}, {}, "a", {}, []); return true; } catch (e) { return false; } })());
}

console.log("-- end-to-end: a plausible KXBTC15M window");
{
  /* 8 minutes left, strike 12bp below spot, market says 71c the window settles above */
  const S0 = 96420.5, K = S0 * Math.exp(-12 / 1e4), tau = 8, q = 0.71;
  const si = impliedSigma(K, S0, tau, q);
  ok("solves for a per-minute sigma in a believable band (" + (1e4 * si).toFixed(2) + " bp/min)",
     si !== null && si > 1e-5 && si < 5e-3, "sig=" + si);
  const keys = [], closes = []; let p = S0;
  for (let i = 0; i < 31; i++) { keys.push(2000 + i); closes.push(p); p *= Math.exp((i % 2 ? 1 : -1) * 9e-5); }
  const sr = realizedSigma(keys, closes, 2000 * 60000, 2030 * 60000);
  ok("realized sigma from 30 clean bars", close(sr, 9e-5, 1e-9), "got " + sr);
  const v = varPremium(si, sr);
  ok("varPremium composes", v !== null && close(v.vrp, si - sr, 1e-12) && close(v.ratio, si / sr, 1e-12));
}


/* =================================================================================================
   REGRESSION: D1 -- relPerCent measures PRECISION, not PLAUSIBILITY.
   The review's counterexample: a strike BELOW spot quoted under 50c inverts exactly, reports a
   comfortable conditioning number, and returns a volatility an order of magnitude past anything the
   BTC tape produces. Before ratioModel existed, nothing in the unit's output said so.
   ================================================================================================= */
console.log("-- D1: ratioModel exposes the implausible-level class relPerCent cannot see");
{
  const S0 = 100000, tau = 8;
  const K = S0 * Math.exp(-10 / 1e4);                 /* 10bp BELOW spot */
  const q = 0.40;                                      /* an entirely ordinary quote */
  const info = impliedSigmaInfo(K, S0, tau, q);
  ok("the pathological case still inverts exactly (this is not an arithmetic bug)",
     info.sig !== null && close(pOver(info.sig, info.x, tau), q, 1e-6), "sig=" + info.sig);
  ok("implied sigma is ~1805 bp/min, ~200x a real tape",
     info.sig > 0.17 && info.sig < 0.19, "bp/min=" + (1e4 * info.sig).toFixed(1));
  ok("relPerCent is COMFORTABLE here (~10%/cent) -- the precision guard does not fire",
     info.relPerCent !== null && info.relPerCent < 0.5, "rel=" + info.relPerCent);

  const sigModel = 9e-4;                               /* ~9 bp/min, the tape's own scale */
  const t = volTriple({ sigU: sigModel }, { q }, K, S0, tau);
  ok("volTriple exposes ratioModel", "ratioModel" in t);
  ok("ratioModel = sigImplied / sigModel exactly",
     close(t.ratioModel, t.sigImplied / t.sigModel, 1e-12));
  ok("ratioModel screams (>100) on the case relPerCent called fine",
     t.ratioModel > 100, "ratio=" + t.ratioModel);
  ok("the two diagnostics genuinely disagree -- neither substitutes for the other",
     t.ratioModel > 100 && info.relPerCent < 0.5);

  /* a healthy reading: both diagnostics calm */
  const Kh = S0 * Math.exp(-30 / 1e4), qh = pOver(1.1e-3, Math.log(Kh / S0), 10);
  const th = volTriple({ sigU: 1e-3 }, { q: qh }, Kh, S0, 10);
  ok("a plausible reading has ratioModel near 1", th.ratioModel > 0.8 && th.ratioModel < 1.5,
     "ratio=" + th.ratioModel);

  ok("ratioModel null when sigImplied null", volTriple({ sigU: 1e-3 }, { q: 0.999 }, Kh, S0, 10).ratioModel === null);
  ok("ratioModel null when sigModel null", volTriple(null, { q: qh }, Kh, S0, 10).ratioModel === null);
  ok("ratioModel null when both null", volTriple(null, null, Kh, S0, 10).ratioModel === null);
  ok("ratioModel null on all-undefined", volTriple(undefined, undefined, undefined, undefined, undefined).ratioModel === null);
  ok("ratioModel survives junk without throwing",
     (() => { try { return volTriple({}, {}, "a", {}, []).ratioModel === null; } catch (e) { return false; } })());
  ok("sigModel=0 cannot produce an Infinity ratio",
     volTriple({ sigU: 0 }, { q: qh }, Kh, S0, 10).ratioModel === null);
}

/* =================================================================================================
   REGRESSION: sigmaIdentifiability -- the quantity that decides whether sigma is recoverable AT ALL.
   ================================================================================================= */
console.log("-- sigmaIdentifiability: xs is the deciding coordinate, the true tick move is the gate");
{
  const sigModel = 9e-4, tau = 8, u = sigModel * Math.sqrt(tau);
  const phi = z => 0.3989423 * Math.exp(-z * z / 2);

  ok("shape is {identified, xs, relPerCent, reason}", (() => {
    const r = sigmaIdentifiability(0.001, sigModel, tau);
    return typeof r.identified === "boolean" && "xs" in r && "relPerCent" in r && typeof r.reason === "string";
  })());

  ok("xs = x/(sigModel*sqrt(tau))",
     close(sigmaIdentifiability(0.002, sigModel, tau).xs, 0.002 / u, 1e-12));
  ok("xs is signed: a strike below spot gives xs<0",
     sigmaIdentifiability(-0.002, sigModel, tau).xs < 0);

  /* THE headline case: KXBTC15M opens at the money, so it opens UNIDENTIFIED. */
  const atm = sigmaIdentifiability(0, sigModel, tau);
  ok("exactly at the money -> NOT identified", atm.identified === false);
  ok("ATM xs is 0", atm.xs === 0);
  ok("ATM conditioning is catastrophic (>10, i.e. >1000%/cent)", atm.relPerCent > 10,
     "rel=" + atm.relPerCent);
  ok("ATM reason names the money, not the tail", /at the money/.test(atm.reason));

  /* 0.5bp off the money on a 15m window is still hopeless; 30bp is fine. */
  ok("0.5bp off spot at tau=8 -> still not identified",
     sigmaIdentifiability(Math.log(1 + 0.5 / 1e4), sigModel, tau).identified === false);
  const wing = sigmaIdentifiability(Math.log(1 - 30 / 1e4), sigModel, tau);
  ok("30bp below spot -> identified", wing.identified === true, "rel=" + wing.relPerCent);
  ok("identified reading carries a usable tickRel inside the bound",
     wing.tickRel > 0 && wing.tickRel <= VRP_TICK_REL_MAX && wing.tickSided === "two");
  ok("relPerCent is still reported beside it (diagnostic, not the gate)", wing.relPerCent > 0);
  ok("identified reading reason is ok", wing.reason === "ok");

  /* the far tail fails too: the region is a BAND in |xs|, not a half-line. */
  const tail = sigmaIdentifiability(4.5 * u, sigModel, tau);
  ok("deep tail -> NOT identified (band, not half-line)", tail.identified === false, "rel=" + tail.relPerCent);
  ok("deep-tail reason names the tail", /deep tail/.test(tail.reason));

  /* identified is decided by the TRUE one-tick move and by nothing else: both neighbours must invert AND the
     larger of the two moves must sit inside VRP_TICK_REL_MAX. relPerCent no longer decides anything. */
  let checked = 0, mismatch = 0;
  for (const xs of [-6, -3, -2.9, -2.5, -1, -0.2, -0.06, -0.04, -0.01, 0, 0.01, 0.04, 0.06, 0.2, 1, 2.5, 2.9, 3, 6]) {
    const r = sigmaIdentifiability(xs * u, sigModel, tau);
    checked++;
    const want = r.tickSided === "two" && r.tickRel !== null && r.tickRel <= VRP_TICK_REL_MAX;
    if (r.identified !== want) {
      mismatch++;
      ok("identified tracks the tick gate at xs=" + xs, false,
         "tickRel=" + r.tickRel + " sided=" + r.tickSided + " identified=" + r.identified);
    }
  }
  ok("identified === (two-sided AND tickRel <= VRP_TICK_REL_MAX) at every xs tested (" + checked + ")",
     checked >= 19 && mismatch === 0);

  /* the closed form in the comment is the thing actually computed */
  let worstCF = 0;
  for (const xs of [-3, -1, -0.3, -0.05, 0.05, 0.3, 1, 3]) {
    const r = sigmaIdentifiability(xs * u, sigModel, tau);
    const cf = 0.01 / (phi(xs + u / 2) * Math.abs(u / 2 - xs));
    worstCF = Math.max(worstCF, Math.abs(r.relPerCent - cf) / cf);
  }
  /* tolerance is the central-difference step in vsSens plus normCdf's A&S error, not a fudge */
  ok("relPerCent matches the documented closed form 0.01/(phi(xs+u/2)*|u/2-xs|) to 1e-5 (" +
     worstCF.toExponential(1) + ")", worstCF < 1e-5);

  /* the band edges move with tau -- which is why no xs cut point is hardcoded. Under the corrected gate the
     flip happens further out than it used to: 8bp below spot is identified at tau=30 and not at tau=60. */
  const near8 = Math.log(1 - 8 / 1e4);
  ok("the SAME strike distance flips identified as tau changes (no fixed xs constant would do)",
     sigmaIdentifiability(near8, sigModel, 30).identified === true &&
     sigmaIdentifiability(near8, sigModel, 60).identified === false,
     "tau30 tickRel=" + sigmaIdentifiability(near8, sigModel, 30).tickRel +
     " tau60 tickRel=" + sigmaIdentifiability(near8, sigModel, 60).tickRel);
  /* and 1bp below spot, which the OLD derivative gate passed at tau=1, is now rejected at every tau it sees */
  const near1 = Math.log(1 - 1 / 1e4);
  ok("1bp below spot is unidentified at tau=1 under the corrected gate (the old gate passed it)",
     sigmaIdentifiability(near1, sigModel, 1).identified === false &&
     sigmaIdentifiability(near1, sigModel, 1).relPerCent <= VRP_REL_MAX,
     "tickRel=" + sigmaIdentifiability(near1, sigModel, 1).tickRel);

  /* guards */
  ok("null-ish inputs -> not identified, reason given, no throw", (() => {
    for (const a of [undefined, null, NaN, Infinity, -Infinity, "1", {}, []]) {
      const r = sigmaIdentifiability(a, sigModel, tau);
      if (r.identified !== false || r.reason === "ok") return false;
      const r2 = sigmaIdentifiability(0.001, a, tau);
      if (r2.identified !== false || r2.reason === "ok") return false;
      const r3 = sigmaIdentifiability(0.001, sigModel, a);
      if (r3.identified !== false || r3.reason === "ok") return false;
    }
    return true;
  })());
  ok("sigModel <= 0 -> named reason, xs null (no divide by zero)", (() => {
    const r = sigmaIdentifiability(0.001, 0, tau);
    return r.identified === false && r.xs === null && r.reason === "sigModel <= 0";
  })());
  ok("tau <= 0 -> named reason", sigmaIdentifiability(0.001, sigModel, 0).reason === "tau <= 0");
  ok("non-finite x -> named reason", sigmaIdentifiability(NaN, sigModel, tau).reason === "non-finite input");
  ok("never throws on junk", (() => {
    try { sigmaIdentifiability({}, [], "x"); sigmaIdentifiability(1e308, 1e-320, 1e308); return true; }
    catch (e) { return false; }
  })());

  /* it composes with volTriple's own fields with no re-derivation */
  const S0 = 100000, K = S0 * Math.exp(-30 / 1e4);
  const t = volTriple({ sigU: sigModel }, { q: 0.6 }, K, S0, tau);
  const id = sigmaIdentifiability(t.x, t.sigModel, tau);
  ok("volTriple.xs === sigmaIdentifiability(volTriple.x, ...).xs", close(t.xs, id.xs, 1e-12));
}

/* =================================================================================================
   REGRESSION: M1 -- all-junk closes must not read as merely thin data.
   ================================================================================================= */
console.log("-- M1: invalid counter separates bad data from thin data");
{
  const junk = realizedSigmaInfo(["a", "b", "c"], ["x", "y", "z"], 0, 6e5);
  ok("all-junk: n=0", junk.n === 0);
  ok("all-junk: invalid counts every entry", junk.invalid === 3);
  ok("all-junk: dropped stays 0 (no return was ever broken)", junk.dropped === 0);
  ok("all-junk: reason names the data, not the sample size",
     junk.reason === "no valid closes (every entry invalid)", junk.reason);
  ok("all-junk: sig still null", junk.sig === null);

  const thin = realizedSigmaInfo([100, 101, 102], [10, 10.1, 10.2], 100 * 60000, 102 * 60000);
  ok("thin-but-clean: invalid === 0", thin.invalid === 0);
  ok("thin-but-clean: reason is the sample-size one",
     thin.reason === "too few contiguous 1-minute returns", thin.reason);
  ok("the two cases are now distinguishable", thin.reason !== junk.reason);

  /* partial junk: counter is visible even though the reason stays the sample-size one */
  const mixed = realizedSigmaInfo([100, 101, 102, 103], [10, -1, NaN, 10.3], 100 * 60000, 103 * 60000);
  ok("partial junk: invalid counts only the bad entries", mixed.invalid === 2, "invalid=" + mixed.invalid);
  ok("partial junk: dropped counts the broken return chain", mixed.dropped === 1, "dropped=" + mixed.dropped);
  ok("partial junk: reason is the sample-size one (invalid !== keys.length)",
     mixed.reason === "too few contiguous 1-minute returns");

  /* a healthy read reports invalid = 0 and is unaffected by the new field */
  const keys = [], closes = []; let p = 100000;
  for (let i = 0; i < 20; i++) { keys.push(500 + i); closes.push(p); p *= Math.exp((i % 2 ? 1 : -1) * 1e-4); }
  const good = realizedSigmaInfo(keys, closes, 500 * 60000, 519 * 60000);
  ok("healthy read: invalid === 0 and sig unchanged", good.invalid === 0 && close(good.sig, 1e-4, 1e-9));
  ok("realizedSigma wrapper still returns the bare number",
     close(realizedSigma(keys, closes, 500 * 60000, 519 * 60000), good.sig, 1e-15));
}

/* =================================================================================================
   REGRESSION: M2 -- minN below 2 is floored to VRP_MIN_RET, and .need says so.
   ================================================================================================= */
console.log("-- M2: the minN floor is visible in .need");
{
  const keys = [1000, 1001, 1002], closes = [10, 10.01, 10.02];
  const r1 = realizedSigmaInfo(keys, closes, 1000 * 60000, 1002 * 60000, 1);
  ok("minN=1 is floored to VRP_MIN_RET", r1.need === VRP_MIN_RET);
  ok("floored minN is not silently satisfied", r1.sig === null && r1.n === 2);
  const r2 = realizedSigmaInfo(keys, closes, 1000 * 60000, 1002 * 60000, 2);
  ok("minN=2 is honoured", r2.need === 2 && r2.sig !== null);
  const r3 = realizedSigmaInfo(keys, closes, 1000 * 60000, 1002 * 60000, 0);
  ok("minN=0 is floored too", r3.need === VRP_MIN_RET);
  const r4 = realizedSigmaInfo(keys, closes, 1000 * 60000, 1002 * 60000, 2.9);
  ok("fractional minN floors to an integer", r4.need === 2);
}


/* =================================================================================================
   REGRESSION: the corrected identifiability gate (PART 1 + PART 2).

   DEFECT. `identified` used to gate on `relPerCent`, the LOCAL DERIVATIVE of implied sigma with respect to the
   quote, against VRP_REL_MAX = 0.5. Kalshi quotes in whole cents, so the derivative is a quantity this market
   never exhibits, and because the quote -> sigma map is convex near the money the derivative badly UNDERSTATES
   what a real tick does. The gate therefore admitted readings whose implied sigma moves 86% on one tick.
   FIX. Measure the move across a real VRP_TICK in both directions, and gate that at VRP_TICK_REL_MAX = 0.20.
   ================================================================================================= */
console.log("-- PART 1/2: the true one-cent tick, not a derivative, decides identifiability");
{
  const sigModel = 9e-4, tau = 15, S0 = 100000;
  const u = sigModel * Math.sqrt(tau);
  const pOverM = (x) => pOver(sigModel, x, tau);
  const at = (dbp) => sigmaIdentifiability(dbp / 1e4, sigModel, tau);

  /* --- the tick is a named constant, not a literal ------------------------------------------------ */
  ok("VRP_TICK is Kalshi's whole-cent tick", VRP_TICK === 0.01);
  ok("every reported bound travels with the reading",
     at(20).tick === VRP_TICK && at(20).bound === VRP_TICK_REL_MAX &&
     impliedSigmaInfo(S0 * Math.exp(20 / 1e4), S0, tau, 0.28).tick === VRP_TICK);

  /* --- PART 2: the re-registered bound, and its DIRECTION ----------------------------------------- */
  ok("VRP_TICK_REL_MAX is 0.20", VRP_TICK_REL_MAX === 0.20);
  ok("the old bound is retained for the record and is strictly looser", VRP_REL_MAX === 0.5 &&
     VRP_TICK_REL_MAX < VRP_REL_MAX);
  /* the derivation: 1/sqrt(2n) relative sampling error on realized sigma. 0.20 must sit above the 14- and
     15-return figures a 15-minute window can produce, and below the n=30 figure, or it is not this quantity. */
  const rvErr = n => 1 / Math.sqrt(2 * n);
  ok("bound is above the sampling error of a full 15-minute realized sigma (n=15 -> 18.3%)",
     rvErr(15) < VRP_TICK_REL_MAX && Math.abs(rvErr(15) - 0.1826) < 5e-4);
  ok("bound is above the 14-return case too (18.9%)",
     rvErr(14) < VRP_TICK_REL_MAX && Math.abs(rvErr(14) - 0.1890) < 5e-4);
  ok("bound is below the n=30 figure, so it is not merely a large round number",
     rvErr(30) < VRP_TICK_REL_MAX && Math.abs(rvErr(30) - 0.1291) < 5e-4);

  /* --- the measured table from the defect report, reproduced by the unit -------------------------- */
  const table = [
    { dbp: 0,   xs: 0.000, rel: 14.382, tick: null },
    { dbp: 1,   xs: 0.029, rel: 0.931,  tick: null },
    { dbp: 2,   xs: 0.057, rel: 0.451,  tick: 0.864 },
    { dbp: 5,   xs: 0.143, rel: 0.179,  tick: 0.218 },
    { dbp: 10,  xs: 0.287, rel: 0.092,  tick: 0.101 },
    { dbp: 20,  xs: 0.574, rel: 0.052,  tick: 0.054 },
    { dbp: 35,  xs: 1.004, rel: 0.041,  tick: 0.042 },
    { dbp: 60,  xs: 1.721, rel: 0.064,  tick: 0.067 },   /* report's 6.3% is the UP side; rel is the max of the two */
    { dbp: 120, xs: 3.443, rel: 2.745,  tick: null }
  ];
  /* the report quotes xs to 3dp, relPerCent to 3dp and the tick move to 0.1%, so the comparison is to half a
     unit in the last place given -- 6e-4 absolute, not a relative fudge. */
  let tblBad = "";
  for (const row of table) {
    const r = at(row.dbp);
    if (Math.abs(r.xs - row.xs) > 6e-4) tblBad += " xs@" + row.dbp + "=" + r.xs;
    if (Math.abs(r.relPerCent - row.rel) > 6e-4) tblBad += " rel@" + row.dbp + "=" + r.relPerCent;
    if (row.tick === null) {
      if (r.tickSided === "two") tblBad += " tick@" + row.dbp + " unexpectedly two-sided";
    } else if (Math.abs(r.tickRel - row.tick) > 6e-4) {
      tblBad += " tick@" + row.dbp + "=" + r.tickRel;
    }
  }
  ok("the defect report's measured table is reproduced exactly (xs, relPerCent, true tick move)",
     tblBad === "", tblBad);
  /* rel is deliberately the MAX of the two one-sided moves, so at 60bp it reads 6.7% where the report's
     one-sided 6.3% is relUp. Taking the max is the conservative choice and the report's number is still here. */
  ok("60bp: the report's 6.3% is the up-side move, and rel reports the larger 6.7%",
     close(at(60).tickRelUp, 0.063, 1e-2) && at(60).tickRel >= at(60).tickRelUp, "relUp=" + at(60).tickRelUp);

  /* --- THE DEFECT ITSELF: the 2bp reading the old gate admitted -------------------------------------- */
  {
    const r = at(2);
    ok("2bp: the OLD gate passed it (relPerCent 0.451 <= 0.5)", r.relPerCent <= VRP_REL_MAX,
       "relPerCent=" + r.relPerCent);
    ok("2bp: one real tick moves implied sigma 86%", close(r.tickRel, 0.864, 3e-3), "tickRel=" + r.tickRel);
    ok("2bp: the CORRECTED gate rejects it", r.identified === false);
    ok("2bp: the derivative understated the true move by ~1.9x", r.tickRel / r.relPerCent > 1.8);
  }
  ok("the correction is a TIGHTENING: nothing the old gate rejected is now admitted", (() => {
    for (let d = -400; d <= 400; d += 1) {
      if (d === 0) continue;
      const r = at(d);
      if (r.relPerCent === null) continue;
      if (r.identified && !(r.relPerCent <= VRP_REL_MAX)) return false;   /* new pass, old fail: forbidden */
    }
    return true;
  })());
  ok("and it does reject readings the old gate admitted (strictly, not vacuously)", (() => {
    let n = 0;
    for (let d = -400; d <= 400; d += 1) {
      const r = at(d);
      if (r.relPerCent !== null && r.relPerCent <= VRP_REL_MAX && !r.identified) n++;
    }
    return n > 0;
  })());

  /* --- PART 1: a neighbour that does not invert is NOT zero sensitivity --------------------------- */
  {
    const atm = at(0);
    ok("ATM: the +1c neighbour has no root at all", atm.sigUp === undefined || atm.tickSided === "down");
    ok("ATM: NOT silently treated as zero sensitivity", atm.identified === false && atm.tickRel !== 0);
    ok("ATM: the surviving one-sided move is still reported (1438%)", close(atm.tickRel, 14.38, 2e-3),
       "tickRel=" + atm.tickRel);
    ok("ATM: the reason names the missing neighbour and why", /quote\+1c does not invert/.test(atm.tickReason) &&
       /ATM p_over is strictly below 0\.5/.test(atm.tickReason), atm.tickReason);

    const one = at(1);
    ok("1bp above spot: +1c passes pMax, so that neighbour has no root", one.tickSided === "down");
    ok("1bp above spot: rejected on the missing neighbour, not on a number", one.identified === false);
    ok("1bp above spot: one-sided move reported (47.5%)", close(one.tickRel, 0.475, 3e-3), "=" + one.tickRel);
  }
  /* THE CASE THAT MAKES THE POLICY LOAD-BEARING: a one-sided move that is INSIDE the bound and still fails.
     If a missing neighbour were treated as zero, or one-sided were allowed to pass, xs=+-2.5 would be admitted
     on 16.9% -- while one tick in the other direction takes the reading out of existence entirely. */
  {
    const u8 = 9e-4 * Math.sqrt(8);
    for (const sgn of [1, -1]) {
      const r = sigmaIdentifiability(sgn * 2.5 * u8, 9e-4, 8);
      ok("xs=" + (sgn * 2.5) + ": one-sided move is INSIDE the bound", r.tickRel < VRP_TICK_REL_MAX,
         "tickRel=" + r.tickRel);
      ok("xs=" + (sgn * 2.5) + ": one-sided is still NOT identified", r.identified === false);
      ok("xs=" + (sgn * 2.5) + ": sided names which neighbour survived",
         r.tickSided === (sgn > 0 ? "up" : "down"), r.tickSided);
      ok("xs=" + (sgn * 2.5) + ": reason names the clip bound the neighbour fell past",
         /does not invert: quote at or beyond clip bounds/.test(r.tickReason), r.tickReason);
    }
  }
  ok("a two-sided reading is the ONLY state that can pass", (() => {
    for (let d = -400; d <= 400; d += 1) {
      const r = at(d);
      if (r.identified && r.tickSided !== "two") return false;
    }
    return true;
  })());
  ok("rel is null only when there is no reading at all, never a substituted 0", (() => {
    for (let d = -400; d <= 400; d += 1) {
      const r = at(d);
      if (r.tickRel === 0) return false;
      if (r.tickRel === null && r.tickSided !== null) return false;
    }
    return true;
  })());

  /* --- THE SURVIVING BAND on a 15-minute window at sigma 9bp/min --------------------------------- */
  {
    for (const d of [6, 10, 20, 35, 60, 75, -6, -10, -20, -35, -60, -75]) {
      ok("band: " + d + "bp is identified", at(d).identified === true, "tickRel=" + at(d).tickRel);
    }
    for (const d of [0, 1, 2, 3, 4, 5, 76, 80, 90, 120, -1, -2, -3, -4, -5, -76, -80, -90, -120]) {
      ok("band: " + d + "bp is NOT identified", at(d).identified === false, "tickRel=" + at(d).tickRel);
    }
    /* the band is a contiguous interval in |distance| -- no holes, no second island */
    const edge = (lo, hi) => { for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2;
      if (at(m).identified) hi = m; else lo = m; } return (lo + hi) / 2; };
    const loP = edge(2, 10) * 1, loN = edge(-2, -10) * 1;
    let hiP = null, hiN = null, holes = 0;
    for (let d = 6; d <= 90; d += 0.05) { if (at(d).identified) hiP = d; }
    for (let d = -6; d >= -90; d -= 0.05) { if (at(d).identified) hiN = d; }
    for (let d = loP + 0.05; d <= hiP; d += 0.05) if (!at(d).identified) holes++;
    for (let d = loN - 0.05; d >= hiN; d -= 0.05) if (!at(d).identified) holes++;
    ok("band above spot is +5.37bp .. +75.6bp (xs +0.154 .. +2.17)",
       Math.abs(loP - 5.369) < 0.02 && Math.abs(hiP - 75.58) < 0.1, "lo=" + loP + " hi=" + hiP);
    ok("band below spot is -5.22bp .. -75.7bp (near-symmetric)",
       Math.abs(loN + 5.218) < 0.02 && Math.abs(hiN + 75.70) < 0.1, "lo=" + loN + " hi=" + hiN);
    ok("the band is CONTIGUOUS in |distance| (no holes, no second island)", holes === 0, "holes=" + holes);
    ok("band edges in xs units", close(loP / 1e4 / u, 0.154, 5e-3) && close(hiP / 1e4 / u, 2.168, 5e-3),
       (loP / 1e4 / u) + ".." + (hiP / 1e4 / u));
    /* the inner edge is set by the tick move; the outer edge by the tick probe reaching the engine's clip
       floor. That is not an artefact of VRP_Q_LO: solving the neighbours WITHOUT the clip guard moves the
       outer edge by under 2bp, so sensitivity, not the clip constant, is what closes the band. */
    ok("outer edge is where a one-tick-down quote hits the clip floor", (() => {
      const q = pOverM((hiP + 0.1) / 1e4);
      return q - VRP_TICK <= 0.005 + 1e-9 && q > 0.005;
    })());
  }
}

/* =================================================================================================
   REGRESSION: impliedSigmaTick -- the PUBLIC decider for a reading that has a quote, and the split
   between it and the quote-free prior.
   ================================================================================================= */
console.log("-- impliedSigmaTick: the decider, and its split from the prior");
{
  const S0 = 100000, tau = 8, sigModel = 9e-4;
  const K = S0 * Math.exp(-30 / 1e4);

  const t = impliedSigmaTick(K, S0, tau, 0.95);
  ok("shape carries the reading, both neighbours, both moves and the verdict",
     typeof t.identified === "boolean" && t.sig !== null && t.sigUp !== null && t.sigDown !== null &&
     t.relUp !== null && t.relDown !== null && t.rel !== null && t.sided === "two" && t.x !== null);
  ok("rel is the LARGER of the two one-sided moves", close(t.rel, Math.max(t.relUp, t.relDown), 1e-15));
  ok("the neighbours are the quote plus and minus exactly one tick", (() => {
    const up = impliedSigma(K, S0, tau, 0.95 + VRP_TICK), dn = impliedSigma(K, S0, tau, 0.95 - VRP_TICK);
    return close(t.sigUp, up, 1e-15) && close(t.sigDown, dn, 1e-15);
  })());
  ok("moving the quote UP (toward certainty above a strike below spot) lowers implied sigma",
     t.sigUp < t.sig && t.sigDown > t.sig);

  /* the split: the prior probes the MODEL-FAIR quote, the decider probes the MARKET's quote. They can and do
     disagree, and the decider is what a stored reading is gated on. */
  const prior = sigmaIdentifiability(Math.log(K / S0), sigModel, tau);
  ok("prior probes the model-fair quote and says so", close(prior.qFair, pOver(sigModel, Math.log(K / S0), tau), 1e-12));
  ok("prior is flagged as a prior", prior.prior === true);
  ok("prior says identified at this strike distance", prior.identified === true);
  const dec = impliedSigmaTick(K, S0, tau, 0.99);
  ok("the DECIDER rejects the same strike at a 99c market quote (+1c would be clipped)",
     dec.identified === false && dec.sided === "down", dec.reason);
  ok("prior and decider genuinely disagree here -- the decider wins for a stored reading",
     prior.identified !== dec.identified);

  /* tick-identified does NOT mean plausible: ratioModel is still needed (assumption 4 / review D1) */
  {
    const atmK = S0;
    const d2 = impliedSigmaTick(atmK, S0, tau, 0.30);
    const vt = volTriple({ sigU: sigModel }, { q: 0.30 }, atmK, S0, tau);
    ok("an ATM strike at a 30c market quote IS tick-identified", d2.identified === true, "rel=" + d2.rel);
    ok("...and is still economically absurd (ratioModel > 100)", vt.ratioModel > 100,
       "ratioModel=" + vt.ratioModel);
    ok("so identification and plausibility remain two separate guards, neither substituting for the other",
       vt.identified === true && vt.ratioModel > 100);
  }

  /* guards */
  ok("impliedSigmaTick: guards mirror impliedSigmaInfo's, no throw, never identified on junk", (() => {
    const junk = [undefined, null, NaN, Infinity, -Infinity, "1", {}, [], 0, -1, 1e308, 1e-320];
    for (const a of junk) for (let i = 0; i < 4; i++) {
      const args = [K, S0, tau, 0.95]; args[i] = a;
      const r = impliedSigmaTick(args[0], args[1], args[2], args[3]);
      if (typeof r.identified !== "boolean") return false;
      if (r.identified && r.sided !== "two") return false;
      if (r.sig === null && r.identified) return false;
    }
    return true;
  })());
  ok("impliedSigmaTick: q at the clip bound -> no reading, named reason",
     impliedSigmaTick(K, S0, tau, 0.995).identified === false &&
     /no implied sigma at the quote: quote at or beyond clip bounds/.test(impliedSigmaTick(K, S0, tau, 0.995).reason));
  ok("impliedSigmaTick: tau <= 0 -> named reason", impliedSigmaTick(K, S0, 0, 0.95).reason === "tau <= 0");
  ok("impliedSigmaTick: non-positive price -> named reason",
     impliedSigmaTick(-1, S0, tau, 0.95).reason === "non-positive price");
}

/* =================================================================================================
   REGRESSION: the verdict travels with every reading, so a caller never has to reach for the prior.
   ================================================================================================= */
console.log("-- the decider is attached to impliedSigmaInfo and volTriple");
{
  const S0 = 100000, tau = 15, sigModel = 9e-4;
  const wide = S0 * Math.exp(-20 / 1e4), narrow = S0 * Math.exp(-2 / 1e4);
  const qW = pOver(sigModel, Math.log(wide / S0), tau), qN = pOver(sigModel, Math.log(narrow / S0), tau);

  const iw = impliedSigmaInfo(wide, S0, tau, qW), inn = impliedSigmaInfo(narrow, S0, tau, qN);
  ok("impliedSigmaInfo carries identified / tickRel / tickSided / tickReason",
     typeof iw.identified === "boolean" && iw.tickRel !== null && iw.tickSided === "two" &&
     typeof iw.tickReason === "string");
  ok("impliedSigmaInfo: a 20bp reading is identified, a 2bp reading is not",
     iw.identified === true && inn.identified === false, "20bp=" + iw.tickRel + " 2bp=" + inn.tickRel);
  ok("impliedSigmaInfo keeps every legacy field working",
     iw.sig !== null && iw.x !== null && iw.pMax !== null && iw.relPerCent !== null && iw.reason === "ok" &&
     iw.branch === "single");
  ok("impliedSigmaInfo agrees with impliedSigmaTick on the same inputs", (() => {
    const t = impliedSigmaTick(wide, S0, tau, qW);
    return t.identified === iw.identified && close(t.rel, iw.tickRel, 1e-15) && t.sided === iw.tickSided;
  })());
  ok("impliedSigma (the bare wrapper) is unchanged", close(impliedSigma(wide, S0, tau, qW), iw.sig, 1e-15));
  ok("no reading -> identified false, never true and never undefined",
     impliedSigmaInfo(wide, S0, tau, 0.999).identified === false &&
     impliedSigmaInfo(S0, S0, tau, 0.7).identified === false);

  const vt = volTriple({ sigU: sigModel }, { q: qW }, wide, S0, tau);
  ok("volTriple carries the verdict beside the value",
     vt.identified === true && close(vt.tickRel, iw.tickRel, 1e-15) && vt.tickSided === "two" &&
     vt.bound === VRP_TICK_REL_MAX);
  ok("volTriple keeps every legacy field working",
     vt.sigModel === sigModel && vt.sigImplied !== null && vt.x !== null && vt.xs !== null &&
     vt.ratioModel !== null);
  const vn = volTriple({ sigU: sigModel }, { q: qN }, narrow, S0, tau);
  ok("volTriple on a 2bp strike returns the value but marks it unidentified",
     vn.sigImplied !== null && vn.identified === false && vn.tickRel > VRP_TICK_REL_MAX);
  const vq = volTriple({ sigU: sigModel }, null, wide, S0, tau);
  ok("volTriple with no quote: identified false, tick fields null (nothing to decide)",
     vq.identified === false && vq.tickRel === null && vq.tickSided === null && vq.sigImplied === null);
}

console.log(fails ? "\n" + fails + " FAILURE(S)" : "\nall green");
process.exit(fails ? 1 : 0);
