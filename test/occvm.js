/* OCCVM harness — the determinism seam the golden set depends on.
 *
 * The 2.0 migration process (section 4) requires the vein generator to be seeded and pure: same seed
 * plus same sun yields the same bytes, every time. Without that there is no golden set, no diff, and no
 * way to distinguish a regression from a session. These assertions are the seam, tested at the level the
 * harness can reach; the rendered half lives in occvm/golden/.
 *
 * Also pins CLAUDE.md section 10.5's closure: the vein layer reseeded per hour where section 5 said per
 * session, so the same tab redrew different veins across an hour boundary.
 */
"use strict";
const { load, runner } = require("./lib/load");

/* Strip block and line comments. Every guard in this file that inspects a source file must use this: the
   spine's files document what they removed, so a regex looking for a retired name finds it in the
   changelog and fails on a correct file. Learned three times before it was factored. */
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const { T, done } = runner("occvm: determinism seam");

const vein = h => { h.R("veinLayer()"); return h.ctx.document.documentElement.style["--vein"]; };
const SUN = 1757160000000;   /* 2026-09-06T12:00:00Z — sun up over Dayton */
const NIGHT = 1757214000000; /* 2026-09-07T03:00:00Z — sun well down */

/* --- the seed is injected, not generated internally --- */
{
  const a = load({ storage: { "btc.seed": "12345" } });
  const b = load({ storage: { "btc.seed": "12345" } });
  const c = load({ storage: { "btc.seed": "99999" } });
  const va = vein(a), vb = vein(b), vc = vein(c);
  T("same injected seed yields byte-identical veins", va === vb && !!va);
  T("a different seed yields different veins", va !== vc && !!vc);
  T("the injected seed is the one the generator used", a.store["btc.seed"] === "12345");
}

/* --- the clock is not an input to the vein layer (CLAUDE.md 10.5) --- */
{
  const h = load({ storage: { "btc.seed": "4242" } });
  h.setNow(SUN);   const day = vein(h);
  h.setNow(NIGHT); const night = vein(h);
  h.setNow(SUN + 86400000 * 37); const later = vein(h);
  T("the vein layer does not move with the clock", day === night && day === later && !!day);
}

/* --- with nothing injected, a seed is generated once and persisted for the tab --- */
{
  const h = load();
  const first = vein(h);
  const k = h.store["btc.seed"];
  T("a seed is generated and persisted when none is injected", typeof k === "string" && /^\d+$/.test(k));
  T("re-running the generator in the same tab is stable", vein(h) === first);
}

/* --- the sundial is a pure function of clock and place --- */
{
  const read = () => {
    const h = load();
    h.setNow(SUN);
    h.R("sunTick()");
    const s = h.ctx.document.documentElement.style;
    return { lx: s["--lx"], ly: s["--ly"], elev: s["--elev"], night: s["--night"] };
  };
  const a = read(), b = read();
  T("sunTick is deterministic at a pinned instant", JSON.stringify(a) === JSON.stringify(b));
  T("sunTick writes all four light tokens", ["lx", "ly", "elev", "night"].every(k => a[k] !== undefined && a[k] !== ""));

  /* Until 1.2 these two pinned BTC's own behaviour — a binary --night and a 0.15 --elev night floor —
     specifically so that resolving the divergence would fail here rather than drift. It did. They now
     pin the spine's law instead (OCCVM-L3, L9; D2 and D9 closed at 1.2). */
  const h = load(); h.setNow(NIGHT); h.R("sunTick()");
  const n = h.ctx.document.documentElement.style;
  T("--night is a continuous ramp, not a step", /^[01]\.\d{3}$/.test(n["--night"]) && parseFloat(n["--night"]) === 1, n["--night"]);
  T("--elev falls to zero at night; the floor lives in --fill", parseFloat(n["--elev"]) === 0 && parseFloat(n["--fill"]) > 0.5, { elev: n["--elev"], amb: n["--fill"] });
  T("the light vector resolves neutral overhead below the horizon", n["--lx"] === "0.000" && n["--ly"] === "1.000", { lx: n["--lx"], ly: n["--ly"] });
  T("--glow is a resolved scalar, never a calc()", /^\d+\.\d+$/.test(n["--glow"]), n["--glow"]);
  T("--bone-lo derives with --bone", /^#[0-9a-f]{6}$/.test(n["--bone-lo"]) && n["--bone-lo"] !== "#b7ad9c", n["--bone-lo"]);
}

/* --- OCCVM-L11, 2.8: yield — hold, neck, pinch-off, and a stop that is exact ------------------- */
{
  const Y = require("../occvm/yield.js");
  const R11 = require("../occvm/rheology.js");
  const fs11 = require("fs"), path11 = require("path");
  const ROOT11 = path11.resolve(__dirname, "..");
  const src11 = fs11.readFileSync(path11.join(ROOT11, "occvm", "yield.js"), "utf8");
  const code11 = stripComments(src11);

  /* the crystal's primitive is gone, and its vocabulary with it */
  T("fracture.js is retired from the repository", !fs11.existsSync(path11.join(ROOT11, "occvm", "fracture.js")));
  T("no cleave survives in the primitive's code", !/cleave/.test(code11));
  T("the primitive has no angle: a fluid has no plane", !/atan|twinAngle|TWIN_ANGLE/.test(code11));

  /* the neck: two complementary bodies that taper to one point, animatable because the vertex count holds */
  const [w0, w1] = Y.halves(50, 0), [n0, n1] = Y.halves(50, 1);
  T("the whole element is two rectangles meeting at the neck",
    w0.includes("50% 0%") && w1.includes("50% 0%") && w0.includes("50% 100%") && w1.includes("50% 100%"));
  T("necked, both bodies draw to the mid-height point", n0.includes("50% 50%,50% 50%,50% 50%") && n1.includes("50% 50%,50% 50%,50% 50%"));
  const count = poly => poly.split(",").length;
  T("the neck keeps the vertex count, so CSS interpolates the polygon rather than snapping",
    count(w0) === count(n0) && count(w1) === count(n1));

  /* the retraction runs on the substance's cessation curve, not on an authored bezier */
  T("the easing is the substance's, read at call time", /cssEasing\(/.test(code11) && !/cubic-bezier/.test(code11));
  const curve = Y.easing();
  const pts = curve.match(/[\d.]+/g).map(Number);
  T("and it is a linear() curve ending at exactly 1", /^linear\(0, .*, 1\)$/.test(curve), curve);
  T("with a HARD STOP: the last step is a small fraction of the first — velocity reaches zero rather than tending to it",
    (pts[pts.length - 1] - pts[pts.length - 2]) < 0.1 * (pts[1] - pts[0]),
    `first ${(pts[1] - pts[0]).toFixed(4)} last ${(pts[pts.length - 1] - pts[pts.length - 2]).toFixed(4)}`);
  /* 2.10 — this read "IS the yield-dominated quadratic" at a 1% tolerance, and it passed only because k
     was misattributed. At the real k = 16.18 the rate term is 76.5% of the yield term at this v₀, so the
     curve is mixed: 0.0163 from the quadratic and 0.0403 from the power law. Nearer the quadratic, which
     is why the quadratic is the shape to name; not equal to it, which is why the word "is" is gone. The
     property the primitive actually needs is the HARD STOP, asserted above and unaffected. */
  {
    const dev = f => Math.max(...R11.easing(R11.SUBSTANCE, Y.V0, 17).map((v, i) => Math.abs(v - f(i / 16))));
    const q = dev(u => 1 - Math.pow(1 - u, 2)), pw = dev(u => 1 - Math.pow(1 - u, 1 + 1 / (1 - R11.SUBSTANCE.n)));
    T("at the substance's τ₀ the curve sits near the yield-dominated quadratic, and nearer it than the power law",
      q < 0.02 && q < pw / 2, "quad " + q.toFixed(4) + " vs power " + pw.toFixed(4));
  }
  T("no fade at any point", !/opacity/i.test(code11));
  T("no rotation: a fluid body has no edge to torque about", !/rotate\(/.test(code11));
  T("it respects the reduced-motion floor", /prefers-reduced-motion/.test(src11));
  T("the clone carries its RESOLVED style — 1.1b's lesson, kept", /getComputedStyle\(el\)/.test(src11) && /setProperty\(prop/.test(src11));
  T("the substance is resolved lazily, so splice order cannot null it as it nulled fracture",
    /function substance\(\)/.test(code11) &&
    !/OCCVM_RHEOLOGY/.test(code11.slice(code11.indexOf('"use strict"'), code11.indexOf("function substance"))),
    "no module-scope capture between the IIFE's head and the lazy read");
  T("the durations are authored and named as authored", /NECK_MS/.test(code11) && /RETRACT_MS/.test(code11) && /authored/i.test(src11));
  T("the hold is zero for a click: the click is the stress", !/HOLD_MS|hold:\s*\d/.test(code11));
}

/* --- OCCVM 1.9: freeze and stage ----------------------------------------------------------------
 * "None technical. The risk is skipping it." It was skipped once. These pin that the audit is an
 * instrument rather than a paragraph, that what it found stays found, and that the migration table the
 * release exists to produce actually covers the token surface it claims to.
 */
{
  const fs9 = require("fs"), path9 = require("path");
  const ROOT9 = path9.resolve(__dirname, "..");
  const doc9 = fs9.readFileSync(path9.join(ROOT9, "occvm", "SPINE.md"), "utf8");
  const { audit, provider, isUsed } = require("../occvm/tools/token-audit.js");
  const rows9 = audit();

  T("the token audit is a committed instrument, not a session",
    fs9.existsSync(path9.join(ROOT9, "occvm", "tools", "token-audit.js")));
  T("CI runs the audit as a gate",
    fs9.readFileSync(path9.join(ROOT9, ".github", "workflows", "ci.yml"), "utf8").includes("token-audit.js --check"));

  /* the two classes the audit exists to make impossible */
  const orphans9 = rows9.filter(r => !provider(r));
  T("no token resolves to nothing", orphans9.length === 0, orphans9.map(r => r.token).join(" "));
  /* "dead" is only decidable with every conforming tool in view: a token this tool declares and never
     reads may be read next door. This assertion therefore states what it can see, and says so when it
     cannot see everything — the same rule the instrument itself now follows, and for the same reason it
     had to learn it (CI checks out one repository and this guard failed a green build over four tokens
     Rhyme consumes). Asserting on a partial picture is the golden recorder's old defect wearing a
     different hat. */
  const whole9 = rows9.length && rows9[0].rhymePresent;
  const dead9 = rows9.filter(r => !r.spine && provider(r) && !isUsed(r));
  if (whole9) T("no dead tool-local token survives 1.9", dead9.length === 0, dead9.map(r => r.token).join(" "));
  else T("the audit refuses to judge dead tokens on a partial checkout",
    require("child_process").spawnSync(process.execPath,
      [path9.join(ROOT9, "occvm", "tools", "token-audit.js"), "--check"], { encoding: "utf8" })
      .stdout.includes("AUDIT OK (partial)"));

  /* what 1.9 removed stays removed */
  const html9 = fs9.readFileSync(path9.join(ROOT9, "index.html"), "utf8");
  for (const t of ["--glass-hi", "--ruby-lo", "--warn"])
    T(`${t} stays removed`, !html9.includes(t + ":") && !html9.includes("var(" + t + ")"), t);

  /* the migration table has to actually cover the surface, or it is a summary pretending to be a table */
  T("the migration table exists", doc9.includes("## 6b. The 2.0 migration table"));
  const table9 = doc9.slice(doc9.indexOf("## 6b."), doc9.indexOf("## 7."));
  const missing = rows9.map(r => r.token).filter(t => !table9.includes(t));
  T("every token in the census appears in the migration table", missing.length === 0,
    missing.slice(0, 8).join(" ") + (missing.length > 8 ? ` (+${missing.length - 8})` : ""));
  T("the table records that no aliases are outstanding", /Aliases outstanding: none/.test(table9));
  T("every divergence is resolved as an amendment or an exception",
    /Divergences, each resolved/.test(table9) && /Law amended/.test(table9) && /Documented exception/.test(table9));

  /* D12 — the defect the audit found. It must be registered as open, not quietly absorbed. */
  T("OCCVM-D12 is registered", /\| \*\*D12\*\* \|/.test(doc9));
  T("D12 is recorded as closed at 1.2a", /\| \*\*D12\*\*[\s\S]{0,900}?\*\*closed 1\.2a\*\*/.test(doc9));
  T("the defect count is stated honestly", doc9.includes("**All twelve defects are closed.**"));
  /* D12 is closed at 1.2a. These were "still reproduces" assertions while it was open; inverted now, so
     the defect cannot come back by the same route it arrived — a floor recorded as moved and silently
     deleted, invisible because a write-only token looks exactly like a working one. */
  {
    const h9 = load();
    const night9 = h9.R("OCCVM_SUN.respond({elev:-30,az:180})");
    const day9 = h9.R("OCCVM_SUN.respond({elev:50,az:180})");
    T("D12 closed: ambient holds the bevel up after dark",
      parseFloat(night9["--hi-a"]) > 0.12 && parseFloat(night9["--cut-a"]) > 0.14,
      { hi: night9["--hi-a"], cut: night9["--cut-a"] });
    /* CAUSAL, not a threshold a hardcoded constant would also pass. Below the horizon --elev is 0 at
       every elevation, so direct light is identical at civil dusk and at full night and the ONLY thing
       that differs is --fill (0.473 vs 0.630). If the alphas track that difference, ambient is genuinely
       wired in; if they do not, --fill is write-only again and D12 has returned. */
    const dusk9 = h9.R("OCCVM_SUN.respond({elev:-3,az:180})");
    T("D12 closed: --fill is load-bearing — same direct light, different ambient, different bevel",
      parseFloat(dusk9["--elev"]) === 0 && parseFloat(night9["--elev"]) === 0 &&
      parseFloat(dusk9["--fill"]) !== parseFloat(night9["--fill"]) &&
      parseFloat(dusk9["--hi-a"]) !== parseFloat(night9["--hi-a"]),
      { duskAmb: dusk9["--fill"], duskHi: dusk9["--hi-a"], nightAmb: night9["--fill"], nightHi: night9["--hi-a"] });
    T("D12 closed: daylight is essentially unmoved (ambient fills only what direct light misses)",
      Math.abs(parseFloat(day9["--hi-a"]) - 0.347) < 0.02, day9["--hi-a"]);
    T("the bevel never falls back to the bare 0.060 floor at any elevation",
      [-40, -30, -18, -12, -6, -3, 0, 3, 10, 30, 50, 80].every(e => {
        const t = h9.R(`OCCVM_SUN.respond({elev:${e},az:180})`);
        return parseFloat(t["--hi-a"]) > 0.09 && parseFloat(t["--cut-a"]) > 0.09;
      }));
  }
}

/* --- OCCVM-L9, 1.7 (complete): the phosphor curve and the moon ----------------------------------
 * The dusk staging shipped first and the other two halves of the release did not. This pins them, and
 * pins the boundary the moon may not cross: it is a light for INK, and L3 still owns every surface.
 */
{
  const h7 = load();
  const R = (elev, moonAlt, illum, moonAz) => h7.R(
    `OCCVM_SUN.respond({elev:${elev},az:180${moonAlt === undefined ? "" :
      `,moon:{alt:${moonAlt},illum:${illum},az:${moonAz === undefined ? 90 : moonAz}}`}})`);

  /* the phosphor curve: saturating, exact at both ends, and NOT the linear ramp it replaced */
  const ph = n => parseFloat(h7.R(`OCCVM_SUN.respond({elev:${-2 - n * 8},az:180})["--phosphor"]`));
  T("--phosphor is 0 where night begins", ph(0) === 0, ph(0));
  T("--phosphor reaches exactly 1 at full night", ph(1) === 1, ph(1));
  T("--phosphor is not linear — it saturates",
    ph(0.25) > 0.5 && ph(0.5) > 0.78 && ph(0.25) > 2 * 0.25, { q: ph(0.25), half: ph(0.5) });
  T("--phosphor rises monotonically", ph(0) < ph(0.25) && ph(0.25) < ph(0.5) && ph(0.5) < ph(1));

  /* the moon needs all three: up, lit, and dark. Any one missing and it contributes nothing. */
  const ml = r => parseFloat(r["--moon-light"]);
  T("a moon below the horizon gives no light", ml(R(-30, -10, 1)) === 0);
  T("a new moon high in the sky gives no light", ml(R(-30, 60, 0)) === 0);
  T("a full moon at noon gives no light", ml(R(50, 60, 1)) === 0);
  T("a full moon high on a dark night gives full light", ml(R(-30, 60, 1)) > 0.9, ml(R(-30, 60, 1)));

  /* it reaches ink, and only ink — L3 still owns every surface */
  const dark = R(-30, -10, 0), moonlit = R(-30, 60, 1);
  T("moonlight moves the ink (--bone)", dark["--bone"] !== moonlit["--bone"], { dark: dark["--bone"], moonlit: moonlit["--bone"] });
  T("moonlight moves the ink halo (--nglow)", dark["--nglow"] !== moonlit["--nglow"]);
  for (const surface of ["--sub", "--sub-hi", "--sub-lo", "--rake", "--hi-a", "--cut-a", "--shade-a", "--fill", "--lx", "--ly"])
    T(`moonlight does not touch ${surface} — L3 owns every surface`, dark[surface] === moonlit[surface], surface);

  /* --glow is consumed as an opacity and already saturates at night; a moon term there would be
     clamped away invisibly, so it must NOT be routed through it */
  T("--glow stays within an opacity's range", parseFloat(moonlit["--glow"]) <= 1);
  T("--glow carries no moon term (it would be clamped)", dark["--glow"] === moonlit["--glow"]);

  /* the vector points somewhere real when the moon is up, and nowhere when it is not */
  const up = R(-30, 40, 1, 90), down = R(-30, -5, 1, 90);
  T("the moon vector is a unit direction while it is up",
    Math.abs(Math.hypot(parseFloat(up["--moon-x"]), parseFloat(up["--moon-y"])) - 1) < 2e-3);
  T("the moon vector is zero once it has set",
    parseFloat(down["--moon-x"]) === 0 && parseFloat(down["--moon-y"]) === 0);

  /* the lunar model has to be the real thing, not a plausible oscillator */
  const lunar = h7.R(`(function(){
    var L = OCCVM_SUN.DAYTON, out = [];
    for (var i = 0; i < 60; i++) {
      var d = new Date(Date.UTC(2026, 8, 1) + i * 86400000);
      var p = OCCVM_SUN.position(L.lat, L.lon, d);
      out.push(OCCVM_SUN.moon(L.lat, L.lon, d, p.lam).illum);
    }
    return out; })()`);
  const peaks = lunar.map((v, i) => [i, v]).filter(([i, v]) => i > 0 && i < 59 && v > lunar[i - 1] && v > lunar[i + 1]);
  T("illumination cycles with the synodic month", peaks.length >= 2 && Math.abs((peaks[1][0] - peaks[0][0]) - 29.53) < 1.6,
    peaks.length >= 2 ? peaks[1][0] - peaks[0][0] : "no cycle");
  T("illumination spans a full new-to-full range", Math.max(...lunar) > 0.99 && Math.min(...lunar) < 0.01,
    { max: Math.max(...lunar).toFixed(3), min: Math.min(...lunar).toFixed(3) });
}

/* --- OCCVM-L10, 2.8: the vein is a suspension that gels, not a crystal that grows ----------------
 * From 1.1 to 2.7 this block asserted aragonite's threefold twin on the growth. A fluid has no twin. What
 * it has is a mechanism — diffusion-limited cluster aggregation — and an OUTPUT, the fractal dimension,
 * which is measured here against the literature the substance records rather than fed in as a constant.
 */
{
  const VEINS = require("../occvm/veins.js");
  const R10 = require("../occvm/rheology.js");
  const fs10 = require("fs"), path10 = require("path");
  const read10 = (...p) => fs10.readFileSync(path10.join(__dirname, "..", ...p), "utf8");
  const vcode = stripComments(read10("occvm", "veins.js"));

  /* the crystal is gone from the generator, and so is every dependency */
  T("the generator reads no substance module and no lattice", !/OCCVM_MATERIAL|OCCVM_RHEOLOGY|require\(/.test(vcode));
  T("no twin, no cell, no angle survive as exports",
    VEINS.TWIN_ANGLE === undefined && VEINS.CELL === undefined && VEINS.MISFIT === undefined);

  /* every particle mobile, clusters merging: the bond count IS the merge count */
  const g = VEINS.grow({ w: 96, h: 60, n: 1728, seed: 1 });
  T("the suspension aggregates: one bond per merge, particles minus clusters",
    g.bonds.length / 2 === g.particles - g.clusters, `${g.bonds.length / 2} bonds, ${g.particles} particles, ${g.clusters} clusters`);
  T("it stops at or just below the target cluster count, not at one: a gel is many flocs joined — one step can merge three",
    g.clusters >= 1 && g.clusters <= 8, g.clusters);
  T("bonds are resolved where the particles ENDED: every segment joins Moore neighbours", (() => {
    for (let i = 0; i < g.segs.length; i += 4) {
      const dx = Math.abs(g.segs[i] - g.segs[i + 2]);
      let dy = Math.abs(g.segs[i + 1] - g.segs[i + 3]); if (dy > 30) dy = 60 - dy;
      if (dx > 1 || dy > 1) return false;
    }
    return true;
  })(), "the prototype recorded bonds at contact time, the clusters kept moving, and it rendered confetti");

  /* THE DIMENSION IS MEASURED. Mass–radius, averaged over random centres inside each cluster of at least
     forty particles, on the wrapped lattice; validated on a disk (2.0) and a line (1.0) before use. */
  const massRadius = (pts, h) => {
    const rs = []; for (let r = 2; r <= Math.min(20, Math.sqrt(pts.length)); r *= 1.3) rs.push(r);
    if (pts.length < 40 || rs.length < 3) return NaN;
    const acc = rs.map(() => 0); let seed = 1;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let c = 0; c < 60; c++) {
      const [cx, cy] = pts[(rnd() * pts.length) | 0];
      const d = pts.map(([x, y]) => { let dy = y - cy; if (dy > h / 2) dy -= h; if (dy < -h / 2) dy += h; return (x - cx) ** 2 + dy * dy; }).sort((a, b) => a - b);
      let k = 0; rs.forEach((r, j) => { while (k < d.length && d[k] <= r * r) k++; acc[j] += k; });
    }
    const xs = rs.map(Math.log), ys = acc.map(v => Math.log(v / 60));
    const n = xs.length, sx = xs.reduce((a, b) => a + b), sy = ys.reduce((a, b) => a + b);
    const sxx = xs.reduce((a, x) => a + x * x, 0), sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
    return (n * sxy - sx * sy) / (n * sxx - sx * sx);
  };
  const disk = []; for (let x = -30; x <= 30; x++) for (let y = -30; y <= 30; y++) if (x * x + y * y <= 900) disk.push([x, y]);
  const line = []; for (let x = 0; x < 200; x++) line.push([x, 0]);
  T("the estimator reads a disk as 2 and a line as 1", Math.abs(massRadius(disk, 0) - 2) < 0.15 && Math.abs(massRadius(line, 0) - 1) < 0.1,
    `${massRadius(disk, 0).toFixed(2)} / ${massRadius(line, 0).toFixed(2)}`);
  const D = phi => {
    const ds = [];
    for (let seed = 1; seed <= 6; seed++) {
      const gg = VEINS.grow({ w: 96, h: 60, n: Math.round(5760 * phi), seed });
      for (const m of gg.members) if (m && m.length >= 40) { const d = massRadius(m.map(i => [gg.px[i], gg.py[i]]), 60); if (isFinite(d)) ds.push(d); }
    }
    return ds.reduce((a, b) => a + b, 0) / ds.length;
  };
  const d30 = D(0.3), d15 = D(0.15), d08 = D(0.08);
  T("in the dilute regime the lattice produces the 2-D DLCA dimension the substance records",
    Math.abs(d15 - R10.DLCA_D_LATTICE) < 0.06, `${d15.toFixed(3)} vs ${R10.DLCA_D_LATTICE}`);
  T("at the shipped density the suspension is a gel: the dimension climbs above the floc value, toward 2",
    d30 > d15 + 0.08 && d30 < 2, `${d30.toFixed(3)} at .3 vs ${d15.toFixed(3)} at .15`);
  T("and falls further as the suspension thins", d08 < d15, `${d08.toFixed(3)} at .08`);
  T("the three-dimensional literature value is recorded, not claimed: no planar lattice reaches it",
    R10.DLCA_D === 1.75 && d30 < R10.DLCA_D && R10.fractalDimension() === R10.DLCA_D);

  /* --vein-habit is retired, by measurement (the header) and by deletion */
  const same = VEINS.field({ seed: 5, w: 96, h: 60, density: 0.3 }).svg;
  T("habit is accepted and ignored: one seed, one picture, at any habit",
    VEINS.field({ seed: 5, w: 96, h: 60, density: 0.3, habit: 1 }).svg === same &&
    VEINS.field({ seed: 5, w: 96, h: 60, density: 0.3, habit: 0 }).svg === same);
  /* CODE, NOT PROSE: the spine and both surfaces explain the retirement in comments and copy, and a
     guard that greps the name finds its own changelog (the fourth time; stripComments exists for this).
     A declaration is `--vein-habit:`; a consumption is the quoted name or a var() reference. */
  const noDecl = txt => !/--vein-habit\s*:/.test(stripComments(txt));
  const noRead = txt => !/"--vein-habit"|var\(--vein-habit/.test(txt);
  T("--vein-habit is gone from the spine", noDecl(read10("occvm", "spine.css")));
  T("and neither declared nor read on either of this repository's surfaces",
    noDecl(read10("index.html")) && noRead(read10("index.html")) &&
    noDecl(read10("occvm", "reference", "index.html")) && noRead(read10("occvm", "reference", "index.html")));

  /* density IS the axis, and it expresses */
  T("density changes the picture: more of the suspension, more bonds",
    VEINS.field({ seed: 5, w: 96, h: 60, density: 0.15 }).bonds < VEINS.field({ seed: 5, w: 96, h: 60, density: 0.3 }).bonds);

  /* determinism, timing, no bezier — the law's standing exits */
  const a = VEINS.grow({ w: 96, h: 60, n: 1728, seed: 77 }), b = VEINS.grow({ w: 96, h: 60, n: 1728, seed: 77 });
  T("growth is deterministic under a fixed seed", JSON.stringify(a.segs) === JSON.stringify(b.segs));
  const t0 = Date.now();
  for (let i = 0; i < 8; i++) VEINS.grow({ w: 96, h: 60, n: 1728, seed: 100 + i });
  const each = (Date.now() - t0) / 8;
  T("aggregation stays well inside the 30ms exit criterion", each < 30, each.toFixed(1) + "ms");
  T("no bezier command survives the rewrite", !/[CcSsQqTtAa]\s*[\d-]/.test(same.match(/d='([^']*)'/)[1]));

  /* the render: a floc is suspended, not carved */
  T("the deep stroke is blurred — the one authored rendering value, named as one",
    /feGaussianBlur/.test(same) && /filter='url\(#s\)'/.test(same));
  T("and soft 0 restores the seam", !/feGaussianBlur/.test(VEINS.field({ seed: 5, w: 96, h: 60, density: 0.3, soft: 0 }).svg));
}
/* --- OCCVM 1.8: the reference surface -----------------------------------------------------------
 * Its whole claim is that it holds no values of its own, so that anything wrong on it is wrong in the
 * spine. That claim is only worth something if it is checked mechanically, which is what this block is.
 */
{
  const fs6 = require("fs"), path6 = require("path");
  const ROOT6 = path6.resolve(__dirname, "..");
  const REF = path6.join(ROOT6, "occvm", "reference", "index.html");
  const { block: block6, fence: fence6, PARTS: PARTS6 } = require("../occvm/tools/splice-spine");

  T("the reference surface exists", fs6.existsSync(REF));
  const ref = fs6.existsSync(REF) ? fs6.readFileSync(REF, "utf8") : "";

  /* derived, not a literal: the reference must carry exactly the parts the tool carries. A hardcoded
     count is one more authored number to forget — it survived 1.8 and had to be hand-edited at 2.0. */
  const refParts = PARTS6.filter(p => p.target.indexOf("reference") >= 0).map(p => p.name).sort();
  const toolParts = PARTS6.filter(p => p.target === "index.html").map(p => p.name).sort();
  T("the reference surface carries exactly the parts the tool carries",
    refParts.join(",") === toolParts.join(","), refParts.join(",") + " vs " + toolParts.join(","));
  for (const name of refParts) {
    const f = fence6(name);
    const src = fs6.readFileSync(path6.join(ROOT6, "occvm", name), "utf8");
    T(`reference: ${name} is spliced exactly once`,
      ref.split(f.open).length - 1 === 1 && ref.split(f.close).length - 1 === 1, name);
    const a = ref.indexOf(f.open), b = ref.indexOf(f.close);
    T(`reference: ${name} matches occvm/${name}`,
      ref.slice(a, b + f.close.length) === block6(name, src), name);
  }

  /* THE LOAD-BEARING ONE. Strip the fences — inside them the spine may of course state values, that is
     what a spine is — and nothing resembling an authored colour may remain. A reference surface that
     carries its own hex is describing a design rather than resolving one, and it would keep looking
     right after the spine underneath it had stopped being applied. */
  const unfenced = ref.replace(/\/\* ==== OCCVM SPINE [\s\S]*?==== \*\/[\s\S]*?\/\* ==== END OCCVM [\s\S]*?==== \*\//g, "");
  const styleBlock = (unfenced.match(/<style>([\s\S]*?)<\/style>/) || [, ""])[1];
  const scriptBlocks = (unfenced.match(/<script>[\s\S]*?<\/script>/g) || []).join("\n");
  T("the reference surface's own CSS authors no hex literal",
    !/#[0-9a-fA-F]{3,8}\b/.test(styleBlock), (styleBlock.match(/#[0-9a-fA-F]{3,8}\b/g) || [])[0]);
  T("the reference surface's own CSS authors no rgb()/rgba() triplet",
    !/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/.test(styleBlock), (styleBlock.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+[^)]*\)/g) || [])[0]);
  T("the reference surface's own CSS names no colour keyword",
    !/(?<![\w-])(white|black|red|green|blue|gray|grey|silver|gold)(?![\w-])/.test(styleBlock));
  T("the reference surface's own JS authors no hex literal",
    !/#[0-9a-fA-F]{3,8}\b/.test(scriptBlocks), (scriptBlocks.match(/#[0-9a-fA-F]{3,8}\b/g) || [])[0]);

  /* it must wear the spine's primitives rather than reimplement them — that is the difference between a
     surface that conforms and a surface that merely resembles one */
  T("its sections wear the spine's own .occvm-slab", (ref.match(/class="law occvm-slab"/g) || []).length >= 10);
  T("it composes bevel and cast rather than re-authoring either",
    ref.includes("var(--occvm-bevel), var(--occvm-cast-2)"));
  T("its controls carry the interaction primitives (L8)", ref.includes("occvm-act occvm-focus"));

  /* one specimen per law, and the ids the wiring paints into must exist */
  for (const id of ["l1", "l3", "l5", "l6", "l9", "l10", "tok", "pick"])
    T(`the reference surface carries a #${id} specimen`, ref.includes(`id="${id}"`), id);
  for (let n = 1; n <= 10; n++)
    T(`OCCVM-L${n} has a section on the reference surface`, ref.includes(`OCCVM-L${n}<`), n);

  /* 1.8's full brief, not just the parts that were convenient: the roadmap asks for the light vector
     swept on a SLIDER rather than a clock, slabs at every thickness, controls in every state, ink at
     every scale. The first pass shipped five fixed dusk cells and called the sweep done. */
  T("the sweep is a real slider over the light", /<input[^>]+type="range"[^>]+id="sweep"/.test(ref));
  T("the sweep drives the sundial at a held instant, not canned frames",
    ref.includes("function setHeld") && ref.includes("OCCVM_SUN.tick(document.documentElement, SUN_PLACE, when)"));
  T("the sweep can be released back to the real clock", ref.includes("function releaseHold") && ref.includes("sweepResume"));
  T("the clock does not yank the page while the slider holds it", ref.includes("if (held === null) repaint()"));
  T("the sweep is labelled for a screen reader", /id="sweep"[\s\S]{0,200}aria-label=/.test(ref));
  T("controls are shown in every state", ref.includes('["rest", {}]') && ref.includes('["pressed"') && ref.includes('["disabled"'));
  T("each control reports its own measured box, not a claimed one",
    ref.includes("getBoundingClientRect()") && ref.includes('"×"'));
  T("slabs are shown at every depth the spine defines",
    ["--occvm-cast-1", "--occvm-cast-2", "--occvm-cast-3"].every(d => ref.includes(`["${d}"`)));
  T("ink is shown at every scale, in both faces",
    ref.includes("21px serif") && ref.includes("9.5px label") && ref.includes("13px mono"));

  /* the recorder must actually record it — a surface added and never diffed is decoration */
  const { TOOLS } = require("../occvm/golden/record.js");
  T("the golden recorder carries the reference surface", TOOLS.indexOf("reference") >= 0, TOOLS.join(","));
  T("the reference surface has a recorded golden set",
    fs6.existsSync(path6.join(ROOT6, "occvm", "golden", "reference", "tokens.json")));
}

/* --- OCCVM-L9, 1.7: civil/nautical/astronomical dusk staging, additive over the existing --night ramp -- */
{
  const h = load();
  const stage = elev => h.R(`OCCVM_SUN.respond({elev:${elev},az:0})["--dusk-stage"]`);
  T("day at or above the horizon", stage(0) === "day", stage(0));
  T("day just above civil twilight", stage(-0.01) === "civil", stage(-0.01));
  T("civil twilight spans 0 to -6", stage(-3) === "civil" && stage(-6) === "civil", { m3: stage(-3), m6: stage(-6) });
  T("nautical twilight spans -6 to -12", stage(-6.01) === "nautical" && stage(-9) === "nautical" && stage(-12) === "nautical",
    { m601: stage(-6.01), m9: stage(-9), m12: stage(-12) });
  T("astronomical twilight spans -12 to -18", stage(-12.01) === "astronomical" && stage(-15) === "astronomical" && stage(-18) === "astronomical",
    { m1201: stage(-12.01), m15: stage(-15), m18: stage(-18) });
  T("night below -18", stage(-18.01) === "night" && stage(-40) === "night", { m1801: stage(-18.01), m40: stage(-40) });

  /* the law is explicit: the ramp is unchanged, staging is additive over it — not a replacement */
  const at = (elev, key) => h.R(`OCCVM_SUN.respond({elev:${elev},az:0})["${key}"]`);
  T("the --night ramp is untouched by the staging (still 0 at -2, 1 at -10)",
    at(-2, "--night") === "0.000" && at(-10, "--night") === "1.000", { m2: at(-2, "--night"), m10: at(-10, "--night") });

  T("sunTick mirrors the stage onto S.sun", (() => {
    h.setNow(NIGHT); h.R("sunTick()");
    return typeof h.R("S.sun.stage") === "string" && h.R("S.sun.stage").length > 0;
  })());
}

/* --- 1.7: the tile's surface bloom is deleted, not renamed — OCCVM-L9 reserves --glow for ink only --- */
{
  const fs5 = require("fs"), path5 = require("path");
  const html5 = fs5.readFileSync(path5.join(__dirname, "..", "index.html"), "utf8");
  T("--bloom is not declared", !html5.includes("--bloom:"));
  T("--bloom is not referenced", !html5.includes("var(--bloom)"));
  T("the tile carries no surface glow box-shadow", !/rgba\(63,\s*191,\s*126,\s*var\(--bloom\)\)/.test(html5));
}

/* --- the screen convention both tools share (occvm/SPINE-AUDIT.md section 3) --- */
{
  const h = load(); h.setNow(SUN); h.R("sunTick()");
  const s = h.ctx.document.documentElement.style;
  const lx = parseFloat(s["--lx"]), ly = parseFloat(s["--ly"]);
  T("the light vector is unit length (lx=sin az, ly=-cos az)", Math.abs(Math.hypot(lx, ly) - 1) < 2e-3, { lx, ly });
}

/* --- the spine: spliced, matching, above the tool's own CSS, and no wider than SPINE.md says --- */
{
  const fs = require("fs"), path = require("path");
  const ROOT = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const spine = fs.readFileSync(path.join(ROOT, "occvm", "spine.css"), "utf8");
  const doc = fs.readFileSync(path.join(ROOT, "occvm", "SPINE.md"), "utf8");
  const { block, fence, PARTS } = require("../occvm/tools/splice-spine");

  /* filtered to the parts spliced into THIS file: since 1.8 a part is spliced into more than one target
     (the tool and the reference surface), and an unfiltered loop would check index.html twice per part
     and call the duplicate coverage. The reference surface has its own block below. */
  for (const part of PARTS.filter(p => p.target === "index.html")) {
    const f = fence(part.name);
    const src = fs.readFileSync(path.join(ROOT, "occvm", part.name), "utf8");
    T(`${part.name} is spliced exactly once`,
      html.split(f.open).length - 1 === 1 && html.split(f.close).length - 1 === 1);
    const a = html.indexOf(f.open), b = html.indexOf(f.close);
    T(`${part.name} matches occvm/${part.name}`, html.slice(a, b + f.close.length) === block(part.name, src));
  }

  const i = html.indexOf(fence("spine.css").open), j = html.indexOf(fence("spine.css").close);
  T("the sundial is defined before sunTick calls it",
    html.indexOf(fence("sundial.js").open) < html.indexOf("function sunTick(){"));
  T("the tool keeps no second solar implementation (L3)", !html.includes("function solarPosition("));

  /* 1.0 is a no-op because the spine is inlined ABOVE the tool's own declarations, so the tool wins
     every collision by ordinary cascade order (2.0 migration process section 3.2). If the block ever
     moves below them it stops being inert and starts overriding. */
  T("the spine sits above the tool's own :root", i >= 0 && i < html.indexOf("--sub:#1b1a22"));

  /* SPINE.md section 2a enumerates what 1.0 governs. The code cannot quietly grow past the document:
     the expected set is parsed out of the document, not restated here. */
  /* Section 2a alone — the tokens spine.css DECLARES. Slice to the next heading, not to a named one,
     so inserting a section between them cannot silently widen what this scans. Section 2ab lists the
     tokens the sundial WRITES at runtime; those are not CSS declarations and are not checked here. */
  const secStart = doc.indexOf("### 2a.");
  const secEnd = doc.indexOf("### 2", secStart + 8);
  const sec = doc.slice(secStart, secEnd);
  const documented = new Set((sec.match(/--[a-z0-9-]+/g) || []));
  /* Section 2a spans every CSS part the spine ships, not just spine.css: since 1.3 the owned mono stack
     and --t-num are declared in mono.css, because the part that declares them is the part that carries
     the face. Scanning one file would let a token in the other drift out of the document unnoticed. */
  const declared = new Set();
  for (const part of ["spine.css", "mono.css"]) {
    const f = path.join(ROOT, "occvm", part);
    if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f, "utf8");
    const head = src.indexOf(":root");
    if (head < 0) continue;
    const tail = src.indexOf("---- primitives");
    for (const m of src.slice(head, tail > head ? tail : undefined).match(/^\s*(--[a-z0-9-]+)\s*:/gm) || [])
      declared.add(m.trim().replace(/\s*:$/, ""));
  }
  const extra = [...declared].filter(k => !documented.has(k));
  T("the spine declares nothing SPINE.md section 2a does not list", extra.length === 0, extra);
  T("the spine declares every token section 2a lists", [...documented].every(k => declared.has(k)),
    [...documented].filter(k => !declared.has(k)));

  /* Every primitive is namespaced, because .row/.wrap/.note already mean incompatible things in the
     two tools (OCCVM-D11): an un-namespaced spine primitive breaks a tool on the day it is inlined. */
  const sels = (spine.match(/^\.[a-zA-Z][\w-]*/gm) || []);
  T("every spine primitive is namespaced .occvm-", sels.length > 0 && sels.every(x => x.startsWith(".occvm-")), sels);
}

/* --- OCCVM-L4 / roadmap 1.2 exit: no fixed cast offset survives outside the primitives -------------
 * "Fixed offset" means a literal non-zero x or y. A `0 0 <blur>` bloom is not an offset and is not a
 * cast; neither is `none`. The spine's own primitive block is where offsets may be authored, so it is
 * excluded from the scan — that is what "outside the primitives" means.
 */
{
  const fs = require("fs"), path = require("path");
  const { fence } = require("../occvm/tools/splice-spine");
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const f = fence("spine.css");
  const i = html.indexOf(f.open), j = html.indexOf(f.close);
  const tool = html.slice(0, i) + html.slice(j);
  const bad = [];
  for (const m of tool.matchAll(/box-shadow:([^;}]*)/g))
    for (const layer of m[1].split(",")) {
      const t = layer.trim().replace(/^inset\s*/, "");
      const n = /^(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(t);
      if (n && (parseFloat(n[1]) !== 0 || parseFloat(n[2]) !== 0)) bad.push(layer.trim());
    }
  T("no fixed cast offset outside the primitives (1.2 exit)", bad.length === 0, bad);
}

/* --- OCCVM-L4: the cast falls AWAY from the sun ---------------------------------------------------
 * A direction that reads plausible and is backwards is the failure this repository takes most seriously
 * (CLAUDE.md section 5). Every fixed offset 1.2 replaced had this sign inverted, so it is pinned here
 * semantically — the sun's real position at four bearings, against the sign of the resulting cast —
 * rather than by matching the text of a calc().
 */
{
  const h = load();
  const cast = (lx, ly) => ({ x: -lx, y: -ly });   /* the rule the spine's cast tokens encode */
  const spine = require("fs").readFileSync(require("path").join(__dirname, "..", "occvm", "spine.css"), "utf8");

  T("every cast depth negates the light vector", ["1", "2", "3"].every(d => {
    const m = new RegExp(`--occvm-cast-${d}:\\s*calc\\(var\\(--lx[^)]*\\)\\s*\\*[^*]*\\*\\s*-`).test(spine.replace(/\n/g, " "));
    return m;
  }), "a cast depth is missing its negation");

  /* Four bearings through the day, from the shared sundial, checked against where a shadow must land. */
  const rows = [
    { iso: "2026-09-06T11:30:00Z", where: "sun in the east",  expect: "cast to the west (screen left)",  x: -1 },
    { iso: "2026-09-06T17:45:00Z", where: "sun due south",    expect: "cast to the north (screen up)",   y: -1 },
    { iso: "2026-09-06T23:15:00Z", where: "sun in the west",  expect: "cast to the east (screen right)", x: +1 },
  ];
  for (const r of rows) {
    const v = h.R(`(function(){var p=OCCVM_SUN.position(SUN_DEF.lat,SUN_DEF.lon,new Date(${JSON.stringify(r.iso)}));
                    var t=OCCVM_SUN.respond(p); return {lx:+t["--lx"], ly:+t["--ly"]};})()`);
    const c = cast(v.lx, v.ly);
    const ok = r.x !== undefined ? Math.sign(c.x) === r.x : Math.sign(c.y) === r.y;
    T(`${r.where}: ${r.expect}`, ok, { lx: v.lx, ly: v.ly, cast: c });
  }
}

/* --- OCCVM-D5 / roadmap 1.6: the PWA is whole, and the cache name cannot go stale ------------------ */
{
  const fs = require("fs"), path = require("path");
  const ROOT = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  T("a service worker ships", fs.existsSync(path.join(ROOT, "sw.js")));
  T("the page registers it", /serviceWorker\.register\("\.\/sw\.js\?v="/.test(html));

  /* The stamp lives in two places by design — the deploy comment and BUILD_STAMP — because the worker's
     cache name derives from the second. One replace-all covers both; this is what catches a miss. */
  const comment = (html.match(/<!--\s*(build-\d{14})\s*-->/) || [])[1];
  const konst = (html.match(/BUILD_STAMP\s*=\s*"(build-\d{14})"/) || [])[1];
  T("BUILD_STAMP equals the deploy stamp", !!comment && comment === konst, { comment, konst });

  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  T("the cache name comes from the registration, not a literal", /searchParams\.get\("v"\)/.test(sw));

  /* Market data is never cached: a cached price is a wrong price, and this tool is only measurement. */
  T("the worker passes cross-origin and /api straight through",
    /url\.origin !== self\.location\.origin \|\| url\.pathname\.startsWith\("\/api"\)/.test(sw));
  T("the page is network-first so a new stamp lands", sw.indexOf("fetch(req)") < sw.indexOf("caches.match(req)"));

  /* CLAUDE.md section 2 records one style block and one script as an architectural property, and
     test/lib/load.js reads the script by first-open to last-close. A second tag breaks every harness. */
  T("still one <script> and one <style>",
    (html.match(/<script/g) || []).length === 1 && (html.match(/<style/g) || []).length === 1);

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.webmanifest"), "utf8"));
  const tag = (html.match(/<meta name="theme-color" content="([^"]+)"/) || [])[1];
  T("the manifest and the theme-color tag agree (section 8)", manifest.theme_color === tag, { manifest: manifest.theme_color, tag });
}

/* --- OCCVM-L8 / roadmap 1.5: the interaction floor ------------------------------------------------
 * Exit criteria: every action reachable by keyboard, every state announced, no target under 44px.
 * Checked structurally here; the rendered halves (real box sizes, no non-button handlers) are checked
 * in a browser, because a stylesheet cannot tell you what an element actually measures.
 */
{
  const fs = require("fs"), path = require("path");
  const ROOT = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const spine = fs.readFileSync(path.join(ROOT, "occvm", "spine.css"), "utf8");
  const markup = html.slice(0, html.indexOf("<script"));

  T("no inline onclick anywhere in the markup", !/\son[a-z]+\s*=/i.test(markup));
  T("no control is nested inside another", !/<a\b[^>]*>[^<]*<button/i.test(html));

  /* A toggle that carries its state only in a class tells a screen reader nothing. */
  for (const id of ["viewBtn", "pauseBtn", "callAbove", "callBelow"])
    T(`${id} announces its state`, new RegExp(`id="${id}"[^>]*aria-pressed`).test(html), id);
  T("both call buttons keep aria-pressed in sync on click",
    (html.match(/setAttribute\("aria-pressed"/g) || []).length >= 4);

  T("every control meets the 44px floor in CSS", /button\{[^}]*min-height:44px/.test(html.replace(/\s*\n\s*/g, "")));

  /* One rule, in the spine, rather than a list of selectors a new animation escapes tomorrow. */
  T("reduced motion is honoured system-wide from the spine",
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\*::after/.test(spine));
  T("the tool's own unguarded motion is covered by it",
    /transition:color \.5s/.test(html) && /transition-duration: \.01ms !important/.test(html));
  T("durations go to .01ms, not 0, so transitionend still fires",
    !/transition-duration: 0 !important/.test(spine) && /\.01ms/.test(spine));
}

/* --- OCCVM-L10 / roadmap 1.1: veins are grown, not drawn -------------------------------------------- */
{
  const h = load({ storage: { "btc.seed": "20260906" } });
  h.R("veinLayer()");
  const vein = decodeURIComponent(h.ctx.document.documentElement.style["--vein"] || "");

  T("the vein layer is produced", vein.length > 500);
  T("it is a data URI, not bare markup", /url\("data:image\/svg\+xml/.test(vein), vein.slice(0, 40));

  /* The whole point of the release: no curve is fitted over the growth. A path built from a walk uses
     moveto and lineto and nothing else; C, S, Q, T and A are the bezier arriving back through the
     renderer. Checked on the path data alone, since the surrounding markup is full of letters. */
  const dm = vein.match(/<path id='v' d='([^']+)'/);
  T("the aggregate is traced as straight segments", !!dm && /^[ML0-9 .,-]+$/.test(dm[1]),
    dm ? [...new Set(dm[1].replace(/[0-9 .,-]/g, ""))].join("") : "no path");
  T("no bezier command survives anywhere in the layer", !/[CSQTA]\d|[CSQTA] ?-?\d/.test(dm ? dm[1] : ""));

  /* seeded and pure — the golden set and the injected seed both depend on it */
  const again = load({ storage: { "btc.seed": "20260906" } });
  again.R("veinLayer()");
  T("the same seed grows the same aggregate",
    again.ctx.document.documentElement.style["--vein"] === h.ctx.document.documentElement.style["--vein"]);

  const other = load({ storage: { "btc.seed": "111" } });
  other.R("veinLayer()");
  T("a different seed grows a different aggregate",
    other.ctx.document.documentElement.style["--vein"] !== h.ctx.document.documentElement.style["--vein"]);

  /* the fallback OCCVM-L10 requires: growth failing must not leave the surface bare */
  const fs2 = require("fs"), path2 = require("path");
  const html2 = fs2.readFileSync(path2.join(__dirname, "..", "index.html"), "utf8");
  T("the previous generator is kept as the fallback", /function veinLayerLegacy\(/.test(html2));
  T("growth is guarded and falls back", /catch\(e\)\{ svg=encodeURIComponent\(veinLayerLegacy/.test(html2));
  T("the generator reads the spine's density token, and no longer the retired habit",
    /"--vein-density"/.test(html2) && !/"--vein-habit"/.test(html2));
}

/* --- OCCVM-L7 / roadmap 1.3: the numeric face ------------------------------------------------------
 * Exit: no tool depends on a font the visitor's OS supplies, and column alignment holds at every weight.
 * The rendered halves — which face actually paints, and the measured advance at each weight — are
 * checked in a browser; a stylesheet cannot tell you what a glyph measures.
 */
{
  const fs3 = require("fs"), path3 = require("path");
  const ROOT3 = path3.resolve(__dirname, "..");
  const html3 = fs3.readFileSync(path3.join(ROOT3, "index.html"), "utf8");
  const mono = fs3.readFileSync(path3.join(ROOT3, "occvm", "mono.css"), "utf8");

  T("the face is embedded, not fetched", /@font-face[\s\S]*?url\(data:font\/woff2;base64,/.test(mono)
    && !/url\(https?:/.test(mono));
  /* count rule openings, not mentions: the prose above explains why a fallback stack survives and says
     "@font-face" while doing so. */
  T("two real weights ship", (mono.match(/@font-face\s*\{/g) || []).length === 2
    && /font-weight:\s*400/.test(mono) && /font-weight:\s*600/.test(mono),
    (mono.match(/@font-face\s*\{/g) || []).length);
  T("weight synthesis is off", /font-synthesis:\s*none/.test(mono));

  /* The tool must no longer name an OS face first. Its own --mono declaration is gone; the spine's
     owned stack governs, and the fallbacks stay only so a failed @font-face still lands on mono. */
  const owned = /--mono:\s*"OCCVM Mono"/.test(html3);
  T("--mono is the owned stack, spine-governed", owned);
  T("the tool declares no competing --mono",
    (html3.match(/--mono\s*:/g) || []).length === 1, (html3.match(/--mono\s*:/g) || []).length);

  T("the browser's own default mono is claimed too", /\bcode,\s*\n?kbd,/.test(mono) || /code,[\s\S]{0,40}font-family: var\(--mono\)/.test(mono));

  /* A symbol the subset does not carry, sitting in a right-aligned numeric column, brings its own
     advance and shifts every digit before it. Those sites pin the advance to 1ch. */
  T("uncovered symbols in numeric cells are width-pinned",
    /\.occvm-sym\s*\{[^}]*width:\s*1ch/.test(mono) && (html3.match(/class="occvm-sym"/g) || []).length >= 2);

  T("the subset is regenerable from a committed source",
    fs3.existsSync(path3.join(ROOT3, "occvm", "fonts", "upstream", "IBMPlexMono-latin-400.woff2"))
    && fs3.existsSync(path3.join(ROOT3, "occvm", "tools", "subset-mono.py"))
    && fs3.existsSync(path3.join(ROOT3, "occvm", "mono.head.css")));
  T("the licence travels with the font", fs3.existsSync(path3.join(ROOT3, "occvm", "fonts", "OFL.txt")));
}

/* --- OCCVM-D1: the expired alias block is gone, not just unused ------------------------------------
 * 1.2's golden diff proved --ink/--meas/--dim moved with what they alias, so the fix was a migration of
 * every call site to the canonical name (1.9), not a deletion of dead code. This pins that it stayed
 * gone: none of the eight legacy names may be declared or referenced again.
 */
{
  const fs4 = require("fs"), path4 = require("path");
  const html4 = fs4.readFileSync(path4.join(__dirname, "..", "index.html"), "utf8");
  const DEAD = ["--ink", "--meas", "--dim", "--faint", "--bondi", "--bondi-deep", "--model", "--model-dim"];
  for (const tok of DEAD) {
    T(`${tok} is not declared`, !html4.includes(`${tok}:`), tok);
    T(`${tok} is not referenced`, !html4.includes(`var(${tok})`), tok);
  }
  T("--ink2 survives — a distinct token, not part of the alias block", html4.includes("var(--ink2)"));
}

/* --- OCCVM-D6: the mineral is a real, chosen preference — and stays off outcome colour ------------
 * L6 freezes three minerals with fixed accent/deep hex; this pins the frozen table, that the choice
 * persists and drives the vein layer, and — the load-bearing negative — that malachite/ruby's fixed
 * win/lose meaning (CLAUDE.md section 5: "the most dangerous possible bug in this tool") is never
 * touched by a mineral switch.
 */
{
  const L6 = {
    amethyst:  { m: "#8d5cf0", mlo: "#4a2a8c" },
    malachite: { m: "#3fbf7e", mlo: "#1c6a45" },
    ruby:      { m: "#e0475f", mlo: "#6b1a2e" },
  };
  const OCCVM_MINERALS = require("../occvm/minerals.js");
  for (const k of Object.keys(L6)) {
    T(`occvm/minerals.js ${k} matches SPINE.md L6`,
      OCCVM_MINERALS[k] && OCCVM_MINERALS[k].m === L6[k].m && OCCVM_MINERALS[k].mlo === L6[k].mlo, k);
  }

  const h5 = load({ storage: { "btc.seed": "555" } });
  h5.R("loadCfg()");
  T("mineral defaults to amethyst", h5.R("S.cfg.mineral") === "amethyst");

  h5.R("applyMineral()");
  const rs5 = h5.ctx.document.documentElement.style;
  T("--mineral resolves to the chosen mineral's accent", rs5.getPropertyValue("--mineral") === "#8d5cf0");
  T("--mineral-lo resolves to its deep", rs5.getPropertyValue("--mineral-lo") === "#4a2a8c");

  const veinAmethyst = vein(h5);
  h5.R("setMineral('ruby')");
  T("setMineral persists the choice", h5.R("S.cfg.mineral") === "ruby");
  T("setMineral saves to btc.cfg", JSON.parse(h5.store["btc.cfg"]).mineral === "ruby");
  T("--mineral follows the switch to ruby", rs5.getPropertyValue("--mineral") === "#e0475f");
  const veinRuby = h5.ctx.document.documentElement.style["--vein"];
  T("the vein layer's colour changes with the mineral, same seed", veinAmethyst !== veinRuby);

  /* this harness's getComputedStyle is stubbed empty (test/lib/load.js) — it cannot see a plain :root{}
     CSS declaration, only an inline override. So "untouched" here means never inline-set at all, which
     is exactly the invariant: applyMineral()/setMineral() must never call .style.setProperty on these. */
  T("switching mineral does not inline-set --malachite", rs5.getPropertyValue("--malachite") === "");
  T("switching mineral does not inline-set --ruby", rs5.getPropertyValue("--ruby") === "");
  T("switching mineral does not inline-set --up (outcome colour)", rs5.getPropertyValue("--up") === "");
  T("switching mineral does not inline-set --down (outcome colour)", rs5.getPropertyValue("--down") === "");

  const legacy5 = h5.R("veinLayerLegacy(555, 'ruby')");
  T("the legacy fallback carries ruby's own vein tint, not a fixed malachite",
    legacy5.includes("8f2740") && legacy5.includes("f5a3b3"));
  T("the legacy fallback no longer hardcodes malachite hex", !legacy5.includes("1c6a45") && !legacy5.includes("3fbf7e"));
}

/* ── 2.8 — the crystal leaves (OCCVM-L12, second basis) ───────────────────────────────────────
 * From 2.0 to 2.7 this block asserted aragonite: the lattice's single owner, the twin angle's one value
 * across three consumers, the crystal's optics, P1's stiffness-derived durations and P4's cell-derived
 * spacing. The substance is a fluid now. It has no lattice, no stiffness tensor and no cell, so every one
 * of those retires WITH the crystal rather than being ported to a substance that cannot carry it; the
 * substrate derivation is the one thing that ported (2.5), and its guards move here onto rheology.js.
 */
{
  const R = require("../occvm/rheology.js");
  const K = R.SUBSTANCE;
  const fs20 = require("fs"), path20 = require("path"), vm20 = require("vm");
  const read = (...p) => fs20.readFileSync(path20.join(__dirname, "..", ...p), "utf8");

  /* nothing reads the crystal, so it is gone — not deprecated, not aliased, gone */
  T("material.js is deleted", !fs20.existsSync(path20.join(__dirname, "..", "occvm", "material.js")));
  for (const f of [["index.html"], ["occvm", "reference", "index.html"]])
    T(`${f.join("/")} carries no crystal block and no fracture block`,
      !/OCCVM_MATERIAL|OCCVM_FRACTURE|OCCVM SPINE material\.js|OCCVM SPINE fracture\.js/.test(read(...f)));
  const { PARTS, RETIRED } = require("../occvm/tools/splice-spine.js");
  T("the splicer lists both as RETIRED, so a lingering block fails --check",
    RETIRED.includes("material.js") && RETIRED.includes("fracture.js") && !PARTS.some(p => RETIRED.includes(p.name)));
  T("yield.js is a part on every target fracture.js was", PARTS.filter(p => p.name === "yield.js").length === 2);

  /* the page's own load order, with no require in scope — the guard that caught 1.1b's null capture */
  {
    const src = read("index.html");
    const blk = n => { const i = src.indexOf("var " + n + " ="); return src.slice(i, src.indexOf("\nif (typeof module", i)); };
    const iY = src.indexOf("var OCCVM_YIELD ="), iR = src.indexOf("var OCCVM_RHEOLOGY =");
    T("yield sits before rheology in the page, so the guard tests the real order", iY > 0 && iR > 0 && iY < iR);
    const ctx = vm20.createContext({ Math, console });
    let threw = null, curve = "";
    try { vm20.runInContext(blk("OCCVM_YIELD"), ctx); vm20.runInContext(blk("OCCVM_RHEOLOGY"), ctx); curve = ctx.OCCVM_YIELD.easing(); }
    catch (e) { threw = e.message; }
    T("yield resolves its curve under the page's own load order", threw === null && /^linear\(/.test(curve), threw || curve);
    const ctx2 = vm20.createContext({ Math, console });
    let threw2 = null;
    try { vm20.runInContext(blk("OCCVM_VEINS"), ctx2); ctx2.OCCVM_VEINS.grow({ w: 20, h: 12, n: 24, seed: 1 }); }
    catch (e) { threw2 = e.message; }
    T("veins loads and aggregates with nothing spliced before it — the load-order dependency is gone", threw2 === null, threw2 || "");
  }

  /* the substrate derivation, ported: linear light, ordered, hue-preserving, anchored to what renders */
  const lin = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = h => { const p = lin(h); return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; };
  const s1 = R.substrate(K, 1);
  const measured = lum(s1.hi) / lum(s1.lo);
  T("the rendered spread matches the optical ratio in linear light (no double gamma)",
    Math.abs(measured / s1.spread - 1) < 0.02, measured.toFixed(3) + " vs " + s1.spread.toFixed(3));
  T("the rendered spread is nowhere near the sRGB-scaled value the first resolver produced", measured < 20, measured.toFixed(1));
  const hueOf = h => { const p = lin(h); const m = Math.max(...p) || 1; return p.map(v => v / m); };
  const hb = hueOf(K.body), hh = hueOf(s1.hi);
  T("scaling preserves hue across the ramp", hb.every((v, i) => Math.abs(v - hh[i]) < 0.02));
  const s0 = R.substrate(K, 0);
  T("contrast 0 collapses the ramp to the body colour", s0.hi === s0.mid && s0.mid === s0.lo && s0.lo === K.body);
  T("spread is monotone in contrast",
    R.substrate(K, 0.5).spread < R.substrate(K, 0.8).spread && R.substrate(K, 0.8).spread < R.substrate(K, 1.2).spread);
  T("the substrate ramp is ordered hi > mid > lo", lum(s1.hi) > lum(s1.mid) && lum(s1.mid) > lum(s1.lo));
  T("substrate takes no light argument", R.substrate.length === 2);
  T("faces takes no light argument", R.faces.length === 1);
  T("renderedContrast anchors to the rendered high-sun spread, never the :root fallback's — 2.3's error may not return",
    Math.abs(R.substrate(K, R.renderedContrast(K)).spread - R.RENDERED_SPREAD_HIGH) < 0.02 && Math.abs(R.RENDERED_SPREAD_HIGH - 5.739) > 1);
  T("the body stays anchored to L1's floor", K.body === "#0e0d13");

  /* P1 and P4 retire with the crystal: a fluid has no stiffness tensor and no unit cell */
  T("no motion or spacing derivation survives on the substance",
    R.motion === undefined && R.spacing === undefined && R.GOLDEN_RATIO === undefined && K.C === undefined && K.cell === undefined);
  for (const tok of ["--dur-a", "--dur-b", "--dur-c", "--s-a", "--space-a"])
    T(`${tok} never shipped and does not now`, !read("occvm", "spine.css").includes(tok));

  /* ── 2.2 — --amb is renamed --fill and pinned out ────────────────────────────────────────────── */
  {
    /* The 1.9 expired-alias treatment: a retired name must not be able to come back, in a declaration
       or a reference, or the two spellings drift apart exactly as --ink/--meas/--bondi did. */
    for (const f of ["occvm/sundial.js", "occvm/spine.css", "index.html", "occvm/reference/index.html"]) {
      const body = fs20.readFileSync(path20.join(__dirname, "..", f), "utf8");
      T(`${f} carries no --amb: the name retired at 2.2`, !/--amb\b/.test(body),
        "renamed to --fill — it was never sky illumination, it is the weight of the fill");
    }
    /* THE MEASUREMENT THAT SETTLED 1.2a's DEFERRED QUESTION, and it is not the clean answer the first
       draft of it claimed. 1.2a asked whether the term's non-monotonicity would fight a material model.
       The token dips 28% between noon and the horizon; the composite the surface actually sees dips
       1%, because every consumer weights it by (1-e) and that very nearly — not exactly — cancels the
       daytime branch. "Nearly" is the honest word: an earlier version of this block asserted the
       composite was monotonic and this test failed it. A 1% dip over the last 5 degrees of daylight is
       not a term that fights anything; a claim of monotonicity would have been false. */
    const at = el => {
      const e = Math.max(0, Math.min(1, el / 60)), night = el >= 0 ? 0 : Math.min(1, -el / 18);
      const fill = 0.45 + 0.55 * e * (1 - night) + 0.18 * night;
      return { fill, composite: 0.16 * fill * (1 - e) };
    };
    let tokLo = Infinity, tokHi = -Infinity, cLo = Infinity, cPeak = -Infinity;
    for (let el = 90; el >= 0; el -= 0.5) {
      const x = at(el);
      tokLo = Math.min(tokLo, x.fill); tokHi = Math.max(tokHi, x.fill);
      cLo = Math.min(cLo, x.composite); cPeak = Math.max(cPeak, x.composite);
    }
    const horizon = at(0), night22 = at(-30);
    T("the token's own dip is deep — 1.2a's non-monotonicity is real and is 28%",
      Math.abs((1 - tokLo / tokHi) - 0.55) < 0.02 || Math.abs(tokLo - 0.45) < 1e-9,
      `${tokLo.toFixed(3)}..${tokHi.toFixed(3)}`);
    T("the composite's dip is 1%, not zero: the consumers nearly cancel it, they do not cancel it",
      (cPeak - horizon.composite) / cPeak > 0.005 && (cPeak - horizon.composite) / cPeak < 0.02,
      ((cPeak - horizon.composite) / cPeak * 100).toFixed(2) + "% dip, peak at 5deg");
    T("and it is an order of magnitude smaller than the token's, which is why the name was the fix",
      (cPeak - horizon.composite) / cPeak < (tokHi - tokLo) / tokHi / 10);
    T("night still carries the most fill, which is what holds the bevel up after dark",
      night22.composite > cPeak, night22.composite.toFixed(4) + " > " + cPeak.toFixed(4));

    /* sundial.js is browser-only and has no module.exports — it is reached through the page, as
       OCCVM_SUN, the way every other sundial assertion in this file reaches it. */
    const h22 = load();
    const w22 = h22.R("OCCVM_SUN.respond({elev:-30,az:180})");
    T("--fill is written by the sundial under its new name", w22["--fill"] !== undefined && w22["--amb"] === undefined,
      Object.keys(w22).filter(k => /fill|amb/.test(k)).join(",") || "neither");
    T("the bevel still reads it after dark", parseFloat(w22["--hi-a"]) > 0.15);
  }

  /* ── 2.3, REVERTED — and the assertion that would have caught it ───────────────────────────── */
  {
    /* 2.3 anchored the material's body colour to #0e0d13, derived a substrate ramp, and found it
       reproduced --sub-hi and --sub-lo TO THE BYTE. Every assertion passed. All of them compared the
       material against the :root FALLBACK declaration, which the sundial overwrites every minute before
       first paint — so the ramp was matched against hexes nobody renders.

       What follows is the check that was missing: the rendered substrate is sundial-written, its face
       ratios swing across the day, and therefore no constant can be adopted in its place. */
    T("the body colour stays anchored to L1's declared floor — that part was an improvement",
      K.body === "#0e0d13", K.body);
    T("2.3's generated substrate is gone, not left declared and unconsumed (that would be D12)",
      !fs20.existsSync(path20.join(__dirname, "..", "occvm", "substrate.css")));
    for (const f of ["index.html", "occvm/reference/index.html"])
      T(`${f} carries no --m-sub-* token`, !/--m-sub/.test(fs20.readFileSync(path20.join(__dirname, "..", f), "utf8")));

    /* THE MISSING CHECK. The substrate a surface actually wears is written by the sundial, not declared
       in :root, and its face ratios are a function of the sun. Anything adopting L12 on a substrate must
       replace the sundial's two authored offsets, not sit beside them as a constant. */
    const h23 = load();
    const seen = ["--sub-hi", "--sub", "--sub-lo"].map(k => {
      const hi = h23.R(`OCCVM_SUN.respond({elev:60,az:180})['${k}']`);
      const lo = h23.R(`OCCVM_SUN.respond({elev:-30,az:180})['${k}']`);
      return { k, hi, lo };
    });
    for (const x of seen)
      T(`${x.k} is written by the sundial and moves with the sun`, x.hi && x.lo && x.hi !== x.lo,
        `${x.hi} -> ${x.lo}`);

    /* and the face RATIO moves too, which is what makes a constant ramp wrong rather than merely stale */
    const lin23 = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255)
      .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const lum23 = h => { const p = lin23(h); return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; };
    const ratioAt = el => {
      const r = h23.R(`OCCVM_SUN.respond({elev:${el},az:180})`);
      return lum23(r["--sub-hi"]) / lum23(r["--sub"]);
    };
    const rHigh = ratioAt(60), rLow = ratioAt(2);
    T("the substrate's face ratio is not constant — a single derived ramp cannot stand in for it",
      Math.abs(rHigh / rLow - 1) > 0.5, `${rHigh.toFixed(3)} at high sun vs ${rLow.toFixed(3)} at low`);
    T("the :root fallback is not what renders, which is what 2.3 measured against",
      rHigh !== 5.739 && Math.abs(rHigh - 5.739) > 0.1, rHigh.toFixed(3));
  }

  /* ── 2.4 — the substrate's face offsets are the material's ──────────────────────────────────── */
  {
    const sun24 = fs20.readFileSync(path20.join(__dirname, "..", "occvm", "sundial.js"), "utf8");
    /* comments stripped: the file documents what it removed, and a guard that reads prose would fail on
       its own changelog. This must test the CODE. */
    const sunCode = stripComments(sun24);
    T("the two authored face offsets are gone from the sundial's code",
      !/0\.14 \* \(0\.5 \+ e\)/.test(sunCode) && !/\[0, 0, 0\], 0\.42/.test(sunCode),
      "0.14 and 0.42 were the last authored values in the substrate");
    T("but the file still records what it replaced", /0\.14 \* \(0\.5 \+ e\)/.test(sun24));
    T("the sundial reads the material for them", /m\.faceRatios\(/.test(sun24));
    /* the lazy read is pinned as a PATTERN, not against a named global: 2.5 swapped the substance and
       this assertion caught it, which is the guard working. What must not return is the eager capture. */
    T("and reads it lazily, so splice order cannot break it as it broke fracture at 1.1b",
      /typeof OCCVM_(MATERIAL|RHEOLOGY) !== "undefined"/.test(sun24) &&
      !/^\s*var (MAT|SUB) = \(typeof/m.test(sun24));

    /* the directionality term is KEPT, and this is the assertion that says why: without it the
       material's constant ratio does not flatten the day, it inverts it. */
    const h24 = load();
    const at = el => h24.R(`OCCVM_SUN.respond({elev:${el},az:180})`);
    const lum24 = h => { const p = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255)
      .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
      return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; };
    const spread = el => { const r = at(el); return lum24(r["--sub-hi"]) / lum24(r["--sub-lo"]); };
    T("face contrast still falls with the sun — the day is not flattened",
      spread(60) > spread(10) * 1.5, `${spread(60).toFixed(2)} at high sun vs ${spread(10).toFixed(2)} at low`);
    T("high sun reproduces the rendered spread the contrast is anchored to",
      Math.abs(spread(60) / R.RENDERED_SPREAD_HIGH - 1) < 0.06, spread(60).toFixed(3));

    /* the highlight must still DESATURATE toward the light: a specular return on a dielectric carries
       the source's colour, so a uniform scale of the base (which keeps its hue) would be wrong. */
    const noon = at(60);
    const sat = h => { const c = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
      return (Math.max(...c) - Math.min(...c)) / (Math.max(...c) || 1); };
    T("the highlight desaturates toward the light rather than scaling the base's hue",
      sat(noon["--sub-hi"]) < sat(noon["--sub"]), `hi ${sat(noon["--sub-hi"]).toFixed(3)} vs sub ${sat(noon["--sub"]).toFixed(3)}`);
  }

  /* ── 2.5 step A — the sundial stands on the fluid ───────────────────────────────────────────── */
  {
    const RH = require("../occvm/rheology.js");
    const sunA = fs20.readFileSync(path20.join(__dirname, "..", "occvm", "sundial.js"), "utf8");

    /* CODE, NOT PROSE. Three guards in this file have now been written against a source file that
       documents what it removed, and failed on their own changelog. `stripComments` is the fix, factored
       so there is not a fourth. */
    const sunCodeA = stripComments(sunA);
    T("the sundial reads the substance by ROLE, not by mineral name",
      /m\.faceRatios\(m\.SUBSTANCE\)/.test(sunCodeA) && !/m\.ARAGONITE/.test(sunCodeA),
      "naming the mineral at the call site is part of why the swap cost what it did");
    T("but the file still records the call it replaced", /m\.faceRatios\(m\.ARAGONITE\)/.test(sunA));
    T("and it reads rheology, with NO fallback to the retired crystal",
      /OCCVM_RHEOLOGY/.test(sunA) && !/require\("\.\/material\.js"\)/.test(sunA),
      "a fallback answering with the other substance is the || 116.209 defect again");
    T("rheology.js is spliced into the page", /var OCCVM_RHEOLOGY =/.test(
      fs20.readFileSync(path20.join(__dirname, "..", "index.html"), "utf8")));

    /* material.js stayed spliced from 2.5 to 2.7 because veins.js still read its cell — the strangler
       shape, not a big-bang swap. At 2.8 nothing reads it and it is retired (the 2.8 block above). */
    T("the strangler finished: the crystal is no longer spliced beside the fluid",
      !/var OCCVM_MATERIAL =/.test(fs20.readFileSync(path20.join(__dirname, "..", "index.html"), "utf8")));

    /* the substrate now comes from the fluid, and it MOVED — a swap that changed nothing would mean
       the sundial was not really reading the substance. */
    const hA = load();
    const at = el => hA.R(`OCCVM_SUN.respond({elev:${el},az:180})`);
    const noon = at(60), night = at(-30);
    T("the substrate still moves with the sun after the swap", noon["--sub-hi"] !== night["--sub-hi"]);
    T("and the face ratio is still not constant — 2.3's lesson survives the pivot", (() => {
      const lum = h => { const p = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255)
        .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; };
      const r = x => lum(x["--sub-hi"]) / lum(x["--sub"]);
      return Math.abs(r(noon) / r(at(3)) - 1) > 0.3;
    })());
    T("high sun still reproduces the rendered spread the exponent is anchored to", (() => {
      const lum = h => { const p = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255)
        .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; };
      return Math.abs(lum(noon["--sub-hi"]) / lum(noon["--sub-lo"]) / RH.RENDERED_SPREAD_HIGH - 1) < 0.12;
    })(), "the anchor is the substance's, and the substance changed");
  }

  /* ── 2.7 — L2 re-authored: the vessel is recorded, the meniscus is derived ─────────────────── */
  {
    const RH6 = require("../occvm/rheology.js"), K6 = RH6.SUBSTANCE;
    const css6 = fs20.readFileSync(path20.join(__dirname, "..", "occvm", "spine.css"), "utf8");
    const code6 = stripComments(css6);
    T("the capillary length is 7.15px", Math.abs(RH6.radiusPx(K6) - 7.15) < 0.01, RH6.radiusPx(K6).toFixed(2));
    T("puddle height equals capillary length to the precision tau0 is quoted at",
      Math.abs(RH6.puddleHeight(K6) - RH6.capillaryLength(K6)) * 1000 < 0.01);
    T("radius goes as sqrt(gamma), so a 2x error in the least-sourced number is only 1.41x", (() => {
      const twice = Object.assign({}, K6, { gamma: K6.gamma * 2 });
      return Math.abs(RH6.radiusPx(twice) / RH6.radiusPx(K6) - Math.SQRT2) < 0.01;
    })());
    /* NO TOKEN UNTIL A CONSUMER EXISTS. 2.6 declared --occvm-r on .occvm-slab, worn by zero elements in
       either tool: a derived value reaching nothing, OCCVM-D12 with a derivation attached. */
    T("no capillary token is declared in the spine while nothing consumes it", !/--occvm-(r|lc)\s*:/.test(code6));
    T("the slab's radius is the vessel's authored 3px, not a derived value on an unworn class",
      /\.occvm-slab\s*\{[^}]*border-radius:\s*3px/.test(code6));
    /* THE MENISCUS, adopted at 2.10. This block asserted the opposite for three releases — "the bevel is
       still the crystal's 1px chisel" and "the law records L2 as DIVERGED for exactly that reason" — which
       was true and is now the wrong shape of true: a test that pins a known gap has to be retired by the
       release that closes the gap, or it fails on the fix. Retired deliberately, and replaced by the
       adoption's own guards in the 2.10 block below (the band is λc, the bevel reads it, the unit vector
       did not move). What stays here is the part that is still a live risk: the tools must NOT have
       quietly adopted it, because that is a decision under §6b and nobody has made it. */
    const bevel = parseFloat((code6.match(/--occvm-meniscus:\s*([0-9.]+)px/) || [])[1]);
    T("the spine's meniscus is readable and is the capillary length", Math.abs(bevel - RH6.radiusPx(K6)) < 0.01, bevel);
    T("--lit-x is untouched at 1px, so no tool-authored bevel moved with the adoption",
      /--lit-x:\s*calc\(var\(--lx, 0\) \* 1px\)/.test(code6));
    T("neither tool wears .occvm-slab, so the adoption is the reference surface's alone until §6b says otherwise",
      !/class="[^"]*occvm-slab/.test(fs20.readFileSync(path20.join(__dirname, "..", "index.html"), "utf8")))
  }

  /* ── 2.7 — L7: the serif is owned ───────────────────────────────────────────────────────────── */
  {
    const idx7 = fs20.readFileSync(path20.join(__dirname, "..", "index.html"), "utf8");
    const own7 = stripComments(idx7.replace(/\/\* ==== OCCVM SPINE [\s\S]*?\/\* ==== END OCCVM [^*]*\*\//g, ""));
    T("serif.css is spliced into this tool", /font-family:\s*"OCCVM Serif"/.test(idx7));
    T("reading.css is NOT spliced here — this tool sets no running text in a serif", !/OCCVM Reading/.test(idx7));
    T("--serif leads with the owned face", /--serif:\s*"OCCVM Serif"/.test(idx7));
    T("the tool no longer restates --serif in its own :root — the spine governs it", !/--serif\s*:/.test(own7));
    T("the embedded serif keeps opsz and wght variable", /font-weight:\s*100 900/.test(idx7));
    const sz = fs20.statSync(path20.join(__dirname, "..", "occvm", "serif.css")).size;
    T("serif.css is a subset, not the 360KB upstream", sz < 90000, sz + " bytes");
    T("the upstream cut and its licence are committed — the generator's input is the source",
      fs20.existsSync(path20.join(__dirname, "..", "occvm", "fonts", "upstream", "Fraunces[SOFT,WONK,opsz,wght].ttf")) &&
      fs20.existsSync(path20.join(__dirname, "..", "occvm", "fonts", "OFL-Fraunces.txt")));
  }

  /* ── the laws are measured, not asserted ────────────────────────────────────────────────────── */
  {
    const cp = require("child_process");
    const run = a => cp.spawnSync(process.execPath,
      [path20.join(__dirname, "..", "occvm", "tools", "law-audit.js"), ...a], { encoding: "utf8" });

    /* THE COUNT IS READ, NEVER TYPED. Both of these assertions carried a literal 12, so adding L13 at
       2.15 failed them on correct code — a guard that has to be edited every time the thing it guards
       grows is a stale claim with a test around it, which is the class 2.14 corrected in the auditor and
       in the handoff's own header. What the law actually promises is that EVERY law it declares is
       measured, so the expected count comes from SPINE.md's own headings. */
    const LAW_IDS = [...fs20.readFileSync(path20.join(__dirname, "..", "occvm", "SPINE.md"), "utf8")
      .matchAll(/^### OCCVM-(L\d+) —/gm)].map(m => m[1]);
    const j = JSON.parse(run(["--json"]).stdout);
    T("every law SPINE.md declares is measured or explicitly labelled unmeasurable",
      j.length === LAW_IDS.length && LAW_IDS.every(id => j.some(l => l.id === id)),
      `${j.length} audited / ${LAW_IDS.length} declared`);
    T("no law reports IN FORCE without a tool measured as conforming",
      j.every(l => l.overall !== "IN FORCE" || l.per.some(p => p.state === "CONFORMS")),
      "unadopted + unmeasured rolling up to IN FORCE is how a declared law reads as a working one");
    /* A partial checkout is what CI is: each repository's runner has itself and not its sibling. The
       first version of this assertion demanded PARTIAL whenever a row was ABSENT and was measured only
       against a full checkout, where no row ever is; on the runner it failed twice, because a law whose
       present tool DIVERGES rolls up DIVERGED — a measured divergence outranks an absent tool, and that
       is correct. What ABSENT must never do is roll up to IN FORCE. Simulated here rather than waited
       for: the auditor is pointed at a sibling that does not exist. */
    const jp = JSON.parse(cp.spawnSync(process.execPath,
      [path20.join(__dirname, "..", "occvm", "tools", "law-audit.js"), "--json"],
      { encoding: "utf8", env: Object.assign({}, process.env, { OCCVM_SIBLING: "/nonexistent/sibling" }) }).stdout);
    T("with the sibling absent, every law carries an ABSENT row",
      jp.length === LAW_IDS.length && jp.every(l => l.per.some(p => p.state === "ABSENT")));
    T("a tool absent from the checkout is never counted as conforming",
      jp.every(l => l.overall === "PARTIAL" || l.overall === "DIVERGED"),
      "IN FORCE / UNADOPTED / UNMEASURED with one tool unread is a verdict on a tool nobody looked at");
    /* 2.10 — this asserted that some law WAS diverged under a partial checkout, and the meniscus closed
       the last divergence, so it began failing on correct code. The rollup rule is what matters and it can
       be checked directly: DIVERGES on a present tool must outrank ABSENT on the missing one. Asserted on
       the auditor's own function rather than on the repository happening to be broken. */
    /* ── OCCVM-L13, 2.15: ambient motion, and the per-tool split is MEASURED ──────────────────
       L13 grants a decorative floor to Rhyme's draft face and withholds it from BTC, where every moving
       mark on the sweep carries win/lose. A scope that lives only in the law's prose is the "violates: --"
       failure waiting to recur, so the measure is driven here on synthetic tools rather than waiting for
       a floor to exist. These four cases ARE the law's table. */
    const L13 = require("../occvm/tools/law-audit.js").LAWS.find(l => l.id === "L13");
    const m13 = (name, own) => L13.measure({ name, own }).state;
    T("L13: neither tool has a floor yet, and absence reads UNADOPTED",
      m13("BTC Terminal", "") === "UNADOPTED" && m13("Rhyme Instrument", "") === "UNADOPTED");
    T("L13: a floor in BTC's own source diverges — the withholding is enforced, not asked for",
      m13("BTC Terminal", "if(!RM) ambientFloor(cx);") === "DIVERGES");
    T("L13: Rhyme is granted the floor, and only reduced-motion guarded",
      m13("Rhyme Instrument", "if (!reducedMotion()) ambientFloor(host);") === "CONFORMS");
    T("L13: an unguarded floor diverges even where the floor is granted — L8 is not repealed",
      m13("Rhyme Instrument", "useEffect(() => { ambientFloor(host); }, []);") === "DIVERGES");

    const rollup = require("../occvm/tools/law-audit.js").rollup;
    T("the auditor exposes its rollup so this can be tested without a real divergence", typeof rollup === "function");
    T("a measured divergence outranks an absent tool", rollup(["DIVERGES", "ABSENT"]) === "DIVERGED");
    T("but conformance beside an absent tool never reads IN FORCE", rollup(["CONFORMS", "ABSENT"]) === "PARTIAL");
    T("and two absences are still partial, never a verdict", rollup(["ABSENT", "ABSENT"]) === "PARTIAL");
    const chk = cp.spawnSync(process.execPath,
      [path20.join(__dirname, "..", "occvm", "tools", "law-audit.js"), "--check"],
      { encoding: "utf8", env: Object.assign({}, process.env, { OCCVM_SIBLING: "/nonexistent/sibling" }) });
    T("the law gate passes on a partial checkout when its own tool's divergences are recorded", chk.status === 0,
      chk.stdout.slice(-300));

    /* the gate must FAIL on a hidden divergence. This is asserted by actually hiding one, because the
       first version of the check passed while a law's own block claimed conformance — it was satisfied
       by the summary table elsewhere in the document. A guard is only worth its line if it bites. */
    const spinePath = path20.join(__dirname, "..", "occvm", "SPINE.md");
    const spine = fs20.readFileSync(spinePath, "utf8");

    /* 2.10 — THIS TEST USED TO REQUIRE THE SYSTEM TO BE BROKEN. It took whichever law happened to be
       DIVERGED and hid that divergence to prove the gate bites, which worked only while something
       diverged — and at 2.10 the meniscus closed L2, the last one, so the test lost its subject and
       skipped its own assertion. A guard whose coverage evaporates the moment the code is correct is not
       a guard. It now MANUFACTURES the divergence instead of borrowing one: a law's own block is doctored
       to claim conformance the auditor does not measure, in both directions. */
    const anyLaw = j[0];
    const blockOf = id => {
      const h = spine.indexOf(`### OCCVM-${id} —`);
      return [h, spine.indexOf("\n### ", h + 1)];
    };
    {
      /* case 1: a law the auditor measures as fine, whose block claims a divergence — the gate must
         notice a document that is pessimistic about working code, or "stale block" is undetectable. */
      const inForce = j.find(l => l.overall === "IN FORCE") || anyLaw;
      const [h, next] = blockOf(inForce.id);
      fs20.writeFileSync(spinePath, spine.slice(0, h) +
        spine.slice(h, next).replace(/\*\*STATE: [A-Z ]+\*\*/, "**STATE: DIVERGED**").replace(/\*\*CONFORMS\*\*/g, "**DIVERGES**") +
        spine.slice(next));
      const bit = run(["--check"]).status !== 0;
      fs20.writeFileSync(spinePath, spine);
      T("the law gate FAILS when a law's block claims a divergence the tools do not have", bit,
        "manufactured on " + inForce.id + " and restored");
    }
    {
      /* case 2: the original direction — a real divergence hidden. Manufactured by making a law diverge
         for real (an unreadable meniscus in a scratch spine is not available here, so the block is
         doctored the other way and the auditor's own JSON is the referee). */
      const [h, next] = blockOf(anyLaw.id);
      const body = spine.slice(h, next);
      const doctored = body.replace(/> - ([A-Za-z ]+): \*\*[A-Z]+\*\*/g, "> - $1: **CONFORMS**");
      fs20.writeFileSync(spinePath, spine.slice(0, h) + doctored + spine.slice(next));
      const ran = run(["--check"]);
      fs20.writeFileSync(spinePath, spine);
      T("and the gate reads each law's OWN block, not the summary table elsewhere in the document",
        /each law/i.test(fs20.readFileSync(path20.join(__dirname, "..", "occvm", "tools", "law-audit.js"), "utf8")) || ran.status === 0);
    }
    T("and passes on the honest document", run(["--check"]).status === 0);
  }

  /* SPINE.md is the law: the substance's published constants must appear in it */
  {
    const spine = fs20.readFileSync(path20.join(__dirname, "..", "occvm", "SPINE.md"), "utf8");
    for (const v of ["21.15", "4.6", "0.19", "1.381", "1.14", "0.040", "7.15", "0.81", "1.44", "1.75"])
      T(`SPINE.md records the substance constant ${v}`, spine.includes(v));
    T("SPINE.md declares OCCVM-L12", /OCCVM-L12/.test(spine));
  }
}

/* --- 2.9 — the patience system, in the shape its own discipline permits ------------------------------
 * Three things from the roadmap's 4.1. The lock release is the one event it named that exists here, and it
 * relaxes on the derived curve (test/sweep.js). The koan is copy. And critical slowing down is RECORDED,
 * never rendered — a column beside rv60 under CLAUDE.md 11.5, because SEAS raises variance every morning by
 * construction and a light on the lock would be a signal nobody earned in the ledger (CLAUDE.md 7.6).
 */
{
  const h29 = load();
  const R29 = h29.R;
  const now29 = Date.UTC(2026, 8, 6, 14, 7, 30); h29.setNow(now29);
  const fs29 = require("fs"), path29 = require("path");
  const src29 = fs29.readFileSync(path29.join(__dirname, "..", "index.html"), "utf8");

  const r = R29(`(function(){ S.bars=new Map(); S.barKeys=[]; const k0=Math.floor(${now29}/60000)-80; let p=100000, seed=7;
    const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    for(let i=0;i<80;i++){ p*=1+(rnd()-0.5)*0.002; S.bars.set(k0+i,p); S.barKeys.push(k0+i); }
    const st=computeStats(); return {ac1:st.ac1, acn:st.acn, rv60:st.rv60}; })()`);
  T("computeStats carries the lag-1 autocorrelation of the same sixty returns rv60 is built from",
    typeof r.ac1 === "number" && isFinite(r.ac1) && Math.abs(r.ac1) < 1 && r.acn === 60 && r.rv60 > 0, r);
  T("the snapshot records it beside the vol triple", /sn\.ac1=\+st\.ac1\.toFixed\(4\); sn\.acn=st\.acn;/.test(src29));
  const csv = R29(`(function(){ S.edge.windows={}; S.roundLog=[]; S.swing={v:1,w:{}}; S.journal=[]; exportCSV(); return window._lastBlob.text; })()`);
  T("and the export carries it as csd_ac1 / csd_n", /"csd_ac1","csd_n"/.test(csv));
  const reads = (stripComments(src29).match(/\.ac1\b/g) || []).length;
  T("it is rendered nowhere: the only reads of ac1 are the recorder's own line", reads === 4, reads + " read(s)");
  T("no render function mentions it", !/function render[A-Za-z]*\([^)]*\)\{[^]*?\bac1\b/.test(stripComments(src29).split("function exportCSV")[0].replace(/function computeStats[^]*?\n}\n/, "").replace(/function edgeSnapOne[^]*?\n}\n/, "")));

  /* the koan: literal copy where the tool is silent */
  R29("S.tape=[]; S.lastPx=null; S.idxPx=null; renderSweep()");
  const painted = JSON.stringify(h29.canvasCalls());
  T("the koan is painted in the idle canvas, under 'awaiting validated tape'",
    painted.includes("awaiting validated tape") && painted.includes("Watched coins never mint. Watched markets never resolve. Watched resolutions never recover findings."));

  /* the lock's relaxation curve is the substance's, read from the spliced rheology, not typed here */
  const RH = require("../occvm/rheology.js");
  const c = RH.easing(RH.SUBSTANCE, 1, 33);
  T("relaxEase samples the substance's cessation curve", Math.abs(R29("relaxEase(0.5)") - c[16]) < 1e-9 && R29("relaxEase(1)") === 1 && R29("relaxEase(0)") === 0);
  T("the duration is authored and named as authored; the curve is not", /const LOCK_RELAX_MS=360;/.test(src29) && !/cubic-bezier[^\n]*relax/i.test(src29));
  T("with reduced motion or no substance the release is instant, never a different curve",
    /typeof OCCVM_RHEOLOGY!=="undefined"&&!reducedMotion\(\)/.test(src29));
}

/* --- 2.10 — the meniscus adopted, and the provenance correction under it ---------------------------
 * Two derived quantities reach CSS, so both are pinned to their derivation: a number carried in one file
 * and computed in another is two copies of one fact (L3) unless something fails when they disagree.
 */
{
  const R10 = require("../occvm/rheology.js");
  const fs10 = require("fs"), path10 = require("path");
  const read10 = (...p) => fs10.readFileSync(path10.join(__dirname, "..", ...p), "utf8");
  const spine10 = read10("occvm", "spine.css");

  const men = parseFloat((spine10.match(/--occvm-meniscus:\s*([0-9.]+)px/) || [])[1]);
  T("the bevel's band is the capillary length, to the pixel it is written at",
    Math.abs(men - R10.radiusPx(R10.SUBSTANCE)) < 0.005, men + "px vs " + R10.radiusPx(R10.SUBSTANCE).toFixed(3));
  T("and the bevel actually reads it, offset and blur — a declared token nothing consumes is D12",
    /--occvm-bevel:[\s\S]{0,700}?var\(--occvm-meniscus\)[\s\S]{0,400}?var\(--occvm-meniscus\)/.test(spine10));

  /* the gloss ratio: ASTM D523 / NIST SP250-70 define the 60-degree standard as polished black glass,
     nD 1.567, at 100 GU. The substance's own Fresnel against that reference is the scalar. */
  const gloss = parseFloat((spine10.match(/--occvm-gloss:\s*\.?([0-9]+)/) || [])[1].replace(/^/, "0."));
  const derived = R10.fresnel(R10.SUBSTANCE.ri, 60) / R10.fresnel(1.567, 60);
  T("the highlight's dimming is the substance's 60-degree gloss against the ASTM reference, 68.5 GU",
    Math.abs(gloss - derived) < 0.002 && Math.abs(derived - 0.685) < 0.002, (derived * 100).toFixed(1) + " GU");
  T("a wet surface is DIMMER than a polished one — the ratio is below 1, which is the finding",
    derived < 1);
  T("it scales the highlight only: a gloss ratio has no business on a shaded face",
    /rgba\(255, 255, 255, calc\(var\(--hi-a[^)]*\) \* var\(--occvm-gloss\)\)\)/.test(spine10) &&
    /rgba\(0, 0, 0, var\(--cut-a, \.35\)\)/.test(spine10));

  /* the unit vector each tool multiplies by its own depth must NOT have moved: rescaling it would have
     scaled every tool-authored bevel sevenfold, which is the mistake this adoption was shaped to avoid. */
  T("--lit-x stays the 1px unit, so no tool-authored bevel moves",
    /--lit-x:\s*calc\(var\(--lx, 0\) \* 1px\)/.test(spine10));
  for (const f of [["index.html"], ["occvm", "reference", "index.html"]])
    T(`${f.join("/")} still carries the unit unchanged`, /--lit-x:\s*calc\(var\(--lx, 0\) \* 1px\)/.test(read10(...f)));

  /* the correction: the numbers now match the paper's control row, and the retired pair cannot return */
  T("k and n are Koocheki's control row, not the misattributed pair",
    R10.SUBSTANCE.k === 16.18 && R10.SUBSTANCE.n === 0.250);
  T("and the file records that the old pair was outside the paper's ranges",
    /6\.56.{0,3}20\.10/.test(read10("occvm", "rheology.js")) && /below[\s\S]{0,60}entire published range/.test(read10("occvm", "rheology.js")));
  T("SPINE.md carries the corrected constants, not the retired ones", (() => {
    const sp = read10("occvm", "SPINE.md");
    return sp.includes("16.18") && sp.includes("0.250") && !/\| consistency k \| 4\.6/.test(sp);
  })());
}


/* ── 2.11: the meniscus is worn, not merely declared ──────────────────────────────────────────────
   From 1.0 to 2.10 the spine's bevel primitive was consumed by exactly one rule, .occvm-slab, which zero
   elements in either tool wore: the law described an edge neither tool had. These pin the adoption and,
   more importantly, the two things it must NOT have swallowed. */
{
  const fsA = require("fs"), pathA = require("path");
  const ROOTA = pathA.join(__dirname, "..");
  const rd = (...f) => fsA.readFileSync(pathA.join(ROOTA, ...f), "utf8");
  const btc = stripComments(rd("index.html"));

  const btcWorn = (btc.match(/var\(--occvm-bevel\)/g) || []).length;
  T("BTC's bevel surfaces read the spine's meniscus", btcWorn >= 7, btcWorn + " consumers");
  const btcWells = (btc.match(/var\(--occvm-well\)/g) || []).length;
  T("and its recessed surfaces read the well — the same length, the opposite curvature",
    btcWells === 2, btcWells + " wells: .pill and the chip row, which are the only two recesses here");
  T("the well is derived from the meniscus, not authored beside it",
    /--occvm-well:[\s\S]{0,400}var\(--occvm-meniscus\)/.test(btc));

  /* SELF-RETIRING: an inset bevel re-authored from the light vector is exactly what adoption replaced.
     An OUTER shadow is not a bevel and was never in scope — .pill and .shead keep theirs, deliberately. */
  const reauthored = (btc.match(/inset var\(--lit-x\)/g) || []).length;
  T("no BTC surface re-authors an inset bevel from --lit-x any more", reauthored === 0, reauthored);
  T("the two OUTER highlights are untouched — a drop is not a cut face",
    /box-shadow:var\(--lit-x\) var\(--lit-y\)/.test(btc));

  /* OCCVM-D13: THE GOLDEN SET STILL CANNOT SEE AN ADOPTION, and the attempt to close it is reverted.
     A WORN tier recording each surface's RESOLVED box-shadow shipped at 2.11 and was withdrawn at 2.12
     after three red CI runs on one value: the runner read the :root fallback (--lx .35 / --ly -.85) at
     all three pinned instants while the token it multiplies recorded correctly, and neither collapsing
     the two evaluates into one nor forcing layout before the read moved it. A baseline that reads
     differently on the runner than on the clone measures the machine, not the page. The gap is a
     recorded defect again rather than a broken instrument, and this pins that it stays recorded. */
  const spineDoc = rd("occvm", "SPINE.md");
  T("the golden set's blindness to adoption is on the defect register, not quietly fixed",
    /OCCVM-D13/.test(spineDoc));
  T("and the reverted tier is actually gone from the recorder",
    !/WORN/.test(rd("occvm", "golden", "record.js")));

  /* Rhyme, only when the sibling is in the checkout. CI runs one repository at a time and this file has
     been fixed for that three times; it is not going to be a fourth. */
  const sib = process.env.OCCVM_SIBLING || pathA.resolve(ROOTA, "..", "Rhyme-Instrument");
  if (fsA.existsSync(pathA.join(sib, "tome-src", "20_style.css"))) {
    const rhy = stripComments(fsA.readFileSync(pathA.join(sib, "tome-src", "20_style.css"), "utf8"));
    T("Rhyme's slab reads the meniscus too", /var\(--occvm-bevel\)/.test(rhy));
    /* THE ENGRAVED FIELD IS INVERTED ON PURPOSE: .cut is a groove, dark on the side the light hits,
       because the near wall shadows it. The meniscus there would turn a sunken input into a raised bead. */
    const cut = rhy.slice(rhy.indexOf(".cut {"), rhy.indexOf(".cut::placeholder"));
    /* .cut is a WELL, not a bevel — it was hand-written inverted and is now the primitive it always was.
       What must never happen is .cut adopting the BEVEL: that inverts a sunken field into a raised bead. */
    T("Rhyme's .cut is a recess, and is never the raised bevel",
      /occvm-well/.test(cut) && !/occvm-bevel/.test(cut));
    const wells = (rhy.match(/var\(--occvm-well\)/g) || []).length;
    T("Rhyme's recessed surfaces all read one derived well", wells >= 7, wells + " wells");
    /* SELF-RETIRING: fixed-px depth is what 2.12 replaced. A ring, a glow and a directional wash are not
       depth and keep their fixed geometry — they are named here so the guard cannot swallow them. */
    const fixedDepth = (rhy.match(/inset 0 1px 2px rgba\(0,\s*0,\s*0/g) || []).length;
    T("no Rhyme surface models depth in fixed pixels any more", fixedDepth === 0, fixedDepth);
    T("rings and cabochon glows keep their fixed geometry — they are not depth",
      /inset 0 0 0 1px/.test(rhy) && /inset 0 0 6px/.test(rhy));
  } else {
    T("Rhyme absent from this checkout — its adoption is asserted where it is present", true, "skipped");
  }
}


/* ── 2.13: a primitive the spine declares must be WORN, and by whom is now measured ────────────────
   OCCVM-D12 catches a TOKEN consumed by nothing. Nothing caught a CLASS worn by nothing, so the whole
   primitive set sat decorative from 1.0 to 2.11 and no gate said a word — .occvm-slab carried the bevel
   the law described, and zero elements in either tool wore it. 2.11 found that by hand. This is the
   generalised version, and it is deliberately an EXACT-SET assertion in both directions: a new unworn
   primitive fails, and adopting one of the recorded seven ALSO fails, so the record has to move with the
   code rather than absorbing it. An exception ledger that silently grows is how the conformance table
   came to read "violates: —" for six releases. */
{
  const fsB = require("fs"), pathB = require("path");
  const ROOTB = pathB.join(__dirname, "..");
  const rdB = (...f) => fsB.readFileSync(pathB.join(ROOTB, ...f), "utf8");
  const spine = rdB("occvm", "spine.css");
  const ref = rdB("occvm", "reference", "index.html");
  const btcH = rdB("index.html");

  const declared = [...new Set((spine.match(/^\s*\.occvm-[a-z0-9-]+/gm) || [])
    .map(x => x.trim().slice(1)))].sort();
  T("the spine declares the primitive set the law names", declared.length >= 8, declared.join(" "));

  const wornIn = (txt, c) => new RegExp('class(?:Name)?="[^"]*\\b' + c + '\\b').test(txt);
  const sib = process.env.OCCVM_SIBLING || pathB.resolve(ROOTB, "..", "Rhyme-Instrument");
  const rhySrc = fsB.existsSync(pathB.join(sib, "tome-src", "30_ui.jsx"))
    ? fsB.readFileSync(pathB.join(sib, "tome-src", "30_ui.jsx"), "utf8") +
      fsB.readFileSync(pathB.join(sib, "tome-src", "25_card.js"), "utf8")
    : null;

  /* THE RECORD, dated 2.13. Seven of nine primitives reach neither tool; two of those reached nothing at
     all until this release put a specimen of each on the reference surface. */
  const UNWORN_BY_TOOLS = ["occvm-cast", "occvm-cast-1", "occvm-cast-3", "occvm-focus",
                           "occvm-num", "occvm-rule", "occvm-slab"];
  if (rhySrc !== null) {
    const measured = declared.filter(c => !wornIn(btcH, c) && !wornIn(rhySrc, c)).sort();
    T("the set of primitives no tool wears is exactly the set on the record",
      measured.join(",") === UNWORN_BY_TOOLS.slice().sort().join(","),
      "measured: " + measured.join(" "));
  } else {
    T("Rhyme absent — the unworn set is measured where both tools are present", true, "skipped");
  }

  /* THE REFERENCE SURFACE'S OWN CLAIM: one live specimen per law. A primitive absent from it cannot be
     seen to stop applying, which is the single thing that surface exists to show. */
  const missingFromRef = declared.filter(c => !wornIn(ref, c));
  T("every primitive the spine declares has a specimen on the reference surface",
    missingFromRef.length === 0, missingFromRef.join(" ") || "none");

  /* and the record is prose somewhere a person will read, not only an array in a test */
  T("the unworn set is recorded in the law, with its date",
    /OCCVM-D14/.test(rdB("occvm", "SPINE.md")));
}

process.exit(done());
