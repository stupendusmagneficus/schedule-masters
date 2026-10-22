import { createTranslator, type SupportedLocale } from "@schedule-app/i18n";
import type { Session } from "@supabase/supabase-js";
import { useMemo, useState } from "react";
import { Platform, StyleSheet, Text } from "react-native";

import { AuthForm } from "../components/AuthForm";
import { AuthPage } from "../components/AuthPage";
import { EmailConfirmationScreen } from "../components/EmailConfirmationScreen";
import { mobileEnv } from "../config/env";
import { AuthEmailAction } from "../features/auth/AuthEmailAction";
import { getAuthErrorMessageKey } from "../features/auth/authErrorMessage";
import { type AuthMode, authenticate } from "../features/auth/authentication";
import type { AuthNotice } from "../features/auth/authNotice";
import {
  authEmailCooldownMs,
  authEmailDeadlineKey,
} from "../features/auth/authRecoveryStorage";
import {
  getCurrentWebOrigin,
  getEmailRedirectTo,
} from "../features/auth/authRedirect";
import { isEmailConfirmationRequired } from "../features/auth/emailConfirmation";
import {
  type AuthField,
  type AuthFieldTouchState,
  getVisibleAuthFieldErrors,
} from "../features/auth/fieldValidation";
import { PasswordResetRequest } from "../features/auth/PasswordResetRequest";
import { analytics, analyticsEvents } from "../lib/analytics";
import { platformStorage } from "../lib/platformStorage";
import { supabase } from "../lib/supabase";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";

type AuthScreenProps = {
  readonly authCallbackFailed: boolean;
  readonly initialMode: AuthMode;
  readonly locale: SupportedLocale;
  readonly onAuthenticated: (session: Session) => void;
  readonly onLocaleChange: (locale: SupportedLocale) => void;
  readonly sessionRestoreFailed: boolean;
};

type ConfirmationState = {
  readonly descriptionKey:
    | "auth.confirmationDescription"
    | "auth.emailNotConfirmed";
  readonly email: string;
};

export function AuthScreen({
  authCallbackFailed,
  initialMode,
  locale,
  onAuthenticated,
  onLocaleChange,
  sessionRestoreFailed,
}: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [recovering, setRecovering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touchedFields, setTouchedFields] = useState<AuthFieldTouchState>({
    email: false,
    password: false,
  });
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(
    null,
  );
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const errors = useMemo(
    () => getVisibleAuthFieldErrors({ email, password }, touchedFields),
    [email, password, touchedFields],
  );

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setConfirmation(null);
    setNotice(null);
    setTouchedFields({ email: false, password: false });
  }

  function touchField(field: AuthField) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  const redirectTo = getEmailRedirectTo(
    Platform.OS === "web" ? "web" : "native",
    Platform.OS === "web" ? getCurrentWebOrigin() : undefined,
    mobileEnv.authRedirectUrl,
  );

  async function submit() {
    if (!supabase) return;

    setBusy(true);
    setTouchedFields({ email: true, password: true });
    setNotice(null);
    const result = await authenticate(
      supabase,
      mode,
      { email, password },
      redirectTo,
      locale,
    );
    if (result.kind === "confirmationRequired") {
      try {
        await platformStorage.setItem(
          authEmailDeadlineKey,
          String(Date.now() + authEmailCooldownMs),
        );
      } catch {
        // Auth still enforces server-side limits if local preferences cannot be saved.
      }
    }
    setBusy(false);

    if (result.kind === "validationError") {
      return;
    }

    if (result.kind === "requestError") {
      if (isEmailConfirmationRequired(result.error)) {
        setPassword("");
        setMode("signIn");
        setConfirmation({
          descriptionKey: "auth.emailNotConfirmed",
          email: email.trim(),
        });
        return;
      }

      setNotice({
        message: t(getAuthErrorMessageKey(result.error)),
        tone: "error",
      });
      return;
    }

    if (result.kind === "confirmationRequired") {
      analytics.track(analyticsEvents.accountSignedUp);
      setPassword("");
      setMode("signIn");
      setConfirmation({
        descriptionKey: "auth.confirmationDescription",
        email: email.trim(),
      });
      return;
    }

    analytics.track(
      mode === "signUp"
        ? analyticsEvents.accountSignedUp
        : analyticsEvents.accountSignedIn,
    );
    onAuthenticated(result.session);
  }

  const title = t(mode === "signUp" ? "auth.signUpTitle" : "auth.signInTitle");

  return (
    <AuthPage locale={locale} onLocaleChange={onLocaleChange}>
      {recovering && supabase ? (
        <PasswordResetRequest
          client={supabase}
          initialEmail={email}
          redirectTo={redirectTo}
          t={t}
          onBack={() => {
            setRecovering(false);
            changeMode("signIn");
          }}
        />
      ) : confirmation ? (
        <EmailConfirmationScreen
          descriptionKey={confirmation.descriptionKey}
          email={confirmation.email}
          onBackToSignIn={() => {
            setConfirmation(null);
            setMode("signIn");
            setNotice(null);
            setTouchedFields({ email: false, password: false });
          }}
          t={t}
          resendAction={
            supabase && (
              <AuthEmailAction
                client={supabase}
                kind="confirmation"
                email={confirmation.email}
                redirectTo={redirectTo}
                t={t}
              />
            )
          }
        />
      ) : (
        <>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.description}>{t("mobile.description")}</Text>
          {sessionRestoreFailed && (
            <Text accessibilityRole="alert" style={styles.restoreError}>
              {t("auth.sessionRestoreFailed")}
            </Text>
          )}
          {authCallbackFailed && (
            <Text accessibilityRole="alert" style={styles.restoreError}>
              {t("auth.confirmationCallbackFailed")}
            </Text>
          )}
          <AuthForm
            busy={busy}
            onForgotPassword={() => setRecovering(true)}
            email={email}
            errors={errors}
            mode={mode}
            notice={notice ?? undefined}
            onEmailBlur={() => touchField("email")}
            onEmailChange={setEmail}
            onModeChange={changeMode}
            onPasswordBlur={() => touchField("password")}
            onPasswordChange={setPassword}
            onSubmit={() => void submit()}
            password={password}
            t={t}
          />
        </>
      )}
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  description: {
    ...typography.body,
    color: colors.secondaryText,
    marginBottom: 8,
  },
  restoreError: { ...typography.body, color: colors.danger },
  title: { ...typography.heading, color: colors.primaryText },
});
