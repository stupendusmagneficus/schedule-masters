import { describe, expect, it } from "vitest";

import type { WorkspaceSettingsDraft } from "./workspaceSettings";
import { validateWorkspaceSettings } from "./workspaceSettings";

const validDraft: WorkspaceSettingsDraft = {
  bookingIntervalMinutes: 30,
  publicBookingMinNoticeMinutes: 0,
  endTime: "18:00",
  name: "Anna Nails",
  slug: "anna-nails",
  startTime: "09:00",
  workingDays: [1, 2, 3, 4, 5],
};

describe("workspace settings validation", () => {
  it("accepts valid workspace details and a weekly schedule", () => {
    expect(validateWorkspaceSettings(validDraft)).toBeNull();
  });

  it("accepts custom booking start intervals and rejects values off the 5-minute grid", () => {
    expect(
      validateWorkspaceSettings({ ...validDraft, bookingIntervalMinutes: 15 }),
    ).toBeNull();
    expect(
      validateWorkspaceSettings({
        ...validDraft,
        bookingIntervalMinutes: 75,
      }),
    ).toBeNull();
    expect(
      validateWorkspaceSettings({
        ...validDraft,
        bookingIntervalMinutes: 77,
      }),
    ).toBe("bookingInterval");
  });

  it("accepts no notice, presets, and custom 15-minute notice values", () => {
    expect(validateWorkspaceSettings(validDraft)).toBeNull();
    expect(
      validateWorkspaceSettings({
        ...validDraft,
        publicBookingMinNoticeMinutes: 120,
      }),
    ).toBeNull();
    expect(
      validateWorkspaceSettings({
        ...validDraft,
        publicBookingMinNoticeMinutes: 10080,
      }),
    ).toBeNull();
  });

  it("rejects notice values outside the supported 15-minute grid", () => {
    expect(
      validateWorkspaceSettings({
        ...validDraft,
        publicBookingMinNoticeMinutes: -15,
      }),
    ).toBe("bookingNotice");
    expect(
      validateWorkspaceSettings({
        ...validDraft,
        publicBookingMinNoticeMinutes: 61,
      }),
    ).toBe("bookingNotice");
    expect(
      validateWorkspaceSettings({
        ...validDraft,
        publicBookingMinNoticeMinutes: 10095,
      }),
    ).toBe("bookingNotice");
  });

  it("rejects an empty or overlong workspace name", () => {
    expect(validateWorkspaceSettings({ ...validDraft, name: " " })).toBe(
      "name",
    );
    expect(
      validateWorkspaceSettings({ ...validDraft, name: "x".repeat(121) }),
    ).toBe("name");
  });

  it("rejects malformed booking slugs", () => {
    expect(
      validateWorkspaceSettings({ ...validDraft, slug: "Anna nails" }),
    ).toBe("slug");
  });

  it("requires at least one working day and an increasing valid time range", () => {
    expect(validateWorkspaceSettings({ ...validDraft, workingDays: [] })).toBe(
      "workingDays",
    );
    expect(
      validateWorkspaceSettings({ ...validDraft, workingDays: [1, 1] }),
    ).toBe("workingDays");
    expect(validateWorkspaceSettings({ ...validDraft, workingDays: [8] })).toBe(
      "workingDays",
    );
    expect(validateWorkspaceSettings({ ...validDraft, endTime: "09:00" })).toBe(
      "schedule",
    );
    expect(validateWorkspaceSettings({ ...validDraft, startTime: "9am" })).toBe(
      "schedule",
    );
  });
});
