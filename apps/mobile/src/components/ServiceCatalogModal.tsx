import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {
  formatCurrency,
  type MessageKey,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  filterServices,
  getServiceCategories,
  type ServiceCatalogStatus,
  type ServiceDraft,
} from "../features/services/serviceCatalog";
import type { ServiceCatalogController } from "../features/services/useServiceCatalog";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service } from "../types";
import { ActionButton } from "./ActionButton";
import { FullscreenModal } from "./FullscreenModal";
import { InfoCard } from "./InfoCard";
import { ServiceEditorModal } from "./ServiceEditorModal";

type ServiceCatalogModalProps = {
  readonly controller: ServiceCatalogController;
  readonly editable: boolean;
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
};

export function ServiceCatalogModal({
  controller,
  editable,
  locale,
  onClose,
  t,
  visible,
}: ServiceCatalogModalProps) {
  const [status, setStatus] = useState<ServiceCatalogStatus>("active");
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isEditorVisible, setEditorVisible] = useState(false);
  const categoryOptions = useMemo(
    () => getServiceCategories(controller.services),
    [controller.services],
  );
  const categories = useMemo(
    () =>
      getServiceCategories(
        filterServices(controller.services, {
          category: null,
          query: "",
          status: editable ? status : "active",
        }),
      ),
    [controller.services, editable, status],
  );
  const hasServicesInStatus = useMemo(
    () =>
      filterServices(controller.services, {
        category: null,
        query: "",
        status: editable ? status : "active",
      }).length > 0,
    [controller.services, editable, status],
  );
  const visibleServices = useMemo(
    () =>
      filterServices(controller.services, {
        category,
        query,
        status: editable ? status : "active",
      }),
    [category, controller.services, editable, query, status],
  );

  function openCreate() {
    setEditingService(null);
    setEditorVisible(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setEditorVisible(true);
  }

  async function save(draft: ServiceDraft) {
    if (editingService) {
      await controller.update(editingService.id, draft);
    } else {
      await controller.create(draft);
    }
    setEditorVisible(false);
  }

  function archive(service: Service) {
    Alert.alert(
      t("mobile.serviceArchive"),
      `${service.name}. ${t("mobile.serviceArchiveConfirm")}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("mobile.serviceArchive"),
          onPress: () => {
            void controller.archive(service.id).catch(() => undefined);
          },
          style: "destructive",
        },
      ],
    );
  }

  function resetFilters() {
    setQuery("");
    setCategory(null);
  }

  const hasFilters = Boolean(query.trim()) || category !== null;
  const isEmptyCatalog = visibleServices.length === 0 && !hasFilters;

  return (
    <>
      <FullscreenModal
        closeLabel={t("common.close")}
        onClose={onClose}
        title={t("mobile.services")}
        visible={visible}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.searchField}>
            <MaterialCommunityIcons
              color={colors.secondaryText}
              name="magnify"
              size={22}
            />
            <TextInput
              accessibilityLabel={t("mobile.serviceSearch")}
              autoCapitalize="none"
              onChangeText={setQuery}
              placeholder={t("mobile.serviceSearch")}
              placeholderTextColor={colors.secondaryText}
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityLabel={t("mobile.serviceSearchClear")}
                accessibilityRole="button"
                onPress={() => setQuery("")}
                style={styles.clearSearch}
              >
                <MaterialCommunityIcons
                  color={colors.secondaryText}
                  name="close-circle"
                  size={22}
                />
              </Pressable>
            ) : null}
          </View>

          {editable ? (
            <View accessibilityRole="tablist" style={styles.statusFilters}>
              {(["active", "archived"] as const).map((value) => {
                const selected = status === value;
                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    key={value}
                    onPress={() => {
                      setStatus(value);
                      setCategory(null);
                    }}
                    style={[
                      styles.statusTab,
                      selected && styles.statusTabSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusLabel,
                        selected && styles.statusLabelSelected,
                      ]}
                    >
                      {t(
                        value === "active"
                          ? "mobile.serviceActive"
                          : "mobile.serviceArchived",
                      )}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {hasServicesInStatus ? (
            <ScrollView
              accessibilityRole="tablist"
              contentContainerStyle={styles.categoryFilters}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <CategoryFilter
                label={t("mobile.serviceAllCategories")}
                onPress={() => setCategory(null)}
                selected={category === null}
              />
              {categories.map((value) => (
                <CategoryFilter
                  key={value}
                  label={value}
                  onPress={() => setCategory(value)}
                  selected={category === value}
                />
              ))}
              <CategoryFilter
                label={t("mobile.serviceUncategorized")}
                onPress={() => setCategory("")}
                selected={category === ""}
              />
            </ScrollView>
          ) : null}

          {editable ? (
            <ActionButton
              disabled={controller.isSaving}
              label={t("mobile.serviceAdd")}
              onPress={openCreate}
              variant="primary"
            />
          ) : null}

          {controller.isLoading ? (
            <Text style={styles.helper}>{t("common.loading")}</Text>
          ) : visibleServices.length > 0 ? (
            <View style={styles.list}>
              {visibleServices.map((service) => (
                <ServiceRow
                  editable={editable}
                  isSaving={controller.isSaving}
                  key={service.id}
                  locale={locale}
                  onArchive={archive}
                  onEdit={openEdit}
                  onRestore={(item) => {
                    void controller.restore(item.id).catch(() => undefined);
                  }}
                  service={service}
                  t={t}
                />
              ))}
            </View>
          ) : (
            <InfoCard>
              <Text style={styles.emptyState}>
                {isEmptyCatalog
                  ? status === "archived"
                    ? t("mobile.serviceArchiveEmpty")
                    : t("mobile.serviceEmpty")
                  : t("mobile.serviceSearchEmpty")}
              </Text>
              {hasFilters ? (
                <ActionButton
                  label={t("mobile.serviceFiltersClear")}
                  onPress={resetFilters}
                  style={styles.resetButton}
                  variant="secondary"
                />
              ) : null}
            </InfoCard>
          )}
          {controller.error ? (
            <View>
              <Text accessibilityRole="alert" style={styles.error}>
                {t("mobile.serviceLoadFailed")}
              </Text>
              <ActionButton
                label={t("common.retry")}
                onPress={() => void controller.load()}
                style={styles.retryButton}
                variant="secondary"
              />
            </View>
          ) : null}
        </ScrollView>
      </FullscreenModal>
      <ServiceEditorModal
        categories={categoryOptions}
        error={controller.error?.message ?? null}
        isSaving={controller.isSaving}
        onClose={() => setEditorVisible(false)}
        onSave={save}
        service={editingService}
        t={t}
        visible={isEditorVisible}
      />
    </>
  );
}

function CategoryFilter({
  label,
  onPress,
  selected,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.categoryTab, selected && styles.categoryTabSelected]}
    >
      <Text
        numberOfLines={1}
        style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ServiceRow({
  editable,
  isSaving,
  locale,
  onArchive,
  onEdit,
  onRestore,
  service,
  t,
}: {
  readonly editable: boolean;
  readonly isSaving: boolean;
  readonly locale: SupportedLocale;
  readonly onArchive: (service: Service) => void;
  readonly onEdit: (service: Service) => void;
  readonly onRestore: (service: Service) => void;
  readonly service: Service;
  readonly t: ServiceCatalogModalProps["t"];
}) {
  const isActive = service.is_active && !service.archived_at;

  return (
    <InfoCard style={!isActive && styles.archivedRow}>
      <View style={styles.rowCopy}>
        <View style={styles.nameLine}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.status}>
            {t(isActive ? "mobile.serviceActive" : "mobile.serviceArchived")}
          </Text>
        </View>
        {service.category ? (
          <Text style={styles.helper}>{service.category}</Text>
        ) : null}
        <Text style={styles.helper}>
          {service.duration_minutes} min ·{" "}
          {formatCurrency(
            Number(service.price_amount),
            locale,
            service.currency.trim(),
          )}
        </Text>
        {service.description ? (
          <Text numberOfLines={2} style={styles.description}>
            {service.description}
          </Text>
        ) : null}
      </View>
      {editable ? (
        <View style={styles.rowActions}>
          <ActionButton
            disabled={isSaving}
            label={t("mobile.serviceEdit")}
            onPress={() => onEdit(service)}
            size="compact"
            style={styles.rowAction}
            variant="secondary"
          />
          <ActionButton
            disabled={isSaving}
            label={t(
              isActive ? "mobile.serviceArchive" : "mobile.serviceRestore",
            )}
            onPress={() => (isActive ? onArchive(service) : onRestore(service))}
            size="compact"
            style={styles.rowAction}
            variant={isActive ? "destructive" : "secondary"}
          />
        </View>
      ) : null}
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  archivedRow: { opacity: 0.72 },
  categoryFilters: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  categoryLabel: { ...typography.label, color: colors.primaryText },
  categoryLabelSelected: { color: colors.accent, fontWeight: "700" },
  categoryTab: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    maxWidth: 200,
    paddingHorizontal: 14,
  },
  categoryTabSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  clearSearch: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  content: { gap: 16, padding: 16, paddingBottom: 32 },
  description: {
    ...typography.caption,
    color: colors.secondaryText,
    marginTop: 4,
  },
  emptyState: { ...typography.body, color: colors.secondaryText },
  error: { ...typography.body, color: colors.danger },
  helper: { ...typography.body, color: colors.secondaryText },
  list: { gap: 12 },
  nameLine: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  resetButton: { marginTop: 12 },
  retryButton: { alignSelf: "flex-start", marginTop: 8 },
  rowAction: { flex: 1, height: 48, minHeight: 48 },
  rowActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  rowCopy: { gap: 4, minWidth: 0 },
  searchField: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 52,
    paddingLeft: 16,
  },
  searchInput: {
    ...typography.body,
    color: colors.primaryText,
    flex: 1,
    height: 50,
    paddingHorizontal: 10,
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  serviceName: {
    ...typography.label,
    color: colors.primaryText,
    flexShrink: 1,
    fontWeight: "700",
  },
  status: { ...typography.caption, color: colors.secondaryText },
  statusFilters: {
    alignSelf: "stretch",
    backgroundColor: colors.subtleSurface,
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  statusLabel: { ...typography.label, color: colors.secondaryText },
  statusLabelSelected: { color: colors.accent, fontWeight: "700" },
  statusTab: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 12,
  },
  statusTabSelected: { backgroundColor: colors.surface },
});
