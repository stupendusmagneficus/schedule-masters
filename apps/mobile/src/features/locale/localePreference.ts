import {
  defaultLocale,
  type SupportedLocale,
  supportedLocales,
} from "@schedule-app/i18n";
import { platformStorage } from "../../lib/platformStorage";

export const localePreferenceStorageKey = "schedule-masters.locale";

type LocalePreferenceStorage = {
  readonly getItem: (key: string) => string | null | Promise<string | null>;
  readonly setItem: (key: string, value: string) => void | Promise<void>;
};

export async function loadLocalePreference(
  storage: LocalePreferenceStorage = platformStorage,
): Promise<SupportedLocale> {
  try {
    const value = await storage.getItem(localePreferenceStorageKey);
    if (value && supportedLocales.includes(value as SupportedLocale)) {
      return value as SupportedLocale;
    }
  } catch {
    // A storage failure should not prevent the app from opening.
  }

  return defaultLocale;
}

export async function saveLocalePreference(
  locale: SupportedLocale,
  storage: LocalePreferenceStorage = platformStorage,
): Promise<void> {
  try {
    await storage.setItem(localePreferenceStorageKey, locale);
  } catch {
    // Keep the in-memory selection even when persistence is unavailable.
  }
}
