// Expo inlines EXPO_PUBLIC_* only for direct `process.env.NAME` reads; keep them literal.
declare const process: {
  readonly env: {
    readonly EXPO_PUBLIC_ANALYTICS_API_KEY?: string;
    readonly EXPO_PUBLIC_ANALYTICS_HOST?: string;
    readonly EXPO_PUBLIC_AUTH_REDIRECT_URL?: string;
    readonly EXPO_PUBLIC_BOOKING_WEB_URL?: string;
    readonly EXPO_PUBLIC_SUPABASE_URL?: string;
    readonly EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  };
};

declare const __DEV__: boolean;

const developmentBookingWebUrl = "http://localhost:3000";

export const mobileEnv = {
  analyticsApiKey: process.env.EXPO_PUBLIC_ANALYTICS_API_KEY,
  analyticsHost: process.env.EXPO_PUBLIC_ANALYTICS_HOST,
  authRedirectUrl: process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL,
  // Empty in a release without a configured URL; App shows the configuration state.
  bookingWebUrl:
    process.env.EXPO_PUBLIC_BOOKING_WEB_URL ??
    (__DEV__ ? developmentBookingWebUrl : ""),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};
