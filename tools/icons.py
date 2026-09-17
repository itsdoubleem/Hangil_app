#!/usr/bin/env python3
"""Cuts HANGIL's icons from one artwork file.

`src/icon-source.png` IS the icon. This script does not draw it — earlier
versions did, and every attempt to re-derive the artwork drifted away from what
was wanted. All that happens here is trimming the blank margin, scaling,
rounding the corners, and laying the artwork out so a launcher's crop cannot
eat it. Nothing here invents a shape.

  python3 tools/icons.py <dir>            web icons + apple-touch + maskable
  python3 tools/icons.py android <res>    launcher bitmaps and the adaptive icon
  python3 tools/icons.py check <dir>      what the crops actually look like

The one thing worth understanding: an Android adaptive icon is cropped by the
launcher to whatever shape it likes, and only the middle ~2/3 of the foreground
is guaranteed to survive — and that guaranteed area is a CIRCLE, not a square.
So the artwork is scaled down and centred for the adaptive foreground, and its
size within the tile is measured from how far it reaches rather than how wide it
is. See `_safe_content`.
"""
from pathlib import Path
from PIL import Image, ImageDraw

SRC = Path(__file__).resolve().parent.parent / "src" / "icon-source.png"

# Corner radius as a fraction of the icon. Matches Claude's macOS icon: its
# curve starts 0.303 of the way along the top edge, and because that is a
# continuous squircle rather than a circular arc, the equivalent plain radius is
# about 0.303 / 1.28 = 0.237. Measured after the fact, but it is where this
# landed by eye, which is some comfort.
CORNER = 0.235

# How much of the finished icon the artwork fills. Below 1.0 the artwork is
# pulled in and its own ground shows around it — which is the point: at full
# bleed there is no ground to see.
ZOOM   = 1.00

# How much of the icon the artwork's actual CONTENT should fill, once the blank
# margin around it has been trimmed off.
#
# Artwork rarely arrives framed for an icon — it is drawn to be looked at, not to
# be 48 pixels on a home screen. One version of this one came with ~15% of empty
# ground on every side and the emblem read small next to apps that fill their
# tile; the photographed medallion that replaced it sat in the middle of a wall
# and filled only 46%. Measuring the content and re-framing it means a new file
# can be dropped in without anybody eyeballing a crop.
#
# The number is measured, not chosen: this is what Claude's own macOS icon does.
# Its mark spans 606px inside an 824px tile — 0.735 — and asking for "the same
# zoom as Claude's logo" is asking for that ratio. Re-measure it with:
#
#     sips -s format png /Applications/Claude.app/Contents/Resources/electron.icns \
#          --out /tmp/claude.png
#
# This is a ceiling, not a setting: `_source` shrinks it further when the artwork
# needs it. See `_safe_content`.
CONTENT = 0.735

# A launcher keeps only the middle two thirds of an adaptive icon's foreground,
# so the artwork is laid into that share of it. Sizing against this rather than
# the whole foreground is what makes the adaptive and plain icons look the same,
# and it is safe by construction — no measuring of the artwork required.
CROP   = 2 / 3


def ground():
    """The artwork's own background, so a re-framed or inset artwork joins its
    extended ground invisibly."""
    return ground_of(_raw())




def _raw():
    return Image.open(SRC).convert("RGBA")


def _ring(im, frac=64):
    """Pixels from a thin border ring — ground, in any artwork worth trimming."""
    rgb = im.convert("RGB")
    w, h = rgb.size
    r = max(2, min(w, h) // frac)
    out = []
    for box in ((0, 0, w, r), (0, h - r, w, h), (0, 0, r, h), (w - r, 0, w, h)):
        strip = rgb.crop(box)
        # getdata() is deprecated from Pillow 14; get_flattened_data replaces it.
        read = getattr(strip, "get_flattened_data", None) or strip.getdata
        out.extend(read())
    return out


def ground_of(im):
    """The artwork's background, as the MEDIAN of its border ring.

    Not a single corner pixel: the medallion photograph is a lit wall, so its
    corners are a shade darker than the wall behind the disc, and one pixel from
    the darkest part of a vignette is not the colour to extend the frame with.
    """
    px = _ring(im)
    return tuple(sorted(c[i] for c in px)[len(px) // 2] for i in range(3))


def _deviation(im):
    """Per-pixel distance from the ground colour, as the MAX of the channels.

    Max rather than the luminance average `convert("L")` would give, because a
    saturated 태극 red can sit at almost exactly the luminance of the ground it
    is printed on and vanish from the map entirely.
    """
    from PIL import ImageChops
    rgb = im.convert("RGB")
    diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, ground_of(im)))
    r, g, b = diff.split()
    return ImageChops.lighter(ImageChops.lighter(r, g), b)


def _mask(im):
    """A 1-bit map of where the artwork actually is, and nothing else.

    The cutoff is FOUND, not chosen, because every file so far has needed a
    different one and each would be silently wrong at the others' value:

      - the shaded emblem carried an invisible off-white wash over its lower
        half, and any cutoff low enough to keep a drop shadow also kept the wash,
        which made the trim a no-op;
      - the flat emblem has faint edge noise that a low cutoff scores as filling
        99.7% of the canvas — again trimming nothing;
      - the medallion is a photograph, with a soft drop shadow AND a vignetted
        wall. At a low cutoff its content measures 97% of the frame; the disc
        itself is 46%. Framing to the former would have put a small disc in a
        large square and looked like nothing had been zoomed at all.

    So the threshold is swept and the artwork's extent measured at each step.
    Real edges are steep — past them the measurement stops moving — while
    shadows, washes and vignettes fade out gradually and keep shrinking the box.
    The lowest threshold whose measurement has settled is the one taken, which
    keeps as much soft edge as is genuinely part of the artwork. In practice it
    picks 16, 6 and 40 for the three files above, none of them written down.
    """
    dev = _deviation(im)
    steps = list(range(2, 121, 2))
    sides = []
    for t in steps:
        box = dev.point(lambda p, t=t: 255 if p > t else 0).getbbox()
        sides.append(max(box[2] - box[0], box[3] - box[1]) if box else 0)

    tail = sorted(sides[len(sides) * 2 // 3:])
    settled = tail[len(tail) // 2]
    cut = next((t for t, side in zip(steps, sides) if side <= settled * 1.05), steps[-1])
    return dev.point(lambda p: 255 if p > cut else 0)


def _safe_content(mask, box):
    """The largest share of the icon this artwork can fill without a round
    launcher biting it.

    The guaranteed-visible area of an adaptive icon is a CIRCLE, so what matters
    is not the artwork's width but how far its furthest pixel sits from its
    centre. The four 괘 sit on the diagonals: on the shaded version of this
    emblem they reached 1.21x its half-width, so filling 84% of the tile would
    have put their tips outside that circle and a round launcher would have
    clipped them — the very framing that file was avoiding by leaving so much
    margin. Measuring the reach instead of guessing recovers most of that
    padding while still clipping nothing.

    How much it recovers depends on the artwork's proportions, which is why this
    is measured and not a constant: the flat version is wider and shallower, so
    the same 괘 reach only 1.096x and CONTENT becomes the binding limit instead.

    Artwork that is itself round reaches 1.0 and is limited only by CONTENT.
    """
    import math
    l, t, r, b = box
    m = mask.crop(box)
    px = m.load()
    half = max(r - l, b - t) / 2
    cx, cy = (m.width - 1) / 2, (m.height - 1) / 2
    reach = 0.0
    for y in range(m.height):
        row = [x for x in range(m.width) if px[x, y]]
        if not row:
            continue
        for x in (row[0], row[-1]):
            reach = max(reach, math.hypot(x - cx, y - cy))
    return min(CONTENT, half / reach)


def _bleeds(box, size, tol=0.01):
    """Whether the artwork runs off its own edges.

    Artwork that reaches the frame was composed to fill it, and re-framing such a
    file is destructive: centring its content in a fresh square adds a border
    that was never there and lifts whatever was bleeding — here a road running
    off the bottom — away from the edge it was drawn to leave by. A crest sitting
    in the middle of a cream field wants re-framing; a scene that IS the field
    does not.
    """
    w, h = size
    slack = max(2, int(min(w, h) * tol))
    return (box[0] <= slack or box[1] <= slack
            or w - box[2] <= slack or h - box[3] <= slack)


def _source():
    """The artwork, re-framed so its content fills as much of a square as it can
    without leaving the launcher's safe circle — unless it already fills its own
    frame, in which case it is left exactly as drawn."""
    im = _raw()
    mask = _mask(im)
    box = mask.getbbox()
    if not box or _bleeds(box, im.size):
        return im
    l, t, r, b = box
    side = max(r - l, b - t)
    canvas = int(round(side / _safe_content(mask, box)))
    art = im.crop(box)
    out = Image.new("RGBA", (canvas, canvas), ground() + (255,))
    out.paste(art, ((canvas - art.width) // 2, (canvas - art.height) // 2), art)
    return out


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
