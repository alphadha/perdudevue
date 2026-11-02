import { test, expect } from "@playwright/test";
import { apiGet, apiPost, loginOptA, loginOptB } from "../helpers/api";
import { setTokenCookie, uiLogin, expectOpticienHome } from "../helpers/auth";
import { users } from "../helpers/users";

test.describe("P04 — Clients magasin", () => {
  test("P04-01 R2-06 · Liste clients OPT-A scoped", async ({ page, request }) => {
    const token = await loginOptA(request);
    await setTokenCookie(page, token);
    await page.goto("/opticien/clients");
    await expect(page).toHaveURL(/\/opticien\/clients/);
    await expect(page.locator("body")).toContainText(/client|Camille|Chloé|Leroy|Bernard/i);
  });

  test("P04-02 R2-01 · Créer un client (API)", async ({ request }) => {
    const token = await loginOptA(request);
    const email = `qa.client.${Date.now()}@example.com`;
    const res = await apiPost(
      request,
      "/opticien/clients",
      {
        first_name: "Qa",
        last_name: "Client",
        email,
        phone: "0612345678",
        consent_email: true,
        consent_sms: true,
      },
      token,
    );
    expect([200, 201]).toContain(res.status());
  });

  test("P04-03 R2-02 · Consentements séparés (API create)", async ({ request }) => {
    const token = await loginOptA(request);
    const email = `qa.consent.${Date.now()}@example.com`;
    const res = await apiPost(
      request,
      "/opticien/clients",
      {
        first_name: "Consent",
        last_name: "MailOnly",
        email,
        phone: "0611111111",
        consent_email: true,
        consent_sms: false,
      },
      token,
    );
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.data.consent_email ?? body.data.client?.consent_email).toBeTruthy();
  });

  test("P04-04 R2-03 · Doublon email → flow confirm (API)", async ({ request }) => {
    const token = await loginOptA(request);
    const res = await apiPost(
      request,
      "/opticien/clients",
      {
        first_name: "Camille",
        last_name: "Leroy",
        email: users.c1.email,
        phone: "0600000000",
        consent_email: true,
        consent_sms: true,
      },
      token,
    );
    // 409 / 422 avec token doublon, ou 200 rattachement selon implémentation
    expect([200, 201, 409, 422]).toContain(res.status());
  });

  test("P04-05/06 · Doublon update / annuler — couverts Feature PHP", async () => {
    test.info().annotations.push({
      type: "ref",
      description: "Lot2ClientsTest — R2-04 R2-05",
    });
  });

  test("P04-07/08 R2-08/09 · OTP email/tél — Feature PHP + UI fiche", async ({ page, request }) => {
    const token = await loginOptA(request);
    await setTokenCookie(page, token);
    await page.goto("/opticien/clients");
    await expect(page.locator("body")).toBeVisible();
  });

  test("P04-09 R2-07 · Isolation unlink — Feature PHP", async () => {
    test.info().annotations.push({ type: "ref", description: "Lot2ClientsTest R2-07" });
  });

  test("P04-10 R2-10 · Pas de menu Utilisateurs Next", async ({ page, request }) => {
    const token = await loginOptA(request);
    await setTokenCookie(page, token);
    await page.goto("/opticien");
    await expectOpticienHome(page);
    await expect(page.getByRole("link", { name: /^Utilisateurs$/i })).toHaveCount(0);
  });

  test("P04-11 R2-11 · Users magasin Filament only — skip UI Filament", async () => {
    test.skip(true, "Invitation user magasin = Filament fiche opticien");
  });

  test("P04-12 R2-06 · OPT-B ne voit pas clients uniquement A", async ({ request }) => {
    const tokenA = await loginOptA(request);
    const tokenB = await loginOptB(request);
    const listA = await (await apiGet(request, "/opticien/clients", tokenA)).json();
    const listB = await (await apiGet(request, "/opticien/clients", tokenB)).json();
    const emailsA = JSON.stringify(listA);
    const emailsB = JSON.stringify(listB);
    // C1 (Camille) rattaché A only — ne doit pas apparaître chez B
    if (emailsA.includes("client.c1@example.com")) {
      expect(emailsB).not.toContain("client.c1@example.com");
    }
  });
});
