/* test/react.js — the React island (REACT-MAP step 1).
 *
 * What is worth guarding here is not that React renders — React's own suite covers that — but the
 * three things this repository can get wrong on its own: the dependency, the bridge, and the mirrors
 * the bridge replaced. Every one of the four defects this island's first draft carried is pinned below,
 * each by the property rather than by a string where a property was available.
 *
 * Run: node test/react.js
 */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { load, runner, ROOT, INDEX } = require("./lib/load");
const { T, done } = runner("react: the island and its bridge");

const html = fs.readFileSync(INDEX, "utf8");
const sha = f => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, f))).digest("hex");
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/* --- 1. the dependency is pinned, and the pin is a hash rather than a filename ------------------- */
{
  /* vendor/README.md records where these came from and when. A filename is not a pin: 18.3.1 can be
     replaced with a different 18.3.1. */
  const REACT = "d949f1c3687aedadcedac85261865f29b17cd273997e7f6b2bfc53b2f9d4c4dd";
  const RDOM  = "35f4f974f4b2bcd44da73963347f8952e341f83909e4498227d4e26b98f66f0d";
  T("react is the pinned build", sha("vendor/react-18.3.1.umd.min.js") === REACT);
  T("react-dom is the pinned build", sha("vendor/react-dom-18.3.1.umd.min.js") === RDOM);

  /* One dependency across the two tools, not two. The sibling is absent on a CI runner and in a partial
     checkout, so this is a conditional assertion and says so rather than passing silently. */
  const sib = path.resolve(ROOT, "..", "Rhyme-Instrument", "vendor");
  if (fs.existsSync(sib)) {
    const same = ["react-18.3.1.umd.min.js", "react-dom-18.3.1.umd.min.js"].every(f =>
      fs.readFileSync(path.join(sib, f)).equals(fs.readFileSync(path.join(ROOT, "vendor", f))));
    T("byte-identical to Rhyme-Instrument/vendor — one pinned dependency, not two", same);
  } else {
    console.log("  --   sibling repository absent: the cross-tool byte check is skipped, not passed");
  }
}

/* --- 2. the splice, and the load order that is not incidental ------------------------------------ */
{
  const at = s => html.indexOf(s);
  const marker = at("/* ==== REACT ISLAND — vendor and components are spliced below");
  const r = at("/* ==== REACT ISLAND react-18.3.1.umd.min.js");
  const d = at("/* ==== REACT ISLAND react-dom-18.3.1.umd.min.js");
  const l = at("/* ==== REACT ISLAND LockBar.js");
  T("all three parts are spliced", marker > 0 && r > 0 && d > 0 && l > 0, { marker, r, d, l });
  /* react-dom's UMD global branch is called as zb(self.ReactDOM={}, self.React): react must have
     evaluated first or ReactDOM is built against undefined. LockBar after both. */
  T("react before react-dom before the component", marker < r && r < d && d < l, { marker, r, d, l });

  /* The spliced copy is an artifact; the file in vendor/ and react/ is the source. This is the same
     property occvm/tools/splice-spine.js --check asserts, run here so `npm test` alone catches drift. */
  const { PARTS, block } = require("../react/tools/resplice.js");
  const drift = PARTS.filter(p => html.indexOf(block(p, fs.readFileSync(path.join(ROOT, p.from), "utf8"))) < 0);
  T("every spliced block matches its source byte for byte", drift.length === 0, drift.map(p => p.name));

  /* The single-script-block property, from the other side: react-dom carries the literal "<script>" in
     a string with its close escaped, so the count of "<script" in the whole file is 3 and means nothing.
     What matters is that nothing inside the block can close it. test/occvm.js measures both. */
  const open = html.indexOf("<script>"), close = html.lastIndexOf("</script>");
  T("the spliced vendor cannot terminate the script element", !/<\/script/i.test(html.slice(open + 8, close)));
}

/* --- 3. the bridge, driven ------------------------------------------------------------------------ */
{
  const H = load();
  const R = H.R;

  T("React and ReactDOM reached the page's own scope", R("typeof React") === "object" && R("typeof ReactDOM") === "object",
    { React: R("typeof React"), ReactDOM: R("typeof ReactDOM") });
  T("the store exists whether or not anything mounted", R("typeof OCCVM_LOCK_STORE") === "object");

  /* THE DEFECT THAT WOULD HAVE BEEN SILENT. S is a top-level `const` in a classic script, so it is not
     a property of the global object — test/page-load.js says so in its own source. A store reading
     window.S returns null forever: the idle note renders permanently, RESUME never appears, and nothing
     throws. Measured as the pair, because either half alone proves nothing: window.S really is absent,
     AND the store still reports the mode. */
  R(`S.k.cur={ticker:"KXBTC15M-T"}; lockSwing();`);
  T("window.S is genuinely undefined — the trap is real, not hypothetical", R("typeof window.S") === "undefined");
  T("and the store still reads the lock, so it reads S lexically", R("OCCVM_LOCK_STORE.getSnapshot()") === "swing");

  R("lockRelease()");
  T("release clears the snapshot", R("OCCVM_LOCK_STORE.getSnapshot()") === null);
  R("lockRect(1,2,3,4,2.5)");
  T("a region lock reports rect", R("OCCVM_LOCK_STORE.getSnapshot()") === "rect");

  /* Snapshot only what the UI reads. lockRect writes five fields; four of them change nothing on
     screen, and Object.is on a primitive is what lets React skip the render. */
  const a = R("OCCVM_LOCK_STORE.getSnapshot()");
  R("lockRect(9,9,9,9,0.25)");
  T("an unrelated lock field does not move the snapshot", R("OCCVM_LOCK_STORE.getSnapshot()") === a && R("S.lock.v0") === 0.25,
    { snapshot: R("OCCVM_LOCK_STORE.getSnapshot()"), v0: R("S.lock.v0") });

  /* subscribe/notify reaches a listener, and unsubscribe stops it. */
  R("globalThis._n=0; globalThis._off=OCCVM_LOCK_STORE.subscribe(()=>{globalThis._n++;});");
  R("lockRelease(); lockSwing();");
  const fired = R("_n");
  R("_off(); lockRelease();");
  T("notify reaches a subscriber and unsubscribe stops it", fired === 2 && R("_n") === 2, { fired, after: R("_n") });

  /* The mount refuses a container that is not a DOM node rather than throwing. That is this harness's
     own stub element, and it is why init records nothing here. */
  T("the mount refuses a non-element container quietly", R(`OCCVM_MOUNT_LOCKBAR("lockbar")`) === null);
  T("init recorded no UI error", R("S.uiErr") === undefined, R("S.uiErr"));
}

/* --- 4. the mirrors are gone, not merely unused --------------------------------------------------- */
{
  const src = stripComments(html);   /* the 2.28/2.29 trap: a guard that reads its own prose fails a
                                        correct change for naming what it removed */
  T("body.locked is gone from the page entirely", !/body\.locked/.test(src));
  T("no CSS rule decides #lockResume's visibility", !/#lockResume\s*\{[^}]*display/.test(src));

  const f = s => (src.match(new RegExp("function " + s + "\\([^)]*\\)\\{[^\\n]*")) || [""])[0];
  for (const name of ["lockSwing", "lockRect"]) {
    const body = f(name);
    T(name + " writes S.lock and notifies, and touches no DOM",
      /OCCVM_LOCK_STORE\.notify\(\)/.test(body) && !/classList|locknote|textContent/.test(body), body);
  }
  const rel = src.slice(src.indexOf("function lockRelease()"), src.indexOf("function lockRelease()") + 700);
  T("lockRelease notifies and touches no DOM",
    /OCCVM_LOCK_STORE\.notify\(\)/.test(rel) && !/classList|locknote|textContent/.test(rel));

  /* The two listeners the first draft of this patch left behind. $("lockSwing") is null at that point
     in evaluation now, so keeping them would have thrown at load and killed the page — measured as the
     pair, since the listener's absence only matters because the element's is real. */
  T("no listener is attached to a control that no longer exists in the markup",
    !/\$\("lock(Swing|Resume)"\)\.addEventListener/.test(src));
  T("and the static markup really has no such control", /<div id="lockbar"><\/div>/.test(html));
  T("Escape still releases, because that binding is the document's", /keydown[\s\S]{0,80}Escape[\s\S]{0,40}lockRelease/.test(src));

  /* One owner for the three note strings (L3). They were typed once each in three functions; now they
     are a map the component reads, and nothing else in the page carries them. */
  for (const s of ["swing window · resume", "region · resume", "drag on the field to lock"]) {
    T("the note string " + JSON.stringify(s.slice(0, 18)) + " appears exactly once", src.split(s).length - 1 === 1,
      src.split(s).length - 1);
  }
}

/* --- 5. the dependency's namespace is not this tool's ---------------------------------------------- */
{
  /* §7.1's duplicate-definition check greps `^function name(`. Minified UMD puts names at line-start
     that are not top-level at all — they live inside React's own IIFE — so counting them would put a
     dependency's internals in this tool's namespace and let two vendor names read as a duplicate
     definition in code nobody here wrote. The check's domain is the tool's own source; asserted here
     so `npm test` catches it rather than only the CI step that does the same strip. */
  const own = html.replace(/\/\* ==== REACT ISLAND react-18\.3\.1[\s\S]*?==== END REACT ISLAND react-dom-18\.3\.1[^\n]*\n/, "");
  const names = (own.match(/^(?:async )?function [A-Za-z_$][A-Za-z0-9_$]*\(/gm) || []);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  T("no duplicate top-level definitions in the tool's own source (§7.1)", dupes.length === 0, dupes);
  /* Not a typed count on either side — a count here would refuse a correct commit that adds a function,
     which is the defect 2.15 and 2.21 both had to undo. The property is that the strip is load-bearing:
     the vendor region really does carry line-start `function` names, and the tool's own source really
     is smaller than the whole file by exactly those. */
  const vendor = (html.match(/\/\* ==== REACT ISLAND react-18\.3\.1[\s\S]*?==== END REACT ISLAND react-dom-18\.3\.1[^\n]*\n/) || [""])[0];
  const inVendor = (vendor.match(/^(?:async )?function [A-Za-z_$][A-Za-z0-9_$]*\(/gm) || []).length;
  const whole = (html.match(/^(?:async )?function [A-Za-z_$][A-Za-z0-9_$]*\(/gm) || []).length;
  T("the strip is load-bearing: the vendor carries line-start names and they are all it removed",
    inVendor > 0 && whole - names.length === inVendor,
    { own: names.length, whole, inVendor });
}

process.exit(done());
