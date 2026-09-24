import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/tokens";
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
  title: { ...typography.heading, color: colors.primaryText },
});
