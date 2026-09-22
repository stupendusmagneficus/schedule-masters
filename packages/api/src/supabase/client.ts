import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type SupabaseClientConfig = {
  readonly anonKey: string;
  readonly url: string;
};

export function createSupabaseClient({
  url,
  anonKey,
}: SupabaseClientConfig): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
    },
  });
}
