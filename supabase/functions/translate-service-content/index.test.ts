import assert from "node:assert/strict";
import { createHandler } from "./index.ts";

const serviceRoleKey = "test-service-role-key";
const workspaceId = "4786fac7-f8f7-4782-a107-ec6a77aab23a";
const envValues: Record<string, string | undefined> = {
  OPENAI_API_KEY: "test-openai-key",
  OPENAI_MAX_REQUEST_COST_USD: "0.05",
  OPENAI_INPUT_USD_PER_MILLION_TOKENS: "0.15",
  OPENAI_OUTPUT_USD_PER_MILLION_TOKENS: "0.6",
  SUPABASE_ANON_KEY: "test-publishable-key",
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  SUPABASE_URL: "https://supabase.example.test",
};

const expectedLocales = ["en", "cz", "ru", "uk"];
const translations = Object.fromEntries(
  expectedLocales.map((locale) => [
    locale,
    { category: null, description: null, name: `${locale} translation` },
  ]),
);

function environment(values = envValues) {
  return { get: (name: string) => values[name as keyof typeof values] };
}

function request(
  body: unknown = {
    category: null,
    description: null,
    name: "Manikúra",
    sourceLocale: "sk",
    workspaceId,
  },
) {
  return new Request("https://edge.example.test/translate-service-content", {
    body: JSON.stringify(body),
    headers: { authorization: "Bearer user-access-token" },
    method: "POST",
  });
}

function quotaResponse(allowed = true) {
  return Response.json({
    allowed,
    limit: 20,
    remaining: allowed ? 19 : 0,
    resetsAt: "2030-02-01T00:00:00.000Z",
    used: allowed ? 1 : 20,
  });
}

function providerResponse(content: unknown = translations) {
  return Response.json({
    choices: [{ message: { content: JSON.stringify(content) } }],
    usage: { completion_tokens: 100, prompt_tokens: 100 },
  });
}

function successfulFetcher(
  options: {
    readonly budgetResponse?: Response;
    readonly providerResponse?: Response;
    readonly quotaResponse?: Response;
    readonly calls?: string[];
  } = {},
) {
  const calls = options.calls ?? [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/auth/v1/user")) return Response.json({ id: "user-1" });
    if (url.includes("/rest/v1/workspace_members")) {
      return Response.json([{ role: "owner" }]);
    }
    if (url.includes("claim_service_translation_request")) {
      return options.quotaResponse ?? quotaResponse();
    }
    if (url.includes("reserve_platform_integration_usage")) {
      return (
        options.budgetResponse ??
        Response.json({ allowed: true, reservationId: "budget-1" })
      );
    }
    if (url.includes("settle_platform_integration_usage")) {
      return Response.json({ alertsPending: false });
    }
    if (url === "https://api.openai.com/v1/chat/completions") {
      return options.providerResponse ?? providerResponse();
    }
    return new Response("unexpected request", { status: 500 });
  };
  return { calls, fetcher };
}

Deno.test("translates all four target locales after owner authorization and quota claim", async () => {
  const { calls, fetcher } = successfulFetcher();
  const response = await createHandler({ env: environment(), fetcher })(
    request(),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    quota: {
      limit: 20,
      remaining: 19,
      resetsAt: "2030-02-01T00:00:00.000Z",
      used: 1,
    },
    translations,
  });
  assert.deepEqual(
    calls.map((url) => new URL(url).pathname),
    [
      "/auth/v1/user",
      "/rest/v1/workspace_members",
      "/rest/v1/rpc/claim_service_translation_request",
      "/rest/v1/rpc/reserve_platform_integration_usage",
      "/v1/chat/completions",
      "/rest/v1/rpc/settle_platform_integration_usage",
    ],
  );
});

Deno.test("rejects malformed requests before making upstream calls", async () => {
  const { calls, fetcher } = successfulFetcher();
  const response = await createHandler({ env: environment(), fetcher })(
    request({
      category: null,
      description: null,
      name: "Manikúra",
      unexpected: "untrusted value",
      sourceLocale: "sk",
      workspaceId,
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_request" });
  assert.equal(calls.length, 0);
});

Deno.test("rejects cross-tenant members before claiming quota or calling the provider", async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/auth/v1/user")) return Response.json({ id: "user-1" });
    return Response.json([{ role: "member" }]);
  };
  const response = await createHandler({ env: environment(), fetcher })(
    request(),
  );

  assert.equal(response.status, 403);
  assert.equal(calls.length, 2);
});

Deno.test("returns a quota error without invoking OpenAI when the monthly limit is reached", async () => {
  const { calls, fetcher } = successfulFetcher({
    quotaResponse: quotaResponse(false),
  });
  const response = await createHandler({ env: environment(), fetcher })(
    request(),
  );

  assert.equal(response.status, 429);
  assert.equal((await response.json()).error, "translation_quota_exceeded");
  assert.equal(
    calls.some((url) => url.includes("api.openai.com")),
    false,
  );
});

Deno.test("does not call OpenAI when the global budget is exhausted", async () => {
  const { calls, fetcher } = successfulFetcher({
    budgetResponse: Response.json({ allowed: false, reason: "limit_reached" }),
  });
  const response = await createHandler({ env: environment(), fetcher })(
    request(),
  );

  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), {
    error: "translation_global_budget_exceeded",
  });
  assert.equal(
    calls.some((url) => url.includes("api.openai.com")),
    false,
  );
});

Deno.test("fails closed before reservation when the request ceiling is missing", async () => {
  const { calls, fetcher } = successfulFetcher();
  const response = await createHandler({
    env: environment({ ...envValues, OPENAI_MAX_REQUEST_COST_USD: undefined }),
    fetcher,
  })(request());

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "translation_budget_not_configured",
  });
  assert.equal(
    calls.some((url) => url.includes("reserve_platform_integration_usage")),
    false,
  );
});

Deno.test("fails closed for an invalid quota response", async () => {
  const { calls, fetcher } = successfulFetcher({
    quotaResponse: Response.json({ allowed: true, used: "1" }),
  });
  const response = await createHandler({ env: environment(), fetcher })(
    request(),
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "translation_quota_check_failed",
  });
  assert.equal(
    calls.some((url) => url.includes("api.openai.com")),
    false,
  );
});

Deno.test("rejects unexpected locales and fields in provider output", async () => {
  const unsafeOutput = {
    ...translations,
    de: { category: null, description: null, name: "Unexpected locale" },
  };
  const { fetcher } = successfulFetcher({
    providerResponse: providerResponse(unsafeOutput),
  });
  const response = await createHandler({ env: environment(), fetcher })(
    request(),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "translation_provider_failed",
  });
});

Deno.test("rejects unexpected fields in translated content", async () => {
  const invalidOutput = {
    ...translations,
    en: { category: null, description: null, extra: "field", name: "English" },
  };
  const { fetcher } = successfulFetcher({
    providerResponse: providerResponse(invalidOutput),
  });
  const response = await createHandler({ env: environment(), fetcher })(
    request(),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "translation_provider_failed",
  });
});

Deno.test("rejects translated fields that exceed the service content limits", async () => {
  const invalidOutput = {
    ...translations,
    en: {
      category: null,
      description: "x".repeat(1001),
      name: "English",
    },
  };
  const { fetcher } = successfulFetcher({
    providerResponse: providerResponse(invalidOutput),
  });
  const response = await createHandler({ env: environment(), fetcher })(
    request(),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "translation_provider_failed",
  });
});

Deno.test("rejects malformed model JSON without exposing the provider response", async () => {
  const { fetcher } = successfulFetcher({
    providerResponse: Response.json({
      choices: [{ message: { content: "not valid JSON" } }],
      error: "private provider detail",
    }),
  });
  const response = await createHandler({ env: environment(), fetcher })(
    request(),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "translation_provider_failed",
  });
});

Deno.test("maps provider network failures to a safe response and never retries", async () => {
  let providerCalls = 0;
  const { fetcher: baseFetcher, calls } = successfulFetcher();
  const fetcher: typeof fetch = async (input, init) => {
    if (String(input).includes("api.openai.com")) {
      providerCalls += 1;
      throw new Error("private provider detail");
    }
    return baseFetcher(input, init);
  };
  const response = await createHandler({ env: environment(), fetcher })(
    request(),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "translation_provider_failed",
  });
  assert.equal(providerCalls, 1);
  assert.equal(
    calls.filter((url) => url.includes("claim_service_translation_request"))
      .length,
    1,
  );
});

Deno.test("maps provider rate limits to a safe response without retrying", async () => {
  let providerCalls = 0;
  const { fetcher: baseFetcher } = successfulFetcher({
    providerResponse: new Response("private provider detail", { status: 429 }),
  });
  const fetcher: typeof fetch = async (input, init) => {
    if (String(input).includes("api.openai.com")) providerCalls += 1;
    return baseFetcher(input, init);
  };
  const response = await createHandler({ env: environment(), fetcher })(
    request(),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "translation_provider_failed",
  });
  assert.equal(providerCalls, 1);
});

Deno.test("aborts a timed out provider request and returns a safe response", async () => {
  let providerSignal: AbortSignal | null | undefined;
  const { fetcher: baseFetcher } = successfulFetcher();
  const fetcher: typeof fetch = (input, init) => {
    if (String(input).includes("api.openai.com")) {
      providerSignal = init?.signal;
      return new Promise<Response>(() => {});
    }
    return baseFetcher(input, init);
  };
  const response = await createHandler({
    env: environment(),
    fetcher,
    timeouts: { openAiMs: 5 },
  })(request());

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "translation_provider_failed",
  });
  assert.equal(providerSignal?.aborted, true);
});

Deno.test("aborts a timed out Supabase authorization request", async () => {
  let authSignal: AbortSignal | null | undefined;
  const fetcher: typeof fetch = (input, init) => {
    if (String(input).endsWith("/auth/v1/user")) {
      authSignal = init?.signal;
      return new Promise<Response>(() => {});
    }
    return Promise.resolve(new Response("unexpected request", { status: 500 }));
  };
  const response = await createHandler({
    env: environment(),
    fetcher,
    timeouts: { supabaseMs: 5 },
  })(request());

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "authorization_unavailable",
  });
  assert.equal(authSignal?.aborted, true);
});

Deno.test("applies the provider timeout while reading its response body", async () => {
  let providerSignal: AbortSignal | null | undefined;
  const { fetcher: baseFetcher } = successfulFetcher();
  const fetcher: typeof fetch = (input, init) => {
    if (String(input).includes("api.openai.com")) {
      providerSignal = init?.signal;
      return Promise.resolve(
        new Response(new ReadableStream<Uint8Array>({ start() {} })),
      );
    }
    return baseFetcher(input, init);
  };
  const response = await createHandler({
    env: environment(),
    fetcher,
    timeouts: { openAiMs: 5 },
  })(request());

  assert.equal(response.status, 502);
  assert.equal(providerSignal?.aborted, true);
});

Deno.test("maps malformed Supabase identity and membership responses to controlled errors", async () => {
  const malformedIdentity: typeof fetch = async () => new Response("not json");
  const identityResponse = await createHandler({
    env: environment(),
    fetcher: malformedIdentity,
  })(request());
  assert.equal(identityResponse.status, 502);
  assert.deepEqual(await identityResponse.json(), {
    error: "authorization_failed",
  });

  const membershipFetcher: typeof fetch = async (input) => {
    if (String(input).endsWith("/auth/v1/user"))
      return Response.json({ id: "user-1" });
    return new Response("not json");
  };
  const membershipResponse = await createHandler({
    env: environment(),
    fetcher: membershipFetcher,
  })(request());
  assert.equal(membershipResponse.status, 502);
  assert.deepEqual(await membershipResponse.json(), {
    error: "authorization_failed",
  });
});
