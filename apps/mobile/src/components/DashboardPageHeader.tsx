import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";
import { DashboardHeaderAction } from "./DashboardHeaderAction";

type DashboardPageHeaderProps = {
  readonly actionLabel?: string;
  readonly centeredTitle?: boolean;
  readonly onAction?: () => void;
  readonly subtitle?: string;
  readonly subtitleAccessibilityLabel?: string;
  readonly title: string;
  readonly titleAccessibilityLabel?: string;
};

export function DashboardPageHeader({
  actionLabel,
  centeredTitle = false,
  onAction,
  subtitle,
  subtitleAccessibilityLabel,
  title,
  titleAccessibilityLabel,
}: DashboardPageHeaderProps) {
  const hasAction = Boolean(actionLabel && onAction);
  return (
    <View style={[styles.row, centeredTitle && styles.centeredRow]}>
      <View
        style={[
          styles.copy,
          centeredTitle && styles.centeredCopy,
          centeredTitle && !hasAction && styles.centeredCopyWithoutAction,
        ]}
      >
        <Text
          accessibilityLabel={titleAccessibilityLabel}
          accessibilityRole="header"
          numberOfLines={2}
          style={[styles.title, centeredTitle && styles.centeredText]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            accessibilityLabel={subtitleAccessibilityLabel}
            style={[styles.subtitle, centeredTitle && styles.centeredText]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <View style={centeredTitle && styles.centeredAction}>
          <DashboardHeaderAction
            accessibilityLabel={actionLabel}
            icon="account-circle-outline"
            onPress={onAction}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 4, minWidth: 0 },
  centeredAction: { position: "absolute", right: 0, top: 0 },
  centeredCopy: { alignItems: "center", paddingHorizontal: 56, width: "100%" },
  centeredCopyWithoutAction: { paddingHorizontal: 0 },
  centeredRow: { justifyContent: "center", position: "relative" },
  centeredText: { textAlign: "center" },
  row: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  subtitle: { ...typography.body, color: colors.secondaryText },
  title: { ...typography.heading, color: colors.primaryText },
});
