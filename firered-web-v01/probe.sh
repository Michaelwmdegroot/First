#!/usr/bin/env bash
set -u -o pipefail

ROOT="$PWD"
WORK="$ROOT/.firered-web-work"
LOG="$ROOT/firered-web-v01/probe.log"
rm -rf "$WORK"
mkdir -p "$WORK"
: > "$LOG"

say(){ printf '%s\n' "$*" | tee -a "$LOG"; }

say "=== FireRed Web V0.1 / Emscripten probe ==="
say "UTC: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
say "emcc: $(emcc --version | head -n1)"

git clone --depth 1 https://github.com/jommg/pokefirered-pc-port.git "$WORK/fire" 2>&1 | tee -a "$LOG"
git clone --depth 1 https://github.com/tripplyons/pokeemerald-wasm.git "$WORK/emerald-wasm" 2>&1 | tee -a "$LOG"

FIRE="$WORK/fire"
say "pc-port SHA: $(git -C "$FIRE" rev-parse HEAD)"
say "emerald-wasm SHA: $(git -C "$WORK/emerald-wasm" rev-parse HEAD)"

say ""
say "=== Build FireRed preprocessing tools ==="
make -C "$FIRE" -f make_tools.mk -j2 >>"$LOG" 2>&1 || {
  say "tools: FAIL"
  tail -n 120 "$LOG"
  exit 1
}
say "tools: PASS"

say ""
say "=== Generate FireRed data includes ==="
make -C "$FIRE" generated NODEP=1 SETUP_PREREQS=0 >>"$LOG" 2>&1 || {
  say "generated: FAIL"
  tail -n 120 "$LOG"
  exit 1
}
say "generated: PASS"

cd "$FIRE"
mkdir -p build/web/obj build/assets

COMMON_DEFS="-DFIRERED=1 -DREVISION=0 -DENGLISH=1 -DPORTABLE -DNONMATCHING -DUBFIX -DMODERN=1 -DWEB=1"
COMMON_INC="-Iinclude -iquote include"

sources=(
  src/main.c
  src/platform/dma.c
  src/platform/gba_fast_draw.c
  src/agb_flash_dummy.c
)

pass=0
fail=0

say ""
say "=== Representative C -> wasm object compile ==="
for src in "${sources[@]}"; do
  [[ -f "$src" ]] || continue
  name="$(basename "$src" .c)"
  out="build/web/obj/$name.o"
  err="/tmp/$name.err"
  rm -f "$out" "$err"

  say "--- $src ---"
  if emcc $COMMON_DEFS $COMMON_INC -sUSE_SDL=3 -E "$src" 2>>"$err" \
      | tools/preproc/preproc -i "$src" charmap.txt 2>>"$err" \
      | emcc $COMMON_DEFS $COMMON_INC -sUSE_SDL=3 -x c -O0 \
          -Wno-unknown-attributes -Wno-ignored-attributes \
          -Wno-pointer-to-int-cast -Wno-int-to-pointer-cast \
          -Wno-incompatible-pointer-types \
          -c - -o "$out" 2>>"$err"
  then
    say "PASS $src"
    pass=$((pass+1))
  else
    say "FAIL $src"
    sed -n '1,120p' "$err" | tee -a "$LOG"
    fail=$((fail+1))
  fi
done

say ""
say "=== Summary ==="
say "PASS=$pass FAIL=$fail"
exit 0
