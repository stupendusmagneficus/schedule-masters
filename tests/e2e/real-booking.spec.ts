// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: standalone opt-in test, not a Turbo task.
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createSupabaseClient } from "../../packages/api/src/supabase/client";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "../../packages/api/src/supabase.integration.helpers";

test("public booking reaches the master and releasing it restores the slot", async ({
  page,
}) => {
  const url = process.env.SUPABASE_URL as string;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
  const anonymous = createSupabaseClient({ url, publishableKey });
  const workspaceId = randomUUID();
  const slug = `browser-${randomUUID()}`;
  let userId: string | undefined;
  try {
    const createdWorkspace = await admin.from("workspaces").insert({
      id: workspaceId,
      name: "Browser Test Studio",
      slug,
      timezone: "Europe/Prague",
    });
    expect(createdWorkspace.error).toBeNull();
    expect(
      (
        await admin
          .from("booking_links")
          .insert({ slug, workspace_id: workspaceId })
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
        await admin
          .from("workspace_members")
          .insert({ workspace_id: workspaceId, user_id: userId, role: "owner" })
      ).error,
    ).toBeNull();
    const services = await admin
      .from("services")
      .insert(
        ["Manicure", "Pedicure"].map((name) => ({
          name,
          workspace_id: workspaceId,
          duration_minutes: 30,
          price_amount: 250,
        })),
      )
      .select("id");
    expect(services.error).toBeNull();
    const ids = services.data?.map((service) => service.id);
    if (ids?.length !== 2) throw new Error("Missing test services");
    expect(
      (
        await admin.from("availability_rules").insert({
          workspace_id: workspaceId,
          day_of_week: 1,
          start_local_time: "08:00",
          end_local_time: "20:00",
          valid_from: "2030-01-07",
        })
      ).error,
    ).toBeNull();

    await page.goto(`/?slug=${slug}`);
    await expect(
      page.getByRole("heading", { name: "Browser Test Studio" }),
    ).toBeVisible();
    await page
      .locator(".service-option")
      .filter({ hasText: "Pedicure" })
      .click();
    await expect(page.locator(".selected-services-summary")).toContainText(
      "1 hour",
    );
    const slotsResponse = page.waitForResponse((response) => {
      if (
        !response.url().includes("/rpc/get_public_available_slots_for_services")
      )
        return false;
      const body = response.request().postDataJSON() as { p_date?: string };
      return body.p_date === "2030-01-07";
    });
    await page.getByLabel("Choose a date").fill("2030-01-07");
    expect((await slotsResponse).status()).toBe(200);
    const slot = page.locator(".slot-option").first();
    await expect(slot).toBeVisible();
    await slot.click();
    await expect(slot).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("Name").fill("Test customer");
    await page
      .getByRole("textbox", { name: /Email/ })
      .fill(`${slug}-customer@example.test`);
    const bookingResponse = page.waitForResponse((response) =>
      response.url().includes("/rpc/create_public_booking_with_services"),
    );
    await page.getByRole("button", { name: "Confirm booking" }).click();
    expect((await bookingResponse).status()).toBe(200);
    await expect(
      page.getByText("Booking request sent", { exact: true }),
    ).toBeVisible();

    const pending = await owner.client.rpc(
      "list_master_pending_booking_requests",
      { p_workspace_id: workspaceId },
    );
    expect(pending.error).toBeNull();
    expect(pending.data).toHaveLength(1);
    const appointment = pending.data?.[0];
    if (!appointment) throw new Error("Booking not visible to master");
    expect(
      (
        await owner.client.rpc("set_appointment_status", {
          p_appointment_id: appointment.id,
          p_status: "confirmed",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await owner.client.rpc("set_appointment_status", {
          p_appointment_id: appointment.id,
          p_status: "cancelled_by_master",
        })
      ).error,
    ).toBeNull();
    const slots = await anonymous.rpc(
      "get_public_available_slots_for_services",
      { p_slug: slug, p_service_ids: ids, p_date: "2030-01-07" },
    );
    expect(slots.error).toBeNull();
    expect(
      slots.data?.some(
        (item) =>
          Date.parse(item.starts_at) === Date.parse(appointment.starts_at),
      ),
    ).toBe(true);
    await owner.client.auth.signOut();
  } finally {
    await admin.from("workspaces").delete().eq("id", workspaceId);
    if (userId) await admin.auth.admin.deleteUser(userId);
    await anonymous.removeAllChannels();
  }
});
