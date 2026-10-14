"""Authoring-only renderer. Requires fonttools[brotli], Pillow and Inkscape.
Uses the repository's OFL-licensed Manrope; no runtime/build dependency.
Run from any directory: python scripts/render-share-identity.py
"""
from pathlib import Path
import subprocess
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
font = instantiateVariableFont(TTFont(ROOT / 'fonts/manrope-latin-wght-normal.woff2'), {'wght': 500})
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
units = font['head'].unitsPerEm
INK, PAPER = '#252b28', '#f3f0e7'

def lettering(text, x, y, size, fill=INK, tracking=0):
    parts = []
    scale = size / units
    for char in text:
        name = cmap[ord(char)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, y)))
        parts.append(f'<path d="{pen.getCommands()}"/>')
        x += glyphs[name].width * scale + tracking
    return f'<g fill="{fill}">' + ''.join(parts) + '</g>'

# Broad solid letterforms remain legible at favicon sizes. The cropped paper
# corner repeats the diagonal movement of the site's outward-link mark.
icon_mark = '<path d="M14 44V24H20V27C23 22 29 22 32 27C36 21 50 21 50 33V44H44V33C44 27 36 27 36 33V44H30V33C30 27 20 27 20 33V44Z" fill="#f3f0e7"/>'
icon = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="{INK}"/>{icon_mark}<path d="M47 11H53V17Z" fill="#a6b68d"/></svg>\n'
(ROOT / 'favicon.svg').write_text(icon)

def render(source, target, width=None):
    args = ['inkscape', str(source), '--export-type=png', f'--export-filename={target}']
    if width: args.append(f'--export-width={width}')
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL)

# A still pigment field echoes the existing homepage margin. It is identity
# artwork, not a chart, simulation result, or project-specific preview.
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<title>Mohammad Haider — software engineer</title>
<desc>Warm paper, dark Manrope lettering, and a plum, rose and olive pigment field.</desc>
<defs>
 <radialGradient id="rose"><stop stop-color="#d49077"/><stop offset=".48" stop-color="#a24e70"/><stop offset="1" stop-color="#472544" stop-opacity="0"/></radialGradient>
 <radialGradient id="olive"><stop stop-color="#bec29c"/><stop offset=".52" stop-color="#7d8f70"/><stop offset="1" stop-color="#243b36" stop-opacity="0"/></radialGradient>
 <radialGradient id="plum"><stop stop-color="#825a88"/><stop offset="1" stop-color="#39243e" stop-opacity="0"/></radialGradient>
 <clipPath id="field"><rect x="56" y="388" width="1088" height="154"/></clipPath>
</defs>
<rect width="1200" height="630" fill="{PAPER}"/>
<path d="M56 94H1144" stroke="#c9cdc0"/>
{lettering('mhaider.dev',56,68,21)}
{lettering('selected work',985,68,18,fill='#62695f')}
{lettering('mohammad haider',54,182,48,tracking=-1.5)}
{lettering('software engineer.',49,292,112,tracking=-5.1)}
{lettering('systems, simulations & interactive tools',56,342,23,fill='#62695f',tracking=-.25)}
<g clip-path="url(#field)">
 <rect x="56" y="388" width="1088" height="154" fill="#180f20"/>
 <ellipse cx="570" cy="490" rx="440" ry="220" fill="url(#plum)"/>
 <ellipse cx="875" cy="450" rx="370" ry="205" fill="url(#rose)"/>
 <ellipse cx="1160" cy="540" rx="330" ry="205" fill="url(#olive)"/>
</g>
{lettering('software / simulations / interactive graphics',56,590,18,fill='#62695f')}
<g transform="translate(1098 562) scale(.72)"><rect width="64" height="64" rx="12" fill="{INK}"/>{icon_mark}</g>
</svg>\n'''
source = ROOT / 'assets/og-portfolio-paper-20261014.svg'
source.write_text(svg)
render(source, source.with_suffix('.png'))
render(ROOT / 'favicon.svg', ROOT / 'icon-512.png', 512)
with Image.open(ROOT / 'icon-512.png') as icon_image:
    for size, name in [(192,'icon-192.png'),(180,'apple-touch-icon.png')]:
        icon_image.resize((size,size),Image.Resampling.LANCZOS).save(ROOT/name)
    icon_image.save(ROOT/'favicon.ico', sizes=[(16,16),(32,32),(48,48)])
print('Rendered share image (1200×630), SVG/ICO favicon, and 180/192/512px icons.')
