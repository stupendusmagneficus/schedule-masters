import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";

type FullscreenModalProps = {
  readonly children: ReactNode;
  readonly closeLabel: string;
  readonly closeIcon?: "close" | "chevron-left";
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
  closeIcon = "close",
  closeDisabled = false,
  footer,
  headerRight,
  onClose,
  title,
  visible,
}: FullscreenModalProps) {
  const isBackNavigation = closeIcon === "chevron-left";

  return (
    <Modal
      accessibilityViewIsModal
      animationType="slide"
      onRequestClose={closeDisabled ? () => undefined : onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <SafeAreaProvider>
        <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
          <View style={styles.header}>
            {isBackNavigation ? (
              <HeaderAction
                accessibilityLabel={closeLabel}
                disabled={closeDisabled}
                icon={closeIcon}
                onPress={onClose}
                placement="left"
              />
            ) : (
              <View style={styles.headerAction} />
            )}
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </Text>
            <View style={styles.rightActions}>
              {headerRight}
              {!isBackNavigation ? (
                <HeaderAction
                  accessibilityLabel={closeLabel}
                  disabled={closeDisabled}
                  icon={closeIcon}
                  onPress={onClose}
                  placement="right"
                />
              ) : null}
            </View>
          </View>
          <View style={styles.content}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function HeaderAction({
  accessibilityLabel,
  disabled,
  icon,
  onPress,
  placement,
}: {
  readonly accessibilityLabel: string;
  readonly disabled: boolean;
  readonly icon: "close" | "chevron-left";
  readonly onPress: () => void;
  readonly placement: "left" | "right";
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.headerAction,
        placement === "left"
          ? styles.headerActionLeft
          : styles.headerActionRight,
        disabled && styles.disabled,
      ]}
    >
      <MaterialCommunityIcons
        color={colors.primaryText}
        name={icon}
        size={28}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  headerAction: {
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    position: "absolute",
    width: 48,
  },
  headerActionLeft: { left: 16 },
  headerActionRight: { right: 0 },
  rightActions: {
    alignItems: "center",
    flexDirection: "row",
    position: "absolute",
    right: 16,
  },
  screen: { backgroundColor: colors.canvas, flex: 1 },
  title: {
    ...typography.label,
    color: colors.primaryText,
    left: 64,
    position: "absolute",
    right: 64,
    fontWeight: "700",
    textAlign: "center",
  },
});
