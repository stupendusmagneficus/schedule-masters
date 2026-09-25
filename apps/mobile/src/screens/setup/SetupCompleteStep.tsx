import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  OnboardingDraft,
  SetupTranslator,
} from "../../features/workspace/setupTypes";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import { buildBookingUrl } from "../../utils/bookingUrl";

type SetupCompleteStepProps = {
  readonly bookingWebUrl: string;
  readonly draft: OnboardingDraft;
  readonly onOpenBooking: () => void;
  readonly onOpenDashboard: () => void;
  readonly t: SetupTranslator;
};

export function SetupCompleteStep({
  bookingWebUrl,
  draft,
  onOpenBooking,
  onOpenDashboard,
  t,
}: SetupCompleteStepProps) {
  return (
    <View style={styles.content}>
      <Text style={styles.eyebrow}>✓</Text>
      <Text style={styles.title}>{t("workspace.setupCompleteTitle")}</Text>
      <Text style={styles.description}>
        {t("workspace.setupCompleteDescription")}
      </Text>
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>{draft.serviceName}</Text>
        <Text style={styles.summaryText}>
          {draft.price} Kč · {draft.duration} min
        </Text>
        <Text style={styles.summaryText}>
          {draft.startTime}–{draft.endTime}
        </Text>
      </View>
      <Pressable onPress={onOpenDashboard} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>
          {t("workspace.setupOpenDashboard")}
        </Text>
      </Pressable>
      <Pressable onPress={onOpenBooking} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>
          {t("workspace.setupOpenBooking")}
        </Text>
      </Pressable>
      <Text selectable style={styles.bookingUrl}>
        {buildBookingUrl(bookingWebUrl, draft.slug)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bookingUrl: { ...typography.caption, color: colors.secondaryText },
  content: { gap: 16 },
  description: { ...typography.body, color: colors.secondaryText },
  eyebrow: { color: colors.accent, fontSize: 48, fontWeight: "700" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    ...typography.label,
    color: colors.inverse,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    ...typography.label,
    color: colors.accent,
    fontWeight: "700",
  },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  summaryText: { ...typography.body, color: colors.secondaryText },
  summaryTitle: { ...typography.section, color: colors.primaryText },
  title: { ...typography.heading, color: colors.primaryText },
});
