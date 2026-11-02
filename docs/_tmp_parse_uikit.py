from pathlib import Path
import re
text = Path(r"C:\Users\Salhi\.cursor\projects\c-Users-Salhi-Documents-perduedeVue\agent-tools\264b30de-0a5e-4be8-9185-8e81e81d8688.txt").read_text(encoding="utf-8", errors="replace")
frames=[]
for line in text.splitlines():
    m=re.search(r'^(\s*)<(frame|section|text|component)\s+[^>]*id="([^"]+)"[^>]*name="([^"]+)"', line, re.I)
    if m:
        frames.append((len(m.group(1)), m.group(2), m.group(3), m.group(4)))
min_i=min(f[0] for f in frames) if frames else 0
for indent, kind, nid, name in frames:
    if indent <= min_i+2:
        print(f"{nid}\t{indent}\t{kind}\t{name[:100]}")
