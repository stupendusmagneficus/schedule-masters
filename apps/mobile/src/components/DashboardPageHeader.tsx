import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";
import { DashboardHeaderAction } from "./DashboardHeaderAction";

type DashboardPageHeaderProps = {
  readonly actionLabel: string;
  readonly onAction: () => void;
  readonly subtitle?: string;
  readonly title: string;
};

export function DashboardPageHeader({
  actionLabel,
  onAction,
  subtitle,
  title,
}: DashboardPageHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <DashboardHeaderAction
        accessibilityLabel={actionLabel}
        icon="account-circle-outline"
        onPress={onAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 4, minWidth: 0 },
  row: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  subtitle: { ...typography.body, color: colors.secondaryText },
  title: { ...typography.heading, color: colors.primaryText },
});
