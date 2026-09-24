import { describe, expect, it } from "vitest";
import {
  defaultLocale,
  detectLocale,
  formatCurrency,
  formatDate,
  formatTime,
  resolveLocale,
  translate,
} from "./index";

describe("locale resolution", () => {
  it("normalizes supported language and region tags", () => {
    expect(resolveLocale("ru-RU")).toBe("ru");
    expect(resolveLocale("cs-CZ")).toBe("cz");
    expect(resolveLocale("en-US")).toBe("en");
  });

  it("uses English as the fallback locale", () => {
    expect(resolveLocale("de-DE")).toBe("en");
    expect(detectLocale("de-DE")).toBe("en");
  });

  it("uses Czech as the product default locale", () => {
    expect(defaultLocale).toBe("cz");
  });
});

describe("translations and formatting", () => {
  const date = new Date("2026-01-15T13:30:00.000Z");

  it("returns translated messages", () => {
    expect(translate("ru", "common.language")).toBe("Язык");
    expect(translate("cz", "common.language")).toBe("Jazyk");
    expect(translate("en", "common.language")).toBe("Language");
  });

  it("formats dates, times, and Czech currency through Intl", () => {
    expect(formatDate(date, "en")).toContain("2026");
    expect(formatTime(date, "en")).toMatch(/\d/);
    expect(formatCurrency(149, "cz")).toContain("149");
  });
});
