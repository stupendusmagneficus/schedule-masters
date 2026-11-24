import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatTime } from "@schedule-app/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

type SlotGridProps = {
  readonly isLoading: boolean;
  readonly locale: SupportedLocale;
  readonly onSelect: (startsAt: string) => void;
  readonly selectedStartsAt: string;
  readonly slots: readonly { readonly starts_at: string }[];
  readonly t: (key: MessageKey) => string;
  readonly timezone: string;
};

export function SlotGrid({
  isLoading,
  locale,
  onSelect,
  selectedStartsAt,
  slots,
  t,
  timezone,
}: SlotGridProps) {
  if (isLoading) {
    return <Text style={styles.helper}>{t("common.loading")}</Text>;
  }
  if (!slots.length) {
    return (
      <Text style={styles.helper}>{t("mobile.manualBookingNoSlots")}</Text>
    );
  }
  return (
    <View style={styles.slots}>
      {slots.map((slot) => {
        const isSelected = selectedStartsAt === slot.starts_at;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={slot.starts_at}
            onPress={() => onSelect(slot.starts_at)}
            style={[styles.slot, isSelected && styles.selectedSlot]}
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              numberOfLines={1}
              style={[styles.slotText, isSelected && styles.selectedSlotText]}
            >
              {formatTime(new Date(slot.starts_at), locale, {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: timezone,
              })}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  helper: { ...typography.caption, color: colors.secondaryText },
  selectedSlot: { backgroundColor: colors.action, borderColor: colors.action },
  selectedSlotText: { color: colors.actionText },
  slot: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    flexGrow: 0,
    minWidth: 0,
    minHeight: 48,
    paddingVertical: 10,
    width: "31%",
  },
  slotText: {
    ...typography.label,
    color: colors.primaryText,
    textAlign: "center",
    width: "100%",
  },
  slots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    maxWidth: 540,
    width: "100%",
  },
});
