# Portfolio share identity

The portfolio shares its warm-paper / Manrope / pigment visual language with its
social preview and small icons. The 1200 × 630 PNG is explicit in static HTML,
including Twitter large-image metadata, dimensions, type and descriptive alt text.
It is a portfolio identity graphic, not a project result or scientific figure.

## Authoring

- `scripts/render-share-identity.py` emits the outlined SVG, PNG, favicon and
  touch/app icon sizes. It uses the existing Manrope font under its bundled SIL
  Open Font License (`fonts/manrope-license.txt`). No additional font is shipped.
- Rendering requires Python with `fonttools[brotli]` and Pillow, plus Inkscape.
  These are authoring tools only: the site remains static with no build step.
- `scripts/portfolio-identity.mjs` applies metadata to static HTML and the saved
  route hydration payload together. The homepage exporter uses it before saving
  deferred scripts so hydration and later exports retain the same identity.
- Existing dedicated project images remain authoritative. C-1N, historical
  archives, old notebook evidence exports and redirects keep their identities.
- `site.webmanifest` provides browser/bookmark icons; it does not enable offline
  caching or introduce a service worker.

The image filename is versioned deliberately. If the graphic changes materially,
use a new filename in the metadata to avoid stale image caches. Platforms may
still cache an already shared page until they recrawl it after publication.

## Scope and review

This change is confined to document metadata and its authoring/export paths,
plus identity assets. Page bodies, project ordering, section grouping, hierarchy,
claims, production routing and deployment configuration are unchanged.

Review the PNG at full size and a narrow share-card width, inspect the favicon at
16, 32 and 48 pixels, and check both raw head metadata and hydrated metadata. The
existing site-integrity validation remains the repository's publication gate.
