import { describe, expect, it } from "vitest";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contract = url && publishableKey && serviceRoleKey ? it : it.skip;

describe("platform integration budget boundary", () => {
  contract(
    "defaults to fail-closed and rejects client-role access",
    async () => {
      if (!url || !publishableKey || !serviceRoleKey) return;

      const reservation = await fetch(
        `${url}/rest/v1/rpc/reserve_platform_integration_usage`,
        {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            authorization: `Bearer ${serviceRoleKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            p_amount: 0.01,
            p_provider: "openai_translation",
          }),
        },
      );

      expect(reservation.status).toBe(200);
      expect(await reservation.json()).toMatchObject({
        allowed: false,
        reason: "not_configured",
      });

      const clientAttempt = await fetch(
        `${url}/rest/v1/rpc/reserve_platform_integration_usage`,
        {
          method: "POST",
          headers: {
            apikey: publishableKey,
            authorization: `Bearer ${publishableKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            p_amount: 0.01,
            p_provider: "openai_translation",
          }),
        },
      );

      expect(clientAttempt.ok).toBe(false);
    },
  );
});
