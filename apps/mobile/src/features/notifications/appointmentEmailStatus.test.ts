import { describe, expect, it } from "vitest";
import { parseAppointmentEmails } from "./appointmentEmailStatus";

describe("appointment email status", () => {
  it("preserves accepted vs delivered and rejects unsupported states", () => {
    const rows = [
      {
        id: "job",
        event_type: "accepted",
        state: "accepted_by_provider",
        created_at: "2030-01-01T09:00:00Z",
      },
    ];
    expect(parseAppointmentEmails(rows)[0].state).toBe("accepted_by_provider");
    expect(
      parseAppointmentEmails([{ ...rows[0], state: "delivered" }])[0].state,
    ).toBe("delivered");
    expect(() =>
      parseAppointmentEmails([{ ...rows[0], state: "unknown" }]),
    ).toThrow();
    expect(() => parseAppointmentEmails(null)).toThrow();
  });
});
