import { describe, expect, it } from "vitest";

import { isEmailConfirmationRequired } from "./emailConfirmation";

describe("isEmailConfirmationRequired", () => {
  it("recognizes Supabase email confirmation errors by code", () => {
    expect(
      isEmailConfirmationRequired({
        code: "email_not_confirmed",
        message: "Email not confirmed",
      }),
    ).toBe(true);
  });

  it("recognizes confirmation errors by message", () => {
    expect(
      isEmailConfirmationRequired({ message: "Email is not confirmed" }),
    ).toBe(true);
  });

  it("does not classify invalid credentials as confirmation errors", () => {
    expect(
      isEmailConfirmationRequired({
        code: "invalid_credentials",
        message: "Invalid login credentials",
      }),
    ).toBe(false);
  });
});
