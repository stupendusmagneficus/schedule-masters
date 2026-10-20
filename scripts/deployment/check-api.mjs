import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findContractGaps } from "./api-contract.mjs";

function collectRpcs(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectRpcs(path);
    if (!/\.[jt]sx?$/.test(path) || /\.test\./.test(path)) return [];
    return [
      ...readFileSync(path, "utf8").matchAll(/\.rpc\(\s*["']([a-z_]+)["']/g),
    ].map((match) => match[1]);
  });
}

try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "API inspection requires project URL and a server-only inspection credential",
    );
  if (!/^https:\/\/[a-z]{20}\.supabase\.co$/.test(url))
    throw new Error("API inspection requires a hosted Supabase HTTPS URL");
  const response = await fetch(`${url}/rest/v1/`, {
    redirect: "error",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/openapi+json",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw new Error(
      `API metadata unavailable (HTTP ${response.status}); check credentials and project health`,
    );
  const rpcs = [
    ...new Set(
      [
        "apps/mobile/src",
        "apps/booking-web/app",
        "apps/booking-web/src",
      ].flatMap(collectRpcs),
    ),
  ].sort();
  const columns = [
    "id",
    "name",
    "slug",
    "timezone",
    "booking_interval_minutes",
    "public_booking_min_notice_minutes",
  ];
  const gaps = findContractGaps(await response.json(), rpcs, columns);
  if (gaps.length)
    throw new Error(
      `Hosted schema/cache is behind this revision: ${gaps.join(", ")}`,
    );
  console.log(
    `API metadata exposes ${rpcs.length} client RPCs and ${columns.length} required workspace columns`,
  );
  for (const name of [
    "send-booking-decision-emails",
    "translate-service-content",
  ]) {
    const probe = await fetch(`${url}/functions/v1/${name}`, {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
    });
    if (![401, 403].includes(probe.status))
      throw new Error(
        `Function ${name}: expected unauthenticated rejection, received HTTP ${probe.status}`,
      );
    console.log(
      `Function ${name}: deployed route rejects unauthenticated access`,
    );
  }
} catch (error) {
  // Never print response bodies, headers, provider diagnostics, or credentials.
  console.error(
    error instanceof TypeError
      ? "Network request failed; verify connectivity and project URL"
      : error.name === "TimeoutError"
        ? "API inspection timed out"
        : error.message,
  );
  process.exitCode = 1;
}
