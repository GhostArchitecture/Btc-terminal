#!/usr/bin/env python3
"""occvm/tools/subset-mono.py — regenerate occvm/mono.css from occvm/fonts/upstream/.

The generator's input is the source (2.0 migration process, section 0b#2): the upstream cuts are
committed, and mono.css is an artifact that happens to live in the repository. Running this against
unchanged input produces a byte-identical file.

Needs fonttools and brotli:  pip install fonttools brotli
Neither is a dependency of the tests or the build — mono.css is committed so nobody needs them.
"""
import base64, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OCCVM = os.path.dirname(HERE)
UP = os.path.join(OCCVM, "fonts", "upstream")
OUT = os.path.join(OCCVM, "mono.css")

# ASCII, plus every non-ASCII character these two tools actually render, read off their own source.
# Fifteen more (Greek, arrows, geometric, check marks) are not in the upstream latin cut; they fall back,
# and where one lands in a numeric column the tool pins its advance so alignment cannot depend on it.
NEED = set(range(0x20, 0x7F)) | {0xA2, 0xA7, 0xB0, 0xB7, 0xD7, 0x2013, 0x2014,
                                 0x2019, 0x201C, 0x201D, 0x2026, 0x2212, 0x2191}

def subset(src):
    from fontTools.ttLib import TTFont
    from fontTools.subset import Subsetter, Options
    import io
    # recalcTimestamp=False, or fontTools stamps head.modified with the current time on save and the
    # "regeneration is idempotent" rule (migration 0b#3) fails by a handful of bytes every run.
    f = TTFont(src, recalcTimestamp=False)
    keep = sorted(NEED & set(f.getBestCmap().keys()))
    o = Options()
    o.layout_features = ["kern", "tnum", "lnum", "zero"]
    o.notdef_outline = True
    o.desubroutinize = True
    o.name_IDs = ["*"]
    o.name_legacy = True
    s = Subsetter(options=o); s.populate(unicodes=keep); s.subset(f)
    # every glyph must carry the same advance, or the column this face exists to hold breaks
    widths = {f["hmtx"][g][0] for g in f.getGlyphOrder() if g != ".notdef"}
    if len(widths) != 1:
        raise SystemExit(f"{src}: {len(widths)} distinct advance widths — this face is not monospaced")
    f.flavor = "woff2"
    buf = io.BytesIO(); f.save(buf)
    return buf.getvalue(), len(keep), widths.pop(), f["head"].unitsPerEm

def main():
    b, n, adv, upem = subset(os.path.join(UP, "IBMPlexMono-latin-400.woff2"))
    b6, n6, adv6, _ = subset(os.path.join(UP, "IBMPlexMono-latin-600.woff2"))
    if adv != adv6:
        raise SystemExit(f"weights disagree on advance width ({adv} vs {adv6}) — alignment would break")
    head = open(os.path.join(OCCVM, "mono.head.css")).read()
    TNUM = "1"   # set from the measurement in SPINE.md L7; regenerate after changing it
    css = (head.replace("__W400__", base64.b64encode(b).decode())
               .replace("__W600__", base64.b64encode(b6).decode())
               .replace("__TNUM__", TNUM))
    open(OUT, "w").write(css)
    print(f"mono.css: {n} codepoints x 2 weights, advance {adv}/{upem} em, {os.path.getsize(OUT)} bytes")

if __name__ == "__main__":
    main()
