from __future__ import annotations

import re
from pathlib import Path

p = Path(
    r"C:\Users\Salhi\.cursor\projects\c-Users-Salhi-Documents-perduedeVue\agent-tools\ffd247ed-f9f7-412d-b803-a1da3eef3074.txt"
)
text = p.read_text(encoding="utf-8", errors="replace")

# Prefer shallow frames: count leading spaces
lines = text.splitlines()
frames = []
for line in lines:
    m = re.search(
        r'^(\s*)<(frame|section)\s+[^>]*id="([^"]+)"[^>]*name="([^"]+)"',
        line,
        re.I,
    )
    if not m:
        continue
    indent = len(m.group(1))
    frames.append((indent, m.group(2), m.group(3), m.group(4)))

print("total frame/section", len(frames))
# shallowest under page (indent typically 2 spaces for children of canvas)
if frames:
    min_indent = min(f[0] for f in frames)
    top = [f for f in frames if f[0] <= min_indent + 2]
    print("min indent", min_indent, "top-ish", len(top))
    for indent, kind, nid, name in top[:150]:
        print(f"{nid}\t{indent}\t{kind}\t{name}")
