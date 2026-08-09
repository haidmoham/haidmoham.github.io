# CLAUDE.md — haidmoham.github.io (Portfolio Site)

Global identity/background context is in `~/.claude/CLAUDE.md`. This file covers portfolio-specific conventions only.

---

## Stack & Hosting

- Static HTML/CSS, no build step
- Hosted on GitHub Pages (repo: `haidmoham/haidmoham.github.io`)
- DNS via Cloudflare (4 A records + 1 CNAME, all "DNS only" gray cloud)
- Local folder: `C:\Users\haidm\Desktop\Claude Outputs\Portfolio-26\` — **not** the orphaned `Desktop\Portfolio-26\`
- Deploy: commit + push → GitHub Pages auto-deploys in ~60 sec

---

## Page Structure

- `index.html` — hero, availability tagline, professional record, featured projects
- `about.html` — engineering bio, experience, education
- `projects.html` — full grid; most recent work first (AI pipeline card is currently #1)
- `resume.html` — full work history + skills
- `available.html` — full-time engineering role search
- `contact.html` — contact form

---

## Copy Conventions

**Audience:** engineering hiring teams, technical peers, and collaborators. Position Mohammad solely as an engineer seeking full-time roles; that positioning is a hard constraint.

**Project cards:** each card in `projects.html` gets a "Worth noting:" callout at the bottom. Tone is matter-of-fact observation about the work — not a sales pitch, not "if you need X I can do Y." It should identify the engineering or analytical judgment that makes the project credible.

**Voice:** direct, confident, low-hype. Reads like a senior engineer talking to a peer, not a recruiter-optimized resume.

---

## Adding a New Project

1. Build in its own repo, push to GitHub public
2. For notebooks: `jupyter nbconvert --to html --embed-images` → place in `notebooks/`
3. Add card to `projects.html`, most recent work first
4. Include "Worth noting:" callout (see tone above)
5. If significant enough, promote to featured grid on `index.html`
6. Commit + push

## Robotics Test Bench publishing convention

The public `/robotics/` area is a distilled projection of `haidmoham/robotics-test-bench`, not a second reasoning store. Each experiment page follows: Question → Prediction → Experiment → What happened → Model update → optional stop boundary → Source. Link the canonical issue and experiment directory, label observations separately from interpretation, and keep full logs and implementation history in the source repository.

## End-of-task knowledge promotion

After each substantive portfolio task, ask whether the work revealed a reusable
site convention, deployment gotcha, copy pattern, asset pipeline, or portfolio
positioning lesson. If yes, preserve repo-local details here and route broader
career/portfolio lessons to `~/brain` via `/librarian` or `/codify`. If no,
no-op quietly.

---

## Current Project Status

**Indigo Circuit** — primary career artifact: production dbt/DuckDB data system plus Glicko-2 and Bayesian matchup modeling
**Social Vulnerability + Health Outcomes** — secondary career artifact: statistical analysis of CDC vulnerability indicators and health outcomes, linked to the public analysis
**Career-facing exclusion:** Minesweeper is a fun collaboration with a friend, not a durable career artifact; do not add it back to the portfolio or resume
**Interim rule:** lead with Indigo Circuit and SVI until stronger authored research/ML-signal artifacts replace them

**Career-source rule (August 2026):** the four current resume PDFs in `resumes/` are the source of truth for professional history, education, metrics, skills, and resume-listed project claims. The site uses the unified identity “Data & Software Engineer.” Seekho remains an explicit secondary exception as full-stack product evidence; it should not be framed as the primary AI/ML credential. Contact and availability details are site-owned operational facts.
