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
EMERALD="$WORK/emerald-wasm"
say "pc-port SHA: $(git -C "$FIRE" rev-parse HEAD)"
say "emerald-wasm SHA: $(git -C "$EMERALD" rev-parse HEAD)"

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

# The PC build normally creates these as object prerequisites. Generate them
# explicitly because the WASM lane does not build the MinGW data objects.
(
  cd "$FIRE"
  tools/mapjson/mapjson layouts firered data/layouts/layouts.json data/layouts include/constants >/dev/null
  tools/mapjson/mapjson groups firered data/maps/map_groups.json data/maps include/constants >/dev/null
  while IFS= read -r mapjson; do
    tools/mapjson/mapjson map firered "$mapjson" data/layouts/layouts.json "$(dirname "$mapjson")" >/dev/null
  done < <(find data/maps -mindepth 2 -name map.json | sort)
) >>"$LOG" 2>&1 || {
  say "map generation: FAIL"
  tail -n 120 "$LOG"
  exit 1
}
say "generated: PASS"

say ""
say "=== Apply temporary wasm portability patches ==="
python3 - "$FIRE" <<'PY'
from pathlib import Path
import sys
root=Path(sys.argv[1])

p=root/"src/main.c"
s=p.read_text()
if '#include "platform.h"' not in s:
    s=s.replace('#include "sloopsvc.h"\n', '#include "sloopsvc.h"\n#include "platform.h"\n')
p.write_text(s)

p=root/"src/libagbsyscall.c"
s=p.read_text()
if '#include <stdio.h>' not in s:
    s=s.replace('#include "gba/flash_internal.h"\n', '#include "gba/flash_internal.h"\n#include <stdio.h>\n')
p.write_text(s)

p=root/"src/platform/dma.c"
s=p.read_text()
if '#include <stdint.h>' not in s:
    s=s.replace('#include "platform/dma.h"\n', '#include "platform/dma.h"\n#include <stdint.h>\n#include <stdio.h>\n')
s=s.replace('dma->dst = ((&REG_DMA0DAD)[dmaNum * 3]);',
            'dma->dst = (void *)(uintptr_t)((&REG_DMA0DAD)[dmaNum * 3]);')
s=s.replace('(&REG_DMA0SAD)[dmaNum * 3] = src;',
            '(&REG_DMA0SAD)[dmaNum * 3] = (u32)(uintptr_t)src;')
s=s.replace('(&REG_DMA0DAD)[dmaNum * 3] = dest;',
            '(&REG_DMA0DAD)[dmaNum * 3] = (u32)(uintptr_t)dest;')
p.write_text(s)
PY
say "temporary patches: PASS"

cd "$FIRE"
mkdir -p build/web/obj build/assets

COMMON_DEFS="-DFIRERED=1 -DREVISION=0 -DENGLISH=1 -DPORTABLE -DNONMATCHING -DUBFIX -DMODERN=1 -DWEB=1"
COMMON_INC="-iquote include"

sources=(
  src/main.c
  src/platform/dma.c
  src/platform/gba_easy_draw.c
  src/agb_flash_dummy.c
  src/libagbsyscall.c
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
          -Wno-incompatible-pointer-types -Wno-implicit-function-declaration \
          -c - -o "$out" 2>>"$err"
  then
    say "PASS $src"
    pass=$((pass+1))
  else
    say "FAIL $src"
    sed -n '1,140p' "$err" | tee -a "$LOG"
    fail=$((fail+1))
  fi
done

say ""
say "=== Emerald WASM data converter against FireRed ==="
cp "$EMERALD/tools/wasm_asm_data.py" tools/wasm_asm_data.py
python3 "$ROOT/firered-web-v01/prepare_converter.py" tools/wasm_asm_data.py
chmod +x tools/wasm_asm_data.py

data_sources=(
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
)
data_pass=0
data_fail=0

for src in "${data_sources[@]}"; do
  name="$(basename "$src" .s)"
  expanded="build/web/$name.wasm.s"
  out="build/web/obj/data_$name.o"
  err="/tmp/$name.converter.err"
  rm -f "$out" "$expanded" "$err"
  say "--- $src ---"
  if python3 tools/wasm_asm_data.py "$src" "$expanded" 2>>"$err" \
      && python3 "$ROOT/firered-web-v01/normalize_wasm_asm.py" "$expanded" 2>>"$err" \
      && emcc -c -x assembler "$expanded" -o "$out" 2>>"$err"
  then
    say "PASS $src"
    data_pass=$((data_pass+1))
  else
    say "FAIL $src"
    sed -n '1,180p' "$err" | tee -a "$LOG"
    data_fail=$((data_fail+1))
  fi
done

say ""
say "=== Summary ==="
say "C: PASS=$pass FAIL=$fail"
say "DATA: PASS=$data_pass FAIL=$data_fail"
exit 0
