import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSupabaseAdminTestClient } from "./supabase.integration.helpers";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contract = url && publishableKey && serviceRoleKey ? it : it.skip;

type Admin = ReturnType<typeof createSupabaseAdminTestClient>;

function adminClient(): Admin {
  if (!url || !serviceRoleKey) throw new Error("Supabase is not configured");
  return createSupabaseAdminTestClient({ url, serviceRoleKey });
}

function randomIp(): string {
  const hex = randomUUID().replaceAll("-", "");
  return `2001:db8:${hex.slice(0, 4)}:${hex.slice(4, 8)}::1`;
}

async function createBookableWorkspace(admin: Admin) {
  const workspaceId = randomUUID();
  const slug = `abuse-${randomUUID()}`;
  expect(
    (
      await admin.from("workspaces").insert({
        id: workspaceId,
        name: "Abuse guard test",
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
  expect(
    (
      await admin.from("availability_rules").insert(
        [1, 2, 3, 4, 5].map((dayOfWeek) => ({
          workspace_id: workspaceId,
          day_of_week: dayOfWeek,
          start_local_time: "08:00",
          end_local_time: "18:00",
          valid_from: "2030-01-07",
        })),
      )
    ).error,
  ).toBeNull();
  return { workspaceId, slug, serviceId: service.data?.id as string };
}

const slotsPerDay = 20;
const ipBudget = 30;

// 2030-01-07 is a Monday; each weekday has 20 half-hour slots from 08:00 Prague.
function slotStart(index: number): string {
  const day = Math.floor(index / slotsPerDay);
  const slot = index % slotsPerDay;
  return new Date(Date.UTC(2030, 0, 7 + day, 7, 30 * slot)).toISOString();
}

function postBooking(
  headers: Record<string, string>,
  payload: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${url}/rest/v1/rpc/create_public_booking`, {
    method: "POST",
    headers: {
      apikey: publishableKey as string,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}

function bookingPayload(
  target: { slug: string; serviceId: string },
  email: string,
  slotIndex: number,
) {
  return {
    p_slug: target.slug,
    p_service_id: target.serviceId,
    p_name: "Abuse test customer",
    p_email: email,
    p_phone: null,
    p_locale: "en",
    p_starts_at: slotStart(slotIndex),
    p_idempotency_key: randomUUID(),
  };
}

describe("public booking abuse guards", () => {
  contract(
    "rate limits by the proxy-verified client IP, not a spoofed X-Forwarded-For",
    async () => {
      const admin = adminClient();
      // The IP budget spans workspaces; two targets stay under each workspace quota.
      const targets = [
        await createBookableWorkspace(admin),
        await createBookableWorkspace(admin),
      ];
      const clientIp = randomIp();
      try {
        for (let attempt = 0; attempt < ipBudget; attempt++) {
          const response = await postBooking(
            { "cf-connecting-ip": clientIp, "x-forwarded-for": randomIp() },
            bookingPayload(
              targets[attempt % 2],
              `spoof-${attempt}@example.test`,
              attempt,
            ),
          );
          expect(response.status).toBe(200);
        }
        const limited = await postBooking(
          { "cf-connecting-ip": clientIp, "x-forwarded-for": randomIp() },
          bookingPayload(targets[0], "spoof-last@example.test", ipBudget),
        );
        expect(limited.status).toBe(429);
      } finally {
        await admin
          .from("workspaces")
          .delete()
          .in(
            "id",
            targets.map((target) => target.workspaceId),
          );
      }
    },
    60_000,
  );

  contract(
    "a malformed X-Forwarded-For header does not skip the IP limit",
    async () => {
      const admin = adminClient();
      const targets = [
        await createBookableWorkspace(admin),
        await createBookableWorkspace(admin),
      ];
      const garbage = `not-an-ip-${randomUUID()}`;
      try {
        // Other runs may already share the malformed-header bucket.
        let lastStatus = 0;
        for (let attempt = 0; attempt <= ipBudget; attempt++) {
          lastStatus = (
            await postBooking(
              { "x-forwarded-for": garbage },
              bookingPayload(
                targets[attempt % 2],
                `garbage-${attempt}@example.test`,
                attempt,
              ),
            )
          ).status;
          if (lastStatus !== 200) break;
        }
        expect(lastStatus).toBe(429);
      } finally {
        await admin
          .from("workspaces")
          .delete()
          .in(
            "id",
            targets.map((target) => target.workspaceId),
          );
      }
    },
    60_000,
  );

  contract(
    "limits active pending requests per customer email in one workspace",
    async () => {
      const admin = adminClient();
      const target = await createBookableWorkspace(admin);
      const email = `pending-${randomUUID()}@example.test`;
      try {
        for (let slot = 0; slot < 3; slot++) {
          const response = await postBooking(
            { "cf-connecting-ip": randomIp() },
            bookingPayload(target, email, slot),
          );
          expect(response.status).toBe(200);
        }
        const blocked = await postBooking(
          { "cf-connecting-ip": randomIp() },
          bookingPayload(target, email.toUpperCase(), 3),
        );
        expect(blocked.status).toBe(400);
        const blockedBody = (await blocked.json()) as { message?: string };
        expect(blockedBody.message).toContain("Too many pending requests");

        const otherCustomer = await postBooking(
          { "cf-connecting-ip": randomIp() },
          bookingPayload(target, `other-${randomUUID()}@example.test`, 4),
        );
        expect(otherCustomer.status).toBe(200);
      } finally {
        await admin.from("workspaces").delete().eq("id", target.workspaceId);
      }
    },
    60_000,
  );

  contract(
    "caps request_received emails per recipient across workspaces",
    async () => {
      const admin = adminClient();
      const first = await createBookableWorkspace(admin);
      const second = await createBookableWorkspace(admin);
      const recipient = `victim-${randomUUID()}@example.test`;
      try {
        for (const [target, slot] of [
          [first, 0],
          [first, 1],
          [first, 2],
          [second, 0],
        ] as const) {
          const response = await postBooking(
            { "cf-connecting-ip": randomIp() },
            bookingPayload(target, recipient, slot),
          );
          expect(response.status).toBe(200);
        }
        const receipts = await admin
          .from("booking_decision_email_outbox")
          .select("id")
          .eq("recipient", recipient)
          .eq("decision", "request_received");
        expect(receipts.error).toBeNull();
        expect(receipts.data).toHaveLength(3);
      } finally {
        await admin
          .from("workspaces")
          .delete()
          .in("id", [first.workspaceId, second.workspaceId]);
      }
    },
    60_000,
  );

  contract(
    "keeps a released booking slug reserved for its previous workspace",
    async () => {
      const admin = adminClient();
      const owner = await createBookableWorkspace(admin);
      const newSlug = `moved-${randomUUID()}`;
      const otherId = randomUUID();
      try {
        expect(
          (
            await admin
              .from("workspaces")
              .update({ slug: newSlug })
              .eq("id", owner.workspaceId)
          ).error,
        ).toBeNull();

        const squat = await admin.from("workspaces").insert({
          id: otherId,
          name: "Squatter",
          slug: owner.slug,
          timezone: "Europe/Prague",
        });
        expect(squat.error?.message).toContain("Booking slug is already taken");

        const reclaim = await admin
          .from("workspaces")
          .update({ slug: owner.slug })
          .eq("id", owner.workspaceId);
        expect(reclaim.error).toBeNull();
      } finally {
        await admin
          .from("workspaces")
          .delete()
          .in("id", [owner.workspaceId, otherId]);
      }
    },
    60_000,
  );
});
