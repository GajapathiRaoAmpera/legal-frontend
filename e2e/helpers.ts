import { expect, type Page } from "@playwright/test";

export async function signIn(page: Page, name: "Rita" | "Larry" | "Ada") {
  await page.goto("/login");
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/login");
  await page.getByRole("radio", { name: new RegExp(name) }).check();
  await page.getByRole("button", { name: `Sign in as ${name}` }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Contracts" })).toBeVisible();
}
