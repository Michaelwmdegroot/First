#!/usr/bin/env bash
set -u -o pipefail

ROOT="$(pwd)"
WORK="$RUNNER_TEMP/firered-native-v01"
LOG="$ROOT/firered-native-v01/probe.log"
PC_SHA="ea42ca1672eb457ba86442093a6df3119fbcee5f"
EMERALD_WASM_SHA="fd83f5b6e609b61b0b10777e32c74343e1a81b41"

rm -rf "$WORK"
mkdir -p "$WORK"
: > "$LOG"

say() {
  printf '%s\n' "$*" | tee -a "$LOG"
}

say "=== FireRed Native Web V0.1 ==="
say "PC base: $PC_SHA"
say "Emerald WASM reference: $EMERALD_WASM_SHA"

git clone -q https://github.com/jommg/pokefirered-pc-port.git "$WORK/fire"
git -C "$WORK/fire" checkout -q "$PC_SHA"
git clone -q https://github.com/tripplyons/pokeemerald-wasm.git "$WORK/emerald"
git -C "$WORK/emerald" checkout -q "$EMERALD_WASM_SHA"

FIRE="$WORK/fire"
EMERALD="$WORK/emerald"

say "FireRed checkout: $(git -C "$FIRE" rev-parse HEAD)"
say "Emerald checkout: $(git -C "$EMERALD" rev-parse HEAD)"

say ""
say "=== Build FireRed preprocessing tools ==="
if make -C "$FIRE" -f make_tools.mk -j2 >>"$LOG" 2>&1; then
  say "tools: PASS"
else
  say "tools: FAIL"
  tail -n 100 "$LOG"
  exit 1
fi

say ""
say "=== Generate FireRed map metadata ==="
if make -C "$FIRE" generated NODEP=1 SETUP_PREREQS=0 >>"$LOG" 2>&1; then
  say "generated: PASS"
else
  say "generated: FAIL"
  tail -n 100 "$LOG"
  exit 1
fi

mkdir -p "$FIRE/include/wasm" "$FIRE/build/wasm" "$FIRE/build/assets"
cp "$EMERALD/include/wasm/string.h" "$FIRE/include/wasm/string.h"
cp "$EMERALD/include/wasm/stdio.h" "$FIRE/include/wasm/stdio.h"
cp "$EMERALD/include/wasm/stdlib.h" "$FIRE/include/wasm/stdlib.h"
cat >> "$FIRE/include/wasm/stdio.h" <<'EOF'
int printf(const char *format, ...);
int puts(const char *s);
EOF

FLAGS=(
  --target=wasm32-unknown-unknown
  -DFIRERED=1
  -DREVISION=0
  -DENGLISH=1
  -DMODERN=1
  -DPORTABLE=1
  -DNONMATCHING=1
  -DUBFIX=1
  -DWASM=1
  -Ibuild/wasm
  -Iinclude/wasm
  -Iinclude
  -iquote include
  -Wno-unknown-attributes
  -Wno-ignored-attributes
  -Wno-incompatible-library-redeclaration
  -Wno-int-conversion
  -Wno-pointer-to-int-cast
  -Wno-int-to-pointer-cast
  -Wno-builtin-requires-header
  -Wno-unknown-escape-sequence
  -include platform.h
  -include stdio.h
)

sources=(
  src/libagbsyscall.c
  src/platform/dma.c
  src/platform/gba_easy_draw.c
  src/agb_flash_dummy.c
  src/agb_flash.c
  src/main.c
)

pass=0
fail=0

cd "$FIRE"
say ""
say "=== Representative wasm32 object compilation ==="

for src in "${sources[@]}"; do
  out="$WORK/$(basename "$src" .c).o"
  err="$WORK/$(basename "$src" .c).err"
  : > "$err"

  say ""
  say "--- $src ---"

  if clang "${FLAGS[@]}" -E "$src" 2>>"$err" \
      | tools/preproc/preproc -i "$src" charmap.txt 2>>"$err" \
      | clang "${FLAGS[@]}" -x c -O0 -c - -o "$out" 2>>"$err"; then
    say "PASS $src"
    pass=$((pass + 1))
  else
    say "FAIL $src"
    sed -n '1,120p' "$err" | tee -a "$LOG"
    fail=$((fail + 1))
  fi
done

cd "$ROOT"

say ""
say "=== Result ==="
say "PASS=$pass"
say "FAIL=$fail"

if [[ "$pass" -eq 0 ]]; then
  exit 2
fi

# Compile failures are expected in this discovery step. The log is the deliverable.
exit 0
