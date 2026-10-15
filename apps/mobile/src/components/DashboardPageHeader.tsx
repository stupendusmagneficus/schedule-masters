import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";
import {
  DashboardHeaderAction,
  type DashboardHeaderActionProps,
} from "./DashboardHeaderAction";

type DashboardPageHeaderProps = {
  readonly centeredTitle?: boolean;
  readonly leadingAction?: DashboardHeaderActionProps;
  readonly trailingAction?: DashboardHeaderActionProps;
  readonly subtitle?: string;
  readonly subtitleAccessibilityLabel?: string;
  readonly title: string;
  readonly titleAccessibilityLabel?: string;
};

export function DashboardPageHeader({
  centeredTitle = false,
  leadingAction,
  trailingAction,
  subtitle,
  subtitleAccessibilityLabel,
  title,
  titleAccessibilityLabel,
}: DashboardPageHeaderProps) {
  const hasActions = Boolean(leadingAction || trailingAction);
  return (
    <View style={[styles.row, centeredTitle && styles.centeredRow]}>
      {leadingAction ? (
        <View style={centeredTitle && styles.centeredLeadingAction}>
          <DashboardHeaderAction {...leadingAction} />
        </View>
      ) : null}
      <View
        style={[
          styles.copy,
          centeredTitle && styles.centeredCopy,
          centeredTitle && !hasActions && styles.centeredCopyWithoutAction,
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
      {trailingAction ? (
        <View style={centeredTitle && styles.centeredTrailingAction}>
          <DashboardHeaderAction {...trailingAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 4, minWidth: 0 },
  centeredLeadingAction: {
    left: 0,
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -24 }],
  },
  centeredCopy: { alignItems: "center", paddingHorizontal: 56, width: "100%" },
  centeredCopyWithoutAction: { paddingHorizontal: 0 },
  centeredRow: { justifyContent: "center", position: "relative" },
  centeredTrailingAction: {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: [{ translateY: -24 }],
  },
  centeredText: { textAlign: "center" },
  row: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  subtitle: { ...typography.body, color: colors.secondaryText },
  title: { ...typography.heading, color: colors.primaryText },
});
