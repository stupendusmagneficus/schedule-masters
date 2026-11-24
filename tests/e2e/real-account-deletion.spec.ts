// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: standalone opt-in test, not a Turbo task.
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "../../packages/api/src/supabase.integration.helpers";

test("master deletes their account and studio from Profile", async ({
  page: masterPage,
}) => {
  test.setTimeout(60_000);
  const url = process.env.SUPABASE_URL as string;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
  const workspaceId = randomUUID();
  const slug = `delete-${randomUUID()}`;
  let userId: string | undefined;

  try {
    expect(
      (
        await admin.from("workspaces").insert({
          id: workspaceId,
          name: "Deletion Test Studio",
          slug,
          timezone: "Europe/Prague",
        })
      ).error,
    ).toBeNull();
    const owner = await createAuthenticatedTestUser({
      admin,
      url,
      publishableKey,
      email: `${slug}@example.test`,
      password: `Test-${slug}!`,
    });
    userId = owner.user.id;
    expect(
      (
        await admin.from("workspace_members").insert({
          workspace_id: workspaceId,
          user_id: userId,
          role: "owner",
        })
      ).error,
    ).toBeNull();

    await masterPage.addInitScript(() =>
      localStorage.setItem("schedule-masters.locale", "en"),
    );
    await masterPage.goto("http://127.0.0.1:19057/");
    await masterPage
      .getByRole("button", {
        name: "Already have an account? Sign in",
        exact: true,
      })
      .click();
    await masterPage
      .getByRole("textbox", { name: "Email", exact: true })
      .fill(`${slug}@example.test`);
    await masterPage
      .getByRole("textbox", { name: "Password", exact: true })
      .fill(`Test-${slug}!`);
    await masterPage
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await masterPage.getByRole("tab", { name: "Profile", exact: true }).click();
    await masterPage
      .getByRole("button", { name: "Delete account", exact: true })
      .click();
    const [deletion] = await Promise.all([
      masterPage.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/rest/v1/rpc/delete_my_account",
      ),
      masterPage
        .getByRole("button", { name: "Delete permanently", exact: true })
        .click(),
    ]);
    expect(deletion.ok()).toBe(true);
    await expect(
      masterPage.getByRole("heading", { name: "Welcome back", exact: true }),
    ).toBeVisible();

    expect(
      (await admin.from("workspaces").select("id").eq("id", workspaceId)).data,
    ).toEqual([]);
    expect((await admin.auth.admin.getUserById(userId)).data.user).toBeNull();
    userId = undefined;
  } finally {
    await admin.from("workspaces").delete().eq("id", workspaceId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
