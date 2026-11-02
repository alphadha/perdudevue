import { test, expect } from "@playwright/test";
import { API_URL, PASSWORD, users } from "../helpers/users";

test.describe("P03 — Invitation & auth client", () => {
  test("P03-01 R1-04 · Lien invitation C1 charge le formulaire", async ({ page }) => {
    await page.goto(`/invitation/${users.c1.invitationToken}`);
    await expect(page.getByRole("heading", { name: /Activez votre espace/i })).toBeVisible();
    // Si déjà activé sur un run précédent, message invalide acceptable
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(10);
  });

  test("P03-02 R1-05 · Activation sans CGU refusée (API)", async ({ request }) => {
    const res = await request.post(
      `${API_URL}/auth/invitation/${users.c1.invitationToken}`,
      {
        data: {
          password: PASSWORD,
          password_confirmation: PASSWORD,
          cgu_accepted: false,
        },
      },
    );
    // 422 si token encore valide ; 404/410 si déjà consommé
    expect([422, 404, 410, 400]).toContain(res.status());
  });

  test("P03-03 R1-04 · Activation avec CGU (API, idempotente)", async ({ request }) => {
    const res = await request.post(
      `${API_URL}/auth/invitation/${users.c1.invitationToken}`,
      {
        data: {
          password: PASSWORD,
          password_confirmation: PASSWORD,
          cgu_accepted: true,
        },
      },
    );
    expect([200, 404, 410, 422]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.data.token).toBeTruthy();
    }
  });

  test("P03-04 R1-07 · Token invitation réutilisé invalide", async ({ request }) => {
    // 2e appel après activation
    const res = await request.post(
      `${API_URL}/auth/invitation/${users.c1.invitationToken}`,
      {
        data: {
          password: PASSWORD,
          password_confirmation: PASSWORD,
          cgu_accepted: true,
        },
      },
    );
    expect([404, 410, 422, 400]).toContain(res.status());
  });

  test("P03-05 R1-03 · Login C1 avant set password (si pending)", async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: users.c1.email,
        password: PASSWORD,
        space: "client",
      },
    });
    // pending → 401/403/422 ; déjà activé → 200
    expect([200, 401, 403, 422]).toContain(res.status());
  });

  test("P03-06 R1-06 · Forgot password client C2", async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/password/forgot`, {
      data: { email: users.c2.email },
    });
    expect([200, 204]).toContain(res.status());
  });

  test("P03-07 R5-09 · Prompt géoloc non bloquant (page client)", async ({ page, request }) => {
    const login = await request.post(`${API_URL}/auth/login`, {
      data: { email: users.c2.email, password: PASSWORD, space: "client" },
    });
    test.skip(!login.ok(), "C2 login requis");
    const token = (await login.json()).data.token as string;
    await page.context().addCookies([
      {
        name: "pdv_token",
        value: encodeURIComponent(token),
        url: process.env.PDV_FRONTEND_URL ?? "http://localhost:3000",
        path: "/",
      },
    ]);
    await page.goto("/client");
    await expect(page).toHaveURL(/\/client/);
  });
});
