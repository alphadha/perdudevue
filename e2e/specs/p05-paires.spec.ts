import { test, expect } from "@playwright/test";
import { apiGet, apiPost, loginOptA } from "../helpers/api";
import { setTokenCookie } from "../helpers/auth";

test.describe("P05 — Paires & codes", () => {
  async function firstClientUuid(request: Parameters<typeof loginOptA>[0], token: string) {
    const res = await apiGet(request, "/opticien/clients", token);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const clients = body.data?.data ?? body.data ?? body;
    const list = Array.isArray(clients) ? clients : clients?.items ?? [];
    expect(list.length).toBeGreaterThan(0);
    return list[0].uuid as string;
  }

  test("P05-01 R3-01 · Créer paire sans code → a_graver + FR####AA", async ({ request }) => {
    const token = await loginOptA(request);
    const clientUuid = await firstClientUuid(request, token);
    const res = await apiPost(
      request,
      "/opticien/pairs",
      {
        client_uuid: clientUuid,
        type: "Vue",
        brand: "Ray-Ban",
        colors: ["Noir"],
      },
      token,
    );
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    const pair = body.data;
    expect(pair.status).toMatch(/a_graver|A_GRAVER/i);
    expect(pair.assigned_code).toMatch(/^FR\d{4}[A-Z]{2}$/);
  });

  test("P05-02/05 · UI catalogues & préremplissage fiche", async ({ page, request }) => {
    const token = await loginOptA(request);
    await setTokenCookie(page, token);
    await page.goto("/opticien/lunettes");
    await expect(page).toHaveURL(/\/opticien\/lunettes/);
  });

  test("P05-06/07 R3-06 · Engraver paire a_graver", async ({ request }) => {
    const token = await loginOptA(request);
    const clientUuid = await firstClientUuid(request, token);
    const created = await apiPost(
      request,
      "/opticien/pairs",
      { client_uuid: clientUuid, type: "Soleil", brand: "Gucci", colors: ["Vert"] },
      token,
    );
    expect(created.ok()).toBeTruthy();
    const pair = (await created.json()).data;
    const eng = await apiPost(request, `/opticien/pairs/${pair.uuid}/engrave`, {}, token);
    expect(eng.ok()).toBeTruthy();
    const after = (await eng.json()).data;
    expect(String(after.status).toLowerCase()).toMatch(/active/);
  });

  test("P05-08 R3-07 · Code déjà lié → 422", async ({ request }) => {
    const token = await loginOptA(request);
    const clientUuid = await firstClientUuid(request, token);
    const res = await apiPost(
      request,
      "/opticien/pairs",
      {
        client_uuid: clientUuid,
        type: "Vue",
        brand: "Gucci",
        assigned_code: "FR5487OK",
      },
      token,
    );
    expect(res.status()).toBe(422);
  });

  test("P05-09 R3-08 · Inactiver paire", async ({ request }) => {
    const token = await loginOptA(request);
    const clientUuid = await firstClientUuid(request, token);
    const created = await apiPost(
      request,
      "/opticien/pairs",
      {
        client_uuid: clientUuid,
        type: "Vue",
        brand: "Oakley",
        assigned_code: `FR${String(Date.now()).slice(-4)}ZZ`,
      },
      token,
    );
    if (!created.ok()) {
      // format/collision — créer sans code puis engraver
      const c2 = await apiPost(
        request,
        "/opticien/pairs",
        { client_uuid: clientUuid, type: "Vue", brand: "Oakley" },
        token,
      );
      expect(c2.ok()).toBeTruthy();
      const p = (await c2.json()).data;
      await apiPost(request, `/opticien/pairs/${p.uuid}/engrave`, {}, token);
      const ina = await apiPost(request, `/opticien/pairs/${p.uuid}/inactivate`, {}, token);
      expect(ina.ok()).toBeTruthy();
      return;
    }
    const pair = (await created.json()).data;
    if (String(pair.status).toLowerCase().includes("graver")) {
      await apiPost(request, `/opticien/pairs/${pair.uuid}/engrave`, {}, token);
    }
    const ina = await apiPost(request, `/opticien/pairs/${pair.uuid}/inactivate`, {}, token);
    expect(ina.ok()).toBeTruthy();
  });

  test("P05-10 R3-09 · Code non réutilisable après archive — Feature PHP", async () => {
    test.info().annotations.push({ type: "ref", description: "Lot3PairsTest R3-09" });
  });

  test("P05-11/13 · Fiche / CTAs lunettes", async ({ page, request }) => {
    const token = await loginOptA(request);
    await setTokenCookie(page, token);
    const list = await apiGet(request, "/opticien/pairs", token);
    expect(list.ok()).toBeTruthy();
    const body = await list.json();
    const pairs = body.data?.data ?? body.data ?? [];
    const arr = Array.isArray(pairs) ? pairs : [];
    test.skip(arr.length === 0, "Aucune paire");
    await page.goto(`/opticien/lunettes/${arr[0].uuid}`);
    await expect(page.locator("body")).toBeVisible();
  });

  test("P05-14 DATA · Seed P1 FR5487OK présent", async ({ request }) => {
    const token = await loginOptA(request);
    // Paire chez B — OPT-A peut ne pas la lister ; vérifier via OPT-B restitutions
    const { loginOptB } = await import("../helpers/api");
    const tokenB = await loginOptB(request);
    const res = await apiGet(request, "/opticien/restitutions", tokenB);
    expect(res.ok()).toBeTruthy();
    const text = JSON.stringify(await res.json());
    expect(text).toContain("FR5487OK");
  });
});
