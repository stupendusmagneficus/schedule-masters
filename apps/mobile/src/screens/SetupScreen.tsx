import {
  createTranslator,
  type MessageKey,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActionButton } from "../components/ActionButton";
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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{t("workspace.setupEyebrow")}</Text>
        <Text style={styles.title}>
          {t(
            step === 4
              ? "workspace.setupCompleteTitle"
              : "workspace.setupTitle",
          )}
        </Text>
        {step < 4 && (
          <Text style={styles.description}>
            {t("workspace.setupDescription")}
          </Text>
        )}
        {step < 4 && (
          <ProgressIndicator step={step as Exclude<SetupStep, 4>} t={t} />
        )}
      </View>
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
    <View style={styles.progressPill}>
      <Text accessibilityRole="header" style={styles.progress}>
        {step}/3 · {t(labels[step - 1])}
      </Text>
    </View>
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
      <ActionButton
        disabled={busy}
        label={
          step === 3 ? t("workspace.setupFinish") : t("workspace.setupNext")
        }
        loading={busy}
        loadingLabel={t("workspace.setupSaving")}
        onPress={onNext}
        style={styles.actionButton}
        variant="primary"
      />
      {canGoBack && (
        <ActionButton
          disabled={busy}
          label={t("workspace.setupBack")}
          onPress={onBack}
          size="compact"
          style={styles.actionButton}
          variant="quiet"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    gap: 18,
    justifyContent: "center",
    minHeight: "100%",
    padding: 20,
  },
  error: { ...typography.caption, color: colors.danger },
  description: { ...typography.body, color: colors.secondaryText },
  eyebrow: { color: colors.accent, ...typography.eyebrow },
  header: { gap: 12, paddingHorizontal: 4 },
  actionButton: { width: "100%" },
  progress: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: "700",
  },
  progressPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  title: { ...typography.display, color: colors.primaryText },
});
