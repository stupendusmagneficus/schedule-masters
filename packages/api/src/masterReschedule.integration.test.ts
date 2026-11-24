import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "./supabase.integration.helpers";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contract = url && publishableKey && serviceRoleKey ? it : it.skip;

const workDate = "2030-01-07";

contract(
  "lets a workspace member move a booking within the master schedule and keeps its snapshot",
  async () => {
    if (!url || !publishableKey || !serviceRoleKey) return;
    const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
    const suffix = randomUUID();
    const workspaceId = randomUUID();
    const serviceIds = [randomUUID(), randomUUID()];
    const userIds: string[] = [];

    try {
      expect(
        (
          await admin.from("workspaces").insert({
            id: workspaceId,
            name: "Reschedule test",
            slug: `reschedule-${suffix}`,
            timezone: "Europe/Prague",
          })
        ).error,
      ).toBeNull();
      const owner = await createAuthenticatedTestUser({
        admin,
        email: `reschedule-owner-${suffix}@example.test`,
        password: `Test-${randomUUID()}-Aa1!`,
        publishableKey,
        url,
      });
      userIds.push(owner.user.id);
      const outsider = await createAuthenticatedTestUser({
        admin,
        email: `reschedule-outsider-${suffix}@example.test`,
        password: `Test-${randomUUID()}-Aa1!`,
        publishableKey,
        url,
      });
      userIds.push(outsider.user.id);
      expect(
        (
          await admin.from("workspace_members").insert({
            role: "owner",
            user_id: owner.user.id,
            workspace_id: workspaceId,
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("services").insert([
            {
              duration_minutes: 90,
              id: serviceIds[0],
              name: "Manicure",
              price_amount: 1200,
              workspace_id: workspaceId,
            },
            {
              duration_minutes: 60,
              id: serviceIds[1],
              name: "Pedicure",
              price_amount: 900,
              workspace_id: workspaceId,
            },
          ])
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("availability_rules").insert({
            day_of_week: 1,
            end_local_time: "14:00",
            start_local_time: "09:00",
            valid_from: workDate,
            workspace_id: workspaceId,
          })
        ).error,
      ).toBeNull();

      const booking = await owner.client.rpc(
        "create_master_booking_with_services",
        {
          p_idempotency_key: `reschedule-multi-${suffix}`,
          p_name: "Reschedule Customer",
          p_service_ids: serviceIds,
          p_starts_at: "2030-01-07T08:15:00.000Z",
          p_workspace_id: workspaceId,
        },
      );
      expect(booking.error).toBeNull();
      const appointmentId = (booking.data as { id: string }).id;
      const blocker = await owner.client.rpc(
        "create_master_booking_with_services",
        {
          p_idempotency_key: `reschedule-blocker-${suffix}`,
          p_name: "Blocking Customer",
          p_service_ids: [serviceIds[1]],
          p_starts_at: "2030-01-07T12:00:00.000Z",
          p_workspace_id: workspaceId,
        },
      );
      expect(blocker.error).toBeNull();

      // The booking's own time stays selectable; the blocked range does not.
      const slots = await owner.client.rpc("get_master_reschedule_slots", {
        p_appointment_id: appointmentId,
        p_date: workDate,
        p_workspace_id: workspaceId,
      });
      expect(slots.error).toBeNull();
      const starts = (slots.data ?? []).map((slot) =>
        new Date(slot.starts_at).toISOString(),
      );
      expect(starts).toContain("2030-01-07T08:15:00.000Z");
      expect(starts).toContain("2030-01-07T08:30:00.000Z");
      expect(starts).not.toContain("2030-01-07T10:00:00.000Z");

      const moved = await owner.client.rpc("reschedule_master_appointment", {
        p_appointment_id: appointmentId,
        p_starts_at: "2030-01-07T08:30:00.000Z",
        p_workspace_id: workspaceId,
      });
      expect(moved.error).toBeNull();
      expect(moved.data).toMatchObject({
        endsAt: "2030-01-07T11:00:00+00:00",
        id: appointmentId,
        startsAt: "2030-01-07T08:30:00+00:00",
        status: "confirmed",
      });

      const stored = await admin
        .from("appointments")
        .select("duration_minutes_snapshot, price_amount_snapshot, starts_at")
        .eq("id", appointmentId)
        .single();
      expect(stored.data).toMatchObject({
        duration_minutes_snapshot: 150,
        price_amount_snapshot: 2100,
        starts_at: "2030-01-07T08:30:00+00:00",
      });
      const events = await admin
        .from("appointment_events")
        .select("event_type")
        .eq("appointment_id", appointmentId)
        .eq("event_type", "rescheduled");
      expect(events.data).toHaveLength(1);

      const overlapping = await owner.client.rpc(
        "reschedule_master_appointment",
        {
          p_appointment_id: appointmentId,
          p_starts_at: "2030-01-07T10:00:00.000Z",
          p_workspace_id: workspaceId,
        },
      );
      expect(overlapping.error?.message).toContain(
        "Selected time is no longer available",
      );

      const foreign = await outsider.client.rpc(
        "reschedule_master_appointment",
        {
          p_appointment_id: appointmentId,
          p_starts_at: "2030-01-07T08:15:00.000Z",
          p_workspace_id: workspaceId,
        },
      );
      expect(foreign.error?.message).toContain("Workspace access denied");

      expect(
        (
          await admin
            .from("appointments")
            .update({ status: "cancelled_by_master" })
            .eq("id", appointmentId)
        ).error,
      ).toBeNull();
      const cancelled = await owner.client.rpc(
        "reschedule_master_appointment",
        {
          p_appointment_id: appointmentId,
          p_starts_at: "2030-01-07T08:15:00.000Z",
          p_workspace_id: workspaceId,
        },
      );
      expect(cancelled.error?.message).toContain(
        "Only pending or confirmed appointments can be rescheduled",
      );
    } finally {
      await admin.from("workspaces").delete().eq("id", workspaceId);
      for (const userId of userIds) await admin.auth.admin.deleteUser(userId);
    }
  },
  60_000,
);

contract("removes the legacy public-rule reschedule RPC", async () => {
  if (!url || !publishableKey) return;
  const response = await fetch(`${url}/rest/v1/rpc/reschedule_appointment`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_appointment_id: randomUUID(),
      p_starts_at: "2030-01-07T08:00:00Z",
    }),
  });
  expect(response.status).toBe(404);
});
