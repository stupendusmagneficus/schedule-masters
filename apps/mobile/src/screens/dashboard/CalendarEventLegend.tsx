import type { MessageKey } from "@schedule-app/i18n";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/tokens";
import { typography } from "../../theme/typography";

export function CalendarEventLegend({
  t,
}: {
  readonly t: (key: MessageKey) => string;
}) {
  return (
    <View accessibilityRole="summary" style={styles.root}>
      <LegendItem
        color={colors.accent}
        label={t("mobile.calendarManualBooking")}
      />
      <LegendItem
        color={colors.scheduleOnline}
        label={t("mobile.calendarOnlineBooking")}
      />
      <LegendItem color={colors.danger} label={t("mobile.calendarBreak")} />
    </View>
  );
}

function LegendItem({
  color,
  label,
}: {
  readonly color: string;
  readonly label: string;
}) {
  return (
    <View style={styles.item}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: "center", flexDirection: "row", gap: 6 },
  label: { ...typography.caption, color: colors.secondaryText },
  root: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  swatch: { borderRadius: 999, height: 8, width: 8 },
});
