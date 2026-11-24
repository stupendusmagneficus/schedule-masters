import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, shadows } from "../theme/tokens";

// Bottom navigation above the safe area: 8 top inset + 4 padding + 56 item + 4 padding.
const BOTTOM_NAVIGATION_HEIGHT = 72;
const NAVIGATION_GAP = 12;

type FloatingBookingActionProps = {
  readonly label: string;
  readonly onPress: () => void;
};

export function FloatingBookingAction({
  label,
  onPress,
}: FloatingBookingActionProps) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { bottom: insets.bottom + BOTTOM_NAVIGATION_HEIGHT + NAVIGATION_GAP },
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons color={colors.actionText} name="plus" size={20} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    position: "absolute",
    right: 20,
    ...shadows.floating,
  },
  label: {
    color: colors.actionText,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    backgroundColor: colors.actionPressed,
  },
});
