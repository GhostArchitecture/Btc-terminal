/* ---------------------------------------------------------------- score: the half that computes `st` (CLAUDE.md 11)
   prereg/ ships shockStatus(st) -- a judge that applies every section 11 rule correctly to fifteen fields that
   NOTHING produces. There is no control matcher in this codebase, no difference-in-differences, no holdout split
   and no paired Brier difference; the instrument records everything and can score none of it. THIS UNIT IS THE
   OTHER HALF. It computes st and hands it over. It does not re-judge: shockStatus owns the verdict, this owns the
   arithmetic, and scReport() calls shockStatus once at the end rather than re-deriving any of its thresholds.

   WRITTEN BEFORE THE FIRST OBSERVATION, AND THAT IS THE POINT. Section 11.6 freezes every threshold, coefficient,
   detector parameter, CONTROL-MATCHING RULE and arm designation the calibration set touched, and spends the
   holdout -- every window scored under the old freeze retired, the count restarted at zero -- if any of them
   changes afterwards. The control-matching rule below is one of those rules. It is being written now, with zero
   shock-conditioned rows in existence anywhere, precisely so that it cannot be fitted to a result. Nothing here
   depends on having seen an outcome, and the test suite has no real data in it because none exists: every fixture
   has an answer that is known ARITHMETICALLY rather than measured, so the suite cannot assert the implementation
   back to itself.

   THE SIGN, WHICH IS THE MOST DANGEROUS LINE IN THE FILE. shockStatus tests `dBrier >= dBrierFloor && ciLo > 0`
   for READY, so a POSITIVE dBrier must mean THE TOOL IS BETTER. Brier is a LOSS -- lower is better -- so the
   subtraction has to run MARKET MINUS TOOL, and writing the natural-sounding (tool - market) instead fires READY
   on the arm being WORSE than the market, which is the single worst outcome this whole document exists to
   prevent. Section 11.2 states market - tool explicitly and says so in words; it did NOT until 2026-09-06, when
   the prose was corrected from tool - market after contradicting itself -- so a reader working from an older copy
   of the document will reach for exactly the wrong ordering. The subtraction happens EXACTLY ONCE, in scSkill(),
   which returns market MINUS tool and is named `skill` rather than `dBrier` so the two orderings cannot be
   confused by reading a variable name. computeVerdict() in the page already uses this orientation -- its dB is
   (market - y)^2 - (model - y)^2 -- so `skill` is the house convention, not a new one. scDid() reports both
   orderings side by side, labelled, and test.js pins the sign with a fixture where the tool is unambiguously
   better and a second where it is unambiguously worse, and reads section 11.2 off disk to fail if the document's
   stated orientation ever moves back.

   NO EXECUTION PATH. Nothing here arms, prices, sizes, highlights or suggests anything, and nothing renders.
   This will read NOT READY on every path for months. That is the correct answer and it must not be softened.
*/

/* PRE-REGISTERED matching and scoring constants. Section 11.7 clause 6 governs every one of them: they may be
   TIGHTENED at any time; loosening any of them closes the programme. The three that restate a number owned by
   another unit do so DELIBERATELY, so this unit degrades to a reason code instead of throwing when that unit is
   absent from the splice -- test.js asserts each restatement is identical to its source, so they cannot drift.

   CTRL_MIN = 5 restates SHOCK_RULE.minCtrlPerShock (11.3). Below it the shock window is RECORDED, marked
   unmatched, and excluded from scoring -- never scored against a thinner control set and never against the
   unconditional baseline.
   CAL_N = 30 restates SHOCK_RULE.calN (11.6). The first 30 graded shock windows in TIME ORDER are calibration.
   CLEAR_HALF_MIN = 45 restates CAL_CONTROL_EXCL_MIN from calendar/. It is not a choice either: a 15-minute
   window plus two windows either side is 15 + 2*15 = 45 minutes of clearance from the window's own edges.
   REF_TAU_MIN = 6 is refSnap's target (sections 4 and 10.2 -- the read nearest 6 minutes REMAINING, which is NOT
   mid-window; 10.2 corrects section 4's own text on this). scRefSnap restates refSnap because a unit may not
   reach page helpers, and test.js reads index.html and fails if refSnap's rule has moved.
   SLOT_MIN = 15 is the UTC slot grid of 11.3's first matching dimension. It is the KXBTC15M window length and is
   the grid for BOTH series: an hourly window is matched on the UTC 15-minute slot its open falls in, so hourly
   and 15-minute controls are drawn on one clock. */
const SCORE={
  CTRL_MIN:5,
  CAL_N:30,
  CLEAR_HALF_MIN:45,
  REF_TAU_MIN:6,
  SLOT_MIN:15,
  DAY_MS:86400000,
  version:"score-2026-09-06-a"
};
/* Reason codes. Every refusal in this unit produces one of these; nothing here returns a zero, a clamp, an
   Infinity or a plausible default in place of a measurement it could not make. An absence is diagnosable, a
   default is invisible -- the discipline vrpX enforces for H5 and revOmitCount for H1. */
const SC_OMIT={
  NO_CALENDAR:"no-calendar",       /* calendar/ absent from the splice: controlEligible cannot be consulted */
  NO_PREREG:"no-prereg",           /* prereg/ absent: shockCiLevel/shockBootstrapB/shockStatus unavailable */
  NO_BOOTSTRAP:"no-bootstrap",     /* no bootstrapCI handed in and none in scope */
  BAD_WINDOW:"bad-window",         /* open/close/ticker not a usable window record */
  UNGRADED:"ungraded",             /* result is neither "yes" nor "no" (10.4: a void settlement is not a NO) */
  NO_REFSNAP:"no-refsnap",         /* no snapshot survives refSnap's rule */
  BAD_PROB:"bad-prob",             /* pm or qm missing or out of range */
  MIXED_PHASE:"mixed-phase",       /* 11.5: phase 1 and phase 2 are never pooled */
  NO_PHASE:"no-phase",             /* 11.5: a row set that never says which phase it is cannot be scored */
  BAD_PHASE:"bad-phase",           /* a phase that is not a number: 1 and "1" must never pool as one key */
  MIXED_SERIES:"mixed-series",     /* section 4: 15-minute and hourly are scored separately */
  EMPTY_BOOK:"empty-book",         /* 10.3 K2: yes_bid 0.0000 / yes_ask 1.0000 parse to qm 0 / 100 */
  NO_ARMS:"no-arms",               /* k (11.4) not supplied: the CI level is not derivable from nothing */
  NO_CELL:"no-cell",               /* a pair with no matching cell or no control set: no resampling unit */
  BOUNDARY_MOVED:"boundary-moved", /* 11.6: the computed split boundary is not the registered one */
  MISSING_FIELDS:"missing-caller-fields", /* a caller field the verdict depends on was not supplied */
  NO_SHOCKS:"no-shock-windows",
  NO_MATCHED:"no-matched-windows", /* every shock window is unmatched: there is no controlled estimate */
  THIN:"thin-controls",            /* fewer than CTRL_MIN eligible controls: recorded, unmatched, unscored */
  RELEASE_NEARBY:"release-nearby", /* a candidate control is a shock window's shoulder */
  IS_SHOCK:"is-shock",             /* a candidate control is itself a shock window */
  CAL_SHORT:"calibration-short"    /* fewer than CAL_N calibration windows: no sd, so no holdout may open */
};

/* ---- presence of the units this one leans on ------------------------------------------------------------
   Same degradation pattern as revHasDetect: a missing neighbour is a reason code, never a throw and never a
   quietly-permissive answer. controlEligible in particular is MANDATORY -- section 11.3 says eligibility goes
   through it, so without the calendar there are no controls, and therefore no score. */
function scHasCalendar(){ return typeof controlEligible==="function"; }
function scHasPrereg(){ return typeof shockCiLevel==="function"&&typeof shockBootstrapB==="function"; }

/* ---- small helpers -------------------------------------------------------------------------------------- */
/* Own-property lookup. Every grouping map in this unit is keyed by caller-supplied text -- a ticker, a cell
   key -- and a bare `map[k]` reads Object.prototype for "constructor" or "toString", which would silently
   merge two distinct groups or drop a window as a duplicate of nothing. */
function scHasOwn(o,k){ return Object.prototype.hasOwnProperty.call(o,k); }
function scNum(v){ return typeof v==="number"&&isFinite(v); }
function scMean(a){ if(!Array.isArray(a)||!a.length) return null;
  let s=0; for(let i=0;i<a.length;i++){ if(!scNum(a[i])) return null; s+=a[i]; } return s/a.length; }
/* SAMPLE standard deviation, n-1. The population form would understate the spread of the paired difference and
   shockRequiredHoldN squares it, so the error compounds into the holdout requirement. */
function scSdOf(a){
  if(!Array.isArray(a)||a.length<2) return null;
  const m=scMean(a); if(m===null) return null;
  let s=0; for(let i=0;i<a.length;i++) s+=(a[i]-m)*(a[i]-m);
  return Math.sqrt(s/(a.length-1));
}

/* ---- WINDOW IDENTITY, AND THE DEDUPLICATION THAT FOLLOWS FROM IT ----------------------------------------
   A window IS (ticker, open). scMatchControls already settled that -- it uses exactly that pair to keep a shock
   out of its own control pool -- and then did not apply it to the pool, so THREE distinct control windows, each
   present twice, satisfied 11.3's minimum of FIVE and the shock read as matched. A duplicated shock row scored
   the same window twice: n inflated, ctrlTotal and ctrlMatched inflated, the value duplicated into the
   bootstrap sample (which NARROWS the interval), and the split boundary shifted.

   THIS IS THE EXPECTED INPUT SHAPE, NOT AN EXOTIC ONE. 10.2 records that btc.edge prunes at 1,500 windows --
   about 15 days -- and that for anything accumulating slower than that the CSV is the record and localStorage
   is only the buffer; section 8 puts the shock programme at ~15 months. The real scoring input is therefore a
   concatenation of dozens of overlapping exports, and duplicate rows are precisely what that produces.

   FIRST OCCURRENCE WINS, AND EVERY DROP IS COUNTED. A silent dedupe would hide a caller concatenating two
   DIFFERENT measurements of the same window, which is a real problem wearing a duplicate's clothes. A row with
   no usable identity is passed through untouched rather than swallowed here -- it is refused downstream by the
   rule that actually applies to it. */
function scRowId(w){
  if(!w||typeof w.ticker!=="string"||!w.ticker.length||!scNum(w.open)) return null;
  return w.ticker+"|"+w.open;
}
function scDedupe(rows){
  const out={rows:[],dropped:0};
  if(!Array.isArray(rows)) return out;
  const ids={};
  for(let i=0;i<rows.length;i++){
    const id=scRowId(rows[i]);
    if(id===null){ out.rows.push(rows[i]); continue; }
    if(scHasOwn(ids,id)){ out.dropped++; continue; }
    ids[id]=1; out.rows.push(rows[i]);
  }
  return out;
}

/* ---- 11.3's four matching dimensions, one function each -------------------------------------------------- */

/* Dimension 1: the UTC 15-minute slot, 0..95, of the instant t. UTC AND NOTHING ELSE. The release calendar is
   ET-shaped, and matching on the ET release time slides the control set UNDER the treatment at every DST
   transition: an 08:30 ET print sits in the window ending at 12:xx UTC from March to November and 13:xx UTC from
   November to March, which are SEAS 1.007 and 1.298 -- 1.14x in sigma for an identical event. The slot the
   window ACTUALLY OCCUPIED is the thing held fixed. Epoch ms are UTC by construction, so the modulo is the whole
   of it; nothing here constructs a local Date. */
function scSlotUtc(t){
  if(!scNum(t)) return null;
  const ms=((t%SCORE.DAY_MS)+SCORE.DAY_MS)%SCORE.DAY_MS;   /* the double modulo carries pre-1970 t correctly */
  return Math.floor(ms/(SCORE.SLOT_MIN*60000));
}
/* Dimension 2: the UTC weekday, 0=Sunday. Weekday and slot are CONFOUNDED in the release calendar -- claims are
   Thursday, payrolls Friday, FOMC Wednesday, all at fixed ET times -- so holding the slot without the weekday
   compares Thursday's 12:30 against Monday's 12:30 and calls the weekday effect a shock effect. Held together
   or not at all. */
function scWeekdayUtc(t){ if(!scNum(t)) return null; return new Date(t).getUTCDay(); }
/* Dimension 4: the calendar quarter, as "YYYYQn", so a control carries the same volatility regime as its shock.
   UTC, for the same reason the slot is UTC and so that both keys are cut on one clock. */
function scQuarterUtc(t){
  if(!scNum(t)) return null;
  const d=new Date(t);
  return String(d.getUTCFullYear())+"Q"+String(Math.floor(d.getUTCMonth()/3)+1);
}
/* Section 4's series split, which is not one of the four but is enforced beside them: 15-minute and hourly are
   scored separately, never pooled. Anything that is not a KXBTC15M ticker is the hourly ladder. */
function scSeriesOf(ticker){
  if(typeof ticker!=="string"||!ticker.length) return null;
  return ticker.indexOf("KXBTC15M")===0?"15m":"hourly";
}
/* The full match key of a window. A control matches a shock when all four fields are equal AND the window is
   clear (dimension 3, which is not a key -- it is a query against the calendar and lives in scWindowClear). */
function scMatchKey(w){
  if(!w||!scNum(w.open)) return null;
  const s=scSeriesOf(w.ticker); if(s===null) return null;
  return {series:s,slot:scSlotUtc(w.open),dow:scWeekdayUtc(w.open),quarter:scQuarterUtc(w.open)};
}
function scKeyEqual(a,b){
  return !!a&&!!b&&a.series===b.series&&a.slot===b.slot&&a.dow===b.dow&&a.quarter===b.quarter;
}
/* The same four fields as one string. This is the MATCHING CELL: every shock window carrying this key draws
   its controls from the same pool, so it is the unit the CI is resampled over (see scCells). */
function scCellKey(w){
  const k=scMatchKey(w); if(k===null) return null;
  return k.series+"|"+k.slot+"|"+k.dow+"|"+k.quarter;
}

/* Dimension 3: NO SCHEDULED RELEASE in the control window OR IN THE TWO WINDOWS EITHER SIDE, so a control is
   never a shock window's shoulder.

   controlEligible(t) answers "no release this table knows about is within CAL_CONTROL_EXCL_MIN minutes either
   side of t". For a 15-minute window that single probe at the open already covers the required span with room
   over: 45 minutes of clearance from one instant is +/-3 windows, and 11.3 asks for 2. An HOURLY window is 60
   minutes long, so ONE probe does not cover window + 2 windows either side (300 minutes), and assuming it does
   would silently admit hourly controls with a release 90 minutes away. So the probes are DERIVED from the
   window's own length rather than assumed: cover [open - 2L, close + 2L] with instants spaced no more than
   2*CLEAR_HALF_MIN apart, which is the smallest set whose exclusion discs union to a contiguous span. */
function scClearProbes(open,close,lenMin){
  if(!scNum(open)||!scNum(close)||!scNum(lenMin)||!(lenMin>0)||!(close>open)) return null;
  const half=SCORE.CLEAR_HALF_MIN*60000, pad=2*lenMin*60000;
  const from=open-pad, to=close+pad;
  const out=[]; let p=from+half;
  while(p<to-half-1){ out.push(p); p+=2*half; }
  out.push(to-half);
  return out;
}
function scWindowLenMin(w){
  if(!w||!scNum(w.open)||!scNum(w.close)||!(w.close>w.open)) return null;
  return (w.close-w.open)/60000;
}
/* Is w usable as a control window? -> {clear, reason, known, probes}.

   `known` is carried out VERBATIM and is the reason this function returns an object rather than a boolean. The
   calendar is PARTIAL -- no BLS series is in it -- so {eligible:true} is not a certificate that a window is
   clean, only that no release the table holds is near it. CAL_PARTIAL_CAVEAT and the per-series spans have to
   travel with the number or the limitation is lost at the exact moment the number is read. Per 11.3 an
   unrecorded release inside a control window biases the difference-in-differences TOWARD ZERO -- against finding
   an effect, never toward one -- but a null result cannot be read as "no effect" without saying how full the
   calendar was. `inSpan` is UNIONED across the probes, because the clearance span of an hourly window can start
   inside one series' coverage and end outside it. */
function scWindowClear(w){
  if(!scHasCalendar()) return {clear:false,reason:SC_OMIT.NO_CALENDAR,known:null,probes:0};
  const len=scWindowLenMin(w);
  if(len===null) return {clear:false,reason:SC_OMIT.BAD_WINDOW,known:null,probes:0};
  const probes=scClearProbes(w.open,w.close,len);
  if(probes===null) return {clear:false,reason:SC_OMIT.BAD_WINDOW,known:null,probes:0};
  const seen={}, inSpan=[]; let series=null, caveat=null, last=null;
  for(let i=0;i<probes.length;i++){
    const e=controlEligible(probes[i]);
    last=e;
    if(e&&e.known){
      if(series===null) series=e.known.series;
      if(caveat===null) caveat=e.known.caveat;
      const sp=e.known.inSpan||[];
      for(let j=0;j<sp.length;j++) if(seen[sp[j]]!==1){ seen[sp[j]]=1; inSpan.push(sp[j]); }
    }
    if(!e||e.eligible!==true){
      inSpan.sort();
      return {clear:false,reason:(e&&e.reason)||SC_OMIT.BAD_WINDOW,
        known:{series:series,inSpan:inSpan,partial:true,caveat:caveat},probes:probes.length};
    }
  }
  inSpan.sort();
  return {clear:true,reason:(last&&last.reason)||"ok",
    known:{series:series,inSpan:inSpan,partial:true,caveat:caveat},probes:probes.length};
}

/* ---- one observation per window ------------------------------------------------------------------------- */

/* refSnap's rule, restated because a unit may not reach a page helper. Sections 4 and 10.2: the read whose tau
   is NEAREST 6 MINUTES REMAINING -- not the mid-window read, which is what section 4's own prose says and 10.2
   corrects. Per-snapshot scoring overcounts by about 8x and inflated the verdict inputs before it was fixed, so
   this is one observation per window and nothing else. Phantom rows (the K1 repair, 10.4b) and post-gate reads
   are skipped exactly as the page skips them. test.js reads index.html and fails if refSnap's rule has moved. */
function scRefSnap(w){
  if(!w||!Array.isArray(w.snaps)) return null;
  let best=null;
  for(let i=0;i<w.snaps.length;i++){
    const s=w.snaps[i];
    if(!s||!scNum(s.tau)||s.tau<0||s.phantom) continue;
    if(best===null||Math.abs(s.tau-SCORE.REF_TAU_MIN)<Math.abs(best.tau-SCORE.REF_TAU_MIN)) best=s;
  }
  return best;
}
/* THE SIGN LIVES HERE AND NOWHERE ELSE. Returns MARKET Brier minus TOOL Brier at the window's refSnap, so a
   POSITIVE skill means THE TOOL BEAT THE MARKET -- section 11.2's stated orientation, and computeVerdict()'s
   existing dB, which is also (market - y)^2 - (model - y)^2. The opposite ordering is reported beside it by
   scDid so a reader never has to infer which one a number is.

   No clipping. Section 3 already clips the headline to [0.005, 0.995] at source, Brier is bounded regardless,
   and edgeStatsOn's [0.01, 0.99] clip exists for its log-loss column which this does not compute. Clipping here
   would move a number that nothing else in the scoring path moves.
   Grading is on result === "yes" or "no" ONLY: 10.4 records that any truthy result used to be graded, so a
   `void` settlement scored as a NO. A void window is UNGRADED, not a loss.
   qm 0 and qm 100 are REFUSED rather than scored. 10.3 K2 records that Kalshi's empty-side book parses to
   exactly yes_bid 0.0000 / yes_ask 1.0000, and that a quote built from those two is meaningless -- the
   recorder-side guard exists, so such a row should never reach a ledger, but this is the layer that would
   catch one if it did, and a Brier of exactly 0 or exactly 1 against a phantom quote is the most flattering
   and the most damning number in the file depending on which side it lands. Neither is a measurement. */
function scSkill(w){
  if(!w||!scNum(w.open)||!scNum(w.close)) return {ok:false,code:SC_OMIT.BAD_WINDOW};
  if(w.result!=="yes"&&w.result!=="no") return {ok:false,code:SC_OMIT.UNGRADED};
  const s=scRefSnap(w); if(s===null) return {ok:false,code:SC_OMIT.NO_REFSNAP};
  const y=w.result==="yes"?1:0;
  const pt=s.pm, q=scNum(s.qm)?s.qm/100:null;
  if(q!==null&&(s.qm<=0||s.qm>=100)) return {ok:false,code:SC_OMIT.EMPTY_BOOK};
  if(!scNum(pt)||pt<0||pt>1||q===null||q<0||q>1) return {ok:false,code:SC_OMIT.BAD_PROB};
  const bTool=(pt-y)*(pt-y), bMkt=(q-y)*(q-y);
  return {ok:true,code:null,skill:bMkt-bTool,bTool:bTool,bMkt:bMkt,y:y,tau:s.tau,t:s.t};
}

/* ---- THE CONTROL MATCHER (11.3) -------------------------------------------------------------------------
   For one shock window, the time-matched controls drawn from `pool`. ALL FOUR dimensions, none optional, none
   weighted, no nearest-neighbour fallback: a dimension that can be relaxed under pressure is not a matching
   rule, it is a knob, and 11.6 froze the rule rather than the knob.

   A candidate is rejected when it is the shock itself, when it is another SHOCK window (a phase-2 detected shock
   has no calendar row, so controlEligible cannot see it and the caller's own flag is the only thing that can),
   when any of the four keys differ, when it is not clear of releases, or when it is not gradeable.

   MINIMUM 5. Below that the shock window is RECORDED and marked unmatched and EXCLUDED from scoring. It is not
   scored against four controls, and it is emphatically not scored against the unconditional baseline -- 11.3
   forbids that outright, and this unit makes it unreachable rather than discouraged (see scDid). Both counts
   feed ctrlMatched/ctrlTotal, which is what 11.7 clause 3's 80% coverage rule reads. */
function scMatchControls(shock,pool){
  const out={n:0,controls:[],matched:false,reason:null,known:null,rejects:{},dupControls:0};
  if(!scHasCalendar()){ out.reason=SC_OMIT.NO_CALENDAR; return out; }
  const key=scMatchKey(shock);
  if(key===null){ out.reason=SC_OMIT.BAD_WINDOW; return out; }
  if(!Array.isArray(pool)){ out.reason=SC_OMIT.BAD_WINDOW; return out; }
  /* THE POOL IS DEDUPED ON (ticker, open) FIRST -- the same identity this function already uses to keep the
     shock out of its own control set. Without it the 5-control minimum counts ROWS, not WINDOWS. */
  const ded=scDedupe(pool); const rows=ded.rows; out.dupControls=ded.dropped;
  const bump=function(c){ out.rejects[c]=(out.rejects[c]||0)+1; };
  const seen={}, inSpan=[]; let series=null, caveat=null;
  for(let i=0;i<rows.length;i++){
    const c=rows[i];
    if(!c||c===shock) continue;
    if(c.ticker===shock.ticker&&c.open===shock.open) continue;
    if(c.shock===true){ bump(SC_OMIT.IS_SHOCK); continue; }
    if(!scKeyEqual(scMatchKey(c),key)){ continue; }        /* a key miss is the ordinary case, not a reject */
    const sk=scSkill(c);
    if(!sk.ok){ bump(sk.code); continue; }
    const cl=scWindowClear(c);
    if(cl.known){
      if(series===null) series=cl.known.series;
      if(caveat===null) caveat=cl.known.caveat;
      const sp=cl.known.inSpan||[];
      for(let j=0;j<sp.length;j++) if(seen[sp[j]]!==1){ seen[sp[j]]=1; inSpan.push(sp[j]); }
    }
    if(!cl.clear){ bump(cl.reason); continue; }
    out.controls.push({ticker:c.ticker,open:c.open,close:c.close,skill:sk.skill,
      bTool:sk.bTool,bMkt:sk.bMkt,probes:cl.probes});
  }
  inSpan.sort();
  out.n=out.controls.length;
  out.matched=out.n>=SCORE.CTRL_MIN;
  out.reason=out.matched?null:SC_OMIT.THIN;
  out.known={series:series,inSpan:inSpan,partial:true,caveat:caveat};
  return out;
}

/* ---- guards: what may never be pooled ------------------------------------------------------------------- */
/* 11.5: separate ledgers, separate n, separate READY, no pooled Brier, no pooled P&L, no combined verdict, ever.
   prereg/ ships shockPoolGuard for exactly this; it is used when present so there is one definition of "mixed
   phase" in the codebase, and restated when prereg is absent so this unit still refuses rather than merging. */
/* PRESENCE AND TYPE ARE CHECKED HERE, BEFORE THE MIXING CHECK, and both are hard refusals.
   An ABSENT phase used to leave `phases` empty, which scPairs turned into phase:null -- and null is not 2, so
   shockStatus's `if(st.phase===2)` block never ran and a phase-2 arm reached READY with no confusion matrix by
   omitting one field. 11.5 says Phase 2 "does not report at all" until its detector is scored against the
   phase-1 calendar; a permissive default is the one thing that cannot be allowed to satisfy it, and every
   other 11.5 dimension in this unit (mixed phase, mixed series) is already a hard refusal.
   A NON-NUMERIC phase is refused for the same reason in a different disguise: shockPoolGuard collects phases
   as OBJECT KEYS, so phase:1 and phase:"1" coerce to the same key and pool silently, and shockStatus compares
   with === so a string "2" would skip the phase-2 gate as well. */
function scPhaseGuard(rows){
  if(!Array.isArray(rows)) return {ok:false,phases:[],code:SC_OMIT.BAD_WINDOW};
  let n=0;
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    if(!r||typeof r!=="object") continue;
    n++;
    if(r.phase===undefined||r.phase===null) return {ok:false,phases:[],code:SC_OMIT.NO_PHASE};
    if(typeof r.phase!=="number"||!isFinite(r.phase)) return {ok:false,phases:[],code:SC_OMIT.BAD_PHASE};
  }
  if(!n) return {ok:false,phases:[],code:SC_OMIT.NO_PHASE};
  if(typeof shockPoolGuard==="function"){ const g=shockPoolGuard(rows);
    if(g) return {ok:g.ok,phases:g.phases,code:g.ok?null:SC_OMIT.MIXED_PHASE}; }
  const ph={}; for(let i=0;i<rows.length;i++){ const r=rows[i];
    if(r&&r.phase!==undefined&&r.phase!==null) ph[r.phase]=1; }
  const ks=Object.keys(ph);
  return {ok:ks.length<=1,phases:ks.map(Number).sort(),code:ks.length<=1?null:SC_OMIT.MIXED_PHASE};
}
/* Section 4: the two series are scored separately. Pooling them mixes a 15-minute window whose strike is set at
   the money at open with an hourly ladder rung that has been off the money for an hour; the Brier scales are not
   comparable and the seasonal ratio acts on one and not the other. */
function scSeriesGuard(rows){
  if(!Array.isArray(rows)) return {ok:false,series:[]};
  const se={}; for(let i=0;i<rows.length;i++){ const r=rows[i];
    const s=r?scSeriesOf(r.ticker):null; if(s!==null) se[s]=1; }
  const ks=Object.keys(se).sort();
  return {ok:ks.length<=1,series:ks};
}

/* ---- THE PAIRED PER-WINDOW DIFFERENCE (11.2) ------------------------------------------------------------
   For every shock window: its own skill, minus the MEAN skill of its own matched controls. One number per shock
   window. This is the quantity the CI is taken over and the quantity whose sd feeds 11.2a -- NOT the sd of the
   shock Briers and NOT the sd of the control Briers, both of which are larger and would inflate the required
   holdout n in shockRequiredHoldN, which squares it.
   Unmatched shock windows are RECORDED in `unmatched` with their identity and their reason and carry NO skill
   field: an unmatched window is excluded from scoring, and putting its score on the record beside the matched
   ones is how it gets scored by accident. */
function scPairs(rows){
  const out={ok:false,code:null,pairs:[],unmatched:[],ctrlTotal:0,ctrlMatched:0,
    dupRows:0,phase:null,series:null,known:null};
  if(!Array.isArray(rows)||!rows.length){ out.code=SC_OMIT.NO_SHOCKS; return out; }
  const ded=scDedupe(rows); const rw=ded.rows; out.dupRows=ded.dropped;
  const pg=scPhaseGuard(rw); if(!pg.ok){ out.code=pg.code||SC_OMIT.MIXED_PHASE; return out; }
  const sg=scSeriesGuard(rw); if(!sg.ok){ out.code=SC_OMIT.MIXED_SERIES; return out; }
  if(!scHasCalendar()){ out.code=SC_OMIT.NO_CALENDAR; return out; }
  out.phase=pg.phases.length?pg.phases[0]:null;
  out.series=sg.series.length?sg.series[0]:null;
  const seen={}, inSpan=[]; let series=null, caveat=null;
  for(let i=0;i<rw.length;i++){
    const w=rw[i];
    if(!w||w.shock!==true) continue;
    out.ctrlTotal++;
    const sk=scSkill(w);
    const m=scMatchControls(w,rw);
    if(m.known){
      if(series===null) series=m.known.series;
      if(caveat===null) caveat=m.known.caveat;
      const sp=m.known.inSpan||[];
      for(let j=0;j<sp.length;j++) if(seen[sp[j]]!==1){ seen[sp[j]]=1; inSpan.push(sp[j]); }
    }
    if(!sk.ok||!m.matched){
      out.unmatched.push({ticker:w.ticker,open:w.open,close:w.close,nCtrl:m.n,
        code:sk.ok?m.reason:sk.code,known:m.known});
      continue;
    }
    const cs=[], cid=[];
    for(let j=0;j<m.controls.length;j++){
      cs.push(m.controls[j].skill);
      cid.push({id:scRowId(m.controls[j]),skill:m.controls[j].skill});
    }
    const cm=scMean(cs);
    if(cm===null){ out.unmatched.push({ticker:w.ticker,open:w.open,close:w.close,nCtrl:m.n,
      code:SC_OMIT.BAD_PROB,known:m.known}); continue; }
    out.ctrlMatched++;
    /* `cell` and `ctrl` are what make the CLUSTER bootstrap possible (scCells): the pair carries not just the
       control MEAN it was built from but the identified control set that mean was estimated from, so the
       resampler can re-estimate it instead of treating it as a constant. */
    out.pairs.push({ticker:w.ticker,open:w.open,close:w.close,cell:scCellKey(w),
      paired:sk.skill-cm,shockSkill:sk.skill,ctrlMeanSkill:cm,nCtrl:m.n,ctrl:cid,known:m.known});
  }
  inSpan.sort();
  out.known={series:series,inSpan:inSpan,partial:true,caveat:caveat};
  out.ok=out.pairs.length>0;
  if(!out.ok&&out.code===null) out.code=out.ctrlTotal?SC_OMIT.NO_MATCHED:SC_OMIT.NO_SHOCKS;
  return out;
}

/* ---- THE HOLDOUT SPLIT (11.6) ---------------------------------------------------------------------------
   Chronological, defined by COUNT: the first CAL_N graded shock windows in time order are calibration,
   everything after is holdout. RANDOM SPLITTING IS FORBIDDEN -- shock windows repeat monthly by release type, so
   a random split puts June CPI in train and July CPI in test and leaks the regime straight across the boundary.
   The boundary is a count, not a date, and cannot move once the 30th calibration window is graded.

   MOVING IT IS MADE STRUCTURALLY HARD, NOT MERELY DISCOURAGED. scSplit takes ONE argument. There is no n
   parameter, no options object, no override, and nothing a call site can pass that changes where the boundary
   falls; test.js asserts scSplit.length === 1 so an added parameter fails the suite rather than shipping. The
   ordering key is the window's CLOSE, tie-broken by ticker, so the sort is total and deterministic and does not
   depend on the order the caller happened to enumerate localStorage in.

   The remaining way a boundary moves is a BACKFILL: a window recorded late but dated before the 30th shifts
   every later window across the line. scSplit therefore stamps the boundary it used, and scSplitStable compares
   two stamps. A caller that persists the stamp can detect the shift; under 11.6 a boundary that moved after the
   holdout opened is a post-freeze change, which SPENDS the holdout. That is not this unit's decision to make --
   it reports `moved` and the caller sets st.holdoutSpent. */
function scSplit(pairs){
  const out={cal:[],hold:[],boundary:null,n:0,calN:SCORE.CAL_N};
  if(!Array.isArray(pairs)) return out;
  const s=pairs.slice();
  s.sort(function(a,b){
    const ac=(a&&scNum(a.close))?a.close:Infinity, bc=(b&&scNum(b.close))?b.close:Infinity;
    if(ac!==bc) return ac-bc;
    const at=(a&&typeof a.ticker==="string")?a.ticker:"", bt=(b&&typeof b.ticker==="string")?b.ticker:"";
    return at<bt?-1:(at>bt?1:0);
  });
  out.n=s.length;
  out.cal=s.slice(0,SCORE.CAL_N);
  out.hold=s.slice(SCORE.CAL_N);
  if(s.length>=SCORE.CAL_N){
    const b=s[SCORE.CAL_N-1];
    out.boundary={n:SCORE.CAL_N,close:b.close,ticker:b.ticker};
  }
  return out;
}
/* Did the calibration/holdout boundary move between two runs? -> {moved, why}. A null boundary on either side
   is "not yet established", which is not a move. */
function scSplitStable(a,b){
  if(!a||!b) return {moved:false,why:"boundary not established"};
  if(a.n!==b.n) return {moved:true,why:"calibration count changed"};
  if(a.close!==b.close) return {moved:true,why:"boundary window close changed"};
  if(a.ticker!==b.ticker) return {moved:true,why:"boundary window identity changed"};
  return {moved:false,why:"unchanged"};
}
/* ONCE THE BOUNDARY EXISTS IT IS AN INPUT, NOT A COMPUTATION -- and a computed boundary that disagrees with the
   registered one is REFUSED, never silently adopted.

   The comment above and NOTES.md both used to say the one remaining way the boundary moves is a BACKFILL. That
   is false, and the error is worse than the omission it looks like: matched-ness is recomputed from the CURRENT
   control pool on every call, so anything that changes whether an OLD shock window still has five controls
   reshuffles the pair list and slides the count boundary. A control ageing out of a 15-day buffer does it. So
   does a control arriving late. Measured on a 35-cell fixture, pruning exactly ONE old control row moved the
   boundary by one window and the required holdout n from 78 to 74 -- and 11.2a says that number may only ever
   move UP. Against 10.2's 15-day prune and section 8's ~15-month programme, control attrition is not a hazard
   the programme might hit; it is guaranteed, repeatedly, unless the caller persists its own control ledger.

   This unit is pure and can persist nothing, so the caller supplies `boundary` (the stamp scSplit returned when
   the 30th calibration window was graded) and `holdNRegistered` (the required n written into CLAUDE.md 11.2a at
   the same moment). Before either is registered the unit reports what it computed and says it is unregistered.
   After, a disagreement stops the pass: 11.6 makes a boundary that moved after the holdout opened a post-freeze
   change, which SPENDS the holdout, and that call belongs to the caller -- so this returns a refusal and a
   reason, never a score computed against a boundary nobody registered. */
function scSplitCheck(computed,registered){
  const out={computed:computed||null,registered:(registered===undefined?null:registered)||null,
    registeredOk:false,moved:false,why:null,refuse:false};
  if(out.registered===null){
    out.why=out.computed?"boundary computed; not yet registered by the caller":"boundary not established";
    return out;
  }
  if(!scNum(out.registered.close)||!scNum(out.registered.n)||typeof out.registered.ticker!=="string"){
    out.refuse=true; out.moved=true; out.why="the registered boundary is not a boundary stamp"; return out;
  }
  if(out.computed===null){
    out.refuse=true; out.moved=true;
    out.why="a boundary was registered but the current pair set no longer establishes one";
    return out;
  }
  const st=scSplitStable(out.registered,out.computed);
  out.moved=st.moved; out.why=st.why; out.refuse=st.moved; out.registeredOk=!st.moved;
  return out;
}
/* 11.2a: the required holdout n "may only ever move up". shockRequiredHoldN is stateless -- it recomputes from
   whatever sd this call measured -- so the ratchet lives here, over the value the caller registered. A DOWNWARD
   computation is not an error to hide; it is reported (`movedDown`) and then ignored in favour of the registered
   figure, which is what "may only ever move up" means operationally. */
function scRatchet(computed,registered){
  const out={computed:(scNum(computed)?computed:null),registered:(scNum(registered)?registered:null),
    effective:null,ratcheted:false,movedDown:false};
  if(out.registered===null){ out.effective=out.computed; return out; }
  if(out.computed===null){ out.effective=out.registered; out.ratcheted=true; return out; }
  out.effective=Math.max(out.computed,out.registered);
  out.ratcheted=out.effective!==out.computed;
  out.movedDown=out.computed<out.registered;
  return out;
}
/* sd of the PAIRED per-window difference, measured on the CALIBRATION half alone (11.2a). Returns null below
   CAL_N -- never a value computed from a short calibration set. shockRequiredHoldN(null,...) returns null, and
   shockStatus turns a null need into INVALID, so a short calibration set cannot open a holdout through this
   path. That refusal is the whole function: it exists to be null more often than it is a number. */
function scSd(cal){
  if(!Array.isArray(cal)||cal.length<SCORE.CAL_N) return null;
  const v=[]; for(let i=0;i<cal.length;i++){ const p=cal[i];
    if(!p||!scNum(p.paired)) return null; v.push(p.paired); }
  return scSdOf(v);
}

/* ---- the difference-in-differences, and the number that may never be reported alone ----------------------
   11.3 is categorical: NO shock number is EVER reported against the unconditional baseline -- not in the UI, not
   in a CSV, not in the document. So the unconditional mean is not returnable on its own. It is computed in a
   local here and attached to the result ONLY on the branch where the CONTROLLED estimate is a real number; when
   there is no controlled estimate, `uncontrolled` is null and carries a code. No exported function in this unit
   returns the unconditional aggregate by itself, and test.js proves it by calling every export on a fixture
   where every shock window is unmatched and scanning the whole returned object for the value.

   `controlled` is shockStatus's and section 11.2's orientation: MARKET minus TOOL, so positive means the tool
   beat the market by more on shock windows than on their matched controls. `toolMinusMarket` is the exact
   negation -- the loss-ordered reading, which is the one a reader is most likely to write by accident and which
   section 11.2 itself carried in prose until 2026-09-06. It is on the object so the flip is visible rather than
   asserted in a comment. */
function scDid(pairs){
  const out={n:0,controlled:null,toolMinusMarket:null,uncontrolled:null,code:null};
  if(!Array.isArray(pairs)||!pairs.length){ out.code=SC_OMIT.NO_MATCHED; return out; }
  const p=[],u=[];
  for(let i=0;i<pairs.length;i++){
    const r=pairs[i];
    if(!r||!scNum(r.paired)||!scNum(r.shockSkill)){ out.code=SC_OMIT.BAD_PROB; return out; }
    p.push(r.paired); u.push(r.shockSkill);
  }
  const c=scMean(p);
  if(c===null){ out.code=SC_OMIT.BAD_PROB; return out; }
  out.n=p.length;
  out.controlled=c;
  out.toolMinusMarket=-c;
  out.uncontrolled=scMean(u);   /* ONLY on this branch: it exists as a sibling of a real controlled estimate */
  return out;
}

/* ---- the CI (11.4, 11.2a) -------------------------------------------------------------------------------
   Two-sided percentile bootstrap at level 1 - alpha/k, k = the number of arms scored in the phase, counted
   whether or not they are labelled primary. shockCiLevel and shockBootstrapB already exist in prereg/ and are
   USED, not reimplemented: the level and the resample count are section 11 thresholds and there must be exactly
   one definition of each in the codebase. NEITHER MOVES HERE. The level is the level, B is B; what changed on
   2026-09-06 is the RESAMPLING UNIT, and only that.

   THE RESAMPLING UNIT IS THE MATCHING CELL, NOT THE WINDOW. This is a statistics decision, registered now
   because 11.6 freezes the primary statistic and changing it after the holdout opens SPENDS the holdout.

   Why the window is the wrong unit. Each paired value is `shock skill - mean(control skills)`. Resampling the
   paired column alone treats that control mean as a CONSTANT with zero sampling error. But 11.3's four
   matching dimensions -- same UTC slot, same weekday, same quarter, same series -- partition the tape into
   cells, and EVERY SHOCK WINDOW IN A CELL DRAWS THE SAME CONTROL SET. That is not a fixture artefact: 11.3
   says in as many words that scheduled releases cluster on the clock and the weekday, which is exactly what
   forces the shocks into few cells. So the control-mean term is not merely correlated across pairs -- inside a
   cell it is LITERALLY THE SAME NUMBER, estimated from as few as five windows, and a window-level bootstrap
   assumes an independence the matching design destroys by construction.
   Measured on the reviewer's fixture -- one cell, five controls, seven shock windows reading alike -- the
   window-level bootstrap returned a 90% interval of WIDTH EXACTLY ZERO with lo = +0.0341, while the standard
   error of the single shared control mean underneath it was 0.0848: two and a half times the point estimate.
   `shockStatus` tests `dBrier >= floor && ciLo > 0`, so that interval passed half the READY test WITH
   CERTAINTY about a quantity the data does not establish. That is 7.4's failure mode arriving through the CI
   instead of through the backtest.

   What the cluster bootstrap does instead, in two stages, both unseeded (10.5):
     stage 1  resample the CELLS with replacement -- this is the handed-in bootstrapCI, applied to an array of
              cells instead of an array of numbers, so the level, B and the percentile rule are untouched;
     stage 2  inside each drawn cell, resample ITS OWN control windows and ITS OWN shock windows with
              replacement and rebuild the paired values from the re-estimated control mean.
   Stage 1 alone would not fix it: with a single cell every replicate is that same cell and the interval stays
   degenerate. Stage 2 is what puts the control mean's sampling error into the interval, which is the entire
   point -- the cell's shock windows and its control set travel TOGETHER, so a replicate never pairs one cell's
   shocks against another cell's controls.
   The point estimate is NOT taken from the bootstrap. It is the deterministic mean of the observed paired
   values; the replicate statistic is stochastic by construction and a single draw of it is not an estimate.

   The rejected alternative, stated so the choice is visible: keep the window-level bootstrap and register in
   11 that `ciLo` is conditional on the control means, declaring the omitted variance component. That is honest
   arithmetic and a dishonest gate -- 11.2 uses `ciLo > 0` as half of READY, and a bound that conditions away
   the dominant variance component is not evidence that the sign is established. The cluster interval is wider,
   which is the correct direction for a bar that is supposed to be hard to clear. */
function scCells(pairs){
  const out={cells:[],code:null};
  if(!Array.isArray(pairs)||!pairs.length){ out.code=SC_OMIT.NO_MATCHED; return out; }
  const idx={}, order=[];
  for(let i=0;i<pairs.length;i++){
    const p=pairs[i];
    if(!p||typeof p.cell!=="string"||!p.cell.length||!scNum(p.shockSkill)||
       !Array.isArray(p.ctrl)||!p.ctrl.length){ out.code=SC_OMIT.NO_CELL; return out; }
    let c;
    if(scHasOwn(idx,p.cell)) c=idx[p.cell];
    else { c={key:p.cell,shocks:[],ctrl:[],ids:{}}; idx[p.cell]=c; order.push(c); }
    c.shocks.push(p.shockSkill);
    for(let j=0;j<p.ctrl.length;j++){
      const q=p.ctrl[j];
      if(!q||typeof q.id!=="string"||!scNum(q.skill)){ out.code=SC_OMIT.NO_CELL; return out; }
      if(!scHasOwn(c.ids,q.id)){ c.ids[q.id]=1; c.ctrl.push(q.skill); }   /* a control counted once per cell */
    }
  }
  out.cells=order;
  return out;
}
/* One replicate: stage 2. Takes the cells stage 1 drew and returns the mean paired value over every shock
   window in them, with each cell's control mean RE-ESTIMATED from a resample of that cell's own controls.
   Unseeded, exactly like the page's bootstrapCI (10.5): resampling variation is a property of the method. */
function scClusterStat(cells){
  if(!Array.isArray(cells)||!cells.length) return null;
  let s=0,n=0;
  for(let i=0;i<cells.length;i++){
    const c=cells[i];
    if(!c||!Array.isArray(c.ctrl)||!c.ctrl.length||!Array.isArray(c.shocks)||!c.shocks.length) return null;
    let cs=0;
    for(let j=0;j<c.ctrl.length;j++) cs+=c.ctrl[Math.floor(Math.random()*c.ctrl.length)];
    const cm=cs/c.ctrl.length;
    for(let j=0;j<c.shocks.length;j++){ s+=c.shocks[Math.floor(Math.random()*c.shocks.length)]-cm; n++; }
  }
  return n?s/n:null;
}
function scCi(pairs,k,bootstrapFn){
  const out={level:null,B:null,lo:null,hi:null,point:null,n:0,cells:0,unit:"cell",code:null};
  if(!scHasPrereg()){ out.code=SC_OMIT.NO_PREREG; return out; }
  /* k is the CALLER's (11.4) and its absence is its own reason code: reporting `no-prereg` when prereg is
     sitting right there sends a reader to the splice order for a missing argument. */
  if(!scNum(k)||k<1){ out.code=SC_OMIT.NO_ARMS; return out; }
  const lvl=shockCiLevel(k); if(lvl===null){ out.code=SC_OMIT.NO_ARMS; return out; }
  const B=shockBootstrapB(lvl); if(B===null){ out.code=SC_OMIT.NO_PREREG; return out; }
  out.level=lvl; out.B=B;
  const fn=(typeof bootstrapFn==="function")?bootstrapFn:
    ((typeof bootstrapCI==="function")?bootstrapCI:null);
  if(fn===null){ out.code=SC_OMIT.NO_BOOTSTRAP; return out; }
  if(!Array.isArray(pairs)||!pairs.length){ out.code=SC_OMIT.NO_MATCHED; return out; }
  const v=[];
  for(let i=0;i<pairs.length;i++){ const r=pairs[i];
    if(!r||!scNum(r.paired)){ out.code=SC_OMIT.BAD_PROB; return out; } v.push(r.paired); }
  const cl=scCells(pairs);
  if(cl.code!==null){ out.code=cl.code; return out; }   /* no cells, no clusters, no interval -- never a fallback */
  out.n=v.length; out.cells=cl.cells.length;
  const ci=fn(cl.cells,function(a){ return scClusterStat(a); },lvl,B);
  if(!ci||!scNum(ci.lo)||!scNum(ci.hi)){ out.code=SC_OMIT.BAD_PROB; return out; }
  out.lo=ci.lo; out.hi=ci.hi;
  out.point=scMean(v);   /* deterministic; ci.point is one stochastic replicate and is deliberately discarded */
  return out;
}

/* ---- assembling `st` -------------------------------------------------------------------------------------
   Exactly the fifteen fields shockStatus reads, and no sixteenth. EIGHT are MEASURED here -- phase, nCal,
   nHold, sd, dBrier, ciLo, ctrlMatched, ctrlTotal -- and SEVEN are the caller's (SC_CALLER_FIELDS), copied
   VERBATIM with no defaulting whatsoever.

   NOTHING IS DEFAULTED TO A PERMISSIVE VALUE, and `frozen` is the one that matters most: defaulting it to true
   opens a holdout nobody froze, which 11.6 says is the moment the evidence stops meaning anything. An absent
   caller field arrives at shockStatus as undefined, where `st.frozen !== true` yields FROZEN-PENDING and a
   missing detPrecision on phase 2 yields INVALID -- the judge already refuses correctly, so the assembler's only
   job is to not lie to it. `missing` names every caller field that was not supplied, so a caller can see that it
   under-specified the call instead of reading a status derived from holes. */
const SC_CALLER_FIELDS=["arms","pnlN","pnlNet","detPrecision","monthsElapsed","frozen","holdoutSpent"];
function scAssemble(measured,opts){
  const o=(opts&&typeof opts==="object")?opts:{};
  const m=(measured&&typeof measured==="object")?measured:{};
  const st={
    phase:(m.phase===undefined?null:m.phase),
    nCal:m.nCal, nHold:m.nHold, sd:m.sd, dBrier:m.dBrier, ciLo:m.ciLo,
    ctrlMatched:m.ctrlMatched, ctrlTotal:m.ctrlTotal,
    arms:o.arms, pnlN:o.pnlN, pnlNet:o.pnlNet,
    detPrecision:o.detPrecision, monthsElapsed:o.monthsElapsed,
    frozen:o.frozen, holdoutSpent:o.holdoutSpent
  };
  const missing=[];
  for(let i=0;i<SC_CALLER_FIELDS.length;i++){
    const f=SC_CALLER_FIELDS[i];
    if(o[f]===undefined||o[f]===null) missing.push(f);
  }
  return {st:st,missing:missing};
}

/* ---- COVERAGE, ON THE HOLDOUT ALONE (11.2) --------------------------------------------------------------
   11.2 prefixes its whole READY list with "on the HOLDOUT set alone (11.6)", and "Control coverage >= 80%" is
   the second item in that list. Coverage used to be counted over EVERY recorded shock window, calibration and
   holdout together, and handed to shockStatus that way. That is not conservative: a coverage failure that lands
   in the holdout -- which is where it matters -- is diluted by calibration windows that have already been
   spent. Measured, on 60 matched windows plus 10 unmatched ones dated after the boundary: pooled coverage
   0.857 PASSES and the pass reads READY, while holdout-only coverage is 0.750 and 11.7 clause 3 ABANDONS.
   Both figures are reported -- the calibration one is still worth seeing, and so is the pooled one -- but only
   the HOLDOUT figure reaches `st`, because that is the one the gate reads.
   A window is on the holdout side when it sorts after the boundary stamp under scSplit's own order (close,
   ticker), matched or not: an unmatched window is never scored, but it is RECORDED, and coverage is precisely
   the count of what was recorded against what could be scored. With no boundary yet there is no holdout, so
   the holdout counts are zero and shockStatus's `ctrlTotal > 0` guard skips the gate -- correct: the coverage
   test is a holdout test and there is nothing to test yet. */
function scAfterBoundary(w,b){
  if(!b||!scNum(b.close)||!w||!scNum(w.close)) return false;
  if(w.close!==b.close) return w.close>b.close;
  const wt=(typeof w.ticker==="string")?w.ticker:"", bt=(typeof b.ticker==="string")?b.ticker:"";
  return wt>bt;
}
function scCoverage(P,boundary){
  const out={hold:{matched:0,total:0,frac:null},cal:{matched:0,total:0,frac:null},
    all:{matched:0,total:0,frac:null}};
  if(!P) return out;
  const add=function(side,matched){ side.total++; if(matched) side.matched++; };
  const walk=function(list,matched){
    if(!Array.isArray(list)) return;
    for(let i=0;i<list.length;i++){
      add(out.all,matched);
      add(scAfterBoundary(list[i],boundary)?out.hold:out.cal,matched);
    }
  };
  walk(P.pairs,true); walk(P.unmatched,false);
  const frac=function(x){ x.frac=x.total?x.matched/x.total:null; };
  frac(out.hold); frac(out.cal); frac(out.all);
  return out;
}

/* ---- REFUSALS: a hole in the input is not a verdict -------------------------------------------------------
   scAssemble is scrupulous about not defaulting an absent caller field, and then the verdict used to be
   computed anyway: omit `holdoutSpent` and shockStatus reads absent as NOT SPENT -- the value that lets the
   programme advance -- and the pass returns READY with `missing` naming the field nobody acted on. Omit
   `monthsElapsed` and 11.7 clause 5 cannot fire. A verdict derived from a hole is worth less than no verdict,
   so the answer is a REFUSAL that names the hole.
   `detPrecision` is required only at phase 2, where 11.5 demands the confusion matrix; at phase 1 it is
   legitimately absent and is reported in `missing` without blocking anything.
   A refusal is deliberately NOT one of shockStatus's statuses. It is not a judgment of the evidence -- it is
   this unit declining to hand the judge an input it does not have -- and a caller switching on READY /
   NEGATIVE / HOLDOUT / CALIBRATING / FROZEN-PENDING / ABANDON / INVALID sees an unknown string, which is safe
   in the only direction that matters: it is not READY. */
const SC_VERDICT_FIELDS=["arms","pnlN","pnlNet","monthsElapsed","frozen","holdoutSpent"];
function scRequiredFields(phase){
  const r=SC_VERDICT_FIELDS.slice();
  if(phase===2) r.push("detPrecision");
  return r;
}
function scMissingRequired(missing,phase){
  const out=[]; if(!Array.isArray(missing)) return out;
  const need=scRequiredFields(phase);
  for(let i=0;i<need.length;i++) if(missing.indexOf(need[i])>=0) out.push(need[i]);
  return out;
}
/* the refusals that must be REPORTED as refusals rather than answered on the window count. A mixed-phase call
   used to come back "CALIBRATING / calibration set incomplete" -- a benign progress message for a call 11.5
   forbids outright, which cannot reach READY but hides a caller bug indefinitely. */
const SC_REFUSALS=[SC_OMIT.MIXED_PHASE,SC_OMIT.MIXED_SERIES,SC_OMIT.NO_PHASE,SC_OMIT.BAD_PHASE,
  SC_OMIT.NO_CALENDAR,SC_OMIT.BOUNDARY_MOVED,SC_OMIT.MISSING_FIELDS];
const SC_REFUSAL_WHY={
  "mixed-phase":"phase 1 and phase 2 are never pooled (11.5): separate ledgers, separate n, separate READY",
  "mixed-series":"15-minute and hourly windows are scored separately (section 4)",
  "no-phase":"no row carries a phase, so 11.5's phase-2 gate cannot be applied; an absent phase is refused, never defaulted",
  "bad-phase":"a phase that is not a number cannot be compared with === ; 1 and \"1\" must never pool (11.5)",
  "no-calendar":"controlEligible is not in scope, so 11.3's control eligibility cannot be consulted",
  "boundary-moved":"the calibration/holdout boundary is not the registered one (11.6); moving it after the holdout opened spends the holdout",
  "missing-caller-fields":"a caller field the verdict depends on was not supplied; a hole is not a verdict"
};
function scIsRefusal(code){ return typeof code==="string"&&SC_REFUSALS.indexOf(code)>=0; }
function scRefused(code,why,k){
  const lvl=(scHasPrereg()&&scNum(k)&&k>=1)?shockCiLevel(k):null;
  const B=(lvl===null)?null:shockBootstrapB(lvl);
  return {status:"REFUSED",code:code,
    why:(why||SC_REFUSAL_WHY[code]||"refused")+" -- no verdict is computed on this input",
    ciLevel:lvl,bootstrapB:B,holdNReq:null};
}
function scMaxMonths(){
  if(typeof SHOCK_RULE!=="object"||SHOCK_RULE===null||!scNum(SHOCK_RULE.maxMonths)) return null;
  return SHOCK_RULE.maxMonths;
}
/* the 11.2a ratchet, applied to the judge's answer. shockStatus derives its own `need` from st.sd, so a
   registered requirement larger than the one this call's sd implies has to be applied afterwards -- and it may
   only ever tighten: a status that is already INVALID, ABANDON, FROZEN-PENDING or CALIBRATING is untouched, and
   the only moves are READY/NEGATIVE -> HOLDOUT, or -> ABANDON when 11.7 clause 5's deadline has also passed.
   No threshold is re-derived here; `maxMonths` is read from SHOCK_RULE, exactly as shockStatus reads it. */
function scRatchetStatus(status,nHold,holdN,monthsElapsed){
  if(!status||!holdN||!scNum(holdN.effective)) return status;
  const eff=holdN.effective;
  const out={status:status.status,why:status.why,ciLevel:status.ciLevel,bootstrapB:status.bootstrapB,
    holdNReq:eff};
  if(status.status!=="READY"&&status.status!=="NEGATIVE") return out;
  if(!(scNum(nHold)&&nHold<eff)) return out;
  const mx=scMaxMonths();
  if(mx!==null&&scNum(monthsElapsed)&&monthsElapsed>mx){
    out.status="ABANDON";
    out.why="the registered holdout n was not reached inside 24 months (11.7 clause 5, against the 11.2a ratchet)";
    return out;
  }
  out.status="HOLDOUT";
  out.why="holdout incomplete against the REGISTERED required n (11.2a: it may only ever move up)";
  return out;
}

/* ---- the whole pass ---------------------------------------------------------------------------------------
   rows: one array of window records for ONE phase and ONE series, each being an edge-ledger window
     {ticker, open, close, result, snaps} plus {phase, shock}. `shock` is the caller's -- phase 1 reads it off
     the release calendar, phase 2 off its detector -- because deciding what a shock IS belongs to calendar/ and
     detect/, not here. Mixed phases and mixed series are REFUSED, not merged.
   opts: the eight caller fields, plus `bootstrap` (the page's bootstrapCI).

   sd comes from the CALIBRATION half; dBrier and ciLo come from the HOLDOUT ALONE, because 11.6 decides READY on
   the holdout alone and the calibration half is never re-scored into the result. Coverage is over every RECORDED
   shock window, matched or not, which is what 11.7 clause 3 asks for. */
function scReport(rows,opts){
  const o=(opts&&typeof opts==="object")?opts:{};
  const P=scPairs(rows);
  const rep={version:SCORE.version,ok:false,code:P.code,
    phase:P.phase,series:P.series,
    ctrlTotal:P.ctrlTotal,ctrlMatched:P.ctrlMatched,unmatched:P.unmatched,
    dupRows:P.dupRows,coverage:null,
    known:P.known,caveat:(P.known&&P.known.caveat)||null,
    split:null,boundary:null,sd:null,holdN:null,did:null,ci:null,st:null,missing:null,status:null};
  if(!P.ok){
    const a0=scAssemble({phase:P.phase,nCal:0,nHold:0,sd:null,dBrier:null,ciLo:null,
      ctrlMatched:0,ctrlTotal:0},o);
    rep.st=a0.st; rep.missing=a0.missing; rep.coverage=scCoverage(P,null);
    /* a REFUSAL is reported as a refusal; "no shock windows yet" and "none matched yet" are progress, and the
       judge answers those on the counts, which is what they are. */
    rep.status=scIsRefusal(P.code)?scRefused(P.code,null,o.arms)
      :((typeof shockStatus==="function")?shockStatus(a0.st):null);
    return rep;
  }
  const sp=scSplit(P.pairs);
  rep.split={calN:sp.cal.length,holdN:sp.hold.length,boundary:sp.boundary,total:sp.n};
  /* 11.6: the boundary the caller registered wins, and a disagreement stops the pass before anything is
     scored against a boundary nobody registered. */
  const bchk=scSplitCheck(sp.boundary,o.boundary);
  rep.boundary=bchk;
  if(bchk.refuse){
    rep.code=SC_OMIT.BOUNDARY_MOVED;
    const ab=scAssemble({phase:P.phase,nCal:sp.cal.length,nHold:sp.hold.length,sd:null,dBrier:null,ciLo:null,
      ctrlMatched:0,ctrlTotal:0},o);
    rep.st=ab.st; rep.missing=ab.missing; rep.coverage=scCoverage(P,sp.boundary);
    rep.status=scRefused(SC_OMIT.BOUNDARY_MOVED,
      "the calibration/holdout boundary moved ("+bchk.why+"): 11.6 makes that a post-freeze change, which "+
      "spends the holdout, and only the caller may declare that",o.arms);
    return rep;
  }
  const cov=scCoverage(P,sp.boundary);
  const sd=scSd(sp.cal);
  const did=scDid(sp.hold);
  const ci=scCi(sp.hold,o.arms,o.bootstrap);
  const a=scAssemble({phase:P.phase,nCal:sp.cal.length,nHold:sp.hold.length,sd:sd,
    dBrier:did.controlled,ciLo:ci.lo,ctrlMatched:cov.hold.matched,ctrlTotal:cov.hold.total},o);
  rep.ok=true; rep.code=(sd===null?SC_OMIT.CAL_SHORT:null);
  rep.coverage=cov; rep.sd=sd; rep.did=did; rep.ci=ci; rep.st=a.st; rep.missing=a.missing;
  const needNow=(scHasPrereg()&&typeof shockRequiredHoldN==="function"&&scNum(o.arms)&&o.arms>=1)
    ?shockRequiredHoldN(sd,o.arms,0.5):null;
  rep.holdN=scRatchet(needNow,o.holdNRegistered);
  /* a caller field the verdict depends on is missing -> a refusal, not a verdict. The measurements above stay
     on the report: they are real, and the caller needs them to see what it under-specified. */
  const req=scMissingRequired(a.missing,P.phase);
  if(req.length){
    rep.code=SC_OMIT.MISSING_FIELDS;
    rep.status=scRefused(SC_OMIT.MISSING_FIELDS,
      "these caller fields decide the verdict and were not supplied: "+req.join(", "),o.arms);
    return rep;
  }
  rep.status=scRatchetStatus((typeof shockStatus==="function")?shockStatus(a.st):null,
    sp.hold.length,rep.holdN,o.monthsElapsed);
  return rep;
}
