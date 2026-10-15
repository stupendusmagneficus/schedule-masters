import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { spacing } from "../theme/spacing";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

type DashboardActionCardProps = {
  readonly accessibilityLabel: string;
  readonly description?: ReactNode;
  readonly onPress: () => void;
  readonly title: string;
  readonly trailing?: ReactNode;
};

export function DashboardActionCard({
  accessibilityLabel,
  description,
  onPress,
  title,
  trailing,
}: DashboardActionCardProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {description ? (
        <View style={styles.description}>{description}</View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "column",
    gap: spacing.compact,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: "100%",
  },
  pressed: { opacity: 0.78 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.compact,
    justifyContent: "space-between",
    minWidth: 0,
  },
  titleContainer: { flex: 1, minWidth: 0 },
  title: {
    ...typography.body,
    color: colors.primaryText,
    fontWeight: "700",
    flexShrink: 1,
  },
  trailing: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  description: { minWidth: 0, width: "100%" },
});
