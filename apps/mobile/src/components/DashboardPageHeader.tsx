import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";
import {
  DashboardHeaderAction,
  type DashboardHeaderActionProps,
} from "./DashboardHeaderAction";

type DashboardPageHeaderProps = {
  readonly centeredTitle?: boolean;
  readonly leadingAction?: DashboardHeaderActionProps;
  readonly subtitleAction?: {
    readonly accessibilityLabel: string;
    readonly label: string;
    readonly onPress: () => void;
  };
  readonly trailingAction?: DashboardHeaderActionProps;
  readonly subtitle?: string;
  readonly subtitleAccessibilityLabel?: string;
  readonly title: string;
  readonly titleAccessibilityLabel?: string;
};

export function DashboardPageHeader({
  centeredTitle = false,
  leadingAction,
  subtitleAction,
  trailingAction,
  subtitle,
  subtitleAccessibilityLabel,
  title,
  titleAccessibilityLabel,
}: DashboardPageHeaderProps) {
  return (
    <View style={[styles.row, centeredTitle && styles.centeredRow]}>
      {centeredTitle ? (
        <View style={styles.actionSlot}>
          {leadingAction ? <DashboardHeaderAction {...leadingAction} /> : null}
        </View>
      ) : leadingAction ? (
        <DashboardHeaderAction {...leadingAction} />
      ) : null}
      <View style={[styles.copy, centeredTitle && styles.centeredCopy]}>
        <Text
          adjustsFontSizeToFit={centeredTitle}
          accessibilityLabel={titleAccessibilityLabel}
          accessibilityRole="header"
          minimumFontScale={centeredTitle ? 0.8 : 1}
          numberOfLines={centeredTitle ? 1 : 2}
          style={[styles.title, centeredTitle && styles.centeredText]}
        >
          {title}
        </Text>
        {subtitle || subtitleAction ? (
          <View style={centeredTitle && styles.centeredSubtitleSlot}>
            {subtitle ? (
              <Text
                accessibilityLabel={subtitleAccessibilityLabel}
                style={[styles.subtitle, centeredTitle && styles.centeredText]}
              >
                {subtitle}
              </Text>
            ) : subtitleAction ? (
              <Pressable
                accessibilityLabel={subtitleAction.accessibilityLabel}
                accessibilityRole="button"
                onPress={subtitleAction.onPress}
                style={({ pressed }) => [
                  styles.subtitleAction,
                  pressed && styles.subtitleActionPressed,
                ]}
              >
                <Text style={styles.subtitleActionText}>
                  {subtitleAction.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {centeredTitle ? (
        <View style={styles.actionSlot}>
          {trailingAction ? (
            <DashboardHeaderAction {...trailingAction} />
          ) : null}
        </View>
      ) : trailingAction ? (
        <DashboardHeaderAction {...trailingAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionSlot: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    width: 48,
  },
  centeredCopy: { alignItems: "center" },
  centeredRow: { alignItems: "center", justifyContent: "space-between" },
  centeredSubtitleSlot: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    width: "100%",
  },
  copy: { flex: 1, gap: 4, minWidth: 0 },
  centeredText: { textAlign: "center" },
  row: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  subtitleAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 16,
  },
  subtitleActionPressed: { backgroundColor: colors.subtleSurface },
  subtitleActionText: { ...typography.label, color: colors.accent },
  subtitle: { ...typography.body, color: colors.secondaryText },
  title: { ...typography.heading, color: colors.primaryText },
});
