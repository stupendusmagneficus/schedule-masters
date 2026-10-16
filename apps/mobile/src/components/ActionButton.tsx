import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

export type ActionButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "destructiveConfirm"
  | "neutral"
  | "quiet";

type ActionButtonProps = {
  readonly accessibilityLabel?: string;
  readonly disabled?: boolean;
  readonly label: string;
  readonly loadingLabel?: string;
  readonly loading?: boolean;
  readonly onPress: () => void;
  readonly size?: "regular" | "compact";
  readonly style?: StyleProp<ViewStyle>;
  readonly variant?: ActionButtonVariant;
};

const labelColors: Record<ActionButtonVariant, string> = {
  primary: colors.actionText,
  secondary: colors.accent,
  destructive: colors.danger,
  destructiveConfirm: colors.inverse,
  neutral: colors.primaryText,
  quiet: colors.secondaryText,
};

export function ActionButton({
  accessibilityLabel,
  disabled = false,
  label,
  loadingLabel,
  loading = false,
  onPress,
  size = "regular",
  style,
  variant = "primary",
}: ActionButtonProps) {
  const isDisabled = disabled || loading;
  const visibleLabel = loading && loadingLabel ? loadingLabel : label;
  const content: ReactNode =
    loading && loadingLabel ? (
      <View style={styles.loadingContent}>
        <ActivityIndicator color={labelColors[variant]} />
        <Text style={[styles.label, { color: labelColors[variant] }]}>
          {visibleLabel}
        </Text>
      </View>
    ) : loading ? (
      <ActivityIndicator color={labelColors[variant]} />
    ) : (
      <Text style={[styles.label, { color: labelColors[variant] }]}>
        {label}
      </Text>
    );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? visibleLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === "compact" && styles.compact,
        styles[variant],
        pressed && !isDisabled && styles[`${variant}Pressed`],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  compact: { minHeight: 44, paddingHorizontal: 10 },
  loadingContent: { alignItems: "center", flexDirection: "row", gap: 8 },
  primary: {
    backgroundColor: colors.action,
    borderColor: colors.action,
  },
  primaryPressed: { backgroundColor: colors.actionPressed },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  secondaryPressed: { backgroundColor: colors.accentSoft },
  destructive: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
  },
  destructivePressed: { backgroundColor: colors.dangerSoft },
  destructiveConfirm: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  destructiveConfirmPressed: { opacity: 0.84 },
  neutral: {
    backgroundColor: colors.subtleSurface,
    borderColor: colors.subtleSurface,
  },
  neutralPressed: { backgroundColor: colors.borderSubtle },
  quiet: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  quietPressed: { backgroundColor: colors.subtleSurface },
  disabled: { opacity: 0.55 },
  label: { ...typography.label, fontWeight: "700", textAlign: "center" },
});
