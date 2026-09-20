# FireRed Native Web — V0.1

Goal: run editable FireRed source directly in the browser, with no ROM picker and no GBA emulator frontend.

## Base

Pinned native FireRed port:
`jommg/pokefirered-pc-port@ea42ca1672eb457ba86442093a6df3119fbcee5f`

That project already converts the original GBA memory/register model into normal C arrays, implements DMA and frame drawing in software, and isolates host input/save/audio behind platform functions.

## Web target

We replace the SDL host with a WebAssembly/browser host:

- one exported game-init function
- one exported 60 Hz game-frame function
- a 240×160 framebuffer exported to JavaScript
- held-button mask supplied by JavaScript
- 128 KiB flash save exposed to browser persistence
- keyboard and mobile touch controls
- no ROM loading at runtime

The browser build will live entirely under this folder until V0.1 passes.
