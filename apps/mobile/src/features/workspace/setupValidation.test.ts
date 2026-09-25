import { describe, expect, it } from "vitest";

import { validateSetupValues } from "./setupValidation";

const validValues = {
  name: "Anna Nails",
  price: "700",
  serviceName: "Gel manicure",
  slug: "anna-nails",
  duration: "60",
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
