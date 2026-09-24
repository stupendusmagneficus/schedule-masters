import { localeLabels, supportedLocales } from "@schedule-app/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { InfoCard } from "../../components/InfoCard";
import { colors, radii } from "../../theme/tokens";
import type { Workspace } from "../../types";
import type { DashboardTabProps } from "./types";

type ProfileTabProps = DashboardTabProps & {
  readonly onLocaleChange: (locale: DashboardTabProps["locale"]) => void;
  readonly onSignOut: () => void;
  readonly workspace: Workspace;
};

export function ProfileTab({
  locale,
  onLocaleChange,
  onSignOut,
  t,
  workspace,
}: ProfileTabProps) {
  return (
    <View style={styles.content}>
      <View>
        <Text style={styles.eyebrow}>{t("mobile.profile")}</Text>
        <Text style={styles.title}>{workspace.name}</Text>
        <Text style={styles.helper}>{workspace.timezone}</Text>
      </View>
      <InfoCard>
        <Text style={styles.sectionTitle}>{t("common.language")}</Text>
        <View accessibilityRole="radiogroup" style={styles.languagePicker}>
          {supportedLocales.map((item) => {
            const isSelected = item === locale;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                key={item}
                onPress={() => onLocaleChange(item)}
                style={[
                  styles.languageButton,
                  isSelected && styles.selectedLanguageButton,
                ]}
              >
                <Text
                  style={[
                    styles.languageText,
                    isSelected && styles.selectedLanguageText,
                  ]}
                >
                  {localeLabels[item]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </InfoCard>
      <InfoCard>
        <Text style={styles.sectionTitle}>{t("mobile.publicBookingLink")}</Text>
        <Text style={styles.link}>/{workspace.slug}</Text>
        <Text style={styles.helper}>
          {t("mobile.publicBookingDescription")}
        </Text>
      </InfoCard>
      <Pressable onPress={onSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>{t("mobile.signOut")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  helper: { color: colors.secondaryText, fontSize: 14, lineHeight: 20 },
  languageButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 52,
    paddingHorizontal: 10,
  },
  languagePicker: { flexDirection: "row", gap: 8 },
  languageText: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: "700",
  },
  link: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionTitle: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  selectedLanguageButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  selectedLanguageText: { color: colors.inverse },
  signOutButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
  title: { color: colors.primaryText, fontSize: 30, fontWeight: "700" },
});
