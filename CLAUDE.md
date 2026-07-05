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

- `index.html` — hero, availability tagline, stats, "What I Do" (3-col services), featured projects
- `about.html` — bio threading job-search + consulting audiences, experience, education
- `projects.html` — full grid; most recent work first (AI pipeline card is currently #1)
- `resume.html` — full work history + skills
- `work-with-me.html` — consulting services, fit checklist, 3-step process, CTA
- `contact.html` — contact form

---

## Copy Conventions

**Audience:** dual — recruiters (job search) and potential consulting clients. Thread both; don't collapse one.

**Project cards:** each card in `projects.html` gets a "Worth noting:" callout at the bottom. Tone is matter-of-fact observation about the work — not a sales pitch, not "if you need X I can do Y." Example: *"Raw data in a warehouse doesn't help anyone. These pipelines turned hundreds of petabytes of noise into something the accounting team could actually use."*

**Voice:** direct, confident, low-hype. Reads like a senior engineer talking to a peer, not a recruiter-optimized resume.

---

## Adding a New Project

1. Build in its own repo, push to GitHub public
2. For notebooks: `jupyter nbconvert --to html --embed-images` → place in `notebooks/`
3. Add card to `projects.html`, most recent work first
4. Include "Worth noting:" callout (see tone above)
5. If significant enough, promote to featured grid on `index.html`
6. Commit + push

## End-of-task knowledge promotion

After each substantive portfolio task, ask whether the work revealed a reusable
site convention, deployment gotcha, copy pattern, asset pipeline, or portfolio
positioning lesson. If yes, preserve repo-local details here and route broader
career/portfolio lessons to `~/brain` via `/librarian` or `/codify`. If no,
no-op quietly.

---

## Current Project Status

**AI Image Generation Pipeline** — active, on portfolio, no GitHub link yet  
**Social Vulnerability + Health Outcomes** — Phase 1 published, recruiter-ready, linked to notebook + GitHub  
**Crime Prediction RNN / COVID Sentiment** — older work, on portfolio, no active development
