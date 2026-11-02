import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { API_URL, BACKEND_URL, PASSWORD, seed, users } from "../helpers/users";

export async function loginApi(
  request: APIRequestContext,
  email: string,
  space: "opticien" | "client",
  password = PASSWORD,
) {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email, password, space },
  });
  expect(res.ok(), `login ${email} ${res.status()}`).toBeTruthy();
  return (await res.json()).data.token as string;
}

export async function cookie(page: Page, token: string) {
  await page.context().addCookies([
    {
      name: "pdv_token",
      value: encodeURIComponent(token),
      url: process.env.PDV_FRONTEND_URL ?? "http://localhost:3000",
      path: "/",
      sameSite: "Lax" as const,
    },
  ]);
}

export async function jsonGet(request: APIRequestContext, path: string, token?: string) {
  const res = await request.get(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return { res, body: await res.json().catch(() => ({})) };
}

export async function jsonPost(
  request: APIRequestContext,
  path: string,
  data?: unknown,
  token?: string,
) {
  const res = await request.post(`${API_URL}${path}`, {
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return { res, body: await res.json().catch(() => ({})) };
}

export async function jsonPatch(
  request: APIRequestContext,
  path: string,
  data?: unknown,
  token?: string,
) {
  const res = await request.patch(`${API_URL}${path}`, {
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return { res, body: await res.json().catch(() => ({})) };
}

export function unwrapList(body: any): any[] {
  const d = body?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.items)) return d.items;
  return [];
}

export async function firstClientUuid(request: APIRequestContext, token: string) {
  const { res, body } = await jsonGet(request, "/opticien/clients", token);
  expect(res.ok()).toBeTruthy();
  const list = unwrapList(body);
  expect(list.length).toBeGreaterThan(0);
  return list[0].uuid as string;
}

export async function uiLogin(
  page: Page,
  email: string,
  space: "opticien" | "client",
  password = PASSWORD,
) {
  await page.goto(`/login?space=${space}`);
  await page
    .getByRole("button", { name: space === "opticien" ? "Espace Opticien" : "Espace Client" })
    .click();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
}

export { API_URL, BACKEND_URL, PASSWORD, seed, users };
