import { describe, expect, it } from "vitest";

import { getSetupErrorMessageKey } from "./setupErrorMessage";

describe("getSetupErrorMessageKey", () => {
  it("maps known bootstrap validation errors", () => {
    expect(
      getSetupErrorMessageKey({ message: "Booking slug is invalid" }),
    ).toBe("workspace.setupInvalidSlug");
    expect(
      getSetupErrorMessageKey({ message: "Service duration is invalid" }),
    ).toBe("workspace.setupInvalidService");
  });

  it("hides unknown provider errors behind a safe message", () => {
    expect(
      getSetupErrorMessageKey({ message: "duplicate key in internal table" }),
    ).toBe("workspace.setupFailed");
  });
});
