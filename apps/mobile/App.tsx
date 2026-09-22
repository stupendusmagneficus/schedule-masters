import { StatusBar } from "expo-status-bar";
import { getLocales } from "expo-localization";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  createTranslator,
  detectLocale,
  localeLabels,
  supportedLocales,
  type SupportedLocale,
} from "@schedule-app/i18n";

export default function App() {
  const [locale, setLocale] = useState<SupportedLocale>(() =>
    detectLocale(getLocales()[0]?.languageTag),
  );
  const [showSetup, setShowSetup] = useState(false);
  const [serviceName, setServiceName] = useState("Gel manicure");
  const [servicePrice, setServicePrice] = useState("700");
  const [savedService, setSavedService] = useState({ name: "Gel manicure", price: "700" });
  const t = useMemo(() => createTranslator(locale), [locale]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{t("common.appName")}</Text>
          <Text style={styles.title}>Today</Text>
          <Text style={styles.muted}>Tuesday, 22 September</Text>
        </View>
        <View style={styles.languagePicker} accessibilityRole="radiogroup">
          {supportedLocales.map((item) => (
            <Pressable
              accessibilityLabel={localeLabels[item]}
              accessibilityRole="radio"
              accessibilityState={{ selected: item === locale }}
              key={item}
              onPress={() => setLocale(item)}
              style={[styles.languageButton, item === locale && styles.selectedLanguageButton]}
            >
              <Text style={item === locale && styles.selectedLanguageText}>{localeLabels[item]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={() => setShowSetup((value) => !value)} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{showSetup ? "Close setup" : "Add service or working time"}</Text>
      </Pressable>

      {showSetup && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>First setup</Text>
          <Text style={styles.label}>Service name</Text>
          <TextInput onChangeText={setServiceName} style={styles.input} value={serviceName} />
          <Text style={styles.label}>Price (CZK)</Text>
          <TextInput keyboardType="decimal-pad" onChangeText={setServicePrice} style={styles.input} value={servicePrice} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (serviceName.trim()) setSavedService({ name: serviceName.trim(), price: servicePrice.trim() });
              setShowSetup(false);
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Save service</Text>
          </Pressable>
          <Text style={styles.helper}>Working time: Monday–Friday, 09:00–17:00</Text>
        </View>
      )}

      <View style={styles.summaryGrid}>
        <View style={styles.stat}><Text style={styles.statLabel}>Bookings</Text><Text style={styles.statValue}>4</Text></View>
        <View style={styles.stat}><Text style={styles.statLabel}>Expected</Text><Text style={styles.statValue}>2 400 Kč</Text></View>
      </View>

      <View style={styles.panel}>
        <View style={styles.rowBetween}><Text style={styles.panelTitle}>Next appointments</Text><Text style={styles.helper}>4 total</Text></View>
        <Appointment time="09:30" name="Anna K." service={savedService.name} />
        <Appointment time="13:00" name="Maria P." service={savedService.name} />
        <Appointment time="15:30" name="Eva S." service="Refill" />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Public booking link</Text>
        <Text style={styles.link}>schedule-masters.app/demo-studio</Text>
        <Text style={styles.helper}>Clients can choose {savedService.name} and an available time.</Text>
      </View>
      <StatusBar style="auto" />
    </ScrollView>
  );
}

function Appointment({ time, name, service }: { time: string; name: string; service: string }) {
  return (
    <View style={styles.appointment}>
      <View style={styles.time}><Text style={styles.appointmentTime}>{time}</Text><View style={styles.timeLine} /></View>
      <View style={styles.appointmentContent}><Text style={styles.appointmentName}>{name}</Text><Text style={styles.helper}>{service}</Text></View>
      <Text style={styles.status}>Confirmed</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f2",
    gap: 16,
    padding: 20,
  },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", width: "100%" },
  eyebrow: { color: "#2f8f7b", fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  title: { color: "#202725", fontSize: 30,
    fontWeight: "700",
  },
  muted: { color: "#75807c", marginTop: 4 },
  languagePicker: { flexDirection: "row", gap: 4 },
  languageButton: { alignItems: "center", borderColor: "#dee2de", borderRadius: 999, borderWidth: 1, height: 36, justifyContent: "center", minWidth: 44, paddingHorizontal: 8 },
  selectedLanguageButton: { backgroundColor: "#202725", borderColor: "#202725" },
  selectedLanguageText: { color: "#ffffff" },
  primaryButton: { alignItems: "center", backgroundColor: "#2f8f7b", borderRadius: 8, justifyContent: "center", minHeight: 48, paddingHorizontal: 16, width: "100%" },
  primaryButtonText: { color: "#ffffff", fontWeight: "700" },
  panel: { backgroundColor: "#ffffff", borderColor: "#dee2de", borderRadius: 12, borderWidth: 1, gap: 12, padding: 16, width: "100%" },
  panelTitle: { color: "#202725", fontSize: 17, fontWeight: "700" },
  summaryGrid: { flexDirection: "row", gap: 8, width: "100%" },
  stat: { backgroundColor: "#fafaf8", borderColor: "#dee2de", borderRadius: 8, borderWidth: 1, flex: 1, padding: 14 },
  statLabel: { color: "#75807c", fontSize: 12 },
  statValue: { color: "#202725", fontSize: 21, fontWeight: "700", marginTop: 6 },
  rowBetween: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  appointment: { alignItems: "center", borderTopColor: "#dee2de", borderTopWidth: 1, flexDirection: "row", gap: 12, paddingVertical: 14 },
  time: { alignItems: "center", width: 48 },
  appointmentTime: { color: "#4f5c58", fontSize: 12, fontWeight: "700" },
  timeLine: { backgroundColor: "#2f8f7b", height: 3, marginTop: 6, width: 24 },
  appointmentContent: { flex: 1 },
  appointmentName: { color: "#202725", fontSize: 16, fontWeight: "600" },
  status: { backgroundColor: "#ddf1eb", borderRadius: 999, color: "#217464", fontSize: 11, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5 },
  label: { color: "#4f5c58", fontSize: 13, fontWeight: "600" },
  input: { backgroundColor: "#fafaf8", borderColor: "#dee2de", borderRadius: 8, borderWidth: 1, minHeight: 44, paddingHorizontal: 12 },
  secondaryButton: { alignItems: "center", borderColor: "#2f8f7b", borderRadius: 8, borderWidth: 1, minHeight: 44, justifyContent: "center" },
  secondaryButtonText: { color: "#217464", fontWeight: "700" },
  link: { color: "#217464", fontSize: 15, fontWeight: "600" },
  helper: { color: "#75807c", fontSize: 12, lineHeight: 18 },
});
