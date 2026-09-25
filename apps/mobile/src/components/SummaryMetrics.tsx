import { StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows } from "../theme/tokens";
import { typography } from "../theme/typography";

export type SummaryMetric = {
  readonly id: string;
  readonly label: string;
  readonly tone?: "accent" | "neutral";
  readonly value: string;
};

type SummaryMetricsProps = {
  readonly metrics: readonly SummaryMetric[];
};

export function SummaryMetrics({ metrics }: SummaryMetricsProps) {
  return (
    <View style={styles.container}>
      {metrics.map((metric, index) => (
        <View
          key={metric.id}
          style={[
            styles.metric,
            index > 0 && styles.metricWithDivider,
            metric.tone === "accent" && styles.accentMetric,
          ]}
        >
          <Text style={styles.label}>{metric.label}</Text>
          <Text
            style={[
              styles.value,
              metric.tone === "accent" && styles.accentValue,
            ]}
          >
            {metric.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  accentMetric: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.surface,
    margin: -8,
    padding: 8,
  },
  accentValue: { color: colors.accentPressed },
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    padding: 16,
    ...shadows.surface,
  },
  label: { ...typography.caption, color: colors.secondaryText },
  metric: { flex: 1, minWidth: 0 },
  metricWithDivider: {
    borderLeftColor: colors.borderSubtle,
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: 16,
  },
  value: {
    ...typography.metric,
    color: colors.primaryText,
    marginTop: 8,
  },
});
