import {
  createTranslator,
  type MessageKey,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { getSetupErrorMessageKey } from "../features/workspace/setupErrorMessage";
import { validateSetupValues } from "../features/workspace/setupValidation";
import { analytics, analyticsEvents } from "../lib/analytics";
import { supabase } from "../lib/supabase";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { normalizeBookingSlug } from "../utils/slug";

type SetupScreenProps = {
  readonly locale: SupportedLocale;
  readonly onComplete: () => void;
};

const dayOptions: ReadonlyArray<{
  readonly key: MessageKey;
  readonly value: number;
}> = [
  { key: "workspace.dayMonday", value: 1 },
  { key: "workspace.dayTuesday", value: 2 },
  { key: "workspace.dayWednesday", value: 3 },
  { key: "workspace.dayThursday", value: 4 },
  { key: "workspace.dayFriday", value: 5 },
  { key: "workspace.daySaturday", value: 6 },
  { key: "workspace.daySunday", value: 7 },
];

const inlineMessageKeys: ReadonlyArray<MessageKey> = [
  "workspace.setupInvalidSlug",
  "workspace.priceInvalid",
  "workspace.durationInvalid",
  "workspace.workingDaysInvalid",
  "workspace.scheduleInvalid",
];

export function SetupScreen({ locale, onComplete }: SetupScreenProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [serviceName, setServiceName] = useState(() =>
    locale === "cz" ? "Manikúra" : locale === "ru" ? "Маникюр" : "Gel manicure",
  );
  const [price, setPrice] = useState("700");
  const [duration, setDuration] = useState("60");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("21:00");
  const [workingDays, setWorkingDays] = useState<ReadonlyArray<number>>([
    1, 2, 3, 4, 5, 6, 7,
  ]);
  const [busy, setBusy] = useState(false);
  const [messageKey, setMessageKey] = useState<MessageKey>();
  const t = createTranslator(locale);
  const hasInlineMessage = messageKey
    ? inlineMessageKeys.includes(messageKey)
    : false;

  async function submit() {
    const normalizedSlug = normalizeBookingSlug(slug);
    const validationError = validateSetupValues({
      name,
      price,
      serviceName,
      slug: normalizedSlug,
      duration,
      workingDays,
      startTime,
      endTime,
    });
    if (validationError) {
      const validationMessages: Record<
        NonNullable<typeof validationError>,
        MessageKey
      > = {
        required: "workspace.setupRequiredFields",
        slug: "workspace.setupInvalidSlug",
        price: "workspace.priceInvalid",
        duration: "workspace.durationInvalid",
        workingDays: "workspace.workingDaysInvalid",
        schedule: "workspace.scheduleInvalid",
      };
      setMessageKey(validationMessages[validationError]);
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
        p_name: name.trim(),
        p_slug: normalizedSlug,
        p_locale: locale,
        p_service_name: serviceName.trim(),
        p_duration_minutes: Number(duration),
        p_price_amount: Number(price),
        p_start_local_time: startTime.trim(),
        p_end_local_time: endTime.trim(),
        p_working_days: [...workingDays],
      });
      if (error) {
        setMessageKey(getSetupErrorMessageKey(error));
        return;
      }
      analytics.track(analyticsEvents.workspaceSetupCompleted, {
        locale,
      });
      onComplete();
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>{t("workspace.setupEyebrow")}</Text>
      <Text style={styles.title}>{t("workspace.setupTitle")}</Text>
      <Text style={styles.muted}>{t("workspace.setupDescription")}</Text>
      <Text style={styles.label}>{t("workspace.namePlaceholder")} *</Text>
      <TextInput
        onChangeText={(value) => {
          setName(value);
          setMessageKey(undefined);
        }}
        placeholder={t("workspace.namePlaceholder")}
        style={styles.input}
        value={name}
      />
      <Text style={styles.label}>{t("workspace.slugPlaceholder")} *</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={(value) => {
          setSlug(normalizeBookingSlug(value));
          setMessageKey(undefined);
        }}
        placeholder={t("workspace.slugPlaceholder")}
        style={styles.input}
        value={slug}
      />
      {messageKey === "workspace.setupInvalidSlug" && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(messageKey)}
        </Text>
      )}
      <Text style={styles.label}>{t("workspace.servicePlaceholder")} *</Text>
      <TextInput
        onChangeText={(value) => {
          setServiceName(value);
          setMessageKey(undefined);
        }}
        placeholder={t("workspace.servicePlaceholder")}
        style={styles.input}
        value={serviceName}
      />
      <Text style={styles.label}>{t("workspace.pricePlaceholder")} *</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => {
          setPrice(value);
          setMessageKey(undefined);
        }}
        placeholder={t("workspace.pricePlaceholder")}
        style={styles.input}
        value={price}
      />
      {messageKey === "workspace.priceInvalid" && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(messageKey)}
        </Text>
      )}
      <Text style={styles.label}>{t("workspace.durationPlaceholder")} *</Text>
      <TextInput
        keyboardType="number-pad"
        onChangeText={(value) => {
          setDuration(value);
          setMessageKey(undefined);
        }}
        placeholder={t("workspace.durationPlaceholder")}
        style={styles.input}
        value={duration}
      />
      {messageKey === "workspace.durationInvalid" && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(messageKey)}
        </Text>
      )}
      <Text style={styles.sectionLabel}>{t("workspace.workingDaysLabel")}</Text>
      <ScrollView contentContainerStyle={styles.dayList} horizontal>
        {dayOptions.map((day) => {
          const selected = workingDays.includes(day.value);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={day.value}
              onPress={() => {
                setWorkingDays((current) =>
                  current.includes(day.value)
                    ? current.filter((value) => value !== day.value)
                    : [...current, day.value].sort((a, b) => a - b),
                );
                setMessageKey(undefined);
              }}
              style={[styles.dayButton, selected && styles.dayButtonSelected]}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  selected && styles.dayButtonTextSelected,
                ]}
              >
                {t(day.key)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {messageKey === "workspace.workingDaysInvalid" && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(messageKey)}
        </Text>
      )}
      <Text style={styles.label}>{t("workspace.startTimeLabel")} *</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        onChangeText={(value) => {
          setStartTime(value);
          setMessageKey(undefined);
        }}
        placeholder="08:00"
        style={styles.input}
        value={startTime}
      />
      <Text style={styles.label}>{t("workspace.endTimeLabel")} *</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        onChangeText={(value) => {
          setEndTime(value);
          setMessageKey(undefined);
        }}
        placeholder="21:00"
        style={styles.input}
        value={endTime}
      />
      {messageKey === "workspace.scheduleInvalid" && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(messageKey)}
        </Text>
      )}
      {messageKey && !hasInlineMessage && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(messageKey)}
        </Text>
      )}
      <Pressable
        disabled={busy}
        onPress={() => void submit()}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>
          {busy ? t("workspace.setupSaving") : t("workspace.setupSave")}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    gap: 16,
    justifyContent: "center",
    minHeight: "100%",
    padding: 16,
  },
  eyebrow: {
    color: colors.accent,
    marginBottom: 8,
    ...typography.eyebrow,
  },
  title: { ...typography.heading, color: colors.primaryText },
  muted: { ...typography.body, color: colors.secondaryText, marginTop: 4 },
  label: {
    ...typography.label,
    color: colors.primaryText,
    marginBottom: -8,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.primaryText,
    marginTop: 4,
  },
  dayList: { gap: 8 },
  dayButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  dayButtonSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayButtonText: { ...typography.label, color: colors.primaryText },
  dayButtonTextSelected: { color: colors.inverse },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    fontSize: typography.body.fontSize,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  error: { ...typography.caption, color: colors.danger },
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
});
