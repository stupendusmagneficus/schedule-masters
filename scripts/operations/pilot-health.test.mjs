import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePilotHealth } from "./pilot-health.mjs";

const now = new Date("2030-01-07T12:00:00Z");
const healthyQueue = {
  failed_recent_count: 0,
  oldest_pending_seconds: null,
  pending_count: 0,
  stale_processing_count: 0,
};
const healthyRetention = {
  lastFailureAt: null,
  lastRunAt: "2030-01-07T03:15:01Z",
  scheduled: true,
};

test("reports a healthy pilot when every signal is fine", () => {
  assert.deepEqual(
    evaluatePilotHealth({
      bookingWebStatus: 200,
      now,
      queue: healthyQueue,
      retention: healthyRetention,
    }),
    { healthy: true, reasons: [] },
  );
});

test("reports each failing signal by name", () => {
  const result = evaluatePilotHealth({
    bookingWebStatus: 503,
    now,
    queue: { ...healthyQueue, failed_recent_count: 2 },
    retention: {
      lastFailureAt: "2030-01-06T03:15:02Z",
      lastRunAt: "2030-01-05T03:15:01Z",
      scheduled: true,
    },
  });
  assert.equal(result.healthy, false);
  assert.deepEqual(result.reasons, [
    "booking_web_unavailable",
    "delivery_failed",
    "retention_failed",
    "retention_overdue",
  ]);
});

test("flags a missing retention schedule but not a first day without runs", () => {
  assert.deepEqual(
    evaluatePilotHealth({
      bookingWebStatus: 200,
      now,
      queue: healthyQueue,
      retention: { lastFailureAt: null, lastRunAt: null, scheduled: false },
    }).reasons,
    ["retention_not_scheduled"],
  );
  assert.equal(
    evaluatePilotHealth({
      bookingWebStatus: 200,
      now,
      queue: healthyQueue,
      retention: { lastFailureAt: null, lastRunAt: null, scheduled: true },
    }).healthy,
    true,
  );
});

test("rejects a malformed retention report", () => {
  assert.throws(
    () =>
      evaluatePilotHealth({
        bookingWebStatus: 200,
        now,
        queue: healthyQueue,
        retention: { scheduled: "yes" },
      }),
    /Invalid retention status/,
  );
});
