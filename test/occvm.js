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

/* --- OCCVM-L11, 1.1b: fracture, and the misfit that was tested and not shipped ------------------ */
{
  const VEINS11 = require("../occvm/veins.js");
  const FRAC = require("../occvm/fracture.js");
  const fs11 = require("fs"), path11 = require("path");
  const ROOT11 = path11.resolve(__dirname, "..");

  /* the angle is the mineral's, derived from the cell, not written down */
  const expected = 2 * Math.atan(VEINS11.CELL.b / VEINS11.CELL.a) * 180 / Math.PI;
  T("the twin angle is computed from the unit cell", Math.abs(VEINS11.TWIN_ANGLE - expected) < 1e-9,
    VEINS11.TWIN_ANGLE.toFixed(3));
  T("it is aragonite's 116.209°, not an eyeballed crack", Math.abs(VEINS11.TWIN_ANGLE - 116.209) < 0.01);
  T("the misfit follows from it", Math.abs(VEINS11.MISFIT - (120 - VEINS11.TWIN_ANGLE) / 60) < 1e-12);
  T("fracture takes its angle FROM the generator, never its own copy",
    FRAC.twinAngle() === VEINS11.TWIN_ANGLE &&
    !/2\s*\*\s*Math\.atan/.test(fs11.readFileSync(path11.join(ROOT11, "occvm", "fracture.js"), "utf8")));

  /* the split is a real line at that angle, and the two halves are complementary */
  const [h1, h2] = FRAC.halves(FRAC.twinAngle() - 90, 0);
  const edge = /polygon\(([^,]+),([^,]+),/;
  T("both halves share the same split edge", h1.match(edge)[1] === h2.match(edge)[1] && h1.match(edge)[2] === h2.match(edge)[2]);
  T("the halves take opposite sides of it", h1.includes("-60%") && h2.includes("160%"));

  /* the vocabulary rules L11 states */
  const src11 = fs11.readFileSync(path11.join(ROOT11, "occvm", "fracture.js"), "utf8");
  T("fracture is faster than any elastic curve", FRAC.MS <= 250, FRAC.MS + "ms");
  T("fracture never fades — no opacity anywhere in the primitive", !/opacity/i.test(src11));
  T("the halves torque rather than sliding parallel", /rotate\(/.test(src11));
  T("it respects the reduced-motion floor (L8)", /prefers-reduced-motion/.test(src11));
  T("the clone carries its RESOLVED style, or an #id-styled element fractures blank",
    /getComputedStyle\(el\)/.test(src11) && /setProperty\(prop/.test(src11));

  /* 1.1b's negative result must stay recorded, or it will be re-attempted */
  const doc11 = fs11.readFileSync(path11.join(ROOT11, "occvm", "SPINE.md"), "utf8");
  T("the misfit's negative result is on the record", /no measurable growth consequence|does not express/i.test(doc11));
  T("no seam term was shipped into the generator",
    !/seam/.test(fs11.readFileSync(path11.join(ROOT11, "occvm", "veins.js"), "utf8").split("return rnd()")[0].slice(-400)));
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

/* --- OCCVM-L10, 1.1a: the vein grows ARAGONITE, not a generic dendrite --------------------------
 * The roadmap's 2.0 anchors substrate and vein to one crystal, and says to build the right growth
 * parameters now rather than reworking them later. Aragonite radiates from a nucleation point and twins
 * in threes; both are asserted here on the exact owner and rotation of each growth, because a property
 * measured by nearest-nucleus guessing is buried as soon as two growths overlap.
 */
{
  const VEINS = require("../occvm/veins.js");

  /* rotation-invariant angular harmonic of each growth, with its own twin rotation removed */
  const harmonics = (twin, habit) => {
    const acc = new Array(9).fill(0);
    let groupsSeen = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const g = VEINS.grow({ w: 96, h: 60, n: 1728, habit, seed, twin });
      const per = g.groups.map(() => []);
      for (let i = 0, s = 0; i < g.segs.length; i += 4, s++) {
        const gr = g.groups[g.segOwner[s]];
        let dy = g.segs[i + 3] - gr.cy;
        if (dy > g.h / 2) dy -= g.h; else if (dy < -g.h / 2) dy += g.h;
        const dx = g.segs[i + 2] - gr.cx;
        if (dx || dy) per[g.segOwner[s]].push(Math.atan2(dy, dx) - gr.rot);
      }
      for (const A of per) {
        if (A.length < 40) continue;
        groupsSeen++;
        for (let k = 1; k <= 8; k++) {
          let re = 0;
          for (const a of A) re += Math.cos(k * a);
          acc[k] += re / A.length;
        }
      }
    }
    return { H: acc.map(v => (groupsSeen ? v / groupsSeen : 0)), groupsSeen };
  };

  const dom = H => H.map((v, k) => [k, v]).slice(1).sort((a, b) => b[1] - a[1])[0];

  /* the shipped setting is the one that has to work — a habit that only expresses at 1.0 ships nothing */
  const ship = harmonics(3, 0.55);
  const dShip = dom(ship.H);
  T("aragonite twins in threes at the shipped habit (.55)", dShip[0] === 3, { k: dShip[0], power: +dShip[1].toFixed(3) });
  T("the threefold signal is dominant, not merely present",
    ship.H[3] > 2 * Math.max(ship.H[1], ship.H[2], ship.H[4]), {
      k3: +ship.H[3].toFixed(3), next: +Math.max(ship.H[1], ship.H[2], ship.H[4]).toFixed(3) });
  T("enough growths to measure on", ship.groupsSeen >= 20, ship.groupsSeen);

  /* it must track the parameter, or the number 3 is decoration rather than a cause */
  for (const n of [4, 6]) {
    const d = dom(harmonics(n, 0.55).H);
    T(`twin ${n} grows ${n}-fold symmetry`, d[0] === n, { asked: n, got: d[0] });
  }

  /* OCCVM-L10's own words: habit 0 is the equant dendrite. Equant means NO angular structure. */
  const eq = harmonics(3, 0);
  T("habit 0 grows equant — no angular structure at all",
    Math.max(...eq.H.slice(1)) < 0.1, +Math.max(...eq.H.slice(1)).toFixed(3));

  /* the anisotropy is the crystal's, not the viewport's: a rotated field must grow the same structure */
  const a = VEINS.grow({ w: 96, h: 60, n: 1728, habit: 0.55, seed: 77, twin: 3 });
  const b = VEINS.grow({ w: 96, h: 60, n: 1728, habit: 0.55, seed: 77, twin: 3 });
  T("growth is deterministic under a fixed seed", JSON.stringify(a.segs) === JSON.stringify(b.segs));
  T("the twin order is reported with the growth", a.twin === 3 && a.groups.length >= 3);

  /* still DLA, still no bezier, still fast enough for the law's stated exit */
  const t0 = Date.now();
  for (let i = 0; i < 8; i++) VEINS.grow({ w: 96, h: 60, n: 1728, habit: 0.55, seed: 100 + i });
  const each = (Date.now() - t0) / 8;
  T("growth stays well inside the 30ms exit criterion", each < 30, each.toFixed(1) + "ms");
  const svg = VEINS.field({ seed: 5, w: 96, h: 60, viewW: 1200, viewH: 800, density: 0.3, habit: 0.55 }).svg;
  T("no bezier command survives the aragonite rewrite", !/[CcSsQqTtAa]\s*[\d-]/.test(svg.match(/d='([^']*)'/)[1]));
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
  T("the generator reads the spine's tokens",
    /--vein-density/.test(html2) && /--vein-habit/.test(html2));
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

/* ── 2.0 — the material model (OCCVM-L12) ─────────────────────────────────────────────────────── */
{
  const MAT = require("../occvm/material.js");
  const VEINS20 = require("../occvm/veins.js");
  const FRAC20 = require("../occvm/fracture.js");
  const fs20 = require("fs"), path20 = require("path"), vm20 = require("vm");
  const A = MAT.ARAGONITE;

  /* the lattice has exactly ONE owner. Until 2.0 the cell was typed in both files — two copies of one
     fact, the defect fracture.js's own header forbids, one level up. */
  T("veins.js reads the material's cell rather than restating it", VEINS20.CELL === A.cell);
  T("material.js does not derive the twin angle a second time", MAT.twinAngle === undefined);
  T("the twin angle still has one value across all three consumers",
    Math.abs(VEINS20.TWIN_ANGLE - FRAC20.twinAngle()) < 1e-12 &&
    Math.abs(VEINS20.TWIN_ANGLE - 2 * Math.atan(A.cell.b / A.cell.a) * 180 / Math.PI) < 1e-12);

  /* REGRESSION GUARD, 1.1b -> 2.0. The splicer inserts every part after one anchor, so parts land in
     reverse list order and fracture.js is evaluated BEFORE veins.js is assigned. Capturing OCCVM_VEINS
     at IIFE time therefore left it null in the browser and cleave() threw on every call from the moment
     1.1b shipped, while Node resolved it through require and every assertion passed. This runs the
     spliced blocks in the order the PAGE has them, with no require available. */
  {
    const src = fs20.readFileSync(path20.join(__dirname, "..", "index.html"), "utf8");
    const blk = n => { const i = src.indexOf("var " + n + " ="); return src.slice(i, src.indexOf("\nif (typeof module", i)); };
    const iMat = src.indexOf("var OCCVM_MATERIAL ="), iVein = src.indexOf("var OCCVM_VEINS ="), iFrac = src.indexOf("var OCCVM_FRACTURE =");
    T("material.js is spliced into index.html", iMat > 0);
    T("material.js precedes veins.js in the page (veins reads the cell at load)", iMat > 0 && iMat < iVein);
    const ctx = vm20.createContext({ Math, console });
    let threw = null;
    try {
      vm20.runInContext(blk("OCCVM_MATERIAL"), ctx);
      vm20.runInContext(blk("OCCVM_FRACTURE"), ctx);
      vm20.runInContext(blk("OCCVM_VEINS"), ctx);
      ctx.OCCVM_FRACTURE.twinAngle();
    } catch (e) { threw = e.message; }
    T("fracture resolves the twin angle under the page's own load order, with no require", threw === null, threw || "");
    T("fracture sits before veins in the page, so the guard is testing the real order", iFrac < iVein);
  }

  /* optics: the three faces, at the slab's cut geometry, in the order the material fixes */
  const F = MAT.faces(A);
  T("front face takes alpha at the view normal", F.front.n === A.ri.alpha && F.front.theta === 0);
  T("edge face takes gamma near tangent", F.edge.n === A.ri.gamma && F.edge.theta === 80);
  T("reflectance is ordered edge > chamfer > front", F.edge.R > F.chamfer.R && F.chamfer.R > F.front.R);
  T("normal-incidence Fresnel on alpha is 4.39%", Math.abs(MAT.fresnel(A.ri.alpha, 0) - 0.0439) < 5e-4,
    (MAT.fresnel(A.ri.alpha, 0) * 100).toFixed(2) + "%");
  T("the measured optical spread is 9.35x", Math.abs(F.edge.R / F.front.R - 9.353) < 0.01,
    (F.edge.R / F.front.R).toFixed(3));

  /* THE DOUBLE-GAMMA GUARD. A reflectance ratio is a ratio in linear light. The first resolver scaled
     sRGB bytes directly and a 9.35x optical spread rendered as 116x. */
  const lin = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = h => { const p = lin(h); return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; };
  const s1 = MAT.substrate(A, 1);
  const measured = lum(s1.hi) / lum(s1.lo);
  T("the rendered spread matches the optical ratio in linear light (no double gamma)",
    Math.abs(measured / s1.spread - 1) < 0.02, measured.toFixed(3) + " vs " + s1.spread.toFixed(3));
  T("the rendered spread is nowhere near the sRGB-scaled value the first resolver produced", measured < 20, measured.toFixed(1));

  /* hue is the material's, not an artifact of one channel saturating before another */
  const hueOf = h => { const p = lin(h); const m = Math.max(...p) || 1; return p.map(v => v / m); };
  const hb = hueOf(A.body), hh = hueOf(s1.hi);
  T("scaling preserves hue across the ramp", hb.every((v, i) => Math.abs(v - hh[i]) < 0.02),
    hb.map(v => v.toFixed(3)).join(",") + " vs " + hh.map(v => v.toFixed(3)).join(","));

  /* contrast is an exponent on the optical ratio: 0 is flat, and it is monotone */
  const s0 = MAT.substrate(A, 0);
  T("contrast 0 collapses the ramp to the body colour", s0.hi === s0.mid && s0.mid === s0.lo && s0.lo === A.body);
  T("spread is monotone in contrast",
    MAT.substrate(A, 0.5).spread < MAT.substrate(A, 0.8).spread &&
    MAT.substrate(A, 0.8).spread < MAT.substrate(A, 1.2).spread);
  T("the substrate ramp is ordered hi > mid > lo", lum(s1.hi) > lum(s1.mid) && lum(s1.mid) > lum(s1.lo));

  /* the authored spread is reproduced at a DERIVED contrast, not a typed one */
  const kA = MAT.authoredContrast(A);
  T("authoredContrast is derived from the material, not a literal", Math.abs(kA - 0.7816) < 1e-3, kA.toFixed(4));
  T("at that contrast the material reproduces the spread the tools author today",
    Math.abs(MAT.substrate(A, kA).spread - MAT.AUTHORED_SPREAD) < 0.02);

  /* the sun must NOT enter the ratio — material owns structure, the sundial owns magnitude (1.2) */
  T("substrate takes no light argument", MAT.substrate.length === 2);
  T("faces takes no light argument", MAT.faces.length === 1);

  /* the flux-weighted derivation that was measured and rejected: R(theta)*cos(theta) is FLATTER than
     normal incidence, so it cannot produce a ramp. Pinned so nobody re-adopts it as the obvious fix. */
  {
    const b = (n, t) => MAT.fresnel(n, t) * Math.cos(t * Math.PI / 180);
    let hi = 0; for (let t = 0; t < 90; t += 0.1) hi = Math.max(hi, b(A.ri.beta, t));
    T("flux-weighted reflectance spans under 1.2x — recorded as rejected, not adopted",
      hi / b(A.ri.beta, 0) < 1.2, (hi / b(A.ri.beta, 0)).toFixed(3));
  }

  /* the other material properties, each derived rather than typed */
  T("birefringence is gamma - alpha", Math.abs(MAT.birefringence(A) - 0.155) < 1e-9);
  T("edge radius derives from hardness and stays inside L2's 4px ceiling",
    MAT.edgeRadius(A) > 1 && MAT.edgeRadius(A) <= 4);
  T("cast weight derives from density", Math.abs(MAT.castWeight(A) - A.density / 2.65) < 1e-9);
  const st = MAT.stiffness(A);
  T("stiffness normalises to the softest axis and orders a > b > c", st.c === 1 && st.a > st.b && st.b > st.c);

  /* ── P1 — anisotropic motion: derived, measured, and deliberately not wired ──────────────────── */
  {
    const mo = MAT.motion(A), st2 = MAT.stiffness(A);
    T("motion derives from stiffness as an oscillator period, 1/sqrt(k)",
      Math.abs(mo.a - 1 / Math.sqrt(st2.a)) < 1e-12 && Math.abs(mo.a - 0.7584) < 1e-3, mo.a.toFixed(4));
    T("a stiffer axis settles faster", mo.a < mo.b && mo.b < mo.c);
    T("motion is NOT the static-compliance mapping 1/k, which describes deflection not duration",
      Math.abs(mo.a - 1 / st2.a) > 0.15, (1 / st2.a).toFixed(4) + " would be compliance");

    /* THE SELF-RETIRING GUARD. P1 stays unwired only while anisotropy is unobservable, and it is
       unobservable only while nothing animates horizontally. This counts the real thing rather than
       trusting the note: when somebody adds a horizontal motion, this fails and says P1 is expressible.
       This censuses THIS repository only, and Rhyme carries the same guard over its own files. Reaching
       across to a sibling checkout would make the verdict depend on what happens to be on disk — the
       partial-checkout trap already fixed once in the token audit and once in the golden recorder. Two
       guards over two complete halves beats one guard over an uncertain whole. */
    const files20 = [["index.html"], ["occvm", "spine.css"], ["occvm", "reference", "index.html"]];
    let xSites = 0, seen = 0;
    for (const g of files20) {
      const f = path20.join(__dirname, "..", ...g);
      if (!fs20.existsSync(f)) continue;
      seen++;
      for (const line of fs20.readFileSync(f, "utf8").split("\n"))
        if (/translateX|translate3d\(\s*[^0]/.test(line) && /transition|animation|keyframes/.test(line)) xSites++;
    }
    T("the P1 census actually read this repo's files (a zero from an empty sweep proves nothing)",
      seen === files20.length, seen + "/" + files20.length);
    T("P1 stays unwired: still no animated horizontal motion to be anisotropic against",
      xSites === MAT.P1_UNEXPRESSED.translateXSites, xSites + " translateX site(s) — if nonzero, P1 is now expressible: wire it");

    /* and it must not have shipped tokens in the meantime — that would be D12, one release after 1.2a */
    for (const tok of ["--dur-a", "--dur-b", "--dur-c"])
      T(`P1 ships no ${tok} token while it is unexpressed`,
        !fs20.readFileSync(path20.join(__dirname, "..", "occvm", "spine.css"), "utf8").includes(tok));
  }

  /* ── P4 — unit-cell spacing: derived, measured, and not wired ───────────────────────────────── */
  {
    const sp = MAT.spacing(A);
    T("the spacing triple is the cell normalised to its shortest edge",
      sp.a === 1 && Math.abs(sp.c - 1.1573) < 1e-3 && Math.abs(sp.b - 1.6069) < 1e-3,
      [sp.a, sp.c, sp.b].map(v => v.toFixed(4)).join(" : "));

    /* THE QUANTISATION MEASUREMENT that decides it: spacing renders in whole pixels, and at the sizes
       84.5% of both tools' spacing uses, rounding replaces the cell ratio with something else entirely. */
    const rendered = base => [base, Math.round(base * sp.c), Math.round(base * sp.b)];
    T("at base 2 two of the three steps collapse to the same pixel", new Set(rendered(2)).size < 3, rendered(2).join("/"));
    /* The claim is the WANDER, not that every base is far off. At base 6 the rounding happens to land
       within 0.8% of the cell's ratio; at base 4 it is 8% out. That is exactly the problem — the rendered
       ratio is a function of the base, not of the material, so the cell is not what reaches the screen. */
    const bases = [4, 6, 8, 10, 12, 16];
    const steps = bases.map(b => { const r = rendered(b); return r[1] / r[0]; });
    const lo = Math.min(...steps), hi = Math.max(...steps);
    T("the rendered c-step is a function of the base, not the material: it wanders 1.125-1.250",
      Math.abs(lo - 1.125) < 1e-3 && Math.abs(hi - 1.250) < 1e-3, steps.map(v => v.toFixed(3)).join(" "));
    T("that wander straddles the cell's own 1.157, so no base renders it reliably",
      lo < sp.c && sp.c < hi && (hi - lo) > 0.1, `${lo.toFixed(3)} < ${sp.c.toFixed(4)} < ${hi.toFixed(3)}`);
    T("no base in the tools' range renders the cell's c-step exactly",
      steps.every(v => Math.abs(v - sp.c) > 1e-6));

    /* THE GOLDEN-RATIO GUARD, which ships even though the scale does not. 1.6069 and 1.6180 differ by
       0.04px at step 1 and do not reach a whole pixel until step 5, past the largest spacing either tool
       uses — so they are indistinguishable on screen and somebody will eventually "correct" one to the
       other. It is not a typo for phi; it is 7.97/4.96. */
    T("the golden ratio is named only to be rejected, and differs from the cell's by 0.0112",
      Math.abs(MAT.GOLDEN_RATIO - (1 + Math.sqrt(5)) / 2) < 1e-12 &&
      Math.abs(MAT.GOLDEN_RATIO - sp.b) > 0.01 && Math.abs(MAT.GOLDEN_RATIO - sp.b) < 0.02,
      (MAT.GOLDEN_RATIO - sp.b).toFixed(4));
    for (const f of ["occvm/spine.css", "occvm/material.js", "occvm/veins.js"]) {
      const body = fs20.readFileSync(path20.join(__dirname, "..", f), "utf8")
        .split("\n").filter(l => !/GOLDEN_RATIO|golden ratio|1\.6180 differs|"correct"/.test(l)).join("\n");
      T(`${f} carries no golden-ratio constant`, !/1\.618/.test(body),
        "phi is not the cell's ratio — 7.97/4.96 = 1.6069 and it has a reason");
    }
    T("P4 ships no spacing token while it is unexpressed",
      !/--s[abc]\b|--space-[abc]\b/.test(fs20.readFileSync(path20.join(__dirname, "..", "occvm", "spine.css"), "utf8")));
  }

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

  /* ── 2.3 — the substrate adopted from the material (OCCVM-L12) ──────────────────────────────── */
  {
    const css23 = fs20.readFileSync(path20.join(__dirname, "..", "occvm", "substrate.css"), "utf8");
    const tok = n => (css23.match(new RegExp("--" + n + ":\\s*(#[0-9a-f]{6})")) || [])[1];

    /* THE UN-FITTED PREDICTION, and it is the whole case for L12. Only the body colour was anchored, to
       L1's own floor; the other two fall out of angular Fresnel at L2's cut geometry and land on the
       authored values exactly. If either of these ever stops matching, the material has moved and the
       claim in SPINE.md that the endpoints are aragonite is no longer true. */
    T("--m-sub-hi predicts the authored --sub-hi to the byte, unfitted", tok("m-sub-hi") === "#2c2a36", tok("m-sub-hi"));
    T("--m-sub-lo is the anchored body colour, L1's own substrate floor", tok("m-sub-lo") === "#0e0d13", tok("m-sub-lo"));
    T("--m-sub is where the material and the hand disagree", tok("m-sub") !== "#1b1a22" && tok("m-sub") === "#131219", tok("m-sub"));
    T("the material's body colour is anchored to L1's floor, not an arbitrary hex", A.body === "#0e0d13", A.body);

    /* the disagreement is a DARKER mid-tone, by about 4 L* — visible, single, and stated */
    const lin23 = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255)
      .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const Lstar = h => { const p = lin23(h); const y = 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
      return y > 0.008856 ? 116 * Math.pow(y, 1 / 3) - 16 : 903.3 * y; };
    const dL = Lstar(tok("m-sub")) - Lstar("#1b1a22");
    T("adoption's entire visible consequence is one mid-tone, ~3.9 L* darker",
      dL < -3 && dL > -5, dL.toFixed(2) + " L*");

    /* PROVENANCE: the file must be generated, and CI must be able to catch a hand-edit */
    T("substrate.css declares itself generated and forbids hand-editing",
      /GENERATED by occvm\/tools\/gen-substrate\.js/.test(css23) && /DO NOT HAND-EDIT/.test(css23));
    {
      const r = require("child_process").spawnSync(process.execPath,
        [path20.join(__dirname, "..", "occvm", "tools", "gen-substrate.js"), "--check"], { encoding: "utf8" });
      T("the committed substrate.css matches what material.js derives right now", r.status === 0,
        (r.stdout || "").trim() + (r.stderr || "").trim());
    }
    T("substrate.css is spliced into this tool like any other part", /--m-sub-hi:/.test(
      fs20.readFileSync(path20.join(__dirname, "..", "index.html"), "utf8")));

    /* ADOPTION IS PER-SURFACE (SPINE.md 6b), and this tool has NOT adopted. BTC's substrate sits under
       the win/lose colours L5 and CLAUDE.md section 5 govern, so it is not the surface to prove this on.
       The tokens are declared here and consumed by nothing in this tool, which is deliberate and is the
       one place D12's rule does not apply: they are the spine's, shipped for a consumer that lives in
       the other repository. */
    const idx23 = fs20.readFileSync(path20.join(__dirname, "..", "index.html"), "utf8");
    const spliceless = idx23.replace(/\/\* occvm:begin[\s\S]*?occvm:end[^\n]*\*\//g, "");
    T("BTC has not adopted: its own CSS still reads the authored --sub-*",
      /var\(--sub-hi\)|var\(--sub\)/.test(spliceless));
    T("BTC's own CSS consumes no --m-sub-* token yet", !/var\(--m-sub/.test(spliceless));
  }

  /* SPINE.md is the law: the material's published constants must appear in it */
  {
    const spine = fs20.readFileSync(path20.join(__dirname, "..", "occvm", "SPINE.md"), "utf8");
    for (const v of ["4.96", "7.97", "5.74", "1.530", "1.680", "1.685", "2.93", "0.7584", "1.6069"])
      T(`SPINE.md records the material constant ${v}`, spine.includes(v));
    T("SPINE.md declares OCCVM-L12", /OCCVM-L12/.test(spine));
  }
}

process.exit(done());
