export function createWorkspaceRequestGuard() {
  let currentRequestId = 0;

  return {
    begin() {
      currentRequestId += 1;
      return currentRequestId;
    },
    invalidate(requestId: number) {
      if (requestId === currentRequestId) currentRequestId += 1;
    },
    isCurrent(requestId: number) {
      return requestId === currentRequestId;
    },
  };
}
