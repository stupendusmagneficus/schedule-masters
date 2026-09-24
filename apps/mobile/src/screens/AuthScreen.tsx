import type { Session } from "@supabase/supabase-js";
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

type AuthScreenProps = { readonly onAuthenticated: (session: Session) => void };

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (!supabase || !email.trim() || password.length < 6) {
      setMessage("Enter an email and a password with at least 6 characters.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = isSignUp
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (result.data.session) {
      analytics.track(
        isSignUp
          ? analyticsEvents.accountSignedUp
          : analyticsEvents.accountSignedIn,
      );
      onAuthenticated(result.data.session);
    } else setMessage("Check your email to confirm the account, then sign in.");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>SCHEDULE MASTERS</Text>
      <Text style={styles.title}>
        {isSignUp ? "Create your workspace" : "Welcome back"}
      </Text>
      <Text style={styles.muted}>
        Manage your calendar and let clients book online.
      </Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        style={styles.input}
        value={email}
      />
      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
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
          {busy ? "Loading…" : isSignUp ? "Create account" : "Sign in"}
        </Text>
      </Pressable>
      <Pressable onPress={() => setIsSignUp((value) => !value)}>
        <Text style={styles.link}>
          {isSignUp
            ? "Already have an account? Sign in"
            : "Create a new account"}
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
  link: { ...typography.label, color: colors.accent },
});
