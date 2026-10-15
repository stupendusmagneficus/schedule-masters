import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {
  formatCurrency,
  type MessageKey,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service } from "../types";
import { FullscreenModal } from "./FullscreenModal";

type ServicePickerFieldProps = {
  readonly label: string;
  readonly locale: SupportedLocale;
  readonly onSelect: (service: Service) => void;
  readonly selectedService: Service | null;
  readonly services: readonly Service[];
  readonly t: (key: MessageKey) => string;
};

export function ServicePickerField({
  label,
  locale,
  onSelect,
  selectedService,
  services,
  t,
}: ServicePickerFieldProps) {
  const [isOpen, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const categories = useMemo(
    () =>
      [
        ...new Set(
          services
            .map((service) => service.category?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((a, b) => a.localeCompare(b, locale)),
    [locale, services],
  );
  const filteredServices = services.filter((service) => {
    const matchesCategory =
      category === null || (service.category?.trim() || "") === category;
    const query = search.trim().toLocaleLowerCase(locale);
    const matchesSearch =
      !query ||
      service.name.toLocaleLowerCase(locale).includes(query) ||
      service.description?.toLocaleLowerCase(locale).includes(query) ||
      service.category?.toLocaleLowerCase(locale).includes(query);
    return matchesCategory && matchesSearch;
  });
  const groupedServices = useMemo(() => {
    if (category !== null) return [[category, filteredServices] as const];
    const groups = new Map<string, Service[]>();
    for (const service of filteredServices) {
      const name = service.category?.trim() || t("mobile.serviceUncategorized");
      groups.set(name, [...(groups.get(name) ?? []), service]);
    }
    return [...groups.entries()].sort(([left], [right]) => {
      if (left === t("mobile.serviceUncategorized")) return 1;
      if (right === t("mobile.serviceUncategorized")) return -1;
      return left.localeCompare(right, locale);
    });
  }, [category, filteredServices, locale, t]);

  function close() {
    setOpen(false);
    setSearch("");
    setCategory(null);
  }

  return (
    <>
      <Pressable
        accessibilityLabel={`${label}: ${selectedService?.name ?? t("mobile.serviceChoose")}`}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.selected, pressed && styles.pressed]}
      >
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {selectedService?.name ?? t("mobile.serviceChoose")}
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
        <MaterialCommunityIcons
          color={colors.accent}
          name="chevron-right"
          size={24}
        />
      </Pressable>
      <FullscreenModal
        closeIcon="chevron-left"
        closeLabel={t("common.back")}
        onClose={close}
        title={t("mobile.serviceChoose")}
        visible={isOpen}
      >
        <View style={styles.picker}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons
              color={colors.secondaryText}
              name="magnify"
              size={22}
            />
            <TextInput
              accessibilityLabel={t("mobile.serviceSearch")}
              onChangeText={setSearch}
              placeholder={t("mobile.serviceSearch")}
              placeholderTextColor={colors.secondaryText}
              returnKeyType="search"
              style={styles.searchInput}
              value={search}
            />
          </View>
          {categories.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              <CategoryChip
                active={category === null}
                label={t("mobile.serviceAllCategories")}
                onPress={() => setCategory(null)}
              />
              {categories.map((item) => (
                <CategoryChip
                  active={category === item}
                  key={item}
                  label={item}
                  onPress={() => setCategory(category === item ? null : item)}
                />
              ))}
            </ScrollView>
          ) : null}
          <ScrollView contentContainerStyle={styles.serviceList}>
            {groupedServices.length ? (
              groupedServices.map(([group, items]) => (
                <View key={group} style={styles.group}>
                  {category === null ? (
                    <Text style={styles.categoryHeading}>{group}</Text>
                  ) : null}
                  {items.map((service) => {
                    const selected = service.id === selectedService?.id;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={service.id}
                        onPress={() => {
                          onSelect(service);
                          close();
                        }}
                        style={[
                          styles.serviceRow,
                          selected && styles.serviceRowSelected,
                        ]}
                      >
                        <View style={styles.copy}>
                          <Text numberOfLines={2} style={styles.name}>
                            {service.name}
                          </Text>
                          {service.description ? (
                            <Text numberOfLines={2} style={styles.description}>
                              {service.description}
                            </Text>
                          ) : null}
                          <Text style={styles.detail}>
                            {service.duration_minutes} min ·{" "}
                            {formatCurrency(
                              service.price_amount,
                              locale,
                              service.currency,
                            )}
                          </Text>
                        </View>
                        {selected ? (
                          <MaterialCommunityIcons
                            color={colors.accent}
                            name="check"
                            size={22}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))
            ) : (
              <Text style={styles.empty}>{t("mobile.serviceSearchEmpty")}</Text>
            )}
          </ScrollView>
        </View>
      </FullscreenModal>
    </>
  );
}

function CategoryChip({
  active,
  label,
  onPress,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.categoryChip, active && styles.categoryChipActive]}
    >
      <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  categoryChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  categoryChipActive: {
    backgroundColor: colors.action,
    borderColor: colors.action,
  },
  categoryHeading: {
    ...typography.label,
    color: colors.secondaryText,
    marginBottom: 8,
    marginTop: 6,
  },
  categoryList: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  categoryText: { ...typography.label, color: colors.primaryText },
  categoryTextActive: { color: colors.actionText },
  copy: { flex: 1, gap: 3, minWidth: 0 },
  description: { ...typography.caption, color: colors.secondaryText },
  detail: { ...typography.caption, color: colors.secondaryText },
  empty: {
    ...typography.body,
    color: colors.secondaryText,
    padding: 20,
    textAlign: "center",
  },
  group: { gap: 8 },
  name: { ...typography.label, color: colors.primaryText, fontWeight: "700" },
  picker: { flex: 1, paddingTop: 16 },
  pressed: { backgroundColor: colors.subtleSurface },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  searchInput: {
    ...typography.body,
    color: colors.primaryText,
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
  },
  selected: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  serviceList: { gap: 18, padding: 16, paddingBottom: 32 },
  serviceRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  serviceRowSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
});
