import { describe, expect, it } from "vitest";

import {
  formatDateInTimeZone,
  validatePersonalBlockDraft,
} from "./personalBlocks";

const validDraft = {
  date: "2030-01-03",
  endTime: "13:00",
  reason: "Oběd",
  startTime: "12:00",
};

describe("validatePersonalBlockDraft", () => {
  it("accepts a valid local date and time range", () => {
    expect(validatePersonalBlockDraft(validDraft)).toBeNull();
  });

  it.each([
    ["invalid date", { date: "2030-02-30" }],
    ["invalid start time", { startTime: "8:00" }],
    ["invalid end time", { endTime: "25:00" }],
  ])("rejects %s", (_label, values) => {
    expect(validatePersonalBlockDraft({ ...validDraft, ...values })).not.toBe(
      null,
    );
  });

  it("requires the end to be later than the start", () => {
    expect(
      validatePersonalBlockDraft({ ...validDraft, endTime: "12:00" }),
    ).toBe("endBeforeStart");
  });
});

describe("formatDateInTimeZone", () => {
  it("uses the workspace timezone instead of the device timezone", () => {
    expect(
      formatDateInTimeZone(
        new Date("2030-01-03T23:30:00.000Z"),
        "Europe/Prague",
      ),
    ).toBe("2030-01-04");
  });
});
