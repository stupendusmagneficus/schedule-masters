import { describe, expect, it } from "vitest";
import { getAppointmentStatusActions } from "./appointmentActions";

const translate = (key: string) => key;

describe("appointment status actions", () => {
  it("makes confirmation primary and cancellation destructive", () => {
    expect(getAppointmentStatusActions("pending", translate)).toEqual([
      {
        label: "mobile.confirmBooking",
        status: "confirmed",
        variant: "primary",
      },
      {
        label: "mobile.cancelBooking",
        status: "cancelled_by_master",
        variant: "destructive",
      },
    ]);
  });

  it("makes completion primary and no-show a neutral alternative", () => {
    expect(getAppointmentStatusActions("confirmed", translate)).toEqual([
      {
        label: "mobile.completeBooking",
        status: "completed",
        variant: "primary",
      },
      {
        label: "mobile.markNoShow",
        status: "no_show",
        variant: "neutral",
      },
      {
        label: "mobile.cancelBooking",
        status: "cancelled_by_master",
        variant: "destructive",
      },
    ]);
  });

  it("does not offer lifecycle actions for terminal statuses", () => {
    expect(getAppointmentStatusActions("completed", translate)).toHaveLength(0);
    expect(getAppointmentStatusActions("no_show", translate)).toHaveLength(0);
    expect(
      getAppointmentStatusActions("cancelled_by_master", translate),
    ).toHaveLength(0);
    expect(
      getAppointmentStatusActions("cancelled_by_customer", translate),
    ).toHaveLength(0);
  });
});
