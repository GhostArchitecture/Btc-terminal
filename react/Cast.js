/* react/Cast.js — the one control every React island in this tool renders.
 *
 * Ported from Rhyme's <Cast> (tome-src/30_ui.jsx:194), where 36 call sites reach the interaction floor
 * through one component. What ports is the CONTRACT. What does not port is the skin, and that is
 * measured rather than preferred — see below.
 *
 * THE A11Y RULE, WHICH IS THE WHOLE REASON THE COMPONENT EXISTS:
 *   aria-pressed is emitted only when the caller passes `on` AND has not marked the control `action`.
 * A button that claims to be a pressed toggle announces a state it does not have. `action` is how a
 * caller says "this fires, it does not hold" for a control that still has an on-looking moment.
 *
 * WHAT DID NOT PORT, AND WHY, MEASURED IN CHROMIUM ON THIS TOOL'S OWN CONTROLS:
 *   Rhyme's Cast carries `.cast occvm-act`. `.cast` is Rhyme's bronze binding with Rhyme's own literals;
 *   this tool's controls have worn `--occvm-bevel` from the spine since 2.11, so importing `.cast` would
 *   be a SECOND button treatment here rather than a shared one.
 *   `occvm-act` is the sharper case, because it is a spine primitive and the obvious thing to adopt. It
 *   neutralises the user agent's button styling so a surface CLASS can own the look — which is Rhyme's
 *   arrangement and is not this tool's: here the `button` element rule owns it. Measured, adding
 *   occvm-act to this tool's controls erases exactly what that rule sets:
 *       #lockSwing  87x44 -> 62x44   padding 6px 14px -> 0   border 1px -> 0   radius 999px -> 0
 *       #armBtn     59x44 -> 32x44   the same collapse
 *       #callAbove  unchanged — it is styled by .sel / button[aria-pressed], which ties on specificity
 *                   and wins on source order
 *   So the primitive is right for Rhyme and wrong here, and the reason is structural rather than a
 *   matter of taste. Cast takes the class from its caller and adds none of its own.
 *
 * The ON skin is each tool's own word. Rhyme says `.on`; this tool has said `.sel` since before any of
 * this, paired with aria-pressed in one CSS rule (`button[aria-pressed="true"],button.sel`). Cast emits
 * `sel`, so a React-rendered toggle looks like every hand-written one already in the page.
 */
(function () {
  "use strict";

  function Cast(props) {
    const p = props || {};
    const e = React.createElement;
    const cls = [p.className, p.on ? "sel" : null].filter(Boolean).join(" ");
    return e("button", {
      /* type is not the caller's to get wrong: a bare <button> inside a form submits it */
      type: "button",
      id: p.id,
      className: cls || undefined,
      title: p.title,
      "aria-label": p.label,
      "aria-pressed": (p.action || p.on === undefined) ? undefined : !!p.on,
      disabled: p.disabled,
      style: p.style,
      onClick: p.onClick,
    }, p.children);
  }

  self.OCCVM_CAST = Cast;
})();
