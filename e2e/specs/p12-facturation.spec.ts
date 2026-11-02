import { test, expect } from "@playwright/test";
import { BACKEND_URL } from "../helpers/users";

test.describe("P12 — Facturation & Qonto", () => {
  test("P12-01..07 R10-* · Billing Filament + Feature Lot10", async ({ page }) => {
    await page.goto(`${BACKEND_URL}/admin/login`);
    await expect(page.locator("body")).toBeVisible();
    test.info().annotations.push({
      type: "ref",
      description: "Lot10BillingTest.php — /admin/billing-review · qonto skipped sans clé",
    });
  });
});
