import { expect, test } from "@playwright/test";

test.describe("public booking web", () => {
  test("loads a private appointment link and confirms without exposing customer contact data", async ({
    page,
  }) => {
    const actions: Record<string, unknown>[] = [];
    await page.route("**/rest/v1/rpc/get_customer_appointment", (route) =>
      route.fulfill({
        json: {
          appointmentId: "appointment-1",
          canCancel: true,
          canConfirm: true,
          endsAt: "2030-01-03T10:00:00.000Z",
          serviceName: "Manicure",
          startsAt: "2030-01-03T09:00:00.000Z",
          status: "pending",
          timezone: "Europe/Prague",
          workspaceName: "Elena Beauty",
        },
      }),
    );
    await page.route(
      "**/rest/v1/rpc/update_customer_appointment",
      async (route) => {
        actions.push(route.request().postDataJSON() as Record<string, unknown>);
        await route.fulfill({
          json: { id: "appointment-1", status: "confirmed" },
        });
      },
    );

    await page.goto(`/#token=${"a".repeat(128)}`);

    await expect(
      page.getByRole("heading", { name: "Elena Beauty" }),
    ).toBeVisible();
    await expect(page.getByText("Private Customer")).not.toBeVisible();
    await expect(page.getByText("private@example.test")).not.toBeVisible();
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
    expect(actions).toEqual([
      { p_action: "confirm", p_token: "a".repeat(128) },
    ]);
    await expect(page).toHaveURL(/\/$/);
  });

  test("asks for confirmation before cancelling a customer appointment", async ({
    page,
  }) => {
    const actions: Record<string, unknown>[] = [];
    await page.route("**/rest/v1/rpc/get_customer_appointment", (route) =>
      route.fulfill({
        json: {
          appointmentId: "appointment-2",
          canCancel: true,
          canConfirm: false,
          endsAt: "2030-01-03T10:00:00.000Z",
          serviceName: "Manicure",
          startsAt: "2030-01-03T09:00:00.000Z",
          status: "confirmed",
          timezone: "Europe/Prague",
          workspaceName: "Elena Beauty",
        },
      }),
    );
    await page.route(
      "**/rest/v1/rpc/update_customer_appointment",
      async (route) => {
        actions.push(route.request().postDataJSON() as Record<string, unknown>);
        await route.fulfill({
          json: { id: "appointment-2", status: "cancelled_by_customer" },
        });
      },
    );

    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`/#token=${"b".repeat(128)}`);
    const cancelButton = page.getByRole("button", { name: "Cancel booking" });
    await cancelButton.click();
    await expect(
      page.getByText(
        "Are you sure you want to cancel this booking? This cannot be undone.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Keep booking" }).click();
    expect(actions).toHaveLength(0);

    await expect(cancelButton).toHaveCSS("border-color", "rgb(180, 35, 24)");
    expect((await cancelButton.boundingBox())?.height).toBeGreaterThanOrEqual(
      44,
    );

    await cancelButton.click();
    await expect(
      page.getByText(
        "Are you sure you want to cancel this booking? This cannot be undone.",
      ),
    ).toBeVisible();
    const confirmCancellation = page.getByRole("button", {
      name: "Confirm cancellation",
    });
    await expect(confirmCancellation).toHaveCSS(
      "background-color",
      "rgb(180, 35, 24)",
    );
    await confirmCancellation.click();

    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    expect(actions).toEqual([{ p_action: "cancel", p_token: "b".repeat(128) }]);
  });

  test("does not present the demo workspace on a public booking URL", async ({
    page,
  }) => {
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      await expect(
        page.getByRole("heading", { name: "Demo Studio" }),
      ).not.toBeVisible();
      await expect(page.locator("p.error-state")).toBeVisible();
      const retryButton = page.getByRole("button", { name: "Try again" });
      const retryButtonBox = await retryButton.boundingBox();
      expect(retryButtonBox?.height).toBeLessThan(48);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/sch81-unavailable-${width}.png`,
      });
    }
  });

  test("shows an unavailable state when the booking workspace cannot be loaded", async ({
    page,
  }) => {
    await page.route("**/rest/v1/rpc/get_public_booking_context", (route) =>
      route.fulfill({ json: null }),
    );
    await page.goto("/?slug=unknown-workspace");

    await expect(page.locator("p.error-state")).toContainText(
      "We couldn't load this booking page.",
    );
    await expect(
      page.getByRole("heading", { name: "Demo Studio" }),
    ).not.toBeVisible();
  });

  test("retries loading the booking workspace", async ({ page }) => {
    let contextRequests = 0;
    await page.route("**/rest/v1/rpc/get_public_available_slots", (route) =>
      route.fulfill({ json: [] }),
    );
    await page.route("**/rest/v1/rpc/get_public_booking_context", (route) => {
      contextRequests += 1;
      return route.fulfill({
        json:
          contextRequests <= 2
            ? null
            : {
                workspace: {
                  id: "workspace-1",
                  name: "Elena Beauty",
                  slug: "elena-beauty",
                  timezone: "Europe/Prague",
                },
                services: [
                  {
                    id: "service-1",
                    name: "Manicure",
                    description: null,
                    durationMinutes: 60,
                    priceAmount: 700,
                    currency: "CZK",
                  },
                ],
              },
      });
    });

    await page.goto("/?slug=elena-beauty");
    await expect(page.locator("p.error-state")).toBeVisible();
    const retryButton = page.getByRole("button", { name: "Try again" });
    await expect(retryButton).toHaveCSS("color", "rgb(32, 37, 34)");
    expect((await retryButton.boundingBox())?.height).toBeGreaterThanOrEqual(
      44,
    );
    await retryButton.click();

    await expect(
      page.getByRole("heading", { name: "Elena Beauty" }),
    ).toBeVisible();
    expect(contextRequests).toBeGreaterThanOrEqual(3);
  });

  test("loads a workspace and creates a booking through its public slug", async ({
    page,
  }) => {
    const bookingRequests: Record<string, unknown>[] = [];
    await page.route("**/rest/v1/rpc/**", async (route) => {
      const url = new URL(route.request().url());
      const body = route.request().postDataJSON() as Record<string, unknown>;

      if (url.pathname.endsWith("/get_public_booking_context")) {
        await route.fulfill({
          json: {
            workspace: {
              id: "workspace-1",
              name: "Elena Beauty",
              slug: "elena-beauty",
              timezone: "Europe/Prague",
            },
            services: [
              {
                id: "service-1",
                name: "Manicure",
                description: null,
                durationMinutes: 60,
                priceAmount: 700,
                currency: "CZK",
              },
            ],
          },
        });
        return;
      }

      if (url.pathname.endsWith("/get_public_available_slots")) {
        await route.fulfill({
          json: [
            {
              starts_at: "2030-01-03T09:00:00.000Z",
              ends_at: "2030-01-03T10:00:00.000Z",
            },
          ],
        });
        return;
      }

      if (url.pathname.endsWith("/create_public_booking")) {
        bookingRequests.push(body);
        await route.fulfill({
          json: {
            id: "appointment-1",
            startsAt: "2030-01-03T09:00:00.000Z",
            endsAt: "2030-01-03T10:00:00.000Z",
            serviceName: "Manicure",
            status: "pending",
          },
        });
        return;
      }

      await route.fulfill({ status: 404, json: { message: "Unexpected RPC" } });
    });

    await page.goto("/?slug=elena-beauty");
    await expect(
      page.getByRole("heading", { name: "Elena Beauty" }),
    ).toBeVisible();
    const serviceOption = page.locator(".service-option").first();
    await expect(serviceOption).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("Choose a date").fill("2030-01-03");
    const slotOption = page
      .getByRole("button", {
        name: /\d{1,2}:\d{2} (AM|PM)/,
      })
      .first();
    await slotOption.click();
    await expect(slotOption).toHaveAttribute("aria-pressed", "true");
    await expect(slotOption).toHaveCSS("border-width", "2px");
    await page.getByLabel("Name").fill("Test client");
    await page
      .getByRole("textbox", { name: /Email/ })
      .fill("test@example.test");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(
      page.getByText("Booking request sent", { exact: true }),
    ).toBeVisible();
    expect(bookingRequests).toHaveLength(1);
    expect(bookingRequests[0]).toMatchObject({
      p_slug: "elena-beauty",
      p_service_id: "service-1",
      p_name: "Test client",
      p_email: "test@example.test",
      p_locale: "en",
    });
    expect(bookingRequests[0]?.p_idempotency_key).toEqual(expect.any(String));
  });

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
    await page
      .getByRole("textbox", { name: /Email/ })
      .fill("test@example.test");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(
      page.getByText("Booking request sent", { exact: true }),
    ).toBeVisible();

    const closeButton = page.getByRole("button", { name: "Close" });
    await expect(closeButton).toBeVisible();
    await expect(closeButton).toHaveText("Close");
    await expect(closeButton).toHaveCSS("color", "rgb(32, 37, 34)");
    expect((await closeButton.boundingBox())?.height).toBeGreaterThanOrEqual(
      44,
    );
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
    const czechRadio = page.getByRole("radio", { name: "CZ" });
    await expect(czechRadio).toHaveAttribute("aria-checked", "true");
    await expect(czechRadio).toHaveCSS(
      "background-color",
      "rgb(232, 242, 237)",
    );
    await expect(czechRadio).toHaveCSS("color", "rgb(47, 125, 92)");

    await expect(
      page.getByRole("heading", { name: "Vyberte službu" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "cs");
  });

  test("keeps booking controls accessible in RU, CZ and EN on narrow screens", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/?demo=1");

    for (const [label, htmlLocale, actionName] of [
      ["RU", "ru", "Подтвердить запись"],
      ["CZ", "cs", "Potvrdit rezervaci"],
      ["EN", "en", "Confirm booking"],
    ]) {
      const localeButton = page.getByRole("radio", { name: label });
      await localeButton.click();
      await expect(localeButton).toHaveAttribute("aria-checked", "true");
      await expect(page.locator("html")).toHaveAttribute("lang", htmlLocale);

      const localeButtonBox = await localeButton.boundingBox();
      expect(localeButtonBox?.height).toBeGreaterThanOrEqual(44);

      const primaryAction = page.getByRole("button", { name: actionName });
      const primaryActionBox = await primaryAction.boundingBox();
      expect(primaryActionBox?.height).toBeGreaterThanOrEqual(48);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
        ),
      ).toBe(true);
    }

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.locator(".service-option").first()).toHaveCSS(
      "outline-style",
      "solid",
    );
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
    const nextDateButton = page.getByRole("button", {
      name: "Check the next working day",
    });
    await expect(nextDateButton).toHaveCSS("color", "rgb(32, 37, 34)");
    await nextDateButton.click();
    await expect(page.getByLabel("Choose a date")).toHaveValue("2030-01-07");
    await expect(
      page.getByText("Available times for Monday, January 7"),
    ).toBeVisible();
  });

  test("requires email for a request and keeps phone optional", async ({
    page,
  }) => {
    await page.goto("/?demo=1");

    await expect(page.getByRole("textbox", { name: /Email/ })).toHaveAttribute(
      "required",
    );
    await expect(page.getByLabel("Phone (optional)")).not.toHaveAttribute(
      "required",
    );
    await page
      .getByRole("button", { name: /\d{1,2}:\d{2} (AM|PM)/ })
      .first()
      .click();
    await page.getByLabel("Name").fill("Test client");
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.locator("p[role=alert]")).toContainText(
      "Enter your email to send the request.",
    );
  });
});
