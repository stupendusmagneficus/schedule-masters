const env = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

export const mobileEnv = {
  analyticsApiKey: env?.EXPO_PUBLIC_ANALYTICS_API_KEY,
  analyticsHost: env?.EXPO_PUBLIC_ANALYTICS_HOST,
  bookingWebUrl: env?.EXPO_PUBLIC_BOOKING_WEB_URL ?? "http://localhost:3000",
  supabaseUrl: env?.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: env?.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};
