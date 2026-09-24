import { describe, expect, it, vi } from "vitest";

import { analyticsEvents, createAnalytics } from "./index";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe("analytics client", () => {
  it("defers storage access until analytics is used", async () => {
    const getItem = vi.fn().mockReturnValue(null);
    const setItem = vi.fn();
    const analytics = createAnalytics({
      platform: "web",
      storage: { getItem, setItem },
    });

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();

    await analytics.init();

    expect(getItem).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledOnce();
  });

  it("sends only explicit events with a pseudonymous id", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const analytics = createAnalytics({
      apiKey: "test-key",
      fetcher,
      host: "https://eu.i.posthog.com",
      platform: "web",
      storage: createMemoryStorage(),
    });

    analytics.track(analyticsEvents.bookingPageViewed, { locale: "en" });
    await analytics.init();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());

    const request = fetcher.mock.calls[0]?.[1];
    const payload = JSON.parse(request?.body ?? "{}");
    expect(payload.event).toBe("booking_page_viewed");
    expect(payload.properties).toEqual({ locale: "en", platform: "web" });
    expect(payload.properties.email).toBeUndefined();
    expect(payload.distinct_id).toEqual(expect.any(String));
  });

  it("does not send events without configuration", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const analytics = createAnalytics({
      fetcher,
      platform: "mobile",
      storage: createMemoryStorage(),
    });

    analytics.track(analyticsEvents.appOpened);
    await analytics.init();

    expect(fetcher).not.toHaveBeenCalled();
  });
});
