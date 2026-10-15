import type { MasterAppointment } from "../appointments/manualBooking";

type PaidAppointment = Pick<MasterAppointment, "paid_amount" | "status">;

export function sumReceivedRevenue(
  appointments: readonly PaidAppointment[],
): number {
  const cents = appointments.reduce(
    (total, appointment) =>
      appointment.status === "completed"
        ? total + Math.round(Number(appointment.paid_amount) * 100)
        : total,
    0,
  );
  return cents / 100;
}
