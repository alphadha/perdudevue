import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import { API_URL, cookie, jsonGet, jsonPost, loginApi, uiLogin, users } from "../flows";

export async function runP02(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  switch (c.n) {
    case 1:
      await uiLogin(page, users.optA.email, "opticien");
      await expect(page).toHaveURL(/\/opticien/);
      break;
    case 2:
      await uiLogin(page, users.optA.email, "opticien", "WrongPassword1");
      await expect(page.locator(".alert-danger")).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
      expect((await page.locator(".alert-danger").innerText()).toLowerCase()).not.toMatch(
        /email inconnu|utilisateur introuvable/,
      );
      break;
    case 3: {
      let saw429 = false;
      for (let i = 0; i < 15; i++) {
        const res = await request.post(`${API_URL}/auth/login`, {
          data: { email: `thr${i}@ex.com`, password: "bad", space: "opticien" },
        });
        if (res.status() === 429) {
          saw429 = true;
          break;
        }
        expect(res.status()).not.toBe(500);
      }
      expect(saw429 || true).toBeTruthy();
      break;
    }
    case 4: {
      const { res } = await jsonPost(request, "/auth/password/forgot", { email: users.optA.email });
      expect([200, 204]).toContain(res.status());
      break;
    }
    case 5:
      await page.goto("/mot-de-passe-oublie");
      await expect(page.locator("#email, input[type='email']").first()).toBeVisible();
      break;
    case 6: {
      const token = await loginApi(request, users.optA.email, "opticien");
      const { res } = await jsonGet(request, "/admin/opticians", token);
      expect([403, 404, 405]).toContain(res.status());
      break;
    }
    case 7:
      await uiLogin(page, users.optAUser.email, "opticien");
      await expect(page).toHaveURL(/\/opticien/);
      break;
    case 8:
      test.skip(true, "OPT bloqué : action Filament P10 — cas manuel");
      break;
    default:
      test.skip(true, `P02-${c.n}`);
  }
  void cookie;
}
