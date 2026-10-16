import type { MessageKey } from "@schedule-app/i18n";
import type { AppointmentStatus } from "./manualBooking";

export type AppointmentActionVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "neutral";

export type AppointmentStatusAction = {
  readonly label: string;
  readonly status: AppointmentStatus;
  readonly variant: AppointmentActionVariant;
};

export function getAppointmentStatusActions(
  status: AppointmentStatus,
  t: (key: MessageKey) => string,
): readonly AppointmentStatusAction[] {
  switch (status) {
    case "pending":
      return [
        {
          label: t("mobile.confirmBooking"),
          status: "confirmed",
          variant: "primary",
        },
        {
          label: t("mobile.cancelBooking"),
          status: "cancelled_by_master",
          variant: "destructive",
        },
      ];
    case "confirmed":
      return [
        {
          label: t("mobile.completeBooking"),
          status: "completed",
          variant: "primary",
        },
        {
          label: t("mobile.markNoShow"),
          status: "no_show",
          variant: "neutral",
        },
        {
          label: t("mobile.cancelBooking"),
          status: "cancelled_by_master",
          variant: "destructive",
        },
      ];
    case "cancelled_by_customer":
    case "cancelled_by_master":
    case "completed":
    case "no_show":
      return [];
  }
}
