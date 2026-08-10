import { expect, test } from "@playwright/test";

/**
 * Critical journey 1/8 (Architecture Blueprint §11.4): read an article.
 * Requires `supabase/seed/synthetic.sql` applied locally — it seeds the
 * "[PLACEHOLDER] A first piece for the Journal" article this test reads.
 */
test("reads a published article from the Journal listing", async ({ page }) => {
  await page.goto("/journal");
  await expect(page.getByRole("heading", { name: "Journal", level: 1 })).toBeVisible();

  const articleLink = page.getByRole("link", { name: /A first piece for the Journal/i });
  await expect(articleLink).toBeVisible();
  await articleLink.click();

  await expect(
    page.getByRole("heading", { name: /A first piece for the Journal/i, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(/Replace this with real writing through the CMS/i)).toBeVisible();
});
