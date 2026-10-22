import { createTranslator, type SupportedLocale } from "@schedule-app/i18n";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";
import { LocalePicker } from "./LocalePicker";

export function AuthPage({
  children,
  locale,
  onLocaleChange,
}: {
  readonly children: ReactNode;
  readonly locale: SupportedLocale;
  readonly onLocaleChange: (locale: SupportedLocale) => void;
}) {
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.content}>
        <View style={styles.language}>
          <LocalePicker locale={locale} onLocaleChange={onLocaleChange} />
        </View>
        <Text style={styles.eyebrow}>
          {createTranslator(locale)("common.appName")}
        </Text>
        {children}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  scroll: {
    backgroundColor: colors.canvas,
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
  },
  content: { width: "100%", maxWidth: 480, alignSelf: "center", gap: 16 },
  language: { alignItems: "flex-end" },
  eyebrow: { ...typography.eyebrow, color: colors.accent },
});
