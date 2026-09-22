export type ApiBoundary = {
  readonly name: "schedule-masters-api";
};

export { createSupabaseClient } from "./supabase/client";
export type { Database } from "./supabase/database.types";
