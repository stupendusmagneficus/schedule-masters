import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "./supabase.integration.helpers";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contract = url && publishableKey && serviceRoleKey ? it : it.skip;

describe("email queue health", () => {
  contract(
    "returns aggregate health only to the service role",
    async () => {
      if (!url || !publishableKey || !serviceRoleKey)
        throw new Error("Integration configuration required");
      const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
      const owner = await createAuthenticatedTestUser({
        admin,
        url,
        publishableKey,
        email: `health-${randomUUID()}@example.test`,
        password: `Test-${randomUUID()}!`,
      });
      const workspaceId = randomUUID(),
        customerId = randomUUID(),
        appointmentId = randomUUID();
      const rpc = async (key: string, bearer: string) =>
        fetch(`${url}/rest/v1/rpc/get_email_queue_health`, {
          method: "POST",
          headers: {
            apikey: key,
            authorization: `Bearer ${bearer}`,
            "content-type": "application/json",
          },
          body: "{}",
        });
      try {
        expect(
          (
            await admin.from("workspaces").insert({
              id: workspaceId,
              name: "Private fixture",
              slug: `health-${randomUUID()}`,
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.from("workspace_members").insert({
              workspace_id: workspaceId,
              user_id: owner.user.id,
              role: "owner",
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.from("customers").insert({
              id: customerId,
              workspace_id: workspaceId,
              name: "Private customer",
              email: "private@example.test",
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.from("appointments").insert({
              id: appointmentId,
              workspace_id: workspaceId,
              customer_id: customerId,
              service_name_snapshot: "Private service",
              duration_minutes_snapshot: 60,
              price_amount_snapshot: 100,
              currency_snapshot: "CZK",
              starts_at: "2030-01-07T09:00:00Z",
              ends_at: "2030-01-07T10:00:00Z",
              occupied_range: "empty",
              status: "confirmed",
              source: "master_created",
            })
          ).error,
        ).toBeNull();
        const past = new Date(Date.now() - 20 * 60_000).toISOString();
        const base = {
          workspace_id: workspaceId,
          appointment_id: appointmentId,
          recipient: "private@example.test",
          locale: "en",
          workspace_name: "Private fixture",
          service_name: "Private service",
          starts_at: "2030-01-07T09:00:00Z",
          timezone: "UTC",
          next_attempt_at: past,
          processing_at: null,
          finalized_at: null,
        };
        expect(
          (
            await admin.from("booking_decision_email_outbox").insert([
              {
                ...base,
                decision: "accepted",
                status: "pending",
                next_attempt_at: past,
              },
              {
                ...base,
                decision: "declined",
                status: "processing",
                processing_at: past,
              },
              {
                ...base,
                decision: "request_received",
                status: "failed",
                finalized_at: new Date().toISOString(),
              },
            ])
          ).error,
        ).toBeNull();
        const serviceResponse = await rpc(serviceRoleKey, serviceRoleKey);
        expect(serviceResponse.ok).toBe(true);
        const report = (await serviceResponse.json()) as Record<string, number>;
        expect(report.pending_count).toBeGreaterThanOrEqual(1);
        expect(report.oldest_pending_seconds).toBeGreaterThanOrEqual(1200);
        expect(report.stale_processing_count).toBeGreaterThanOrEqual(1);
        expect(report.failed_recent_count).toBeGreaterThanOrEqual(1);
        expect(JSON.stringify(report)).not.toMatch(
          /private|fixture|customer|service/i,
        );
        expect((await rpc(publishableKey, publishableKey)).ok).toBe(false);
        const session = await owner.client.auth.getSession();
        if (!session.data.session) throw new Error("Missing test session");
        expect(
          (await rpc(publishableKey, session.data.session.access_token)).ok,
        ).toBe(false);
      } finally {
        await admin.from("workspaces").delete().eq("id", workspaceId);
        await admin.auth.admin.deleteUser(owner.user.id);
      }
    },
    30000,
  );
});
