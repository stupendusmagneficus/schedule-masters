import { analyticsEvents, createAnalytics } from "@schedule-app/analytics";

const browserStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) =>
    window.localStorage.setItem(key, value),
};

export const analytics = createAnalytics({
  apiKey: process.env.NEXT_PUBLIC_ANALYTICS_API_KEY,
  host: process.env.NEXT_PUBLIC_ANALYTICS_HOST,
  platform: "web",
  storage: browserStorage,
});

export { analyticsEvents };
