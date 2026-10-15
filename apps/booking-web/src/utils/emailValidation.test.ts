import { describe, expect, it } from "vitest";
import { isValidBookingEmail } from "./emailValidation";

describe("public booking email validation", () => {
  it("requires a well-formed email address", () => {
    expect(isValidBookingEmail("client@example.test")).toBe(true);
    expect(isValidBookingEmail("  client@example.test  ")).toBe(true);
    expect(isValidBookingEmail("")).toBe(false);
    expect(isValidBookingEmail("client-at-example.test")).toBe(false);
  });

  it("rejects addresses longer than the database limit", () => {
    expect(isValidBookingEmail(`${"a".repeat(310)}@example.test`)).toBe(false);
  });
});
