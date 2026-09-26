import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";

import type { MasterAppointment } from "../../features/appointments/manualBooking";

export type Translate = (key: MessageKey) => string;

export type DashboardTabProps = {
  readonly locale: SupportedLocale;
  readonly masterAppointments?: readonly MasterAppointment[];
  readonly t: Translate;
};
