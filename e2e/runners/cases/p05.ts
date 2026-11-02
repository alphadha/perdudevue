import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import {
  cookie,
  firstClientUuid,
  jsonGet,
  jsonPost,
  loginApi,
  seed,
  unwrapList,
  users,
} from "../flows";

export async function runP05(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  switch (c.n) {
    case 1: {
      const token = await loginApi(request, users.optA.email, "opticien");
      const clientUuid = await firstClientUuid(request, token);
      const { res, body } = await jsonPost(
        request,
        "/opticien/pairs",
        { client_uuid: clientUuid, type: "Vue", brand: "Ray-Ban", colors: ["Noir"] },
        token,
      );
      expect([200, 201]).toContain(res.status());
      expect(String(body.data.status)).toMatch(/a_graver/i);
      expect(body.data.assigned_code).toMatch(/^FR\d{4}[A-Z]{2}$/);
      break;
    }
    case 2:
    case 3:
    case 4: {
      const token = await loginApi(request, users.optA.email, "opticien");
      const { res, body } = await jsonGet(request, "/opticien/catalogs/pairs", token);
      expect(res.ok()).toBeTruthy();
      const text = JSON.stringify(body).toLowerCase();
      if (c.n === 3) {
        expect(text).toMatch(/vue|soleil/);
      }
      break;
    }
    case 5: {
      const token = await loginApi(request, users.optA.email, "opticien");
      await cookie(page, token);
      const uuid = await firstClientUuid(request, token);
      await page.goto(`/opticien/clients/${uuid}`);
      await expect(page.locator("body")).toBeVisible();
      break;
    }
    case 6: {
      const token = await loginApi(request, users.optA.email, "opticien");
      await cookie(page, token);
      const { body } = await jsonGet(request, "/opticien/pairs?status=a_graver", token);
      const list = unwrapList(body);
      if (list.length === 0) {
        const clientUuid = await firstClientUuid(request, token);
        await jsonPost(
          request,
          "/opticien/pairs",
          { client_uuid: clientUuid, type: "Vue", brand: "Export" },
          token,
        );
      }
      await page.goto("/opticien/lunettes");
      await expect(page.locator("body")).toContainText(/FR\d{4}|À graver|graver|code/i);
      break;
    }
    case 7: {
      const token = await loginApi(request, users.optA.email, "opticien");
      const clientUuid = await firstClientUuid(request, token);
      const created = await jsonPost(
        request,
        "/opticien/pairs",
        { client_uuid: clientUuid, type: "Soleil", brand: "Gucci" },
        token,
      );
      expect(created.res.ok()).toBeTruthy();
      const pair = created.body.data;
      const eng = await jsonPost(request, `/opticien/pairs/${pair.uuid}/engrave`, {}, token);
      expect(eng.res.ok()).toBeTruthy();
      expect(String(eng.body.data.status).toLowerCase()).toMatch(/active/);
      break;
    }
    case 8: {
      const token = await loginApi(request, users.optA.email, "opticien");
      const clientUuid = await firstClientUuid(request, token);
      const { res } = await jsonPost(
        request,
        "/opticien/pairs",
        {
          client_uuid: clientUuid,
          type: "Vue",
          brand: "Gucci",
          assigned_code: seed.pairP1AssignedCode,
        },
        token,
      );
      expect(res.status()).toBe(422);
      break;
    }
    case 9: {
      const token = await loginApi(request, users.optA.email, "opticien");
      const clientUuid = await firstClientUuid(request, token);
      const created = await jsonPost(
        request,
        "/opticien/pairs",
        { client_uuid: clientUuid, type: "Vue", brand: "Oakley" },
        token,
      );
      expect(created.res.ok()).toBeTruthy();
      const uuid = created.body.data.uuid;
      await jsonPost(request, `/opticien/pairs/${uuid}/engrave`, {}, token);
      const ina = await jsonPost(request, `/opticien/pairs/${uuid}/inactivate`, {}, token);
      expect(ina.res.ok()).toBeTruthy();
      break;
    }
    case 10:
      test.info().annotations.push({ type: "ref", description: "Lot3PairsTest R3-09 archive" });
      break;
    case 11:
    case 12:
    case 13: {
      const token = await loginApi(request, users.optA.email, "opticien");
      await cookie(page, token);
      const { body } = await jsonGet(request, "/opticien/pairs", token);
      const list = unwrapList(body);
      test.skip(list.length === 0, "aucune paire");
      await page.goto(`/opticien/lunettes/${list[0].uuid}`);
      await expect(page.locator("body")).toBeVisible();
      break;
    }
    case 14: {
      const tokenB = await loginApi(request, users.optB.email, "opticien");
      const { res, body } = await jsonGet(request, "/opticien/restitutions", tokenB);
      expect(res.ok()).toBeTruthy();
      expect(JSON.stringify(body)).toContain(seed.pairP1AssignedCode);
      break;
    }
    default:
      test.skip(true, `P05-${c.n}`);
  }
}
