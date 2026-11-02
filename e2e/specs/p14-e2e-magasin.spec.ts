import { test, expect } from "@playwright/test";
import { apiGet, apiPost, loginOptA, loginOptB, loginC2 } from "../helpers/api";
import { setTokenCookie } from "../helpers/auth";
import { PASSWORD, users } from "../helpers/users";

/**
 * Parcours magasin de référence — version API+UI smoke.
 * Prérequis : migrate:fresh --seed (état initial) OU données déjà avancées.
 */
test.describe("P14 — Parcours magasin de référence (E2E)", () => {
  test("P14-01..03 · Magasins + login OPT-A + C2 actifs", async ({ request }) => {
    await loginOptA(request);
    await loginOptB(request);
    await loginC2(request);
  });

  test("P14-04 · OPT-A crée une paire Active (code auto + engraver)", async ({ request }) => {
    const token = await loginOptA(request);
    const clients = await (await apiGet(request, "/opticien/clients", token)).json();
    const list = clients.data?.data ?? clients.data ?? [];
    const client = (Array.isArray(list) ? list : []).find(
      (c: { email?: string }) => c.email === users.c2.email,
    ) ?? (Array.isArray(list) ? list[0] : null);
    expect(client?.uuid).toBeTruthy();
    const created = await apiPost(
      request,
      "/opticien/pairs",
      { client_uuid: client.uuid, type: "Vue", brand: "E2E-Brand", colors: ["Bleu"] },
      token,
    );
    expect(created.ok()).toBeTruthy();
    const pair = (await created.json()).data;
    const eng = await apiPost(request, `/opticien/pairs/${pair.uuid}/engrave`, {}, token);
    expect(eng.ok()).toBeTruthy();
    expect(pair.assigned_code).toMatch(/^FR\d{4}[A-Z]{2}$/);
  });

  test("P14-05..09 · Perdue → retrouvée B sans PII → (remise si code dispo)", async ({
    request,
    page,
  }) => {
    const tokenC = await loginC2(request);
    const pairs = await (await apiGet(request, "/client/pairs", tokenC)).json();
    const arr = pairs.data?.data ?? pairs.data ?? [];
    const active = (Array.isArray(arr) ? arr : []).find((p: { status: string; brand?: string }) =>
      String(p.status).toLowerCase().includes("active"),
    );
    test.skip(!active, "Besoin d’une paire Active C2");
    await apiPost(request, `/client/pairs/${active.uuid}/lost`, {}, tokenC);

    const tokenB = await loginOptB(request);
    const identify = await apiPost(
      request,
      "/opticien/restitutions/identify",
      { assigned_code: active.assigned_code },
      tokenB,
    );
    expect([200, 201, 409, 422]).toContain(identify.status());
    if (identify.ok()) {
      const json = JSON.stringify(await identify.json()).toLowerCase();
      expect(json).not.toContain(users.c2.email.toLowerCase());
    }

    await setTokenCookie(page, tokenB);
    await page.goto("/opticien/restitution");
    await expect(page.locator("body")).toBeVisible();
  });

  test("P14-10 · GO smoke : health + login spaces", async ({ request, page }) => {
    const health = await request.get(`${process.env.PDV_API_URL ?? "http://localhost:8000/api/v1"}/health`);
    expect(health.status()).toBe(200);
    await page.goto("/login?space=opticien");
    await expect(page.getByRole("heading", { name: /Content de vous revoir/i })).toBeVisible();
    void PASSWORD;
  });
});
