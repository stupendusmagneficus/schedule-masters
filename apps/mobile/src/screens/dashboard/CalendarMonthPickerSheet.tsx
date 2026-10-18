import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AnimatedBottomSheet } from "../../components/AnimatedBottomSheet";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";

type CalendarMonthPickerSheetProps = {
  readonly children: ReactNode;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly title: string;
  readonly visible: boolean;
};

export function CalendarMonthPickerSheet({
  children,
  closeLabel,
  onClose,
  title,
  visible,
}: CalendarMonthPickerSheetProps) {
  return (
    <AnimatedBottomSheet
      onClose={onClose}
      sheetStyle={styles.sheet}
      visible={visible}
    >
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Pressable
          accessibilityLabel={closeLabel}
          accessibilityRole="button"
          hitSlop={4}
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.primaryText}
            name="close"
            size={26}
          />
        </Pressable>
      </View>
      <View style={styles.content} testID="calendar-month-sheet">
        {children}
      </View>
    </AnimatedBottomSheet>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    borderRadius: radii.control,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  content: { flex: 1, minHeight: 0, paddingHorizontal: 16 },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: 16,
  },
  headerSpacer: { width: 48 },
  pressed: { opacity: 0.7 },
  sheet: {
    height: "92%",
  },
  title: {
    ...typography.label,
    color: colors.primaryText,
    flex: 1,
    fontWeight: "700",
    textAlign: "center",
  },
});
