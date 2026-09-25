import type { MessageKey } from "@schedule-app/i18n";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type {
  OnboardingDraft,
  SetupTranslator,
} from "../../features/workspace/setupTypes";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";

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

type ScheduleStepProps = {
  readonly draft: OnboardingDraft;
  readonly errorKey?: MessageKey;
  readonly onChange: (patch: Partial<OnboardingDraft>) => void;
  readonly t: SetupTranslator;
};

export function ScheduleStep({
  draft,
  errorKey,
  onChange,
  t,
}: ScheduleStepProps) {
  return (
    <View style={styles.content}>
      <Text style={styles.stepTitle}>{t("workspace.setupStepSchedule")}</Text>
      <Text style={styles.stepDescription}>
        {t("workspace.setupStepScheduleDescription")}
      </Text>
      <Text style={styles.sectionLabel}>{t("workspace.workingDaysLabel")}</Text>
      <ScrollView contentContainerStyle={styles.dayList} horizontal>
        {dayOptions.map((day) => {
          const selected = draft.workingDays.includes(day.value);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={day.value}
              onPress={() => {
                const workingDays = selected
                  ? draft.workingDays.filter((value) => value !== day.value)
                  : [...draft.workingDays, day.value].sort((a, b) => a - b);
                onChange({ workingDays });
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
      {errorKey === "workspace.workingDaysInvalid" && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(errorKey)}
        </Text>
      )}
      <Text style={styles.label}>{t("workspace.startTimeLabel")} *</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        onChangeText={(value) => onChange({ startTime: value })}
        placeholder="08:00"
        style={styles.input}
        value={draft.startTime}
      />
      <Text style={styles.label}>{t("workspace.endTimeLabel")} *</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        onChangeText={(value) => onChange({ endTime: value })}
        placeholder="21:00"
        style={styles.input}
        value={draft.endTime}
      />
      {errorKey === "workspace.scheduleInvalid" && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(errorKey)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    gap: 16,
    padding: 20,
  },
  dayButton: {
    alignItems: "center",
    borderColor: colors.borderSubtle,
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
  dayList: { gap: 8 },
  error: { ...typography.caption, color: colors.danger },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    fontSize: typography.body.fontSize,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  label: {
    ...typography.label,
    color: colors.primaryText,
    marginBottom: -8,
  },
  sectionLabel: { ...typography.label, color: colors.primaryText },
  stepDescription: { ...typography.body, color: colors.secondaryText },
  stepTitle: { ...typography.editorialSection, color: colors.primaryText },
});
