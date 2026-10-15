"""Derive AI Desk brand assets from the owner-supplied logo (brand/aidesk-logo-source.jpg).

Usage: python -I scripts/make-brand-assets.py <output-dir> [source.jpg]
Developer machine only (Pillow, numpy, scipy); not used at runtime or by the Electron build.

Nothing is redrawn: the A mark and the "AI Desk" wordmark are cut out of the source pixels with a
soft luminance mask; edge pixels take the colour of the nearest solid pixel (colour bleed) so the
cut-outs have no dark fringe. The icon tile puts the cut-out A on a navy rounded square whose
gradient is sampled from the source background.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parents[1] / "brand" / "aidesk-logo-source.jpg"
OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

src = Image.open(SRC).convert("RGB")
assert src.size == (1254, 1254), src.size
rgb = np.asarray(src).astype(np.float32)
H, W, _ = rgb.shape
lum = rgb.max(axis=2)


def region_mask(poly=None, box=None, feather=3):
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    if poly:
        d.polygon(poly, fill=255)
    if box:
        d.rectangle(box, fill=255)
    arr = np.asarray(m).astype(np.float32) / 255
    return ndimage.gaussian_filter(arr, feather) if feather else arr


def cutout(region, lo, hi):
    """Soft alpha from brightness inside `region`, colour-bled edges, cropped to content."""
    alpha = np.clip((lum - lo) / (hi - lo), 0, 1) * region
    solid = alpha >= 0.98
    _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    colour = rgb[iy, ix]
    rgba = np.dstack([colour, alpha * 255]).round().clip(0, 255).astype(np.uint8)
    ys, xs = np.nonzero(alpha > 0.02)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    return Image.fromarray(rgba, "RGBA").crop(box), box


# A mark: polygon around the A (excludes the decorative ring and the wordmark below).
A_POLY = [(222, 812), (525, 292), (735, 292), (1012, 812)]
mark, mark_box = cutout(region_mask(poly=A_POLY, feather=4), lo=85, hi=200)
# Wordmark "AI Desk": band below the A.
word, word_box = cutout(region_mask(box=(240, 858, 1020, 1018), feather=2), lo=70, hi=200)
print("mark box", mark_box, "size", mark.size)
print("wordmark box", word_box, "size", word.size)

# Background colours sampled from the source (centre glow -> edge navy).
BG_CENTER = tuple(int(v) for v in rgb[200:260, 560:680].reshape(-1, 3).mean(0))
BG_EDGE = tuple(int(v) for v in rgb[10:60, 10:60].reshape(-1, 3).mean(0))
print("bg centre", BG_CENTER, "bg edge", BG_EDGE)


def tile(size, mark_frac, radius_frac=0.22, ss=4):
    """Navy rounded-square app tile with the A mark centred. Rendered at `ss`x, then downsampled."""
    S = size * ss
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    r = np.sqrt((xx - S / 2) ** 2 + (yy - S * 0.42) ** 2) / (S * 0.75)
    t = np.clip(r, 0, 1)[..., None]
    grad = (np.array(BG_CENTER) * (1 - t) + np.array(BG_EDGE) * t).astype(np.uint8)
    canvas = Image.fromarray(np.dstack([grad, np.full((S, S), 255, np.uint8)]), "RGBA")
    mw = int(S * mark_frac)
    mh = int(mark.height * mw / mark.width)
    m = mark.resize((mw, mh), Image.LANCZOS)
    canvas.alpha_composite(m, ((S - mw) // 2, (S - mh) // 2 + int(S * 0.02)))
    shape = Image.new("L", (S, S), 0)
    ImageDraw.Draw(shape).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * radius_frac), fill=255)
    canvas.putalpha(Image.fromarray(np.minimum(np.asarray(canvas.split()[3]), np.asarray(shape))))
    return canvas.resize((size, size), Image.LANCZOS)


def square_tile(size, mark_frac=0.74):
    """Opaque square (apple-touch-icon: iOS applies its own mask)."""
    t = tile(size, mark_frac, radius_frac=0)
    bg = Image.new("RGB", t.size, BG_EDGE)
    bg.paste(t, mask=t.split()[3])
    return bg


def icon_set(sizes):
    # Small sizes use a larger mark so the A stays legible at 16-32 px.
    return [tile(s, 0.84 if s <= 32 else 0.74) for s in sizes]


ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
icons = icon_set(ICO_SIZES)
big = tile(1024, 0.74)
big.save(OUT / "aidesk-icon-1024.png", optimize=True)
tile(512, 0.74).save(OUT / "aidesk-icon-512.png", optimize=True)
icons[-1].save(OUT / "aidesk-icon-256.png", optimize=True)
icons[-1].save(OUT / "aidesk.ico", format="ICO", sizes=[(s, s) for s in ICO_SIZES], append_images=icons[:-1])

# Transparent cut-outs (for dark backgrounds) and full logo.
mark.save(OUT / "aidesk-mark.png", optimize=True)
word.save(OUT / "aidesk-wordmark.png", optimize=True)
src.resize((1024, 1024), Image.LANCZOS).save(OUT / "aidesk-logo-full-1024.png", optimize=True)

# Horizontal lockup (mark + wordmark) at 3x for a 32 px CSS height.
LOCK_H = 96
mk = mark.resize((int(mark.width * LOCK_H / mark.height), LOCK_H), Image.LANCZOS)
wh = int(LOCK_H * 0.70)
wd = word.resize((int(word.width * wh / word.height), wh), Image.LANCZOS)
gap = int(LOCK_H * 0.32)
lock = Image.new("RGBA", (mk.width + gap + wd.width, LOCK_H), (0, 0, 0, 0))
lock.alpha_composite(mk, (0, 0))
lock.alpha_composite(wd, (mk.width + gap, (LOCK_H - wh) // 2 + int(LOCK_H * 0.04)))
lock.save(OUT / "aidesk-lockup.png", optimize=True)

# Website favicons.
for s in (16, 32, 48, 192, 512):
    tile(s, 0.84 if s <= 32 else 0.74).save(OUT / f"favicon-{s}.png", optimize=True)
fav = [tile(s, 0.84 if s <= 32 else 0.74) for s in (16, 32, 48)]
fav[-1].save(OUT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=fav[:-1])
square_tile(180).save(OUT / "apple-touch-icon.png", optimize=True)

# Contact sheet for review.
sheet = Image.new("RGB", (1500, 620), (10, 15, 28))
x = 20
for s in (16, 24, 32, 48, 64, 128, 256):
    im = tile(s, 0.84 if s <= 32 else 0.74)
    sheet.paste(im, (x, 40), im)
    x += s + 24
light = Image.new("RGB", (560, 300), (243, 243, 243))
lx = 20
for s in (16, 32, 48, 128):
    im = tile(s, 0.84 if s <= 32 else 0.74)
    light.paste(im, (lx, 40), im)
    lx += s + 30
sheet.paste(light, (20, 320))
lk = lock.resize((lock.width * 32 // LOCK_H, 32), Image.LANCZOS)
sheet.paste(lk, (620, 360), lk)
sheet.paste(lock, (620, 420), lock)
sheet.save(OUT / "_contact-sheet.png")
print("done")
