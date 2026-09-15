#!/usr/bin/env python3
"""Cuts HANGIL's icons from one artwork file.

`src/icon-source.png` IS the icon. This script does not draw it — earlier
versions did, and every attempt to re-derive the artwork drifted away from what
was wanted. All that happens here is scaling, rounding the corners, and laying
the artwork out so a launcher's crop cannot eat it.

  python3 tools/icons.py <dir>            web icons + apple-touch + maskable
  python3 tools/icons.py android <res>    launcher bitmaps and the adaptive icon
  python3 tools/icons.py check <dir>      what the crops actually look like

The one thing worth understanding: an Android adaptive icon is cropped by the
launcher to whatever shape it likes, and only the middle ~2/3 of the foreground
is guaranteed to survive. The artwork fills its own frame edge to edge, so for
the adaptive foreground it is scaled down and centred on the slate — otherwise
the launcher would slice the road and the emblem off at the sides.
"""
from pathlib import Path
from PIL import Image, ImageDraw

SRC = Path(__file__).resolve().parent.parent / "src" / "icon-source.png"

CORNER = 0.235       # corner radius as a fraction of the icon, the usual squircle

# How much of the finished icon the artwork fills. Below 1.0 the artwork is
# pulled in and its own ground shows around it — which is the point: at full
# bleed there is no grey to see.
ZOOM   = 1.00

# A launcher keeps only the middle two thirds of an adaptive icon's foreground,
# so the artwork is laid into that share of it. Sizing against this rather than
# the whole foreground is what makes the adaptive and plain icons look the same,
# and it is safe by construction — no measuring of the artwork required.
CROP   = 2 / 3


def ground():
    """The artwork's own background, sampled from its top-left corner, so an
    inset artwork joins its extended frame invisibly."""
    return _source().convert("RGB").getpixel((4, 4))




def _source():
    return Image.open(SRC).convert("RGBA")


def composed(size, fill, bottom=1.0):
    """The artwork at `fill` of `size`, centred across and sitting on `bottom`.

    Anchored to the bottom rather than centred so the road keeps running off the
    edge. Zooming out from the centre pulled the road up and left slate beneath
    it, which stops it reading as a road going somewhere.

    `bottom` is where the artwork's lower edge lands, as a fraction of `size`:
    1.0 for an icon shown whole, 5/6 for the adaptive foreground, whose lower
    edge is the bottom of what the launcher actually shows.
    """
    inner = max(1, int(size * fill))
    out = Image.new("RGBA", (size, size), ground() + (255,))
    art = _source().resize((inner, inner), Image.LANCZOS)
    x = (size - inner) // 2
    y = int(size * bottom) - inner
    out.paste(art, (x, y), art)
    return out


def rounded(size, radius_frac=CORNER):
    """The artwork at `size`, with the corners cut to a curve."""
    art = composed(size, ZOOM)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=int(size * radius_frac), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(art, (0, 0), mask)
    return out


def square(size):
    """The artwork at `size`, corners intact and fully opaque.

    For apple-touch, where iOS composites transparency onto black and applies
    its own mask — a pre-rounded icon there arrives with black corners.
    """
    return composed(size, ZOOM).convert("RGB")


def foreground(size):
    """The adaptive icon's foreground: the artwork laid into the share of it the
    launcher will actually show, sitting on the bottom of that share so the road
    reaches the visible edge."""
    visible_bottom = 0.5 + CROP / 2          # 5/6 of the frame
    return composed(size, ZOOM * CROP, bottom=visible_bottom)


def web(out_dir):
    out = Path(out_dir)
    for n in (192, 512):
        rounded(n).save(out / f"icon-{n}.png")
    square(180).save(out / "icon-180.png")          # apple-touch
    foreground(512).save(out / "icon-maskable-512.png")
    print("icons written to", out)


def android(res_dir):
    res = Path(res_dir)
    for folder, size in (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96),
                         ("xxhdpi", 144), ("xxxhdpi", 192)):
        p = res / f"mipmap-{folder}"
        p.mkdir(parents=True, exist_ok=True)
        rounded(size).save(p / "ic_launcher.png")
        rounded(size, 0.5).save(p / "ic_launcher_round.png")   # the round variant
        foreground(int(size * 1.5)).save(p / "ic_launcher_fg.png")

    v26 = res / "mipmap-anydpi-v26"
    v26.mkdir(parents=True, exist_ok=True)
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
           '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           '    <background android:drawable="@color/ic_bg" />\n'
           '    <foreground android:drawable="@mipmap/ic_launcher_fg" />\n'
           '</adaptive-icon>\n')
    (v26 / "ic_launcher.xml").write_text(xml)
    (v26 / "ic_launcher_round.xml").write_text(xml)
    print("android launcher icons written to", res)


def check(out_dir):
    """The adaptive foreground under a circular crop beside the plain icon, at
    the sizes a launcher uses. Look at this before shipping."""
    out = Path(out_dir)
    sheet = Image.new("RGB", (760, 300), (232, 236, 241))
    x = 30
    for size in (192, 120, 72, 48):
        src = foreground(int(size * 1.5))
        keep = int(src.width / 1.5)
        off = (src.width - keep) // 2
        crop = src.crop((off, off, off + keep, off + keep)).resize((size, size), Image.LANCZOS)
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
        sheet.paste(crop, (x, 30), mask)
        plain = rounded(size)
        sheet.paste(plain, (x, 40 + size), plain)
        x += size + 34
    sheet.save(out / "icon-check.png")
    print("wrote", out / "icon-check.png")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 2 and sys.argv[1] == "android":
        android(sys.argv[2])
    elif len(sys.argv) > 2 and sys.argv[1] == "check":
        check(sys.argv[2])
    else:
        web(sys.argv[1] if len(sys.argv) > 1 else ".")
