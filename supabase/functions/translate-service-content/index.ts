const locales = ["en", "cz", "sk", "ru", "uk"] as const;
type Locale = (typeof locales)[number];

type Environment = { get(name: string): string | undefined };
type Dependencies = {
  env: Environment;
  fetcher?: typeof fetch;
  timeouts?: Partial<{ supabaseMs: number; openAiMs: number }>;
};
type ServiceContent = {
  readonly category: string | null;
  readonly description: string | null;
  readonly name: string;
};
type TranslationQuota = {
  readonly limit: number;
  readonly remaining: number;
  readonly resetsAt: string;
  readonly used: number;
};

const localeNames: Record<Locale, string> = {
  en: "English",
  cz: "Czech",
  sk: "Slovak",
  ru: "Russian",
  uk: "Ukrainian",
};

const corsHeaders = {
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-origin": "*",
};

const defaultTimeouts = { openAiMs: 30_000, supabaseMs: 10_000 } as const;
const contentFields = ["category", "description", "name"] as const;

class UpstreamTimeoutError extends Error {
  constructor() {
    super("upstream_timeout");
  }
}

async function fetchWithTimeout(
  fetcher: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new UpstreamTimeoutError());
    }, timeoutMs);
  });

  try {
    const request = (async () => {
      const response = await fetcher(input, {
        ...init,
        signal: controller.signal,
      });
      const body = await response.arrayBuffer();
      return new Response(body, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      });
    })();
    return await Promise.race([request, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { headers: corsHeaders, status });
}

function parseContent(value: unknown): ServiceContent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
    !hasOnlyKeys(item, contentFields) ||
    !contentFields.every((field) => Object.hasOwn(item, field)) ||
    typeof item.name !== "string" ||
    !item.name.trim() ||
    item.name.trim().length > 120 ||
    (typeof item.description === "string" && item.description.length > 1000) ||
    (typeof item.category === "string" && item.category.length > 120) ||
    (item.description !== null && typeof item.description !== "string") ||
    (item.category !== null && typeof item.category !== "string")
  ) {
    return null;
  }
  return {
    name: item.name.trim(),
    description:
      typeof item.description === "string" ? item.description.trim() : null,
    category: typeof item.category === "string" ? item.category.trim() : null,
  };
}

function parseTranslations(
  value: unknown,
  targets: readonly Locale[],
): Record<Locale, ServiceContent> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (
    !hasOnlyKeys(raw, targets) ||
    targets.some((locale) => !Object.hasOwn(raw, locale))
  ) {
    return null;
  }
  const result = {} as Record<Locale, ServiceContent>;
  for (const locale of targets) {
    const content = parseContent(raw[locale]);
    if (!content) return null;
    result[locale] = content;
  }
  return result;
}

export function createHandler({
  env,
  fetcher = fetch,
  timeouts = {},
}: Dependencies) {
  const supabaseTimeoutMs = timeouts.supabaseMs ?? defaultTimeouts.supabaseMs;
  const openAiTimeoutMs = timeouts.openAiMs ?? defaultTimeouts.openAiMs;

  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const authorization = request.headers.get("authorization");
    const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!bearer) return jsonResponse({ error: "unauthorized" }, 401);

    const supabaseUrl = env.get("SUPABASE_URL");
    const publishableKey =
      env.get("SUPABASE_ANON_KEY") ?? env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAiKey = env.get("OPENAI_API_KEY");
    if (!supabaseUrl || !publishableKey || !serviceRoleKey || !openAiKey) {
      return jsonResponse({ error: "translation_not_configured" }, 503);
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return jsonResponse({ error: "invalid_request" }, 400);
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const content = parseContent({
      category: body.category,
      description: body.description,
      name: body.name,
    });
    const sourceLocale = body.sourceLocale;
    const workspaceId = body.workspaceId;
    if (
      !hasOnlyKeys(body, [...contentFields, "sourceLocale", "workspaceId"]) ||
      !content ||
      typeof sourceLocale !== "string" ||
      !locales.includes(sourceLocale as Locale) ||
      typeof workspaceId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(workspaceId)
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    let userResponse: Response;
    try {
      userResponse = await fetchWithTimeout(
        fetcher,
        `${supabaseUrl}/auth/v1/user`,
        {
          headers: {
            apikey: publishableKey,
            authorization: `Bearer ${bearer}`,
          },
        },
        supabaseTimeoutMs,
      );
    } catch {
      return jsonResponse({ error: "authorization_unavailable" }, 503);
    }
    if (!userResponse.ok) {
      return userResponse.status === 401 || userResponse.status === 403
        ? jsonResponse({ error: "unauthorized" }, 401)
        : jsonResponse({ error: "authorization_failed" }, 502);
    }
    let user: unknown;
    try {
      user = (await userResponse.json()) as { id?: unknown };
    } catch {
      return jsonResponse({ error: "authorization_failed" }, 502);
    }
    if (!isRecord(user) || typeof user.id !== "string")
      return jsonResponse({ error: "unauthorized" }, 401);

    const membershipUrl = new URL(`${supabaseUrl}/rest/v1/workspace_members`);
    membershipUrl.searchParams.set("select", "role");
    membershipUrl.searchParams.set("workspace_id", `eq.${workspaceId}`);
    membershipUrl.searchParams.set("user_id", `eq.${user.id}`);
    let membershipResponse: Response;
    try {
      membershipResponse = await fetchWithTimeout(
        fetcher,
        membershipUrl,
        {
          headers: {
            apikey: serviceRoleKey,
            authorization: `Bearer ${serviceRoleKey}`,
          },
        },
        supabaseTimeoutMs,
      );
    } catch {
      return jsonResponse({ error: "authorization_unavailable" }, 503);
    }
    if (!membershipResponse.ok)
      return jsonResponse({ error: "authorization_failed" }, 502);
    let memberships: { role?: unknown }[];
    try {
      const payload: unknown = await membershipResponse.json();
      if (!Array.isArray(payload))
        throw new Error("invalid_membership_response");
      if (
        !payload.every(
          (membership) =>
            isRecord(membership) &&
            hasOnlyKeys(membership, ["role"]) &&
            typeof membership.role === "string",
        )
      ) {
        throw new Error("invalid_membership_response");
      }
      memberships = payload as { role?: unknown }[];
    } catch {
      return jsonResponse({ error: "authorization_failed" }, 502);
    }
    if (
      !memberships.some(
        (membership) =>
          membership.role === "owner" || membership.role === "admin",
      )
    )
      return jsonResponse({ error: "forbidden" }, 403);

    let quotaResponse: Response;
    try {
      quotaResponse = await fetchWithTimeout(
        fetcher,
        `${supabaseUrl}/rest/v1/rpc/claim_service_translation_request`,
        {
          body: JSON.stringify({
            p_workspace_id: workspaceId,
            p_user_id: user.id,
          }),
          headers: {
            apikey: serviceRoleKey,
            authorization: `Bearer ${serviceRoleKey}`,
            "content-type": "application/json",
          },
          method: "POST",
        },
        supabaseTimeoutMs,
      );
    } catch {
      return jsonResponse({ error: "translation_quota_check_failed" }, 503);
    }
    if (!quotaResponse.ok) {
      return jsonResponse({ error: "translation_quota_check_failed" }, 503);
    }
    let quotaPayload: unknown;
    try {
      quotaPayload = await quotaResponse.json();
    } catch {
      return jsonResponse({ error: "translation_quota_check_failed" }, 503);
    }
    if (
      !quotaPayload ||
      typeof quotaPayload !== "object" ||
      Array.isArray(quotaPayload)
    ) {
      return jsonResponse({ error: "translation_quota_check_failed" }, 503);
    }
    const quotaResult = quotaPayload as Record<string, unknown>;
    const quota = parseQuota(quotaResult);
    if (!quota) {
      return jsonResponse({ error: "translation_quota_check_failed" }, 503);
    }
    if (quotaResult.allowed !== true) {
      return jsonResponse({ error: "translation_quota_exceeded", quota }, 429);
    }

    const targetLocales = locales.filter((locale) => locale !== sourceLocale);
    const model = env.get("OPENAI_TRANSLATION_MODEL") ?? "gpt-4o-mini";
    let translationResponse: Response;
    try {
      translationResponse = await fetchWithTimeout(
        fetcher,
        "https://api.openai.com/v1/chat/completions",
        {
          body: JSON.stringify({
            model,
            temperature: 0.2,
            max_completion_tokens: 1400,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `Translate salon service content from ${localeNames[sourceLocale as Locale]} into each requested language. Return only a JSON object keyed by locale code. Each value must contain name, description, and category; keep null fields null. Use natural terminology for beauty services, preserve brand/product names, do not add claims or details, and keep the meaning concise. The master will review every suggestion before saving.`,
              },
              {
                role: "user",
                content: JSON.stringify({
                  source: content,
                  targets: targetLocales.map((locale) => ({
                    code: locale,
                    language: localeNames[locale],
                  })),
                }),
              },
            ],
          }),
          headers: {
            authorization: `Bearer ${openAiKey}`,
            "content-type": "application/json",
          },
          method: "POST",
        },
        openAiTimeoutMs,
      );
    } catch {
      return jsonResponse({ error: "translation_provider_failed" }, 502);
    }
    if (!translationResponse.ok) {
      return jsonResponse({ error: "translation_provider_failed" }, 502);
    }

    let providerResult: unknown;
    try {
      providerResult = await translationResponse.json();
    } catch {
      return jsonResponse({ error: "translation_provider_failed" }, 502);
    }
    const providerContent = parseProviderContent(providerResult);
    if (!providerContent)
      return jsonResponse({ error: "translation_provider_failed" }, 502);

    let translations: Record<Locale, ServiceContent> | null = null;
    try {
      translations = parseTranslations(
        JSON.parse(providerContent),
        targetLocales,
      );
    } catch {
      // Treat malformed model output as an upstream provider failure.
    }
    if (!translations)
      return jsonResponse({ error: "translation_provider_failed" }, 502);
    return jsonResponse({ translations, quota });
  };
}

function parseProviderContent(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const choices = (value as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const firstChoice = choices[0];
  if (
    !firstChoice ||
    typeof firstChoice !== "object" ||
    Array.isArray(firstChoice)
  ) {
    return null;
  }
  const message = (firstChoice as Record<string, unknown>).message;
  if (!message || typeof message !== "object" || Array.isArray(message))
    return null;
  const content = (message as Record<string, unknown>).content;
  return typeof content === "string" && content.length > 0 ? content : null;
}

function parseQuota(value: Record<string, unknown>): TranslationQuota | null {
  if (
    !hasOnlyKeys(value, [
      "allowed",
      "used",
      "limit",
      "remaining",
      "resetsAt",
    ]) ||
    typeof value.allowed !== "boolean" ||
    typeof value.used !== "number" ||
    typeof value.limit !== "number" ||
    typeof value.remaining !== "number" ||
    typeof value.resetsAt !== "string" ||
    !Number.isInteger(value.used) ||
    !Number.isInteger(value.limit) ||
    !Number.isInteger(value.remaining) ||
    value.used < 0 ||
    value.limit <= 0 ||
    value.remaining < 0 ||
    value.remaining > value.limit ||
    value.used + value.remaining !== value.limit ||
    value.allowed !== value.remaining > 0 ||
    Number.isNaN(Date.parse(value.resetsAt))
  ) {
    return null;
  }
  return {
    used: value.used,
    limit: value.limit,
    remaining: value.remaining,
    resetsAt: value.resetsAt,
  };
}

if (import.meta.main) {
  Deno.serve(createHandler({ env: Deno.env }));
}
