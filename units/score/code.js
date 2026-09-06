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
   and 15-minute controls are drawn on one clock.
   HOLD_N_MIN = 30 restates SHOCK_RULE.holdN (11.2a). It is the FLOOR of the required holdout n, so a caller that
   registers a smaller one is registering a loosening, which 11.7 clause 6 closes the programme for -- this unit
   refuses the call instead of scoring against it.
   COV_MIN_N = 30 is 11.2's registered minimum coverage denominator, added to the document on 2026-09-06 after
   the first draft of this unit was measured closing the programme on a denominator of ONE. The 80% bar itself
   has NOT moved; what moved is the n at which the ratio is a statement about the holdout rather than about one
   window, and 11.7 clause 3 now carries the same sentence ("This clause may not fire below that minimum
   denominator"). See scCoverage.
   SD_ZERO_REL = 1e-12 is the relative floor below which a measured sd is FLOATING-POINT RESIDUE rather than a
   measurement (see scSdOf). It only ever turns a number into a refusal, never the other way round. */
const SCORE={
  CTRL_MIN:5,
  CAL_N:30,
  HOLD_N_MIN:30,
  COV_MIN_N:30,
  CLEAR_HALF_MIN:45,
  REF_TAU_MIN:6,
  SLOT_MIN:15,
  SD_ZERO_REL:1e-12,
  DAY_MS:86400000,
  version:"score-2026-09-06-b"
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
  CAL_SHORT:"calibration-short",   /* fewer than CAL_N calibration windows: no sd, so no holdout may open */
  BAD_ROW:"bad-row-field",         /* a row field is present with the wrong type, or absent and load-bearing */
  BAD_SHOCK:"bad-shock-flag",      /* `shock` is the treatment assignment and is not a boolean */
  BAD_OPT:"bad-caller-field",      /* an opts field is present with the wrong type or an impermissible value */
  UNKNOWN_OPT:"unknown-caller-field" /* an opts key that is not in SC_OPT_FIELDS: a field that skipped the contract */
};

/* ---- THE CONTRACT, ENUMERATED IN ONE PLACE (the fault this unit was rebuilt around) -----------------------
   The second adversarial review closed with one sentence about nine findings: "every input this unit does not
   police is policed on the permissive side." That was not nine defects, it was one defect wearing nine fields.
   `shock` decided TREATMENT ASSIGNMENT and was tested with ===true in scPairs and ===true in scMatchControls, so
   `shock:1` fell through BOTH -- the window was not treated AND not excluded from its own cell's control pool,
   which moved an honest difference-in-differences of 0.00000 to +0.23333 with no reason code, no unmatched row
   and nothing in `missing`. That is 7.4's retroactive side-picking reachable through a type coercion, and unlike
   the 7.4 episodes it left no trace on the record. `holdoutSpent` -- the one field in 11.6 that invalidates
   everything -- was tested with ===true too, so `holdoutSpent:1` and `holdoutSpent:"yes"` read as NOT SPENT and
   reached READY. `boundary` and `holdNRegistered` were optional, so 11.6's frozen split and 11.2a's
   upward-only ratchet were advisory: a 35-cell fixture went HOLDOUT (need 46) to READY (need 30) purely by
   OMITTING holdNRegistered.

   SO THE CONTRACT IS TOTAL, AND IT IS A TABLE RATHER THAN A HABIT. Every field this unit reads on a row, on a
   snapshot, in opts, or on a neighbour's return value is enumerated below with an explicit type and an explicit
   permitted shape. There is no third category and no field that is merely "read":
     - a value PRESENT with the wrong type is a REFUSAL, never a coercion and never a truthiness test;
     - a field ABSENT that any verdict depends on is a REFUSAL, never a default;
     - an opts key that is NOT IN THE TABLE is a REFUSAL, because the failure mode of a field that skipped the
       contract has to be refusal rather than passage. That is the whole point of enumerating it here: a field
       added to this unit later cannot quietly acquire a permissive default, because there is nowhere to add one
       without adding a row to this table.
   Rows are the one asymmetry and it is deliberate: an edge-ledger row legitimately carries columns this unit
   does not read (strike, phantom repair marks, H-protocol columns), so an unknown ROW key is not an error. The
   enumeration is enforced there from the other end instead -- test.js parses this file, collects every property
   name it READS, subtracts the names this unit itself assigns and a fixed list of JS builtins, and requires the
   remainder to be a subset of these tables. A new `w.something` therefore fails the suite unless it is declared
   here, and every declared field must actually be read, so the table cannot rot in either direction.

   WHAT A REFUSAL IS. Not a status: SC_REFUSALS carries these codes through scReport as status "REFUSED", which
   is this unit declining to hand shockStatus an input it does not have. A caller switching on READY / NEGATIVE /
   HOLDOUT / CALIBRATING / FROZEN-PENDING / ABANDON / INVALID sees an unknown string, which is safe in the only
   direction that matters: it is not READY.
   ONE ROW POISONS THE CALL, and that is the existing precedent, not a new severity: scPhaseGuard already refuses
   the WHOLE set when a single row's phase is absent or a string, because 1 and "1" must never pool. A row whose
   `shock` flag is `1` is the same class of caller bug and gets the same answer. */
function scTypeNum(v){ return scNum(v); }
function scTypeBool(v){ return v===true||v===false; }
function scTypeStr(v){ return typeof v==="string"&&v.length>0; }
function scTypeArr(v){ return Array.isArray(v); }
function scTypeFn(v){ return typeof v==="function"; }
/* the boundary stamp scSplit emits: {n, close, ticker, fp}. `fp` is not decoration -- see scCalFp. */
function scTypeStamp(v){
  return !!v&&typeof v==="object"&&scNum(v.n)&&scNum(v.close)&&scTypeStr(v.ticker)&&scTypeStr(v.fp);
}
/* THE ROW CONTRACT. `req` means the verdict depends on it, so its absence is a refusal rather than a default. */
const SC_ROW_FIELDS=[
  {name:"ticker",req:true,shape:"non-empty string",ok:scTypeStr,code:SC_OMIT.BAD_ROW},
  {name:"open",req:true,shape:"finite number (epoch ms, UTC)",ok:scTypeNum,code:SC_OMIT.BAD_ROW},
  {name:"close",req:true,shape:"finite number (epoch ms, UTC), strictly after open",ok:scTypeNum,
   code:SC_OMIT.BAD_ROW},
  /* 11.5 keeps its own two codes: an ABSENT phase and a STRING phase are different caller bugs and the
     difference is worth reading off the report. */
  /* the predicate IS the declared shape. Typed as merely-numeric, phase 3 / 1.5 / 0 / -1 all reached READY
     with 11.5's phase-2 confusion-matrix gate never running, because shockStatus gates on st.phase===2 - the
     same hole an absent phase used to open, wearing a number. */
  {name:"phase",req:true,shape:"exactly 1 or 2; never the string \"1\", never any other number",
   ok:function(v){ return v===1||v===2; },
   code:SC_OMIT.BAD_PHASE,codeMissing:SC_OMIT.NO_PHASE},
  /* THE TREATMENT ASSIGNMENT. Strictly boolean, strictly required. An absent `shock` cannot default to false:
     a shock window whose flag was dropped in an export would silently become a CONTROL for its own cell, which
     is the same corruption as the truthy-value one and in the same direction. */
  {name:"shock",req:true,shape:"boolean, strictly true or false",ok:scTypeBool,code:SC_OMIT.BAD_SHOCK},
  /* snapshots may be empty (a window with no reads is refused as no-refsnap, which is a measurement state) but
     the ARRAY is required: an absent snaps is a malformed row, not an ungraded window. */
  {name:"snaps",req:true,shape:"array of snapshot records (may be empty)",ok:scTypeArr,code:SC_OMIT.BAD_ROW},
  /* result is legitimately absent on a live window and legitimately "void" on a settled one (10.4), so it is
     OPTIONAL -- but a non-string result is a malformed row, not an ungraded one. Grading is scSkill's, on
     "yes"/"no" only. */
  {name:"result",req:false,shape:"string when present: \"yes\" and \"no\" grade, anything else is ungraded",
   ok:function(v){ return typeof v==="string"; },code:SC_OMIT.BAD_ROW}
];
/* THE SNAPSHOT CONTRACT. These are read by scRefSnap and scSkill, which already refuse rather than coerce --
   a snapshot that fails them is skipped or produces bad-prob, and that IS the refusal for this layer, because
   one unusable read is an ordinary condition inside a window rather than a malformed window.
   `phantom` is the exception and it is deliberate: it is TRUTHY-tested, exactly as index.html's refSnap tests
   it, because the K1 repair (10.4b) writes the STRING "K1" into it. A truthy test here skips a read, which is
   the conservative direction; tightening it to a boolean would start SCORING the repaired phantom rows. */
const SC_SNAP_FIELDS=[
  {name:"tau",req:true,shape:"finite number, minutes remaining; a read at tau<0 is post-gate and is skipped"},
  {name:"pm",req:true,shape:"finite number in [0,1]: the tool's headline probability"},
  {name:"qm",req:true,shape:"finite number in (0,100): Kalshi's quote in cents; 0 and 100 are an empty book"},
  {name:"phantom",req:false,shape:"truthy marks a K1-repaired read (10.4b writes the string \"K1\"); skipped"},
  {name:"t",req:false,shape:"finite number when present; carried onto the scored observation, never compared"}
];
/* THE OPTS CONTRACT. Seven fields reach `st` (SC_CALLER_FIELDS), two register 11.6's split and 11.2a's ratchet
   (SC_SPLIT_FIELDS), one is the page's bootstrapCI. `req` here means "required unconditionally"; the two
   split fields and detPrecision are required CONDITIONALLY, by scRequiredFields, because none of them can be
   supplied before the state that makes them meaningful exists. */
const SC_OPT_FIELDS=[
  {name:"arms",req:true,shape:"integer >= 1: k, the number of arms scored in the phase (11.4)",
   ok:function(v){ return scNum(v)&&v>=1&&Math.floor(v)===v; }},
  {name:"pnlN",req:true,shape:"finite number >= 0: holdout paper entries (11.2)",
   ok:function(v){ return scNum(v)&&v>=0; }},
  {name:"pnlNet",req:true,shape:"finite number: net paper P&L, fees charged as section 4 charges them",
   ok:scTypeNum},
  {name:"monthsElapsed",req:true,shape:"finite number >= 0: months since the first recorded shock window",
   ok:function(v){ return scNum(v)&&v>=0; }},
  {name:"frozen",req:true,shape:"boolean: 11.6's freeze, stamped in CLAUDE.md",ok:scTypeBool},
  /* 11.6's spent-holdout flag. The largest blast radius in section 11 and the one that used to fail OPEN:
     shockStatus tests ===true, so `holdoutSpent:1` and `holdoutSpent:"yes"` both read as NOT SPENT and reached
     READY. `frozen` failed safe under identical treatment only because ===true is the value that OPENS its
     gate; that asymmetry is luck, not design, and neither field relies on it any more. */
  {name:"holdoutSpent",req:true,shape:"boolean: 11.6 -- true retires every window scored under the old freeze",
   ok:scTypeBool},
  {name:"detPrecision",req:false,shape:"finite number in [0,1]: phase-2 detector precision against the phase-1 "+
   "calendar (11.5); required AT PHASE 2 ONLY",ok:function(v){ return scNum(v)&&v>=0&&v<=1; }},
  {name:"boundary",req:false,shape:"the boundary stamp {n, close, ticker, fp} scSplit returned when the 30th "+
   "calibration window was graded (11.6); required ONCE A BOUNDARY EXISTS",ok:scTypeStamp},
  {name:"holdNRegistered",req:false,shape:"integer >= 30: the required holdout n written into CLAUDE.md 11.2a; "+
   "required ONCE THE CALIBRATION SD EXISTS",
   ok:function(v){ return scNum(v)&&Math.floor(v)===v&&v>=SCORE.HOLD_N_MIN; }},
  {name:"bootstrap",req:false,shape:"function: the page's bootstrapCI; falls back to one in scope",ok:scTypeFn}
];
/* the two 11.6/11.2a registrations, named separately because they are NOT st fields -- shockStatus never sees
   them -- but they are caller fields the verdict depends on, so they belong in `missing` and in the refusal. */
const SC_SPLIT_FIELDS=["boundary","holdNRegistered"];
/* WHAT THIS UNIT READS OFF ITS NEIGHBOURS. Not caller input, but read all the same, and enumerated for the same
   reason: the exhaustiveness scan in test.js subtracts nothing it cannot name. */
const SC_NEIGHBOUR_FIELDS=[
  {name:"eligible",from:"controlEligible (calendar/)",shape:"true only when the probe instant is clear"},
  {name:"maxMonths",from:"SHOCK_RULE (prereg/)",shape:"finite number: 11.7 clause 5's deadline in months"},
  {name:"relLo",from:"SHOCK_RULE (prereg/)",shape:"11.1's low release-rate PREMISE, not a measurement"},
  {name:"relHi",from:"SHOCK_RULE (prereg/)",shape:"11.1's high release-rate PREMISE, not a measurement"}
];
function scFieldOf(table,name){
  for(let i=0;i<table.length;i++) if(table[i].name===name) return table[i];
  return null;
}
/* one field, one answer: {ok, code, why}. Absent is distinguished from wrong-typed because they are different
   caller bugs, and 11.5 already proved the difference is worth reading (no-phase vs bad-phase). */
function scFieldCheck(table,name,v){
  const f=scFieldOf(table,name);
  if(f===null) return {ok:false,code:SC_OMIT.UNKNOWN_OPT,why:name+" is not a field this unit reads"};
  if(v===undefined||v===null){
    if(!f.req) return {ok:true,code:null,why:null};
    return {ok:false,code:f.codeMissing||f.code,why:name+" is required and was not supplied ("+f.shape+")"};
  }
  if(f.ok&&!f.ok(v)) return {ok:false,code:f.code,why:name+" is present with the wrong type or shape: expected "+
    f.shape};
  return {ok:true,code:null,why:null};
}
/* ONE ROW against the row contract. Cross-field rules live here because they belong to no single field:
   close must be strictly after open, or the window has no length and 11.3's clearance probes are undefined. */
function scRowCheck(w){
  if(!w||typeof w!=="object"||Array.isArray(w))
    return {ok:false,code:SC_OMIT.BAD_ROW,field:null,why:"a window record must be an object"};
  for(let i=0;i<SC_ROW_FIELDS.length;i++){
    const f=SC_ROW_FIELDS[i];
    const r=scFieldCheck(SC_ROW_FIELDS,f.name,w[f.name]);
    if(!r.ok) return {ok:false,code:r.code,field:f.name,why:r.why};
  }
  if(!(w.close>w.open))
    return {ok:false,code:SC_OMIT.BAD_ROW,field:"close",why:"close must be strictly after open"};
  return {ok:true,code:null,field:null,why:null};
}
/* EVERY row, before anything is matched, scored or split. The first failure names itself and the whole call is
   refused: a set that contains one row this unit cannot type is a set whose treatment assignment is unknown. */
function scRowsCheck(rows){
  const out={ok:true,code:null,field:null,why:null,at:-1,ticker:null,bad:0};
  if(!Array.isArray(rows)){ out.ok=false; out.code=SC_OMIT.BAD_ROW; out.why="rows must be an array"; return out; }
  for(let i=0;i<rows.length;i++){
    const r=scRowCheck(rows[i]);
    if(!r.ok){
      out.bad++;
      if(out.ok){ out.ok=false; out.code=r.code; out.field=r.field; out.at=i;
        out.ticker=(rows[i]&&typeof rows[i].ticker==="string")?rows[i].ticker:null;
        out.why="row "+i+(out.ticker?" ("+out.ticker+")":"")+": "+r.why; }
    }
  }
  return out;
}
/* OPTS against the opts contract, INCLUDING keys that are not in it. An unknown key is refused rather than
   ignored: ignoring it is how a caller silently believes it registered something it did not. */
function scOptsCheck(opts){
  const out={ok:true,code:null,field:null,why:null};
  if(opts===undefined||opts===null) return out;
  if(typeof opts!=="object"||Array.isArray(opts)){
    out.ok=false; out.code=SC_OMIT.BAD_OPT; out.why="opts must be an object"; return out;
  }
  const ks=Object.keys(opts);
  for(let i=0;i<ks.length;i++){
    if(scFieldOf(SC_OPT_FIELDS,ks[i])===null){
      out.ok=false; out.code=SC_OMIT.UNKNOWN_OPT; out.field=ks[i];
      out.why="opts."+ks[i]+" is not a field this unit reads; a field that skipped the contract is refused, "+
        "never ignored";
      return out;
    }
  }
  for(let i=0;i<SC_OPT_FIELDS.length;i++){
    const f=SC_OPT_FIELDS[i];
    /* `in`, NOT hasOwnProperty: scAssemble, scMissingRequired and scRatchet read these with plain member
       access, which walks the prototype chain. Gating the CHECK on ownership while the READ ignores it means
       an inherited value is consumed having never been validated - measured, an inherited holdoutSpent:1
       reached shockStatus, which tests ===true, and read as NOT SPENT. The check must look where the read
       looks; an inherited value is refused rather than silently accepted. */
    if(!(f.name in opts)) continue;
    const v=opts[f.name];
    if(v===undefined||v===null) continue;             /* absent: the required-field pass answers for it */
    if(f.ok&&!f.ok(v)){
      out.ok=false; out.code=SC_OMIT.BAD_OPT; out.field=f.name;
      out.why="opts."+f.name+" is present with the wrong type or shape: expected "+f.shape;
      return out;
    }
  }
  return out;
}

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
   shockRequiredHoldN squares it, so the error compounds into the holdout requirement.

   A RESIDUE IS NOT A MEASUREMENT. On 30 identical paired values the two-pass form returns 1.76e-17 rather than
   0, because the mean of thirty copies of 0.0341 is not exactly 0.0341 in binary float. shockRequiredHoldN
   guards on `sd > 0`, so that residue is not null -- it is a POSITIVE sd, it squares to nothing, and the
   required holdout n silently becomes the floor of 30 while shockStatus's "paired-difference sd not measured on
   the calibration half (11.2a)" refusal stays unreachable except at exact binary zero. A calibration half whose
   paired differences are identical HAS no measured spread, and the honest answer is the refusal.
   The floor is RELATIVE (SD_ZERO_REL x the largest magnitude in the sample) because an absolute one would mean
   something different at Brier scale than at price scale. It only ever turns a number into a refusal. */
function scSdOf(a){
  if(!Array.isArray(a)||a.length<2) return null;
  const m=scMean(a); if(m===null) return null;
  let s=0,scale=0;
  for(let i=0;i<a.length;i++){ s+=(a[i]-m)*(a[i]-m); if(Math.abs(a[i])>scale) scale=Math.abs(a[i]); }
  const sd=Math.sqrt(s/(a.length-1));
  if(sd<=0) return 0;
  if(scale>0&&sd<scale*SCORE.SD_ZERO_REL) return 0;   /* floating-point residue, not a spread */
  return sd;
}
/* A DETERMINISTIC FINGERPRINT OF THE CALIBRATION HALF (11.6). FNV-1a over an ASCII rendering, which is enough:
   this is a change detector between two runs of the same code, not a cryptographic commitment.
   WHY IT EXISTS. The boundary stamp used to carry {n, close, ticker} only, so it detected the boundary WINDOW
   moving and nothing else. Measured: with the same 30th window in place, one extra control arriving into every
   cell halved the calibration sd (0.04086 -> 0.02043) and moved the required holdout n from 46 to 30, while
   scSplitStable reported `moved:false` and scSplitCheck reported `registeredOk:true`. 11.6 freezes the sd and
   everything derived from it, not the identity of the 30th window, so the stamp has to fingerprint what the sd
   was computed FROM: each calibration pair's identity, its paired value, and the identified controls (with
   their skills) that its control mean was estimated from. Sorted at both levels so enumeration order cannot
   move it; numbers rendered at fixed precision so the string is stable. */
function scHash(str){
  let h=2166136261;
  for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); }
  return (h>>>0).toString(16);
}
function scFpNum(v){ return scNum(v)?v.toFixed(12):"?"; }
function scCalFp(cal){
  if(!Array.isArray(cal)) return null;
  const parts=[];
  for(let i=0;i<cal.length;i++){
    const p=cal[i]; if(!p||typeof p!=="object") return null;
    const ids=[];
    if(Array.isArray(p.ctrl)) for(let j=0;j<p.ctrl.length;j++){ const q=p.ctrl[j];
      ids.push(((q&&typeof q.id==="string")?q.id:"?")+"="+scFpNum(q&&q.skill)); }
    ids.sort();
    parts.push(((typeof p.ticker==="string")?p.ticker:"?")+"@"+scFpNum(p.open)+"/"+scFpNum(p.close)+
      ":"+scFpNum(p.paired)+"["+ids.join(",")+"]");
  }
  parts.sort();
  return scHash(parts.join(";"))+"-"+parts.length;
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
    /* THE CONTRACT, ON EVERY CANDIDATE. In the scPairs path this can never fire -- scRowsCheck refused the
       whole call already -- but scMatchControls is callable on its own, and a candidate whose `shock` flag is
       `1` must not fall through this test into the control pool the way it used to. It is rejected and the
       rejection is COUNTED by its own code, so a caller reading rejects sees the type error rather than an
       unexplained thin control set. */
    const chk=scRowCheck(c);
    if(!chk.ok){ bump(chk.code); continue; }
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
    /* the presence and type rules are the CONTRACT's, read from the table rather than restated here, so the
       phase cannot end up with two definitions that drift apart. */
    const chk=scFieldCheck(SC_ROW_FIELDS,"phase",r.phase);
    if(!chk.ok) return {ok:false,phases:[],code:chk.code};
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
    dupRows:0,phase:null,series:null,known:null,badRow:null};
  if(!Array.isArray(rows)||!rows.length){ out.code=SC_OMIT.NO_SHOCKS; return out; }
  const ded=scDedupe(rows); const rw=ded.rows; out.dupRows=ded.dropped;
  /* THE CONTRACT, BEFORE ANYTHING IS MATCHED, SCORED OR SPLIT. One row this unit cannot type is a set whose
     treatment assignment is unknown, and 11.5's phase guard already set the precedent that such a set is
     refused whole rather than scored around. */
  const rc=scRowsCheck(rw);
  if(!rc.ok){ out.code=rc.code; out.badRow={at:rc.at,ticker:rc.ticker,field:rc.field,why:rc.why,n:rc.bad};
    return out; }
  const pg=scPhaseGuard(rw); if(!pg.ok){ out.code=pg.code||SC_OMIT.MIXED_PHASE; return out; }
  const sg=scSeriesGuard(rw); if(!sg.ok){ out.code=SC_OMIT.MIXED_SERIES; return out; }
  if(!scHasCalendar()){ out.code=SC_OMIT.NO_CALENDAR; return out; }
  out.phase=pg.phases.length?pg.phases[0]:null;
  out.series=sg.series.length?sg.series[0]:null;
  const seen={}, inSpan=[]; let series=null, caveat=null;
  for(let i=0;i<rw.length;i++){
    const w=rw[i];
    /* scRowsCheck has already refused anything whose `shock` is not strictly boolean, so this test now means
       exactly "not treated" -- and, crucially, scMatchControls's `c.shock===true` test means exactly "treated"
       on the same rows, so no value can fall through BOTH and end up neither treated nor excluded from its own
       cell's control pool. That gap moved a measured difference-in-differences from 0.00000 to +0.23333. */
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
      /* `graded` is the field 11.2's registered coverage denominator turns on, and it is recorded HERE rather
         than inferred downstream from the reason code. A void settlement, a still-open window and a window
         whose only reads are post-gate are NOT control-matching failures -- they have as many controls as any
         other window, they are simply not graded yet -- and counting them as failures fired 11.7 clause 3, a
         PERMANENT closure, on the ordinary state of a recent export. */
      out.unmatched.push({ticker:w.ticker,open:w.open,close:w.close,nCtrl:m.n,graded:sk.ok,
        code:sk.ok?m.reason:sk.code,known:m.known});
      continue;
    }
    const cs=[], cid=[];
    for(let j=0;j<m.controls.length;j++){
      cs.push(m.controls[j].skill);
      cid.push({id:scRowId(m.controls[j]),skill:m.controls[j].skill});
    }
    const cm=scMean(cs);
    if(cm===null){ out.unmatched.push({ticker:w.ticker,open:w.open,close:w.close,nCtrl:m.n,graded:false,
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
    /* the stamp carries a fingerprint of the calibration SET, not just the identity of its last window: 11.6
       freezes the sd and everything derived from it, and the sd is a function of the whole half. */
    out.boundary={n:SCORE.CAL_N,close:b.close,ticker:b.ticker,fp:scCalFp(out.cal)};
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
  /* the boundary WINDOW can be identical while the calibration half's CONTENTS are not -- a control arriving
     late, or ageing out of 10.2's 15-day buffer, changes a pair's control mean without moving the 30th window.
     Measured, that halved the frozen sd and moved the required holdout n from 46 to 30 while this function
     reported "unchanged". 11.6 freezes the sd, so a changed calibration set IS a moved boundary. */
  if(a.fp!==b.fp) return {moved:true,why:"the calibration set changed under an unchanged boundary window"};
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
  if(!scTypeStamp(out.registered)){
    out.refuse=true; out.moved=true;
    out.why="the registered boundary is not a boundary stamp {n, close, ticker, fp}"; return out;
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

   THE RESAMPLING UNIT IS THE MATCHING CELL, NOT THE WINDOW. That sentence is now CLAUDE.md 11.2's, in the
   READY list's CI bullet, registered 2026-09-06 and frozen with the rest of the primary statistic -- it is a
   section 11 threshold governed by 11.7 clause 6, not a note in this unit's NOTES.md. The reasoning below is
   the registration's own, and test.js reads it off the document so the two cannot drift: 11.6 freezes the
   primary statistic, and changing the resampling unit after the holdout opens SPENDS the holdout.

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

/* ---- COVERAGE: THE DENOMINATOR 11.2 REGISTERED ON 2026-09-06 --------------------------------------------
   11.2 prefixes its whole READY list with "on the HOLDOUT set alone (11.6)", and "Control coverage >= 80%" is
   the second item in that list. Coverage used to be counted over EVERY recorded shock window, calibration and
   holdout together: a coverage failure that lands in the holdout -- which is where it matters -- was diluted by
   calibration windows that had already been spent. Measured, on 60 matched windows plus 10 unmatched ones dated
   after the boundary: pooled coverage 0.857 PASSES and reads READY, holdout-only coverage is 0.750 and 11.7
   clause 3 ABANDONS.

   AND THEN THAT FIX CAST ITS OWN SHADOW, WHICH IS WHY THIS FUNCTION IS NOW THREE RULES RATHER THAN ONE. Moving
   the denominator to the holdout alone made it TINY at exactly the moment the holdout opens. Measured on the
   first pass after calibration completes: 30 matched calibration windows and ONE unmatched holdout window read
   0/1 = 0.000 and ABANDON -- and 11.7 clause 3 is a PERMANENT closure, "closed or redesigned, and a redesign
   restarts the count at zero". Against section 8's ~47 calendar events a year the holdout spends its first
   months in exactly that regime, so it was not a corner case; it fired on the ordinary first pass. A ratio over
   a denominator of one is not evidence about a design.

   11.2 now defines the denominator, and 11.7 clause 3 now carries the same sentence. Three rules, all three
   registered 2026-09-06 with no shock-conditioned observation in existence:
     1. HOLDOUT ONLY, as before -- the S2 fix stands and nothing here weakens it.
     2. GRADED ONLY. 11.2 lists "n >= 30 graded holdout shock windows" and control coverage as SEPARATE
        conditions. A void settlement (10.4), a window still open, and a window whose only reads are post-gate
        each have as many controls as any other window; they are simply not graded. Counting them as
        control-matching failures fires clause 3 on something that is not one, and ungraded windows are the
        normal state of a recent export -- every currently-live shock window is one. `graded` is recorded on
        each unmatched row by scPairs rather than inferred from a reason code here.
     3. SIDE-DETERMINABLE ONLY. A window that cannot be placed relative to the boundary is not a calibration
        window; it is a window whose side is unknown, and it belongs in NEITHER denominator. (The row contract
        now refuses a row with a missing or non-numeric close outright, so this rule is defence in depth rather
        than the only guard -- but it is the rule 11.2 states, and it is stated here.)
     4. NOT EVALUATED BELOW COV_MIN_N. Below 30 graded, side-determinable holdout windows the 80% question is
        not asked at all: `gate` reports 0/0, shockStatus's `ctrlTotal > 0` guard skips the clause, and the
        measured figures stay on the report to be read. This is the same discipline scSd already applies by
        returning null below CAL_N.
   NONE OF THIS IS A LOOSENING UNDER 11.7 CLAUSE 6. The bar is still 80%; what changed is a test that returned
   the wrong answer at small n, and the pooled figure it replaced passed the same input at 0.968. READY cannot
   reach past an unevaluated coverage clause either: READY needs nHold >= 30 MATCHED holdout windows, and every
   matched window is graded and side-determinable by construction, so the denominator is >= 30 whenever READY is
   in reach. test.js asserts that invariant rather than asserting the reasoning.

   Every excluded window is COUNTED, by reason, and reported. An excluded row that is invisible is exactly the
   permissive default this unit exists not to have. */
function scAfterBoundary(w,b){
  if(!b||!scNum(b.close)) return false;              /* no boundary yet: there is no holdout side */
  if(!w||!scNum(w.close)) return null;               /* the side cannot be determined -- neither denominator */
  if(w.close!==b.close) return w.close>b.close;
  const wt=(typeof w.ticker==="string")?w.ticker:"", bt=(typeof b.ticker==="string")?b.ticker:"";
  return wt>bt;
}
function scCoverage(P,boundary){
  const out={hold:{matched:0,total:0,frac:null,evaluable:false,why:null},
    cal:{matched:0,total:0,frac:null},
    all:{matched:0,total:0,frac:null},
    gate:{matched:0,total:0,frac:null,evaluable:false,why:null},
    excluded:{ungraded:0,undetermined:0},recorded:0,minN:SCORE.COV_MIN_N};
  if(!P) return out;
  const add=function(side,matched){ side.total++; if(matched) side.matched++; };
  const walk=function(list,matched,gradedDefault){
    if(!Array.isArray(list)) return;
    for(let i=0;i<list.length;i++){
      const w=list[i];
      out.recorded++;
      const graded=(gradedDefault===true)?true:(w&&w.graded===true);
      if(!graded){ out.excluded.ungraded++; continue; }
      const side=scAfterBoundary(w,boundary);
      if(side===null){ out.excluded.undetermined++; continue; }
      add(out.all,matched);
      add(side?out.hold:out.cal,matched);
    }
  };
  walk(P.pairs,true,true); walk(P.unmatched,false,false);
  const frac=function(x){ x.frac=x.total?x.matched/x.total:null; };
  frac(out.hold); frac(out.cal); frac(out.all);
  out.hold.evaluable=out.hold.total>=SCORE.COV_MIN_N;
  out.hold.why=out.hold.evaluable?null:
    ("the holdout coverage denominator is "+out.hold.total+" graded, side-determinable windows; 11.2 evaluates "+
     "the 80% clause only at "+SCORE.COV_MIN_N+" or more, and 11.7 clause 3 may not fire below it");
  out.gate.evaluable=out.hold.evaluable; out.gate.why=out.hold.why;
  if(out.hold.evaluable){ out.gate.matched=out.hold.matched; out.gate.total=out.hold.total; }
  frac(out.gate);
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
/* THE CONDITIONALLY REQUIRED FIELDS, and why they are conditional rather than simply required.
   `detPrecision` is 11.5's, at phase 2 only. `boundary` and `holdNRegistered` are 11.6's and 11.2a's, and they
   were the two remaining holes: neither was in SC_CALLER_FIELDS or SC_VERDICT_FIELDS, so neither appeared in
   `missing` and neither was ever a refusal, which made the registered split and the upward-only ratchet
   ADVISORY. Measured: a 35-cell fixture went HOLDOUT (need 46) -> READY (need 30) purely by omitting
   holdNRegistered, and READY was reachable with `frozen:true` and no boundary ever registered -- at a point
   where nCal >= 30 means the 30th calibration window is already graded, which 11.6 says is exactly when the
   boundary can no longer move.
   They cannot be required UNCONDITIONALLY because neither exists before the state that defines it: there is
   nothing to register until scSplit computes a boundary, and 11.2a's required n cannot be written down until
   the calibration sd is measured. So each becomes required at the moment its subject exists -- and the caller
   learns the value from the refusal itself, because scReport leaves every measurement it did make on the
   report and only withholds the verdict. That is the intended loop: run, read `rep.split.boundary` and
   `rep.holdN.computed`/`n80`, write them into CLAUDE.md 11.2a with a date, register them, run again. */
function scRequiredFields(phase,ctx){
  const r=SC_VERDICT_FIELDS.slice();
  if(phase===2) r.push("detPrecision");
  if(ctx&&ctx.boundaryExists===true) r.push("boundary");
  if(ctx&&ctx.sdMeasured===true) r.push("holdNRegistered");
  return r;
}
function scMissingRequired(missing,phase,ctx){
  const out=[]; if(!Array.isArray(missing)) return out;
  const need=scRequiredFields(phase,ctx);
  for(let i=0;i<need.length;i++) if(missing.indexOf(need[i])>=0) out.push(need[i]);
  return out;
}
/* every caller field that was not supplied, st-bound (SC_CALLER_FIELDS) and split-bound (SC_SPLIT_FIELDS)
   alike. Reporting one is not the same as requiring it: scRequiredFields decides what refuses. */
function scMissingAll(missing,opts){
  const out=Array.isArray(missing)?missing.slice():[];
  const o=(opts&&typeof opts==="object")?opts:{};
  for(let i=0;i<SC_SPLIT_FIELDS.length;i++){
    const f=SC_SPLIT_FIELDS[i];
    if(o[f]===undefined||o[f]===null) out.push(f);
  }
  return out;
}
/* the refusals that must be REPORTED as refusals rather than answered on the window count. A mixed-phase call
   used to come back "CALIBRATING / calibration set incomplete" -- a benign progress message for a call 11.5
   forbids outright, which cannot reach READY but hides a caller bug indefinitely. */
const SC_REFUSALS=[SC_OMIT.MIXED_PHASE,SC_OMIT.MIXED_SERIES,SC_OMIT.NO_PHASE,SC_OMIT.BAD_PHASE,
  SC_OMIT.NO_CALENDAR,SC_OMIT.BOUNDARY_MOVED,SC_OMIT.MISSING_FIELDS,
  SC_OMIT.BAD_ROW,SC_OMIT.BAD_SHOCK,SC_OMIT.BAD_OPT,SC_OMIT.UNKNOWN_OPT];
const SC_REFUSAL_WHY={
  "mixed-phase":"phase 1 and phase 2 are never pooled (11.5): separate ledgers, separate n, separate READY",
  "mixed-series":"15-minute and hourly windows are scored separately (section 4)",
  "no-phase":"no row carries a phase, so 11.5's phase-2 gate cannot be applied; an absent phase is refused, never defaulted",
  "bad-phase":"a phase that is not a number cannot be compared with === ; 1 and \"1\" must never pool (11.5)",
  "no-calendar":"controlEligible is not in scope, so 11.3's control eligibility cannot be consulted",
  "boundary-moved":"the calibration/holdout boundary is not the registered one (11.6); moving it after the holdout opened spends the holdout",
  "missing-caller-fields":"a caller field the verdict depends on was not supplied; a hole is not a verdict",
  "bad-row-field":"a window record is missing a field this unit reads, or carries one with the wrong type; a value present in the wrong type is refused, never coerced",
  "bad-shock-flag":"`shock` is the treatment assignment (11.2) and must be strictly true or false; a truthy value would be neither treated nor excluded from its own cell's control pool",
  "bad-caller-field":"a caller field is present with the wrong type or an impermissible value",
  "unknown-caller-field":"opts carries a key this unit does not read; a field that skipped the contract is refused, never ignored"
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
   opts: SC_OPT_FIELDS and nothing else -- the seven that reach `st`, the two that register 11.6's split and
     11.2a's ratchet, and `bootstrap` (the page's bootstrapCI). An unknown key is refused, not ignored.

   sd comes from the CALIBRATION half; dBrier and ciLo come from the HOLDOUT ALONE, because 11.6 decides READY on
   the holdout alone and the calibration half is never re-scored into the result. Coverage is the denominator
   11.2 registered on 2026-09-06 -- holdout, graded, side-determinable, and not evaluated at all below 30 (see
   scCoverage) -- and it is the ONLY coverage figure that reaches `st`. */
function scReport(rows,opts){
  const o=(opts&&typeof opts==="object")?opts:{};
  const rep={version:SCORE.version,ok:false,code:null,
    phase:null,series:null,
    unmatched:[],dupRows:0,badRow:null,coverage:null,
    known:null,caveat:null,
    split:null,boundary:null,sd:null,holdN:null,did:null,ci:null,st:null,missing:null,status:null};
  /* THE CALLER'S OWN MESSAGE IS CHECKED FIRST, before any row is read. An unknown opts key is refused here
     rather than ignored, which is what makes the failure mode of a field that skipped the contract be refusal
     rather than passage -- and a refused call reports NO CI level, because `arms:"20"` used to refuse (no-arms
     -> ciLo null -> INVALID) while rep.status.ciLevel still read 0.995, coerced out of the string by
     shockStatus's `st.arms >= 1`. A refusal has no level: there is no arm count to derive one from. */
  const oc=scOptsCheck(opts);
  if(!oc.ok){
    rep.code=oc.code;
    rep.status=scRefused(oc.code,oc.why,null);
    return rep;
  }
  const P=scPairs(rows);
  rep.code=P.code; rep.phase=P.phase; rep.series=P.series;
  rep.unmatched=P.unmatched; rep.dupRows=P.dupRows; rep.badRow=P.badRow;
  rep.known=P.known; rep.caveat=(P.known&&P.known.caveat)||null;
  /* THE POOLED COVERAGE PAIR IS NOT ON THIS OBJECT. It used to be, as rep.ctrlMatched / rep.ctrlTotal, beside
     rep.st.ctrlMatched / rep.st.ctrlTotal, which are the HOLDOUT ones -- two identically-named pairs on one
     object differing only by denominator, and NOTES told the caller to export the pooled pair, the one 11.2
     says is not the gate. That was the S2 fix being undone in the CSV. `rep.coverage` carries all three cuts
     plus the gate and the exclusions, and it is the field the export names. */
  if(!P.ok){
    const a0=scAssemble({phase:P.phase,nCal:0,nHold:0,sd:null,dBrier:null,ciLo:null,
      ctrlMatched:0,ctrlTotal:0},o);
    rep.st=a0.st; rep.missing=scMissingAll(a0.missing,o); rep.coverage=scCoverage(P,null);
    /* a REFUSAL is reported as a refusal; "no shock windows yet" and "none matched yet" are progress, and the
       judge answers those on the counts, which is what they are. */
    rep.status=scIsRefusal(P.code)
      ?scRefused(P.code,(P.badRow&&P.badRow.why)?(SC_REFUSAL_WHY[P.code]+" -- "+P.badRow.why):null,o.arms)
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
    rep.st=ab.st; rep.missing=scMissingAll(ab.missing,o); rep.coverage=scCoverage(P,sp.boundary);
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
    dBrier:did.controlled,ciLo:ci.lo,ctrlMatched:cov.gate.matched,ctrlTotal:cov.gate.total},o);
  rep.ok=true; rep.code=(sd===null?SC_OMIT.CAL_SHORT:null);
  rep.coverage=cov; rep.sd=sd; rep.did=did; rep.ci=ci; rep.st=a.st;
  rep.missing=scMissingAll(a.missing,o);
  /* 11.2a REQUIRES BOTH POWER FIGURES AS OUTPUT (registered 2026-09-06): "a report that carries the 50%-power
     required n without the 80% figure beside it is exactly the barely-powered design mistaken for a good one
     this subsection was written to prevent, and the at-open feasibility test against 11.7's deadline cannot be
     applied without it". The unit used to call shockRequiredHoldN at 0.5 and nothing else; shockFeasible --
     which returns n80 and an `ok` against maxMonths -- existed in prereg and was called by nothing in the
     repository. On the fixture that produced the registration, n@50% is 46 and n@80% is 120.
     `months` and `ok` are computed at BOTH ends of 11.1's release-rate premise (SHOCK_RULE.relLo/relHi) and
     are labelled a premise for that reason: section 8 records the enumerated calendar at ~47 events a year,
     and no observed count exists yet to replace it. Nothing here fires a status off the feasibility figure --
     closing the programme at the holdout's open is 11.2a's decision for the caller to record, exactly like
     holdoutSpent -- but it cannot be made without the number, so the number is on the report. */
  const kOk=(scHasPrereg()&&typeof shockRequiredHoldN==="function"&&scNum(o.arms)&&o.arms>=1);
  const needNow=kOk?shockRequiredHoldN(sd,o.arms,0.5):null;
  rep.holdN=scRatchet(needNow,o.holdNRegistered);
  rep.holdN.n80=kOk?shockRequiredHoldN(sd,o.arms,0.8):null;
  rep.holdN.power={computed:0.5,alongside:0.8};
  rep.holdN.feasible=(kOk&&typeof shockFeasible==="function"&&typeof SHOCK_RULE==="object"&&SHOCK_RULE!==null)
    ?{premise:"11.1 planning premise, NOT a measurement: releases per year",
      lo:shockFeasible(sd,o.arms,o.monthsElapsed,SHOCK_RULE.relLo),
      hi:shockFeasible(sd,o.arms,o.monthsElapsed,SHOCK_RULE.relHi)}
    :null;
  /* a caller field the verdict depends on is missing -> a refusal, not a verdict. The measurements above stay
     on the report: they are real, and the caller needs them to see what it under-specified. */
  /* `holdNRegistered` becomes required at the moment 11.2a's number EXISTS -- when the calibration sd is a
     measured spread and the required n is therefore derivable. A calibration half whose paired differences are
     identical has no measured spread (scSdOf returns exactly 0, and shockRequiredHoldN returns null on it), so
     there is nothing to register and requiring it would be requiring a number nobody can compute. */
  const req=scMissingRequired(rep.missing,P.phase,
    {boundaryExists:sp.boundary!==null,sdMeasured:rep.holdN.computed!==null});
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
