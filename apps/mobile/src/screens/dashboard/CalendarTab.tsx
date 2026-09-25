import type { Database } from "@schedule-app/api";
import { formatDate, formatTime } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { InfoCard } from "../../components/InfoCard";
import { PersonalBlockModal } from "../../components/PersonalBlockModal";
import type { DemoData } from "../../demo/types";
import {
  formatDateInTimeZone,
  type PersonalBlock,
  type PersonalBlockDraft,
} from "../../features/availability/personalBlocks";
import { usePersonalBlocks } from "../../features/availability/usePersonalBlocks";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Workspace } from "../../types";
import type { DashboardTabProps } from "./types";

type CalendarTabProps = DashboardTabProps & {
  readonly client: SupabaseClient<Database> | null;
  readonly demoData?: DemoData;
  readonly workspace: Workspace;
};

export function CalendarTab({
  client,
  demoData,
  locale,
  t,
  workspace,
}: CalendarTabProps) {
  const { blocks, error, isLoading, isSaving, remove, save } =
    usePersonalBlocks({
      client,
      timezone: workspace.timezone,
      workspaceId: workspace.id,
    });
  const [isBlockModalVisible, setBlockModalVisible] = useState(false);
  const today = formatDate(new Date(), locale, {
    day: "numeric",
    month: "long",
    timeZone: workspace.timezone,
    weekday: "long",
  });
  const todayInWorkspace = formatDateInTimeZone(new Date(), workspace.timezone);

  return (
    <>
      <View style={styles.content}>
        <View>
          <Text style={styles.eyebrow}>{t("mobile.calendar")}</Text>
          <Text style={styles.title}>{today}</Text>
        </View>
        <InfoCard>
          <Text style={styles.sectionTitle}>{t("mobile.workingHours")}</Text>
          <Text style={styles.hours}>08:00 – 21:00</Text>
        </InfoCard>
        <InfoCard>
          <Text style={styles.sectionTitle}>{t("mobile.nextBooking")}</Text>
          {demoData ? (
            <View style={styles.timeline}>
              {demoData.appointments.map((appointment) => (
                <View key={appointment.id} style={styles.timelineRow}>
                  <Text style={styles.time}>{appointment.startsAt}</Text>
                  <View style={styles.event}>
                    <Text style={styles.eventTitle}>
                      {appointment.clientName}
                    </Text>
                    <Text style={styles.helper}>
                      {appointment.serviceName} · {appointment.durationMinutes}{" "}
                      min
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>{t("mobile.noBookingsToday")}</Text>
          )}
        </InfoCard>
        {demoData && (
          <InfoCard>
            <Text style={styles.sectionTitle}>{t("mobile.freeSlots")}</Text>
            <Text style={styles.helper}>{demoData.freeSlots.join(" · ")}</Text>
          </InfoCard>
        )}
        <InfoCard>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>
                {t("mobile.personalBlocks")}
              </Text>
              <Text style={styles.helper}>
                {t("mobile.personalBlockDescription")}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!client}
              onPress={() => setBlockModalVisible(true)}
              style={({ pressed }) => [
                styles.addButton,
                !client && styles.disabled,
                pressed && styles.addButtonPressed,
              ]}
            >
              <Text style={styles.addButtonText}>
                {t("mobile.personalBlockAdd")}
              </Text>
            </Pressable>
          </View>
          {isLoading ? (
            <Text style={styles.helper}>{t("common.loading")}</Text>
          ) : blocks.length ? (
            <View style={styles.blocksList}>
              {blocks.map((block) => (
                <PersonalBlockRow
                  block={block}
                  key={block.id}
                  locale={locale}
                  onDelete={remove}
                  t={t}
                  timezone={workspace.timezone}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>{t("mobile.personalBlockEmpty")}</Text>
          )}
          {error && !isBlockModalVisible ? (
            <Text style={styles.error}>{t("common.error")}</Text>
          ) : null}
        </InfoCard>
      </View>
      <PersonalBlockModal
        error={error}
        initialDate={todayInWorkspace}
        isSaving={isSaving}
        onClose={() => setBlockModalVisible(false)}
        onSave={async (draft: PersonalBlockDraft) => {
          await save(draft);
          setBlockModalVisible(false);
        }}
        t={t}
        visible={isBlockModalVisible}
      />
    </>
  );
}

function PersonalBlockRow({
  block,
  locale,
  onDelete,
  t,
  timezone,
}: {
  readonly block: PersonalBlock;
  readonly locale: DashboardTabProps["locale"];
  readonly onDelete: (blockId: string) => Promise<void>;
  readonly t: DashboardTabProps["t"];
  readonly timezone: string;
}) {
  const date = formatDate(new Date(block.starts_at), locale, {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  });
  const start = formatTime(new Date(block.starts_at), locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
  const end = formatTime(new Date(block.ends_at), locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  return (
    <View style={styles.blockRow}>
      <View style={styles.blockCopy}>
        <Text style={styles.blockTitle}>
          {block.reason || t("mobile.personalBlocks")}
        </Text>
        <Text style={styles.helper}>
          {date} · {start} – {end}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={`${t("mobile.personalBlockDelete")} ${block.reason || ""}`}
        accessibilityRole="button"
        onPress={() =>
          Alert.alert(
            t("mobile.personalBlockDelete"),
            block.reason || t("mobile.personalBlocks"),
            [
              { text: t("common.cancel"), style: "cancel" },
              {
                onPress: () => void onDelete(block.id).catch(() => undefined),
                text: t("mobile.personalBlockDelete"),
                style: "destructive",
              },
            ],
          )
        }
        style={styles.deleteButton}
      >
        <Text style={styles.deleteButtonText}>
          {t("mobile.personalBlockDelete")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  addButton: {
    backgroundColor: colors.action,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonPressed: { backgroundColor: colors.actionPressed },
  addButtonText: {
    ...typography.caption,
    color: colors.actionText,
    fontWeight: "700",
  },
  blockCopy: { flex: 1, gap: 2 },
  blockRow: {
    alignItems: "center",
    backgroundColor: colors.subtleSurface,
    borderLeftColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  blockTitle: { ...typography.label, color: colors.primaryText },
  blocksList: { gap: 8, marginTop: 14 },
  deleteButton: { paddingHorizontal: 4, paddingVertical: 8 },
  deleteButtonText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "700",
  },
  disabled: { opacity: 0.6 },
  error: { ...typography.caption, color: colors.danger, marginTop: 12 },
  eyebrow: {
    color: colors.accent,
    marginBottom: 6,
    textTransform: "uppercase",
    ...typography.eyebrow,
  },
  helper: { ...typography.body, color: colors.secondaryText },
  hours: { ...typography.metric, color: colors.primaryText },
  event: {
    backgroundColor: colors.accentSoft,
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    borderRadius: radii.control,
    flex: 1,
    padding: 10,
  },
  eventTitle: { ...typography.label, color: colors.primaryText },
  sectionTitle: {
    color: colors.primaryText,
    marginBottom: 10,
    ...typography.section,
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionHeaderCopy: { flex: 1 },
  title: { ...typography.heading, color: colors.primaryText },
  time: { ...typography.caption, color: colors.secondaryText, width: 48 },
  timeline: { gap: 8 },
  timelineRow: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
});
