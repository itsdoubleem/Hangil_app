#!/usr/bin/env python3
"""Puts the icon artwork on a coloured tile, and writes the result for icons.py.

    python3 tools/tint-icon.py '#C2410C'      # the app's own accent
    python3 tools/tint-icon.py none           # artwork through unchanged
    python3 tools/tint-icon.py                # re-run with the colour on record

    src/icon-artwork.png  ->  src/icon-source.png

WHY THIS IS ITS OWN TOOL
------------------------
`icons.py` must never invent appearance — it scales, rounds and lays out, and
that rule exists because several rounds were lost to code re-deriving the artwork
and drifting from what was wanted. Recolouring IS inventing appearance, so it
lives here instead, as a deliberate step with its input preserved.
`src/icon-artwork.png` is the untouched supplied file and is the thing to replace
when new artwork arrives; `src/icon-source.png` is this tool's output.

`none` is a real answer, not a way of switching the tool off. Artwork that
arrives with its own designed ground does not want one imposed: the crest is a
gold disc inside a heavy navy rim on cream, and that rim already supplies the
hard edge a coloured tile was there to give. Recolouring it would be overriding a
decision somebody made on purpose.

WHAT IT ACTUALLY DOES
---------------------
The medallion is cut metal photographed on a white wall, so the road, the 괘 and
the whole lower field are HOLES with the wall showing through them. Filling only
around the disc would leave those holes white, the cut-out would read as white
paint, and the effect the artwork is built on would be gone. So the wall is
replaced everywhere it appears — outside the disc and inside every hole.

Two details that make it look photographed rather than pasted:

  * The tile keeps the wall's own lighting. The replacement is the tint
    MULTIPLIED by how bright the wall was at that pixel, so the vignette and the
    soft drop shadow survive as shading in the tint instead of turning into a
    grey smudge sitting on a coloured tile.
  * Everything outside the disc is treated as ground regardless of what it
    measures, because the drop shadow would otherwise read as artwork and come
    through as dirt.

WHETHER TO RECOLOUR INSIDE THE DISC IS NOT A CONSTANT
-----------------------------------------------------
It depends on whether the artwork has holes, so the tool checks instead of
assuming. The medallion is cut metal and its road, 괘 and lower field are all
ground showing through; leave the inside alone and they stay white while
everything around them turns, which looks like a mistake. The crest that replaced
it has no holes at all — it is a solid gold disc inside a navy rim, with its 괘
DRAWN in white. Keying its inside would be pure damage: white sits only ~40 from
cream, close enough to be caught by a ramp tuned for holes, and the 괘 come out
dimmed and muddy for no reason.

So: if the ground colour genuinely reappears inside the subject, the inside is
keyed. If it does not, only the surround is replaced and the artwork is left
exactly as drawn.
"""
import json
import pathlib
import sys

from PIL import Image, ImageChops, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE.parent / "src" / "icon-artwork.png"
OUT = HERE.parent / "src" / "icon-source.png"
NOTE = HERE.parent / "src" / "icon-tint.json"

# Colour distance below which a pixel is wall, and above which it is artwork.
# Between them it is a ramp, which is what keeps the rim's antialiasing smooth
# instead of turning the disc into a cut-out with stair-stepped edges.
LO, HI = 18, 46

# How much of the subject must read as ground before it is treated as cut out.
# Measured, not guessed: the cut-metal medallion scores 17.0% and the solid crest
# 3.4% — the crest's figure being its antialiased rim plus 괘 that are drawn white,
# which sits only ~40 from cream. The gap between the two is wide, so the line
# goes between them rather than near either.
HOLES = 0.08


def rgb(text):
    t = text.lstrip("#")
    if len(t) != 6:
        raise SystemExit(f"tint must be a 6-digit hex colour, got {text!r}")
    return tuple(int(t[i:i + 2], 16) for i in (0, 2, 4))


def ground_of(im, frac=64):
    """The wall, as the median of a border ring — never one corner pixel, which
    on a lit wall is the darkest part of the vignette."""
    w, h = im.size
    r = max(2, min(w, h) // frac)
    px = []
    for box in ((0, 0, w, r), (0, h - r, w, h), (0, 0, r, h), (w - r, 0, w, h)):
        strip = im.crop(box)
        read = getattr(strip, "get_flattened_data", None) or strip.getdata
        px.extend(read())
    return tuple(sorted(c[i] for c in px)[len(px) // 2] for i in range(3))


def deviation(im, wall):
    """Distance from the wall colour, as the MAX of the channels — not the
    luminance average, on which a saturated 태극 red all but vanishes."""
    diff = ImageChops.difference(im, Image.new("RGB", im.size, wall))
    r, g, b = diff.split()
    return ImageChops.lighter(ImageChops.lighter(r, g), b)


def disc(im, dev):
    """A filled ellipse over the subject, so the drop shadow outside it is
    treated as wall. Derived from where the artwork actually is, at a cutoff high
    enough that the shadow does not drag the box outwards."""
    box = dev.point(lambda p: 255 if p > HI else 0).getbbox()
    mask = Image.new("L", im.size, 0)
    if box:
        pad = max(im.size) // 200          # keep the rim's soft edge inside
        ImageDraw.Draw(mask).ellipse(
            [box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad], fill=255)
    return mask, box


def main(tint_text=None):
    if tint_text is None:
        if not NOTE.exists():
            raise SystemExit("no tint on record — pass one, e.g. '#C2410C' or 'none'")
        tint_text = json.loads(NOTE.read_text())["tint"]

    if not SRC.exists():
        raise SystemExit(f"{SRC} is missing — it is the untouched supplied artwork")
    im = Image.open(SRC).convert("RGB")

    if tint_text.lower() == "none":
        im.save(OUT)
        NOTE.write_text(json.dumps({"tint": "none",
                                    "note": "artwork keeps its own ground"}, indent=2))
        print(f"  no tint — {SRC.name} -> {OUT.name} unchanged")
        return

    tint = rgb(tint_text)
    wall = ground_of(im)
    dev = deviation(im, wall)
    ring, box = disc(im, dev)

    # Does the ground actually reappear inside the subject? That is what makes a
    # hole a hole, and it decides whether the inside gets keyed at all.
    inside = dev.point(lambda p: 255 if p <= LO else 0)
    inside = ImageChops.multiply(inside, ring)
    disc_area = max(1, ring.histogram()[255])
    holes = inside.histogram()[255] / disc_area

    if holes > HOLES:
        # Cut metal: separate artwork from hole on colour distance, then discard
        # everything outside the disc.
        alpha = dev.point(lambda p: 0 if p <= LO else 255 if p >= HI
                          else int(255 * (p - LO) / (HI - LO)))
        alpha = ImageChops.multiply(alpha, ring)
    else:
        # Solid subject: keep every pixel of it, replace only the surround.
        alpha = ring
    print(f"  ground inside the subject: {holes:.1%} -> "
          f"{'keying the holes' if holes > HOLES else 'subject left as drawn'}")

    # The tile: the tint carrying the wall's own light, so the vignette and the
    # drop shadow become shading in the colour rather than grey dirt on top of it.
    wall_lum = max(1, int(0.299 * wall[0] + 0.587 * wall[1] + 0.114 * wall[2]))
    shade = im.convert("L").point(lambda p: min(255, int(255 * p / wall_lum)))
    tile = ImageChops.multiply(Image.new("RGB", im.size, tint),
                               Image.merge("RGB", (shade, shade, shade)))

    Image.composite(im, tile, alpha).save(OUT)
    NOTE.write_text(json.dumps({"tint": tint_text.lower(),
                                "note": "written by tools/tint-icon.py"}, indent=2))
    print(f"  wall {wall}  disc {box}  tint {tint_text}")
    print(f"  {SRC.name} -> {OUT.name}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
