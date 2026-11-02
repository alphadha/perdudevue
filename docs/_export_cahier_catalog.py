"""Exporte le cahier Excel vers e2e/catalog.json (1 entrée = 1 cas)."""
from __future__ import annotations

import json
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "docs" / "Cahier_de_recette_Perdues_de_Vue.xlsx"
OUT = ROOT / "e2e" / "catalog.json"

wb = openpyxl.load_workbook(XLSX, data_only=True)
ws = wb["Tests"]
cases = []
for r in range(2, ws.max_row + 1):
    parcours = ws.cell(r, 1).value
    n = ws.cell(r, 2).value
    if not parcours or n is None:
        continue
    # id stable: P06-09
    code = str(parcours).split("—")[0].strip().split()[0]  # P06
    case_id = f"{code}-{int(n):02d}"
    cases.append(
        {
            "id": case_id,
            "parcours": parcours,
            "n": int(n),
            "priority": ws.cell(r, 3).value,
            "role": ws.cell(r, 4).value,
            "page": ws.cell(r, 5).value,
            "action": ws.cell(r, 6).value,
            "expected": ws.cell(r, 7).value,
            "ref": ws.cell(r, 8).value or "",
        }
    )

OUT.write_text(json.dumps({"source": str(XLSX.name), "count": len(cases), "cases": cases}, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"OK {len(cases)} → {OUT}")
