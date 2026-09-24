import type { SupportedLocale } from "@schedule-app/i18n";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { analytics, analyticsEvents } from "../lib/analytics";
import { supabase } from "../lib/supabase";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
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
    else {
      analytics.track(analyticsEvents.workspaceSetupCompleted, {
        locale,
      });
      onComplete();
    }
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
    backgroundColor: colors.canvas,
    gap: 16,
    justifyContent: "center",
    minHeight: "100%",
    padding: 16,
  },
  eyebrow: {
    color: colors.accent,
    marginBottom: 8,
    ...typography.eyebrow,
  },
  title: { ...typography.heading, color: colors.primaryText },
  muted: { ...typography.body, color: colors.secondaryText, marginTop: 4 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    fontSize: typography.body.fontSize,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  error: { ...typography.caption, color: colors.danger },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    width: "100%",
  },
  primaryButtonText: {
    ...typography.label,
    color: colors.inverse,
    fontWeight: "700",
  },
});
