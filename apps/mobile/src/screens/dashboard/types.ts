import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";

export type Translate = (key: MessageKey) => string;

export type DashboardTabProps = {
  readonly locale: SupportedLocale;
  readonly t: Translate;
};
