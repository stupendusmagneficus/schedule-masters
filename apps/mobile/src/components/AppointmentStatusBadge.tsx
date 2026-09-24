import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

type AppointmentStatus = "confirmed" | "pending";

type AppointmentStatusBadgeProps = {
  readonly label: string;
  readonly status: AppointmentStatus;
};

export function AppointmentStatusBadge({
  label,
  status,
}: AppointmentStatusBadgeProps) {
  const isConfirmed = status === "confirmed";

  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.badge,
        isConfirmed ? styles.confirmedBadge : styles.pendingBadge,
      ]}
    >
      <Text
        style={[
          styles.label,
          isConfirmed ? styles.confirmedLabel : styles.pendingLabel,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.pill,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  confirmedBadge: { backgroundColor: colors.accentSoft },
  confirmedLabel: { color: colors.accentPressed },
  label: { ...typography.caption, fontWeight: "700" },
  pendingBadge: { backgroundColor: colors.pendingSoft },
  pendingLabel: { color: colors.pendingText },
});
