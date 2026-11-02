"""Audit couverture Playwright vs catalog.json (127 cas cahier)."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
catalog = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))
cases = catalog["cases"]

sources: list[Path] = list((ROOT / "specs").glob("*.ts"))
if (ROOT / "runners").exists():
    sources += list((ROOT / "runners").rglob("*.ts"))

text = "\n".join(p.read_text(encoding="utf-8") for p in sources)

# Explicit IDs like P01-01
found_ids = set(re.findall(r"P\d{2}-\d{2}", text))

# Runner switch cases: export async function runP01 ... case 1:
runner_cases: dict[str, set[int]] = defaultdict(set)
for p in (ROOT / "runners" / "cases").glob("p*.ts") if (ROOT / "runners" / "cases").exists() else []:
    m = re.search(r"run(P\d{2})", p.read_text(encoding="utf-8"))
    content = p.read_text(encoding="utf-8")
    code = p.stem.upper()  # p01 -> need P01
    code = "P" + p.stem[1:].upper() if p.stem.startswith("p") else p.stem.upper()
    for n in re.findall(r"case\s+(\d+)\s*:", content):
        runner_cases[code].add(int(n))
        found_ids.add(f"{code}-{int(n):02d}")

# Spec titles mentioning Pxx-yy
for m in re.finditer(r"test\(\s*[`'\"](P\d{2}-\d{2})", text):
    found_ids.add(m.group(1))

# Spec files that only partially cover via descriptive titles
spec_test_count = {}
for p in (ROOT / "specs").glob("*.ts"):
    content = p.read_text(encoding="utf-8")
    # count test( but not test.describe / test.info
    count = len(re.findall(r"(?m)^\s*test\(", content))
    skips = len(re.findall(r"test\.skip\(", content))
    spec_test_count[p.name] = {"tests": count, "skips_calls": skips}

has_cahier_all = (ROOT / "specs" / "cahier-all.spec.ts").exists()
has_execute = (ROOT / "runners" / "executeCase.ts").exists()

missing = [c["id"] for c in cases if c["id"] not in found_ids]
covered = [c for c in cases if c["id"] in found_ids]

by_parcours_missing: dict[str, list[str]] = defaultdict(list)
for c in cases:
    if c["id"] not in found_ids:
        by_parcours_missing[c["parcours"]].append(c["id"])

report = {
    "catalog_total": len(cases),
    "ids_referenced_in_code": len(found_ids & {c["id"] for c in cases}),
    "covered": len(covered),
    "missing": len(missing),
    "coverage_pct": round(100 * len(covered) / len(cases), 1),
    "cahier_all_spec": has_cahier_all,
    "executeCase_router": has_execute,
    "runner_files": sorted(runner_cases.keys()),
    "runner_case_counts": {k: len(v) for k, v in sorted(runner_cases.items())},
    "spec_test_counts": spec_test_count,
    "missing_by_parcours": {k: v for k, v in by_parcours_missing.items()},
    "missing_ids": missing,
}

out = ROOT / "coverage-report.json"
out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"Catalogue cahier : {report['catalog_total']} cas")
print(f"Couverts (ID Pxx-yy dans le code) : {report['covered']} ({report['coverage_pct']}%)")
print(f"Manquants : {report['missing']}")
print(f"cahier-all.spec.ts : {has_cahier_all}")
print(f"executeCase.ts : {has_execute}")
print("Runners :", report["runner_case_counts"])
print("Specs :")
for name, meta in sorted(spec_test_count.items()):
    print(f"  {name}: {meta['tests']} test() / skip calls≈{meta['skips_calls']}")
print("\nManquants par parcours:")
for parcours, ids in by_parcours_missing.items():
    print(f"  {parcours}: {len(ids)} → {', '.join(ids)}")
