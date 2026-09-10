# vendor/

React and ReactDOM, pinned, committed, and **spliced into `index.html`** by `react/tools/resplice.js`.

| file | source | retrieved | sha256 (first 12) |
|---|---|---|---|
| `react-18.3.1.umd.min.js` | `https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js` | 2026-09-06 | `d949f1c3687a` |
| `react-dom-18.3.1.umd.min.js` | `https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js` | 2026-09-06 | `35f4f974f4b2` |

Both files are **byte-identical to `Rhyme-Instrument/vendor/`** — one pinned dependency across the two
tools rather than two, and `test/react.js` asserts the pin rather than trusting this table.

## Why these are spliced and not `<script src>`

The obvious wiring is three tags in the head. It is wrong here, for three reasons this repository has
already written down somewhere else:

1. **`test/page-load.js` cannot see an external script.** It loads the whole page under jsdom with
   `runScripts: "dangerously"` and *without* `resources: "usable"`, deliberately — the network is blocked
   so a harness can prove the page survives with no network at all. jsdom therefore never fetches a
   `src`, so React would be absent in the one harness that loads the real page, and the component would
   be unverifiable by construction.
2. **The foot of `index.html` already states the rule**: one style block and one script block are an
   architectural property (CLAUDE.md §2), because `test/lib/load.js` reads the script by first-open to
   last-close. That comment ends *"A second tag breaks every harness."*
3. **OCCVM-D5 / roadmap 1.6.** Rhyme's own `vendor/README.md` records why React stopped coming from a
   CDN there: *"first paint shows the binding, not a blank frame; no tool installs to a home screen it
   cannot serve."* That was measured — the golden recorder's first run captured a blank page. A tool that
   fetches its own UI framework at load has the same failure one origin along.

Splicing costs nothing this repository was not already paying: the spine has been generated content under
a fence since 1.0, the units since before that. The source of truth is the file in this directory; the
copy inside `index.html` is an artifact, and `--check` fails if the two disagree.

Upgrading is a deliberate act: replace the file, update the table above and the hash pin in
`test/react.js`, run `node react/tools/resplice.js`, run `npm test`. Nothing fetches these; nothing
updates them silently.
