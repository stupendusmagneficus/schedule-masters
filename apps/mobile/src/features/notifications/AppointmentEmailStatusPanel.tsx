import type { Database } from "@schedule-app/api";
import type { MessageKey } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ActionButton } from "../../components/ActionButton";
import { InfoCard } from "../../components/InfoCard";
import { colors } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import {
  type AppointmentEmail,
  listAppointmentEmails,
} from "./appointmentEmailStatus";

type Props = {
  client: SupabaseClient<Database>;
  workspaceId: string;
  appointmentId: string;
  t: (key: MessageKey) => string;
};
export function AppointmentEmailStatusPanel({
  client,
  workspaceId,
  appointmentId,
  t,
}: Props) {
  const [rows, setRows] = useState<AppointmentEmail[] | null>(null),
    [error, setError] = useState(false),
    [version, setVersion] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Manual refresh restarts the bounded polling window.
  useEffect(() => {
    let active = true,
      busy = false,
      count = 0;
    const load = async () => {
      if (busy || count >= 5 || AppState.currentState === "background") return;
      busy = true;
      count++;
      try {
        const next = await listAppointmentEmails(
          client,
          workspaceId,
          appointmentId,
        );
        if (active) {
          setRows(next);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      } finally {
        busy = false;
      }
    };
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [client, workspaceId, appointmentId, version]);
  if (rows?.length === 0 && !error) return null;
  return (
    <InfoCard>
      <Text style={styles.title}>{t("mobile.emailDeliveryTitle")}</Text>
      {!rows && !error ? (
        <ActivityIndicator
          accessibilityLabel={t("common.loading")}
          color={colors.secondaryText}
        />
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.hint}>
          {t("mobile.emailDeliveryLoadFailed")}
        </Text>
      ) : null}
      {rows?.map((row) => (
        <View key={row.id} style={styles.row} accessibilityLiveRegion="polite">
          <Text style={styles.label}>
            {t(
              row.event_type.includes("cancelled")
                ? "mobile.emailEventCancellation"
                : row.event_type === "declined"
                  ? "mobile.emailEventDecline"
                  : row.event_type === "request_received"
                    ? "mobile.emailEventRequest"
                    : "mobile.emailEventConfirmation",
            )}
          </Text>
          <Text style={styles.state}>
            {t(`mobile.emailState.${row.state}`)}
          </Text>
        </View>
      ))}
      <Text style={styles.hint}>
        {t(
          rows?.some((row) =>
            [
              "failed",
              "bounced",
              "complained",
              "suppressed",
              "not_configured",
            ].includes(row.state),
          )
            ? "mobile.emailDeliveryRecovery"
            : "mobile.emailDeliveryHint",
        )}
      </Text>
      <ActionButton
        label={t("mobile.emailDeliveryRefresh")}
        onPress={() => setVersion((value) => value + 1)}
        variant="quiet"
      />
    </InfoCard>
  );
}
const styles = StyleSheet.create({
  title: { ...typography.section, color: colors.primaryText },
  row: {
    paddingVertical: 8,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  label: { ...typography.caption, color: colors.secondaryText },
  state: { ...typography.body, color: colors.primaryText },
  hint: {
    ...typography.caption,
    color: colors.secondaryText,
    marginVertical: 8,
  },
});
