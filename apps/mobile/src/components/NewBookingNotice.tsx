import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { FullscreenModal } from "./FullscreenModal";

type NewBookingNoticeProps = {
  readonly closeLabel: string;
  readonly description: string;
  readonly onClose: () => void;
  readonly title: string;
  readonly visible: boolean;
};

export function NewBookingNotice({
  closeLabel,
  description,
  onClose,
  title,
  visible,
}: NewBookingNoticeProps) {
  return (
    <FullscreenModal
      closeLabel={closeLabel}
      onClose={onClose}
      title={title}
      visible={visible}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.closeButtonPressed,
          ]}
        >
          <Text style={styles.closeButtonText}>{closeLabel}</Text>
        </Pressable>
      }
    >
      <View style={styles.content}>
        <Text style={styles.description}>{description}</Text>
      </View>
    </FullscreenModal>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.control,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  closeButtonPressed: { backgroundColor: colors.actionPressed },
  closeButtonText: {
    ...typography.label,
    color: colors.actionText,
    fontWeight: "700",
  },
  description: {
    ...typography.body,
    color: colors.secondaryText,
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    margin: 20,
    padding: 20,
  },
});
