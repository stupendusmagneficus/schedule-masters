import {
  createTranslator,
  type MessageKey,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { getSetupErrorMessageKey } from "../features/workspace/setupErrorMessage";
import { validateSetupValues } from "../features/workspace/setupValidation";
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
  const [messageKey, setMessageKey] = useState<MessageKey>();
  const t = createTranslator(locale);

  async function submit() {
    const normalizedSlug = normalizeBookingSlug(slug);
    const validationError = validateSetupValues({
      name,
      price,
      serviceName,
      slug: normalizedSlug,
    });
    if (validationError) {
      setMessageKey(
        validationError === "required"
          ? "workspace.setupRequiredFields"
          : validationError === "slug"
            ? "workspace.setupInvalidSlug"
            : "workspace.priceInvalid",
      );
      return;
    }
    if (!supabase) {
      setMessageKey("workspace.setupFailed");
      return;
    }
    setBusy(true);
    setMessageKey(undefined);
    const { error } = await supabase.rpc("bootstrap_master_workspace", {
      p_name: name.trim(),
      p_slug: normalizedSlug,
      p_locale: locale,
      p_service_name: serviceName.trim(),
      p_duration_minutes: 60,
      p_price_amount: Number(price),
      p_start_local_time: "08:00",
      p_end_local_time: "21:00",
    });
    setBusy(false);
    if (error) setMessageKey(getSetupErrorMessageKey(error));
    else {
      analytics.track(analyticsEvents.workspaceSetupCompleted, {
        locale,
      });
      onComplete();
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>{t("workspace.setupEyebrow")}</Text>
      <Text style={styles.title}>{t("workspace.setupTitle")}</Text>
      <Text style={styles.muted}>{t("workspace.setupDescription")}</Text>
      <TextInput
        onChangeText={(value) => {
          setName(value);
          setMessageKey(undefined);
        }}
        placeholder={t("workspace.namePlaceholder")}
        style={styles.input}
        value={name}
      />
      <TextInput
        autoCapitalize="none"
        onChangeText={(value) => {
          setSlug(normalizeBookingSlug(value));
          setMessageKey(undefined);
        }}
        placeholder={t("workspace.slugPlaceholder")}
        style={styles.input}
        value={slug}
      />
      <TextInput
        onChangeText={(value) => {
          setServiceName(value);
          setMessageKey(undefined);
        }}
        placeholder={t("workspace.servicePlaceholder")}
        style={styles.input}
        value={serviceName}
      />
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => {
          setPrice(value);
          setMessageKey(undefined);
        }}
        placeholder={t("workspace.pricePlaceholder")}
        style={styles.input}
        value={price}
      />
      {messageKey && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(messageKey)}
        </Text>
      )}
      <Pressable
        disabled={busy}
        onPress={() => void submit()}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>
          {busy ? t("workspace.setupSaving") : t("workspace.setupSave")}
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
