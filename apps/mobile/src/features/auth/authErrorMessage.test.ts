import { describe, expect, it } from "vitest";

import { getAuthErrorMessageKey } from "./authErrorMessage";

describe("getAuthErrorMessageKey", () => {
  it("maps known Supabase errors to safe localized messages", () => {
    expect(
      getAuthErrorMessageKey({
        code: "invalid_credentials",
        message: "Invalid login credentials",
      }),
    ).toBe("auth.invalidCredentials");
  });

  it("maps unconfirmed accounts to a recovery message", () => {
    expect(
      getAuthErrorMessageKey({
        code: "email_not_confirmed",
        message: "Email not confirmed",
      }),
    ).toBe("auth.emailNotConfirmed");
  });

  it("maps transport failures without displaying their raw message", () => {
    expect(
      getAuthErrorMessageKey({ message: "TypeError: Network request failed" }),
    ).toBe("auth.networkError");
  });
});
