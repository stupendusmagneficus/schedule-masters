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
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(
      page.getByText("Booking confirmed", { exact: true }),
    ).toBeVisible();

    const closeButton = page.getByRole("button", { name: "Close" });
    await expect(closeButton).toBeVisible();
    const confirmationPanel = page.locator(".confirmation-panel");
    const closeButtonBox = await closeButton.boundingBox();
    const confirmationPanelContentWidth = await confirmationPanel.evaluate(
      (element) => {
        const styles = window.getComputedStyle(element);
        return (
          element.clientWidth -
          Number.parseFloat(styles.paddingLeft) -
          Number.parseFloat(styles.paddingRight)
        );
      },
    );
    expect(closeButtonBox?.width).toBeCloseTo(confirmationPanelContentWidth, 0);
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

  test("clearly changes the selected date when no times are available", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page.getByLabel("Choose a date").fill("2030-01-05");

    await expect(
      page.getByText("There are no available times on Saturday, January 5."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Check the next working day" })
      .click();
    await expect(page.getByLabel("Choose a date")).toHaveValue("2030-01-07");
    await expect(
      page.getByText("Available times for Monday, January 7"),
    ).toBeVisible();
  });

  test("keeps email and phone optional", async ({ page }) => {
    await page.goto("/?demo=1");

    await expect(page.getByLabel("Email (optional)")).not.toHaveAttribute(
      "required",
    );
    await expect(page.getByLabel("Phone (optional)")).not.toHaveAttribute(
      "required",
    );
  });
});
