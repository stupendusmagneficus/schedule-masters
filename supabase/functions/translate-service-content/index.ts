const locales = ["en", "cz", "sk", "ru", "uk"] as const;
type Locale = (typeof locales)[number];

type Environment = { get(name: string): string | undefined };
type Dependencies = { env: Environment; fetcher?: typeof fetch };
type ServiceContent = {
  readonly category: string | null;
  readonly description: string | null;
  readonly name: string;
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

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { headers: corsHeaders, status });
}

function parseContent(value: unknown): ServiceContent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
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
  const result = {} as Record<Locale, ServiceContent>;
  for (const locale of targets) {
    const content = parseContent(raw[locale]);
    if (!content) return null;
    result[locale] = content;
  }
  return result;
}

export function createHandler({ env, fetcher = fetch }: Dependencies) {
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

    const content = parseContent(body);
    const sourceLocale = body.sourceLocale;
    const workspaceId = body.workspaceId;
    if (
      !content ||
      typeof sourceLocale !== "string" ||
      !locales.includes(sourceLocale as Locale) ||
      typeof workspaceId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(workspaceId)
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const userResponse = await fetcher(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${bearer}`,
      },
    });
    if (!userResponse.ok) return jsonResponse({ error: "unauthorized" }, 401);
    const user = (await userResponse.json()) as { id?: unknown };
    if (typeof user.id !== "string")
      return jsonResponse({ error: "unauthorized" }, 401);

    const membershipUrl = new URL(`${supabaseUrl}/rest/v1/workspace_members`);
    membershipUrl.searchParams.set("select", "role");
    membershipUrl.searchParams.set("workspace_id", `eq.${workspaceId}`);
    membershipUrl.searchParams.set("user_id", `eq.${user.id}`);
    const membershipResponse = await fetcher(membershipUrl, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (!membershipResponse.ok)
      return jsonResponse({ error: "authorization_failed" }, 502);
    const memberships = (await membershipResponse.json()) as {
      role?: unknown;
    }[];
    if (!memberships.some(({ role }) => role === "owner" || role === "admin"))
      return jsonResponse({ error: "forbidden" }, 403);

    const quotaResponse = await fetcher(
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
    );
    if (!quotaResponse.ok) {
      return jsonResponse({ error: "translation_quota_check_failed" }, 503);
    }
    if ((await quotaResponse.json()) !== true) {
      return jsonResponse({ error: "translation_quota_exceeded" }, 429);
    }

    const targetLocales = locales.filter((locale) => locale !== sourceLocale);
    const model = env.get("OPENAI_TRANSLATION_MODEL") ?? "gpt-4o-mini";
    const translationResponse = await fetcher(
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
    );
    if (!translationResponse.ok) {
      return jsonResponse({ error: "translation_provider_failed" }, 502);
    }

    let providerResult: {
      choices?: { message?: { content?: string | null } }[];
    };
    try {
      providerResult = await translationResponse.json();
    } catch {
      return jsonResponse({ error: "translation_provider_failed" }, 502);
    }
    const providerContent = providerResult.choices?.[0]?.message?.content;
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
    return jsonResponse({ translations });
  };
}

if (import.meta.main) {
  Deno.serve(createHandler({ env: Deno.env }));
}
