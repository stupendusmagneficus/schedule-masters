type RefreshClient = {
  startAutoRefresh: () => unknown;
  stopAutoRefresh: () => unknown;
};
type Lifecycle = {
  readonly currentState: string | null;
  addEventListener: (
    event: "change",
    listener: (state: string) => void,
  ) => { remove: () => void };
};

export function manageAuthRefresh(
  auth: RefreshClient,
  lifecycle: Lifecycle,
): () => void {
  function update(state: string | null) {
    if (state === "active") void auth.startAutoRefresh();
    else void auth.stopAutoRefresh();
  }
  update(lifecycle.currentState);
  const subscription = lifecycle.addEventListener("change", update);
  return () => {
    subscription.remove();
    void auth.stopAutoRefresh();
  };
}
