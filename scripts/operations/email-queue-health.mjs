import { pathToFileURL } from "node:url";

export function evaluateEmailQueueHealth(report) {
  if (!report || typeof report !== "object" || Array.isArray(report))
    throw new Error("Invalid health response");
  for (const name of [
    "pending_count",
    "stale_processing_count",
    "failed_recent_count",
  ]) {
    if (!Number.isSafeInteger(report[name]) || report[name] < 0)
      throw new Error("Invalid health response");
  }
  const age = report.oldest_pending_seconds;
  if (age !== null && (!Number.isSafeInteger(age) || age < 0))
    throw new Error("Invalid health response");
  if ((report.pending_count === 0) !== (age === null))
    throw new Error("Invalid health response");
  const reasons = [];
  if (age !== null && age > 900) reasons.push("pending_overdue");
  if (report.stale_processing_count > 0) reasons.push("processing_stale");
  if (report.failed_recent_count > 0) reasons.push("delivery_failed");
  return { healthy: reasons.length === 0, reasons };
}

export async function loadEmailQueueHealth({ url, key, fetcher = fetch }) {
  const endpoint = new URL("/rest/v1/rpc/get_email_queue_health", url);
  const isLocalHttp =
    endpoint.protocol === "http:" &&
    (endpoint.hostname === "127.0.0.1" || endpoint.hostname === "localhost");
  if (
    (endpoint.protocol !== "https:" && !isLocalHttp) ||
    endpoint.username ||
    endpoint.password
  )
    throw new Error("Invalid Supabase URL");
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: "{}",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Health request failed");
  return response.json();
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: this standalone operator command is not a Turbo task.
    const url = process.env.SUPABASE_URL;
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: this standalone operator command is not a Turbo task.
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing configuration");
    const result = evaluateEmailQueueHealth(
      await loadEmailQueueHealth({ url, key }),
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!result.healthy) process.exitCode = 1;
  } catch {
    process.stderr.write("Email queue health check unavailable\n");
    process.exitCode = 2;
  }
}
