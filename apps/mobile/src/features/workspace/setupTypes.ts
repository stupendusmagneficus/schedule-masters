import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";

export type SetupStep = 1 | 2 | 3 | 4;

export type OnboardingDraft = {
  readonly name: string;
  readonly slug: string;
  readonly serviceName: string;
  readonly price: string;
  readonly duration: string;
  readonly workingDays: ReadonlyArray<number>;
  readonly startTime: string;
  readonly endTime: string;
};

export type SetupTranslator = (key: MessageKey) => string;

export const onboardingDraftStorageKey = (userId: string) =>
  `schedule-masters:onboarding-draft:${userId}`;

export function createDefaultOnboardingDraft(
  locale: SupportedLocale,
): OnboardingDraft {
  return {
    name: "",
    slug: "",
    serviceName:
      locale === "cz"
        ? "Manikúra"
        : locale === "ru"
          ? "Маникюр"
          : "Gel manicure",
    price: "700",
    duration: "60",
    workingDays: [1, 2, 3, 4, 5, 6, 7],
    startTime: "08:00",
    endTime: "21:00",
  };
}
