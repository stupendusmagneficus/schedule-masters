import { describe, expect, it } from "vitest";

import { normalizeBookingSlug } from "./slug";

describe("normalizeBookingSlug", () => {
  it("creates a lowercase URL-safe slug", () => {
    expect(normalizeBookingSlug(" Anna Nails ")).toBe("anna-nails");
  });

  it("collapses repeated separators", () => {
    expect(normalizeBookingSlug("anna---nails")).toBe("anna-nails");
  });
});
