import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

import type { SupportedLocale } from "@schedule-app/i18n";

import { supabase } from "../lib/supabase";
import { normalizeBookingSlug } from "../utils/slug";

type SetupScreenProps = {
  readonly locale: SupportedLocale;
  readonly onComplete: () => void;
};

export function SetupScreen({ locale, onComplete }: SetupScreenProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [serviceName, setServiceName] = useState("Gel manicure");
  const [price, setPrice] = useState("700");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (!supabase || !name.trim() || !slug.trim() || !serviceName.trim()) {
      setMessage("Complete the workspace, booking link, and service fields.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.rpc("bootstrap_master_workspace", {
      p_name: name.trim(),
      p_slug: normalizeBookingSlug(slug),
      p_locale: locale,
      p_service_name: serviceName.trim(),
      p_duration_minutes: 60,
      p_price_amount: Number(price) || 0,
      p_start_local_time: "08:00",
      p_end_local_time: "21:00",
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else onComplete();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>FIRST SETUP</Text>
      <Text style={styles.title}>Set up your workspace</Text>
      <Text style={styles.muted}>
        This creates Monday–Sunday availability from 08:00 to 21:00. You can
        refine it later.
      </Text>
      <TextInput
        onChangeText={setName}
        placeholder="Workspace name"
        style={styles.input}
        value={name}
      />
      <TextInput
        autoCapitalize="none"
        onChangeText={(value) => setSlug(normalizeBookingSlug(value))}
        placeholder="Booking link, e.g. anna-nails"
        style={styles.input}
        value={slug}
      />
      <TextInput
        onChangeText={setServiceName}
        placeholder="First service"
        style={styles.input}
        value={serviceName}
      />
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={setPrice}
        placeholder="Price in CZK"
        style={styles.input}
        value={price}
      />
      {message && (
        <Text accessibilityRole="alert" style={styles.error}>
          {message}
        </Text>
      )}
      <Pressable
        disabled={busy}
        onPress={() => void submit()}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>
          {busy ? "Saving…" : "Save and continue"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f2",
    gap: 14,
    justifyContent: "center",
    minHeight: "100%",
    padding: 24,
  },
  eyebrow: {
    color: "#2f8f7b",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: { color: "#202725", fontSize: 30, fontWeight: "700" },
  muted: { color: "#75807c", lineHeight: 20, marginTop: 4 },
  input: {
    backgroundColor: "#fff",
    borderColor: "#dee2de",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  error: { color: "#a13d3d", fontSize: 13 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#2f8f7b",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    width: "100%",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
});
