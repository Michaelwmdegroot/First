# FireRed Web V0.1 — local Mac build

This lane keeps FireRed source-native:

`pokefirered-pc-port source -> Emscripten/WebAssembly -> browser`

There is no ROM picker and no GBA emulator frontend in this build path.

## Why this exists

GitHub Actions is intentionally not used for routine builds. The workflow on `feature/firered-web-v01` is manual (`workflow_dispatch`) only. Your Mac is the compiler; the compiled `game.js` and `game.wasm` are normal static web files and keep working after the Mac is turned off.

The build is reproducible against pinned upstream revisions:

- FireRed PC port: `ea42ca1672eb457ba86442093a6df3119fbcee5f`
- Emerald WASM helper reference: `fd83f5b6e609b61b0b10777e32c74343e1a81b41`

## First run

Work from a local clone of `Michaelwmdegroot/First` and make sure the FireRed branch is current:

```bash
git fetch origin
git checkout feature/firered-web-v01
git pull --ff-only origin feature/firered-web-v01
bash firered-web-v01/build-mac.sh
```

The script checks the Apple Command Line Tools and Homebrew. When needed it installs only the missing Homebrew build formulae (`emscripten`, `libpng`, `pkg-config`). It then:

1. checks out the two pinned upstream source revisions in a temporary build folder;
2. builds FireRed's preprocessing/map tools;
3. generates map and graphics assets;
4. applies the existing WebAssembly portability patches;
5. compiles the FireRed C engine;
6. converts maps, events and battle data to WebAssembly objects;
7. links the browser host with SDL3 + Asyncify and IndexedDB save support;
8. writes `firered-web-v01/game.js` and `firered-web-v01/game.wasm` only after a successful link.

The complete output is also recorded in `firered-web-v01/build-mac.log`.

## Local browser test

After a successful build:

```bash
cd firered-web-v01
python3 -m http.server 8080
```

Open `http://localhost:8080/` on the Mac. Do not open `index.html` directly as a `file://` URL; browsers normally block WebAssembly fetches in that mode.

## Build, commit and publish in one command

Once the branch is checked out and up to date:

```bash
bash firered-web-v01/publish-mac.sh
```

That command builds, stages only `game.js` and `game.wasm`, commits them when changed, and pushes to `feature/firered-web-v01`. A normal branch push does **not** trigger the manual-only GitHub Actions workflow. At the end it prints an immutable RawGitHack URL for the exact commit, suitable for testing on a phone.

## When the build stops

V0.1 is still a port in progress. If compilation, data conversion or linking stops, the important artifact is `firered-web-v01/build-mac.log`. The last failing `CC`, `DATA`, or linker block is the next bounded porting task; do not switch back to a ROM/emulator route to work around it.

The repository root games are not touched by this build lane.
