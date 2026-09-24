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

  test("gives visible feedback when starting a new booking", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page.getByRole("button", { name: "New booking" }).click();

    await expect(
      page.getByText(
        "The booking creation form will be added in the next MVP step.",
      ),
    ).toBeVisible();
  });

  test("renders the public booking URL as an actionable profile link", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Profile" }).click();

    await expect(
      page.getByRole("link", {
        name: "http://localhost:3000/?slug=elena-beauty",
      }),
    ).toBeVisible();
  });
});
