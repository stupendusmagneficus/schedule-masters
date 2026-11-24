import { pathToFileURL } from "node:url";
import {
  evaluateEmailQueueHealth,
  loadEmailQueueHealth,
} from "./email-queue-health.mjs";

const retentionOverdueMs = 26 * 60 * 60 * 1000;

function parseTimestamp(value) {
  if (value === null) return null;
  const time = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (Number.isNaN(time)) throw new Error("Invalid retention status");
  return time;
}

/**
 * Combines public availability, email queue and retention job signals into
 * one verdict. A scheduled job that has not run yet (first day) is healthy.
 */
export function evaluatePilotHealth({
  bookingWebStatus,
  now,
  queue,
  retention,
}) {
  if (
    !retention ||
    typeof retention !== "object" ||
    typeof retention.scheduled !== "boolean"
  )
    throw new Error("Invalid retention status");
  const lastRunAt = parseTimestamp(retention.lastRunAt ?? null);
  const lastFailureAt = parseTimestamp(retention.lastFailureAt ?? null);

  const reasons = [];
  if (bookingWebStatus !== 200) reasons.push("booking_web_unavailable");
  reasons.push(...evaluateEmailQueueHealth(queue).reasons);
  if (!retention.scheduled) reasons.push("retention_not_scheduled");
  if (
    lastFailureAt !== null &&
    (lastRunAt === null || lastFailureAt > lastRunAt)
  )
    reasons.push("retention_failed");
  if (lastRunAt !== null && now.getTime() - lastRunAt > retentionOverdueMs)
    reasons.push("retention_overdue");
  return { healthy: reasons.length === 0, reasons };
}

async function loadRetentionStatus({ url, key }) {
  const response = await fetch(
    new URL("/rest/v1/rpc/get_data_retention_status", url),
    {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: "{}",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error("Retention status request failed");
  return response.json();
}

async function loadBookingWebStatus(bookingWebUrl) {
  const response = await fetch(bookingWebUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });
  return response.status;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: standalone operator command, not a Turbo task.
    const url = process.env.SUPABASE_URL;
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: standalone operator command, not a Turbo task.
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: standalone operator command, not a Turbo task.
    const bookingWebUrl = process.env.BOOKING_WEB_URL;
    if (!url || !key || !bookingWebUrl)
      throw new Error("Missing configuration");
    const [bookingWebStatus, queue, retention] = await Promise.all([
      loadBookingWebStatus(bookingWebUrl),
      loadEmailQueueHealth({ url, key }),
      loadRetentionStatus({ url, key }),
    ]);
    const result = evaluatePilotHealth({
      bookingWebStatus,
      now: new Date(),
      queue,
      retention,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!result.healthy) process.exitCode = 1;
  } catch {
    // Keep secrets and raw responses out of CI logs.
    process.stderr.write("Pilot health check unavailable\n");
    process.exitCode = 2;
  }
}
