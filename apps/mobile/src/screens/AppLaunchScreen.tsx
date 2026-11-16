import { createTranslator, defaultLocale } from "@schedule-app/i18n";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";

const appName = createTranslator(defaultLocale)("common.appName");

export function AppLaunchScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Text accessibilityRole="header" style={styles.wordmark}>
        {appName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: colors.action,
    flex: 1,
    justifyContent: "center",
  },
  wordmark: {
    ...typography.display,
    color: colors.actionText,
    textAlign: "center",
  },
});
