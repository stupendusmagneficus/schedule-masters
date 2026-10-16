import { describe, expect, it } from "vitest";

import { shouldLoadFinanceData } from "./useFinanceData";

describe("finance data loading policy", () => {
  it("does not load while the finance tab is hidden", () => {
    expect(
      shouldLoadFinanceData({
        enabled: false,
        hasCurrentData: false,
        loadedRefreshVersion: -1,
        refreshVersion: 0,
      }),
    ).toBe(false);
  });

  it("loads once when the selected month has no cached data", () => {
    expect(
      shouldLoadFinanceData({
        enabled: true,
        hasCurrentData: false,
        loadedRefreshVersion: 0,
        refreshVersion: 0,
      }),
    ).toBe(true);
  });

  it("uses the cache until an appointment change invalidates it", () => {
    expect(
      shouldLoadFinanceData({
        enabled: true,
        hasCurrentData: true,
        loadedRefreshVersion: 2,
        refreshVersion: 2,
      }),
    ).toBe(false);
    expect(
      shouldLoadFinanceData({
        enabled: true,
        hasCurrentData: true,
        loadedRefreshVersion: 2,
        refreshVersion: 3,
      }),
    ).toBe(true);
  });
});
