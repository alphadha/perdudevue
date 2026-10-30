import type { ApiEnvelope, ApiError } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public errors: ApiError[],
    public data: unknown = null,
  ) {
    super(errors[0]?.message ?? "Une erreur est survenue.");
  }

  fieldError(field: string): string | undefined {
    return this.errors.find((error) => error.field === field)?.message;
  }
}

export function getToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(/(?:^|; )pdv_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSession(token: string): void {
  document.cookie = `pdv_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
}

export function clearSession(): void {
  document.cookie = "pdv_token=; Path=/; Max-Age=0; SameSite=Lax";
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok) {
    throw new ApiRequestError(response.status, payload.errors ?? [], payload.data);
  }
  return payload.data;
}
