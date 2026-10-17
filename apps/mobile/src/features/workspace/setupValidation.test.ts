import { describe, expect, it } from "vitest";

import { createDefaultOnboardingDraft } from "./setupTypes";
import { validateSetupStep, validateSetupValues } from "./setupValidation";

const validValues = {
  name: "Anna Nails",
  price: "700",
  serviceName: "Gel manicure",
  slug: "anna-nails",
  duration: "60",
  bookingIntervalMinutes: 30 as const,
  workingDays: [1, 2, 3, 4, 5],
  startTime: "08:00",
  endTime: "21:00",
};

describe("validateSetupValues", () => {
  it("accepts a complete setup", () => {
    expect(validateSetupValues(validValues)).toBeNull();
  });

  it.each([
    ["missing name", { ...validValues, name: "" }],
    ["missing slug", { ...validValues, slug: "" }],
    ["missing service", { ...validValues, serviceName: "" }],
  ])("requires %s", (_label, values) => {
    expect(validateSetupValues(values)).toBe("required");
  });

  it("rejects an invalid slug", () => {
    expect(validateSetupValues({ ...validValues, slug: "Anna Nails" })).toBe(
      "slug",
    );
  });

  it.each(["", "not-a-number", "-1"])("rejects invalid price %s", (price) => {
    expect(validateSetupValues({ ...validValues, price })).toBe("price");
  });

  it.each(["", "30.5", "0", "1441"])(
    "rejects invalid duration %s",
    (duration) => {
      expect(validateSetupValues({ ...validValues, duration })).toBe(
        "duration",
      );
    },
  );

  it("requires at least one working day", () => {
    expect(validateSetupValues({ ...validValues, workingDays: [] })).toBe(
      "workingDays",
    );
  });

  it.each([
    ["invalid start", { startTime: "8:00" }],
    ["invalid end", { endTime: "25:00" }],
    ["end before start", { startTime: "21:00", endTime: "08:00" }],
  ])("rejects %s", (_label, values) => {
    expect(validateSetupValues({ ...validValues, ...values })).toBe("schedule");
  });
});

describe("validateSetupStep", () => {
  it("validates only the fields owned by the current step", () => {
    expect(
      validateSetupStep({ ...validValues, serviceName: "" }, 1),
    ).toBeNull();
    expect(validateSetupStep({ ...validValues, serviceName: "" }, 2)).toBe(
      "required",
    );
    expect(
      validateSetupStep(
        { ...validValues, startTime: "21:00", endTime: "08:00" },
        3,
      ),
    ).toBe("schedule");
  });
});

describe("onboarding booking interval", () => {
  const draft = createDefaultOnboardingDraft("en");

  it("defaults the booking start interval to 30 minutes", () => {
    expect(draft.bookingIntervalMinutes).toBe(30);
    expect(validateSetupStep(draft, 2)).toBeNull();
  });

  it("rejects unsupported booking start intervals", () => {
    expect(
      validateSetupStep({ ...draft, bookingIntervalMinutes: 45 as 30 }, 2),
    ).toBe("bookingInterval");
  });
});
