import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

export type ActionButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "neutral"
  | "quiet";

type ActionButtonProps = {
  readonly accessibilityLabel?: string;
  readonly disabled?: boolean;
  readonly label: string;
  readonly loading?: boolean;
  readonly onPress: () => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly variant?: ActionButtonVariant;
};

const labelColors: Record<ActionButtonVariant, string> = {
  primary: colors.actionText,
  secondary: colors.accent,
  destructive: colors.danger,
  neutral: colors.primaryText,
  quiet: colors.secondaryText,
};

export function ActionButton({
  accessibilityLabel,
  disabled = false,
  label,
  loading = false,
  onPress,
  style,
  variant = "primary",
}: ActionButtonProps) {
  const isDisabled = disabled || loading;
  const content: ReactNode = loading ? (
    <ActivityIndicator color={labelColors[variant]} />
  ) : (
    <Text style={[styles.label, { color: labelColors[variant] }]}>{label}</Text>
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
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
