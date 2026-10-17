import type { MessageKey } from "@schedule-app/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  type BookingIntervalMinutes,
  bookingIntervalOptions,
} from "../features/workspace/bookingInterval";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

type BookingIntervalFieldProps = {
  readonly label: string;
  readonly onChange: (value: BookingIntervalMinutes) => void;
  readonly t: (key: MessageKey) => string;
  readonly value: BookingIntervalMinutes;
};

const optionLabels: Record<BookingIntervalMinutes, MessageKey> = {
  15: "workspace.bookingInterval15",
  30: "workspace.bookingInterval30",
  60: "workspace.bookingInterval60",
};

export function BookingIntervalField({
  label,
  onChange,
  t,
  value,
}: BookingIntervalFieldProps) {
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  help: { ...typography.caption, color: colors.secondaryText },
  label: { ...typography.label, color: colors.primaryText },
  option: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
  },
  optionSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  options: { flexDirection: "row", gap: 8 },
  optionText: { ...typography.label, color: colors.primaryText },
  optionTextSelected: { color: colors.accent, fontWeight: "700" },
});
