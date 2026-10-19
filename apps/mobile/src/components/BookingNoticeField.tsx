import type { MessageKey } from "@schedule-app/i18n";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

const noticeOptions = [0, 60, 120, 240, 720, 1440] as const;
const noticeLabels: Record<(typeof noticeOptions)[number], MessageKey> = {
  0: "workspace.bookingNoticeNoLimit",
  60: "workspace.bookingNotice1Hour",
  120: "workspace.bookingNotice2Hours",
  240: "workspace.bookingNotice4Hours",
  720: "workspace.bookingNotice12Hours",
  1440: "workspace.bookingNotice24Hours",
};

type BookingNoticeFieldProps = {
  readonly onChange: (value: number) => void;
  readonly t: (key: MessageKey) => string;
  readonly value: number;
};

export function BookingNoticeField({
  onChange,
  t,
  value,
}: BookingNoticeFieldProps) {
  const [customValue, setCustomValue] = useState(String(value));
  const customSelected = !noticeOptions.includes(
    value as (typeof noticeOptions)[number],
  );

  useEffect(() => setCustomValue(String(value)), [value]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{t("workspace.bookingNoticeLabel")}</Text>
      <Text style={styles.help}>{t("workspace.bookingNoticeHelp")}</Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {noticeOptions.map((minutes) => {
          const selected = value === minutes;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={minutes}
              onPress={() => onChange(minutes)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}
              >
                {t(noticeLabels[minutes])}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityLabel={t("workspace.bookingNoticeCustom")}
          accessibilityRole="radio"
          accessibilityState={{ checked: customSelected }}
          onPress={() => {
            const initial = customSelected ? value : 15;
            setCustomValue(String(initial));
            onChange(initial);
          }}
          style={[styles.option, customSelected && styles.optionSelected]}
        >
          <Text
            style={[
              styles.optionText,
              customSelected && styles.optionTextSelected,
            ]}
          >
            {t("workspace.bookingNoticeCustom")}
          </Text>
        </Pressable>
      </View>
      {customSelected ? (
        <View style={styles.customField}>
          <TextInput
            accessibilityLabel={t("workspace.bookingNoticeCustomLabel")}
            keyboardType="number-pad"
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, "");
              setCustomValue(digits);
              onChange(digits ? Number(digits) : 0);
            }}
            placeholder={t("workspace.bookingNoticeCustomPlaceholder")}
            style={styles.customInput}
            value={customValue}
          />
          <Text style={styles.help}>
            {t("workspace.bookingNoticeCustomHelp")}
          </Text>
        </View>
      ) : null}
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
  option: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 10,
  },
  optionSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionText: { ...typography.label, color: colors.primaryText },
  optionTextSelected: { color: colors.accent, fontWeight: "700" },
});
