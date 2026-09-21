# Personal FireRed — V0.1 runtime baseline and V0.2 handoff

Status date: 2026-09-21

## Executive status

The source-native FireRed browser port is now working end-to-end on the user's Mac.

Validated manually by the user after the runtime/save fixes:

- browser/WASM boot succeeds;
- copyright/intro/title/new-game flow works;
- overworld renders correctly;
- player can walk normally;
- starter flow works;
- rival/Gary battle works;
- wild encounters and wild battles work;
- Pokémon Center healing works;
- normal in-game save reaches successful completion without the prior WASM crash.

Still explicitly unverified at handoff:

- persistence after a full browser reload/restart should be re-tested once;
- mobile/iPhone runtime and touch play have not yet been accepted as stable;
- audio is intentionally silent in V0.1;
- full-game/end-to-end completion has not been tested.

The working runtime source baseline immediately before this documentation was commit:

`86189c5933832c141757d297190adfccfdfd3833` — **Fix remaining FireRed web save ABI mismatch**

Do not regress below that baseline.

## Product goal

This project is a personal, editable FireRed-based game that runs directly in a browser and can later be modified together.

The architecture is intentionally source-native:

```
FireRed decomp / PC-port source
        ↓
Emscripten + WebAssembly
        ↓
browser
```

It is **not**:

```
FireRed ROM → browser emulator
```

There is no ROM picker and no emulator frontend in this lane.

## Repository / branches

Repository:

`Michaelwmdegroot/First`

Runtime baseline branch:

`feature/firered-web-v01`

Next content-development branch:

`feature/firered-v02-content`

Do not modify unrelated root games or the repository's other personal game projects.

## Pinned upstream sources

FireRed source base:

- repository: `jommg/pokefirered-pc-port`
- pinned commit: `ea42ca1672eb457ba86442093a6df3119fbcee5f`

WASM conversion/helper reference:

- repository: `tripplyons/pokeemerald-wasm`
- pinned commit: `fd83f5b6e609b61b0b10777e32c74343e1a81b41`

Do not silently update either pin. A pin upgrade is its own migration task.

## Build / deployment policy

GitHub Actions must **not** be used for routine builds. The user has no Actions minutes to spend on this project and the workflow is manual-only.

The user's Mac is the compiler.

Normal source/build cycle:

```bash
cd ~/First
git checkout feature/firered-v02-content
git pull --ff-only origin feature/firered-v02-content
bash firered-web-v01/build-mac.sh
```

Local runtime:

```bash
cd ~/First/firered-web-v01
python3 -m http.server 8080
```

Open:

`http://localhost:8080/`

For Safari after a rebuild, use a hard refresh (`Cmd+Shift+R`) so old JS/WASM is not cached.

When a build fails, use:

`firered-web-v01/build-mac.log`

Find the **first real failing CC / DATA / linker block**. Do not diagnose from warnings at the very end unless they are linker ABI warnings.

### Publishing

`publish-mac.sh` builds locally, stages only `game.js` and `game.wasm`, commits them when changed, pushes the current FireRed branch, and prints an immutable RawGitHack URL.

Important: the latest known-good executable was built on the user's Mac. Unless the user has run `publish-mac.sh` after the final save fix, generated `game.js` / `game.wasm` in GitHub may lag behind the local executable. Source is reproducible; do not claim the hosted binary is current until it is published and tested.

## Key local files

All project-specific browser-port files live in `firered-web-v01/`.

- `build-mac.sh` — reproducible pinned local Mac build, FireRed portability patches, C/data compile and link.
- `prepare_converter.py` — adapts the Emerald WASM assembly/data converter to FireRed.
- `normalize_wasm_asm.py` — normalizes generated WASM assembly metadata.
- `web.c` — SDL3/Emscripten browser host, input, VBlank loop, renderer, flash file persistence hooks, runtime diagnostics.
- `sound_web.c` — intentionally silent/stateful V0.1 audio compatibility layer.
- `pre.js` — IDBFS mount/restore and queued browser save sync.
- `controls.js` — keyboard/touch key state and page-hide save flush.
- `index.html` / `style.css` — browser shell and controls.
- `LOCAL_MAC.md` — operator build instructions.
- `build-mac.log` — last local build output; normally ignored as a source artifact.
- generated: `game.js`, `game.wasm`.

## Runtime architecture details

### Video

The FireRed PC-port software renderer is used. `DrawFrame` renders the GBA display into a 240×160 software framebuffer. `web.c` converts BGR555-style pixels to XRGB8888 and uploads them to an SDL3 streaming texture.

A critical runtime fix was to mirror the native PC-port frame order:

```
wait → VBlank DMA/callbacks → explicit palette transfer → DrawFrame → present
```

The old web order rendered before VBlank work and produced a permanently white boot screen.

`TransferPlttBuffer()` is explicitly called on the browser VBlank after the normal callback. This cleared the palette-transfer pending state that otherwise left the copyright fade stuck at `gMain.state == 141`.

### Input

Keyboard mapping:

- arrows = D-pad
- Z = A
- X = B
- Enter = Start
- Backspace = Select
- A/S = L/R

Touch controls feed the same GBA key bitmask through `WebSetKeys`.

### Saves

FireRed still uses its original flash-sector save format in `FLASH_BASE`.

Browser persistence:

1. FireRed writes sectors into the dummy flash implementation / `FLASH_BASE`.
2. `Platform_StoreSaveFile()` writes the full 128 KiB flash image to `/save/pokefirered.sav`.
3. `pre.js` mounts IDBFS at `/save`.
4. browser save syncs are serialized/coalesced; concurrent `FS.syncfs` calls are not allowed.
5. startup restores IDBFS before the runtime proceeds, then `ReadSaveFile()` loads the flash image.

A critical late bug was a WebAssembly ABI mismatch: `src/save.c` called `Platform_StoreSaveFile` without `platform.h`, so wasm-ld saw `() -> i32` from `save.o` against the real `() -> void` implementation. The final runtime fix adds the correct include in the temporary WEB checkout.

### Audio

V0.1 is deliberately silent.

Do not pull the complete desktop audio subsystem back in casually. The web layer keeps the public hooks/state expected by FireRed while avoiding the native CGB/audio device path. Audio can become a later bounded feature.

## Important build/converter fixes already solved

Do not rediscover or casually remove these.

### Mac / C build lane

- GitHub Actions push trigger disabled; manual workflow only.
- Local Mac Emscripten build lane created.
- FireRed generated assets forced to use the Mac/clang toolchain rather than MinGW.
- Emerald WASM-aware preprocessor used because FireRed's old preproc does not support `-g`.
- FireRed's `include/strings.h` collision with the Emscripten sysroot fixed by using quote-only project includes.
- exactly three ARM `NAKED` RFU callback markers removed in the temporary WEB checkout.
- `ChnVolSetAsm` gets a forward declaration before use.
- strict WASM function signatures fixed, including real WEB wrappers for `GetMonData2` / `GetBoxMonData2`.
- missing prototypes/includes fixed for platform/menu helper calls, especially `Platform_StoreSaveFile` in `save.c`.

### FireRed assembly/data conversion

The pinned Emerald converter required FireRed-specific adapters for:

- FireRed TM/HM constant fallback;
- 7-argument `bg_hidden_item_event`;
- FireRed hidden-item byte layout;
- 2-byte FireRed `map_header_flags`;
- named map-header flag arguments;
- FireRed values such as `OBJ_KIND_CLONE=255` and `FLAG_HIDDEN_ITEMS_START=1000`;
- raw FireRed `gScriptCmdTable` → `SCR_OP_*` opcode discovery;
- one-argument `msgbox text` using `MSGBOX_DEFAULT`;
- numeric FireRed `.equ` aliases;
- locally-defined movement macros inside map scripts, including `.purgem`;
- legacy whitespace-separated `setstatchanger` / `setbyte` syntax;
- the single `HydroPumpHitSplats\t:` legacy label;
- generated direct-sound `.bin` assets from the 477 WAV sources;
- FireRed's empty legacy `.bss` switch in the music-player table.

### Late linker/runtime fixes

- duplicate native/web audio symbols resolved deliberately;
- `m4aSoundVSync` remains browser-owned/no-op;
- native FireRed helpers retained where they compile correctly;
- Berry Glitch Fix multiboot assembly added as a WASM data object;
- silent `SetPokemonCryStereo` compatibility stub added;
- inert `mus_victory_gym_leader` song-header identity supplied for silent V0.1;
- native VBlank ordering restored;
- explicit palette transfer added;
- strict function-signature mismatches removed from the exercised overworld/save path;
- IDBFS writes serialized.

## Significant commit chronology

Early build/port lane:

- `4769e0c67316a60614013866d1cb3654d9e834e9` — Disable automatic FireRed Web CI runs
- `dc2e856881724999fd9e43b337a6c7cd8eb56f68` — Add local Mac build lane
- `f1ce149e053eef9a6995d4c7a3c41d2ce1f5282c` — Fix macOS FireRed asset generation toolchain
- `4bac2fc7fd00bfaf77584848f6be79563b98bfa7` — Use WASM-aware preprocessor
- `f6e9d91908e7e3899a068b6a8053f8a88122d92e` — Fix FireRed/Emscripten header collision
- `d3a659a71ed1c5864ba1a2608e2b65309fdcf0b4` — Adapt RFU callbacks
- `97434fa0d95b49a748462afe983f0fa97751e5f8` — Declare ChnVolSetAsm before use

Converter/data frontier:

- `6eee5767818d9cad97a422c1f42e8f6ee64cfba8` — Adapt FireRed map event data for WASM conversion
- `43d4c0d2f002f8416d9ddde29b627a2e0cb0de81` — Parse named FireRed map header flags for WASM
- `c98f8f563090512b180f0ab0a43236842acb9d68` — Run WASM data preflight before C compile
- `03bad187ceedcfaa5aa52bcf967c1beaab9f64a4` — Use FireRed map event constants
- `c58e210b52bb02bb3a5d691525e5e9a2fdf3f673` — Parse FireRed script command opcodes
- `e1247639d108769150627ee4a776d7724364cb22` — Support FireRed default msgbox type
- `2d56fbc98288e8c39d66c8c11bc137d2f6553672` — Resolve numeric FireRed .equ aliases
- `dab921279d1eba14ea43c7fa223112089aac0c3e` — Expand FireRed local movement macros
- `626c0760d38aaa90198dadfaded3000e680193b6` — Normalize setstatchanger macro
- `8ce47acdabe8e0bba31d8d2ee5eaf64861889b23` — Normalize HydroPump animation label
- `bad9486b7b12de5431b56169d324e1be9285c088` — Normalize FireRed sound data for WASM assembly

Link/runtime frontier:

- `71ef5936d8b7da8e16596909b5c03f0685312b79` — Keep web VSync audio stub without native duplicate
- `f654aa8e06bfa3c28c24d039a13ec155bef12fbe` — Resolve late FireRed web linker symbols
- `a420c6402b7454a01c04d5f80200ad88015e58ec` — Instrument FireRed engine boot checkpoints
- `97b200497668c370e8c4c4c6ce8511b093e572e2` — Match native VBlank render order
- `38293eb9f5f64780720be45827e73d57c00549a9` — Force palette transfer on browser VBlank
- `1efc17a7e47ec46d919cb89b1ec3546be7e58ada` — Instrument first overworld step
- `638d0bf46a4f85c973375f05b3597d7a96b0ceed` — Use queued browser save persistence
- `1cacc780c811cbb3547b8841aca785f2d612ba63` — Preserve WASM function names for runtime debugging
- `618cda89f9972a14efb9589da9e3cbbc68cfb5c3` — Instrument FireRed save sector writes
- `86189c5933832c141757d297190adfccfdfd3833` — Fix remaining FireRed web save ABI mismatch

## Current diagnostic code

There is deliberately still runtime instrumentation in the V0.1 source:

- boot checkpoints;
- first-step checkpoints;
- frame/palette probes;
- save checkpoints;
- runtime stack/error display;
- link currently keeps WASM names/assertions useful for debugging.

Do not remove all of this on day one of V0.2. It is cheap insurance while broader gameplay is still being exercised.

Once V0.2 is stable across more features, diagnostics can be moved behind a build flag and the production link can be slimmed.

## V0.2 policy: freeze platform, change content first

The next phase should treat the browser runtime as frozen.

Avoid changing unless a reproduced runtime bug requires it:

- `web.c`
- `pre.js`
- `build-mac.sh`
- `prepare_converter.py`
- `normalize_wasm_asm.py`
- GPU/DMA/palette code
- save structs/format
- memory layout
- audio engine

Prefer FireRed's already-decompiled content/data layer.

### Low-risk content targets

Very low / low risk:

- NPC dialogue and signs — `data/maps/*/text.inc`
- simple map scripts/events — `data/maps/*/scripts.inc`
- wild species and levels — `src/data/wild_encounters.json`
- trainers, teams and levels — `src/data/trainers.h`
- item metadata/prices/descriptions — `src/data/items.json`
- starter species — Oak's Lab scripts, with matching rival-team/text updates
- Pokémon base stats/types/abilities — `src/data/pokemon/species_info.h` (technically simple, larger balance impact)

Medium risk:

- replacing graphics/title assets;
- adding new NPCs;
- adding new scripted events;
- map/warp changes.

Higher risk / postpone:

- engine systems;
- save-format changes;
- memory changes;
- new low-level renderer/audio architecture.

## Recommended first V0.2 slice

Do **one visible bounded content slice** first and prove the full loop:

1. edit only content/data source;
2. local Mac rebuild;
3. boot existing/new game as appropriate;
4. test movement/menu/save;
5. test the changed content;
6. only then add the next slice.

Good first candidates to discuss with the user:

- personalized Oak/rival dialogue;
- different three starter choices, plus their rival counters;
- a redesigned Route 1 encounter table;
- one customized trainer;
- a small combined "personal opening" package using the above.

Do not choose the user's creative direction for them; present the safe options and let them decide.

## Acceptance checklist before calling V0.1 frozen

Already observed PASS:

- build/link
- browser boot
- intro/new game
- overworld
- movement
- starter acquisition
- rival battle
- wild encounter/battle
- Pokémon Center heal
- in-game save completion

Still check once:

- refresh/restart → Continue loads the saved position/team correctly;
- optional: second save after continuing;
- optional: phone/mobile touch runtime.

If persistence survives reload, V0.1 can be treated as a frozen playable baseline.

## Rules for the next agent

1. Read this file and `LOCAL_MAC.md` before changing code.
2. Inspect the exact current branch/source before making a patch.
3. Keep work bounded; one content slice at a time.
4. Never switch back to a ROM/emulator architecture.
5. Never turn automatic GitHub Actions back on.
6. Do not modify unrelated games in `Michaelwmdegroot/First`.
7. Do not silently update pinned upstream commits.
8. Never claim a build/runtime behavior was tested unless the user actually ran it or there is direct evidence.
9. For Mac errors, diagnose the first real failure from `build-mac.log`.
10. Preserve the working runtime and save path while V0.2 content work begins.
