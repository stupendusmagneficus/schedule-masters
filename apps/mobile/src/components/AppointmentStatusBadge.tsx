import type { Database } from "@schedule-app/api";
import type { MessageKey } from "@schedule-app/i18n";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

export type AppointmentStatus =
  Database["public"]["Enums"]["appointment_status"];

export type AppointmentStatusBadgeProps = {
  readonly label: string;
  readonly status: AppointmentStatus;
};

export function getAppointmentStatusLabel(
  status: AppointmentStatus,
  t: (key: MessageKey) => string,
): string {
  switch (status) {
    case "cancelled_by_customer":
      return t("mobile.statusCancelledByCustomer");
    case "cancelled_by_master":
      return t("mobile.statusCancelledByMaster");
    case "completed":
      return t("mobile.statusCompleted");
    case "no_show":
      return t("mobile.statusNoShow");
    case "confirmed":
      return t("mobile.confirmed");
    case "pending":
      return t("mobile.pending");
  }
}

export function AppointmentStatusBadge({
  label,
  status,
}: AppointmentStatusBadgeProps) {
  const badgeStyle = getBadgeStyle(status);

  return (
    <View accessibilityLabel={label} style={[styles.badge, badgeStyle.badge]}>
      <Text style={[styles.label, badgeStyle.label]}>{label}</Text>
    </View>
  );
}

function getBadgeStyle(status: AppointmentStatus) {
  switch (status) {
    case "confirmed":
      return { badge: styles.confirmedBadge, label: styles.confirmedLabel };
    case "pending":
      return { badge: styles.pendingBadge, label: styles.pendingLabel };
    case "completed":
      return { badge: styles.completedBadge, label: styles.completedLabel };
    case "cancelled_by_customer":
    case "cancelled_by_master":
    case "no_show":
      return { badge: styles.cancelledBadge, label: styles.cancelledLabel };
  }
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.pill,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelledBadge: { backgroundColor: colors.dangerSoft },
  cancelledLabel: { color: colors.danger },
  confirmedBadge: { backgroundColor: colors.accentSoft },
  confirmedLabel: { color: colors.accentPressed },
  completedBadge: { backgroundColor: colors.subtleSurface },
  completedLabel: { color: colors.secondaryText },
  label: { ...typography.caption, fontWeight: "700" },
  pendingBadge: { backgroundColor: colors.pendingSoft },
  pendingLabel: { color: colors.pendingText },
});
