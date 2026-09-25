import { describe, expect, it } from "vitest";

import { getSetupErrorMessageKey } from "./setupErrorMessage";

describe("getSetupErrorMessageKey", () => {
  it("maps known bootstrap validation errors", () => {
    expect(
      getSetupErrorMessageKey({ message: "Booking slug is invalid" }),
    ).toBe("workspace.setupInvalidSlug");
    expect(
      getSetupErrorMessageKey({ message: "Service duration is invalid" }),
    ).toBe("workspace.durationInvalid");
  });

  it("maps schedule errors", () => {
    expect(
      getSetupErrorMessageKey({
        message: "Working day end must be after start",
      }),
    ).toBe("workspace.scheduleInvalid");
    expect(
      getSetupErrorMessageKey({
        message: "At least one working day is required",
      }),
    ).toBe("workspace.workingDaysInvalid");
  });

  it("hides unknown provider errors behind a safe message", () => {
    expect(
      getSetupErrorMessageKey({ message: "duplicate key in internal table" }),
    ).toBe("workspace.setupFailed");
  });
});
