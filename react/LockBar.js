/* react/LockBar.js — the lockbar (#locknote / #lockSwing / #lockResume) as a React component.
 *
 * The first React island in this tool. This slice was chosen because it is small, self-contained and on
 * no financially-critical path: it changes which control is on screen, never a number, never a colour
 * that means win or lose (CLAUDE.md §5), never a ledger.
 *
 * `React.createElement` only. No JSX, no babel, no build step — this file is spliced into index.html
 * verbatim by react/tools/resplice.js, under a fence, exactly as every occvm part already is.
 *
 * ---------------------------------------------------------------------------------------------------
 * THE BRIDGE, WHICH IS THE WHOLE POINT OF STARTING HERE
 *
 * Rhyme's state has lived inside React since its first line, so Rhyme has no pattern to lend here:
 * `useSyncExternalStore` appears zero times in tome-src. This tool's state is one global `S` mutated by
 * plain assignment from ~300 vanilla functions that have never heard of React. `useSyncExternalStore`
 * is React 18's purpose-built answer to exactly that, so this subscribes rather than polls, and the
 * three functions that mutate S.lock each gained one line: a notify after the mutation.
 *
 * The store deliberately does NOT touch React. It is created and exported whether React loaded or not,
 * so `lockSwing`/`lockRect`/`lockRelease` can call notify() unconditionally without a guard of their
 * own. Only the component and the mount reach for React.
 *
 * `S`, `lockSwing` and `lockRelease` are read LEXICALLY, not off `window`. They are top-level `const`
 * and `function` in a classic script: a function declaration does become a property of the global
 * object, but `const S = {...}` does not — `window.S` is undefined in this page, which test/page-load.js
 * already notes in its own source. A store reading `window.S` would return null forever, render the
 * idle note permanently, and never throw. Reading the binding is only possible because this file is
 * spliced into the same script block; that is the second reason it is spliced rather than loaded.
 * S is in its temporal dead zone while this block evaluates, and out of it long before anything here
 * is called, which is why the reference is inside function bodies and nowhere else.
 * --------------------------------------------------------------------------------------------------- */
(function () {
  "use strict";

  /* ---- the bridge: an external store over S.lock ---- */
  const listeners = new Set();

  /* Snapshot only what the UI reads. The note text and RESUME's presence are both functions of the mode
     alone, so a mutation to an unrelated lock field (t0/t1/lo/hi/v0 — lockRect writes five) leaves the
     snapshot identical and React re-renders nothing. The value is a primitive, so Object.is settles that
     without a memo: a cache here would be dead weight claiming to be a discipline. */
  function snapshot() { return (typeof S !== "undefined" && S.lock) ? S.lock.mode : null; }

  const LockStore = {
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    getSnapshot: snapshot,
    /* called by lockSwing / lockRect / lockRelease immediately after they mutate S.lock */
    notify() { for (const cb of listeners) cb(); },
  };
  self.OCCVM_LOCK_STORE = LockStore;

  const NOTE = {
    swing: "lock · swing window · resume or esc releases",
    rect: "lock · region · resume or esc releases",
    idle: "sweep · drag on the field to lock a region · esc releases",
  };
  self.OCCVM_LOCK_NOTE = NOTE;   /* one owner for the three strings; test/react.js reads them from here */

  /* ---- the component ----
     A Fragment, not a wrapper: the root mounts into the page's own #lockbar, so #lockbar and
     #lockbar .note keep the CSS they have had since the tile was built and nothing gains an id.

     RESUME renders only while a lock is held. It used to be `#lockResume{display:none}` plus a
     `body.locked` override — S.lock mirrored into a class and then into a CSS rule, three copies of one
     fact. Both CSS lines are deleted with this change; leaving them would have hidden a button React had
     already decided to show, which is what the mirror does once it stops being maintained. */
  function LockBar() {
    const e = React.createElement;
    const mode = React.useSyncExternalStore(LockStore.subscribe, LockStore.getSnapshot);
    return e(React.Fragment, null,
      e("span", { className: "note", id: "locknote" }, NOTE[mode] || NOTE.idle),
      e("button", {
        id: "lockSwing", type: "button",
        title: "lock the view tight on the live window’s swing",
        onClick: () => lockSwing(),
      }, "◆ SWING"),
      mode ? e("button", { id: "lockResume", type: "button", onClick: () => lockRelease() }, "RESUME") : null
    );
  }

  /* Returns the root, or null when there is nothing to mount into. Both refusals are real cases rather
     than defensive noise: the vm harnesses (test/lib/load.js) evaluate this whole script against stub
     elements that are not DOM nodes, and createRoot would throw on one. A null return is not a failure
     to record — a failure to record is a container that IS a node and still would not take the root,
     which throws and is caught at the call site into S.uiErr. */
  self.OCCVM_MOUNT_LOCKBAR = function (containerId) {
    if (typeof React === "undefined" || typeof ReactDOM === "undefined") return null;
    const el = document.getElementById(containerId);
    if (!el || el.nodeType !== 1) return null;
    const root = ReactDOM.createRoot(el);
    root.render(React.createElement(LockBar));
    return root;
  };
})();
