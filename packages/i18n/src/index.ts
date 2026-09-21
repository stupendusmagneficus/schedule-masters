export const supportedLocales = ["ru", "cz", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
