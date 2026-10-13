import { describe, expect, it, vi } from "vitest";

import {
  type AuthCallbackClient,
  completeAuthCallback,
  getEmailRedirectTo,
} from "./authRedirect";

function client(
  exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null }),
) {
  return { auth: { exchangeCodeForSession } } satisfies AuthCallbackClient;
}

describe("email confirmation redirect", () => {
  it("uses localhost callback for web and registered scheme for native", () => {
    expect(getEmailRedirectTo("web", "http://localhost:8081")).toBe(
      "http://localhost:8081/auth/callback",
    );
    expect(getEmailRedirectTo("native")).toBe(
      "schedulemasters://auth/callback",
    );
  });

  it("rejects untrusted remote origins and uses the registered app scheme", () => {
    expect(getEmailRedirectTo("web", "http://attacker.example")).toBe(
      "schedulemasters://auth/callback",
    );
    expect(getEmailRedirectTo("web", "https://untrusted.example")).toBe(
      "schedulemasters://auth/callback",
    );
  });

  it("accepts an explicitly configured HTTPS callback", () => {
    expect(
      getEmailRedirectTo(
        "web",
        "https://untrusted.example",
        "https://schedulemasters.example/auth/callback",
      ),
    ).toBe("https://schedulemasters.example/auth/callback");
  });

  it("exchanges a PKCE code only from the exact callback URL", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    await expect(
      completeAuthCallback(
        client(exchangeCodeForSession),
        "schedulemasters://auth/callback?code=one-time-code",
        getEmailRedirectTo("native"),
      ),
    ).resolves.toBe("completed");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
  });

  it("ignores a URL from another origin and never exchanges its code", async () => {
    const auth = client();
    await expect(
      completeAuthCallback(
        auth,
        "https://attacker.example/auth/callback?code=one-time-code",
        getEmailRedirectTo("native"),
      ),
    ).resolves.toBe("ignored");
    expect(auth.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("does not accept callbacks from a different local port", async () => {
    const auth = client();
    await expect(
      completeAuthCallback(
        auth,
        "http://localhost:8082/auth/callback?code=one-time-code",
        getEmailRedirectTo("web", "http://localhost:8081"),
      ),
    ).resolves.toBe("ignored");
    expect(auth.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("fails closed when confirmation has an error or no code", async () => {
    const auth = client();
    const redirect = getEmailRedirectTo("web", "http://localhost:8081");
    await expect(
      completeAuthCallback(
        auth,
        "http://localhost:8081/auth/callback?error=access_denied",
        redirect,
      ),
    ).resolves.toBe("failed");
    await expect(completeAuthCallback(auth, redirect, redirect)).resolves.toBe(
      "failed",
    );
  });
});
