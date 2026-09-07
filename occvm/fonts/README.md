# occvm/fonts

The numeric face OCCVM-L7 requires, and the upstream cuts it is subset from.

**IBM Plex Mono**, SIL Open Font License 1.1 — `OFL.txt`, retained here because the licence requires it to
travel with the font. Copyright 2017 IBM Corp.

| file | what |
|---|---|
| `upstream/IBMPlexMono-latin-400.woff2` | the fetched latin cut, weight 400 — **the source** |
| `upstream/IBMPlexMono-latin-600.woff2` | the fetched latin cut, weight 600 — **the source** |
| `OFL.txt` | the licence, verbatim |
| `../mono.css` | the artifact: both faces subset and base64-embedded — **generated, do not hand-edit** |

Regenerate with `python3 occvm/tools/subset-mono.py`, which needs `fonttools` and `brotli`
(`pip install fonttools brotli`). Neither is a dependency of this repository's tests or its build; the
generated `mono.css` is committed, so nobody needs them to work on the tools.

**Two weights ship on purpose.** The live price is set at `font-weight: 600`; with only a 400 face the
browser synthesises the bold, which changes the advance width and breaks the numeric column. Both faces
are strictly monospaced at 600/1000 em — the same advance in both — so alignment holds across a weight
change by construction.

**The subset is 108 codepoints**: ASCII plus the punctuation and symbols these tools actually render,
taken from their own source rather than from a guess. Fifteen further symbols the tools use (Greek,
arrows, geometric shapes, check marks) are absent from this cut and fall back to the visitor's font;
where one lands in a numeric column its advance is pinned in the tool's CSS, so alignment never depends
on the fallback.
