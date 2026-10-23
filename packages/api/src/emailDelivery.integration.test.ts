import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSupabaseClient } from "./supabase/client";
import type { Database } from "./supabase/database.types";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "./supabase.integration.helpers";

const url = process.env.SUPABASE_URL,
  publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contract = url && publishableKey && serviceRoleKey ? it : it.skip;
describe("email delivery callbacks", () => {
  contract(
    "correlates early webhooks, deduplicates, resists reordered events and cannot recreate erased data",
    async () => {
      if (!url || !publishableKey || !serviceRoleKey)
        throw new Error("Integration configuration required");
      const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
      const anonymous = createSupabaseClient({ url, publishableKey });
      const owner = await createAuthenticatedTestUser({
        admin,
        url,
        publishableKey,
        email: `delivery-${randomUUID()}@example.test`,
        password: `Test-${randomUUID()}!`,
      });
      const workspaceId = randomUUID(),
        customerId = randomUUID(),
        appointmentId = randomUUID(),
        jobId = randomUUID(),
        messageId = randomUUID();
      try {
        expect(
          (
            await admin.from("workspaces").insert({
              id: workspaceId,
              name: "Delivery fixture",
              slug: `delivery-${randomUUID()}`,
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
              name: "Client",
              email: "fixture@example.test",
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.from("appointments").insert({
              id: appointmentId,
              workspace_id: workspaceId,
              customer_id: customerId,
              service_name_snapshot: "Fixture",
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
        expect(
          (
            await admin.from("booking_decision_email_outbox").insert({
              id: jobId,
              workspace_id: workspaceId,
              appointment_id: appointmentId,
              decision: "accepted",
              recipient: "fixture@example.test",
              locale: "en",
              workspace_name: "Fixture",
              service_name: "Fixture",
              starts_at: "2030-01-07T09:00:00Z",
              timezone: "Europe/Prague",
              status: "processing",
              attempts: 1,
              first_prepared_at: new Date().toISOString(),
            })
          ).error,
        ).toBeNull();
        const time = new Date().toISOString();
        const payload = {
          p_event_id: `msg_${randomUUID()}`,
          p_message_id: messageId,
          p_outbox_id: jobId,
          p_event_type: "email.delivered",
          p_occurred_at: time,
        };
        const record = (
          args: Database["public"]["Functions"]["record_booking_email_webhook"]["Args"],
        ) => admin.rpc("record_booking_email_webhook", args);
        const first = await record(payload);
        expect(first.error).toBeNull();
        expect(first.data).toBe("applied");
        expect(
          (
            await admin
              .from("booking_decision_email_outbox")
              .select("status,provider_message_id")
              .eq("id", jobId)
              .single()
          ).data,
        ).toMatchObject({
          status: "accepted_by_provider",
          provider_message_id: messageId,
        });
        expect((await record(payload)).data).toBe("duplicate");
        expect(
          (
            await admin.rpc("finish_booking_email_delivery", {
              p_id: jobId,
              p_attempt: 1,
              p_success: false,
              p_retryable: true,
              p_error: "provider_unavailable",
            })
          ).data,
        ).toBe("accepted_by_provider");
        expect(
          (
            await record({
              ...payload,
              p_event_id: `msg_${randomUUID()}`,
              p_event_type: "email.delivery_delayed",
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.rpc("finish_booking_email_delivery", {
              p_id: jobId,
              p_attempt: 1,
              p_success: true,
              p_provider_message_id: messageId,
            })
          ).error,
        ).toBeNull();
        const statuses = await owner.client.rpc(
          "list_master_appointment_emails",
          { p_workspace_id: workspaceId, p_appointment_id: appointmentId },
        );
        expect(statuses.error).toBeNull();
        expect(statuses.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ state: "delivered" }),
          ]),
        );
        expect(JSON.stringify(statuses.data)).not.toContain(
          "fixture@example.test",
        );
        const retryId = randomUUID();
        expect(
          (
            await admin.from("booking_decision_email_outbox").insert({
              id: retryId,
              workspace_id: workspaceId,
              appointment_id: appointmentId,
              decision: "declined",
              recipient: "fixture@example.test",
              locale: "en",
              workspace_name: "Fixture",
              service_name: "Fixture",
              starts_at: "2030-01-07T09:00:00Z",
              timezone: "Europe/Prague",
              status: "processing",
              attempts: 1,
              first_prepared_at: time,
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.rpc("finish_booking_email_delivery", {
              p_id: retryId,
              p_attempt: 2,
              p_success: false,
              p_retryable: true,
              p_error: "provider_unavailable",
            })
          ).data,
        ).toBe("stale_claim");
        expect(
          (
            await admin.rpc("finish_booking_email_delivery", {
              p_id: retryId,
              p_attempt: 1,
              p_success: false,
              p_retryable: true,
              p_error: "provider_unavailable",
            })
          ).data,
        ).toBe("pending");
        expect(
          (
            await admin
              .from("booking_decision_email_outbox")
              .update({ status: "processing", attempts: 5 })
              .eq("id", retryId)
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.rpc("finish_booking_email_delivery", {
              p_id: retryId,
              p_attempt: 5,
              p_success: false,
              p_retryable: true,
              p_error: "provider_unavailable",
            })
          ).data,
        ).toBe("failed");
        expect(
          (
            await record({
              ...payload,
              p_event_id: `msg_${randomUUID()}`,
              p_event_type: "email.bounced",
            })
          ).error,
        ).toBeNull();
        expect(
          (await record({ ...payload, p_event_id: `msg_${randomUUID()}` }))
            .error,
        ).toBeNull();
        expect(
          (
            await admin
              .from("booking_decision_email_outbox")
              .select("delivery_status")
              .eq("id", jobId)
              .single()
          ).data,
        ).toMatchObject({ delivery_status: "bounced" });
        expect(
          (await anonymous.rpc("record_booking_email_webhook", payload)).error,
        ).not.toBeNull();
        expect(
          (await owner.client.rpc("record_booking_email_webhook", payload))
            .error,
        ).not.toBeNull();
        expect(
          (
            await anonymous.rpc("list_master_appointment_emails", {
              p_workspace_id: workspaceId,
              p_appointment_id: appointmentId,
            })
          ).error,
        ).not.toBeNull();
        expect(
          (
            await owner.client.rpc("list_master_appointment_emails", {
              p_workspace_id: randomUUID(),
              p_appointment_id: appointmentId,
            })
          ).error,
        ).not.toBeNull();
        expect(
          (
            await record({
              ...payload,
              p_event_id: `msg_${randomUUID()}`,
              p_message_id: randomUUID(),
            })
          ).data,
        ).toBe("ignored");
        expect(
          (
            await owner.client.rpc("anonymize_master_customer", {
              p_workspace_id: workspaceId,
              p_customer_id: customerId,
            })
          ).error,
        ).toBeNull();
        expect(
          (await record({ ...payload, p_event_id: `msg_${randomUUID()}` }))
            .data,
        ).toBe("ignored");
        expect(
          (
            await admin
              .from("booking_decision_email_outbox")
              .select("id")
              .eq("id", jobId)
          ).data,
        ).toEqual([]);
      } finally {
        await admin.from("workspaces").delete().eq("id", workspaceId);
        await admin.auth.admin.deleteUser(owner.user.id);
      }
    },
    30000,
  );
});
