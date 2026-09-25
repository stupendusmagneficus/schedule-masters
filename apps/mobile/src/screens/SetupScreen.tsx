import {
  createTranslator,
  type MessageKey,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { mobileEnv } from "../config/env";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "../features/workspace/onboardingDraftStorage";
import {
  getSetupErrorMessageKey,
  getSetupValidationMessageKey,
} from "../features/workspace/setupErrorMessage";
import {
  createDefaultOnboardingDraft,
  type OnboardingDraft,
  type SetupStep,
} from "../features/workspace/setupTypes";
import {
  validateSetupStep,
  validateSetupValues,
} from "../features/workspace/setupValidation";
import { analytics, analyticsEvents } from "../lib/analytics";
import { supabase } from "../lib/supabase";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { buildBookingUrl } from "../utils/bookingUrl";
import { MasterInfoStep } from "./setup/MasterInfoStep";
import { ScheduleStep } from "./setup/ScheduleStep";
import { ServiceStep } from "./setup/ServiceStep";
import { SetupCompleteStep } from "./setup/SetupCompleteStep";

type SetupScreenProps = {
  readonly locale: SupportedLocale;
  readonly onComplete: () => void;
  readonly userId: string;
};

const inlineMessageKeys: ReadonlyArray<MessageKey> = [
  "workspace.setupInvalidSlug",
  "workspace.priceInvalid",
  "workspace.durationInvalid",
  "workspace.workingDaysInvalid",
  "workspace.scheduleInvalid",
  "workspace.setupInvalidService",
];

export function SetupScreen({ locale, onComplete, userId }: SetupScreenProps) {
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    createDefaultOnboardingDraft(locale),
  );
  const [step, setStep] = useState<SetupStep>(1);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [messageKey, setMessageKey] = useState<MessageKey>();
  const t = createTranslator(locale);

  useEffect(() => {
    let active = true;
    void loadOnboardingDraft(userId).then((stored) => {
      if (!active) return;
      if (stored) {
        setDraft(stored.draft);
        setStep(stored.step);
      }
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!hydrated || step === 4) return;
    void saveOnboardingDraft(userId, { draft, step });
  }, [draft, hydrated, step, userId]);

  function updateDraft(patch: Partial<OnboardingDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setMessageKey(undefined);
  }

  async function continueOnboarding() {
    if (step === 4) {
      onComplete();
      return;
    }

    const validationError = validateSetupStep(draft, step);
    if (validationError) {
      setMessageKey(getSetupValidationMessageKey(validationError));
      return;
    }

    if (step < 3) {
      setMessageKey(undefined);
      setStep((current) => (current + 1) as SetupStep);
      return;
    }

    await createWorkspace();
  }

  async function createWorkspace() {
    const validationError = validateSetupValues(draft);
    if (validationError) {
      setMessageKey(getSetupValidationMessageKey(validationError));
      return;
    }
    if (!supabase) {
      setMessageKey("workspace.setupFailed");
      return;
    }

    setBusy(true);
    setMessageKey(undefined);
    try {
      const { error } = await supabase.rpc("bootstrap_master_workspace", {
        p_name: draft.name.trim(),
        p_slug: draft.slug.trim(),
        p_locale: locale,
        p_service_name: draft.serviceName.trim(),
        p_duration_minutes: Number(draft.duration),
        p_price_amount: Number(draft.price),
        p_start_local_time: draft.startTime.trim(),
        p_end_local_time: draft.endTime.trim(),
        p_working_days: [...draft.workingDays],
      });
      if (error) {
        setMessageKey(getSetupErrorMessageKey(error));
        return;
      }
      await clearOnboardingDraft(userId);
      analytics.track(analyticsEvents.workspaceSetupCompleted, { locale });
      setStep(4);
    } catch (error) {
      setMessageKey(
        getSetupErrorMessageKey({
          message: error instanceof Error ? error.message : undefined,
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  const isInlineMessage = messageKey
    ? inlineMessageKeys.includes(messageKey)
    : false;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>{t("workspace.setupEyebrow")}</Text>
      <Text style={styles.title}>{t("workspace.setupTitle")}</Text>
      {step < 4 && (
        <Text style={styles.muted}>{t("workspace.setupDescription")}</Text>
      )}
      {step < 4 && (
        <ProgressIndicator step={step as Exclude<SetupStep, 4>} t={t} />
      )}
      {step === 1 && (
        <MasterInfoStep
          draft={draft}
          errorKey={messageKey}
          onChange={updateDraft}
          t={t}
        />
      )}
      {step === 2 && (
        <ServiceStep
          draft={draft}
          errorKey={messageKey}
          onChange={updateDraft}
          t={t}
        />
      )}
      {step === 3 && (
        <ScheduleStep
          draft={draft}
          errorKey={messageKey}
          onChange={updateDraft}
          t={t}
        />
      )}
      {step === 4 && (
        <SetupCompleteStep
          bookingWebUrl={mobileEnv.bookingWebUrl}
          draft={draft}
          onOpenBooking={() =>
            void Linking.openURL(
              buildBookingUrl(mobileEnv.bookingWebUrl, draft.slug),
            )
          }
          onOpenDashboard={onComplete}
          t={t}
        />
      )}
      {messageKey && !isInlineMessage && step < 4 && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(messageKey)}
        </Text>
      )}
      {step < 4 && (
        <StepActions
          busy={busy}
          canGoBack={step > 1}
          onBack={() => {
            setMessageKey(undefined);
            setStep((current) => (current - 1) as SetupStep);
          }}
          onNext={() => void continueOnboarding()}
          t={t}
          step={step as Exclude<SetupStep, 4>}
        />
      )}
    </ScrollView>
  );
}

function ProgressIndicator({
  step,
  t,
}: {
  readonly step: Exclude<SetupStep, 4>;
  readonly t: ReturnType<typeof createTranslator>;
}) {
  const labels: ReadonlyArray<MessageKey> = [
    "workspace.setupStepMaster",
    "workspace.setupStepService",
    "workspace.setupStepSchedule",
  ];
  return (
    <Text accessibilityRole="header" style={styles.progress}>
      {step}/3 · {t(labels[step - 1])}
    </Text>
  );
}

function StepActions({
  busy,
  canGoBack,
  onBack,
  onNext,
  step,
  t,
}: {
  readonly busy: boolean;
  readonly canGoBack: boolean;
  readonly onBack: () => void;
  readonly onNext: () => void;
  readonly step: Exclude<SetupStep, 4>;
  readonly t: ReturnType<typeof createTranslator>;
}) {
  return (
    <>
      <Pressable
        disabled={busy}
        onPress={onNext}
        style={[styles.primaryButton, busy && styles.disabledButton]}
      >
        <Text style={styles.primaryButtonText}>
          {busy
            ? t("workspace.setupSaving")
            : step === 3
              ? t("workspace.setupFinish")
              : t("workspace.setupNext")}
        </Text>
      </Pressable>
      {canGoBack && (
        <Pressable disabled={busy} onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{t("workspace.setupBack")}</Text>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: "center", minHeight: 44, justifyContent: "center" },
  backButtonText: {
    ...typography.label,
    color: colors.accent,
    fontWeight: "700",
  },
  container: {
    backgroundColor: colors.canvas,
    gap: 16,
    justifyContent: "center",
    minHeight: "100%",
    padding: 16,
  },
  disabledButton: { opacity: 0.6 },
  error: { ...typography.caption, color: colors.danger },
  eyebrow: { color: colors.accent, marginBottom: 8, ...typography.eyebrow },
  muted: { ...typography.body, color: colors.secondaryText, marginTop: 4 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    width: "100%",
  },
  primaryButtonText: {
    ...typography.label,
    color: colors.inverse,
    fontWeight: "700",
  },
  progress: {
    color: colors.accent,
    ...typography.label,
    fontWeight: "700",
  },
  title: { ...typography.heading, color: colors.primaryText },
});
