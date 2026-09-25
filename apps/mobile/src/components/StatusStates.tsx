import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.muted}>Loading…</Text>
    </View>
  );
}

export function ConfigurationState() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Mobile configuration required</Text>
      <Text style={styles.muted}>
        Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to
        run the mobile app.
      </Text>
    </View>
  );
}

type RecoverableErrorStateProps = {
  readonly description: string;
  readonly onRetry: () => void;
  readonly retryLabel: string;
  readonly title: string;
};

export function RecoverableErrorState({
  description,
  onRetry,
  retryLabel,
  title,
}: RecoverableErrorStateProps) {
  return (
    <View style={styles.center}>
      <Text accessibilityRole="alert" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.muted}>{description}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={styles.retry}
      >
        <Text style={styles.retryText}>{retryLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  muted: { ...typography.body, color: colors.secondaryText, marginTop: 4 },
  retry: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.control,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  retryText: { ...typography.label, color: colors.actionText },
  title: { ...typography.heading, color: colors.primaryText },
});
