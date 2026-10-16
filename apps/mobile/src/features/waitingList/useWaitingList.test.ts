import { describe, expect, it } from "vitest";

import {
  shouldLoadWaitingList,
  shouldRefreshWaitingListOnResume,
} from "./waitingListCache";

describe("waiting list cache policy", () => {
  it("loads on the first visit but does not refetch when switching back to Today", () => {
    expect(
      shouldLoadWaitingList({
        enabled: true,
        hasCurrentWorkspaceData: false,
      }),
    ).toBe(true);
    expect(
      shouldLoadWaitingList({
        enabled: true,
        hasCurrentWorkspaceData: true,
      }),
    ).toBe(false);
    expect(
      shouldLoadWaitingList({
        enabled: false,
        hasCurrentWorkspaceData: false,
      }),
    ).toBe(false);
  });

  it("revalidates cached data when the app resumes on Today only", () => {
    expect(
      shouldRefreshWaitingListOnResume({
        enabled: true,
        hasCurrentWorkspaceData: true,
        resumed: true,
      }),
    ).toBe(true);
    expect(
      shouldRefreshWaitingListOnResume({
        enabled: false,
        hasCurrentWorkspaceData: true,
        resumed: true,
      }),
    ).toBe(false);
    expect(
      shouldRefreshWaitingListOnResume({
        enabled: true,
        hasCurrentWorkspaceData: false,
        resumed: true,
      }),
    ).toBe(false);
    expect(
      shouldRefreshWaitingListOnResume({
        enabled: true,
        hasCurrentWorkspaceData: true,
        resumed: false,
      }),
    ).toBe(false);
  });
});
