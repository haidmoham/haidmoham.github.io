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

## C-1N

- The public robot identity is **C-1N**. The old name Spider is legacy only.
- The canonical portfolio route is `/c1n/`. Keep `/spider/` only as a compatibility redirect or asset namespace.
- Existing `spider-*` CSS classes, JavaScript filenames, model paths, and the `haidmoham/spider` repository slug may remain as implementation compatibility identifiers. Do not expose them as the robot's public name except when provenance requires the literal repository or path.
- Public checkpoints use `C-1N // NN · CODENAME`.
- The current checkpoint is `C-1N // 01 · SHUFFLE`.
- `C-1N // 02 · FRAME` and `C-1N // 03 · STRIDE` are reserved future boundaries. Do not present them as completed before the canonical evidence exists.
- Preserve prior checkpoints in the browser artifact when possible so behavior, instrumentation, and control changes remain directly comparable over time.

## Experiment-driven pages

- Use real simulator output when it is available. Do not present browser-rendered motion as physics simulation.
- Let readers scrub or compare an important experimental variable when that makes the evidence clearer.
- Preserve reduced-motion support.
- Distinguish physical effects from controller-imposed behavior.
- Use `Question → Prediction → Experiment → Observation → Model update` for Robotics Test Bench pages. Add a stop boundary when the experiment records one.

## Robotics Test Bench publication order

- Keep source issue identity separate from public experiment order.
- A source issue number is provenance only. It must not reserve or determine a public experiment number.
- Assign public experiment numbers contiguously from eligible experiment completion chronology. Prefer the commit that records the resolved boundary; use the dated experiment record as the fallback.
- If two experiments resolve on the same date, compare their completion commits. Unresolved or skipped issues create no public gap.
- Show the source issue separately in each page's provenance.
- For new pages, use the public experiment number in the visible label and filename prefix.
- Once a public URL exists, preserve it. If an old URL encoded the wrong public number, create the corrected URL and retain the old URL as a compatibility redirect.
- The index, page label, and canonical URL must agree on the public experiment number.

## Robotics Test Bench visual system

- Use a muted light blue-gray paper surface with a low-contrast graph-paper grid.
- Use dark blue text and links with clear reading contrast.
- Use JetBrains Mono for test-bench headings and experiment titles.
- Give the Robotics entry in Working Notes the same light treatment.
- Scope this system to test-bench work.
