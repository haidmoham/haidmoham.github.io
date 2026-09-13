# portfolio claim audit — 2026-09-13

scope: all 17 project entries on `/projects.html` (18 source projects because robotics combines two), the homepage’s seven featured and eight supporting entries, the three `/work/` pages, and repeated project blurbs in the accessible archive. the portfolio baseline is `58d9071d9bcf80c3efa050429287b986f37865ec`. project implementation was not changed. original notebook exports are evidence records, not rewritten project summaries.

**supported** means the specified implementation or recorded output was inspected. it does not mean every platform, provider, deployment, or experiment was rerun. **corrected** identifies a mismatch and its replacement. **unverified** identifies a remaining observation gap and must not be read as a passing test. numerical notebook results below are recorded outputs, not new experimental findings.

## claim dispositions

### tiramisu — corrected

source: [7219ec9](https://github.com/haidmoham/tiramisu/tree/7219ec9204b843d4043b77a7ddd3cb81df43f8f8).

| claim | disposition and evidence |
| --- | --- |
| timed lyrics / timed text | corrected to plain-text lyric sheets. `src/domain/lyrics.ts` defines `LyricLine` as id and text, without timestamps; `LrcLibLyricsProvider.ts:normalizeSyncedLyrics` strips timestamps. `presentation/LyricReader.tsx` uses scrolling and element bounds, not a playback clock. |
| lyric annotations | corrected to public song comments in a separate panel. `comments/CommentsPanel.tsx` contains song-level Genius comments; `App.tsx` switches Lyrics/Comments panels. no line annotation mechanism is present. |
| keyboard navigation | supported for the Lyrics/Comments tab controls (`App.tsx:handleReaderTabKeyDown`, arrows/Home/End). removed the broad headline claim to avoid implying timed-line navigation. |
| shared lookup state | supported by `app/lookupReducer.ts`, `App.tsx:useReducer`, and provider interface in `domain/lyrics.ts`; replaced implementation detail with reader functionality in the blurb. |
| webgl field and text fallback | supported by `presentation/AmbientCanvas.tsx`, the separate semantic reader, and `App.tsx` canvas-availability fallback. |
| searchable sheets and focus reading | supported by search/provider wiring and `App.tsx:setFocus`. live “Melancholy” opened 42 reader lines; clicking focus reading set `data-focus=true` while retaining those lines. no audio/video element was present. |
| featured “This Modern Love” route | unverified availability: opening the actual featured result returned “That lyric sheet could not be found.” the second featured song loaded. this is a track lookup failure, not evidence that all lookup is broken. the preview link now opens the verified search page and says “open tiramisu”; no provider fix is included. |

### indigo circuit — corrected

source: [79e22b9](https://github.com/haidmoham/indigo-circuit/tree/79e22b91a8a4b5592a7b0096e25d04720de319e2).

| claim | disposition and evidence |
| --- | --- |
| tournament data, player ratings, Python/DuckDB/dbt/Flask | supported by `ingest/labs.py`, `ingest/load.py`, `ingest/glicko.py`, `transform/dbt_project.yml`, and `dashboard/app.py`. |
| nightly pipeline | supported as implemented scheduling: `dashboard/app.py:_start_scheduler` triggers at 06:00 UTC; `railway-pipeline.toml` also declares a daily cron. no claim that tonight’s job has succeeded. |
| all rebuilds validated before promotion | corrected. `_run_pipeline` creates and checks a shadow copy before `os.replace`, but falls back to direct live writes on first boot/copy failure. copy now explicitly acknowledges the fallback. `dashboard/pipeline_gate.py:validate_shadow` supplies the checks. |
| Glicko-2 ratings | supported by `ingest/glicko.py` and its invocation from pipeline code. |
| Bayesian expected value / sparse-data shrinkage | supported by `dashboard/ev.py:_make_prior`, `_posterior`, `_card_matchup_ev`, and `compute_list_ev`; empirical-Bayes priors use archetype matchup baselines. interpreted as experimental estimates, not measured causal effects or tournament predictions. |
| 90% credible intervals | corrected to approximate 90% model intervals. `dashboard/templates/ev_lab.html` uses `1.645 * std` and explicitly excludes baseline uncertainty and dependence between cards. portfolio wording now preserves those limitations. |

### social vulnerability & health — corrected

source: [1c783c9 notebook](https://github.com/haidmoham/social-impact-analysis/blob/1c783c91c1d350f03946f0c653d89fe615c937de/notebooks/01_phase1_foundation.ipynb). cell indices here are zero-based.

| claim | disposition and evidence |
| --- | --- |
| 16 vulnerability indicators analyzed | corrected to overall SVI and four theme rankings. code cell 7 selects five `RPL_*` rankings, not the 16 underlying indicators. |
| 36 health outcomes analyzed | corrected to six selected measures. cell 10 selects DIABETES, MHLTH, CHD, OBESITY, CSMOKING, and BPHIGH. the raw source output lists 40 measures, but the analysis does not use all of them. |
| roughly 73,000 census tracts | corrected to 78,815 joined tracts in the recorded output of cell 12. the notebook’s hard-coded prose/plot title says 73,000 and conflicts with its output. this is the join count, not a claim that every pairwise correlation uses every row. |
| correlations, scatterplots, state rankings | supported, made precise: cell 15 correlation heatmap, cell 17 diabetes scatterplot, cell 20 sorted within-state correlations. state interpretation is explicitly deferred in the notebook. |
| national choropleth / geopandas | corrected: introductory prose promises a map, but no map-producing code or map output exists; imports use pandas, NumPy, matplotlib, and seaborn. removed choropleth claim and changed the stack label to seaborn. |
| observational, not causal | supported by the analysis design: joined observational tract data and Pearson correlations, without a causal identification strategy. source notebook prose and original exported figures remain historical records; this audit does not endorse their inconsistent captions. |

### fourier drawing — corrected

source: [8a42f47](https://github.com/haidmoham/fourier-drawing/tree/8a42f470494fea5a8fb4d1e6457d40d75b1a8287).

| claim | disposition and evidence |
| --- | --- |
| curves across spatial planes / Three.js | corrected for the current application to drawn 2d curves / canvas 2d. `index.html` loads `src/reimagined/main.ts`; `reimagined/instrument.ts` uses `canvas.getContext("2d")`. the older spatial renderer still exists but is not the current entry point. |
| rotating-vector reconstruction | supported by `reimagined/engine.ts:transform`, `reconstruct`, and `chain`, wired through `instrument.ts`. |
| periodic seam | supported by `resampleClosed`, the rendered closing segment, and the math explanation in `index.html`. |
| normalized RMS error measured against the input | supported by `instrument.ts` summing approximation and source squared distances, then taking their ratio’s square root. the source is the normalized/resampled drawing. |
| interactive controls | observed live: drawing a stroke exposed wave-count, phase, playback, and wave-detail controls and a 7.32% error reading for that temporary drawing. this is a UI check, not a new portfolio metric. |

### flowers — corrected for current scope

source: [0b9d95b](https://github.com/haidmoham/flowers/tree/0b9d95b186bc93f5a001625aedac23345bbf8464).

| claim | disposition and evidence |
| --- | --- |
| p5.js botanical sketches | supported by root `index.html` loading p5.js and `sketch.js`. |
| image reveal using an authored arrival map / generated image material | supported as a historical study in `studies/ivory-botanical/`; corrected the blurb so this is not presented as the current bouquet renderer. |
| current 3d bouquet, growing stems, opening petals, flower/color picker | supported by `astral/garden.js` animation/picker and `astral/botany.js` procedural petal/stem geometry. `astral/README.md` describes the active deployment and explicitly distinguishes old image assets. |
| current geometry and shaders versus earlier generated material | supported by the actual Three.js geometry/material construction. retained the distinction; no invented artwork or reactions added. |

### test bench — corrected for recorded progress

source: [13418bb](https://github.com/haidmoham/test-bench/tree/13418bbe7dcda7ad47586cd2e52dad568aad2516).

| claim | disposition and evidence |
| --- | --- |
| Python numerical methods: Laplace relaxation, sheet gravity, lattice sums | supported by the three named notebooks under `experiments/`. |
| unfinished drafts | supported for the unfinished sheet-gravity and exercise-9.1 portions, but incomplete as a description of all work. |
| no completed experiment results presented | replaced with the actual recorded state: relaxation plots and naive-versus-vectorized lattice-sum timings, with some exercises unfinished. `2026-08-19-madelung-constant/madelung.ipynb` stores computed sums and `%timeit` outputs; `2026-08-16-laplace-relaxation/ex9.1.ipynb` stores relaxation iterations and a plot while reserving exercise 9.1. no new claim of an entire completed study. |

### faltone — corrected for precision

source initially inspected: tracked files in the local `voidpulsev2` checkout at `a63be2e93276bae8c6a2a9678c9d1b7f94538c41`. the pre-push refresh also inspected fetched `origin/main` revision `0bc4b91fe7491e0ba4b86ce8cce58b8954003db0`: `main.ts`, `core/reactivity-model.ts`, and `world/FallWorld.ts`. the revised claims remain supported; the newer entry point additionally wires local-file playback and pause controls. the portfolio already notes that a public source URL is not verified. untracked duplicate files were not used as evidence or modified.

| claim | disposition and evidence |
| --- | --- |
| audio-reactive 3d corridor / Three.js and Web Audio | supported by `src/main.ts` wiring `FallWorld`, `FaltoneController`, and the audio signal router. |
| tempo controls travel speed | supported, clarified as estimated tempo: `core/fall-model.ts` maps bounded BPM to terminal velocity; `audio/musicAnalyzer.ts` estimates onset intervals. |
| frequency bands drive polygon layers | corrected to shape the visual field. `core/reactivity-model.ts` maps low/mid/high to gravity/current/dust, chroma, and light rather than promising one polygon layer per band. |
| stereo width and note attacks control expansion/decay | supported, clarified as stereo width expansion and detected attacks triggering decaying pulses; `advanceReactivity` computes `soundstagePresence`, onset wake energy, and transient attack/release smoothing. |
| tab capture or sample audio | corrected: `DisplayAudioSignal` implements capture; `LicensedDemoAudioSignal` requires a configured sample URL. no unconditional working-sample claim. |
| Spotify sign-in separate from visual response | supported by `SpotifyAuth.ts` and `main.ts:updateSignalRoute`, which routes procedural, display, demo, licensed, or (in the refreshed revision) local-file signals rather than Spotify playback audio. live OAuth and capture permissions were not exercised. |

### C-1N — supported recorded boundary

source: [001be66](https://github.com/haidmoham/spider/tree/001be66c2550a003ef5609bf81933c0f827d5733).

| claim | disposition and evidence |
| --- | --- |
| six legs, eighteen actuators, Python/MuJoCo | supported by model files, `simulation.py`, and actuator-sized state/control arrays. |
| deterministic state/reset/stepping across headless and live paths | supported by the common simulation core and `REFACTOR_VERIFICATION.md` recorded before/after state-and-trace equality. no new numerical run claimed. |
| ten-second standing with six feet in contact | supported as the recorded checkpoint in `README.md` (STAND section); the same baseline is preserved in the portfolio’s existing checkpoint evidence. |
| joint/contact/torso/velocity/effort telemetry | supported by `telemetry.py`, simulation observation/control records, and `standing.py` support observations. |
| SPAWN and failed SHUFFLE preserved; STAND current; walking future | supported by canonical checkpoint descriptions and browser checkpoint assets. no checkpoint or ordinal changed. |
| browser stance controller is illustrative and differs from native | supported by distinct portfolio browser controller versus canonical `standing.py`; the explicit limitation remains. robust disturbance recovery and sustained walking are not claimed. |

### robotics test bench — supported

source: [9cdd22b](https://github.com/haidmoham/robotics-test-bench/tree/9cdd22b377f17c65fc41a85ddbef19b2b9cbacc7).

| claim | disposition and evidence |
| --- | --- |
| feedback / coupled joints / inverse dynamics and model-based control / Jacobians | supported by `experiments/2026-08-08-pendulum-control`, `2026-08-09-two-link-coupling`, `2026-08-09-model-based-control`, and `2026-08-09-jacobians-task-space`, including Python implementations and experiment records. |
| static support and foot placement / leg reachability | supported by the two `2026-08-13-*` notebooks and Python scripts. existing outputs, not animated previews, remain the evidence. |
| payload sweep identifies rear-contact unloading | supported by `2026-08-13-static-support-boundary` recorded sweep and its contact-load observations. |
| two-joint workspace and added third joint | supported by `2026-08-13-c1n-leg-workspace` notebook and script. |
| six published experiments with code/results/limits | supported by the six portfolio experiment pages and their individual canonical provenance; this counts published records, not every newer source study. no source issue was promoted into a new public ordinal. |

### lm lab — supported, revision distinction retained

current source: [3758d66](https://github.com/haidmoham/lmlab/tree/3758d6624153cfd8435bcab4423c91b3cfc256dc). recorded notebook source: [19222f1](https://github.com/haidmoham/lmlab/tree/19222f1ac6e78ccf8a814f38d18e13bbc30f6221).

| claim | disposition and evidence |
| --- | --- |
| byte-pair tokenizer / bigram / causal attention / transformer components | supported by the notebooks and current `src/` implementations; tokenizer is Python, neural components use PyTorch. |
| Unicode round trips; 512 vocabulary; first 100,000 characters → 47,586 tokens | supported by pinned tokenizer cells 6–9, including source parameters, assertions, and printed output. |
| 1,000 AdamW steps; one validation batch 4.376 versus uniform 6.238 | supported by pinned bigram training cell and outputs `4.3758955001831055` and `6.238324625039508`. not represented as an averaged evaluation or a transformer training result. |
| two heads; [32,8,32] input/output; [32,2,8,8] attention; masking/pre-norm/residuals | supported by pinned attention source and stored shapes. pre-normalization describes that revision; current source uses post-norm. |
| block-level recorded attention, trained bigram baseline, newer transformer comparison harness | supported by pinned outputs versus current `src/language_models.py` and experiment harness. preserved distinction. |
| homepage attention display is a structural mask, not learned weights | supported by the portfolio preview implementation and explicit caption. |

### voidpulse / jellyfish — supported

source: [f9b863a](https://github.com/haidmoham/voidpulse-jellyfish/tree/f9b863ab4aae6bfcf738cdf4211b705098fed2e2).

| claim | disposition and evidence |
| --- | --- |
| Three.js/WebGL2/shaders/Web Audio; audio-reactive jellyfish | supported by `app/VoidpulseApp.ts`, `visual/Organism.ts`, and audio-to-visual signal mapping. |
| procedural mantle, filaments, oral arms, accretion disk | supported by geometry/shaders under `visual/` and the wired renderer. |
| local-file and captured-tab audio | supported by `audio/MusicPlayer.ts`; native capture remains browser-dependent and was not authorized through a permission prompt in this audit. |
| separate playback volume and visual intensity | supported by `MusicControls.ts`, `main.ts:#music-intensity`, and `VoidpulseApp.setIntensity`. live app exposes playback/volume/source controls. |
| lensing artistic; homepage silent | supported by shader treatment and separate audio-free portfolio specimen. no physical simulation claim. |

### mural — supported source, live read interface, and local persistence

source inspected: existing local canonical Sites checkout at `4a654de8994ab9ab7232a70535c3350bcac0e9c1` (same local `origin/main`). remote refresh required unavailable Sites Git authentication, so this is not asserted to be a freshly fetched remote revision.

| claim | disposition and evidence |
| --- | --- |
| React/TypeScript shared wall for words and drawings | supported by `app/page.tsx`, `lib/mural.ts`, and mark input schema. |
| placement, scale, rotation persist | supported by `artSchema`, serialized mark storage, and reopened-database test. |
| new submissions pending human curation before public display | supported by `railway/storage.mjs` insert/list/approve queries and `railway/server.mjs`. |
| SQLite persistence | supported by `node:sqlite` implementation; all five `railway/storage.test.mjs` tests passed in this audit, including reopen, curation, migration, and queue bounds. |
| MCP read/contribute interface | supported by `app/api/mcp/route.ts` initialize/list/call handlers, `read_mural`, and `leave_mark`, wired to shared storage functions. initial Python HTTP probes returned 403. subsequent curl initialize, tools/list, and read_mural calls succeeded; the live server advertised read_mural/leave_mark and returned four approved mark positions without contribution text. the live page also advertised the two WebMCP tools. no public test mark was submitted. external write/read-back remains unverified; local persistence and curation behavior passed the SQLite tests. |

### magnet — supported implementation and released installer

source: [700a968](https://github.com/haidmoham/magnet/tree/700a968926a4ec9ff78eb071be8964e84d286e69).

| claim | disposition and evidence |
| --- | --- |
| Windows desktop, Tauri/Svelte, keyboard controls | supported by `src/App.svelte`, `src-tauri/tauri.conf.json`, and Rust app wiring. |
| saved tracks, playlists, search, native playback | supported by catalog commands, Spotify/librespot integration, and frontend command bindings. live authenticated Spotify playback on Windows was not rerun here. |
| editable queue: add/reorder/remove | supported by `PlayerAction::Enqueue`, `MoveQueueItem`, `RemoveQueueItem`, and `ClearQueue` in `src-tauri/src/lib.rs`. |
| NSIS installer shipped | supported by actual release `v0.1.0-alpha.3` containing `Magnet.Player_0.1.0-alpha.3_x64-setup.exe`, plus NSIS build configuration. |
| tokens in Windows Credential Manager | supported by `keyring::Entry`, token persistence functions, and `Cargo.toml` enabling `windows-native`. |

### ecosim lab — supported implementation

source: [0eeb09d](https://github.com/haidmoham/ecosimlab/tree/0eeb09ddf8e8a5dd814cb54cad39c77fb210445f).

| claim | disposition and evidence |
| --- | --- |
| server-owned shared simulation, TypeScript/WebSockets/canvas | supported by `packages/server/src/world-server.ts`, websocket handlers, and web `WorldCanvas.tsx`. |
| feeding, reproduction, energy budgets, inherited mutation | supported by `packages/simulation/src/index.ts:step`, feeding logic, and `mutate`. |
| SQLite snapshots including random-number state | supported by `server/src/persistence.ts` and simulation snapshot/restore paths, including `randomState`. |
| deterministic resumption | supported by explicit PRNG restoration and existing equality test advancing original and restored worlds another 50 steps; not evidence of ecological realism. |
| no validation against real ecosystems claimed | retained; this is a designed artificial-life model, not a calibrated empirical ecosystem model. |

### nebvis — supported implementation

source: [ece544b](https://github.com/haidmoham/nebvis/tree/ece544bfa58a61b0b3d72fd5b60462afe93d03a7).

| claim | disposition and evidence |
| --- | --- |
| audio-reactive nebulae/dust/light/accretion/echoes/jets | supported by `src/visualization/NebvisRenderer.ts` shaders, geometry, and audio-input update path. |
| local tracks, microphone, captured browser audio | supported by `src/audio/AudioEngine.ts` local object URLs, `getUserMedia`, and `getDisplayMedia`. microphone/tab permission paths were not exercised on the user’s computer. |
| analysis stays in browser | supported by local AudioContext/AnalyserNode and `audio/analyzer.ts`; captured audio is not sent to a remote analysis service. |

### soundspace — supported implementation

source: [1a8814f](https://github.com/haidmoham/soundspace/tree/1a8814f16abdde2e9b13e09104b3ac4274730d4a).

| claim | disposition and evidence |
| --- | --- |
| YouTube player with changing weather | supported by `apps/web/src/App.tsx`, iframe timing, and atmosphere components. |
| authored timeline follows playback | supported by `atmosphere/music-response.ts` time/progress sampling and `App.tsx` passing playback progress. |
| seeded skies/clouds/mist/rain/particles/electricity | supported by `atmosphere/weather-engine.ts` and atmosphere renderer inputs; metadata hashes seed authored presets. |
| does not analyze YouTube audio | supported by explicit playback-only iframe integration and authored response path. optional approved audio features are a separate input type, not evidence of YouTube PCM access. |

### agent physics lab — supported implementation; browser agent loop unverified

source: [0668283](https://github.com/haidmoham/agent-physics-lab/tree/06682833602b6da4c5f2083e7457bc7963d46438).

| claim | disposition and evidence |
| --- | --- |
| deterministic ramp experiment | supported by `src/simulation.js:simulate`, which computes acceleration from gravity, angle, and friction, then samples analytical distance/velocity. a direct Node check in this audit confirmed identical repeat results, completion at default parameters, and no movement at high friction. |
| a person and an agent use the same controls/measurements | supported by `src/experiment.js` and `src/ui.js`; `src/webmcp.js:createExperimentTools` delegates to that controller. direct checks confirmed parameter translation and measurement read-back. |
| five WebMCP tools | supported: get_experiment_state, set_parameter, run_experiment, reset_experiment, get_measurements. registration is conditional on browser support; a fallback exposes the same tool handlers. |
| full natural-language agent loop still needs validation | retained as unverified. the direct handler checks do not establish a browser agent’s complete natural-language experiment loop. |

### punkcubes — supported implementation

source: [99fed58](https://github.com/haidmoham/punkcubes/tree/99fed582b190c083822025109fdb40921ff9efbc).

| claim | disposition and evidence |
| --- | --- |
| spatial codebase viewer, file/function/variable hierarchy | supported by `src/data/parser.ts`, `scene/layout.ts`, and `PunkCubesScene.ts:addCube`. |
| files as cubes, functions inside, variables as voxels | supported by node kinds, parent layout, geometry size/material distinctions. |
| drag/dock and change spatial mapping | supported by scene pointer handlers and `scene/swap.ts`, which permits compatible sibling-slot swaps. this is visual rearrangement, not source refactoring. |
| weighted connections | supported by `scene/connections.ts:connectionRadius` and scene links using code-line metrics; these are containment/size encodings, not proven runtime dependencies. |

## remaining verification limits

- source-supported behavior is distinguished above from live observations. no broad claim that all projects were executed on every platform is made.
- public professional-employment claims on the same pages (Microsoft/UVA responsibilities, zero downtime, 200×/4×/~20% outcomes) have no accessible employer implementation/telemetry in this audit. they remain user-authored career claims, **unverified against actual internal functionality here**, not validated by repeated portfolio/resume text. no employer metrics were silently rewritten.
- the original social notebook/export has stale narrative and figure captions despite the inspectable code/output counts; corrected portfolio blurbs do not rewrite that authored research artifact.
- the first tiramisu featured route failed, while the second loaded and focus mode worked. external Genius comment availability was not established by the source implementation alone.
- mural’s externally callable initialize/list/read path was verified after the initial HTTP 403 responses. write/read-back was not exercised against the public wall, and fresh remote source could not be fetched; these remain distinct from passing local SQLite tests.

## verification and publication

- source production build passed. TypeScript check and changed-source lint passed.
- `python3 scripts/validate_site.py` passed, and all 78 `node --test scripts/*.test.mjs` tests passed.
- browser inspection confirmed the corrected homepage after hydration, with previews on and off. no console warnings/errors were recorded in the reviewed page.
- homepage and the five changed supporting/archive pages fit a 320px viewport without horizontal overflow. desktop homepage also fit at 1280px. this is browser viewport testing, not physical old-phone testing.
- all 96 homepage anchors retained their original destinations in the initial rebuild; the final intentional exception sends the failed tiramisu track preview to the working search page.
- tiramisu: App and ambient-canvas suites passed. one reader test timed out during simultaneous browser/build load; the isolated reader retry passed all four tests (936 ms total). this verifies semantic rendering/fallback behavior with fixtures, not live provider availability.
- mural: five SQLite tests and live MCP initialize/list/read passed. agent physics: direct deterministic/stop/tool-delegation checks passed.
- repeated illustration labels were checked too: removed “timed text” and the health map claim, updated Fourier’s renderer label, and labeled the flowers image-reveal sketch as historical. source notebooks, experimental results, page ordinals, and checkpoint identities were preserved.
- original generated hashed assets are retained for already-open clients; the rebuilt homepage loads newly generated matching assets. obsolete chunks are not evidence of current rendered copy.

this record describes the pre-publication review. publication was authorized on september 13, 2026; live deployment verification follows the push to main.

## semantic review

boundary: public technical claims and their evidence projection. contract: [commit rules](../.ontology/commit-rules.md). the revised descriptions link to inspected canonical revisions in this audit; measured notebook outputs remain distinct from source features and live-interface checks. no checkpoint, experiment ordinal, canonical project identity, or existing portfolio route was changed. source and exported copy were reviewed together. publication authorization was supplied separately by the user.

## pocket placement

at the user’s request, pocket is now the final section in the homepage main content, after contact and before the footer. its description is reused verbatim from the existing `/pocket/` page. the section and link remain static HTML, and the 320px browser check showed no horizontal overflow.

## pre-push reconciliation — september 13, 2026

before landing the recurring reconciliation rule, fresh fetches confirmed that all 16 public GitHub project revisions recorded above are still current. their claim evidence is reused without repeating unchanged implementation checks. faltone's fetched revision changed; the relevant signal routing, reactivity, and renderer code were inspected as noted above. mural's source fetch remains unavailable because authentication is missing; its earlier local-source and live-read evidence remain explicitly bounded.

the published homepage, project index, creative and production work pages, archive pages, and active homepage JavaScript/CSS were verified byte-for-byte against `f00a3a3`. the live browser showed the corrected tiramisu description and pocket as the final main-content section, without console errors. pocket's existing page contains project links and the same descriptive introduction, with no additional implementation claims. no site copy or runtime has changed since those checks. previously documented provider, employer, and physical-device verification gaps remain open.


## Public GitHub reconciliation — 2026-09-13

The pinned repository README now routes directly to Indigo Circuit, C-1N, Tiramisu, Fourier Drawing, Receipts, and LM Lab. No site capability, checkpoint, numerical result, or experiment ordinal is changed by this routing edit.

The account inventory covers 43 public repositories. The prior claim audit was used as a cross-check, with direct source inspection of the featured public projects and their current default branches. This pass changes repository documentation, not the site implementation. Important direct checks in this pass: Indigo's live League populated and the Tech Lab displayed experimental limitations; C-1N's 13 core/visual invariant tests passed; Fourier, Tiramisu, Receipts, Punkcubes, Jellyfish, gallery, agent-physics-lab, and Faltone passed their applicable local test/build checks. Site integrity passed.

Remaining reconciliation work: `nebvis.shin86.dev` currently serves Faltone while repository metadata still associates it with NEBVIS. Faltone's public source is now discoverable at `haidmoham/voidpulsev2`, although the earlier site audit recorded an unverified source URL. The historical social-analysis notebook retains captions inconsistent with its saved 78,815-row join; its repository README now makes that explicit. The public résumé's Indigo claims remain broader than the documented direct-write fallback and approximate interval assumptions. The website PDFs are authoritative for this task; résumé factual claims were not silently changed.

Verification limits: no production pipeline was triggered; no live database freshness, Chrome extension installation, Windows desktop runtime, Spotify OAuth, GPU performance, or new research experiment was certified. HTTP availability alone is not a functional test. Ecosim verification was blocked by the local package-build policy.
