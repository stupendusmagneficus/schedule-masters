import { formatDuration, type SupportedLocale } from "@schedule-app/i18n";
import { StyleSheet, Text, View } from "react-native";
import { ActionButton } from "../../components/ActionButton";
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
  readonly locale: SupportedLocale;
  readonly onOpenBooking: () => void;
  readonly onOpenDashboard: () => void;
  readonly t: SetupTranslator;
};

export function SetupCompleteStep({
  bookingWebUrl,
  draft,
  locale,
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
          {draft.price} Kč · {formatDuration(Number(draft.duration), locale)}
        </Text>
        <Text style={styles.summaryText}>
          {draft.startTime}–{draft.endTime}
        </Text>
      </View>
      <ActionButton
        label={t("workspace.setupOpenDashboard")}
        onPress={onOpenDashboard}
        variant="primary"
      />
      <ActionButton
        label={t("workspace.setupOpenBooking")}
        onPress={onOpenBooking}
        variant="secondary"
      />
      <Text selectable style={styles.bookingUrl}>
        {buildBookingUrl(bookingWebUrl, draft.slug)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bookingUrl: { ...typography.caption, color: colors.secondaryText },
  content: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    gap: 16,
    padding: 20,
  },
  description: { ...typography.body, color: colors.secondaryText },
  eyebrow: { color: colors.accent, fontSize: 48, fontWeight: "700" },
  summary: {
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    gap: 4,
    padding: 16,
  },
  summaryText: { ...typography.body, color: colors.secondaryText },
  summaryTitle: { ...typography.section, color: colors.primaryText },
  title: { ...typography.heading, color: colors.primaryText },
});
