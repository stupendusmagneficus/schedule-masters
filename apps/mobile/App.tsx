import "react-native-url-polyfill/auto";

import { defaultLocale, type SupportedLocale } from "@schedule-app/i18n";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  ConfigurationState,
  LoadingState,
} from "./src/components/StatusStates";
import { demoData, demoWorkspace } from "./src/demo/mockData";
import { isDemoMode } from "./src/demo/mode";
import { analytics, analyticsEvents } from "./src/lib/analytics";
import { supabase } from "./src/lib/supabase";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { SetupScreen } from "./src/screens/SetupScreen";
import type { Service, Workspace } from "./src/types";

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
  const [loading, setLoading] = useState(Boolean(supabase));
  const [sessionRestoreFailed, setSessionRestoreFailed] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [service, setService] = useState<Service | null>(null);

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
        if (active) setLoading(false);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadWorkspace only depends on the stable client and React state setters.
  useEffect(() => {
    if (demoMode) return;
    if (supabase && session) void loadWorkspace(session.user.id);
    else {
      setWorkspace(null);
      setService(null);
    }
  }, [demoMode, session]);

  async function loadWorkspace(userId: string) {
    if (!supabase) return;
    setLoading(true);
    const { data: member, error: memberError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (memberError) {
      setLoading(false);
      return;
    }
    if (!member) {
      setWorkspace(null);
      setService(null);
      setLoading(false);
      return;
    }
    const [{ data: workspaceData }, { data: serviceData }] = await Promise.all([
      supabase
        .from("workspaces")
        .select("id, name, slug, timezone")
        .eq("id", member.workspace_id)
        .single(),
      supabase
        .from("services")
        .select("name, duration_minutes, price_amount")
        .eq("workspace_id", member.workspace_id)
        .eq("is_active", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle(),
    ]);
    setWorkspace(workspaceData);
    setService(serviceData);
    setLoading(false);
  }

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
      setSession(null);
      setService(null);
      setWorkspace(null);
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
  if (loading) return <LoadingState />;
  if (!session)
    return (
      <AuthScreen
        locale={locale}
        onAuthenticated={(nextSession) => {
          setSessionRestoreFailed(false);
          setSession(nextSession);
        }}
        onLocaleChange={setLocale}
        sessionRestoreFailed={sessionRestoreFailed}
      />
    );
  if (!workspace)
    return (
      <SetupScreen
        locale={locale}
        onComplete={() => void loadWorkspace(session.user.id)}
      />
    );
  return (
    <DashboardScreen
      isSigningOut={signingOut}
      locale={locale}
      onLocaleChange={setLocale}
      onSignOut={() => void signOut()}
      service={service}
      signOutFailed={signOutFailed}
      workspace={workspace}
    />
  );
}
