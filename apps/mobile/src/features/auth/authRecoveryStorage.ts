import type { SupabaseStorage } from "@schedule-app/api";

// Non-secret marker: a recovered session must finish the password form after a
// reload too. It is bound to the user, never to an access/refresh token.
export const recoveryUserStorageKey = "schedule-masters.auth-recovery-user";
export const authEmailDeadlineKey = "schedule-masters.auth-email-deadline";
export const authEmailCooldownMs = 60_000;

export function cooldownSeconds(deadline: number, now: number): number {
  return Math.max(0, Math.min(60, Math.ceil((deadline - now) / 1000)));
}

export async function readEmailDeadline(
  storage: SupabaseStorage,
  now: number,
): Promise<number> {
  const value = Number(await storage.getItem(authEmailDeadlineKey));
  return Number.isFinite(value) && value > now
    ? Math.min(value, now + authEmailCooldownMs)
    : 0;
}
