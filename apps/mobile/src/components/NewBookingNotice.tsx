import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows } from "../theme/tokens";
import { typography } from "../theme/typography";

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
    <Modal
      accessibilityViewIsModal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    maxWidth: 360,
    padding: 24,
    width: "100%",
    ...shadows.surface,
  },
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
    marginTop: 8,
  },
  title: { ...typography.section, color: colors.primaryText },
});
