import { describe, expect, it } from "vitest";

import { getVisibleAuthFieldErrors } from "./fieldValidation";

const untouched = { email: false, password: false };

describe("getVisibleAuthFieldErrors", () => {
  it("does not show validation errors before a field is touched", () => {
    expect(
      getVisibleAuthFieldErrors(
        { email: "not-an-email", password: "short" },
        untouched,
      ),
    ).toEqual([]);
  });

  it("shows an error after the invalid field loses focus", () => {
    expect(
      getVisibleAuthFieldErrors(
        { email: "not-an-email", password: "secure-password" },
        { email: true, password: false },
      ),
    ).toEqual(["email"]);
  });

  it("removes an error immediately when a touched field becomes valid", () => {
    const touched = { email: true, password: true };

    expect(
      getVisibleAuthFieldErrors(
        { email: "not-an-email", password: "short" },
        touched,
      ),
    ).toEqual(["email", "password"]);
    expect(
      getVisibleAuthFieldErrors(
        { email: "master@example.com", password: "secure-password" },
        touched,
      ),
    ).toEqual([]);
  });
});
