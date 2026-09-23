import { createSupabaseClient } from "@schedule-app/api";
import * as SecureStore from "expo-secure-store";

import { mobileEnv } from "../config/env";

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
};

export const supabase = mobileEnv.supabaseUrl && mobileEnv.supabasePublishableKey
  ? createSupabaseClient({
      url: mobileEnv.supabaseUrl,
      publishableKey: mobileEnv.supabasePublishableKey,
      storage: secureStorage,
    })
  : null;
