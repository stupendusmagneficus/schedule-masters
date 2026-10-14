import { describe, expect, it } from "vitest";

import { buildAppointmentManagementUrl, buildBookingUrl } from "./bookingUrl";

describe("buildBookingUrl", () => {
  it("adds the workspace slug to the booking page URL", () => {
    expect(buildBookingUrl("http://localhost:3000", "elena-beauty")).toBe(
      "http://localhost:3000/?slug=elena-beauty",
    );
  });

  it("preserves existing query parameters", () => {
    expect(
      buildBookingUrl("https://book.example.test/?demo=1", "demo-studio"),
    ).toBe("https://book.example.test/?demo=1&slug=demo-studio");
  });
});

describe("buildAppointmentManagementUrl", () => {
  it("puts the appointment token in the fragment and preserves base params", () => {
    expect(
      buildAppointmentManagementUrl(
        "https://book.example.test/?locale=ru",
        "a".repeat(128),
      ),
    ).toBe(`https://book.example.test/?locale=ru#token=${"a".repeat(128)}`);
  });
});
