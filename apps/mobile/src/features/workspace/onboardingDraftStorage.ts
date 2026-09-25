import { platformStorage } from "../../lib/platformStorage";
import type { OnboardingDraft, SetupStep } from "./setupTypes";
import { onboardingDraftStorageKey } from "./setupTypes";

type StoredDraft = {
  readonly draft: OnboardingDraft;
  readonly step: SetupStep;
};

export async function loadOnboardingDraft(
  userId: string,
): Promise<StoredDraft | null> {
  try {
    const raw = await platformStorage.getItem(
      onboardingDraftStorageKey(userId),
    );
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isStoredDraft(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveOnboardingDraft(
  userId: string,
  value: StoredDraft,
): Promise<void> {
  try {
    await platformStorage.setItem(
      onboardingDraftStorageKey(userId),
      JSON.stringify(value),
    );
  } catch {
    // Draft persistence is best effort and must not block onboarding.
  }
}

export async function clearOnboardingDraft(userId: string): Promise<void> {
  try {
    await platformStorage.removeItem(onboardingDraftStorageKey(userId));
  } catch {
    // The workspace has already been created; cleanup can be retried later.
  }
}

function isStoredDraft(value: unknown): value is StoredDraft {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredDraft>;
  return (
    (candidate.step === 1 || candidate.step === 2 || candidate.step === 3) &&
    isOnboardingDraft(candidate.draft)
  );
}

function isOnboardingDraft(value: unknown): value is OnboardingDraft {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OnboardingDraft>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.serviceName === "string" &&
    typeof candidate.price === "string" &&
    typeof candidate.duration === "string" &&
    Array.isArray(candidate.workingDays) &&
    candidate.workingDays.every((day) => Number.isInteger(day)) &&
    typeof candidate.startTime === "string" &&
    typeof candidate.endTime === "string"
  );
}
