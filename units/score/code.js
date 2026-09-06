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
  MIXED_SERIES:"mixed-series",     /* section 4: 15-minute and hourly are scored separately */
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

/* ---- small numeric helpers ------------------------------------------------------------------------------ */
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
   `void` settlement scored as a NO. A void window is UNGRADED, not a loss. */
function scSkill(w){
  if(!w||!scNum(w.open)||!scNum(w.close)) return {ok:false,code:SC_OMIT.BAD_WINDOW};
  if(w.result!=="yes"&&w.result!=="no") return {ok:false,code:SC_OMIT.UNGRADED};
  const s=scRefSnap(w); if(s===null) return {ok:false,code:SC_OMIT.NO_REFSNAP};
  const y=w.result==="yes"?1:0;
  const pt=s.pm, q=scNum(s.qm)?s.qm/100:null;
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
  const out={n:0,controls:[],matched:false,reason:null,known:null,rejects:{}};
  if(!scHasCalendar()){ out.reason=SC_OMIT.NO_CALENDAR; return out; }
  const key=scMatchKey(shock);
  if(key===null){ out.reason=SC_OMIT.BAD_WINDOW; return out; }
  if(!Array.isArray(pool)){ out.reason=SC_OMIT.BAD_WINDOW; return out; }
  const bump=function(c){ out.rejects[c]=(out.rejects[c]||0)+1; };
  const seen={}, inSpan=[]; let series=null, caveat=null;
  for(let i=0;i<pool.length;i++){
    const c=pool[i];
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
function scPhaseGuard(rows){
  if(!Array.isArray(rows)) return {ok:false,phases:[]};
  if(typeof shockPoolGuard==="function"){ const g=shockPoolGuard(rows); if(g) return g; }
  const ph={}; for(let i=0;i<rows.length;i++){ const r=rows[i];
    if(r&&r.phase!==undefined&&r.phase!==null) ph[r.phase]=1; }
  const ks=Object.keys(ph);
  return {ok:ks.length<=1,phases:ks.map(Number).sort()};
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
    phase:null,series:null,known:null};
  if(!Array.isArray(rows)||!rows.length){ out.code=SC_OMIT.NO_SHOCKS; return out; }
  const pg=scPhaseGuard(rows); if(!pg.ok){ out.code=SC_OMIT.MIXED_PHASE; return out; }
  const sg=scSeriesGuard(rows); if(!sg.ok){ out.code=SC_OMIT.MIXED_SERIES; return out; }
  if(!scHasCalendar()){ out.code=SC_OMIT.NO_CALENDAR; return out; }
  out.phase=pg.phases.length?pg.phases[0]:null;
  out.series=sg.series.length?sg.series[0]:null;
  const seen={}, inSpan=[]; let series=null, caveat=null;
  for(let i=0;i<rows.length;i++){
    const w=rows[i];
    if(!w||w.shock!==true) continue;
    out.ctrlTotal++;
    const sk=scSkill(w);
    const m=scMatchControls(w,rows);
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
    const cs=[]; for(let j=0;j<m.controls.length;j++) cs.push(m.controls[j].skill);
    const cm=scMean(cs);
    if(cm===null){ out.unmatched.push({ticker:w.ticker,open:w.open,close:w.close,nCtrl:m.n,
      code:SC_OMIT.BAD_PROB,known:m.known}); continue; }
    out.ctrlMatched++;
    out.pairs.push({ticker:w.ticker,open:w.open,close:w.close,
      paired:sk.skill-cm,shockSkill:sk.skill,ctrlMeanSkill:cm,nCtrl:m.n,known:m.known});
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
   one definition of each in the codebase.

   The bootstrap itself is the PAGE's bootstrapCI, handed in. It is deliberately UNSEEDED (10.5) -- resampling
   variation is a property of a percentile bootstrap, not a bug -- so this unit neither seeds it nor routes
   around it, and takes it as an argument only because a unit may not reach a page global. B comes from
   shockBootstrapB(level) and nowhere else: the bootstrap cannot resolve a tail finer than 1/B, and 20/(1-level)
   is what puts at least 10 resamples in each tail. */
function scCi(pairs,k,bootstrapFn){
  const out={level:null,B:null,lo:null,hi:null,point:null,n:0,code:null};
  if(!scHasPrereg()){ out.code=SC_OMIT.NO_PREREG; return out; }
  const lvl=shockCiLevel(k); if(lvl===null){ out.code=SC_OMIT.NO_PREREG; return out; }
  const B=shockBootstrapB(lvl); if(B===null){ out.code=SC_OMIT.NO_PREREG; return out; }
  out.level=lvl; out.B=B;
  const fn=(typeof bootstrapFn==="function")?bootstrapFn:
    ((typeof bootstrapCI==="function")?bootstrapCI:null);
  if(fn===null){ out.code=SC_OMIT.NO_BOOTSTRAP; return out; }
  if(!Array.isArray(pairs)||!pairs.length){ out.code=SC_OMIT.NO_MATCHED; return out; }
  const v=[];
  for(let i=0;i<pairs.length;i++){ const r=pairs[i];
    if(!r||!scNum(r.paired)){ out.code=SC_OMIT.BAD_PROB; return out; } v.push(r.paired); }
  out.n=v.length;
  const ci=fn(v,function(a){ return scMean(a); },lvl,B);
  if(!ci||!scNum(ci.lo)||!scNum(ci.hi)){ out.code=SC_OMIT.BAD_PROB; return out; }
  out.lo=ci.lo; out.hi=ci.hi; out.point=scNum(ci.point)?ci.point:scMean(v);
  return out;
}

/* ---- assembling `st` -------------------------------------------------------------------------------------
   Exactly the fifteen fields shockStatus reads, and no sixteenth. Seven are MEASURED here; eight are the
   caller's and are copied VERBATIM with no defaulting whatsoever.

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
    known:P.known,caveat:(P.known&&P.known.caveat)||null,
    split:null,sd:null,did:null,ci:null,st:null,missing:null,status:null};
  if(!P.ok){
    const a0=scAssemble({phase:P.phase,nCal:0,nHold:0,sd:null,dBrier:null,ciLo:null,
      ctrlMatched:P.ctrlMatched,ctrlTotal:P.ctrlTotal},o);
    rep.st=a0.st; rep.missing=a0.missing;
    rep.status=(typeof shockStatus==="function")?shockStatus(a0.st):null;
    return rep;
  }
  const sp=scSplit(P.pairs);
  const sd=scSd(sp.cal);
  const did=scDid(sp.hold);
  const ci=scCi(sp.hold,o.arms,o.bootstrap);
  const a=scAssemble({phase:P.phase,nCal:sp.cal.length,nHold:sp.hold.length,sd:sd,
    dBrier:did.controlled,ciLo:ci.lo,ctrlMatched:P.ctrlMatched,ctrlTotal:P.ctrlTotal},o);
  rep.ok=true; rep.code=(sd===null?SC_OMIT.CAL_SHORT:null);
  rep.split={calN:sp.cal.length,holdN:sp.hold.length,boundary:sp.boundary,total:sp.n};
  rep.sd=sd; rep.did=did; rep.ci=ci; rep.st=a.st; rep.missing=a.missing;
  rep.status=(typeof shockStatus==="function")?shockStatus(a.st):null;
  return rep;
}
