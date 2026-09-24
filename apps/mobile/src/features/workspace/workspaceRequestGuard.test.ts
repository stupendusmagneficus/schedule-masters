import { describe, expect, it } from "vitest";

import { createWorkspaceRequestGuard } from "./workspaceRequestGuard";

describe("createWorkspaceRequestGuard", () => {
  it("rejects a result from the previous account request", () => {
    const guard = createWorkspaceRequestGuard();
    const accountARequest = guard.begin();
    const accountBRequest = guard.begin();

    expect(guard.isCurrent(accountARequest)).toBe(false);
    expect(guard.isCurrent(accountBRequest)).toBe(true);
  });

  it("rejects a result after the active request is invalidated", () => {
    const guard = createWorkspaceRequestGuard();
    const request = guard.begin();

    guard.invalidate(request);

    expect(guard.isCurrent(request)).toBe(false);
  });
});
