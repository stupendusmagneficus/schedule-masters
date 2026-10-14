import { describe, expect, it } from "vitest";
import { parseAppointmentPayment } from "./appointmentPayment";

describe("parseAppointmentPayment", () => {
  it("accepts zero, partial and full payments with comma decimals", () => {
    expect(parseAppointmentPayment("0", 1200)).toBe(0);
    expect(parseAppointmentPayment("450,50", 1200)).toBe(450.5);
    expect(parseAppointmentPayment("1200", 1200)).toBe(1200);
  });

  it.each(["", "-1", "1200.01", "1.234", "nope", ".5"])(
    "rejects invalid amount %s",
    (value) => expect(parseAppointmentPayment(value, 1200)).toBeNull(),
  );
});
