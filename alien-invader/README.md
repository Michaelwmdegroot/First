# Alien Invader Simulator — Browser Edition 1.0.1

**Big plans. Small planet.** An original, single-player covert strategy/management campaign, 1945–2045. You are a resource-constrained alien network, not an action-game pilot.

## Play

Development link: https://raw.githack.com/Michaelwmdegroot/First/alien-invader-browser-v1/alien-invader/index.html

For a permanently pinned build, use `https://rawcdn.githack.com/Michaelwmdegroot/First/<full-commit>/alien-invader/index.html`. The release workflow prints and tests its final URL. The hosting service may display a first-visit confirmation before the game.

No account, backend, API key or runtime package installation is needed. All JavaScript and map data are vendored in this folder. Serve it as a static website; do not double-click `index.html` as a `file://` URL.

## First session

Choose **Begin your invasion**, Standard difficulty and Balanced pace. Follow the ten directive cards, and claim their supply caches. The initial sequence is observe → survey → extract → research human identities → establish a company → biological interfaces. Planning pauses the clock; launching a task resumes it. The world continues to develop, and humans become more capable of detection.

Drag the Earth to rotate, scroll or use +/− to zoom, and select a country directly or through Earth → Countries. Eight map layers show different strategic information. Use the Future screen to track the actual requirements of six final projects. Complete and commit to a future before the end of 2045.

| Control | Action |
| --- | --- |
| Space | Pause / resume |
| 1, 2, 3, 4 | 1×, 2×, 4×, 8× speed |
| Escape | Close a planning panel |
| Ctrl/Cmd + S | Save |
| Gear button | Sound, pace, reduced motion, portable saves, full screen |

Switching away from the game or putting the device to sleep pauses it. No offline catch-up occurs.

## Saves

The game stores an active campaign and two rolling backup snapshots in browser storage, with yearly and critical-event autosaves. Settings → Export creates a portable JSON save; Import validates and restores it. A browser/domain change does not automatically transfer local storage. Export before clearing site data or moving between `raw.githack.com` and `rawcdn.githack.com`.

## Implemented systems

- Interactive spherical Earth; 241 selectable country/territory entities; seven strategic region personalities plus a separate United Nations institution.
- A deterministic daily simulation from 1945 through 2045 with pause and configurable pacing.
- Eight base types, nine module types, eight craft classes and constrained fabrication/command capacity.
- Resource extraction, salvage, legal market access, priced commodity classes, front companies, financial trace and technology-for-access deals.
- Four biological-interface routes, institutional careers, promotion, policy influence, suspicion, attachment and loyalty events.
- Country backchannels, a separate United Nations legitimacy/inspection channel, custom secret accords with up to four of ten clauses, expiry/renewal, memories, rivalry and adaptive human research.
- Separate belief, evidence, coherence, panic, trust and pattern metrics. Public hard evidence is not magically erased by rumor.
- Twelve persistent narrative types, fictional public characters and three Project Blue Veil strategies.
- Forty-eight alien research nodes in eight disciplines, plus era-driven human technological pressure.
- Sixty-three event definitions: 33 timeline entries, 20 dynamic incidents and 10 special events. Choices and historical echoes leave persistent consequences.
- Six selectable final-project victories and two failure epilogues; both cooperative and coercive disclosure can occur without automatically ending the campaign.
- Original procedural scenery, character art, icons and Web Audio soundscape; responsive desktop/tablet/phone panels and a spherical Canvas compatibility renderer when WebGL2 is unavailable.

## Scope relative to the design document

This is a complete start-to-ending **browser adaptation**, not a claim that every production target in the larger GDD is finished. The map uses a fixed modern cartographic baseline rather than historical border animation. Logistics are pooled/abstracted rather than a detailed cargo-route simulation. Governments use institution-level abstractions rather than full elections/parliaments. Sixty-three event definitions are not sixty separately elaborate multistage historical chains. Dedicated gamepad navigation, native console packaging, console certification, extended campaign balance and commercial legal review are future production work.

The presentation is deliberately colorful, tactile and friendly, following the updated art brief rather than the GDD's original dark command-center palette. It does not use Nintendo characters, logos, music or other branded assets, and is not affiliated with or certified by Nintendo.

## Local development

From this directory:

```sh
node build.mjs
node tests/simulation.mjs
node tests/campaign.mjs
python3 -m http.server 8000
```

Open `http://localhost:8000/index.html` in a browser. Node.js is needed only for building/testing, not for playing the published version.

`src/app-*.txt` and `src/style-*.txt` are numbered, byte-exact source segments. `build.mjs` concatenates them into the committed runtime files, applies explicit idempotent migrations to the recovered engine/globe and checks `src/source-checksums.json`. When editing a source segment, intentionally regenerate and review the corresponding runtime hash; do not edit only the generated `app.js` or `style.css` and expect the build to preserve it.

Core boundaries: `data.js` definitions, `events.js` event content, `engine.js` deterministic game logic, `world.js` cartography, `globe.js` WebGL presentation, `globe-fallback.js` CPU spherical projection, `app.js` UI orchestration, `audio.js` synthesized sound, and `icons.js` original SVG graphics. Save state includes RNG state, jobs, careers, faction memory, narrative and event queues.

## Tests

`tests/simulation.mjs` has 18 suites covering startup, resources, prerequisites, job cancellation, legal market access, persistent evidence, treaty behavior, careers, save determinism/validation, all event affordability fallbacks and all six final-project resolvers. Some narrow resolver tests use explicitly marked fixture states.

`tests/campaign.mjs` additionally plays six whole campaigns using only normal player actions, without resource or technology grants, and asserts all six selectable successful endings. It is a reachability smoke test, not a substitute for human fun/balance testing.

`tests/browser.mjs` tests real-origin Chromium and WebKit: all panels/tabs, starting a mission, claiming a reward, pause, reload/continue, actual save download/import, malformed-save rejection, country selection, a zero-reserve incident, small-screen layout and standby pause. Run it with Playwright installed, a local HTTP server and optional `PLAY_URL` / `QA_DIR` environment variables. `LIVE=1` selects only Chromium for deployment smoke testing. Browser screenshots and reports are uploaded by the workflow. `?test=1` exposes a QA hook; normal play does not require it.

## Fiction and credits

The lore and UFO-inspired events are alternate-history fiction. Public characters are satirical inventions, not allegations about actual people. Region behavior is based on fictional institutional incentives, never inherent ethnic or religious attributes. Project Blue Veil is a fictional high-level strategy system.

Original game content and original generated assets: project owner's rights reserved. Third-party dependencies keep their own licenses: Three.js 0.180.0 (MIT; `vendor/THREE-LICENSE.txt`) and World Atlas 2.0.2 / Natural Earth geography (public domain; `vendor/WORLD-ATLAS-LICENSE.txt`). The source GDD itself is not included in this public build. Commercial publication requires separate rights, likeness, accessibility, platform and legal review.
