import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { createSupabaseClient } from "./supabase/client";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "./supabase.integration.helpers";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contract = url && publishableKey && serviceRoleKey ? it : it.skip;

type Fixture = {
  admin: ReturnType<typeof createSupabaseAdminTestClient>;
  owner: Awaited<ReturnType<typeof createAuthenticatedTestUser>>;
  serviceId: string;
  workspaceId: string;
};

async function withWorkspace(
  label: string,
  run: (fixture: Fixture) => Promise<void>,
) {
  if (!url || !publishableKey || !serviceRoleKey) return;
  const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
  const suffix = randomUUID();
  const workspaceId = randomUUID();
  const serviceId = randomUUID();
  let ownerId: string | undefined;
  try {
    expect(
      (
        await admin.from("workspaces").insert({
          id: workspaceId,
          name: `${label} test`,
          slug: `${label}-${suffix}`,
          timezone: "Europe/Prague",
        })
      ).error,
    ).toBeNull();
    const owner = await createAuthenticatedTestUser({
      admin,
      email: `${label}-${suffix}@example.test`,
      password: `Test-${randomUUID()}-Aa1!`,
      publishableKey,
      url,
    });
    ownerId = owner.user.id;
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
        await admin.from("services").insert({
          duration_minutes: 60,
          id: serviceId,
          name: `${label} service`,
          price_amount: 700,
          workspace_id: workspaceId,
        })
      ).error,
    ).toBeNull();
    await run({ admin, owner, serviceId, workspaceId });
  } finally {
    await admin.from("workspaces").delete().eq("id", workspaceId);
    if (ownerId) await admin.auth.admin.deleteUser(ownerId);
  }
}

contract(
  "rejects customer link actions once the appointment has started",
  () =>
    withWorkspace("started-link", async ({ admin, serviceId, workspaceId }) => {
      if (!url || !publishableKey) return;
      const startsAt = new Date(Date.now() - 30 * 60_000);
      const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
      const customer = await admin
        .from("customers")
        .insert({ name: "Started customer", workspace_id: workspaceId })
        .select("id")
        .single();
      if (!customer.data) throw new Error("Customer was not created");
      const appointment = await admin
        .from("appointments")
        .insert({
          currency_snapshot: "CZK",
          customer_id: customer.data.id,
          duration_minutes_snapshot: 60,
          ends_at: endsAt.toISOString(),
          occupied_range: `[${startsAt.toISOString()},${endsAt.toISOString()})`,
          price_amount_snapshot: 700,
          service_id: serviceId,
          service_name_snapshot: "Started service",
          source: "master_created",
          starts_at: startsAt.toISOString(),
          status: "pending",
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
      expect(appointment.error).toBeNull();
      if (!appointment.data) throw new Error("Appointment was not created");
      const token = randomBytes(64).toString("hex");
      expect(
        (
          await admin.from("appointment_access_tokens").insert({
            appointment_id: appointment.data.id,
            expires_at: new Date(Date.now() + 86_400_000).toISOString(),
            purpose: "manage",
            token_hash: createHash("sha256").update(token).digest("hex"),
          })
        ).error,
      ).toBeNull();
      const anonymous = createSupabaseClient({ url, publishableKey });

      const details = await anonymous.rpc("get_customer_appointment", {
        p_token: token,
      });
      expect(details.error).toBeNull();
      expect(details.data).toMatchObject({
        canCancel: false,
        canConfirm: false,
        status: "pending",
      });

      for (const action of ["confirm", "cancel"]) {
        const result = await anonymous.rpc("update_customer_appointment", {
          p_action: action,
          p_token: token,
        });
        expect(result.error?.message).toContain("already started");
      }
      const stored = await admin
        .from("appointments")
        .select("status")
        .eq("id", appointment.data.id)
        .single();
      expect(stored.data?.status).toBe("pending");
    }),
  60_000,
);

contract(
  "keeps the stored name when a manual booking reuses a known customer",
  () =>
    withWorkspace(
      "reuse-name",
      async ({ admin, owner, serviceId, workspaceId }) => {
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
        const customer = await admin
          .from("customers")
          .insert({
            name: "Jana Novakova",
            normalized_phone: "+420777123042",
            phone: "+420777123042",
            workspace_id: workspaceId,
          })
          .select("id")
          .single();
        expect(customer.error).toBeNull();
        const slots = await owner.client.rpc("get_master_available_slots", {
          p_date: "2030-01-03",
          p_service_id: serviceId,
          p_workspace_id: workspaceId,
        });
        const startsAt = slots.data?.[0]?.starts_at;
        if (!startsAt) throw new Error("No slot available");

        const booking = await owner.client.rpc("create_master_booking", {
          p_idempotency_key: `reuse-${randomUUID()}`,
          p_name: "Petr Novak",
          p_phone: "+420777123042",
          p_service_id: serviceId,
          p_starts_at: startsAt,
          p_workspace_id: workspaceId,
        });
        expect(booking.error).toBeNull();

        const stored = await admin
          .from("customers")
          .select("id, name")
          .eq("workspace_id", workspaceId);
        expect(stored.data).toEqual([
          { id: customer.data?.id, name: "Jana Novakova" },
        ]);
      },
    ),
  60_000,
);

contract(
  "matches phone digits regardless of spacing and treats % and _ literally",
  () =>
    withWorkspace("search", async ({ admin, owner, workspaceId }) => {
      expect(
        (
          await admin.from("customers").insert([
            {
              name: "Spaced Phone",
              phone: "+420 777 123 042",
              workspace_id: workspaceId,
            },
            { name: "Discount 100% club", workspace_id: workspaceId },
            { name: "Discount 1000 club", workspace_id: workspaceId },
            { name: "Under_score", workspace_id: workspaceId },
            { name: "Underxscore", workspace_id: workspaceId },
          ])
        ).error,
      ).toBeNull();

      for (const rpc of [
        "list_master_customer_directory",
        "list_master_customers",
      ] as const) {
        const search = async (term: string) => {
          const result = await owner.client.rpc(rpc, {
            p_search: term,
            p_workspace_id: workspaceId,
          });
          expect(result.error).toBeNull();
          return result.data?.map((row) => row.name).sort();
        };
        expect(await search("777123042")).toEqual(["Spaced Phone"]);
        expect(await search("+420777 123042")).toEqual(["Spaced Phone"]);
        expect(await search("100%")).toEqual(["Discount 100% club"]);
        expect(await search("under_")).toEqual(["Under_score"]);
        expect(await search("spaced")).toEqual(["Spaced Phone"]);
      }
    }),
  60_000,
);

contract(
  "rejects an unknown workspace timezone written directly by a member",
  () =>
    withWorkspace("timezone", async ({ admin, owner, workspaceId }) => {
      const invalid = await owner.client
        .from("workspaces")
        .update({ timezone: "Mars/Base" })
        .eq("id", workspaceId)
        .select("id");
      expect(invalid.error?.message).toContain("Invalid workspace timezone");

      const valid = await owner.client
        .from("workspaces")
        .update({ timezone: "Europe/Bratislava" })
        .eq("id", workspaceId)
        .select("timezone")
        .single();
      expect(valid.error).toBeNull();
      expect(valid.data?.timezone).toBe("Europe/Bratislava");

      const stored = await admin
        .from("workspaces")
        .select("timezone")
        .eq("id", workspaceId)
        .single();
      expect(stored.data?.timezone).toBe("Europe/Bratislava");
    }),
  60_000,
);

contract(
  "anonymization also erases unlinked wait-list entries with the same contacts",
  () =>
    withWorkspace(
      "anonymize-wl",
      async ({ admin, owner, serviceId, workspaceId }) => {
        const customer = await admin
          .from("customers")
          .insert({
            email: "anna@example.test",
            name: "Anna Customer",
            normalized_email: "anna@example.test",
            normalized_phone: "+420111222333",
            phone: "+420111222333",
            workspace_id: workspaceId,
          })
          .select("id")
          .single();
        if (!customer.data) throw new Error("Customer was not created");
        const entries = [
          {
            customer_email: " ANNA@example.test ",
            customer_name: "Anna by email",
          },
          {
            customer_name: "Anna by phone",
            customer_phone: "+420 111 222 333",
          },
          {
            customer_email: "someone@example.test",
            customer_name: "Someone else",
          },
        ].map((entry) => ({
          ...entry,
          desired_date: "2030-04-04",
          service_id: serviceId,
          workspace_id: workspaceId,
        }));
        expect(
          (await admin.from("waiting_list_entries").insert(entries)).error,
        ).toBeNull();

        const anonymize = await owner.client.rpc("anonymize_master_customer", {
          p_customer_id: customer.data.id,
          p_workspace_id: workspaceId,
        });
        expect(anonymize.error).toBeNull();

        const remaining = await admin
          .from("waiting_list_entries")
          .select("customer_name")
          .eq("workspace_id", workspaceId);
        expect(remaining.data).toEqual([{ customer_name: "Someone else" }]);
      },
    ),
  60_000,
);
