# Portfolio agent instructions

This file is the canonical repository-local instruction source for `haidmoham.github.io`.

## Stack and hosting

- Static HTML/CSS/JavaScript. Do not add a build step or framework unless explicitly requested.
- Hosted on GitHub Pages from `haidmoham/haidmoham.github.io`.
- DNS is via Cloudflare with DNS-only records.
- Local folder: `C:\Users\haidm\Desktop\Claude Outputs\Portfolio-26\`. Do not use the orphaned `Desktop\Portfolio-26\` path.
- Deploy by commit and push; GitHub Pages deploys from the repository.

## Page structure

- `index.html` — hero, availability, professional record, featured projects.
- `about.html` — engineering bio, experience, education.
- `projects.html` — full project grid.
- `notes.html` — Working Notes and public engineering practice.
- `resume.html` — full work history and skills.
- `available.html` — full-time engineering role search.
- `contact.html` — contact form.

## Portfolio position and copy

- Audience: engineering hiring teams, technical peers, and collaborators.
- Position Mohammad as an engineer seeking full-time roles. Keep that as a hard constraint unless the user explicitly changes it.
- Voice: direct, confident, low-hype. Write like an engineer speaking to a peer, not recruiter-optimized copy.
- Each full project card gets a `Worth noting:` callout that identifies the engineering or analytical judgment that makes the work credible. Do not turn it into a sales pitch.

## Adding a project

1. Keep the working artifact in its own canonical repository.
2. For notebooks, export with `jupyter nbconvert --to html --embed-images` into `notebooks/`.
3. Add the project to `projects.html`, with recent work first when appropriate.
4. Include a matter-of-fact `Worth noting:` callout.
5. Promote it to the homepage only when it is significant enough to deserve featured status.
6. Commit and push.

## Explorable technical work

For robotics and other experiment-driven technical pages, use **Chris Olah-style explorable explanations** as the primary methodological precedent, with Bret Victor's explorable-explanation principle as a secondary reference. Copy the method, not their visual skin. This precedent has already been researched; do not repeat generic portfolio-inspiration research unless the user asks.

Core rule: **if an experiment has an important variable, prefer letting the reader perturb, scrub, or compare it over only explaining its effect in prose.** The visualization should carry part of the technical argument, not decorate it.

For simulator-backed work such as MuJoCo:

- Keep the experiment repository canonical for code, issue state, observations, and reasoning history. The portfolio is a distilled projection, not a second reasoning store.
- Prefer real simulator output over hand-authored motion.
- Export the smallest useful trajectory/state data from the canonical experiment, then animate it in-browser with lightweight SVG, canvas, or WebGL.
- Let the reader scrub time and switch meaningful experimental conditions when that makes the mechanism easier to understand.
- Synchronize animation, state/trajectory annotations, and reasoning so the visual evidence supports the claim directly.
- Do not fake physics in JavaScript and present it as simulator output.
- A live MuJoCo/WASM browser simulator is not required. Precomputed real physics plus an interactive renderer is the preferred default.
- Preserve reduced-motion support with a static or manually scrubbed fallback.
- Distinguish observations from interpretation and physical effects from controller-imposed behavior.

For Robotics Test Bench pages, the durable public structure is:

`Question → Prediction → Experiment → Observation → Model update`

Add a stop boundary when the canonical experiment records that further optimization would no longer produce useful learning.

Use the Robotics Test Bench visual system for every current and future test-bench page:

- Use a muted light blue-gray paper surface with a low-contrast graph-paper grid.
- Use dark blue text and links with clear reading contrast.
- Use JetBrains Mono for test-bench headings and experiment titles.
- Use the same light treatment for the Robotics entry in Working Notes so it previews the destination.
- Keep this system scoped to test-bench work. Do not apply it to the rest of the portfolio.

## Source integrity

- Public technical claims must remain traceable to their canonical project or experiment repository.
- Do not copy full agent logs, hidden reasoning, or implementation chronology into the portfolio.
- Compress reasoning for public presentation without strengthening claims beyond the evidence.
- Keep observations, interpretations, rejected explanations, and deferred tests distinct.

## End-of-task knowledge promotion

After a substantive portfolio task, preserve reusable repository-local conventions here when they are likely to matter again. Do not add one-off implementation trivia. Route broader career or portfolio lessons to the user's durable knowledge system when appropriate.

## Current project status

- **Indigo Circuit** — primary career artifact: production dbt/DuckDB data system plus Glicko-2 and Bayesian matchup modeling.
- **Social Vulnerability + Health Outcomes** — secondary career artifact: statistical analysis of CDC vulnerability indicators and health outcomes, linked to the public analysis.
- **Minesweeper** — career-facing exclusion; do not add it back to the portfolio or resume.
- Lead with Indigo Circuit and SVI until stronger authored research/ML-signal artifacts replace them.
- The current resume PDFs in `resumes/` are the source of truth for professional history, education, metrics, skills, and resume-listed project claims.
- The site uses the unified identity `Data & Software Engineer`.
- Seekho remains secondary full-stack product evidence; do not frame it as the primary AI/ML credential.
- Contact and availability details are site-owned operational facts.
