import { describe, expect, it } from "vitest";

import type { WorkspaceSettingsDraft } from "./workspaceSettings";
import {
  createWorkspaceSettingsDraft,
  validateWorkspaceSettings,
} from "./workspaceSettings";

const validDraft: WorkspaceSettingsDraft = {
  bookingIntervalMinutes: 30,
  publicBookingMinNoticeMinutes: 0,
  name: "Anna Nails",
  slug: "anna-nails",
};

describe("workspace settings validation", () => {
  it("accepts valid workspace details", () => {
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

  it("allows profile settings when all days are closed", () => {
    const draft = createWorkspaceSettingsDraft({
      id: "workspace-1",
      name: "Studio",
      slug: "studio",
      timezone: "Europe/Prague",
      bookingIntervalMinutes: 30,
      publicBookingMinNoticeMinutes: 120,
      availabilityRules: [],
    });
    expect(validateWorkspaceSettings(draft)).toBeNull();
    expect(draft).not.toHaveProperty("workingDays");
    expect(draft).not.toHaveProperty("startTime");
    expect(draft).not.toHaveProperty("endTime");
  });
});
