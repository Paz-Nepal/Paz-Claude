import { expect, test } from "@playwright/test";

/**
 * Not one of the Architecture Blueprint's eight named critical journeys
 * (§11.4), but exercises the same shape as the others here: a public
 * intake form -> Edge Function -> confirmation. Added alongside the
 * contact form itself (T-068).
 */
test("sends a contact message", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: "Contact" })).toBeVisible();

  await page.getByLabel("Name").fill("Playwright Test Sender");
  await page.getByLabel("Email").fill("playwright-contact@example.com");
  await page.getByLabel("Message").fill("This is a test message sent by the Playwright suite.");

  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText("Message sent.")).toBeVisible();
});
