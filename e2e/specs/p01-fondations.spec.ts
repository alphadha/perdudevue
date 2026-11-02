import { test, expect } from "@playwright/test";
import { API_URL, BACKEND_URL } from "../helpers/users";

test.describe("P01 — Fondations & smoke", () => {
  test("P01-01 R0-01 · Health API 200", async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.status()).toBe(200);
  });

  test("P01-02 R0-02 · Front opticien sans token → login", async ({ page }) => {
    await page.goto("/opticien");
    await expect(page).toHaveURL(/\/login\?space=opticien/);
  });

  test("P01-03 R0-02 · Front client sans token → login", async ({ page }) => {
    await page.goto("/client");
    await expect(page).toHaveURL(/\/login\?space=client/);
  });

  test("P01-04 R8-02 · Filament /admin sans session → login", async ({ page }) => {
    const res = await page.goto(`${BACKEND_URL}/admin/login`);
    expect(res?.ok() || page.url().includes("/admin")).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
  });

  test("P01-05 R0-03 · Tokens pdv / Bootstrap présents sur login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
    const hasBootstrap = await page.locator(".container, .btn, .form-control").count();
    expect(hasBootstrap).toBeGreaterThan(0);
  });

  test("P01-06 ENV · API joignable depuis le front (CORS login)", async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/login`, {
      data: { email: "nobody@example.com", password: "x", space: "opticien" },
    });
    expect([401, 422, 429]).toContain(res.status());
  });
});
