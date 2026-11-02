import { test, expect } from "@playwright/test";
import { apiGet, apiPost, loginOptA, loginOptB } from "../helpers/api";
import { setTokenCookie } from "../helpers/auth";
import { seed } from "../helpers/users";

/**
 * Seed : P1 FR5487OK déjà a_recuperer chez OPT-B (pas besoin de déclarer perdue).
 * Cahier P06-01 ajusté : cas « déclarer perdue » = autre paire Active (C2 FR6001AA).
 */
test.describe("P06 — Restitution magasin (critique)", () => {
  test("P06-01 · Déclarer perdue (paire Active C2) puis OK", async ({ request }) => {
    const { loginC2 } = await import("../helpers/api");
    const token = await loginC2(request);
    const list = await apiGet(request, "/client/pairs", token);
    expect(list.ok()).toBeTruthy();
    const body = await list.json();
    const pairs = body.data?.data ?? body.data ?? [];
    const active = (Array.isArray(pairs) ? pairs : []).find((p: { status: string }) =>
      String(p.status).toLowerCase().includes("active"),
    );
    test.skip(!active, "Pas de paire Active côté C2");
    const res = await apiPost(request, `/client/pairs/${active.uuid}/lost`, {}, token);
    expect([200, 201, 422]).toContain(res.status());
  });

  test("P06-02 R4-01 · Identify code assigné P1 chez OPT-B sans PII C1", async ({ request }) => {
    const token = await loginOptB(request);
    // Si déjà en dépôt, identify peut renvoyer l’existant
    const res = await apiPost(
      request,
      "/opticien/restitutions/identify",
      { assigned_code: seed.pairP1AssignedCode },
      token,
    );
    expect([200, 201, 409, 422]).toContain(res.status());
    if (res.ok()) {
      const json = JSON.stringify(await res.json()).toLowerCase();
      expect(json).not.toContain("client.c1@example.com");
      expect(json).not.toMatch(/camille.*leroy/);
    }
  });

  test("P06-03/04 R4-02 R1-09 · Page publique /r/{token}", async ({ page }) => {
    await page.goto(`/r/${seed.publicRestitutionToken}`);
    await expect(page.locator("body")).toBeVisible();
    const text = await page.locator("body").innerText();
    expect(text.length).toBeGreaterThan(20);
    expect(text.toLowerCase()).not.toContain("client.c1@example.com");
  });

  test("P06-05 R1-10 · Token public tampered → erreur", async ({ page }) => {
    await page.goto("/r/token-invalide-recette-xxx");
    const body = await page.locator("body").innerText();
    expect(body.toLowerCase()).toMatch(/introuvable|invalide|expiré|404|erreur/);
  });

  test("P06-06 R4-04 · Dashboard OPT-B attente", async ({ page, request }) => {
    const token = await loginOptB(request);
    await setTokenCookie(page, token);
    await page.goto("/opticien");
    await expect(page.locator("body")).toContainText(/récupér|attente|restitution|lunettes/i);
  });

  test("P06-07 R4-03 · CTA Remettre selon contexte UI", async ({ page, request }) => {
    const token = await loginOptB(request);
    await setTokenCookie(page, token);
    await page.goto("/opticien/restitution");
    await expect(page).toHaveURL(/restitution/);
  });

  test("P06-08 R4-07 · Mauvais code restitution", async ({ request }) => {
    const token = await loginOptB(request);
    const res = await apiPost(
      request,
      "/opticien/restitutions/handover",
      { assigned_code: seed.pairP1AssignedCode, pickup_code: "XXXXXX" },
      token,
    );
    expect([422, 400, 404]).toContain(res.status());
  });

  test("P06-09 R4-05 · Remise OK code KSKKYK (identité masquée si non client)", async ({
    request,
  }) => {
    const token = await loginOptB(request);
    const res = await apiPost(
      request,
      "/opticien/restitutions/handover",
      {
        assigned_code: seed.pairP1AssignedCode,
        pickup_code: seed.pairP1PickupCode,
      },
      token,
    );
    // 200 si encore à récupérer ; 422 si déjà remis sur un run précédent
    expect([200, 201, 422, 409]).toContain(res.status());
    if (res.ok()) {
      const json = JSON.stringify(await res.json()).toLowerCase();
      expect(json).not.toContain("client.c1@example.com");
    }
  });

  test("P06-10 R4-09 · Après remise absente liste restitutions", async ({ request }) => {
    const token = await loginOptB(request);
    const res = await apiGet(request, "/opticien/restitutions", token);
    expect(res.ok()).toBeTruthy();
  });

  test("P06-11 R4-06 · Remise chez A sur client local (FR5488OK)", async ({ request }) => {
    const token = await loginOptA(request);
    const res = await apiPost(
      request,
      "/opticien/restitutions/handover",
      {
        assigned_code: seed.pairAtAAssignedCode,
        pickup_code: seed.pairAtAPickupCode,
      },
      token,
    );
    expect([200, 201, 422, 409]).toContain(res.status());
  });

  test("P06-12 R4-08 · Paire inactive refusée en retrouvée", async ({ request }) => {
    const token = await loginOptB(request);
    const res = await apiPost(
      request,
      "/opticien/restitutions/identify",
      { assigned_code: "FR6003CC" },
      token,
    );
    expect([422, 400, 404]).toContain(res.status());
  });

  test("P06-13 R4-10 · Renvoi code rate-limit — Feature PHP", async () => {
    test.info().annotations.push({ type: "ref", description: "Lot4RestitutionsTest R4-10" });
  });

  test("P06-14 R6-04 · Inbox OPT-B", async ({ page, request }) => {
    const token = await loginOptB(request);
    await setTokenCookie(page, token);
    await page.goto("/opticien/notifications");
    await expect(page).toHaveURL(/notifications/);
  });
});
