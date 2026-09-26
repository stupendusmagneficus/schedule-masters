import {
  formatCurrency,
  type MessageKey,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type { ServiceDraft } from "../features/services/serviceCatalog";
import type { ServiceCatalogController } from "../features/services/useServiceCatalog";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service } from "../types";
import { InfoCard } from "./InfoCard";
import { ServiceEditorModal } from "./ServiceEditorModal";

type ServiceCatalogCardProps = {
  readonly controller: ServiceCatalogController;
  readonly editable: boolean;
  readonly locale: SupportedLocale;
  readonly t: (key: MessageKey) => string;
};

export function ServiceCatalogCard({
  controller,
  editable,
  locale,
  t,
}: ServiceCatalogCardProps) {
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isEditorVisible, setEditorVisible] = useState(false);
  const visibleServices = editable
    ? controller.services
    : controller.activeServices;

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

  return (
    <>
      <InfoCard>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.sectionTitle}>{t("mobile.services")}</Text>
            <Text style={styles.helper}>{t("mobile.servicesDescription")}</Text>
          </View>
          {editable ? (
            <Pressable
              accessibilityRole="button"
              disabled={controller.isSaving}
              onPress={openCreate}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>{t("mobile.serviceAdd")}</Text>
            </Pressable>
          ) : null}
        </View>

        {controller.isLoading ? (
          <Text style={styles.helper}>{t("common.loading")}</Text>
        ) : visibleServices.length ? (
          <View style={styles.list}>
            {visibleServices.map((service) => (
              <ServiceRow
                editable={editable}
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
          <Text style={styles.helper}>{t("mobile.serviceEmpty")}</Text>
        )}
        {controller.error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {t("mobile.serviceLoadFailed")}
          </Text>
        ) : null}
      </InfoCard>
      <ServiceEditorModal
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

function ServiceRow({
  editable,
  locale,
  onArchive,
  onEdit,
  onRestore,
  service,
  t,
}: {
  readonly editable: boolean;
  readonly locale: SupportedLocale;
  readonly onArchive: (service: Service) => void;
  readonly onEdit: (service: Service) => void;
  readonly onRestore: (service: Service) => void;
  readonly service: Service;
  readonly t: ServiceCatalogCardProps["t"];
}) {
  const isActive = service.is_active && !service.archived_at;
  return (
    <View style={[styles.row, !isActive && styles.archivedRow]}>
      <View style={styles.rowCopy}>
        <View style={styles.nameLine}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.status}>
            {t(isActive ? "mobile.serviceActive" : "mobile.serviceArchived")}
          </Text>
        </View>
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
          <Pressable accessibilityRole="button" onPress={() => onEdit(service)}>
            <Text style={styles.actionText}>{t("mobile.serviceEdit")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => (isActive ? onArchive(service) : onRestore(service))}
          >
            <Text style={styles.actionText}>
              {t(isActive ? "mobile.serviceArchive" : "mobile.serviceRestore")}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  addButton: {
    backgroundColor: colors.action,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    ...typography.caption,
    color: colors.actionText,
    fontWeight: "700",
  },
  archivedRow: { opacity: 0.65 },
  description: {
    ...typography.caption,
    color: colors.secondaryText,
    marginTop: 4,
  },
  error: { ...typography.caption, color: colors.danger, marginTop: 12 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  headerCopy: { flex: 1 },
  helper: { ...typography.body, color: colors.secondaryText },
  list: { gap: 10, marginTop: 16 },
  nameLine: { alignItems: "center", flexDirection: "row", gap: 8 },
  row: {
    alignItems: "flex-start",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    paddingBottom: 12,
  },
  rowActions: { alignItems: "flex-end", gap: 8 },
  rowCopy: { flex: 1 },
  sectionTitle: {
    color: colors.primaryText,
    marginBottom: 6,
    ...typography.section,
  },
  serviceName: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "700",
  },
  status: { ...typography.caption, color: colors.secondaryText },
});
