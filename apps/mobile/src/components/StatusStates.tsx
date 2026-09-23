import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color="#2f8f7b" />
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
    backgroundColor: "#f5f5f2",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  muted: { color: "#75807c", lineHeight: 20, marginTop: 4 },
  title: { color: "#202725", fontSize: 30, fontWeight: "700" },
});
