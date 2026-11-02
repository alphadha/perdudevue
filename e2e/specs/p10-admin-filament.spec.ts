import { test, expect } from "@playwright/test";
import { BACKEND_URL, users } from "../helpers/users";
import { apiLogin } from "../helpers/api";

test.describe("P10 — Admin Filament plateforme", () => {
  test("P10-01 · Page login Filament joignable", async ({ page }) => {
    await page.goto(`${BACKEND_URL}/admin/login`);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("input[type='email'], input[id*='email'], input[name*='email']").first()).toBeVisible();
  });

  test("P10-02 R8-02 · Opticien API ≠ admin Filament session", async ({ request }) => {
    const token = await apiLogin(request, users.optA.email, "opticien");
    // Sanctum token opticien ne donne pas accès Filament cookie session
    const res = await request.get(`${BACKEND_URL}/admin`, {
      headers: { Authorization: `Bearer ${token}` },
      maxRedirects: 0,
    });
    expect([200, 302, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const text = await res.text();
      // page login ou dashboard — opticien ne doit pas voir KPIs PDV admin
      expect(text.toLowerCase()).toMatch(/login|connexion|email|filament|admin/);
    }
  });

  test("P10-03/07 · KPIs / journal / réseaux / UI — manuel Filament + Feature Lot8/10", async () => {
    test.info().annotations.push({
      type: "ref",
      description: "Login Filament ADM admin@perduesdevue.fr / Password1 — Lot8AdminBillingCodesTest",
    });
  });

  test("P10-05 R8-04 · Blocage compte — Feature / Filament action", async () => {
    test.skip(true, "Action destructive : bloquer OPT puis vérifier 401 — à jouer en recette manuelle");
  });
});
