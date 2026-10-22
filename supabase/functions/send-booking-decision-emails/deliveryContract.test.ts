import assert from "node:assert/strict";
import {
  parsePreparedDelivery,
  validateBookingBaseUrl,
} from "./deliveryContract.ts";

const fixture = {
  deliver: true,
  decision: "accepted",
  locale: "en",
  recipient: "client@example.test",
  serviceName: "Service",
  workspaceName: "Studio",
  startsAt: "2030-01-03T09:00:00Z",
  timezone: "Europe/Prague",
  durationMinutes: 60,
  priceAmount: 100,
  currency: "CZK",
  occurrenceStarts: ["2030-01-03T09:00:00Z"],
  manageToken: "a".repeat(128),
};
Deno.test("validates delivery data and puts management token only in the fragment", () => {
  const result = parsePreparedDelivery(fixture, "https://book.example.test/");
  assert.ok(result?.deliver);
  assert.equal(
    result.message.manageUrl,
    `https://book.example.test/#token=${"a".repeat(128)}`,
  );
  assert.equal(
    parsePreparedDelivery(
      { ...fixture, locale: "unknown" },
      "https://book.example.test",
    ),
    null,
  );
  assert.equal(
    parsePreparedDelivery(
      { ...fixture, manageToken: "invalid" },
      "https://book.example.test",
    ),
    null,
  );
  assert.equal(
    parsePreparedDelivery(
      { ...fixture, decision: "request_received" },
      "https://book.example.test",
    ),
    null,
  );
  assert.deepEqual(
    parsePreparedDelivery({ deliver: false }, "https://book.example.test"),
    { deliver: false },
  );
});
Deno.test("rejects missing/untrusted booking URL configuration before any send", () => {
  for (const url of [
    undefined,
    "http://book.example.test",
    "https://user:password@book.example.test/",
    "https://book.example.test/?demo=1",
    "javascript:alert(1)",
  ])
    assert.equal(validateBookingBaseUrl(url), null);
  assert.equal(
    validateBookingBaseUrl("https://book.example.test"),
    "https://book.example.test/",
  );
});
