import { describe, expect, it } from "vitest";
import {
  isStartedAppointment,
  isStartedAppointmentError,
} from "./appointmentManagement";

describe("started appointment detection", () => {
  it("treats an active appointment without a cancel action as started", () => {
    expect(isStartedAppointment({ canCancel: false, status: "pending" })).toBe(
      true,
    );
    expect(
      isStartedAppointment({ canCancel: false, status: "confirmed" }),
    ).toBe(true);
  });

  it("does not flag upcoming or finished appointments", () => {
    expect(isStartedAppointment({ canCancel: true, status: "confirmed" })).toBe(
      false,
    );
    expect(
      isStartedAppointment({ canCancel: false, status: "completed" }),
    ).toBe(false);
    expect(
      isStartedAppointment({
        canCancel: false,
        status: "cancelled_by_customer",
      }),
    ).toBe(false);
  });

  it("recognizes the backend rejection for a started appointment", () => {
    expect(isStartedAppointmentError("Appointment has already started")).toBe(
      true,
    );
    expect(isStartedAppointmentError("Appointment link is invalid")).toBe(
      false,
    );
    expect(isStartedAppointmentError(undefined)).toBe(false);
  });
});
