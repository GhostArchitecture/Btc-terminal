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
const L=vm.runInContext("({RELEASES:RELEASES,CAL_HORIZON_MIN:CAL_HORIZON_MIN,CAL_MAX_ITER:CAL_MAX_ITER,"+
  "CAL_T_MIN:CAL_T_MIN,CAL_T_MAX:CAL_T_MAX,CAL_MAX_SPAN_MS:CAL_MAX_SPAN_MS,"+
  "CAL_MAX_HORIZON_MIN:CAL_MAX_HORIZON_MIN,CAL_DATED_BAD:CAL_DATED_BAD,CAL_EXC_BAD:CAL_EXC_BAD,"+
  "CAL_COVERAGE_BAD:CAL_COVERAGE_BAD,CAL_CONTROL_EXCL_MIN:CAL_CONTROL_EXCL_MIN,"+
  "CAL_EXC_MAX_SHIFT_MS:CAL_EXC_MAX_SHIFT_MS,CAL_EXPECTED_NAMES:CAL_EXPECTED_NAMES,CAL_KINDS:CAL_KINDS,"+
  "CAL_RULE_BAD:CAL_RULE_BAD})",ctx);
const {usEasternOffsetMinutes,etToUtc,usDstBoundsUtc,nthDowUtc,releasesBetween,nearestRelease,eventTag,
       calValidTime,calValidateDated,calDatedRowFault,calValidateExceptions,calExceptionRowFault,
       calValidateCoverage,calCoverageRowFault,coverageAt,calCoverageSpan,controlEligible,
       calendarAudit,calMetaFor,calValidateRule,calRuleRowFault,calParseRule,calTablesUsable,
       calRuleSeriesNames,calCoverageVouchGap,calEtDateIso,calUsableExceptions,lastDowUtc,
       calRuleSeriesSpecs,calRuleSpecKey,calRuleSpecLabel,calCoverageVouchFaults,calCoverageStaleVouch,
       calStarScan}=ctx;
const RELEASES=L.RELEASES, CAL_HORIZON_MIN=L.CAL_HORIZON_MIN;
const CAL_T_MIN=L.CAL_T_MIN, CAL_T_MAX=L.CAL_T_MAX, CAL_MAX_HORIZON_MIN=L.CAL_MAX_HORIZON_MIN;
const CAL_DATED_BAD=L.CAL_DATED_BAD, CAL_EXC_BAD=L.CAL_EXC_BAD, CAL_COVERAGE_BAD=L.CAL_COVERAGE_BAD;
const CAL_CONTROL_EXCL_MIN=L.CAL_CONTROL_EXCL_MIN, CAL_EXC_MAX_SHIFT_MS=L.CAL_EXC_MAX_SHIFT_MS;
const CAL_RULE_BAD=L.CAL_RULE_BAD;
/* The seeded tables are real data now, so every test that mutates one must put it back exactly.
   snap()/restore() replace the ARRAY CONTENTS in place - the unit holds RELEASES.DATED etc. by
   reference, so reassigning the property would leave the unit reading the old array. */
function snap(){ return {R:RELEASES.RULE.slice(),D:RELEASES.DATED.slice(),
                         E:RELEASES.EXCEPTIONS.slice(),C:RELEASES.COVERAGE.slice()}; }
function restore(s){
  RELEASES.RULE.length=0;       Array.prototype.push.apply(RELEASES.RULE,s.R);
  RELEASES.DATED.length=0;      Array.prototype.push.apply(RELEASES.DATED,s.D);
  RELEASES.EXCEPTIONS.length=0; Array.prototype.push.apply(RELEASES.EXCEPTIONS,s.E);
  RELEASES.COVERAGE.length=0;   Array.prototype.push.apply(RELEASES.COVERAGE,s.C);
}
const SEED=snap();
function seedIntact(){
  return RELEASES.RULE.length===SEED.R.length&&RELEASES.DATED.length===SEED.D.length&&
         RELEASES.EXCEPTIONS.length===SEED.E.length&&RELEASES.COVERAGE.length===SEED.C.length&&
         RELEASES.RULE.every(function(r,i){ return r===SEED.R[i]; })&&
         RELEASES.DATED.every(function(r,i){ return r===SEED.D[i]; });
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

/* ---- 6. RELEASES table honesty: every seeded row is agency-sourced, and NOTHING beyond ---- */
ok("RELEASES.RULE holds exactly the two genuinely rule-derived releases",
   RELEASES.RULE.length===2&&RELEASES.RULE[0].rule==="first-friday-of-month"&&RELEASES.RULE[1].rule==="every-thursday");
ok("RULE tiers: NFP=1, CLAIMS=2", RELEASES.RULE[0].tier===1&&RELEASES.RULE[1].tier===2);
eq("the seeded RULE table is clean - it DRIVES the generator now, so a rejected row is a missing series",
   calValidateRule().length, 0);
eq("DATED holds exactly the 10 verified rows (8 FOMC + 2 CPI) and no inferred ones", RELEASES.DATED.length, 10);
eq("the seeded DATED table is clean", calValidateDated().length, 0);
eq("the seeded EXCEPTIONS table is clean", calValidateExceptions().length, 0);
eq("the seeded COVERAGE table is clean", calValidateCoverage().length, 0);
ok("every seeded DATED row carries its agency src and the date it was read",
   RELEASES.DATED.every(function(r){ return /^https:\/\//.test(r.src)&&/^\d{4}-\d{2}-\d{2}$/.test(r.retrieved); }));
ok("every seeded EXCEPTIONS row carries its agency src and retrieved date",
   RELEASES.EXCEPTIONS.every(function(r){ return /^https:\/\//.test(r.src)&&/^\d{4}-\d{2}-\d{2}$/.test(r.retrieved); }));
ok("every seeded COVERAGE row carries its agency src and retrieved date",
   RELEASES.COVERAGE.every(function(r){ return /^https:\/\//.test(r.src)&&/^\d{4}-\d{2}-\d{2}$/.test(r.retrieved); }));
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
  ok("no DATED row was invented for PPI/PCE/GDP/ISM/RETAIL",
     RELEASES.DATED.every(function(r){ return r.name==="FOMC"||r.name==="CPI"; }));
})();

/* ---- 7. releasesBetween ---- */
const Y0=U(2026,0,1,0,0,0), Y1=U(2026,11,31,23,59,59,999);
const yr=releasesBetween(Y0,Y1);
const nfp=yr.filter(function(r){return r.name==="NFP";});
const clm=yr.filter(function(r){return r.name==="CLAIMS";});
eq("2026 has 12 NFP releases", nfp.length, 12);
eq("2026 has 53 claims Thursdays (Jan 1 and Dec 31 are both Thursdays)", clm.length, 53);
/* the ONE rule-derived NFP that is not on a Friday is the corrected one - asserted below in 16 */
ok("every rule-derived NFP falls on a Friday in ET",
   nfp.filter(function(r){ return r.src==="rule"; }).every(function(r){ return new Date(r.t-usEasternOffsetMinutes(r.t)*60000).getUTCDay()===5; }));
ok("every claims falls on a Thursday in ET", clm.every(function(r){ return new Date(r.t-usEasternOffsetMinutes(r.t)*60000).getUTCDay()===4; }));
ok("every NFP/CLAIMS/CPI release is 08:30 ET", yr.filter(function(r){ return r.name!=="FOMC"; })
   .every(function(r){ const b=new Date(r.t-usEasternOffsetMinutes(r.t)*60000); return b.getUTCHours()===8&&b.getUTCMinutes()===30; }));
ok("every FOMC release is 14:00 ET", yr.filter(function(r){ return r.name==="FOMC"; })
   .every(function(r){ const b=new Date(r.t-usEasternOffsetMinutes(r.t)*60000); return b.getUTCHours()===14&&b.getUTCMinutes()===0; }));
ok("every rule-derived NFP is the first Friday of its ET month",
   nfp.filter(function(r){ return r.src==="rule"; }).every(function(r){ return new Date(r.t-usEasternOffsetMinutes(r.t)*60000).getUTCDate()<=7; }));
ok("result is sorted ascending by t", yr.every(function(r,i){ return i===0||yr[i-1].t<=r.t; }));
ok("entries carry the documented shape", yr.every(function(r){ return (r.kind==="scheduled-numeric"||r.kind==="scheduled-policy")&&(r.tier===1||r.tier===2)&&typeof r.t==="number"; }));
ok("every emitted row carries a provenance class", yr.every(function(r){ return r.src==="rule"||r.src==="dated"||r.src==="corrected"; }));
eq("2026 holds the 8 FOMC statements", yr.filter(function(r){ return r.name==="FOMC"; }).length, 8);
ok("every non-rule row carries the agency URL it came from",
   yr.filter(function(r){ return r.src!=="rule"; }).every(function(r){ return /^https:\/\//.test(r.ref)&&/^\d{4}-\d{2}-\d{2}$/.test(r.retrieved); }));
ok("rule rows carry no agency URL, because there is none",
   yr.filter(function(r){ return r.src==="rule"; }).every(function(r){ return r.ref===null&&r.retrieved===null; }));
eq("first 2026 NFP is Jan 2 13:30Z (winter)", iso(nfp[0].t), "2026-01-02T13:30:00.000Z");
eq("July 2026 NFP is Jul 3 12:30Z (summer)", iso(nfp[6].t), "2026-07-03T12:30:00.000Z");
eq("first 2026 claims is Jan 1 13:30Z", iso(clm[0].t), "2026-01-01T13:30:00.000Z");
eq("inverted range returns empty", releasesBetween(Y1,Y0).length, 0);
/* inclusivity, and no leakage from the one-day generation pad */
const exact=releasesBetween(nfp[6].t,nfp[6].t);
eq("range [t,t] on a release returns exactly it", exact.length===1&&exact[0].name==="NFP", true);
eq("range ending 1ms before a release excludes it",
   releasesBetween(nfp[6].t-3600000,nfp[6].t-1).filter(function(r){return r.name==="NFP";}).length, 0);
eq("narrow midweek range (Mon-Tue) is empty", releasesBetween(U(2026,6,6,0,0),U(2026,6,7,23,59)).length, 0);
/* month walk crosses a year boundary */
const xy=releasesBetween(U(2025,11,20,0,0),U(2026,0,10,0,0)).filter(function(r){return r.name==="NFP";});
eq("year-boundary walk finds Jan 2 2026 NFP", xy.length===1&&iso(xy[0].t)==="2026-01-02T13:30:00.000Z", true);

/* ---- 8. DATED rows are picked up once populated (proves the empty table is a data gap, not dead code) ---- */
(function(){
  const s=snap();
  const cpi={name:"CPI",kind:"scheduled-numeric",tier:1,t:etToUtc(2026,6,14,8,30)};
  RELEASES.DATED.push(cpi);
  const got=releasesBetween(U(2026,6,14,0,0),U(2026,6,14,23,59));
  ok("a populated DATED row appears in releasesBetween", got.some(function(r){return r.name==="CPI"&&r.t===cpi.t;}));
  const n=nearestRelease(cpi.t-10*60000);
  ok("a populated DATED row wins nearestRelease when closest", n&&n.name==="CPI"&&n.mins===10, JSON.stringify(n));
  restore(s);
  ok("seed tables restored", seedIntact());
})();

/* ---- 9. nearestRelease ---- */
const nfpJul=U(2026,6,3,12,30);
(function(){
  const a=nearestRelease(nfpJul-30*60000);
  ok("30 min before NFP -> mins +30, tier 1", a&&a.name==="NFP"&&a.mins===30&&a.tier===1, JSON.stringify(a));
  const b=nearestRelease(nfpJul+45*60000);
  ok("45 min after NFP -> mins -45 (already happened)", b&&b.name==="NFP"&&b.mins===-45, JSON.stringify(b));
  const c=nearestRelease(nfpJul);
  ok("exactly at the release -> mins 0", c&&c.mins===0, JSON.stringify(c));
  const d=nearestRelease(U(2026,6,6,12,0));  /* Monday, > 24h from Fri NFP and Thu claims */
  eq("quiet Monday within default horizon -> null", d, null);
  const e=nearestRelease(U(2026,6,6,12,0),4*1440);
  ok("same Monday with a 4-day horizon finds something", e!==null&&(e.name==="NFP"||e.name==="CLAIMS"), JSON.stringify(e));
  eq("zero/negative horizon -> null", nearestRelease(nfpJul,0), null);
  /* Thursday claims 12:30Z Jul 2; Friday NFP 12:30Z Jul 3. Midpoint 00:30Z Jul 3 is
     exactly 12h from each -> tie must break to tier 1 (NFP). */
  const mid=U(2026,7-1,3,0,30);
  const f=nearestRelease(mid);
  ok("equidistant claims/NFP tie breaks to tier 1 (NFP)", f&&f.name==="NFP"&&f.mins===720, JSON.stringify(f));
  /* just past the midpoint the tier-2 claims release must win on pure distance */
  const g=nearestRelease(mid-60000);
  ok("one minute earlier, claims is genuinely nearer and wins", g&&g.name==="CLAIMS", JSON.stringify(g));
  const h=nearestRelease(nfpJul, CAL_HORIZON_MIN);
  ok("explicit default horizon matches implicit", JSON.stringify(h)===JSON.stringify(nearestRelease(nfpJul)));
})();

/* ---- 10. eventTag ---- */
(function(){
  const t=eventTag(nfpJul-5*60000);
  eq("eventTag has exactly 5 keys (ev,evCov,evMins,evSrc,evTier)", Object.keys(t).sort().join(","), "ev,evCov,evMins,evSrc,evTier");
  ok("eventTag near NFP", t.ev==="NFP"&&t.evMins===5&&t.evTier===1, JSON.stringify(t));
  const q=eventTag(U(2026,6,6,12,0));
  ok("eventTag quiet Monday -> null event", q.ev===null&&q.evMins===null&&q.evTier===null&&q.evSrc===null, JSON.stringify(q));
  ok("eventTag serialises small (persisted on thousands of rows)", JSON.stringify(t).length<80, JSON.stringify(t));
  ok("eventTag mins are whole numbers", Number.isInteger(eventTag(nfpJul-90*1000).evMins));
})();

/* ---- 11. no reliance on page helpers / no global leakage ---- */
/* the stubs throw, so exercising the whole surface with them installed is the assertion */
ok("unit did not call the poisoned helper stubs (any call would throw here)",
   threw(function(){ eventTag(nfpJul-5*60000); nearestRelease(nfpJul); releasesBetween(Y0,Y1); })===null);

/* ---- 12. [REGRESSION - MEDIUM 1] a corrupt/missing timestamp must never produce a tag ----
   Before the fix, nearestRelease never coerced or checked t:
     eventTag(null) / eventTag(0) / eventTag(false) -> {"ev":"CLAIMS","evMins":810,"evTier":2}
   i.e. the 1 Jan 1970 claims release, a confident tier-2 tag stamped on a row whose timestamp
   went missing - and these tags are persisted on thousands of ledger rows and analysed by event
   distance later. A Date or a numeric string went the other way (string concat inside the range
   computation) and reported "no event known" 30 min before NFP. */
(function(){
  const NULLTAG=JSON.stringify({ev:null,evMins:null,evTier:null,evSrc:null,evCov:null});
  const cases=[["null",null],["0",0],["false",false],["empty string",""],["NaN",NaN],
    ["Infinity",Infinity],["-Infinity",-Infinity],["undefined",undefined],["true",true],
    ["numeric string","1783080000000"],["ISO string","2026-07-03T12:00:00Z"],
    ["Date object",new Date(nfpJul-30*60000)],["object",{t:nfpJul}],["array",[nfpJul]],
    ["1 day after epoch",86400000],["1999 (pre-range)",U(1999,0,1)],["year 2200",U(2200,0,1)]];
  cases.forEach(function(c){
    eq("eventTag("+c[0]+") -> all-null tag, never a 1970 release", JSON.stringify(eventTag(c[1])), NULLTAG);
    eq("nearestRelease("+c[0]+") -> null", nearestRelease(c[1]), null);
  });
  eq("the specific regression: eventTag(0).ev is null, not \"CLAIMS\"", eventTag(0).ev, null);
  eq("the specific regression: eventTag(null).evMins is null, not 810", eventTag(null).evMins, null);
  /* the guard must not eat valid input */
  ok("a valid instant still tags", eventTag(nfpJul-30*60000).ev==="NFP");
  eq("fractional-ms instants still accepted", calValidTime(nfpJul+0.5), true);
  eq("CAL_T_MIN itself is accepted (Thu 1 Jan 2009 claims is 13.5h away)", nearestRelease(CAL_T_MIN)!==null, true);
  eq("one ms below CAL_T_MIN is refused", nearestRelease(CAL_T_MIN-1), null);
  eq("CAL_T_MAX itself is accepted by the type check", calValidTime(CAL_T_MAX), true);
  eq("one ms above CAL_T_MAX is refused", calValidTime(CAL_T_MAX+1), false);
  eq("calValidTime rejects the Date wrapper of a perfectly good instant (convert with +d)", calValidTime(new Date(nfpJul)), false);
  /* the per-row path must never throw on bad data - only caller parameters refuse loudly */
  eq("bad t returns null rather than throwing (this runs per ledger row)", threw(function(){ eventTag(null); eventTag(new Date()); }), null);
  eq("non-numeric horizon -> null (documented), not a throw", nearestRelease(nfpJul,"1440"), null);
  eq("NaN horizon -> null", nearestRelease(nfpJul,NaN), null);
})();

/* ---- 13. [REGRESSION - MEDIUM 2] provenance survives into the persisted tag ----
   RELEASES keeps RULE (inferred: first-Friday / every-Thursday, with real unmodelled holiday and
   BLS shifts) apart from DATED (agency-published). The emitted tag used to flatten that away, so
   a stored row could not tell an official date from an inference at analysis time. */
(function(){
  const s=snap();
  eq("rule-derived tag carries evSrc", eventTag(nfpJul-5*60000).evSrc, "rule");
  ok("every NFP/CLAIMS row that no exception touched carries src 'rule'",
     yr.filter(function(r){ return (r.name==="NFP"||r.name==="CLAIMS")&&r.was===undefined; })
       .every(function(r){ return r.src==="rule"; }));
  eq("nearestRelease carries src through", nearestRelease(nfpJul).src, "rule");
  eq("null tag still carries the key (stable CSV columns)", eventTag(U(2026,6,6,12,0)).evSrc, null);
  const cpi={name:"CPI",kind:"scheduled-numeric",tier:1,t:etToUtc(2026,6,14,8,30)};
  RELEASES.DATED.push(cpi);
  const got=releasesBetween(U(2026,6,13,0,0),U(2026,6,17,23,59));   /* CPI Tue 14th + claims Thu 16th */
  const row=got.filter(function(r){ return r.name==="CPI"; })[0];
  eq("a DATED row is tagged src 'dated', not 'rule'", row&&row.src, "dated");
  eq("nearestRelease on a DATED row reports src 'dated'", (nearestRelease(cpi.t-10*60000)||{}).src, "dated");
  eq("eventTag on a DATED row reports evSrc 'dated'", eventTag(cpi.t-10*60000).evSrc, "dated");
  ok("published and inferred rows are distinguishable inside one result set",
     got.some(function(r){ return r.src==="rule"; })&&got.some(function(r){ return r.src==="dated"; }), JSON.stringify(got));
  ok("provenance key does not blow up the persisted size",
     JSON.stringify(eventTag(cpi.t-10*60000)).length<80, JSON.stringify(eventTag(cpi.t-10*60000)));
  restore(s);
  ok("seed tables restored", seedIntact());
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
   The day walk capped at CAL_MAX_ITER and returned the partial list, so a horizon past ~27y
   produced a confidently wrong nearest release (the claims print 5 minutes ago simply vanished). */
(function(){
  const t=U(2026,6,2,12,35);                     /* 5 min after the Thu 2 Jul 2026 claims print */
  const wide=nearestRelease(t,1e7);              /* ~19y each side: inside the guard, still answered */
  ok("a wide-but-coverable horizon still answers correctly",
     wide&&wide.name==="CLAIMS"&&wide.mins===-5, JSON.stringify(wide));
  const e=threw(function(){ nearestRelease(t,5e7); });
  ok("a horizon past the guard refuses (RangeError) instead of answering NFP +1435", isErr(e,"RangeError"), String(e));
  ok("the horizon refusal names the limit", e&&e.message.indexOf("CAL_MAX_HORIZON_MIN")>=0, e&&e.message);
  eq("the largest allowed horizon is still answered, not refused", threw(function(){ nearestRelease(t,CAL_MAX_HORIZON_MIN); }), null);
  ok("one minute past it refuses", isErr(threw(function(){ nearestRelease(t,CAL_MAX_HORIZON_MIN+1); }),"RangeError"),
     threwName(function(){ nearestRelease(t,CAL_MAX_HORIZON_MIN+1); }));
  const e2=threw(function(){ releasesBetween(0,1e15); });
  ok("a 31,000-year range refuses instead of returning 22,856 truncated rows", isErr(e2,"RangeError"), String(e2));
  ok("the range refusal says it is refusing", e2&&e2.message.indexOf("refusing")>=0, e2&&e2.message);
  ok("a non-numeric range refuses loudly (it used to return [] = 'no releases')",
     isErr(threw(function(){ releasesBetween(U(2026,6,1),"2026-07-31"); }),"TypeError"),
     threwName(function(){ releasesBetween(U(2026,6,1),"2026-07-31"); }));
  ok("a Date range refuses loudly too", isErr(threw(function(){ releasesBetween(new Date(Y0),new Date(Y1)); }),"TypeError"),
     threwName(function(){ releasesBetween(new Date(Y0),new Date(Y1)); }));
  eq("an ordinary range is unaffected", threw(function(){ releasesBetween(Y0,Y1); }), null);
})();


/* ---- 16. EXCEPTIONS: an agency correction beats the rule, and says so in the row ----
   The first-Friday rule is provably wrong for February 2026 (BLS moved the January-reference
   Employment Situation off Fri 2026-02-06 to Wed 2026-02-11 after the 2025-2026 lapses in
   appropriations). A silently wrong NFP date is the exact failure this unit exists to avoid:
   the window that actually held the print would look quiet and could be recruited as a control. */
const NFP_FEB_RULE=etToUtc(2026,1,6,8,30);      /* what first-friday-of-month would emit */
const NFP_FEB_REAL=etToUtc(2026,1,11,8,30);     /* what BLS published */
const CPI_FEB_REAL=etToUtc(2026,1,13,8,30);     /* CPI Jan-2026 ref, moved from 2026-02-11 */
(function(){
  eq("the superseded NFP date is the first Friday, 13:30Z (EST)", iso(NFP_FEB_RULE), "2026-02-06T13:30:00.000Z");
  eq("the corrected NFP date is a WEDNESDAY", new Date(NFP_FEB_REAL).getUTCDay(), 3);
  const feb=releasesBetween(U(2026,1,1,0,0),U(2026,1,28,23,59));
  const atRule=feb.filter(function(r){ return r.name==="NFP"&&r.t===NFP_FEB_RULE; });
  const atReal=feb.filter(function(r){ return r.name==="NFP"&&r.t===NFP_FEB_REAL; });
  eq("the rule-derived NFP at the superseded date is GONE, not duplicated", atRule.length, 0);
  eq("the corrected NFP is emitted exactly once", atReal.length, 1);
  eq("the corrected row is tagged src 'corrected', not 'rule'", atReal[0].src, "corrected");
  eq("the corrected row carries the date it superseded", atReal[0].was, NFP_FEB_RULE);
  eq("the corrected row carries the agency page it came from", atReal[0].ref,
     "https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm");
  eq("the corrected row keeps the base row's tier", atReal[0].tier, 1);
  eq("February still has exactly one NFP", feb.filter(function(r){ return r.name==="NFP"; }).length, 1);
  /* the tag is where this has to survive: a persisted row must show corrected, not generated */
  const t=eventTag(NFP_FEB_REAL-5*60000);
  ok("eventTag at the real NFP reads NFP, 5 min out, evSrc 'corrected'",
     t.ev==="NFP"&&t.evMins===5&&t.evTier===1&&t.evSrc==="corrected", JSON.stringify(t));
  ok("eventTag at the superseded date does NOT claim NFP", eventTag(NFP_FEB_RULE).ev!=="NFP",
     JSON.stringify(eventTag(NFP_FEB_RULE)));
  eq("nearestRelease reports the corrected instant, and the superseded one in `was`",
     (nearestRelease(NFP_FEB_REAL-60000)||{}).was, NFP_FEB_RULE);
  /* an exception may INSERT: the CPI reschedule has no base row at the original date, and
     dropping it for that reason would put a real CPI print back into the control pool */
  const cpi=feb.filter(function(r){ return r.name==="CPI"; });
  eq("the CPI reschedule is emitted even though it overrode nothing", cpi.length, 1);
  eq("the inserted CPI lands on the published date", iso(cpi[0].t), "2026-02-13T13:30:00.000Z");
  eq("the inserted CPI is tagged corrected", cpi[0].src, "corrected");
  eq("the inserted CPI inherits tier 1 from the other CPI rows (calMetaFor), not the tier-2 default", cpi[0].tier, 1);
  eq("the inserted CPI inherits kind scheduled-numeric", cpi[0].kind, "scheduled-numeric");
})();

/* ---- 16b. the exception pad: a correction moves a release across the query boundary ---- */
(function(){
  const onlyReal=releasesBetween(U(2026,1,11,0,0),U(2026,1,11,23,59));
  ok("a release generated OUTSIDE the queried range is pulled in by its correction",
     onlyReal.filter(function(r){ return r.name==="NFP"&&r.t===NFP_FEB_REAL; }).length===1, JSON.stringify(onlyReal));
  const onlyRule=releasesBetween(U(2026,1,6,0,0),U(2026,1,6,23,59));
  eq("and is no longer reported on the day it left", onlyRule.filter(function(r){ return r.name==="NFP"; }).length, 0);
  eq("a range strictly between the two dates holds neither",
     releasesBetween(U(2026,1,8,0,0),U(2026,1,9,23,59)).filter(function(r){ return r.name==="NFP"; }).length, 0);
  /* the pad is what lets a correction READ the row it is correcting when that row sits outside
     the queried range: without it the moved release still appears (an override is evidence in
     its own right) but silently picks up default metadata instead of the base row's. */
  const s=snap();
  const SRC="https://www.bls.gov/schedule/news_release/cpi.htm";
  RELEASES.DATED.push({name:"CPI",kind:"scheduled-numeric",tier:2,t:etToUtc(2026,3,1,8,30),src:SRC,retrieved:"2026-09-06"});
  RELEASES.EXCEPTIONS.push({name:"CPI",was:etToUtc(2026,3,1,8,30),t:etToUtc(2026,3,20,8,30),
    src:SRC,retrieved:"2026-09-06",note:"test: 19-day move, base row outside the queried range"});
  const moved=releasesBetween(U(2026,3,20,0,0),U(2026,3,20,23,59)).filter(function(r){ return r.name==="CPI"; });
  eq("the moved release is emitted in the range it moved into", moved.length, 1);
  eq("...and inherits the SUPERSEDED row's own tier, read across the generation pad", moved[0].tier, 2);
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
  const thu=etToUtc(2026,6,2,8,30);             /* Thu 2 Jul 2026 claims, rule-derived */
  eq("the claims print exists before suppression",
     releasesBetween(thu,thu).filter(function(r){ return r.name==="CLAIMS"; }).length, 1);
  RELEASES.EXCEPTIONS.push({name:"CLAIMS",was:thu,t:null,
    src:"https://www.bls.gov/schedule/news_release/",retrieved:"2026-09-06",note:"test: cancelled, not moved"});
  eq("t:null removes the release entirely",
     releasesBetween(thu,thu).filter(function(r){ return r.name==="CLAIMS"; }).length, 0);
  eq("a cancellation emits nothing anywhere near the old date",
     releasesBetween(thu-3*86400000,thu+3*86400000).filter(function(r){ return r.name==="CLAIMS"; }).length, 0);
  eq("and the tag goes quiet for it", eventTag(thu).ev==="CLAIMS", false);
  const a=calendarAudit().exceptions.filter(function(e){ return e.cancelled; });
  eq("the audit shows the cancellation as 'cancels', distinct from a move", a.length&&a[0].effect, "cancels");
  restore(s);
  ok("seed tables restored", seedIntact());
  eq("the claims print is back once the cancellation is removed",
     releasesBetween(thu,thu).filter(function(r){ return r.name==="CLAIMS"; }).length, 1);
})();

/* ---- 16d. a malformed EXCEPTIONS row is refused LOUDLY and changes nothing ----
   An override rewrites the calendar, so a broken one that silently did nothing would leave the
   rule-derived (wrong) date in place while the human believed it had been corrected. */
(function(){
  const s=snap();
  const thu=etToUtc(2026,6,2,8,30);
  const SRC="https://www.bls.gov/x", RET="2026-09-06";
  RELEASES.EXCEPTIONS.push({name:"CLAIMS",was:thu,src:SRC,retrieved:RET},                       /* 0 t omitted */
                           {name:"CLAIMS",was:thu,t:thu+86400000},                              /* 1 no src */
                           {name:"CLAIMS",was:thu,t:thu+86400000,src:SRC,retrieved:"6 Sep 2026"},/* 2 bad retrieved */
                           {name:"CLAIMS",was:thu,t:thu+90*86400000,src:SRC,retrieved:RET},     /* 3 shift too large */
                           {name:"",was:thu,t:thu,src:SRC,retrieved:RET},                       /* 4 no name */
                           {name:"CLAIMS",t:thu,src:SRC,retrieved:RET});                        /* 5 no was */
  const bad=calValidateExceptions();
  eq("calValidateExceptions surfaces all six malformed overrides", bad.length, 6);
  ok("an omitted t is diagnosed, and points at the cancellation form", bad[0].why.indexOf("t:null")>=0, bad[0].why);
  ok("a missing src is diagnosed as not checkable", bad[1].why.indexOf("not checkable")>=0, bad[1].why);
  ok("a malformed retrieved date is diagnosed", bad[2].why.indexOf("YYYY-MM-DD")>=0, bad[2].why);
  ok("an implausible shift is diagnosed", bad[3].why.indexOf("CAL_EXC_MAX_SHIFT_MS")>=0, bad[3].why);
  ok("a nameless override is diagnosed", bad[4].why.indexOf("name")>=0, bad[4].why);
  ok("a missing was is diagnosed", bad[5].why.indexOf("was")>=0, bad[5].why);
  eq("no malformed override touched the calendar",
     releasesBetween(thu,thu).filter(function(r){ return r.name==="CLAIMS"&&r.src==="rule"; }).length, 1);
  releasesBetween(thu,thu);
  eq("releasesBetween records the exception rejects in CAL_EXC_BAD", CAL_EXC_BAD.length, 6);
  eq("the two seeded overrides still applied alongside the rejects",
     releasesBetween(NFP_FEB_REAL,NFP_FEB_REAL).filter(function(r){ return r.src==="corrected"; }).length, 1);
  restore(s);
  releasesBetween(thu,thu);
  eq("CAL_EXC_BAD clears once the table is fixed", CAL_EXC_BAD.length, 0);
  eq("a cancellation (t:null) is NOT a fault", calExceptionRowFault({name:"X",was:thu,t:null,src:SRC,retrieved:RET}), null);
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
  eq("calMetaFor finds a RULE name", JSON.stringify(calMetaFor("NFP")), JSON.stringify({kind:"scheduled-numeric",tier:1}));
  eq("calMetaFor finds a DATED name", JSON.stringify(calMetaFor("FOMC")), JSON.stringify({kind:"scheduled-policy",tier:1}));
  eq("calMetaFor invents nothing for an unknown name", calMetaFor("ZZZ"), null);
})();

/* ---- 17. COVERAGE: what the table CLAIMS to know, as opposed to what it happens to hold ----
   This is the whole point of the upgrade. A timestamp with no matching release used to return
   the same all-null tag whether that meant "no release happened here" or "this unit has never
   been told about this period" - and the second one, recruited as a section 11.3 control, puts
   a real shock into the baseline it is being measured against. */
const JUN26=U(2026,5,1,12,0), MON26=U(2026,6,6,12,0);   /* a quiet Monday, > 24h from anything */
(function(){
  eq("COVERAGE is seeded with exactly one confirmed period", RELEASES.COVERAGE.length, 1);
  eq("...and it is the FOMC 2026 calendar, the only schedule confirmed complete", RELEASES.COVERAGE[0].name, "FOMC");
  const c=coverageAt(JUN26,"FOMC");
  ok("FOMC 2026 is inside declared coverage", c.covered&&c.entries.length===1, JSON.stringify(c));
  eq("the coverage entry names the page it was read from", c.entries[0].src,
     "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm");
  eq("the coverage entry carries the date a human read it", c.entries[0].retrieved, "2026-09-06");
  eq("FOMC 2025 is NOT covered", coverageAt(U(2025,5,1,12,0),"FOMC").covered, false);
  eq("FOMC 2027 is NOT covered", coverageAt(U(2027,5,1,12,0),"FOMC").covered, false);
  eq("coverage is inclusive at from", coverageAt(RELEASES.COVERAGE[0].from,"FOMC").covered, true);
  eq("coverage is inclusive at to", coverageAt(RELEASES.COVERAGE[0].to,"FOMC").covered, true);
  eq("one ms before from is outside", coverageAt(RELEASES.COVERAGE[0].from-1,"FOMC").covered, false);
  /* the load-bearing case: CPI HAS rows and has NO coverage */
  eq("CPI has verified rows but NO declared coverage - rows are not a claim of completeness",
     coverageAt(U(2026,7,12,12,30),"CPI").covered, false);
  eq("a name-scoped entry does not grant full-calendar coverage", coverageAt(JUN26).covered, false);
  /* pinned against a literal, not against the implementation asked the same question twice */
  eq("the unnamed (full-calendar) question returns the empty answer, not the FOMC entry",
     JSON.stringify(coverageAt(JUN26)), JSON.stringify({covered:false,entries:[]}));
  eq("...while the same instant IS covered under the name that was actually declared",
     coverageAt(JUN26,"FOMC").covered, true);
  /* [REGRESSION - nit] coverage bounds are ET-shaped, because every source page is. Date.UTC
     bounds made the 2026 claim reach five hours back into 2025 ET - an OVERCLAIM, and the
     expensive direction: an unentered release in that hour would have become an eligible
     control - while leaving the last five ET hours of 2026 uncovered. */
  eq("the 2026 claim starts at midnight ET, not midnight UTC", RELEASES.COVERAGE[0].from, etToUtc(2026,0,1,0,0));
  eq("...so it does NOT reach back into 2025 Eastern time", coverageAt(U(2026,0,1,0,0),"FOMC").covered, false);
  eq("...and the first ET instant of 2026 IS covered", coverageAt(etToUtc(2026,0,1,0,0),"FOMC").covered, true);
  eq("...and so is the last ET minute of 2026, which UTC bounds left out",
     coverageAt(etToUtc(2026,11,31,23,59),"FOMC").covered, true);
  eq("the audit renders those bounds as the ET dates they describe",
     calEtDateIso(RELEASES.COVERAGE[0].from)+".."+calEtDateIso(RELEASES.COVERAGE[0].to), "2026-01-01..2026-12-31");
  eq("an unusable timestamp is never covered", coverageAt(null,"FOMC").covered, false);
  eq("an unusable timestamp returns no entries", coverageAt(new Date(JUN26),"FOMC").entries.length, 0);
  ok("a non-string name is a caller bug and throws", isErr(threw(function(){ coverageAt(JUN26,7); }),"TypeError"),
     threwName(function(){ coverageAt(JUN26,7); }));
})();

/* ---- 17b. a "*" period covers every name; a malformed coverage row covers nothing ---- */
/* A full-calendar declaration, built the way FILLING.md now requires: ET-shaped bounds (a "2026"
   source page means 2026 in New York) and an explicit vouch for every rule series in force. */
function starRow(rules,from,to){
  return {name:"*",from:(from===undefined?etToUtc(2026,0,1,0,0):from),
          to:(to===undefined?etToUtc(2026,11,31,23,59)+59999:to),rules:rules,
          src:"https://example.invalid/verified-2026-calendar",retrieved:"2026-09-06"};
}
/* A vouch is a SIGNATURE ON A GENERATOR SPECIFICATION (R1), so these are written out as
   LITERALS rather than copied from RELEASES.RULE at run time. Both halves of that are
   deliberate: it is what a human filling the table actually does - copy out the row you read
   the schedule against - and it means an edit to RELEASES.RULE takes this suite RED instead of
   quietly re-signing itself, which is the whole property R1 is about. */
const SPEC_NFP={name:"NFP",kind:"scheduled-numeric",tier:1,et:[8,30],rule:"first-friday-of-month"};
const SPEC_CLAIMS={name:"CLAIMS",kind:"scheduled-numeric",tier:2,et:[8,30],rule:"every-thursday"};
const SPEC_PPI={name:"PPI",kind:"scheduled-numeric",tier:2,et:[8,30],rule:"every-monday"};
const STAR=starRow([SPEC_NFP,SPEC_CLAIMS]);
eq("the vouch literals in this suite are the rule rows the unit actually ships",
   RELEASES.RULE.map(function(r){ return calRuleSpecKey(r); }).join(" | "),
   [SPEC_NFP,SPEC_CLAIMS].map(function(r){ return calRuleSpecKey(r); }).join(" | "));
(function(){
  const s=snap();
  RELEASES.COVERAGE.push(STAR);
  eq("a '*' entry answers the full-calendar question", coverageAt(JUN26).covered, true);
  eq("a '*' entry also covers every named release", coverageAt(JUN26,"CPI").covered, true);
  restore(s);
  eq("removing it takes the claim away again", coverageAt(JUN26).covered, false);
  RELEASES.COVERAGE.push({name:"*",from:U(2026,0,1),to:U(2026,11,31)},                            /* 0 no src */
                         {name:"*",from:U(2026,0,1),to:U(2026,11,31),src:"u",retrieved:"soon"},   /* 1 bad retrieved */
                         {name:"*",from:U(2026,11,31),to:U(2026,0,1),src:"u",retrieved:"2026-09-06"}, /* 2 from>to */
                         {name:"*",from:"2026",to:U(2026,11,31),src:"u",retrieved:"2026-09-06"});     /* 3 from not ms */
  const bad=calValidateCoverage();
  eq("calValidateCoverage surfaces all four malformed claims", bad.length, 4);
  ok("a sourceless coverage claim is diagnosed as not checkable", bad[0].why.indexOf("not checkable")>=0, bad[0].why);
  ok("a malformed retrieved date is diagnosed", bad[1].why.indexOf("YYYY-MM-DD")>=0, bad[1].why);
  ok("an inverted period is diagnosed", bad[2].why.indexOf("after")>=0, bad[2].why);
  ok("a non-ms bound is diagnosed", bad[3].why.indexOf("epoch ms")>=0, bad[3].why);
  eq("NONE of the four malformed claims grants coverage", coverageAt(JUN26).covered, false);
  eq("coverageAt refreshes CAL_COVERAGE_BAD so the UI can show it", CAL_COVERAGE_BAD.length, 4);
  restore(s);
  coverageAt(JUN26);
  eq("CAL_COVERAGE_BAD clears once the table is fixed", CAL_COVERAGE_BAD.length, 0);
  eq("calCoverageRowFault passes a good row", calCoverageRowFault(STAR), null);
  ok("seed tables restored", seedIntact());
})();

/* ---- 17c. calCoverageSpan: a claim must span the WHOLE band, and gaps are never bridged ---- */
(function(){
  const s=snap();
  RELEASES.COVERAGE.push({name:"*",from:MON26-10*60000,to:MON26+10*60000,rules:[SPEC_NFP,SPEC_CLAIMS],
                          src:"https://example.invalid/narrow",retrieved:"2026-09-06"});
  eq("the instant itself is covered", coverageAt(MON26).covered, true);
  eq("but a +/-45 min band is NOT inside that narrow claim",
     calCoverageSpan(MON26-45*60000,MON26+45*60000).covered, false);
  restore(s);
  /* two abutting periods must not be silently unioned - a gap between confirmations is a gap */
  RELEASES.COVERAGE.push({name:"*",from:U(2026,0,1),to:MON26,rules:[SPEC_NFP,SPEC_CLAIMS],src:"https://example.invalid/a",retrieved:"2026-09-06"},
                         {name:"*",from:MON26+1,to:U(2026,11,31),rules:[SPEC_NFP,SPEC_CLAIMS],src:"https://example.invalid/b",retrieved:"2026-09-06"});
  eq("each half is covered on its own side", coverageAt(MON26).covered&&coverageAt(MON26+1).covered, true);
  eq("a span crossing the seam is reported uncovered, not unioned",
     calCoverageSpan(MON26-60000,MON26+60000).covered, false);
  restore(s);
  eq("calCoverageSpan refuses an inverted span rather than answering", calCoverageSpan(MON26+1,MON26).covered, false);
  eq("calCoverageSpan refuses a non-numeric span", calCoverageSpan("a",MON26).covered, false);
  ok("seed tables restored", seedIntact());
})();

/* ---- 18. eventTag.evCov: the two kinds of silence are no longer the same answer ---- */
(function(){
  const s=snap();
  const q=eventTag(MON26);
  ok("outside coverage a quiet window reports evCov false = UNKNOWN, not quiet",
     q.ev===null&&q.evCov===false, JSON.stringify(q));
  RELEASES.COVERAGE.push(STAR);
  const k=eventTag(MON26);
  ok("inside coverage the same instant reports evCov true = genuinely NO RELEASE HERE",
     k.ev===null&&k.evCov===true, JSON.stringify(k));
  eq("the two silences are now distinguishable in the persisted tag", q.evCov===k.evCov, false);
  eq("a real release inside coverage still tags normally", eventTag(NFP_FEB_REAL-5*60000).evCov, true);
  restore(s);
  eq("a real release OUTSIDE coverage is still a real release (evCov is not a confidence flag on ev)",
     eventTag(NFP_FEB_REAL-5*60000).ev, "NFP");
  eq("...and its evCov honestly reads false", eventTag(NFP_FEB_REAL-5*60000).evCov, false);
  eq("an unusable timestamp says nothing at all, evCov included", eventTag(null).evCov, null);
  eq("...and that is still the all-null tag", JSON.stringify(eventTag(0)),
     JSON.stringify({ev:null,evMins:null,evTier:null,evSrc:null,evCov:null}));
  ok("the fifth key keeps the tag small enough to persist per row",
     JSON.stringify(eventTag(MON26)).length<80, JSON.stringify(eventTag(MON26)));
  ok("seed tables restored", seedIntact());
})();

/* ---- 19. controlEligible: the guard that makes COVERAGE load-bearing ----
   CLAUDE.md 11.3 control selection MUST call this. Without it an uncovered window passes the
   slot/weekday/quarter match, looks quiet because this unit has no row for it, and drags a real
   shock into the control group - biasing every difference-in-differences estimate toward zero. */
(function(){
  const s=snap();
  eq("an unusable timestamp is not a control", controlEligible(null).reason, "bad-timestamp");
  eq("...and is not eligible", controlEligible(null).eligible, false);
  const u=controlEligible(MON26);
  ok("a quiet window in an UNDECLARED period is refused as a control", u.eligible===false&&u.reason==="unknown-coverage",
     JSON.stringify(u));
  RELEASES.COVERAGE.push(STAR);
  const g=controlEligible(MON26);
  ok("the same window inside declared coverage is eligible", g.eligible===true&&g.reason==="ok", JSON.stringify(g));
  const near=controlEligible(NFP_FEB_REAL-30*60000);
  ok("a window 30 min from a release is refused even inside coverage",
     near.eligible===false&&near.reason==="release-nearby", JSON.stringify(near));
  eq("the exclusion band is CAL_CONTROL_EXCL_MIN minutes (window + two windows either side)", CAL_CONTROL_EXCL_MIN, 45);
  eq("exactly 45 min out is still excluded", controlEligible(NFP_FEB_REAL-45*60000).reason, "release-nearby");
  eq("46 min out clears the band", controlEligible(NFP_FEB_REAL-46*60000).reason, "ok");
  eq("the band applies after a release too", controlEligible(NFP_FEB_REAL+20*60000).reason, "release-nearby");
  /* a CORRECTED release must exclude its window - this is the contamination case in one line */
  eq("the window that actually held the moved NFP is excluded by the correction",
     controlEligible(NFP_FEB_REAL+5*60000).reason, "release-nearby");
  eq("the window it would have been in under the rule is NOT excluded, because nothing happened there",
     controlEligible(NFP_FEB_RULE+5*60000).reason, "ok");
  /* a broken table means the calendar cannot be trusted to be complete even where it claims to be */
  RELEASES.DATED.push({name:"PPI",tier:1,t:"2026-07-14T12:30:00Z"});
  const b=controlEligible(MON26);
  ok("a malformed DATED row disqualifies every control until it is fixed",
     b.eligible===false&&b.reason==="table-errors", JSON.stringify(b));
  restore(s);
  RELEASES.COVERAGE.push(STAR);
  RELEASES.EXCEPTIONS.push({name:"CPI",was:MON26,t:MON26});   /* no src/retrieved */
  eq("a malformed EXCEPTIONS row does too", controlEligible(MON26).reason, "table-errors");
  restore(s);
  eq("with coverage restored to what is actually confirmed, nothing is eligible again",
     controlEligible(MON26).reason, "unknown-coverage");
  /* the shipped state, stated as an assertion so nobody mistakes it for a bug */
  let elig=0;
  for(let d=0;d<365;d+=7) if(controlEligible(U(2026,0,1,12,0)+d*86400000).eligible) elig++;
  eq("AS SHIPPED, no window anywhere in 2026 is a usable control - the table is 5% full, honestly", elig, 0);
  ok("seed tables restored", seedIntact());
})();

/* ---- 20. calendarAudit: one call, and a human can see how empty the calendar is ---- */
(function(){
  const a=calendarAudit();
  eq("audit counts the DATED rows", a.datedRows, 10);
  eq("audit rejects nothing in the seeded table", a.datedRejected, 0);
  eq("audit names what is in the table", JSON.stringify(a.datedNames),
     JSON.stringify([{name:"FOMC",count:8},{name:"CPI",count:2}]));
  eq("audit counts unsourced rows (none: every seeded row carries its page)", a.datedUnsourced, 0);
  eq("audit lists the rule series", a.ruleSeries.map(function(r){ return r.name; }).join(","), "NFP,CLAIMS");
  eq("audit counts the overrides", a.exceptionRows, 2);
  eq("audit says which override actually overrides something", a.exceptions[0].effect, "overrides");
  eq("audit says which one is an insertion", a.exceptions[1].effect, "inserts");
  eq("audit totals the insertions", a.exceptionsInserting, 1);
  eq("audit reports declared coverage", a.coverage.length, 1);
  eq("audit renders the coverage period readably", a.coverage[0].fromIso+".."+a.coverage[0].toIso, "2026-01-01..2026-12-31");
  eq("audit carries the coverage source", a.coverage[0].src, "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm");
  eq("audit reports ZERO days of full-calendar coverage", a.fullCoverageDays, 0);
  eq("audit states plainly that no control window is possible yet", a.controlWindowsPossible, false);
  ok("audit lists every release type with no coverage at all",
     ["CPI","PPI","PCE","GDP","NFP","CLAIMS","ISM","RETAIL"].every(function(n){ return a.uncoveredNames.indexOf(n)>=0; }),
     a.uncoveredNames.join(","));
  eq("...and does not list the one type that IS covered", a.uncoveredNames.indexOf("FOMC"), -1);
  ok("audit renders as text a human can eyeball", typeof a.text==="string"&&a.text.split("\n").length>=7, a.text);
  ok("the text says out loud that no window is a usable control", a.text.indexOf("NONE")>=0, a.text);
  ok("...and reports coverage by name as PERIODS rather than as a tick",
     a.text.indexOf("COVERAGE BY NAME (a claim covers a PERIOD, never \"always\")")>=0, a.text);
  console.log(a.text.split("\n").map(function(l){ return "      | "+l; }).join("\n"));
})();

/* ---- 20b. the audit is what makes a broken or unsourced table visible ---- */
(function(){
  const s=snap();
  RELEASES.DATED.push({name:"PPI",tier:1,t:NaN});
  RELEASES.DATED.push({name:"PPI",kind:"scheduled-numeric",tier:1,t:etToUtc(2026,6,15,8,30)});  /* no src */
  const a=calendarAudit();
  eq("audit counts the malformed row as rejected", a.datedRejected, 1);
  eq("audit still counts the valid rows", a.datedValid, 11);
  eq("audit counts the row with no agency source", a.datedUnsourced, 1);
  ok("audit names the malformed row's fault", a.datedBad[0].why.length>0, JSON.stringify(a.datedBad));
  ok("the rejected count appears in the human text", a.text.indexOf("1 rejected")>=0, a.text);
  restore(s);
  const b=calendarAudit();
  eq("audit is clean again after restore", b.datedRejected+b.datedUnsourced, 0);
  RELEASES.COVERAGE.push(STAR);
  const c=calendarAudit();
  eq("declaring a '*' period is what makes control windows possible", c.controlWindowsPossible, true);
  eq("...and the audit counts its days", c.fullCoverageDays, 365);
  /* [D1] a "*" claim is only as good as the rule rows inside it, and those are GENERATED.
     11 rule-derived NFP (12 first-Fridays, one superseded by the BLS correction) + 53 claims
     Thursdays = 64 dates in that period that nobody read off a page. */
  eq("...and says how many of its dates are INFERRED rather than read off a page", c.coverage[1].ruleDerivedRows, 64);
  ok("...in the text, so the exposure is visible before anyone trusts the claim",
     c.text.indexOf("rests on 64 rule-derived (inferred) dates")>=0, c.text);
  ok("...along with which rule series it vouches for", c.text.indexOf("vouched: NFP, CLAIMS")>=0, c.text);
  restore(s);
  ok("seed tables restored", seedIntact());
})();


/* ---- 22. [REGRESSION - D2] a chained correction can no longer leave a phantom release ----
   calApplyExceptions walked EXCEPTIONS in array order applying each row once, and emission is
   unconditional, so an exception whose `was` pointed at an instant produced by a LATER row never
   removed it. A two-step reschedule (X -> Y, then Y -> Z - the shape an agency produces when it
   revises a date it has already revised) emitted BOTH Y and Z in one order and only Z in the
   other. The Y row is a release that never happened, sitting beside the real one, in a unit whose
   header says DO NOT GUESS A DATE - and calendarAudit() reported exceptionsRejected: 0. */
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

/* ---- 23. [REGRESSION - D3] evCov no longer promises what it does not check ----
   Its doc block said evCov===true meant the window was usable as a section 11.3 control, but it
   applied none of controlEligible's checks. The sharp case is a rejected EXCEPTIONS row: drop
   `retrieved` from the seeded NFP correction and the correction stops applying, so the REAL
   2026-02-11 payrolls print vanishes from the calendar entirely - a validation failure whose
   failure direction is DELETION, while the window that held it still read "genuinely quiet". */
(function(){
  const s=snap();
  RELEASES.COVERAGE.push(STAR);
  const near=eventTag(NFP_FEB_REAL-5*60000);
  ok("evCov true does NOT mean control-eligible: 5 minutes from a release it is still true",
     near.evCov===true&&controlEligible(NFP_FEB_REAL-5*60000).eligible===false,
     JSON.stringify(near)+" "+JSON.stringify(controlEligible(NFP_FEB_REAL-5*60000)));
  /* now break the correction exactly as the reviewer did */
  RELEASES.EXCEPTIONS[0]={name:"NFP",was:NFP_FEB_RULE,t:NFP_FEB_REAL,
                          src:"https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm"};
  eq("the rejected correction really does stop applying - the real print is gone from the calendar",
     releasesBetween(U(2026,1,1,0,0),U(2026,1,28,23,59)).filter(function(r){ return r.name==="NFP"; })
       .map(function(r){ return iso(r.t)+"/"+r.src; }).join(" "), iso(NFP_FEB_RULE)+"/rule");
  eq("but the window that HELD it can no longer read as quiet: evCov is false",
     eventTag(NFP_FEB_REAL-5*60000).evCov, false);
  eq("...and controlEligible refuses it for the same reason", controlEligible(NFP_FEB_REAL-5*60000).reason, "table-errors");
  eq("the refusal covers the whole declared period, not just that window", controlEligible(MON26).reason, "table-errors");
  eq("evCov and controlEligible now agree about the broken table", eventTag(MON26).evCov, false);
  eq("the tables report themselves unusable", calTablesUsable(), false);
  const a=calendarAudit();
  eq("the audit says so in the object", a.tablesUsable, false);
  ok("...and shouts it in the human text, in the deletion's own terms",
     a.text.indexOf("TABLES REJECTED")>=0&&a.text.indexOf("does NOT emit")>=0, a.text);
  eq("...and no control window is possible while it stands", a.controlWindowsPossible, false);
  restore(s);
  RELEASES.COVERAGE.push(STAR);
  eq("fixing the row restores both the release and the coverage reading",
     eventTag(NFP_FEB_REAL-5*60000).evCov, true);
  /* the DATED case the reviewer tabulated: it used to read evCov true / controlEligible table-errors */
  RELEASES.DATED.push({name:"PPI",tier:1,t:"2026-07-14T12:30:00Z"});
  eq("a malformed DATED row drives evCov false as well", eventTag(MON26).evCov, false);
  eq("...matching controlEligible exactly", controlEligible(MON26).reason, "table-errors");
  restore(s);
  RELEASES.RULE.push({name:"PPI",tier:2,rule:"every-monday"});      /* underspecified: no kind/et */
  RELEASES.COVERAGE.push(STAR);
  eq("a rejected RULE row - a whole missing series - drives evCov false too", eventTag(MON26).evCov, false);
  restore(s);
  eq("an unusable timestamp still says nothing at all", eventTag(null).evCov, null);
  eq("the tag is still exactly five keys", Object.keys(eventTag(MON26)).join(","), "ev,evMins,evTier,evSrc,evCov");
  ok("seed tables restored", seedIntact());
})();

/* ---- 24. [REGRESSION - D1] a "*" declaration must VOUCH for the rule series in force ----
   Coverage as built protected against a MISSING DATED ROW. It said nothing about a WRONG RULE
   ROW, and calRuleRows is a generator that can be confidently wrong: BLS moves initial claims to
   Wednesday in weeks containing a Thursday federal holiday. src:"rule" marks the row the rule
   EMITS - it cannot mark the window the rule GOT WRONG, and that window is precisely the one
   that enters the control group. Reproduced at Thanksgiving 2026: with a bare "*" over 2026,
   controlEligible at the REAL Wednesday claims print returned {eligible:true, reason:"ok"} while
   the FICTIONAL Thursday slot was excluded - a real release recruited as a quiet control. */
const TUE26=U(2026,6,7,12,0);                      /* Tue 7 Jul 2026, quiet under every rule here */
const CLAIMS_THX_RULE=etToUtc(2026,10,26,8,30);    /* Thanksgiving Thursday - what every-thursday emits */
const CLAIMS_THX_REAL=etToUtc(2026,10,25,8,30);    /* the Wednesday BLS actually publishes that week */
(function(){
  const s=snap();
  const thx=new Date(CLAIMS_THX_RULE-usEasternOffsetMinutes(CLAIMS_THX_RULE)*60000);
  ok("2026-11-26 is the fourth Thursday of November - Thanksgiving",
     thx.getUTCMonth()===10&&thx.getUTCDate()===26&&thx.getUTCDay()===4, iso(CLAIMS_THX_RULE));
  eq("the rule confidently emits claims on the holiday itself",
     releasesBetween(CLAIMS_THX_RULE,CLAIMS_THX_RULE).map(function(r){ return r.name+"/"+r.src; }).join(","), "CLAIMS/rule");
  eq("...and reports nothing at all on the Wednesday the print actually landed",
     releasesBetween(CLAIMS_THX_REAL,CLAIMS_THX_REAL).length, 0);
  /* THE DEFECT, in one line: this used to be {eligible:true, reason:"ok"} */
  RELEASES.COVERAGE.push(starRow([SPEC_NFP]));     /* signs NFP; says nothing about CLAIMS */
  const real=controlEligible(CLAIMS_THX_REAL);
  ok("a '*' period that does not vouch for the CLAIMS rule cannot supply that window as a control",
     real.eligible===false&&real.reason==="unvouched-rule", JSON.stringify(real));
  eq("the refusal is period-wide, not a special case for the holiday", controlEligible(TUE26).reason, "unvouched-rule");
  eq("calCoverageVouchGap names the series nobody checked",
     calCoverageVouchGap(RELEASES.COVERAGE[1]).join(","), "CLAIMS");
  eq("the audit prints the gap where a human declaring coverage will read it",
     calendarAudit().text.indexOf("NOT VOUCHED: CLAIMS")>=0, true);
  restore(s);
  /* Vouching is the human attestation that the published schedule was read for that period and
     every deviation is in EXCEPTIONS. With the deviation entered, the calendar is right BOTH
     ways round - which is what the vouch is claiming, and why the burden belongs there. */
  RELEASES.COVERAGE.push(STAR);
  RELEASES.EXCEPTIONS.push({name:"CLAIMS",was:CLAIMS_THX_RULE,t:CLAIMS_THX_REAL,
    src:"https://www.dol.gov/ui/data.pdf",retrieved:"2026-09-06",note:"test: Thanksgiving week, claims moved to Wednesday"});
  eq("with the deviation entered, the window that held the REAL print is excluded",
     controlEligible(CLAIMS_THX_REAL).reason, "release-nearby");
  eq("...and the window the rule invented becomes usable, because nothing happened there",
     controlEligible(CLAIMS_THX_RULE).reason, "ok");
  restore(s);
  /* a vouch cannot be inherited by a series added after it was written */
  RELEASES.COVERAGE.push(starRow([SPEC_NFP,SPEC_CLAIMS]));
  eq("a fully vouched period is eligible", controlEligible(TUE26).reason, "ok");
  RELEASES.RULE.push({name:"PPI",kind:"scheduled-numeric",tier:2,et:[8,30],rule:"every-monday"});
  eq("adding a rule series invalidates the older vouch instead of being carried by it",
     controlEligible(TUE26).reason, "unvouched-rule");
  RELEASES.COVERAGE[1].rules=[SPEC_NFP,SPEC_CLAIMS,SPEC_PPI];
  eq("...and signing it restores eligibility, once a human says they checked it",
     controlEligible(TUE26).reason, "ok");
  restore(s);
  /* vouches are never combined across entries, for the same reason periods are never unioned */
  RELEASES.COVERAGE.push(starRow([SPEC_NFP]),starRow([SPEC_CLAIMS]));
  eq("two half-vouches do not add up to a whole one", controlEligible(TUE26).reason, "unvouched-rule");
  restore(s);
  /* shape: a "*" row with no vouch at all is a rejected row and grants nothing */
  RELEASES.COVERAGE.push({name:"*",from:etToUtc(2026,0,1,0,0),to:etToUtc(2026,11,31,23,59)+59999,
                          src:"https://example.invalid/x",retrieved:"2026-09-06"});
  const bad=calValidateCoverage();
  eq("a '*' claim with no rules field at all is rejected", bad.length, 1);
  ok("...and the reject says what the vouch is for", bad[0].why.indexOf("WRONG RULE row")>=0, bad[0].why);
  eq("...and grants no coverage whatsoever", coverageAt(TUE26).covered, false);
  restore(s);
  eq("rules is optional on a NAME-scoped row, which grants no controls either way",
     calCoverageRowFault({name:"CPI",from:U(2026,0,1),to:U(2026,1,1),src:"u",retrieved:"2026-09-06"}), null);
  /* [R1] the shape itself: a vouch is a signature on a GENERATOR SPECIFICATION, so a bare name
     is refused outright rather than accepted for compatibility. A name cannot see the row it
     names being edited, deleted, or joined by a second one - the three reproductions below. */
  ok("a bare NAME is refused, and the reject says why a name cannot do the job",
     (calCoverageRowFault(starRow(["NFP"]))||"").indexOf("cannot tell whether that row has since been edited")>=0,
     calCoverageRowFault(starRow(["NFP"])));
  ok("...and a name-shaped vouch therefore grants nothing at all",
     (function(){ const q=snap(); RELEASES.COVERAGE.push(starRow(["NFP","CLAIMS"]));
                  const r=coverageAt(TUE26).covered; restore(q); return r; })()===false);
  ok("a malformed signature is diagnosed with the rule-row validator's own words",
     (calCoverageRowFault(starRow([7]))||"").indexOf("not a usable rule specification")>=0, calCoverageRowFault(starRow([7])));
  ok("a signature the generator could not actually run is refused too",
     (calCoverageRowFault(starRow([{name:"X",kind:"scheduled-numeric",tier:1,et:[8,30],rule:"twice-a-fortnight"}]))||"")
       .indexOf("not a form this unit can generate")>=0,
     calCoverageRowFault(starRow([{name:"X",kind:"scheduled-numeric",tier:1,et:[8,30],rule:"twice-a-fortnight"}])));
  eq("calRuleSeriesNames reports the names a human fixes", calRuleSeriesNames().join(","), "NFP,CLAIMS");
  eq("calRuleSeriesSpecs reports the specifications a vouch is checked against - one per ROW",
     calRuleSeriesSpecs().map(function(r){ return calRuleSpecLabel(r); }).join(" | "),
     "NFP (first-friday-of-month, 08:30 ET, tier 1, scheduled-numeric) | CLAIMS (every-thursday, 08:30 ET, tier 2, scheduled-numeric)");

  /* ============================ [REGRESSION - R1a] ============================
     EDIT a vouched rule row in place. The signature was TRUE when it was written; the edit
     redirects the generator, so the window holding the REAL every-Thursday print reads quiet
     while the fictional Wednesday is excluded - D1's exact asymmetry, restored. Under a
     name-shaped vouch this returned {eligible:true, reason:"ok"} with an empty vouch gap,
     tablesUsable true and controlWindowsPossible true. */
  const THU=etToUtc(2026,5,18,8,30);          /* Thu 18 Jun 2026 08:30 ET - an ordinary claims Thursday */
  RELEASES.COVERAGE.push(STAR);
  eq("[R1a] before the edit the claims Thursday is busy, as the signed generator says",
     controlEligible(THU).reason, "release-nearby");
  RELEASES.RULE[1]={name:"CLAIMS",kind:"scheduled-numeric",tier:2,et:[8,30],rule:"every-wednesday"};
  eq("[R1a] the edit really does move the generator off the real print's day",
     releasesBetween(THU,THU).length, 0);
  const a1=controlEligible(THU);
  ok("[R1a] editing a vouched row's CADENCE refuses instead of admitting that window as a control",
     a1.eligible===false&&a1.reason==="unvouched-rule", JSON.stringify(a1));
  ok("[R1a] the audit says the SIGNATURE DOES NOT MATCH - different words from an unvouched series",
     calendarAudit().text.indexOf("SIGNATURE DOES NOT MATCH: CLAIMS (every-wednesday")>=0, calendarAudit().text);
  eq("[R1a] ...and no window anywhere in the declared period is possible", calendarAudit().controlWindowsPossible, false);
  eq("[R1a] ...and the tag stops calling that window quiet as well", eventTag(THU).evCov, false);
  restore(s);
  RELEASES.COVERAGE.push(STAR);
  RELEASES.RULE[1]={name:"CLAIMS",kind:"scheduled-numeric",tier:2,et:[10,0],rule:"every-thursday"};
  const a2=controlEligible(THU);
  ok("[R1a] editing a vouched row's PUBLICATION TIME refuses too - et is part of what was signed",
     a2.eligible===false&&a2.reason==="unvouched-rule", JSON.stringify(a2));
  restore(s);
  RELEASES.COVERAGE.push(STAR);
  RELEASES.RULE[1]={name:"CLAIMS",kind:"scheduled-policy",tier:1,et:[8,30],rule:"every-thursday"};
  eq("[R1a] kind and tier are signed too: they are what the emitted row SAYS the release is, and H3 splits on kind",
     controlEligible(TUE26).reason, "unvouched-rule");
  restore(s);

  /* ============================ [REGRESSION - R1b] ============================
     REMOVE a vouched rule row - the move FILLING.md itself invites ("if you have to squint at
     it, it belongs in DATED"). The series stops being generated entirely: ~52 real windows a
     year become eligible controls, and the stale name in `rules` still read as a COMPLETE
     vouch, because `need` shrank with it. This is the deletion direction, which NOTES.md
     already calls the worst available failure direction. */
  RELEASES.COVERAGE.push(STAR);
  RELEASES.RULE.splice(1,1);                  /* CLAIMS deleted; the signature stays behind */
  eq("[R1b] the deleted series really does stop generating", releasesBetween(THU,THU).length, 0);
  const b1=controlEligible(THU);
  ok("[R1b] a signature for a series that is no longer in force refuses instead of reading as complete",
     b1.eligible===false&&b1.reason==="stale-vouch", JSON.stringify(b1));
  eq("[R1b] the vouch GAP is empty here - which is exactly why a gap check alone could not see this",
     calCoverageVouchGap(RELEASES.COVERAGE[1]).length, 0);
  eq("[R1b] ...so the refusal comes from the stale signature, named on its own", calCoverageStaleVouch(RELEASES.COVERAGE[1]).length, 1);
  ok("[R1b] the audit calls it STALE VOUCH, in different words again",
     calendarAudit().text.indexOf("STALE VOUCH: CLAIMS (every-thursday")>=0, calendarAudit().text);
  eq("[R1b] ...and stops claiming that control windows are possible", calendarAudit().controlWindowsPossible, false);
  eq("[R1b] ...and the persisted tag no longer records a deleted series' window as quiet", eventTag(THU).evCov, false);
  restore(s);

  /* ============================ [REGRESSION - R1c] ============================
     ADD a second row under an ALREADY-VOUCHED name. calRuleSeriesNames de-duplicates by name,
     so a name-shaped vouch saw nothing at all: a new generator, nobody checked, covered by a
     signature written against a different row. */
  RELEASES.COVERAGE.push(starRow([SPEC_NFP,SPEC_CLAIMS]));   /* a fresh row: STAR is shared and must not be mutated */
  RELEASES.RULE.push({name:"CLAIMS",kind:"scheduled-numeric",tier:2,et:[8,30],rule:"every-wednesday"});
  eq("[R1c] the second row really is a second generator", calRuleSeriesSpecs().length, 3);
  eq("[R1c] ...while the NAME set is unchanged, which is what the old vouch compared", calRuleSeriesNames().join(","), "NFP,CLAIMS");
  const c1=controlEligible(TUE26);
  ok("[R1c] a second generator under a vouched name is not covered by the older signature",
     c1.eligible===false&&c1.reason==="unvouched-rule", JSON.stringify(c1));
  RELEASES.COVERAGE[1].rules=[SPEC_NFP,SPEC_CLAIMS,{name:"CLAIMS",kind:"scheduled-numeric",tier:2,et:[8,30],rule:"every-wednesday"}];
  eq("[R1c] ...and signing BOTH rows is what restores it", controlEligible(TUE26).reason, "ok");
  restore(s);

  /* the signature machinery is prototype-safe and duplicate-tolerant, like the rest of the unit */
  RELEASES.RULE.push({name:"__proto__",kind:"scheduled-numeric",tier:2,et:[9,0],rule:"every-monday"});
  RELEASES.COVERAGE.push(starRow([SPEC_NFP,SPEC_CLAIMS]));   /* a fresh row: STAR is shared and must not be mutated */
  eq("a series named '__proto__' has to be signed like any other, not swallowed by Object.prototype",
     controlEligible(TUE26).reason, "unvouched-rule");
  RELEASES.COVERAGE[1].rules=[SPEC_NFP,SPEC_CLAIMS,{name:"__proto__",kind:"scheduled-numeric",tier:2,et:[9,0],rule:"every-monday"}];
  eq("...and signing it is what restores eligibility", controlEligible(TUE26).reason, "ok");
  restore(s);
  RELEASES.COVERAGE.push(starRow([SPEC_NFP,SPEC_NFP,SPEC_CLAIMS]));
  eq("a signature written twice is harmless - the check is set equality, not a count",
     controlEligible(TUE26).reason, "ok");
  RELEASES.COVERAGE[1].rules=[SPEC_NFP,SPEC_NFP,SPEC_CLAIMS,SPEC_PPI];
  eq("...but one stale signature among the duplicates still refuses", controlEligible(TUE26).reason, "stale-vouch");
  restore(s);

  /* One edge the first vouch created was pinned as DELIBERATE: "vouching for a name that is not
     a rule series neither grants nor withholds anything". The second review showed that surplus
     name is the same bytes as the residue of a DELETED series (R1b), and the unit was resolving
     that ambiguity in the direction that admits real releases as controls. It now refuses. */
  RELEASES.COVERAGE.push(starRow([SPEC_NFP,SPEC_CLAIMS,SPEC_PPI]));
  const surplus=controlEligible(TUE26);
  ok("a signature for a series NOT in force is no longer harmless surplus - it refuses as stale",
     surplus.eligible===false&&surplus.reason==="stale-vouch", JSON.stringify(surplus));
  restore(s);
  /* This edge survives, and for the same reason as before: with NO generator there is nothing to
     sign, every release in the period must have been hand-entered, and rules:[] is complete. */
  RELEASES.RULE.length=0;
  RELEASES.COVERAGE.push(starRow([]));
  eq("with no rule series in force there is nothing to vouch for, and rules:[] is complete",
     controlEligible(TUE26).reason, "ok");
  eq("...and an empty RULE table is not itself a table error - it generates nothing, honestly",
     calValidateRule().length, 0);
  eq("...so the only releases left are the hand-entered ones", calRuleSeriesNames().length, 0);
  restore(s);
  RELEASES.RULE.length=0;
  RELEASES.COVERAGE.push(starRow([SPEC_NFP]));
  eq("...but a signature left behind after the table was emptied still refuses",
     controlEligible(TUE26).reason, "stale-vouch");
  restore(s);
  eq("AS SHIPPED there is still no '*' entry at all, vouched or otherwise",
     RELEASES.COVERAGE.filter(function(c){ return c.name==="*"; }).length, 0);
  ok("seed tables restored", seedIntact());
})();

/* ---- 25. [REGRESSION - D4] the generator and the audit can no longer disagree ----
   calRuleRows() hardcoded both series and never read RELEASES.RULE, while calendarAudit()
   reported the table. A maintainer could add {name:"PPI", rule:"every-monday"}, see PPI in the
   audit, receive zero PPI rows, and then declare coverage over a release type that generates
   nothing - the "coverage without rows" lie in FILLING.md, arrived at by following the audit. */
(function(){
  const s=snap();
  RELEASES.RULE.push({name:"PPI",kind:"scheduled-numeric",tier:2,et:[8,30],rule:"every-monday"});
  const got=releasesBetween(U(2026,6,6,0,0),U(2026,6,12,23,59)).filter(function(r){ return r.name==="PPI"; });
  eq("a series added to RELEASES.RULE now generates rows (it used to generate none)", got.length, 1);
  eq("...at the ET publication time the table gives", iso(got[0].t), "2026-07-06T12:30:00.000Z");
  eq("...and carries the table's own tier", got[0].tier, 2);
  eq("...and the audit reports exactly the series the generator emitted",
     calendarAudit().ruleSeries.map(function(r){ return r.name; }).join(","), "NFP,CLAIMS,PPI");
  restore(s);
  RELEASES.RULE[1]={name:"ZZZ",kind:"scheduled-numeric",tier:2,et:[8,30],rule:"every-thursday"};
  const thu=etToUtc(2026,6,9,8,30);
  eq("renaming a series in the table renames what is emitted, instead of emitting CLAIMS anyway",
     releasesBetween(thu,thu).map(function(r){ return r.name; }).join(","), "ZZZ");
  restore(s);
  /* a rule row the unit cannot express is a REJECTED ROW, never a silent zero */
  RELEASES.RULE.push({name:"PPI",tier:2,rule:"every-monday"});       /* no kind, no et */
  eq("an underspecified rule row is rejected", calValidateRule().length, 1);
  ok("...with a reason a human can act on", calValidateRule()[0].why.length>0, JSON.stringify(calValidateRule()));
  eq("...it appears nowhere in the audit's series list",
     calendarAudit().ruleSeries.map(function(r){ return r.name; }).join(","), "NFP,CLAIMS");
  eq("...the audit counts it as rejected instead", calendarAudit().ruleRejected, 1);
  ok("...the human text says the series generates nothing",
     calendarAudit().text.indexOf("REJECTED, generating nothing")>=0, calendarAudit().text);
  eq("...and no control window is possible while a series is silently missing",
     controlEligible(TUE26).reason, "table-errors");
  releasesBetween(thu,thu);
  eq("...and releasesBetween records it in CAL_RULE_BAD", CAL_RULE_BAD.length, 1);
  restore(s);
  releasesBetween(thu,thu);
  eq("CAL_RULE_BAD clears once the table is fixed", CAL_RULE_BAD.length, 0);
  /* the rule vocabulary is closed, and prototype-safe */
  ok("an unparseable rule string is rejected, not guessed at",
     (calRuleRowFault({name:"X",kind:"scheduled-numeric",tier:1,et:[8,30],rule:"twice-a-fortnight"})||"")
       .indexOf("not a form this unit can generate")>=0,
     calRuleRowFault({name:"X",kind:"scheduled-numeric",tier:1,et:[8,30],rule:"twice-a-fortnight"}));
  eq("calParseRule cannot be fooled by a prototype key", calParseRule("every-constructor"), null);
  eq("...or by an inherited ordinal", calParseRule("toString-friday-of-month"), null);
  eq("calParseRule reads the two seeded forms", JSON.stringify([calParseRule("every-thursday"),calParseRule("first-friday-of-month")]),
     JSON.stringify([{every:4},{nth:1,dow:5}]));
  RELEASES.RULE.push({name:"QQQ",kind:"scheduled-numeric",tier:2,et:[9,0],rule:"last-friday-of-month"});
  const q=releasesBetween(U(2026,6,1,0,0),U(2026,6,31,23,59)).filter(function(r){ return r.name==="QQQ"; });
  ok("last-<weekday>-of-month lands on the last one (31 Jul 2026 is a Friday), 09:00 ET",
     q.length===1&&iso(q[0].t)==="2026-07-31T13:00:00.000Z", JSON.stringify(q));
  restore(s);
  ok("seed tables restored", seedIntact());
})();

/* ---- 26. the audit's own arithmetic (nits, recorded so they are not rediscovered) ---- */
(function(){
  const s=snap();
  RELEASES.DATED.push({name:"PPI",tier:1,t:NaN});
  eq("the human text prints the VALID count under the word 'valid', not the row total",
     calendarAudit().text.indexOf("DATED rows: 10 valid, 1 rejected")>=0, true);
  restore(s);
  const keep=RELEASES.DATED;
  RELEASES.DATED=5;                                 /* not an array at all */
  const b=calendarAudit();
  eq("a non-array DATED table reports zero valid rows, not -1", b.datedValid, 0);
  eq("...and is itself reported as a rejected table", b.datedRejected, 1);
  RELEASES.DATED=keep;
  RELEASES.DATED.push({name:"toString",kind:"scheduled-numeric",tier:2,t:etToUtc(2026,6,15,8,30),
                       src:"https://example.invalid/x",retrieved:"2026-09-06"});
  const c=calendarAudit();
  ok("a row named 'toString' is counted rather than swallowed by Object.prototype",
     c.datedNames.filter(function(n){ return n.name==="toString"; }).length===1, JSON.stringify(c.datedNames));
  ok("...and is correctly listed as having no coverage", c.uncoveredNames.indexOf("toString")>=0, c.uncoveredNames.join(","));
  restore(s);
  ok("seed tables restored", seedIntact());
})();

/* ---- 27. [REGRESSION - R2] the audit's coverage lines are PERIOD-SCOPED ----
   FILLING.md names calendarAudit().text as the surface a maintainer reads before believing a
   declaration, and controlWindowsPossible as "the single line that says whether section 11.3 has
   any controls to draw on". Both were period-blind: `uncovered` recorded only THAT a name
   appeared in some coverage row, never WHEN, so a "*" row covering ONE HOUR reported every
   series as covered across all of history - and controlWindowsPossible said `true` for that same
   one-hour row while every window inside it read {eligible:false, reason:"unknown-coverage"},
   because a period narrower than the +/-45 min band can never span it. */
(function(){
  const s=snap();
  const HOUR_FROM=U(2026,5,1,12,0), HOUR_TO=U(2026,5,1,13,0);
  RELEASES.COVERAGE.push(starRow([SPEC_NFP,SPEC_CLAIMS],HOUR_FROM,HOUR_TO));
  const a=calendarAudit();
  ok("[R2] a one-hour '*' row no longer reports CPI as simply covered - it reports the ONE HOUR",
     a.text.indexOf("CPI: 2026-06-01 .. 2026-06-01 ET (via a \"*\" claim)")>=0, a.text);
  eq("[R2] ...and the line that used to read 'NO COVERAGE AT ALL: (none)' is gone",
     a.text.indexOf("NO COVERAGE AT ALL"), -1);
  ok("[R2] ...replaced by one that says what it actually counts",
     a.text.indexOf("NAMES WITH NO DECLARED PERIOD ANYWHERE: (none) - this is NOT a statement that anything is covered NOW")>=0, a.text);
  eq("[R2] a one-hour '*' claim cannot supply a control window, and no longer says it can",
     a.controlWindowsPossible, false);
  eq("[R2] ...which agrees with the guard, asked directly",
     controlEligible(HOUR_FROM+30*60000).reason, "unknown-coverage");
  ok("[R2] ...and the audit says why, rather than leaving a bare false",
     a.coverage[1].controlWindow===null&&a.text.indexOf("narrower than the +/-45 min exclusion band")>=0, a.text);
  restore(s);
  /* the milder form, present in the SHIPPED tables: FOMC is covered for 2026 and nothing else */
  const b=calendarAudit();
  ok("[R2] the shipped FOMC row reads as a PERIOD, not as coverage for all time",
     b.text.indexOf("FOMC: 2026-01-01 .. 2026-12-31 ET")>=0, b.text);
  eq("[R2] ...and coverageByName carries that period as data, not as a boolean",
     JSON.stringify(b.coverageByName.filter(function(x){ return x.name==="FOMC"; })[0].periods.map(function(q){
       return q.via+" "+q.fromIso+".."+q.toIso; })), JSON.stringify(["FOMC 2026-01-01..2026-12-31"]));
  eq("[R2] ...while a name with no declaration says so in words a human can act on",
     b.text.indexOf("CPI: no coverage declared - windows here are UNKNOWN, not quiet")>=0, true);
  /* controlWindowsPossible now means what its name says: SOME window is actually eligible */
  RELEASES.COVERAGE.push(STAR);
  const c=calendarAudit();
  eq("[R2] a full year of vouched coverage does supply control windows", c.controlWindowsPossible, true);
  ok("[R2] ...and the audit hands over the instant it is claiming, so the claim is checkable",
     typeof c.controlWindowExample==="number"&&controlEligible(c.controlWindowExample).eligible===true,
     JSON.stringify({t:c.controlWindowExample,iso:c.controlWindowExampleIso}));
  ok("[R2] ...and prints it", c.text.indexOf("at least one window in it is usable")>=0, c.text);
  restore(s);
  /* a wide-but-crowded period: vouched, wider than the band, and still no clear window */
  const F=etToUtc(2026,6,6,0,0), T=etToUtc(2026,6,8,0,0);
  RELEASES.COVERAGE.push(starRow([SPEC_NFP,SPEC_CLAIMS],F,T));
  RELEASES.RULE.length=0;
  RELEASES.RULE.push({name:"BUSY",kind:"scheduled-numeric",tier:2,et:[0,0],rule:"every-monday"});
  RELEASES.COVERAGE[1].rules=[{name:"BUSY",kind:"scheduled-numeric",tier:2,et:[0,0],rule:"every-monday"}];
  const d=calendarAudit();
  eq("[R2] a vouched period wider than the band still reports false when nothing inside it is clear",
     d.controlWindowsPossible, controlEligible(F+45*60000).eligible||controlEligible(T-45*60000).eligible);
  restore(s);
  ok("seed tables restored", seedIntact());
})();

/* ---- 28. [REGRESSION - R3] a rule row's `et` must be WHOLE numbers ----
   The bounds check tested 0<=h<=23 without integrality, so et:[8.5,30] validated clean and
   Date.UTC TRUNCATED the hour to 8 - the series published at a time nobody wrote - while
   et:[13.9,0] was not caught at all. The reject message has always promised integers. */
(function(){
  const s=snap();
  const half={name:"X",kind:"scheduled-numeric",tier:2,et:[8.5,30],rule:"every-monday"};
  ok("[R3] a fractional hour is rejected", (calRuleRowFault(half)||"").indexOf("whole numbers")>=0, calRuleRowFault(half));
  ok("[R3] ...and so is et:[13.9,0], which no bound caught at all",
     calRuleRowFault({name:"X",kind:"scheduled-numeric",tier:2,et:[13.9,0],rule:"every-monday"})!==null);
  ok("[R3] ...and a fractional minute", calRuleRowFault({name:"X",kind:"scheduled-numeric",tier:2,et:[8,30.5],rule:"every-monday"})!==null);
  eq("[R3] whole numbers still pass", calRuleRowFault({name:"X",kind:"scheduled-numeric",tier:2,et:[8,30],rule:"every-monday"}), null);
  eq("[R3] the bounds still hold on integers", calRuleRowFault({name:"X",kind:"scheduled-numeric",tier:2,et:[24,0],rule:"every-monday"})!==null, true);
  RELEASES.RULE.push(half);
  eq("[R3] a fractional et is a REJECTED ROW, so the series generates nothing at all",
     releasesBetween(U(2026,6,6,0,0),U(2026,6,7,0,0)).filter(function(r){ return r.name==="X"; }).length, 0);
  eq("[R3] ...and a rejected rule row disqualifies every control window", controlEligible(TUE26).reason, "table-errors");
  restore(s);
  ok("[R3] a vouch carrying a fractional et is refused by the same validator",
     (calCoverageRowFault(starRow([half]))||"").indexOf("whole numbers")>=0, calCoverageRowFault(starRow([half])));
  ok("seed tables restored", seedIntact());
})();

/* ---- 29. [REGRESSION - R4] a broken table is reported as a broken table, not as proximity ----
   controlEligible checked release-nearby BEFORE table-errors, so any window that still had a
   GENERATED release nearby reported "release-nearby" while the tables were unusable. Eligibility
   was right either way - but code.js states at controlEligible that counting these reasons is
   how section 11.3's "control coverage >= 80%" figure is computed, so a table fault became
   invisible in the very statistic meant to expose thin coverage. */
(function(){
  const s=snap();
  const NEAR=NFP_FEB_REAL-30*60000;                 /* 30 min from a release: nearby under any table */
  eq("with clean tables that window is ordinary release proximity", controlEligible(NEAR).reason, "release-nearby");
  const keep=RELEASES.DATED;
  RELEASES.DATED=null;                              /* not an array at all */
  const r=controlEligible(NEAR);
  ok("[R4] with a broken table the SAME window reports the table fault, not proximity",
     r.eligible===false&&r.reason==="table-errors", JSON.stringify(r));
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

/* ---- 30. PRESERVED: the headline guarantee, swept ----
   An unknown-coverage window must never be control-eligible. The step is deliberately NOT a
   divisor of a day, so the sweep lands on many different slots-of-day rather than the same four. */
(function(){
  const seen=Object.create(null); let n=0, worst=null;
  for(let t=U(2015,0,1,0,0);t<U(2036,0,1);t+=6*3600000+13*60000){
    const r=controlEligible(t); n++;
    seen[r.reason]=(seen[r.reason]||0)+1;
    if(r.eligible&&worst===null) worst=t;
  }
  ok("swept "+n+" instants across 2015-2036 on the shipped tables", n>25000, String(n));
  eq("NOT ONE of them is control-eligible - the table is 5% full and says so", worst, null);
  eq("...and the only reasons that occur are ignorance and proximity",
     Object.keys(seen).sort().join(","), "release-nearby,unknown-coverage");
  ok("...with unknown-coverage the overwhelming majority", seen["unknown-coverage"]>seen["release-nearby"]*10,
     JSON.stringify(seen));
  const a=calendarAudit();
  eq("AS SHIPPED the audit agrees: no control window is possible anywhere", a.controlWindowsPossible, false);
  eq("...and it names no example instant, because there is none", a.controlWindowExample, null);
  eq("...and there is still no '*' entry at all", RELEASES.COVERAGE.filter(function(c){ return c.name==="*"; }).length, 0);
})();

/* ---- 20z. R6/R7: the two ways a signature outlived what it signed (third review) ---- */
(function(){
  /* R6. The force check matched by SPECIFICATION KEY and the stale check matched by NAME. That asymmetry
     is the defect: a signed generator whose row is deleted stays "valid" while any row still carries its
     name. Two rows under one name is the shape FILLING.md sanctions and section 26 constructs, so the
     mechanism could not police the exact table it documents as correct. Measured before the fix: deleting
     one of two CLAIMS rows dropped 52 real releases while the vouch reported ok and every window that had
     held one came back {eligible:true, reason:"ok"}. */
  const RULE=RELEASES.RULE.slice(), COV=RELEASES.COVERAGE.slice();
  const spec=function(o){ return {name:o.name,kind:o.kind,tier:o.tier,et:o.et.slice(),rule:o.rule}; };
  const NFP=spec(RELEASES.RULE[0]), THU=spec(RELEASES.RULE[1]);
  const WED={name:THU.name,kind:THU.kind,tier:THU.tier,et:[10,0],rule:"every-wednesday"};
  try{
    RELEASES.RULE.length=0; RELEASES.RULE.push(spec(NFP),spec(THU),spec(WED));
    RELEASES.COVERAGE.length=0;
    RELEASES.COVERAGE.push({name:"*",from:etToUtc(2026,1,1,0,0),to:etToUtc(2026,12,31,23,59),
      src:"test",retrieved:"2026-09-06",rules:[spec(NFP),spec(THU),spec(WED)]});
    ok("three generators, all three honestly signed: the vouch is satisfied",
       calCoverageVouchFaults(RELEASES.COVERAGE[0]).ok===true);
    const before=calStarScan?calStarScan():null;

    RELEASES.RULE.splice(2,1);            /* delete ONE of the two rows sharing the vouched name */
    const f=calCoverageVouchFaults(RELEASES.COVERAGE[0]);
    ok("deleting one of two rows under a vouched name is caught: the signature is stale by KEY, not by name",
       f.ok===false&&f.stale.length===1);
    ok("...and the message says the surviving same-name row does not cover the deleted one",
       /THIS generator is gone/.test(f.stale[0])&&/does not cover it/.test(f.stale[0]));
    eq("...the name-only gap check still reads empty, which is exactly why it could never see this",
       calCoverageVouchGap(RELEASES.COVERAGE[0]).length, 0);
    /* the consequence the fix exists to prevent: a window that held a now-ungenerated release */
    const wed=etToUtc(2026,5,6,10,0);     /* a Wednesday 10:00 ET print the deleted row used to emit */
    eq("a window that held one of the deleted releases is NOT handed back as a quiet control",
       controlEligible(wed).eligible, false);
    ok("...and the audit says so out loud", /STALE VOUCH/.test(calendarAudit().text));
    ok("re-signing without the deleted row restores the claim",
       (function(){ RELEASES.COVERAGE[0].rules=[spec(NFP),spec(THU)];
                    return calCoverageVouchFaults(RELEASES.COVERAGE[0]).ok===true; })());
    ok("the surplus-spec degenerate form needs no deletion at all",
       (function(){ RELEASES.COVERAGE[0].rules=[spec(NFP),spec(THU),spec(WED)];
                    return calCoverageVouchFaults(RELEASES.COVERAGE[0]).ok===false; })());

    /* R7. A signature must be a SNAPSHOT. Held as a live reference it becomes a copy of the thing it
       checks, can never disagree with it, and degrades to an always-true constant with no diff to see. */
    /* Every field but `rules` is a VALID coverage row here, deliberately. An earlier draft of this block
       used from:1,to:2 as placeholders; those are rejected for implausible dates long before the aliasing
       check runs, so the assertions passed without ever exercising it and a mutant that deleted the check
       survived. The row must be faultless apart from the thing under test, and the message is asserted,
       not merely non-null. */
    const row=function(rules){ return {name:"*",from:etToUtc(2026,1,1,0,0),to:etToUtc(2026,12,31,23,59),
      src:"s",retrieved:"2026-09-06",rules:rules}; };
    ok("a signature that IS RELEASES.RULE is refused, and says it holds a live reference",
       /live reference/.test(calCoverageRowFault(row(RELEASES.RULE))||""));
    ok("a .slice() signature is refused - it reads as a copy, and FILLING.md's wording invites it",
       /live reference/.test(calCoverageRowFault(row(RELEASES.RULE.slice()))||""));
    ok("a row-copied signature that still SHARES the et array is refused, naming et",
       /`et` array/.test(calCoverageRowFault(row(RELEASES.RULE.map(function(r){
         return {name:r.name,kind:r.kind,tier:r.tier,et:r.et,rule:r.rule}; })))||""));
    eq("an independent snapshot of the same rows is accepted, so the check is about aliasing and nothing else",
       calCoverageRowFault(row(RELEASES.RULE.map(spec))), null);
    ok("the fixture is otherwise valid, so none of the four above can pass on an unrelated fault",
       calCoverageRowFault(row([spec(NFP)]))===null&&before===before);
  } finally {
    RELEASES.RULE.length=0; for(let i=0;i<RULE.length;i++) RELEASES.RULE.push(RULE[i]);
    RELEASES.COVERAGE.length=0; for(let i=0;i<COV.length;i++) RELEASES.COVERAGE.push(COV[i]);
  }
})();

/* ---- 21. the seeded tables survived the whole suite unmutated ---- */
/* STAR is a shared fixture pushed by a dozen sections; a test that reassigns its `rules` in place
   would quietly change what every later section is asserting against (it happened once while this
   section was being written, and the failure surfaced five sections away). */
eq("the shared '*' fixture was never mutated by a test that pushed it",
   STAR.rules.map(function(r){ return calRuleSpecKey(r); }).join(" | "),
   [SPEC_NFP,SPEC_CLAIMS].map(function(r){ return calRuleSpecKey(r); }).join(" | "));
ok("RELEASES.DATED is exactly the 10 verified rows at the end of the run", seedIntact()&&RELEASES.DATED.length===10);
eq("RELEASES.EXCEPTIONS is exactly the 2 verified overrides", RELEASES.EXCEPTIONS.length, 2);
eq("RELEASES.COVERAGE is exactly the 1 confirmed period", RELEASES.COVERAGE.length, 1);
eq("the tables are still clean",
   calValidateRule().length+calValidateDated().length+calValidateExceptions().length+calValidateCoverage().length, 0);
eq("RELEASES.RULE is exactly the 2 rule-derived series", RELEASES.RULE.length, 2);

console.log(fails?("\n"+fails+" FAILED"):"\nall passed");
process.exit(fails?1:0);
