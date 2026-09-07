/* OCCVM 1.2/1.7 — the sundial. One light, shared by every conforming tool (OCCVM-L3).
 *
 * Authored in occvm/SPINE.md; spliced into a tool by occvm/tools/splice-spine.js. Do not hand-edit the
 * spliced copy — the next splice reverts it silently.
 *
 * Before 1.2 each tool carried its own. They agreed on the screen convention and on nothing downstream:
 * different solar algorithms, --elev on two scales, --night a step in one tool and a ramp in the other,
 * --glow a calc() in one and a scalar in the other, and a light vector that kept tracking the sun 39
 * degrees below the horizon. Those were OCCVM-D2, D8, D9 and D10, and one implementation closes all four.
 *
 * The split is deliberate and is registered in SPINE.md section 8: POSITION is the full NOAA algorithm,
 * which BTC carried; RESPONSE is the derivation of surface behaviour from it, which Rhyme carried. Each
 * tool kept its better half and neither keeps a second copy.
 *
 * 1.7 adds `--dusk-stage` (day/civil/nautical/astronomical/night, standard elevation boundaries) as a
 * discrete reading additive over the continuous --night ramp above — the ramp is unchanged, this is a
 * second, independent classification for anything that wants to react to the named stage rather than
 * a blend fraction (OCCVM-L9).
 *
 * Everything here is pure: same instant plus same place yields the same bytes. The golden set depends on
 * it (occvm/golden), and so does anything 2.0 resolves at sunTick.
 */
var OCCVM_SUN = (function () {
  "use strict";
  var RAD = Math.PI / 180;
  var DAYTON = { lat: 39.7589, lon: -84.1916, name: "Dayton" };
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ---- position: NOAA general solar position, evaluated in UTC ------------------------------------
   * Returns elevation in degrees and azimuth in degrees clockwise from north. UTC, not the local clock,
   * so the reading does not move with the viewer's timezone database.
   */
  function position(lat, lon, date) {
    var jd = date.getTime() / 86400000 + 2440587.5, jc = (jd - 2451545) / 36525;
    var gml = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
    var gma = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
    var ecc = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
    var ceq = Math.sin(gma * RAD) * (1.914602 - jc * (0.004817 + 0.000014 * jc))
            + Math.sin(2 * gma * RAD) * (0.019993 - 0.000101 * jc)
            + Math.sin(3 * gma * RAD) * 0.000289;
    var app = gml + ceq - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * jc) * RAD);
    var mo = 23 + (26 + ((21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813)))) / 60) / 60;
    var oc = mo + 0.00256 * Math.cos((125.04 - 1934.136 * jc) * RAD);
    var dec = Math.asin(Math.sin(oc * RAD) * Math.sin(app * RAD));
    var y = Math.pow(Math.tan(oc / 2 * RAD), 2);
    var eqt = 4 * (y * Math.sin(2 * gml * RAD) - 2 * ecc * Math.sin(gma * RAD)
            + 4 * ecc * y * Math.sin(gma * RAD) * Math.cos(2 * gml * RAD)
            - 0.5 * y * y * Math.sin(4 * gml * RAD) - 1.25 * ecc * ecc * Math.sin(2 * gma * RAD)) / RAD;
    var minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
    var tst = (minutes + eqt + 4 * lon + 1440) % 1440;
    var ha = (tst / 4 < 0) ? tst / 4 + 180 : tst / 4 - 180;
    var cz = Math.sin(lat * RAD) * Math.sin(dec) + Math.cos(lat * RAD) * Math.cos(dec) * Math.cos(ha * RAD);
    var zen = Math.acos(clamp(cz, -1, 1));
    var az = Math.acos(clamp(((Math.sin(lat * RAD) * Math.cos(zen)) - Math.sin(dec)) / (Math.cos(lat * RAD) * Math.sin(zen)), -1, 1)) / RAD;
    az = ha > 0 ? (az + 180) % 360 : (540 - az) % 360;
    /* `lam` — the sun's apparent ecliptic longitude — is returned because the moon's phase is its
       elongation from the sun, and computing the sun's position twice to get it would be two
       implementations of the same thing, which is the defect OCCVM-L3 exists to prevent. */
    return { elev: 90 - zen / RAD, az: az, lam: app };
  }

  /* ---- the moon: a secondary, weaker light, and ink's only other source (1.7) ---------------------
   *
   * OCCVM-L3 says there is exactly one light and it is the sun. That still holds for every SURFACE: the
   * moon casts nothing, bevels nothing, and moves no substrate. What it reaches is ink, and only at
   * night, which is the boundary OCCVM-L9 already draws.
   *
   * Low-precision lunar theory (Meeus ch. 47, principal terms). Accurate to roughly a degree, which is
   * far inside the tolerance of a light vector — the same argument SPINE.md §L3 already makes for
   * permitting a Fourier approximation of the sun's position but not a second implementation of it.
   *
   * ILLUMINATION IS NOT OPTIONAL. A moon above the horizon at new phase delivers no light at all, and a
   * model that lights the page by altitude alone would put a full moon's worth of ink glow into the
   * darkest night of the month. The phase is the elongation from the sun, so the sun's own longitude is
   * an input rather than a second sun.
   */
  function moon(lat, lon, date, sunLam) {
    var d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;   /* days since J2000 */
    var L = 218.316 + 13.176396 * d;                             /* mean longitude */
    var M = 134.963 + 13.064993 * d;                             /* mean anomaly */
    var F = 93.272 + 13.229350 * d;                              /* argument of latitude */
    var lam = (L + 6.289 * Math.sin(M * RAD)) * RAD;             /* ecliptic longitude */
    var bet = (5.128 * Math.sin(F * RAD)) * RAD;                 /* ecliptic latitude */
    var ec = 23.4397 * RAD;

    var dec = Math.asin(Math.sin(bet) * Math.cos(ec) + Math.cos(bet) * Math.sin(ec) * Math.sin(lam));
    var ra = Math.atan2(Math.sin(lam) * Math.cos(ec) - Math.tan(bet) * Math.sin(ec), Math.cos(lam));

    var lst = (280.16 + 360.9856235 * d + lon) * RAD;            /* local sidereal time */
    var H = lst - ra;
    var alt = Math.asin(Math.sin(lat * RAD) * Math.sin(dec) + Math.cos(lat * RAD) * Math.cos(dec) * Math.cos(H));
    var az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat * RAD) - Math.tan(dec) * Math.cos(lat * RAD));
    az = (az / RAD + 180) % 360;                                  /* from south → clockwise from north */
    if (az < 0) az += 360;

    /* phase: elongation from the sun, illuminated fraction (1 − cos ψ)/2 — 0 at new, 1 at full */
    var elong = Math.abs(((lam / RAD - (sunLam === undefined ? 0 : sunLam)) % 360 + 540) % 360 - 180);
    var illum = (1 - Math.cos(elong * RAD)) / 2;

    return { alt: alt / RAD, az: az, illum: illum, elong: elong };
  }

  /* ---- response: the surface behaviour the position produces -------------------------------------- */

  function mix(p, q, t) { return [0, 1, 2].map(function (i) { return Math.round(p[i] + (q[i] - p[i]) * t); }); }
  function hex(c) { return "#" + c.map(function (v) { return clamp(v, 0, 255).toString(16).padStart(2, "0"); }).join(""); }


  /* ── OCCVM-L12 adopted, 2.4 — the substrate's two face offsets are the material's, not authored ──
   *
   * Until 2.4 these were `0.14 * (0.5 + e)` toward white and a flat `0.42` toward black: two magic
   * numbers with no derivation, and the last authored values in the substrate. The material supplies
   * them now, as luminance ratios relative to the base colour this file owns.
   *
   * THE DIVISION OF LABOUR IS 2.0's AND IS UNCHANGED: the material owns STRUCTURE — how far the lit and
   * shaded faces sit from the base — and the sundial owns MAGNITUDE, which is the base colour itself and
   * the `(0.5 + e)` directionality term kept below. That term is not decoration: specular contrast
   * between faces genuinely depends on how directional the light is, so a face ratio that ignored the sun
   * would flatten the day. Measured, adopting the material's ratio WITHOUT it moves the noon highlight
   * -7.9 L* and raises night contrast +8.0 — it does not flatten uniformly, it inverts the day.
   *
   * THE OPERATION STAYS A MIX TOWARD THE LIGHT, not a uniform scale of the base. On a dielectric the
   * specular return carries the SOURCE's colour, so a highlight desaturates; scaling the base's own
   * linear RGB would keep its hue and make the highlight look like tinted glass. The material sets how
   * far, this file still decides toward what.
   *
   * Solved by bisection because lum(mix(a, b, t)) has no closed form through the sRGB transfer function.
   * It is monotone in t, 24 iterations resolve past 8-bit, and it runs once a minute. */
  function relLum(c) {
    var p = [0, 1, 2].map(function (i) {
      var v = c[i] / 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  }
  /* the material, read lazily: the splicer inserts parts in reverse list order, and capturing a sibling
     part at IIFE time is what had fracture.js throwing in the browser from 1.1b to 2.0. */
  function material() {
    return (typeof OCCVM_MATERIAL !== "undefined" && OCCVM_MATERIAL) ? OCCVM_MATERIAL
         : (typeof require !== "undefined" ? require("./material.js") : null);
  }
  var MAT_HI = "hi", MAT_LO = "lo";
  function faceMix(base, toward, which, e) {
    var m = material();
    if (!m) throw new Error("occvm sundial: material.js is not spliced beside this — no face ratios");
    var want = m.faceRatios(m.ARAGONITE)[which];
    /* directionality: the material's ratio is the full-light value; diffuse light flattens toward 1 */
    var dir = (0.5 + e) / 1.5;
    want = 1 + (want - 1) * dir;
    var L0 = relLum(base), lo = 0, hi = 1;
    for (var i = 0; i < 24; i++) {
      var t = (lo + hi) / 2;
      if (relLum(mix(base, toward, t)) / L0 < want) { if (want > 1) lo = t; else hi = t; }
      else { if (want > 1) hi = t; else lo = t; }
    }
    return (lo + hi) / 2;
  }

  /* The noon anchors SPINE.md OCCVM-L1 records, and the two ends the day carries them toward. */
  var SUB = [27, 26, 34], SUB_DUSK = [40, 28, 30], SUB_NIGHT = [14, 14, 26];
  var BONE = [236, 227, 208], BONE_DUSK = [244, 214, 170], BONE_NIGHT = [204, 208, 224];
  var EDGE = [11, 10, 16];

  function respond(p) {
    var elev = p.elev, az = p.az;

    /* OCCVM-L3: below the horizon the vector does not keep tracking a sun nobody can see. Past civil
       twilight it resolves to neutral overhead. BTC tracked the sun to -39 degrees and beyond (D9). */
    var up = elev > -6;
    var lx = up ? Math.sin(az * RAD) : 0;
    var ly = up ? -Math.cos(az * RAD) : 1;

    var e = clamp(Math.sin(Math.max(0, elev) * RAD) * 1.25, 0, 1);

    /* OCCVM-L9: night is a continuous quantity, 0 at -2 degrees to 1 at -10. A step cannot express the
       dusk stages 1.7 refines this into. */
    var night = clamp((-elev - 2) / 8, 0, 1);
    var twilight = 1 - clamp(Math.abs(elev) / 14, 0, 1);
    var dusk = twilight * (1 - night);

    /* OCCVM-L9, 1.7: the civil / nautical / astronomical dusk stages, additive over the ramp above —
       neither `night` nor `dusk` is redefined by this. Standard elevation boundaries, evaluated against
       the raw solar elevation rather than either compressed display quantity, so a tool can react to the
       actual stage independent of how steeply the surface response happens to be tuned. */
    var stage = elev >= 0 ? "day"
      : elev >= -6 ? "civil"
      : elev >= -12 ? "nautical"
      : elev >= -18 ? "astronomical"
      : "night";

    /* OCCVM-L9, 1.7 — the PHOSPHOR RESPONSE. Ink's answer to darkness is not linear in `night`, and the
       linear ramp it replaced was a placeholder that read as one: the page went on getting steadily more
       lit right through a range where the eye has already fully adapted. A phosphor's emission against
       its excitation saturates, and the standard form for that is 1 − e^(−kx), normalised so the ends
       stay exactly 0 and 1. It rises fast and then stops: 0.58 by a quarter of the way into night, 0.83
       by half, which is what "the tool becomes a night instrument quickly, then holds" looks like as a
       curve rather than as an intention. */
    var phosphor = (1 - Math.exp(-3.2 * night)) / (1 - Math.exp(-3.2));

    /* The moon reaches ink and nothing else (see moon(), above, and OCCVM-L9). Its weight is the product
       of three things that must ALL hold for there to be moonlight: it is above the horizon, it is lit,
       and the sun is gone. Any one of them missing and the term is zero — a moon at new, or below the
       horizon, or at noon, contributes exactly nothing rather than a little. */
    var mAlt = p.moon ? p.moon.alt : -90;
    var mUp = clamp(mAlt / 45, 0, 1);                       /* full weight once it is well up */
    var moonLight = p.moon ? mUp * p.moon.illum * night : 0;
    var mx = (p.moon && mAlt > 0) ? Math.sin(p.moon.az * RAD) : 0;
    var my = (p.moon && mAlt > 0) ? -Math.cos(p.moon.az * RAD) : 0;

    /* The night floor lives in ambient, not in elevation: a bevel stays legible after dark because
       the fill is 0.630 there, not because elevation is pretended to be 0.15 (D2). */
    var amb = 0.45 + 0.55 * e * (1 - night) + 0.18 * night;
    var rake = elev > 0 ? Math.min(22, 4 + 14 / Math.max(0.25, Math.tan(elev * RAD)) / 6) : 4;

    var sub = mix(mix(SUB, SUB_DUSK, dusk), SUB_NIGHT, night);
    var bone = mix(mix(BONE, BONE_DUSK, dusk), BONE_NIGHT, night);
    /* 1.7 — moonlight lifts ink toward its daylight value and nothing else on the page moves with
       it. This is the whole of the moon's authority over the surface (OCCVM-L9), and it is small
       on purpose: a full moon at the zenith recovers about a tenth of the way back toward day. */
    if (moonLight > 0) bone = mix(bone, BONE, 0.30 * moonLight);

    /* OCCVM-L1: a derived token derives with its whole family. --bone-lo is --bone carried a quarter of
       the way to --edge, so the pair cannot separate again (D10). At the noon anchor that reads #b4ada0
       against the previously authored #b7ad9c — at most 4/255 in any channel, and the price of the
       relationship being structural instead of remembered. */
    var boneLo = mix(bone, EDGE, 0.25);

    return {
      "--lx": lx.toFixed(3),
      "--ly": ly.toFixed(3),
      "--elev": e.toFixed(3),
      "--night": night.toFixed(3),
      "--dusk-stage": stage,
      "--fill": amb.toFixed(3),
      "--rake": rake.toFixed(1) + "px",
      "--sheen": (0.25 + 0.55 * e * (1 - night)).toFixed(2),
      /* OCCVM-D12, closed at 1.2a — AMBIENT FILLS WHAT DIRECT LIGHT DOES NOT.
       *
       * 1.2 recorded that --elev's 0.15 night floor "moved" to --fill. It did not move; it was deleted.
       * --fill was computed, written, and read by nothing, while these two alphas — the bevel the floor
       * existed to hold up — collapsed to 0.060 after dark. The law's claim that "a bevel stays legible
       * after dark because ambient light is 0.53 there" was false in both halves: ambient held nothing
       * up, and the figure was 0.630 rather than 0.53. Found by 1.9's audit, which is what an audit is
       * for; it survived seven releases because a write-only token looks exactly like a working one.
       *
       * `(1 - e)` is the share of the surface direct light is NOT reaching, so ambient is admitted in
       * proportion to what the sun has left uncovered. At full sun the term is worth 0.007 and the
       * daylight frames barely move; after dark it is the whole of the bevel. */
      "--hi-a": (0.30 * e + 0.06 + 0.16 * amb * (1 - e)).toFixed(3),
      "--cut-a": (0.40 * e + 0.06 + 0.20 * amb * (1 - e)).toFixed(3),
      "--shade-a": (0.45 + 0.3 * e).toFixed(3),
      /* OCCVM-L9: the ink bloom, a resolved scalar and never a calc(), so a law can read it (D8). Since
         1.7 it rides the phosphor curve rather than `night` directly, and moonlight lifts it further —
         a lit night is a brighter-inked night, which is the one thing the moon is allowed to do here. */
      /* --glow is consumed as an OPACITY (Rhyme's .stone::before) and already reaches 1.0 on a
         moonless night, so a moon term here would be clamped away invisibly. Moonlight reaches ink
         through --bone and --nglow instead, both of which have headroom. Checked against the
         consumers rather than assumed. */
      "--glow": (0.45 + 0.25 * (1 - e) + 0.30 * phosphor).toFixed(3),
      "--phosphor": phosphor.toFixed(3),
      /* the moon: a secondary vector for ink only. --moon-light is zero unless it is up, lit, and dark. */
      "--moon-alt": mAlt.toFixed(2),
      "--moon-illum": (p.moon ? p.moon.illum : 0).toFixed(3),
      "--moon-light": moonLight.toFixed(3),
      "--moon-x": mx.toFixed(3),
      "--moon-y": my.toFixed(3),
      "--lxpx": (lx * 0.9).toFixed(2) + "px",
      "--lypx": (ly * 0.9).toFixed(2) + "px",
      /* the night halo: a blur radius in px, so it has room to carry the moon as well as the ramp */
      "--nglow": (6 * phosphor + 3 * moonLight).toFixed(2) + "px",
      "--nglow-s": (3 * phosphor + 1.5 * moonLight).toFixed(2) + "px",
      "--sub": hex(sub),
      "--sub-hi": hex(mix(sub, [255, 255, 255], faceMix(sub, [255, 255, 255], MAT_HI, e))),
      "--sub-lo": hex(mix(sub, [0, 0, 0], faceMix(sub, [0, 0, 0], MAT_LO, e))),
      "--bone": hex(bone),
      "--bone-lo": hex(boneLo)
    };
  }

  var DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

  /* tick(): position, respond, write. Returns the reading for a tool's own display. */
  function tick(el, loc, date) {
    var place = (loc && isFinite(loc.lat)) ? loc : DAYTON;
    var when = date || new Date();
    var p = position(place.lat, place.lon, when);
    p.moon = moon(place.lat, place.lon, when, p.lam);
    var t = respond(p);
    if (el && el.style) for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k)) el.style.setProperty(k, t[k]);
    return {
      elev: p.elev, az: p.az, tokens: t,
      dir: DIRS[Math.round(p.az / 45) % 8],
      night: parseFloat(t["--night"]),
      stage: t["--dusk-stage"],
      lx: parseFloat(t["--lx"]), ly: parseFloat(t["--ly"]),
      e: parseFloat(t["--elev"]),
      name: place.name || "here"
    };
  }

  return { position: position, moon: moon, respond: respond, tick: tick, DAYTON: DAYTON, DIRS: DIRS };
})();
