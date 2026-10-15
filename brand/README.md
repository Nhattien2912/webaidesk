# AI Desk — brand assets

Official source: `aidesk-logo-source.jpg` (1254×1254 JPEG supplied by the project owner, 2026-10-15).
Every other file here is derived from it by `scripts/make-brand-assets.py`; nothing is redrawn.
The same source and icon set live in the desktop repo (`AI-Desk/assets/brand`).

| File | What it is | Use |
|---|---|---|
| `aidesk-logo-source.jpg` | Original logo: A mark + ring + "AI Desk" on navy | Source of truth, do not edit |
| `aidesk-logo-full-1024.png` | Original logo resized, opaque | Store listings, docs, social previews |
| `aidesk-mark.png` | A mark only, transparent, cut from the source | Dark backgrounds |
| `aidesk-wordmark.png` | "AI Desk" wordmark only, transparent | Dark backgrounds |
| `aidesk-lockup.png` | A mark + wordmark, horizontal, 96 px tall | Headers on dark backgrounds (show at ≤32 px) |
| `aidesk-icon-1024.png` | App icon: A mark on a navy rounded square, RGBA | Large icon contexts |
| `aidesk.ico` | App icon, 16/24/32/48/64/128/256 px, 32-bit | Windows |

Icon-only variants drop the decorative ring and the wordmark so the A stays legible at 16–32 px;
the 16–32 px frames use a slightly larger A. The tile gradient is sampled from the source background.
The cut-outs have soft edges for dark backgrounds; they are not meant for light backgrounds.

## Where the website uses them

- `src/assets/brand/aidesk-lockup.png` → `Logo` (Navbar, Footer, mobile menu), shown 28 px tall.
- `src/assets/brand/aidesk-mark.png` (192 px wide copy of the mark) → window icon in the product previews.
- `public/favicon.ico` (16/32/48), `public/favicon-{16x16,32x32,48x48}.png`, `public/apple-touch-icon.png`
  (180, opaque), `public/icon-192.png`, `public/icon-512.png` → linked from `index.html`.
- No web manifest or Open Graph image exists yet; add them only together with a verified public site URL.
- `public/favicon.svg` and `public/icons.svg` are unused Vite template files (not linked anywhere).

## Regenerate


```bash
python -I scripts/make-brand-assets.py <output-dir>
```

Then copy the outputs over the files listed above (resize `aidesk-mark.png` to 192 px wide for `src/assets/brand`) and run `npm run check`.
