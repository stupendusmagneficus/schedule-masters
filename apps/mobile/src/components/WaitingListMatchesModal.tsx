import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate, formatTime } from "@schedule-app/i18n";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { MasterWaitingListMatch } from "../features/waitingList/waitingList";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";
import { FullscreenModal } from "./FullscreenModal";
import { InfoCard } from "./InfoCard";

export function WaitingListMatchesModal({
  error,
  isLoading,
  locale,
  matches,
  onBook,
  onClose,
  onRetry,
  saving,
  t,
  timezone,
  visible,
}: {
  readonly error: boolean;
  readonly isLoading: boolean;
  readonly locale: SupportedLocale;
  readonly matches: readonly MasterWaitingListMatch[];
  readonly onBook: (match: MasterWaitingListMatch) => void;
  readonly onClose: () => void;
  readonly onRetry: () => void;
  readonly saving: boolean;
  readonly t: (key: MessageKey) => string;
  readonly timezone: string;
  readonly visible: boolean;
}) {
  return (
    <FullscreenModal
      closeDisabled={saving}
      closeLabel={t("common.close")}
      onClose={onClose}
      title={t("mobile.waitingListMatches")}
      visible={visible}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.helper}>
          {t("mobile.waitingListMatchesDescription")}
        </Text>
        {isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.helper}>{t("common.loading")}</Text>
          </View>
        ) : error ? (
          <View style={styles.errorState}>
            <Text style={styles.error}>
              {t("mobile.waitingListLoadFailed")}
            </Text>
            <ActionButton
              label={t("common.retry")}
              onPress={onRetry}
              size="compact"
              style={styles.retryButton}
              variant="quiet"
            />
          </View>
        ) : matches.length === 0 ? (
          <InfoCard>
            <Text style={styles.helper}>
              {t("mobile.waitingListMatchesEmpty")}
            </Text>
          </InfoCard>
        ) : (
          matches.map((match) => (
            <InfoCard key={match.id} style={styles.card}>
              <Text style={styles.name}>{match.customer_name}</Text>
              <Text style={styles.helper}>
                {match.service_name} ·{" "}
                {formatDate(new Date(match.starts_at), locale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: timezone,
                })}{" "}
                ·{" "}
                {formatTime(new Date(match.starts_at), locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: timezone,
                })}
              </Text>
              {match.customer_phone || match.customer_email ? (
                <Text style={styles.helper}>
                  {[match.customer_phone, match.customer_email]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => onBook(match)}
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  {t("mobile.waitingListBook")}
                </Text>
              </Pressable>
            </InfoCard>
          ))
        )}
      </ScrollView>
    </FullscreenModal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 40 },
  helper: { ...typography.body, color: colors.secondaryText },
  error: { ...typography.body, color: colors.danger },
  errorState: { alignItems: "flex-start", gap: 4 },
  retryButton: { alignSelf: "flex-start", marginLeft: -10 },
  state: { alignItems: "center", flexDirection: "row", gap: 10 },
  card: { gap: 6, padding: 12 },
  name: { ...typography.body, color: colors.primaryText, fontWeight: "700" },
  button: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.pill,
    justifyContent: "center",
    marginTop: 6,
    minHeight: 44,
  },
  buttonText: { ...typography.label, color: colors.surface },
});
