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

  it("drops personal data and rejects arbitrary values even under permitted property names", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const analytics = createAnalytics({
      apiKey: "test-key",
      fetcher,
      platform: "web",
      storage: createMemoryStorage(),
    });
    analytics.track(analyticsEvents.publicBookingFailed, {
      locale: "person@example.com",
      reason: "private details: person@example.com",
      email: "person@example.com",
      phone: "+420123456789",
      note: "private text",
      platform: "spoofed",
    });
    await analytics.init();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    const payload = JSON.parse(fetcher.mock.calls[0]?.[1]?.body ?? "{}");
    expect(payload.properties).toEqual({ platform: "web" });
    expect(JSON.stringify(payload)).not.toContain("person@example.com");
    expect(JSON.stringify(payload)).not.toContain("private text");
  });

  it("keeps the known booking funnel dimensions", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const analytics = createAnalytics({
      apiKey: "key",
      fetcher,
      platform: "web",
      storage: createMemoryStorage(),
    });
    analytics.track(analyticsEvents.publicBookingFailed, {
      locale: "sk",
      reason: "request_failed",
      source: "master_created",
    });
    await analytics.init();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    const payload = JSON.parse(fetcher.mock.calls[0]?.[1]?.body ?? "{}");
    expect(payload.properties).toEqual({
      locale: "sk",
      reason: "request_failed",
      platform: "web",
    });
  });

  it.each([
    [analyticsEvents.publicBookingSucceeded, { locale: "cz", mode: "demo" }],
    [analyticsEvents.appointmentCreated, { source: "master_created" }],
    [analyticsEvents.workspaceSetupCompleted, { locale: "uk" }],
  ])(
    "preserves explicitly allowed properties for %s",
    async (event, properties) => {
      const fetcher = vi.fn().mockResolvedValue({ ok: true });
      const analytics = createAnalytics({
        apiKey: "key",
        fetcher,
        platform: "mobile",
        storage: createMemoryStorage(),
      });
      analytics.track(event, properties);
      await analytics.init();
      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
      const payload = JSON.parse(fetcher.mock.calls[0]?.[1]?.body ?? "{}");
      expect(payload.properties).toEqual({ ...properties, platform: "mobile" });
    },
  );
});
