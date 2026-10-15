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

  test("renders the visual demo without a workspace name in Today", async ({
    page,
  }) => {
    await page.goto("/?demo=1");

    await expect(page.getByText("Demo režim", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dnes" })).toBeVisible();
    await expect(
      page.getByText("Anna K.", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Volné termíny", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Přijato", { exact: true })).toBeVisible();
    await expect(page.getByText(/0,00\s*Kč/)).toBeVisible();
  });

  test("navigates to another day and returns to Today", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?demo=1");

    await expect(page.getByRole("heading", { name: "Dnes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dnes" })).toHaveCSS(
      "text-align",
      "center",
    );
    const twoDaysAgo = await page.evaluate(() => {
      const parts = new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "numeric",
        timeZone: "Europe/Prague",
        year: "numeric",
      }).formatToParts(new Date());
      const part = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((value) => value.type === type)?.value);
      const date = new Date(
        Date.UTC(part("year"), part("month") - 1, part("day") - 2, 12),
      );
      return new Intl.DateTimeFormat("cs-CZ", {
        day: "numeric",
        month: "long",
        timeZone: "Europe/Prague",
        year: "numeric",
      }).format(date);
    });
    const previousDayButton = page.getByRole("button", {
      name: "Předchozí den",
    });
    await previousDayButton.click();
    await previousDayButton.click();

    await expect(page.getByRole("heading", { name: twoDaysAgo })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Dnes", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Anna K.", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Dnes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Dnes" })).toBeVisible();
    await expect(
      page.getByText("Anna K.", { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Následující den" }).click();
    await expect(page.getByRole("heading", { name: "Dnes" })).toHaveCount(0);
    await page.getByRole("tab", { name: "Dnes" }).click();
    await expect(page.getByRole("heading", { name: "Dnes" })).toBeVisible();
  });

  test("opens the customer directory and keeps its empty state contained on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Klienti" }).click();

    await expect(page.getByRole("heading", { name: "Klienti" })).toBeVisible();
    await expect(
      page.getByText("Zatím nemáte žádné klienty.", { exact: false }),
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("keeps profile out of the bottom tabs and opens it from the header", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?demo=1");

    await expect(page.getByRole("tab")).toHaveCount(4);
    await expect(page.getByRole("tab", { name: "Finance" })).toBeVisible();
    await page.getByRole("button", { name: "Profil", exact: true }).click();
    await expect(page.getByText("Profil", { exact: true })).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(4);

    await page.getByRole("button", { name: "Zpět", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Dnes" })).toBeVisible();
  });

  test("gives visible feedback when starting a new booking", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page.getByRole("button", { name: "Nová rezervace" }).click();

    await expect(
      page.getByText(
        "Formulář pro vytvoření rezervace bude přidán v dalším kroku MVP.",
      ),
    ).toBeVisible();
  });

  test("renders the day calendar timeline and its empty-slot action", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Kalendář" }).click();

    await expect(page.getByText("Denní rozvrh", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /08:00, Klepnutím vytvoříte rezervaci/,
      }),
    ).toBeVisible();
    await expect(page.getByText("Anna K.", { exact: true })).toBeVisible();

    await page
      .getByRole("button", {
        name: /08:00, Klepnutím vytvoříte rezervaci/,
      })
      .click();
    await expect(
      page.getByText(
        "Formulář pro vytvoření rezervace bude přidán v dalším kroku MVP.",
      ),
    ).toBeVisible();
  });

  test("switches the calendar to a weekly schedule", async ({ page }) => {
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Kalendář" }).click();
    await page.getByRole("tab", { name: "Týden" }).click();

    await expect(page.getByText("Týden", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("Anna K.", { exact: true })).toBeVisible();
    await expect(page.getByText("Maria P.", { exact: true })).toBeVisible();
    await expect(page.getByText("Sofia R.", { exact: true })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("keeps all calendar modes on one row at a narrow viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Kalendář" }).click();

    const modeTabs = page.getByRole("tablist").first().getByRole("tab");
    await expect(modeTabs).toHaveCount(4);
    const tops = await modeTabs.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().top),
    );
    expect(new Set(tops).size).toBe(1);
  });

  test("opens a selected month date in the day calendar with one tap", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Kalendář" }).click();
    await page.getByRole("tab", { name: "Měsíc" }).click();
    await page.getByRole("button", { name: /14\. října 2026/ }).click();

    await expect(page.getByText("Denní rozvrh", { exact: true })).toBeVisible();
  });

  test("renders the chronological feed without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Kalendář" }).click();
    await page.getByRole("tab", { name: "Přehled" }).click();

    await expect(page.getByText("Anna K.", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Gel manicure", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Budoucí" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.getByRole("tab", { name: "Vše" }).click();
    await expect(page.getByText("Maria P.", { exact: true })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("finds an available slot from the calendar and continues to booking", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Kalendář" }).click();
    await page.getByRole("button", { name: "Volné termíny" }).click();

    await expect(
      page.getByText("Volné termíny", { exact: true }).last(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "11:00", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "11:00", exact: true }).click();
    await page.getByRole("button", { name: "Objednat klienta" }).click();

    await expect(
      page.getByText(
        "Formulář pro vytvoření rezervace bude přidán v dalším kroku MVP.",
      ),
    ).toBeVisible();
  });

  test("opens free slots from Today with the selected date and continues to booking entry", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.goto("/?demo=1");
    await page.getByRole("button", { name: "Následující den" }).click();

    const selectedDate = await page.evaluate(() => {
      const parts = new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "numeric",
        timeZone: "Europe/Prague",
        year: "numeric",
      }).formatToParts(new Date());
      const part = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((value) => value.type === type)?.value);
      const date = new Date(
        Date.UTC(part("year"), part("month") - 1, part("day") + 1, 12),
      );
      return new Intl.DateTimeFormat("cs-CZ", {
        day: "numeric",
        month: "long",
        timeZone: "Europe/Prague",
        year: "numeric",
      }).format(date);
    });
    await expect(
      page.getByRole("heading", { name: selectedDate }),
    ).toBeVisible();

    const freeSlotsButton = page.getByRole("button", {
      name: "Volné termíny",
    });
    await expect(freeSlotsButton).toBeVisible();
    const freeSlotsButtonBox = await freeSlotsButton.boundingBox();
    const summaryBox = await page
      .getByText("Rezervace", { exact: true })
      .boundingBox();
    expect(freeSlotsButtonBox?.y).toBeLessThan(summaryBox?.y ?? 0);
    await freeSlotsButton.click();
    await expect(page.getByText("Dostupné dny", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: selectedDate }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByText("Gel manicure", { exact: true }).first(),
    ).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.getByRole("button", { name: "Zrušit" }).click();
    await expect(
      page.getByRole("heading", { name: selectedDate }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Volné termíny" }).click();
    await page.getByRole("button", { name: "11:00", exact: true }).click();
    await page.getByRole("button", { name: "Objednat klienta" }).click();

    await expect(
      page.getByText(
        "Formulář pro vytvoření rezervace bude přidán v dalším kroku MVP.",
      ),
    ).toBeVisible();
  });
  test("renders the public booking URL as an actionable profile link", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page.getByRole("button", { name: "Profil", exact: true }).click();

    await expect(
      page.getByRole("link", {
        name: "http://localhost:3000/?slug=elena-beauty",
      }),
    ).toBeVisible();
  });
  test("keeps service editor fields vertically separated", async ({ page }) => {
    await page.goto("/?demo=1");
    await page.getByRole("button", { name: "Profil", exact: true }).click();
    await page.getByRole("button", { name: "Přidat službu" }).click();

    await expect(
      page.getByText("Vytvořit službu", { exact: true }),
    ).toBeVisible();

    const descriptionInput = page.getByLabel("Popis", { exact: true });
    const spacing = await descriptionInput.evaluate((input) => {
      const durationLabel = Array.from(document.querySelectorAll("*")).find(
        (element) =>
          element.childElementCount === 0 &&
          element.textContent?.trim() === "Délka v minutách *",
      );
      if (!durationLabel) return null;

      const descriptionRect = input.getBoundingClientRect();
      const durationRect = durationLabel.getBoundingClientRect();
      return durationRect.top - descriptionRect.bottom;
    });

    expect(spacing).not.toBeNull();
    expect(spacing).toBeGreaterThan(4);
  });
});
