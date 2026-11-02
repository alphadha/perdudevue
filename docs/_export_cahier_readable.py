"""Exporte le cahier Excel en Markdown + CSV (toujours ouvrables)."""
from __future__ import annotations

import csv
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent
XLSX = ROOT / "Cahier_de_recette_Perdues_de_Vue.xlsx"
wb = load_workbook(XLSX, data_only=True)


def esc(value) -> str:
    if value is None:
        return ""
    return str(value).replace("|", "/").replace("\n", " ").strip()


# CSV Tests
ws = wb["Tests"]
csv_path = ROOT / "Cahier_de_recette_Tests.csv"
with csv_path.open("w", newline="", encoding="utf-8-sig") as handle:
    writer = csv.writer(handle, delimiter=";")
    for row in ws.iter_rows(values_only=True):
        if any(cell is not None for cell in row):
            writer.writerow(["" if cell is None else cell for cell in row])

# Markdown
lines: list[str] = [
    "# Cahier de recette — Perdues de Vue V1",
    "",
    "Version **Markdown** (lisible dans Cursor / GitHub).",
    "",
    "- Excel : [`Cahier_de_recette_Perdues_de_Vue.xlsx`](./Cahier_de_recette_Perdues_de_Vue.xlsx)",
    "- CSV (Tests) : [`Cahier_de_recette_Tests.csv`](./Cahier_de_recette_Tests.csv)",
    "- Index compact : [`04-cahier-de-recette.md`](./04-cahier-de-recette.md)",
    "",
]

ws = wb["Mode d'emploi"]
lines += ["## Mode d'emploi", ""]
for row in ws.iter_rows(min_row=1, max_col=2, values_only=True):
    a, b = (list(row) + [None, None])[:2]
    if a and b:
        lines.append(f"- **{a}** — {b}")
    elif a:
        lines += [f"### {a}", ""]

ws = wb["Parcours"]
rows = list(ws.iter_rows(values_only=True))
headers = list(rows[0])
lines += ["## Parcours", "", "| " + " | ".join(esc(h) for h in headers) + " |"]
lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
for row in rows[1:]:
    if not any(row):
        continue
    lines.append("| " + " | ".join(esc(c) for c in row) + " |")
lines.append("")

ws = wb["Tests"]
rows = list(ws.iter_rows(values_only=True))
current = None
for row in rows[1:]:
    if not row or not row[0]:
        continue
    parcours, n, prio, role, page, action, expected, ref = (list(row) + [None] * 8)[:8]
    if parcours != current:
        current = parcours
        lines += [
            f"## {parcours}",
            "",
            "| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |",
            "| --- | --- | --- | --- | --- | --- | --- |",
        ]
    lines.append(
        f"| {esc(n)} | {esc(prio)} | {esc(role)} | {esc(page)} | {esc(action)} | {esc(expected)} | {esc(ref)} |"
    )

ws = wb["Synthèse"]
rows = list(ws.iter_rows(values_only=True))
headers = [c for c in rows[0] if c is not None]
lines += ["", "## Synthèse", "", "| " + " | ".join(esc(h) for h in headers) + " |"]
lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
for row in rows[1:]:
    if not row or not row[0]:
        continue
    vals = list(row)[: len(headers)]
    lines.append("| " + " | ".join(esc(c) for c in vals) + " |")

md_path = ROOT / "Cahier_de_recette_Perdues_de_Vue.md"
md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"CSV → {csv_path} ({csv_path.stat().st_size} o)")
print(f"MD  → {md_path} ({md_path.stat().st_size} o)")
