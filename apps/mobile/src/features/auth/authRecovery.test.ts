import { describe, expect, it, vi } from "vitest";
import { changeRecoveredPassword, requestAuthEmail } from "./authRecovery";

function client() {
  return {
    auth: {
      resend: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

describe("Auth recovery requests", () => {
  it("validates and trims email before requesting a recovery link", async () => {
    const api = client();
    expect(
      await requestAuthEmail(
        api,
        "recovery",
        "bad",
        "https://app.test/auth/callback",
      ),
    ).toBe("invalidEmail");
    expect(api.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(
      await requestAuthEmail(
        api,
        "recovery",
        " master@example.test ",
        "https://app.test/auth/callback",
      ),
    ).toBe("sent");
    expect(api.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "master@example.test",
      { redirectTo: "https://app.test/auth/callback" },
    );
  });
  it("resends signup confirmation with its redirect", async () => {
    const api = client();
    await requestAuthEmail(
      api,
      "confirmation",
      "master@example.test",
      "schedulemasters://auth/callback",
    );
    expect(api.auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "master@example.test",
      options: { emailRedirectTo: "schedulemasters://auth/callback" },
    });
  });
  it("never exposes account-specific errors", async () => {
    const api = client();
    for (const code of [
      "user_not_found",
      "email_not_confirmed",
      "over_email_send_rate_limit",
      "over_request_rate_limit",
    ]) {
      api.auth.resetPasswordForEmail.mockResolvedValueOnce({
        error: { code, status: 429 },
      });
      expect(
        await requestAuthEmail(
          api,
          "recovery",
          "unknown@example.test",
          "schedulemasters://auth/callback",
        ),
      ).toBe("sent");
    }
  });
  it("reports transport outages without provider details", async () => {
    const api = client();
    api.auth.resend.mockRejectedValueOnce(new Error("private diagnostic"));
    expect(
      await requestAuthEmail(
        api,
        "confirmation",
        "master@example.test",
        "schedulemasters://auth/callback",
      ),
    ).toBe("unavailable");
  });
  it("validates password and confirmation before updating", async () => {
    const api = client();
    expect(await changeRecoveredPassword(api, "short", "short")).toBe(
      "tooShort",
    );
    expect(
      await changeRecoveredPassword(api, "long-password", "different-password"),
    ).toBe("mismatch");
    expect(api.auth.updateUser).not.toHaveBeenCalled();
    expect(
      await changeRecoveredPassword(api, "long-password", "long-password"),
    ).toBe("saved");
    expect(api.auth.updateUser).toHaveBeenCalledWith({
      password: "long-password",
    });
  });
  it("handles expired sessions and reused passwords without leaking errors", async () => {
    const api = client();
    api.auth.updateUser.mockResolvedValueOnce({
      error: { code: "same_password" },
    });
    expect(
      await changeRecoveredPassword(api, "long-password", "long-password"),
    ).toBe("samePassword");
    api.auth.updateUser.mockRejectedValueOnce(new Error("private diagnostic"));
    expect(
      await changeRecoveredPassword(api, "long-password", "long-password"),
    ).toBe("failed");
  });
});
