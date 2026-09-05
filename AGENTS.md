# Portfolio agent instructions

This file defines repository-specific rules for `haidmoham.github.io`. Global agent instructions also apply.

## Site boundaries

- Keep the site static HTML, CSS, and JavaScript. Do not add a framework or build step unless the user asks.
- `main` in `haidmoham/haidmoham.github.io` is the only deployment source of truth.
- Railway deploys `mhaider.dev` from `main` with `Dockerfile`, `railway.json`, and `railway-nginx.conf.template`. Vercel deploys `c1n.mhaider.dev` from the same commit with `vercel.json`. Preserve these files.
- GitHub Pages also deploys from `main` as a static mirror. Do not treat the Pages deployment as the production authority for `mhaider.dev`.
- A normal publish is one commit and one push to `main`. Do not copy site files between hosts or make host-only edits.
- Keep the C-1N browser runtime, models, and vendored Wasm under `spider/`. Keep `c1n.mhaider.dev/` as the public document route and both `mhaider.dev/c1n` forms as permanent redirects.
- Run `python scripts/validate_site.py` before publication. This check protects the C-1N route, checkpoint models, Wasm MIME configuration, and Railway CSP support.
- Commit and push only when the user authorizes publication.
- For a vetted portfolio post, completed content and visual review is publication authorization: commit and push that post’s scoped change without asking for a separate confirmation, unless the user says to hold it.
- Before landing or publishing a commit that changes public technical claims, experiment ordinals, C-1N checkpoint state, or source provenance, use the installed `commit-boundary` skill with `.ontology/commit-rules.md`.
- If a required skill or policy tool is unavailable, resolve that dependency from its canonical source before the gated action when authorization allows; then run the required check. Do not silently substitute for a publish or semantic-review gate.

## Position and copy

- Write for engineering hiring teams, technical peers, and collaborators.
- Position Mohammad as an engineer seeking full-time roles unless the user changes that direction.
- Use **software engineer** as the canonical portfolio identity line; tell the applied mathematics story through concrete work; keep role labels, job titles, resume lane names, and evidence descriptions specific to their contexts.
- Use direct, matter-of-fact, engineering-first language. Do not write recruiter-focused or sales copy.
- Describe each project with concrete implementation, evidence, and current limits. Preserve lowercase authored interface copy.

## Projects and evidence

- Keep the working artifact in its canonical repository. The portfolio is a distilled projection.
- Public technical claims must remain traceable to canonical code, issues, or experiment records.
- Do not copy full logs, hidden reasoning, or implementation chronology into the portfolio.
- Keep observations, interpretations, rejected explanations, and deferred tests distinct.
- For notebooks, export with `jupyter nbconvert --to html --embed-images` into `notebooks/`.

## C-1N

- The public robot identity is **C-1N**. The old name Spider is legacy only.
- The canonical public route is `https://c1n.mhaider.dev/`. Keep `/spider/` only as an asset namespace and keep the old `mhaider.dev/c1n` route as a compatibility redirect.
- Existing `spider-*` CSS classes, JavaScript filenames, model paths, and the `haidmoham/spider` repository slug may remain as implementation compatibility identifiers. Do not expose them as the robot's public name except when provenance requires the literal repository or path.
- Public checkpoints use `C-1N // NN · CODENAME`.
- `C-1N // 00 · SPAWN` is the historical deterministic six-foot spawn baseline.
- `C-1N // 01 · SHUFFLE` is the preserved locomotion-failure baseline.
- The current checkpoint is `C-1N // 02 · STAND`.
- `C-1N // 03 · STRIDE` is a reserved future boundary. Do not present it as completed before the canonical evidence exists.
- Task-space instrumentation may integrate between checkpoints; `FRAME` is not a checkpoint name.
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

- Use the approved charcoal and lime lab treatment, with readable notebook evidence and scoped monospace instrumentation.
- Keep the lab subordinate to the software engineering portfolio.
- Give the Robotics entry in Working Notes the same scoped treatment.
- Scope this system to test-bench work.
