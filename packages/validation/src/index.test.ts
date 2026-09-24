import { describe, expect, it } from "vitest";
import { masterAuthCredentialsSchema, supportedLocaleSchema } from "./index";

describe("validation scaffold", () => {
  it("accepts the supported product locales", () => {
    expect(supportedLocaleSchema.parse("cz")).toBe("cz");
  });

  it("normalizes valid master credentials", () => {
    expect(
      masterAuthCredentialsSchema.parse({
        email: "  master@example.com ",
        password: "secure-password",
      }),
    ).toEqual({ email: "master@example.com", password: "secure-password" });
  });

  it("rejects an invalid email and a short password", () => {
    expect(
      masterAuthCredentialsSchema.safeParse({
        email: "not-an-email",
        password: "short",
      }).success,
    ).toBe(false);
  });
});
