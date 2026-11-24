// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: standalone opt-in test, not a Turbo task.
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { formatTime } from "../../packages/i18n/src/index";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "../../packages/api/src/supabase.integration.helpers";

test("master moves a booking to another free time", async ({
  page: masterPage,
}) => {
  test.setTimeout(60_000);
  const url = process.env.SUPABASE_URL as string;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
  const workspaceId = randomUUID();
  const serviceId = randomUUID();
  const slug = `reschedule-${randomUUID()}`;
  const timezone = "Europe/Prague";
  const tomorrow = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));
  let userId: string | undefined;

  try {
    expect(
      (
        await admin.from("workspaces").insert({
          id: workspaceId,
          name: "Reschedule Test Studio",
          slug,
          timezone,
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
    expect(
      (
        await admin.from("services").insert({
          id: serviceId,
          workspace_id: workspaceId,
          name: "Fixture service",
          duration_minutes: 60,
          price_amount: 500,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin.from("availability_rules").insert({
          workspace_id: workspaceId,
          day_of_week: new Date(`${tomorrow}T12:00:00Z`).getUTCDay() || 7,
          start_local_time: "08:00",
          end_local_time: "20:00",
          valid_from: tomorrow,
        })
      ).error,
    ).toBeNull();

    const slots = await owner.client.rpc(
      "get_master_available_slots_for_services",
      {
        p_date: tomorrow,
        p_service_ids: [serviceId],
        p_workspace_id: workspaceId,
      },
    );
    expect(slots.error).toBeNull();
    const [original, , , , , , , , target] = slots.data ?? [];
    if (!original || !target) throw new Error("Fixture slots are missing");
    const booking = await owner.client.rpc(
      "create_master_booking_with_services",
      {
        p_idempotency_key: randomUUID(),
        p_name: "Reschedule customer",
        p_service_ids: [serviceId],
        p_starts_at: original.starts_at,
        p_workspace_id: workspaceId,
      },
    );
    expect(booking.error).toBeNull();
    const appointmentId = (booking.data as { id: string }).id;

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
    await masterPage
      .getByRole("tab", { name: "Calendar", exact: true })
      .click();
    await masterPage
      .getByRole("button", { name: "Next date", exact: true })
      .click();
    await masterPage
      .getByRole("button", { name: /Reschedule customer/ })
      .click();
    await masterPage
      .getByRole("button", { name: "Reschedule", exact: true })
      .click();

    const targetLabel = formatTime(new Date(target.starts_at), "en", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    });
    await masterPage
      .getByRole("button", { name: targetLabel, exact: true })
      .click();
    const [moved] = await Promise.all([
      masterPage.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
          "/rest/v1/rpc/reschedule_master_appointment",
      ),
      masterPage
        .getByRole("button", { name: "Move booking", exact: true })
        .click(),
    ]);
    expect(moved.ok()).toBe(true);
    await expect(
      masterPage
        .getByText("Booking moved", { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();

    const stored = await admin
      .from("appointments")
      .select("starts_at")
      .eq("id", appointmentId)
      .single();
    expect(new Date(stored.data?.starts_at ?? "").toISOString()).toBe(
      new Date(target.starts_at).toISOString(),
    );
  } finally {
    await admin.from("workspaces").delete().eq("id", workspaceId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
