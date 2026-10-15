import { describe, expect, it } from "vitest";
import { parseAppointmentPayment } from "./appointmentPayment";

describe("parseAppointmentPayment", () => {
  it("accepts zero, partial, full and above-price payments", () => {
    expect(parseAppointmentPayment("0")).toBe(0);
    expect(parseAppointmentPayment("450,50")).toBe(450.5);
    expect(parseAppointmentPayment("1200")).toBe(1200);
    expect(parseAppointmentPayment("1222")).toBe(1222);
  });

  it.each(["", "-1", "1.234", "nope", ".5", "100000000"])(
    "rejects invalid amount %s",
    (value) => expect(parseAppointmentPayment(value)).toBeNull(),
  );
});
