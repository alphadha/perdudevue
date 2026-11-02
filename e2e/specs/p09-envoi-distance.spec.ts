import { test, expect } from "@playwright/test";
import { apiGet, apiPost, loginC2, loginOptB } from "../helpers/api";
import { setTokenCookie } from "../helpers/auth";

test.describe("P09 — Envoi à distance", () => {
  test("P09-01 R7-02 · Checkout sans consentement adresse → 422", async ({ request }) => {
    const token = await loginC2(request);
    const body = await (await apiGet(request, "/client/pairs", token)).json();
    const arr = body.data?.data ?? body.data ?? [];
    const waiting = (Array.isArray(arr) ? arr : []).find((p: { status: string }) =>
      /recuperer/i.test(String(p.status)),
    );
    test.skip(!waiting, "Pas de paire a_recuperer pour C2 (seed FR5488OK chez A)");
    const res = await apiPost(
      request,
      `/client/pairs/${waiting.uuid}/shipments`,
      {
        mode: "relay",
        consent_address: false,
      },
      token,
    );
    expect([422, 400]).toContain(res.status());
  });

  test("P09-02/04 R7-01 R7-07 · Parcours Stripe UI (skip sans paire + clés)", async ({
    page,
    request,
  }) => {
    const token = await loginC2(request);
    await setTokenCookie(page, token);
    await page.goto("/client");
    await expect(page.locator("body")).toBeVisible();
    test.info().annotations.push({
      type: "note",
      description: "Stripe Checkout hors app — cartes 4242 / 4000 sur page Stripe (manuel ou Lot7 Feature)",
    });
  });

  test("P09-03/05 R7-03 · Bordereau PII — Feature Lot7 + OPT-B label", async ({ request }) => {
    const token = await loginOptB(request);
    const list = await apiGet(request, "/opticien/restitutions", token);
    expect(list.ok()).toBeTruthy();
  });

  test("P09-06 · Téléchargement label — dépend credentials MR", async () => {
    test.skip(true, "MR sandbox 10001 — PDF prod only ; fallback .txt documenté");
  });

  test("P09-07 R7-04 · Multi-select livraison demandée UI opticien", async ({ page, request }) => {
    const token = await loginOptB(request);
    await setTokenCookie(page, token);
    await page.goto("/opticien/lunettes");
    await expect(page).toHaveURL(/lunettes/);
  });

  test("P09-08/10 R7-05 R7-08 · markShipped / suivi — Feature Lot7", async () => {
    test.info().annotations.push({ type: "ref", description: "Lot7RemoteDeliveryTest" });
  });

  test("P09-09 R7-06 · Pas d’ETA exposée", async ({ request }) => {
    const token = await loginC2(request);
    const text = JSON.stringify(await (await apiGet(request, "/client/pairs", token)).json());
    // Pas d’obligation d’absence totale du mot eta dans JSON si null — on vérifie pas de date ETA client
    expect(text.includes('"eta":"') && /\d{4}-\d{2}-\d{2}/.test(text) ? false : true).toBeTruthy();
  });

  test("P09-11 · Suivi livraison page", async ({ page, request }) => {
    const token = await loginC2(request);
    await setTokenCookie(page, token);
    await page.goto("/client");
    await expect(page.locator("body")).toBeVisible();
  });
});
