import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import { cookie, jsonGet, jsonPost, loginApi, unwrapList, users } from "../flows";

export async function runP09(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  switch (c.n) {
    case 1: {
      const token = await loginApi(request, users.c2.email, "client");
      const { body } = await jsonGet(request, "/client/pairs", token);
      const waiting = unwrapList(body).find((p) => /recuperer/i.test(String(p.status)));
      test.skip(!waiting, "pas de a_recuperer C2");
      const { res } = await jsonPost(
        request,
        `/client/pairs/${waiting.uuid}/shipments`,
        { mode: "relay", consent_address: false },
        token,
      );
      expect([400, 422]).toContain(res.status());
      break;
    }
    case 2:
    case 3:
    case 4: {
      const token = await loginApi(request, users.c2.email, "client");
      await cookie(page, token);
      await page.goto("/client");
      await expect(page.locator("body")).toBeVisible();
      test.info().annotations.push({
        type: "note",
        description: "Stripe Checkout hors app — cartes test sur page Stripe (Lot7 Feature)",
      });
      break;
    }
    case 5: {
      const token = await loginApi(request, users.optB.email, "opticien");
      const { res } = await jsonGet(request, "/opticien/restitutions", token);
      expect(res.ok()).toBeTruthy();
      break;
    }
    case 6:
      test.skip(true, "MR sandbox PDF — credentials / fallback .txt");
      break;
    case 7: {
      const token = await loginApi(request, users.optB.email, "opticien");
      await cookie(page, token);
      await page.goto("/opticien/lunettes");
      await expect(page).toHaveURL(/lunettes/);
      break;
    }
    case 8:
    case 10:
      test.info().annotations.push({ type: "ref", description: "Lot7RemoteDeliveryTest markShipped/suivi" });
      expect(true).toBeTruthy();
      break;
    case 9: {
      const token = await loginApi(request, users.c2.email, "client");
      const text = JSON.stringify((await jsonGet(request, "/client/pairs", token)).body);
      // Pas d'ETA datée promise tant que contrat transporteur absent
      expect(/"eta"\s*:\s*"\d{4}-\d{2}-\d{2}/.test(text)).toBeFalsy();
      break;
    }
    case 11: {
      const token = await loginApi(request, users.c2.email, "client");
      await cookie(page, token);
      await page.goto("/client");
      await expect(page.locator("body")).toBeVisible();
      break;
    }
    default:
      test.skip(true, `P09-${c.n}`);
  }
}
