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

  integrationTest(
    "rejects direct anonymous access to appointments",
    async () => {
      if (!supabase) return;

      const appointments = await supabase.from("appointments").select("id");
      expect(appointments.data).toBeNull();
      expect(appointments.error).not.toBeNull();
    },
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
