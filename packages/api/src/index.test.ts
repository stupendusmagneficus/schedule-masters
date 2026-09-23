import { describe, expect, it } from "vitest";

import { parsePublicBookingContext } from "./index";

describe("parsePublicBookingContext", () => {
  it("parses the public booking contract", () => {
    expect(
      parsePublicBookingContext({
        workspace: {
          id: "workspace-1",
          name: "Studio",
          slug: "studio",
          timezone: "Europe/Prague",
        },
        services: [
          {
            id: "service-1",
            name: "Manicure",
            description: null,
            durationMinutes: 60,
            priceAmount: 700,
            currency: "CZK",
          },
        ],
      }),
    ).toEqual({
      workspace: {
        id: "workspace-1",
        name: "Studio",
        slug: "studio",
        timezone: "Europe/Prague",
      },
      services: [
        {
          id: "service-1",
          name: "Manicure",
          description: null,
          durationMinutes: 60,
          priceAmount: 700,
          currency: "CZK",
        },
      ],
    });
  });

  it("rejects an invalid workspace contract", () => {
    expect(() => parsePublicBookingContext({ services: [] })).toThrow(
      "Invalid workspace in booking context",
    );
  });

  it("rejects an invalid service contract", () => {
    expect(() =>
      parsePublicBookingContext({
        workspace: {
          id: "workspace-1",
          name: "Studio",
          slug: "studio",
          timezone: "Europe/Prague",
        },
        services: [{ id: "service-1" }],
      }),
    ).toThrow("Invalid service in booking context");
  });
});
