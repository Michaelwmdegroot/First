#!/usr/bin/env bash
set -Eeuo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="$HERE/build-mac.log"
WORK="${FIRERED_WEB_WORK:-${TMPDIR:-/tmp}/personal-firered-web-v01}"
FIRE="$WORK/pokefirered-pc-port"
EMERALD="$WORK/pokeemerald-wasm"
STAGE="$WORK/output"
OBJ="$FIRE/build/web/obj"
BUILD="$FIRE/build/web"

FIRE_REPO="https://github.com/jommg/pokefirered-pc-port.git"
FIRE_SHA="ea42ca1672eb457ba86442093a6df3119fbcee5f"
EMERALD_REPO="https://github.com/tripplyons/pokeemerald-wasm.git"
EMERALD_SHA="fd83f5b6e609b61b0b10777e32c74343e1a81b41"

: > "$LOG"
exec > >(tee -a "$LOG") 2>&1

fail() {
  printf '\nERROR: %s\n' "$*" >&2
  printf 'Build log: %s\n' "$LOG" >&2
  exit 1
}

on_error() {
  local line="$1"
  printf '\nBuild stopped at line %s.\n' "$line" >&2
  printf 'Build log: %s\n' "$LOG" >&2
}
trap 'on_error "$LINENO"' ERR

section() {
  printf '\n============================================================\n%s\n============================================================\n' "$*"
}

need() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

checkout_pinned() {
  local url="$1"
  local sha="$2"
  local dest="$3"
  rm -rf "$dest"
  mkdir -p "$dest"
  git -C "$dest" init -q
  git -C "$dest" remote add origin "$url"
  git -C "$dest" fetch -q --depth=1 origin "$sha"
  git -C "$dest" checkout -q --detach FETCH_HEAD
  test "$(git -C "$dest" rev-parse HEAD)" = "$sha" || fail "Pinned checkout mismatch for $url"
}

section "FireRed Web V0.1 — local macOS build"
[[ "$(uname -s)" == "Darwin" ]] || fail "This helper is intentionally for macOS."

need git
need python3
need make

if ! xcode-select -p >/dev/null 2>&1; then
  fail "Apple Command Line Tools are missing. Run: xcode-select --install"
fi

if ! command -v brew >/dev/null 2>&1; then
  fail "Homebrew is missing. Install it from https://brew.sh and run this command again."
fi

missing_formulae=()
command -v emcc >/dev/null 2>&1 || missing_formulae+=(emscripten)
command -v pkg-config >/dev/null 2>&1 || missing_formulae+=(pkg-config)
brew list --versions libpng >/dev/null 2>&1 || missing_formulae+=(libpng)

if ((${#missing_formulae[@]})); then
  section "Install missing build dependencies"
  # De-duplicate while preserving order.
  unique=()
  for formula in "${missing_formulae[@]}"; do
    seen=0
    for existing in "${unique[@]:-}"; do
      [[ "$existing" == "$formula" ]] && seen=1
    done
    ((seen == 0)) && unique+=("$formula")
  done
  HOMEBREW_NO_AUTO_UPDATE=1 brew install "${unique[@]}"
fi

need emcc
need em++

JOBS="$(sysctl -n hw.logicalcpu 2>/dev/null || printf '2')"
case "$JOBS" in ''|*[!0-9]*) JOBS=2 ;; esac

# pokefirered-pc-port's desktop Makefile is Windows-oriented and evaluates
# i686-w64-mingw32-gcc even for map/graphics-only targets. The browser build
# does not need that cross-compiler. Override the unused desktop compiler/link
# variables whenever we ask Make to generate assets on macOS.
MAC_MAKE_ARGS=(
  MODERNCC=clang
  CC1=true
  LIBPATH=
  LIB=
  'CPP=clang -E'
)

section "Pinned source checkouts"
rm -rf "$WORK"
mkdir -p "$WORK" "$STAGE"
checkout_pinned "$FIRE_REPO" "$FIRE_SHA" "$FIRE"
checkout_pinned "$EMERALD_REPO" "$EMERALD_SHA" "$EMERALD"
printf 'FireRed:       %s\n' "$(git -C "$FIRE" rev-parse HEAD)"
printf 'Emerald WASM:  %s\n' "$(git -C "$EMERALD" rev-parse HEAD)"

section "Build FireRed preprocessing tools"
make -C "$FIRE" -f make_tools.mk -j"$JOBS"

section "Build WASM-aware C preprocessor"
make -C "$EMERALD/tools/preproc" -j"$JOBS"
WEB_PREPROC="$EMERALD/tools/preproc/preproc"
test -x "$WEB_PREPROC" || fail "WASM-aware preprocessor was not built."

section "Generate FireRed map metadata"
make -C "$FIRE" "${MAC_MAKE_ARGS[@]}" generated NODEP=1 SETUP_PREREQS=0
(
  cd "$FIRE"
  tools/mapjson/mapjson layouts firered data/layouts/layouts.json data/layouts include/constants >/dev/null
  tools/mapjson/mapjson groups firered data/maps/map_groups.json data/maps include/constants >/dev/null
  while IFS= read -r mapjson; do
    tools/mapjson/mapjson map firered "$mapjson" data/layouts/layouts.json "$(dirname "$mapjson")" >/dev/null
  done < <(find data/maps -mindepth 2 -name map.json | sort)
)

section "Apply browser portability patches"
python3 - "$FIRE" <<'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1])

p = root / "src/main.c"
s = p.read_text()
if '#include "platform.h"' not in s:
    s = s.replace('#include "sloopsvc.h"\n', '#include "sloopsvc.h"\n#include "platform.h"\n')

boot_decl_anchor = '#include "platform.h"\n'
boot_decl = '#ifdef WEB\nvoid WebBootCheckpoint(const char *stage);\n#endif\n'
if boot_decl not in s:
    if s.count(boot_decl_anchor) != 1:
        raise RuntimeError("main.c platform include anchor changed; review required")
    s = s.replace(boot_decl_anchor, boot_decl_anchor + boot_decl, 1)

boot_sequence_old = '''    InitGpuRegManager();
    REG_WAITCNT = WAITCNT_PREFETCH_ENABLE | WAITCNT_WS0_S_1 | WAITCNT_WS0_N_3;
    InitKeys();
    InitIntrHandlers();
    m4aSoundInit();
    EnableVCountIntrAtLine150();
    //InitRFU();
    CheckForFlashMemory();
    InitMainCallbacks();
    InitMapMusic();
    ClearDma3Requests();
    ResetBgs();
    InitHeap(gHeap, HEAP_SIZE);
    SetDefaultFontsPointer();
'''
boot_sequence_new = '''    InitGpuRegManager();
#ifdef WEB
    WebBootCheckpoint("FireRed: GPU ready");
#endif
    REG_WAITCNT = WAITCNT_PREFETCH_ENABLE | WAITCNT_WS0_S_1 | WAITCNT_WS0_N_3;
    InitKeys();
    InitIntrHandlers();
#ifdef WEB
    WebBootCheckpoint("FireRed: interrupts ready");
#endif
    m4aSoundInit();
#ifdef WEB
    WebBootCheckpoint("FireRed: sound init ready");
#endif
    EnableVCountIntrAtLine150();
    //InitRFU();
    CheckForFlashMemory();
#ifdef WEB
    WebBootCheckpoint("FireRed: flash ready");
#endif
    InitMainCallbacks();
    InitMapMusic();
#ifdef WEB
    WebBootCheckpoint("FireRed: callbacks ready");
#endif
    ClearDma3Requests();
    ResetBgs();
    InitHeap(gHeap, HEAP_SIZE);
    SetDefaultFontsPointer();
#ifdef WEB
    WebBootCheckpoint("FireRed: entering frame loop");
#endif
'''
if s.count(boot_sequence_old) != 1:
    raise RuntimeError(f"Expected one FireRed AgbMain boot sequence, found {s.count(boot_sequence_old)}")
s = s.replace(boot_sequence_old, boot_sequence_new, 1)
p.write_text(s)

p = root / "src/libagbsyscall.c"
s = p.read_text()
if '#include <stdio.h>' not in s:
    s = s.replace('#include "gba/flash_internal.h"\n', '#include "gba/flash_internal.h"\n#include <stdio.h>\n')
p.write_text(s)

p = root / "src/platform/dma.c"
s = p.read_text()
if '#include <stdint.h>' not in s:
    s = s.replace('#include "platform/dma.h"\n', '#include "platform/dma.h"\n#include <stdint.h>\n#include <stdio.h>\n')
s = s.replace('dma->dst = ((&REG_DMA0DAD)[dmaNum * 3]);',
              'dma->dst = (void *)(uintptr_t)((&REG_DMA0DAD)[dmaNum * 3]);')
s = s.replace('(&REG_DMA0SAD)[dmaNum * 3] = src;',
              '(&REG_DMA0SAD)[dmaNum * 3] = (u32)(uintptr_t)src;')
s = s.replace('(&REG_DMA0DAD)[dmaNum * 3] = dest;',
              '(&REG_DMA0DAD)[dmaNum * 3] = (u32)(uintptr_t)dest;')
p.write_text(s)

# WebAssembly function types are strict. FireRed exposes 2-argument Pokemon
# getters as GCC aliases of 3-argument functions on native builds. Replace
# those aliases with real wrappers for WEB so wasm-ld sees the correct ABI.
p = root / "src/pokemon.c"
s = p.read_text()
old = 'u32 GetMonData2(struct Pokemon *mon, s32 field) __attribute__((alias("GetMonData3")));'
new = '''#ifdef WEB
u32 GetMonData2(struct Pokemon *mon, s32 field)
{
    return GetMonData3(mon, field, NULL);
}
#else
u32 GetMonData2(struct Pokemon *mon, s32 field) __attribute__((alias("GetMonData3")));
#endif'''
if s.count(old) != 1:
    raise RuntimeError(f"Expected one GetMonData2 alias, found {s.count(old)}")
s = s.replace(old, new, 1)

old = 'u32 GetBoxMonData2(struct BoxPokemon *boxMon, s32 field) __attribute__((alias("GetBoxMonData3")));'
new = '''#ifdef WEB
u32 GetBoxMonData2(struct BoxPokemon *boxMon, s32 field)
{
    return GetBoxMonData3(boxMon, field, NULL);
}
#else
u32 GetBoxMonData2(struct BoxPokemon *boxMon, s32 field) __attribute__((alias("GetBoxMonData3")));
#endif'''
if s.count(old) != 1:
    raise RuntimeError(f"Expected one GetBoxMonData2 alias, found {s.count(old)}")
s = s.replace(old, new, 1)
p.write_text(s)

# These callers lacked the headers that declare the actual helper signatures.
# Native C accepted implicit-int declarations; WebAssembly needs exact types.
p = root / "src/clear_save_data_screen.c"
s = p.read_text()
if '#include "platform.h"\n' not in s:
    anchor = '#include "global.h"\n'
    if s.count(anchor) != 1:
        raise RuntimeError("clear_save_data_screen.c include anchor changed")
    s = s.replace(anchor, anchor + '#include "platform.h"\n', 1)
p.write_text(s)

p = root / "src/pokemon_storage_system_tasks.c"
s = p.read_text()
if '#include "menu_helpers.h"\n' not in s:
    anchor = '#include "global.h"\n'
    if s.count(anchor) != 1:
        raise RuntimeError("pokemon_storage_system_tasks.c include anchor changed")
    s = s.replace(anchor, anchor + '#include "menu_helpers.h"\n', 1)
p.write_text(s)

# The RFU interrupt source contains three ARM matching helpers marked NAKED.
# Their bodies are ordinary C callback forwarding; WebAssembly has no ARM
# prologue/epilogue requirement, and Clang rejects C statements in naked
# functions. Keep the behavior and remove only those three matching markers in
# the temporary build checkout.
p = root / "src/librfu_intr.c"
s = p.read_text()
naked_count = s.count("\nNAKED\n")
if naked_count != 3:
    raise RuntimeError(f"Expected 3 NAKED RFU callback helpers, found {naked_count}")
s = s.replace("\nNAKED\n", "\n")
p.write_text(s)

# The native music player calls this void function before its definition.
# Declare the exact signature after the headers, before any caller, rather
# than suppressing the conflicting-type error or removing the implementation.
p = root / "src/music_player.c"
s = p.read_text()
anchor = '#include "platform.h"\n'
signature = "void ChnVolSetAsm(struct SoundChannel *chan, struct MusicPlayerTrack *track)"
if s.count(anchor) != 1 or s.count(signature + " {") != 1:
    raise RuntimeError("music_player.c ChnVolSetAsm patch anchors changed; review required")
declaration = signature + ";"
if declaration not in s:
    s = s.replace(anchor, anchor + "\n" + declaration + "\n", 1)

# V0.1 deliberately keeps browser audio silent. The PC-port implementation of
# m4aSoundVSync mixes/queues real audio and depends on cgb_get_buffer() from
# platform/cgb_audio.c, which the web build intentionally excludes. Keep the
# browser-owned no-op m4aSoundVSync from sound_web.c and compile the native
# implementation only outside WEB builds.
vsync_start = "void m4aSoundVSync(void)\n{\n"
vsync_end = "\n}\n\n#if 0\n// In:"
if s.count(vsync_start) != 1 or s.count(vsync_end) != 1:
    raise RuntimeError("music_player.c m4aSoundVSync patch anchors changed; review required")
s = s.replace(vsync_start, "#ifndef WEB\n" + vsync_start, 1)
s = s.replace(vsync_end, "\n}\n#endif\n\n#if 0\n// In:", 1)
p.write_text(s)

# m4a_1.c still carries matching-era no-argument placeholder definitions for
# two functions that the browser audio layer provides with their real pointer
# signatures. Hide only those placeholders for WEB so wasm-ld sees one ABI.
p = root / "src/m4a_1.c"
s = p.read_text()
legacy_audio_stubs = (
    ("void MPlayMain(){}", "MPlayMain"),
    ("void RealClearChain(){}", "RealClearChain"),
)
for old, name in legacy_audio_stubs:
    if s.count(old) != 1:
        raise RuntimeError(f"Expected exactly one legacy {name} stub, found {s.count(old)}")
    s = s.replace(old, f"#ifndef WEB\n{old}\n#endif", 1)
p.write_text(s)

# FireRed has one legacy battle helper that passes two setbyte macro arguments
# separated only by whitespace. GNU as accepts this, but the WASM converter
# needs an explicit separator once sSTATCHANGER expands to an address
# expression. Make the separator explicit without changing the emitted bytes.
p = root / "asm/macros/battle_script.inc"
s = p.read_text()
old = r"setbyte sSTATCHANGER \stat | \stages << 4 | \down << 7"
new = r"setbyte sSTATCHANGER, \stat | \stages << 4 | \down << 7"
if s.count(old) != 1:
    raise RuntimeError(f"Expected exactly one FireRed setstatchanger legacy call, found {s.count(old)}")
s = s.replace(old, new, 1)
p.write_text(s)

# FireRed has one battle-animation label with legacy whitespace before the
# colon ("HydroPumpHitSplats\t:"). GNU as accepts it, but the pinned WASM
# converter only recognizes labels whose colon immediately follows the name,
# so it fails to emit the .type/.size metadata LLVM requires for data symbols.
# Normalize only this verified source spelling in the temporary checkout.
p = root / "data/battle_anim_scripts.s"
s = p.read_text()
old = "HydroPumpHitSplats\t:"
new = "HydroPumpHitSplats:"
if s.count(old) != 1:
    raise RuntimeError(f"Expected exactly one HydroPumpHitSplats whitespace label, found {s.count(old)}")
s = s.replace(old, new, 1)
p.write_text(s)

# FireRed's music player table contains a legacy standalone .bss directive
# immediately followed by .rodata with no symbols/data in between. GNU as
# accepts it, but LLVM's wasm assembler does not. Remove only that empty
# section switch in the temporary checkout.
p = root / "sound/music_player_table.inc"
s = p.read_text()
old = "\n\t.bss\n\n\t.section .rodata\n"
new = "\n\t.section .rodata\n"
if s.count(old) != 1:
    raise RuntimeError(f"Expected exactly one empty FireRed .bss switch, found {s.count(old)}")
s = s.replace(old, new, 1)
p.write_text(s)
PY

section "Install pinned WASM data/asset helpers"
cp "$EMERALD/tools/wasm_asm_data.py" "$FIRE/tools/wasm_asm_data.py"
cp "$EMERALD/tools/generate_wasm_assets.py" "$FIRE/tools/generate_wasm_assets.py"
python3 "$HERE/prepare_converter.py" "$FIRE/tools/wasm_asm_data.py"
chmod +x "$FIRE/tools/wasm_asm_data.py" "$FIRE/tools/generate_wasm_assets.py"

# The Emerald helper asks make to rebuild prerequisites for every generated
# asset. FireRed's tools/maps were already generated above, so keep each asset
# request narrow and avoid the PC-port's unrelated desktop toolchain path.
python3 - "$FIRE/tools/generate_wasm_assets.py" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_text()
s = s.replace("['make', 'NODEP=1', 'SETUP_PREREQS=1', target]",
              "['make', 'NODEP=1', 'SETUP_PREREQS=0', 'MODERNCC=clang', 'CC1=true', 'LIBPATH=', 'LIB=', 'CPP=clang -E', target]")
p.write_text(s)
PY

section "Generate graphics/data binaries used by C"
(
  cd "$FIRE"
  python3 tools/generate_wasm_assets.py
)

# The Emerald WASM asset helper scans C-style INCBIN_U* macros, but FireRed's
# sound samples are referenced by raw assembly .incbin directives in
# sound/direct_sound_data.inc. Build those binaries explicitly with FireRed's
# own audio_rules.mk / wav2agb pipeline before the WASM assembler sees them.
section "Generate FireRed direct-sound binaries"
(
  cd "$FIRE"
  SOUND_BIN_TARGETS=()
  while IFS= read -r target; do
    SOUND_BIN_TARGETS+=("$target")
  done < <(
    python3 - <<'PY'
from pathlib import Path
import re

text = Path("sound/direct_sound_data.inc").read_text()
targets = re.findall(r'\.incbin\s+"([^"]+\.bin)"', text)
if len(targets) != 477:
    raise SystemExit(f"Expected 477 FireRed direct-sound .incbin targets, found {len(targets)}")

for target in targets:
    source = Path(target).with_suffix(".wav")
    if not source.exists():
        raise SystemExit(f"Missing FireRed WAV source for {target}: {source}")
    print(target)
PY
  )

  if [ "${#SOUND_BIN_TARGETS[@]}" -ne 477 ]; then
    fail "Expected 477 FireRed direct-sound targets."
  fi

  make -j"$JOBS" "${MAC_MAKE_ARGS[@]}" NODEP=1 SETUP_PREREQS=0 "${SOUND_BIN_TARGETS[@]}"
)

mkdir -p "$OBJ" "$BUILD/data"

COMMON_DEFS=(
  -DFIRERED=1
  -DREVISION=0
  -DENGLISH=1
  -DPORTABLE
  -DNONMATCHING
  -DUBFIX
  -DMODERN=1
  -DWEB=1
)

COMMON_INC=(
  -Ibuild/web
  # FireRed has its own include/strings.h. Keep project headers quote-only so
  # Emscripten's <string.h>/<strings.h> resolve to the sysroot, not FireRed's
  # game text declaration header.
  -iquote include
)

WARNINGS=(
  -Wno-unknown-attributes
  -Wno-ignored-attributes
  -Wno-incompatible-library-redeclaration
  -Wno-incompatible-pointer-types
  -Wno-implicit-function-declaration
  -Wno-int-conversion
  -Wno-pointer-to-int-cast
  -Wno-int-to-pointer-cast
  -Wno-builtin-requires-header
  -Wno-gnu-alignof-expression
  -Wno-unknown-escape-sequence
  -Wno-excess-initializers
  -Wno-unused-function
  -Wno-unused-variable
  -Wno-unused-value
)

compile_game_c() {
  local src="$1"
  local rel="${src#src/}"
  local out="$OBJ/${rel%.c}.o"
  mkdir -p "$(dirname "$out")"
  printf 'CC %s\n' "$src"
  emcc "${COMMON_DEFS[@]}" "${COMMON_INC[@]}" -E "$src" \
    | "$WEB_PREPROC" -i -g build/assets "$src" charmap.txt \
    | emcc "${COMMON_DEFS[@]}" "${COMMON_INC[@]}" -x c -std=gnu11 -O2 \
        "${WARNINGS[@]}" -c - -o "$out"
}

DATA_SOURCES=(
  data/maps.s
  data/map_events.s
  data/event_scripts.s
  data/battle_scripts_1.s
  data/battle_scripts_2.s
  data/battle_ai_scripts.s
  data/battle_anim_scripts.s
  data/field_effect_scripts.s
  data/mystery_event_msg.s
  data/mystery_event_script_cmd_table.s
  data/sound_data.s
  data/multiboot_berry_glitch_fix.s
)

section "Preflight FireRed maps/events/battle data as WebAssembly objects"
(
  cd "$FIRE"
  for src in "${DATA_SOURCES[@]}"; do
    name="$(basename "$src" .s)"
    expanded="$BUILD/data/$name.wasm.s"
    out="$OBJ/data/$name.o"
    mkdir -p "$(dirname "$out")"
    printf 'DATA %s\n' "$src"
    python3 tools/wasm_asm_data.py "$src" "$expanded"
    python3 "$HERE/normalize_wasm_asm.py" "$expanded"
    emcc -c -x assembler "$expanded" -o "$out"
  done
)

section "Compile full FireRed C engine to WebAssembly objects"
(
  cd "$FIRE"
  while IFS= read -r src; do
    case "$src" in
      *.inc.c) continue ;;
      src/platform/sdl2.c) continue ;;
      src/platform/cgb_audio.c) continue ;;
      src/m4a.c) continue ;;
      src/sound.c) continue ;;
    esac
    compile_game_c "$src"
  done < <(find src -type f -name '*.c' | sort)
)

section "Compile browser host and silent V0.1 audio state layer"
(
  cd "$FIRE"
  emcc "${COMMON_DEFS[@]}" "${COMMON_INC[@]}" -sUSE_SDL=3 -std=gnu11 -O2 \
    "${WARNINGS[@]}" -c "$HERE/web.c" -o "$OBJ/platform/web_host.o"
  emcc "${COMMON_DEFS[@]}" "${COMMON_INC[@]}" -std=gnu11 -O2 \
    "${WARNINGS[@]}" -c "$HERE/sound_web.c" -o "$OBJ/sound_web.o"
)

section "Link browser build"
OBJECTS=()
while IFS= read -r object; do
  OBJECTS+=("$object")
done < <(find "$OBJ" -type f -name '*.o' | sort)
((${#OBJECTS[@]} > 0)) || fail "No WebAssembly objects were produced."
printf 'Linking %d objects.\n' "${#OBJECTS[@]}"

rm -rf "$STAGE"
mkdir -p "$STAGE"

emcc "${OBJECTS[@]}" -O2 \
  -sUSE_SDL=3 \
  -sASYNCIFY=1 \
  -sFORCE_FILESYSTEM=1 \
  -sALLOW_MEMORY_GROWTH=1 \
  -sINITIAL_MEMORY=268435456 \
  -sSTACK_SIZE=5242880 \
  -sNO_EXIT_RUNTIME=1 \
  -sASSERTIONS=1 \
  -sENVIRONMENT=web \
  -sEXPORTED_FUNCTIONS='["_main","_WebSetKeys","_WebFlushSave","_WebUnlockAudio"]' \
  -sEXPORTED_RUNTIME_METHODS='["FS"]' \
  -lidbfs.js \
  --pre-js "$HERE/pre.js" \
  -o "$STAGE/game.js"

test -s "$STAGE/game.js" || fail "Emscripten did not produce game.js"
test -s "$STAGE/game.wasm" || fail "Emscripten did not produce game.wasm"

section "Publish compiled files into firered-web-v01"
cp "$STAGE/game.js" "$HERE/game.js"
cp "$STAGE/game.wasm" "$HERE/game.wasm"

printf '\nSUCCESS\n'
printf '  %s (%s)\n' "$HERE/game.js" "$(du -h "$HERE/game.js" | awk '{print $1}')"
printf '  %s (%s)\n' "$HERE/game.wasm" "$(du -h "$HERE/game.wasm" | awk '{print $1}')"
printf '\nLocal test:\n'
printf '  cd %q && python3 -m http.server 8080\n' "$HERE"
printf '  then open http://localhost:8080/\n'
printf '\nNo GitHub Actions workflow was used.\n'
