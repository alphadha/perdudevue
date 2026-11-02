import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import { API_URL, BACKEND_URL, jsonPost } from "../flows";

export async function runP01(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  switch (c.n) {
    case 1: {
      const res = await request.get(`${API_URL}/health`);
      expect(res.status()).toBe(200);
      break;
    }
    case 2:
      await page.goto("/opticien");
      await expect(page).toHaveURL(/\/login\?space=opticien/);
      break;
    case 3:
      await page.goto("/client");
      await expect(page).toHaveURL(/\/login\?space=client/);
      break;
    case 4:
      await page.goto(`${BACKEND_URL}/admin/login`);
      await expect(page.locator("body")).toBeVisible();
      break;
    case 5:
      await page.goto("/login");
      expect(await page.locator(".container, .btn, .form-control").count()).toBeGreaterThan(0);
      break;
    case 6: {
      const { res } = await jsonPost(request, "/auth/login", {
        email: "nobody@example.com",
        password: "x",
        space: "opticien",
      });
      expect([401, 422, 429]).toContain(res.status());
      break;
    }
    default:
      test.skip(true, `P01-${c.n} non mappé`);
  }
}
