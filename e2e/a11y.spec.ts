import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test("login and contracts list have no axe violations", async ({ page }) => {
      await page.goto("/login");
      await page.getByRole("heading", { level: 1 }).waitFor();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await signIn(page, "Rita");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    test("first contract's screens have no axe violations", async ({ page }) => {
      await signIn(page, "Rita");
      const open = page.getByRole("link", { name: /Open review/ }).first();
      test.skip((await open.count()) === 0, "no contracts yet; run review-flow first");
      await page.goto((await open.getAttribute("href")) ?? "/contracts");
      await expect(page.getByRole("navigation", { name: "Contract sections" })).toBeVisible();
      for (const tab of ["Viewer", "Risks", "Redlines", "Approval"]) {
        await page
          .getByRole("navigation", { name: "Contract sections" })
          .getByRole("link", { name: tab, exact: true })
          .click();
        await page.waitForLoadState("networkidle");
        await page.getByRole("heading", { level: 2 }).first().waitFor({ state: "attached" });
        expect((await new AxeBuilder({ page }).analyze()).violations, tab).toEqual([]);
      }
    });
  });
}
