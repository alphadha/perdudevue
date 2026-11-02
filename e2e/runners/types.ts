import type { APIRequestContext, Page } from "@playwright/test";

export type CaseDef = {
  id: string;
  parcours: string;
  n: number;
  priority: string;
  role: string;
  page: string;
  action: string;
  expected: string;
  ref: string;
};

export type Ctx = {
  page: Page;
  request: APIRequestContext;
};
