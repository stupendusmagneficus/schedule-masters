import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { MessageKey } from "@schedule-app/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";

type CalendarPeriodNavigationProps = {
  readonly disabled?: boolean;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
  readonly onToday?: () => void;
  readonly previousLabel: string;
  readonly subtitle?: string;
  readonly subtitleAccessibilityLabel?: string;
  readonly t: (key: MessageKey) => string;
  readonly title: string;
  readonly todayLabel?: string;
  readonly nextLabel: string;
};

export function CalendarPeriodNavigation({
  disabled = false,
  nextLabel,
  onNext,
  onPrevious,
  onToday,
  previousLabel,
  subtitle,
  subtitleAccessibilityLabel,
  t,
  title,
  todayLabel,
}: CalendarPeriodNavigationProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <PeriodArrow
          disabled={disabled}
          icon="chevron-left"
          label={previousLabel}
          onPress={onPrevious}
        />
        <View style={styles.copy}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={styles.title}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              accessibilityLabel={subtitleAccessibilityLabel}
              numberOfLines={1}
              style={styles.subtitle}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <PeriodArrow
          disabled={disabled}
          icon="chevron-right"
          label={nextLabel}
          onPress={onNext}
        />
      </View>
      {onToday && todayLabel ? (
        <Pressable
          accessibilityLabel={todayLabel}
          accessibilityRole="button"
          disabled={disabled}
          onPress={onToday}
          style={({ pressed }) => [
            styles.todayButton,
            disabled && styles.disabled,
            pressed && styles.todayButtonPressed,
          ]}
        >
          <Text style={styles.todayText}>{t("mobile.today")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PeriodArrow({
  disabled,
  icon,
  label,
  onPress,
}: {
  readonly disabled: boolean;
  readonly icon: "chevron-left" | "chevron-right";
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.arrowButton,
        disabled && styles.disabled,
        pressed && styles.arrowButtonPressed,
      ]}
    >
      <MaterialCommunityIcons
        color={colors.primaryText}
        name={icon}
        size={24}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arrowButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  arrowButtonPressed: { backgroundColor: colors.subtleSurface },
  container: { gap: 4 },
  copy: { alignItems: "center", flex: 1, minWidth: 0 },
  disabled: { opacity: 0.5 },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  subtitle: { ...typography.caption, color: colors.secondaryText },
  title: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "700",
    textAlign: "center",
  },
  todayButton: {
    alignSelf: "center",
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 16,
  },
  todayButtonPressed: { backgroundColor: colors.subtleSurface },
  todayText: { ...typography.label, color: colors.accent, fontWeight: "700" },
});
