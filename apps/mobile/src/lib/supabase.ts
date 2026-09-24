import { createSupabaseClient } from "@schedule-app/api";

import { mobileEnv } from "../config/env";
import { platformStorage } from "./platformStorage";

export const supabase =
  mobileEnv.supabaseUrl && mobileEnv.supabasePublishableKey
    ? createSupabaseClient({
        url: mobileEnv.supabaseUrl,
        publishableKey: mobileEnv.supabasePublishableKey,
        storage: platformStorage,
      })
    : null;
