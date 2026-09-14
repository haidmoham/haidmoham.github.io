# Engineering resume source

The current downloads come from [Engineering Resumes on Drive](https://drive.google.com/drive/folders/14srvG8qd7QSlCOLXP4oA9s5iatlc7zL6), release 2026-09-14, revision 2. The canonical software engineer PDF is the first choice on `/resume.html`; data-platform and AI/research-tooling versions change emphasis while retaining the shared professional record.

`scripts/sync_resumes.py` maps the three stable Drive PDF IDs to public filenames. The hourly `resume-sync.yml` workflow downloads those exact PDF bytes, validates all three before replacing any, then publishes changed files. Update the existing Drive files in place to retain automatic sync. If a file ID changes, update the mapping and verify its public Viewer access. The folder, Word sources, and source records do not need public access. The workflow no longer uses the old Google Docs ID secrets.

Revision 2 SHA-256 checksums, verified against the Drive routing record:

| file | SHA-256 |
| --- | --- |
| `Mohammad_Haider_Software_Engineer_Canonical.pdf` | `e703e227414206cde7c42f0e142f97783284e543e034816abbc7fa8e5c2f77c2` |
| `Mohammad_Haider_Data_Platform_Engineer.pdf` | `eff93c5682e429a24ab9fae3eb5693aa42c731eb3f42aa55b2c3bdfca3932ca6` |
| `Mohammad_Haider_AI_Research_Tooling.pdf` | `1854e99358959f403298ca3c2efae3b3932d0ebcb8591987b74ca8f736e90039` |

The two older PDF filenames remain available for existing links. They are historical copies and are no longer synced or offered by the resume chooser. Do not substitute a local download pack without verifying its hashes against the intended Drive release.
