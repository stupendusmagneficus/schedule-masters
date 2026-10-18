import type { MessageKey } from "@schedule-app/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";
import { FullscreenModal } from "./FullscreenModal";

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
  function chooseAction(action: () => void) {
    onClose();
    setTimeout(action, 220);
  }

  return (
    <FullscreenModal
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
        <ActionButton
          label={t("mobile.newBooking")}
          onPress={() => chooseAction(onAddBooking)}
          variant="primary"
        />
        <ActionButton
          disabled={!canCreateBreak}
          label={t("mobile.personalBlockAdd")}
          onPress={() => chooseAction(onAddBreak)}
          variant="secondary"
        />
      </View>
    </FullscreenModal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: 20 },
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
