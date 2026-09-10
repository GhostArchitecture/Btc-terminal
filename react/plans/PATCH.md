> ## SUPERSEDED as wiring — 2026-09-10. Kept as the record it is, not as a procedure to follow.
>
> Three of the four changes below are wrong against the file they cite, and three of those are fatal.
> **CLAUDE.md §13.2 has the measurements**; in one line each:
>
> - §3 removes the static markup and leaves `index.html:8410-8411` attaching click listeners to it.
>   `$("lockSwing")` is then `null` at top-level evaluation and **the page does not load.**
> - §5 says the existing CSS *"attaches with zero changes"*. It attaches: `#lockResume{display:none}`
>   survives the retirement of the `body.locked` override that was the only rule ever showing it, so
>   **RESUME is mounted, correct, and invisible.**
> - `LockBar.as-supplied.js` reads `window.S`. `S` is a top-level `const` in a classic script and is
>   **not a property of the global object**, so the store returns `null` forever — the idle note
>   permanent, RESUME never rendered, nothing thrown.
> - §3's mount site cites `index.html:8084` beside `applyMineral()`, which has not existed since 2.27.
>
> §1–2's three `<script src>` tags are also refused, for reasons this repository had already written
> down three times: see CLAUDE.md §13.1 and `vendor/README.md`. What shipped is `react/LockBar.js`,
> spliced by `react/tools/resplice.js`.
>
> *Everything below this line is the document as supplied, unaltered.*

# PATCH.md — wiring LockBar.js into index.html

Four changes. All small, all precisely located against the current file.
Nothing else in the page is touched.

---

## 1. Vendor React (new files, zero collision risk)

Copy `vendor/react-18.3.1.umd.min.js` and `vendor/react-dom-18.3.1.umd.min.js`
from Rhyme-Instrument into Btc-terminal/vendor/. Identical bytes — both tools
now share one dependency instead of maintaining two.

---

## 2. Load React + the component (add before `</head>` or just before the
   page's own `<script>` block — anywhere ahead of where `loop()` is kicked
   at the bottom)

```html
<script src="vendor/react-18.3.1.umd.min.js"></script>
<script src="vendor/react-dom-18.3.1.umd.min.js"></script>
<script src="LockBar.js"></script>
```

Plain script tags. No module system, no bundler, no build step — this is
the entire cost of adding React under the constraint the repo already
states for itself.

---

## 3. Replace the static markup (`index.html:666-668`)

**Remove:**
```html
      <div id="lockbar"><span class="note" id="locknote">sweep · drag on the field to lock a region · esc releases</span>
        <button id="lockSwing" type="button" title="lock the view tight on the live window's swing">◆ SWING</button>
        <button id="lockResume" type="button">RESUME</button></div>
```

**Replace with:**
```html
      <div id="lockbar-mount"></div>
```

**And after the page's existing scripts run** (anywhere after `S` exists —
right next to where `sunTick()` and `applyMineral()` already get kicked at
init, `index.html:8084`, is the natural spot):
```js
OCCVM_MOUNT_LOCKBAR("lockbar-mount");
```

---

## 4. The bridge — three one-line additions to existing functions

React only re-renders when its own state changes. `S.lock` is mutated by
plain assignment in three places, by code that doesn't know React exists.
Each needs exactly one added line — a notify call — right after the
existing mutation. No other logic in these functions changes.

**`lockSwing()` (`index.html:8325`):**
```diff
 function lockSwing(){ if(!S.k.cur) return; S.lock={mode:"swing",ticker:S.k.cur.ticker}; document.body.classList.add("locked"); $("locknote").textContent="lock · swing window · resume or esc releases"; }
+function lockSwing(){ if(!S.k.cur) return; S.lock={mode:"swing",ticker:S.k.cur.ticker}; OCCVM_LOCK_STORE.notify(); }
```

**`lockRect()` (`index.html:8326`):**
```diff
 function lockRect(t0,t1,lo,hi,v0){ S.lock={mode:"rect",t0,t1,lo,hi,v0:(isFinite(v0)&&v0>0)?v0:1}; document.body.classList.add("locked"); $("locknote").textContent="lock · region · resume or esc releases"; }
+function lockRect(t0,t1,lo,hi,v0){ S.lock={mode:"rect",t0,t1,lo,hi,v0:(isFinite(v0)&&v0>0)?v0:1}; OCCVM_LOCK_STORE.notify(); }
```

**`lockRelease()` (`index.html:8409`):**
```diff
   S.lock=null; S.drag=null; document.body.classList.remove("locked"); $("locknote").textContent="sweep · drag on the field to lock a region · esc releases"; }
+  S.lock=null; S.drag=null; OCCVM_LOCK_STORE.notify(); }
```

**Everything removed in these three diffs — `document.body.classList`,
`$("locknote").textContent` — is exactly the imperative DOM writing this
component now owns instead.** Nothing is left doing the job twice.

---

## 5. What is NOT touched

- The CSS at `index.html:534-536` (`#lockSwing` gradient, `#lockResume`
  display rules) still applies — the component renders elements with the
  same `id`s, so the existing styling attaches with zero changes. The
  `body.locked` selector becomes dead CSS (safe to remove separately,
  later, once confirmed unused elsewhere — already checked, it is not).
- `lockRelease`'s `S.lockRelax` / `v0` / cessation-curve logic — untouched.
  This patch touches only the three lines that wrote to the DOM directly;
  everything computing what the lock *does* is exactly as it was.
- The chart, the canvas, `renderSweep`, `loop` — none of this is on that
  boundary. This patch is scoped to one small piece of UI on purpose.

---

## 6. What this proves, and what it doesn't yet

**Proves:** React can live in this codebase without a build step, without
touching the "zero dependencies" constraint in any way that wasn't already
conceded by vendoring anything else, and without disrupting a single piece
of existing logic — only the three lines that wrote to the DOM directly
were touched, and each replacement is smaller than what it replaced.

**Does not yet prove:** that this pattern holds up on something bigger —
the signals table, the verdict panel — where more state is read and the
"snapshot only what the UI actually reads" discipline in `LockBar.js`
matters more. That's the next slice, not this one.
