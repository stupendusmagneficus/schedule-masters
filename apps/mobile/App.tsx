import "react-native-url-polyfill/auto";

import {
  createTranslator,
  defaultLocale,
  type SupportedLocale,
} from "@schedule-app/i18n";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  ConfigurationState,
  LoadingState,
  RecoverableErrorState,
} from "./src/components/StatusStates";
import { demoData, demoWorkspace } from "./src/demo/mockData";
import { isDemoMode } from "./src/demo/mode";
import type { AuthMode } from "./src/features/auth/authentication";
import { useMasterWorkspace } from "./src/features/workspace/useMasterWorkspace";
import { analytics, analyticsEvents } from "./src/lib/analytics";
import { supabase } from "./src/lib/supabase";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { SetupScreen } from "./src/screens/SetupScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const demoMode = isDemoMode();
  const [locale, setLocale] = useState<SupportedLocale>(defaultLocale);
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(
    Boolean(supabase),
  );
  const [sessionRestoreFailed, setSessionRestoreFailed] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signUp");
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { reload: reloadWorkspace, state: workspaceState } = useMasterWorkspace(
    {
      client: supabase,
      userId: session?.user.id ?? null,
    },
  );
  const t = useMemo(() => createTranslator(locale), [locale]);

  useEffect(() => {
    if (demoMode) return;
    void analytics.init();
    analytics.track(analyticsEvents.appOpened);
  }, [demoMode]);

  useEffect(() => {
    if (demoMode) return;
    if (!supabase) return;
    const client = supabase;
    let active = true;
    async function restoreSession() {
      try {
        const { data, error } = await client.auth.getSession();
        if (!active) return;
        setSession(data.session);
        setSessionRestoreFailed(Boolean(error));
      } catch {
        if (!active) return;
        setSessionRestoreFailed(true);
      } finally {
        if (active) setIsRestoringSession(false);
      }
    }
    void restoreSession();
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setSessionRestoreFailed(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [demoMode]);

  async function signOut() {
    if (!supabase) return;

    setSigningOut(true);
    setSignOutFailed(false);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setSignOutFailed(true);
        return;
      }
      analytics.track(analyticsEvents.accountSignedOut);
      setAuthMode("signIn");
      setSession(null);
    } catch {
      setSignOutFailed(true);
    } finally {
      setSigningOut(false);
    }
  }

  if (demoMode)
    return (
      <DashboardScreen
        demoData={demoData}
        isSigningOut={false}
        locale={locale}
        onLocaleChange={setLocale}
        onSignOut={() => undefined}
        service={demoData.primaryService}
        signOutFailed={false}
        workspace={demoWorkspace}
      />
    );
  if (!supabase) return <ConfigurationState />;
  if (isRestoringSession) return <LoadingState />;
  if (!session)
    return (
      <AuthScreen
        initialMode={authMode}
        locale={locale}
        onAuthenticated={(nextSession) => {
          setSessionRestoreFailed(false);
          setSession(nextSession);
        }}
        onLocaleChange={setLocale}
        sessionRestoreFailed={sessionRestoreFailed}
      />
    );
  if (
    workspaceState.userId !== session.user.id ||
    workspaceState.kind === "loading"
  ) {
    return <LoadingState />;
  }
  if (workspaceState.kind === "error") {
    return (
      <RecoverableErrorState
        description={t("workspace.loadFailedDescription")}
        onRetry={reloadWorkspace}
        retryLabel={t("common.retry")}
        title={t("workspace.loadFailedTitle")}
      />
    );
  }
  if (workspaceState.kind === "setupRequired")
    return <SetupScreen locale={locale} onComplete={reloadWorkspace} />;
  return (
    <DashboardScreen
      isSigningOut={signingOut}
      locale={locale}
      onLocaleChange={setLocale}
      onSignOut={() => void signOut()}
      service={workspaceState.service}
      signOutFailed={signOutFailed}
      workspace={workspaceState.workspace}
    />
  );
}
