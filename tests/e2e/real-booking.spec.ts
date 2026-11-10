// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: standalone opt-in test, not a Turbo task.
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createSupabaseClient } from "../../packages/api/src/supabase/client";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "../../packages/api/src/supabase.integration.helpers";

test("master manages bookings and a working day with a real backend", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const url = process.env.SUPABASE_URL as string;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
  const anonymous = createSupabaseClient({ url, publishableKey });
  const workspaceId = randomUUID();
  const slug = `browser-${randomUUID()}`;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const bookingDate = tomorrow.toISOString().slice(0, 10);
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
          day_of_week: tomorrow.getUTCDay(),
          start_local_time: "08:00",
          end_local_time: "20:00",
          valid_from: bookingDate,
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
    await page.getByLabel("Choose a date").fill(today);
    const slotsResponse = page.waitForResponse((response) => {
      if (
        !response.url().includes("/rpc/get_public_available_slots_for_services")
      )
        return false;
      const body = response.request().postDataJSON() as { p_date?: string };
      return body.p_date === bookingDate;
    });
    await page.getByLabel("Choose a date").fill(bookingDate);
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
    const masterPage = await page.context().newPage();
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
    await masterPage.getByRole("button", { name: /Requests/ }).click();
    await expect(masterPage.getByText("Test customer").last()).toBeVisible();
    const decisionResponse = masterPage.waitForResponse((response) =>
      response.url().includes("/rpc/set_appointment_status"),
    );
    await masterPage
      .getByRole("button", { name: "Confirm", exact: true })
      .click();
    expect((await decisionResponse).status()).toBe(200);
    await expect(
      masterPage.getByText("There are no new requests yet."),
    ).toBeVisible();
    const confirmed = await admin
      .from("appointments")
      .select("status")
      .eq("id", appointment.id)
      .single();
    expect(confirmed.error).toBeNull();
    expect(confirmed.data?.status).toBe("confirmed");
    const occupiedSlots = await anonymous.rpc(
      "get_public_available_slots_for_services",
      { p_slug: slug, p_service_ids: ids, p_date: bookingDate },
    );
    expect(occupiedSlots.error).toBeNull();
    expect(
      occupiedSlots.data?.some(
        (item) =>
          Date.parse(item.starts_at) === Date.parse(appointment.starts_at),
      ),
    ).toBe(false);
    await masterPage
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await masterPage
      .getByRole("tab", { name: "Calendar", exact: true })
      .click();
    await masterPage
      .getByRole("button", { name: "Next date", exact: true })
      .click();
    await masterPage.getByRole("button", { name: /Test customer/ }).click();
    await masterPage
      .getByRole("button", { name: "Cancel booking", exact: true })
      .click();
    const cancelResponse = masterPage.waitForResponse((response) =>
      response.url().includes("/rpc/set_appointment_status"),
    );
    await masterPage
      .getByRole("button", { name: "Cancel booking", exact: true })
      .last()
      .click();
    expect((await cancelResponse).status()).toBe(200);
    await expect
      .poll(async () => {
        const result = await admin
          .from("appointments")
          .select("status")
          .eq("id", appointment.id)
          .single();
        return result.data?.status;
      })
      .toBe("cancelled_by_master");
    const slots = await anonymous.rpc(
      "get_public_available_slots_for_services",
      { p_slug: slug, p_service_ids: ids, p_date: bookingDate },
    );
    expect(slots.error).toBeNull();
    expect(
      slots.data?.some(
        (item) =>
          Date.parse(item.starts_at) === Date.parse(appointment.starts_at),
      ),
    ).toBe(true);

    await expect(
      masterPage.getByText("No clients match this time."),
    ).toBeVisible();
    await masterPage
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await masterPage
      .getByRole("button", { name: /08:00, Tap to create a booking/ })
      .click();
    await masterPage
      .getByRole("button", { name: "New booking", exact: true })
      .last()
      .click();
    await masterPage.getByRole("button", { name: /Add service/ }).click();
    await masterPage
      .getByRole("button", { name: /Pedicure/ })
      .last()
      .click();
    await masterPage.getByRole("button", { name: "Done", exact: true }).click();
    await masterPage
      .getByRole("button", { name: "08:00 AM", exact: true })
      .click();
    await masterPage
      .getByRole("button", { name: "Continue", exact: true })
      .click();
    await masterPage
      .getByRole("button", { name: "New customer", exact: true })
      .click();
    await masterPage
      .getByLabel("Customer name *", { exact: true })
      .fill("Manual customer");
    await masterPage
      .getByRole("button", { name: "Continue", exact: true })
      .click();
    const manualResponse = masterPage.waitForResponse((response) =>
      response.url().includes("/rpc/create_master_booking_with_services"),
    );
    await masterPage
      .getByRole("button", { name: "Create booking", exact: true })
      .click();
    const createdResponse = await manualResponse;
    expect(createdResponse.status()).toBe(200);
    const manual = (await createdResponse.json()) as {
      id: string;
      startsAt: string;
    };
    expect(manual).toMatchObject({
      durationMinutes: 60,
      priceAmount: 500,
      serviceName: "Manicure + Pedicure",
    });
    const manualServices = await admin
      .from("appointment_services")
      .select("position, service_name_snapshot")
      .eq("appointment_id", manual.id)
      .order("position");
    expect(manualServices.error).toBeNull();
    expect(manualServices.data).toEqual([
      { position: 1, service_name_snapshot: "Manicure" },
      { position: 2, service_name_snapshot: "Pedicure" },
    ]);
    const afterManualBooking = await anonymous.rpc(
      "get_public_available_slots_for_services",
      { p_slug: slug, p_service_ids: ids, p_date: bookingDate },
    );
    expect(afterManualBooking.error).toBeNull();
    expect(
      afterManualBooking.data?.some(
        (item) => Date.parse(item.starts_at) === Date.parse(manual.startsAt),
      ),
    ).toBe(false);
    await expect(
      masterPage.getByRole("button", { name: /Manual customer/ }),
    ).toBeVisible();
    expect(afterManualBooking.data?.length).toBeGreaterThan(0);
    await masterPage
      .getByRole("button", { name: "Configure day", exact: true })
      .click();
    await masterPage
      .getByRole("radio", { name: "Day off", exact: true })
      .click();
    await expect(masterPage.getByText("Conflicting bookings: 1")).toBeVisible();
    const closeDayResponse = masterPage.waitForResponse((response) =>
      response.url().includes("/rpc/set_master_availability_date_override"),
    );
    await masterPage.getByRole("button", { name: "Save", exact: true }).click();
    expect((await closeDayResponse).status()).toBe(200);
    const closedSlots = await anonymous.rpc(
      "get_public_available_slots_for_services",
      {
        p_slug: slug,
        p_service_ids: ids,
        p_date: bookingDate,
      },
    );
    expect(closedSlots.error).toBeNull();
    expect(closedSlots.data).toEqual([]);
    const preserved = await admin
      .from("appointments")
      .select("status")
      .eq("id", manual.id)
      .single();
    expect(preserved.error).toBeNull();
    expect(preserved.data?.status).toBe("confirmed");
    await masterPage
      .getByRole("button", { name: "Configure day", exact: true })
      .click();
    const restoreResponse = masterPage.waitForResponse((response) =>
      response.url().includes("/rpc/clear_master_availability_date_override"),
    );
    await masterPage
      .getByRole("button", { name: "Restore weekly schedule", exact: true })
      .click();
    expect((await restoreResponse).status()).toBe(200);
    const reopenedSlots = await anonymous.rpc(
      "get_public_available_slots_for_services",
      {
        p_slug: slug,
        p_service_ids: ids,
        p_date: bookingDate,
      },
    );
    expect(reopenedSlots.error).toBeNull();
    expect(reopenedSlots.data?.length).toBeGreaterThan(0);
    expect(
      reopenedSlots.data?.some(
        (item) => Date.parse(item.starts_at) === Date.parse(manual.startsAt),
      ),
    ).toBe(false);
    const localTime = (date: string) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Prague",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(date));
    expect(
      reopenedSlots.data?.some((item) => localTime(item.starts_at) === "12:00"),
    ).toBe(true);
    await masterPage
      .getByRole("button", { name: "Configure day", exact: true })
      .click();
    await masterPage
      .getByRole("dialog")
      .getByRole("button", { name: "Add break", exact: true })
      .click();
    await masterPage
      .getByLabel("Name or reason", { exact: true })
      .fill("Lunch test");
    const createBlock = masterPage.waitForResponse((response) =>
      response.url().includes("/rpc/create_master_availability_block"),
    );
    await masterPage
      .getByRole("button", { name: "Block time", exact: true })
      .click();
    expect((await createBlock).status()).toBe(200);
    const blockSlots = await anonymous.rpc(
      "get_public_available_slots_for_services",
      { p_slug: slug, p_service_ids: ids, p_date: bookingDate },
    );
    expect(blockSlots.error).toBeNull();
    expect(
      blockSlots.data?.some((item) => localTime(item.starts_at) === "12:00"),
    ).toBe(false);
    expect(
      blockSlots.data?.some((item) => localTime(item.starts_at) === "14:00"),
    ).toBe(true);
    await masterPage
      .getByRole("button", { name: "Lunch test, Edit break", exact: true })
      .click();
    const editBreak = masterPage.getByRole("dialog");
    await editBreak.getByLabel("End", { exact: true }).fill("15:00");
    await editBreak.getByLabel("Start", { exact: true }).fill("14:00");
    const updateBlock = masterPage.waitForResponse((response) =>
      response.url().includes("/rpc/update_master_availability_block"),
    );
    await editBreak
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    expect((await updateBlock).status()).toBe(200);
    const movedSlots = await anonymous.rpc(
      "get_public_available_slots_for_services",
      { p_slug: slug, p_service_ids: ids, p_date: bookingDate },
    );
    expect(movedSlots.error).toBeNull();
    const movedTimes = movedSlots.data?.map((item) =>
      localTime(item.starts_at),
    );
    expect(movedTimes).toContain("12:00");
    expect(movedTimes).not.toContain("14:00");
    await masterPage
      .getByRole("button", { name: "Delete Lunch test", exact: true })
      .click();
    const deleteBlock = masterPage.waitForResponse((response) =>
      response.url().includes("/rpc/delete_master_availability_block"),
    );
    await masterPage
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    expect((await deleteBlock).status()).toBe(200);
    const restoredBlockSlots = await anonymous.rpc(
      "get_public_available_slots_for_services",
      { p_slug: slug, p_service_ids: ids, p_date: bookingDate },
    );
    expect(restoredBlockSlots.error).toBeNull();
    expect(
      restoredBlockSlots.data?.some(
        (item) => localTime(item.starts_at) === "14:00",
      ),
    ).toBe(true);
    const followingWeek = new Date(tomorrow);
    followingWeek.setUTCDate(followingWeek.getUTCDate() + 7);
    const secondDate = followingWeek.toISOString().slice(0, 10);
    const controlDay = new Date(tomorrow);
    controlDay.setUTCDate(controlDay.getUTCDate() + 14);
    const controlDate = controlDay.toISOString().slice(0, 10);
    async function slotsForDate(date: string) {
      const result = await anonymous.rpc(
        "get_public_available_slots_for_services",
        {
          p_slug: slug,
          p_service_ids: ids,
          p_date: date,
        },
      );
      expect(result.error).toBeNull();
      return result.data;
    }
    expect((await slotsForDate(secondDate))?.length).toBeGreaterThan(0);
    const controlSlots = await slotsForDate(controlDate);
    expect(controlSlots?.length).toBeGreaterThan(0);
    await masterPage.getByRole("tab", { name: "Month", exact: true }).click();
    await masterPage
      .getByRole("button", { name: "Select dates", exact: true })
      .click();
    for (const date of [bookingDate, secondDate]) {
      await masterPage
        .getByTestId(`calendar-month-day-${date}`)
        .first()
        .click();
    }
    await masterPage
      .getByRole("button", { name: "Close working days: 2", exact: true })
      .click();
    const bulkResponse = masterPage.waitForResponse((response) =>
      response.url().includes("/rpc/set_master_availability_date_overrides"),
    );
    await masterPage
      .getByRole("button", { name: "Apply changes", exact: true })
      .click();
    expect((await bulkResponse).status()).toBe(200);
    expect(await slotsForDate(bookingDate)).toEqual([]);
    expect(await slotsForDate(secondDate)).toEqual([]);
    expect(await slotsForDate(controlDate)).toEqual(controlSlots);
    await masterPage
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await masterPage
      .getByRole("tab", { name: "Customers", exact: true })
      .click();
    await masterPage
      .getByRole("textbox", { name: "Name, phone, or email" })
      .fill("Manual customer");
    await masterPage
      .getByRole("button", { name: "Manual customer", exact: true })
      .click();
    await expect(
      masterPage.getByText("Booking history", { exact: true }),
    ).toBeVisible();
    const visit = masterPage.getByRole("button", {
      name: /Manicure \+ Pedicure/,
    });
    await expect(visit).toBeVisible();
    await expect(visit.getByText("Confirmed", { exact: true })).toBeVisible();
    await masterPage.close();
    await owner.client.auth.signOut();
  } finally {
    await admin.from("workspaces").delete().eq("id", workspaceId);
    if (userId) await admin.auth.admin.deleteUser(userId);
    await anonymous.removeAllChannels();
  }
});
