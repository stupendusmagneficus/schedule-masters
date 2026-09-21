import { describe, expect, it } from "vitest";
import { bookingStatuses } from "./index";

describe("domain scaffold", () => {
  it("exposes the initial booking status vocabulary", () => {
    expect(bookingStatuses).toContain("confirmed");
  });
});
