"""Génère e2e/specs/cahier-all.spec.ts + squelette runners depuis catalog.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "e2e" / "catalog.json").read_text(encoding="utf-8"))
SPEC = ROOT / "e2e" / "specs" / "cahier-all.spec.ts"

lines = [
    'import { test } from "@playwright/test";',
    'import catalog from "../catalog.json";',
    'import { executeCase } from "../runners/executeCase";',
    'import type { CaseDef } from "../runners/types";',
    "",
    "const cases = catalog.cases as CaseDef[];",
    "",
    'test.describe.configure({ mode: "serial" });',
    "",
    'test.describe("Cahier de recette — tous les cas (catalog.json)", () => {',
    "  for (const c of cases) {",
    "    test(`${c.id} [${c.priority}] ${c.ref || \"\"} · ${c.action}`".replace(
        '`${c.id} [${c.priority}] ${c.ref || \\"\\"} · ${c.action}`',
        "`${c.id} [${c.priority}] ${c.ref || ''} · ${String(c.action).slice(0, 80)}`",
    )
    + ", async ({ page, request }) => {",
    "      test.info().annotations.push(",
    "        { type: 'parcours', description: c.parcours },",
    "        { type: 'expected', description: String(c.expected) },",
    "        { type: 'page', description: String(c.page) },",
    "      );",
    "      await executeCase(c, { page, request });",
    "    });",
    "  }",
    "});",
    "",
]

# Fix the botched string - rewrite cleanly
SPEC.write_text(
    """import { test } from "@playwright/test";
import catalog from "../catalog.json";
import { executeCase } from "../runners/executeCase";
import type { CaseDef } from "../runners/types";

const cases = catalog.cases as CaseDef[];

test.describe.configure({ mode: "serial" });

test.describe("Cahier de recette — tous les cas (catalog.json)", () => {
  for (const c of cases) {
    const title = `${c.id} [${c.priority}] ${c.ref || ""} · ${String(c.action).slice(0, 90)}`;
    test(title, async ({ page, request }) => {
      test.info().annotations.push(
        { type: "parcours", description: c.parcours },
        { type: "expected", description: String(c.expected) },
        { type: "page", description: String(c.page) },
      );
      await executeCase(c, { page, request });
    });
  }
});
""",
    encoding="utf-8",
)
print(f"OK {len(CATALOG['cases'])} tests → {SPEC}")
