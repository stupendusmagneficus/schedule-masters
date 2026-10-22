export const AUTH_CALLBACK_PATH = "/auth/callback";
export const AUTH_SCHEME = "schedulemasters";

export type AuthCallbackClient = {
  readonly auth: {
    readonly exchangeCodeForSession: (
      code: string,
      options?: { flowId: string },
    ) => Promise<{
      readonly error: { readonly message: string } | null;
      readonly data?: unknown;
    }>;
  };
};

export function getEmailRedirectTo(
  platform: "web" | "native",
  origin?: string,
  configuredRedirect?: string,
): string {
  if (platform === "native") return `${AUTH_SCHEME}://auth/callback`;

  if (configuredRedirect && isSafeWebRedirect(configuredRedirect)) {
    return configuredRedirect;
  }
  const safeOrigin = origin && isLocalWebOrigin(origin) ? origin : undefined;
  return safeOrigin
    ? new URL(AUTH_CALLBACK_PATH, safeOrigin).toString()
    : `${AUTH_SCHEME}://auth/callback`;
}

export async function completeAuthCallback(
  client: AuthCallbackClient,
  callbackUrl: string,
  redirectTo: string,
): Promise<"ignored" | "completed" | "recovery" | "failed"> {
  let callback: URL;
  let expected: URL;
  try {
    callback = new URL(callbackUrl);
    expected = new URL(redirectTo);
  } catch {
    return "ignored";
  }

  if (
    callback.username ||
    callback.password ||
    callback.protocol !== expected.protocol ||
    callback.host !== expected.host ||
    callback.pathname !== expected.pathname
  ) {
    return "ignored";
  }

  const params = new URLSearchParams(callback.search);
  const hashParams = new URLSearchParams(callback.hash.replace(/^#/, ""));
  if (params.has("error") || hashParams.has("error")) return "failed";
  const code = params.get("code");
  if (
    !code ||
    params.getAll("code").length !== 1 ||
    params.getAll("sb_flow_id").length > 1 ||
    (params.has("sb_flow_id") && !params.get("sb_flow_id"))
  )
    return "failed";

  try {
    const flowId = params.get("sb_flow_id");
    const { data, error } = flowId
      ? await client.auth.exchangeCodeForSession(code, { flowId })
      : await client.auth.exchangeCodeForSession(code);
    return error
      ? "failed"
      : data &&
          typeof data === "object" &&
          "redirectType" in data &&
          data.redirectType === "recovery"
        ? "recovery"
        : "completed";
  } catch {
    return "failed";
  }
}

function isSafeWebOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.pathname !== "/" || url.search || url.hash) return false;
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1"))
    );
  } catch {
    return false;
  }
}

function isLocalWebOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      url.port === "8081" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}
function isSafeWebRedirect(redirect: string): boolean {
  try {
    const url = new URL(redirect);
    return (
      url.pathname === AUTH_CALLBACK_PATH &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      isSafeWebOrigin(url.origin)
    );
  } catch {
    return false;
  }
}

export function getCurrentWebOrigin(): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    readonly location?: { readonly origin?: string };
  };
  return runtime.location?.origin;
}

export function cleanWebCallbackUrl(callbackUrl: string, redirectTo: string) {
  const runtime = globalThis as typeof globalThis & {
    readonly history?: {
      replaceState: (data: unknown, unused: string, url?: string) => void;
    };
  };
  if (!runtime.history) return;
  try {
    const callback = new URL(callbackUrl);
    const expected = new URL(redirectTo);
    if (
      callback.origin === expected.origin &&
      callback.pathname === expected.pathname
    ) {
      runtime.history.replaceState(null, "", callback.pathname);
    }
  } catch {
    return;
  }
}
