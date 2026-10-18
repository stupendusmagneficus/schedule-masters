import type { MessageKey } from "@schedule-app/i18n";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";
import { BottomSheet } from "./BottomSheet";

export type CalendarTimeOption = {
  readonly label: string;
  readonly startsAt: string;
};

type CalendarSlotActionModalProps = {
  readonly canCreateBreak: boolean;
  readonly dateLabel: string;
  readonly onAddBreak: () => void;
  readonly onAddBooking: () => void;
  readonly onClose: () => void;
  readonly onSelectTime: (startsAt: string) => void;
  readonly selectedStartsAt: string;
  readonly t: (key: MessageKey) => string;
  readonly timeOptions: readonly CalendarTimeOption[];
  readonly visible: boolean;
};

export function CalendarSlotActionModal({
  canCreateBreak,
  dateLabel,
  onAddBreak,
  onAddBooking,
  onClose,
  onSelectTime,
  selectedStartsAt,
  t,
  timeOptions,
  visible,
}: CalendarSlotActionModalProps) {
  const [selectedAction, setSelectedAction] = useState<"booking" | "break">(
    "booking",
  );

  useEffect(() => {
    if (visible) setSelectedAction("booking");
  }, [visible]);

  function chooseAction(action: () => void) {
    onClose();
    setTimeout(action, 220);
  }

  return (
    <BottomSheet
      closeLabel={t("common.cancel")}
      onClose={onClose}
      title={t("mobile.calendarChooseTime")}
      visible={visible}
    >
      <View style={styles.content}>
        <Text style={styles.dateLabel}>{dateLabel}</Text>
        <View accessibilityRole="radiogroup" style={styles.timeOptions}>
          {timeOptions.map((option) => {
            const selected = option.startsAt === selectedStartsAt;
            return (
              <Pressable
                accessibilityLabel={option.label}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={option.startsAt}
                onPress={() => onSelectTime(option.startsAt)}
                style={[
                  styles.timeOption,
                  selected && styles.timeOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    selected && styles.timeOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View accessibilityRole="tablist" style={styles.actionTabs}>
          <ActionTab
            active={selectedAction === "booking"}
            label={t("mobile.calendarBookingTab")}
            onPress={() => setSelectedAction("booking")}
          />
          <ActionTab
            active={selectedAction === "break"}
            disabled={!canCreateBreak}
            label={t("mobile.calendarBreakTab")}
            onPress={() => setSelectedAction("break")}
          />
        </View>
        <ActionButton
          disabled={selectedAction === "break" && !canCreateBreak}
          label={
            selectedAction === "booking"
              ? t("mobile.newBooking")
              : t("mobile.personalBlockAdd")
          }
          onPress={() =>
            chooseAction(
              selectedAction === "booking" ? onAddBooking : onAddBreak,
            )
          }
          variant="primary"
        />
      </View>
    </BottomSheet>
  );
}

function ActionTab({
  active,
  disabled = false,
  label,
  onPress,
}: {
  readonly active: boolean;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ disabled, selected: active }}
      aria-selected={active}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTab,
        active && styles.actionTabSelected,
        pressed && styles.actionTabPressed,
        disabled && styles.actionTabDisabled,
      ]}
    >
      <Text
        style={[styles.actionTabText, active && styles.actionTabTextSelected]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: 20 },
  actionTabs: {
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  actionTab: {
    alignItems: "center",
    borderRadius: radii.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
  },
  actionTabDisabled: { opacity: 0.5 },
  actionTabPressed: { opacity: 0.8 },
  actionTabSelected: { backgroundColor: colors.action },
  actionTabText: { ...typography.label, color: colors.primaryText },
  actionTabTextSelected: { color: colors.actionText, fontWeight: "700" },
  dateLabel: {
    ...typography.body,
    color: colors.secondaryText,
    textAlign: "center",
  },
  timeOptions: { gap: 8 },
  timeOption: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  timeOptionSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  timeOptionText: { ...typography.body, color: colors.primaryText },
  timeOptionTextSelected: { color: colors.accent, fontWeight: "700" },
});
