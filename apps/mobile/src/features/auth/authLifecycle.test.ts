import { expect, it, vi } from "vitest";
import { manageAuthRefresh } from "./authLifecycle";

it("refreshes only while the native app is active and removes its listener", () => {
  const auth = { startAutoRefresh: vi.fn(), stopAutoRefresh: vi.fn() };
  const remove = vi.fn();
  let change: (state: string) => void = vi.fn();
  const lifecycle = {
    currentState: "background",
    addEventListener: (_event: "change", handler: (state: string) => void) => {
      change = handler;
      return { remove };
    },
  };
  const stop = manageAuthRefresh(auth, lifecycle);
  expect(auth.startAutoRefresh).not.toHaveBeenCalled();
  change("active");
  expect(auth.startAutoRefresh).toHaveBeenCalledOnce();
  change("background");
  expect(auth.stopAutoRefresh).toHaveBeenCalledTimes(2);
  stop();
  expect(remove).toHaveBeenCalledOnce();
  expect(auth.stopAutoRefresh).toHaveBeenCalledTimes(3);
});
