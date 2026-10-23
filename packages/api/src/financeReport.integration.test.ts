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
type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];

function appointment(
  workspaceId: string,
  customerId: string,
  startsAt: string,
  status: AppointmentInsert["status"],
  overrides: Partial<AppointmentInsert> = {},
): AppointmentInsert {
  return {
    workspace_id: workspaceId,
    customer_id: customerId,
    service_name_snapshot: "Fixture service",
    duration_minutes_snapshot: 60,
    price_amount_snapshot: 100,
    paid_amount: 0,
    currency_snapshot: "CZK",
    starts_at: startsAt,
    ends_at: new Date(new Date(startsAt).getTime() + 3_600_000).toISOString(),
    occupied_range: "empty",
    status,
    source: "master_created",
    ...overrides,
  };
}

describe("master finance range report", () => {
  contract(
    "aggregates arbitrary local-date ranges without PII or tenant leakage",
    async () => {
      if (!url || !publishableKey || !serviceRoleKey)
        throw new Error("Integration configuration required");
      const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
      const anonymous = createSupabaseClient({ url, publishableKey });
      const owner = await createAuthenticatedTestUser({
        admin,
        url,
        publishableKey,
        email: `finance-${randomUUID()}@example.test`,
        password: `Test-${randomUUID()}!`,
      });
      const workspaceId = randomUUID();
      const previousCustomerId = randomUUID();
      const newCustomerId = randomUUID();
      const now = "2030-01-20T00:00:00Z";
      const report = (from: string, to: string) =>
        owner.client.rpc("get_master_finance_report", {
          p_workspace_id: workspaceId,
          p_from_date: from,
          p_to_date: to,
          p_as_of: now,
        });
      try {
        expect(
          (
            await admin.from("workspaces").insert({
              id: workspaceId,
              name: "Finance private fixture",
              slug: `finance-${randomUUID()}`,
              timezone: "Europe/Prague",
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
            await admin.from("customers").insert([
              {
                id: previousCustomerId,
                workspace_id: workspaceId,
                name: "Never expose this name",
                email: "finance-private@example.test",
              },
              {
                id: newCustomerId,
                workspace_id: workspaceId,
                name: "Also private",
              },
            ])
          ).error,
        ).toBeNull();
        const rows: AppointmentInsert[] = [
          appointment(
            workspaceId,
            previousCustomerId,
            "2029-12-28T09:00:00Z",
            "completed",
            { paid_amount: 10 },
          ),
          appointment(
            workspaceId,
            previousCustomerId,
            "2030-01-10T09:00:00Z",
            "completed",
            {
              paid_amount: 30,
              currency_snapshot: "EUR",
              master_note: "Private visit note",
            },
          ),
          appointment(
            workspaceId,
            newCustomerId,
            "2030-01-12T09:00:00Z",
            "completed",
            { paid_amount: 75, duration_minutes_snapshot: 90 },
          ),
          appointment(
            workspaceId,
            newCustomerId,
            "2030-01-31T23:30:00Z",
            "completed",
            { paid_amount: 25 },
          ),
          appointment(
            workspaceId,
            newCustomerId,
            "2030-02-03T09:00:00Z",
            "confirmed",
            { price_amount_snapshot: 200 },
          ),
          appointment(
            workspaceId,
            newCustomerId,
            "2030-01-15T09:00:00Z",
            "cancelled_by_master",
          ),
          appointment(
            workspaceId,
            newCustomerId,
            "2030-01-16T09:00:00Z",
            "no_show",
          ),
          appointment(
            workspaceId,
            newCustomerId,
            "2030-01-05T09:00:00Z",
            "pending",
          ),
        ];
        expect(
          (await admin.from("appointments").insert(rows)).error,
        ).toBeNull();

        const january = await report("2030-01-01", "2030-01-31");
        expect(january.error).toBeNull();
        expect(january.data).toMatchObject({
          appointmentCount: 5,
          bookedMinutes: 150,
          canceledCount: 1,
          completedCount: 2,
          expectedByCurrency: {},
          newCustomerCount: 1,
          noShowCount: 1,
          paidByCurrency: { CZK: 75, EUR: 30 },
          returningCustomerCount: 1,
          upcomingCount: 0,
        });
        expect(JSON.stringify(january.data)).not.toMatch(
          /Never expose|Private visit note|finance-private@example/,
        );

        const multiMonth = await report("2030-01-01", "2030-02-10");
        expect(multiMonth.error).toBeNull();
        expect(multiMonth.data).toMatchObject({
          appointmentCount: 7,
          bookedMinutes: 270,
          completedCount: 3,
          expectedByCurrency: { CZK: 200 },
          newCustomerCount: 1,
          paidByCurrency: { CZK: 100, EUR: 30 },
          returningCustomerCount: 1,
          upcomingCount: 1,
        });
        expect(multiMonth.data).toEqual(
          expect.objectContaining({
            weeklyPaid: expect.arrayContaining([
              { amount: 30, currency: "EUR", weekIndex: 1 },
              { amount: 25, currency: "CZK", weekIndex: 4 },
            ]),
          }),
        );
        const february = await report("2030-02-01", "2030-02-10");
        expect(february.error).toBeNull();
        expect(february.data).toMatchObject({
          appointmentCount: 2,
          completedCount: 1,
          newCustomerCount: 0,
          paidByCurrency: { CZK: 25 },
          returningCustomerCount: 1,
        });
        expect((await report("2030-02-10", "2030-02-01")).error).not.toBeNull();
        expect(
          (
            await owner.client.rpc("get_master_finance_report", {
              p_workspace_id: randomUUID(),
              p_from_date: "2030-01-01",
              p_to_date: "2030-01-31",
            })
          ).error,
        ).not.toBeNull();
        expect(
          (
            await anonymous.rpc("get_master_finance_report", {
              p_workspace_id: workspaceId,
              p_from_date: "2030-01-01",
              p_to_date: "2030-01-31",
            })
          ).error,
        ).not.toBeNull();
      } finally {
        await admin.from("workspaces").delete().eq("id", workspaceId);
        await admin.auth.admin.deleteUser(owner.user.id);
      }
    },
  );

  contract(
    "counts more than the PostgREST 1,000-row response limit",
    async () => {
      if (!url || !publishableKey || !serviceRoleKey)
        throw new Error("Integration configuration required");
      const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
      const owner = await createAuthenticatedTestUser({
        admin,
        url,
        publishableKey,
        email: `finance-large-${randomUUID()}@example.test`,
        password: `Test-${randomUUID()}!`,
      });
      const workspaceId = randomUUID();
      const customerId = randomUUID();
      try {
        expect(
          (
            await admin.from("workspaces").insert({
              id: workspaceId,
              name: "Finance volume fixture",
              slug: `finance-volume-${randomUUID()}`,
              timezone: "UTC",
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
              name: "Large fixture",
            })
          ).error,
        ).toBeNull();
        const base = Date.parse("2031-05-01T09:00:00Z");
        for (let offset = 0; offset < 1001; offset += 200) {
          const batch = Array.from(
            { length: Math.min(200, 1001 - offset) },
            (_, index) =>
              appointment(
                workspaceId,
                customerId,
                new Date(base + (offset + index) * 1000).toISOString(),
                "completed",
                { paid_amount: 1 },
              ),
          );
          expect(
            (await admin.from("appointments").insert(batch)).error,
          ).toBeNull();
        }
        const result = await owner.client.rpc("get_master_finance_report", {
          p_workspace_id: workspaceId,
          p_from_date: "2031-05-01",
          p_to_date: "2031-05-01",
        });
        expect(result.error).toBeNull();
        expect(result.data).toMatchObject({
          appointmentCount: 1001,
          completedCount: 1001,
          paidByCurrency: { CZK: 1001 },
        });
      } finally {
        await admin.from("workspaces").delete().eq("id", workspaceId);
        await admin.auth.admin.deleteUser(owner.user.id);
      }
    },
  );
});
