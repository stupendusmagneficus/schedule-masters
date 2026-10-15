import { createHash, randomUUID } from "node:crypto";
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
    "limits service catalog mutations to managers and preserves service history",
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
      const ownerEmail = `service-owner-${suffix}@example.test`;
      const memberEmail = `service-member-${suffix}@example.test`;
      const password = `Test-${suffix}-Password!`;

      const createdWorkspaces = await admin.from("workspaces").insert([
        { id: workspaceA, name: "Services A", slug: `services-a-${suffix}` },
        { id: workspaceB, name: "Services B", slug: `services-b-${suffix}` },
      ]);
      expect(createdWorkspaces.error).toBeNull();

      const owner = await createAuthenticatedTestUser({
        admin,
        email: ownerEmail,
        password,
        publishableKey: supabasePublishableKey,
        url: supabaseUrl,
      });
      const member = await createAuthenticatedTestUser({
        admin,
        email: memberEmail,
        password,
        publishableKey: supabasePublishableKey,
        url: supabaseUrl,
      });

      const memberships = await admin.from("workspace_members").insert([
        { role: "owner", user_id: owner.user.id, workspace_id: workspaceA },
        { role: "member", user_id: member.user.id, workspace_id: workspaceA },
      ]);
      expect(memberships.error).toBeNull();

      const service = await admin
        .from("services")
        .insert({
          duration_minutes: 60,
          name: "Initial service",
          price_amount: 700,
          workspace_id: workspaceA,
        })
        .select("id")
        .single();
      expect(service.error).toBeNull();
      const serviceId = service.data?.id;
      if (!serviceId) throw new Error("Service fixture was not created");

      const ownerServices = await owner.client
        .from("services")
        .select("id, name, archived_at, is_active")
        .eq("workspace_id", workspaceA);
      expect(ownerServices.error).toBeNull();
      expect(ownerServices.data).toHaveLength(1);

      const memberServices = await member.client
        .from("services")
        .select("id")
        .eq("workspace_id", workspaceA);
      expect(memberServices.error).toBeNull();
      expect(memberServices.data).toHaveLength(1);

      const createdByOwner = await owner.client
        .from("services")
        .insert({
          duration_minutes: 45,
          name: "Created by owner",
          price_amount: 500,
          workspace_id: workspaceA,
        })
        .select("id")
        .single();
      expect(createdByOwner.error).toBeNull();

      const createdByMember = await member.client
        .from("services")
        .insert({
          duration_minutes: 45,
          name: "Created by member",
          price_amount: 500,
          workspace_id: workspaceA,
        })
        .select("id")
        .single();
      expect(createdByMember.data).toBeNull();
      expect(createdByMember.error).not.toBeNull();

      const updatedByOwner = await owner.client
        .from("services")
        .update({ name: "Updated service" })
        .eq("id", serviceId)
        .eq("workspace_id", workspaceA)
        .select("name")
        .single();
      expect(updatedByOwner.error).toBeNull();
      expect(updatedByOwner.data?.name).toBe("Updated service");

      const updatedByMember = await member.client
        .from("services")
        .update({ name: "Member update" })
        .eq("id", serviceId)
        .eq("workspace_id", workspaceA)
        .select("name")
        .single();
      expect(updatedByMember.data).toBeNull();
      expect(updatedByMember.error).not.toBeNull();

      const archived = await owner.client
        .from("services")
        .update({ archived_at: new Date().toISOString(), is_active: false })
        .eq("id", serviceId)
        .eq("workspace_id", workspaceA)
        .select("archived_at, is_active")
        .single();
      expect(archived.error).toBeNull();
      expect(archived.data).toMatchObject({ is_active: false });

      const restored = await owner.client
        .from("services")
        .update({ archived_at: null, is_active: true })
        .eq("id", serviceId)
        .eq("workspace_id", workspaceA)
        .select("archived_at, is_active")
        .single();
      expect(restored.error).toBeNull();
      expect(restored.data).toMatchObject({
        archived_at: null,
        is_active: true,
      });

      const deleted = await owner.client
        .from("services")
        .delete()
        .eq("id", serviceId);
      expect(deleted.data).toBeNull();
      expect(deleted.error).toBeNull();

      const afterDelete = await owner.client
        .from("services")
        .select("id")
        .eq("id", serviceId)
        .single();
      expect(afterDelete.error).toBeNull();
      expect(afterDelete.data?.id).toBe(serviceId);

      const movedByAdmin = await admin
        .from("services")
        .update({ workspace_id: workspaceB })
        .eq("id", serviceId);
      expect(movedByAdmin.data).toBeNull();
      expect(movedByAdmin.error?.message).toContain(
        "Service workspace cannot be changed",
      );

      await admin
        .from("workspaces")
        .delete()
        .in("id", [workspaceA, workspaceB]);
      await admin.auth.admin.deleteUser(owner.user.id);
      await admin.auth.admin.deleteUser(member.user.id);
    },
    30_000,
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

      const monthSlots = await user.client.rpc(
        "get_master_month_available_slots",
        {
          p_month_start: "2030-01-01",
          p_service_id: serviceId,
          p_workspace_id: workspaceId,
        },
      );
      expect(monthSlots.error).toBeNull();
      expect([
        ...new Set(monthSlots.data?.map((slot) => slot.available_date)),
      ]).toEqual([
        "2030-01-03",
        "2030-01-10",
        "2030-01-17",
        "2030-01-24",
        "2030-01-31",
      ]);
      const selectedSlot = monthSlots.data?.find(
        (slot) => slot.available_date === "2030-01-03",
      );
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

  rlsIntegrationTest(
    "lists only this workspace's pending public booking requests in urgency order",
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
      const customerId = randomUUID();
      const password = `Test-${suffix}-Password!`;
      const email = `booking-requests-${suffix}@example.test`;
      let userId: string | null = null;

      try {
        const workspace = await admin.from("workspaces").insert({
          id: workspaceId,
          name: "Booking Requests Workspace",
          slug: `booking-requests-${suffix}`,
        });
        expect(workspace.error).toBeNull();

        const user = await createAuthenticatedTestUser({
          admin,
          email,
          password,
          publishableKey: supabasePublishableKey,
          url: supabaseUrl,
        });
        userId = user.user.id;
        expect(
          (
            await admin.from("workspace_members").insert({
              role: "owner",
              user_id: userId,
              workspace_id: workspaceId,
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.from("services").insert({
              duration_minutes: 60,
              id: serviceId,
              name: "Request service",
              price_amount: 700,
              workspace_id: workspaceId,
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.from("customers").insert({
              email: "request@example.test",
              id: customerId,
              name: "Request customer",
              phone: "+420111222333",
              workspace_id: workspaceId,
            })
          ).error,
        ).toBeNull();

        const appointments = await admin
          .from("appointments")
          .insert([
            {
              currency_snapshot: "CZK",
              customer_id: customerId,
              duration_minutes_snapshot: 60,
              ends_at: "2030-04-01T10:00:00.000Z",
              occupied_range:
                "[2030-04-01T09:00:00.000Z,2030-04-01T10:00:00.000Z)",
              price_amount_snapshot: 700,
              service_id: serviceId,
              service_name_snapshot: "Request service",
              source: "public_booking",
              starts_at: "2030-04-01T09:00:00.000Z",
              status: "pending",
              workspace_id: workspaceId,
            },
            {
              currency_snapshot: "CZK",
              customer_id: customerId,
              duration_minutes_snapshot: 60,
              ends_at: "2030-04-03T10:00:00.000Z",
              occupied_range:
                "[2030-04-03T09:00:00.000Z,2030-04-03T10:00:00.000Z)",
              price_amount_snapshot: 700,
              service_id: serviceId,
              service_name_snapshot: "Request service",
              source: "public_booking",
              starts_at: "2030-04-03T09:00:00.000Z",
              status: "pending",
              workspace_id: workspaceId,
            },
            {
              currency_snapshot: "CZK",
              customer_id: customerId,
              duration_minutes_snapshot: 60,
              ends_at: "2030-04-05T10:00:00.000Z",
              occupied_range:
                "[2030-04-05T09:00:00.000Z,2030-04-05T10:00:00.000Z)",
              price_amount_snapshot: 700,
              service_id: serviceId,
              service_name_snapshot: "Request service",
              source: "master_created",
              starts_at: "2030-04-05T09:00:00.000Z",
              status: "pending",
              workspace_id: workspaceId,
            },
            {
              currency_snapshot: "CZK",
              customer_id: customerId,
              duration_minutes_snapshot: 60,
              ends_at: "2030-04-07T10:00:00.000Z",
              occupied_range:
                "[2030-04-07T09:00:00.000Z,2030-04-07T10:00:00.000Z)",
              price_amount_snapshot: 700,
              service_id: serviceId,
              service_name_snapshot: "Request service",
              source: "public_booking",
              starts_at: "2030-04-07T09:00:00.000Z",
              status: "confirmed",
              workspace_id: workspaceId,
            },
          ])
          .select("id");
        expect(appointments.error).toBeNull();

        const result = await user.client.rpc(
          "list_master_pending_booking_requests",
          { p_workspace_id: workspaceId },
        );
        expect(result.error).toBeNull();
        expect(result.data).toHaveLength(2);
        expect(
          result.data?.map((request) =>
            new Date(request.starts_at).toISOString(),
          ),
        ).toEqual(["2030-04-01T09:00:00.000Z", "2030-04-03T09:00:00.000Z"]);
        expect(result.data?.[0]).toMatchObject({
          customer_email: "request@example.test",
          customer_name: "Request customer",
          customer_phone: "+420111222333",
          service_name: "Request service",
          status: "pending",
        });

        const earliestRequestId = result.data?.[0]?.id;
        if (!earliestRequestId)
          throw new Error("The earliest pending request was not listed");
        const declinedRequest = await user.client.rpc(
          "set_appointment_status",
          {
            p_appointment_id: earliestRequestId,
            p_status: "cancelled_by_master",
          },
        );
        expect(declinedRequest.error).toBeNull();
        const remainingRequests = await user.client.rpc(
          "list_master_pending_booking_requests",
          { p_workspace_id: workspaceId },
        );
        expect(remainingRequests.data).toHaveLength(1);
        expect(
          new Date(remainingRequests.data?.[0]?.starts_at ?? "").toISOString(),
        ).toBe("2030-04-03T09:00:00.000Z");

        const outsider = await createAuthenticatedTestUser({
          admin,
          email: `booking-requests-outsider-${suffix}@example.test`,
          password: `Test-${suffix}-Outsider!`,
          publishableKey: supabasePublishableKey,
          url: supabaseUrl,
        });
        const denied = await outsider.client.rpc(
          "list_master_pending_booking_requests",
          { p_workspace_id: workspaceId },
        );
        expect(denied.error?.code).toBe("42501");
        await admin.auth.admin.deleteUser(outsider.user.id);
      } finally {
        await admin.from("workspaces").delete().eq("id", workspaceId);
        if (userId) await admin.auth.admin.deleteUser(userId);
      }
    },
    30_000,
  );

  rlsIntegrationTest(
    "enforces the appointment status lifecycle and records transitions",
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
      const customerId = randomUUID();
      const email = `status-lifecycle-${suffix}@example.test`;
      const password = `Test-${suffix}-Password!`;
      // This is April 3 in the Prague workspace, but still April 2 in UTC.
      const startsAt = "2030-04-02T22:30:00.000Z";
      const endsAt = "2030-04-02T23:30:00.000Z";

      expect(
        (
          await admin.from("workspaces").insert({
            id: workspaceId,
            name: "Status Lifecycle Workspace",
            slug: `status-lifecycle-${suffix}`,
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
            name: "Lifecycle service",
            price_amount: 700,
            workspace_id: workspaceId,
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("customers").insert({
            id: customerId,
            name: "Lifecycle customer",
            workspace_id: workspaceId,
          })
        ).error,
      ).toBeNull();

      const appointment = await admin
        .from("appointments")
        .insert({
          currency_snapshot: "CZK",
          customer_id: customerId,
          duration_minutes_snapshot: 60,
          ends_at: endsAt,
          occupied_range: `[${startsAt},${endsAt})`,
          price_amount_snapshot: 700,
          service_id: serviceId,
          service_name_snapshot: "Lifecycle service",
          source: "public_booking",
          starts_at: startsAt,
          status: "pending",
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
      expect(appointment.error).toBeNull();
      const appointmentId = appointment.data?.id;
      if (!appointmentId)
        throw new Error("Lifecycle appointment was not created");

      const paymentBeforeCompletion = await user.client.rpc(
        "set_master_appointment_paid_amount",
        { p_appointment_id: appointmentId, p_paid_amount: 350 },
      );
      expect(paymentBeforeCompletion.error?.message).toContain(
        "completed appointments",
      );

      const confirmed = await user.client.rpc("set_appointment_status", {
        p_appointment_id: appointmentId,
        p_status: "confirmed",
      });
      expect(confirmed.error).toBeNull();
      expect(confirmed.data).toMatchObject({
        id: appointmentId,
        status: "confirmed",
      });

      const completed = await user.client.rpc("set_appointment_status", {
        p_appointment_id: appointmentId,
        p_status: "completed",
      });
      expect(completed.error).toBeNull();
      expect(completed.data).toMatchObject({
        id: appointmentId,
        status: "completed",
      });

      const payment = await user.client.rpc(
        "set_master_appointment_paid_amount",
        { p_appointment_id: appointmentId, p_paid_amount: 350 },
      );
      expect(payment.error).toBeNull();
      expect(payment.data).toMatchObject({
        id: appointmentId,
        paid_amount: 350,
      });
      const aboveServicePrice = await user.client.rpc(
        "set_master_appointment_paid_amount",
        { p_appointment_id: appointmentId, p_paid_amount: 701 },
      );
      expect(aboveServicePrice.error).toBeNull();
      expect(aboveServicePrice.data).toMatchObject({ paid_amount: 701 });
      const overPrecision = await user.client.rpc(
        "set_master_appointment_paid_amount",
        { p_appointment_id: appointmentId, p_paid_amount: 350.123 },
      );
      expect(overPrecision.error?.message).toContain("payment amount");

      const outsider = await createAuthenticatedTestUser({
        admin,
        email: `status-outsider-${suffix}@example.test`,
        password: `Test-${suffix}-Outsider!`,
        publishableKey: supabasePublishableKey,
        url: supabaseUrl,
      });
      const crossWorkspacePayment = await outsider.client.rpc(
        "set_master_appointment_paid_amount",
        { p_appointment_id: appointmentId, p_paid_amount: 350 },
      );
      expect(crossWorkspacePayment.error?.code).toBe("42501");

      const invalidTransition = await user.client.rpc(
        "set_appointment_status",
        {
          p_appointment_id: appointmentId,
          p_status: "confirmed",
        },
      );
      expect(invalidTransition.data).toBeNull();
      expect(invalidTransition.error?.message).toContain(
        "Invalid appointment status transition",
      );

      const events = await user.client
        .from("appointment_events")
        .select("from_status, to_status, event_type")
        .eq("appointment_id", appointmentId)
        .order("created_at");
      expect(events.error).toBeNull();
      expect(events.data).toEqual(
        expect.arrayContaining([
          {
            event_type: "confirmed",
            from_status: "pending",
            to_status: "confirmed",
          },
          {
            event_type: "completed",
            from_status: "confirmed",
            to_status: "completed",
          },
        ]),
      );

      const listed = await user.client.rpc("list_master_appointments", {
        p_from_date: "2030-04-03",
        p_to_date: "2030-04-03",
        p_workspace_id: workspaceId,
      });
      expect(listed.error).toBeNull();
      expect(listed.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: appointmentId,
            is_new_customer: true,
            is_returning_customer: false,
            paid_amount: 701,
            status: "completed",
          }),
        ]),
      );
      const listedUtcPreviousDay = await user.client.rpc(
        "list_master_appointments",
        {
          p_from_date: "2030-04-02",
          p_to_date: "2030-04-02",
          p_workspace_id: workspaceId,
        },
      );
      expect(listedUtcPreviousDay.error).toBeNull();
      expect(listedUtcPreviousDay.data).toEqual([]);

      await admin.from("workspaces").delete().eq("id", workspaceId);
      await admin.auth.admin.deleteUser(user.user.id);
      await admin.auth.admin.deleteUser(outsider.user.id);
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

describe("customer directory RPC", () => {
  rlsIntegrationTest(
    "returns workspace-scoped customers and their appointment history",
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
      const otherWorkspaceId = randomUUID();
      const customerId = randomUUID();
      const otherCustomerId = randomUUID();
      const email = `customer-directory-${suffix}@example.test`;
      const password = `Test-${suffix}-Password!`;
      let userId: string | undefined;

      try {
        expect(
          (
            await admin.from("workspaces").insert([
              {
                id: workspaceId,
                name: "Customer Directory Workspace",
                slug: `customer-directory-${suffix}`,
              },
              {
                id: otherWorkspaceId,
                name: "Other Customer Directory Workspace",
                slug: `other-customer-directory-${suffix}`,
              },
            ])
          ).error,
        ).toBeNull();

        const user = await createAuthenticatedTestUser({
          admin,
          email,
          password,
          publishableKey: supabasePublishableKey,
          url: supabaseUrl,
        });
        userId = user.user.id;
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
            await admin.from("customers").insert([
              {
                email: "anna@example.test",
                id: customerId,
                name: "Anna Customer",
                notes: "Prefers mornings",
                phone: "+420111222333",
                workspace_id: workspaceId,
              },
              {
                email: "other@example.test",
                id: otherCustomerId,
                name: "Other Workspace Customer",
                workspace_id: otherWorkspaceId,
              },
            ])
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.from("appointments").insert({
              completed_at: "2020-04-03T10:00:00.000Z",
              currency_snapshot: "CZK",
              customer_id: customerId,
              duration_minutes_snapshot: 60,
              ends_at: "2020-04-03T10:00:00.000Z",
              occupied_range:
                "[2020-04-03T09:00:00.000Z,2020-04-03T10:00:00.000Z)",
              price_amount_snapshot: 700,
              service_name_snapshot: "Directory service",
              source: "master_created",
              starts_at: "2020-04-03T09:00:00.000Z",
              status: "completed",
              workspace_id: workspaceId,
            })
          ).error,
        ).toBeNull();

        const directory = await user.client.rpc(
          "list_master_customer_directory",
          { p_workspace_id: workspaceId },
        );
        expect(directory.error).toBeNull();
        expect(directory.data).toHaveLength(1);
        expect(directory.data?.[0]).toMatchObject({
          completed_visits: 1,
          email: "anna@example.test",
          id: customerId,
          name: "Anna Customer",
          notes: "Prefers mornings",
          phone: "+420111222333",
        });

        const contact = await user.client
          .from("customers")
          .select("phone")
          .eq("workspace_id", workspaceId)
          .eq("id", customerId)
          .is("anonymized_at", null)
          .maybeSingle();
        expect(contact.error).toBeNull();
        expect(contact.data).toEqual({ phone: "+420111222333" });

        const history = await user.client.rpc("list_master_customer_history", {
          p_customer_id: customerId,
          p_workspace_id: workspaceId,
        });
        expect(history.error).toBeNull();
        expect(history.data).toHaveLength(1);
        expect(history.data?.[0]).toMatchObject({
          customer_id: customerId,
          duration_minutes: 60,
          price_amount: 700,
          service_name: "Directory service",
          status: "completed",
        });

        const crossWorkspaceHistory = await user.client.rpc(
          "list_master_customer_history",
          { p_customer_id: otherCustomerId, p_workspace_id: workspaceId },
        );
        expect(crossWorkspaceHistory.data).toBeNull();
        expect(crossWorkspaceHistory.error?.code).toBe("P0002");

        const crossWorkspaceContact = await user.client
          .from("customers")
          .select("phone")
          .eq("workspace_id", workspaceId)
          .eq("id", otherCustomerId)
          .maybeSingle();
        expect(crossWorkspaceContact.data).toBeNull();
        expect(crossWorkspaceContact.error).toBeNull();
      } finally {
        const deletedWorkspaces = await admin
          .from("workspaces")
          .delete()
          .in("id", [workspaceId, otherWorkspaceId]);
        const deletedUser = userId
          ? await admin.auth.admin.deleteUser(userId)
          : null;
        expect(deletedWorkspaces.error).toBeNull();
        expect(deletedUser?.error).toBeNull();
      }
    },
    30_000,
  );

  rlsIntegrationTest(
    "limits customer appointment links to expiring, revocable booking details",
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
      const otherWorkspaceId = randomUUID();
      const password = `Test-${suffix}-Password!`;
      const owner = await createAuthenticatedTestUser({
        admin,
        email: `appointment-link-${suffix}@example.test`,
        password,
        publishableKey: supabasePublishableKey,
        url: supabaseUrl,
      });
      const otherOwner = await createAuthenticatedTestUser({
        admin,
        email: `appointment-link-other-${suffix}@example.test`,
        password,
        publishableKey: supabasePublishableKey,
        url: supabaseUrl,
      });

      await admin.from("workspaces").insert([
        {
          id: workspaceId,
          name: "Appointment link studio",
          slug: `appointment-link-${suffix}`,
        },
        {
          id: otherWorkspaceId,
          name: "Other appointment studio",
          slug: `appointment-link-other-${suffix}`,
        },
      ]);
      await admin.from("workspace_members").insert([
        {
          role: "owner",
          user_id: owner.user.id,
          workspace_id: workspaceId,
        },
        {
          role: "owner",
          user_id: otherOwner.user.id,
          workspace_id: otherWorkspaceId,
        },
      ]);
      const customer = await admin
        .from("customers")
        .insert({
          email: "private@example.test",
          name: "Private Customer",
          phone: "+420123456789",
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
      const customerId = customer.data?.id;
      expect(customer.error).toBeNull();
      if (!customerId) throw new Error("Customer fixture was not created");

      const appointment = await admin
        .from("appointments")
        .insert({
          currency_snapshot: "CZK",
          customer_id: customerId,
          duration_minutes_snapshot: 60,
          ends_at: "2030-03-01T11:00:00.000Z",
          occupied_range: "[2030-03-01T10:00:00.000Z,2030-03-01T11:00:00.000Z)",
          price_amount_snapshot: 700,
          service_name_snapshot: "Private Service",
          source: "master_created",
          starts_at: "2030-03-01T10:00:00.000Z",
          status: "pending",
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
      const appointmentId = appointment.data?.id;
      expect(appointment.error).toBeNull();
      if (!appointmentId)
        throw new Error("Appointment fixture was not created");

      const withoutConsent = await owner.client.rpc(
        "create_customer_appointment_link",
        {
          p_appointment_id: appointmentId,
          p_customer_consent_confirmed: false,
        },
      );
      expect(withoutConsent.error?.message).toContain("consent is required");
      const crossWorkspaceLink = await otherOwner.client.rpc(
        "create_customer_appointment_link",
        { p_appointment_id: appointmentId, p_customer_consent_confirmed: true },
      );
      expect(crossWorkspaceLink.data).toBeNull();
      expect(crossWorkspaceLink.error?.message).toContain(
        "Appointment access denied",
      );

      const createdLink = await owner.client.rpc(
        "create_customer_appointment_link",
        { p_appointment_id: appointmentId, p_customer_consent_confirmed: true },
      );
      expect(createdLink.error).toBeNull();
      const token = (createdLink.data as { token?: string } | null)?.token;
      expect(token).toMatch(/^[0-9a-f]{128}$/);
      if (!token) throw new Error("Appointment link token was not created");

      const storedToken = await admin
        .from("appointment_access_tokens")
        .select("token_hash, expires_at, revoked_at")
        .eq("appointment_id", appointmentId)
        .single();
      expect(storedToken.error).toBeNull();
      expect(storedToken.data?.token_hash).not.toBe(token);
      expect(storedToken.data?.token_hash).toMatch(/^[0-9a-f]{64}$/);

      const shareOpened = await owner.client.rpc("record_customer_link_share", {
        p_appointment_id: appointmentId,
        p_status: "share_sheet_opened",
      });
      expect(shareOpened.error).toBeNull();
      const notificationEvents = await owner.client
        .from("appointment_notification_events")
        .select("status, error_code, channel")
        .eq("appointment_id", appointmentId);
      expect(notificationEvents.error).toBeNull();
      expect(notificationEvents.data?.map((event) => event.status)).toEqual(
        expect.arrayContaining(["manual_required", "share_sheet_opened"]),
      );
      const crossWorkspaceEvents = await otherOwner.client
        .from("appointment_notification_events")
        .select("status")
        .eq("appointment_id", appointmentId);
      expect(crossWorkspaceEvents.error).toBeNull();
      expect(crossWorkspaceEvents.data).toEqual([]);

      const details = await supabase?.rpc("get_customer_appointment", {
        p_token: token,
      });
      expect(details?.error).toBeNull();
      expect(details?.data).toMatchObject({
        canCancel: true,
        canConfirm: true,
        serviceName: "Private Service",
        status: "pending",
        workspaceName: "Appointment link studio",
      });
      expect(details?.data).not.toHaveProperty("customerName");
      expect(details?.data).not.toHaveProperty("email");
      expect(details?.data).not.toHaveProperty("phone");

      const confirmed = await supabase?.rpc("update_customer_appointment", {
        p_action: "confirm",
        p_token: token,
      });
      expect(confirmed?.error).toBeNull();
      expect(confirmed?.data).toMatchObject({ status: "confirmed" });
      const confirmationRetry = await supabase?.rpc(
        "update_customer_appointment",
        { p_action: "confirm", p_token: token },
      );
      expect(confirmationRetry?.error).toBeNull();
      expect(confirmationRetry?.data).toMatchObject({ status: "confirmed" });

      const cancelled = await supabase?.rpc("update_customer_appointment", {
        p_action: "cancel",
        p_token: token,
      });
      expect(cancelled?.error).toBeNull();
      expect(cancelled?.data).toMatchObject({
        status: "cancelled_by_customer",
      });
      const cancellationRetry = await supabase?.rpc(
        "update_customer_appointment",
        { p_action: "cancel", p_token: token },
      );
      expect(cancellationRetry?.error).toBeNull();
      expect(cancellationRetry?.data).toMatchObject({
        status: "cancelled_by_customer",
      });

      const revokedDetails = await supabase?.rpc("get_customer_appointment", {
        p_token: token,
      });
      expect(revokedDetails?.data).toBeNull();

      const rescheduledAppointment = await admin
        .from("appointments")
        .insert({
          currency_snapshot: "CZK",
          customer_id: customerId,
          duration_minutes_snapshot: 60,
          ends_at: "2030-03-02T11:00:00.000Z",
          occupied_range: "[2030-03-02T10:00:00.000Z,2030-03-02T11:00:00.000Z)",
          price_amount_snapshot: 700,
          service_name_snapshot: "Rescheduled Service",
          source: "master_created",
          starts_at: "2030-03-02T10:00:00.000Z",
          status: "confirmed",
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
      const rescheduledId = rescheduledAppointment.data?.id;
      expect(rescheduledAppointment.error).toBeNull();
      if (!rescheduledId) {
        throw new Error("Rescheduled appointment fixture was not created");
      }
      const rescheduleLink = await owner.client.rpc(
        "create_customer_appointment_link",
        { p_appointment_id: rescheduledId, p_customer_consent_confirmed: true },
      );
      const rescheduleToken = (rescheduleLink.data as { token?: string } | null)
        ?.token;
      expect(rescheduleLink.error).toBeNull();
      expect(rescheduleToken).toMatch(/^[0-9a-f]{128}$/);
      await admin
        .from("appointments")
        .update({
          ends_at: "2030-03-04T11:00:00.000Z",
          starts_at: "2030-03-04T10:00:00.000Z",
        })
        .eq("id", rescheduledId);
      const staleScheduleDetails = await supabase?.rpc(
        "get_customer_appointment",
        { p_token: rescheduleToken as string },
      );
      expect(staleScheduleDetails?.data).toBeNull();

      const expiringAppointment = await admin
        .from("appointments")
        .insert({
          currency_snapshot: "CZK",
          customer_id: customerId,
          duration_minutes_snapshot: 60,
          ends_at: "2030-03-05T11:00:00.000Z",
          occupied_range: "[2030-03-05T10:00:00.000Z,2030-03-05T11:00:00.000Z)",
          price_amount_snapshot: 700,
          service_name_snapshot: "Expiring Service",
          source: "master_created",
          starts_at: "2030-03-05T10:00:00.000Z",
          status: "confirmed",
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
      const expiringId = expiringAppointment.data?.id;
      expect(expiringAppointment.error).toBeNull();
      if (!expiringId)
        throw new Error("Expiring appointment fixture is missing");
      const expiringLink = await owner.client.rpc(
        "create_customer_appointment_link",
        { p_appointment_id: expiringId, p_customer_consent_confirmed: true },
      );
      const expiringToken = (expiringLink.data as { token?: string } | null)
        ?.token;
      expect(expiringLink.error).toBeNull();
      if (!expiringToken)
        throw new Error("Expiring link token was not created");
      const expiringHash = createHash("sha256")
        .update(expiringToken)
        .digest("hex");
      await admin
        .from("appointment_access_tokens")
        .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
        .eq("token_hash", expiringHash);
      const expiredDetails = await supabase?.rpc("get_customer_appointment", {
        p_token: expiringToken,
      });
      expect(expiredDetails?.data).toBeNull();
      const expiredAction = await supabase?.rpc("update_customer_appointment", {
        p_action: "confirm",
        p_token: expiringToken,
      });
      expect(expiredAction?.error?.message).toContain("invalid or expired");

      await admin
        .from("workspaces")
        .delete()
        .in("id", [workspaceId, otherWorkspaceId]);
      await admin.auth.admin.deleteUser(owner.user.id);
      await admin.auth.admin.deleteUser(otherOwner.user.id);
    },
  );
});

describe("workspace settings RPC", () => {
  rlsIntegrationTest(
    "allows only owners to update workspace settings",
    async () => {
      if (!supabaseUrl || !supabasePublishableKey || !supabaseServiceRoleKey)
        return;
      const admin = createSupabaseAdminTestClient({
        serviceRoleKey: supabaseServiceRoleKey,
        url: supabaseUrl,
      });
      const suffix = Date.now();
      const workspaceId = randomUUID();
      let ownerId: string | undefined;
      let memberId: string | undefined;
      try {
        const createdWorkspace = await admin.from("workspaces").insert({
          id: workspaceId,
          name: "Before settings",
          slug: `settings-before-${suffix}`,
        });
        expect(createdWorkspace.error).toBeNull();
        const owner = await createAuthenticatedTestUser({
          admin,
          email: `workspace-owner-${suffix}@example.test`,
          password: `Test-${suffix}-Password!`,
          publishableKey: supabasePublishableKey,
          url: supabaseUrl,
        });
        ownerId = owner.user.id;
        const member = await createAuthenticatedTestUser({
          admin,
          email: `workspace-member-${suffix}@example.test`,
          password: `Test-${suffix}-Password!`,
          publishableKey: supabasePublishableKey,
          url: supabaseUrl,
        });
        memberId = member.user.id;
        const memberships = await admin.from("workspace_members").insert([
          { role: "owner", user_id: ownerId, workspace_id: workspaceId },
          { role: "member", user_id: memberId, workspace_id: workspaceId },
        ]);
        expect(memberships.error).toBeNull();
        const bookingLink = await admin.from("booking_links").insert({
          slug: `settings-before-${suffix}`,
          workspace_id: workspaceId,
        });
        expect(bookingLink.error).toBeNull();
        const validFrom = new Date().toISOString().slice(0, 10);
        const initialRules = await admin.from("availability_rules").insert([
          {
            day_of_week: 1,
            end_local_time: "17:00",
            start_local_time: "09:00",
            valid_from: validFrom,
            workspace_id: workspaceId,
          },
        ]);
        expect(initialRules.error).toBeNull();
        const args = {
          p_end_local_time: "18:00",
          p_name: "After settings",
          p_slug: `settings-after-${suffix}`,
          p_start_local_time: "08:00",
          p_working_days: [1, 2, 5],
          p_workspace_id: workspaceId,
        };
        const updated = await owner.client.rpc(
          "update_master_workspace_settings",
          args,
        );
        expect(updated.error).toBeNull();
        const savedWorkspace = await admin
          .from("workspaces")
          .select("name, slug")
          .eq("id", workspaceId)
          .single();
        expect(savedWorkspace.data).toEqual({
          name: "After settings",
          slug: `settings-after-${suffix}`,
        });
        const savedLink = await admin
          .from("booking_links")
          .select("slug")
          .eq("workspace_id", workspaceId)
          .single();
        expect(savedLink.data?.slug).toBe(`settings-after-${suffix}`);
        const activeRules = await admin
          .from("availability_rules")
          .select("day_of_week")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true);
        expect(
          activeRules.data?.map((rule) => rule.day_of_week).sort(),
        ).toEqual([1, 2, 5]);
        const denied = await member.client.rpc(
          "update_master_workspace_settings",
          {
            ...args,
            p_name: "Unauthorized change",
            p_slug: `unauthorized-${suffix}`,
          },
        );
        expect(denied.error?.message).toContain("Workspace access denied");
        const unchanged = await admin
          .from("workspaces")
          .select("name, slug")
          .eq("id", workspaceId)
          .single();
        expect(unchanged.data).toEqual(savedWorkspace.data);
      } finally {
        await admin.from("workspaces").delete().eq("id", workspaceId);
        if (ownerId) await admin.auth.admin.deleteUser(ownerId);
        if (memberId) await admin.auth.admin.deleteUser(memberId);
      }
    },
  );
});
