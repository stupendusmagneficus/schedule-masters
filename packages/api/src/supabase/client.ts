import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type SupabaseClientConfig = {
  readonly flowType?: "implicit" | "pkce";
  readonly publishableKey: string;
  readonly storage?: SupabaseStorage;
  readonly url: string;
};

export type SupabaseDatabaseClient = SupabaseClient<Database>;

export type SupabaseStorage = {
  getItem: (key: string) => string | null | Promise<string | null>;
  removeItem: (key: string) => void | Promise<void>;
  setItem: (key: string, value: string) => void | Promise<void>;
};

export function createSupabaseClient({
  url,
  publishableKey,
  storage,
  flowType = "implicit",
}: SupabaseClientConfig): SupabaseDatabaseClient {
  return createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType,
      persistSession: true,
      ...(storage ? { storage } : {}),
    },
  });
}
