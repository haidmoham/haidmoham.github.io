# Portfolio integration

The approved portfolio source is maintained in the portfolio-redo Sites project. Production at mhaider.dev remains a complete static document with local hashed assets. scripts/import-portfolio.mjs imports a production HTTP response and its explicit asset directories. It preserves the hydration bootstrap. Never import development HTML or only a DOM snapshot.

The primary routes are /, /projects.html, /about.html, /notes.html, /resume.html, /contact.html, and /available.html. Robotics remains a subordinate lab at /robotics/. Existing /archive/ and /legacy/field/ preserve the prior interaction and content. Both named resume PDFs remain in /resumes/. Contact retains the same Formspree destination with native POST fallback and a local enhancement script.

The implementation reuses the approved portfolio's typography, color field, and project disclosure. The lab has its own scoped charcoal and lime treatment. Existing experiment ordinals, source revisions, and supported conclusions remain the publication boundary. Git activity updates independently; see project-state.md.

Validation: scripts/validate_site.py checks the integrated routes and local assets plus the existing C-1N hosting and checkpoint invariants. The field tests now target the preserved archive page and work on Windows and Linux. C-1N runtime, models, and hosting routes are unchanged.
