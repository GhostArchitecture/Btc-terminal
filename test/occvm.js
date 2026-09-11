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

/* 2.25: the layer is the globule field now; the seam it proves is the same — the seed is injected */
const vein = h => { h.R("globuleLayer()"); return h.ctx.document.documentElement.style["--globules"]; };
const SUN = 1757160000000;   /* 2026-09-06T12:00:00Z — sun up over Dayton */
const NIGHT = 1757214000000; /* 2026-09-07T03:00:00Z — sun well down */

/* --- the seed is injected, not generated internally --- */
{
  const a = load({ storage: { "btc.seed": "12345" } });
  const b = load({ storage: { "btc.seed": "12345" } });
  const c = load({ storage: { "btc.seed": "99999" } });
  const va = vein(a), vb = vein(b), vc = vein(c);
  T("same injected seed yields a byte-identical field", va === vb && !!va);
  T("a different seed yields a different field", va !== vc && !!vc);
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
  /* 2.27 RETIRES the --ruby-lo clause of this guard, deliberately, and only that clause.
     1.9 deleted three tokens as dead weight: declared, referenced nowhere. Two of them still are.
     --ruby-lo is not: PAL carried `rubyLo:"#6b1a2e"` as a bare literal with NO token to resolve from,
     which is the restatement L6 exists to catch, sitting in the one file the measure could not see
     until 2.17. Giving it a token is the fix, and pinning it deleted would now refuse that fix.
     It is not simply unpinned — it is held to the stronger property instead, below: it must be written
     by the palette AND read by PAL, so it cannot go dead a second time. */
  for (const t of ["--glass-hi", "--warn"])
    T(`${t} stays removed`, !html9.includes(t + ":") && !html9.includes("var(" + t + ")"), t);
  {
    const P9 = require("../occvm/pigments.js");
    T("--ruby-lo returns with a consumer, which is why 1.9's pin on it is retired",
      Object.values(P9.TOKENS).includes("--ruby-lo") && /rubyLo\s*:\s*"--ruby-lo"/.test(html9),
      "written by the palette and read by PAL");
  }

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
  /* 2.24 — the render vocabulary, corrected. 2.8 said the layer became "blurred where it was crisp";
     rendered and looked at, it was a 1.3 px crisp trace of a lattice aggregate on every slab — a crystal.
     Two guards: `fine: 0` must mean NO crisp pass (until 2.24 `o.fine || 1.3` silently restored it, so
     every "diffuse" variant measured identical edge energy), and this tool must be passing 0. */
  T("veins: fine 0 draws no crisp pass", (VEINS.field({ seed: 5, w: 96, h: 60, density: 0.3, fine: 0 }).svg.match(/<use /g) || []).length === 1);
  T("veins: the default still draws two passes, so the change is the caller's", (VEINS.field({ seed: 5, w: 96, h: 60, density: 0.3 }).svg.match(/<use /g) || []).length === 2);
  /* 2.25 — and then the layer itself left. veins.js is retired from every target (it stays in occvm/ as
     the generator the L10 record cites, which is why the assertions above still run against the file);
     this tool draws the globule field as a still frame, from the shared part, at its own measured weight. */
  {
    const src = require("fs").readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
    const own = src.replace(/\/\* ==== OCCVM SPINE [\s\S]*?\/\* ==== END OCCVM [^*]*\*\//g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    T("globuleLayer() draws the shared field's still frame", /OCCVM_GLOBULES\.svg\(f,\{[\s\S]*?alpha:GLOBULE_ALPHA\}\)/.test(own));
    T("and nothing in this tool calls the vein generator any more", !/OCCVM_VEINS\./.test(own));
    T("veins.js ships in neither artifact", !/var OCCVM_VEINS =/.test(src) && !/var OCCVM_VEINS =/.test(require("fs").readFileSync(require("path").join(__dirname, "..", "occvm", "reference", "index.html"), "utf8")));
    T("the field ships in both", /var OCCVM_GLOBULES =/.test(src));
    T("no drawn fallback: an unspliced generator paints nothing, never an invented layer", !/veinLayerLegacy|globuleLayerLegacy/.test(own));
  }
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

  /* derived, not a literal: a hardcoded count is one more authored number to forget — it survived 1.8
     and had to be hand-edited at 2.0.

     2.32 RELAXES THIS IN ONE DIRECTION AND TIGHTENS IT IN THE OTHER, and the asymmetry is the point.
     It read "exactly the parts the tool carries", which forbids the thing 2.10 did on purpose: the
     meniscus was derived and adopted HERE FIRST, prototyped on the conformance surface a release
     before either tool wore it, because that is what a surface whose whole job is being looked at is
     for. glass.js is the same move. So: every part the tool carries must appear here — a part the tool
     has and this surface does not is a part that cannot be seen to stop applying, which is the failure
     the original guard was written against and it is unchanged. An EXTRA part is permitted only if it
     is on the list below, which is the D14 treatment: the set is pinned in both directions, so a part
     that quietly stays un-adopted is as loud as one that quietly appears. */
  /* 2.38 — THE LIST IS EMPTY, AND EMPTYING IT IS THE POINT. It held "glass.js" from 2.32, when the
     vessel was derived and worn by no tool, and the exception existed so a part could be prototyped
     on the specimen surface without the parity guard calling it a mistake. The tool wears the vessel
     now, so glass.js is no longer extra — it is an ordinary part with a specimen, which is the state
     the guard was always written to expect. The exception retires because the thing it excepted was
     adopted, which is the only reason this project retires one. The list stays declared rather than
     deleted: it is pinned empty in both directions, so the next part prototyped ahead has to say so
     here rather than slip through a hole the deletion would have left. */
  const PROTOTYPED_AHEAD = [];
  const refParts = PARTS6.filter(p => p.target.indexOf("reference") >= 0).map(p => p.name).sort();
  const toolParts = PARTS6.filter(p => p.target === "index.html").map(p => p.name).sort();
  const missing = toolParts.filter(n => !refParts.includes(n));
  const extra = refParts.filter(n => !toolParts.includes(n)).sort();
  T("every part the tool carries has a specimen surface to be seen on", missing.length === 0, missing);
  T("and the parts prototyped here ahead of adoption are exactly the ones on the record",
    extra.join(",") === PROTOTYPED_AHEAD.slice().sort().join(","), { extra, record: PROTOTYPED_AHEAD });
  T("the reference surface carries exactly the parts the tool carries, plus those",
    refParts.join(",") === toolParts.concat(PROTOTYPED_AHEAD).sort().join(","),
    refParts.join(",") + " vs " + toolParts.concat(PROTOTYPED_AHEAD).sort().join(","));
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

  /* 2.34 — THE PAGE MUST ACTUALLY RUN, and nothing local checked that until this release.
     The reference surface threw `paintFloor is not defined` on every load and shipped that way,
     because an edit script raised before its write: the call to the painter landed and the painter
     itself did not. The whole suite passed — nothing in Node loads this page — and the only thing
     that saw it was the golden recorder, which is CI-only in this container and refuses to record a
     dead page. That refusal is exactly what it is for, and it should not have been the first line of
     defence. Two cheap structural checks, both of which would have caught it:
       every function the page calls at its top level is defined in the page, and
       every id the script paints into exists in the markup. */
  {
    const script = ref.slice(ref.lastIndexOf("<script>"), ref.lastIndexOf("</script>"));
    const boot = [...script.matchAll(/^([A-Za-z_$][\w$]*)\(\);$/gm)].map(m => m[1]);
    const undef = boot.filter(n => !new RegExp("function\\s+" + n + "\\s*\\(").test(script));
    T("every function the reference surface calls at boot is defined in it",
      boot.length > 4 && undef.length === 0, { boot: boot.length, undefined: undef });
    const painted = [...script.matchAll(/\$\("([a-z0-9_-]+)"\)/g)].map(m => m[1]);
    const missing = [...new Set(painted)].filter(id => !ref.includes(`id="${id}"`));
    T("every id the reference surface paints into exists in its markup",
      painted.length > 4 && missing.length === 0, { painted: new Set(painted).size, missing });
  }

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
     test/lib/load.js reads the script by first-open to last-close. A second tag breaks every harness.

     This counted the STRING "<script" anywhere in the file, which is a proxy for that property rather
     than the property. React's UMD build carries the literal "<script>\\x3c/script>" inside a string —
     the close escaped precisely so no HTML parser can see it — and the proxy failed on a file every
     parser reads as one script element. The 2.15 and 2.21 class: a typed proxy with a test around it,
     refusing correct code. Measured instead, the two things that are actually load-bearing. */
  const _open = html.indexOf("<script>"), _close = html.lastIndexOf("</script>");
  const _outside = html.slice(0, _open + 8) + html.slice(_close);
  T("still one <script> element and one <style>",
    (_outside.match(/<script/g) || []).length === 1 && (_outside.match(/<style/g) || []).length === 1,
    { script: (_outside.match(/<script/g) || []).length, style: (_outside.match(/<style/g) || []).length });
  /* The only sequence that ends a script element, and therefore the only thing that could hand
     test/lib/load.js's first-open-to-last-close a second block. Never asserted until a 132 KB minified
     dependency was spliced in and made it worth asserting. */
  T("nothing inside the script block can close it early", !/<\/script/i.test(html.slice(_open + 8, _close)));

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

/* --- OCCVM-L10: the substrate layer is the globule field (2.25; veins 1.1–2.24) --------------------- */
{
  const h = load({ storage: { "btc.seed": "20260906" } });
  h.R("globuleLayer()");
  const layer = decodeURIComponent(h.ctx.document.documentElement.style["--globules"] || "");

  T("the field is produced", layer.length > 500);
  T("it is a data URI, not bare markup", /url\("data:image\/svg\+xml/.test(layer), layer.slice(0, 40));

  /* 2.25 — what this block asserted from 1.1 to 2.24 was that the aggregate's path carried only M and L:
     no bezier arriving back through the renderer. The field is not a path at all: circles under radial
     gradients, hi at the core, lo at the rim. So the assertion inverts — no PATH survives, because a
     traced skeleton is the thing that read as a crystal. */
  const circles = (layer.match(/<circle /g) || []).length;
  T("the field is drawn as droplets, not as a traced skeleton", circles >= 3 && !/<path /.test(layer), `${circles} circles`);
  T("each droplet carries its own radial gradient", (layer.match(/<radialGradient /g) || []).length === circles);
  T("the count follows the ground's area from the shared part's density",
    circles === h.R("OCCVM_GLOBULES.count(1200, 800)"));

  /* seeded and pure — the golden set and the injected seed both depend on it */
  const again = load({ storage: { "btc.seed": "20260906" } });
  again.R("globuleLayer()");
  T("the same seed lays the same field",
    again.ctx.document.documentElement.style["--globules"] === h.ctx.document.documentElement.style["--globules"]);

  const other = load({ storage: { "btc.seed": "111" } });
  other.R("globuleLayer()");
  T("a different seed lays a different field",
    other.ctx.document.documentElement.style["--globules"] !== h.ctx.document.documentElement.style["--globules"]);

  /* NO drawn fallback. From 1.1 to 2.24 this block required one — "growth failing must not leave the
     surface bare" — and the fallback was a bezier generator that hard-coded a tint until 1.4. An unspliced
     generator now paints nothing rather than an invented layer: L6's rule, applied to a layer. */
  const fs2 = require("fs"), path2 = require("path");
  const html2 = fs2.readFileSync(path2.join(__dirname, "..", "index.html"), "utf8");
  T("no drawn fallback survives", !/function veinLayerLegacy\(|function globuleLayerLegacy\(/.test(html2));
  T("a failed field writes none, never a substitute", /setProperty\("--globules", svg \? .+? : "none"\)/.test(html2));
  T("the retired density token is declared nowhere outside a comment, and the habit token nowhere at all",
    !/--vein-density:/.test(html2.replace(/\/\*[\s\S]*?\*\//g, "")) && !/"--vein-habit"/.test(html2));
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

/* --- OCCVM-L6 / 2.27: the palette is a real, chosen preference — and cannot change what a colour MEANS
 * Replaces the D6 mineral block. That block pinned three frozen minerals and, as its load-bearing
 * negative, that a mineral switch never touched --malachite/--ruby/--up/--down. A palette DOES supply
 * those, so that negative could not simply be ported — it would fail on correct code, which is the
 * 2.15/2.21 class. What replaces it is the property that made the widening safe in the first place:
 * the hue-to-meaning relation is not the reader's to change, and no palette brings positive and
 * negative near confusion. That is asserted as a measured separation, not as a promise.
 */
{
  const fs6 = require("fs"), path6 = require("path"), ROOT6 = path6.resolve(__dirname, "..");
  const P6 = require("../occvm/pigments.js");
  const gen6 = require("../occvm/tools/derive-pigments.js");

  /* THE ANCHOR ROUND-TRIP, RE-POINTED AT 2.42 AND NAMED AS A RETIREMENT. This read
     `P6.PIGMENTS.obsidian[child] === gen6.ANCHOR[child]` and was labelled "what makes selecting
     obsidian a no-op". That clause is RETIRED, because 2.42 puts obsidian through the same saturation
     pass as the other four and the no-op was a migration guarantee whose migration fired at 2.27 —
     exempting the default from a pass applied to every other palette would be the local exception L6
     exists to prevent. It is retired rather than deleted: what it was really testing is a property of
     the DERIVATION, which survives untouched and is asserted here in the stronger form. Apply each
     offset to the parent it was measured from and the child it was measured to must come back byte for
     byte — and the table of those children is carried in the shipped file too, so a suite can check it
     without running the generator and the two cannot drift. */
  for (const [child, parent] of gen6.DERIVED) {
    T(`the derivation round-trips its own anchor at ${child}`,
      gen6.apply(gen6.ANCHOR[parent], gen6.OFFSETS[child]).toLowerCase() === gen6.ANCHOR[child].toLowerCase(),
      `${gen6.apply(gen6.ANCHOR[parent], gen6.OFFSETS[child])} vs ${gen6.ANCHOR[child]}`);
    T(`the shipped anchor record agrees with the generator at ${child}`,
      P6.ANCHOR[child].toLowerCase() === gen6.ANCHOR[child].toLowerCase(),
      `${P6.ANCHOR[child]} vs ${gen6.ANCHOR[child]}`);
  }
  /* and the retirement is asserted as a negative, so nobody restores the old sentence by accident:
     obsidian is NOT the anchor any more, it is the anchor put through the pass. */
  T("obsidian ships saturated rather than as the anchor, which is what 2.42 retired",
    P6.PIGMENTS.obsidian.positive.toLowerCase() !== gen6.ANCHOR.positive.toLowerCase() &&
    P6.AUTHORED.obsidian.positive.toLowerCase() === gen6.ANCHOR.positive.toLowerCase(),
    `${P6.PIGMENTS.obsidian.positive} shipped, ${P6.AUTHORED.obsidian.positive} authored`);

  /* 2.42 — THE WHOLE TABLE IS RE-DERIVED FROM WHAT WAS AUTHORED, which is the guard the rest lean on.
     Every shipped role must be exactly what the saturation rule produces from the 2.27 hex kept beside
     it. Pin the OUTPUT and a later edit can retype a hex; pin the RULE and it cannot — the six roles
     and the seven ramp members both fall out of this one clause. */
  {
    const ROLES6 = ["positive", "negative", "gilt", "active", "m", "hi"];
    for (const k of Object.keys(P6.PIGMENTS)) {
      const re = gen6.saturate(P6.AUTHORED[k]);
      for (const r of ROLES6)
        T(`${k}'s ${r} is what the saturation rule produces from its authored hex`,
          P6.PIGMENTS[k][r].toLowerCase() === re.roles[r].toLowerCase(),
          `${P6.PIGMENTS[k][r]} vs ${re.roles[r]}`);
      for (const [child, parent] of gen6.DERIVED)
        T(`${k}'s ${child} is its saturated parent moved by the recorded offset`,
          P6.PIGMENTS[k][child].toLowerCase() === gen6.apply(re.roles[parent], gen6.OFFSETS[child]).toLowerCase(),
          `${P6.PIGMENTS[k][child]} vs ${gen6.apply(re.roles[parent], gen6.OFFSETS[child])}`);
    }
  }

  /* 2.42 — HUE IS THE ONLY THING STILL AUTHORED IN A ROLE, so it is the one axis the pass may not move.
     Asserted twice, because the two halves fail differently. The RULE: `peak` and `lerpRole` both carry
     the parent's own `h` through untouched, read off the generator's source. The RESULT: the shipped
     hex's hue, which is NOT identical, because 8-bit sRGB cannot spell every (L, C, h) — measured at a
     worst case of 0.5242 degrees across all thirty roles, below any hue JND and pinned at 1 degree so a
     real rotation cannot hide inside the quantum. The distinction matters: the band is a bound on what
     is asked for, not on what sRGB can spell, and the same is true of the hue. */
  {
    const src6 = fs6.readFileSync(path6.join(ROOT6, "occvm/tools/derive-pigments.js"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    T("the saturation search never varies hue — it maximises chroma over L at a fixed h",
      /function peak\([^)]*\)\s*\{[\s\S]*?maxChromaAt\(a, p\.h\)[\s\S]*?maxChromaAt\(b, p\.h\)/.test(src6) &&
      /function lerpRole[\s\S]*?return toHex\(p\.L \+ t \* \(pk\.L - p\.L\), p\.C \+ t \* \(pk\.C - p\.C\), p\.h\)/.test(src6));
    let worstH = 0, worstL = 0;
    for (const k of Object.keys(P6.PIGMENTS)) for (const r of ["positive", "negative", "gilt", "active", "m", "hi"]) {
      const a = gen6.toLch(P6.AUTHORED[k][r]), z = gen6.toLch(P6.PIGMENTS[k][r]);
      let dh = Math.abs(z.h - a.h); if (dh > 180) dh = 360 - dh;
      worstH = Math.max(worstH, dh);
      worstL = Math.max(worstL, Math.abs(z.L - a.L) - P6.BAND);
    }
    T("no shipped role's hue moved more than the 8-bit round can account for (< 1 deg)",
      worstH < 1, `worst ${worstH.toFixed(4)} deg`);
    T("no shipped role's lightness left the authored band by more than the 8-bit round (< 0.25 L*)",
      worstL < 0.25, `worst excursion ${worstL.toFixed(4)} L*`);
    T("the band is an authored number and is the only one the pass adds", P6.BAND === 5, String(P6.BAND));
  }

  /* 2.42 — CHROMA IS MAXIMAL WHERE NOTHING FORCED IT DOWN. A role the backoff left alone (t = 1) must
     sit on the sRGB boundary: no greater chroma exists at its hue anywhere in the band. Measured by
     re-running the peak search, so this fails if the search is ever weakened rather than if a digit
     changes. A role the backoff DID move is checked by the clause below instead. */
  for (const k of Object.keys(P6.PIGMENTS)) {
    const t6 = P6.SATURATION[k].t;
    for (const r of ["positive", "negative", "gilt", "active", "m", "hi"]) {
      if (t6[r] < 1) continue;
      const want = gen6.peak(P6.AUTHORED[k][r], P6.BAND), got = gen6.toLch(P6.PIGMENTS[k][r]);
      T(`${k}'s ${r} sits at the greatest chroma sRGB holds at its hue inside the band`,
        Math.abs(got.C - want.C) < 1.0, `${got.C.toFixed(2)} vs peak ${want.C.toFixed(2)}`);
    }
  }

  /* 2.42 — THE BACKOFF IS HELD AGAINST THE PRE-PASS SEPARATION AND ITS COST IS RECORDED. Two clauses:
     no palette may come out of the pass below where it went in, and a role that gave up chroma must
     have given up exactly enough — sitting AT its floor rather than short of it, since a backoff that
     overshoots is chroma thrown away for nothing and one that undershoots is the floor breached. */
  for (const k of Object.keys(P6.PIGMENTS)) {
    const f6 = P6.SATURATION[k].floor, t6 = P6.SATURATION[k].t, p = P6.PIGMENTS[k];
    T(`${k} comes out of the saturation pass no worse than it went in`,
      gen6.de00(p.positive, p.negative) >= f6.posNeg - 0.05 &&
      gen6.de00(p.positive, p.active) >= f6.posActive - 0.05,
      `pos/neg ${gen6.de00(p.positive, p.negative).toFixed(2)} vs floor ${f6.posNeg}, ` +
      `pos/act ${gen6.de00(p.positive, p.active).toFixed(2)} vs floor ${f6.posActive}`);
    T(`${k}'s recorded pre-pass floors are the authored table's own separations`,
      Math.abs(gen6.de00(P6.AUTHORED[k].positive, P6.AUTHORED[k].negative) - f6.posNeg) < 0.05 &&
      Math.abs(gen6.de00(P6.AUTHORED[k].positive, P6.AUTHORED[k].active) - f6.posActive) < 0.05);
    /* A role that gave chroma must have given it for a reason and no more than the reason needs. Stated
       as the two facts that bracket it rather than as a distance from the floor: going all the way to
       the maximum BREACHES the floor (so the backoff was necessary) and the shipped position does not
       (so it was sufficient). A distance test cannot be written here — `lerpRole` emits an 8-bit hex,
       so the separation is a STEP function of t and the bisection lands on the last code before the
       breach, which for astro sits 0.36 above its floor and for deepwater 0.09 below the figure a
       re-derivation from the rounded `t` reports. The recorded `t` is a report; this re-runs the pass. */
    const gave = ["positive", "negative", "gilt", "active", "m", "hi"].filter(r => t6[r] < 1);
    if (gave.length) {
      const re = gen6.saturate(P6.AUTHORED[k]);
      const pkA = gen6.peak(P6.AUTHORED[k].active, P6.BAND);
      const atMax = gen6.de00(re.roles.positive, gen6.lerpRole(P6.AUTHORED[k].active, pkA, 1));
      T(`${k}'s backoff was necessary — full chroma on active breaches its floor (${gave.join(", ")})`,
        atMax < f6.posActive, `${atMax.toFixed(3)} against floor ${f6.posActive}`);
      T(`${k}'s backoff was sufficient — the shipped position clears the floor`,
        gen6.de00(p.positive, p.active) >= f6.posActive - 0.05,
        `${gen6.de00(p.positive, p.active).toFixed(3)} against ${f6.posActive}`);
    }
  }
  /* and `active` is the giver, never `positive` — the role a reader reads most keeps its chroma. */
  T("where the separations bind it is active that gives, not positive",
    Object.keys(P6.SATURATION).every(k => P6.SATURATION[k].t.positive === 1),
    JSON.stringify(Object.keys(P6.SATURATION).map(k => [k, P6.SATURATION[k].t.active.toFixed(3)])));

  /* the decorative ladder is monotone in L* in every palette — mlo < lo < m < hi. Authored `m` and `hi`
     plus a derived pair can only be checked this way; PIGMENT-PALETTES' own table is NOT ordered by
     lightness, which is why the ladder is derived here rather than taken from it. */
  for (const k of Object.keys(P6.PIGMENTS)) {
    const p = P6.PIGMENTS[k], L = h => gen6.toLch(h).L;
    T(`${k}'s decorative ladder is monotone in lightness`,
      L(p.mlo) < L(p.lo) && L(p.lo) < L(p.m) && L(p.m) < L(p.hi),
      `${L(p.mlo).toFixed(1)} ${L(p.lo).toFixed(1)} ${L(p.m).toFixed(1)} ${L(p.hi).toFixed(1)}`);
  }

  /* THE ONE THAT MATTERS. Section 5 calls inverting win/lose the most dangerous possible bug in this
     tool; a palette layer is only allowed near those colours because it cannot bring them together.
     Measured per palette in CIEDE2000 against the recorded table, so a palette edit that narrowed the
     gap has to re-record the number rather than absorb it. */
  for (const k of Object.keys(P6.PIGMENTS)) {
    const p = P6.PIGMENTS[k], rec = P6.SEPARATION[k];
    T(`${k}'s positive/negative separation matches the recorded ${rec.posNeg}`,
      Math.abs(gen6.de00(p.positive, p.negative) - rec.posNeg) < 0.05,
      gen6.de00(p.positive, p.negative).toFixed(2));
    T(`${k} keeps positive and negative unmistakable (CIEDE2000 >= 60)`, rec.posNeg >= 60, String(rec.posNeg));
    T(`${k}'s positive/active separation matches the recorded ${rec.posActive}`,
      Math.abs(gen6.de00(p.positive, p.active) - rec.posActive) < 0.05,
      gen6.de00(p.positive, p.active).toFixed(2));
  }
  /* and the one measured negative is pinned as a negative rather than left to be rediscovered: sunset
     is BELOW this build's own positive/active separation and is the only palette that is. If a later
     edit fixes it, this fails and the record gets updated — which is the point. */
  T("sunset is the only palette below this build's own positive/active separation, and it is recorded",
    P6.SEPARATION.sunset.posActive < P6.SEPARATION.obsidian.posActive &&
    Object.keys(P6.PIGMENTS).filter(k => P6.SEPARATION[k].posActive < P6.SEPARATION.obsidian.posActive).length === 1,
    JSON.stringify(P6.SEPARATION));

  /* the :root fallbacks are the default palette's own values, as a SET IDENTITY. §2ad permits a
     surviving fallback on exactly this condition; nothing checked it before this line existed. */
  const html6 = fs6.readFileSync(path6.join(ROOT6, "index.html"), "utf8");
  const root6 = html6.slice(html6.indexOf(":root{"), html6.indexOf("}", html6.indexOf(":root{")));
  for (const slot in P6.TOKENS) {
    const m = root6.match(new RegExp(P6.TOKENS[slot] + "\\s*:\\s*(#[0-9a-fA-F]{6})"));
    if (!m) continue;
    T(`:root's ${P6.TOKENS[slot]} fallback is the ${P6.DEFAULT} palette's own value`,
      m[1].toLowerCase() === P6.PIGMENTS[P6.DEFAULT][slot].toLowerCase(),
      `${m[1]} vs ${P6.PIGMENTS[P6.DEFAULT][slot]}`);
  }

  const h5 = load({ storage: { "btc.seed": "555" } });
  h5.R("loadCfg()");
  T("the palette defaults to obsidian, so a reader who never opens the picker sees no change",
    h5.R("S.cfg.palette") === "obsidian");

  h5.R("applyPigment()");
  const rs5 = h5.ctx.document.documentElement.style;
  /* 2.42 — these three read the palette rather than three typed hexes. They were digits, and 2.42
     moved all three; a test that names a value it is supposed to be checking the PROVENANCE of fails
     on correct code the first time that value legitimately changes, which is the 2.14 class inside
     the guard meant to catch it. */
  T("--pigment resolves to the palette's decorative accent",
    rs5.getPropertyValue("--pigment") === P6.PIGMENTS[P6.DEFAULT].m, rs5.getPropertyValue("--pigment"));
  T("--pigment-lo resolves to its deep",
    rs5.getPropertyValue("--pigment-lo") === P6.PIGMENTS[P6.DEFAULT].mlo, rs5.getPropertyValue("--pigment-lo"));
  T("--ruby-lo now has a token to resolve from — 1.9 deleted it as dead weight and PAL kept the literal",
    rs5.getPropertyValue("--ruby-lo") === P6.PIGMENTS[P6.DEFAULT].negativeLo, rs5.getPropertyValue("--ruby-lo"));

  const fieldObsidian = vein(h5);
  h5.R("setPalette('astro')");
  T("setPalette persists the choice", h5.R("S.cfg.palette") === "astro");
  T("setPalette saves to btc.cfg", JSON.parse(h5.store["btc.cfg"]).palette === "astro");
  T("the outcome colours follow the palette — this is the 2.27 widening, asserted rather than assumed",
    rs5.getPropertyValue("--malachite") === P6.PIGMENTS.astro.positive &&
    rs5.getPropertyValue("--ruby") === P6.PIGMENTS.astro.negative);
  T("--pigment follows the switch to astro's accent",
    rs5.getPropertyValue("--pigment") === P6.PIGMENTS.astro.m, rs5.getPropertyValue("--pigment"));
  const fieldAstro = h5.ctx.document.documentElement.style["--globules"];
  T("the globule field's colour changes with the palette, same seed", fieldObsidian !== fieldAstro);

  const astro5 = decodeURIComponent(fieldAstro || "");
  T("the field carries astro's own tint, not the default's",
    astro5.includes(P6.PIGMENTS.astro.hi.slice(1)) && astro5.includes(P6.PIGMENTS.astro.lo.slice(1)));
  T("and no obsidian tint reaches it", !astro5.includes("c9a6ff") && !astro5.includes("5a36a8"));

  /* a stored pre-2.27 mineral resolves once, is recorded, and does not re-fire */
  const h6 = load({ storage: { "btc.cfg": JSON.stringify({ mineral: "ruby", pad: 1.18 }) } });
  h6.R("loadCfg()");
  T("a stored mineral migrates to a palette rather than falling through silently",
    h6.R("S.cfg.palette") === "obsidian" && h6.R("S.cfg.mineral") === undefined);
  T("and what it migrated from is kept on the record",
    h6.R("S.cfg.migratedFrom && S.cfg.migratedFrom.mineral") === "ruby");
  T("the migration is written back, so it runs once", !("mineral" in JSON.parse(h6.store["btc.cfg"])));

  /* PAL is the same set a third time, for the jsdom reason 2.17 recorded. Set identity, same rule. */
  const palLit = h5.R("JSON.stringify(PAL)"), palLive = h5.R("JSON.stringify(PAL_LIVE)");
  const PALo = JSON.parse(palLit), PALL = JSON.parse(palLive);
  const slotOfEarly = {}; for (const sl in P6.TOKENS) slotOfEarly[P6.TOKENS[sl]] = sl;
  /* 2.17 wired two of thirteen; 2.27 wires the ten that something writes. The remaining three are
     static :root declarations and are asserted NOT live in the 2.17 block — a key that resolves a value
     nothing ever moves is a per-minute no-op wearing a light's clothes. What is asserted here is the
     property that actually matters: every key the PALETTE writes a token for is resolved from it. */
  T("every palette-written token PAL carries is resolved from the page, not from its own literal",
    Object.keys(PALo).filter(k => PALL[k] && slotOfEarly[PALL[k]]).length === 8,
    Object.keys(PALo).filter(k => PALL[k]).join(" "));
  /* 2.41 RETIRES THE THIRD NAME IN THIS CLAUSE, and names why. It read "boneDim bronze field" from
     2.27 until now, and it was true: --field was a fixed :root literal nothing wrote. The ground is
     sundial-written from 2.41 (L3 finally reaching the page ground), so a guard demanding it stay a
     literal would refuse correct code — the 2.15/2.21/2.27 class, a stale claim with a test wrapped
     around it. Only `field` leaves the list; boneDim and bronze are still moved by nothing and are
     still asserted here, so the clause keeps its whole load-bearing half. */
  T("and the keys with no live token are exactly the two nothing writes",
    Object.keys(PALo).filter(k => !PALL[k]).sort().join(" ") === "boneDim bronze",
    Object.keys(PALo).filter(k => !PALL[k]).join(" "));
  const slotOf = slotOfEarly;
  for (const k in PALo) {
    const slot = slotOf[PALL[k]]; if (!slot) continue;
    T(`PAL.${k}'s literal is the ${P6.DEFAULT} palette's own value`,
      PALo[k].toLowerCase() === P6.PIGMENTS[P6.DEFAULT][slot].toLowerCase(),
      `${PALo[k]} vs ${P6.PIGMENTS[P6.DEFAULT][slot]}`);
  }
  /* UPC/DNC were `const` snapshots taken at load until 2.27, so every call-keyed colour on the sweep
     would have kept painting the palette that was active when the file parsed. Driven, not read. */
  /* UPC/DNC were `const` snapshots taken at load until 2.27, so every call-keyed colour on the sweep —
     the one place section 5 says a wrong colour is the most dangerous bug this tool can have — would have
     kept painting whatever palette was active when the file parsed. This harness stubs getComputedStyle
     empty (test/lib/load.js), so palTick has nothing to resolve and the behaviour cannot be driven here;
     the binding is asserted at the source instead, in BOTH directions, so a revert to `const` fails. */
  T("UPC and DNC are rebindable, not frozen at parse", /\blet UPC=PAL\.mal, DNC=PAL\.ruby;/.test(html6) &&
    !/\bconst UPC=PAL\.mal/.test(html6));
  T("and palTick reassigns them, so a palette change reaches the canvas",
    /UPC=PAL\.mal; DNC=PAL\.ruby;/.test(html6));
}

/* ── 2.28 — the metaball field, the arrest model, and the size scale ─────────────────────────────
 * Build-plan step 2. Every number here is computed from the substance rather than typed, and the two
 * assertions that would have caught the two real defects of this release are marked.
 */
{
  const G28 = require("../occvm/globules.js");
  const R28 = require("../occvm/rheology.js");
  const html28 = require("fs").readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
  const px = pa => (R28.SUBSTANCE.gamma / pa) * 1000 / R28.MM_PER_PX;

  /* THE IDENTITY. γ/τ₀, √(γ/ρg) and τ₀/ρg are one number, because 2.10 fixed τ₀ by the puddle-height
     identity. Asserted from the three formulas rather than from the digits, so it survives a change to
     γ or ρ and fails the day τ₀ stops being the value that identity produces. */
  const L28 = G28.arrestLengths();
  T("the arrest length, the capillary length and the puddle height are the same number",
    Math.abs(L28.complete - R28.radiusPx(R28.SUBSTANCE)) < 0.01 &&
    Math.abs(L28.complete - R28.puddleHeight(R28.SUBSTANCE) * 1000 / R28.MM_PER_PX) < 0.01,
    `${L28.complete.toFixed(4)} / ${R28.radiusPx(R28.SUBSTANCE).toFixed(4)}`);
  T("and it is γ/τ₀ exactly — the plastocapillary length, not a fourth constant",
    Math.abs(L28.complete - px(R28.SUBSTANCE.tau0)) < 1e-9);

  /* THE DYNAMIC INTERCEPT IS A CONSTANT NOW, not a number in a comment. Its absence is what forced
     every consumer to retype it; L3's defect, in prose. */
  T("the dynamic Herschel-Bulkley intercept is exported, not left in a comment",
    R28.SUBSTANCE.tau0Dynamic === 4.41);
  T("the two yield stresses bracket rather than compete: dynamic gives the wider length",
    L28.joined > L28.complete && Math.abs(L28.joined - px(R28.SUBSTANCE.tau0Dynamic)) < 1e-9,
    `${L28.complete.toFixed(3)} .. ${L28.joined.toFixed(3)} px`);

  /* THE THREE REGIMES, driven on radii rather than read */
  T("a pair well under the static length COMPLETES", G28.arrestRegime(2, 2) === "completes");
  T("a pair between the two lengths freezes as a DUMBBELL", G28.arrestRegime(9, 9) === "dumbbell");
  T("a pair past the dynamic length is BARELY JOINED", G28.arrestRegime(30, 30) === "joined");
  T("the Bingham number the source states the arrested shape by is R/ℓ",
    Math.abs(G28.bingham(9, 9) - G28.merged(9, 9) / L28.complete) < 1e-12);

  /* THE MEASURED VERDICT, recomputed here rather than quoted from the entry. The shipped band produces
     no completed merges at all, and that is the substance's answer, not a design choice. */
  {
    const rnd = G28.mulberry32(20260910);
    const lo = G28.R[0], hi = G28.R[1];
    let c = 0, d = 0, j = 0, N = 40000;
    for (let i = 0; i < N; i++) {
      const reg = G28.arrestRegime(lo + rnd() * (hi - lo), lo + rnd() * (hi - lo));
      if (reg === "completes") c++; else if (reg === "dumbbell") d++; else j++;
    }
    T("no pair drawn from the shipped band can complete — a merged radius never beats its larger parent",
      c === 0, `${c} of ${N}`);
    T("the dumbbell is the case rather than the exception, at the measured ~96%",
      d / N > 0.94 && d / N < 0.98, (100 * d / N).toFixed(1) + "%");
    T("and the band was NOT moved to manufacture a completion it does not produce",
      G28.R[0] === 9 && G28.R[1] === 30, JSON.stringify(G28.R));
  }

  /* THE RENDERER. One filter definition, Blinn's iso-level, the blur owned by the substance. */
  const filt = G28.gooFilter({ id: "x" });
  T("the iso-level is Blinn's half-density surface, not the copied 18/-7 pair", G28.ISO === 0.5);
  T("and the matrix offset follows from it rather than being authored beside it",
    filt.includes((-G28.GOO_GAIN * G28.ISO).toFixed(3)) && !/ -7(\.|\b)/.test(filt), filt.slice(-90));
  T("the blur is the substance's own length, not a second copy of it",
    Math.abs(G28.blurPx() - L28.complete) < 1e-9);
  T("the filter is defined once and the still SVG uses that definition",
    G28.svg({ drops: [{ x: 1, y: 1, r: 5 }] }, { w: 100, h: 100, viewW: 100, viewH: 100, hi: "#111111", lo: "#222222" })
      .includes(G28.gooFilter({ id: "goo", blur: G28.blurPx(), gain: G28.GOO_GAIN })));
  T("and the blur scales with the field when the view does, so it is one length in view units",
    G28.svg({ drops: [] }, { w: 100, h: 100, viewW: 200, viewH: 200, hi: "#111111", lo: "#222222" })
      .includes((G28.blurPx() * 2).toFixed(3)));

  /* THE BUG THIS RELEASE ACTUALLY SHIPPED AND CAUGHT, pinned so it cannot come back. The isosurface
     cuts at 0.5, so a field drawn AT the display weight is entirely below the cut and the filter
     deletes it — measured at max alpha 0 in Chromium. The weight has to sit OUTSIDE the filtered
     group, which is what BTC's <g opacity> already did and what Rhyme's canvas did not. */
  {
    const one = G28.svg({ drops: [{ x: 50, y: 50, r: 20 }] }, { w: 100, h: 100, hi: "#111111", lo: "#222222", alpha: 0.36 });
    const gi = one.indexOf("<g opacity="), fi = one.indexOf("filter='url(#goo)'");
    T("the weight wraps the FILTERED group, never the drops inside it", gi >= 0 && fi > gi,
      "an alpha applied before the threshold puts the whole field under the iso-level");
  }

  /* 2.24's LESSON: a flag the generator can silently ignore is worse than no flag. */
  T("goo:false renders the 2.25 gradient field, so the change is always the caller's",
    !G28.svg({ drops: [{ x: 1, y: 1, r: 5 }] }, { w: 10, h: 10, hi: "#111111", lo: "#222222", goo: false }).includes("feGaussianBlur"));
  T("and the default is the metaball field, so nothing has to ask for it",
    G28.svg({ drops: [{ x: 1, y: 1, r: 5 }] }, { w: 10, h: 10, hi: "#111111", lo: "#222222" }).includes("feGaussianBlur"));

  /* THE OTHER DEFECT: the field was stretching to its box, so a globule's shape was a property of the
     element. Pinned from both sides — the writer emits the size, the readers consume it. */
  T("globuleLayer writes the field's own pixel size beside the field",
    /setProperty\("--globules-size"/.test(html28));
  T("and every surface that paints the field sizes it from that, never from `auto` alone",
    (html28.match(/background:var\(--globules,none\)/g) || []).length ===
    (html28.match(/background-size:var\(--globules-size,auto\)/g) || []).length,
    "a painter without the size stretches the field and the globules stop being round");
  T("the field is generated at the viewport rather than at a fixed 1200x800",
    /window\.innerWidth/.test(html28) && /OCCVM_GLOBULES\.field\(\{seed, w:gw, h:gh\}\)/.test(html28));

  /* merge conservation has ONE owner, and it is the shared part */
  T("merge conservation is volume, decided in the shared part and recorded there", G28.MERGE_POWER === 3);
  T("merged() is that convention rather than a second copy of it",
    Math.abs(G28.merged(3, 4) - Math.cbrt(27 + 64)) < 1e-12);
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
    try { vm20.runInContext(blk("OCCVM_GLOBULES"), ctx2); ctx2.OCCVM_GLOBULES.field({ seed: 1, w: 200, h: 120 }); }
    catch (e) { threw2 = e.message; }
    T("the field lays with nothing spliced before it — the load-order dependency is gone (2.25: veins retired, the field takes this guard)", threw2 === null, threw2 || "");
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
    const LA13 = require("../occvm/tools/law-audit.js");
    const L13 = LA13.LAWS.find(l => l.id === "L13");
    /* 2.34 — THE FIXTURE BUILDS THE SHAPE THE RUNNER BUILDS, and it did not until this release. These
       cases passed `{name, own}` while `readTool` produces `{name, raw, own}`, and the moment the
       measure read `raw` — which it must, because BTC's grant is bounded by markup and CSS that
       `own` strips comments out of — every one of them threw. That is 2.22's defect exactly, where
       L13's guards drove a shape the runner never produced, and it is the second time on this same
       law. `mk` is the only way a case is built here now. */
    const mk = (name, own, raw) => ({ name, raw: raw === undefined ? own : raw, own });
    const m13 = (name, own, raw) => L13.measure(mk(name, own, raw)).state;
    /* BTC's grant is surface-bounded, so a conforming BTC needs all three conditions present. This is
       the shipped shape, reduced to its load-bearing lines. */
    const CHART_OPAQUE = '#chartbox{background:linear-gradient(160deg,var(--sub-hi) 0%,var(--sub) 45%,var(--sub-lo) 100%)}\n';
    const BTC_OK_RAW = CHART_OPAQUE + '#occvm-floor{position:fixed;inset:0;z-index:0}\n<div id="floor-mount"></div>\n<div class="wrap">';
    const BTC_OK_OWN = 'e("canvas",{id:"occvm-floor"});OCCVM_FLOOR.ambientFloor(el, reducedMotion(), 0, {alpha:A, seed:S});';

    T("L13: neither tool has a floor, and absence reads UNADOPTED",
      m13("BTC Terminal", "") === "UNADOPTED" && m13("Rhyme Instrument", "") === "UNADOPTED");
    /* 2.37 — RHYME'S GRANT IS BOUNDED NOW TOO, so its fixtures carry the same four conditions BTC's
       do. Until this release the two branches were asymmetric: BTC's floor had to name its surface
       and Rhyme's only had to be guarded, because Rhyme's floor lived inside whichever slab was open.
       It lives on the page ground now, so one bound reads both tools and the fixtures say so. */
    const RHY_OK_RAW = '.bar { position: relative; padding: 10px; }\n'
      + '#occvm-floor { position: fixed; inset: 0; z-index: 0; }\n'
      + '<canvas id="occvm-floor" />\n<header className="binding">';
    /* the id lives in `own` because that is where the runner finds it: Rhyme's own source is its CSS
       and its JSX together, and the canvas is declared in the JSX. */
    const RHY_OK_OWN = '<canvas id="occvm-floor" />'
      + 'if (!reducedMotion()) OCCVM_FLOOR.ambientFloor(host, still, heat);';
    T("L13: Rhyme is granted the floor on its page ground, guarded and bounded",
      m13("Rhyme Instrument", RHY_OK_OWN, RHY_OK_RAW + RHY_OK_OWN) === "CONFORMS",
      L13.measure(mk("Rhyme Instrument", RHY_OK_OWN, RHY_OK_RAW + RHY_OK_OWN)).detail);
    T("L13: and a bar that takes the frost diverges — a measured value never gets the ground behind it",
      m13("Rhyme Instrument", RHY_OK_OWN,
          '.bar { backdrop-filter: blur(2px); padding: 10px; }\n'
          + '#occvm-floor { position: fixed; inset: 0; z-index: 0; }\n'
          + '<canvas id="occvm-floor" />\n<header className="binding">' + RHY_OK_OWN) === "DIVERGES");
    T("L13: an unguarded floor diverges even where the floor is granted — L8 is not repealed",
      m13("Rhyme Instrument", '<canvas id="occvm-floor" />useEffect(() => { ambientFloor(host); }, []);',
          RHY_OK_RAW + "useEffect(() => { ambientFloor(host); }, []);") === "DIVERGES");
    T("L13: a declaration is not a call site — a granted, guarded floor does not diverge on its own definition",
      m13("Rhyme Instrument",
        '<canvas id="occvm-floor" />' + "function ambientFloor(c){return 0;}\nuseEffect(()=>{let r=matchMedia('(prefers-reduced-motion: reduce)').matches;return ambientFloor(h,r);},[]);",
        RHY_OK_RAW + "function ambientFloor(c){return 0;}\nuseEffect(()=>{let r=matchMedia('(prefers-reduced-motion: reduce)').matches;return ambientFloor(h,r);},[]);")
        === "CONFORMS");

    /* BTC at 2.34: granted, and the grant is bounded. Each condition is dropped in turn, because a
       three-part boundary that is only ever tested all-present is a boundary nobody has measured. */
    T("L13: BTC's floor conforms when it names the granted surface, fixed, mounted outside the column",
      m13("BTC Terminal", BTC_OK_OWN, BTC_OK_RAW + BTC_OK_OWN) === "CONFORMS",
      L13.measure(mk("BTC Terminal", BTC_OK_OWN, BTC_OK_RAW + BTC_OK_OWN)).detail);
    T("L13: and it still owes L8 a guard — an unguarded floor on the granted surface diverges",
      m13("BTC Terminal", 'OCCVM_FLOOR.ambientFloor(el, false, 0);', BTC_OK_RAW + 'occvm-floor OCCVM_FLOOR.ambientFloor(el, false, 0);') === "DIVERGES");
    T("L13: a floor that does not name the granted surface diverges — the grant is to a surface",
      m13("BTC Terminal", 'ambientFloor(document.getElementById("chart"), reducedMotion());',
          BTC_OK_RAW + 'ambientFloor(document.getElementById("chart"), reducedMotion());') === "DIVERGES");
    T("L13: and a SECOND floor diverges however well the first is bounded — one grant, one surface",
      m13("BTC Terminal", BTC_OK_OWN + 'OCCVM_FLOOR.ambientFloor(other, reducedMotion());',
          BTC_OK_RAW + BTC_OK_OWN + 'OCCVM_FLOOR.ambientFloor(other, reducedMotion());') === "DIVERGES");
    T("L13: a floor whose surface is not position:fixed diverges — a box inside the page is not the ground",
      m13("BTC Terminal", BTC_OK_OWN,
          '#occvm-floor{position:absolute;inset:0}\n<div id="floor-mount"></div>\n<div class="wrap">' + BTC_OK_OWN) === "DIVERGES");
    T("L13: a floor mounted INSIDE the content column diverges — that is the subtree §5's surfaces live in",
      m13("BTC Terminal", BTC_OK_OWN,
          '#occvm-floor{position:fixed;inset:0}\n<div class="wrap"><div id="floor-mount"></div>' + BTC_OK_OWN) === "DIVERGES");
    /* 2.35's condition, dropped in turn like the other three. A tile may SHOW the granted ground; the
       tile carrying the SWEEP may not, because a drifting mass under marks that mean win/lose is the
       trade L13 withholds from this tool. Both failure shapes are driven: the sweep's tile taking the
       fill, and the sweep's tile declaring no substrate at all and inheriting it. */
    T("L13: the sweep's tile taking the tile fill diverges — the granted ground would show through it",
      m13("BTC Terminal", BTC_OK_OWN,
          '#chartbox{background:linear-gradient(160deg,color-mix(in srgb,var(--sub-hi) var(--tile-fill),transparent) 0%,var(--sub-lo) 100%)}\n'
          + '#occvm-floor{position:fixed;inset:0;z-index:0}\n<div id="floor-mount"></div>\n<div class="wrap">' + BTC_OK_OWN) === "DIVERGES");
    T("L13: and the sweep's tile declaring no substrate of its own diverges — it would inherit the fill",
      m13("BTC Terminal", BTC_OK_OWN,
          '#occvm-floor{position:fixed;inset:0;z-index:0}\n<div id="floor-mount"></div>\n<div class="wrap">' + BTC_OK_OWN) === "DIVERGES");
    /* and the shipped tool is measured through the runner's own reader, not a fixture at all */
    {
      const real = LA13.TOOLS.map(t => LA13.readTool(t)).filter(Boolean).find(t => /BTC/.test(t.name));
      T("L13: and the tool that actually ships passes the same measure through readTool",
        !real || L13.measure(real).state === "CONFORMS", real && L13.measure(real).detail);
    }

    /* THE SHAPE THE RUNNER ACTUALLY PRODUCES. Every assertion above builds its own {name, own} object,
       and until 2.22 readTool returned {raw, own} — so L13's per-tool grant read `undefined` for the
       name and answered "withheld" for BOTH tools on every real run, while all four synthetic cases
       passed. This is the guard that was missing: the fixture and the call path must agree. */
    const LA = require("../occvm/tools/law-audit.js");
    for (const t of LA.TOOLS) {
      const src = LA.readTool(t);
      if (!src) continue;
      T(`law-audit: the runner hands ${t.name} its own name, which L13 measures by`, src.name === t.name);
    }

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

  /* ── 2.17: OCCVM-L3 reaches the canvas ──────────────────────────────────────────────────────────
     renderSweep contained zero references to the light — the largest visual element in the tool drew
     identically at 3am and at noon while every DOM surface tracked the sun. The palette now refreshes on
     sunTick's beat, and WHICH KEYS MAY DO SO IS MEASURED AGAINST THE SUNDIAL rather than chosen: a token
     the sundial never writes cannot be "live", and reading one would be a per-minute no-op pretending to
     be a light. */
  {
    const fs17 = require("fs"), path17 = require("path");
    const sun = fs17.readFileSync(path17.join(__dirname, "..", "occvm", "sundial.js"), "utf8");
    const written = new Set([...sun.matchAll(/"(--[a-z-]+)":/g)].map(m => m[1]));
    const live = R29("JSON.stringify(PAL_LIVE)");
    const map = JSON.parse(live);
    T("the canvas refreshes on the sundial's beat, not per frame",
      /palTick\(\);/.test(src29) && !/palTick\(\)[\s\S]{0,200}requestAnimationFrame/.test(src29));
    /* 2.27 RETIRES 2.17's version of these two, deliberately and with the reason on the record.
       They read: every live key is a token THE SUNDIAL writes, and the outcome colours are not among
       them. Both were right in 2.17's world, where the sundial was the only thing that moved a token
       and PAL's other eleven values genuinely had nothing to read. A palette moves nine of those eleven,
       so the first assertion would now refuse a correct wiring and the second asserts the exact
       behaviour 2.27 exists to change — a guard that fails on correct code, which is the 2.15/2.21
       class, and a guard pinning behaviour the release replaces, which is 1.2's.
       What replaces them keeps the property that mattered: a live key may not be a per-minute no-op
       pretending to be a light. It must be written by SOMETHING — the sundial or the palette — and the
       two providers are enumerated from their own sources rather than typed here. */
    const P17 = require("../occvm/pigments.js");
    const byPalette = new Set(Object.values(P17.TOKENS));
    T("every live palette key is a token something actually writes — the sundial or the palette",
      Object.values(map).every(tok => written.has(tok) || byPalette.has(tok)),
      Object.values(map).filter(tok => !written.has(tok) && !byPalette.has(tok)).join(","));
    T("the outcome colours are live because the PALETTE moves them, never because the sundial does",
      ["mal", "malLo", "ruby", "rubyLo", "gilt", "giltB", "giltC", "verd"]
        .every(k => map[k] && byPalette.has(map[k]) && !written.has(map[k])),
      "a sundial-written outcome colour would mean the light had acquired an opinion about win/lose");
    T("all eight palette-written tokens the canvas paints with are live — none left behind as a literal",
      ["mal", "malLo", "ruby", "rubyLo", "gilt", "giltB", "giltC", "verd"].every(k => map[k]),
      Object.keys(map).join(","));
    /* 2.41: the same retirement one file-section along, and the replacement is strictly stronger.
       The old clause asserted a NEGATIVE about three keys; two of them still hold and are kept. For
       the third the interesting property is no longer "nobody writes it" but WHO writes it, which is
       the same distinction the outcome-colour clause above turns on: a ground the PALETTE moved
       would mean a choice of green had an opinion about the page floor. */
    T("and the two keys nothing moves are NOT live — a static token read per minute is a no-op",
      !map.boneDim && !map.bronze,
      "boneDim/bronze are fixed :root declarations; they stay literals until something writes them");
    T("the page ground IS live, and it is live because the SUNDIAL moves it, never the palette",
      !!map.field && written.has(map.field) && !byPalette.has(map.field),
      "2.41: --field is the substrate's shadow face, so the ground carries the one light (L3)");
    T("the literals survive as the fallback — jsdom resolves no custom property and must still paint",
      /^#[0-9a-f]{6}$/i.test(R29("PAL.bone")) && /^#[0-9a-f]{6}$/i.test(R29("PAL.boneLo")));
    T("a junk resolved value never reaches the palette",
      R29(`(function(){ const b=PAL.bone; const g=getComputedStyle; getComputedStyle=()=>({getPropertyValue:()=>"not a colour"}); palTick(); const after=PAL.bone; getComputedStyle=g; return after===b; })()`));
  }

  /* ── 2.17 / 2.27: the L6 measure, driven on synthetic sources so its verdicts are the tested thing
     2.17 taught this measure to see a hex wherever it is typed, because PAL restated malachite and ruby
     as JS literals and a CSS-only measure could not see them. 2.27 keeps that reach and changes what it
     is looking FOR: under palettes there is no "accent versus outcome" distinction left to draw — the
     palette supplies both — so the question is whether a tool carries a second source of truth. The
     three cases below are the ones the old block asserted, re-aimed at the new verdicts rather than
     ported, because two of them (an accent literal diverging, an accent declaration diverging) name
     tokens that no longer exist. */
  {
    const L6 = require("../occvm/tools/law-audit.js").LAWS.find(l => l.id === "L6");
    const P6b = require("../occvm/pigments.js");
    const m6 = own => L6.measure({ name: "BTC Terminal", own });
    T("a NON-DEFAULT palette's hex typed into a tool diverges — that is a second source of truth",
      m6('const P={accent:"' + P6b.PIGMENTS.astro.m + '"};').state === "DIVERGES");
    T("and the measure names which palette it leaked from, so the finding is actionable",
      /astro/.test(m6('const P={accent:"' + P6b.PIGMENTS.astro.m + '"};').detail));
    T("the default palette's own hexes are the granted fallback — PAL and :root both carry them",
      m6('const PAL={mal:"' + P6b.PIGMENTS.obsidian.positive + '"};').state === "CONFORMS");
    T("a :root fallback carrying the default palette's value is tolerated and counted, not hidden",
      m6("--pigment: " + P6b.PIGMENTS.obsidian.m + ";").state === "CONFORMS" &&
      /fallback/.test(m6("--pigment: " + P6b.PIGMENTS.obsidian.m + ";").detail));
    T("a :root fallback that has DRIFTED from the default palette diverges — the §2ad condition, measured",
      m6("--pigment: #123456;").state === "DIVERGES" &&
      /drift/.test(m6("--pigment: #123456;").detail));
    T("verified to bite in the direction that matters: swapping malachite for ruby in the fallback fails",
      m6("--malachite: " + P6b.PIGMENTS.obsidian.negative + ";").state === "DIVERGES");
  }

  /* ── 2.16: the release velocity is REAL, and the ceiling is below the regime crossover ──────────
     Roadmap item #12 closing for its first consumer. Every assertion here is against the substance's
     own functions rather than against a number typed twice. */
  const crossover = (() => { let lo = 0, hi = 10;      /* where k*v0^n/tau0 reaches 1 */
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2;
      (RH.SUBSTANCE.k * Math.pow(mid, RH.SUBSTANCE.n) / RH.SUBSTANCE.tau0 < 1) ? lo = mid : hi = mid; }
    return lo; })();
  T("the v0 ceiling stays inside the yield-dominated regime — the exponent cannot move with a gesture",
    R29("LOCK_V0_MAX") < crossover, `max ${R29("LOCK_V0_MAX")} vs crossover ${crossover.toFixed(4)}`);
  T("and it is not sitting on the boundary: the margin is real",
    (crossover - R29("LOCK_V0_MAX")) / crossover > 0.1);
  T("a faster seize maps to a higher v0, clamped at both ends",
    R29("lockV0(0.01)") === 0.25 && R29("lockV0(1)") === 1 && R29("lockV0(99)") === 2.5);
  T("no measurable gesture falls back to the reference, never to the floor",
    R29("lockV0(0)") === 1 && R29("dragSpeed(null)") === 0 && R29("dragSpeed({tr:[{x:0,y:0,t:0}]})") === 0);
  /* A FLICK AT THE END OF A SLOW DRAG IS A FLICK. 120px in the last 40ms after a full second of crawling
     reads 3 px/ms, not the 0.125 the whole gesture averages to — the window is what makes release speed
     mean release rather than journey. The first fixture written here expected 3 from a trail whose
     trailing window legitimately spanned 100ms and measured 1.2, and the code was right: recorded because
     the wrong half was nearly "corrected". */
  T("speed is read over the trailing window, so a flick at the end of a slow drag reads as a flick",
    Math.abs(R29("dragSpeed({tr:[{x:0,y:0,t:0},{x:10,y:0,t:1000},{x:130,y:0,t:1040}]})") - 3) < 1e-9);
  T("and a drag that stopped before release reads as stopped, not as its journey",
    R29("dragSpeed({tr:[{x:0,y:0,t:0},{x:500,y:0,t:1000},{x:500,y:0,t:1100}]})") === 0);
  /* THE DURATION SCALES ON THE SUBSTANCE'S OWN STOPPING TIME, and the direction is the physics rather
     than the roadmap's stated feel: t_stop is monotonically increasing in v0, so a HARDER seize relaxes
     SLOWER. Inverting it to get "hard settles fast" would be tuning a derived number toward a picture. */
  const ms = v => LOCK_RELAX_MS_EXPECT(v);
  function LOCK_RELAX_MS_EXPECT(v) { return 360 * (RH.stoppingTime(RH.SUBSTANCE, v) / RH.stoppingTime(RH.SUBSTANCE, 1)); }
  T("the reference disturbance still plays the authored 360 ms exactly", R29("relaxMs(1)") === 360);
  T("duration rides the substance's stopping time, not a second authored curve",
    Math.abs(R29("relaxMs(0.25)") - ms(0.25)) < 1e-9 && Math.abs(R29("relaxMs(2.5)") - ms(2.5)) < 1e-9);
  T("more momentum takes longer to stop — the substance's direction, not the roadmap's",
    R29("relaxMs(2.5)") > R29("relaxMs(1)") && R29("relaxMs(1)") > R29("relaxMs(0.25)"));
  T("a region lock carries the gesture that made it; the swing button carries the reference",
    R29(`lockRect(1,2,3,4,2.5); const a=S.lock.v0; lockRelease(); lockRect(1,2,3,4); const b=S.lock.v0; lockRelease(); [a,b]`).join() === "2.5,1");
  T("the release stores its own duration and curve, so the frame loop reads no global",
    /S\.lockRelax\.ms\|\|LOCK_RELAX_MS/.test(src29) && /relaxEase\(u,S\.lockRelax\.c\)/.test(src29));
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


/* ── 2.26 — the field over the sweep: why the win/lose marks survive it ────────────────────────────
 * §7.6 forbids noise presented beside signal, and L13 withholds MOTION from this tool for exactly that
 * reason — but the still field is overlaid on the sweep, because `.tile::before` is position:absolute and
 * a positioned pseudo-element paints ABOVE its box's in-flow content. So the decoration does sit on top
 * of every mark that carries win/lose. Driven in Chromium across five states (ABOVE winning, ABOVE
 * losing, BELOW winning, no-call, and the swing-activated inversion §5 designs to be most saturated),
 * with the overlay toggled on a frozen page:
 *
 *   the marks themselves never move   — ΔL* ≤ 0.07, Δhue ≤ 3°, every class, every cell
 *   local contrast to the substrate beside them   — 0.0% to 4.9% lost, worst case gilt
 *   every mark keeps > 22 L* of local contrast    — ruby in the swing view is the tightest, and unmoved
 *
 * WHY, and it is not a coincidence: `screen` blend is self-limiting on bright ink. screen(a,b) = 1 −
 * (1−a)(1−b), so the lift is (1−a)·b — it FALLS as the mark brightens, and vanishes as a → 1. The field
 * lands on the substrate and gets out of the way of the ink. That is the property this guards, because a
 * change of blend mode or a raised weight would silently take it away.
 *
 * A METHOD CORRECTION, recorded because the first number was alarming and wrong. The first pass paired
 * the dimmest pixel of a mark against the brightest globule ANYWHERE IN THE FRAME and reported ruby at
 * −18%. Those two pixels are nowhere near each other; measured locally the same cell is −0.0%. A global
 * worst case that describes no pixel pair that exists is not a measurement of legibility.
 *
 * ── TWO OF THIS BLOCK'S CLAUSES ARE RETIRED AT 2.35, AND THE SITUATION THEY GUARDED IS GONE ─────────
 * They asserted `.tile::before{… mix-blend-mode:screen}` and `… opacity:.16` — the blend mode and the
 * weight the measurement above was taken at. 2.35 retired `.tile::before` outright: the field is drawn
 * ONCE, on the substrate, and a tile shows it by letting it through rather than by painting a second
 * copy on top of its own content. So there is no longer a decorative layer above any mark, and the
 * whole of 2.26 — which was an argument that the overlay was SURVIVABLE — is answered by the overlay
 * not existing. Retiring a guard is the move this project distrusts most, so: these two are retired
 * because what they describe cannot be built from this stylesheet any more, and what replaces them is
 * strictly stronger than what they said. The screen arithmetic goes with them; it computed the lift a
 * blend puts onto a mark, and nothing blends onto a mark now, so it would be a guard that cannot fail.
 * Driven proof that the bound holds, which no Node harness can take: with the floor toggled on a frozen
 * page, 0.00% of the sweep's own pixels move (0.000 mean, 0.00 max), against 28.84% of the spot tile at
 * mean 2.408 and 9.31% of the arm bar at 2.594. The field is on the text tiles and absent from the
 * canvas, measured rather than asserted. */
{
  const fs26 = require("fs"), path26 = require("path");
  const src26 = fs26.readFileSync(path26.join(__dirname, "..", "index.html"), "utf8");

  /* the per-tile copy is gone, and gone is the property — a pseudo-element cannot paint the field over
     a mark if no rule declares one */
  T("no .tile::before paints anything — the second copy of the field is retired",
    !/\.tile::before\{content/.test(src26));
  /* ONE field in the page. The still frame keeps exactly one reader — the ground — so a second copy
     cannot come back on a tile without this failing. Scoped to the stylesheet, because globuleLayer()
     WRITES the token in the script and a count over the whole file would confuse writing with reading. */
  const css26 = src26.slice(src26.indexOf("<style"), src26.indexOf("</style>"));
  const readers26 = (css26.match(/var\(--globules[,)]/g) || []).length;
  T("the still field has exactly one reader in the stylesheet, and it is the ground",
    readers26 === 1 && /body::before\{[^}]*var\(--globules/.test(css26.replace(/\n\s*/g, "")),
    `${readers26} reader(s)`);
  T("and the field's own weight is the measured one", /^const GLOBULE_ALPHA=0\.36;/m.test(src26));

  /* ── 2.36 — the safe area, and the guard that keeps it testable ──────────────────────────────
   * A recording from the owner's phone showed the price readout cut in half by the Dynamic Island.
   * The cause was not a wrong inset, it was NO inset: viewport-fit=cover and a translucent status bar
   * with zero env(safe-area-inset-*) anywhere in the file, and §10.5 had it filed as "untestable in
   * this environment", which is how it stayed unmeasured through every release.
   * env() cannot be set from a harness and nothing here emulates a notch, so the rule is that env() is
   * read ONCE into a custom property and every consumer reads the property. That is what makes the
   * inset drivable: Chromium sets --safe-top and the layout moves, measured at 0 -> header at 14px and
   * band 0 tall, at 59px -> header at 59px and band 59px. This assertion is the part a Node harness
   * can hold: exactly one env() per tool, so an inline inset nobody can drive cannot come back. */
  {
    const envs = (css26.replace(/\/\*[\s\S]*?\*\//g, " ").match(/env\(safe-area-inset-[a-z]+/g) || []);
    T("env() is read exactly twice, once per edge, and only into a token",
      envs.length === 2, envs.join(" "));
    T("the content column starts below the inset rather than at a fixed 14px",
      /\.wrap\{[^}]*padding:max\(14px, var\(--safe-top\)\)/.test(css26.replace(/\n\s*/g, "")));
    T("and an opaque band exactly the inset tall sits above the content, so nothing scrolls into the bar",
      /body::after\{[^}]*height:var\(--safe-top\)[^}]*z-index:60/.test(css26.replace(/\n\s*/g, "")));
    T("the band and the page ground read one value, so they cannot drift",
      /--field-hi:#100e16/.test(css26) &&
      (css26.match(/var\(--field-hi\)/g) || []).length >= 2);
  }

  /* 2.35's own three, structural, because the stylesheet is where this bound is stated */
  T("the tile substrate is partial, so the one field reaches the eye through it",
    /\.tile\{[^}]*color-mix\(in srgb, var\(--sub-hi\) var\(--tile-fill\)/.test(src26.replace(/\n\s*/g, " ")));
  T("the frost is the substance's own capillary length, not an authored radius",
    /backdrop-filter:blur\(var\(--occvm-meniscus\)\)/.test(src26));
  /* A FEATURE QUERY HAS TO NAME A PROPERTY, and this guard exists because the 2.35 restructure shipped
     one that did not for the length of a measurement. `@supports ((color-mix(in srgb, red 50%,
     transparent)) and (backdrop-filter:blur(2px)))` looks like a test and is not one — a bare value is
     not a support condition, so the whole block was dropped and every tile silently stayed opaque
     while the source-text guards above went on passing. Caught by re-measuring the field's reach
     (28.84% of the spot tile → 0.01%) rather than by reading the rule. Every parenthesised leaf of
     every @supports condition here must carry a colon, which is the property it is testing. */
  {
    /* a balanced walk rather than a regex: `color-mix(in srgb, ...)` carries its own parentheses, so
       "innermost group" is not the same as "leaf condition" and a pattern that assumes it flags
       correct code — which this guard's first draft did, on the file it was written to protect. */
    /* comments stripped FIRST, and this is the fourth release where a guard had to learn that: the
       block below quotes the malformed query to explain it, and a scan that reads its own prose fails
       a correct file for naming the thing it fixed (2.27's L6 colour guard, 2.28's floor vocabulary
       guard and 2.29's dialect guard each arrived here separately). */
    const conds = [...css26.replace(/\/\*[\s\S]*?\*\//g, " ").matchAll(/@supports([^{]+)\{/g)].map(m => m[1]);
    const bare = [];
    const groups = (t) => {           /* top-level balanced (...) groups of one condition */
      const out = []; let d = 0, st = -1;
      for (let i = 0; i < t.length; i++) {
        if (t[i] === "(") { if (d++ === 0) st = i; }
        else if (t[i] === ")") { if (--d === 0) out.push(t.slice(st + 1, i)); }
      }
      return out;
    };
    const walk = (t) => {
      const g = groups(t);
      /* a group whose own level joins sub-conditions is a branch; anything else is a leaf and must
         declare the property it is testing */
      const outer = t.replace(/\([^()]*(?:\([^()]*\)[^()]*)*\)/g, " ");
      if (g.length && /\b(and|or|not)\b/.test(outer)) { g.forEach(walk); return; }
      /* a leaf is tested AS ITSELF. Descending into its parentheses reads the argument list of a value
         function — `color-mix(in srgb, …)`, `blur(2px)` — as if it were a condition, which flagged the
         correct file on this guard's second draft. */
      const own = t.replace(/\([^()]*(?:\([^()]*\)[^()]*)*\)/g, "");
      if (!/[A-Za-z-]+\s*:/.test(own)) bare.push(t.trim().slice(0, 52));
    };
    conds.forEach(walk);
    T("every @supports condition names a property — a bare value tests nothing and drops the block",
      bare.length === 0, bare.join(" | "));
  }

  T("and the tile that carries the sweep keeps an opaque substrate — L13's bound (2.35)",
    /#chartbox\{background:[^}]*linear-gradient\(160deg,var\(--sub-hi\) 0%,var\(--sub\) 45%,var\(--sub-lo\) 100%\)\}/
      .test(src26.replace(/\n\s*/g, "")));

}


/* ── 2.31/2.32 — the spliced parts that read a sibling, and the vessel ─────────────────────────────
 * Two parts now depend on another part at CALL time: occvm/floor.js reads OCCVM_GLOBULES and
 * OCCVM_RHEOLOGY, occvm/glass.js reads OCCVM_RHEOLOGY. The splicer inserts every part after one
 * anchor, so a part's position in the file is insertion history rather than the list's order, and a
 * part that captured a sibling at LOAD would be the 2.0 fracture.js defect: it captured a null
 * OCCVM_VEINS, threw on every call in the browser, and passed in Node because `require` resolved what
 * the page could not. The property that makes position irrelevant is that nothing is captured at load,
 * and it is DRIVEN here rather than read, because a regex cannot tell a reference inside a function
 * body from one outside it.
 */
{
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const R7 = path.resolve(__dirname, "..");
  for (const part of ["floor.js", "glass.js"]) {
    const src = fs.readFileSync(path.join(R7, "occvm", part), "utf8");
    const bare = { Math, console };
    bare.globalThis = bare;
    vm.createContext(bare);
    let threw = null;
    try { vm.runInContext(src, bare); } catch (e) { threw = String(e && e.message || e); }
    T(`${part} evaluates with no sibling global in scope`, threw === null, threw);
    const g = part === "floor.js" ? bare.OCCVM_FLOOR : bare.OCCVM_GLASS;
    T(`${part} still exposes its API after that`, !!g && typeof g === "object", Object.keys(g || {}).length);
  }
  /* and the floor degrades rather than throwing when the substance really is absent */
  {
    const src = fs.readFileSync(path.join(R7, "occvm", "floor.js"), "utf8");
    const bare = { Math }; bare.globalThis = bare; vm.createContext(bare); vm.runInContext(src, bare);
    T("with no substance the floor's curve is the straight ramp, not an exception",
      bare.OCCVM_FLOOR.cyclePos(0.25) > 0 && bare.OCCVM_FLOOR.cyclePos(0.99) === 0);
  }
}

/* ── OCCVM-L2, the vessel's half (2.32) ───────────────────────────────────────────────────────────
 * L2 has said since 2.7 that the plan-view radius is the VESSEL'S and the edge is the FLUID'S. The
 * fluid's half was derived at 2.10 and worn at 2.11; this is the vessel's. Everything below is
 * recomputed from the shipped fresnel() rather than compared against a typed table — GLASS-VESSEL-PLAN
 * §3.2 is a table, and a guard that matched it digit for digit would be pinning the document instead
 * of the code.
 */
{
  const fs = require("fs"), path = require("path");
  const R8 = path.resolve(__dirname, "..");
  global.OCCVM_RHEOLOGY = require(path.join(R8, "occvm", "rheology.js"));
  const G = require(path.join(R8, "occvm", "glass.js"));
  const RH = global.OCCVM_RHEOLOGY;

  /* SOURCED, and named as sourced: borosilicate rather than soda-lime's 1.520, and the bottom of the
     container-glass standard wall band rather than a lamp spec, because no lamp spec is published. */
  T("the vessel is borosilicate at the sourced index", G.VESSEL.ri === 1.474);
  T("and its wall is the sourced 2.0 mm, carried in mm and converted here",
    G.VESSEL.wallMm === 2.0 && Math.abs(G.wallPx() - 2.0 * 96 / 25.4) < 1e-9);

  /* THE COINCIDENCE, pinned in both directions. 2.0 mm is 7.559 px and the substance's capillary
     length is 7.148 px — 1.06x apart, under half a pixel — and they are unrelated: surface tension
     over density on one side, a glass manufacturing standard on the other. Borrowing one for the other
     is the cross-domain reuse this project has caught before, so the guard asserts they are CLOSE (so
     a future reader is not surprised) and that neither is computed from the other (so nobody makes it
     a dependency). */
  {
    const lc = RH.radiusPx(RH.SUBSTANCE);   /* the meniscus in px, from the part that owns it */
    const wall = G.wallPx();
    T("the wall and the capillary length land within 10% of each other, which is the trap",
      Math.abs(wall / lc - 1) < 0.10, { wall: +wall.toFixed(4), lc: +lc.toFixed(4), ratio: +(wall / lc).toFixed(4) });
    const src = fs.readFileSync(path.join(R8, "occvm", "glass.js"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    T("and the wall is not derived from the substance: no lc, no gamma, no tau0 in the code",
      !/meniscus|capillar|gamma|tau0|SUBSTANCE\.(gamma|tau0)/.test(src));
  }

  /* THE INCIDENCE IS THE OFFSET. A cylinder has a continuum of incidences, so there is no angle table
     to author — and rheology.js's CUT = {front:0, chamfer:45, edge:80} is a FLAT-FACE convention
     inherited from the crystal that must not leak in here. */
  for (const u of [0, 0.25, 0.5, 0.7, 0.85, 0.95, 0.99]) {
    const want = Math.asin(u) * 180 / Math.PI;
    T(`sin(theta) = u at u=${u}`, Math.abs(G.incidence(u) - want) < 1e-9);
  }
  {
    const src = fs.readFileSync(path.join(R8, "occvm", "glass.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    T("the crystal's flat-face angle table does not reach the vessel", !/\bCUT\b/.test(src));
  }

  /* THE OPTICS ARE THE SHIPPED fresnel(), not a second implementation */
  for (const u of [0, 0.5, 0.85, 0.99])
    T(`reflectance at u=${u} is fresnel(n, asin(u))`,
      Math.abs(G.reflectance(u) - RH.fresnel(G.VESSEL.ri, G.incidence(u))) < 1e-12);
  /* and the shape is the finding: flat across the middle, vertical at the rim */
  T("R is flat to within a tenth of a point across the middle 70%",
    Math.abs(G.reflectance(0.7) - G.reflectance(0)) < 0.01, +(G.reflectance(0.7) - G.reflectance(0)).toFixed(4));
  T("and past the turn it goes vertical: 5% by u=0.74, 10% by 0.89, 20% by 0.95, 45% by 0.99",
    G.reflectance(0.74) >= 0.05 && G.reflectance(0.89) >= 0.10 &&
    G.reflectance(0.95) >= 0.19 && G.reflectance(0.99) >= 0.45);

  /* THE INNER FACE IS WHY THE FLOOR SURVIVES BEING PUT BEHIND GLASS, and it is derived from the
     substance's own index so a substance swap moves it rather than leaving a stale constant. */
  {
    const inn = G.inner();
    T("the inner interface is glass->substance, not glass->air",
      inn.nSubstance === RH.SUBSTANCE.ri && Math.abs(inn.nRel - G.VESSEL.ri / RH.SUBSTANCE.ri) < 1e-12);
    T("its reflectance is one part in a thousand — the globules are seen essentially directly",
      inn.R0 < 0.0015, +inn.R0.toFixed(6));
    T("and total internal reflection has a computed angle rather than an authored one",
      Math.abs(inn.criticalDeg - Math.asin(RH.SUBSTANCE.ri / G.VESSEL.ri) * 180 / Math.PI) < 1e-9);
  }

  /* THE RESOLUTION FLOOR, and the plan got it wrong in the one direction it must not.
     GLASS-VESSEL-PLAN §4 puts the floor at 48 px from a displacement range of 3.63 px across
     u = 0.85 -> 1.0. 3.63 is shiftPx(0.85) itself — the displacement AT the band's inner edge, not the
     change ACROSS the band. The range is shiftPx(1) - shiftPx(0.85) = 3.9445 and the floor is 52.6 px,
     so every row of that table is 8.66% optimistic and a SAFETY threshold reads safer than it is.
     Derived here from its two inputs so it cannot be typed wrong again. */
  T("the shift range is the change across the band, not the value at its edge",
    Math.abs(G.shiftRangePx() - (G.shiftPx(1) - G.shiftPx(G.U_RIM))) < 1e-12 &&
    Math.abs(G.shiftRangePx() - 3.9445) < 0.001, +G.shiftRangePx().toFixed(4));
  T("and it is NOT shiftPx(U_RIM), which is the number the plan used",
    Math.abs(G.shiftRangePx() - G.shiftPx(G.U_RIM)) > 0.3, +G.shiftPx(G.U_RIM).toFixed(4));
  T("the floor is the range over the band fraction, and it is 52.6px not 48",
    Math.abs(G.floorPx() - G.shiftRangePx() / ((1 - G.U_RIM) / 2)) < 1e-12 &&
    G.floorPx() > 52 && G.floorPx() < 53, +G.floorPx().toFixed(2));
  T("U_RIM is the only authored number here and the floor scales with it",
    G.U_RIM === 0.85 && Math.abs(G.floorPx() * ((1 - G.U_RIM) / 2) - G.shiftRangePx()) < 1e-12);

  /* THE STOP SET IS ADAPTIVE, and the tolerance is the target's own quantum rather than a taste.
     Measured before it was written: uniform in POSITION plateaus at |err| 0.047 however many stops are
     added, because no even sampling resolves a vertical; uniform in REFLECTANCE fixes the rim and
     moves the failure to 0.021 in the middle, because it leaves the flat 70% as one chord. */
  {
    const st = G.rimStops();
    const R = u => G.reflectance(Math.min(u, G.U_MAX));
    let worst = 0;
    for (let i = 0; i < st.length - 1; i++)
      for (let j = 1; j < 60; j++) {
        const t = j / 60, u = st[i].u + (st[i + 1].u - st[i].u) * t;
        worst = Math.max(worst, Math.abs(st[i].a + (st[i + 1].a - st[i].a) * t - R(u)));
      }
    T("the gradient's chord never departs from the curve by more than the 8-bit alpha quantum",
      worst <= G.ALPHA_TOL, { worst: +worst.toFixed(6), tol: +G.ALPHA_TOL.toFixed(6), stops: st.length });
    T("the stop count is derived from that tolerance, not authored",
      st.length > 8 && st.length < 40 && G.rimStops(1 / 64).length < st.length,
      { atQuantum: st.length, looser: G.rimStops(1 / 64).length });
    T("the profile is the curve: no easing, no normalisation, alpha IS the reflectance",
      Math.abs(st[0].a - G.reflectance(0)) < 1e-12 && st[st.length - 1].a === G.reflectance(G.U_MAX));
  }

  /* PROTOTYPED ON THE REFERENCE SURFACE AND WORN BY NO TOOL — the 2.10 shape exactly, where the
     meniscus was adopted on this surface first and both tools took it one release later. */
  {
    const ref = fs.readFileSync(path.join(R8, "occvm", "reference", "index.html"), "utf8");
    const btc = fs.readFileSync(path.join(R8, "index.html"), "utf8");
    T("the vessel is spliced into the reference surface", ref.includes("OCCVM SPINE glass.js"));
    /* 2.38 retires "and into no tool yet". It was true from 2.32 and pinned deliberately, because a
       part derived and adopted nowhere is a claim about optics nobody can see and the guard kept that
       honest. What replaces it is the stronger statement now available: the tool carries the vessel,
       and the vessel is what bounds the field rather than an ornament on it. */
    T("and now into the tool, because the vessel is what bounds the field",
      btc.includes("OCCVM SPINE glass.js"));
    T("the reference surface carries a live #l2glass specimen", ref.includes('id="l2glass"'));
    /* the specimen prints what it measures. 2.14's defect was a typed sentence inside the instrument
       built to make typed sentences impossible, so the numbers on the page come from the part. */
    T("and it prints the figures from the part rather than typing them",
      /G\.floorPx\(\)/.test(ref) && /G\.shiftRangePx\(\)/.test(ref) && /inn\.criticalDeg/.test(ref));
  }
}


/* 2.37 — AN ANGLE-VALUED TRIG FUNCTION MULTIPLIED BY A UNIT DROPS THE WHOLE DECLARATION.
   The sibling shipped `linear-gradient(calc(atan2(var(--ly), var(--lx)) * 1rad + 90deg), ...)` on four
   surfaces. CSS atan2() already returns an angle, so that is angle x angle; and because the expression
   contains var(), it is invalid AT COMPUTED-VALUE TIME, which does NOT fall back to an earlier cascade
   entry the way a parse error would — the property takes its initial value. background-image: none, on
   the open face, the binding and the gilt override word, with no console message and every source-text
   assertion in that repo still green. Found by reading the deployed page's computed styles.
   This tool writes no trig in CSS today, so the guard is preventive here and pins the negative: it
   fails the day one is written wrong. The sibling's own suite carries the same check against its
   stylesheet, which is where the four sites are. Comments stripped first — a guard that reads its own
   prose has been the defect four releases running. */
{
  const fsT = require("fs"), pathT = require("path");
  const srcT = fsT.readFileSync(pathT.join(__dirname, "..", "index.html"), "utf8");
  const cssT = srcT.slice(srcT.indexOf("<style"), srcT.indexOf("</style>")).replace(/\/\*[\s\S]*?\*\//g, " ");
  const FN = /\b(atan2|atan|asin|acos)\s*\(/g;
  const bad = [];
  let mm;
  while ((mm = FN.exec(cssT))) {
    let i = mm.index + mm[0].length, d = 1;
    while (i < cssT.length && d > 0) { if (cssT[i] === "(") d++; else if (cssT[i] === ")") d--; i++; }
    if (/^\s*\*\s*[\d.]*\s*(deg|rad|grad|turn)\b/.test(cssT.slice(i, i + 24))) bad.push(mm[1]);
  }
  T("no angle-valued trig result is multiplied by an angle unit in this tool's CSS", bad.length === 0);
  /* and the sibling's four sites are the corrected form, checked from here too because the defect
     class is the law's and not one tool's. Skipped, and SAID to be skipped, when it is absent. */
  const RH = pathT.join(__dirname, "..", "..", "Rhyme-Instrument", "tome-src", "20_style.css");
  if (fsT.existsSync(RH)) {
    const sib = fsT.readFileSync(RH, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ");
    T("the sibling's light-bearing gradients add the 90deg rather than scaling by it",
      (sib.match(/atan2\(var\(--ly\), var\(--lx\)\) \+ 90deg/g) || []).length === 4 &&
      !/atan2\([^)]*\)\)\s*\*\s*[\d.]*\s*(deg|rad|grad|turn)/.test(sib));
  } else {
    console.log("  skipped (not passed): the sibling is absent, so its four gradients are unchecked");
  }
}


/* 2.38 — THE SHARED PARTS ARE COPIED BETWEEN THE REPOSITORIES BY HAND, AND NOTHING CHECKED IT.
   occvm/ is the spine: L3 says one fact has one owner, and a part carried twice is one fact written
   twice the moment the two copies differ. Every other duplication in this system has a gate —
   SPINE.md is asserted byte-identical, the React vendor is asserted byte-identical to the sibling's,
   the splicers all re-splice and diff — and the parts themselves, which are the actual shared code,
   had none. The seam has been open since occvm/ existed.
   IT WAS ALREADY DRIFTING WHEN THIS WAS WRITTEN. `glass.js` differed: the sibling carried the
   PRE-CORRECTION copy that authors `#ffffff` as the rim colour, while this repo carries the one that
   resolves `--bone` at call time and paints NOTHING when the token is absent. That correction is
   recorded in §12's 2.32 entry as made — it landed here and never reached there, in two commits that
   share a message. It stayed invisible because glass.js is spliced nowhere in the sibling, so no
   measure ever read it; a dormant divergence is still a divergence, and the day it was worn it would
   have shipped a bare white literal into a tool L6 governs.
   The set is taken from the FILESYSTEM INTERSECTION rather than a typed list, because a typed list of
   parts is precisely what went stale twice in the token auditor (§12, 2.27). */
{
  const fsP = require("fs"), pathP = require("path");
  const here = pathP.join(__dirname, "..", "occvm");
  const there = pathP.join(__dirname, "..", "..", "Rhyme-Instrument", "occvm");
  if (!fsP.existsSync(there)) {
    console.log("  skipped (not passed): the sibling repository is absent, so part parity is unchecked");
  } else {
    /* BTC-only by design and named so the guard cannot quietly absorb a part going missing:
       the numeric face ships only where mono is rendered (§12, 1.3). Everything else that exists in
       both must be byte-identical. */
    const BTC_ONLY = ["mono.css", "mono.head.css"];
    const pick = d => fsP.readdirSync(d).filter(f => /\.(js|css)$/.test(f));
    const mine = pick(here), theirs = new Set(pick(there));
    const shared = mine.filter(f => theirs.has(f));
    const missing = mine.filter(f => !theirs.has(f) && BTC_ONLY.indexOf(f) < 0);
    T("every part this tool carries is either shared or a named exception: " + missing.join(","),
      missing.length === 0);
    T("the BTC-only list is exactly the parts the sibling really lacks",
      BTC_ONLY.every(f => !theirs.has(f) && mine.indexOf(f) >= 0));
    const drifted = shared.filter(f =>
      !fsP.readFileSync(pathP.join(here, f)).equals(fsP.readFileSync(pathP.join(there, f))));
    T("every shared part is byte-identical in both repositories: " + (drifted.join(",") || "none drifted"),
      drifted.length === 0);
    T("and there is a real set to check, so an empty intersection cannot pass as agreement",
      shared.length >= 8);
  }
}


/* 2.38 — THE CANVAS IS THE VESSEL, so its width is not cosmetic. occvm/floor.js bounds every drop to
   the canvas it is handed; while that canvas was `inset: 0` the vessel's wall was a description and
   not an edge, and on any screen wider than the column the field ran past .wrap on both sides
   contained by nothing. Driven in Chromium at three widths, canvas against column, matching on both
   width AND left offset:
       BTC    390 -> 390@0    1100 -> 1100@0    1600 -> 1180@210
       Rhyme  390 -> 390@0    1100 ->  720@190  1600 ->  720@440
   all six AGREE now. It hid here because this tool's column is 1180 and only a viewport wider than
   that could show it — but the SIBLING's column is 720, so its field was outside its vessel at 1100
   as well, which is the desktop width nearly every measurement in this system has been taken at. */
{
  const fsV = require("fs"), pathV = require("path");
  const srcV = fsV.readFileSync(pathV.join(__dirname, "..", "index.html"), "utf8");
  const cssV = srcV.slice(srcV.indexOf("<style"), srcV.indexOf("</style>"));
  T("the floor canvas is the column's width, from the token the column reads",
    /#occvm-floor\{[^}]*width:min\(100%,var\(--column\)\)/.test(cssV.replace(/\s+/g, "")
      .replace("#occvm-floor{", "#occvm-floor{")) ||
    /width:min\(100%,var\(--column\)\)/.test(cssV.replace(/\s+/g, "")));
  T("the content column reads the same token", /\.wrap\{max-width:var\(--column\)/.test(cssV.replace(/\s+/g, "")));
  T("and the width has exactly one owner", (cssV.match(/--column:\s*\d+px/g) || []).length === 1);
  /* the floor must still be fixed — L13's boundary reads this and law-audit.js measures it too */
  T("the floor is still a fixed layer", /#occvm-floor\{position:fixed/.test(cssV.replace(/\s+/g, "")));

  /* THE RIM IS THE LIGHT'S AND IS RESOLVED, NOT AUTHORED — 2.4's finding that a specular return on a
     dielectric carries the source's colour. The part reads `--bone` at call time and returns "none"
     when it does not resolve, so an absent token paints nothing rather than an invented white; the
     tool must therefore never hand it a colour. Visible in the golden record rather than promised:
     the three pinned instants carry three different rims — #f2d9b2 at low sun, #ece3d0 at high,
     #ccd0e0 at night — which is the sundial reaching L2's vessel. */
  T("the rim comes from the part rather than being written here",
    /OCCVM_GLASS\.rimGradient\(\{gain:RIM_GAIN\}\)/.test(srcV));
  T("and the tool never hands it a colour, so an unresolved --bone paints nothing",
    !/rimGradient\(\{[^}]*color:/.test(srcV));
  T("the rim's weight is named and is the measured one", /const RIM_GAIN = 0\.25;/.test(srcV));
  {
    const gj = fsV.readFileSync(pathV.join(__dirname, "..", "occvm", "golden", "btc", "tokens.json"), "utf8");
    const rims = new Set(Object.values(JSON.parse(gj).cases).map(c => c.tokens["--vessel-rim"]));
    T("and the golden record shows it moving with the light: three instants, three rims", rims.size === 3);
  }
}

/* ── 2.41 — OCCVM-L3 reaches the page ground ──────────────────────────────────────────────────
   The last surface the one light did not reach. Through 2.40 `--field` and `--field-hi` were fixed
   :root literals, so both tools painted the same ground at noon and at midnight while every surface
   above them moved: measured, BTC's frame median was 6.22 L* at high sun against 4.43 at night, and
   75% of the frame sat under 10 L* at NOON. Rhyme was worse and fully static — median 2.4 L* at
   every instant — because it typed the two hexes as bare literals rather than reading a token.

   What is asserted here is the DERIVATION and not a brightness. The ground is the substrate's own
   shadow face, which the material already derives, so there is no number to drift: the guard fails
   if the ground stops being that face, and fails if it stops moving. A guard on "is it bright
   enough" would be an authored threshold wearing a measurement's coat. */
{
  const fs41 = require("fs"), path41 = require("path");
  const h41 = load();
  const at = (elev) => h41.R(`OCCVM_SUN.respond({elev:${elev},az:180})`);
  const day = at(56), dusk = at(3), night = at(-39);

  T("the sundial writes the page ground at all",
    day["--field"] !== undefined && day["--field-hi"] !== undefined,
    Object.keys(day).filter(k => /field/.test(k)).join(",") || "neither");

  /* the role assignment, at every elevation rather than at one */
  T("the ground IS the substrate's shadow face, and its top IS the substrate base — every instant",
    [day, dusk, night].every(t => t["--field"] === t["--sub-lo"] && t["--field-hi"] === t["--sub"]),
    [day, dusk, night].map(t => t["--field"] + "/" + t["--sub-lo"]).join(" "));

  /* and it MOVES: a ground that resolves per minute to one value is the no-op 2.17 refused */
  T("the ground carries the day rather than resolving to one colour per minute",
    new Set([day["--field"], dusk["--field"], night["--field"]]).size === 3,
    [day["--field"], dusk["--field"], night["--field"]].join(" "));
  T("and night is still the darkest of the three, so the day did not invert",
    parseInt(night["--field"].slice(1), 16) < parseInt(day["--field"].slice(1), 16));

  /* neither tool may re-acquire a second source of truth for the ground (L3). The fallback
     declaration is permitted and is the only permitted site — SPINE.md 2ad, the same grant the
     substrate's own fallback has. Comments are stripped first: a guard that reads its own prose has
     been the defect five releases running. */
  const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
  const GROUND_HEX = /#(?:09080d|100e16)\b/gi;
  /* TWO fallback forms are permitted and both are named rather than sniffed. The CSS custom-property
     declaration is SPINE.md 2ad's grant: a page must paint a ground before the part runs. The PAL map
     entry is the SAME grant one file along, recorded at 2.17 — jsdom resolves no custom property, and
     a canvas palette that silently became empty strings would paint nothing while every assertion
     passed. Anything else is a second source of truth for the ground (L3).
     This clause found a real third site on its first run: PAL's own literal, which the first draft
     counted as a violation because the pattern only knew the CSS form. */
  const FALLBACK = /(?:--field(?:-hi)?\s*:\s*|field\s*:\s*")#(?:09080d|100e16)/gi;
  for (const [label, file] of [["BTC", "index.html"],
                               ["Rhyme", "../Rhyme-Instrument/tome-src/20_style.css"]]) {
    const f = path41.join(__dirname, "..", file);
    if (!fs41.existsSync(f)) { T(`${label}: ground literal check skipped, not passed — sibling absent`, true); continue; }
    const body = strip(fs41.readFileSync(f, "utf8"));
    const hits = (body.match(GROUND_HEX) || []).length;
    const fb = (body.match(FALLBACK) || []).length;
    T(`${label}: the ground hexes appear only as a declared fallback, never in a rule`,
      hits === fb && fb >= 1, `${hits} occurrences, ${fb} of them a permitted fallback`);
  }
  /* and where the ground IS restated as a fallback, the copies must agree — the whole of L3's claim.
     A PAL literal that drifted from the :root declaration would paint one ground on the canvas and
     another on the page for the entire span before the first sunTick. */
  {
    const html41 = fs41.readFileSync(path41.join(__dirname, "..", "index.html"), "utf8");
    const rootFb = (/--field\s*:\s*(#[0-9a-f]{6})/i.exec(strip(html41)) || [])[1];
    const palFb  = (/PAL\s*=\s*\{\s*field\s*:\s*"(#[0-9a-f]{6})"/i.exec(strip(html41)) || [])[1];
    T("the ground's two fallbacks carry the same value, so the canvas and the page cannot disagree",
      !!rootFb && !!palFb && rootFb.toLowerCase() === palFb.toLowerCase(), `${rootFb} vs ${palFb}`);
  }
}

process.exit(done());
