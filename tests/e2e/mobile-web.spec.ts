import { expect, test } from "@playwright/test";

test.describe("mobile web smoke", () => {
  test("renders the configuration guard without runtime secrets", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByText("Mobile configuration required", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("EXPO_PUBLIC_SUPABASE_URL", { exact: false }),
    ).toBeVisible();
  });

  test("renders the visual demo with mock schedule data", async ({ page }) => {
    await page.goto("/?demo=1");

    await expect(page.getByText("Demo mode", { exact: true })).toBeVisible();
    await expect(page.getByText("Elena Beauty", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Anna K.", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Free slots", { exact: true })).toBeVisible();
  });
});
