import { expect, test } from "@playwright/test";

/**
 * Critical journey 6/8 (Architecture Blueprint §11.4): request a
 * reservation (confirmation is a staff action from the desk board, out of
 * scope for an anonymous-visitor journey — this covers the "request"
 * half). Exercises request-reservation (Edge Function ->
 * hospitality.request_reservation -> confirmation email).
 */
test("requests a table and sees the reservation code", async ({ page }) => {
  await page.goto("/reservations");
  await expect(page.getByRole("heading", { name: "Reserve a table" })).toBeVisible();

  await page.getByLabel("Name").fill("Playwright Test Guest");
  await page.getByLabel("Party size").fill("2");
  await page.getByLabel("Email").fill("playwright-test@example.com");

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const isoDate = tomorrow.toISOString().slice(0, 10);
  await page.getByLabel("Date").fill(isoDate);
  await page.getByLabel("Time").fill("19:00");

  await page.getByRole("button", { name: "Request reservation" }).click();

  await expect(page.getByText("Request sent.")).toBeVisible();
  await expect(page.getByText(/Your reservation code is PZ-/)).toBeVisible();
});
