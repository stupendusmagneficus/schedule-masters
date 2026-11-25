type ManageableAppointment = {
  readonly canCancel: boolean;
  readonly status: string;
};

// The backend withdraws both actions from active appointments once they start.
export function isStartedAppointment(appointment: ManageableAppointment) {
  return (
    (appointment.status === "pending" || appointment.status === "confirmed") &&
    !appointment.canCancel
  );
}

export function isStartedAppointmentError(message: string | undefined) {
  return message?.includes("Appointment has already started") ?? false;
}
