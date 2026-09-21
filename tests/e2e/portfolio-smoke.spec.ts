import { expect, test } from "@playwright/test";

test("mock portfolio workflow covers login, decision proof, analytics, and review", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "WCP Davis-Bacon Compliance Audit Engine" }),
  ).toBeVisible();
  await expect(page.getByText("Sample data", { exact: true })).toBeVisible();

  await page.goto("/analyze");
  await expect(page.getByRole("heading", { name: "Analyze Payroll" })).toBeVisible();
  await page
    .getByPlaceholder("Paste raw WH-347 payroll schema logs here...")
    .fill("Contract DBA-2026-347\nEmployee: Jane Worker\nHourly rate: $45.00\nHours: 40");
  await page.getByRole("button", { name: "Analyze Schedule" }).click();

  await expect(page.getByText("Extract", { exact: true })).toBeVisible();
  await expect(page.getByText("rejected", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Reasoning", { exact: true })).toBeVisible();
  await expect(page.getByText("Deterministic validation rejected this WH-347", { exact: false })).toBeVisible();

  await page.goto("/decisions");
  await expect(page.getByRole("heading", { name: "Decision History" })).toBeVisible();
  await expect(page.getByText("job-wh347-demo-2026", { exact: true })).toBeVisible();

  await page.goto("/analytics/overview");
  await expect(page.getByRole("heading", { name: "Analytics Overview" })).toBeVisible();
  await expect(page.getByText("Total Decisions", { exact: true })).toBeVisible();
  await expect(page.getByText("24", { exact: true })).toBeVisible();

  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Human Review Queue" })).toBeVisible();
  await expect(page.getByText("job-wh347-demo-2026", { exact: true })).toBeVisible();
  await expect(page.getByText(/^\d+ Decisions? Pending Review$/)).toBeVisible();

  const viewport = page.viewportSize();
  expect(viewport?.width).toBeGreaterThan(0);
});
