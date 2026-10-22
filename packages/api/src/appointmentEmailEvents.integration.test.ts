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

async function fixture() {
  if (!url || !publishableKey || !serviceRoleKey)
    throw new Error("Local integration configuration required");
  const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
  const anonymous = createSupabaseClient({ url, publishableKey });
  const workspaceId = randomUUID();
  const slug = `email-${randomUUID()}`;
  const owner = await createAuthenticatedTestUser({
    admin,
    url,
    publishableKey,
    email: `${slug}@example.test`,
    password: `Test-${slug}!`,
  });
  const customerEmail = `${slug}-customer@example.test`;
  expect(
    (
      await admin.from("workspaces").insert({
        id: workspaceId,
        slug,
        name: "Email studio",
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
      await admin
        .from("booking_links")
        .insert({ workspace_id: workspaceId, slug })
    ).error,
  ).toBeNull();
  const services = await admin
    .from("services")
    .insert(
      ["Manicure", "Pedicure"].map((name) => ({
        workspace_id: workspaceId,
        name,
        duration_minutes: 30,
        price_amount: 250,
      })),
    )
    .select("id");
  expect(services.error).toBeNull();
  const serviceIds = services.data?.map((s) => s.id) ?? [];
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
  async function publicBooking() {
    const input = {
      p_slug: slug,
      p_service_ids: serviceIds,
      p_name: "Customer",
      p_email: customerEmail,
      p_phone: "+420777123456",
      p_starts_at: "2030-01-07T09:00:00Z",
      p_idempotency_key: randomUUID(),
      p_locale: "uk",
    };
    const result = await anonymous.rpc(
      "create_public_booking_with_services",
      input,
    );
    expect(result.error).toBeNull();
    const id = (result.data as { id: string }).id;
    expect(
      (await anonymous.rpc("create_public_booking_with_services", input)).data,
    ).toEqual(result.data);
    return id;
  }
  async function rows() {
    const result = await admin
      .from("booking_decision_email_outbox")
      .select("*")
      .eq("workspace_id", workspaceId);
    expect(result.error).toBeNull();
    return result.data ?? [];
  }
  async function claim() {
    const result = await admin.rpc(
      "claim_booking_decision_emails_for_delivery",
      { p_recipient_allowlist: [customerEmail, owner.user.email as string] },
    );
    expect(result.error).toBeNull();
    return result.data ?? [];
  }
  async function manualBooking(
    start = "2030-01-07T11:00:00Z",
    email: string | null = customerEmail,
  ) {
    const result = await owner.client.rpc(
      "create_master_booking_with_services",
      {
        p_workspace_id: workspaceId,
        p_service_ids: serviceIds,
        p_starts_at: start,
        p_idempotency_key: randomUUID(),
        p_name: "Manual customer",
        p_email: email ?? undefined,
      },
    );
    expect(result.error).toBeNull();
    return (result.data as { id: string }).id;
  }
  async function consent(id: string) {
    const result = await owner.client.rpc("create_customer_appointment_link", {
      p_appointment_id: id,
      p_customer_consent_confirmed: true,
    });
    expect(result.error).toBeNull();
    return result.data as { token: string };
  }
  async function cleanup() {
    await admin.from("workspaces").delete().eq("id", workspaceId);
    await admin.auth.admin.deleteUser(owner.user.id);
  }
  return {
    admin,
    anonymous,
    owner,
    workspaceId,
    customerEmail,
    serviceIds,
    publicBooking,
    manualBooking,
    consent,
    rows,
    claim,
    cleanup,
  };
}

describe("transactional appointment emails", () => {
  contract(
    "queues request/owner notices once and suppresses them after a decision; suppresses accepted mail after cancellation",
    async () => {
      const f = await fixture();
      try {
        const id = await f.publicBooking();
        const initial = await f.rows();
        expect(initial.map((r) => r.decision).sort()).toEqual([
          "master_request_received",
          "request_received",
        ]);
        expect(
          initial.find((r) => r.decision === "request_received")?.locale,
        ).toBe("uk");
        expect(
          initial.every((r) => r.service_name === "Manicure + Pedicure"),
        ).toBe(true);
        const claims = await f.claim();
        expect(claims).toHaveLength(2);
        for (const job of claims) {
          const ready = await f.admin.rpc("prepare_booking_email_delivery", {
            p_id: job.id,
          });
          expect(ready.error).toBeNull();
          expect(ready.data).toMatchObject({
            deliver: true,
            manageToken: null,
          });
        }
        expect(
          (
            await f.owner.client.rpc("set_appointment_status", {
              p_appointment_id: id,
              p_status: "confirmed",
            })
          ).error,
        ).toBeNull();
        for (const job of claims) {
          const result = await f.admin.rpc("prepare_booking_email_delivery", {
            p_id: job.id,
          });
          expect(result.error).toBeNull();
          expect(result.data).toMatchObject({ deliver: false });
        }
        await f.owner.client.rpc("set_appointment_status", {
          p_appointment_id: id,
          p_status: "confirmed",
        });
        const accepted = (await f.claim()).find(
          (r) => r.decision === "accepted",
        );
        expect(accepted).toBeTruthy();
        await f.owner.client.rpc("set_appointment_status", {
          p_appointment_id: id,
          p_status: "cancelled_by_master",
        });
        expect(
          (
            await f.admin.rpc("prepare_booking_email_delivery", {
              p_id: accepted?.id as string,
            })
          ).data,
        ).toMatchObject({ deliver: false });
        const final = await f.rows();
        expect(final.filter((r) => r.decision === "accepted")).toHaveLength(1);
        expect(
          final.filter((r) => r.decision === "cancelled_by_master"),
        ).toHaveLength(1);
        expect(final.filter((r) => r.status === "superseded")).toHaveLength(3);
        expect(
          (await f.anonymous.from("booking_decision_email_outbox").select("*"))
            .error,
        ).not.toBeNull();
        expect(
          (
            await f.owner.client.rpc("prepare_booking_email_delivery", {
              p_id: accepted?.id as string,
            })
          ).error,
        ).not.toBeNull();
      } finally {
        await f.cleanup();
      }
    },
    30000,
  );

  contract(
    "manual mail requires consent and an address; delivery links are stable, hashed and revocable",
    async () => {
      const f = await fixture();
      try {
        const id = await f.manualBooking();
        expect(await f.rows()).toEqual([]);
        await f.consent(id);
        const claimed = await f.claim();
        expect(claimed).toHaveLength(1);
        const prepared = await f.admin.rpc("prepare_booking_email_delivery", {
          p_id: claimed[0].id,
        });
        expect(prepared.error).toBeNull();
        const payload = prepared.data as {
          deliver: boolean;
          manageToken: string;
        };
        expect(payload.deliver).toBe(true);
        expect(payload.manageToken).toMatch(/^[0-9a-f]{128}$/);
        expect(
          (
            await f.admin.rpc("prepare_booking_email_delivery", {
              p_id: claimed[0].id,
            })
          ).data,
        ).toEqual(payload);
        expect(JSON.stringify(await f.rows())).not.toContain(
          payload.manageToken,
        );
        const hashes = await f.admin
          .from("appointment_access_tokens")
          .select("token_hash")
          .eq("appointment_id", id);
        expect(
          hashes.data?.every((r) => r.token_hash !== payload.manageToken),
        ).toBe(true);
        expect(
          (
            await f.anonymous.rpc("get_customer_appointment", {
              p_token: payload.manageToken,
            })
          ).error,
        ).toBeNull();
        await f.consent(id); // manually rotating a link must revoke the queued email link too
        expect(
          (
            await f.admin.rpc("prepare_booking_email_delivery", {
              p_id: claimed[0].id,
            })
          ).data,
        ).toMatchObject({ deliver: false });
        expect(
          (
            await f.anonymous.rpc("get_customer_appointment", {
              p_token: payload.manageToken,
            })
          ).data,
        ).toBeNull();
        const withoutEmail = await f.manualBooking(
          "2030-01-07T13:00:00Z",
          null,
        );
        await f.consent(withoutEmail);
        expect(
          (await f.rows()).filter((r) => r.appointment_id === withoutEmail),
        ).toEqual([]);
      } finally {
        await f.cleanup();
      }
    },
    30000,
  );

  contract(
    "client confirm/cancel notifies the client and master once, without sending the master their own decision",
    async () => {
      const f = await fixture();
      try {
        const id = await f.publicBooking();
        // This existing master-issued, consent-gated link permits the customer action.
        const { token } = await f.consent(id);
        for (const action of ["confirm", "confirm", "cancel", "cancel"])
          expect(
            (
              await f.anonymous.rpc("update_customer_appointment", {
                p_token: token,
                p_action: action,
              })
            ).error,
          ).toBeNull();
        const rows = await f.rows();
        for (const decision of [
          "customer_confirmed",
          "master_customer_confirmed",
          "cancelled_by_customer",
          "master_customer_cancelled",
        ])
          expect(rows.filter((r) => r.decision === decision)).toHaveLength(1);
        const cancel = rows.find(
          (r) => r.decision === "master_customer_cancelled",
        );
        expect(cancel?.recipient).toBe(f.owner.user.email);
      } finally {
        await f.cleanup();
      }
    },
    30000,
  );

  contract(
    "coalesces recurring cancellations into one customer summary and repeated cancellation adds nothing",
    async () => {
      const f = await fixture();
      try {
        const result = await f.owner.client.rpc(
          "create_master_recurring_bookings",
          {
            p_workspace_id: f.workspaceId,
            p_service_ids: f.serviceIds,
            p_starts_at: "2030-01-07T09:00:00Z",
            p_idempotency_key: randomUUID(),
            p_occurrence_count: 3,
            p_interval_weeks: 1,
            p_name: "Series customer",
            p_email: f.customerEmail,
          },
        );
        expect(result.error).toBeNull();
        const appointments = await f.admin
          .from("appointments")
          .select("id")
          .eq("workspace_id", f.workspaceId)
          .order("starts_at");
        expect(appointments.data).toHaveLength(3);
        for (const row of appointments.data ?? []) await f.consent(row.id);
        const firstId = appointments.data?.[0].id as string;
        for (let repeat = 0; repeat < 2; repeat++)
          expect(
            (
              await f.owner.client.rpc(
                "cancel_master_appointment_series_future",
                { p_workspace_id: f.workspaceId, p_appointment_id: firstId },
              )
            ).error,
          ).toBeNull();
        const cancelled = (await f.rows()).filter(
          (r) => r.decision === "cancelled_by_master",
        );
        expect(cancelled).toHaveLength(1);
        const job = (await f.claim()).find(
          (r) => r.decision === "cancelled_by_master",
        );
        expect(job).toBeTruthy();
        const result2 = await f.admin.rpc("prepare_booking_email_delivery", {
          p_id: job?.id as string,
        });
        expect(result2.error).toBeNull();
        expect(result2.data).toMatchObject({ deliver: true });
        expect(
          (result2.data as { occurrenceStarts: string[] }).occurrenceStarts,
        ).toHaveLength(3);
      } finally {
        await f.cleanup();
      }
    },
    30000,
  );
});

contract(
  "rejects stale leases and expired links; accepted delivery retains only the usable public hash",
  async () => {
    const f = await fixture();
    try {
      const id = await f.manualBooking();
      await f.consent(id);
      const [job] = await f.claim();
      expect(
        (
          await f.admin.rpc("prepare_booking_email_delivery", {
            p_id: job.id,
            p_attempt: job.attempts + 1,
          })
        ).data,
      ).toMatchObject({ deliver: false });
      expect((await f.rows())[0].status).toBe("processing");
      const ready = await f.admin.rpc("prepare_booking_email_delivery", {
        p_id: job.id,
        p_attempt: job.attempts,
      });
      expect(ready.error).toBeNull();
      expect(
        (
          await f.admin.rpc("finish_booking_decision_email", {
            p_id: job.id,
            p_success: true,
          })
        ).error,
      ).toBeNull();
      expect(
        (await f.admin.rpc("prepare_booking_email_delivery", { p_id: job.id }))
          .data,
      ).toMatchObject({ deliver: false });
      expect(
        (
          await f.anonymous.rpc("get_customer_appointment", {
            p_token: (ready.data as { manageToken: string }).manageToken,
          })
        ).data,
      ).not.toBeNull();
      const id2 = await f.manualBooking("2030-01-07T13:00:00Z");
      await f.consent(id2);
      const [job2] = await f.claim();
      const link2 = await f.admin.rpc("prepare_booking_email_delivery", {
        p_id: job2.id,
      });
      expect(link2.error).toBeNull();
      expect(
        (
          await f.admin
            .from("appointment_access_tokens")
            .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
            .eq("appointment_id", id2)
        ).error,
      ).toBeNull();
      expect(
        (await f.admin.rpc("prepare_booking_email_delivery", { p_id: job2.id }))
          .data,
      ).toMatchObject({ deliver: false });
      expect((await f.rows()).find((row) => row.id === job2.id)?.status).toBe(
        "superseded",
      );
      const id3 = await f.manualBooking("2030-01-07T15:00:00Z");
      await f.consent(id3);
      const [job3] = await f.claim();
      expect(
        (await f.admin.rpc("prepare_booking_email_delivery", { p_id: job3.id }))
          .error,
      ).toBeNull();
      expect(
        (
          await f.admin
            .from("booking_decision_email_outbox")
            .update({
              first_prepared_at: new Date(
                Date.now() - 24 * 60 * 60 * 1000,
              ).toISOString(),
            })
            .eq("id", job3.id)
        ).error,
      ).toBeNull();
      expect(
        (await f.admin.rpc("prepare_booking_email_delivery", { p_id: job3.id }))
          .data,
      ).toMatchObject({ deliver: false });
      expect((await f.rows()).find((row) => row.id === job3.id)?.status).toBe(
        "failed",
      );
    } finally {
      await f.cleanup();
    }
  },
  30000,
);
