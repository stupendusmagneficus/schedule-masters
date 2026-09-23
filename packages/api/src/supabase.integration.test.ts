import { afterAll, describe, expect, it } from "vitest";

import { createSupabaseClient } from "./supabase/client";

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const integrationTest = supabaseUrl && supabasePublishableKey ? it : it.skip;

const supabase =
  supabaseUrl && supabasePublishableKey
    ? createSupabaseClient({
        url: supabaseUrl,
        publishableKey: supabasePublishableKey,
      })
    : null;

const serviceId = "00000000-0000-0000-0000-000000000002";
const bookingDate = "2030-01-03";

describe("Supabase public booking contract", () => {
  afterAll(async () => {
    await supabase?.removeAllChannels();
  });

  integrationTest(
    "enforces public booking boundaries and idempotency",
    async () => {
      if (!supabase) return;

      const context = await supabase.rpc("get_public_booking_context", {
        p_slug: "demo-studio",
      });
      expect(context.error).toBeNull();
      expect(context.data).toMatchObject({
        workspace: { slug: "demo-studio" },
      });

      const slots = await supabase.rpc("get_public_available_slots", {
        p_date: bookingDate,
        p_service_id: serviceId,
        p_slug: "demo-studio",
      });
      expect(slots.error).toBeNull();
      const availableSlot = slots.data?.[0];
      expect(availableSlot).toBeDefined();
      const bookingStart = availableSlot?.starts_at;
      expect(bookingStart).toEqual(expect.any(String));

      const idempotencyKey = `integration-${Date.now()}`;
      const first = await supabase.rpc("create_public_booking", {
        p_email: "integration@example.test",
        p_idempotency_key: idempotencyKey,
        p_name: "Integration client",
        p_phone: "+420111222333",
        p_service_id: serviceId,
        p_slug: "demo-studio",
        p_starts_at: bookingStart as string,
      });
      expect(first.error).toBeNull();

      const retry = await supabase.rpc("create_public_booking", {
        p_email: "integration@example.test",
        p_idempotency_key: idempotencyKey,
        p_name: "Integration retry",
        p_phone: "+420111222333",
        p_service_id: serviceId,
        p_slug: "demo-studio",
        p_starts_at: bookingStart as string,
      });
      expect(retry.error).toBeNull();
      expect(retry.data).toEqual(first.data);

      const nextDaySlots = await supabase.rpc("get_public_available_slots", {
        p_date: "2030-01-04",
        p_service_id: serviceId,
        p_slug: "demo-studio",
      });
      expect(nextDaySlots.error).toBeNull();
      const secondSlot = nextDaySlots.data?.[0];
      expect(secondSlot).toBeDefined();

      const secondBooking = await supabase.rpc("create_public_booking", {
        p_email: "integration@example.test",
        p_idempotency_key: `${idempotencyKey}-second`,
        p_name: "Different guest name",
        p_phone: "+420111222333",
        p_service_id: serviceId,
        p_slug: "demo-studio",
        p_starts_at: secondSlot?.starts_at as string,
      });

      expect(secondBooking.error).toBeNull();
      const firstBookingId = (first.data as { id?: string } | null)?.id;
      const secondBookingId = (secondBooking.data as { id?: string } | null)
        ?.id;
      expect(secondBookingId).not.toEqual(firstBookingId);
    },
  );

  integrationTest(
    "rejects direct anonymous access to appointments",
    async () => {
      if (!supabase) return;

      const appointments = await supabase.from("appointments").select("id");
      expect(appointments.data).toBeNull();
      expect(appointments.error).not.toBeNull();
    },
  );
});
