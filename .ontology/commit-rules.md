# Commit ontology contract

Use the installed `commit-boundary` skill before landing or publishing commits that change public technical claims, experiment ordinals, C-1N checkpoint state, or source provenance.

## Blocking invariants

- Public technical claims must remain traceable to canonical code, issues, experiment records, or other source evidence.
- Do not promote agent output, browser-rendered behavior, or interpretation into experimental evidence.
- Keep observation, interpretation, rejected explanation, and deferred test distinct.
- Keep Robotics Test Bench source issue identity separate from public experiment order.
- Assign public experiment ordinals from eligible experiment completion chronology. Do not reserve gaps for unresolved or skipped issues.
- For a robotics experiment page, the index, visible experiment label, and canonical URL must agree on the public ordinal.
- Preserve an existing public URL. If an ordinal correction requires a new URL, keep the old URL as a compatibility redirect.
- Do not advance a C-1N checkpoint beyond the canonical robot repository evidence.
- Keep C-1N checkpoint naming consistent with the canonical robot repository. Legacy `spider` names may appear only where compatibility or literal provenance requires them.
- Do not copy full agent logs or hidden reasoning into the public projection.

## Publication boundary

A commit that changes a public claim, checkpoint, or experiment ordinal is not ready until the corresponding canonical evidence has been inspected and the provenance link is present.
