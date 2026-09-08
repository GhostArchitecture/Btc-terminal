#!/usr/bin/env python3
"""occvm/tools/subset-serif.py — regenerate occvm/serif.css and occvm/reading.css from occvm/fonts/upstream/.

Mirrors subset-mono.py: the upstream cuts are committed and the CSS is an artifact. Running this against
unchanged input produces byte-identical files (recalcTimestamp=False, or head.modified drifts every run).

Needs fonttools and brotli:  pip install fonttools brotli
Neither is a dependency of the tests or the build — the output is committed so nobody needs them.
"""
import base64, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
OCCVM = os.path.dirname(HERE)
UP = os.path.join(OCCVM, "fonts", "upstream")

# display face: Basic Latin, Latin-1, typographic marks. A range, not a measurement — see serif.head.css.
DISPLAY = set(range(0x20, 0x7F)) | set(range(0xA0, 0x100)) | {
    0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2212, 0x2022, 0x2032}
# reading face: the writer's alphabet — Latin, Latin-1, Latin Extended-A, General Punctuation.
READING = set(range(0x20, 0x7F)) | set(range(0xA0, 0x180)) | set(range(0x2010, 0x2027)) | {
    0x2030, 0x2032, 0x2033, 0x2212}

def build(src, pin, need, features):
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools.subset import Subsetter, Options
    f = TTFont(src, recalcTimestamp=False)
    if pin:
        f = instancer.instantiateVariableFont(f, pin, inplace=False)
    keep = sorted(need & set(f.getBestCmap().keys()))
    o = Options()
    o.layout_features = features
    o.notdef_outline = True
    o.name_IDs = ["*"]
    o.name_legacy = True
    s = Subsetter(options=o); s.populate(unicodes=keep); s.subset(f)
    axes = [a.axisTag for a in f["fvar"].axes] if "fvar" in f else []
    f.flavor = "woff2"
    buf = io.BytesIO(); f.save(buf)
    return buf.getvalue(), len(keep), axes

def emit(head, out, key, data):
    css = open(os.path.join(OCCVM, head)).read().replace(key, base64.b64encode(data).decode())
    open(os.path.join(OCCVM, out), "w").write(css)
    return os.path.getsize(os.path.join(OCCVM, out))

def main():
    # SOFT 35 / WONK 1 are the handoff's calibration; opsz is kept variable across the sizes the tools
    # render (9-48), against the handoff's pinned 40 — see serif.head.css for why.
    serif, n, axes = build(os.path.join(UP, "Fraunces[SOFT,WONK,opsz,wght].ttf"),
                           {"SOFT": 35, "WONK": 1, "opsz": (9, 48)}, DISPLAY,
                           ["kern", "liga", "lnum", "tnum"])
    assert axes == ["opsz", "wght"], f"serif axes {axes}: SOFT and WONK must be pinned, opsz and wght kept"
    sz = emit("serif.head.css", "serif.css", "__SERIF__", serif)
    print(f"serif.css:   Fraunces, {n} codepoints, axes {axes}, {len(serif)} B woff2, {sz} B css")

    reading, n2, axes2 = build(os.path.join(UP, "Faustina[wght].ttf"), None, READING,
                               ["kern", "liga", "lnum", "onum", "tnum"])
    assert axes2 == ["wght"], f"reading axes {axes2}"
    sz2 = emit("reading.head.css", "reading.css", "__READING__", reading)
    print(f"reading.css: Faustina, {n2} codepoints, axes {axes2}, {len(reading)} B woff2, {sz2} B css")

if __name__ == "__main__":
    main()
