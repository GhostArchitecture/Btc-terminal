/* ===== calendar: scheduled-release detector + event-proximity tag =====
   All wall-clock reasoning is US Eastern; every time this unit stores or returns is UTC ms.
   No Date parsing, no toLocaleString, no timezone database - pure UTC arithmetic, because
   this codebase already shipped one bug where a calendar setter floored in the local zone.

   THE TABLE IS ENUMERATED, NEVER GENERATED. Every date in here was read off an agency feed or
   page and carries that URL and the date a human read it. There is no publication-rule engine
   any more: no first-Friday payrolls, no every-Thursday claims, no rule vocabulary at all. That
   machinery is deleted, and NOTES.md records why - three rounds of adversarial review found
   three different ways for a human's "I checked this generator" signature to outlive the
   generator it signed, and every one of those hazards was a hazard OF THE GENERATOR. An
   enumerated date has no rule to be wrong about, so it needs no signature: its provenance is
   the `src` URL and the `retrieved` date sitting on the row.

   Three rules govern every failure path here, because these tags get persisted on thousands of
   ledger rows and analysed by event distance months later:
     - BAD DATA never produces a tag. A missing/corrupt timestamp returns the all-null tag -
       deliberately indistinguishable from a genuinely quiet window, because the only safe thing
       to say about a row with no clock is nothing. What must be impossible is the reverse: a
       confident "GDP, 810 minutes away" falling out of a null.
     - BAD CALLER PARAMETERS throw. A horizon wider than this unit will reason about, or a
       non-numeric range, is a programmer error and refuses loudly rather than returning a
       truncated list that looks like an answer.
     - THE TABLE IS PARTIAL AND SAYS SO, IN ITS RETURN VALUES. "No release found at t" means
       "no release THIS TABLE KNOWS ABOUT is at t", and nothing stronger. Nothing in this unit
       can certify that a period is quiet, because nothing in this unit knows the whole calendar.
       coverageAt() and calendarAudit() report the spans the rows actually cover - a DERIVED
       fact, computed from the rows, declared by nobody - and controlEligible() hands back what
       the table knew so a caller records the caveat instead of assuming completeness.

   THE HONEST LIMITATION, STATED ONCE AND RETURNED BY THE CODE (CLAUDE.md section 11.3):
   every shock claim in the H-protocol is stated against TIME-MATCHED CONTROL windows - same
   UTC slot, same weekday, same quarter, and NO scheduled release in the window or the two
   windows either side. This table does not hold every release. A control window this unit
   accepts may therefore contain a real release nobody has told the table about, which puts a
   shock into the baseline it is being measured against and biases the difference-in-differences
   estimate TOWARD ZERO. That direction matters: the bias is conservative, so a surviving
   positive result is not manufactured by it - but a null result cannot be read as "no effect"
   without saying how full the calendar was. CAL_PARTIAL_CAVEAT is that sentence, returned on
   every controlEligible() answer so it travels with the data rather than living in a comment.
   The previous design tried to make this impossible with a hand-written coverage DECLARATION
   and refused every window that lacked one. As shipped no declaration existed, so it refused
   every timestamp in history and section 11.3 had no controls at all. A mechanism that refuses
   to answer is not safer than one that answers with a stated limitation. */

const CAL_HORIZON_MIN=1440;   /* +/- 24h: the documented proximity horizon for nearestRelease/eventTag */
/* Plausibility window for any instant this unit will reason about. null, 0, false and "" all
   coerce to 0 in ordinary JS arithmetic, and the unit used to answer them with a 1 Jan 1970
   release, 810 minutes away - a confident tier-2 tag on a row whose timestamp went missing.
   Nothing outside this window is a timestamp this instrument can have produced. */
const CAL_T_MIN=1230768000000; /* 2009-01-01T00:00:00Z - before any tape this tool will ever see */
const CAL_T_MAX=4102444800000; /* 2100-01-01T00:00:00Z */
/* An EXCEPTIONS row may move a release by at most this much. The bound is what makes the query
   pad provably sufficient: a release outside the queried range can only be pulled into it by a
   shift, so padding the scan by the largest legal shift cannot miss one. */
const CAL_EXC_MAX_SHIFT_MS=45*86400000;
/* Widest span this unit will answer a query over. It is a CALLER-SANITY bound, not a generator
   guard - there is no generator left to run out of iterations. A request wider than this is
   REFUSED rather than answered, because a range that wide is a units mistake at the call site
   (seconds for milliseconds, a Date coerced to a number) and an answer would look like data. */
const CAL_MAX_SPAN_MS=55*366*86400000;                        /* ~55 years */
const CAL_MAX_HORIZON_MIN=Math.floor(CAL_MAX_SPAN_MS/120000); /* ~27.5 years, since the range is +/-H */
/* Control exclusion half-width, in minutes. CLAUDE.md section 11.3 requires a control window to
   have no scheduled release in the window itself or in the two windows either side. A window is
   15 minutes, so that is 15 + 2*15 = 45 minutes of clearance measured from the window's own
   edges; +/-45 min from ANY instant inside the window is the conservative superset of that, and
   is used so a caller may pass a window start, mid or gate without changing the answer. */
const CAL_CONTROL_EXCL_MIN=45;
/* Release names this instrument expects to matter for BTC. Used ONLY by calendarAudit to answer
   "which release types are absent from the table entirely" - it is a checklist, never a source
   of dates. */
const CAL_EXPECTED_NAMES=["CPI","PPI","PCE","GDP","NFP","CLAIMS","FOMC","ISM","RETAIL"];
/* The BLS series, named so the audit can say WHICH gap it is looking at rather than printing a
   bare list. bls.gov is not reachable from the environment these tables were entered in, so no
   BLS schedule has been transcribed; what exists (two CPI dates, one payrolls correction) are
   fragments carried over from an earlier pass, not coverage. */
const CAL_BLS_NAMES=["CPI","PPI","NFP","CLAIMS"];
/* The kinds this unit knows. "scheduled-numeric" is a data print; "scheduled-policy" is a policy
   announcement (an FOMC rate decision). They are NOT interchangeable: H3 splits informed from
   narrative flow by release TYPE, so filing a rate decision as a data print would blur the exact
   distinction H3 exists to test. Validated as a closed set to catch typos in hand entry. */
const CAL_KINDS=["scheduled-numeric","scheduled-policy"];
/* Malformed hand-entered rows found by the most recent releasesBetween() call: the tables are
   the one thing here a human fills in, so their rejects are recorded rather than dropped.
   Shape: [{i, name, why}]. Also available on demand from the calValidate* functions. */
const CAL_DATED_BAD=[];
const CAL_EXC_BAD=[];
/* The sentence controlEligible() returns with every answer. It is a constant so the wording
   cannot drift between the code, the audit and NOTES.md, and so a caller can store it verbatim
   beside a recorded control. */
const CAL_PARTIAL_CAVEAT=
  "This release table is PARTIAL. It holds only enumerated, agency-sourced dates; no series in "+
  "it is complete and several expected series are absent entirely. An eligible control window "+
  "may therefore contain a real release this table has never been told about. Per CLAUDE.md "+
  "section 11.3 that contaminates the control group and biases a difference-in-differences "+
  "estimate TOWARD ZERO - conservatively, but really. Record this caveat and the spans in "+
  "`known.series` with the control; {eligible:true} is NOT a certificate that the window is clean.";

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
     self-consistent; resolves forward via the standard offset, so 02:30 -> 03:30 EDT.
   USE THIS ONLY FOR A SOURCE THAT PUBLISHES AN ET WALL TIME - the Federal Reserve's "14:00 ET"
   and BLS's "08:30 ET" are wall times and must come through here. A source that publishes a UTC
   INSTANT (BEA's release_dates.json) has already resolved DST, and re-deriving it from an ET
   reading would reintroduce exactly the error the feed removed: see the BEA block in DATED. */
function etToUtc(y,mo,d,hh,mm){
  const naive=Date.UTC(y,mo,d,hh||0,mm||0,0,0);
  const a=naive+240*60000; if(usEasternOffsetMinutes(a)===240) return a;
  const b=naive+300*60000; return b;
}
/* Last occurrence of weekday `dow` in UTC month `mo` of year `y`, at 00:00 UTC. Kept for the
   ET-conversion surface; nothing in this unit generates dates from it any more. */
function lastDowUtc(y,mo,dow){
  const last=new Date(Date.UTC(y,mo+1,1)-86400000);
  return Date.UTC(y,mo,last.getUTCDate()-((last.getUTCDay()-dow+7)%7));
}

/* True only for a real, plausible epoch-ms instant. Deliberately strict about TYPE as well as
   value: a Date object and the numeric string "1783080000000" are both rejected rather than
   silently coerced, because both used to produce a wrong answer (a Date string-concatenated
   inside the range computation and reported "no event known" for a window 30 min from a print).
   Callers holding a Date or a CSV string must convert explicitly - +d / Number(s) - so the
   coercion happens where someone can see it. */
function calValidTime(t){
  return typeof t==="number"&&isFinite(t)&&t>=CAL_T_MIN&&t<=CAL_T_MAX;
}

/* ===================================================================================
   THE TABLES. Two words appear on these rows with two different meanings, deliberately:

     - on a TABLE row (DATED / EXCEPTIONS), `src` is the AGENCY URL the row was read from, and
       `retrieved` is the date a human read it. That is the checkable audit trail: every row
       here can be re-verified against a page or a feed.
     - on an EMITTED release row (from releasesBetween/nearestRelease) and on the tag,
       `src`/`evSrc` is the PROVENANCE CLASS - "dated" (an agency-published date) or
       "corrected" (an agency-published correction to a dated date). The class "rule" no longer
       exists, because nothing is derived from a rule any more. The emitted row also carries
       `ref`/`retrieved` copied from the table row, so the URL travels with the data and not
       only with this comment.
   =================================================================================== */
const RELEASES={
  /* (a) DATED. Every release this unit knows, one enumerated row each, as published by the
     agency that publishes it.
     THIS TABLE IS PARTIAL AND WILL STAY PARTIAL. That is fine, and it is stated in the return
     values (CAL_PARTIAL_CAVEAT, calendarAudit) rather than papered over. What is NOT fine is
     inventing a row: a wrong date silently mislabels every window around it, and a MISSING one
     silently lets a shock into the control group. Both are worse than an honest gap, and only
     the gap is visible.
     Row shape - `t` MUST be epoch ms, and WHICH constructor you build it with is a fact about
     the SOURCE, not a style choice:
        an ET WALL TIME from a schedule page  -> t:etToUtc(2026,0,13,8,30)
        a UTC INSTANT from a machine feed     -> t:Date.UTC(2026,0,22,13,30)
     tier 1 = high BTC relevance (CPI, NFP, FOMC, PCE, GDP); tier 2 = lower (claims, trade, ISM,
     retail). Malformed rows are NOT silently dropped: they are listed by calValidateDated(), in
     CAL_DATED_BAD after any releasesBetween() call, and counted by calendarAudit(). */
  DATED:[
    /* FOMC 2026 policy statements. Released 14:00 ET on the final day of each two-day meeting -
       an ET WALL TIME, hence etToUtc. Eight meetings, the standard FOMC year, count checked.
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
       not be retrieved, because bls.gov is not reachable from this environment. Do not
       extrapolate the monthly cadence - "CPI lands mid-month" is exactly the inference this
       table exists to refuse.
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
    {name:"CPI",kind:"scheduled-numeric",tier:1,t:etToUtc(2026,8,11,8,30),src:"https://www.bls.gov/schedule/news_release/cpi.htm",retrieved:"2026-09-06"},  /* August 2026 ref month - a FRIDAY: atypical for CPI, unverified, NOT changed (see above) */

    /* ---- BEA 2026, from the agency's own machine-readable release-date feed ----
       Retrieved 2026-09-06 from https://apps.bea.gov/API/signup/release_dates.json and copied
       verbatim, one row per published instant.
       THESE ARE UTC INSTANTS AS PUBLISHED BY BEA, hence Date.UTC and NOT etToUtc. The feed has
       already resolved DST - that is the entire reason it is preferred over any rule or any ET
       wall-clock transcription - so passing them through an ET conversion would re-derive a
       thing the source had already settled and could only introduce an hour of error. If a
       future maintainer "tidies" these into etToUtc calls, that is a regression, and test.js
       pins the instants against the feed's own strings to catch it.
       The feed's 2026 rows disagree with several dates in circulation elsewhere; the feed is the
       source and wins. It also lists 2026-06-09 twice for TRADE (one instant, listed twice) -
       deduplicated to one row here, since a duplicate line in a feed is not two releases.
       BEA's .ics subscription file was checked as a cross-reference and covers only 2025-01 to
       2025-09, so it could not corroborate any 2026 date; the JSON feed is the sole source for
       every row below. */
    /* GDP - Gross Domestic Product. 13 dates, 2026. */
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,0,22,13,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,1,20,13,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,2,13,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,3,9,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,3,30,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,4,28,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,5,25,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,6,30,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,7,26,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,8,30,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,9,29,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,10,25,13,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"GDP",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,11,23,13,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    /* PCE - Personal Income and Outlays. 13 dates, 2026. BEA publishes eleven of these jointly
       with the GDP release above, at the same instant; that is what the feed says and two
       releases at one instant is a fact about the schedule, not a duplicate. */
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,0,22,15,0),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,1,20,13,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,2,13,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,3,9,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,3,30,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,4,28,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,5,25,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,6,30,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,7,26,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,8,30,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,9,29,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,10,25,13,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"PCE",kind:"scheduled-numeric",tier:1,t:Date.UTC(2026,11,23,13,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    /* TRADE - U.S. International Trade in Goods and Services. 13 dates, 2026 (tier 2). */
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,0,8,13,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,0,29,13,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,1,19,13,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,2,12,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,3,2,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,4,5,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,5,9,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,6,7,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,7,4,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,8,3,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,9,6,12,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,10,4,13,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"},
    {name:"TRADE",kind:"scheduled-numeric",tier:2,t:Date.UTC(2026,11,8,13,30),src:"https://apps.bea.gov/API/signup/release_dates.json",retrieved:"2026-09-06"}
  ],
  /* (b) EXCEPTIONS. Agency-published corrections to a date already in DATED, and agency-published
     dates for a release DATED has no row for at all. Both seeded rows come from the 2025-2026
     lapses in appropriations, which moved real BLS dates inside the live data period.
     Row shape:
        {name:"NFP", was:etToUtc(2026,1,6,8,30), t:etToUtc(2026,1,11,8,30),
         src:"https://www.bls.gov/...", retrieved:"2026-09-06", note:"why"}
     Semantics, exactly:
        - any dated row with the same `name` and t === `was` is REMOVED;
        - if `t` is a number, a row is emitted at `t` with src:"corrected" and `was` attached,
          WHETHER OR NOT a base row was found. An exception is itself agency evidence that the
          release happens at `t`, and dropping it because no base row matched would recreate the
          missing-release hazard in the header. calendarAudit() reports unmatched exceptions as
          insertions so an override that overrides nothing is visible.
        - if `t` is null the release was CANCELLED, not moved: the base row is removed and
          nothing is emitted. `t:null` is the suppression form; `t` merely absent is a fault.
        - optional `kind`/`tier` override; otherwise they come from the removed base row, then
          from any DATED row of the same name, then default to scheduled-numeric/tier 2.
     A shift larger than CAL_EXC_MAX_SHIFT_MS is rejected (it would defeat the query pad). */
  EXCEPTIONS:[
    /* Employment Situation, January 2026 reference month: moved off Fri 2026-02-06 after the
       2025-2026 lapses in appropriations. February 2026 jobs came out on a WEDNESDAY. There is
       no DATED payrolls row anywhere - bls.gov is unreachable from here - so this row INSERTS
       the one payrolls date this unit knows, and calendarAudit() reports it as an insertion.
       kind/tier are stated ON THE ROW because there is no base row and no other payrolls row to
       inherit them from: without them the insert would fall through to the scheduled-numeric /
       tier-2 default, and payrolls is a tier-1 release for this instrument. */
    {name:"NFP",kind:"scheduled-numeric",tier:1,was:etToUtc(2026,1,6,8,30),t:etToUtc(2026,1,11,8,30),
     src:"https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm",retrieved:"2026-09-06",
     note:"Employment Situation, Jan 2026 ref: 2026-02-06 -> 2026-02-11 (Wed), 08:30 ET"},
    /* CPI, January 2026 reference month. There is no DATED row at the original date either, so
       this exception INSERTS the corrected release rather than overriding one. It does not
       create CPI coverage for February 2026. */
    {name:"CPI",was:etToUtc(2026,1,11,8,30),t:etToUtc(2026,1,13,8,30),
     src:"https://www.bls.gov/bls/2025-lapse-revised-release-dates.htm",retrieved:"2026-09-06",
     note:"CPI, Jan 2026 ref: 2026-02-11 -> 2026-02-13, 08:30 ET"}
  ]
};

/* ---- hand-entry validation ------------------------------------------------------------- */

/* Why a hand-entered DATED row is unusable, or null if it is fine.
   A missing src/retrieved is NOT a fault: a correct date with no URL is still a real release,
   and dropping it would recreate the missing-release hazard. It is counted as `unsourced` by
   calendarAudit() instead. A PRESENT but malformed one is a fault - a garbled audit trail is
   worse than an absent one, because it looks checkable. */
function calDatedRowFault(r){
  if(!r||typeof r!=="object") return "row is not an object";
  if(r.t===undefined||r.t===null) return "missing t (build it with etToUtc for an ET wall time, Date.UTC for a UTC instant)";
  if(typeof r.t!=="number") return "t is a "+(typeof r.t)+", not epoch ms (build it with etToUtc or Date.UTC)";
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
/* Are the two tables the calendar is built from currently usable? A rejected row in either means
   a release this unit would otherwise emit is missing, and a missing release reads as a quiet
   window - so nothing may claim a period is quiet while this is false. Read by controlEligible()
   ("table-errors") and by eventTag() (evCov). */
function calTablesUsable(){
  return calValidateDated().length===0&&calValidateExceptions().length===0;
}
function calRefresh(arr,list){ arr.length=0; for(let i=0;i<list.length;i++) arr.push(list[i]); return arr; }

/* ---- coverage: a DERIVED fact, computed from the rows -----------------------------------

   Nobody declares coverage any more. There is no vouch, no signature and no "*" row. For each
   series name the table describes itself: the span its own enumerated rows actually cover, how
   many rows that is, and the sources and retrieval dates those rows carry.

   READ THE SPAN FOR EXACTLY WHAT IT IS. "GDP: 2026-01-22 .. 2026-12-23, 13 rows" says thirteen
   GDP dates were read off a feed and they run from January to December. It does NOT say those
   are all of them, and nothing in this unit can say that. A span is evidence that the table was
   populated over a period, not a claim that it was populated completely - which is exactly the
   claim the superseded COVERAGE declaration made, could not check, and which cost three review
   rounds. The honest consequence is CAL_PARTIAL_CAVEAT, carried on every controlEligible()
   answer. */

/* Every enumerated instant this unit knows, as {name, t}, from valid DATED rows plus the
   instants usable EXCEPTIONS emit. An exception is agency evidence in its own right - the only
   payrolls date in the table arrives that way - so leaving it out would understate what is
   known. A cancellation (t:null) contributes nothing, because it asserts no instant. */
function calKnownInstants(){
  const out=[], dated=Array.isArray(RELEASES.DATED)?RELEASES.DATED:[];
  for(let i=0;i<dated.length;i++){
    const r=dated[i]; if(calDatedRowFault(r)!==null) continue;
    out.push({name:r.name,t:r.t,src:(typeof r.src==="string"?r.src:null),
              retrieved:(typeof r.retrieved==="string"?r.retrieved:null)});
  }
  const exc=calUsableExceptions();
  for(let i=0;i<exc.length;i++){
    const e=exc[i]; if(e.t===null) continue;
    out.push({name:e.name,t:e.t,src:e.src,retrieved:e.retrieved});
  }
  return out;
}
/* The derived spans, one per name, sorted by name -> [{name, from, to, n, srcs, retrieved}].
   `from`/`to` are the first and last instant the table holds for that name; a name with one row
   has a zero-width span, which is the honest answer (the table knows one instant, not a period).
   `srcs`/`retrieved` are the distinct values carried on those rows, so the provenance of a span
   is readable without re-walking the table. */
function calSeriesSpans(){
  const rows=calKnownInstants(), by=Object.create(null), order=[];
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    if(by[r.name]===undefined){ by[r.name]={name:r.name,from:r.t,to:r.t,n:0,srcs:[],retrieved:[]}; order.push(r.name); }
    const s=by[r.name];
    if(r.t<s.from) s.from=r.t;
    if(r.t>s.to) s.to=r.t;
    s.n++;
    if(r.src!==null&&s.srcs.indexOf(r.src)<0) s.srcs.push(r.src);
    if(r.retrieved!==null&&s.retrieved.indexOf(r.retrieved)<0) s.retrieved.push(r.retrieved);
  }
  order.sort();
  const out=[];
  for(let i=0;i<order.length;i++) out.push(by[order[i]]);
  return out;
}
/* Does the table hold enumerated rows spanning t? -> {covered, entries}.
   `name` omitted (or "*") asks the weak question "does ANY series span t"; a name asks about
   that series alone. `entries` are the derived spans that contain t.
   THIS IS NOT A COMPLETENESS CLAIM, in either form. It answers "was this table populated across
   this instant", which is the strongest thing an enumerated table can honestly say about a
   period. An unusable t is never covered.
   A non-string name is a caller bug and throws, per this unit's bad-parameters rule. */
function coverageAt(t,name){
  if(!(name===undefined||name===null||typeof name==="string"))
    throw new TypeError("calendar: coverageAt name must be a string or omitted, got "+(typeof name));
  const out={covered:false,entries:[]};
  if(!calValidTime(t)) return out;
  const want=(name===undefined||name===null||name==="")?"*":name;
  const spans=calSeriesSpans();
  for(let i=0;i<spans.length;i++){
    const s=spans[i];
    if(want!=="*"&&s.name!==want) continue;
    if(t>=s.from&&t<=s.to) out.entries.push(s);
  }
  out.covered=out.entries.length>0;
  return out;
}
/* Is the whole span [t0,t1] inside ONE series' derived span? -> {covered, entries}.
   Spans of different names are deliberately NOT unioned: "GDP was populated here and CPI was
   populated there" is not "the calendar was populated across both". */
function calCoverageSpan(t0,t1,name){
  if(!(name===undefined||name===null||typeof name==="string"))
    throw new TypeError("calendar: calCoverageSpan name must be a string or omitted, got "+(typeof name));
  const out={covered:false,entries:[]};
  if(typeof t0!=="number"||typeof t1!=="number"||!isFinite(t0)||!isFinite(t1)||!(t0<=t1)) return out;
  const want=(name===undefined||name===null||name==="")?"*":name;
  const spans=calSeriesSpans();
  for(let i=0;i<spans.length;i++){
    const s=spans[i];
    if(want!=="*"&&s.name!==want) continue;
    if(s.from<=t0&&s.to>=t1) out.entries.push(s);
  }
  out.covered=out.entries.length>0;
  return out;
}

/* ---- generation ------------------------------------------------------------------------ */

/* kind/tier for a name, from the table that already describes it. Lookup only - it never
   invents a date, and returns null when the name is unknown. */
function calMetaFor(name){
  const D=Array.isArray(RELEASES.DATED)?RELEASES.DATED:[];
  for(let i=0;i<D.length;i++) if(calDatedRowFault(D[i])===null&&D[i].name===name)
    return {kind:D[i].kind||"scheduled-numeric",tier:D[i].tier||2};
  return null;
}
/* The valid DATED rows in [g0,g1] - the calendar BEFORE exceptions. */
function calBaseRows(g0,g1){
  const out=[], dated=Array.isArray(RELEASES.DATED)?RELEASES.DATED:[];
  for(let i=0;i<dated.length;i++){
    const r=dated[i];
    if(calDatedRowFault(r)!==null) continue;      /* recorded in CAL_DATED_BAD by the caller */
    if(!(r.t>=g0&&r.t<=g1)) continue;
    out.push({name:r.name,kind:r.kind||"scheduled-numeric",tier:r.tier||2,src:"dated",
              ref:(typeof r.src==="string"?r.src:null),retrieved:(typeof r.retrieved==="string"?r.retrieved:null),t:r.t});
  }
  return out;
}
/* Largest legal shift in the current EXCEPTIONS table, so the query pad is exactly as wide as it
   needs to be (0 when there are no exceptions) rather than always the worst case. */
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

/* Every release in [t0,t1] inclusive, from both tables, sorted by t.
   Each row carries src: "dated" (an agency-published date entered by hand) or "corrected" (an
   agency-published correction, with the superseded instant in `was`), plus `ref` - the agency
   URL - and `retrieved`.
   THROWS on a non-numeric range or a span past CAL_MAX_SPAN_MS - see the header. */
function releasesBetween(t0,t1){
  /* refresh the hand-entry reject lists on every call, so the UI always sees current state */
  calRefresh(CAL_DATED_BAD,calValidateDated());
  calRefresh(CAL_EXC_BAD,calValidateExceptions());
  if(typeof t0!=="number"||typeof t1!=="number"||!isFinite(t0)||!isFinite(t1))
    throw new TypeError("calendar: releasesBetween needs two finite epoch-ms numbers, got "+
      (typeof t0)+"/"+(typeof t1)+"; convert Dates and strings at the call site");
  if(!(t0<=t1)) return [];
  if(t1-t0>CAL_MAX_SPAN_MS)
    throw new RangeError("calendar: releasesBetween span "+Math.round((t1-t0)/86400000)+
      "d exceeds the query guard of "+Math.round(CAL_MAX_SPAN_MS/86400000)+
      "d; refusing rather than returning a silently truncated list");
  /* Scan wide enough that an exception can pull a release INTO the range from outside it, apply
     the exceptions, then filter to the exact range - so a moved release lands where the agency
     says it landed and nowhere else. */
  const pad=calExcPad();
  const rows=calApplyExceptions(calBaseRows(t0-pad,t1+pad));
  const out=[];
  for(let i=0;i<rows.length;i++) if(rows[i].t>=t0&&rows[i].t<=t1) out.push(rows[i]);
  out.sort(function(a,b){ return (a.t-b.t)||(a.tier-b.tier)||(a.name<b.name?-1:a.name>b.name?1:0); });
  return out;
}

/* Nearest release to t within +/- horizonMin (default CAL_HORIZON_MIN), or null.
   mins is SIGNED whole minutes from t to the release: negative = it already happened.
   src is "dated" or "corrected" - carry it, do not drop it (see NOTES.md).
   Ties break to the lower tier number (higher relevance), then to the earlier release, then by
   name - the last is what keeps the answer stable when two series print at one instant, which
   BEA's joint GDP/PCE releases do eleven times in 2026.
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
    if(best===null||d<bd||(d===bd&&(r.tier<best.tier||(r.tier===best.tier&&r.t<best.t)||
       (r.tier===best.tier&&r.t===best.t&&r.name<best.name)))){ best=r; bd=d; }
  }
  if(best===null) return null;
  const o={name:best.name,kind:best.kind,tier:best.tier,src:best.src,ref:best.ref,retrieved:best.retrieved,
           t:best.t,mins:Math.round((best.t-t)/60000)};
  if(best.was!==undefined) o.was=best.was;
  return o;
}

/* Compact five-key tag, safe to persist on every ledger row so any recorded window can be
   re-analysed by event distance retroactively.

   ev/evMins/evTier keep their existing meanings. evSrc is the provenance class: "dated" = a date
   an agency published; "corrected" = an agency-published correction to one. ("rule" is gone
   along with the generator; a persisted row carrying it predates this change.)

   evCov is the fifth key, and its meaning is WEAKER than it used to be, deliberately:
     evCov === true   the tables are usable AND at least one series' enumerated rows span t -
                      i.e. this table was populated across this instant.
     evCov === false  no series spans t, or a table currently holds a rejected row.
     evCov === null   t is not a usable timestamp; the whole tag is null, as before.
   IT IS NOT A COMPLETENESS FLAG AND NEVER WAS A RELIABLE ONE. It used to be backed by a
   hand-written declaration that a human had read the whole schedule for a period; three review
   rounds showed that signature could outlive what it signed, and as shipped no declaration
   existed at all, so it read false everywhere. It is now a derived fact with no signature behind
   it: ev:null with evCov:true means "no release THIS TABLE HOLDS is near t, and the table has
   rows either side of t" - not "nothing happened here". Nothing in this unit can say that.
   A non-null ev with evCov:false is still a real release. Do not read evCov as a confidence flag
   on ev itself.

   evCov IS NOT CONTROL ELIGIBILITY. controlEligible(t) is the only authority on whether a window
   may be used as a section 11.3 time-matched control, and it returns the caveat and the spans in
   force alongside its verdict. The key exists so a persisted ledger row can record how populated
   the table was when the row was written; the ruling is always re-taken by calling
   controlEligible. */
function eventTag(t,horizonMin){
  const r=nearestRelease(t,horizonMin);            /* throws on a bad horizon, before anything else */
  if(!calValidTime(t)) return {ev:null,evMins:null,evTier:null,evSrc:null,evCov:null};
  const cov=coverageAt(t).covered&&calTablesUsable();
  if(r===null) return {ev:null,evMins:null,evTier:null,evSrc:null,evCov:cov};
  return {ev:r.name,evMins:r.mins,evTier:r.tier,evSrc:r.src,evCov:cov};
}

/* THE GUARD. Can the window at t be used as a section 11.3 time-matched control?
   -> {eligible, reason, known}, reason being one of:
     "ok"             no release THIS TABLE KNOWS ABOUT is within CAL_CONTROL_EXCL_MIN minutes
                      either side. Read `known` before treating that as clean - see below.
     "release-nearby" a known release sits in the window or within two windows of it.
     "table-errors"   RELEASES.DATED or RELEASES.EXCEPTIONS currently has a rejected row, so a
                      release this unit would otherwise emit is missing, and a missing release
                      reads as a quiet window. Fix the row (calValidateDated /
                      calValidateExceptions) and re-ask.
     "bad-timestamp"  t is not a usable epoch-ms instant.

   IT NO LONGER REFUSES FOR WANT OF A DECLARATION, and that is the point of this rewrite. The
   superseded version required a hand-written "*" coverage row vouching that a human had checked
   the whole schedule for the period; no such row was ever written, so it returned false for
   every timestamp in history and section 11.3 had zero controls. A guard that answers nothing
   protects nothing.

   WHAT IT RETURNS INSTEAD. `known` is what the table actually knew when the ruling was made:
     known.series   the derived per-series spans in force ({name, from, to, n, srcs, retrieved})
     known.inSpan   the names whose span contains t
     known.partial  always true - this table is never complete
     known.caveat   CAL_PARTIAL_CAVEAT, the toward-zero bias stated in words
   RECORD THEM WITH THE CONTROL. {eligible:true} means "no release I know of is near t", not
   "this window is clean": an unentered release inside a control window puts a shock into the
   baseline and biases the difference-in-differences estimate toward zero. A caller that stores
   the caveat and the spans can state that limitation when the estimate is reported, and can
   re-derive which controls were drawn under a thin calendar later. A caller that ignores them
   is asserting completeness this unit never claimed.

   Counting the reasons is also how section 11.3's "control coverage >= 80%" figure is computed
   honestly: a window with too few ELIGIBLE controls is unmatched and unscored, not scored
   against a thinner set. */
function controlEligible(t){
  const spans=calSeriesSpans();
  const known={series:spans,inSpan:[],partial:true,caveat:CAL_PARTIAL_CAVEAT};
  if(calValidTime(t)) for(let i=0;i<spans.length;i++)
    if(t>=spans[i].from&&t<=spans[i].to) known.inSpan.push(spans[i].name);
  if(!calValidTime(t)) return {eligible:false,reason:"bad-timestamp",known:known};
  /* The table check comes BEFORE the proximity check, and the order is load-bearing even though
     the verdict is identical either way. These reason strings are counted to produce section
     11.3's "control coverage >= 80%" figure; reporting a window as ordinary release proximity
     while a table is broken makes the fault invisible in the one statistic meant to expose thin
     coverage. A refused row is a release this unit does not emit, which is a stronger and
     different objection than "something is nearby", so it is the one that gets said. */
  if(!calTablesUsable()) return {eligible:false,reason:"table-errors",known:known};
  if(nearestRelease(t,CAL_CONTROL_EXCL_MIN)!==null) return {eligible:false,reason:"release-nearby",known:known};
  return {eligible:true,reason:"ok",known:known};
}

/* A UTC instant rendered as the US EASTERN calendar date it falls on. Release schedules are
   ET-shaped, so rendering a span bound in UTC would print an off-by-one day at either end. */
function calEtDateIso(ms){
  return new Date(ms-usEasternOffsetMinutes(ms)*60000).toISOString().slice(0,10);
}
/* One call that shows how full the calendar actually is. Returns a plain object; `lines` and
   `text` are the human-eyeball form. Nothing here reads the network or a clock - it reports the
   tables as they stand.
   Its job is to make the gaps VISIBLE, so it states the partiality first, names the series that
   are absent entirely, and names the BLS block by name rather than leaving a reader to infer it
   from a list of what happens to be present. */
function calendarAudit(){
  const datedBad=calValidateDated(), excBad=calValidateExceptions();
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
  /* THE DERIVED SPANS - the whole of what this table claims, computed from the rows. */
  const spans=calSeriesSpans(), spanOut=[];
  for(let i=0;i<spans.length;i++){
    const s=spans[i];
    spanOut.push({name:s.name,from:s.from,to:s.to,n:s.n,
                  fromIso:calEtDateIso(s.from),toIso:calEtDateIso(s.to),
                  days:Math.round((s.to-s.from)/86400000),srcs:s.srcs.slice(),retrieved:s.retrieved.slice()});
  }
  const haveName=Object.create(null);
  for(let i=0;i<spans.length;i++) haveName[spans[i].name]=spans[i].n;
  /* every name this instrument expects, plus every name either table actually mentions */
  const all=CAL_EXPECTED_NAMES.slice();
  order.concat(excRows.map(function(e){ return e.name; })).forEach(function(n){
    if(all.indexOf(n)<0) all.push(n);
  });
  const absent=[];
  for(let i=0;i<all.length;i++) if(haveName[all[i]]===undefined) absent.push(all[i]);
  const bls=[];
  for(let i=0;i<CAL_BLS_NAMES.length;i++)
    bls.push({name:CAL_BLS_NAMES[i],rows:haveName[CAL_BLS_NAMES[i]]===undefined?0:haveName[CAL_BLS_NAMES[i]]});
  const out={
    partial:true, caveat:CAL_PARTIAL_CAVEAT,
    datedRows:dated.length, datedValid:datedValid, datedRejected:datedBad.length,
    datedBad:datedBad, datedNames:order.map(function(n){ return {name:n,count:names[n]}; }),
    datedUnsourced:unsourced,
    exceptionRows:exc.length, exceptionsRejected:excBad.length, exceptionsBad:excBad, exceptions:excRows,
    exceptionsInserting:excRows.filter(function(e){ return e.effect==="inserts"; }).length,
    /* Spans are DERIVED. Nobody declared them; they are what the rows cover. */
    series:spanOut, seriesNames:spanOut.map(function(s){ return s.name; }),
    absentNames:absent, blsSeries:bls,
    tablesUsable:calTablesUsable(),
    lines:[]
  };
  const L=out.lines;
  L.push("calendar audit - the table is PARTIAL by construction; this is how partial.");
  L.push("  Every date here is ENUMERATED from an agency feed or page. Nothing is derived from a");
  L.push("  publication rule, and nothing declares itself complete: the spans below are computed");
  L.push("  from the rows, so they say WHEN the table was populated, never that it was populated");
  L.push("  fully. A control window may still contain a release this table has never been told");
  L.push("  about, which biases a difference-in-differences estimate TOWARD ZERO (section 11.3).");
  L.push("  DATED rows: "+out.datedValid+" valid, "+out.datedRejected+" rejected"+
         (out.datedUnsourced?(", "+out.datedUnsourced+" without src/retrieved"):"")+
         "  ["+out.datedNames.map(function(n){ return n.name+" x"+n.count; }).join(", ")+"]");
  L.push("  EXCEPTIONS: "+out.exceptionRows+" ("+out.exceptionsRejected+" rejected)"+
         out.exceptions.map(function(e){
           return "\n    "+e.name+" "+new Date(e.was).toISOString().slice(0,10)+" -> "+
                  (e.cancelled?"CANCELLED":new Date(e.t).toISOString().slice(0,10))+" ["+e.effect+"]";
         }).join(""));
  L.push("  SPANS THE ROWS ACTUALLY COVER (derived, not declared - not a claim of completeness):"+
         (spanOut.length?spanOut.map(function(s){
           return "\n    "+s.name+"  "+s.fromIso+" .. "+s.toIso+" ET  ("+s.n+" row"+(s.n===1?"":"s")+")"+
                  (s.srcs.length?("  <- "+s.srcs.join(", ")+(s.retrieved.length?(", read "+s.retrieved.join("/")):"")):
                                  "  <- NO SOURCE ON THESE ROWS");
         }).join(""):"\n    (none - the table holds no usable rows at all)"));
  L.push("  ABSENT ENTIRELY (no row anywhere, so every window holding one reads quiet): "+
         (absent.length?absent.join(", "):"(none)"));
  L.push("  THE BLS GAP: "+bls.map(function(b){ return b.name+" x"+b.rows; }).join(", ")+
         " - bls.gov is not reachable from the environment these tables were entered in, so no BLS "+
         "schedule has been transcribed. What is here are fragments (two CPI dates, one payrolls "+
         "date arriving as a shutdown correction), not coverage. Payrolls, CPI, PPI and initial "+
         "claims are the highest-relevance US releases for this instrument, and they are the ones "+
         "most likely to be sitting unrecorded inside a window this unit calls eligible.");
  if(!out.tablesUsable)
    L.push("  TABLES REJECTED: "+out.datedRejected+" dated, "+out.exceptionsRejected+
           " exception row(s) are refused. A refused row is a release this unit does NOT emit, so every window "+
           "reads evCov:false and controlEligible() refuses everything until they are fixed.");
  L.push("  CAVEAT RETURNED WITH EVERY controlEligible() ANSWER: "+CAL_PARTIAL_CAVEAT);
  out.text=L.join("\n");
  return out;
}
