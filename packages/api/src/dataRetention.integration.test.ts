import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { createSupabaseAdminTestClient } from "./supabase.integration.helpers";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contract = url && publishableKey && serviceRoleKey ? it : it.skip;

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

contract(
  "removes expired operational records and keeps current ones",
  async () => {
    if (!url || !serviceRoleKey) return;
    const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
    const workspaceId = randomUUID();
    const appointmentId = randomUUID();
    const customerId = randomUUID();
    const startsAt = daysAgo(120);

    try {
      expect(
        (
          await admin.from("workspaces").insert({
            id: workspaceId,
            name: "Retention test",
            slug: `retention-${workspaceId}`,
            timezone: "Europe/Prague",
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("public_booking_requests").insert([
            {
              workspace_id: workspaceId,
              idempotency_key: "old-request",
              created_at: daysAgo(31),
            },
            {
              workspace_id: workspaceId,
              idempotency_key: "recent-request",
              created_at: daysAgo(1),
            },
          ])
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("customers").insert({
            id: customerId,
            name: "Retention customer",
            workspace_id: workspaceId,
          })
        ).error,
      ).toBeNull();
      const endsAt = new Date(
        new Date(startsAt).getTime() + 60 * 60 * 1000,
      ).toISOString();
      expect(
        (
          await admin.from("appointments").insert({
            customer_id: customerId,
            id: appointmentId,
            workspace_id: workspaceId,
            service_name_snapshot: "Retention service",
            duration_minutes_snapshot: 60,
            price_amount_snapshot: 100,
            currency_snapshot: "CZK",
            starts_at: startsAt,
            ends_at: endsAt,
            occupied_range: `[${startsAt},${endsAt})`,
            status: "completed",
            source: "master_created",
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("appointment_access_tokens").insert([
            {
              appointment_id: appointmentId,
              token_hash: `old-${randomUUID()}`,
              purpose: "manage",
              expires_at: daysAgo(91),
            },
            {
              appointment_id: appointmentId,
              token_hash: `recent-${randomUUID()}`,
              purpose: "manage",
              expires_at: daysAgo(10),
            },
          ])
        ).error,
      ).toBeNull();

      const retention = await admin.rpc("run_data_retention");
      expect(retention.error).toBeNull();
      expect(retention.data).toMatchObject({
        appointmentAccessTokens: expect.any(Number),
        bookingRequests: expect.any(Number),
      });

      const requests = await admin
        .from("public_booking_requests")
        .select("idempotency_key")
        .eq("workspace_id", workspaceId);
      expect(requests.data?.map((row) => row.idempotency_key)).toEqual([
        "recent-request",
      ]);
      const tokens = await admin
        .from("appointment_access_tokens")
        .select("token_hash")
        .eq("appointment_id", appointmentId);
      expect(tokens.data).toHaveLength(1);
      expect(tokens.data?.[0]?.token_hash).toMatch(/^recent-/);
      const appointment = await admin
        .from("appointments")
        .select("id")
        .eq("id", appointmentId);
      expect(appointment.data).toHaveLength(1);
    } finally {
      await admin.from("workspaces").delete().eq("id", workspaceId);
    }
  },
  30_000,
);

contract("does not let clients trigger retention", async () => {
  if (!url || !publishableKey) return;
  const response = await fetch(`${url}/rest/v1/rpc/run_data_retention`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  expect([401, 403]).toContain(response.status);
});
