"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createTranslator,
  detectLocale,
  localeLabels,
  supportedLocales,
  type SupportedLocale,
} from "@schedule-app/i18n";

const localeStorageKey = "schedule-app-locale";

export default function HomePage() {
  const [locale, setLocale] = useState<SupportedLocale>(() => {
    if (typeof window === "undefined") {
      return detectLocale();
    }

    return detectLocale(
      window.localStorage.getItem(localeStorageKey) ?? navigator.language,
    );
  });
  const t = useMemo(() => createTranslator(locale), [locale]);

  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, locale);
    document.documentElement.lang = locale === "cz" ? "cs" : locale;
  }, [locale]);

  return (
    <main className="page">
      <h1>{t("common.appName")}</h1>
      <p>{t("booking.description")}</p>
      <div
        aria-label={t("common.language")}
        className="language-picker"
        role="radiogroup"
      >
        {supportedLocales.map((item) => (
          <button
            aria-checked={item === locale}
            className={
              item === locale ? "language-button selected" : "language-button"
            }
            key={item}
            onClick={() => setLocale(item)}
            role="radio"
            type="button"
          >
            {localeLabels[item]}
          </button>
        ))}
      </div>
    </main>
  );
}
