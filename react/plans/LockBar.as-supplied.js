/* SUPERSEDED by react/LockBar.js — kept as the record. Its store reads window.S, which is undefined
   in this page (S is a top-level const in a classic script), so it would have returned null forever with
   nothing thrown. CLAUDE.md §13.2. Not spliced anywhere; react/tools/resplice.js does not list it. */
/* ============================================================
   LockBar.js — the lockbar (#lockSwing / #lockResume / #locknote)
   converted from static HTML + imperative DOM writes to a real
   React component.

   Why this slice first: small, self-contained, not on any
   financially-critical path. Proves the pattern before anything
   real rides on it.

   React.createElement only — no JSX, no babel, no build step.
   Vendored React 18.3.1, the same pinned build Rhyme-Instrument
   already ships, loaded as a plain <script> tag same as any other
   library this page already vendors.

   The bridging problem, solved honestly rather than papered over:
   S.lock is mutated by plain assignment inside lockSwing/lockRect/
   lockRelease — vanilla code React doesn't know about. React only
   re-renders when ITS OWN state changes, so those three functions
   each need one added line: a notify call after the mutation, so
   this component knows to re-render. That's a real, minimal change
   to code outside this file — see PATCH.md for the exact three
   lines. useSyncExternalStore is React 18's purpose-built API for
   exactly this — subscribing to state that lives outside React's
   control — so this uses that rather than polling.
   ============================================================ */
(function () {
  "use strict";
  const e = React.createElement;

  /* ---- the bridge: a minimal external store over S.lock ---- */
  const listeners = new Set();
  let lastSnapshot = null;

  function computeSnapshot() {
    if (!window.S || !window.S.lock) return null;
    /* Snapshot only what the UI actually reads — mode and the note
       text derive from this, not from the whole S.lock object, so
       a mutation to unrelated lock fields (t0/t1/lo/hi/v0) doesn't
       force a re-render that would change nothing on screen. */
    return window.S.lock.mode;
  }

  const LockStore = {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot() {
      const next = computeSnapshot();
      /* Stable reference when nothing meaningful changed — this is
         the quiet-mode discipline from the redraw loop, applied
         here: useSyncExternalStore re-renders only when getSnapshot
         returns something !==  the last value, so returning the
         SAME cached value on an unrelated notify is what keeps this
         idle rather than repainting on every S.lock field touch. */
      if (next === lastSnapshot) return lastSnapshot;
      lastSnapshot = next;
      return next;
    },
    /* Called from lockSwing/lockRect/lockRelease after they mutate
       S.lock. See PATCH.md for the three call sites. */
    notify() {
      for (const cb of listeners) cb();
    },
  };
  window.OCCVM_LOCK_STORE = LockStore; // the three patched functions call .notify() on this

  /* ---- the component ---- */
  function LockBar() {
    const mode = React.useSyncExternalStore(LockStore.subscribe, LockStore.getSnapshot);

    const note =
      mode === "swing" ? "lock \u00b7 swing window \u00b7 resume or esc releases" :
      mode === "rect"  ? "lock \u00b7 region \u00b7 resume or esc releases" :
                          "sweep \u00b7 drag on the field to lock a region \u00b7 esc releases";

    /* body.locked was CSS-only and had no consumer outside this
       component (checked: zero other references in index.html) —
       so it is retired here rather than kept as a side effect.
       Visibility now derives directly from mode, which is the
       actual point of doing this in React: one source of truth
       instead of a JS object and a mirrored CSS class. */
    return e(
      "div", { id: "lockbar" },
      e("span", { className: "note", id: "locknote" }, note),
      e("button", {
        id: "lockSwing", type: "button",
        title: "lock the view tight on the live window\u2019s swing",
        onClick: () => window.lockSwing(),
      }, "\u25c6 SWING"),
      mode ? e("button", { id: "lockResume", type: "button", onClick: () => window.lockRelease() }, "RESUME") : null
    );
  }

  window.OCCVM_MOUNT_LOCKBAR = function (containerId) {
    const root = ReactDOM.createRoot(document.getElementById(containerId));
    root.render(e(LockBar));
  };
})();
