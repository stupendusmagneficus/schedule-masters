import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

type BottomSheetProps = {
  readonly children: ReactNode;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly title: string;
  readonly visible: boolean;
};

export function BottomSheet({
  children,
  closeLabel,
  onClose,
  title,
  visible,
}: BottomSheetProps) {
  return (
    <Modal
      accessibilityViewIsModal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityElementsHidden
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          onPress={onClose}
          style={styles.backdrop}
        />
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <View accessibilityElementsHidden style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </Text>
            <Pressable
              accessibilityLabel={closeLabel}
              accessibilityRole="button"
              hitSlop={4}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primaryText}
                name="close"
                size={26}
              />
            </Pressable>
          </View>
          {children}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill },
  closeButton: {
    alignItems: "center",
    borderRadius: radii.control,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  handle: {
    backgroundColor: colors.border,
    borderRadius: radii.control,
    height: 4,
    width: 32,
  },
  handleArea: { alignItems: "center", height: 20, justifyContent: "center" },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: 16,
  },
  headerSpacer: { width: 48 },
  overlay: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: "flex-end",
  },
  pressed: { opacity: 0.7 },
  sheet: {
    alignSelf: "center",
    backgroundColor: colors.canvas,
    bottom: 0,
    borderTopLeftRadius: radii.surface,
    borderTopRightRadius: radii.surface,
    maxHeight: "85%",
    overflow: "hidden",
    position: "absolute",
    width: "100%",
  },
  title: {
    ...typography.label,
    color: colors.primaryText,
    flex: 1,
    fontWeight: "700",
    textAlign: "center",
  },
});
