import type { MessageKey } from "@schedule-app/i18n";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";
import { FullscreenModal } from "./FullscreenModal";

type CalendarSlotActionModalProps = {
  readonly canCreateBreak: boolean;
  readonly onAddBreak: () => void;
  readonly onAddBooking: () => void;
  readonly onClose: () => void;
  readonly t: (key: MessageKey) => string;
  readonly timeLabel: string;
  readonly visible: boolean;
};

export function CalendarSlotActionModal({
  canCreateBreak,
  onAddBreak,
  onAddBooking,
  onClose,
  t,
  timeLabel,
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
      title={t("mobile.calendarSlotActionTitle")}
      visible={visible}
    >
      <View style={styles.content}>
        <Text style={styles.time}>{timeLabel}</Text>
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
  time: {
    ...typography.body,
    color: colors.secondaryText,
    textAlign: "center",
  },
});
