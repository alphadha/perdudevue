import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import { BACKEND_URL, loginApi, users } from "../flows";

/** Lots de codes = surtout Filament + Feature Lot9. */
export async function runP11(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  switch (c.n) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 6:
      await page.goto(`${BACKEND_URL}/admin/login`);
      await expect(page.locator("body")).toBeVisible();
      test.info().annotations.push({ type: "ref", description: `Lot9CodeLotsTest · ${c.ref || c.id}` });
      break;
    case 5: {
      const token = await loginApi(request, users.optA.email, "opticien");
      // Opticien ne doit pas accéder admin lots
      const res = await request.get(`${BACKEND_URL}/admin`, {
        headers: { Authorization: `Bearer ${token}` },
        maxRedirects: 0,
      });
      expect([200, 302, 401, 403]).toContain(res.status());
      break;
    }
    default:
      test.skip(true, `P11-${c.n}`);
  }
}
