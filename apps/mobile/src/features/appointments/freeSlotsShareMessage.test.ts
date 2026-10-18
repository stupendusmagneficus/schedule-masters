import { describe, expect, it } from "vitest";
import { buildFreeSlotsShareMessage } from "./freeSlotsShareMessage";

describe("buildFreeSlotsShareMessage", () => {
  it("groups slots by local day and formats times in the workspace timezone", () => {
    const message = buildFreeSlotsShareMessage({
      heading: "Free slots",
      availabilityNote: "Start time depends on the service selected.",
      locale: "en",
      slots: [
        {
          available_date: "2030-01-07",
          starts_at: "2030-01-07T09:30:00.000Z",
        },
        {
          available_date: "2030-01-08",
          starts_at: "2030-01-08T10:00:00.000Z",
        },
        {
          available_date: "2030-01-07",
          starts_at: "2030-01-07T08:00:00.000Z",
        },
      ],
      timezone: "Europe/Prague",
      workspaceName: "Beauty studio",
    });

    expect(message).toContain("Beauty studio");
    expect(message).toContain("Start time depends on the service selected.");
    expect(message).toContain("January 7, 2030: 09:00 AM, 10:30 AM");
    expect(message).toContain("January 8, 2030: 11:00 AM");
  });

  it("keeps the share text valid when the selected month has no slots", () => {
    expect(
      buildFreeSlotsShareMessage({
        heading: "Free slots",
        availabilityNote: "Start time depends on the service selected.",
        locale: "en",
        slots: [],
        timezone: "Europe/Prague",
        workspaceName: "Beauty studio",
      }),
    ).toBe(
      "Free slots\nBeauty studio\nStart time depends on the service selected.\n",
    );
  });
});
