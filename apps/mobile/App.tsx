import { StatusBar } from "expo-status-bar";
import { getLocales } from "expo-localization";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  const t = useMemo(() => createTranslator(locale), [locale]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("common.appName")}</Text>
      <Text>{t("mobile.description")}</Text>
      <View style={styles.languagePicker} accessibilityRole="radiogroup">
        <Text>{t("common.language")}:</Text>
        {supportedLocales.map((item) => (
          <Pressable
            accessibilityLabel={localeLabels[item]}
            accessibilityRole="radio"
            accessibilityState={{ selected: item === locale }}
            key={item}
            onPress={() => setLocale(item)}
            style={[
              styles.languageButton,
              item === locale && styles.selectedLanguageButton,
            ]}
          >
            <Text style={item === locale && styles.selectedLanguageText}>
              {localeLabels[item]}
            </Text>
          </Pressable>
        ))}
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  languagePicker: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
  },
  languageButton: {
    borderColor: "#c7c7c7",
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  selectedLanguageButton: {
    backgroundColor: "#222222",
    borderColor: "#222222",
  },
  selectedLanguageText: {
    color: "#ffffff",
  },
});
