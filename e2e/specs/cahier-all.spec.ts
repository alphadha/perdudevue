import { test } from "@playwright/test";
import catalog from "../catalog.json";
import { executeCase } from "../runners/executeCase";
import type { CaseDef } from "../runners/types";

const cases = catalog.cases as CaseDef[];

test.describe.configure({ mode: "serial" });

test.describe("Cahier de recette — 100% des cas (catalog.json)", () => {
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
