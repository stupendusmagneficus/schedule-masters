export function shouldLoadWaitingList({
  enabled,
  hasCurrentWorkspaceData,
}: {
  readonly enabled: boolean;
  readonly hasCurrentWorkspaceData: boolean;
}) {
  return enabled && !hasCurrentWorkspaceData;
}

export function shouldRefreshWaitingListOnResume({
  enabled,
  hasCurrentWorkspaceData,
  resumed,
}: {
  readonly enabled: boolean;
  readonly hasCurrentWorkspaceData: boolean;
  readonly resumed: boolean;
}) {
  return resumed && enabled && hasCurrentWorkspaceData;
}
