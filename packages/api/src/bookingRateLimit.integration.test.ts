import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { createSupabaseAdminTestClient } from "./supabase.integration.helpers";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contract = url && publishableKey && serviceRoleKey ? it : it.skip;

contract(
  "both public booking HTTP routes share the IP budget, including idempotent retries",
  async () => {
    if (!url || !publishableKey || !serviceRoleKey) return;
    const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
    const workspaceId = randomUUID();
    const suffix = randomUUID();
    const slug = `rate-${suffix}`;
    const ip = `2001:db8:${suffix.slice(0, 4)}:${suffix.slice(4, 8)}::1`;
    const headers = {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    };
    try {
      expect(
        (
          await admin.from("workspaces").insert({
            id: workspaceId,
            name: "Rate guard test",
            slug,
            timezone: "Europe/Prague",
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin
            .from("booking_links")
            .insert({ workspace_id: workspaceId, slug })
        ).error,
      ).toBeNull();
      const service = await admin
        .from("services")
        .insert({
          name: "Service",
          duration_minutes: 30,
          price_amount: 250,
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
      expect(service.error).toBeNull();
      if (!service.data) throw new Error("Test service missing");
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
        p_name: "Test customer",
        p_email: "rate-test@example.test",
        p_phone: null,
        p_locale: "en",
      };
      const single = {
        ...common,
        p_service_id: service.data.id,
        p_starts_at: "2030-01-07T09:00:00Z",
        p_idempotency_key: randomUUID(),
      };
      const multi = {
        ...common,
        p_service_ids: [service.data.id],
        p_starts_at: "2030-01-07T11:00:00Z",
        p_idempotency_key: randomUUID(),
      };
      const post = (rpc: string, payload: unknown) =>
        fetch(`${url}/rest/v1/rpc/${rpc}`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      for (let attempt = 0; attempt < 15; attempt++) {
        expect((await post("create_public_booking", single)).status).toBe(200);
        expect(
          (await post("create_public_booking_with_services", multi)).status,
        ).toBe(200);
      }
      for (const [rpc, payload] of [
        ["create_public_booking", single],
        ["create_public_booking_with_services", multi],
      ] as const) {
        const limited = await post(rpc, payload);
        expect(limited.status).toBe(429);
        expect(await limited.json()).toMatchObject({
          code: "PUBLIC_BOOKING_RATE_LIMIT",
        });
      }
      const context = await post("get_public_booking_context", {
        p_slug: slug,
      });
      expect(context.status).toBe(200);
      const appointments = await admin
        .from("appointments")
        .select("id")
        .eq("workspace_id", workspaceId);
      expect(appointments.error).toBeNull();
      expect(appointments.data).toHaveLength(2);
    } finally {
      await admin.from("workspaces").delete().eq("id", workspaceId);
    }
  },
  30_000,
);
