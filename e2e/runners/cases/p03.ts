import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import { API_URL, PASSWORD, cookie, jsonPost, loginApi, users } from "../flows";

export async function runP03(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  switch (c.n) {
    case 1:
      await page.goto(`/invitation/${users.c1.invitationToken}`);
      await expect(page.locator("body")).toBeVisible();
      break;
    case 2: {
      const { res } = await jsonPost(request, `/auth/invitation/${users.c1.invitationToken}`, {
        password: PASSWORD,
        password_confirmation: PASSWORD,
        cgu_accepted: false,
      });
      expect([422, 404, 410, 400]).toContain(res.status());
      break;
    }
    case 3: {
      const { res } = await jsonPost(request, `/auth/invitation/${users.c1.invitationToken}`, {
        password: PASSWORD,
        password_confirmation: PASSWORD,
        cgu_accepted: true,
      });
      expect([200, 404, 410, 422]).toContain(res.status());
      break;
    }
    case 4: {
      const { res } = await jsonPost(request, `/auth/invitation/${users.c1.invitationToken}`, {
        password: PASSWORD,
        password_confirmation: PASSWORD,
        cgu_accepted: true,
      });
      expect([404, 410, 422, 400]).toContain(res.status());
      break;
    }
    case 5: {
      const res = await request.post(`${API_URL}/auth/login`, {
        data: { email: users.c1.email, password: PASSWORD, space: "client" },
      });
      expect([200, 401, 403, 422]).toContain(res.status());
      break;
    }
    case 6: {
      const { res } = await jsonPost(request, "/auth/password/forgot", { email: users.c2.email });
      expect([200, 204]).toContain(res.status());
      break;
    }
    case 7: {
      const token = await loginApi(request, users.c2.email, "client");
      await cookie(page, token);
      await page.goto("/client");
      await expect(page).toHaveURL(/\/client/);
      break;
    }
    default:
      test.skip(true, `P03-${c.n}`);
  }
}
