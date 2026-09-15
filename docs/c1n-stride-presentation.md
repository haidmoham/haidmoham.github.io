# C-1N STRIDE presentation — 2026-09-15

The public homepage and C-1N destination feature the exact ten-second four-pane film from the robotics repository. The destination retains the /c1n redirect to c1n.mhaider.dev. Its blue/white page uses the homepage's Manrope type, wide whitespace, thin dividers, lowercase interface and direct navigation. The design uses a visible portfolio return and stable disclosure for the historical checkpoint explorer. These are adapted first-party interaction ideas; no external component code or private library content is published.

## Evidence and media

Canonical capability: [STRIDE record](https://github.com/haidmoham/spider/blob/14808d5dd08af8f003f1e445e039c588c1f55bd1/docs/checkpoints/stride.md).
Canonical render: [four-checkpoint renderer](https://github.com/haidmoham/spider/blob/14808d5dd08af8f003f1e445e039c588c1f55bd1/scripts/render_walk_four_checkpoint_demo.py).

`assets/c1n/walking-comparison.mp4` is the unchanged exported film. Its poster is the 1.4-second frame. `walk-fast-500.mp4` crops the bottom-right 540×426 pane at x=540,y=704, preserving ten seconds, fifty frames per second, and normal playback. No interpolation, policy execution or new measurement is involved. The manifest records that clip's hash and identifies STRIDE as a recorded native policy, not a browser physics port. Native video controls support pause, seek and fullscreen. Playback is opt-in and media uses preload=none.

## Homepage export

The site's deployed source of truth is static main. The available local portfolio-redo authoring draft predates the current deployed export. Its C-1N component/content were updated, but rebuilding that entire older draft would overwrite subsequent unrelated homepage work. This change therefore updates only the current generated C-1N component and matching server-rendered markup, and uses a versioned page module with the original shared entry URL. Changing the entry URL would let lazy imports start a second application runtime. It retains the complete existing hydration bootstrap and all other current project copy. A future full export must incorporate this C-1N video/content change in its current authoring source. Copy the media into the source public/assets/c1n directory and preserve c1n-feature.css. Do not import the stale draft wholesale.

## Reproduce the isolated STRIDE video

```sh
ffmpeg -i assets/c1n/walking-comparison.mp4 -vf crop=540:426:540:704 -an -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart assets/c1n/walk-fast-500.mp4
```

Check the homepage with previews on and off, native video playback and seeking, 320px and desktop layouts, and all four checkpoint selector options. Historical simulations are loaded only after the explorer is opened; collapsing it stops playback. No physical-device performance claim is made.

## Automatic homepage updates

The canonical robot repository publishes `public/checkpoint.json` with the selected accepted checkpoint, its source revision, generated measurement copy, limits, and SHA-256 identities for the matching demo/poster. `scripts/export_checkpoint_feed.py --check` in that repository verifies the saved weights and exported record. It never chooses a promotion or runs a policy.

This site's `Refresh canonical C-1N checkpoint` workflow checks hourly, at minute 37, and supports manual dispatch. `scripts/sync-c1n-checkpoint.py` validates the record and downloads/hash-checks both media files before publishing `assets/c1n/checkpoint.json` and the marked homepage content. Bad feeds retain the last verified content. The browser uses local synchronized media, so the site's same-origin policy remains intact. The static homepage remains readable without JavaScript. This is a publication feed, not a live display of incomplete training runs.

Future checkpoint publication must include its matching demo and accurate scope in the canonical selection. The current STRIDE explorer entry intentionally stays tied to the preserved `walk_fast_500` native replay; historical dropdown entries are not renamed when a later checkpoint becomes the homepage feature.

## live STRIDE integration

The checkpoint explorer defaults to the real `walk_fast_500` mean policy in MuJoCo WASM. Source: `haidmoham/spider-web/stride`. The comparison film stays separate. The full saved model includes six legs, black armor, red breathing lights, and gravity-aware cosmetic pupils. Browser inference runs every ten 2 ms physics steps, independent of rendering. Reset restores the exported initial state and controller memory.

Validation: 250 native control states (five seconds), maximum target error 1.19e-7 rad, WASM qpos error 1.21e-6 and qvel error 5.46e-5, no fall, repeatable reset. These are implementation checks, not new population robustness evidence.
