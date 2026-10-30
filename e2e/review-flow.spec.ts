import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/sample_msa.docx");

test("upload → analysis → redline decision → lawyer approval → export", async ({ page }) => {
  const title = `E2E MSA ${Date.now()}`;
  await signIn(page, "Rita");

  await page.getByRole("button", { name: "Upload contract" }).click();
  const dialog = page.getByRole("dialog");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByRole("button", { name: "Upload and analyze" }).click();

  // the worker runs the whole agent graph; SSE drives the row's status
  const row = page.getByRole("row").filter({ hasText: title });
  await expect(row).toContainText("Awaiting lawyer", { timeout: 150_000 });
  await row.getByRole("link", { name: /Open review/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Contract sections" })
    .getByRole("link", { name: "Risks", exact: true })
    .click();
  await expect(page.getByText("High").first()).toBeVisible();

  await page
    .getByRole("navigation", { name: "Contract sections" })
    .getByRole("link", { name: "Redlines", exact: true })
    .click();
  const accept = page.getByRole("button", { name: "Accept change" });
  await accept.click();
  await expect(accept).toHaveAttribute("aria-pressed", "true");
  const contractUrl = page.url().replace(/\/redlines.*$/, "");

  await signIn(page, "Larry");
  await page.goto(`${contractUrl}/approval`);
  const decision = page.locator("section", {
    has: page.getByRole("heading", { name: "Decision" }),
  });
  await decision.getByRole("radio", { name: "Approve" }).check();
  await decision.getByRole("button", { name: "Approve package" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Approve package" }).click();
  await expect(page.getByText(/Approved/).first()).toBeVisible();

  await page.getByRole("button", { name: /^Export/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: /Redlined \.docx/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.docx$/);
});
