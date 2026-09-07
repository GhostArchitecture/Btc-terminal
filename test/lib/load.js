/* Shared loader for the harnesses: runs the <script> block of index.html inside a node `vm` context
   with a mocked DOM, a recording canvas context, inert timers and network, and a controllable clock.
   Pattern per CLAUDE.md §6. No framework, no dependencies. */
"use strict";
const vm = require("vm"), fs = require("fs"), path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const INDEX = path.join(ROOT, "index.html");

function readIndex() {
  const html = fs.readFileSync(INDEX, "utf8");
  const a = html.indexOf("<script>"), b = html.lastIndexOf("</script>");
  if (a < 0 || b < 0 || b <= a) throw new Error("index.html: <script> block not found");
  const lineOffset = html.slice(0, a + 8).split("\n").length - 1;   /* so stack traces carry real index.html lines */
  return { html, script: html.slice(a + 8, b), lineOffset, markup: html.slice(0, a) };
}

/* canvas 2d context: records every drawing call with the style in force at that moment */
function mkCtx() {
  const calls = [];
  const st = { fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "", textBaseline: "", globalAlpha: 1, lineCap: "", lineJoin: "" };
  return new Proxy(st, {
    get(t, k) {
      if (k === "_calls") return calls;
      if (k in t) return t[k];
      if (k === "measureText") return s => ({ width: String(s).length * 6 });
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => ({ addColorStop() {} });
      if (k === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      return (...args) => { calls.push({ op: k, args, fillStyle: t.fillStyle, strokeStyle: t.strokeStyle, lineWidth: t.lineWidth }); };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

/* a style object that also honours the CSSOM setter pair, so custom-property writes (the sundial's
   --lx/--ly/--elev/--night and the vein layer's --vein) are observable instead of throwing. */
function mkStyle() {
  const st = {};
  Object.defineProperty(st, "setProperty", { value: (k, v) => { st[k] = String(v); }, enumerable: false });
  Object.defineProperty(st, "getPropertyValue", { value: k => (k in st ? st[k] : ""), enumerable: false });
  Object.defineProperty(st, "removeProperty", { value: k => { delete st[k]; }, enumerable: false });
  return st;
}

function mkEl(id) {
  const el = {
    id, tagName: "DIV", textContent: "", innerHTML: "", value: "", style: mkStyle(), dataset: {}, children: [], disabled: false, hidden: false,
    className: "", width: 800, height: 400, _attrs: {}, _listeners: {},
    addEventListener(t, fn) { (el._listeners[t] = el._listeners[t] || []).push(fn); },
    removeEventListener() {},
    dispatch(t, ev) { const e = Object.assign({ target: el, key: "", button: 0, clientX: 0, clientY: 0, closest: () => null, preventDefault() {} }, ev || {}); for (const fn of el._listeners[t] || []) fn(e); },
    setAttribute(k, v) { el._attrs[k] = String(v); }, getAttribute(k) { return k in el._attrs ? el._attrs[k] : null; },
    querySelector() { return mkEl(); }, querySelectorAll() { return []; },
    appendChild(c) { el.children.push(c); return c; }, removeChild() {}, insertBefore() {}, remove() {}, closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 400 }; },
    focus() {}, blur() {}, click() { el.dispatch("click"); },
    getContext() { return el._ctx || (el._ctx = mkCtx()); },
  };
  el.classList = {
    _s: new Set(),
    add(...c) { c.forEach(x => this._s.add(x)); },
    remove(...c) { c.forEach(x => this._s.delete(x)); },
    toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on; },
    contains(c) { return this._s.has(c); },
  };
  Object.defineProperty(el, "clientWidth", { value: 800 });
  Object.defineProperty(el, "clientHeight", { value: 400 });
  return el;
}

/* load(): returns a handle with R (eval in context), $ (memoised element stubs), the clock, the storage map and the canvas recorder */
function load(opts) {
  opts = opts || {};
  const { script, lineOffset } = readIndex();
  const els = {};
  const $ = id => els[id] || (els[id] = mkEl(id));
  const store = {};
  /* pre-seeded storage, written before the script evaluates: this is how a harness injects a session
     seed (btc.seed) so a generator's entropy is pinned rather than sampled. 2.0 migration process, section 4. */
  for (const [k, v] of Object.entries(opts.storage || {})) store[k] = String(v);
  const localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { if (opts.quota && String(v).length > opts.quota) { const e = new Error("QuotaExceededError"); e.name = "QuotaExceededError"; throw e; } store[k] = String(v); },
    removeItem: k => { delete store[k]; }, clear: () => { for (const k of Object.keys(store)) delete store[k]; }, key: () => null, get length() { return Object.keys(store).length; },
  };
  const document = {
    getElementById: $, querySelector: () => mkEl(), querySelectorAll: () => [], createElement: tag => { const e = mkEl(); e.tagName = String(tag).toUpperCase(); return e; },
    body: mkEl("body"), documentElement: mkEl("html"), addEventListener() {}, removeEventListener() {}, hidden: false, visibilityState: "visible",
  };
  const RealDate = Date; let fixed = null;
  class ClockDate extends RealDate {
    constructor(...a) { if (a.length === 0 && fixed !== null) super(fixed); else super(...a); }
    static now() { return fixed !== null ? fixed : RealDate.now(); }
  }
  const fetchCalls = [];
  const fetchImpl = opts.fetch || (() => new Promise(() => {}));     /* default: network parked forever (init never reaches startPolling) */
  const ctx = {
    document, localStorage, sessionStorage: localStorage,
    navigator: { userAgent: "node-harness", geolocation: null, serviceWorker: null, language: "en-US" },
    location: { origin: "https://btc-terminal.pages.dev", href: "https://btc-terminal.pages.dev/", hostname: "btc-terminal.pages.dev", search: "", pathname: "/" },
    console, Math, Date: ClockDate, JSON, Intl, Number, String, Array, Object, Map, Set, WeakMap, Promise, Error, TypeError, RangeError,
    parseFloat, parseInt, isFinite, isNaN, encodeURIComponent, decodeURIComponent, Uint8ClampedArray, Float64Array, Symbol,
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    fetch: (...a) => { fetchCalls.push(a); return fetchImpl(...a); },
    WebSocket: function () { return { send() {}, close() {}, addEventListener() {} }; },
    AbortController: function () { const c = { signal: { aborted: false }, abort() { c.signal.aborted = true; } }; return c; },
    performance: { now: () => (fixed !== null ? fixed : RealDate.now()) },
    matchMedia: () => ({ matches: false, addEventListener() {} }), devicePixelRatio: 1, innerWidth: 1200, innerHeight: 800, screen: { width: 1200, height: 800 },
    ResizeObserver: function () { return { observe() {}, disconnect() {} }; }, getComputedStyle: () => ({ getPropertyValue: () => "" }),
    CustomEvent: function () {}, Event: function () {}, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone: x => JSON.parse(JSON.stringify(x)),
    Blob: function (parts, o) { this.parts = parts; this.type = o && o.type; this.text = parts.map(String).join(""); },
  };
  ctx.URL = Object.assign(function (u, b) { return new URL(u, b); }, { createObjectURL: b => { ctx._lastBlob = b; return "blob:harness"; }, revokeObjectURL() {} });
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(script, ctx, { filename: "index.html", lineOffset });
  const R = code => vm.runInContext(code, ctx, { filename: "harness.js" });
  const setNow = ms => { fixed = ms; };
  return { ctx, R, $, els, store, setNow, fetchCalls, canvasCalls: () => $("chart").getContext("2d")._calls, script };
}

/* tiny assertion runner shared by the harness scripts */
function runner(title) {
  const rows = [];
  const T = (name, ok, detail) => { rows.push({ name, ok: !!ok, detail }); console.log((ok ? "  ok   " : "  FAIL ") + name + (ok || detail === undefined ? "" : "\n         " + JSON.stringify(detail))); return !!ok; };
  const done = () => { const f = rows.filter(r => !r.ok).length; console.log((f ? "FAIL " : "PASS ") + title + ": " + (rows.length - f) + "/" + rows.length + " assertions hold"); return f; };
  console.log("== " + title);
  return { T, done, rows };
}

module.exports = { load, readIndex, runner, mkCtx, mkEl, ROOT, INDEX };
