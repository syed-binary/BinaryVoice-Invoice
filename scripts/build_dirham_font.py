"""
Build a minimal web font containing the official UAE Dirham currency symbol
mapped to the Private-Use codepoint U+E800 (per the approach in
https://medium.com/@dagrawal/adding-the-new-dirham-symbol-to-any-font-9a4db9a50873).

Source artwork: Docs/Dirham Fonts/Dirham Currency Symbol - Black.svg
Outputs: public/fonts/dirham.woff2 and public/fonts/dirham.ttf

Run: uv run --with fonttools --with brotli python scripts/build_dirham_font.py
"""
import os
import re
import xml.etree.ElementTree as ET

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, "Docs", "Dirham Fonts", "Dirham Currency Symbol - Black.svg")
OUT_DIR = os.path.join(ROOT, "public", "fonts")

UPEM = 1000
CODEPOINT = 0xE800
GLYPH = "dirham"
TARGET_HEIGHT = 720.0   # symbol height in font units (~ digit height)
LEFT_BEARING = 60
RIGHT_BEARING = 90


def load_svg():
    tree = ET.parse(SVG)
    root = tree.getroot()
    vb = [float(x) for x in root.get("viewBox").split()]
    ns = {"svg": "http://www.w3.org/2000/svg"}
    path = root.find(".//svg:path", ns)
    if path is None:
        path = root.find(".//{http://www.w3.org/2000/svg}path")
    return path.get("d"), vb  # d, [minx, miny, w, h]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    d, vb = load_svg()
    vb_h = vb[3]
    scale = TARGET_HEIGHT / vb_h

    # SVG is y-down; fonts are y-up. Flip Y and scale; place bottom on baseline.
    # font_y = -scale*svg_y + TARGET_HEIGHT  → svg_y=vb_h maps to 0 (baseline).
    transform = (scale, 0, 0, -scale, LEFT_BEARING, TARGET_HEIGHT)

    # bounds after transform → left/right side bearings
    bp = BoundsPen(glyphSet=None)
    parse_path(d, TransformPen(bp, transform))
    x_min, y_min, x_max, y_max = bp.bounds
    advance = int(round(x_max + RIGHT_BEARING))

    pen = T2CharStringPen(advance, glyphSet=None)
    parse_path(d, TransformPen(pen, transform))
    charstring = pen.getCharString()

    notdef = T2CharStringPen(advance, glyphSet=None).getCharString()

    fb = FontBuilder(UPEM, isTTF=False)
    fb.setupGlyphOrder([".notdef", GLYPH])
    fb.setupCharacterMap({CODEPOINT: GLYPH})
    fb.setupCFF(
        "DirhamSymbol",
        {"FullName": "DirhamSymbol", "Weight": "Regular"},
        {".notdef": notdef, GLYPH: charstring},
        {},
    )
    fb.setupHorizontalMetrics(
        {".notdef": (advance, 0), GLYPH: (advance, int(round(x_min)))}
    )
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable(
        {
            "familyName": "DirhamSymbol",
            "styleName": "Regular",
            "fullName": "DirhamSymbol",
            "psName": "DirhamSymbol-Regular",
            "version": "1.0",
        }
    )
    fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    fb.setupPost()

    otf_path = os.path.join(OUT_DIR, "dirham.otf")
    fb.save(otf_path)

    f = TTFont(otf_path)
    f.flavor = "woff2"
    f.save(os.path.join(OUT_DIR, "dirham.woff2"))

    # a plain ttf/otf copy isn't needed for the web; keep woff2 + otf
    print(f"glyph bounds: xMin={x_min:.1f} yMin={y_min:.1f} xMax={x_max:.1f} yMax={y_max:.1f}")
    print(f"advance={advance} scale={scale:.4f}")
    print("wrote", os.path.join(OUT_DIR, "dirham.woff2"))


if __name__ == "__main__":
    main()
