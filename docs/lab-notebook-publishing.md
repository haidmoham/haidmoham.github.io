# lab notebook publication

The portfolio is a static projection of canonical notebooks, not another research system.

## current preview

- `/notes.html` is the entry point; `/labs/lmlab/` and `/labs/robotics/` are dedicated spaces.
- Six public lmlab notebooks are pinned to commit `7e31866dc2ed1e921f19cb30fed713d54afed2e4` and exact SHA-256 hashes in `labs/lmlab/publication.json`.
- Code is folded. Retained output blocks are preserved and labeled. Export never executes a notebook.
- Robotics keeps its existing six experiment records and stable notebook URLs; no public experiment ordinal changes.
- The reader borrows the question/evidence/provenance presentation from MyST-style research articles, without adding a second website framework.

## update boundary

A notebook edit alone is not permission to publish. The source repository's publication manifest must mark the exact notebook bytes publishable, with a pinned commit and hash. Unmarked entries are excluded. Hash mismatches fail before output is written.

The publishing plumbing can render source with:

```
python -m pip install -r scripts/notebook-requirements.txt
python scripts/render-lab-notebooks.py --source /path/to/lmlab
python scripts/render-lab-hubs.py
python scripts/test_lab_notebooks.py
python scripts/validate_site.py
```

This preview does not activate a scheduled sync on production. A source-owned publication manifest and an automated pull workflow remain to be connected before calling automatic updates live.

## preview hosting

`vercel.json` serves the independent C-1N site and must remain unchanged on the portfolio's production branch. `vercel.preview.json` is the isolated portfolio preview configuration. A preview deployment must explicitly select it or use a deployment-only branch with that file copied to `vercel.json`. Do not merge that deployment override into main.

No new credentials are needed to render public notebooks. No notebook cells, GPU commands, or training jobs run in the publication process.
