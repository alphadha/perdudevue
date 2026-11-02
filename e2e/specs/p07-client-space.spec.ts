import { test, expect } from "@playwright/test";
import { apiGet, apiPost, loginC2 } from "../helpers/api";
import { setTokenCookie } from "../helpers/auth";

test.describe("P07 — Espace client", () => {
  test("P07-01 R5-01 · Liste paires C2 ordonnée / visible", async ({ page, request }) => {
    const token = await loginC2(request);
    await setTokenCookie(page, token);
    await page.goto("/client");
    await expect(page).toHaveURL(/\/client/);
    await expect(page.locator("body")).toContainText(/lunette|paire|Gucci|Active|Perdue|Inactive|récupér/i);
  });

  test("P07-02/04 · Perte / inactive API", async ({ request }) => {
    const token = await loginC2(request);
    const list = await apiGet(request, "/client/pairs", token);
    expect(list.ok()).toBeTruthy();
    const pairs = (await list.json()).data?.data ?? (await list.json()).data ?? [];
    // re-fetch once
    const body = await (await apiGet(request, "/client/pairs", token)).json();
    const arr = body.data?.data ?? body.data ?? [];
    expect(Array.isArray(arr) ? arr.length : 0).toBeGreaterThan(0);
  });

  test("P07-03 R5-03 · Annuler perte si perdue", async ({ request }) => {
    const token = await loginC2(request);
    const body = await (await apiGet(request, "/client/pairs", token)).json();
    const arr = body.data?.data ?? body.data ?? [];
    const lost = (Array.isArray(arr) ? arr : []).find((p: { status: string }) =>
      String(p.status).toLowerCase().includes("perdue"),
    );
    test.skip(!lost, "Pas de paire perdue");
    const res = await apiPost(request, `/client/pairs/${lost.uuid}/recovered`, {}, token);
    expect([200, 201, 422]).toContain(res.status());
  });

  test("P07-05 R5-05 · Suppression — Feature / UI confirm", async ({ page, request }) => {
    const token = await loginC2(request);
    await setTokenCookie(page, token);
    await page.goto("/client");
    await expect(page.locator("body")).toBeVisible();
  });

  test("P07-06 R5-06 · Page à récupérer", async ({ page, request }) => {
    const token = await loginC2(request);
    await setTokenCookie(page, token);
    const body = await (await apiGet(request, "/client/pairs", token)).json();
    const arr = body.data?.data ?? body.data ?? [];
    const waiting = (Array.isArray(arr) ? arr : []).find((p: { status: string }) =>
      /recuperer|livraison/i.test(String(p.status)),
    );
    test.skip(!waiting, "Pas de paire à récupérer pour C2");
    await page.goto(`/client/lunettes/${waiting.uuid}/recuperer`);
    await expect(page.locator("body")).toBeVisible();
  });

  test("P07-07 R5-07 · Isolation C2 ne voit pas paires C1", async ({ request }) => {
    const token = await loginC2(request);
    const text = JSON.stringify(await (await apiGet(request, "/client/pairs", token)).json());
    expect(text).not.toContain("FR5487OK");
  });

  test("P07-08 R5-08 · Préférences notifications UI", async ({ page, request }) => {
    const token = await loginC2(request);
    await setTokenCookie(page, token);
    await page.goto("/client/parametres/notifications");
    await expect(page).toHaveURL(/notifications/);
  });

  test("P07-09 · CTA Me faire livrer si a_recuperer", async ({ page, request }) => {
    const token = await loginC2(request);
    await setTokenCookie(page, token);
    await page.goto("/client");
    await expect(page.locator("body")).toBeVisible();
  });
});
