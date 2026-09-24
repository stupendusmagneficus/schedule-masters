import Ionicons from "@expo/vector-icons/Ionicons";
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
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { bottom: insets.bottom + 76 },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons color={colors.inverse} name="add" size={20} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 16,
    position: "absolute",
    right: 20,
    ...shadows.floating,
  },
  label: {
    color: colors.inverse,
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    backgroundColor: colors.accentPressed,
  },
});
