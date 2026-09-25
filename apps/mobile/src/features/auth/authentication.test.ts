import type { Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { type AuthenticationClient, authenticate } from "./authentication";

const session = { access_token: "test-token" } as Session;

function createClient(overrides: Partial<AuthenticationClient["auth"]> = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session },
        error: null,
      }),
      signUp: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      ...overrides,
    },
  } satisfies AuthenticationClient;
}

describe("authenticate", () => {
  it("does not send invalid credentials to Supabase", async () => {
    const client = createClient();

    const result = await authenticate(client, "signUp", {
      email: "not-an-email",
      password: "short",
    });

    expect(result).toEqual({
      fields: ["email", "password"],
      kind: "validationError",
    });
    expect(client.auth.signUp).not.toHaveBeenCalled();
  });

  it("returns an authenticated result after sign in", async () => {
    const client = createClient();

    await expect(
      authenticate(client, "signIn", {
        email: " master@example.com ",
        password: "secure-password",
      }),
    ).resolves.toEqual({ kind: "authenticated", session });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "master@example.com",
      password: "secure-password",
    });
  });

  it("requires confirmation when sign up creates no session", async () => {
    const client = createClient();

    await expect(
      authenticate(client, "signUp", {
        email: "master@example.com",
        password: "secure-password",
      }),
    ).resolves.toEqual({ kind: "confirmationRequired" });
  });

  it("keeps a request error separate from validation", async () => {
    const client = createClient({
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: null },
        error: { code: "invalid_credentials", message: "Invalid login" },
      }),
    });

    await expect(
      authenticate(client, "signIn", {
        email: "master@example.com",
        password: "secure-password",
      }),
    ).resolves.toEqual({
      error: { code: "invalid_credentials", message: "Invalid login" },
      kind: "requestError",
    });
  });

  it("returns a safe request error when the authentication client rejects", async () => {
    const client = createClient({
      signInWithPassword: vi.fn().mockRejectedValue(new Error("Network down")),
    });

    await expect(
      authenticate(client, "signIn", {
        email: "master@example.com",
        password: "secure-password",
      }),
    ).resolves.toEqual({
      error: { message: "Authentication request failed" },
      kind: "requestError",
    });
  });
});
