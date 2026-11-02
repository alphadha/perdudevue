"""Régénère un Excel 'compatible' (sans validation/styles complexes) + XLSX via CSV sheets."""
from __future__ import annotations

import csv
import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent
CATALOG = json.loads((ROOT.parent / "e2e" / "catalog.json").read_text(encoding="utf-8"))
OUT = ROOT / "Cahier_de_recette_Perdues_de_Vue.xlsx"
OUT_COMPAT = ROOT / "Cahier_de_recette_COMPAT.xlsx"

HEADER_FILL = PatternFill("solid", fgColor="3658AC")
HEADER_FONT = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
BODY = Font(name="Calibri", size=11)


def write_sheet(ws, headers: list[str], rows: list[list], widths: list[int]):
    for col, h in enumerate(headers, 1):
        cell = ws.cell(1, col, h)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
    for r, row in enumerate(rows, 2):
        for c, val in enumerate(row, 1):
            cell = ws.cell(r, c, val)
            cell.font = BODY
            cell.alignment = Alignment(wrap_text=True, vertical="top")
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{max(1, len(rows)+1)}"


def build(path: Path):
    wb = Workbook()
    # Mode d'emploi
    ws = wb.active
    ws.title = "Mode d emploi"
    ws["A1"] = "Cahier de recette — Perdues de Vue V1"
    ws["A1"].font = Font(name="Calibri", size=16, bold=True)
    instructions = [
        ("Parcours continus", "Jouer N1 puis N2… sans sauter d'étape."),
        ("Priorité P0", "Bloquant livraison / GO."),
        ("Priorité P1", "Important métier."),
        ("Priorité P2", "Confort / non-régression."),
        ("Statut", "OK / KO / N/A / Reporté / À retester."),
        ("Jeux", "ADM admin@perduesdevue.fr · OPT-A/B · C1/C2 · Password1"),
        ("Markdown", "Si Excel vide : ouvrir Cahier_de_recette_Perdues_de_Vue.md"),
        ("CSV", "Cahier_de_recette_Tests.csv s'ouvre toujours dans Excel."),
    ]
    ws["A3"] = "Clé"
    ws["B3"] = "Valeur"
    ws["A3"].font = HEADER_FONT
    ws["B3"].font = HEADER_FONT
    ws["A3"].fill = HEADER_FILL
    ws["B3"].fill = HEADER_FILL
    for i, (k, v) in enumerate(instructions, 4):
        ws.cell(i, 1, k).font = BODY
        ws.cell(i, 2, v).font = BODY
    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 80

    # Parcours
    ws = wb.create_sheet("Parcours")
    by = {}
    for case in CATALOG["cases"]:
        by.setdefault(case["parcours"], {"p0": 0, "p1": 0, "p2": 0, "n": 0})
        by[case["parcours"]]["n"] += 1
        key = str(case["priority"]).lower()
        if key == "p0":
            by[case["parcours"]]["p0"] += 1
        elif key == "p1":
            by[case["parcours"]]["p1"] += 1
        else:
            by[case["parcours"]]["p2"] += 1
    parcours_rows = []
    for i, name in enumerate(dict.fromkeys(c["parcours"] for c in CATALOG["cases"]), 1):
        parcours_rows.append([i, name, by[name]["n"], by[name]["p0"], by[name]["p1"], by[name]["p2"]])
    write_sheet(
        ws,
        ["Ordre", "Parcours", "Nb etapes", "P0", "P1", "P2"],
        parcours_rows,
        [8, 48, 12, 8, 8, 8],
    )

    # Tests
    ws = wb.create_sheet("Tests")
    test_rows = [
        [
            c["parcours"],
            c["n"],
            c["priority"],
            c["role"],
            c["page"],
            c["action"],
            c["expected"],
            c["ref"],
            "",
            "",
        ]
        for c in CATALOG["cases"]
    ]
    write_sheet(
        ws,
        [
            "Parcours",
            "N",
            "Priorite",
            "Role",
            "Page / ecran",
            "Action",
            "Resultat attendu",
            "Ref",
            "Statut",
            "Commentaire",
        ],
        test_rows,
        [40, 6, 10, 14, 28, 50, 50, 16, 12, 22],
    )

    # Synthese
    ws = wb.create_sheet("Synthese")
    write_sheet(
        ws,
        ["Parcours", "Nb etapes", "P0", "P1", "P2"],
        [[r[1], r[2], r[3], r[4], r[5]] for r in parcours_rows],
        [48, 12, 8, 8, 8],
    )
    total_row = 2 + len(parcours_rows)
    ws.cell(total_row, 1, "TOTAL")
    ws.cell(total_row, 2, sum(r[2] for r in parcours_rows))
    ws.cell(total_row, 3, sum(r[3] for r in parcours_rows))
    ws.cell(total_row, 4, sum(r[4] for r in parcours_rows))
    ws.cell(total_row, 5, sum(r[5] for r in parcours_rows))

    # Force visible window
    wb.properties.title = "Cahier de recette Perdues de Vue"
    if wb.views:
        wb.views[0].windowWidth = 20000
        wb.views[0].windowHeight = 12000
        wb.views[0].xWindow = 0
        wb.views[0].yWindow = 0
        wb.views[0].visibility = "visible"

    wb.save(path)
    print(f"OK → {path} ({path.stat().st_size} o)")


def write_csv_bundle():
    # Always-openable CSV for Tests
    csv_path = ROOT / "Cahier_de_recette_Tests.csv"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(
            [
                "Parcours",
                "N",
                "Priorite",
                "Role",
                "Page",
                "Action",
                "Resultat attendu",
                "Ref",
                "Statut",
                "Commentaire",
            ]
        )
        for c in CATALOG["cases"]:
            w.writerow(
                [
                    c["parcours"],
                    c["n"],
                    c["priority"],
                    c["role"],
                    c["page"],
                    c["action"],
                    c["expected"],
                    c["ref"],
                    "",
                    "",
                ]
            )
    print(f"CSV → {csv_path}")


if __name__ == "__main__":
    # ensure catalog exists
    if not (ROOT.parent / "e2e" / "catalog.json").exists():
        raise SystemExit("Manque e2e/catalog.json — lancer docs/_export_cahier_catalog.py")
    build(OUT)
    build(OUT_COMPAT)
    write_csv_bundle()
