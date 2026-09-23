import { expect, test } from "@playwright/test";

test.describe("public booking web", () => {
  test("completes a booking with the demo fallback", async ({ page }) => {
    await page.goto("/?demo=1");

    await expect(
      page.getByRole("heading", { name: "Demo Studio" }),
    ).toBeVisible();
    await page.getByLabel("Choose a date").fill("2030-01-03");
    await page
      .getByRole("button", { name: /\d{1,2}:\d{2} (AM|PM)/ })
      .first()
      .click();
    await page.getByLabel("Name").fill("Test client");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Phone").fill("+420111222333");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(
      page.getByText("Booking confirmed", { exact: true }),
    ).toBeVisible();
  });

  test("switches the booking page locale", async ({ page }) => {
    await page.goto("/?demo=1");
    await page.getByRole("radio", { name: "CZ" }).click();

    await expect(
      page.getByRole("heading", { name: "Vyberte službu" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "cs");
  });

  test("shows a validation error when required details are missing", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page
      .getByRole("button", { name: /\d{1,2}:\d{2} (AM|PM)/ })
      .first()
      .click();
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(page.locator("p[role=alert]")).toContainText(
      "Enter your name.",
    );
  });

  test("explains when no times are available and offers another date", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page.getByLabel("Choose a date").fill("2030-01-05");

    await expect(
      page.getByText("There are no available times on this date."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Choose another date" }).click();
    await expect(page.getByLabel("Choose a date")).toHaveValue("2030-01-07");
  });
});
