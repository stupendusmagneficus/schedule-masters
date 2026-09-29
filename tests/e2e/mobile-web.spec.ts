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

    await expect(page.getByText("Demo režim", { exact: true })).toBeVisible();
    await expect(page.getByText("Elena Beauty", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Anna K.", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Volné termíny", { exact: true }),
    ).toBeVisible();
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
    await page.getByRole("button", { name: "Týden" }).click();

    await expect(page.getByText("Týden", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("Anna K.", { exact: true })).toBeVisible();
    await expect(page.getByText("Maria P.", { exact: true })).toBeVisible();
    await expect(page.getByText("Sofia R.", { exact: true })).toBeVisible();
  });

  test("renders the public booking URL as an actionable profile link", async ({
    page,
  }) => {
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Profil" }).click();

    await expect(
      page.getByRole("link", {
        name: "http://localhost:3000/?slug=elena-beauty",
      }),
    ).toBeVisible();
  });
  test("keeps service editor fields vertically separated", async ({ page }) => {
    await page.goto("/?demo=1");
    await page.getByRole("tab", { name: "Profil" }).click();
    await page.getByRole("button", { name: "Přidat službu" }).click();

    await expect(
      page.getByText("Vytvořit službu", { exact: true }),
    ).toBeVisible();

    const descriptionInput = page.getByLabel("Popis", { exact: true });
    const durationLabel = page.getByText("Délka v minutách *", { exact: true });
    const descriptionBox = await descriptionInput.boundingBox();
    const durationLabelBox = await durationLabel.boundingBox();

    expect(descriptionBox).not.toBeNull();
    expect(durationLabelBox).not.toBeNull();
    expect(durationLabelBox?.y).toBeGreaterThan(
      (descriptionBox?.y ?? 0) + (descriptionBox?.height ?? 0) + 4,
    );
  });
});
