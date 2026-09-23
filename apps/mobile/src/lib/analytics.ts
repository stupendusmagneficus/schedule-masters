import { analyticsEvents, createAnalytics } from "@schedule-app/analytics";
import * as SecureStore from "expo-secure-store";

import { mobileEnv } from "../config/env";

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
};

export const analytics = createAnalytics({
  apiKey: mobileEnv.analyticsApiKey,
  host: mobileEnv.analyticsHost,
  platform: "mobile",
  storage: secureStorage,
});

export { analyticsEvents };
