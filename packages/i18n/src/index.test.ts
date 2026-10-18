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
  getIntlLocale,
  localeLabels,
  resolveLocale,
  supportedLocales,
  translate,
  translationKeys,
} from "./index";

describe("locale resolution", () => {
  it("shows languages in the requested order using standard language labels", () => {
    expect(supportedLocales).toEqual(["en", "cz", "sk", "ru", "uk"]);
    expect(localeLabels).toEqual({
      en: "EN",
      cz: "CZ",
      sk: "SK",
      ru: "RU",
      uk: "UA",
    });
  });

  it("normalizes supported language and region tags", () => {
    expect(resolveLocale("ru-RU")).toBe("ru");
    expect(resolveLocale("cs-CZ")).toBe("cz");
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("sk-SK")).toBe("sk");
    expect(resolveLocale("uk-UA")).toBe("uk");
    expect(resolveLocale("sk_sk")).toBe("sk");
    expect(resolveLocale("uk_ua")).toBe("uk");
    expect(detectLocale("sk-SK")).toBe("sk");
    expect(detectLocale("uk-UA")).toBe("uk");
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
    expect(translate("sk", "common.language")).toBe("Jazyk");
    expect(translate("uk", "common.language")).toBe("Мова");
  });

  it("uses the correct action prompt for each authentication mode", () => {
    expect(translate("cz", "auth.signInPrompt")).toBe(
      "Už máte účet? Přihlaste se",
    );
    expect(translate("cz", "auth.signUpPrompt")).toBe(
      "Nemáte účet? Zaregistrujte se",
    );
  });

  it.each(["sk", "uk"] as const)(
    "keeps every message and interpolation for %s",
    (locale) => {
      for (const key of translationKeys) {
        const translated = translate(locale, key);
        const source = translate("en", key);
        const placeholders = (value: string) =>
          [...value.matchAll(/\{[^}]+\}/g)]
            .map(([placeholder]) => placeholder)
            .sort();

        expect(translated.trim(), `${locale}: ${key}`).not.toBe("");
        expect(placeholders(translated), `${locale}: ${key}`).toEqual(
          placeholders(source),
        );
      }
    },
  );

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

  it("uses Slovak and Ukrainian Intl locales for dates and currency", () => {
    expect(getIntlLocale("sk")).toBe("sk-SK");
    expect(getIntlLocale("uk")).toBe("uk-UA");
    expect(formatDate(date, "sk")).toContain("2026");
    expect(formatDate(date, "uk")).toContain("2026");
    expect(formatCurrency(149, "sk")).toContain("149");
    expect(formatCurrency(149, "uk")).toContain("149");
  });
});

describe("compact date formatting", () => {
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

  it("uses abbreviated Czech month names in cross-year ranges", () => {
    const result = formatCompactDateRange(
      new Date("2026-10-15T12:00:00.000Z"),
      new Date("2027-01-12T12:00:00.000Z"),
      "cz",
      { timeZone: "Europe/Prague" },
    );

    expect(result).toBe("15. říj 2026 – 12. led 2027");
  });

  it("includes the year at both ends of a same-year range", () => {
    const result = formatCompactDateRange(
      new Date("2026-10-13T12:00:00.000Z"),
      new Date("2026-10-20T12:00:00.000Z"),
      "en",
      { timeZone: "Europe/Prague" },
    );

    expect(result).toBe("Oct 13, 2026 – Oct 20, 2026");
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
