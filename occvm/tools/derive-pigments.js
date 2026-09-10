#!/usr/bin/env node
/* OCCVM 2.27 — the generator behind occvm/pigments.js. Run it, commit its output.
 *
 *   node occvm/tools/derive-pigments.js          print the table and the checks
 *   node occvm/tools/derive-pigments.js --write  regenerate occvm/pigments.js
 *
 * WHY A GENERATOR AND NOT A TABLE. PIGMENT-PALETTES §4 says every hex in the palette proposal is
 * AUTHORED, and says so because a table of colours that looked derived would be the dishonest version.
 * That is true of the eight values per palette this file takes as INPUT. It is not true of the eight it
 * emits: a ramp member (--malachite-lo under a palette whose positive is teal) is not a design choice,
 * it is the same ramp the shipped build already carries, re-hung under a new hue. Authoring twenty more
 * hexes by eye would be inventing colour the plan never specified; deriving them from what renders is
 * the measurement this system prefers everywhere else.
 *
 * THE DERIVATION, stated so it can be argued with. Every ramp offset is measured ONCE, in CIE L*C*h,
 * off the values this tool ships today (the `obsidian` column). A child token is its parent's authored
 * hex moved by that parent's own measured (dL, chroma ratio, dH). Chroma is carried as a RATIO rather
 * than a difference because a hue with less chroma available cannot absorb an absolute step; out-of-
 * gamut results are clipped by reducing chroma at fixed L and h, never by moving either.
 *
 * WHAT MAKES IT CHECKABLE. `obsidian` IS the anchor, so it must round-trip byte-identical — the
 * derivation applied to today's values must reproduce today's values exactly. That is asserted below and
 * in both suites, and it is what makes "selecting obsidian is a no-op" a measurement rather than a claim.
 * Independently: PIGMENT-PALETTES authors a THIRD decorative value for three of the five palettes, and
 * this derivation was built without reference to it. Where both exist they are compared, and the
 * agreement is reported rather than assumed. */

const fs = require("fs"), path = require("path");

/* ---- colour ------------------------------------------------------------------------------------ */
const D65 = [0.95047, 1, 1.08883];
const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const gam = c => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

function toLch(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255].map(lin);
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / D65[0];
  const Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / D65[1];
  const Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / D65[2];
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29;
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  const L = 116 * fy - 16, a = 500 * (fx - fy), bb = 200 * (fy - fz);
  let h = Math.atan2(bb, a) * 180 / Math.PI; if (h < 0) h += 360;
  return { L, C: Math.hypot(a, bb), h };
}

function rgbOf(L, C, h) {
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const g3 = t => t > 6 / 29 ? t * t * t : 3 * (6 / 29) * (6 / 29) * (t - 4 / 29);
  const X = g3(fx) * D65[0], Y = g3(fy) * D65[1], Z = g3(fz) * D65[2];
  return [ 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z,
          -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z,
           0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z].map(gam);
}

/* Clip by reducing chroma at fixed L and h. Bisection, then the byte round: L and h are the two things a
   ramp member must not move (lightness IS the ramp, hue IS the palette), so chroma is the only axis that
   may give. */
function toHex(L, C, h) {
  const inGamut = c => rgbOf(L, c, h).every(v => v >= -1e-6 && v <= 1 + 1e-6);
  if (!inGamut(C)) { let lo = 0, hi = C; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; inGamut(m) ? lo = m : hi = m; } C = lo; }
  return "#" + rgbOf(L, C, h).map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
}

/* the offset a shipped child sits at from its shipped parent */
function offset(parent, child) {
  const p = toLch(parent), c = toLch(child);
  let dh = c.h - p.h; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
  return { dL: c.L - p.L, cr: c.C / p.C, dh };
}
const apply = (parent, o) => { const p = toLch(parent); return toHex(p.L + o.dL, p.C * o.cr, (p.h + o.dh + 360) % 360); };

/* ---- the anchor: what this tool renders today -------------------------------------------------- */
/* Each row is (child token, its parent slot, the value BOTH carry in the shipped build). The offsets are
   read off this column and nowhere else, which is why `obsidian` must reproduce it byte for byte. */
const ANCHOR = {
  positive: "#3fbf7e", positiveLo: "#1c6a45",   /* --malachite / --malachite-lo */
  negative: "#e0475f", negativeLo: "#6b1a2e",   /* --ruby / --ruby-lo (PAL.rubyLo, until now token-less) */
  gilt:     "#ffe9a3", giltB:      "#d9a52c", giltC: "#7a5510",
  active:   "#3f9a86", activeLo:   "#23574c",
  m:        "#8d5cf0", mlo:        "#4a2a8c", lo: "#5a36a8", hi: "#c9a6ff",
};
const DERIVED = [["positiveLo", "positive"], ["negativeLo", "negative"], ["giltB", "gilt"], ["giltC", "gilt"],
                 ["activeLo", "active"], ["mlo", "m"], ["lo", "m"]];
const OFFSETS = {}; for (const [c, p] of DERIVED) OFFSETS[c] = offset(ANCHOR[p], ANCHOR[c]);

/* ---- authored input: PIGMENT-PALETTES §3, verbatim --------------------------------------------- */
/* `m` and `hi` are that document's decorative range; which of its three becomes which is decided by
   MEASURED lightness (a highlight is the lighter one) rather than by its table order, and where it
   authors a third the derivation is checked against it below under `check`. */
const AUTHORED = {
  astro: { label: "the original — the 1963 Astro, red-orange wax in clear liquid",
    handles: { positive: "Verdigris Bloom", negative: "Ember", gilt: "Filament", active: "Patina", m: "Lava", hi: "Molten" },
    positive: "#3fbf7e", negative: "#e0475f", gilt: "#ffe9a3", active: "#3f9a86",
    m: "#ff6b35", hi: "#f7931e", check: { lo: "#c1440e" } },
  deepwater: { label: "blue on clear — the cool counterpart, high contrast against the vessel",
    handles: { positive: "Sea Glass", negative: "Coral Signal", gilt: "Brass Cap", active: "Shallow", m: "Cobalt Drift", hi: "Ice Column" },
    positive: "#4ecdc4", negative: "#e0475f", gilt: "#ffd97d", active: "#45938a",
    m: "#2e6fd9", hi: "#8fc9ff", check: { lo: "#1a4f8f" } },
  acid: { label: "green on purple — unmistakably synthetic, unmistakably of its era",
    handles: { positive: "Acid Bloom", negative: "Wine Fault", gilt: "Ultraviolet Gilt", active: "Reactor", m: "Blacklight", hi: "Ooze" },
    positive: "#7fff4f", negative: "#d6336c", gilt: "#ffe66d", active: "#5cb85c",
    m: "#9d4edd", hi: "#b6ff3f", check: { lo: "#6b2d8f" } },
  sunset: { label: "yellow into orange — the lamp that reads as lit even when it is not",
    handles: { positive: "Palm Green", negative: "Rust", gilt: "Late Sun", active: "Frond", m: "Marigold", hi: "Peach Glass" },
    positive: "#52b788", negative: "#c9432f", gilt: "#ffc857", active: "#40916c",
    m: "#ffb627", hi: "#ffd6a5", check: {} },
  obsidian: { label: "the current build, preserved — selecting it is a no-op, and that is measured",
    handles: { positive: "Malachite", negative: "Ruby", gilt: "Gilt", active: "Verdigris", m: "Amethyst", hi: "Amethyst Light" },
    positive: ANCHOR.positive, negative: ANCHOR.negative, gilt: ANCHOR.gilt, active: ANCHOR.active,
    m: ANCHOR.m, hi: ANCHOR.hi, check: { positiveLo: ANCHOR.positiveLo, negativeLo: ANCHOR.negativeLo,
      giltB: ANCHOR.giltB, giltC: ANCHOR.giltC, activeLo: ANCHOR.activeLo, mlo: ANCHOR.mlo, lo: ANCHOR.lo } },
};

/* ---- build ------------------------------------------------------------------------------------- */
const OUT = {}, CHECKS = [];
for (const key in AUTHORED) {
  const a = AUTHORED[key], p = { label: a.label, handles: a.handles };
  for (const s of ["positive", "negative", "gilt", "active", "m", "hi"]) p[s] = a[s];
  for (const [child, parent] of DERIVED) p[child] = apply(a[parent], OFFSETS[child]);
  for (const s in a.check) CHECKS.push({ palette: key, slot: s, authored: a.check[s], derived: p[s] });
  OUT[key] = p;
}
const de = (x, y) => { const A = toLch(x), B = toLch(y); let dh = Math.abs(A.h - B.h); if (dh > 180) dh = 360 - dh;
  return { dL: B.L - A.L, dC: B.C - A.C, dh }; };

if (require.main === module) {
  console.log("offsets measured off the shipped build (CIE L*C*h):");
  for (const [c, p] of DERIVED) { const o = OFFSETS[c];
    console.log(`  ${c.padEnd(11)} = ${p.padEnd(9)} dL ${o.dL.toFixed(2).padStart(7)}  Cx ${o.cr.toFixed(4)}  dh ${o.dh.toFixed(2).padStart(7)}`); }
  console.log("\nladder (L*), must be monotone lo-side up:");
  for (const k in OUT) { const p = OUT[k];
    console.log(`  ${k.padEnd(10)} mlo ${toLch(p.mlo).L.toFixed(1).padStart(5)} < lo ${toLch(p.lo).L.toFixed(1).padStart(5)}` +
      ` < m ${toLch(p.m).L.toFixed(1).padStart(5)} < hi ${toLch(p.hi).L.toFixed(1).padStart(5)}` +
      `   ${toLch(p.mlo).L < toLch(p.lo).L && toLch(p.lo).L < toLch(p.m).L && toLch(p.m).L < toLch(p.hi).L ? "ok" : "OUT OF ORDER"}`); }
  console.log("\nderived vs the third value PIGMENT-PALETTES authors (not an input to the derivation):");
  let worst = 0;
  for (const c of CHECKS) { const d = de(c.authored, c.derived);
    const exact = c.authored.toLowerCase() === c.derived.toLowerCase();
    if (!exact) worst = Math.max(worst, Math.abs(d.dL));
    console.log(`  ${c.palette.padEnd(10)} ${c.slot.padEnd(11)} authored ${c.authored}  derived ${c.derived}  ` +
      (exact ? "BYTE-IDENTICAL" : `dL ${d.dL.toFixed(2).padStart(6)}  dC ${d.dC.toFixed(1).padStart(6)}  dh ${d.dh.toFixed(1).padStart(5)}`)); }
  const anchorFails = CHECKS.filter(c => c.palette === "obsidian" && c.authored.toLowerCase() !== c.derived.toLowerCase());
  console.log(`\nanchor round-trip: ${anchorFails.length ? "FAIL — " + anchorFails.map(c => c.slot).join(", ") : "every obsidian value reproduced byte-identical"}`);
  console.log("\nhue separation of the roles (deg), positive-vs-negative is the load-bearing one:");
  for (const k in OUT) { const p = OUT[k];
    console.log(`  ${k.padEnd(10)} pos/neg ${de(p.positive, p.negative).dh.toFixed(0).padStart(4)}   pos/active ${de(p.positive, p.active).dh.toFixed(0).padStart(4)}` +
      `  (dL ${Math.abs(de(p.positive, p.active).dL).toFixed(1).padStart(5)})`); }
  if (process.argv.includes("--json")) console.log("\n" + JSON.stringify(OUT, null, 2));
}
module.exports = { OUT, OFFSETS, ANCHOR, CHECKS, toLch, toHex, apply, offset, DERIVED, AUTHORED };

/* ---- CIEDE2000 --------------------------------------------------------------------------------- */
/* Added because hue angle alone answers the wrong question. PIGMENT-PALETTES §2 pins `positive` to green
   and `active` to verdigris-adjacent, and three of its five palettes put them within 7 degrees of each
   other — but two colours a person can tell apart at a glance may share a hue and differ in lightness,
   which is exactly what those three do. The property that matters is perceptual distance, so measure it. */
function de00(x, y) {
  const A = toLch(x), B = toLch(y);
  const Cb = (A.C + B.C) / 2, G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));
  const rad = d => d * Math.PI / 180;
  const ap = [A, B].map(p => (1 + G) * p.C * Math.cos(rad(p.h))), bp = [A, B].map(p => p.C * Math.sin(rad(p.h)));
  const Cp = ap.map((a, i) => Math.hypot(a, bp[i]));
  const hp = ap.map((a, i) => { if (a === 0 && bp[i] === 0) return 0; let v = Math.atan2(bp[i], a) * 180 / Math.PI; return v < 0 ? v + 360 : v; });
  const dL = B.L - A.L, dC = Cp[1] - Cp[0];
  let dh = 0; if (Cp[0] * Cp[1] !== 0) { dh = hp[1] - hp[0]; if (dh > 180) dh -= 360; if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(Cp[0] * Cp[1]) * Math.sin(rad(dh / 2));
  const Lb = (A.L + B.L) / 2, Cpb = (Cp[0] + Cp[1]) / 2;
  let hb; if (Cp[0] * Cp[1] === 0) hb = hp[0] + hp[1];
  else if (Math.abs(hp[0] - hp[1]) <= 180) hb = (hp[0] + hp[1]) / 2;
  else hb = (hp[0] + hp[1] + (hp[0] + hp[1] < 360 ? 360 : -360)) / 2;
  const T = 1 - 0.17 * Math.cos(rad(hb - 30)) + 0.24 * Math.cos(rad(2 * hb)) + 0.32 * Math.cos(rad(3 * hb + 6)) - 0.20 * Math.cos(rad(4 * hb - 63));
  const SL = 1 + 0.015 * Math.pow(Lb - 50, 2) / Math.sqrt(20 + Math.pow(Lb - 50, 2));
  const SC = 1 + 0.045 * Cpb, SH = 1 + 0.015 * Cpb * T;
  const RT = -2 * Math.sqrt(Math.pow(Cpb, 7) / (Math.pow(Cpb, 7) + Math.pow(25, 7))) *
             Math.sin(rad(60 * Math.exp(-Math.pow((hb - 275) / 25, 2))));
  return Math.sqrt(Math.pow(dL / SL, 2) + Math.pow(dC / SC, 2) + Math.pow(dH / SH, 2) + RT * (dC / SC) * (dH / SH));
}
module.exports.de00 = de00;
if (require.main === module && !process.argv.includes("--write")) {
  console.log("\nperceptual distance between the roles a reader must never confuse (CIEDE2000):");
  for (const k in OUT) { const p = OUT[k];
    console.log(`  ${k.padEnd(10)} pos/neg ${de00(p.positive, p.negative).toFixed(1).padStart(5)}` +
      `   pos/active ${de00(p.positive, p.active).toFixed(1).padStart(5)}` +
      `   pos/gilt ${de00(p.positive, p.gilt).toFixed(1).padStart(5)}` +
      `   neg/gilt ${de00(p.negative, p.gilt).toFixed(1).padStart(5)}`); }
  console.log(`\n  the shipped build's own separation is the floor any palette must clear: pos/active ${de00(ANCHOR.positive, ANCHOR.active).toFixed(1)}`);
}

/* ---- emit ------------------------------------------------------------------------------------- */
const HEADER = `/* OCCVM 2.27 — the pigment palettes (OCCVM-L6). One implementation, shared by every conforming tool.
 *
 * GENERATED by occvm/tools/derive-pigments.js. Do not hand-edit: run the generator and commit its output.
 * Authored in occvm/SPINE.md; spliced into a tool by occvm/tools/splice-spine.js. Do not hand-edit the
 * spliced copy either — the next splice reverts it silently.
 *
 * This replaces occvm/minerals.js, which was crystal-era vocabulary that outlived aragonite. The closed
 * three-mineral set existed because under a crystal a colour had to be a mineral that exists with that
 * colour. A dye is not discovered, it is chosen: a lamp manufacturer picks what they want and the wax
 * does not constrain it, so the constraint that produced the closed set died with the crystal.
 *
 * THE EASEMENT, RECORDED RATHER THAN SLID IN. Some handles below are invented where no real pigment
 * fits. Every other name in this system was chosen to be defensible — Fraunces replaced Cinzel because
 * the incised-stone justification died; minerals.js was renamed because the category stopped meaning
 * anything. This is not that. The decorative layer does not answer to the derivation standard the rest
 * of the system does, and saying so here is cheaper than a later reader mistaking it for the naming
 * discipline quietly eroding. Naming a dye after a compound it does not contain would be the dressed-up
 * version; naming it plainly is the honest one.
 *
 * WHAT A PALETTE MAY NOT CHANGE. Semantics are fixed to HUE, never to a slot: green is positive, red is
 * negative, gilt is authority, verdigris-adjacent is active — in every palette, always. A palette is not
 * a remapping of meaning, it is a choice of WHICH green and WHICH red. Nothing a palette does can make
 * confirmed and failed read alike. Measured rather than promised: the smallest positive/negative
 * separation across the five is CIEDE2000 62.3, against the shipped build's own 73.1.
 *
 * WHAT IS AUTHORED AND WHAT IS NOT. Six values per palette are AUTHORED — the four fixed roles and the
 * decorative accent and highlight. No hex among them is derived from a spectrum, a compound or a
 * measurement, and they are labelled authored because a table of colours that looked derived would be
 * the dishonest version. Seven per palette are DERIVED: each is its parent's hex moved by the offset
 * (dL, chroma ratio, dh in CIE L*C*h) that the SHIPPED build already puts between that same pair. The
 * generator's header carries the argument for why those two classes are drawn where they are.
 *
 * OBSIDIAN IS THE ANCHOR AND SELECTING IT IS A NO-OP — measured, not claimed. Its six authored values
 * are this tool's current literals, and the derivation applied to them reproduces the other seven
 * BYTE-IDENTICALLY. Both suites assert that; a change to the derivation that moved today's build would
 * fail before it shipped.
 *
 * ONE MEASURED NEGATIVE, RECORDED RATHER THAN TUNED AWAY. PIGMENT-PALETTES pins \`active\` to
 * verdigris-adjacent, and three palettes author it 4-16 degrees off that hue, closest to \`positive\` in
 * \`sunset\` (1 degree, separated by lightness alone). The shipped build's own positive/active separation
 * is CIEDE2000 14.8; \`sunset\` reads 11.7 and is the only palette below it. Rotating its \`active\` onto
 * the verdigris hue was tried and reaches 13.6 — still short, because the limit is its low-chroma green
 * \`positive\`, not the hue of its \`active\`. Clearing the floor would mean re-authoring a role hex by eye,
 * which is what this system refuses everywhere else, so the value ships as the plan authors it and the
 * number is on the record. The separation table is asserted per palette, so any change to it must be
 * re-recorded rather than absorbed.
 */`;

function emit() {
  const q = s => JSON.stringify(s);
  const AUTH = ["positive", "negative", "gilt", "active", "m", "hi"];
  const rows = Object.keys(OUT).map(k => {
    const p = OUT[k], h = p.handles;
    const hd = Object.keys(h).map(s => `${s}: ${q(h[s])}`).join(", ");
    return `  ${k}: {\n    label: ${q(p.label)},\n    handles: { ${hd} },\n` +
      `    /* authored */\n` +
      `    ${AUTH.map(s => `${s}: ${q(p[s])}`).join(", ")},\n` +
      `    /* derived from the authored parent by the shipped build's own L*C*h offset */\n` +
      `    ${DERIVED.map(([c]) => `${c}: ${q(p[c])}`).join(", ")},\n  },`;
  }).join("\n");
  const off = DERIVED.map(([c, p]) => `  ${c}: { of: ${q(p)}, dL: ${OFFSETS[c].dL.toFixed(4)}, ` +
    `cr: ${OFFSETS[c].cr.toFixed(6)}, dh: ${OFFSETS[c].dh.toFixed(4)} },`).join("\n");
  const sep = Object.keys(OUT).map(k => `  ${k}: { posNeg: ${de00(OUT[k].positive, OUT[k].negative).toFixed(1)}, ` +
    `posActive: ${de00(OUT[k].positive, OUT[k].active).toFixed(1)} },`).join("\n");
  return `${HEADER}
var OCCVM_PIGMENTS = {
${rows}
};

/* The default is the current build, so a reader who never opens the picker sees no change at all. */
var OCCVM_PIGMENT_DEFAULT = "obsidian";

/* The token each slot writes, in ONE place, so both tools write the same names to the same properties.
   Before this the two tools each carried their own applyMineral() writing four properties by hand, which
   is how a shared set acquires a local exception. */
var OCCVM_PIGMENT_TOKENS = {
  positive: "--malachite", positiveLo: "--malachite-lo",
  negative: "--ruby", negativeLo: "--ruby-lo",
  gilt: "--gilt-a", giltB: "--gilt-b", giltC: "--gilt-c",
  active: "--verdigris", activeLo: "--verdigris-lo",
  m: "--pigment", mlo: "--pigment-lo",
  hi: "--vein-hi", lo: "--vein-lo",
};

/* The offsets the derivation used, kept beside their output so the table can be checked without running
   the generator, and so a reader can see that the derived column is one rule rather than twenty choices. */
var OCCVM_PIGMENT_OFFSETS = {
${off}
};

/* Measured separation between the roles a reader must never confuse (CIEDE2000). Recorded, not computed
   at runtime: a number in the source that the suite checks is a number somebody has to re-record when it
   moves, which is the whole point. The shipped build's own posActive is 14.8 and is the floor. */
var OCCVM_PIGMENT_SEPARATION = {
${sep}
};

/* Writing a palette is one call in both tools. Returns the palette so a caller can read a slot it does
   not write to a token — the canvas does exactly that. */
function occvmApplyPigment(name, style) {
  var p = OCCVM_PIGMENTS[name] || OCCVM_PIGMENTS[OCCVM_PIGMENT_DEFAULT];
  for (var slot in OCCVM_PIGMENT_TOKENS) style.setProperty(OCCVM_PIGMENT_TOKENS[slot], p[slot]);
  return p;
}

if (typeof module !== "undefined") module.exports = {
  PIGMENTS: OCCVM_PIGMENTS, TOKENS: OCCVM_PIGMENT_TOKENS, DEFAULT: OCCVM_PIGMENT_DEFAULT,
  OFFSETS: OCCVM_PIGMENT_OFFSETS, SEPARATION: OCCVM_PIGMENT_SEPARATION, apply: occvmApplyPigment,
};
`;
}
module.exports.emit = emit;
if (require.main === module && process.argv.includes("--write")) {
  const p = path.join(__dirname, "..", "pigments.js");
  fs.writeFileSync(p, emit());
  console.log("WROTE " + p);
}
