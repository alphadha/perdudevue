import { Page, expect } from "@playwright/test";
import { Space, users } from "./users";

export async function uiLogin(
  page: Page,
  email: string,
  space: Space,
  password = users.optA.password,
) {
  await page.goto(`/login?space=${space}`);
  await page.getByRole("button", { name: space === "opticien" ? "Espace Opticien" : "Espace Client" }).click();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
}

export async function expectOpticienHome(page: Page) {
  await expect(page).toHaveURL(/\/opticien/);
}

export async function expectClientHome(page: Page) {
  await expect(page).toHaveURL(/\/client/);
}

export async function setTokenCookie(page: Page, token: string) {
  await page.context().addCookies([
    {
      name: "pdv_token",
      value: encodeURIComponent(token),
      url: process.env.PDV_FRONTEND_URL ?? "http://localhost:3000",
      path: "/",
      sameSite: "Lax",
    },
  ]);
}
