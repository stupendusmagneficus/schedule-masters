import type { SupportedLocale } from "@schedule-app/i18n";
import { formatDate } from "@schedule-app/i18n";
import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

export type FreeSlotsShareCardDay = {
  readonly date: string;
  readonly times: readonly string[];
};

type FreeSlotsShareCardProps = {
  readonly days: readonly FreeSlotsShareCardDay[];
  readonly locale: SupportedLocale;
  readonly periodLabel: string;
  readonly title: string;
  readonly workspaceName: string;
};

export const FreeSlotsShareCard = forwardRef<View, FreeSlotsShareCardProps>(
  function FreeSlotsShareCard(
    { days, locale, periodLabel, title, workspaceName },
    ref,
  ) {
    return (
      <View collapsable={false} ref={ref} style={styles.card}>
        <View style={styles.brandBar} />
        <Text style={styles.workspaceName}>{workspaceName}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.period}>{periodLabel}</Text>
        <View style={styles.days}>
          {days.map((day) => (
            <View key={day.date} style={styles.day}>
              <Text style={styles.date}>
                {formatDate(new Date(`${day.date}T12:00:00.000Z`), locale, {
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                  weekday: "short",
                })}
              </Text>
              <Text style={styles.times}>{day.times.join(" · ")}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.footer}>Schedule Masters</Text>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  brandBar: {
    backgroundColor: colors.action,
    borderTopLeftRadius: radii.surface,
    borderTopRightRadius: radii.surface,
    height: 8,
    marginHorizontal: -16,
    marginTop: -16,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  date: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "700",
    width: 94,
  },
  day: {
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
  },
  days: { marginTop: 4 },
  footer: {
    ...typography.caption,
    color: colors.secondaryText,
    marginTop: 4,
    textAlign: "right",
  },
  period: { ...typography.caption, color: colors.secondaryText },
  times: { ...typography.caption, color: colors.primaryText, flex: 1 },
  title: {
    ...typography.section,
    color: colors.primaryText,
    fontWeight: "700",
  },
  workspaceName: {
    ...typography.label,
    color: colors.action,
    fontWeight: "700",
  },
});
