# interview and collaboration surface review

## objective and scope

make the same body of work understandable to several kinds of hiring teams and technical peers, then learn from substantive responses. this revision does not infer a winning career lane or claim improved hiring outcomes.

## before and after

baseline: live mhaider.dev and origin/main at 63f6ce1, inspected on 2026-09-12. the existing homepage already had direct resume and email links, seven featured projects, recorded notebook evidence, and interactive graphics. its featured sequence began with robotics and language models, and the contact invitation named data/analytics/platform/backend/full-stack.

| reader task | before | revised path |
| --- | --- | --- |
| understand availability | professional history and broad recent work; no explicit opening availability line | explicit full-time engineering and technical-collaboration availability in the opening section |
| find relevant work | scroll through the fixed project sequence | three topic entry pages linked near the start of selected work, with the full collection preserved |
| forward useful evidence | send the complete homepage or find an existing notebook | standalone production, simulation, and creative pages with source/demo/record links, canonical metadata, and crosslinks |
| discuss one project | navigate to generic email/contact | project-specific contact links prefill an editable project context |
| start a broader conversation | role list in footer | invitations to discuss a role, compare notes, or make a connection |
| understand current model evidence | historic LM outputs could read as the entire current project | preserved revision explicitly labeled; current transformer components distinguished from historic results |

this is a source and rendered-interface assessment, not a human reader study. the opening exposes identity, prior employers, availability, resume, contact, and project path without requiring interaction. no measured 20-second comprehension result is claimed.

## claim audit

- employment outcomes retained from existing career documents and public experience records; no new numerical claim. professional work remains separate from independent projects.
- C-1N stays at the recorded stationary stance boundary. canonical source: https://github.com/haidmoham/spider. walking and robust recovery are not claimed.
- robotics figures remain the retained reviewed records. no new notebook execution or evidence promotion. source: https://github.com/haidmoham/robotics-test-bench.
- LM notebook example links remain pinned at 19222f1. current source includes transformer comparisons; the current post-norm notebook is not represented as a new training result. source: https://github.com/haidmoham/lmlab, including experiments/attention-resume.md.
- Indigo's validated database promotion and statistics are supported by https://github.com/haidmoham/indigo-circuit.
- Fourier reconstruction, Jellyfish audio/visual separation, Tiramisu reader fallback, and Magnet desktop features retain existing supported scope and canonical source links.
- source changes were independently reviewed; a simulation-page inquiry initially defaulted to Robotics Test Bench even though the page also covers C-1N and LM Lab. that misleading default was removed.

## measurement

see opportunity-measurement.md. contact-page entry surface is separate from original discovery. actual messages and interview invitations are outcomes; navigation clicks and test submissions are not. no historical inbound baseline or traffic denominator has been established. compare actual conversations over comparable periods and account for changes in distribution before inferring effectiveness.

## philosophical interpretation

Graham's discussion of curiosity and trying different work supports keeping distinctive interests visible: https://www.paulgraham.com/greatwork.html. Hamming's open-door argument suggests creating opportunities for useful outside conversations: https://www.cs.virginia.edu/~robins/YouAndYourResearch.html. these are design interpretations, not empirical evidence that a particular site layout increases interviews. the site carries concrete work and invitations, not quotations or borrowed persona.

## mobile and runtime verification

- responsive browser checks at 320px and 390px, plus a 1280px desktop view. the homepage has 24px narrow-screen reading gutters and no document overflow at 320px. resume cards use 16px cream text and the same phone gutters.
- keyboard skip link reaches selected work. project routes, editable contact context, resume navigation, and header preview switching were checked in the in-app browser. no real contact message was sent.
- capable browsers automatically enable interactive previews. a compact accessible header switch removes the animated components and shows static project previews when turned off. the initial static document remains usable if the browser cannot load the runtime.
- 78 contact, field, and enhancement tests pass; site integrity and diff whitespace checks pass. the source production build and TypeScript check pass. changed-source lint passes; full-source lint has pre-existing findings in archived/UI components.
- no physical 2017 phone test or network-throttled performance claim is made. interactive previews now default on at the user’s request; the header switch lets readers stop their rendering work.

## source and export

canonical production deployment remains the GitHub repository main branch. the homepage source is the existing portfolio-redo Sites project; the local source draft is in the adjacent portfolio-redo-source checkout. its public directory contains the revised standalone pages and resumes. build that source, start the matching production build, and run scripts/export-homepage.mjs with the source dist/client directory and server URL. this preserves standalone pages and the unsupported-browser fallback.

the tiramisu plate now shows a five-word excerpt from This Modern Love by Bloc Party, in a live derived lyric-reader preview linked to the verified track route. the full song lyrics are not embedded.

The live Tiramisu preview derives its five-blob field from `src/presentation/AmbientCanvas.tsx` at Tiramisu commit `7219ec9204b843d4043b77a7ddd3cb81df43f8f8`, using the reader’s Quicksand 500 typography and glass treatment. Canvas work is scoped to the preview and removed when offscreen or disabled. Virginia Tech colors follow https://brand.vt.edu/identity/color.html: Chicago maroon and the darker impact orange for digital text; the phrase links to https://en.wikipedia.org/wiki/Virginia_Tech.

## representative previews and recent work

Mural replaces Magnet in the featured seven; Magnet retains its archive record. Mural code at revision `4a654de` uses Railway SQLite (D1 is rollback infrastructure). The preview is a composed excerpt of approved public strokes fetched from https://mural.shin86.dev/api/marks on September 12, 2026, preserving the contributor names and original strokes. Its caption identifies the excerpt. Indigo uses the product’s own https://indigocircuit.app/og-image.png?v=ghost-woods-2 image, captured the same day, rather than an invented pipeline illustration. The header switch freezes Jellyfish’s real renderer and disables Fourier/attention controls.
