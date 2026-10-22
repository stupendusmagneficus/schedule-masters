import {
  createTranslator,
  type MessageKey,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { ActionButton } from "../components/ActionButton";
import { AuthFeedback } from "../components/AuthFeedback";
import { AuthPage } from "../components/AuthPage";
import { PasswordField } from "../components/PasswordField";
import {
  type AuthRecoveryClient,
  changeRecoveredPassword,
} from "../features/auth/authRecovery";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";

export function PasswordRecoveryScreen({
  client,
  locale,
  onLocaleChange,
  onComplete,
  onCancel,
  signingOut,
  signOutFailed,
}: {
  readonly client: AuthRecoveryClient;
  readonly locale: SupportedLocale;
  readonly onLocaleChange: (locale: SupportedLocale) => void;
  readonly onComplete: () => Promise<void>;
  readonly onCancel: () => void;
  readonly signingOut: boolean;
  readonly signOutFailed: boolean;
}) {
  const t = createTranslator(locale);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const inFlight = useRef(false);
  async function save() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      if (saved) {
        await onComplete();
        return;
      }
      const result = await changeRecoveredPassword(
        client,
        password,
        confirmation,
      );
      if (result === "saved") {
        setSaved(true);
        setPassword("");
        setConfirmation("");
      } else
        setError(
          result === "tooShort"
            ? "auth.passwordTooShort"
            : result === "mismatch"
              ? "auth.passwordMismatch"
              : result === "samePassword"
                ? "auth.samePassword"
                : "auth.passwordUpdateFailed",
        );
    } catch {
      setError("auth.passwordUpdateFailed");
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  return (
    <AuthPage locale={locale} onLocaleChange={onLocaleChange}>
      <Text accessibilityRole="header" style={styles.title}>
        {t("auth.newPasswordTitle")}
      </Text>
      {saved ? (
        <AuthFeedback
          notice={{ tone: "info", message: t("auth.passwordSaved") }}
        />
      ) : (
        <>
          <Text style={styles.description}>
            {t("auth.newPasswordDescription")}
          </Text>
          <PasswordField
            value={password}
            onChange={setPassword}
            label={t("auth.passwordLabel")}
            newPassword
            t={t}
          />
          <PasswordField
            value={confirmation}
            onChange={setConfirmation}
            label={t("auth.confirmPassword")}
            newPassword
            t={t}
          />
        </>
      )}
      {error && <AuthFeedback notice={{ tone: "error", message: t(error) }} />}
      {signOutFailed && (
        <AuthFeedback
          notice={{ tone: "error", message: t("auth.signOutFailed") }}
        />
      )}
      <ActionButton
        label={t(saved ? "common.done" : "auth.savePassword")}
        onPress={() => void save()}
        disabled={busy || signingOut}
        loading={busy}
        loadingLabel={t("common.loading")}
        variant="primary"
      />
      <ActionButton
        label={t("auth.confirmationBackToSignIn")}
        onPress={onCancel}
        disabled={busy || signingOut}
        loading={signingOut}
        loadingLabel={t("common.loading")}
        variant="quiet"
      />
    </AuthPage>
  );
}
const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.primaryText },
  description: { ...typography.body, color: colors.secondaryText },
});
