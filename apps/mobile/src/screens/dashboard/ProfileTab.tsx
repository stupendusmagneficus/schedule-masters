import { Pressable, StyleSheet, Text, View } from "react-native";

import { InfoCard } from "../../components/InfoCard";
import { LocalePicker } from "../../components/LocalePicker";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Workspace } from "../../types";
import type { DashboardTabProps } from "./types";

type ProfileTabProps = DashboardTabProps & {
  readonly isSigningOut: boolean;
  readonly onLocaleChange: (locale: DashboardTabProps["locale"]) => void;
  readonly onOpenBookingLink: () => void;
  readonly onSignOut: () => void;
  readonly bookingUrl: string;
  readonly signOutFailed: boolean;
  readonly workspace: Workspace;
};

export function ProfileTab({
  isSigningOut,
  locale,
  onLocaleChange,
  onOpenBookingLink,
  onSignOut,
  bookingUrl,
  signOutFailed,
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
        <LocalePicker locale={locale} onLocaleChange={onLocaleChange} />
      </InfoCard>
      <InfoCard>
        <Text style={styles.sectionTitle}>{t("mobile.publicBookingLink")}</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={bookingUrl}
          onPress={onOpenBookingLink}
        >
          <Text style={styles.link}>{bookingUrl}</Text>
        </Pressable>
        <Text style={styles.helper}>
          {t("mobile.publicBookingDescription")}
        </Text>
      </InfoCard>
      {signOutFailed && (
        <Text accessibilityRole="alert" style={styles.signOutError}>
          {t("auth.signOutFailed")}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isSigningOut }}
        disabled={isSigningOut}
        onPress={onSignOut}
        style={[styles.signOutButton, isSigningOut && styles.disabledButton]}
      >
        <Text style={styles.signOutText}>
          {isSigningOut ? t("common.loading") : t("mobile.signOut")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  disabledButton: { opacity: 0.6 },
  eyebrow: {
    color: colors.accent,
    marginBottom: 6,
    textTransform: "uppercase",
    ...typography.eyebrow,
  },
  helper: { ...typography.body, color: colors.secondaryText },
  link: {
    color: colors.accent,
    marginBottom: 8,
    ...typography.label,
    fontWeight: "700",
  },
  sectionTitle: {
    color: colors.primaryText,
    marginBottom: 12,
    ...typography.section,
  },
  signOutButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  signOutError: { ...typography.body, color: colors.danger },
  signOutText: { ...typography.label, color: colors.danger, fontWeight: "700" },
  title: { ...typography.heading, color: colors.primaryText },
});
