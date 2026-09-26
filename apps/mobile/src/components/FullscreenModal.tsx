import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";

type FullscreenModalProps = {
  readonly children: ReactNode;
  readonly closeLabel: string;
  readonly closeDisabled?: boolean;
  readonly headerRight?: ReactNode;
  readonly onClose: () => void;
  readonly title: string;
  readonly visible: boolean;
  readonly footer?: ReactNode;
};

export function FullscreenModal({
  children,
  closeLabel,
  closeDisabled = false,
  footer,
  headerRight,
  onClose,
  title,
  visible,
}: FullscreenModalProps) {
  return (
    <Modal
      accessibilityViewIsModal
      animationType="slide"
      onRequestClose={closeDisabled ? () => undefined : onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel={closeLabel}
            accessibilityRole="button"
            disabled={closeDisabled}
            onPress={onClose}
            style={[styles.headerAction, closeDisabled && styles.disabled]}
          >
            <Text style={styles.closeText}>{closeLabel}</Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <View style={styles.headerAction}>{headerRight}</View>
        </View>
        <View style={styles.content}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeText: { ...typography.label, color: colors.accent, fontWeight: "700" },
  content: { flex: 1 },
  disabled: { opacity: 0.6 },
  footer: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: 16,
  },
  headerAction: { flex: 1, minWidth: 88 },
  screen: { backgroundColor: colors.canvas, flex: 1 },
  title: {
    ...typography.label,
    color: colors.primaryText,
    flex: 1,
    fontWeight: "700",
    textAlign: "center",
  },
});
