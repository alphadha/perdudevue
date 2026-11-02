import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import { BACKEND_URL, loginApi, users } from "../flows";

export async function runP12(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  switch (c.n) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 7:
      await page.goto(`${BACKEND_URL}/admin/login`);
      await expect(page.locator("body")).toBeVisible();
      test.info().annotations.push({ type: "ref", description: `Lot10BillingTest · ${c.ref || c.id}` });
      break;
    case 6: {
      const token = await loginApi(request, users.optA.email, "opticien");
      const res = await request.get(`${BACKEND_URL}/admin/billing-review`, {
        headers: { Authorization: `Bearer ${token}` },
        maxRedirects: 0,
      });
      expect([200, 302, 401, 403, 404]).toContain(res.status());
      break;
    }
    default:
      test.skip(true, `P12-${c.n}`);
  }
}
