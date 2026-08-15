import { expect, test } from "@playwright/test";

test("mock portfolio workflow covers login, decision proof, analytics, and review", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "WCP Compliance" })).toBeVisible();

  await page.getByPlaceholder("you@example.com").fill("portfolio@example.com");
  await page.getByPlaceholder("••••••••").fill("offline-demo");
  await page.getByRole("button", { name: "Authenticate Account" }).click();

  await expect(
    page.getByRole("heading", { name: "WCP Davis-Bacon Compliance Audit Engine" }),
  ).toBeVisible();

  await page.goto("/analyze");
  await expect(page.getByRole("heading", { name: "Analyze Payroll" })).toBeVisible();
  await page
    .getByPlaceholder("Paste raw WH-347 payroll schema logs here...")
    .fill("Contract 123\nEmployee: Jane Worker\nHourly rate: $51.69\nHours: 40");
  await page.getByRole("button", { name: "Analyze Schedule" }).click();

  await expect(page.getByText("approved", { exact: true })).toBeVisible();
  await expect(page.getByText("Reasoning", { exact: true })).toBeVisible();
  await expect(page.getByText("All wage rates meet or exceed DBWD minimums.", { exact: false })).toBeVisible();

  await page.goto("/decisions");
  await expect(page.getByRole("heading", { name: "Decision History" })).toBeVisible();
  await expect(page.getByText("job-a1b2c3d4", { exact: true })).toBeVisible();

  await page.goto("/analytics/overview");
  await expect(page.getByRole("heading", { name: "Analytics Overview" })).toBeVisible();
  await expect(page.getByText("Total Decisions", { exact: true })).toBeVisible();
  await expect(page.getByText("156", { exact: true })).toBeVisible();

  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Human Review Queue" })).toBeVisible();
  await expect(page.getByText(/^\d+ Decisions? Pending Review$/)).toBeVisible();

  const viewport = page.viewportSize();
  expect(viewport?.width).toBeGreaterThan(0);
});
