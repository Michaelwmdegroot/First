#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT/.work/firered-native"
SRC="$WORK/pokefirered"
EM="$WORK/pokeemerald-wasm"
OUT="$ROOT/firered-native/dist"
BUILD="$SRC/build/wasm-native"
OBJ="$BUILD/obj"

rm -rf "$WORK"
mkdir -p "$WORK" "$OUT"

echo "::group::Clone portable FireRed source"
git clone --depth=1 https://github.com/jommg/pokefirered-pc-port.git "$SRC"
git clone --depth=1 https://github.com/tripplyons/pokeemerald-wasm.git "$EM"
echo "::endgroup::"

echo "::group::Build FireRed host asset tools and generated map sources"
cd "$SRC"
make -f make_tools.mk -j2
make generated
echo "::endgroup::"

echo "::group::Install generic WASM helpers"
cp "$ROOT/firered-native/tools/prepare_fire_red_wasm.py" "$SRC/tools/prepare_fire_red_wasm.py"
cp "$EM/tools/wasm_asm_data.py" "$SRC/tools/wasm_asm_data.py"
cp "$EM/tools/generate_wasm_assets.py" "$SRC/tools/generate_wasm_assets.py"
mkdir -p "$SRC/include/wasm"
cp "$EM/include/wasm/"*.h "$SRC/include/wasm/"
python3 "$SRC/tools/prepare_fire_red_wasm.py" "$SRC"
echo "::endgroup::"

echo "::group::Generate binary graphics/data referenced by C"
cd "$SRC"
python3 tools/generate_wasm_assets.py
echo "::endgroup::"

mkdir -p "$OBJ"

COMMON_DEFS=(
  -DMODERN=1
  -DWASM=1
  -DFIRERED
  -DREVISION=0
  -DENGLISH
  -DFAST_DRAW
  -DNONMATCHING
  -DUBFIX
)

WARNINGS=(
  -Wno-incompatible-library-redeclaration
  -Wno-unknown-attributes
  -Wno-ignored-attributes
  -Wno-parentheses
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

compile_c() {
  local src="$1"
  local rel="${src#src/}"
  local obj="$OBJ/${rel%.c}.o"
  mkdir -p "$(dirname "$obj")"
  echo "CC $src"
  clang --target=wasm32-unknown-unknown     "${COMMON_DEFS[@]}"     -I "$BUILD" -I include/wasm -I include -iquote include     -E "$src"   | tools/preproc/preproc -i -g build/assets "$src" charmap.txt   | clang --target=wasm32-unknown-unknown -x c -std=gnu11 -O2 -fno-builtin       "${WARNINGS[@]}" -c - -o "$obj"
}

echo "::group::Compile FireRed C to wasm32"
while IFS= read -r src; do
  case "$src" in
    *.inc.c) continue ;;
    src/platform/sdl2.c|src/platform/cgb_audio.c|src/platform/gba_easy_draw.c) continue ;;
  esac
  compile_c "$src"
done < <(find src -type f -name '*.c' | sort)
echo "::endgroup::"

echo "::group::Convert FireRed data scripts to wasm objects"
while IFS= read -r src; do
  case "$src" in
    data/sound_data.s|data/multiboot_*.s) continue ;;
  esac
  name="${src#data/}"
  asm="$BUILD/${name%.s}.wasm.s"
  obj="$OBJ/data/${name%.s}.o"
  mkdir -p "$(dirname "$asm")" "$(dirname "$obj")"
  echo "AS $src"
  python3 tools/wasm_asm_data.py "$src" "$asm"
  clang --target=wasm32-unknown-unknown -c "$asm" -o "$obj"
done < <(find data -maxdepth 1 -type f -name '*.s' | sort)
echo "::endgroup::"

echo "::group::Link FireRed WebAssembly"
mapfile -t OBJECTS < <(find "$OBJ" -type f -name '*.o' | sort)
wasm-ld   --no-entry   --allow-undefined   --initial-memory=268435456   --max-memory=268435456   --export=AgbMain   --export=WasmRunFrame   --export=WasmSetKeys   --export=WasmRenderFrame   --export=WasmDisplayBuffer   --export=WasmDisplayBufferSize   --export=WasmFlashBuffer   --export=WasmFlashBufferSize   --export-all   -o "$OUT/pokefirered.wasm" "${OBJECTS[@]}"
echo "::endgroup::"

ls -lh "$OUT/pokefirered.wasm"
echo "FireRed native WASM build complete."
