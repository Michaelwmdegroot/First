#!/usr/bin/env python3
from pathlib import Path
import re
import sys

if len(sys.argv) != 2:
    raise SystemExit("usage: prepare_converter.py PATH_TO_COPIED_CONVERTER")

path = Path(sys.argv[1])
text = path.read_text()

needle = '''    for raw in (ROOT / "include/constants/tms_hms.h").read_text().splitlines():
'''
replacement = '''    tm_hm_path = ROOT / "include/constants/tms_hms.h"
    if not tm_hm_path.exists():
        # FireRed/LeafGreen exposes its TM/HM item constants directly from
        # include/constants/items.h rather than Emerald's FOREACH_TM/HM file.
        return out

    for raw in tm_hm_path.read_text().splitlines():
'''

if needle not in text:
    raise SystemExit("converter TM/HM hook changed upstream; adapter needs review")

path.write_text(text.replace(needle, replacement))
