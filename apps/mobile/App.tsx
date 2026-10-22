import "expo-font";
import "react-native-url-polyfill/auto";

import {
  createTranslator,
  defaultLocale,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  ConfigurationState,
  LoadingState,
  RecoverableErrorState,
} from "./src/components/StatusStates";
import { mobileEnv } from "./src/config/env";
import { demoData, demoWorkspace } from "./src/demo/mockData";
import { isDemoMode } from "./src/demo/mode";
import {
  getCurrentWebOrigin,
  getEmailRedirectTo,
} from "./src/features/auth/authRedirect";
import { useAuthSession } from "./src/features/auth/useAuthSession";
import {
  loadLocalePreference,
  saveLocalePreference,
} from "./src/features/locale/localePreference";
import { useMasterWorkspace } from "./src/features/workspace/useMasterWorkspace";
import { analytics, analyticsEvents } from "./src/lib/analytics";
import { supabase } from "./src/lib/supabase";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { PasswordRecoveryScreen } from "./src/screens/PasswordRecoveryScreen";
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
  const localeWasChanged = useRef(false);
  const auth = useAuthSession(
    supabase,
    demoMode,
    getEmailRedirectTo(
      Platform.OS === "web" ? "web" : "native",
      Platform.OS === "web" ? getCurrentWebOrigin() : undefined,
      mobileEnv.authRedirectUrl,
    ),
  );
  const { authMode, session, sessionRestoreFailed, isPasswordRecovery } =
    auth.state;
  const dispatchAuth = auth.dispatch;
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { reload: reloadWorkspace, state: workspaceState } = useMasterWorkspace(
    {
      client: supabase,
      userId:
        !auth.restoring && !isPasswordRecovery
          ? (session?.user.id ?? null)
          : null,
    },
  );
  const t = useMemo(() => createTranslator(locale), [locale]);

  useEffect(() => {
    let active = true;
    void loadLocalePreference().then((savedLocale) => {
      if (active && !localeWasChanged.current) setLocale(savedLocale);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const runtime = globalThis as typeof globalThis & {
      document?: { documentElement: { lang: string } };
    };
    if (Platform.OS === "web" && runtime.document) {
      runtime.document.documentElement.lang = locale === "cz" ? "cs" : locale;
    }
  }, [locale]);

  function handleLocaleChange(nextLocale: SupportedLocale) {
    localeWasChanged.current = true;
    setLocale(nextLocale);
    void saveLocalePreference(nextLocale);
  }

  useEffect(() => {
    if (demoMode) return;
    void analytics.init();
    analytics.track(analyticsEvents.appOpened);
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
      dispatchAuth({ type: "signedOut" });
    } catch {
      setSignOutFailed(true);
    } finally {
      setSigningOut(false);
    }
  }

  if (demoMode)
    return (
      <DashboardScreen
        client={null}
        demoData={demoData}
        isSigningOut={false}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        onSignOut={() => undefined}
        signOutFailed={false}
        canManageServices
        canManageWorkspace={false}
        onWorkspaceSaved={() => undefined}
        services={[demoData.primaryService]}
        workspace={demoWorkspace}
      />
    );
  if (!supabase) return <ConfigurationState />;
  if (auth.restoring) return <LoadingState />;
  if (session && isPasswordRecovery)
    return (
      <PasswordRecoveryScreen
        client={supabase}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        onComplete={auth.finishRecovery}
        onCancel={() => void signOut()}
        signingOut={signingOut}
        signOutFailed={signOutFailed}
      />
    );
  if (!session)
    return (
      <AuthScreen
        authCallbackFailed={auth.callbackFailed}
        initialMode={authMode}
        locale={locale}
        onAuthenticated={(nextSession) => {
          dispatchAuth({ session: nextSession, type: "authenticated" });
        }}
        onLocaleChange={handleLocaleChange}
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
    return (
      <SetupScreen
        locale={locale}
        onComplete={reloadWorkspace}
        userId={session.user.id}
      />
    );
  return (
    <DashboardScreen
      client={supabase}
      isSigningOut={signingOut}
      locale={locale}
      onLocaleChange={handleLocaleChange}
      onSignOut={() => void signOut()}
      signOutFailed={signOutFailed}
      canManageWorkspace={workspaceState.memberRole === "owner"}
      onWorkspaceSaved={() => void reloadWorkspace()}
      canManageServices={
        workspaceState.memberRole === "owner" ||
        workspaceState.memberRole === "admin"
      }
      services={workspaceState.services}
      workspace={workspaceState.workspace}
    />
  );
}
