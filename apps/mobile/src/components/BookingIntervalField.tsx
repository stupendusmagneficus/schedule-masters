import {
  formatDuration,
  type MessageKey,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  type BookingIntervalMinutes,
  bookingIntervalOptions,
} from "../features/workspace/bookingInterval";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

type BookingIntervalFieldProps = {
  readonly label: string;
  readonly locale: SupportedLocale;
  readonly onChange: (value: BookingIntervalMinutes) => void;
  readonly t: (key: MessageKey) => string;
  readonly value: BookingIntervalMinutes;
};

const optionLabels: Record<BookingIntervalMinutes, MessageKey> = {
  15: "workspace.bookingInterval15",
  30: "workspace.bookingInterval30",
  45: "workspace.bookingInterval45",
  60: "workspace.bookingInterval60",
  90: "workspace.bookingInterval90",
};

export function BookingIntervalField({
  label,
  locale,
  onChange,
  t,
  value,
}: BookingIntervalFieldProps) {
  const [customValue, setCustomValue] = useState(String(value));
  const customSelected = !bookingIntervalOptions.includes(
    value as (typeof bookingIntervalOptions)[number],
  );

  useEffect(() => {
    setCustomValue(String(value));
  }, [value]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.help}>{t("workspace.bookingIntervalHelp")}</Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {bookingIntervalOptions.map((interval) => {
          const selected = value === interval;
          return (
            <Pressable
              accessibilityLabel={t(optionLabels[interval])}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={interval}
              onPress={() => onChange(interval)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}
              >
                {t(optionLabels[interval])}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityLabel={t("workspace.bookingIntervalCustom")}
          accessibilityRole="radio"
          accessibilityState={{ checked: customSelected }}
          onPress={() => {
            const initialValue = customSelected ? value : 5;
            setCustomValue(String(initialValue));
            onChange(initialValue);
          }}
          style={[styles.option, customSelected && styles.optionSelected]}
        >
          <Text
            style={[
              styles.optionText,
              customSelected && styles.optionTextSelected,
            ]}
          >
            {t("workspace.bookingIntervalCustom")}
          </Text>
        </Pressable>
      </View>
      {customSelected && (
        <View style={styles.customField}>
          <TextInput
            accessibilityLabel={t("workspace.bookingIntervalCustomLabel")}
            keyboardType="number-pad"
            onChangeText={(text) => {
              setCustomValue(text.replace(/\D/g, ""));
              onChange(text ? Number(text) : 0);
            }}
            placeholder={t("workspace.bookingIntervalCustomPlaceholder")}
            style={styles.customInput}
            value={customValue}
          />
          <Text style={styles.help}>
            {t("workspace.bookingIntervalCustomHelp")}
          </Text>
          <Text style={styles.preview}>
            {t("workspace.bookingIntervalPreview").replace(
              "{duration}",
              formatDuration(value, locale),
            )}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  customField: { gap: 4 },
  customInput: {
    ...typography.body,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.primaryText,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  help: { ...typography.caption, color: colors.secondaryText },
  label: { ...typography.label, color: colors.primaryText },
  preview: { ...typography.label, color: colors.primaryText },
  option: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    minWidth: 76,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
  },
  optionSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionText: { ...typography.label, color: colors.primaryText },
  optionTextSelected: { color: colors.accent, fontWeight: "700" },
});
