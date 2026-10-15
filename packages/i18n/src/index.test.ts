import { describe, expect, it } from "vitest";
import {
  defaultLocale,
  detectLocale,
  formatAccessibleDate,
  formatCompactDate,
  formatCompactDateRange,
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

  it("uses the correct action prompt for each authentication mode", () => {
    expect(translate("cz", "auth.signInPrompt")).toBe(
      "Už máte účet? Přihlaste se",
    );
    expect(translate("cz", "auth.signUpPrompt")).toBe(
      "Nemáte účet? Zaregistrujte se",
    );
  });

  it("gives an actionable Czech message when sign in fails", () => {
    expect(translate("cz", "auth.invalidCredentials")).toBe(
      "Přihlášení se nepodařilo. Zkontrolujte e-mail a heslo a zkuste to znovu.",
    );
  });

  it("formats dates, times, and Czech currency through Intl", () => {
    expect(formatDate(date, "en")).toContain("2026");
    expect(formatTime(date, "en")).toMatch(/\d/);
    expect(formatCurrency(149, "cz")).toContain("149");
  });
});

describe("compact date formatting", () => {
  const referenceDate = new Date("2026-10-15T12:00:00.000Z");

  it.each(["ru", "cz", "en"] as const)(
    "shows the day, full month, and year for %s",
    (locale) => {
      const result = formatCompactDate(
        new Date("2026-10-13T12:00:00.000Z"),
        locale,
        { timeZone: "Europe/Prague" },
      );

      expect(result).toMatch(/13/);
      expect(result).toContain("2026");
      expect(result).toBe(
        formatDate(new Date("2026-10-13T12:00:00.000Z"), locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Europe/Prague",
        }),
      );
    },
  );

  it.each(["ru", "cz", "en"] as const)(
    "includes the year for another year in %s",
    (locale) => {
      expect(
        formatCompactDate(new Date("2025-10-13T12:00:00.000Z"), locale, {
          timeZone: "Europe/Prague",
        }),
      ).toContain("2025");
    },
  );

  it("formats the date in the workspace timezone", () => {
    const result = formatCompactDate(
      new Date("2026-12-31T23:30:00.000Z"),
      "en",
      { timeZone: "Europe/Prague" },
    );

    expect(result).toContain("January 1, 2027");
  });

  it("shows years at both ends of a date range", () => {
    const result = formatCompactDateRange(
      new Date("2026-12-31T12:00:00.000Z"),
      new Date("2027-01-02T12:00:00.000Z"),
      "en",
      { timeZone: "Europe/Prague" },
    );

    expect(result).toContain("2026");
    expect(result).toContain("2027");
  });

  it("keeps a same-year range compact", () => {
    const result = formatCompactDateRange(
      new Date("2026-10-13T12:00:00.000Z"),
      new Date("2026-10-20T12:00:00.000Z"),
      "en",
      { referenceDate, timeZone: "Europe/Prague" },
    );

    expect(result).not.toContain("2026");
  });

  it("provides a full date label for assistive technology", () => {
    expect(
      formatAccessibleDate(
        new Date("2026-10-13T12:00:00.000Z"),
        "en",
        "Europe/Prague",
      ),
    ).toContain("2026");
  });
});
