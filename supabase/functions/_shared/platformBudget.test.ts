import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calculateOpenAiCostUsd,
  parseBudgetReservation,
} from "./platformBudget.ts";

Deno.test("calculates estimated OpenAI spend from token usage without logging content", () => {
  assertEquals(
    calculateOpenAiCostUsd(
      { usage: { completion_tokens: 400, prompt_tokens: 600 } },
      0.15,
      0.6,
    ),
    0.00033,
  );
});

Deno.test("uses a reserved ceiling when provider usage is missing or malformed", () => {
  assertEquals(calculateOpenAiCostUsd({}, 0.15, 0.6), null);
  assertEquals(
    calculateOpenAiCostUsd(
      { usage: { completion_tokens: -1, prompt_tokens: 5 } },
      0.15,
      0.6,
    ),
    null,
  );
});

Deno.test("validates the atomic budget reservation contract", () => {
  assertEquals(
    parseBudgetReservation({ allowed: true, reservationId: "r-1" }),
    {
      allowed: true,
      reason: undefined,
      reservationId: "r-1",
    },
  );
  assertEquals(
    parseBudgetReservation({ allowed: false, reason: "limit_reached" }),
    { allowed: false, reason: "limit_reached", reservationId: undefined },
  );
  assertEquals(parseBudgetReservation({ allowed: true }), null);
});
