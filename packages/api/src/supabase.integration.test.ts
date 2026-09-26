import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createSupabaseClient } from "./supabase/client";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "./supabase.integration.helpers";

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const integrationTest = supabaseUrl && supabasePublishableKey ? it : it.skip;
const rlsIntegrationTest =
  supabaseUrl && supabasePublishableKey && supabaseServiceRoleKey
    ? it
    : it.skip;

const supabase =
  supabaseUrl && supabasePublishableKey
    ? createSupabaseClient({
        url: supabaseUrl,
        publishableKey: supabasePublishableKey,
      })
    : null;

const serviceId = "00000000-0000-0000-0000-000000000002";
const bookingDate = "2030-01-03";

describe("Supabase public booking contract", () => {
  afterAll(async () => {
    await supabase?.removeAllChannels();
  });

  integrationTest(
    "enforces public booking boundaries and idempotency",
    async () => {
      if (!supabase) return;

      const context = await supabase.rpc("get_public_booking_context", {
        p_slug: "demo-studio",
      });
      expect(context.error).toBeNull();
      expect(context.data).toMatchObject({
        workspace: { slug: "demo-studio" },
      });

      const slots = await supabase.rpc("get_public_available_slots", {
        p_date: bookingDate,
        p_service_id: serviceId,
        p_slug: "demo-studio",
      });
      expect(slots.error).toBeNull();
      const availableSlot = slots.data?.[0];
      expect(availableSlot).toBeDefined();
      const bookingStart = availableSlot?.starts_at;
      expect(bookingStart).toEqual(expect.any(String));

      const idempotencyKey = `integration-${Date.now()}`;
      const first = await supabase.rpc("create_public_booking", {
        p_email: "integration@example.test",
        p_idempotency_key: idempotencyKey,
        p_name: "Integration client",
        p_phone: "+420111222333",
        p_service_id: serviceId,
        p_slug: "demo-studio",
        p_starts_at: bookingStart as string,
      });
      expect(first.error).toBeNull();

      const retry = await supabase.rpc("create_public_booking", {
        p_email: "integration@example.test",
        p_idempotency_key: idempotencyKey,
        p_name: "Integration retry",
        p_phone: "+420111222333",
        p_service_id: serviceId,
        p_slug: "demo-studio",
        p_starts_at: bookingStart as string,
      });
      expect(retry.error).toBeNull();
      expect(retry.data).toEqual(first.data);

      const nextDaySlots = await supabase.rpc("get_public_available_slots", {
        p_date: "2030-01-04",
        p_service_id: serviceId,
        p_slug: "demo-studio",
      });
      expect(nextDaySlots.error).toBeNull();
      const secondSlot = nextDaySlots.data?.[0];
      expect(secondSlot).toBeDefined();

      const secondBooking = await supabase.rpc("create_public_booking", {
        p_email: "integration@example.test",
        p_idempotency_key: `${idempotencyKey}-second`,
        p_name: "Different guest name",
        p_phone: "+420111222333",
        p_service_id: serviceId,
        p_slug: "demo-studio",
        p_starts_at: secondSlot?.starts_at as string,
      });

      expect(secondBooking.error).toBeNull();
      const firstBookingId = (first.data as { id?: string } | null)?.id;
      const secondBookingId = (secondBooking.data as { id?: string } | null)
        ?.id;
      expect(secondBookingId).not.toEqual(firstBookingId);
    },
  );

  rlsIntegrationTest(
    "rejects cross-workspace reads and appointment references",
    async () => {
      if (!supabaseUrl || !supabasePublishableKey || !supabaseServiceRoleKey) {
        return;
      }

      const admin = createSupabaseAdminTestClient({
        serviceRoleKey: supabaseServiceRoleKey,
        url: supabaseUrl,
      });
      const suffix = Date.now();
      const workspaceA = randomUUID();
      const workspaceB = randomUUID();
      const password = `Test-${suffix}-Password!`;
      const emailA = `rls-a-${suffix}@example.test`;
      const emailB = `rls-b-${suffix}@example.test`;

      const createdWorkspaces = await admin.from("workspaces").insert([
        { id: workspaceA, name: "RLS Workspace A", slug: `rls-a-${suffix}` },
        { id: workspaceB, name: "RLS Workspace B", slug: `rls-b-${suffix}` },
      ]);
      expect(createdWorkspaces.error).toBeNull();

      const userA = await createAuthenticatedTestUser({
        admin,
        email: emailA,
        password,
        publishableKey: supabasePublishableKey,
        url: supabaseUrl,
      });
      const userB = await createAuthenticatedTestUser({
        admin,
        email: emailB,
        password,
        publishableKey: supabasePublishableKey,
        url: supabaseUrl,
      });

      const memberships = await admin.from("workspace_members").insert([
        { role: "owner", user_id: userA.user.id, workspace_id: workspaceA },
        { role: "owner", user_id: userB.user.id, workspace_id: workspaceB },
      ]);
      expect(memberships.error).toBeNull();

      const customerB = await admin
        .from("customers")
        .insert({ name: "Workspace B Customer", workspace_id: workspaceB })
        .select("id")
        .single();
      const serviceB = await admin
        .from("services")
        .insert({
          duration_minutes: 60,
          name: "Workspace B Service",
          price_amount: 500,
          workspace_id: workspaceB,
        })
        .select("id")
        .single();
      expect(customerB.error).toBeNull();
      expect(serviceB.error).toBeNull();
      const customerBId = customerB.data?.id;
      const serviceBId = serviceB.data?.id;
      if (!customerBId || !serviceBId) {
        throw new Error("Cross-workspace fixtures were not created");
      }

      const block = await userA.client.rpc("create_master_availability_block", {
        p_date: "2030-02-05",
        p_end_local_time: "13:00",
        p_reason: "Lunch",
        p_start_local_time: "12:00",
        p_workspace_id: workspaceA,
      });
      expect(block.error).toBeNull();

      const blockId = (block.data as { id?: string } | null)?.id;
      expect(blockId).toEqual(expect.any(String));

      const listedBlocks = await userA.client.rpc(
        "list_master_availability_blocks",
        {
          p_from_date: "2030-02-05",
          p_to_date: "2030-02-05",
          p_workspace_id: workspaceA,
        },
      );
      expect(listedBlocks.error).toBeNull();
      expect(listedBlocks.data).toHaveLength(1);
      expect(listedBlocks.data?.[0]).toMatchObject({
        id: blockId,
        reason: "Lunch",
      });

      const duplicateBlock = await userA.client.rpc(
        "create_master_availability_block",
        {
          p_date: "2030-02-05",
          p_end_local_time: "13:30",
          p_reason: "Overlapping lunch",
          p_start_local_time: "12:30",
          p_workspace_id: workspaceA,
        },
      );
      expect(duplicateBlock.error?.message).toContain(
        "overlaps an existing block",
      );

      const crossWorkspaceBlock = await userB.client.rpc(
        "create_master_availability_block",
        {
          p_date: "2030-02-05",
          p_end_local_time: "14:00",
          p_reason: "Cross-workspace attempt",
          p_start_local_time: "13:00",
          p_workspace_id: workspaceA,
        },
      );
      expect(crossWorkspaceBlock.data).toBeNull();
      expect(crossWorkspaceBlock.error?.message).toContain(
        "Workspace access denied",
      );

      const deletedBlock = await userA.client.rpc(
        "delete_master_availability_block",
        { p_block_id: blockId as string, p_workspace_id: workspaceA },
      );
      expect(deletedBlock.error).toBeNull();

      const crossWorkspaceRead = await userA.client
        .from("customers")
        .select("id")
        .eq("id", customerBId);
      expect(crossWorkspaceRead.error).toBeNull();
      expect(crossWorkspaceRead.data).toEqual([]);

      const crossWorkspaceInsert = await userA.client
        .from("appointments")
        .insert({
          currency_snapshot: "CZK",
          customer_id: customerBId,
          duration_minutes_snapshot: 60,
          ends_at: "2030-02-01T11:00:00.000Z",
          occupied_range: "[2030-02-01T10:00:00.000Z,2030-02-01T11:00:00.000Z)",
          price_amount_snapshot: 500,
          service_id: serviceBId,
          service_name_snapshot: "Workspace B Service",
          source: "master_created",
          starts_at: "2030-02-01T10:00:00.000Z",
          workspace_id: workspaceA,
        });
      expect(crossWorkspaceInsert.data).toBeNull();
      expect(crossWorkspaceInsert.error).not.toBeNull();

      await admin
        .from("workspaces")
        .delete()
        .in("id", [workspaceA, workspaceB]);
      await admin.auth.admin.deleteUser(userA.user.id);
      await admin.auth.admin.deleteUser(userB.user.id);
    },
  );

  rlsIntegrationTest(
    "uses one tenant-scoped availability contract for master and public booking",
    async () => {
      if (!supabaseUrl || !supabasePublishableKey || !supabaseServiceRoleKey) {
        return;
      }

      const admin = createSupabaseAdminTestClient({
        serviceRoleKey: supabaseServiceRoleKey,
        url: supabaseUrl,
      });
      const suffix = Date.now();
      const workspaceId = randomUUID();
      const userEmail = `availability-${suffix}@example.test`;
      const outsiderEmail = `availability-outsider-${suffix}@example.test`;
      const password = `Test-${suffix}-Password!`;
      const serviceId = randomUUID();

      const workspace = await admin.from("workspaces").insert({
        id: workspaceId,
        name: "Availability Workspace",
        slug: `availability-${suffix}`,
        timezone: "Europe/Prague",
      });
      expect(workspace.error).toBeNull();

      const user = await createAuthenticatedTestUser({
        admin,
        email: userEmail,
        password,
        publishableKey: supabasePublishableKey,
        url: supabaseUrl,
      });
      const outsider = await createAuthenticatedTestUser({
        admin,
        email: outsiderEmail,
        password,
        publishableKey: supabasePublishableKey,
        url: supabaseUrl,
      });

      const membership = await admin.from("workspace_members").insert({
        role: "owner",
        user_id: user.user.id,
        workspace_id: workspaceId,
      });
      expect(membership.error).toBeNull();

      const bookingLink = await admin.from("booking_links").insert({
        slug: `availability-${suffix}`,
        workspace_id: workspaceId,
      });
      expect(bookingLink.error).toBeNull();

      const service = await admin
        .from("services")
        .insert({
          buffer_after_minutes: 30,
          duration_minutes: 60,
          id: serviceId,
          name: "Availability service",
          price_amount: 700,
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
      expect(service.error).toBeNull();

      const weekdayRule = await admin
        .from("availability_rules")
        .insert({
          day_of_week: 4,
          end_local_time: "17:00",
          start_local_time: "09:00",
          valid_from: "2030-01-01",
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
      const dstRule = await admin
        .from("availability_rules")
        .insert({
          day_of_week: 7,
          end_local_time: "05:00",
          start_local_time: "00:00",
          valid_from: "2030-01-01",
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
      expect(weekdayRule.error).toBeNull();
      expect(dstRule.error).toBeNull();
      const weekdayRuleId = weekdayRule.data?.id;
      if (!weekdayRuleId) {
        throw new Error("Weekday availability rule was not created");
      }

      const availabilityBreak = await admin.from("availability_breaks").insert({
        availability_rule_id: weekdayRuleId,
        end_local_time: "13:00",
        start_local_time: "12:00",
      });
      expect(availabilityBreak.error).toBeNull();

      const customer = await admin
        .from("customers")
        .insert({ name: "Booked customer", workspace_id: workspaceId })
        .select("id")
        .single();
      expect(customer.error).toBeNull();
      const customerId = customer.data?.id;
      if (!customerId) {
        throw new Error("Customer fixture was not created");
      }

      const appointment = await admin.from("appointments").insert({
        currency_snapshot: "CZK",
        customer_id: customerId,
        duration_minutes_snapshot: 60,
        ends_at: "2030-03-28T14:00:00.000Z",
        occupied_range: "[2030-03-28T13:00:00.000Z,2030-03-28T14:00:00.000Z)",
        price_amount_snapshot: 700,
        service_id: serviceId,
        service_name_snapshot: "Availability service",
        source: "master_created",
        starts_at: "2030-03-28T13:00:00.000Z",
        status: "confirmed",
        workspace_id: workspaceId,
      });
      expect(appointment.error).toBeNull();

      const block = await user.client.rpc("create_master_availability_block", {
        p_date: "2030-03-28",
        p_end_local_time: "16:00",
        p_reason: "Personal task",
        p_start_local_time: "15:00",
        p_workspace_id: workspaceId,
      });
      expect(block.error).toBeNull();

      const masterSlots = await user.client.rpc("get_master_available_slots", {
        p_date: "2030-03-28",
        p_service_id: serviceId,
        p_workspace_id: workspaceId,
      });
      expect(masterSlots.error).toBeNull();
      expect(masterSlots.data?.map((slot) => slot.starts_at)).toContain(
        "2030-03-28T08:00:00+00:00",
      );
      expect(masterSlots.data?.map((slot) => slot.starts_at)).not.toContain(
        "2030-03-28T11:30:00+00:00",
      );
      expect(masterSlots.data?.map((slot) => slot.starts_at)).not.toContain(
        "2030-03-28T12:30:00+00:00",
      );

      if (!supabase) {
        throw new Error("Supabase client is not configured");
      }
      const publicSlots = await supabase.rpc("get_public_available_slots", {
        p_date: "2030-03-28",
        p_service_id: serviceId,
        p_slug: `availability-${suffix}`,
      });
      expect(publicSlots.error).toBeNull();
      expect(publicSlots.data).toEqual(masterSlots.data);
      expect(Object.keys(publicSlots.data?.[0] ?? {}).sort()).toEqual([
        "ends_at",
        "starts_at",
      ]);

      const dstSlots = await user.client.rpc("get_master_available_slots", {
        p_date: "2030-03-31",
        p_service_id: serviceId,
        p_workspace_id: workspaceId,
      });
      expect(dstSlots.error).toBeNull();
      const dstStartTimes = (dstSlots.data ?? []).map((slot) =>
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          hourCycle: "h23",
          minute: "2-digit",
          timeZone: "Europe/Prague",
        }).format(new Date(slot.starts_at)),
      );
      expect(dstStartTimes).not.toContain("02:00");

      const outsiderSlots = await outsider.client.rpc(
        "get_master_available_slots",
        {
          p_date: "2030-03-28",
          p_service_id: serviceId,
          p_workspace_id: workspaceId,
        },
      );
      expect(outsiderSlots.data).toBeNull();
      expect(outsiderSlots.error?.message).toContain("Workspace access denied");

      await admin.from("workspaces").delete().eq("id", workspaceId);
      await admin.auth.admin.deleteUser(user.user.id);
      await admin.auth.admin.deleteUser(outsider.user.id);
    },
    30_000,
  );

  integrationTest(
    "rejects direct anonymous access to appointments",
    async () => {
      if (!supabase) return;

      const appointments = await supabase.from("appointments").select("id");
      expect(appointments.data).toBeNull();
      expect(appointments.error).not.toBeNull();
    },
  );

  rlsIntegrationTest(
    "creates an idempotent confirmed master booking for a tenant",
    async () => {
      if (!supabaseUrl || !supabasePublishableKey || !supabaseServiceRoleKey) {
        return;
      }

      const admin = createSupabaseAdminTestClient({
        serviceRoleKey: supabaseServiceRoleKey,
        url: supabaseUrl,
      });
      const suffix = Date.now();
      const workspaceId = randomUUID();
      const serviceId = randomUUID();
      const email = `manual-booking-${suffix}@example.test`;
      const password = `Test-${suffix}-Password!`;

      expect(
        (
          await admin.from("workspaces").insert({
            id: workspaceId,
            name: "Manual Booking Workspace",
            slug: `manual-booking-${suffix}`,
            timezone: "Europe/Prague",
          })
        ).error,
      ).toBeNull();

      const user = await createAuthenticatedTestUser({
        admin,
        email,
        password,
        publishableKey: supabasePublishableKey,
        url: supabaseUrl,
      });
      expect(
        (
          await admin.from("workspace_members").insert({
            role: "owner",
            user_id: user.user.id,
            workspace_id: workspaceId,
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("services").insert({
            duration_minutes: 60,
            id: serviceId,
            name: "Manual booking service",
            price_amount: 700,
            workspace_id: workspaceId,
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("availability_rules").insert({
            day_of_week: 4,
            end_local_time: "17:00",
            start_local_time: "09:00",
            valid_from: "2030-01-01",
            workspace_id: workspaceId,
          })
        ).error,
      ).toBeNull();

      const slots = await user.client.rpc("get_master_available_slots", {
        p_date: "2030-01-03",
        p_service_id: serviceId,
        p_workspace_id: workspaceId,
      });
      expect(slots.error).toBeNull();
      const selectedSlot = slots.data?.[0];
      expect(selectedSlot).toBeDefined();

      const idempotencyKey = `manual-${suffix}`;
      const first = await user.client.rpc("create_master_booking", {
        p_duration_minutes: 60,
        p_email: undefined,
        p_idempotency_key: idempotencyKey,
        p_name: "Manual customer",
        p_phone: undefined,
        p_price_amount: 700,
        p_service_id: serviceId,
        p_starts_at: selectedSlot?.starts_at as string,
        p_workspace_id: workspaceId,
      });
      expect(first.error).toBeNull();
      expect(first.data).toMatchObject({
        source: "master_created",
        status: "confirmed",
      });

      const retry = await user.client.rpc("create_master_booking", {
        p_idempotency_key: idempotencyKey,
        p_name: "Retry customer",
        p_service_id: serviceId,
        p_starts_at: selectedSlot?.starts_at as string,
        p_workspace_id: workspaceId,
      });
      expect(retry.error).toBeNull();
      expect(retry.data).toEqual(first.data);

      const customers = await user.client.rpc("list_master_customers", {
        p_workspace_id: workspaceId,
      });
      expect(customers.error).toBeNull();
      expect(customers.data).toHaveLength(1);
      expect(customers.data?.[0]).toMatchObject({
        email: null,
        name: "Manual customer",
        phone: null,
      });

      const appointments = await user.client.rpc("list_master_appointments", {
        p_from_date: "2030-01-03",
        p_to_date: "2030-01-03",
        p_workspace_id: workspaceId,
      });
      expect(appointments.error).toBeNull();
      expect(appointments.data).toHaveLength(1);
      expect(appointments.data?.[0]).toMatchObject({
        customer_name: "Manual customer",
        source: "master_created",
        status: "confirmed",
      });

      await admin.from("workspaces").delete().eq("id", workspaceId);
      await admin.auth.admin.deleteUser(user.user.id);
    },
    30_000,
  );

  integrationTest("limits new public booking attempts", async () => {
    if (!supabase) return;

    const firstDate = new Date("2030-01-07T00:00:00Z");
    const errors: string[] = [];

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const bookingDate = firstDate.toISOString().slice(0, 10);
      const slots = await supabase.rpc("get_public_available_slots", {
        p_date: bookingDate,
        p_service_id: serviceId,
        p_slug: "demo-studio",
      });
      const slot = slots.data?.[0];

      if (slot?.starts_at) {
        const booking = await supabase.rpc("create_public_booking", {
          p_email: `quota-${attempt}@example.test`,
          p_idempotency_key: `quota-${Date.now()}-${attempt}`,
          p_name: `Quota test ${attempt}`,
          p_phone: `+42011122${String(attempt).padStart(4, "0")}`,
          p_service_id: serviceId,
          p_slug: "demo-studio",
          p_starts_at: slot.starts_at,
        });

        if (booking.error) {
          errors.push(booking.error.message);
        }
      }

      firstDate.setUTCDate(firstDate.getUTCDate() + 1);
    }

    expect(
      errors.some(
        (message) =>
          message.includes("temporarily unavailable") ||
          message.includes("Too many booking requests"),
      ),
    ).toBe(true);
  });
});
