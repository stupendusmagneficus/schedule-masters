import "react-native-url-polyfill/auto";

import { detectLocale, type SupportedLocale } from "@schedule-app/i18n";
import type { Session } from "@supabase/supabase-js";
import { getLocales } from "expo-localization";
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
  const [locale, setLocale] = useState<SupportedLocale>(() =>
    detectLocale(getLocales()[0]?.languageTag),
  );
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
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
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
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

  if (demoMode)
    return (
      <DashboardScreen
        demoData={demoData}
        locale={locale}
        onLocaleChange={setLocale}
        onSignOut={() => undefined}
        service={demoData.primaryService}
        workspace={demoWorkspace}
      />
    );
  if (!supabase) return <ConfigurationState />;
  if (loading && !session) return <LoadingState />;
  if (!session) return <AuthScreen onAuthenticated={setSession} />;
  if (!workspace)
    return (
      <SetupScreen
        locale={locale}
        onComplete={() => void loadWorkspace(session.user.id)}
      />
    );
  return (
    <DashboardScreen
      locale={locale}
      onLocaleChange={setLocale}
      onSignOut={() => void supabase?.auth.signOut()}
      service={service}
      workspace={workspace}
    />
  );
}
