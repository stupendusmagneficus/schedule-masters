const env = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

export const mobileEnv = {
  supabaseUrl: env?.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: env?.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};
