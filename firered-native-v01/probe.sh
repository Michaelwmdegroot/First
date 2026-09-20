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
)

PREINCLUDE=(
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

  if clang "${FLAGS[@]}" "${PREINCLUDE[@]}" -E "$src" 2>>"$err" \
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

say ""
say "=== Whole FireRed C-source wasm32 sweep ==="

mkdir -p "$WORK/all-obj"
all_pass=0
all_fail=0
failed_list="$WORK/failed-sources.txt"
: > "$failed_list"

while IFS= read -r src; do
  # SDL is the desktop host we are deliberately replacing in the browser build.
  [[ "$src" == "src/platform/sdl2.c" ]] && continue

  rel="${src#src/}"
  out="$WORK/all-obj/${rel%.c}.o"
  err="$WORK/all-obj/${rel%.c}.err"
  mkdir -p "$(dirname "$out")"
  : > "$err"

  if clang "${FLAGS[@]}" "${PREINCLUDE[@]}" -E "$src" 2>>"$err" \
      | tools/preproc/preproc -i "$src" charmap.txt 2>>"$err" \
      | clang "${FLAGS[@]}" -x c -O0 -c - -o "$out" 2>>"$err"; then
    all_pass=$((all_pass + 1))
  else
    all_fail=$((all_fail + 1))
    printf '%s\n' "$src" >> "$failed_list"
    say ""
    say "FAIL $src"
    sed -n '1,45p' "$err" | tee -a "$LOG"
  fi
done < <(find src -type f -name '*.c' | sort)

say ""
say "=== Whole-source result ==="
say "PASS=$all_pass"
say "FAIL=$all_fail"
if [[ -s "$failed_list" ]]; then
  say "Failed sources:"
  cat "$failed_list" | tee -a "$LOG"
fi

cd "$ROOT"

say ""
say "=== Result ==="
say "CORE_PASS=$pass"
say "CORE_FAIL=$fail"
say "ALL_C_PASS=$all_pass"
say "ALL_C_FAIL=$all_fail"

if [[ "$pass" -eq 0 ]]; then
  exit 2
fi

# The sweep is discovery: remaining full-engine failures are recorded but do not fail the job yet.
exit 0
