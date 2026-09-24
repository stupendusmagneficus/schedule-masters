import { describe, expect, it } from "vitest";

import { buildBookingUrl } from "./bookingUrl";

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
