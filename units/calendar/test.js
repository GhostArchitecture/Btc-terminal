/* standalone test for the calendar unit: node test.js */
const fs=require("fs"), vm=require("vm"), path=require("path");
const src=fs.readFileSync(path.join(__dirname,"code.js"),"utf8");
/* The unit uses none of the page helpers (clamp/normCdf/calSigma/...), but stub a few so the
   harness proves that and would fail loudly if the unit started reaching for globals. */
const ctx={console:console,Math:Math,Date:Date,
  clamp:function(v,a,b){return v<a?a:v>b?b:v;},
  normCdf:function(){throw new Error("calendar must not touch normCdf");},
  calSigma:function(){throw new Error("calendar must not touch calSigma");},
  hourStart:function(t){return Math.floor(t/3600000)*3600000;}};
vm.createContext(ctx); vm.runInContext(src,ctx,{filename:"code.js"});
/* `function` declarations land on the context object; top-level `const` lives in the context's
   global lexical scope, so pull those out with a follow-up expression in the same context.
   (In the page everything shares one <script>, so both are plain lexical neighbours.) */
const L=vm.runInContext("({RELEASES:RELEASES,CAL_HORIZON_MIN:CAL_HORIZON_MIN,"+
  "CAL_T_MIN:CAL_T_MIN,CAL_T_MAX:CAL_T_MAX,CAL_MAX_SPAN_MS:CAL_MAX_SPAN_MS,"+
  "CAL_MAX_HORIZON_MIN:CAL_MAX_HORIZON_MIN,CAL_DATED_BAD:CAL_DATED_BAD,CAL_EXC_BAD:CAL_EXC_BAD,"+
  "CAL_CONTROL_EXCL_MIN:CAL_CONTROL_EXCL_MIN,CAL_EXC_MAX_SHIFT_MS:CAL_EXC_MAX_SHIFT_MS,"+
  "CAL_EXPECTED_NAMES:CAL_EXPECTED_NAMES,CAL_BLS_NAMES:CAL_BLS_NAMES,CAL_KINDS:CAL_KINDS,"+
  "CAL_PARTIAL_CAVEAT:CAL_PARTIAL_CAVEAT})",ctx);
const {usEasternOffsetMinutes,etToUtc,usDstBoundsUtc,nthDowUtc,lastDowUtc,releasesBetween,
       nearestRelease,eventTag,calValidTime,calValidateDated,calDatedRowFault,
       calValidateExceptions,calExceptionRowFault,coverageAt,calCoverageSpan,controlEligible,
       calendarAudit,calMetaFor,calTablesUsable,calEtDateIso,calUsableExceptions,
       calKnownInstants,calSeriesSpans}=ctx;
const RELEASES=L.RELEASES, CAL_HORIZON_MIN=L.CAL_HORIZON_MIN;
const CAL_T_MIN=L.CAL_T_MIN, CAL_T_MAX=L.CAL_T_MAX, CAL_MAX_HORIZON_MIN=L.CAL_MAX_HORIZON_MIN;
const CAL_DATED_BAD=L.CAL_DATED_BAD, CAL_EXC_BAD=L.CAL_EXC_BAD;
const CAL_CONTROL_EXCL_MIN=L.CAL_CONTROL_EXCL_MIN, CAL_EXC_MAX_SHIFT_MS=L.CAL_EXC_MAX_SHIFT_MS;
const CAL_PARTIAL_CAVEAT=L.CAL_PARTIAL_CAVEAT, CAL_BLS_NAMES=L.CAL_BLS_NAMES;
/* The seeded tables are real data, so every test that mutates one must put it back exactly.
   snap()/restore() replace the ARRAY CONTENTS in place - the unit holds RELEASES.DATED etc. by
   reference, so reassigning the property would leave the unit reading the old array. */
function snap(){ return {D:RELEASES.DATED.slice(),E:RELEASES.EXCEPTIONS.slice()}; }
function restore(s){
  RELEASES.DATED.length=0;      Array.prototype.push.apply(RELEASES.DATED,s.D);
  RELEASES.EXCEPTIONS.length=0; Array.prototype.push.apply(RELEASES.EXCEPTIONS,s.E);
}
const SEED=snap();
function seedIntact(){
  return RELEASES.DATED.length===SEED.D.length&&RELEASES.EXCEPTIONS.length===SEED.E.length&&
         RELEASES.DATED.every(function(r,i){ return r===SEED.D[i]; })&&
         RELEASES.EXCEPTIONS.every(function(r,i){ return r===SEED.E[i]; });
}
/* helper: did the call refuse loudly (and with which error), rather than answer?
   Errors thrown inside the vm come from that realm, so `instanceof` is useless across it -
   match on e.name, which is what a page-level catch would see too. */
function threw(fn){ try{ fn(); return null; }catch(e){ return e; } }
function threwName(fn){ const e=threw(fn); return e===null?null:(e.name+": "+e.message); }
function isErr(e,kind){ return !!e&&e.name===kind; }

let fails=0;
function ok(n,c,extra){ if(c) console.log("  ok  "+n); else {console.log("  FAIL "+n+(extra===undefined?"":"  -> "+extra)); fails++;} }
function eq(n,a,b){ ok(n,a===b,JSON.stringify(a)+" != "+JSON.stringify(b)); }
const U=Date.UTC;
function iso(ms){ return new Date(ms).toISOString(); }

/* ---- 1. nthDowUtc ---- */
eq("nthDowUtc 1st Fri Jan 2026 = Jan 2", iso(nthDowUtc(2026,0,5,1)), "2026-01-02T00:00:00.000Z");
eq("nthDowUtc 2nd Sun Mar 2024 = Mar 10", iso(nthDowUtc(2024,2,0,2)), "2024-03-10T00:00:00.000Z");
eq("nthDowUtc 1st Sun Nov 2023 = Nov 5", iso(nthDowUtc(2023,10,0,1)), "2023-11-05T00:00:00.000Z");
eq("nthDowUtc handles month starting on target dow (Nov 2026 Sun = Nov 1)", iso(nthDowUtc(2026,10,0,1)), "2026-11-01T00:00:00.000Z");
eq("lastDowUtc finds the last Friday of Jul 2026 (the 31st)", iso(lastDowUtc(2026,6,5)), "2026-07-31T00:00:00.000Z");

/* ---- 2. DST bounds across several years, against independently known US transition dates ---- */
const KNOWN={ /* year: [March transition day, November transition day] */
  2023:[12,5], 2024:[10,3], 2025:[9,2], 2026:[8,1], 2027:[14,7], 2028:[12,5], 2029:[11,4], 2030:[10,3]
};
Object.keys(KNOWN).forEach(function(ys){
  const y=+ys, b=usDstBoundsUtc(y), s=new Date(b.start), e=new Date(b.end);
  ok("DST "+y+" starts Mar "+KNOWN[y][0]+" 07:00Z",
     s.getUTCMonth()===2&&s.getUTCDate()===KNOWN[y][0]&&s.getUTCHours()===7&&s.getUTCMinutes()===0, iso(b.start));
  ok("DST "+y+" ends Nov "+KNOWN[y][1]+" 06:00Z",
     e.getUTCMonth()===10&&e.getUTCDate()===KNOWN[y][1]&&e.getUTCHours()===6&&e.getUTCMinutes()===0, iso(b.end));
  ok("DST "+y+" bounds land on Sundays", s.getUTCDay()===0&&e.getUTCDay()===0);
});

/* ---- 3. offset at the exact boundary instants (adversarial: one minute either side) ---- */
[2023,2024,2025,2026,2027].forEach(function(y){
  const b=usDstBoundsUtc(y);
  eq("offset "+y+" spring T-1min = EST", usEasternOffsetMinutes(b.start-60000), 300);
  eq("offset "+y+" spring T+0    = EDT", usEasternOffsetMinutes(b.start), 240);
  eq("offset "+y+" fall   T-1min = EDT", usEasternOffsetMinutes(b.end-60000), 240);
  eq("offset "+y+" fall   T+0    = EST", usEasternOffsetMinutes(b.end), 300);
});
eq("offset Jan 1 00:00Z 2026 = EST", usEasternOffsetMinutes(U(2026,0,1,0,0)), 300);
eq("offset Dec 31 23:59Z 2026 = EST", usEasternOffsetMinutes(U(2026,11,31,23,59)), 300);
eq("offset midsummer 2026 = EDT", usEasternOffsetMinutes(U(2026,6,4,12,0)), 240);

/* ---- 4. THE headline requirement: 08:30 ET is 12:30 UTC in summer, 13:30 UTC in winter ---- */
eq("08:30 ET summer -> 12:30Z", iso(etToUtc(2026,6,3,8,30)), "2026-07-03T12:30:00.000Z");
eq("08:30 ET winter -> 13:30Z", iso(etToUtc(2026,0,2,8,30)), "2026-01-02T13:30:00.000Z");
eq("08:30 ET day before spring-forward (Mar 5 2026) -> 13:30Z", iso(etToUtc(2026,2,5,8,30)), "2026-03-05T13:30:00.000Z");
eq("08:30 ET day after spring-forward (Mar 12 2026) -> 12:30Z", iso(etToUtc(2026,2,12,8,30)), "2026-03-12T12:30:00.000Z");
eq("08:30 ET day before fall-back (Oct 29 2026) -> 12:30Z", iso(etToUtc(2026,9,29,8,30)), "2026-10-29T12:30:00.000Z");
eq("08:30 ET day after fall-back (Nov 5 2026) -> 13:30Z", iso(etToUtc(2026,10,5,8,30)), "2026-11-05T13:30:00.000Z");
eq("14:00 ET FOMC summer -> 18:00Z", iso(etToUtc(2026,5,17,14,0)), "2026-06-17T18:00:00.000Z");
eq("14:00 ET FOMC winter -> 19:00Z", iso(etToUtc(2026,0,28,14,0)), "2026-01-28T19:00:00.000Z");
eq("etToUtc defaults hh/mm to 0 (midnight ET summer -> 04:00Z)", iso(etToUtc(2026,6,3)), "2026-07-03T04:00:00.000Z");

/* ---- 5. documented DST-edge resolutions ---- */
eq("spring gap 02:30 ET resolves forward to 03:30 EDT (07:30Z)", iso(etToUtc(2026,2,8,2,30)), "2026-03-08T07:30:00.000Z");
eq("fall ambiguous 01:30 ET returns the first (EDT) occurrence 05:30Z", iso(etToUtc(2026,10,1,1,30)), "2026-11-01T05:30:00.000Z");
eq("01:59 ET on spring day is unambiguous EST (06:59Z)", iso(etToUtc(2026,2,8,1,59)), "2026-03-08T06:59:00.000Z");
eq("03:00 ET on spring day is unambiguous EDT (07:00Z)", iso(etToUtc(2026,2,8,3,0)), "2026-03-08T07:00:00.000Z");
/* round trip: for every hour of a whole DST-transition week, the produced instant is self-consistent */
(function(){
  let bad=0;
  for(let d=5;d<=12;d++) for(let h=0;h<24;h++){
    const t=etToUtc(2026,2,d,h,0), off=usEasternOffsetMinutes(t);
    const back=new Date(t-off*60000);
    const gap=(d===8&&h===2);
    if(!gap&&(back.getUTCDate()!==d||back.getUTCHours()!==h)) bad++;
  }
  eq("ET round trip self-consistent across the March 2026 transition week (gap hour excepted)",bad,0);
})();

/* ---- 6. THE DELETION: there is no publication-rule generator, and no coverage vouch ----
   Three rounds of adversarial review found three ways for a "*" coverage declaration's signature
   to outlive the generator specification it signed, and every one of them was a hazard OF THE
   GENERATOR - calRuleRows emitting payrolls as first-Friday and claims as every-Thursday, rules
   that are confidently wrong at holidays and in shutdowns. The generator is gone, so the vouch
   that existed only to police it is gone with it. This section is the guard against anyone
   reintroducing either: an enumerated date has no rule to be wrong about, and a mechanism that
   refuses every window (as the vouch did - no "*" row was ever written) protects nothing. */
(function(){
  const gone=["RELEASES.RULE","calRuleRows","calParseRule","calRuleRowFault","calValidateRule",
              "CAL_RULE_BAD","calRuleSeriesNames","calRuleSeriesSpecs","calRuleSpecKey","calRuleSpecLabel",
              "calCoverageVouchFaults","calCoverageVouchGap","calCoverageStaleVouch","calCoverageAnyVouched",
              "RELEASES.COVERAGE","calCoverageRowFault","calValidateCoverage","calCoverageRows",
              "calStarScan","CAL_COVERAGE_BAD","CAL_MAX_ITER","CAL_DOW","CAL_ORD","calDict"];
  gone.forEach(function(n){
    eq("DELETED, and stays deleted: "+n,
       vm.runInContext("(function(){ try{ return typeof ("+n+"); }catch(e){ return \"undefined\"; } })()",ctx),
       "undefined");
  });
  eq("RELEASES holds exactly two tables now", Object.keys(RELEASES).sort().join(","), "DATED,EXCEPTIONS");
  eq("no emitted row can claim provenance class 'rule', because nothing is derived",
     releasesBetween(U(2026,0,1),U(2026,11,31,23,59)).filter(function(r){ return r.src==="rule"; }).length, 0);
  ok("the refusal reasons a declaration used to produce are gone from controlEligible",
     ["unknown-coverage","unvouched-rule","stale-vouch"].every(function(w){
       return controlEligible(U(2026,6,6,12,0)).reason!==w; }),
     controlEligible(U(2026,6,6,12,0)).reason);
})();

/* ---- 6b. RELEASES table honesty: every seeded row is agency-sourced, and NOTHING beyond ---- */
eq("DATED holds exactly the 49 enumerated rows (8 FOMC + 2 CPI + 13 GDP + 13 PCE + 13 TRADE)",
   RELEASES.DATED.length, 49);
eq("the seeded DATED table is clean", calValidateDated().length, 0);
eq("the seeded EXCEPTIONS table is clean", calValidateExceptions().length, 0);
ok("every seeded DATED row carries its agency src and the date it was read",
   RELEASES.DATED.every(function(r){ return /^https:\/\//.test(r.src)&&/^\d{4}-\d{2}-\d{2}$/.test(r.retrieved); }));
ok("every seeded EXCEPTIONS row carries its agency src and retrieved date",
   RELEASES.EXCEPTIONS.every(function(r){ return /^https:\/\//.test(r.src)&&/^\d{4}-\d{2}-\d{2}$/.test(r.retrieved); }));
ok("every seeded DATED row carries an explicit kind and tier",
   RELEASES.DATED.every(function(r){ return (r.kind==="scheduled-numeric"||r.kind==="scheduled-policy")&&(r.tier===1||r.tier===2); }));
(function(){
  const fomc=RELEASES.DATED.filter(function(r){ return r.name==="FOMC"; });
  const cpi =RELEASES.DATED.filter(function(r){ return r.name==="CPI"; });
  eq("2026 FOMC statements: 8 rows, the standard eight-meeting year", fomc.length, 8);
  ok("FOMC is kind 'scheduled-policy', NOT 'scheduled-numeric' (H3 splits by release TYPE)",
     fomc.every(function(r){ return r.kind==="scheduled-policy"&&r.tier===1; }));
  ok("no other seeded row claims to be a policy announcement",
     RELEASES.DATED.filter(function(r){ return r.kind==="scheduled-policy"; }).length===8);
  eq("FOMC dates are the eight published ones, 14:00 ET",
     fomc.map(function(r){ return iso(r.t); }).join(" "),
     ["2026-01-28T19:00:00.000Z","2026-03-18T18:00:00.000Z","2026-04-29T18:00:00.000Z","2026-06-17T18:00:00.000Z",
      "2026-07-29T18:00:00.000Z","2026-09-16T18:00:00.000Z","2026-10-28T18:00:00.000Z","2026-12-09T19:00:00.000Z"].join(" "));
  ok("the two winter FOMC statements are 19:00Z and the six summer ones 18:00Z (DST, not a table)",
     fomc.filter(function(r){ return new Date(r.t).getUTCHours()===19; }).length===2);
  eq("CPI: exactly the two verified dates, no extrapolated monthly cadence", cpi.length, 2);
  eq("CPI dates are 2026-08-12 and 2026-09-11, 08:30 ET",
     cpi.map(function(r){ return iso(r.t); }).join(" "), "2026-08-12T12:30:00.000Z 2026-09-11T12:30:00.000Z");
  /* the flagged row: atypical, unverifiable from this environment, and DELIBERATELY NOT CORRECTED */
  eq("the second CPI row is a FRIDAY, flagged in code.js and left exactly as sourced",
     new Date(cpi[1].t).getUTCDay(), 5);
  eq("...and it still carries the bls.gov page it was read from", cpi[1].src,
     "https://www.bls.gov/schedule/news_release/cpi.htm");
  ok("no DATED row was invented outside the sourced set",
     RELEASES.DATED.every(function(r){ return ["FOMC","CPI","GDP","PCE","TRADE"].indexOf(r.name)>=0; }));
})();

/* ---- 6c. the BEA rows are the FEED's own UTC instants, not an ET wall time re-derived ----
   BEA publishes release_dates.json as UTC instants with DST already resolved - which is the
   entire reason a feed beats a rule. Passing them through etToUtc would re-derive a thing the
   source had settled, so these are pinned against the feed's own strings. If a maintainer
   "tidies" a Date.UTC into an etToUtc, one of these goes red rather than shifting an hour
   silently. Retrieved 2026-09-06 from https://apps.bea.gov/API/signup/release_dates.json. */
(function(){
  const FEED={
    GDP:["2026-01-22T13:30:00.000Z","2026-02-20T13:30:00.000Z","2026-03-13T12:30:00.000Z",
         "2026-04-09T12:30:00.000Z","2026-04-30T12:30:00.000Z","2026-05-28T12:30:00.000Z",
         "2026-06-25T12:30:00.000Z","2026-07-30T12:30:00.000Z","2026-08-26T12:30:00.000Z",
         "2026-09-30T12:30:00.000Z","2026-10-29T12:30:00.000Z","2026-11-25T13:30:00.000Z",
         "2026-12-23T13:30:00.000Z"],
    PCE:["2026-01-22T15:00:00.000Z","2026-02-20T13:30:00.000Z","2026-03-13T12:30:00.000Z",
         "2026-04-09T12:30:00.000Z","2026-04-30T12:30:00.000Z","2026-05-28T12:30:00.000Z",
         "2026-06-25T12:30:00.000Z","2026-07-30T12:30:00.000Z","2026-08-26T12:30:00.000Z",
         "2026-09-30T12:30:00.000Z","2026-10-29T12:30:00.000Z","2026-11-25T13:30:00.000Z",
         "2026-12-23T13:30:00.000Z"],
    TRADE:["2026-01-08T13:30:00.000Z","2026-01-29T13:30:00.000Z","2026-02-19T13:30:00.000Z",
           "2026-03-12T12:30:00.000Z","2026-04-02T12:30:00.000Z","2026-05-05T12:30:00.000Z",
           "2026-06-09T12:30:00.000Z","2026-07-07T12:30:00.000Z","2026-08-04T12:30:00.000Z",
           "2026-09-03T12:30:00.000Z","2026-10-06T12:30:00.000Z","2026-11-04T13:30:00.000Z",
           "2026-12-08T13:30:00.000Z"]
  };
  Object.keys(FEED).forEach(function(n){
    const rows=RELEASES.DATED.filter(function(r){ return r.name===n; });
    eq(n+": every instant matches the BEA feed, verbatim",
       rows.map(function(r){ return iso(r.t); }).join(" "), FEED[n].join(" "));
    ok(n+": rows carry the feed URL as their source",
       rows.every(function(r){ return r.src==="https://apps.bea.gov/API/signup/release_dates.json"; }));
  });
  eq("GDP is tier 1", RELEASES.DATED.filter(function(r){ return r.name==="GDP"; }).every(function(r){ return r.tier===1; }), true);
  eq("PCE is tier 1", RELEASES.DATED.filter(function(r){ return r.name==="PCE"; }).every(function(r){ return r.tier===1; }), true);
  eq("TRADE is tier 2", RELEASES.DATED.filter(function(r){ return r.name==="TRADE"; }).every(function(r){ return r.tier===2; }), true);
  /* the property that would be destroyed by re-deriving from ET: the feed's own DST split.
     08:30 ET is 13:30Z in winter and 12:30Z in summer, and the feed already reflects that -
     but the March TRADE row is 2026-03-12, two days AFTER the 2026 transition, so a naive
     "always 13:30Z in March" reading would be wrong and a naive ET re-derivation would only be
     right by accident. Pin both sides. */
  eq("BEA winter rows are 13:30Z", iso(RELEASES.DATED.filter(function(r){ return r.name==="TRADE"; })[0].t),
     "2026-01-08T13:30:00.000Z");
  eq("BEA rows after the March 2026 transition are 12:30Z",
     iso(RELEASES.DATED.filter(function(r){ return r.name==="TRADE"; })[3].t), "2026-03-12T12:30:00.000Z");
  eq("...and that instant is 08:30 ET, so the feed and the ET clock agree where they should",
     iso(etToUtc(2026,2,12,8,30)), "2026-03-12T12:30:00.000Z");
  /* the January PCE row is 15:00Z, an hour BEA does not otherwise publish at - copied verbatim
     because the feed said so, and the single most likely row for someone to "fix" */
  eq("the 2026-01-22 PCE row is 15:00Z, unusual and copied verbatim from the feed",
     iso(RELEASES.DATED.filter(function(r){ return r.name==="PCE"; })[0].t), "2026-01-22T15:00:00.000Z");
  /* BEA lists eleven 2026 instants under both GDP and Personal Income and Outlays: two releases
     at one instant, which is a fact about the schedule and not a duplicated row */
  const gt=RELEASES.DATED.filter(function(r){ return r.name==="GDP"; }).map(function(r){ return r.t; });
  const pt=RELEASES.DATED.filter(function(r){ return r.name==="PCE"; }).map(function(r){ return r.t; });
  eq("GDP and PCE share 12 instants: two releases at one instant, as the feed publishes them",
     gt.filter(function(t){ return pt.indexOf(t)>=0; }).length, 12);
  /* the feed lists 2026-06-09 twice for TRADE; one instant listed twice is one release */
  eq("the feed's duplicate TRADE line is one row here, not two",
     RELEASES.DATED.filter(function(r){ return r.name==="TRADE"&&iso(r.t)==="2026-06-09T12:30:00.000Z"; }).length, 1);
})();

/* ---- 7. releasesBetween ---- */
const Y0=U(2026,0,1,0,0,0), Y1=U(2026,11,31,23,59,59,999);
const yr=releasesBetween(Y0,Y1);
eq("2026 holds 51 releases: 49 dated rows plus the two inserted corrections", yr.length, 51);
eq("2026 holds the 8 FOMC statements", yr.filter(function(r){ return r.name==="FOMC"; }).length, 8);
eq("2026 holds 13 GDP", yr.filter(function(r){ return r.name==="GDP"; }).length, 13);
eq("2026 holds 13 PCE", yr.filter(function(r){ return r.name==="PCE"; }).length, 13);
eq("2026 holds 13 TRADE", yr.filter(function(r){ return r.name==="TRADE"; }).length, 13);
eq("2026 holds 3 CPI: the two dated rows plus the shutdown correction",
   yr.filter(function(r){ return r.name==="CPI"; }).length, 3);
eq("2026 holds exactly one payrolls date, and it arrives as a correction",
   yr.filter(function(r){ return r.name==="NFP"; }).length, 1);
ok("every FOMC release is 14:00 ET", yr.filter(function(r){ return r.name==="FOMC"; })
   .every(function(r){ const b=new Date(r.t-usEasternOffsetMinutes(r.t)*60000); return b.getUTCHours()===14&&b.getUTCMinutes()===0; }));
ok("result is sorted ascending by t", yr.every(function(r,i){ return i===0||yr[i-1].t<=r.t; }));
ok("entries carry the documented shape", yr.every(function(r){ return (r.kind==="scheduled-numeric"||r.kind==="scheduled-policy")&&(r.tier===1||r.tier===2)&&typeof r.t==="number"; }));
ok("every emitted row carries a provenance class, and it is 'dated' or 'corrected'",
   yr.every(function(r){ return r.src==="dated"||r.src==="corrected"; }));
ok("EVERY emitted row carries the agency URL it came from - there is no unsourced row left",
   yr.every(function(r){ return /^https:\/\//.test(r.ref)&&/^\d{4}-\d{2}-\d{2}$/.test(r.retrieved); }));
eq("inverted range returns empty", releasesBetween(Y1,Y0).length, 0);
/* inclusivity, and no leakage from the query pad */
const GDP_MAR=U(2026,2,13,12,30);
const exact=releasesBetween(GDP_MAR,GDP_MAR);
eq("range [t,t] on a joint GDP/PCE instant returns exactly those two", exact.length, 2);
eq("...and they are the two names the feed lists at it",
   exact.map(function(r){ return r.name; }).sort().join(","), "GDP,PCE");
eq("range ending 1ms before a release excludes it", releasesBetween(GDP_MAR-3600000,GDP_MAR-1).length, 0);
eq("a genuinely quiet midweek range is empty", releasesBetween(U(2026,6,6,0,0),U(2026,6,6,23,59)).length, 0);
/* a range crossing a year boundary */
const xy=releasesBetween(U(2025,11,20,0,0),U(2026,0,10,0,0));
eq("year-boundary range finds the 2026-01-08 TRADE row and nothing from 2025",
   xy.map(function(r){ return r.name+"@"+iso(r.t); }).join(" "), "TRADE@2026-01-08T13:30:00.000Z");

/* ---- 8. a newly added DATED row flows straight through (the table is the only input) ---- */
(function(){
  const s=snap();
  const ppi={name:"PPI",kind:"scheduled-numeric",tier:2,t:etToUtc(2026,6,14,8,30),
             src:"https://www.bls.gov/ppi/",retrieved:"2026-09-06"};
  RELEASES.DATED.push(ppi);
  const got=releasesBetween(U(2026,6,14,0,0),U(2026,6,14,23,59));
  ok("a populated DATED row appears in releasesBetween", got.some(function(r){return r.name==="PPI"&&r.t===ppi.t;}));
  const n=nearestRelease(ppi.t-10*60000);
  ok("a populated DATED row wins nearestRelease when closest", n&&n.name==="PPI"&&n.mins===10, JSON.stringify(n));
  eq("...and it immediately widens the derived PPI span, with no declaration anywhere",
     JSON.stringify(calSeriesSpans().filter(function(x){ return x.name==="PPI"; })[0].n), "1");
  restore(s);
  eq("removing it removes the span again", calSeriesSpans().filter(function(x){ return x.name==="PPI"; }).length, 0);
  ok("seed tables restored", seedIntact());
})();

/* ---- 9. nearestRelease ---- */
const FOMC_JUN=U(2026,5,17,18,0);
(function(){
  const a=nearestRelease(FOMC_JUN-30*60000);
  ok("30 min before FOMC -> mins +30, tier 1", a&&a.name==="FOMC"&&a.mins===30&&a.tier===1, JSON.stringify(a));
  const b=nearestRelease(FOMC_JUN+45*60000);
  ok("45 min after FOMC -> mins -45 (already happened)", b&&b.name==="FOMC"&&b.mins===-45, JSON.stringify(b));
  const c=nearestRelease(FOMC_JUN);
  ok("exactly at the release -> mins 0", c&&c.mins===0, JSON.stringify(c));
  const d=nearestRelease(U(2026,6,6,12,0));  /* Monday 6 Jul, > 24h from the 7 Jul TRADE print */
  eq("quiet Monday within default horizon -> null", d, null);
  const e=nearestRelease(U(2026,6,6,12,0),4*1440);
  ok("same Monday with a 4-day horizon finds the TRADE print", e!==null&&e.name==="TRADE", JSON.stringify(e));
  eq("zero/negative horizon -> null", nearestRelease(FOMC_JUN,0), null);
  /* TRADE 2026-07-07 12:30Z (tier 2) and FOMC 2026-07-29 18:00Z (tier 1): the midpoint is
     equidistant, so the tie must break to tier 1 */
  const T=U(2026,6,7,12,30), F=U(2026,6,29,18,0), mid=(T+F)/2;
  const f=nearestRelease(mid,40*1440);
  ok("equidistant TRADE/FOMC tie breaks to tier 1 (FOMC)", f&&f.name==="FOMC", JSON.stringify(f));
  const g=nearestRelease(mid-60000,40*1440);
  ok("one minute earlier, the tier-2 TRADE print is genuinely nearer and wins", g&&g.name==="TRADE", JSON.stringify(g));
  /* the joint GDP/PCE instants: same t, same tier - the answer must still be deterministic */
  const j1=nearestRelease(GDP_MAR-5*60000), j2=nearestRelease(GDP_MAR-5*60000);
  eq("a joint GDP/PCE instant answers deterministically (name breaks the last tie)",
     JSON.stringify(j1), JSON.stringify(j2));
  eq("...and the name it settles on is the alphabetically first of the two", j1.name, "GDP");
  const h=nearestRelease(FOMC_JUN, CAL_HORIZON_MIN);
  ok("explicit default horizon matches implicit", JSON.stringify(h)===JSON.stringify(nearestRelease(FOMC_JUN)));
})();

/* ---- 10. eventTag ---- */
(function(){
  const t=eventTag(FOMC_JUN-5*60000);
  eq("eventTag has exactly 5 keys (ev,evCov,evMins,evSrc,evTier)", Object.keys(t).sort().join(","), "ev,evCov,evMins,evSrc,evTier");
  ok("eventTag near FOMC", t.ev==="FOMC"&&t.evMins===5&&t.evTier===1, JSON.stringify(t));
  const q=eventTag(U(2026,6,6,12,0));
  ok("eventTag quiet Monday -> null event", q.ev===null&&q.evMins===null&&q.evTier===null&&q.evSrc===null, JSON.stringify(q));
  ok("eventTag serialises small (persisted on thousands of rows)", JSON.stringify(t).length<80, JSON.stringify(t));
  ok("eventTag mins are whole numbers", Number.isInteger(eventTag(FOMC_JUN-90*1000).evMins));
})();

/* ---- 11. no reliance on page helpers / no global leakage ---- */
/* the stubs throw, so exercising the whole surface with them installed is the assertion */
ok("unit did not call the poisoned helper stubs (any call would throw here)",
   threw(function(){ eventTag(FOMC_JUN-5*60000); nearestRelease(FOMC_JUN); releasesBetween(Y0,Y1);
                     controlEligible(FOMC_JUN); calendarAudit(); })===null);

/* The two agency corrections the seeded EXCEPTIONS table carries, named here because sections
   13 onward assert against them. Both come from the 2025-2026 lapses in appropriations. */
const NFP_FEB_WAS=etToUtc(2026,1,6,8,30);       /* the date BLS superseded */
const NFP_FEB_REAL=etToUtc(2026,1,11,8,30);     /* what BLS published */
const CPI_FEB_REAL=etToUtc(2026,1,13,8,30);     /* CPI Jan-2026 ref, moved from 2026-02-11 */

/* ---- 12. [REGRESSION - MEDIUM 1] a corrupt/missing timestamp must never produce a tag ----
   Before the fix, nearestRelease never coerced or checked t:
     eventTag(null) / eventTag(0) / eventTag(false) -> a confident tier-2 tag on the 1 Jan 1970
   release, 810 minutes away - stamped on a row whose timestamp went missing, and these tags are
   persisted on thousands of ledger rows and analysed by event distance later. A Date or a
   numeric string went the other way (string concat inside the range computation) and reported
   "no event known" 30 min before a real print. */
(function(){
  const NULLTAG=JSON.stringify({ev:null,evMins:null,evTier:null,evSrc:null,evCov:null});
  const cases=[["null",null],["0",0],["false",false],["empty string",""],["NaN",NaN],
    ["Infinity",Infinity],["-Infinity",-Infinity],["undefined",undefined],["true",true],
    ["numeric string","1783080000000"],["ISO string","2026-07-03T12:00:00Z"],
    ["Date object",new Date(FOMC_JUN-30*60000)],["object",{t:FOMC_JUN}],["array",[FOMC_JUN]],
    ["1 day after epoch",86400000],["1999 (pre-range)",U(1999,0,1)],["year 2200",U(2200,0,1)]];
  cases.forEach(function(c){
    eq("eventTag("+c[0]+") -> all-null tag, never a 1970 release", JSON.stringify(eventTag(c[1])), NULLTAG);
    eq("nearestRelease("+c[0]+") -> null", nearestRelease(c[1]), null);
  });
  eq("the specific regression: eventTag(0).ev is null, not a release name", eventTag(0).ev, null);
  eq("the specific regression: eventTag(null).evMins is null, not 810", eventTag(null).evMins, null);
  /* the guard must not eat valid input */
  ok("a valid instant still tags", eventTag(FOMC_JUN-30*60000).ev==="FOMC");
  eq("fractional-ms instants still accepted", calValidTime(FOMC_JUN+0.5), true);
  eq("CAL_T_MIN itself is a usable timestamp", calValidTime(CAL_T_MIN), true);
  eq("one ms below CAL_T_MIN is refused", calValidTime(CAL_T_MIN-1), false);
  eq("CAL_T_MAX itself is accepted by the type check", calValidTime(CAL_T_MAX), true);
  eq("one ms above CAL_T_MAX is refused", calValidTime(CAL_T_MAX+1), false);
  eq("calValidTime rejects the Date wrapper of a perfectly good instant (convert with +d)", calValidTime(new Date(FOMC_JUN)), false);
  /* the per-row path must never throw on bad data - only caller parameters refuse loudly */
  eq("bad t returns null rather than throwing (this runs per ledger row)", threw(function(){ eventTag(null); eventTag(new Date()); }), null);
  eq("non-numeric horizon -> null (documented), not a throw", nearestRelease(FOMC_JUN,"1440"), null);
  eq("NaN horizon -> null", nearestRelease(FOMC_JUN,NaN), null);
  eq("controlEligible on a bad timestamp refuses without throwing", controlEligible(null).reason, "bad-timestamp");
})();

/* ---- 13. [REGRESSION - MEDIUM 2] provenance survives into the persisted tag ----
   The emitted tag used to flatten provenance away, so a stored row could not tell an official
   date from an inference at analysis time. There are no inferences left, but the distinction
   between a published date and a published CORRECTION still matters and still travels. */
(function(){
  eq("a DATED row is tagged src 'dated'", eventTag(FOMC_JUN-5*60000).evSrc, "dated");
  eq("nearestRelease carries src through", nearestRelease(FOMC_JUN).src, "dated");
  eq("null tag still carries the key (stable CSV columns)", eventTag(U(2026,6,6,12,0)).evSrc, null);
  eq("a corrected row is tagged src 'corrected', not 'dated'", eventTag(NFP_FEB_REAL-5*60000).evSrc, "corrected");
  ok("published and corrected rows are distinguishable inside one result set",
     (function(){ const g=releasesBetween(U(2026,1,1,0,0),U(2026,1,28,23,59));
                  return g.some(function(r){ return r.src==="dated"; })&&
                         g.some(function(r){ return r.src==="corrected"; }); })());
  ok("provenance key does not blow up the persisted size",
     JSON.stringify(eventTag(FOMC_JUN-5*60000)).length<80, JSON.stringify(eventTag(FOMC_JUN-5*60000)));
})();

/* ---- 14. [REGRESSION - LOW 1] hand-entered DATED rows fail LOUDLY ----
   DATED is the one table handed to a human as a data-entry task. Every plausible mistake used to
   be dropped by `if(!r||!(r.t>=t0&&r.t<=t1)) continue;` with no signal, so a populated table read
   back as "no event known" - this unit's defined meaning for an EMPTY table. */
(function(){
  const s=snap();
  RELEASES.DATED.length=0;                        /* isolate: count the injected faults only */
  const good={name:"CPI",kind:"scheduled-numeric",tier:1,t:etToUtc(2026,6,14,8,30)};
  RELEASES.DATED.push({name:"CPI",tier:1,t:NaN},                          /* 0 not finite */
                      {name:"PPI",tier:1},                                /* 1 t omitted */
                      {name:"PCE",tier:1,t:"2026-07-14T12:30:00Z"},       /* 2 ISO string, not ms */
                      {name:"",tier:1,t:etToUtc(2026,6,14,9,0)},          /* 3 no name */
                      {name:"ISM",tier:9,t:etToUtc(2026,6,14,10,0)},      /* 4 bad tier */
                      null,                                               /* 5 hole in the array */
                      good);                                              /* 6 the one clean row */
  const bad=calValidateDated();
  eq("calValidateDated surfaces all six malformed rows", bad.length, 6);
  ok("every reject names its index and a reason",
     bad.every(function(b){ return typeof b.i==="number"&&typeof b.why==="string"&&b.why.length>0; }), JSON.stringify(bad));
  ok("NaN t is diagnosed", bad[0].why.indexOf("finite")>=0, bad[0].why);
  ok("missing t is diagnosed", bad[1].why.indexOf("missing t")>=0, bad[1].why);
  ok("an ISO string is diagnosed as not-epoch-ms", bad[2].why.indexOf("epoch ms")>=0, bad[2].why);
  ok("...and the diagnosis names BOTH constructors, since the right one depends on the source",
     bad[2].why.indexOf("etToUtc")>=0&&bad[2].why.indexOf("Date.UTC")>=0, bad[2].why);
  ok("a nameless row is diagnosed", bad[3].why.indexOf("name")>=0, bad[3].why);
  ok("a bad tier is diagnosed", bad[4].why.indexOf("tier")>=0, bad[4].why);
  ok("a non-object row is diagnosed", bad[5].why.indexOf("object")>=0, bad[5].why);
  const got=releasesBetween(U(2026,6,14,0,0),U(2026,6,14,23,59));
  eq("the one clean row still flows through", got.filter(function(r){ return r.name==="CPI"&&r.t===good.t; }).length, 1);
  eq("nothing malformed leaked into the result", got.length, 1);
  eq("releasesBetween records the rejects rather than dropping them silently", CAL_DATED_BAD.length, 6);
  eq("the recorded reject carries the row's name where it has one", CAL_DATED_BAD[2].name, "PCE");
  restore(s);
  eq("a clean table reports no rejects", calValidateDated().length, 0);
  releasesBetween(U(2026,6,14,0,0),U(2026,6,14,23,59));
  eq("CAL_DATED_BAD clears once the table is fixed", CAL_DATED_BAD.length, 0);
  eq("calValidateDated also validates an explicitly passed array", calValidateDated([{name:"X",tier:1,t:0}]).length, 1);
  eq("calValidateDated flags a DATED that is not an array", calValidateDated(null).length, 1);
  eq("calDatedRowFault returns null for a good row", calDatedRowFault(good), null);
  ok("seed tables restored", seedIntact());
})();

/* ---- 15. [REGRESSION - LOW 2] an over-wide request REFUSES instead of truncating ----
   The old day-walk capped at CAL_MAX_ITER and returned the partial list, so a horizon past ~27y
   produced a confidently wrong nearest release (the print 5 minutes ago simply vanished). The
   walk is gone, but the refusal is kept as a caller-sanity bound: a range that wide is a units
   mistake at the call site, and an answer to it would look like data. */
(function(){
  const t=GDP_MAR+5*60000;                       /* 5 min after the Mar 13 2026 GDP/PCE print */
  const wide=nearestRelease(t,1e7);              /* ~19y each side: inside the guard, still answered */
  ok("a wide-but-coverable horizon still answers correctly",
     wide&&wide.mins===-5&&(wide.name==="GDP"||wide.name==="PCE"), JSON.stringify(wide));
  const e=threw(function(){ nearestRelease(t,5e7); });
  ok("a horizon past the guard refuses (RangeError) instead of answering something far away", isErr(e,"RangeError"), String(e));
  ok("the horizon refusal names the limit", e&&e.message.indexOf("CAL_MAX_HORIZON_MIN")>=0, e&&e.message);
  eq("the largest allowed horizon is still answered, not refused", threw(function(){ nearestRelease(t,CAL_MAX_HORIZON_MIN); }), null);
  ok("one minute past it refuses", isErr(threw(function(){ nearestRelease(t,CAL_MAX_HORIZON_MIN+1); }),"RangeError"),
     threwName(function(){ nearestRelease(t,CAL_MAX_HORIZON_MIN+1); }));
  const e2=threw(function(){ releasesBetween(0,1e15); });
  ok("a 31,000-year range refuses instead of answering", isErr(e2,"RangeError"), String(e2));
  ok("the range refusal says it is refusing", e2&&e2.message.indexOf("refusing")>=0, e2&&e2.message);
  ok("a non-numeric range refuses loudly (it used to return [] = 'no releases')",
     isErr(threw(function(){ releasesBetween(U(2026,6,1),"2026-07-31"); }),"TypeError"),
     threwName(function(){ releasesBetween(U(2026,6,1),"2026-07-31"); }));
  ok("a Date range refuses loudly too", isErr(threw(function(){ releasesBetween(new Date(Y0),new Date(Y1)); }),"TypeError"),
     threwName(function(){ releasesBetween(new Date(Y0),new Date(Y1)); }));
  eq("an ordinary range is unaffected", threw(function(){ releasesBetween(Y0,Y1); }), null);
})();


/* ---- 16. EXCEPTIONS: an agency correction is a release in its own right ----
   BLS moved the January-reference Employment Situation off Fri 2026-02-06 to Wed 2026-02-11
   after the 2025-2026 lapses in appropriations. There is no DATED payrolls row anywhere - and
   there cannot be, because bls.gov is unreachable from here - so this correction is the only
   payrolls date the table holds. Dropping it because nothing matched its `was` would put a real
   print back into the control pool, which is the failure this unit exists to avoid. */
(function(){
  eq("the superseded NFP date is 2026-02-06 13:30Z (EST)", iso(NFP_FEB_WAS), "2026-02-06T13:30:00.000Z");
  eq("the corrected NFP date is a WEDNESDAY", new Date(NFP_FEB_REAL).getUTCDay(), 3);
  const feb=releasesBetween(U(2026,1,1,0,0),U(2026,1,28,23,59));
  const atWas=feb.filter(function(r){ return r.name==="NFP"&&r.t===NFP_FEB_WAS; });
  const atReal=feb.filter(function(r){ return r.name==="NFP"&&r.t===NFP_FEB_REAL; });
  eq("nothing is emitted at the superseded date", atWas.length, 0);
  eq("the corrected NFP is emitted exactly once", atReal.length, 1);
  eq("the corrected row is tagged src 'corrected'", atReal[0].src, "corrected");
  eq("the corrected row carries the date it superseded", atReal[0].was, NFP_FEB_WAS);
  eq("the corrected row carries the agency page it came from", atReal[0].ref,
     "https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm");
  /* the tier is stated ON the row: there is no base row and no other payrolls row to inherit
     from, so without it payrolls would emit at the tier-2 default */
  eq("the corrected row is tier 1, taken from the row's own explicit tier", atReal[0].tier, 1);
  eq("February still has exactly one NFP", feb.filter(function(r){ return r.name==="NFP"; }).length, 1);
  /* the tag is where this has to survive: a persisted row must show corrected */
  const t=eventTag(NFP_FEB_REAL-5*60000);
  ok("eventTag at the real NFP reads NFP, 5 min out, evSrc 'corrected'",
     t.ev==="NFP"&&t.evMins===5&&t.evTier===1&&t.evSrc==="corrected", JSON.stringify(t));
  ok("eventTag at the superseded date does NOT claim NFP", eventTag(NFP_FEB_WAS).ev!=="NFP",
     JSON.stringify(eventTag(NFP_FEB_WAS)));
  eq("nearestRelease reports the corrected instant, and the superseded one in `was`",
     (nearestRelease(NFP_FEB_REAL-60000)||{}).was, NFP_FEB_WAS);
  /* the CPI reschedule likewise has no base row at the original date */
  const cpi=feb.filter(function(r){ return r.name==="CPI"; });
  eq("the CPI reschedule is emitted even though it overrode nothing", cpi.length, 1);
  eq("the inserted CPI lands on the published date", cpi[0].t, CPI_FEB_REAL);
  eq("...which is 2026-02-13 13:30Z", iso(CPI_FEB_REAL), "2026-02-13T13:30:00.000Z");
  eq("the inserted CPI is tagged corrected", cpi[0].src, "corrected");
  eq("the inserted CPI inherits tier 1 from the other CPI rows (calMetaFor), not the tier-2 default", cpi[0].tier, 1);
  eq("the inserted CPI inherits kind scheduled-numeric", cpi[0].kind, "scheduled-numeric");
})();

/* ---- 16b. the query pad: a correction moves a release across the query boundary ---- */
(function(){
  const s=snap();
  const SRC="https://www.bls.gov/schedule/news_release/cpi.htm";
  /* the pad is what lets a correction READ the row it is correcting when that row sits outside
     the queried range: without it the moved release still appears (an override is evidence in
     its own right) but silently picks up default metadata instead of the base row's. */
  RELEASES.DATED.push({name:"CPI",kind:"scheduled-numeric",tier:2,t:etToUtc(2026,3,1,8,30),src:SRC,retrieved:"2026-09-06"});
  RELEASES.EXCEPTIONS.push({name:"CPI",was:etToUtc(2026,3,1,8,30),t:etToUtc(2026,3,20,8,30),
    src:SRC,retrieved:"2026-09-06",note:"test: 19-day move, base row outside the queried range"});
  const moved=releasesBetween(U(2026,3,20,0,0),U(2026,3,20,23,59)).filter(function(r){ return r.name==="CPI"; });
  eq("the moved release is emitted in the range it moved into", moved.length, 1);
  eq("...and inherits the SUPERSEDED row's own tier, read across the query pad", moved[0].tier, 2);
  eq("...and is no longer reported on the day it left",
     releasesBetween(U(2026,3,1,0,0),U(2026,3,1,23,59)).filter(function(r){ return r.name==="CPI"; }).length, 0);
  eq("a range strictly between the two dates holds neither",
     releasesBetween(U(2026,3,5,0,0),U(2026,3,9,23,59)).filter(function(r){ return r.name==="CPI"; }).length, 0);
  /* a correction that lands on a date the table already lists must collapse, not duplicate */
  restore(s);
  RELEASES.EXCEPTIONS.push({name:"CPI",was:etToUtc(2026,7,10,8,30),t:etToUtc(2026,7,12,8,30),
    src:SRC,retrieved:"2026-09-06",note:"test: correction landing on an existing DATED row"});
  const coll=releasesBetween(U(2026,7,12,0,0),U(2026,7,12,23,59)).filter(function(r){ return r.name==="CPI"; });
  eq("a correction onto an existing row collapses to one row", coll.length, 1);
  eq("...and that row is re-tagged corrected rather than left as 'dated'", coll[0].src, "corrected");
  restore(s);
  ok("seed tables restored", seedIntact());
})();

/* ---- 16c. suppression: a CANCELLED release is removable, and is not the same as a moved one ---- */
(function(){
  const s=snap();
  const trade=U(2026,6,7,12,30);                /* the 7 Jul 2026 TRADE print, a DATED row */
  eq("the TRADE print exists before suppression",
     releasesBetween(trade,trade).filter(function(r){ return r.name==="TRADE"; }).length, 1);
  RELEASES.EXCEPTIONS.push({name:"TRADE",was:trade,t:null,
    src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06",note:"test: cancelled, not moved"});
  eq("t:null removes the release entirely",
     releasesBetween(trade,trade).filter(function(r){ return r.name==="TRADE"; }).length, 0);
  eq("a cancellation emits nothing anywhere near the old date",
     releasesBetween(trade-3*86400000,trade+3*86400000).filter(function(r){ return r.name==="TRADE"; }).length, 0);
  eq("and the tag goes quiet for it", eventTag(trade).ev==="TRADE", false);
  const a=calendarAudit().exceptions.filter(function(e){ return e.cancelled; });
  eq("the audit shows the cancellation as 'cancels', distinct from a move", a.length&&a[0].effect, "cancels");
  restore(s);
  ok("seed tables restored", seedIntact());
  eq("the TRADE print is back once the cancellation is removed",
     releasesBetween(trade,trade).filter(function(r){ return r.name==="TRADE"; }).length, 1);
})();

/* ---- 16d. a malformed EXCEPTIONS row is refused LOUDLY and changes nothing ----
   An override rewrites the calendar, so a broken one that silently did nothing would leave the
   superseded (wrong) date in place while the human believed it had been corrected. */
(function(){
  const s=snap();
  const trade=U(2026,6,7,12,30);
  const SRC="https://www.bls.gov/x", RET="2026-09-06";
  RELEASES.EXCEPTIONS.push({name:"TRADE",was:trade,src:SRC,retrieved:RET},                       /* 0 t omitted */
                           {name:"TRADE",was:trade,t:trade+86400000},                            /* 1 no src */
                           {name:"TRADE",was:trade,t:trade+86400000,src:SRC,retrieved:"6 Sep 2026"},/* 2 bad retrieved */
                           {name:"TRADE",was:trade,t:trade+90*86400000,src:SRC,retrieved:RET},   /* 3 shift too large */
                           {name:"",was:trade,t:trade,src:SRC,retrieved:RET},                    /* 4 no name */
                           {name:"TRADE",t:trade,src:SRC,retrieved:RET});                        /* 5 no was */
  const bad=calValidateExceptions();
  eq("calValidateExceptions surfaces all six malformed overrides", bad.length, 6);
  ok("an omitted t is diagnosed, and points at the cancellation form", bad[0].why.indexOf("t:null")>=0, bad[0].why);
  ok("a missing src is diagnosed as not checkable", bad[1].why.indexOf("not checkable")>=0, bad[1].why);
  ok("a malformed retrieved date is diagnosed", bad[2].why.indexOf("YYYY-MM-DD")>=0, bad[2].why);
  ok("an implausible shift is diagnosed", bad[3].why.indexOf("CAL_EXC_MAX_SHIFT_MS")>=0, bad[3].why);
  ok("a nameless override is diagnosed", bad[4].why.indexOf("name")>=0, bad[4].why);
  ok("a missing was is diagnosed", bad[5].why.indexOf("was")>=0, bad[5].why);
  eq("no malformed override touched the calendar",
     releasesBetween(trade,trade).filter(function(r){ return r.name==="TRADE"&&r.src==="dated"; }).length, 1);
  releasesBetween(trade,trade);
  eq("releasesBetween records the exception rejects in CAL_EXC_BAD", CAL_EXC_BAD.length, 6);
  eq("the two seeded overrides still applied alongside the rejects",
     releasesBetween(NFP_FEB_REAL,NFP_FEB_REAL).filter(function(r){ return r.src==="corrected"; }).length, 1);
  restore(s);
  releasesBetween(trade,trade);
  eq("CAL_EXC_BAD clears once the table is fixed", CAL_EXC_BAD.length, 0);
  eq("a cancellation (t:null) is NOT a fault", calExceptionRowFault({name:"X",was:trade,t:null,src:SRC,retrieved:RET}), null);
  ok("seed tables restored", seedIntact());
})();

/* ---- 16e. kind/tier resolution for an inserted correction ---- */
(function(){
  const s=snap();
  const thu=etToUtc(2026,6,2,8,30);
  RELEASES.EXCEPTIONS.push({name:"ISM",was:thu,t:thu+3600000,kind:"scheduled-numeric",tier:2,
    src:"https://www.ismworld.org/x",retrieved:"2026-09-06"});
  const got=releasesBetween(thu,thu+7200000).filter(function(r){ return r.name==="ISM"; });
  ok("an explicit kind/tier on the override is honoured", got.length===1&&got[0].tier===2, JSON.stringify(got));
  restore(s);
  eq("calMetaFor finds a DATED name", JSON.stringify(calMetaFor("FOMC")), JSON.stringify({kind:"scheduled-policy",tier:1}));
  eq("calMetaFor finds a BEA name", JSON.stringify(calMetaFor("GDP")), JSON.stringify({kind:"scheduled-numeric",tier:1}));
  eq("calMetaFor invents nothing for an unknown name", calMetaFor("ZZZ"), null);
  eq("calMetaFor no longer has a RULE table to read, so a name only in EXCEPTIONS is unknown to it",
     calMetaFor("NFP"), null);
  ok("seed tables restored", seedIntact());
})();

/* ---- 17. COVERAGE IS DERIVED FROM THE ROWS. Nobody declares it ----
   The superseded design had a hand-written COVERAGE table in which a human wrote a period and,
   on a "*" row, a signature vouching for the publication-rule generators in force. Three review
   rounds (D1, then R1a/b/c, then R6/R7) each found a fresh way for that signature to outlive
   what it signed, and every one was a hazard of the GENERATOR. Generator gone, vouch gone.
   What replaces it is a fact, not a claim: for each series name, the span its own enumerated
   rows actually cover, with the sources and retrieval dates those rows carry. */
const MON26=U(2026,6,6,12,0);   /* Mon 6 Jul 2026 12:00Z - quiet, > 24h from anything in the table */
(function(){
  const spans=calSeriesSpans();
  eq("a span exists for every name the table holds rows for, and for no other",
     spans.map(function(s){ return s.name; }).join(","), "CPI,FOMC,GDP,NFP,PCE,TRADE");
  const gdp=spans.filter(function(s){ return s.name==="GDP"; })[0];
  eq("the GDP span runs from its first enumerated row to its last", iso(gdp.from)+".."+iso(gdp.to),
     "2026-01-22T13:30:00.000Z..2026-12-23T13:30:00.000Z");
  eq("...and counts them", gdp.n, 13);
  eq("...and carries the feed it was read from", gdp.srcs.join(","), "https://apps.bea.gov/API/signup/release_dates.json");
  eq("...and the date a human read it", gdp.retrieved.join(","), "2026-09-06");
  /* the honest single-row case: one payrolls date, so a zero-width span */
  const nfp=spans.filter(function(s){ return s.name==="NFP"; })[0];
  eq("a name known from ONE instant has a zero-width span, not a period", nfp.from, nfp.to);
  eq("...and says it rests on one row", nfp.n, 1);
  eq("...which is the correction, so the span carries the shutdown page", nfp.srcs.join(","),
     "https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm");
  /* an EXCEPTIONS instant counts as knowledge; it is agency evidence in its own right */
  eq("the CPI span starts at the inserted correction, not at the first DATED row",
     iso(spans.filter(function(s){ return s.name==="CPI"; })[0].from), "2026-02-13T13:30:00.000Z");
  eq("...and holds three instants: two dated rows plus the correction",
     spans.filter(function(s){ return s.name==="CPI"; })[0].n, 3);
  eq("calKnownInstants counts every enumerated instant the tables hold", calKnownInstants().length, 51);
  /* coverageAt is the same fact asked at an instant */
  const c=coverageAt(MON26,"GDP");
  ok("July 2026 is inside the GDP span", c.covered&&c.entries.length===1, JSON.stringify(c));
  eq("2025 is not", coverageAt(U(2025,5,1,12,0),"GDP").covered, false);
  eq("2027 is not", coverageAt(U(2027,5,1,12,0),"GDP").covered, false);
  eq("the span is inclusive at from", coverageAt(gdp.from,"GDP").covered, true);
  eq("the span is inclusive at to", coverageAt(gdp.to,"GDP").covered, true);
  eq("one ms before from is outside", coverageAt(gdp.from-1,"GDP").covered, false);
  eq("one ms after to is outside", coverageAt(gdp.to+1,"GDP").covered, false);
  eq("a name with no rows has no span and is never covered", coverageAt(MON26,"PPI").covered, false);
  eq("the unnamed question asks whether ANY series spans t", coverageAt(MON26).covered, true);
  eq("...and it is false before every series' first row", coverageAt(U(2026,0,1,0,0)).covered, false);
  eq("an unusable timestamp is never covered", coverageAt(null,"GDP").covered, false);
  eq("an unusable timestamp returns no entries", coverageAt(new Date(MON26),"GDP").entries.length, 0);
  ok("a non-string name is a caller bug and throws", isErr(threw(function(){ coverageAt(MON26,7); }),"TypeError"),
     threwName(function(){ coverageAt(MON26,7); }));
  /* THE POINT: a span is not a completeness claim, and the code says so where it can be read */
  ok("code.js states in words that a span is not a claim of completeness",
     src.indexOf("never that it was populated")>=0||src.indexOf("not a claim that it was populated")>=0);
})();

/* ---- 17b. the derived span moves with the rows, immediately and with no human in the loop ----
   This is the whole difference from the declaration it replaces. A declaration had to be
   re-signed by hand when the data under it changed, which is precisely what the three review
   rounds found could be skipped. A derived span cannot be stale: it IS the rows. */
(function(){
  const s=snap();
  const before=calSeriesSpans().filter(function(x){ return x.name==="GDP"; })[0];
  RELEASES.DATED.push({name:"GDP",kind:"scheduled-numeric",tier:1,t:U(2027,0,28,13,30),
                       src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2027-01-02"});
  const after=calSeriesSpans().filter(function(x){ return x.name==="GDP"; })[0];
  eq("adding a 2027 row extends the GDP span to it, with nothing declared", iso(after.to), "2027-01-28T13:30:00.000Z");
  eq("...and the row count follows", after.n, before.n+1);
  eq("...and the new retrieval date joins the span's provenance", after.retrieved.sort().join(","), "2026-09-06,2027-01-02");
  eq("...and coverageAt agrees at once", coverageAt(U(2027,0,10,12,0),"GDP").covered, true);
  restore(s);
  eq("removing it retracts the span, again with nothing to re-sign",
     coverageAt(U(2027,0,10,12,0),"GDP").covered, false);
  /* a malformed row grants nothing - it is not a release this unit can emit */
  RELEASES.DATED.push({name:"ZZZ",tier:1,t:"2027-06-01T12:30:00Z"});
  eq("a malformed row contributes no span at all", calSeriesSpans().filter(function(x){ return x.name==="ZZZ"; }).length, 0);
  restore(s);
  ok("seed tables restored", seedIntact());
})();

/* ---- 17c. calCoverageSpan: one series' rows must span the WHOLE band, and names are never unioned ---- */
(function(){
  eq("the +/-45 min band around a July Monday is inside the GDP span",
     calCoverageSpan(MON26-45*60000,MON26+45*60000,"GDP").covered, true);
  eq("a band straddling the first GDP row's instant is not fully inside it",
     calCoverageSpan(U(2026,0,22,13,0),U(2026,0,22,14,0),"GDP").covered, false);
  /* NFP is known from one instant only, so it spans nothing wider than that instant */
  eq("a zero-width span cannot contain a band", calCoverageSpan(NFP_FEB_REAL-1,NFP_FEB_REAL+1,"NFP").covered, false);
  eq("...but it does contain itself", calCoverageSpan(NFP_FEB_REAL,NFP_FEB_REAL,"NFP").covered, true);
  /* the union refusal, which is the same discipline the old adjacent-periods rule had */
  eq("the unnamed question is satisfied by ONE series spanning the whole band, not by two halves",
     calCoverageSpan(U(2026,0,10,0,0),U(2026,0,25,0,0)).covered, true);
  eq("...and TRADE alone is what satisfies it there",
     calCoverageSpan(U(2026,0,10,0,0),U(2026,0,25,0,0)).entries.map(function(e){ return e.name; }).join(","), "TRADE");
  eq("calCoverageSpan refuses an inverted span rather than answering", calCoverageSpan(MON26+1,MON26).covered, false);
  eq("calCoverageSpan refuses a non-numeric span", calCoverageSpan("a",MON26).covered, false);
  ok("a non-string name is a caller bug and throws", isErr(threw(function(){ calCoverageSpan(MON26,MON26,7); }),"TypeError"));
})();

/* ---- 18. eventTag.evCov: a derived, and deliberately WEAKER, fifth key ----
   It used to mean "a human declared this period complete". It now means "the tables are usable
   and some series' rows span t". That is less than it used to promise and more than it ever
   delivered: as shipped, no declaration existed, so evCov read false for every timestamp in
   history. The key stays because it is persisted per ledger row and its absence would change
   the CSV shape; its meaning is documented in code.js in the same breath. */
(function(){
  const s=snap();
  const k=eventTag(MON26);
  ok("inside the rows' span a quiet window reports evCov true", k.ev===null&&k.evCov===true, JSON.stringify(k));
  const q=eventTag(U(2026,0,2,12,0));            /* before the first row of any series */
  ok("before the table's first row the same silence reports evCov false", q.ev===null&&q.evCov===false, JSON.stringify(q));
  eq("the two silences are distinguishable in the persisted tag", q.evCov===k.evCov, false);
  eq("a real release inside the span still tags normally", eventTag(NFP_FEB_REAL-5*60000).evCov, true);
  eq("an unusable timestamp says nothing at all, evCov included", eventTag(null).evCov, null);
  eq("...and that is still the all-null tag", JSON.stringify(eventTag(0)),
     JSON.stringify({ev:null,evMins:null,evTier:null,evSrc:null,evCov:null}));
  ok("the fifth key keeps the tag small enough to persist per row",
     JSON.stringify(eventTag(MON26)).length<80, JSON.stringify(eventTag(MON26)));
  /* evCov is NOT eligibility, and never was - 5 minutes from a release it is still true */
  ok("evCov true does NOT mean control-eligible",
     eventTag(NFP_FEB_REAL-5*60000).evCov===true&&controlEligible(NFP_FEB_REAL-5*60000).eligible===false);
  restore(s);
  ok("seed tables restored", seedIntact());
})();

/* ---- 19. controlEligible: it ANSWERS now, and hands back what the table knew ----
   THE LIVE FAILURE THIS FIXES. The superseded guard refused any window not inside a valid
   hand-written "*" coverage declaration with a matching vouch. No such row was ever written - the
   code comment said so plainly - so controlEligible() returned false for EVERY timestamp in
   history and CLAUDE.md section 11.3 had zero controls to draw on. The instrument measured
   nothing. A mechanism that refuses to answer is not safer than one that answers with a stated
   limitation, and the limitation is now returned in the answer instead of enforced by refusal. */
(function(){
  const s=snap();
  eq("an unusable timestamp is not a control", controlEligible(null).reason, "bad-timestamp");
  eq("...and is not eligible", controlEligible(null).eligible, false);
  const g=controlEligible(MON26);
  ok("A QUIET WINDOW IS NOW ELIGIBLE - the shipped tables produce controls at last",
     g.eligible===true&&g.reason==="ok", JSON.stringify({eligible:g.eligible,reason:g.reason}));
  const near=controlEligible(NFP_FEB_REAL-30*60000);
  ok("a window 30 min from a release is still refused",
     near.eligible===false&&near.reason==="release-nearby", JSON.stringify({e:near.eligible,r:near.reason}));
  eq("the exclusion band is CAL_CONTROL_EXCL_MIN minutes (window + two windows either side)", CAL_CONTROL_EXCL_MIN, 45);
  eq("exactly 45 min out is still excluded", controlEligible(NFP_FEB_REAL-45*60000).reason, "release-nearby");
  eq("46 min out clears the band", controlEligible(NFP_FEB_REAL-46*60000).reason, "ok");
  eq("the band applies after a release too", controlEligible(NFP_FEB_REAL+20*60000).reason, "release-nearby");
  /* a CORRECTED release must exclude its window - this is the contamination case in one line */
  eq("the window that actually held the moved NFP is excluded by the correction",
     controlEligible(NFP_FEB_REAL+5*60000).reason, "release-nearby");
  eq("the window it was superseded FROM is not excluded, because nothing happened there",
     controlEligible(NFP_FEB_WAS+5*60000).reason, "ok");
  /* the joint BEA instants exclude one window between them, not two */
  eq("a joint GDP/PCE instant excludes its own window once", controlEligible(GDP_MAR).reason, "release-nearby");

  /* ---- WHAT THE TABLE KNEW, returned so a caller can record the caveat ---- */
  eq("every answer carries `known`", Object.keys(g).sort().join(","), "eligible,known,reason");
  eq("`known` names the four things a caller needs", Object.keys(g.known).sort().join(","),
     "caveat,inSpan,partial,series");
  eq("known.partial is always true - this table is never complete", g.known.partial, true);
  eq("known.caveat is the registered wording, verbatim", g.known.caveat, CAL_PARTIAL_CAVEAT);
  ok("...and it states the DIRECTION of the bias, which is the load-bearing half",
     g.known.caveat.indexOf("TOWARD ZERO")>=0, g.known.caveat);
  ok("...and says out loud that eligible is not a certificate",
     g.known.caveat.indexOf("NOT a certificate")>=0, g.known.caveat);
  eq("known.series is the derived span table, so a caller can record exactly what was known",
     g.known.series.map(function(x){ return x.name+"x"+x.n; }).join(","), "CPIx3,FOMCx8,GDPx13,NFPx1,PCEx13,TRADEx13");
  eq("known.inSpan names the series whose rows straddle this instant",
     g.known.inSpan.join(","), "CPI,FOMC,GDP,PCE,TRADE");
  ok("every span in known.series carries its source and retrieval date",
     g.known.series.every(function(x){ return x.srcs.length>0&&x.retrieved.length>0; }));
  /* the caveat travels even on a refusal, so a caller logging refusals records it too */
  ok("a refusal carries the same known block", controlEligible(NFP_FEB_REAL).known.caveat===CAL_PARTIAL_CAVEAT&&
     controlEligible(null).known.caveat===CAL_PARTIAL_CAVEAT);
  eq("a bad timestamp is in no span, and says so rather than guessing", controlEligible(null).known.inSpan.length, 0);

  /* a broken table means the calendar cannot be trusted even where it has rows */
  RELEASES.DATED.push({name:"PPI",tier:1,t:"2026-07-14T12:30:00Z"});
  const b=controlEligible(MON26);
  ok("a malformed DATED row disqualifies every control until it is fixed",
     b.eligible===false&&b.reason==="table-errors", JSON.stringify({e:b.eligible,r:b.reason}));
  restore(s);
  RELEASES.EXCEPTIONS.push({name:"CPI",was:MON26,t:MON26});   /* no src/retrieved */
  eq("a malformed EXCEPTIONS row does too", controlEligible(MON26).reason, "table-errors");
  restore(s);
  eq("with the table repaired the window is eligible again", controlEligible(MON26).reason, "ok");
  ok("seed tables restored", seedIntact());
})();

/* ---- 20. calendarAudit: one call, and a human can see how empty the calendar is ---- */
(function(){
  const a=calendarAudit();
  eq("audit counts the DATED rows", a.datedRows, 49);
  eq("audit rejects nothing in the seeded table", a.datedRejected, 0);
  eq("audit names what is in the table", JSON.stringify(a.datedNames),
     JSON.stringify([{name:"FOMC",count:8},{name:"CPI",count:2},{name:"GDP",count:13},
                     {name:"PCE",count:13},{name:"TRADE",count:13}]));
  eq("audit counts unsourced rows (none: every seeded row carries its page)", a.datedUnsourced, 0);
  eq("audit counts the overrides", a.exceptionRows, 2);
  eq("both seeded corrections are insertions - there is no BLS row for either to override",
     a.exceptions.map(function(e){ return e.effect; }).join(","), "inserts,inserts");
  eq("audit totals the insertions", a.exceptionsInserting, 2);
  /* the derived spans, which are the whole of what the table claims */
  eq("audit reports one span per series it holds rows for", a.series.length, 6);
  eq("audit renders each span readably", a.series.filter(function(s){ return s.name==="GDP"; })[0].fromIso+".."+
     a.series.filter(function(s){ return s.name==="GDP"; })[0].toIso, "2026-01-22..2026-12-23");
  eq("audit carries each span's source", a.series.filter(function(s){ return s.name==="TRADE"; })[0].srcs.join(","),
     "https://apps.bea.gov/API/signup/release_dates.json");
  /* THE PARTIALITY, STATED - not inferred by the reader */
  eq("audit states it is partial, as a field", a.partial, true);
  eq("audit carries the caveat verbatim", a.caveat, CAL_PARTIAL_CAVEAT);
  ok("...and prints it, so a human reading the text cannot miss it",
     a.text.indexOf("TOWARD ZERO")>=0, a.text);
  ok("the text says plainly that the spans are derived and are not completeness",
     a.text.indexOf("derived, not declared")>=0&&a.text.indexOf("never that it was populated")>=0, a.text);
  /* WHICH SERIES ARE ABSENT ENTIRELY */
  eq("audit names every expected series with no row anywhere", a.absentNames.join(","), "PPI,CLAIMS,ISM,RETAIL");
  ok("...and prints them under a heading that says what it means",
     a.text.indexOf("ABSENT ENTIRELY (no row anywhere, so every window holding one reads quiet): PPI, CLAIMS, ISM, RETAIL")>=0, a.text);
  ok("...and does not list a series that does have rows",
     ["FOMC","CPI","GDP","PCE","TRADE","NFP"].every(function(n){ return a.absentNames.indexOf(n)<0; }), a.absentNames.join(","));
  /* THE BLS GAP, named rather than left to be inferred */
  eq("audit reports the BLS series by name with their row counts",
     a.blsSeries.map(function(b){ return b.name+"x"+b.rows; }).join(","), "CPIx3,PPIx0,NFPx1,CLAIMSx0");
  ok("...and says in words why they are missing",
     a.text.indexOf("bls.gov is not reachable")>=0, a.text);
  ok("...and that fragments are not coverage",
     a.text.indexOf("not coverage")>=0, a.text);
  ok("audit renders as text a human can eyeball", typeof a.text==="string"&&a.text.split("\n").length>=12, a.text);
  eq("the audit no longer reports anything about declarations, vouches or rule series",
     ["COVERAGE declared","vouched","VOUCH","RULE series","rule-derived"].filter(function(w){
       return a.text.indexOf(w)>=0; }).join(","), "");
  console.log(a.text.split("\n").map(function(l){ return "      | "+l; }).join("\n"));
})();

/* ---- 20b. the audit is what makes a broken or unsourced table visible ---- */
(function(){
  const s=snap();
  RELEASES.DATED.push({name:"PPI",tier:1,t:NaN});
  RELEASES.DATED.push({name:"PPI",kind:"scheduled-numeric",tier:1,t:etToUtc(2026,6,15,8,30)});  /* no src */
  const a=calendarAudit();
  eq("audit counts the malformed row as rejected", a.datedRejected, 1);
  eq("audit still counts the valid rows", a.datedValid, 50);
  eq("audit counts the row with no agency source", a.datedUnsourced, 1);
  ok("audit names the malformed row's fault", a.datedBad[0].why.length>0, JSON.stringify(a.datedBad));
  ok("the rejected count appears in the human text", a.text.indexOf("1 rejected")>=0, a.text);
  ok("a span built from an unsourced row says so instead of implying provenance",
     a.text.indexOf("NO SOURCE ON THESE ROWS")>=0, a.text);
  eq("PPI now has a row, so it drops off the absent list", a.absentNames.indexOf("PPI"), -1);
  ok("...and the tables report themselves unusable while the malformed row stands", a.tablesUsable===false);
  ok("...and the text shouts it", a.text.indexOf("TABLES REJECTED")>=0, a.text);
  restore(s);
  const b=calendarAudit();
  eq("audit is clean again after restore", b.datedRejected+b.datedUnsourced, 0);
  eq("...and PPI is back on the absent list", b.absentNames.indexOf("PPI")>=0, true);
  ok("seed tables restored", seedIntact());
})();

/* ---- 22. [REGRESSION - D2] a chained correction can no longer leave a phantom release ----
   calApplyExceptions walked EXCEPTIONS in array order applying each row once, and emission is
   unconditional, so an exception whose `was` pointed at an instant produced by a LATER row never
   removed it. A two-step reschedule (X -> Y, then Y -> Z - the shape an agency produces when it
   revises a date it has already revised) emitted BOTH Y and Z in one order and only Z in the
   other. The Y row is a release that never happened, sitting beside the real one, in a unit whose
   header says DO NOT GUESS A DATE - and calendarAudit() reported exceptionsRejected: 0.
   SURVIVED ALL THREE REVIEW ROUNDS AND SURVIVES THIS DELETION. */
(function(){
  const s=snap();
  const SRC="https://www.bls.gov/x", RET="2026-09-06";
  const X=etToUtc(2026,4,6,8,30), Y=etToUtc(2026,4,10,8,30), Z=etToUtc(2026,4,13,8,30);
  const A={name:"PPI",was:X,t:Y,src:SRC,retrieved:RET,note:"test: agency reschedules X -> Y"};
  const B={name:"PPI",was:Y,t:Z,src:SRC,retrieved:RET,note:"test: agency then reschedules Y -> Z"};
  function ppi(){
    return releasesBetween(X-3*86400000,Z+3*86400000).filter(function(r){ return r.name==="PPI"; })
           .map(function(r){ return iso(r.t)+"/"+r.src; }).join(" ");
  }
  RELEASES.EXCEPTIONS.push(A,B);
  const ab=ppi(), abBad=calValidateExceptions().length;
  restore(s);
  RELEASES.EXCEPTIONS.push(B,A);
  const ba=ppi(), baBad=calValidateExceptions().length;
  eq("a two-step reschedule gives the SAME answer whichever order the rows were typed in", ab, ba);
  eq("...and neither order reports a release at the intermediate date that never happened",
     (ab+ba).indexOf(iso(Y))>=0, false);
  eq("...because the chain is refused outright rather than half-applied", ab, "");
  eq("both rows of the chain are rejected, in either order", abBad+"/"+baBad, "2/2");
  ok("the reject names the fault as a CHAIN and says how to repair it",
     calValidateExceptions()[0].why.indexOf("CHAIN")>=0&&calValidateExceptions()[0].why.indexOf("collapse")>=0,
     calValidateExceptions()[0].why);
  eq("the audit is LOUD about it - it used to report 0 rejected", calendarAudit().exceptionsRejected, 2);
  eq("...and no longer lists the chain as two independently-true effects",
     calendarAudit().exceptions.filter(function(e){ return e.name==="PPI"; }).length, 0);
  eq("a chain disqualifies every control window until a human collapses it",
     controlEligible(MON26).reason, "table-errors");
  restore(s);
  RELEASES.EXCEPTIONS.push(A);
  eq("a single, unchained correction still applies exactly as before", ppi(), iso(Y)+"/corrected");
  restore(s);
  /* the same order-dependence, one shape over: two rows overriding the same base date */
  RELEASES.EXCEPTIONS.push({name:"PPI",was:X,t:Y,src:SRC,retrieved:RET},
                           {name:"PPI",was:X,t:Z,src:SRC,retrieved:RET});
  eq("two overrides of the same `was` are order-dependent too, so both are refused",
     calValidateExceptions().length, 2);
  eq("...and neither is emitted, so there is no duplicate release at two timestamps", ppi(), "");
  restore(s);
  /* the check is NAME-SCOPED, and that is load-bearing: the two SEEDED corrections share an
     instant (NFP moves TO 2026-02-11, CPI moves FROM it) and are unrelated events, not a chain */
  eq("NFP moves to the very instant CPI moves from", RELEASES.EXCEPTIONS[0].t, RELEASES.EXCEPTIONS[1].was);
  eq("...and that is correctly NOT treated as a chain", calValidateExceptions().length, 0);
  eq("...so both seeded corrections still apply",
     releasesBetween(U(2026,1,1,0,0),U(2026,1,28,23,59)).filter(function(r){ return r.src==="corrected"; }).length, 2);
  ok("seed tables restored", seedIntact());
})();

/* ---- 23. [REGRESSION - D3] a validation failure must never silently DELETE a release ----
   The sharp case is a rejected EXCEPTIONS row: drop `retrieved` from the seeded NFP correction
   and the correction stops applying, so the REAL 2026-02-11 payrolls print vanishes from the
   calendar entirely - a validation failure whose failure direction is DELETION, while the window
   that held it read "genuinely quiet". Nothing may report quiet while a table holds a rejected
   row. SURVIVED ALL THREE REVIEW ROUNDS AND SURVIVES THIS DELETION. */
(function(){
  const s=snap();
  eq("the seeded correction is the only payrolls date in the table",
     releasesBetween(U(2026,1,1,0,0),U(2026,1,28,23,59)).filter(function(r){ return r.name==="NFP"; }).length, 1);
  /* now break it exactly as the reviewer did */
  RELEASES.EXCEPTIONS[0]={name:"NFP",was:NFP_FEB_WAS,t:NFP_FEB_REAL,
                          src:"https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm"};
  eq("the rejected correction really does stop applying - the real print is gone from the calendar",
     releasesBetween(U(2026,1,1,0,0),U(2026,1,28,23,59)).filter(function(r){ return r.name==="NFP"; }).length, 0);
  eq("but the window that HELD it can no longer read as quiet: evCov is false",
     eventTag(NFP_FEB_REAL-5*60000).evCov, false);
  eq("...and controlEligible refuses it for the same reason", controlEligible(NFP_FEB_REAL-5*60000).reason, "table-errors");
  eq("...and refuses it rather than handing back {eligible:true}", controlEligible(NFP_FEB_REAL-5*60000).eligible, false);
  eq("the refusal covers every window, not just that one", controlEligible(MON26).reason, "table-errors");
  eq("evCov and controlEligible agree about the broken table", eventTag(MON26).evCov, false);
  eq("the tables report themselves unusable", calTablesUsable(), false);
  const a=calendarAudit();
  eq("the audit says so in the object", a.tablesUsable, false);
  ok("...and shouts it in the human text, in the deletion's own terms",
     a.text.indexOf("TABLES REJECTED")>=0&&a.text.indexOf("does NOT emit")>=0, a.text);
  restore(s);
  eq("fixing the row restores both the release and the reading", eventTag(NFP_FEB_REAL-5*60000).evCov, true);
  eq("...and the window is eligible again on either side of the band", controlEligible(MON26).eligible, true);
  /* the DATED case, same direction */
  RELEASES.DATED.push({name:"PPI",tier:1,t:"2026-07-14T12:30:00Z"});
  eq("a malformed DATED row drives evCov false as well", eventTag(MON26).evCov, false);
  eq("...matching controlEligible exactly", controlEligible(MON26).reason, "table-errors");
  restore(s);
  eq("an unusable timestamp still says nothing at all", eventTag(null).evCov, null);
  eq("the tag is still exactly five keys", Object.keys(eventTag(MON26)).join(","), "ev,evMins,evTier,evSrc,evCov");
  ok("seed tables restored", seedIntact());
})();

/* ---- 26. the audit's own arithmetic (nits, recorded so they are not rediscovered) ---- */
(function(){
  const s=snap();
  RELEASES.DATED.push({name:"PPI",tier:1,t:NaN});
  eq("the human text prints the VALID count under the word 'valid', not the row total",
     calendarAudit().text.indexOf("DATED rows: 49 valid, 1 rejected")>=0, true);
  restore(s);
  const keep=RELEASES.DATED;
  RELEASES.DATED=5;                                 /* not an array at all */
  const b=calendarAudit();
  eq("a non-array DATED table reports zero valid rows, not -1", b.datedValid, 0);
  eq("...and is itself reported as a rejected table", b.datedRejected, 1);
  eq("...and produces spans from the EXCEPTIONS instants alone, rather than throwing",
     b.series.map(function(x){ return x.name+"x"+x.n; }).join(","), "CPIx1,NFPx1");
  RELEASES.DATED=keep;
  RELEASES.DATED.push({name:"toString",kind:"scheduled-numeric",tier:2,t:etToUtc(2026,6,15,8,30),
                       src:"https://example.invalid/x",retrieved:"2026-09-06"});
  const c=calendarAudit();
  ok("a row named 'toString' is counted rather than swallowed by Object.prototype",
     c.datedNames.filter(function(n){ return n.name==="toString"; }).length===1, JSON.stringify(c.datedNames));
  ok("...and gets its own derived span rather than colliding with a prototype key",
     c.series.filter(function(s2){ return s2.name==="toString"; }).length===1, JSON.stringify(c.seriesNames));
  restore(s);
  ok("seed tables restored", seedIntact());
})();

/* ---- 29. [REGRESSION - R4] a broken table is reported as a broken table, not as proximity ----
   controlEligible checked release-nearby BEFORE table-errors, so any window that still had a
   release nearby reported "release-nearby" while the tables were unusable. Eligibility was right
   either way - but code.js states at controlEligible that counting these reasons is how section
   11.3's "control coverage >= 80%" figure is computed, so a table fault became invisible in the
   very statistic meant to expose thin coverage. */
(function(){
  const s=snap();
  const NEAR=NFP_FEB_REAL-30*60000;                 /* 30 min from a release: nearby under any table */
  eq("with clean tables that window is ordinary release proximity", controlEligible(NEAR).reason, "release-nearby");
  const keep=RELEASES.DATED;
  RELEASES.DATED=null;                              /* not an array at all */
  const r=controlEligible(NEAR);
  ok("[R4] with a broken table the SAME window reports the table fault, not proximity",
     r.eligible===false&&r.reason==="table-errors", JSON.stringify({e:r.eligible,r:r.reason}));
  eq("[R4] ...and calTablesUsable agrees", calTablesUsable(), false);
  RELEASES.DATED=keep;
  RELEASES.DATED.push({name:"PPI",tier:1,t:"2026-07-14T12:30:00Z"});
  eq("[R4] a single malformed row is enough to take precedence over proximity",
     controlEligible(NEAR).reason, "table-errors");
  restore(s);
  eq("[R4] a bad timestamp still outranks everything, since there is no window to reason about",
     controlEligible(null).reason, "bad-timestamp");
  eq("with the table repaired the reason goes back to proximity", controlEligible(NEAR).reason, "release-nearby");
  ok("seed tables restored", seedIntact());
})();

/* ---- 30. THE HEADLINE GUARANTEE, SWEPT, IN ITS NEW FORM ----
   The old sweep asserted that NOT ONE instant in twenty years was control-eligible, and called
   that honesty. It was not honesty, it was a mechanism that refused to answer: no "*" declaration
   existed, so section 11.3 had zero controls and the instrument measured nothing.
   What must hold now is the thing the guard is actually FOR: no eligible window is within
   CAL_CONTROL_EXCL_MIN minutes of any release the table knows about - and eligible windows must
   exist, or the guard is back to protecting nothing. The step is deliberately NOT a divisor of a
   day, so the sweep lands on many different slots-of-day rather than the same four. */
(function(){
  const seen=Object.create(null); let n=0, elig=0, viol=null;
  for(let t=U(2015,0,1,0,0);t<U(2036,0,1);t+=6*3600000+13*60000){
    const r=controlEligible(t); n++;
    seen[r.reason]=(seen[r.reason]||0)+1;
    if(r.eligible){
      elig++;
      if(viol===null&&nearestRelease(t,CAL_CONTROL_EXCL_MIN)!==null) viol=t;
    }
  }
  ok("swept "+n+" instants across 2015-2036 on the shipped tables", n>25000, String(n));
  eq("NOT ONE eligible window has a known release inside the exclusion band", viol, null);
  ok("and eligible windows DO exist now - the guard answers instead of refusing", elig>25000, String(elig));
  eq("...and the only reasons that occur are eligibility and proximity",
     Object.keys(seen).sort().join(","), "ok,release-nearby");
  /* the honest other half: eligibility is not cleanliness, and the code says so in every answer */
  ok("every eligible answer still carries the partiality caveat",
     controlEligible(U(2020,5,3,7,17)).known.caveat===CAL_PARTIAL_CAVEAT);
  ok("...including in 2015, where the table holds no rows at all and knows it",
     controlEligible(U(2015,5,3,7,17)).known.inSpan.length===0&&
     controlEligible(U(2015,5,3,7,17)).eligible===true);
  const a=calendarAudit();
  eq("AS SHIPPED the audit still says the table is partial", a.partial, true);
  eq("...and still names four expected series with no row at all", a.absentNames.length, 4);
})();

/* ---- 21. the seeded tables survived the whole suite unmutated ---- */
ok("RELEASES.DATED is exactly the 49 enumerated rows at the end of the run", seedIntact()&&RELEASES.DATED.length===49);
eq("RELEASES.EXCEPTIONS is exactly the 2 agency corrections", RELEASES.EXCEPTIONS.length, 2);
eq("the tables are still clean", calValidateDated().length+calValidateExceptions().length, 0);
eq("there is still no coverage table to declare anything with",
   vm.runInContext("(function(){ try{ return typeof RELEASES.COVERAGE; }catch(e){ return \"undefined\"; } })()",ctx),
   "undefined");

console.log(fails?("\n"+fails+" FAILED"):"\nall passed");
process.exit(fails?1:0);
