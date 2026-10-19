import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {
  formatCurrency,
  formatDuration,
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
import { MANUAL_BOOKING_MAX_SERVICES } from "../features/appointments/manualBooking";
import { moveManualBookingService } from "../features/appointments/manualBookingServices";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service } from "../types";
import { ActionButton } from "./ActionButton";
import { FullscreenModal } from "./FullscreenModal";

type ManualBookingServicesFieldProps = {
  readonly locale: SupportedLocale;
  readonly onChange: (serviceIds: string[]) => void;
  readonly services: readonly Service[];
  readonly serviceIds: readonly string[];
  readonly t: (key: MessageKey) => string;
};

export function ManualBookingServicesField({
  locale,
  onChange,
  services,
  serviceIds,
  t,
}: ManualBookingServicesFieldProps) {
  const [isOpen, setOpen] = useState(false);
  const [pendingServiceIds, setPendingServiceIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [currencyMismatch, setCurrencyMismatch] = useState(false);
  const selectedServices = serviceIds
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service));
  const categories = useMemo(
    () =>
      [
        ...new Set(
          services
            .map((service) => service.category?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((left, right) => left.localeCompare(right, locale)),
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
  }, [filteredServices, locale, t]);
  const totalDuration = selectedServices.reduce(
    (total, service) => total + service.duration_minutes,
    0,
  );
  const totalPrice = selectedServices.reduce(
    (total, service) => total + service.price_amount,
    0,
  );
  const currency = selectedServices[0]?.currency;

  function close() {
    setOpen(false);
    setSearch("");
    setCategory(null);
    setLimitReached(false);
    setCurrencyMismatch(false);
  }

  function toggleService(service: Service) {
    if (
      !pendingServiceIds.includes(service.id) &&
      pendingServiceIds.length >= MANUAL_BOOKING_MAX_SERVICES
    ) {
      setLimitReached(true);
      return;
    }
    const selectedCurrency = pendingServiceIds
      .map((id) => services.find((item) => item.id === id))
      .find((item): item is Service => Boolean(item))?.currency;
    if (
      !pendingServiceIds.includes(service.id) &&
      selectedCurrency &&
      service.currency !== selectedCurrency
    ) {
      setCurrencyMismatch(true);
      return;
    }
    setLimitReached(false);
    setCurrencyMismatch(false);
    setPendingServiceIds(
      pendingServiceIds.includes(service.id)
        ? pendingServiceIds.filter((id) => id !== service.id)
        : [...pendingServiceIds, service.id],
    );
  }

  function openPicker() {
    setPendingServiceIds([...serviceIds]);
    setOpen(true);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>
          {t("mobile.manualBookingServices")}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={openPicker}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons color={colors.accent} name="plus" size={20} />
          <Text style={styles.addButtonText}>
            {t("mobile.manualBookingAddService")}
          </Text>
        </Pressable>
      </View>

      {selectedServices.length ? (
        <View style={styles.selectedList}>
          {selectedServices.map((service, index) => (
            <View key={service.id} style={styles.selectedRow}>
              <View style={styles.serviceCopy}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.detail}>
                  {formatDuration(service.duration_minutes, locale)} ·{" "}
                  {formatCurrency(
                    service.price_amount,
                    locale,
                    service.currency,
                  )}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <IconAction
                  disabled={index === 0}
                  label={t("mobile.manualBookingMoveServiceUp")}
                  name="arrow-up"
                  quiet
                  onPress={() =>
                    onChange(
                      moveManualBookingService(serviceIds, service.id, -1),
                    )
                  }
                />
                <IconAction
                  disabled={index === selectedServices.length - 1}
                  label={t("mobile.manualBookingMoveServiceDown")}
                  name="arrow-down"
                  quiet
                  onPress={() =>
                    onChange(
                      moveManualBookingService(serviceIds, service.id, 1),
                    )
                  }
                />
                <IconAction
                  label={t("mobile.manualBookingRemoveService")}
                  name="close"
                  onPress={() => {
                    setCurrencyMismatch(false);
                    onChange(serviceIds.filter((id) => id !== service.id));
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.helper}>
          {t("mobile.manualBookingNoServicesSelected")}
        </Text>
      )}

      {selectedServices.length ? (
        <View accessibilityLiveRegion="polite" style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            {formatDuration(totalDuration, locale)} ·{" "}
            {t("mobile.manualBookingTotal")}
          </Text>
          <Text style={styles.totalValue}>
            {formatCurrency(totalPrice, locale, currency)}
          </Text>
        </View>
      ) : null}
      <FullscreenModal
        closeIcon="chevron-left"
        closeLabel={t("common.back")}
        onClose={close}
        title={t("mobile.manualBookingAddService")}
        visible={isOpen}
        footer={
          <ActionButton
            label={t("common.done")}
            onPress={() => {
              onChange(pendingServiceIds);
              close();
            }}
            variant="primary"
          />
        }
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
              contentContainerStyle={styles.categories}
              horizontal
              showsHorizontalScrollIndicator={false}
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
          {limitReached ? (
            <Text accessibilityRole="alert" style={styles.limitMessage}>
              {t("mobile.manualBookingServiceLimitReached")}
            </Text>
          ) : null}
          {currencyMismatch ? (
            <Text accessibilityRole="alert" style={styles.limitMessage}>
              {t("mobile.manualBookingCurrencyMismatch")}
            </Text>
          ) : null}
          <ScrollView contentContainerStyle={styles.serviceList}>
            {groupedServices.length ? (
              groupedServices.map(([group, items]) => (
                <View key={group} style={styles.group}>
                  {category === null ? (
                    <Text style={styles.categoryHeading}>{group}</Text>
                  ) : null}
                  {items.map((service) => {
                    const selected = pendingServiceIds.includes(service.id);
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={service.id}
                        onPress={() => toggleService(service)}
                        style={[
                          styles.serviceOption,
                          selected && styles.optionSelected,
                        ]}
                      >
                        <View style={styles.serviceCopy}>
                          <Text style={styles.serviceName}>{service.name}</Text>
                          {service.description ? (
                            <Text style={styles.description} numberOfLines={2}>
                              {service.description}
                            </Text>
                          ) : null}
                          <Text style={styles.detail}>
                            {formatDuration(service.duration_minutes, locale)} ·{" "}
                            {formatCurrency(
                              service.price_amount,
                              locale,
                              service.currency,
                            )}
                          </Text>
                        </View>
                        <MaterialCommunityIcons
                          color={selected ? colors.accent : colors.border}
                          name={
                            selected ? "check-circle" : "plus-circle-outline"
                          }
                          size={24}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              ))
            ) : (
              <Text style={styles.helper}>
                {t("mobile.serviceSearchEmpty")}
              </Text>
            )}
          </ScrollView>
        </View>
      </FullscreenModal>
    </View>
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

function IconAction({
  disabled = false,
  label,
  name,
  onPress,
  quiet = false,
}: {
  readonly disabled?: boolean;
  readonly label: string;
  readonly name: "arrow-down" | "arrow-up" | "close";
  readonly onPress: () => void;
  readonly quiet?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.iconButton}
    >
      <MaterialCommunityIcons
        color={
          disabled
            ? colors.border
            : quiet
              ? colors.border
              : colors.secondaryText
        }
        name={name}
        size={quiet ? 17 : 20}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.accent,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  addButtonText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  categories: { gap: 8, paddingVertical: 12 },
  categoryChip: {
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  categoryChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  categoryHeading: {
    ...typography.caption,
    color: colors.secondaryText,
    fontWeight: "700",
  },
  categoryText: { ...typography.caption, color: colors.primaryText },
  categoryTextActive: { color: colors.accent, fontWeight: "700" },
  container: { gap: 10, marginTop: 16 },
  description: { ...typography.caption, color: colors.secondaryText },
  detail: { ...typography.caption, color: colors.secondaryText },
  group: { gap: 8 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  helper: { ...typography.caption, color: colors.secondaryText },
  iconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  limitMessage: { ...typography.caption, color: colors.danger, paddingTop: 12 },
  optionSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  picker: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  pressed: { opacity: 0.75 },
  searchBox: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  searchInput: {
    ...typography.body,
    color: colors.primaryText,
    flex: 1,
    paddingVertical: 8,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "700",
  },
  selectedList: { gap: 8 },
  selectedRow: {
    alignItems: "center",
    backgroundColor: colors.subtleSurface,
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    borderRadius: radii.surface,
    flexDirection: "row",
    gap: 4,
    minHeight: 64,
    paddingLeft: 12,
  },
  serviceCopy: { flex: 1, gap: 2 },
  serviceList: { gap: 14, paddingBottom: 24 },
  serviceName: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "600",
  },
  serviceOption: {
    alignItems: "center",
    borderColor: colors.borderSubtle,
    borderRadius: radii.surface,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  totalLabel: { ...typography.caption, color: colors.secondaryText },
  totalRow: {
    alignItems: "center",
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  totalValue: { ...typography.label, color: colors.accent, fontWeight: "700" },
  rowActions: { alignItems: "center", flexDirection: "row", gap: 0 },
  summaryValue: { color: colors.primaryText },
});
