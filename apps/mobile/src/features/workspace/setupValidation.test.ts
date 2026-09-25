import { describe, expect, it } from "vitest";

import { validateSetupValues } from "./setupValidation";

const validValues = {
  name: "Anna Nails",
  price: "700",
  serviceName: "Gel manicure",
  slug: "anna-nails",
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
});
