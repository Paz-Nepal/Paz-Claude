import { expect, test } from "@playwright/test";

/**
 * T-070: public search over api.search_published. Requires
 * `supabase/seed/synthetic.sql` applied locally — it seeds the
 * "[PLACEHOLDER] A first piece for the Journal" article this test finds.
 */
test("finds a published article by keyword", async ({ page }) => {
  await page.goto("/search");
  await expect(page.getByRole("heading", { name: "Search", level: 1 })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search published content" }).fill("first piece");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/\/search\?q=first\+piece/);
  const resultLink = page.getByRole("link", { name: /A first piece for the Journal/i });
  await expect(resultLink).toBeVisible();
  await resultLink.click();

  await expect(
    page.getByRole("heading", { name: /A first piece for the Journal/i, level: 1 }),
  ).toBeVisible();
});

test("shows an empty state for no matches", async ({ page }) => {
  await page.goto("/search?q=zzz-no-such-content-zzz");
  await expect(page.getByText(/Nothing found for/i)).toBeVisible();
});
