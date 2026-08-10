import { expect, test } from "@playwright/test";

/**
 * Critical journey 2/8 (Architecture Blueprint §11.4): browse programmes
 * and register. Requires `supabase/seed/synthetic.sql` applied locally --
 * it seeds "[PLACEHOLDER] Sample Programme" with one upcoming session.
 * Exercises register-for-session (Edge Function ->
 * api.register_for_session -> confirmation email).
 */
test("registers for an upcoming session as an anonymous visitor", async ({ page }) => {
  await page.goto("/programmes");
  const programLink = page.getByRole("link", { name: /Sample Programme/i });
  await expect(programLink).toBeVisible();
  await programLink.click();

  await expect(page.getByRole("heading", { name: /Sample Programme/i })).toBeVisible();
  await page.getByRole("button", { name: /Register|Join waitlist/ }).click();

  await page.getByLabel("Full name").fill("Playwright Test Registrant");
  await page.getByLabel("Email").fill("playwright-registrant@example.com");
  await page.getByRole("button", { name: /Confirm registration|Join waitlist/ }).click();

  await expect(page.getByText(/You're registered\.|You're on the waitlist/)).toBeVisible();
});
