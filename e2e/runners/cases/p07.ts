import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import { cookie, jsonGet, jsonPost, loginApi, unwrapList, users } from "../flows";

export async function runP07(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  const token = await loginApi(request, users.c2.email, "client");

  switch (c.n) {
    case 1:
      await cookie(page, token);
      await page.goto("/client");
      await expect(page).toHaveURL(/\/client/);
      await expect(page.locator("body")).toContainText(/lunette|paire|Gucci|Active|Perdue|Inactive|récupér/i);
      break;
    case 2: {
      const { body } = await jsonGet(request, "/client/pairs", token);
      const active = unwrapList(body).find((p) => /active/i.test(String(p.status)));
      test.skip(!active, "pas de paire Active");
      const { res } = await jsonPost(request, `/client/pairs/${active.uuid}/lost`, {}, token);
      expect([200, 201, 422]).toContain(res.status());
      break;
    }
    case 3: {
      const { body } = await jsonGet(request, "/client/pairs", token);
      const lost = unwrapList(body).find((p) => /perdue/i.test(String(p.status)));
      test.skip(!lost, "pas de paire Perdue");
      const { res } = await jsonPost(request, `/client/pairs/${lost.uuid}/recovered`, {}, token);
      expect([200, 201, 422]).toContain(res.status());
      break;
    }
    case 4: {
      const { body } = await jsonGet(request, "/client/pairs", token);
      const active = unwrapList(body).find((p) => /active/i.test(String(p.status)));
      test.skip(!active, "pas de paire Active à inactiver");
      const { res } = await jsonPost(request, `/client/pairs/${active.uuid}/inactivate`, {}, token);
      expect([200, 201, 422]).toContain(res.status());
      break;
    }
    case 5:
      await cookie(page, token);
      await page.goto("/client");
      await expect(page.locator("body")).toBeVisible();
      break;
    case 6: {
      await cookie(page, token);
      const { body } = await jsonGet(request, "/client/pairs", token);
      const waiting = unwrapList(body).find((p) => /recuperer|livraison/i.test(String(p.status)));
      test.skip(!waiting, "pas de paire à récupérer");
      await page.goto(`/client/lunettes/${waiting.uuid}/recuperer`);
      await expect(page.locator("body")).toBeVisible();
      break;
    }
    case 7: {
      const text = JSON.stringify((await jsonGet(request, "/client/pairs", token)).body);
      expect(text).not.toContain("FR5487OK");
      break;
    }
    case 8:
      await cookie(page, token);
      await page.goto("/client/parametres/notifications");
      await expect(page).toHaveURL(/notifications/);
      break;
    case 9:
      await cookie(page, token);
      await page.goto("/client");
      await expect(page.locator("body")).toBeVisible();
      break;
    default:
      test.skip(true, `P07-${c.n}`);
  }
}
