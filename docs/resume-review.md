# resume revision review

## purpose

the two public resumes now make recent independent work visible without changing the professional record or asserting outcomes that have not been observed.

## reader path

before this revision, the production resume reached a single Indigo Circuit entry only after nine experience bullets. the simulation resume led with C-1N but gave no second independent project. a reader could see established employment evidence, but had little way to scan the range of current technical work from either PDF.

after this revision, both one-page resumes retain the Microsoft and University of Virginia record while presenting two selected projects:

- production software engineering: Indigo Circuit and C-1N + Robotics Test Bench
- simulation and scientific computing: C-1N + Robotics Test Bench and Indigo Circuit

the independent entries are explicitly dated as 2026 work. the lane difference comes from ordering, emphasis, skills, and the first project rather than from creating a third near-duplicate resume.

## claim audit

| claim | source evidence |
| --- | --- |
| Indigo Circuit rebuilds dbt models in a shadow DuckDB database, validates them, and promotes atomically | [Indigo Circuit source](https://github.com/haidmoham/indigo-circuit) and its [public project record](https://mhaider.dev/projects.html#work-indigo) |
| Indigo Circuit computes Glicko-2 ratings and Bayesian expected-value estimates with 90% credible intervals | [Indigo Circuit source](https://github.com/haidmoham/indigo-circuit) and its [public project record](https://mhaider.dev/projects.html#work-indigo) |
| C-1N expanded from 12 to 18 actuated joints through six orthogonal coxa hinges | [C-1N morphology change](https://github.com/haidmoham/spider/commit/2cf9513) |
| C-1N standing and disturbance bullets | [C-1N recorded baseline](https://github.com/haidmoham/spider/tree/001be66), [public C-1N runtime](https://c1n.mhaider.dev/), and the maintained simulation Drive resume |
| Microsoft and University of Virginia bullets | maintained Drive resumes and the [public production record](https://mhaider.dev/projects.html) |

the previous causal wording about outward bracing was removed because the public source supports the extra degree of freedom but not that causal conclusion.

## why projects received more space

the current PDFs originally allocated nine bullets to employment and two to independent work in production, and three project bullets in the simulation lane. the revision gives each lane two project entries and keeps the strongest employment evidence: the Microsoft migration, verification, and performance results; UVA stakeholder delivery and performance work. this is enough project space to demonstrate active technical range while preserving the institutional outcomes that are most legible in an initial hiring scan.

## verification

- canonical Drive documents updated and read back:
  - [production lane](https://docs.google.com/document/d/1sxpGTIRgP73iiwnhqCu1bFKPNq3EpKuVRkWM28ZJatM/edit)
  - [simulation lane](https://docs.google.com/document/d/1TK1O0Ov6wwTcjEi8m0JrBgpl7wJNopttVpFjIdiy2OY/edit)
- exported [production](https://mhaider.dev/resumes/Mohammad_Haider_Production_Software_Engineering_Resume.pdf) and [simulation](https://mhaider.dev/resumes/Mohammad_Haider_Simulation_and_Scientific_Computing_Resume.pdf) PDFs are each one US-letter page; text extraction contains the name, project headings, and links.
- rendered PDF pages were visually inspected for clipping, orphaned entries, and hierarchy.
- `python3 scripts/validate_site.py` passed after the refreshed PDFs and the [public resume page](https://mhaider.dev/resume.html) copy update.

## limitation

this changes what a reader can inspect. it does not prove an increase in interview requests or inbound conversations; the site measurement path records those outcomes separately.
