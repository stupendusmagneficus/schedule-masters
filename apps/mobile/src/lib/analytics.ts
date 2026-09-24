import { analyticsEvents, createAnalytics } from "@schedule-app/analytics";

import { mobileEnv } from "../config/env";
import { platformStorage } from "./platformStorage";

export const analytics = createAnalytics({
  apiKey: mobileEnv.analyticsApiKey,
  host: mobileEnv.analyticsHost,
  platform: "mobile",
  storage: platformStorage,
});

export { analyticsEvents };
