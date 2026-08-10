import { expect, test } from "@playwright/test";

/**
 * Critical journey 3/8 (Architecture Blueprint §11.4): apply for
 * membership. Exercises submit-membership-application (Edge Function ->
 * api.submit_membership_application -> confirmation email). Relies on
 * the starter tiers seeded by migration 0010 (friend/patron/fellow) --
 * no synthetic-seed dependency, unlike the other journeys here.
 */
test("submits a membership application", async ({ page }) => {
  await page.goto("/membership/apply");
  await expect(page.getByRole("heading", { name: "Become a member" })).toBeVisible();

  await page.getByLabel("Full name").fill("Playwright Test Applicant");
  await page.getByLabel("Email").fill("playwright-applicant@example.com");
  await page.getByRole("radio").first().check();

  await page.getByRole("button", { name: "Submit application" }).click();

  await expect(page.getByText("Thank you — your application is in.")).toBeVisible();
});
