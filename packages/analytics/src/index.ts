export const analyticsEvents = {
  appointmentCancelled: "appointment_cancelled",
  appointmentCreated: "appointment_created",
  appointmentRescheduled: "appointment_rescheduled",
  accountSignedIn: "account_signed_in",
  accountSignedUp: "account_signed_up",
  appOpened: "app_opened",
  bookingLinkCreated: "booking_link_created",
  bookingPageViewed: "booking_page_viewed",
  bookingReused: "booking_reused",
  bookingSlotSelected: "booking_slot_selected",
  firstServiceCreated: "first_service_created",
  publicBookingFailed: "public_booking_failed",
  publicBookingSubmitted: "public_booking_submitted",
  publicBookingSucceeded: "public_booking_succeeded",
  reminderSent: "reminder_sent",
  subscriptionChanged: "subscription_changed",
  subscriptionTrialStarted: "subscription_trial_started",
  workingHoursSaved: "working_hours_saved",
  workspaceSetupCompleted: "workspace_setup_completed",
} as const;

export type AnalyticsEventName =
  (typeof analyticsEvents)[keyof typeof analyticsEvents];

export type AnalyticsProperty = boolean | number | string | null;
export type AnalyticsProperties = Record<string, AnalyticsProperty>;

export type AnalyticsStorage = {
  readonly getItem: (key: string) => string | null | Promise<string | null>;
  readonly setItem: (key: string, value: string) => void | Promise<void>;
};

type FetchResponse = { readonly ok: boolean };
type Fetcher = (
  url: string,
  options: {
    readonly body: string;
    readonly headers: Record<string, string>;
    readonly method: "POST";
  },
) => Promise<FetchResponse>;

export type AnalyticsClient = {
  readonly init: () => Promise<void>;
  readonly track: (
    event: AnalyticsEventName,
    properties?: AnalyticsProperties,
  ) => void;
};

export type CreateAnalyticsOptions = {
  readonly apiKey?: string;
  readonly distinctIdKey?: string;
  readonly fetcher?: Fetcher;
  readonly host?: string;
  readonly platform: "mobile" | "web";
  readonly storage: AnalyticsStorage;
};

const defaultHost = "https://eu.i.posthog.com";
const defaultDistinctIdKey = "schedule-masters-analytics-id";

function createDistinctId(): string {
  const cryptoApi = globalThis as typeof globalThis & {
    crypto?: { randomUUID?: () => string };
  };
  return (
    cryptoApi.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function getDefaultFetcher(): Fetcher | undefined {
  const runtime = globalThis as typeof globalThis & { fetch?: Fetcher };
  return runtime.fetch;
}

export function createAnalytics({
  apiKey,
  distinctIdKey = defaultDistinctIdKey,
  fetcher = getDefaultFetcher(),
  host = defaultHost,
  platform,
  storage,
}: CreateAnalyticsOptions): AnalyticsClient {
  let distinctId: string | null = null;
  let initialization: Promise<void> | null = null;

  function initialize() {
    if (initialization) return initialization;

    initialization = (async () => {
      distinctId = await storage.getItem(distinctIdKey);
      if (!distinctId) {
        distinctId = createDistinctId();
        await storage.setItem(distinctIdKey, distinctId);
      }
    })();

    return initialization;
  }

  return {
    async init() {
      await initialize();
    },
    track(event, properties = {}) {
      if (!apiKey || !fetcher) return;
      void initialize().then(() => {
        if (!distinctId) return;
        const payload = {
          api_key: apiKey,
          distinct_id: distinctId,
          event,
          properties: { ...properties, platform },
          timestamp: new Date().toISOString(),
        };
        void fetcher(`${host.replace(/\/$/, "")}/capture/`, {
          body: JSON.stringify(payload),
          headers: { "content-type": "application/json" },
          method: "POST",
        }).catch(() => undefined);
      });
    },
  };
}
