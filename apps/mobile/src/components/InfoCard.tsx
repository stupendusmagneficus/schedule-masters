import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { colors, radii, shadows } from "../theme/tokens";

type InfoCardProps = {
  readonly children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
};

export function InfoCard({ children, style }: InfoCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    ...shadows.surface,
  },
});
