import type { MessageKey } from "@schedule-app/i18n";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../../theme/tokens";

export function CalendarWorkloadLegend({
  t,
}: {
  readonly t: (key: MessageKey) => string;
}) {
  return (
    <View
      accessibilityLabel={t("mobile.calendarWorkload")}
      accessibilityRole="summary"
      style={styles.root}
    >
      <Text style={styles.title}>{t("mobile.calendarWorkload")}</Text>
      <LegendItem color={colors.accent} label={t("mobile.calendarLoadLow")} />
      <LegendItem
        color={colors.pendingText}
        label={t("mobile.calendarLoadMedium")}
      />
      <LegendItem color={colors.danger} label={t("mobile.calendarLoadHigh")} />
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
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { borderRadius: radii.control, height: 7, width: 7 },
  item: { alignItems: "center", flexDirection: "row", gap: 4 },
  label: { color: colors.secondaryText, fontSize: 10, lineHeight: 14 },
  root: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 8,
  },
  title: { color: colors.secondaryText, fontSize: 10, fontWeight: "600" },
});
