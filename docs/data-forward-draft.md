# Data-forward portfolio draft

Draft based on portfolio commit `351ed7033932d4a5d43b9fd3a46c7d50f1fc32f2`. The featured order, grouping, and visual prominence are unchanged. This is a review artifact, not authorization to publish to main.

## Evidence for the edited copy

- [Data engineer / BI resume](https://drive.google.com/file/d/1UwdWeSL-wUSUoseUvkZZcsFxpBtjdD41/view) and [software engineer resume](https://drive.google.com/file/d/1PJAGNkRqLxwaj76y70AXxK4OZ7cZUrd7/view): independent role, education, dates, employer work, and tools. Employer metrics are user-authored, not independently checked against private employer records.
- [Indigo Circuit README](https://github.com/haidmoham/indigo-circuit/blob/main/README.md): ingestion, Glicko-2, dbt, shadow gate, direct-write fallback, and limits of experimental estimates. The draft does not treat associations as causal effects.
- [Log Pose README](https://github.com/haidmoham/log-pose/blob/main/README.md): retained source evidence and the boundary between co-listings and established relationships.
- The existing [portfolio claim audit](portfolio-claim-audit.md) records the pinned LM Lab notebook and C-1N evidence and limits. No experiments were rerun for this draft.

## Review passes

1. Credibility: retained the software engineer identity; attributed independent work separately from Microsoft and UVA; described UVA's load-time improvement as a team effort.
2. Methods: kept Indigo's experimental interval and fallback caveats, Log Pose's observation boundary, the single-batch LM Lab result, and C-1N's fixed evaluation and limits. No new experimental results were claimed.
3. Responsive/accessibility/interaction: preserve existing static markup, visual order, controls, and styles; browser verification remains required. The draft label and noindex tag are included for review.

## Local browser QA follow-up · 2026-10-27

Reviewed the exact draft files with the in-app browser at desktop (1280px) and 320px and 390px viewport overrides. Neither mobile width had document-level horizontal overflow. At 320px and 390px, the original five attention controls clipped longer labels; the draft stylesheet changes those controls to three columns at widths up to 400px. The labels now fit in their controls, and selecting a token by mouse or keyboard updates the selected state and accessible mask description. The focus outline and skip-to-work link were observed; resume navigation opened the resume page, and the Indigo contact link opened the contact form with `project=indigo` and `entry_surface=project` prefilled. No message was submitted.

Computed color checks found low-contrast small text in the existing design, including the career line (3.58:1) and evidence/limit labels. The draft stylesheet darkens those labels; a DOM-based check of visible text on solid backgrounds returned no remaining items below 4.5:1 in that scoped pass. This is not a full WCAG audit or a color-vision simulation. Selected attention state uses position, a filled button, and an accessible pressed state as well as color.

The preview switch changed to off, removed the canvas, retained the static SVG, and the accessibility tree reported the interactive controls disabled. The test did not instrument every animation loop or measure physical-device performance. An identical minified React hydration error #418 appeared on both the initial draft and the unchanged baseline served in the same browser. A temporary local diagnostic identified the Receipts card links: the static HTML combined link text that the client expects as separate text nodes. Restoring the same comment-separated text-node boundaries used by the other cards removed the error in fresh local desktop and mobile loads. The diagnostic change to the framework was discarded.

Vercel's API reported the Git preview ready. The in-app browser was redirected to Vercel login; no protected served-page or deployed desktop/mobile visual check was possible with the available browser session. No protection or account permissions were changed. There was no installed Vercel CLI or existing CLI auth file available for `vercel curl`; no credentials were created.

## Final copy pass

The hero now names the statistics background and the data pipeline, estimation, and controlled-experiment work. Log Pose and Indigo Circuit introduce their respective research questions while retaining source and inference boundaries. LM Lab is identified as AI-assisted learning; the C-1N section explicitly says the work is MuJoCo simulation, that deterministic mean evaluations share an initial state, and that hardware transfer is unproven. The checkpoint copy and synchronization remain unchanged. The [STRIDE record](https://github.com/haidmoham/spider/blob/14808d5dd08af8f003f1e445e039c588c1f55bd1/docs/checkpoints/stride.md) supplies the evaluation scope. The [LM Lab README](https://github.com/haidmoham/lmlab/blob/main/README.md) describes the learning and AI-assisted context. No private training artifacts or new experimental results were used.

## Issue acceptance checklist · data science direction

- **Implemented:** the homepage leads with data science and applied statistics, then names modeling, experimentation, evaluation, and the empirical questions. The existing independent software engineer identity and actual employer roles remain explicit.
- **Implemented within the existing hierarchy:** C-1N, LM Lab, Log Pose, and Indigo Circuit identify questions or methods and preserve their measured or observational boundaries. C-1N's fixed evaluation is simulation only; Log Pose's shared-exposure hypothesis is untested; Indigo's estimates are observational and its intervals have stated omissions.
- **Implemented as a separate artifact:** the linked data-science / applied-ML-evaluation resume is labeled draft and retains the existing three PDF links in their original order. Availability and contact copy name data science, applied ML evaluation, decision science, and engineering roles. No existing resume file is replaced.
- **Evidence gap:** Mewtwo is not part of the existing portfolio hierarchy, and an independently accessible public evaluation record was not established. No Mewtwo results or private artifacts are published in this draft. A public evidence trail and separate approval for any project prominence or ordering change would be needed before adding it to the portfolio hierarchy.
- **Preserved:** visual character and engineering depth; the eight featured project identities and order are unchanged. The work remains a draft, not a production release.
- **Verification gap:** Vercel marks the branch preview ready, but browser access reached Vercel login. Deployed content and its desktop/mobile presentation have not been inspected under an authenticated session. Local rendered checks do not prove production behavior or physical-device performance.
