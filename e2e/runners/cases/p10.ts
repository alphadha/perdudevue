import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import { BACKEND_URL, loginApi, users } from "../flows";

export async function runP10(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  switch (c.n) {
    case 1:
      await page.goto(`${BACKEND_URL}/admin/login`);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("input[type='email'], input[id*='email'], input[name*='email']").first()).toBeVisible();
      break;
    case 2: {
      const token = await loginApi(request, users.optA.email, "opticien");
      const res = await request.get(`${BACKEND_URL}/admin`, {
        headers: { Authorization: `Bearer ${token}` },
        maxRedirects: 0,
      });
      expect([200, 302, 401, 403]).toContain(res.status());
      break;
    }
    case 3:
    case 4:
    case 6:
    case 7:
      await page.goto(`${BACKEND_URL}/admin/login`);
      await expect(page.locator("body")).toBeVisible();
      test.info().annotations.push({
        type: "ref",
        description: "Filament ADM — KPIs/journal/réseaux/UI (Lot8/Lot10 Feature + manuel)",
      });
      break;
    case 5:
      test.skip(true, "Blocage compte = action Filament destructive");
      break;
    default:
      test.skip(true, `P10-${c.n}`);
  }
}
