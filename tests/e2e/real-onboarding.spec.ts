// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: standalone opt-in test, not a Turbo task.
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createSupabaseAdminTestClient } from "../../packages/api/src/supabase.integration.helpers";

test("a new master sets up a workspace and publishes their first service", async ({
  page,
}) => {
  const admin = createSupabaseAdminTestClient({
    url: process.env.SUPABASE_URL as string,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  });
  const slug = `setup-${randomUUID()}`;
  const email = `${slug}@example.test`;
  const password = `Test-${randomUUID()}!`;
  const workspaceName = "Onboarding Test Studio";
  const serviceName = "Brow shaping";
  let userId: string | undefined;

  try {
    await page.addInitScript(() =>
      localStorage.setItem("schedule-masters.locale", "en"),
    );
    await page.goto("http://127.0.0.1:19057/");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill(password);
    const signup = page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/auth/v1/signup",
    );
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    const signupResponse = await signup;
    expect(signupResponse.ok()).toBe(true);
    const account = (await signupResponse.json()) as { id: string };
    userId = account.id;
    expect(userId).toBeTruthy();
    await expect(
      page.getByText("Confirm your email", { exact: true }),
    ).toBeVisible();

    // Email delivery and confirmation links are covered by the local Auth smoke tests.
    const confirmed = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    expect(confirmed.error).toBeNull();
    await page
      .getByRole("button", { name: "Go to sign in", exact: true })
      .click();
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await page.getByPlaceholder("Workspace name").fill(workspaceName);
    await page.getByPlaceholder("Booking link, e.g. anna-nails").fill(slug);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByPlaceholder("First service").fill(serviceName);
    await page.getByPlaceholder("Price in CZK").fill("450");
    await page.getByPlaceholder("Duration in minutes").fill("45");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("checkbox", { name: "Sun", exact: true }).click();
    await page.getByPlaceholder("08:00").fill("09:00");
    await page.getByPlaceholder("21:00").fill("17:00");
    await page
      .getByRole("button", { name: "Go to Dashboard", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open Dashboard", exact: true })
      .click();
    await expect(
      page.getByRole("tab", { name: "Calendar", exact: true }),
    ).toBeVisible();

    const workspace = await admin
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .single();
    expect(workspace.error).toBeNull();
    if (!workspace.data)
      throw new Error("Onboarding did not create a workspace");
    const schedule = await admin
      .from("availability_rules")
      .select("day_of_week, start_local_time, end_local_time")
      .eq("workspace_id", workspace.data.id)
      .eq("is_active", true)
      .order("day_of_week");
    expect(schedule.error).toBeNull();
    expect(schedule.data).toEqual(
      [1, 2, 3, 4, 5, 6].map((day) => ({
        day_of_week: day,
        start_local_time: "09:00:00",
        end_local_time: "17:00:00",
      })),
    );

    await page.getByRole("tab", { name: "Profile", exact: true }).click();
    await page.getByRole("button", { name: /^Services:/ }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByRole("button", { name: "Enter translations manually", exact: true })
      .click();
    await page.getByRole("button", { name: "English", exact: true }).click();
    const czechName = "Úprava obočí";
    const czechDescription = "Tvarování a úprava obočí.";
    await page
      .getByRole("textbox", { name: "Service name · Čeština", exact: true })
      .fill(czechName);
    await page
      .getByRole("textbox", { name: "Description · Čeština", exact: true })
      .fill(czechDescription);
    const saveTranslation = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/rest/v1/services" &&
        response.request().method() === "PATCH",
    );
    await page
      .getByRole("button", { name: "Save service", exact: true })
      .click();
    expect((await saveTranslation).ok()).toBe(true);

    await page.goto(`/?slug=${slug}`);
    await expect(
      page.getByText(workspaceName, { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(serviceName, { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("radio", { name: "CZ", exact: true }).click();
    const localizedService = page.getByRole("button", {
      name: new RegExp(`^${czechName}`),
    });
    await expect(localizedService).toBeVisible();
    await expect(localizedService).toContainText(czechDescription);
    await page.reload();
    await page.getByRole("radio", { name: "CZ", exact: true }).click();
    await expect(localizedService).toBeVisible();
    await page.getByRole("radio", { name: "EN", exact: true }).click();
    await expect(
      page.getByRole("button", { name: new RegExp(`^${serviceName}`) }),
    ).toBeVisible();
  } finally {
    await admin.from("workspaces").delete().eq("slug", slug);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
