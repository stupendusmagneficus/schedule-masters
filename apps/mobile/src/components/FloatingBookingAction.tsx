import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, shadows } from "../theme/tokens";

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
        { bottom: insets.bottom + 72 },
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons color={colors.inverse} name="plus" size={20} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.accent,
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
    color: colors.inverse,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    backgroundColor: colors.accentPressed,
  },
});
