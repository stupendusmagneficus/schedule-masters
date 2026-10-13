import { describe, expect, it } from "vitest";
import { getCustomerSegment } from "./customerSegments";

describe("getCustomerSegment", () => {
  const today = new Date("2026-10-13T12:00:00.000Z");

  it("marks customers with zero or one completed visit as new", () => {
    expect(getCustomerSegment(0, null, today)).toBe("new");
    expect(getCustomerSegment(1, "2026-10-01T10:00:00.000Z", today)).toBe(
      "new",
    );
  });

  it("marks customers with a recent completed visit as returning", () => {
    expect(getCustomerSegment(2, "2026-08-01T10:00:00.000Z", today)).toBe(
      "returning",
    );
  });

  it("marks customers whose last completed visit was over 90 days ago", () => {
    expect(getCustomerSegment(3, "2026-07-14T10:00:00.000Z", today)).toBe(
      "long_absent",
    );
  });

  it("does not call a visit exactly 90 days ago long absent", () => {
    expect(getCustomerSegment(2, "2026-07-15T12:00:00.000Z", today)).toBe(
      "returning",
    );
  });
});
