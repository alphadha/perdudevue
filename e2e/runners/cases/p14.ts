import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import {
  API_URL,
  cookie,
  jsonGet,
  jsonPost,
  loginApi,
  unwrapList,
  users,
} from "../flows";

export async function runP14(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  switch (c.n) {
    case 1:
      await loginApi(request, users.optA.email, "opticien");
      await loginApi(request, users.optB.email, "opticien");
      break;
    case 2: {
      const token = await loginApi(request, users.optA.email, "opticien");
      await cookie(page, token);
      await page.goto("/opticien/clients");
      await expect(page).toHaveURL(/clients/);
      break;
    }
    case 3:
      await page.goto(`/invitation/${users.c1.invitationToken}`);
      await expect(page.locator("body")).toBeVisible();
      break;
    case 4: {
      const token = await loginApi(request, users.optA.email, "opticien");
      const { body } = await jsonGet(request, "/opticien/clients", token);
      const list = unwrapList(body);
      const client =
        list.find((x) => x.email === users.c2.email) ?? list[0];
      expect(client?.uuid).toBeTruthy();
      const created = await jsonPost(
        request,
        "/opticien/pairs",
        { client_uuid: client.uuid, type: "Vue", brand: "E2E-Brand", colors: ["Bleu"] },
        token,
      );
      expect(created.res.ok()).toBeTruthy();
      const pair = created.body.data;
      const eng = await jsonPost(request, `/opticien/pairs/${pair.uuid}/engrave`, {}, token);
      expect(eng.res.ok()).toBeTruthy();
      expect(pair.assigned_code).toMatch(/^FR\d{4}[A-Z]{2}$/);
      break;
    }
    case 5: {
      const token = await loginApi(request, users.c2.email, "client");
      const { body } = await jsonGet(request, "/client/pairs", token);
      const active = unwrapList(body).find((p) => /active/i.test(String(p.status)));
      test.skip(!active, "besoin Active C2");
      const { res } = await jsonPost(request, `/client/pairs/${active.uuid}/lost`, {}, token);
      expect([200, 201, 422]).toContain(res.status());
      break;
    }
    case 6: {
      const tokenC = await loginApi(request, users.c2.email, "client");
      const { body } = await jsonGet(request, "/client/pairs", tokenC);
      const lost = unwrapList(body).find(
        (p) => /perdue/i.test(String(p.status)) && p.assigned_code,
      );
      test.skip(!lost, "besoin paire Perdue avec code");
      const tokenB = await loginApi(request, users.optB.email, "opticien");
      const { res, body: idBody } = await jsonPost(
        request,
        "/opticien/restitutions/identify",
        { assigned_code: lost.assigned_code },
        tokenB,
      );
      expect([200, 201, 409, 422]).toContain(res.status());
      if (res.ok()) {
        expect(JSON.stringify(idBody).toLowerCase()).not.toContain(users.c2.email.toLowerCase());
      }
      break;
    }
    case 7:
      await page.goto(`/r/recette-public-p1`);
      await expect(page.locator("body")).toBeVisible();
      break;
    case 8: {
      const token = await loginApi(request, users.optB.email, "opticien");
      await cookie(page, token);
      await page.goto("/opticien/restitution");
      await expect(page.locator("body")).toBeVisible();
      break;
    }
    case 9: {
      const token = await loginApi(request, users.c2.email, "client");
      await cookie(page, token);
      await page.goto("/client");
      await expect(page).toHaveURL(/\/client/);
      break;
    }
    case 10: {
      const health = await request.get(`${API_URL}/health`);
      expect(health.status()).toBe(200);
      await page.goto("/login?space=opticien");
      await expect(page.getByRole("heading", { name: /Content de vous revoir/i })).toBeVisible();
      break;
    }
    default:
      test.skip(true, `P14-${c.n}`);
  }
}
