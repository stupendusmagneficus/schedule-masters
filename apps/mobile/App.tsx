import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSupabaseClient } from "@schedule-app/api";
import { createTranslator, detectLocale, localeLabels, supportedLocales, type SupportedLocale } from "@schedule-app/i18n";
import { StatusBar } from "expo-status-bar";
import { getLocales } from "expo-localization";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Session } from "@supabase/supabase-js";

const expoEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const supabaseUrl = expoEnv?.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = expoEnv?.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createSupabaseClient({ url: supabaseUrl, anonKey: supabaseAnonKey, storage: AsyncStorage })
  : null;

type Workspace = { id: string; name: string; slug: string; timezone: string };
type Service = { name: string; duration_minutes: number; price_amount: number };

export default function App() {
  const [locale, setLocale] = useState<SupportedLocale>(() => detectLocale(getLocales()[0]?.languageTag));
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const t = useMemo(() => createTranslator(locale), [locale]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setLoading(false); } });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => { if (active) setSession(nextSession); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (supabase && session) void loadWorkspace(session.user.id);
    else { setWorkspace(null); setService(null); }
  }, [session]);

  async function loadWorkspace(userId: string) {
    if (!supabase) return;
    setLoading(true);
    const { data: member, error: memberError } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (memberError) { setLoading(false); return; }
    if (!member) { setWorkspace(null); setService(null); setLoading(false); return; }
    const [{ data: workspaceData }, { data: serviceData }] = await Promise.all([
      supabase.from("workspaces").select("id, name, slug, timezone").eq("id", member.workspace_id).single(),
      supabase.from("services").select("name, duration_minutes, price_amount").eq("workspace_id", member.workspace_id).eq("is_active", true).order("sort_order").limit(1).maybeSingle(),
    ]);
    setWorkspace(workspaceData); setService(serviceData); setLoading(false);
  }

  if (!supabase) return <ConfigurationState />;
  if (loading && !session) return <LoadingState />;
  if (!session) return <AuthScreen onAuthenticated={setSession} />;
  if (!workspace) return <SetupScreen locale={locale} onComplete={() => void loadWorkspace(session.user.id)} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>{t("common.appName")}</Text><Text style={styles.title}>{workspace.name}</Text><Text style={styles.muted}>Today · {workspace.timezone}</Text></View>
        <Pressable style={styles.signOut} onPress={() => void supabase.auth.signOut()}><Text style={styles.signOutText}>Sign out</Text></Pressable>
      </View>
      <View style={styles.languagePicker} accessibilityRole="radiogroup">
        {supportedLocales.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: item === locale }} key={item} onPress={() => setLocale(item)} style={[styles.languageButton, item === locale && styles.selectedLanguageButton]}><Text style={item === locale && styles.selectedLanguageText}>{localeLabels[item]}</Text></Pressable>)}
      </View>
      <View style={styles.summaryGrid}><View style={styles.stat}><Text style={styles.statLabel}>Bookings</Text><Text style={styles.statValue}>0</Text></View><View style={styles.stat}><Text style={styles.statLabel}>Expected</Text><Text style={styles.statValue}>0 Kč</Text></View></View>
      <View style={styles.panel}><Text style={styles.panelTitle}>Your first service</Text>{service ? <View style={styles.serviceRow}><View><Text style={styles.appointmentName}>{service.name}</Text><Text style={styles.helper}>{service.duration_minutes} min</Text></View><Text style={styles.price}>{Number(service.price_amount).toLocaleString("cs-CZ")} Kč</Text></View> : <Text style={styles.helper}>No active services yet.</Text>}</View>
      <View style={styles.panel}><Text style={styles.panelTitle}>Public booking link</Text><Text style={styles.link}>/{workspace.slug}</Text><Text style={styles.helper}>Clients can choose a service and available time.</Text></View>
      <StatusBar style="auto" />
    </ScrollView>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [isSignUp, setIsSignUp] = useState(true); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  async function submit() {
    if (!supabase || !email.trim() || password.length < 6) { setMessage("Enter an email and a password with at least 6 characters."); return; }
    setBusy(true); setMessage(null);
    const result = isSignUp ? await supabase.auth.signUp({ email: email.trim(), password }) : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) setMessage(result.error.message); else if (result.data.session) onAuthenticated(result.data.session); else setMessage("Check your email to confirm the account, then sign in.");
  }
  return <ScrollView contentContainerStyle={styles.authContainer}><Text style={styles.eyebrow}>SCHEDULE MASTERS</Text><Text style={styles.title}>{isSignUp ? "Create your workspace" : "Welcome back"}</Text><Text style={styles.muted}>Manage your calendar and let clients book online.</Text><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" style={styles.input} value={email} /><TextInput onChangeText={setPassword} placeholder="Password" secureTextEntry style={styles.input} value={password} />{message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}<Pressable disabled={busy} onPress={() => void submit()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{busy ? "Loading…" : isSignUp ? "Create account" : "Sign in"}</Text></Pressable><Pressable onPress={() => setIsSignUp((value) => !value)}><Text style={styles.link}>{isSignUp ? "Already have an account? Sign in" : "Create a new account"}</Text></Pressable></ScrollView>;
}

function SetupScreen({ locale, onComplete }: { locale: SupportedLocale; onComplete: () => void }) {
  const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [serviceName, setServiceName] = useState("Gel manicure"); const [price, setPrice] = useState("700"); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  async function submit() {
    if (!supabase || !name.trim() || !slug.trim() || !serviceName.trim()) { setMessage("Complete the workspace, booking link, and service fields."); return; }
    setBusy(true); setMessage(null);
    const { error } = await supabase.rpc("bootstrap_master_workspace", { p_name: name.trim(), p_slug: slug.trim().toLowerCase(), p_locale: locale, p_service_name: serviceName.trim(), p_duration_minutes: 60, p_price_amount: Number(price) || 0, p_start_local_time: "08:00", p_end_local_time: "21:00" });
    setBusy(false); if (error) setMessage(error.message); else onComplete();
  }
  return <ScrollView contentContainerStyle={styles.authContainer}><Text style={styles.eyebrow}>FIRST SETUP</Text><Text style={styles.title}>Set up your workspace</Text><Text style={styles.muted}>This creates Monday–Sunday availability from 08:00 to 21:00. You can refine it later.</Text><TextInput onChangeText={setName} placeholder="Workspace name" style={styles.input} value={name} /><TextInput autoCapitalize="none" onChangeText={(value) => setSlug(value.replace(/[^a-zA-Z0-9-]/g, "-"))} placeholder="Booking link, e.g. anna-nails" style={styles.input} value={slug} /><TextInput onChangeText={setServiceName} placeholder="First service" style={styles.input} value={serviceName} /><TextInput keyboardType="decimal-pad" onChangeText={setPrice} placeholder="Price in CZK" style={styles.input} value={price} />{message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}<Pressable disabled={busy} onPress={() => void submit()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{busy ? "Saving…" : "Save and continue"}</Text></Pressable></ScrollView>;
}

function LoadingState() { return <View style={styles.center}><ActivityIndicator color="#2f8f7b" /><Text style={styles.muted}>Loading…</Text></View>; }
function ConfigurationState() { return <View style={styles.center}><Text style={styles.title}>Mobile configuration required</Text><Text style={styles.muted}>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to run the mobile app.</Text></View>; }

const styles = StyleSheet.create({
  container: { backgroundColor: "#f5f5f2", gap: 16, padding: 20 }, authContainer: { backgroundColor: "#f5f5f2", gap: 14, justifyContent: "center", minHeight: "100%", padding: 24 }, center: { alignItems: "center", backgroundColor: "#f5f5f2", flex: 1, gap: 12, justifyContent: "center", padding: 24 }, header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", width: "100%" }, eyebrow: { color: "#2f8f7b", fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 8 }, title: { color: "#202725", fontSize: 30, fontWeight: "700" }, muted: { color: "#75807c", lineHeight: 20, marginTop: 4 }, signOut: { padding: 8 }, signOutText: { color: "#217464", fontWeight: "700" }, languagePicker: { flexDirection: "row", gap: 4 }, languageButton: { alignItems: "center", borderColor: "#dee2de", borderRadius: 999, borderWidth: 1, height: 36, justifyContent: "center", minWidth: 44, paddingHorizontal: 8 }, selectedLanguageButton: { backgroundColor: "#202725", borderColor: "#202725" }, selectedLanguageText: { color: "#fff" }, primaryButton: { alignItems: "center", backgroundColor: "#2f8f7b", borderRadius: 8, justifyContent: "center", minHeight: 48, paddingHorizontal: 16, width: "100%" }, primaryButtonText: { color: "#fff", fontWeight: "700" }, panel: { backgroundColor: "#fff", borderColor: "#dee2de", borderRadius: 12, borderWidth: 1, gap: 12, padding: 16, width: "100%" }, panelTitle: { color: "#202725", fontSize: 17, fontWeight: "700" }, summaryGrid: { flexDirection: "row", gap: 8, width: "100%" }, stat: { backgroundColor: "#fafaf8", borderColor: "#dee2de", borderRadius: 8, borderWidth: 1, flex: 1, padding: 14 }, statLabel: { color: "#75807c", fontSize: 12 }, statValue: { color: "#202725", fontSize: 21, fontWeight: "700", marginTop: 6 }, serviceRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, appointmentName: { color: "#202725", fontSize: 16, fontWeight: "600" }, helper: { color: "#75807c", fontSize: 12, lineHeight: 18 }, price: { color: "#217464", fontWeight: "700" }, link: { color: "#217464", fontSize: 15, fontWeight: "600" }, input: { backgroundColor: "#fff", borderColor: "#dee2de", borderRadius: 8, borderWidth: 1, minHeight: 48, paddingHorizontal: 12 }, error: { color: "#a13d3d", fontSize: 13 },
});
