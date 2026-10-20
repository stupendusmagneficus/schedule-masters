import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSupabaseClient } from "./supabase/client";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "./supabase.integration.helpers";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contract = url && publishableKey && serviceRoleKey ? it : it.skip;

describe("public booking preserves all supported customer locales", () => {
  for (const locale of ["en", "cz", "sk", "ru", "uk"] as const) {
    contract(
      `${locale}: single/multi-service requests and both decisions retain their locale`,
      async () => {
        if (!url || !publishableKey || !serviceRoleKey) return;
        const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
        const anonymous = createSupabaseClient({ url, publishableKey });
        const workspaceId = randomUUID();
        const slug = `locale-${randomUUID()}`;
        let userId: string | undefined;
        try {
          expect(
            (
              await admin.from("workspaces").insert({
                id: workspaceId,
                name: "Locale test",
                slug,
                timezone: "Europe/Prague",
              })
            ).error,
          ).toBeNull();
          expect(
            (
              await admin
                .from("booking_links")
                .insert({ slug, workspace_id: workspaceId })
            ).error,
          ).toBeNull();
          const user = await createAuthenticatedTestUser({
            admin,
            email: `${slug}@example.test`,
            password: `Test-${slug}!`,
            publishableKey,
            url,
          });
          userId = user.user.id;
          expect(
            (
              await admin.from("workspace_members").insert({
                workspace_id: workspaceId,
                user_id: userId,
                role: "owner",
              })
            ).error,
          ).toBeNull();
          const services = await admin
            .from("services")
            .insert(
              ["First", "Second"].map((name) => ({
                name,
                workspace_id: workspaceId,
                duration_minutes: 30,
                price_amount: 250,
              })),
            )
            .select("id");
          expect(services.error).toBeNull();
          const ids = services.data?.map((service) => service.id);
          if (ids?.length !== 2) throw new Error("Test services missing");
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
          const common = {
            p_slug: slug,
            p_name: "Locale customer",
            p_email: `${slug}-client@example.test`,
            p_phone: "+420777123456",
            p_locale: locale,
          };
          const single = await anonymous.rpc("create_public_booking", {
            ...common,
            p_service_id: ids[0],
            p_starts_at: "2030-01-07T09:00:00Z",
            p_idempotency_key: randomUUID(),
          });
          expect(single.error, JSON.stringify(single.error)).toBeNull();
          const multiple = await anonymous.rpc(
            "create_public_booking_with_services",
            {
              ...common,
              p_service_ids: ids,
              p_starts_at: "2030-01-07T11:00:00Z",
              p_idempotency_key: randomUUID(),
            },
          );
          expect(multiple.error, JSON.stringify(multiple.error)).toBeNull();
          const singleId = (single.data as { id: string }).id;
          const multiId = (multiple.data as { id: string }).id;
          const pending = await user.client.rpc(
            "list_master_pending_booking_requests",
            { p_workspace_id: workspaceId },
          );
          expect(pending.error).toBeNull();
          expect(pending.data?.map((request) => request.id).sort()).toEqual(
            [singleId, multiId].sort(),
          );
          const saved = await admin
            .from("appointments")
            .select("customer_locale")
            .in("id", [singleId, multiId]);
          expect(saved.error).toBeNull();
          expect(saved.data).toEqual([
            { customer_locale: locale },
            { customer_locale: locale },
          ]);
          expect(
            (
              await user.client.rpc("set_appointment_status", {
                p_appointment_id: singleId,
                p_status: "confirmed",
              })
            ).error,
          ).toBeNull();
          expect(
            (
              await user.client.rpc("set_appointment_status", {
                p_appointment_id: multiId,
                p_status: "cancelled_by_master",
              })
            ).error,
          ).toBeNull();
          const outbox = await admin
            .from("booking_decision_email_outbox")
            .select("appointment_id, decision, locale")
            .eq("workspace_id", workspaceId);
          expect(outbox.error).toBeNull();
          expect(outbox.data).toEqual(
            expect.arrayContaining([
              { appointment_id: singleId, decision: "accepted", locale },
              { appointment_id: multiId, decision: "declined", locale },
            ]),
          );
          expect(outbox.data).toHaveLength(2);
          for (const rpc of [
            "create_public_booking",
            "create_public_booking_with_services",
          ] as const) {
            const invalid = await anonymous.rpc(rpc, {
              ...common,
              ...(rpc === "create_public_booking"
                ? { p_service_id: ids[0] }
                : { p_service_ids: ids }),
              p_starts_at: "2030-01-07T13:00:00Z",
              p_idempotency_key: randomUUID(),
              p_locale: "de",
            });
            // Send each RPC's exact signature, so errors must concern locale rather than function lookup.
            expect(invalid.error?.message).toContain(
              "Unsupported booking locale",
            );
          }
        } finally {
          await admin.from("workspaces").delete().eq("id", workspaceId);
          if (userId) await admin.auth.admin.deleteUser(userId);
          await anonymous.removeAllChannels();
        }
      },
      30_000,
    );
  }
});
