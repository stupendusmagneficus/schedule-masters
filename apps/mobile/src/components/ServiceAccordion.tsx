import { formatCurrency, type SupportedLocale } from "@schedule-app/i18n";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service } from "../types";

type ServiceAccordionProps = {
  readonly label: string;
  readonly locale: SupportedLocale;
  readonly onSelect: (service: Service) => void;
  readonly selectedService: Service | null;
  readonly services: readonly Service[];
};

export function ServiceAccordion({
  label,
  locale,
  onSelect,
  selectedService,
  services,
}: ServiceAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityValue={{
          text: selectedService
            ? `${selectedService.name}, ${selectedService.duration_minutes} min, ${formatCurrency(
                selectedService.price_amount,
                locale,
                selectedService.currency,
              )}`
            : label,
        }}
        onPress={() => setExpanded((value) => !value)}
        style={[styles.option, selectedService && styles.optionSelected]}
      >
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {selectedService?.name ?? label}
          </Text>
          {selectedService ? (
            <Text numberOfLines={1} style={styles.detail}>
              {selectedService.duration_minutes} min ·{" "}
              {formatCurrency(
                selectedService.price_amount,
                locale,
                selectedService.currency,
              )}
            </Text>
          ) : null}
        </View>
        <Text style={styles.expandIcon}>{expanded ? "⌃" : "⌄"}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.options}>
          {services.map((service) => {
            const selected = service.id === selectedService?.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={service.id}
                onPress={() => {
                  onSelect(service);
                  setExpanded(false);
                }}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <View style={styles.copy}>
                  <Text numberOfLines={1} style={styles.name}>
                    {service.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.detail}>
                    {service.duration_minutes} min ·{" "}
                    {formatCurrency(
                      service.price_amount,
                      locale,
                      service.currency,
                    )}
                  </Text>
                </View>
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  check: { color: colors.accent, fontSize: 18, fontWeight: "700" },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  detail: { ...typography.caption, color: colors.secondaryText },
  expandIcon: { color: colors.accent, fontSize: 22, lineHeight: 26 },
  name: { ...typography.label, color: colors.primaryText, fontWeight: "700" },
  option: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optionSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  options: { gap: 8, marginTop: 8 },
  root: { gap: 0 },
});
