#!/usr/bin/env python3
from pathlib import Path
import re
import sys

if len(sys.argv) != 2:
    raise SystemExit("usage: normalize_wasm_asm.py FILE")

path = Path(sys.argv[1])
lines = path.read_text().splitlines()

type_re = re.compile(r"^\.type\s+([A-Za-z_$][\w$]*),@(object|function)\s*$")
size_re = re.compile(r"^\.size\s+([A-Za-z_$][\w$]*),")
label_re = re.compile(r"^([A-Za-z_$][\w$]*):\s*$")

types = {}
for line in lines:
    m = type_re.match(line.strip())
    if m:
        types[m.group(1)] = m.group(2)

out = []
pending_object = None

def close_pending():
    global pending_object
    if pending_object is not None:
        out.append(f".size {pending_object}, .-{pending_object}")
        pending_object = None

for raw in lines:
    stripped = raw.strip()

    m = size_re.match(stripped)
    if m and pending_object == m.group(1):
        pending_object = None
        out.append(raw)
        continue

    m = label_re.match(stripped)
    if m:
        name = m.group(1)
        close_pending()

        kind = types.get(name)
        if kind is None:
            out.append(f".type {name},@object")
            types[name] = "object"
            kind = "object"

        out.append(raw)
        if kind == "object":
            pending_object = name
        continue

    # Sections and explicit function endings terminate an object label.
    if pending_object is not None and (
        stripped.startswith(".section ")
        or stripped == "end_function"
    ):
        close_pending()

    out.append(raw)

close_pending()
path.write_text("\n".join(out) + "\n")
