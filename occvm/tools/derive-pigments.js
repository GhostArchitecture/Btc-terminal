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
 * WHAT MAKES IT CHECKABLE. The ANCHOR must round-trip byte-identical — the derivation applied to the
 * shipped build's own values must reproduce the shipped build's own values exactly. That is asserted
 * below and in both suites, and it is what makes the derived column a rule rather than twenty choices.
 *
 * 2.42 — THE SIX AUTHORED ROLES ARE SATURATED, AND HUE IS THE ONLY THING LEFT AUTHORED IN THEM. Each
 * role goes to the greatest chroma sRGB holds at ITS OWN HUE, with lightness free to move inside an
 * authored band (SAT_BAND, +/-5 L*) and chosen by wherever in that band the chroma maximum falls. Hue
 * never moves — so which colour means what is untouched, which is the whole of L6 — and no hex is
 * chosen by eye. The band is the ONE number this pass adds; the search itself is a ternary maximisation
 * over a unimodal boundary and a bisection to the gamut edge, so it carries no grid resolution and no
 * step size to pick. What was AUTHORED at 2.27 is kept beside the result under OCCVM_PIGMENT_AUTHORED,
 * because the record of what a person chose must survive the pass that supersedes it.
 *
 * SEPARATIONS ARE HELD, AND THE BACKOFF NAMES ITS GIVER. Saturating every role at once narrows some
 * palettes' positive/active distance, so each palette is backed off until neither its positive/negative
 * nor its positive/active CIEDE2000 separation sits below the value it had BEFORE this pass. `active`
 * gives first, by bisection on one scalar from its authored value to its maximum, because `positive` is
 * the role a reader reads most and because the earlier measurement found the limit to be the palette's
 * own low-chroma green rather than the hue of its active. `positive` gives only if backing `active` all
 * the way out still will not clear the floor. The cost is recorded per palette rather than absorbed.
 *
 * WHAT THIS RETIRES, NAMED WITH ITS REASON. "Selecting obsidian is a no-op" is retired. It was a
 * MIGRATION guarantee, made at 2.27 so a pre-2.27 reader's stored `mineral` could land somewhere that
 * looked like what they already had; that migration fired eight releases ago and the sentence has been
 * a description since. Exempting the default from a pass applied to every other palette would be the
 * local exception L6 exists to prevent, and the owner's instruction was to saturate the colours rather
 * than four fifths of them. What does NOT retire is the anchor round-trip: that is a property of the
 * DERIVATION, not of the obsidian palette, and it is asserted against ANCHOR directly now that the two
 * have stopped being the same table.
 *
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

/* ---- 2.42: saturation ---------------------------------------------------------------------- */
/* THE ONE AUTHORED NUMBER IN THIS PASS. How far lightness may move to find more chroma. Named as
   authored, like LOCK_RELAX_MS and GOO_GAIN: no derivation maps "how much lightness a role may trade
   for colour" onto anything this system measures, and pretending otherwise would be an authored number
   wearing a derivation's coat. Everything else below is a search, not a choice. */
const SAT_BAND = 5;

/* The greatest chroma sRGB holds at (L, h). Bisection against the same in-gamut test toHex clips with,
   so the boundary this finds and the boundary that clips are the same boundary. */
function maxChromaAt(L, h) {
  const inGamut = c => rgbOf(L, c, h).every(v => v >= -1e-6 && v <= 1 + 1e-6);
  if (!inGamut(0)) return 0;
  let lo = 0, hi = 400;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; inGamut(m) ? lo = m : hi = m; }
  return lo;
}

/* The greatest chroma available anywhere in the band, at this hue. maxChromaAt is unimodal in L at a
   fixed hue — the gamut boundary rises to the cusp and falls away either side — so a ternary search
   finds the maximum exactly, and when the cusp lies outside the band it converges on the band edge.
   Ternary rather than a grid on purpose: a grid would add a step size nobody chose. */
function peak(hex, band) {
  const p = toLch(hex);
  let lo = Math.max(0, p.L - band), hi = Math.min(100, p.L + band);
  for (let i = 0; i < 200; i++) {
    const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3;
    maxChromaAt(a, p.h) < maxChromaAt(b, p.h) ? lo = a : hi = b;
  }
  const L = (lo + hi) / 2;
  return { L, C: maxChromaAt(L, p.h), h: p.h };
}

/* One scalar per role, 0 at what was authored and 1 at that role's peak, moving L and C together and
   never h. This is what the backoff bisects on, so a partially-backed-off role is still on the straight
   line between the two — it is never somewhere a third rule put it. */
function lerpRole(hex, pk, t) {
  const p = toLch(hex);
  return toHex(p.L + t * (pk.L - p.L), p.C + t * (pk.C - p.C), p.h);
}

/* Saturate the six roles of one palette, then back off until the two separations a reader must never
   lose are no worse than they were before the pass. Returns the roles AND the scalars, because a cost
   that is not recorded is a cost that was absorbed. */
function saturate(a) {
  const ROLES = ["positive", "negative", "gilt", "active", "m", "hi"];
  const pk = {}; for (const r of ROLES) pk[r] = peak(a[r], SAT_BAND);
  const floorPN = de00(a.positive, a.negative), floorPA = de00(a.positive, a.active);
  const pa = (tp, ta) => de00(lerpRole(a.positive, pk.positive, tp), lerpRole(a.active, pk.active, ta));
  const pn = (tp, tn) => de00(lerpRole(a.positive, pk.positive, tp), lerpRole(a.negative, pk.negative, tn));
  const bisect = f => { let lo = 0, hi = 1; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; f(m) ? lo = m : hi = m; } return lo; };

  /* `active` gives first; `positive` gives only if backing `active` all the way out is not enough. */
  let tPos = 1, tAct = 1;
  if (pa(1, 1) < floorPA) {
    if (pa(1, 0) >= floorPA) tAct = bisect(m => pa(1, m) >= floorPA);
    else { tAct = 0; tPos = bisect(m => pa(m, 0) >= floorPA); }
  }
  /* positive/negative widens under saturation in every palette measured, so this branch is a guard
     rather than a path — but a constraint that is only checked where it is expected to bind is not a
     constraint. `negative` gives here, for the same reason `active` does above: it is not `positive`. */
  let tNeg = 1;
  if (pn(tPos, 1) < floorPN) tNeg = bisect(m => pn(tPos, m) >= floorPN);

  const t = { positive: tPos, negative: tNeg, gilt: 1, active: tAct, m: 1, hi: 1 };
  const out = {}; for (const r of ROLES) out[r] = lerpRole(a[r], pk[r], t[r]);
  return { roles: out, t, floor: { posNeg: floorPN, posActive: floorPA } };
}

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
  obsidian: { label: "the build this system grew from, saturated with the rest — no longer a no-op, see the header",
    handles: { positive: "Malachite", negative: "Ruby", gilt: "Gilt", active: "Verdigris", m: "Amethyst", hi: "Amethyst Light" },
    positive: ANCHOR.positive, negative: ANCHOR.negative, gilt: ANCHOR.gilt, active: ANCHOR.active,
    m: ANCHOR.m, hi: ANCHOR.hi, check: {} },
};

/* THE ANCHOR ROUND-TRIP, standing on its own from 2.42. Until now it was obsidian's `check` block, which
   worked only while obsidian and ANCHOR were the same six hexes. They are not any more, and the property
   is the DERIVATION's rather than that palette's: apply the offsets to the values they were measured off
   and the values they were measured off must come back, byte for byte. Computed here, asserted in both
   suites, and it is what keeps the derived column a rule instead of twenty choices. */
const ANCHOR_ROUNDTRIP = DERIVED.map(([child, parent]) => ({
  slot: child, authored: ANCHOR[child], derived: apply(ANCHOR[parent], OFFSETS[child]),
}));
const ANCHOR_FAILS = ANCHOR_ROUNDTRIP.filter(r => r.authored.toLowerCase() !== r.derived.toLowerCase());

/* What actually ships: every authored role put through the saturation pass. AUTHORED stays untouched
   beside it — the corroboration check below compares the derivation against PIGMENT-PALETTES' own third
   decorative value and must run on the UNSATURATED parents, since that third value was authored
   unsaturated. Comparing a saturated output against it would be measuring this pass, not the derivation. */
const SAT = {}; for (const k in AUTHORED) SAT[k] = saturate(AUTHORED[k]);

/* ---- build ------------------------------------------------------------------------------------- */
const OUT = {}, CHECKS = [];
for (const key in AUTHORED) {
  const a = AUTHORED[key], r = SAT[key].roles, p = { label: a.label, handles: a.handles };
  for (const s of ["positive", "negative", "gilt", "active", "m", "hi"]) p[s] = r[s];
  for (const [child, parent] of DERIVED) p[child] = apply(r[parent], OFFSETS[child]);
  /* the corroboration check runs on the UNSATURATED parent, per the note above */
  for (const s in a.check) CHECKS.push({ palette: key, slot: s, authored: a.check[s],
    derived: apply(a[DERIVED.find(d => d[0] === s)[1]], OFFSETS[s]) });
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
  console.log(`\nanchor round-trip: ${ANCHOR_FAILS.length ? "FAIL — " + ANCHOR_FAILS.map(c => c.slot).join(", ") : "every ANCHOR value reproduced byte-identical from its own parent"}`);
  console.log(`\n2.42 saturation — max chroma at the role's own hue, L free within +/-${SAT_BAND}, separations held:`);
  for (const k in SAT) { const a = AUTHORED[k], r = SAT[k].roles, t = SAT[k].t, f = SAT[k].floor;
    console.log(`  ${k}`);
    for (const role of ["positive", "negative", "gilt", "active", "m", "hi"]) {
      const p0 = toLch(a[role]), p1 = toLch(r[role]);
      console.log(`    ${role.padEnd(9)} ${a[role]} -> ${r[role]}  C ${p0.C.toFixed(1).padStart(5)} -> ${p1.C.toFixed(1).padStart(5)}` +
        ` (${(p1.C / p0.C).toFixed(2)}x)  dL ${(p1.L - p0.L >= 0 ? "+" : "") + (p1.L - p0.L).toFixed(1)}` +
        `  dh ${(p1.h - p0.h).toFixed(2)}  t ${t[role].toFixed(3)}${t[role] < 1 ? "  <- backed off" : ""}`);
    }
    console.log(`    floor pos/neg ${f.posNeg.toFixed(1)} -> ${de00(r.positive, r.negative).toFixed(1)}` +
      `   pos/act ${f.posActive.toFixed(1)} -> ${de00(r.positive, r.active).toFixed(1)}`);
  }
  console.log("\nhue separation of the roles (deg), positive-vs-negative is the load-bearing one:");
  for (const k in OUT) { const p = OUT[k];
    console.log(`  ${k.padEnd(10)} pos/neg ${de(p.positive, p.negative).dh.toFixed(0).padStart(4)}   pos/active ${de(p.positive, p.active).dh.toFixed(0).padStart(4)}` +
      `  (dL ${Math.abs(de(p.positive, p.active).dL).toFixed(1).padStart(5)})`); }
  if (process.argv.includes("--json")) console.log("\n" + JSON.stringify(OUT, null, 2));
}
module.exports = { OUT, OFFSETS, ANCHOR, CHECKS, toLch, toHex, apply, offset, DERIVED, AUTHORED,
  /* 2.42 — the pass and its two searches are exported so a suite can re-run the RULE rather than
     compare digits. A guard that checks the output can be satisfied by retyping a hex; one that
     re-derives cannot. */
  saturate, peak, maxChromaAt, lerpRole, SAT, SAT_BAND, ANCHOR_ROUNDTRIP };

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
 * WHAT IS AUTHORED AND WHAT IS NOT — RE-DRAWN AT 2.42. Until 2.42 six values per palette were authored
 * outright. Now only their HUE is: each of the six is put through a saturation pass that takes it to the
 * greatest chroma sRGB holds at that hue, with lightness free inside an authored +/-5 L* band and chosen
 * by wherever in the band the chroma maximum falls. So a shipped role is authored in hue, maximal in
 * chroma, and derived in lightness. The 2.27 authored input is kept verbatim in OCCVM_PIGMENT_AUTHORED,
 * because the record of what a person chose must survive the pass that supersedes it. Seven per palette
 * are DERIVED from those roles: each is its parent's hex moved by the offset (dL, chroma ratio, dh in
 * CIE L*C*h) that the PRE-PALETTE build already put between that same pair.
 *
 * SEPARATIONS ARE HELD ACROSS THE PASS, AND THE BACKOFF IS RECORDED. No palette's positive/negative or
 * positive/active CIEDE2000 separation is allowed below the value it had before saturation. \`active\`
 * gives first where they would collide, by bisection on one scalar from its authored value to its own
 * maximum; OCCVM_PIGMENT_SATURATION carries that scalar per role, so the cost is a number in the source
 * rather than something absorbed. It costs \`acid\` almost all of its active headroom (1.05x against an
 * available 1.51x) and \`deepwater\` and \`sunset\` some of theirs.
 *
 * THE ANCHOR ROUND-TRIP IS THE DERIVATION'S, NOT OBSIDIAN'S. Applying the offsets to the values they
 * were measured off reproduces those values BYTE-IDENTICALLY. Both suites assert it. It used to be
 * stated as "selecting obsidian is a no-op", which held only while obsidian and the anchor were the same
 * six hexes; 2.42 saturates obsidian with every other palette, so that sentence is RETIRED — it was a
 * migration guarantee for a migration that fired at 2.27, and exempting the default from a pass applied
 * to the other four would be the local exception L6 exists to prevent. The round-trip itself survives
 * untouched, because it was never a fact about that palette.
 *
 * ONE MEASURED NEGATIVE, RECORDED RATHER THAN TUNED AWAY. PIGMENT-PALETTES pins \`active\` to
 * verdigris-adjacent, and three palettes author it 4-16 degrees off that hue, closest to \`positive\` in
 * \`sunset\` (1 degree, separated by lightness alone). The pre-palette build's own positive/active
 * separation is CIEDE2000 14.8; \`sunset\` read 11.7 and is the only palette below it. Rotating its
 * \`active\` onto the verdigris hue was tried and reaches 13.6 — still short, because the limit is its
 * low-chroma green \`positive\`, not the hue of its \`active\`. Clearing the floor would mean re-authoring
 * a role hex by eye, which is what this system refuses everywhere else, so it ships short and the number
 * is on the record. 2.42 does not repair it and does not worsen it: the saturation pass holds every
 * palette at or above its own pre-pass separation, so sunset's 11.7 becomes 11.8 rather than 10.8 — but
 * it is still the one below the old build's 14.8. The separation table is asserted per palette, so any
 * change to it must be re-recorded rather than absorbed.
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
  const auth = Object.keys(AUTHORED).map(k =>
    `  ${k}: { ${AUTH.map(r => `${r}: ${q(AUTHORED[k][r])}`).join(", ")} },`).join("\n");
  const satr = Object.keys(SAT).map(k => {
    const t = SAT[k].t, f = SAT[k].floor;
    const gave = AUTH.filter(r => t[r] < 1).map(r => `${r}: ${t[r].toFixed(4)}`);
    return `  ${k}: { floor: { posNeg: ${f.posNeg.toFixed(1)}, posActive: ${f.posActive.toFixed(1)} },` +
      ` t: { ${AUTH.map(r => `${r}: ${t[r].toFixed(4)}`).join(", ")} }` +
      `${gave.length ? ` /* backed off: ${gave.join(", ")} */` : ""} },`;
  }).join("\n");
  const anch = ANCHOR_ROUNDTRIP.map(r => `  ${r.slot}: ${q(r.authored)},`).join("\n");
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
   moves, which is the whole point. The pre-palette build's own posActive is 14.8. */
var OCCVM_PIGMENT_SEPARATION = {
${sep}
};

/* 2.42 — WHAT WAS AUTHORED, kept beside what ships. These are the 2.27 hexes, verbatim and untouched by
   the saturation pass; OCCVM_PIGMENTS above carries what they become. The pass may only move lightness
   (within OCCVM_PIGMENT_BAND) and chroma (to the sRGB edge), never hue, so each row here and its shipped
   counterpart name the same colour at a different strength. Kept because a record of what a person chose
   must survive the pass that supersedes it, and because the suite re-derives the shipped table from this
   one rather than trusting either. */
var OCCVM_PIGMENT_AUTHORED = {
${auth}
};

/* How far lightness may travel to find chroma. The one authored number the 2.42 pass adds; everything
   else in it is a search. The 8-bit round can put a SHIPPED value a fraction outside this — the band
   bounds what is asked for, not what sRGB can spell. */
var OCCVM_PIGMENT_BAND = ${SAT_BAND};

/* 2.42 — THE COST OF HOLDING THE SEPARATIONS, per palette, recorded rather than absorbed. \`t\` is each
   role's position between its authored value (0) and its own maximum chroma inside the band (1); \`floor\`
   is the separation that role set had BEFORE the pass, which is what the backoff is held against. A role
   below 1 gave up chroma so a reader would not lose a distance they already had.
   \`t\` IS A REPORT, NOT AN INPUT, and the four decimals are why that has to be said. The bisection
   carries full precision; re-deriving a role from the rounded figure here lands one 8-bit code away
   (measured: deepwater's active comes back #23a195 against the shipped #23a095). Anything checking this
   table must re-run the pass, which is what both suites do. */
var OCCVM_PIGMENT_SATURATION = {
${satr}
};

/* 2.42 — THE ANCHOR ROUND-TRIP, as data so a suite can assert it without re-running the generator. These
   are the seven ramp values the offsets were measured off; applying those offsets to the parents they
   were measured from must reproduce them byte for byte. This is a property of the DERIVATION and is why
   the derived column is one rule rather than twenty choices. It is no longer a claim about \`obsidian\`:
   see the header. */
var OCCVM_PIGMENT_ANCHOR = {
${anch}
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
  AUTHORED: OCCVM_PIGMENT_AUTHORED, BAND: OCCVM_PIGMENT_BAND, SATURATION: OCCVM_PIGMENT_SATURATION,
  ANCHOR: OCCVM_PIGMENT_ANCHOR,
};
`;
}
module.exports.emit = emit;
if (require.main === module && process.argv.includes("--write")) {
  const p = path.join(__dirname, "..", "pigments.js");
  fs.writeFileSync(p, emit());
  console.log("WROTE " + p);
}
