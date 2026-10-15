import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";

import { colors, radii } from "../theme/tokens";

export type DashboardHeaderActionProps = {
  readonly accessibilityLabel: string;
  readonly icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  readonly onPress: () => void;
};

export function DashboardHeaderAction({
  accessibilityLabel,
  icon,
  onPress,
}: DashboardHeaderActionProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons
        color={colors.primaryText}
        name={icon}
        size={26}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  pressed: { backgroundColor: colors.subtleSurface },
});
