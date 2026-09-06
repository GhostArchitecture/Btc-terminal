/* ===== calendar: scheduled-release detector + event-proximity tag =====
   All wall-clock reasoning is US Eastern; every time this unit stores or returns is UTC ms.
   No Date parsing, no toLocaleString, no timezone database - pure UTC arithmetic, because
   this codebase already shipped one bug where a calendar setter floored in the local zone.

   Three rules govern every failure path here, because these tags get persisted on thousands of
   ledger rows and analysed by event distance months later:
     - BAD DATA never produces a tag. A missing/corrupt timestamp returns the all-null tag -
       deliberately indistinguishable from a genuinely quiet window, because the only safe thing
       to say about a row with no clock is nothing. What must be impossible is the reverse: a
       confident "CLAIMS, 810 minutes away" falling out of a null.
     - BAD CALLER PARAMETERS throw. A horizon wider than the generator can cover, or a
       non-numeric range, is a programmer error and refuses loudly rather than returning a
       truncated list that looks like an answer.
     - AN UNKNOWN PERIOD IS NOT A QUIET PERIOD. The release table is, and will stay, PARTIAL.
       "No release found at t" therefore means one of two completely different things, and the
       unit must say which: inside declared COVERAGE it means "no release here" (a usable
       control window); outside it means "this unit has never been told about this period"
       (usable as neither a control nor a shock window). See the COVERAGE block below.

   WHY THAT THIRD RULE IS A CORRECTNESS RULE AND NOT A NICETY (CLAUDE.md section 11.3):
   every shock claim in the H-protocol is stated against TIME-MATCHED CONTROL windows - same
   UTC slot, same weekday, same quarter, and NO scheduled release in the window or the two
   windows either side. If a real CPI print is missing from this table, that window is not
   merely unmeasured: it is silently recruited into the CONTROL group as a quiet window. The
   shock then contaminates the baseline it is being measured against, biasing the estimate
   toward zero, invisibly, in every downstream number. A missing release is worse than a
   missing observation. controlEligible() is the guard that makes that impossible; section
   11.3 control selection MUST call it. */

const CAL_HORIZON_MIN=1440;   /* +/- 24h: the documented proximity horizon for nearestRelease/eventTag */
const CAL_MAX_ITER=20000;     /* generation guard; 20000 daily steps is ~54y, far past any sane query */
/* Plausibility window for any instant this unit will reason about. null, 0, false and "" all
   coerce to 0 in ordinary JS arithmetic, and the unit used to answer them with the 1 Jan 1970
   claims release, 810 minutes away - a confident tier-2 tag on a row whose timestamp went
   missing. Nothing outside this window is a timestamp this instrument can have produced. */
const CAL_T_MIN=1230768000000; /* 2009-01-01T00:00:00Z - before any tape this tool will ever see */
const CAL_T_MAX=4102444800000; /* 2100-01-01T00:00:00Z */
/* An EXCEPTIONS row may move a release by at most this much. The bound is what makes the
   generation pad provably sufficient: a release generated outside the queried range can only be
   pulled into it by a shift, so padding the walk by the largest legal shift cannot miss one. */
const CAL_EXC_MAX_SHIFT_MS=45*86400000;
/* Widest span the day-walk generator can cover inside CAL_MAX_ITER, allowing for the exception
   pad at both ends plus 2 days of internal pad. A request wider than this is REFUSED, not
   truncated: a truncated walk returns the wrong nearest release with no indication that
   anything was dropped. */
const CAL_MAX_SPAN_MS=(CAL_MAX_ITER-2*(CAL_EXC_MAX_SHIFT_MS/86400000+1)-2)*86400000;  /* ~54.5 years */
const CAL_MAX_HORIZON_MIN=Math.floor(CAL_MAX_SPAN_MS/120000); /* ~27.2 years, since the range is +/-H */
/* Control exclusion half-width, in minutes. CLAUDE.md section 11.3 requires a control window to
   have no scheduled release in the window itself or in the two windows either side. A window is
   15 minutes, so that is 15 + 2*15 = 45 minutes of clearance measured from the window's own
   edges; +/-45 min from ANY instant inside the window is the conservative superset of that, and
   is used so a caller may pass a window start, mid or gate without changing the answer. */
const CAL_CONTROL_EXCL_MIN=45;
/* Release names this instrument expects to matter for BTC. Used ONLY by calendarAudit to answer
   "which release types have no coverage at all" - it is a checklist, never a source of dates. */
const CAL_EXPECTED_NAMES=["CPI","PPI","PCE","GDP","NFP","CLAIMS","FOMC","ISM","RETAIL"];
/* The kinds this unit knows. "scheduled-numeric" is a data print; "scheduled-policy" is a policy
   announcement (an FOMC rate decision). They are NOT interchangeable: H3 splits informed from
   narrative flow by release TYPE, so filing a rate decision as a data print would blur the exact
   distinction H3 exists to test. Validated as a closed set to catch typos in hand entry. */
const CAL_KINDS=["scheduled-numeric","scheduled-policy"];
/* Malformed hand-entered rows found by the most recent releasesBetween()/coverageAt() call: the
   tables are the one thing here a human fills in, so their rejects are recorded rather than
   dropped. Shape: [{i, name, why}]. Also available on demand from the calValidate* functions. */
const CAL_DATED_BAD=[];
const CAL_EXC_BAD=[];
const CAL_COVERAGE_BAD=[];
/* Same, for RELEASES.RULE. The rule table now DRIVES the generator (it used to be decorative
   while both series were hardcoded), so a rejected rule row is a whole release series that
   silently stops being emitted - the worst failure direction this unit has. It is therefore
   counted here, reported by calendarAudit(), and refuses every control window via
   controlEligible() -> "table-errors", exactly like a malformed DATED or EXCEPTIONS row. */
const CAL_RULE_BAD=[];

/* Nth occurrence (n>=1) of weekday `dow` (0=Sun) in UTC month `mo` of year `y`, at 00:00 UTC. */
function nthDowUtc(y,mo,dow,n){
  const d0=new Date(Date.UTC(y,mo,1)).getUTCDay();
  return Date.UTC(y,mo,1+((dow-d0+7)%7)+(n-1)*7);
}
/* US DST bounds for a calendar year, as UTC instants.
   Rule (Energy Policy Act 2005, in force since 2007): starts second Sunday in March at
   02:00 local standard (EST, UTC-5) = 07:00 UTC; ends first Sunday in November at
   02:00 local daylight (EDT, UTC-4) = 06:00 UTC. Nothing here is year-specific. */
function usDstBoundsUtc(y){
  return { start: nthDowUtc(y,2,0,2)+7*3600000, end: nthDowUtc(y,10,0,1)+6*3600000 };
}
/* 240 (EDT) or 300 (EST): minutes to ADD to a US Eastern wall clock to get UTC.
   Safe across the year boundary without cross-year lookup: January and December are EST
   under every US rule, so the current UTC year's bounds always classify them correctly. */
function usEasternOffsetMinutes(utcMs){
  const b=usDstBoundsUtc(new Date(utcMs).getUTCFullYear());
  return (utcMs>=b.start&&utcMs<b.end)?240:300;
}
/* US Eastern wall clock -> epoch ms. Tries each candidate offset and keeps the one that is
   self-consistent with the resulting instant.
   - Ambiguous fall-back hour (01:00-01:59 on the November Sunday): returns the FIRST
     occurrence, i.e. the EDT reading. Documented, not accidental.
   - Non-existent spring-forward gap (02:00-02:59 on the March Sunday): neither offset is
     self-consistent; resolves forward via the standard offset, so 02:30 -> 03:30 EDT. */
function etToUtc(y,mo,d,hh,mm){
  const naive=Date.UTC(y,mo,d,hh||0,mm||0,0,0);
  const a=naive+240*60000; if(usEasternOffsetMinutes(a)===240) return a;
  const b=naive+300*60000; return b;
}

/* Last occurrence of weekday `dow` in UTC month `mo` of year `y`, at 00:00 UTC. */
function lastDowUtc(y,mo,dow){
  const last=new Date(Date.UTC(y,mo+1,1)-86400000);
  return Date.UTC(y,mo,last.getUTCDate()-((last.getUTCDay()-dow+7)%7));
}
/* Prototype-free lookup tables. A plain {} would answer CAL_DOW["constructor"] with a function,
   and the rule strings below are matched with /[a-z]+/, so "every-constructor" would parse. */
function calDict(pairs){ const o=Object.create(null); for(let i=0;i<pairs.length;i+=2) o[pairs[i]]=pairs[i+1]; return o; }
const CAL_DOW=calDict(["sunday",0,"monday",1,"tuesday",2,"wednesday",3,"thursday",4,"friday",5,"saturday",6]);
const CAL_ORD=calDict(["first",1,"second",2,"third",3,"fourth",4,"last",-1]);
/* The CLOSED vocabulary of publication rules calRuleRows() can generate:
     "every-<weekday>"                                  weekly
     "first|second|third|fourth|last-<weekday>-of-month" monthly
   -> {every:dow} | {nth:n,dow:dow}, or null for anything else.
   Closed on purpose. An unrecognised rule string is a REJECTED ROW (calRuleRowFault), never a
   silently skipped one: a skipped series is a missing release, and a missing release reads as a
   quiet window, which is the contamination this unit exists to prevent. */
function calParseRule(str){
  if(typeof str!=="string"||str==="") return null;
  const w=/^every-([a-z]+)$/.exec(str);
  if(w){ const d=CAL_DOW[w[1]]; return d===undefined?null:{every:d}; }
  const m=/^([a-z]+)-([a-z]+)-of-month$/.exec(str);
  if(m){ const n=CAL_ORD[m[1]], d=CAL_DOW[m[2]]; return (n===undefined||d===undefined)?null:{nth:n,dow:d}; }
  return null;
}

/* True only for a real, plausible epoch-ms instant. Deliberately strict about TYPE as well as
   value: a Date object and the numeric string "1783080000000" are both rejected rather than
   silently coerced, because both used to produce a wrong answer (a Date string-concatenated
   inside the range computation and reported "no event known" for a window 30 min from NFP).
   Callers holding a Date or a CSV string must convert explicitly - +d / Number(s) - so the
   coercion happens where someone can see it. */
function calValidTime(t){
  return typeof t==="number"&&isFinite(t)&&t>=CAL_T_MIN&&t<=CAL_T_MAX;
}

/* ===================================================================================
   THE TABLES. Two words appear on these rows with two different meanings, deliberately:

     - on a TABLE row (DATED / EXCEPTIONS / COVERAGE), `src` is the AGENCY URL the row was
       read from, and `retrieved` is the date a human read it. That is the checkable audit
       trail: every row here can be re-verified against a page.
     - on an EMITTED release row (from releasesBetween/nearestRelease) and on the tag,
       `src`/`evSrc` is the PROVENANCE CLASS - "rule" (derived from a publication rule, at
       risk in holiday and shutdown weeks), "dated" (an agency-published date, entered by
       hand) or "corrected" (an agency-published correction to a rule-derived or dated date).
       The emitted row also carries `ref`/`retrieved` copied from the table row, so the URL
       travels with the data and not only with this comment.
   =================================================================================== */
const RELEASES={
  /* (a) RULE-DERIVED. The publication rule is genuinely deterministic, so these dates are
     computed, never stored. The rule has REAL exceptions - BLS shifts nonfarm payrolls off
     the first Friday, and moves initial claims to Wednesday in weeks containing a Thursday
     federal holiday. Those are not modelled by the rule; where one is known it goes in
     EXCEPTIONS below with its agency source, and the emitted row then reads src:"corrected".
     Everything still generated from this table carries src:"rule" so the caveat travels with
     the data instead of living only in this comment.
     THIS TABLE DRIVES THE GENERATOR. calRuleRows() reads it - rule strings are parsed from the
     closed vocabulary in calParseRule, so a series added here really does produce rows, a series
     renamed here really does change the output, and a rule string this unit cannot parse is a
     REJECTED ROW rather than a silent zero. (It was previously decorative: both series were
     hardcoded in the generator while calendarAudit() reported the table, so a maintainer could
     add a series, see it in the audit, receive zero rows, and then declare coverage over a
     release type that generates nothing - the "coverage without rows" lie in FILLING.md, arrived
     at by following the audit.)
     `et` is the publication time on a US Eastern wall clock, [hour, minute]. */
  RULE:[
    {name:"NFP",   kind:"scheduled-numeric", tier:1, et:[8,30], rule:"first-friday-of-month"},
    {name:"CLAIMS",kind:"scheduled-numeric", tier:2, et:[8,30], rule:"every-thursday"}
  ],
  /* (b) DATED. Releases whose exact dates are published by an agency and are NOT derivable by
     any rule. Rows from here emit src:"dated" - an agency-published date, not an inference.
     THIS TABLE IS PARTIAL AND WILL STAY PARTIAL. That is fine. What is NOT fine is a partial
     table that reads as a complete one - see COVERAGE below, and FILLING.md for how to add a
     row without lying about what is known.
     Row shape (build t with etToUtc so DST is handled - t MUST be epoch ms, not an ISO string):
        {name:"CPI", kind:"scheduled-numeric", tier:1, t:etToUtc(2026,0,13,8,30),
         src:"https://www.bls.gov/schedule/news_release/cpi.htm", retrieved:"2026-09-06"}
     tier 1 = high BTC relevance (CPI, NFP, FOMC, PCE); tier 2 = lower (claims, ISM, retail).
     Malformed rows are NOT silently dropped: they are listed by calValidateDated(), in
     CAL_DATED_BAD after any releasesBetween() call, and counted by calendarAudit().
     DO NOT GUESS A DATE HERE. A wrong CPI date silently mislabels every window around it; a
     MISSING one silently poisons the control group (header, rule 3). Both are worse than an
     honest gap, and only the gap is visible - COVERAGE is what makes it visible. */
  DATED:[
    /* FOMC 2026 policy statements. Released 14:00 ET on the final day of each two-day meeting.
       This list is COMPLETE for 2026 - eight meetings, the standard FOMC year, count checked -
       which is why FOMC is the one name with a COVERAGE entry below.
       kind is "scheduled-policy", not "scheduled-numeric": a rate decision is a policy
       announcement, not a data print, and H3 splits informed vs narrative flow by release
       TYPE, so conflating the two would blur the very distinction H3 exists to test. */
    {name:"FOMC",kind:"scheduled-policy",tier:1,t:etToUtc(2026,0,28,14,0),src:"https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",retrieved:"2026-09-06"},
    {name:"FOMC",kind:"scheduled-policy",tier:1,t:etToUtc(2026,2,18,14,0),src:"https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",retrieved:"2026-09-06"},
    {name:"FOMC",kind:"scheduled-policy",tier:1,t:etToUtc(2026,3,29,14,0),src:"https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",retrieved:"2026-09-06"},
    {name:"FOMC",kind:"scheduled-policy",tier:1,t:etToUtc(2026,5,17,14,0),src:"https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",retrieved:"2026-09-06"},
    {name:"FOMC",kind:"scheduled-policy",tier:1,t:etToUtc(2026,6,29,14,0),src:"https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",retrieved:"2026-09-06"},
    {name:"FOMC",kind:"scheduled-policy",tier:1,t:etToUtc(2026,8,16,14,0),src:"https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",retrieved:"2026-09-06"},
    {name:"FOMC",kind:"scheduled-policy",tier:1,t:etToUtc(2026,9,28,14,0),src:"https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",retrieved:"2026-09-06"},
    {name:"FOMC",kind:"scheduled-policy",tier:1,t:etToUtc(2026,11,9,14,0),src:"https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",retrieved:"2026-09-06"},
    /* CPI, 08:30 ET. ONLY these two dates are verified; the rest of the 2026 CPI schedule could
       not be retrieved, so CPI has NO coverage entry and CPI windows outside these two instants
       are "unknown", not "quiet". Do not extrapolate the monthly cadence - "CPI lands mid-month"
       is exactly the inference this table exists to refuse.
       UNVERIFIED, FLAGGED, AND DELIBERATELY NOT CHANGED: the second row, 2026-09-11, is a
       FRIDAY. BLS publishes CPI on a Tuesday-Thursday in the large majority of months, so this
       row's day of week is atypical - it is the one row in this table whose shape invites a
       second look. It is what the schedule page said when it was read on 2026-09-06, and the
       2025-2026 lapse in appropriations demonstrably moved BLS dates (both EXCEPTIONS rows below
       come from that episode), so an unusual weekday is not by itself evidence of an error. The
       source page is not reachable from the environment this was entered in, and CHANGING A
       SOURCED DATE ON A GUESS IS THE ONE THING THIS TABLE FORBIDS: a wrong CPI date mislabels
       every window around it, and the window holding the real print would read quiet. RE-VERIFY
       against the src page when egress allows; if it turns out wrong, correct it as an edit to
       this row with a fresh `retrieved`, never as an EXCEPTION - there is no agency correction
       here, only an unchecked transcription. */
    {name:"CPI",kind:"scheduled-numeric",tier:1,t:etToUtc(2026,7,12,8,30),src:"https://www.bls.gov/schedule/news_release/cpi.htm",retrieved:"2026-09-06"},  /* July 2026 reference month */
    {name:"CPI",kind:"scheduled-numeric",tier:1,t:etToUtc(2026,8,11,8,30),src:"https://www.bls.gov/schedule/news_release/cpi.htm",retrieved:"2026-09-06"}   /* August 2026 ref month - a FRIDAY: atypical for CPI, unverified, NOT changed (see above) */
  ],
  /* (c) EXCEPTIONS. Agency-published corrections to a date this unit would otherwise produce.
     The RULE table provably has exceptions inside the live data period, so the unit needs a way
     to say so in data rather than in prose.
     Row shape:
        {name:"NFP", was:etToUtc(2026,1,6,8,30), t:etToUtc(2026,1,11,8,30),
         src:"https://www.bls.gov/...", retrieved:"2026-09-06", note:"why"}
     Semantics, exactly:
        - any generated or dated row with the same `name` and t === `was` is REMOVED;
        - if `t` is a number, a row is emitted at `t` with src:"corrected" and `was` attached,
          WHETHER OR NOT a base row was found. An exception is itself agency evidence that the
          release happens at `t`, and dropping it because no base row matched would recreate
          the missing-release hazard in the header. calendarAudit() reports unmatched
          exceptions as insertions so an override that overrides nothing is visible.
        - if `t` is null the release was CANCELLED, not moved: the base row is removed and
          nothing is emitted. `t:null` is the suppression form; `t` merely absent is a fault.
        - optional `kind`/`tier` override; otherwise they come from the removed base row, then
          from any RULE/DATED row of the same name, then default to scheduled-numeric/tier 2.
     A shift larger than CAL_EXC_MAX_SHIFT_MS is rejected (it would defeat the generation pad). */
  EXCEPTIONS:[
    /* Employment Situation, January 2026 reference month: moved off the first Friday after the
       2025-2026 lapses in appropriations. February 2026 jobs came out on a WEDNESDAY - the
       rule-derived table is wrong there, and silently wrong is the failure mode this unit
       exists to avoid. */
    {name:"NFP",was:etToUtc(2026,1,6,8,30),t:etToUtc(2026,1,11,8,30),
     src:"https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm",retrieved:"2026-09-06",
     note:"Employment Situation, Jan 2026 ref: 2026-02-06 -> 2026-02-11 (Wed), 08:30 ET"},
    /* CPI, January 2026 reference month. There is no DATED row at the original date, so this
       exception INSERTS the corrected release rather than overriding one; it is reported as an
       insertion by calendarAudit(). It does not create CPI coverage for February 2026. */
    {name:"CPI",was:etToUtc(2026,1,11,8,30),t:etToUtc(2026,1,13,8,30),
     src:"https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm",retrieved:"2026-09-06",
     note:"CPI, Jan 2026 ref: 2026-02-11 -> 2026-02-13, 08:30 ET"}
  ],
  /* (d) COVERAGE - what this table CLAIMS TO KNOW, as opposed to what it happens to contain.
     A period appears here ONLY when a human has actually confirmed the schedule for it against
     the agency page named in `src`. Adding a release row does NOT add coverage, and adding
     coverage without the rows is the one edit that can corrupt a downstream result (FILLING.md).
     Row shape: {name, from, to, src, retrieved} with from/to inclusive UTC ms, plus `rules`
     (mandatory on a "*" row - see below).
       name:"*"  = the WHOLE calendar is known for that period - every release of every type.
                   Only a "*" period can supply a control window (controlEligible).
       name:"X"  = every release named X is known for that period; says nothing about any other.
     BUILD from/to WITH etToUtc, NOT Date.UTC. Every source page is an ET-shaped schedule, so a
     "2026" claim means 2026 in New York. Date.UTC(2026,0,1) is 2025-12-31 19:00 ET and
     OVERCLAIMS five hours of a period nobody read - and an overclaimed hour is the expensive
     direction: it is the hour in which an unentered release becomes an eligible control.

     `rules` - THE VOUCH, and why a "*" row cannot be trusted without it.
     COVERAGE as a bare period protects against a MISSING DATED ROW. It does nothing about a
     WRONG RULE ROW, and the RULE table is a generator that can be confidently wrong: BLS moves
     initial claims to Wednesday in weeks containing a Thursday federal holiday, and NFP is not
     always the first Friday. src:"rule" marks the row the rule EMITS; it cannot mark the window
     the rule GOT WRONG, and that window - a real release the rule placed a day away - is
     precisely the one that reads quiet and enters the control group.
     So a "*" declaration must say, in data, WHICH GENERATOR its author checked against the
     agency schedule for that period. A VOUCH IS A SIGNATURE ON A GENERATOR SPECIFICATION, AND
     IT MUST NOT SURVIVE A CHANGE TO WHAT IT SIGNED - so it is written as a copy of the rule
     rows themselves, not as a list of names:
        rules:[{name:"NFP",   kind:"scheduled-numeric", tier:1, et:[8,30], rule:"first-friday-of-month"},
               {name:"CLAIMS",kind:"scheduled-numeric", tier:2, et:[8,30], rule:"every-thursday"}]
     read as: "I read the published schedule over this period for exactly these generators, and
     every deviation from them is in EXCEPTIONS below."
     A NAME IS NOT ENOUGH, and this is not a nicety. `rules:["NFP","CLAIMS"]` was the first
     shape, and three ordinary maintenance edits walked straight back into the hazard above,
     each starting from a signature that was TRUE when it was written:
       (i)   EDIT a vouched row ("every-thursday" -> "every-wednesday", or et [8,30] -> [10,0]):
             the generator now marks a different day busy and leaves the real print's window
             reading quiet, while the vouch still names "CLAIMS" and everything reports vouched.
       (ii)  REMOVE a vouched row: the series stops being emitted altogether - ~52 real windows a
             year become eligible controls - and the stale name in `rules` still reads complete.
       (iii) ADD a second row under an already-vouched name: a new generator nobody checked,
             covered by a name that was signed against the other one.
     The vouched set and the set of rule specifications in force must therefore be EQUAL, field
     for field, over the five fields calRuleRowFault makes mandatory (name, rule, et, kind,
     tier - see calRuleSpecKey for why exactly those). Anything else REFUSES, in three
     deliberately different words, because the repairs differ:
       "NOT VOUCHED"              a series in force that no signature names   -> (iii)/new series
       "SIGNATURE DOES NOT MATCH" a signed name whose specification changed   -> (i)
       "STALE VOUCH"              a signature whose series is no longer there -> (ii)
     controlEligible() returns "unvouched-rule" for the first two and "stale-vouch" for the
     third; a human re-reads the schedule and re-signs, which is one edit. The default is
     refusal: a signature that no longer matches what it signed never keeps granting eligibility.
     The check is against the live table, so adding, editing or deleting a rule series all
     invalidate an older vouch rather than being inherited by it.
     Vouches are NOT combined across rows - one "*" entry must vouch for everything itself, for
     the same reason adjacent coverage entries are never unioned.
     `rules` is optional on a name-scoped row (it grants no controls either way).
     THERE IS DELIBERATELY NO "*" ENTRY. Nobody has confirmed a complete calendar for any
     period, so controlEligible() currently returns false for every timestamp in history. That
     is the honest state of a 5%-full table, not a bug: see calendarAudit(). */
  COVERAGE:[
    {name:"FOMC",from:etToUtc(2026,0,1,0,0),to:etToUtc(2026,11,31,23,59)+59999,
     src:"https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",retrieved:"2026-09-06",
     note:"All eight 2026 statement dates transcribed; eight is the standard FOMC year and the count matches."}
  ]
};

/* ---- hand-entry validation ------------------------------------------------------------- */

/* Why a RULE row is unusable, or null if it is fine. Validated at all because the table now
   drives the generator: a row this unit cannot parse would otherwise emit nothing at all, and a
   release series that silently stops being generated turns every one of its windows into an
   apparently quiet one. Unlike DATED, `kind`/`tier`/`et` are MANDATORY here - a rule row is not
   a transcribed fact with a missing annotation, it is a generator specification. */
function calRuleRowFault(r){
  if(!r||typeof r!=="object") return "row is not an object";
  if(typeof r.name!=="string"||r.name==="") return "missing name";
  if(typeof r.rule!=="string"||r.rule==="") return "missing rule string";
  if(calParseRule(r.rule)===null)
    return "rule \""+r.rule+"\" is not a form this unit can generate (every-<weekday> | "+
           "first|second|third|fourth|last-<weekday>-of-month); a rule that generates nothing is a missing release series";
  if(!Array.isArray(r.et)||r.et.length!==2) return "missing et: [hour,minute] on a US Eastern wall clock";
  /* Number.isInteger, not just a range: Date.UTC TRUNCATES, so et:[8.5,30] used to validate
     clean and publish the series at 08:30 - a time nobody wrote - while et:[13.9,0] was not
     caught at all. The message has always promised integers; now the check does too. A rule row
     is a generator specification, and this validator is the only thing standing behind it. */
  if(typeof r.et[0]!=="number"||typeof r.et[1]!=="number"||!Number.isInteger(r.et[0])||!Number.isInteger(r.et[1])||
     !(r.et[0]>=0&&r.et[0]<=23)||!(r.et[1]>=0&&r.et[1]<=59))
    return "et must be [hour 0-23, minute 0-59], whole numbers, on a US Eastern wall clock";
  if(r.tier!==1&&r.tier!==2) return "tier must be 1 or 2";
  if(CAL_KINDS.indexOf(r.kind)<0) return "kind must be one of "+CAL_KINDS.join("|");
  return null;
}
/* Why a hand-entered DATED row is unusable, or null if it is fine.
   A missing src/retrieved is NOT a fault: a correct date with no URL is still a real release,
   and dropping it would recreate the missing-release hazard. It is counted as `unsourced` by
   calendarAudit() instead. A PRESENT but malformed one is a fault - a garbled audit trail is
   worse than an absent one, because it looks checkable. */
function calDatedRowFault(r){
  if(!r||typeof r!=="object") return "row is not an object";
  if(r.t===undefined||r.t===null) return "missing t (build it with etToUtc)";
  if(typeof r.t!=="number") return "t is a "+(typeof r.t)+", not epoch ms (build it with etToUtc)";
  if(!isFinite(r.t)) return "t is not a finite number";
  if(r.t<CAL_T_MIN||r.t>CAL_T_MAX) return "t is outside the plausible range (2009-2100)";
  if(typeof r.name!=="string"||r.name==="") return "missing name";
  if(r.tier!==undefined&&r.tier!==1&&r.tier!==2) return "tier must be 1 or 2";
  if(r.kind!==undefined&&CAL_KINDS.indexOf(r.kind)<0) return "kind must be one of "+CAL_KINDS.join("|");
  if(r.src!==undefined&&(typeof r.src!=="string"||r.src===""))  return "src must be the agency URL as a non-empty string";
  if(r.retrieved!==undefined&&!(typeof r.retrieved==="string"&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(r.retrieved)))
    return "retrieved must be a YYYY-MM-DD string";
  return null;
}
/* Why an EXCEPTIONS row is unusable, or null if it is fine. An exception rewrites the calendar,
   so it is validated harder than a plain row: `was` must be a real instant, `t` must be a real
   instant OR an explicit null (cancelled), and a move must stay inside the shift bound. */
function calExceptionRowFault(e){
  if(!e||typeof e!=="object") return "row is not an object";
  if(typeof e.name!=="string"||e.name==="") return "missing name";
  if(typeof e.was!=="number"||!isFinite(e.was)) return "missing/invalid was (the date this overrides, epoch ms)";
  if(e.was<CAL_T_MIN||e.was>CAL_T_MAX) return "was is outside the plausible range (2009-2100)";
  if(e.t===undefined) return "missing t (use t:null for a CANCELLED release, so the two cases stay distinct)";
  if(e.t!==null){
    if(typeof e.t!=="number"||!isFinite(e.t)) return "t must be epoch ms or null (cancelled)";
    if(e.t<CAL_T_MIN||e.t>CAL_T_MAX) return "t is outside the plausible range (2009-2100)";
    if(Math.abs(e.t-e.was)>CAL_EXC_MAX_SHIFT_MS)
      return "shift of "+Math.round(Math.abs(e.t-e.was)/86400000)+"d exceeds CAL_EXC_MAX_SHIFT_MS ("+
             Math.round(CAL_EXC_MAX_SHIFT_MS/86400000)+"d); a move that large is a data-entry error, not a reschedule";
  }
  if(e.tier!==undefined&&e.tier!==1&&e.tier!==2) return "tier must be 1 or 2";
  if(e.kind!==undefined&&CAL_KINDS.indexOf(e.kind)<0) return "kind must be one of "+CAL_KINDS.join("|");
  if(typeof e.src!=="string"||e.src==="") return "missing src: an override without the page it came from is not checkable";
  if(!(typeof e.retrieved==="string"&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(e.retrieved)))
    return "missing/malformed retrieved (YYYY-MM-DD)";
  return null;
}
/* Why a COVERAGE row is unusable, or null if it is fine. src and retrieved are MANDATORY here:
   a coverage entry is a claim that somebody checked a page, and a claim with no page is exactly
   the lie this whole mechanism exists to prevent. A malformed coverage row grants no coverage. */
function calCoverageRowFault(c){
  if(!c||typeof c!=="object") return "row is not an object";
  if(typeof c.name!=="string"||c.name==="") return "missing name (use \"*\" for the whole calendar)";
  if(typeof c.from!=="number"||!isFinite(c.from)) return "from is not epoch ms";
  if(typeof c.to!=="number"||!isFinite(c.to)) return "to is not epoch ms";
  if(c.from<CAL_T_MIN||c.to>CAL_T_MAX) return "from/to outside the plausible range (2009-2100)";
  if(!(c.from<=c.to)) return "from is after to";
  if(typeof c.src!=="string"||c.src==="") return "missing src: a coverage claim without the page it came from is not checkable";
  if(!(typeof c.retrieved==="string"&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(c.retrieved)))
    return "missing/malformed retrieved (YYYY-MM-DD)";
  /* The vouch. A "*" row claims the WHOLE calendar is known, and part of the calendar is
     GENERATED from RELEASES.RULE - dates nobody has checked unless they say so. A "*" claim
     that says nothing about the rule series is structurally incomplete, so the field is
     mandatory in shape here; whether it still matches the generators in force is a live
     question, answered by controlEligible(), not frozen into row validity. Optional on a
     named row.
     Each entry is a COPY OF THE RULE ROW SIGNED, validated by calRuleRowFault - the same
     validator, so a signature can never be a specification the generator could not run, and a
     human signing "every-fortnight" is told so in the same words. A bare NAME is refused
     outright rather than accepted for compatibility: a name-shaped vouch cannot see a vouched
     row being edited, deleted or duplicated, which is the whole reason this field has a shape. */
  if(c.rules!==undefined){
    if(!Array.isArray(c.rules))
      return "rules must be an array of rule-row SPECIFICATIONS - copy the rows you checked out of RELEASES.RULE, "+
             "e.g. rules:[{name:\"NFP\",kind:\"scheduled-numeric\",tier:1,et:[8,30],rule:\"first-friday-of-month\"}]";
    for(let i=0;i<c.rules.length;i++){
      if(typeof c.rules[i]==="string")
        return "rules["+i+"] is the name \""+c.rules[i]+"\"; a vouch must be a copy of the RULE ROW it signs "+
               "({name,kind,tier,et,rule}), because a name cannot tell whether that row has since been edited, "+
               "removed or joined by a second one";
      const w=calRuleRowFault(c.rules[i]);
      if(w!==null) return "rules["+i+"] is not a usable rule specification: "+w;
      /* R7. A signature is a RECORD OF WHAT WAS CHECKED, so it must be an independent snapshot. Hold a live
         reference into RELEASES.RULE and the signature becomes a copy of the thing it is checking: it can never
         disagree with it, so no edit ever invalidates it and the vouch silently degrades to an always-true
         constant. `rules: RELEASES.RULE.slice()` is the dangerous form because it reads as "a copy" and
         FILLING.md's own wording ("copy the rows you checked out of RELEASES.RULE") invites it. The `et` array
         is checked separately: Object.assign({}, row) copies the row but SHARES et, so an in-place
         RELEASES.RULE[i].et[0]=10 would otherwise leave the audit printing the edited value as the signature. */
      if(Array.isArray(RELEASES.RULE)) for(let k=0;k<RELEASES.RULE.length;k++){
        const live=RELEASES.RULE[k];
        if(c.rules[i]===live)
          return "rules["+i+"] IS RELEASES.RULE["+k+"], not a copy of it. A signature that holds a live reference "+
                 "to the row it signs can never disagree with it, so no edit would ever invalidate this claim. "+
                 "Write the specification out as its own object literal.";
        if(live&&c.rules[i].et===live.et)
          return "rules["+i+"] shares its `et` array with RELEASES.RULE["+k+"] (an Object.assign or spread copies "+
                 "the row but not the array inside it). An in-place edit to that time would change the signature "+
                 "and the generator together and go unnoticed. Write et out as a new array.";
      }
    }
  }else if(c.name==="*"){
    return "a \"*\" claim must list the rule specifications it vouches for, e.g. "+
           "rules:[{name:\"NFP\",kind:\"scheduled-numeric\",tier:1,et:[8,30],rule:\"first-friday-of-month\"}]; "+
           "coverage protects against a missing DATED row, the vouch is what covers a WRONG RULE row";
  }
  return null;
}
/* Shared validator body: returns the REJECTED rows as [{i,name,why}] - an empty array means the
   table is clean. The tables a human types into are the ones that must never fail silently: a
   dropped row reads as "no event known", which is this unit's defined meaning for something
   else entirely. */
function calValidateRows(list,fault,label){
  const bad=[];
  if(!Array.isArray(list)){ bad.push({i:-1,name:null,why:label+" is not an array"}); return bad; }
  for(let i=0;i<list.length;i++){
    const r=list[i], why=fault(r);
    if(why!==null) bad.push({i:i,name:(r&&typeof r==="object"&&typeof r.name==="string")?r.name:null,why:why});
  }
  return bad;
}
function calValidateDated(rows){
  return calValidateRows(rows===undefined?RELEASES.DATED:rows,calDatedRowFault,"RELEASES.DATED");
}
/* Faults that no single EXCEPTIONS row can carry, because they are properties of the PAIR.
   calApplyExceptions walks the table in array order applying each row once, so two rows that
   interact make the emitted calendar depend on where a human happened to type them:
     - a CHAIN (X -> Y, then Y -> Z, the shape an agency produces when it revises a date it has
       already revised): in one order the intermediate Y is removed and only Z survives; in the
       other, Y is emitted after the row that would have removed it and the calendar reports a
       release at a date that NEVER HAPPENED, beside the real one. Iterating to a fixpoint does
       not help - emission is unconditional, so it oscillates.
     - two rows overriding the SAME `was`: the first removes the base and emits, the second finds
       nothing to remove and emits anyway; two releases, and which is "the" correction is
       whichever was typed first.
   BOTH rows of the pair are rejected, not just the later one. Applying half a chain would leave
   the intermediate date standing as if it were the answer, which is the phantom again wearing a
   deterministic hat. A loud rejection (controlEligible -> "table-errors", counted by the audit,
   listed in CAL_EXC_BAD) is far better than a confident wrong date, and the repair is one edit:
   collapse the chain into a single row X -> Z.
   Deliberately NAME-SCOPED: the two seeded corrections share an instant (NFP moves TO
   2026-02-11, CPI moves FROM it) and are unrelated events, not a chain. */
function calExceptionCrossFaults(list){
  const bad=[];
  if(!Array.isArray(list)) return bad;
  const why=Object.create(null);
  for(let i=0;i<list.length;i++){
    const e=list[i]; if(calExceptionRowFault(e)!==null) continue;
    for(let j=i+1;j<list.length;j++){
      const f=list[j]; if(calExceptionRowFault(f)!==null||f.name!==e.name) continue;
      let m=null;
      if((e.t!==null&&e.t===f.was)||(f.t!==null&&f.t===e.was))
        m="rows "+i+" and "+j+" CHAIN on "+e.name+": one override's `t` is the other's `was`, so the "+
          "emitted calendar would depend on array order and can report a date that never happened. "+
          "Both are refused; collapse the chain into a single row (original -> final).";
      else if(e.was===f.was)
        m="rows "+i+" and "+j+" both override "+e.name+" at the same `was`, so both emit and the "+
          "result depends on array order. Both are refused; keep exactly one.";
      if(m!==null){ if(why[i]===undefined) why[i]=m; if(why[j]===undefined) why[j]=m; }
    }
  }
  for(let i=0;i<list.length;i++) if(why[i]!==undefined)
    bad.push({i:i,name:(list[i]&&typeof list[i].name==="string")?list[i].name:null,why:why[i]});
  return bad;
}
function calValidateExceptions(rows){
  const list=rows===undefined?RELEASES.EXCEPTIONS:rows;
  const bad=calValidateRows(list,calExceptionRowFault,"RELEASES.EXCEPTIONS");
  const cross=calExceptionCrossFaults(list);
  for(let i=0;i<cross.length;i++) bad.push(cross[i]);
  return bad;
}
function calValidateRule(rows){
  return calValidateRows(rows===undefined?RELEASES.RULE:rows,calRuleRowFault,"RELEASES.RULE");
}
/* The EXCEPTIONS rows that may actually be applied: per-row valid AND not half of an
   order-dependent pair. calApplyExceptions and calExcPad both read this, so what the generator
   applies and what the validator accepts can never diverge. */
function calUsableExceptions(){
  const list=Array.isArray(RELEASES.EXCEPTIONS)?RELEASES.EXCEPTIONS:[];
  const cross=calExceptionCrossFaults(list), skip=Object.create(null), out=[];
  for(let i=0;i<cross.length;i++) skip[cross[i].i]=true;
  for(let i=0;i<list.length;i++) if(!skip[i]&&calExceptionRowFault(list[i])===null) out.push(list[i]);
  return out;
}
/* Are the three tables the calendar is GENERATED from currently usable? A rejected row in any of
   them means a release this unit would otherwise emit is missing, and a missing release reads as
   a quiet window - so nothing may claim a period is quiet while this is false. Read by
   controlEligible() ("table-errors") and by eventTag() (evCov). COVERAGE is not included: a
   malformed coverage row grants no coverage at all, which is already the safe direction. */
function calTablesUsable(){
  return calValidateRule().length===0&&calValidateDated().length===0&&calValidateExceptions().length===0;
}
/* Names of the rule series currently in force. Invalid rows are excluded because they generate
   nothing; they are caught by calTablesUsable() instead, which is the stronger refusal.
   NOTE: a name is what a human FIXES, never what a vouch is checked against - see below. */
function calRuleSeriesNames(){
  const list=Array.isArray(RELEASES.RULE)?RELEASES.RULE:[], out=[];
  for(let i=0;i<list.length;i++)
    if(calRuleRowFault(list[i])===null&&out.indexOf(list[i].name)<0) out.push(list[i].name);
  return out;
}
/* The rule rows currently in force - the GENERATOR SPECIFICATIONS a "*" claim has to have
   signed, one entry per row (never de-duplicated by name: two rows under one name are two
   generators, and a signature on one says nothing about the other). */
function calRuleSeriesSpecs(){
  const list=Array.isArray(RELEASES.RULE)?RELEASES.RULE:[], out=[];
  for(let i=0;i<list.length;i++) if(calRuleRowFault(list[i])===null) out.push(list[i]);
  return out;
}
/* THE SIGNED SET. The five fields calRuleRowFault makes MANDATORY on a rule row are exactly the
   fields that decide what the generator does with it: `name` (what the emitted release is
   called), `rule` (which dates), `et` (what time on those dates) and `kind`/`tier` (what the
   emitted row says the release IS - H3 splits informed from narrative flow by kind, and evTier
   is persisted on every ledger row). So the signed set is the mandatory set: every field the
   validator demands is part of the specification and none is left to argue about. `rule`+`et`
   are the ones that move dates and are non-negotiable; `kind`/`tier` are included because a
   signature is cheap to renew and a wrong tag on a real release is not, and because drawing the
   line anywhere inside the mandatory five would need an argument this unit cannot check.
   JSON, so no separator can be forged by a name that happens to contain one. */
function calRuleSpecKey(r){ return JSON.stringify([r.name,r.rule,r.et[0],r.et[1],r.kind,r.tier]); }
function calPad2(n){ return (n<10?"0":"")+n; }
function calRuleSpecLabel(r){
  return r.name+" ("+r.rule+", "+calPad2(r.et[0])+":"+calPad2(r.et[1])+" ET, tier "+r.tier+", "+r.kind+")";
}
/* Everything wrong with ONE coverage entry's vouch, in three deliberately different words
   because the three repairs are different -> {unvouched, changed, stale, names, ok}.
     unvouched  a rule row is in force and NO signature even names it. Somebody added a
                generator (or a second row under a new name) after the claim was signed.
     changed    a signature names the series but signs a DIFFERENT specification. The vouched
                row was edited in place, or a second row was added under the same name: either
                way the dates the human checked are not the dates now being generated.
     stale      a signature names a series that is no longer in force at all. The row was
                removed or renamed, so the series generates nothing, its releases are absent
                from the calendar, and every window that held one now reads quiet - the worst
                available failure direction, and the one a name-shaped vouch could not see.
   `names` are the in-force series a human has to re-check (unvouched + changed); `ok` is the
   only state that grants a control window. A signature that fails calRuleRowFault is ignored
   here because the whole coverage row is already rejected by calCoverageRowFault and grants
   nothing - a rejected claim can never be the reason a window looks quiet. */
function calCoverageVouchFaults(c){
  const out={unvouched:[],changed:[],stale:[],names:[],ok:false};
  const force=calRuleSeriesSpecs(), signed=(c&&Array.isArray(c.rules))?c.rules:[];
  const sigKey=Object.create(null), sigByName=Object.create(null), forceName=Object.create(null);
  for(let i=0;i<signed.length;i++){
    const v=signed[i];
    if(!v||typeof v!=="object"||calRuleRowFault(v)!==null) continue;
    sigKey[calRuleSpecKey(v)]=true;
    if(sigByName[v.name]===undefined) sigByName[v.name]=v;
  }
  const forceKey=Object.create(null);
  for(let i=0;i<force.length;i++){ forceName[force[i].name]=true; forceKey[calRuleSpecKey(force[i])]=true; }
  for(let i=0;i<force.length;i++){
    const r=force[i];
    if(sigKey[calRuleSpecKey(r)]!==undefined) continue;
    if(out.names.indexOf(r.name)<0) out.names.push(r.name);
    if(sigByName[r.name]!==undefined)
      out.changed.push("SIGNATURE DOES NOT MATCH: "+calRuleSpecLabel(r)+" is the generator in force, but this claim was "+
        "signed against "+calRuleSpecLabel(sigByName[r.name])+" - the row was edited, or joined by another under the "+
        "same name, after the schedule was read. Re-read it and re-sign, or restore the row.");
    else
      out.unvouched.push("NOT VOUCHED: "+calRuleSpecLabel(r)+" - no signature on this claim names that series, so "+
        "nobody has said they checked it against the agency schedule over this period.");
  }
  /* R6. This test is on the SPECIFICATION KEY, never on the name, and the asymmetry that preceded it was the
     whole defect: the force loop above matched by key while this loop matched by name, so a signed generator
     whose row had been deleted stayed "valid" as long as SOME row still carried its name. Two rows under one
     name is not a corner case - FILLING.md sanctions it and the R1c regression constructs it, so the very
     table shape this mechanism documents as correct was the one it could not police. Deleting one of two
     CLAIMS rows silently dropped 52 real releases, left the vouch reporting ok, and handed back
     {eligible:true, reason:"ok"} on every window that had held one: R1b reopened, wearing R1c's clothes. */
  for(let i=0;i<signed.length;i++){
    const v=signed[i];
    if(!v||typeof v!=="object"||calRuleRowFault(v)!==null) continue;
    if(forceKey[calRuleSpecKey(v)]!==undefined) continue;         /* this exact generator is still in force */
    if(forceName[v.name]!==undefined)
      out.stale.push("STALE VOUCH: "+calRuleSpecLabel(v)+" is signed here, and another row still carries the name "+
        "\""+v.name+"\", but THIS generator is gone - it was deleted or edited after the claim was signed. The "+
        "surviving row under the same name does not cover it: nothing generates these releases any more and every "+
        "window that held one now reads quiet. Restore the row or re-sign the claim without it.");
    else
      out.stale.push("STALE VOUCH: "+calRuleSpecLabel(v)+" is signed here but is no longer a rule series in force - "+
        "it was removed or renamed after this claim was signed, so nothing generates it and every window that held "+
        "one of its releases now reads quiet. Restore the row or re-sign the claim without it.");
  }
  out.ok=out.unvouched.length===0&&out.changed.length===0&&out.stale.length===0;
  return out;
}
/* Rule series in force this entry does not sign exactly as they stand; [] means none.
   NAMES, because a name is what a human edits - the full specifications are in the fault
   strings above. [] is NOT by itself permission: a stale signature leaves this empty and still
   refuses (calCoverageVouchFaults(...).ok is the only sufficient condition). */
function calCoverageVouchGap(c){ return calCoverageVouchFaults(c).names; }
/* Signatures on this entry that no longer describe anything in force. */
function calCoverageStaleVouch(c){ return calCoverageVouchFaults(c).stale; }
/* Does at least ONE of these covering entries still sign the generators in force? Vouches are
   never combined across entries, so this asks each entry the whole question by itself. */
function calCoverageAnyVouched(entries){
  for(let i=0;i<entries.length;i++) if(calCoverageVouchFaults(entries[i]).ok) return true;
  return false;
}
function calValidateCoverage(rows){
  return calValidateRows(rows===undefined?RELEASES.COVERAGE:rows,calCoverageRowFault,"RELEASES.COVERAGE");
}
function calRefresh(arr,list){ arr.length=0; for(let i=0;i<list.length;i++) arr.push(list[i]); return arr; }

/* ---- coverage: what the table claims to know ------------------------------------------- */

/* Valid coverage rows matching `want`. "*" (or no name) asks for FULL-calendar coverage and is
   satisfied only by a "*" row; a named request is satisfied by a row of that name or by "*". */
function calCoverageRows(want){
  const list=Array.isArray(RELEASES.COVERAGE)?RELEASES.COVERAGE:[], out=[];
  for(let i=0;i<list.length;i++){
    const c=list[i];
    if(calCoverageRowFault(c)!==null) continue;   /* a malformed claim grants nothing */
    if(c.name==="*"||c.name===want) out.push(c);
  }
  return out;
}
/* Is timestamp t inside declared coverage? -> {covered, entries}.
   name omitted (or "*") asks "is the WHOLE calendar known at t" - the question that decides
   whether an absent release means "quiet" or "unknown".
   An unusable t is never covered (bad data can never buy a claim of knowledge).
   A non-string name is a caller bug and throws, per this unit's bad-parameters rule. */
function coverageAt(t,name){
  if(!(name===undefined||name===null||typeof name==="string"))
    throw new TypeError("calendar: coverageAt name must be a string or omitted, got "+(typeof name));
  calRefresh(CAL_COVERAGE_BAD,calValidateCoverage());
  const out={covered:false,entries:[]};
  if(!calValidTime(t)) return out;
  const want=(name===undefined||name===null||name==="")?"*":name;
  const rows=calCoverageRows(want);
  for(let i=0;i<rows.length;i++) if(t>=rows[i].from&&t<=rows[i].to) out.entries.push(rows[i]);
  out.covered=out.entries.length>0;
  return out;
}
/* Is the whole span [t0,t1] inside ONE declared coverage entry? -> {covered, entries}.
   Adjacent entries are deliberately NOT unioned: a span that falls across two declarations is
   reported as uncovered, so a gap between two separately-confirmed periods can never be papered
   over by arithmetic. Declare one entry per contiguous confirmed period. */
function calCoverageSpan(t0,t1,name){
  if(!(name===undefined||name===null||typeof name==="string"))
    throw new TypeError("calendar: calCoverageSpan name must be a string or omitted, got "+(typeof name));
  calRefresh(CAL_COVERAGE_BAD,calValidateCoverage());
  const out={covered:false,entries:[]};
  if(typeof t0!=="number"||typeof t1!=="number"||!isFinite(t0)||!isFinite(t1)||!(t0<=t1)) return out;
  const want=(name===undefined||name===null||name==="")?"*":name;
  const rows=calCoverageRows(want);
  for(let i=0;i<rows.length;i++) if(rows[i].from<=t0&&rows[i].to>=t1) out.entries.push(rows[i]);
  out.covered=out.entries.length>0;
  return out;
}

/* ---- generation ------------------------------------------------------------------------ */

/* kind/tier for a name, from whichever table already describes it. Lookup only - it never
   invents a date, and returns null when the name is unknown to both tables. */
function calMetaFor(name){
  const R=Array.isArray(RELEASES.RULE)?RELEASES.RULE:[];
  for(let i=0;i<R.length;i++) if(calRuleRowFault(R[i])===null&&R[i].name===name)
    return {kind:R[i].kind,tier:R[i].tier};
  const D=Array.isArray(RELEASES.DATED)?RELEASES.DATED:[];
  for(let i=0;i<D.length;i++) if(calDatedRowFault(D[i])===null&&D[i].name===name)
    return {kind:D[i].kind||"scheduled-numeric",tier:D[i].tier||2};
  return null;
}
/* The rule-derived releases in [g0,g1], before any exception is applied.
   READS RELEASES.RULE - one walk per declared series, with the series' own name, kind, tier and
   publication time. Nothing is hardcoded here, so the table and the output cannot disagree, and
   calendarAudit() reports the same series this function emits. A row RELEASES.RULE cannot
   express is rejected by calRuleRowFault and generates nothing - which controlEligible() then
   treats as "table-errors", so the gap can never pass as quiet. */
function calRuleRows(g0,g1){
  const out=[], list=Array.isArray(RELEASES.RULE)?RELEASES.RULE:[];
  const d0=new Date(g0-86400000), d1=new Date(g1+86400000);   /* pad a UTC day each side, then filter exactly */
  for(let k=0;k<list.length;k++){
    const R=list[k]; if(calRuleRowFault(R)!==null) continue;   /* recorded in CAL_RULE_BAD by the caller */
    const p=calParseRule(R.rule), hh=R.et[0], mm=R.et[1];
    let g=0;
    if(p.every!==undefined){                                   /* weekly: walk days */
      let dd=Date.UTC(d0.getUTCFullYear(),d0.getUTCMonth(),d0.getUTCDate());
      const dE=Date.UTC(d1.getUTCFullYear(),d1.getUTCMonth(),d1.getUTCDate());
      for(;dd<=dE;dd+=86400000){
        if(g++>=CAL_MAX_ITER) throw new RangeError("calendar: day walk hit CAL_MAX_ITER; refusing a truncated list");
        const c=new Date(dd); if(c.getUTCDay()!==p.every) continue;
        const t=etToUtc(c.getUTCFullYear(),c.getUTCMonth(),c.getUTCDate(),hh,mm);
        if(t>=g0&&t<=g1) out.push({name:R.name,kind:R.kind,tier:R.tier,src:"rule",ref:null,retrieved:null,t:t});
      }
    }else{                                                     /* monthly: walk months */
      let y=d0.getUTCFullYear(), mo=d0.getUTCMonth();
      const yE=d1.getUTCFullYear(), moE=d1.getUTCMonth();
      while(y<yE||(y===yE&&mo<=moE)){
        if(g++>=CAL_MAX_ITER) throw new RangeError("calendar: month walk hit CAL_MAX_ITER; refusing a truncated list");
        const f=new Date(p.nth===-1?lastDowUtc(y,mo,p.dow):nthDowUtc(y,mo,p.dow,p.nth));
        const t=etToUtc(f.getUTCFullYear(),f.getUTCMonth(),f.getUTCDate(),hh,mm);
        if(t>=g0&&t<=g1) out.push({name:R.name,kind:R.kind,tier:R.tier,src:"rule",ref:null,retrieved:null,t:t});
        mo++; if(mo>11){mo=0;y++;}
      }
    }
  }
  return out;
}
/* Rule rows plus valid DATED rows in [g0,g1] - the calendar BEFORE exceptions. */
function calBaseRows(g0,g1){
  const out=calRuleRows(g0,g1);
  const dated=Array.isArray(RELEASES.DATED)?RELEASES.DATED:[];
  for(let i=0;i<dated.length;i++){
    const r=dated[i];
    if(calDatedRowFault(r)!==null) continue;      /* recorded in CAL_DATED_BAD by the caller */
    if(!(r.t>=g0&&r.t<=g1)) continue;
    out.push({name:r.name,kind:r.kind||"scheduled-numeric",tier:r.tier||2,src:"dated",
              ref:(typeof r.src==="string"?r.src:null),retrieved:(typeof r.retrieved==="string"?r.retrieved:null),t:r.t});
  }
  return out;
}
/* Largest legal shift in the current EXCEPTIONS table, so the generation pad is exactly as wide
   as it needs to be (0 when there are no exceptions) rather than always the worst case. */
function calExcPad(){
  const list=calUsableExceptions();
  let m=0;
  for(let i=0;i<list.length;i++){
    const e=list[i];
    if(e.t===null) continue;
    const d=Math.abs(e.t-e.was); if(d>m) m=d;
  }
  return m;
}
/* Apply EXCEPTIONS to a base row list, in place semantics returning a new array.
   Removal is by (name, t===was); emission is unconditional for a non-null t (see the table
   comment). An emitted correction that collides with an existing row of the same name and time
   UPGRADES that row to src:"corrected" rather than duplicating it. */
function calApplyExceptions(rows){
  /* calUsableExceptions(), not the raw table: it drops any row that is half of an
     order-dependent pair, so the result no longer depends on the order a human typed the rows
     in and a two-step reschedule can never leave a phantom release at the intermediate date. */
  const list=calUsableExceptions();
  let out=rows;
  for(let i=0;i<list.length;i++){
    const e=list[i];
    let base=null, keep=[];
    for(let j=0;j<out.length;j++){
      const r=out[j];
      if(r.name===e.name&&r.t===e.was){ base=r; continue; }   /* removed (an earlier correction may itself be corrected) */
      keep.push(r);
    }
    out=keep;
    if(e.t===null) continue;                       /* CANCELLED: removed, nothing emitted */
    const meta=(base?{kind:base.kind,tier:base.tier}:null)||calMetaFor(e.name)||{kind:"scheduled-numeric",tier:2};
    let dup=null;
    for(let j=0;j<out.length;j++) if(out[j].name===e.name&&out[j].t===e.t){ dup=out[j]; break; }
    if(dup){ dup.src="corrected"; dup.was=e.was; dup.ref=e.src; dup.retrieved=e.retrieved; continue; }
    out.push({name:e.name,kind:e.kind||meta.kind,tier:e.tier||meta.tier,src:"corrected",
              ref:e.src,retrieved:e.retrieved,t:e.t,was:e.was});
  }
  return out;
}

/* Every release in [t0,t1] inclusive, from all three tables, sorted by t.
   Each row carries src: "rule" (derived from the publication rule, subject to the holiday/BLS
   shifts described above), "dated" (an agency-published date entered by hand) or "corrected"
   (an agency-published correction, with the superseded instant in `was`), plus `ref` - the
   agency URL - and `retrieved`.
   THROWS on a non-numeric range or a span the generator cannot cover - see the header. */
function releasesBetween(t0,t1){
  /* refresh the hand-entry reject lists on every call, so the UI always sees current state */
  calRefresh(CAL_RULE_BAD,calValidateRule());
  calRefresh(CAL_DATED_BAD,calValidateDated());
  calRefresh(CAL_EXC_BAD,calValidateExceptions());
  if(typeof t0!=="number"||typeof t1!=="number"||!isFinite(t0)||!isFinite(t1))
    throw new TypeError("calendar: releasesBetween needs two finite epoch-ms numbers, got "+
      (typeof t0)+"/"+(typeof t1)+"; convert Dates and strings at the call site");
  if(!(t0<=t1)) return [];
  if(t1-t0>CAL_MAX_SPAN_MS)
    throw new RangeError("calendar: releasesBetween span "+Math.round((t1-t0)/86400000)+
      "d exceeds the generator guard of "+Math.round(CAL_MAX_SPAN_MS/86400000)+
      "d; refusing rather than returning a silently truncated list");
  /* Generate wide enough that an exception can pull a release INTO the range from outside it,
     apply the exceptions, then filter to the exact range - so a moved release lands where the
     agency says it landed and nowhere else. */
  const pad=calExcPad();
  const rows=calApplyExceptions(calBaseRows(t0-pad,t1+pad));
  const out=[];
  for(let i=0;i<rows.length;i++) if(rows[i].t>=t0&&rows[i].t<=t1) out.push(rows[i]);
  out.sort(function(a,b){ return (a.t-b.t)||(a.tier-b.tier)||(a.name<b.name?-1:a.name>b.name?1:0); });
  return out;
}

/* Nearest release to t within +/- horizonMin (default CAL_HORIZON_MIN), or null.
   mins is SIGNED whole minutes from t to the release: negative = it already happened.
   src is "rule", "dated" or "corrected" - carry it, do not drop it (see NOTES.md).
   Ties break to the lower tier number (higher relevance), then to the earlier release.
   null for: a horizon <= 0 or non-numeric, and for any t that is not a plausible epoch-ms
   number (null/0/false/NaN/Date/"1783080000000" all return null rather than a 1970 tag).
   THROWS for a horizon wider than CAL_MAX_HORIZON_MIN - a caller bug, refused not truncated. */
function nearestRelease(t,horizonMin){
  const H=(horizonMin==null?CAL_HORIZON_MIN:horizonMin);
  if(typeof H!=="number"||!isFinite(H)||!(H>0)) return null;
  if(H>CAL_MAX_HORIZON_MIN)
    throw new RangeError("calendar: horizon "+H+" min exceeds CAL_MAX_HORIZON_MIN ("+
      CAL_MAX_HORIZON_MIN+"); refusing rather than returning a truncated search");
  if(!calValidTime(t)) return null;
  const list=releasesBetween(t-H*60000,t+H*60000);
  let best=null,bd=Infinity;
  for(let i=0;i<list.length;i++){
    const r=list[i], d=Math.abs(r.t-t);
    if(best===null||d<bd||(d===bd&&(r.tier<best.tier||(r.tier===best.tier&&r.t<best.t)))){ best=r; bd=d; }
  }
  if(best===null) return null;
  const o={name:best.name,kind:best.kind,tier:best.tier,src:best.src,ref:best.ref,retrieved:best.retrieved,
           t:best.t,mins:Math.round((best.t-t)/60000)};
  if(best.was!==undefined) o.was=best.was;
  return o;
}

/* Compact five-key tag, safe to persist on every ledger row so any recorded window can be
   re-analysed by event distance retroactively.

   ev/evMins/evTier/evSrc keep their existing meanings. evSrc is the provenance class:
   "rule" = inferred from the publication rule, which is AT RISK in holiday and shutdown weeks
   (NOTES.md); "dated" = a date an agency published; "corrected" = an agency-published
   correction to a date this unit would otherwise have produced.

   evCov is the fifth key and it distinguishes the TWO KINDS OF SILENCE:
     evCov === true   t is inside declared full-calendar COVERAGE and the generating tables are
                      currently usable. ev:null therefore means "NO RELEASE HERE" rather than
                      "never heard of this period".
     evCov === false  t is outside declared coverage, OR a table this calendar is generated from
                      currently holds a rejected row, OR no covering claim still signs the rule
                      generators in force. Either way ev:null means "UNKNOWN" - a real release
                      may be sitting in this window.
     evCov === null   t is not a usable timestamp; the whole tag is null, as before.
   A non-null ev with evCov:false is still a real release - the release is known even though the
   period around it is not. Do not read evCov as a confidence flag on ev itself.

   evCov IS NOT CONTROL ELIGIBILITY, and nothing downstream may treat it as such.
   controlEligible(t) is the ONLY authority on whether a window may be used as a section 11.3
   time-matched control: it additionally requires the +/-45 min exclusion band to be clear, the
   coverage to span the WHOLE band rather than merely contain t, and the covering "*" entry to
   vouch for every rule series in force. evCov:true is a necessary condition of eligibility, not
   a sufficient one - a window 5 minutes from CPI inside declared coverage has evCov:true. The
   key exists so a persisted ledger row can tell "quiet" from "unknown" months later; the ruling
   is always re-taken by calling controlEligible.

   Why evCov goes false on a broken table: a rejected DATED/EXCEPTIONS/RULE row is a release this
   unit would otherwise have emitted, and the failure direction is deletion. Drop `retrieved`
   from a correction and the correction stops applying: the real print vanishes from the calendar
   while the window that held it still sits inside a declared period. Tying evCov to
   calTablesUsable() is what stops that deletion from reading as quiet.
   Why it also goes false on a broken VOUCH: deleting a rule row is not a table *error* - the
   remaining table is perfectly valid - but it deletes a whole release series, so every window
   that held one of its prints reads quiet inside a period declared complete. That tag is then
   persisted on thousands of ledger rows and read months later as "quiet". A covering claim whose
   signature no longer matches the generators in force therefore buys no evCov either. */
function eventTag(t,horizonMin){
  const r=nearestRelease(t,horizonMin);            /* throws on a bad horizon, before anything else */
  if(!calValidTime(t)) return {ev:null,evMins:null,evTier:null,evSrc:null,evCov:null};
  const cv=coverageAt(t);
  const cov=cv.covered&&calTablesUsable()&&calCoverageAnyVouched(cv.entries);
  if(r===null) return {ev:null,evMins:null,evTier:null,evSrc:null,evCov:cov};
  return {ev:r.name,evMins:r.mins,evTier:r.tier,evSrc:r.src,evCov:cov};
}

/* THE GUARD. Can the window at t be used as a section 11.3 time-matched control?
   -> {eligible, reason}, reason being one of:
     "ok"               inside declared full-calendar coverage, and no scheduled release within
                        CAL_CONTROL_EXCL_MIN minutes either side.
     "release-nearby"   a known release sits in the window or within two windows of it.
     "table-errors"     RELEASES.RULE, RELEASES.DATED or RELEASES.EXCEPTIONS currently has a
                        rejected row, so the calendar cannot be trusted to be complete even where
                        it claims to be - a rejected row is a release that is not emitted, and a
                        release that is not emitted reads as a quiet window. Fix the row
                        (calValidateRule/calValidateDated/calValidateExceptions) and re-ask.
     "unknown-coverage" nothing is known about this period, or coverage does not span the whole
                        exclusion band. Silence here is ignorance, not quiet.
     "unvouched-rule"   the period IS declared, but its "*" entry does not sign every rule
                        specification in force (RELEASES.COVERAGE `rules`) - either a generator
                        nobody named, or a signed name whose specification has since changed.
                        Part of this calendar is GENERATED - first-Friday NFP, every-Thursday
                        claims - and those rules have real, unmodelled holiday and shutdown
                        exceptions. A declaration protects against a missing DATED row; it says
                        nothing about a WRONG RULE row, and a rule that puts a real release a day
                        away leaves the actual release window looking quiet. Nov 2026 is the
                        worked case: BLS moves claims to Wednesday in Thanksgiving week, so the
                        rule marks Thursday busy and leaves the Wednesday print - a real release -
                        eligible. Vouching is the human saying "I read the published schedule over
                        this period for exactly these generators and every deviation is in
                        EXCEPTIONS"; without it the rule's output is inference, not knowledge.
     "stale-vouch"      the covering entry signs a rule series that is NO LONGER IN FORCE. The
                        row was removed or renamed after the claim was signed, so that series
                        generates nothing at all and every window that held one of its releases
                        now reads quiet inside a period declared complete. The signature is the
                        only evidence left that the series was ever there, so it refuses rather
                        than reading as surplus. Restore the row, or re-sign the claim without it.
     "bad-timestamp"    t is not a usable epoch-ms instant.

   SECTION 11.3 CONTROL SELECTION MUST CALL THIS and keep only {eligible:true} candidates.
   Without it the COVERAGE declaration is decoration: an uncovered window would pass the
   slot/weekday/quarter match, look quiet because this unit has no row for it, and pull a real
   shock into the control group - biasing every difference-in-differences estimate toward zero,
   invisibly. Counting the rejects is also how section 11.3's "control coverage >= 80%" figure
   is computed honestly: a window with too few ELIGIBLE controls is unmatched and unscored, not
   scored against a thinner set. */
function controlEligible(t){
  if(!calValidTime(t)) return {eligible:false,reason:"bad-timestamp"};
  /* The table check comes BEFORE the proximity check, and the order is load-bearing even though
     the verdict is identical either way. These reason strings are counted to produce section
     11.3's "control coverage >= 80%" figure; reporting a window as ordinary release proximity
     while a table is broken makes the fault invisible in the one statistic meant to expose thin
     coverage. A refused row is a release this unit does not emit, which is a stronger and
     different objection than "something is nearby", so it is the one that gets said. */
  if(!calTablesUsable()) return {eligible:false,reason:"table-errors"};
  if(nearestRelease(t,CAL_CONTROL_EXCL_MIN)!==null) return {eligible:false,reason:"release-nearby"};
  const w=CAL_CONTROL_EXCL_MIN*60000;
  const span=calCoverageSpan(t-w,t+w);
  if(!span.covered) return {eligible:false,reason:"unknown-coverage"};
  /* Vouches are never combined across entries, for the same reason coverage periods are never
     unioned: one entry must carry the whole claim itself. A clean vouch is the ONLY sufficient
     condition - an entry whose signature no longer matches the generator it signed grants
     nothing, whichever direction it drifted in. */
  let gap=false, stale=false;
  for(let i=0;i<span.entries.length;i++){
    const f=calCoverageVouchFaults(span.entries[i]);
    if(f.ok) return {eligible:true,reason:"ok"};
    if(f.unvouched.length>0||f.changed.length>0) gap=true; else if(f.stale.length>0) stale=true;
  }
  return {eligible:false,reason:(gap||!stale)?"unvouched-rule":"stale-vouch"};
}

/* Widest slice of one coverage period the audit will generate releases for. The audit is a
   read-it-before-you-believe-it surface, not a batch job, and nobody declares five verified
   years in one row; a wider claim is scanned over its first slice and SAYS SO. */
const CAL_AUDIT_SCAN_MAX_MS=5*366*86400000;
/* What a "*" claim actually rests on, and whether it can actually supply a control window:
   -> {ruleRows, win, to, partial}.
     ruleRows  how many releases inside the scanned slice are GENERATED (src:"rule") rather than
               read off a page - the inference the claim rests on.
     win       the earliest instant inside the period that controlEligible() ACCEPTS, or null.
   `win` is what makes calendarAudit().controlWindowsPossible mean what its name says. The field
   used to mean only "a vouched '*' row exists", which over-claims in two ways a period-blind
   check cannot see: a "*" period narrower than the +/-45 min band can never span the band, so
   every window inside it still reads {eligible:false, reason:"unknown-coverage"}; and a period
   with a release every half hour has no clear window either. The candidate found here is the
   first instant at least CAL_CONTROL_EXCL_MIN from both the period edges and every release in
   it, and it is then handed to controlEligible() and only counted if IT agrees - the audit's
   headline claim is verified against the guard rather than asserted beside it. */
function calStarScan(c){
  const out={ruleRows:null,win:null,to:(c&&typeof c.to==="number")?c.to:null,partial:false};
  if(!c||calCoverageRowFault(c)!==null||c.name!=="*") return out;
  let hi=c.to;
  if(hi-c.from>CAL_AUDIT_SCAN_MAX_MS){ hi=c.from+CAL_AUDIT_SCAN_MAX_MS; out.partial=true; }
  out.to=hi;
  const rows=releasesBetween(c.from,hi);
  out.ruleRows=0;
  for(let i=0;i<rows.length;i++) if(rows[i].src==="rule") out.ruleRows++;
  if(!calTablesUsable()||!calCoverageVouchFaults(c).ok) return out;   /* nothing inside can be eligible */
  const w=CAL_CONTROL_EXCL_MIN*60000;
  let cur=c.from+w; const end=hi-w;
  if(cur>end) return out;                       /* the period is narrower than the exclusion band */
  /* sweep: push the candidate past every release whose band would touch it. rows are sorted. */
  for(let i=0;i<rows.length;i++){
    const rt=rows[i].t;
    if(rt-w>cur) break;                         /* [cur, rt-w) is clear, so cur is clear */
    if(rt+w+1>cur) cur=rt+w+1;
  }
  if(cur>end) return out;
  if(controlEligible(cur).eligible===true) out.win=cur;
  return out;
}

/* A UTC instant rendered as the US EASTERN calendar date it falls on. Coverage bounds describe
   ET-shaped source pages, so rendering them in UTC would print an off-by-one day at both ends. */
function calEtDateIso(ms){
  return new Date(ms-usEasternOffsetMinutes(ms)*60000).toISOString().slice(0,10);
}
/* One call that shows how full the calendar actually is. Returns a plain object; `lines` and
   `text` are the human-eyeball form. Nothing here reads the network or a clock - it reports the
   tables as they stand. */
function calendarAudit(){
  const ruleBad=calValidateRule(), datedBad=calValidateDated();
  const excBad=calValidateExceptions(), covBad=calValidateCoverage();
  const dated=Array.isArray(RELEASES.DATED)?RELEASES.DATED:[];
  /* Object.create(null): a row named "toString" or "constructor" must be counted like any
     other, and a plain {} would inherit those keys and swallow it. */
  const names=Object.create(null), order=[]; let unsourced=0, datedValid=0;
  for(let i=0;i<dated.length;i++){
    const r=dated[i]; if(calDatedRowFault(r)!==null) continue;
    datedValid++;
    if(names[r.name]===undefined){ names[r.name]=0; order.push(r.name); }
    names[r.name]++;
    if(typeof r.src!=="string"||typeof r.retrieved!=="string") unsourced++;
  }
  /* Rule series as the GENERATOR sees them - calRuleRows reads the same rows through the same
     validator, so the audit can no longer advertise a series that emits nothing. */
  const ruleList=Array.isArray(RELEASES.RULE)?RELEASES.RULE:[], ruleSeries=[];
  for(let i=0;i<ruleList.length;i++){
    const r=ruleList[i]; if(calRuleRowFault(r)!==null) continue;
    ruleSeries.push({name:r.name,rule:r.rule,tier:r.tier,kind:r.kind,et:r.et.slice()});
  }
  const ruleNames=ruleSeries.map(function(r){ return r.name; });
  /* exceptions: does each one actually override something, or is it an insertion? Only rows the
     generator will actually apply are listed; the rest are in exceptionsBad with their reason. */
  const exc=Array.isArray(RELEASES.EXCEPTIONS)?RELEASES.EXCEPTIONS:[], usable=calUsableExceptions(), excRows=[];
  for(let i=0;i<usable.length;i++){
    const e=usable[i];
    let matched=false;
    const base=calBaseRows(e.was-86400000,e.was+86400000);
    for(let j=0;j<base.length;j++) if(base[j].name===e.name&&base[j].t===e.was){ matched=true; break; }
    excRows.push({name:e.name,was:e.was,t:e.t,cancelled:e.t===null,matched:matched,
                  effect:(e.t===null?"cancels":(matched?"overrides":"inserts")),src:e.src,retrieved:e.retrieved});
  }
  const cov=[]; let full=0, ctlWin=null;
  const covList=Array.isArray(RELEASES.COVERAGE)?RELEASES.COVERAGE:[];
  for(let i=0;i<covList.length;i++){
    const c=covList[i]; if(calCoverageRowFault(c)!==null) continue;
    const vf=calCoverageVouchFaults(c);
    /* How much of this claim rests on INFERENCE - a "*" period is only as good as the rule rows
       inside it, and those are generated, not read off a page - and whether any window inside it
       is ACTUALLY control-eligible. One generation pass answers both (calStarScan). */
    const scan=calStarScan(c);
    const sigs=[];
    if(Array.isArray(c.rules)) for(let j=0;j<c.rules.length;j++){
      const v=c.rules[j];
      sigs.push(calRuleRowFault(v)===null?calRuleSpecLabel(v):("(unusable signature: "+calRuleRowFault(v)+")"));
    }
    cov.push({name:c.name,from:c.from,to:c.to,
              fromIso:calEtDateIso(c.from),toIso:calEtDateIso(c.to),
              days:Math.round((c.to-c.from)/86400000),src:c.src,retrieved:c.retrieved,
              rules:Array.isArray(c.rules)?c.rules.map(function(v){ return (v&&typeof v.name==="string")?v.name:null; }):null,
              ruleSpecs:Array.isArray(c.rules)?sigs:null,
              unvouchedRules:vf.names,vouchOk:vf.ok,vouchFaults:vf.unvouched.concat(vf.changed).concat(vf.stale),
              ruleDerivedRows:scan.ruleRows,scanPartial:scan.partial,
              scannedToIso:scan.to===null?null:calEtDateIso(scan.to),
              controlWindow:scan.win,
              controlWindowIso:scan.win===null?null:new Date(scan.win).toISOString()});
    if(c.name==="*"){ full+=(c.to-c.from); if(scan.win!==null&&ctlWin===null) ctlWin=scan.win; }
  }
  /* every name this instrument expects, plus every name either table actually mentions */
  const all=CAL_EXPECTED_NAMES.slice();
  order.concat(ruleNames).concat(excRows.map(function(e){ return e.name; })).forEach(function(n){
    if(all.indexOf(n)<0) all.push(n);
  });
  /* Coverage is a PERIOD, never a yes/no. This used to record only THAT a name appeared in some
     coverage row: a "*" row covering ONE HOUR on 2026-06-01 reported every series as covered
     across all of history, and the shipped FOMC-2026 row read as covering FOMC for all time -
     on the very surface FILLING.md tells a maintainer to read before believing a declaration.
     Each name now carries the periods that actually cover it, and `uncoveredNames` keeps its
     narrow meaning: no covering period ANYWHERE. */
  const byName=[];
  for(let i=0;i<all.length;i++){
    const n=all[i], periods=[];
    for(let j=0;j<cov.length;j++) if(cov[j].name===n||cov[j].name==="*")
      periods.push({via:cov[j].name,from:cov[j].from,to:cov[j].to,fromIso:cov[j].fromIso,toIso:cov[j].toIso});
    byName.push({name:n,periods:periods});
  }
  const uncovered=byName.filter(function(b){ return b.periods.length===0; }).map(function(b){ return b.name; });
  const out={
    datedRows:dated.length, datedValid:datedValid, datedRejected:datedBad.length,
    datedBad:datedBad, datedNames:order.map(function(n){ return {name:n,count:names[n]}; }),
    datedUnsourced:unsourced,
    ruleSeries:ruleSeries, ruleRows:ruleList.length, ruleRejected:ruleBad.length, ruleBad:ruleBad,
    exceptionRows:exc.length, exceptionsRejected:excBad.length, exceptionsBad:excBad, exceptions:excRows,
    exceptionsInserting:excRows.filter(function(e){ return e.effect==="inserts"; }).length,
    coverageRows:covList.length, coverageRejected:covBad.length, coverageBad:covBad, coverage:cov,
    fullCoverageDays:Math.round(full/86400000),
    tablesUsable:calTablesUsable(),
    /* Not "a '*' row exists", and not even "a fully signed '*' row exists": an actual instant
       inside a declared period that controlEligible() accepts. controlWindowExample is that
       instant, so the claim can be re-checked by calling the guard on it. */
    controlWindowsPossible:ctlWin!==null,
    controlWindowExample:ctlWin,
    controlWindowExampleIso:ctlWin===null?null:new Date(ctlWin).toISOString(),
    coverageByName:byName,
    uncoveredNames:uncovered,
    lines:[]
  };
  const L=out.lines;
  L.push("calendar audit - the table is PARTIAL by construction; this is how partial.");
  L.push("  DATED rows: "+out.datedValid+" valid, "+out.datedRejected+" rejected"+
         (out.datedUnsourced?(", "+out.datedUnsourced+" without src/retrieved"):"")+
         "  ["+out.datedNames.map(function(n){ return n.name+" x"+n.count; }).join(", ")+"]");
  L.push("  RULE series (these GENERATE rows): "+
         (out.ruleSeries.length?out.ruleSeries.map(function(r){ return r.name+" ("+r.rule+")"; }).join(", "):"(none)")+
         (out.ruleRejected?("  - "+out.ruleRejected+" REJECTED, generating nothing"):"")+
         "  - derived, at risk in holiday/shutdown weeks");
  L.push("  EXCEPTIONS: "+out.exceptionRows+" ("+out.exceptionsRejected+" rejected)"+
         out.exceptions.map(function(e){
           return "\n    "+e.name+" "+new Date(e.was).toISOString().slice(0,10)+" -> "+
                  (e.cancelled?"CANCELLED":new Date(e.t).toISOString().slice(0,10))+" ["+e.effect+"]";
         }).join(""));
  L.push("  COVERAGE declared: "+cov.length+" entr"+(cov.length===1?"y":"ies")+
         " ("+out.coverageRejected+" rejected)"+
         cov.map(function(c){
           let t="\n    "+c.name+"  "+c.fromIso+" .. "+c.toIso+" (ET)  ("+c.src+", read "+c.retrieved+")";
           if(c.name!=="*") return t;
           t+="\n      rests on "+(c.ruleDerivedRows===null?"?":c.ruleDerivedRows)+" rule-derived (inferred) dates"+
              (c.scanPartial?(" in the first "+CAL_AUDIT_SCAN_MAX_MS/86400000+" days (scanned to "+c.scannedToIso+
                              "; the rest of the period was not generated)"):"")+
              "; vouched: "+((c.rules&&c.rules.length)?c.rules.join(", "):"(none)");
           for(let k=0;k<c.vouchFaults.length;k++) t+="\n      "+c.vouchFaults[k];
           if(c.vouchFaults.length) t+="\n      -> controlEligible() refuses this period until a human re-reads the "+
                                       "schedule and re-signs this claim against the rows now in force.";
           t+="\n      first window inside it that controlEligible() actually accepts: "+
              (c.controlWindow===null?"NONE"+(c.vouchOk?" - the period is either narrower than the +/-"+
                 CAL_CONTROL_EXCL_MIN+" min exclusion band or has no clear gap in it":""):c.controlWindowIso);
           return t;
         }).join(""));
  L.push("  FULL-CALENDAR (\"*\") COVERAGE: "+(full>0?
         (out.fullCoverageDays+" days"+(ctlWin!==null?(", and at least one window in it is usable (e.g. "+out.controlWindowExampleIso+")"):
           " - but NOT ONE WINDOW inside it is control-eligible, so section 11.3 still has nothing to draw on")):
         "NONE - controlEligible() returns false for every timestamp, so no window anywhere is a usable section 11.3 control yet"));
  if(!out.tablesUsable)
    L.push("  TABLES REJECTED: "+out.ruleRejected+" rule, "+out.datedRejected+" dated, "+out.exceptionsRejected+
           " exception row(s) are refused. A refused row is a release this unit does NOT emit, so every window "+
           "reads evCov:false and controlEligible() refuses everything until they are fixed.");
  /* Per name, the PERIODS that cover it. A coverage claim covers when it says it covers and not
     one minute more, and reading it as a yes/no is what let a one-hour "*" row report the whole
     calendar as known - so the periods are printed, not a tick. */
  L.push("  COVERAGE BY NAME (a claim covers a PERIOD, never \"always\"):"+
         byName.map(function(b){
           return "\n    "+b.name+": "+(b.periods.length?b.periods.map(function(q){
             return q.fromIso+" .. "+q.toIso+" ET"+(q.via==="*"?" (via a \"*\" claim)":"");
           }).join(", "):"no coverage declared - windows here are UNKNOWN, not quiet");
         }).join(""));
  /* Qualified in the line itself. "NO COVERAGE AT ALL: (none)" was read as "everything is
     covered" when it only ever meant "every name appears in SOME period" - which a single
     one-hour "*" row satisfies for the whole calendar. The periods above are the answer; this
     line is only the count of names with no declared period anywhere. */
  L.push("  NAMES WITH NO DECLARED PERIOD ANYWHERE: "+(uncovered.length?uncovered.join(", "):"(none)")+
         " - this is NOT a statement that anything is covered NOW; read the periods above for when.");
  L.push("  A name with rows but no coverage is honest and unusable for control matching; see FILLING.md.");
  out.text=L.join("\n");
  return out;
}
