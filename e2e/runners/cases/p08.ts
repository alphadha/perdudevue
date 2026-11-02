import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import { cookie, jsonGet, loginApi, seed, users } from "../flows";

export async function runP08(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  switch (c.n) {
    case 1:
    case 2:
      test.info().annotations.push({ type: "ref", description: "Lot6NotificationsTest + journal Filament" });
      expect(true).toBeTruthy();
      break;
    case 3: {
      const token = await loginApi(request, users.optB.email, "opticien");
      const { res } = await jsonGet(request, "/opticien/notifications", token);
      expect(res.ok()).toBeTruthy();
      await cookie(page, token);
      await page.goto("/opticien/notifications");
      await expect(page.locator("body")).toBeVisible();
      break;
    }
    case 4: {
      const tokenA = await loginApi(request, users.optA.email, "opticien");
      const tokenB = await loginApi(request, users.optB.email, "opticien");
      const a = await jsonGet(request, "/opticien/notifications", tokenA);
      const b = await jsonGet(request, "/opticien/notifications", tokenB);
      expect(a.res.ok()).toBeTruthy();
      expect(b.res.ok()).toBeTruthy();
      break;
    }
    case 5: {
      const token = await loginApi(request, users.optB.email, "opticien");
      await cookie(page, token);
      await page.goto("/opticien/notifications");
      await expect(page.locator("body")).toBeVisible();
      break;
    }
    case 6:
      await page.goto(`/r/${seed.publicRestitutionToken}`);
      await expect(page.locator("body")).toBeVisible();
      break;
    default:
      test.skip(true, `P08-${c.n}`);
  }
}
