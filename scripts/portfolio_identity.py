"""Shared static identity tags for the Python notebook publication paths.

Keep these asset values aligned with portfolio-identity.mjs. This module only
formats metadata; it never opens or executes a notebook.
"""
from html import escape

IMAGE = 'https://mhaider.dev/assets/og-portfolio-paper-20261014.png'
IMAGE_ALT = 'Mohammad Haider — software engineer. Selected work in systems, simulation, and interactive graphics.'


def identity_metadata(title, description, canonical_path):
    if not canonical_path.startswith('/') or canonical_path.startswith('//'):
        raise ValueError('portfolio canonical path must be site-relative')
    canonical = f'https://mhaider.dev{canonical_path}'
    values = [
        ('og:title', title), ('og:description', description),
        ('og:url', canonical), ('og:type', 'website'),
        ('og:site_name', 'Mohammad Haider'), ('og:locale', 'en_US'),
        ('og:image', IMAGE), ('og:image:type', 'image/png'),
        ('og:image:width', '1200'), ('og:image:height', '630'),
        ('og:image:alt', IMAGE_ALT), ('twitter:card', 'summary_large_image'),
        ('twitter:title', title), ('twitter:description', description),
        ('twitter:image', IMAGE), ('twitter:image:alt', IMAGE_ALT),
        ('theme-color', '#f3f0e7'), ('color-scheme', 'light'),
    ]
    tags = [
        f'<meta {"property" if key.startswith("og:") else "name"}="{key}" content="{escape(str(value), quote=True)}">'
        for key, value in values
    ]
    tags.extend([
        f'<link rel="canonical" href="{escape(canonical, quote=True)}">',
        '<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">',
        '<link rel="icon" href="/favicon.svg?v=20261014" type="image/svg+xml" sizes="any">',
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20261014" sizes="180x180">',
        '<link rel="manifest" href="/site.webmanifest?v=20261014">',
    ])
    return ''.join(tags)
