import { APIRequestContext, expect } from "@playwright/test";
import { API_URL, PASSWORD, users } from "./users";

export type Space = "opticien" | "client";

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  space: Space,
  password = PASSWORD,
): Promise<string> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email, password, space },
  });
  expect(response.ok(), `login ${email} → ${response.status()}`).toBeTruthy();
  const body = await response.json();
  const token = body?.data?.token as string | undefined;
  expect(token, "token manquant").toBeTruthy();
  return token!;
}

export async function apiGet(
  request: APIRequestContext,
  path: string,
  token?: string,
) {
  return request.get(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function apiPost(
  request: APIRequestContext,
  path: string,
  data?: unknown,
  token?: string,
) {
  return request.post(`${API_URL}${path}`, {
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function apiPatch(
  request: APIRequestContext,
  path: string,
  data?: unknown,
  token?: string,
) {
  return request.patch(`${API_URL}${path}`, {
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function loginOptA(request: APIRequestContext) {
  return apiLogin(request, users.optA.email, "opticien");
}

export async function loginOptB(request: APIRequestContext) {
  return apiLogin(request, users.optB.email, "opticien");
}

export async function loginC2(request: APIRequestContext) {
  return apiLogin(request, users.c2.email, "client");
}
