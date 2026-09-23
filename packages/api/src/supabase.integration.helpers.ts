import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

import type { Database } from "./supabase/database.types";

type TestClient = SupabaseClient<Database>;

type AuthenticatedTestUser = {
  client: TestClient;
  user: User;
};

export function createSupabaseAdminTestClient({
  serviceRoleKey,
  url,
}: {
  serviceRoleKey: string;
  url: string;
}): TestClient {
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function createAuthenticatedTestUser({
  admin,
  email,
  password,
  url,
  publishableKey,
}: {
  admin: TestClient;
  email: string;
  password: string;
  publishableKey: string;
  url: string;
}): Promise<AuthenticatedTestUser> {
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });

  if (created.error || !created.data.user) {
    throw created.error ?? new Error("Test user was not created");
  }

  const client = createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });

  if (signedIn.error || !signedIn.data.user) {
    throw signedIn.error ?? new Error("Test user was not authenticated");
  }

  return { client, user: signedIn.data.user };
}
