import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import {
  cookie,
  jsonGet,
  jsonPost,
  loginApi,
  seed,
  unwrapList,
  users,
} from "../flows";

export async function runP06(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  switch (c.n) {
    case 1: {
      const token = await loginApi(request, users.c2.email, "client");
      const { body } = await jsonGet(request, "/client/pairs", token);
      const active = unwrapList(body).find((p) => String(p.status).toLowerCase().includes("active"));
      test.skip(!active, "pas de paire Active C2");
      const { res } = await jsonPost(request, `/client/pairs/${active.uuid}/lost`, {}, token);
      expect([200, 201, 422]).toContain(res.status());
      break;
    }
    case 2: {
      const token = await loginApi(request, users.optB.email, "opticien");
      const { res, body } = await jsonPost(
        request,
        "/opticien/restitutions/identify",
        { assigned_code: seed.pairP1AssignedCode },
        token,
      );
      expect([200, 201, 409, 422]).toContain(res.status());
      if (res.ok()) {
        const json = JSON.stringify(body).toLowerCase();
        expect(json).not.toContain("client.c1@example.com");
      }
      break;
    }
    case 3:
    case 4:
      await page.goto(`/r/${seed.publicRestitutionToken}`);
      await expect(page.locator("body")).toBeVisible();
      expect((await page.locator("body").innerText()).toLowerCase()).not.toContain(
        "client.c1@example.com",
      );
      break;
    case 5:
      await page.goto("/r/token-invalide-xxx");
      expect((await page.locator("body").innerText()).toLowerCase()).toMatch(
        /introuvable|invalide|expiré|erreur|404/,
      );
      break;
    case 6: {
      const token = await loginApi(request, users.optB.email, "opticien");
      await cookie(page, token);
      await page.goto("/opticien");
      await expect(page.locator("body")).toContainText(/récupér|attente|restitution|lunettes/i);
      break;
    }
    case 7: {
      const token = await loginApi(request, users.optB.email, "opticien");
      await cookie(page, token);
      await page.goto("/opticien/restitution");
      await expect(page).toHaveURL(/restitution/);
      break;
    }
    case 8: {
      const token = await loginApi(request, users.optB.email, "opticien");
      const { res } = await jsonPost(
        request,
        "/opticien/restitutions/handover",
        { assigned_code: seed.pairP1AssignedCode, pickup_code: "XXXXXX" },
        token,
      );
      expect([400, 404, 422]).toContain(res.status());
      break;
    }
    case 9: {
      const token = await loginApi(request, users.optB.email, "opticien");
      const { res, body } = await jsonPost(
        request,
        "/opticien/restitutions/handover",
        { assigned_code: seed.pairP1AssignedCode, pickup_code: seed.pairP1PickupCode },
        token,
      );
      expect([200, 201, 409, 422]).toContain(res.status());
      if (res.ok()) {
        expect(JSON.stringify(body).toLowerCase()).not.toContain("client.c1@example.com");
      }
      break;
    }
    case 10: {
      const token = await loginApi(request, users.optB.email, "opticien");
      const { res } = await jsonGet(request, "/opticien/restitutions", token);
      expect(res.ok()).toBeTruthy();
      break;
    }
    case 11: {
      const token = await loginApi(request, users.optA.email, "opticien");
      const { res } = await jsonPost(
        request,
        "/opticien/restitutions/handover",
        { assigned_code: seed.pairAtAAssignedCode, pickup_code: seed.pairAtAPickupCode },
        token,
      );
      expect([200, 201, 409, 422]).toContain(res.status());
      break;
    }
    case 12: {
      const token = await loginApi(request, users.optB.email, "opticien");
      const { res } = await jsonPost(
        request,
        "/opticien/restitutions/identify",
        { assigned_code: "FR6003CC" },
        token,
      );
      expect([400, 404, 422]).toContain(res.status());
      break;
    }
    case 13:
      test.info().annotations.push({ type: "ref", description: "Lot4 R4-10 rate-limit renvoi" });
      break;
    case 14: {
      const token = await loginApi(request, users.optB.email, "opticien");
      await cookie(page, token);
      await page.goto("/opticien/notifications");
      await expect(page).toHaveURL(/notifications/);
      break;
    }
    default:
      test.skip(true, `P06-${c.n}`);
  }
}
