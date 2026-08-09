# Portfolio agent instructions

This file defines repository-specific rules for `haidmoham.github.io`. Global agent instructions also apply.

## Site boundaries

- Keep the site static HTML, CSS, and JavaScript. Do not add a framework or build step unless the user asks.
- GitHub Pages deploys from `haidmoham/haidmoham.github.io`.
- Commit and push only when the user authorizes publication.

## Position and copy

- Write for engineering hiring teams, technical peers, and collaborators.
- Position Mohammad as an engineer seeking full-time roles unless the user changes that direction.
- Use direct, matter-of-fact, engineering-first language. Do not write recruiter-focused or sales copy.
- Give each full project card a concise `Worth noting:` callout about the judgment that makes the work credible.

## Projects and evidence

- Keep the working artifact in its canonical repository. The portfolio is a distilled projection.
- Public technical claims must remain traceable to canonical code, issues, or experiment records.
- Do not copy full logs, hidden reasoning, or implementation chronology into the portfolio.
- Keep observations, interpretations, rejected explanations, and deferred tests distinct.
- For notebooks, export with `jupyter nbconvert --to html --embed-images` into `notebooks/`.

## Experiment-driven pages

- Use real simulator output when it is available. Do not present browser-rendered motion as physics simulation.
- Let readers scrub or compare an important experimental variable when that makes the evidence clearer.
- Preserve reduced-motion support.
- Distinguish physical effects from controller-imposed behavior.
- Use `Question → Prediction → Experiment → Observation → Model update` for Robotics Test Bench pages. Add a stop boundary when the experiment records one.

## Robotics Test Bench visual system

- Use a muted light blue-gray paper surface with a low-contrast graph-paper grid.
- Use dark blue text and links with clear reading contrast.
- Use JetBrains Mono for test-bench headings and experiment titles.
- Give the Robotics entry in Working Notes the same light treatment.
- Scope this system to test-bench work.
