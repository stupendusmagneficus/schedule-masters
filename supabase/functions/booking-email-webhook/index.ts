import { verifySignature } from "./signature.ts";

const events = new Set([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.suppressed",
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Dependencies = {
  env: { get(name: string): string | undefined };
  fetcher?: typeof fetch;
  now?: () => number;
};
const response = (status: number) => new Response(null, { status });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
async function readBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get("content-length")) > 65536) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
export function createHandler({
  env,
  fetcher = fetch,
  now = () => Date.now() / 1000,
}: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return response(405);
    const secret = env.get("RESEND_WEBHOOK_SECRET"),
      url = env.get("SUPABASE_URL"),
      key = env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!secret || !url || !key) return response(503);
    let body: string | null;
    try {
      body = await readBody(request);
    } catch {
      return response(400);
    }
    if (body === null) return response(413);
    if (!(await verifySignature(body, request.headers, secret, now())))
      return response(401);
    let event: unknown;
    try {
      event = JSON.parse(body);
    } catch {
      return response(400);
    }
    if (!isRecord(event) || typeof event.type !== "string")
      return response(400);
    if (!events.has(event.type)) return response(200);
    const data = isRecord(event.data) ? event.data : {};
    const id = data.email_id,
      tag = isRecord(data.tags) ? data.tags.outbox_id : undefined;
    if (
      typeof id !== "string" ||
      !uuid.test(id) ||
      typeof event.created_at !== "string" ||
      !Number.isFinite(Date.parse(event.created_at)) ||
      Date.parse(event.created_at) > now() * 1000 + 300000 ||
      (tag !== undefined && (typeof tag !== "string" || !uuid.test(tag)))
    )
      return response(400);
    try {
      const result = await fetcher(
        `${url}/rest/v1/rpc/record_booking_email_webhook`,
        {
          method: "POST",
          headers: {
            apikey: key,
            authorization: `Bearer ${key}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            p_event_id: request.headers.get("svix-id"),
            p_message_id: id,
            p_outbox_id: tag ?? null,
            p_event_type: event.type,
            p_occurred_at: event.created_at,
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      return response(result.ok ? 200 : 503);
    } catch {
      return response(503);
    }
  };
}
if (import.meta.main) Deno.serve(createHandler({ env: Deno.env }));
