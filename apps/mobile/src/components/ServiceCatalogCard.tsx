import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import type { ServiceCatalogController } from "../features/services/useServiceCatalog";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";
import { InfoCard } from "./InfoCard";
import { ServiceCatalogModal } from "./ServiceCatalogModal";

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
  const [visible, setVisible] = useState(false);
  const serviceCount = controller.activeServices.length;
  const serviceCountText = controller.isLoading ? "—" : String(serviceCount);

  return (
    <>
      <InfoCard style={styles.card}>
        <Pressable
          accessibilityLabel={`${t("mobile.services")}: ${serviceCountText}`}
          accessibilityRole="button"
          onPress={() => setVisible(true)}
          style={styles.entry}
        >
          <Text style={styles.title}>{t("mobile.services")}</Text>
          <Text style={styles.count}>{serviceCountText}</Text>
          <MaterialCommunityIcons
            color={colors.secondaryText}
            name="chevron-right"
            size={24}
          />
        </Pressable>
      </InfoCard>
      <ServiceCatalogModal
        controller={controller}
        editable={editable}
        locale={locale}
        onClose={() => setVisible(false)}
        t={t}
        visible={visible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0 },
  count: {
    ...typography.label,
    backgroundColor: colors.subtleSurface,
    borderRadius: 999,
    color: colors.secondaryText,
    minWidth: 36,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    textAlign: "center",
  },
  entry: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    ...typography.section,
    color: colors.primaryText,
    flex: 1,
    fontWeight: "700",
  },
});
