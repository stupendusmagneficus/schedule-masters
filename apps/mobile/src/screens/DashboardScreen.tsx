import { createTranslator, localeLabels, supportedLocales, type SupportedLocale } from "@schedule-app/i18n";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Service, Workspace } from "../types";

type DashboardScreenProps = {
  readonly locale: SupportedLocale;
  readonly onLocaleChange: (locale: SupportedLocale) => void;
  readonly onSignOut: () => void;
  readonly service: Service | null;
  readonly workspace: Workspace;
};

export function DashboardScreen({ locale, onLocaleChange, onSignOut, service, workspace }: DashboardScreenProps) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  return <ScrollView contentContainerStyle={styles.container}><View style={styles.header}><View><Text style={styles.eyebrow}>{t("common.appName")}</Text><Text style={styles.title}>{workspace.name}</Text><Text style={styles.muted}>Today · {workspace.timezone}</Text></View><Pressable style={styles.signOut} onPress={onSignOut}><Text style={styles.signOutText}>Sign out</Text></Pressable></View><View style={styles.languagePicker} accessibilityRole="radiogroup">{supportedLocales.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: item === locale }} key={item} onPress={() => onLocaleChange(item)} style={[styles.languageButton, item === locale && styles.selectedLanguageButton]}><Text style={item === locale && styles.selectedLanguageText}>{localeLabels[item]}</Text></Pressable>)}</View><View style={styles.summaryGrid}><View style={styles.stat}><Text style={styles.statLabel}>Bookings</Text><Text style={styles.statValue}>0</Text></View><View style={styles.stat}><Text style={styles.statLabel}>Expected</Text><Text style={styles.statValue}>0 Kč</Text></View></View><View style={styles.panel}><Text style={styles.panelTitle}>Your first service</Text>{service ? <View style={styles.serviceRow}><View><Text style={styles.appointmentName}>{service.name}</Text><Text style={styles.helper}>{service.duration_minutes} min</Text></View><Text style={styles.price}>{Number(service.price_amount).toLocaleString("cs-CZ")} Kč</Text></View> : <Text style={styles.helper}>No active services yet.</Text>}</View><View style={styles.panel}><Text style={styles.panelTitle}>Public booking link</Text><Text style={styles.link}>/{workspace.slug}</Text><Text style={styles.helper}>Clients can choose a service and available time.</Text></View><StatusBar style="auto" /></ScrollView>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f5f5f2", gap: 16, padding: 20 },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", width: "100%" },
  eyebrow: { color: "#2f8f7b", fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  title: { color: "#202725", fontSize: 30, fontWeight: "700" },
  muted: { color: "#75807c", lineHeight: 20, marginTop: 4 },
  signOut: { padding: 8 }, signOutText: { color: "#217464", fontWeight: "700" },
  languagePicker: { flexDirection: "row", gap: 4 },
  languageButton: { alignItems: "center", borderColor: "#dee2de", borderRadius: 999, borderWidth: 1, height: 36, justifyContent: "center", minWidth: 44, paddingHorizontal: 8 },
  selectedLanguageButton: { backgroundColor: "#202725", borderColor: "#202725" }, selectedLanguageText: { color: "#fff" },
  summaryGrid: { flexDirection: "row", gap: 8, width: "100%" }, stat: { backgroundColor: "#fafaf8", borderColor: "#dee2de", borderRadius: 8, borderWidth: 1, flex: 1, padding: 14 }, statLabel: { color: "#75807c", fontSize: 12 }, statValue: { color: "#202725", fontSize: 21, fontWeight: "700", marginTop: 6 },
  panel: { backgroundColor: "#fff", borderColor: "#dee2de", borderRadius: 12, borderWidth: 1, gap: 12, padding: 16, width: "100%" }, panelTitle: { color: "#202725", fontSize: 17, fontWeight: "700" },
  serviceRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, appointmentName: { color: "#202725", fontSize: 16, fontWeight: "600" }, helper: { color: "#75807c", fontSize: 12, lineHeight: 18 }, price: { color: "#217464", fontWeight: "700" }, link: { color: "#217464", fontSize: 15, fontWeight: "600" },
});
