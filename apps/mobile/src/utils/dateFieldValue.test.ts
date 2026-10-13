import { describe, expect, it } from "vitest";

import {
  formatDateFieldValue,
  serializeDateFieldValue,
} from "./dateFieldValue";

describe("formatDateFieldValue", () => {
  it("serializes local calendar dates without shifting a timezone day", () => {
    expect(serializeDateFieldValue(new Date(2026, 9, 13, 23))).toBe(
      "2026-10-13",
    );
  });

  it("formats a stable calendar date in each supported locale", () => {
    const value = "2026-10-13";
    const labels = ["ru", "cz", "en"].map((locale) =>
      formatDateFieldValue(value, locale as "ru" | "cz" | "en"),
    );

    expect(labels.every((label) => label !== value)).toBe(true);
    expect(new Set(labels).size).toBe(3);
    expect(labels.every((label) => label.includes("13"))).toBe(true);
  });

  it("leaves non-ISO date values unchanged", () => {
    expect(formatDateFieldValue("", "en")).toBe("");
  });
});
