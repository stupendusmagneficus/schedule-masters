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

  test("keeps day browsing in Calendar instead of the Today header", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/?demo=1");

    await expect(page.getByRole("heading", { name: "Dnes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dnes" })).toHaveCSS(
      "text-align",
      "center",
    );
    await expect(
      page.getByRole("button", { name: "Předchozí den" }),
    ).toHaveCount(0);

    const yesterday = await page.evaluate(() => {
      const parts = new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "numeric",
        timeZone: "Europe/Prague",
        year: "numeric",
      }).formatToParts(new Date());
      const part = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((value) => value.type === type)?.value);
      const date = new Date(
        Date.UTC(part("year"), part("month") - 1, part("day") - 1, 12),
      );
      return new Intl.DateTimeFormat("cs-CZ", {
        day: "numeric",
        month: "long",
        timeZone: "Europe/Prague",
        year: "numeric",
      }).format(date);
    });
    await page.getByRole("tab", { name: "Kalendář" }).click();
    await page.getByRole("button", { name: "Předchozí datum" }).click();
    await expect(page.getByText(yesterday, { exact: true })).toBeVisible();
    await expect(page.getByText("Denní rozvrh", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Dnes", exact: true })
      .first()
      .click();
    await expect(page.getByText("Denní rozvrh", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Dnes" }).click();
    await expect(page.getByRole("heading", { name: "Dnes" })).toBeVisible();
    await expect(
      page.getByText("Anna K.", { exact: true }).first(),
    ).toBeVisible();
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
    await expect(page.getByText("Noví", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Vracejí se", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("Dlouho nepřišli", { exact: true }),
    ).toHaveCount(0);

    for (const width of [320, 430]) {
      await page.setViewportSize({ width, height: 812 });
      const hasHorizontalOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      );
      expect(hasHorizontalOverflow).toBe(false);
    }
  });

  test("keeps the Finance month snapshot focused and moves secondary metrics behind details", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Finance" }).click();

    await expect(page.getByText("Přijato", { exact: true })).toBeVisible();
    await expect(page.getByText("Očekává se", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Dokončené rezervace", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Zobrazit podrobnosti" }),
    ).toBeVisible();
    await expect(
      page.getByText("Nadcházející rezervace", { exact: true }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Zobrazit podrobnosti" }).click();
    await expect(
      page.getByText("Nadcházející rezervace", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Skrýt podrobnosti" }),
    ).toBeVisible();
  });

  test("opens Profile from the five bottom tabs at a narrow viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/?demo=1");

    await expect(page.getByRole("tab")).toHaveCount(5);
    for (const label of ["Dnes", "Kalendář", "Klienti", "Finance", "Profil"]) {
      await expect(page.getByRole("tab", { name: label })).toBeVisible();
    }
    await expect(page.getByRole("tab", { name: "Finance" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Profil", exact: true }),
    ).toHaveCount(0);

    const tabTargets = await page.getByRole("tab").evaluateAll((tabs) =>
      tabs.map((tab) => {
        const bounds = tab.getBoundingClientRect();
        return {
          height: bounds.height,
          left: bounds.left,
          right: bounds.right,
          width: bounds.width,
        };
      }),
    );
    for (const target of tabTargets) {
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(target.left).toBeGreaterThanOrEqual(0);
      expect(target.right).toBeLessThanOrEqual(320);
    }

    await page.getByRole("tab", { name: "Profil" }).click();
    await expect(page.getByRole("heading", { name: "Profil" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Profil" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.getByRole("tab", { name: "Klienti" }).click();
    await expect(page.getByRole("heading", { name: "Klienti" })).toBeVisible();
    await page.getByRole("tab", { name: "Profil" }).click();
    await expect(page.getByRole("heading", { name: "Profil" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Zpět" })).toHaveCount(0);
    await page.getByRole("tab", { name: "Dnes" }).click();
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

  test("opens language and public booking link from Profile settings", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Profil" }).click();

    await expect(
      page.getByRole("button", { name: "Nastavení", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Nastavení", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Nastavení" }),
    ).toBeVisible();
    await expect(page.getByText("Jazyk", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Veřejný odkaz pro rezervace", { exact: true }),
    ).toBeVisible();
  });

  test("keeps Profile settings and services entries the same height", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Profil", exact: true }).click();

    const settingsEntry = page.getByRole("button", {
      name: "Nastavení",
      exact: true,
    });
    const servicesEntry = page.getByRole("button", { name: "Služby: 1" });
    const [settingsHeight, servicesHeight] = await Promise.all([
      settingsEntry.evaluate((button) => button.getBoundingClientRect().height),
      servicesEntry.evaluate((button) => button.getBoundingClientRect().height),
    ]);

    expect(settingsHeight).toBe(servicesHeight);
  });

  test("saves the Ukrainian locale across reloads without narrow-screen overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Profil", exact: true }).click();
    await page.getByRole("button", { name: "Nastavení", exact: true }).click();
    await expect(page.getByRole("radiogroup").getByRole("radio")).toHaveCount(
      5,
    );
    const localePickerFits = await page
      .getByRole("radiogroup")
      .evaluate(
        (group) =>
          group.getBoundingClientRect().right <=
          document.documentElement.clientWidth,
      );
    expect(localePickerFits).toBe(true);
    await page.getByRole("radio", { name: "UA" }).click();

    await expect(page.getByText("Мова", { exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await expect(page.getByRole("tab", { name: "Профіль" })).toBeVisible();
  });

  test("opens a searchable, categorized service catalog from Profile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Profil" }).click();

    const servicesEntry = page.getByRole("button", { name: "Služby: 1" });
    await expect(servicesEntry).toBeVisible();
    await servicesEntry.click();

    await expect(page.getByRole("heading", { name: "Služby" })).toBeVisible();
    await expect(page.getByText("Gel manicure", { exact: true })).toBeVisible();
    const editAction = page.getByRole("button", { name: "Upravit" }).first();
    const archiveAction = page
      .getByRole("button", { name: "Archivovat" })
      .first();
    const [editHeight, archiveHeight] = await Promise.all([
      editAction.evaluate((button) => button.getBoundingClientRect().height),
      archiveAction.evaluate((button) => button.getBoundingClientRect().height),
    ]);
    expect(editHeight).toBe(archiveHeight);

    const activeFilter = page.getByRole("tab", { name: "Aktivní" });
    const archivedFilter = page.getByRole("tab", { name: "Archiv" });
    await archivedFilter.click();
    await expect(page.getByText("Archiv služeb je prázdný.")).toBeVisible();
    await activeFilter.click();
    await expect(page.getByText("Gel manicure", { exact: true })).toBeVisible();

    const categoryFilter = page.getByRole("tab", { name: "Manikúra" });
    await expect(categoryFilter).toBeVisible();
    await categoryFilter.click();
    await expect(page.getByText("Gel manicure", { exact: true })).toBeVisible();

    const search = page.getByRole("textbox", {
      name: "Hledat podle názvu, popisu nebo kategorie",
    });
    await search.fill("clean finish");
    await expect(page.getByText("Gel manicure", { exact: true })).toBeVisible();
    await search.fill("no matching service");
    await expect(
      page.getByText("Žádné služby nebyly nalezeny.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Zrušit filtry" }).click();
    await expect(search).toHaveValue("");
    await expect(page.getByText("Gel manicure", { exact: true })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByText("Gel manicure", { exact: true })).toBeVisible();
    const hasWideHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    expect(hasWideHorizontalOverflow).toBe(false);
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

    // Pick a future date so the demo still works after the current day's
    // morning slots have passed.
    await page.getByRole("button", { name: "Následující datum" }).click();

    await page
      .getByRole("button", {
        name: /08:00, Klepnutím vytvoříte rezervaci/,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "Vyberte čas začátku" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Rezervace" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tab", { name: "Přestávka" })).toBeDisabled();
    await page.getByRole("button", { name: "Nová rezervace" }).last().click();
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

  test("confirms personal block deletion inline and allows cancelling it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Kalendář", exact: true }).click();

    const deleteButton = page.getByRole("button", { name: "Smazat Oběd" });
    await expect(deleteButton).toBeVisible();
    expect((await deleteButton.boundingBox())?.height).toBeGreaterThanOrEqual(
      44,
    );
    await deleteButton.click();
    await expect(
      page.getByTestId("personal-block-row-demo-personal-block-1"),
    ).toHaveCSS("border-top-left-radius", "16px");
    await expect(
      page.getByText(
        "Přestávka bude odstraněna a tento čas bude znovu dostupný pro rezervace.",
        { exact: true },
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Zrušit", exact: true }).click();
    await expect(deleteButton).toBeVisible();

    await deleteButton.click();
    const confirmDeleteButton = page.getByRole("button", {
      name: "Smazat",
      exact: true,
    });
    await expect(confirmDeleteButton).toBeVisible();
    expect(
      (await confirmDeleteButton.boundingBox())?.height,
    ).toBeGreaterThanOrEqual(44);
    await confirmDeleteButton.click();
    await expect(deleteButton).toHaveCount(0);
    await expect(page.getByText("Osobní blok byl smazán")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
  });

  test("keeps all calendar modes on one row at a narrow viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Kalendář" }).click();

    const modeTabs = page.getByRole("tablist").first().getByRole("tab");
    await expect(modeTabs).toHaveCount(3);
    const tops = await modeTabs.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().top),
    );
    expect(new Set(tops).size).toBe(1);
  });

  test("selecting a month date opens that day immediately", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Kalendář" }).click();
    await page.getByRole("tab", { name: "Měsíc" }).click();
    await page.getByRole("button", { name: /14\. října 2026/ }).click();
    await expect(page.getByTestId("calendar-month-sheet")).toBeHidden();
    await expect(
      page.getByText("14. října 2026", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Denní rozvrh", { exact: true })).toBeVisible();
  });

  test("fills the calendar area with a virtualized, scrollable month window", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Kalendář" }).click();
    await page.getByRole("tab", { name: "Měsíc" }).click();
    await expect(page.getByTestId("calendar-month-sheet")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Vyberte datum" }),
    ).toBeVisible();
    const monthList = page.getByTestId("calendar-month-list");
    await expect(
      monthList.getByText("říjen 2026", { exact: true }),
    ).toHaveCount(1);
    await expect(
      monthList.getByText("listopad 2026", { exact: true }),
    ).toBeVisible();

    await expect(monthList).toBeVisible();
    const dimensions = await monthList.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(dimensions.clientHeight).toBeGreaterThan(200);
    expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);

    const nextMonthDate = page
      .getByRole("button", {
        name: /^1\. listopadu 2026/,
      })
      .last();
    await nextMonthDate.scrollIntoViewIfNeeded();
    await nextMonthDate.click();
    await expect(page.getByTestId("calendar-month-sheet")).toBeHidden();
    await expect(
      page.getByText("1. listopadu 2026", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Denní rozvrh", { exact: true })).toBeVisible();
  });

  test("keeps week selection in week view", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Kalendář" }).click();
    await page.getByRole("tab", { name: "Týden" }).click();
    const dateLabel = await page
      .getByTestId("calendar-week-date")
      .evaluateAll((buttons) => {
        const unselectedDate = buttons.find(
          (button) =>
            getComputedStyle(button).backgroundColor !== "rgb(244, 247, 245)",
        );
        return unselectedDate?.getAttribute("aria-label") ?? null;
      });
    expect(dateLabel).not.toBeNull();
    const dateInAnotherWeek = page.locator(
      `[data-testid="calendar-week-date"][aria-label="${dateLabel}"]`,
    );
    await dateInAnotherWeek.click();

    await expect(dateInAnotherWeek).toHaveCSS(
      "background-color",
      "rgb(244, 247, 245)",
    );
  });

  test("keeps the free-slots shortcut on Today, not in Calendar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?demo=1");
    await expect(
      page.getByRole("button", { name: "Volné termíny" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Kalendář" }).click();
    await expect(
      page.getByRole("button", { name: "Volné termíny" }),
    ).toHaveCount(0);
  });

  test("opens free slots from Today with the selected date and continues to booking entry", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "share", {
        configurable: true,
        value: async (content: { text?: string }) => {
          window.localStorage.setItem("sharedSchedule", content.text ?? "");
        },
      });
    });
    await page.goto("/?demo=1");

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
        Date.UTC(part("year"), part("month") - 1, part("day"), 12),
      );
      return new Intl.DateTimeFormat("cs-CZ", {
        day: "numeric",
        month: "long",
        timeZone: "Europe/Prague",
        year: "numeric",
      }).format(date);
    });
    await expect(page.getByRole("heading", { name: "Dnes" })).toBeVisible();

    const freeSlotsButton = page.getByRole("button", {
      name: "Volné termíny",
    });
    await expect(freeSlotsButton).toBeVisible();
    const freeSlotsButtonSize = await freeSlotsButton.boundingBox();
    expect(freeSlotsButtonSize?.height).toBeGreaterThanOrEqual(44);
    await expect(freeSlotsButton).toHaveCSS("border-color", "rgb(47, 125, 92)");
    const freeSlotsButtonBox = await freeSlotsButton.boundingBox();
    const summaryBox = await page
      .getByText("Rezervace", { exact: true })
      .boundingBox();
    expect(freeSlotsButtonBox?.y).toBeLessThan(summaryBox?.y ?? 0);
    await freeSlotsButton.click();
    await expect(page.getByRole("tab", { name: "Sdílet" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByRole("button", { name: "Sdílet rozvrh" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sdílet rozvrh" }).click();
    await expect(
      page.getByText("Vyberte aplikaci pro odeslání rozvrhu."),
    ).toBeVisible();
    const sharedSchedule = await page.evaluate(() =>
      window.localStorage.getItem("sharedSchedule"),
    );
    expect(sharedSchedule).toContain("Elena Beauty");
    expect(sharedSchedule).toContain("Čas začátku závisí na vybrané službě.");
    expect(sharedSchedule).not.toContain("Gel manicure");
    await page.getByRole("tab", { name: "Najít a objednat" }).click();
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
    await expect(page.getByRole("heading", { name: "Dnes" })).toBeVisible();

    await page.getByRole("button", { name: "Volné termíny" }).click();
    await page.getByRole("tab", { name: "Najít a objednat" }).click();
    await page.getByRole("button", { name: "11:00", exact: true }).click();
    await page.getByRole("button", { name: "Objednat klienta" }).click();

    await expect(
      page.getByText(
        "Formulář pro vytvoření rezervace bude přidán v dalším kroku MVP.",
      ),
    ).toBeVisible();
  });

  test("keeps calendar view selection distinct from primary actions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Kalendář" }).click();

    const dayTab = page.getByRole("tab", { name: "Den", exact: true });
    await expect(dayTab).toHaveCSS("border-color", "rgb(47, 125, 92)");
    await expect(dayTab).toHaveCSS("background-color", "rgb(244, 247, 245)");

    const previousDate = page.getByRole("button", {
      name: "Předchozí datum",
    });
    const arrowSize = await previousDate.boundingBox();
    expect(arrowSize?.width).toBeGreaterThanOrEqual(44);
    expect(arrowSize?.height).toBeGreaterThanOrEqual(44);
    await expect(previousDate).not.toHaveCSS(
      "background-color",
      "rgb(47, 125, 92)",
    );
  });
  test("renders the public booking URL as an actionable profile link", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Profil", exact: true }).click();
    await page.getByRole("button", { name: "Nastavení", exact: true }).click();

    await expect(
      page.getByRole("link", {
        name: "http://localhost:3000/?slug=elena-beauty",
      }),
    ).toBeVisible();
  });
  test("keeps service editor fields vertically separated", async ({ page }) => {
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Profil", exact: true }).click();
    await page.getByRole("button", { name: "Služby: 1" }).click();
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
