import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type SupabaseClientConfig = {
  readonly anonKey: string;
  readonly storage?: SupabaseStorage;
  readonly url: string;
};

export type SupabaseStorage = {
  getItem: (key: string) => string | null | Promise<string | null>;
  removeItem: (key: string) => void | Promise<void>;
  setItem: (key: string, value: string) => void | Promise<void>;
};

export function createSupabaseClient({
  url,
  anonKey,
  storage,
}: SupabaseClientConfig): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      ...(storage ? { storage } : {}),
    },
  });
}
