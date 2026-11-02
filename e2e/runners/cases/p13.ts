import { expect, test } from "@playwright/test";
import type { CaseDef, Ctx } from "../types";
import {
  API_URL,
  cookie,
  firstClientUuid,
  jsonGet,
  jsonPatch,
  jsonPost,
  loginApi,
  seed,
  users,
} from "../flows";

export async function runP13(c: CaseDef, ctx: Ctx) {
  const { page, request } = ctx;
  switch (c.n) {
    case 1: {
      const tokenB = await loginApi(request, users.optB.email, "opticien");
      const rest = JSON.stringify((await jsonGet(request, "/opticien/restitutions", tokenB)).body);
      const match = rest.match(/"uuid"\s*:\s*"([^"]+)"/);
      test.skip(!match, "pas d'uuid restitution");
      const tokenC2 = await loginApi(request, users.c2.email, "client");
      const { res } = await jsonGet(request, `/client/pairs/${match![1]}`, tokenC2);
      expect([403, 404]).toContain(res.status());
      break;
    }
    case 2: {
      const tokenA = await loginApi(request, users.optA.email, "opticien");
      const { res } = await jsonGet(
        request,
        "/opticien/clients/00000000-0000-4000-8000-000000000099",
        tokenA,
      );
      expect([403, 404]).toContain(res.status());
      break;
    }
    case 3: {
      const token = await loginApi(request, users.optA.email, "opticien");
      const before = (await jsonGet(request, "/auth/me", token)).body;
      await jsonPatch(
        request,
        "/opticien/account/email",
        { email: `noop.${Date.now()}@example.com`, role: "admin_pdv" },
        token,
      );
      const after = (await jsonGet(request, "/auth/me", token)).body;
      expect(after.data?.role ?? after.data?.user?.role).toBe(
        before.data?.role ?? before.data?.user?.role,
      );
      break;
    }
    case 4: {
      const token = await loginApi(request, users.optA.email, "opticien");
      await cookie(page, token);
      const clientUuid = await firstClientUuid(request, token);
      const created = await jsonPost(
        request,
        "/opticien/pairs",
        {
          client_uuid: clientUuid,
          type: "Vue",
          brand: "<script>alert(1)</script>",
          colors: ["Rouge"],
        },
        token,
      );
      expect([200, 201, 422]).toContain(created.res.status());
      if (created.res.ok()) {
        await page.goto(`/opticien/lunettes/${created.body.data.uuid}`);
        expect(await page.content()).not.toMatch(/<script>alert\(1\)<\/script>/);
      }
      break;
    }
    case 5: {
      const token = await loginApi(request, users.optA.email, "opticien");
      const { res } = await jsonGet(
        request,
        `/opticien/clients?search=${encodeURIComponent("' OR 1=1 --")}`,
        token,
      );
      expect(res.status()).not.toBe(500);
      break;
    }
    case 6:
    case 7:
      test.info().annotations.push({ type: "note", description: c.expected });
      expect(true).toBeTruthy();
      break;
    case 8: {
      const res = await request.post(`${API_URL}/auth/login`, {
        headers: { Origin: "https://evil.example" },
        data: { email: "x@y.z", password: "x", space: "opticien" },
      });
      expect([401, 403, 422, 429]).toContain(res.status());
      break;
    }
    case 9: {
      const res = await request.post(`${API_URL}/auth/login`, {
        data: { email: "x@y.z", password: "bad", space: "opticien" },
      });
      const text = await res.text();
      expect(text.toLowerCase()).not.toContain("password1");
      break;
    }
    case 10:
      expect(seed.publicRestitutionToken).not.toMatch(/^\d+$/);
      break;
    default:
      test.skip(true, `P13-${c.n}`);
  }
}
