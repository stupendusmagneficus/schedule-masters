import {
  type MasterAuthCredentials,
  masterAuthCredentialsSchema,
} from "@schedule-app/validation";
import type { Session } from "@supabase/supabase-js";

export type AuthMode = "signIn" | "signUp";

export type AuthError = {
  readonly code?: string;
  readonly message: string;
};

type AuthResponse = {
  readonly data: { readonly session: Session | null };
  readonly error: AuthError | null;
};

export type AuthenticationClient = {
  readonly auth: {
    readonly signInWithPassword: (
      credentials: MasterAuthCredentials,
    ) => Promise<AuthResponse>;
    readonly signUp: (
      credentials: MasterAuthCredentials,
    ) => Promise<AuthResponse>;
  };
};

export type AuthenticationResult =
  | { readonly kind: "authenticated"; readonly session: Session }
  | { readonly kind: "confirmationRequired" }
  | { readonly kind: "requestError"; readonly error: AuthError }
  | {
      readonly kind: "validationError";
      readonly fields: ReadonlyArray<"email" | "password">;
    };

export async function authenticate(
  client: AuthenticationClient,
  mode: AuthMode,
  input: MasterAuthCredentials,
): Promise<AuthenticationResult> {
  const parsed = masterAuthCredentialsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      kind: "validationError",
      fields: parsed.error.issues.map((issue) => issue.path[0]) as Array<
        "email" | "password"
      >,
    };
  }

  const result =
    mode === "signUp"
      ? await client.auth.signUp(parsed.data)
      : await client.auth.signInWithPassword(parsed.data);

  if (result.error) return { kind: "requestError", error: result.error };
  if (result.data.session) {
    return { kind: "authenticated", session: result.data.session };
  }

  return { kind: "confirmationRequired" };
}
