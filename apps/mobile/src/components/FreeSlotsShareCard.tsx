import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate, formatTime } from "@schedule-app/i18n";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Workspace } from "../types";

type FreeSlot = {
  readonly available_date: string;
  readonly starts_at: string;
};

export function FreeSlotsShareCard({
  bookingUrl,
  dates,
  locale,
  slotsByDate,
  t,
  workspace,
}: {
  readonly bookingUrl: string;
  readonly dates: readonly string[];
  readonly locale: SupportedLocale;
  readonly slotsByDate: ReadonlyMap<string, readonly FreeSlot[]>;
  readonly t: (key: MessageKey) => string;
  readonly workspace: Workspace;
}) {
  return (
    <View collapsable={false} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.monogram}>
          <Text style={styles.monogramText}>
            {getWorkspaceMonogram(workspace.name)}
          </Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.workspaceName}>{workspace.name}</Text>
          <Text style={styles.headerSubtitle}>
            {t("mobile.freeSlotsShareDescription")}
          </Text>
        </View>
      </View>

      <View style={styles.schedule}>
        <Text style={styles.scheduleTitle}>
          {t("mobile.freeSlotsShareGraphicTitle")}
        </Text>
        {dates.map((date) => (
          <View key={date} style={styles.day}>
            <Text style={styles.date}>
              {formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
                day: "numeric",
                month: "numeric",
                timeZone: "UTC",
                weekday: "short",
              })}
            </Text>
            <Text style={styles.times}>
              {(slotsByDate.get(date) ?? [])
                .map((slot) =>
                  formatTime(new Date(slot.starts_at), locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: workspace.timezone,
                  }),
                )
                .join(" · ")}
            </Text>
          </View>
        ))}
        <Text style={styles.availabilityNote}>
          {t("mobile.freeSlotsShareAvailabilityNote")}
        </Text>
      </View>

      <View style={styles.bookingLink}>
        <Text style={styles.bookingLabel}>
          {t("mobile.freeSlotsShareBookingLink")}
        </Text>
        <Text selectable style={styles.bookingUrl}>
          {bookingUrl}
        </Text>
      </View>
    </View>
  );
}

function getWorkspaceMonogram(workspaceName: string) {
  return workspaceName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toLocaleUpperCase();
}

const styles = StyleSheet.create({
  availabilityNote: {
    ...typography.caption,
    color: colors.secondaryText,
    marginTop: 12,
  },
  bookingLabel: {
    ...typography.caption,
    color: colors.secondaryText,
    marginBottom: 4,
  },
  bookingLink: {
    backgroundColor: colors.subtleSurface,
    borderBottomLeftRadius: radii.surface,
    borderBottomRightRadius: radii.surface,
    padding: 16,
  },
  bookingUrl: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "600",
  },
  card: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderRadius: radii.surface,
    borderWidth: 1,
    overflow: "hidden",
  },
  date: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "700",
    width: 100,
  },
  day: {
    alignItems: "flex-start",
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    paddingVertical: 10,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.action,
    flexDirection: "row",
    gap: 12,
    padding: 18,
  },
  headerSubtitle: { ...typography.caption, color: colors.actionText },
  identity: { flex: 1, gap: 4 },
  monogram: {
    alignItems: "center",
    backgroundColor: colors.actionText,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  monogramText: {
    ...typography.label,
    color: colors.action,
    fontWeight: "700",
  },
  schedule: { paddingHorizontal: 18, paddingVertical: 16 },
  scheduleTitle: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "700",
    marginBottom: 8,
  },
  times: { ...typography.caption, color: colors.secondaryText, flex: 1 },
  workspaceName: {
    ...typography.section,
    color: colors.actionText,
    fontWeight: "700",
  },
});
