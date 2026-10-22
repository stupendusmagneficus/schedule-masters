import {
  masterEmailSchema,
  masterPasswordSchema,
} from "@schedule-app/validation";

import type { AuthError } from "./authentication";

export type AuthEmailKind = "confirmation" | "recovery";
type Response = {
  readonly error: (AuthError & { readonly status?: number }) | null;
};
export type AuthRecoveryClient = {
  readonly auth: {
    readonly resend: (input: {
      type: "signup";
      email: string;
      options: { emailRedirectTo: string };
    }) => Promise<Response>;
    readonly resetPasswordForEmail: (
      email: string,
      options: { redirectTo: string },
    ) => Promise<Response>;
    readonly updateUser: (attributes: {
      password: string;
    }) => Promise<Response>;
  };
};

export async function requestAuthEmail(
  client: AuthRecoveryClient,
  kind: AuthEmailKind,
  email: string,
  redirectTo: string,
) {
  const parsed = masterEmailSchema.safeParse(email);
  if (!parsed.success) return "invalidEmail" as const;
  try {
    const { error } =
      kind === "confirmation"
        ? await client.auth.resend({
            type: "signup",
            email: parsed.data,
            options: { emailRedirectTo: redirectTo },
          })
        : await client.auth.resetPasswordForEmail(parsed.data, { redirectTo });
    // Account-specific and rate-limit responses deliberately have the same copy.
    // Auth enforces server limits; the UI also waits before another attempt.
    if (error && (!error.status || error.status >= 500))
      return "unavailable" as const;
    return "sent" as const;
  } catch {
    return "unavailable" as const;
  }
}

export async function changeRecoveredPassword(
  client: AuthRecoveryClient,
  password: string,
  confirmation: string,
) {
  if (!masterPasswordSchema.safeParse(password).success)
    return "tooShort" as const;
  if (password !== confirmation) return "mismatch" as const;
  try {
    const { error } = await client.auth.updateUser({ password });
    if (error?.code === "same_password") return "samePassword" as const;
    return error ? ("failed" as const) : ("saved" as const);
  } catch {
    return "failed" as const;
  }
}
