import type { Database } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type {
  AvailableSlot,
  MasterAppointment,
} from "../features/appointments/manualBooking";
import {
  listRescheduleSlots,
  rescheduleMasterAppointment,
} from "../features/appointments/rescheduleAppointment";
import { formatDateInTimeZone } from "../features/availability/personalBlocks";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";
import { DateTimePickerField } from "./DateTimePickerField";
import { FullscreenModal } from "./FullscreenModal";
import { SlotGrid } from "./SlotGrid";

type RescheduleAppointmentModalProps = {
  readonly appointment: MasterAppointment;
  readonly client: SupabaseClient<Database>;
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly onRescheduled: () => Promise<void>;
  readonly t: (key: MessageKey) => string;
  readonly timezone: string;
  readonly visible: boolean;
  readonly workspaceId: string;
};

export function RescheduleAppointmentModal({
  appointment,
  client,
  locale,
  onClose,
  onRescheduled,
  t,
  timezone,
  visible,
  workspaceId,
}: RescheduleAppointmentModalProps) {
  const [date, setDate] = useState(() =>
    formatDateInTimeZone(new Date(appointment.starts_at), timezone),
  );
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [isLoadingSlots, setLoadingSlots] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [hasError, setError] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadVersion re-runs the query after a failed save.
  useEffect(() => {
    if (!visible || !date) return;
    let active = true;
    setLoadingSlots(true);
    setStartsAt("");
    void listRescheduleSlots(client, workspaceId, appointment.id, date)
      .then((nextSlots) => {
        if (!active) return;
        setSlots(nextSlots);
      })
      .catch(() => {
        if (!active) return;
        setSlots([]);
        setError(true);
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [appointment.id, client, date, reloadVersion, visible, workspaceId]);

  async function save() {
    if (!startsAt) return;
    setSaving(true);
    setError(false);
    try {
      await rescheduleMasterAppointment(
        client,
        workspaceId,
        appointment.id,
        startsAt,
      );
      await onRescheduled();
    } catch {
      setError(true);
      setReloadVersion((version) => version + 1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FullscreenModal
      closeDisabled={isSaving}
      closeLabel={t("common.cancel")}
      footer={
        <View style={styles.actions}>
          {hasError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {t("mobile.rescheduleBookingFailed")}
            </Text>
          ) : null}
          <ActionButton
            disabled={!startsAt || isSaving}
            label={t("mobile.rescheduleBookingSave")}
            loading={isSaving}
            onPress={() => void save()}
            variant="primary"
          />
        </View>
      }
      onClose={onClose}
      title={t("mobile.rescheduleBooking")}
      visible={visible}
    >
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.description}>
          {t("mobile.rescheduleBookingDescription")}
        </Text>
        <DateTimePickerField
          label={t("mobile.manualBookingDate")}
          locale={locale}
          mode="date"
          onChange={(nextDate) => {
            setError(false);
            setDate(nextDate);
          }}
          placeholder={t("mobile.personalBlockDatePlaceholder")}
          t={t}
          value={date}
        />
        <View>
          <Text style={styles.sectionTitle}>
            {t("mobile.manualBookingTime")}
          </Text>
          <SlotGrid
            isLoading={isLoadingSlots}
            locale={locale}
            onSelect={setStartsAt}
            selectedStartsAt={startsAt}
            slots={slots}
            t={t}
            timezone={timezone}
          />
        </View>
      </ScrollView>
    </FullscreenModal>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  description: { ...typography.body, color: colors.secondaryText },
  error: { ...typography.caption, color: colors.danger },
  form: { gap: 18, padding: 20, paddingBottom: 32 },
  sectionTitle: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "700",
  },
});
