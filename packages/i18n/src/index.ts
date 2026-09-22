export const supportedLocales = ["ru", "cz", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const fallbackLocale: SupportedLocale = "en";

const intlLocales: Record<SupportedLocale, string> = {
  ru: "ru-RU",
  cz: "cs-CZ",
  en: "en-US",
};

export type MessageKey =
  | "common.appName"
  | "common.language"
  | "common.save"
  | "common.cancel"
  | "common.loading"
  | "common.error"
  | "mobile.description"
  | "booking.description"
  | "booking.chooseService"
  | "booking.chooseDate"
  | "booking.chooseTime"
  | "booking.yourDetails"
  | "booking.name"
  | "booking.email"
  | "booking.phone"
  | "booking.note"
  | "booking.confirm"
  | "booking.confirmed"
  | "booking.noSlots"
  | "booking.selectService"
  | "booking.selectTime"
  | "booking.required"
  | "booking.loadingSlots";

type Messages = Record<MessageKey, string>;

const messages: Record<SupportedLocale, Messages> = {
  ru: {
    "common.appName": "Schedule Masters",
    "common.language": "Язык",
    "common.save": "Сохранить",
    "common.cancel": "Отмена",
    "common.loading": "Загрузка…",
    "common.error": "Что-то пошло не так",
    "mobile.description": "Мобильное приложение мастера готово к работе.",
    "booking.description": "Страница онлайн-записи готова к работе.",
    "booking.chooseService": "Выберите услугу",
    "booking.chooseDate": "Выберите дату",
    "booking.chooseTime": "Выберите время",
    "booking.yourDetails": "Ваши данные",
    "booking.name": "Имя",
    "booking.email": "Email",
    "booking.phone": "Телефон",
    "booking.note": "Комментарий (необязательно)",
    "booking.confirm": "Подтвердить запись",
    "booking.confirmed": "Запись подтверждена",
    "booking.noSlots": "На эту дату нет свободного времени.",
    "booking.selectService": "Выберите услугу, чтобы увидеть свободное время.",
    "booking.selectTime": "Выберите свободное время.",
    "booking.required": "Заполните обязательные поля.",
    "booking.loadingSlots": "Проверяем свободное время…",
  },
  cz: {
    "common.appName": "Schedule Masters",
    "common.language": "Jazyk",
    "common.save": "Uložit",
    "common.cancel": "Zrušit",
    "common.loading": "Načítání…",
    "common.error": "Něco se pokazilo",
    "mobile.description": "Mobilní aplikace pro mistra je připravena.",
    "booking.description": "Stránka online rezervací je připravena.",
    "booking.chooseService": "Vyberte službu",
    "booking.chooseDate": "Vyberte datum",
    "booking.chooseTime": "Vyberte čas",
    "booking.yourDetails": "Vaše údaje",
    "booking.name": "Jméno",
    "booking.email": "E-mail",
    "booking.phone": "Telefon",
    "booking.note": "Poznámka (nepovinné)",
    "booking.confirm": "Potvrdit rezervaci",
    "booking.confirmed": "Rezervace potvrzena",
    "booking.noSlots": "Pro toto datum nejsou volné termíny.",
    "booking.selectService": "Vyberte službu a zobrazí se volné termíny.",
    "booking.selectTime": "Vyberte volný termín.",
    "booking.required": "Vyplňte povinná pole.",
    "booking.loadingSlots": "Kontrolujeme volné termíny…",
  },
  en: {
    "common.appName": "Schedule Masters",
    "common.language": "Language",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.loading": "Loading…",
    "common.error": "Something went wrong",
    "mobile.description": "The master mobile app is ready.",
    "booking.description": "The online booking page is ready.",
    "booking.chooseService": "Choose a service",
    "booking.chooseDate": "Choose a date",
    "booking.chooseTime": "Choose a time",
    "booking.yourDetails": "Your details",
    "booking.name": "Name",
    "booking.email": "Email",
    "booking.phone": "Phone",
    "booking.note": "Note (optional)",
    "booking.confirm": "Confirm booking",
    "booking.confirmed": "Booking confirmed",
    "booking.noSlots": "There are no available times on this date.",
    "booking.selectService": "Choose a service to see available times.",
    "booking.selectTime": "Choose an available time.",
    "booking.required": "Please complete the required fields.",
    "booking.loadingSlots": "Checking availability…",
  },
};

export function resolveLocale(
  value: string | null | undefined,
): SupportedLocale {
  const normalized = value?.trim().toLowerCase().replace("_", "-");

  if (!normalized) {
    return fallbackLocale;
  }

  if (normalized === "cz" || normalized.startsWith("cs-")) {
    return "cz";
  }

  if (normalized === "ru" || normalized.startsWith("ru-")) {
    return "ru";
  }

  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }

  return fallbackLocale;
}

export function detectLocale(value?: string | null): SupportedLocale {
  if (value) {
    return resolveLocale(value);
  }

  if (typeof Intl !== "undefined") {
    return resolveLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  }

  return fallbackLocale;
}

export function getIntlLocale(locale: SupportedLocale): string {
  return intlLocales[locale];
}

export function translate(locale: SupportedLocale, key: MessageKey): string {
  return messages[locale][key] ?? messages[fallbackLocale][key];
}

export function createTranslator(locale: SupportedLocale) {
  return (key: MessageKey) => translate(locale, key);
}

export function formatDate(
  value: Date | number,
  locale: SupportedLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(value);
}

export function formatTime(
  value: Date | number,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" },
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(value);
}

export function formatDateTime(
  value: Date | number,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  return formatDate(value, locale, options);
}

export function formatCurrency(
  value: number,
  locale: SupportedLocale,
  currency = "CZK",
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency,
  }).format(value);
}

export const localeLabels: Record<SupportedLocale, string> = {
  ru: "RU",
  cz: "CZ",
  en: "EN",
};
