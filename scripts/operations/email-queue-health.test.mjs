import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evaluateEmailQueueHealth,
  loadEmailQueueHealth,
} from "./email-queue-health.mjs";

test("detects stuck processing and overdue pending jobs without exposing row data", () => {
  const result = evaluateEmailQueueHealth({
    pending_count: 3,
    oldest_pending_seconds: 901,
    stale_processing_count: 1,
    failed_recent_count: 0,
  });
  assert.deepEqual(result, {
    healthy: false,
    reasons: ["pending_overdue", "processing_stale"],
  });
});

test("rejects malformed health reports", () => {
  assert.throws(() =>
    evaluateEmailQueueHealth({
      pending_count: -1,
      oldest_pending_seconds: 0,
      stale_processing_count: 0,
      failed_recent_count: 0,
    }),
  );
});

test("refuses non-HTTPS remote URLs before sending credentials", async () => {
  let called = false;
  await assert.rejects(() =>
    loadEmailQueueHealth({
      url: "http://remote.test",
      key: "secret",
      fetcher: async () => {
        called = true;
      },
    }),
  );
  await assert.rejects(() =>
    loadEmailQueueHealth({
      url: "ftp://localhost",
      key: "secret",
      fetcher: async () => {
        called = true;
      },
    }),
  );
  assert.equal(called, false);
});

test("reads protected aggregate and rejects an upstream failure", async () => {
  const report = {
    pending_count: 0,
    oldest_pending_seconds: null,
    stale_processing_count: 0,
    failed_recent_count: 0,
  };
  const data = await loadEmailQueueHealth({
    url: "https://example.test",
    key: "secret",
    fetcher: async (_url, request) => {
      assert.equal(request.headers.authorization, "Bearer secret");
      return Response.json(report);
    },
  });
  assert.deepEqual(evaluateEmailQueueHealth(data), {
    healthy: true,
    reasons: [],
  });
  await assert.rejects(() =>
    loadEmailQueueHealth({
      url: "https://example.test",
      key: "secret",
      fetcher: async () => new Response(null, { status: 500 }),
    }),
  );
});
