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

text = text.replace(needle, replacement)


# FireRed/LeafGreen map event layout differs from Emerald in two important
# places. Adapt the copied Emerald WASM converter instead of changing upstream
# game sources.
hidden_old = '''    if stripped.startswith("bg_hidden_item_event "):
        x, y, elevation, item, flag = split_args(stripped[len("bg_hidden_item_event "):])
        hidden_item = parse_int("BG_EVENT_HIDDEN_ITEM", constants)
        flag_start = parse_int("FLAG_HIDDEN_ITEMS_START", constants)
        stripped = f"bg_event {x}, {y}, {elevation}, {hidden_item}, {item}, (({flag}) - {flag_start})"
'''
hidden_new = '''    if stripped.startswith("bg_hidden_item_event "):
        args = split_args(stripped[len("bg_hidden_item_event "):])
        if len(args) != 7:
            raise ValueError(f"FireRed bg_hidden_item_event expects 7 args, got {len(args)}: {stripped}")
        x, y, elevation, item, flag, quantity, underfoot = args
        hidden_item = parse_int("BG_EVENT_HIDDEN_ITEM", constants)
        flag_start = parse_int("FLAG_HIDDEN_ITEMS_START", constants)
        stripped = (
            f"bg_event {x}, {y}, {elevation}, {hidden_item}, {item}, "
            f"(({flag}) - {flag_start}), ({quantity}) | (({underfoot}) << 7)"
        )
'''
if hidden_old not in text:
    raise SystemExit("converter hidden-item hook changed upstream; adapter needs review")
text = text.replace(hidden_old, hidden_new)

bg_old = '''        if kind_value == parse_int("BG_EVENT_HIDDEN_ITEM", constants):
            lines.extend([f".2byte {arg6}", f".2byte {args[5]}"])
        else:
            lines.append(f".4byte {arg6}")
'''
bg_new = '''        if kind_value == parse_int("BG_EVENT_HIDDEN_ITEM", constants):
            if len(args) < 7:
                raise ValueError(f"FireRed hidden bg_event expects item, flag, quantity/underfoot byte: {stripped}")
            lines.extend([
                f".2byte {arg6}",
                f".byte {args[5]}",
                f".byte {args[6]}",
            ])
        else:
            lines.append(f".4byte {arg6}")
'''
if bg_old not in text:
    raise SystemExit("converter bg_event hook changed upstream; adapter needs review")
text = text.replace(bg_old, bg_new)

flags_old = '''    if stripped.startswith("map_header_flags "):
        values = {}
        for arg in split_args(stripped[len("map_header_flags "):]):
            key, value = arg.split("=", 1)
            values[key.strip()] = parse_int(value, constants)
        byte = (
            ((values["show_map_name"] & 1) << 3)
            | ((values["allow_running"] & 1) << 2)
            | ((values["allow_escaping"] & 1) << 1)
            | (values["allow_cycling"] & 1)
        )
        return [f".byte {byte}"]
'''
flags_new = '''    if stripped.startswith("map_header_flags "):
        args = split_args(stripped[len("map_header_flags "):])
        if len(args) != 4:
            raise ValueError(f"FireRed map_header_flags expects 4 positional args: {stripped}")
        allow_cycling, allow_escaping, allow_running, show_map_name = args
        return [
            f".byte {allow_cycling}",
            f".byte (({show_map_name} & 1) << 2) | (({allow_running} & 1) << 1) | (({allow_escaping} & 1) << 0)",
        ]
'''
if flags_old not in text:
    raise SystemExit("converter map-header hook changed upstream; adapter needs review")
text = text.replace(flags_old, flags_new)

path.write_text(text)
