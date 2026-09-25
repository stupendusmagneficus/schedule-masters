import type { OnboardingDraft, SetupStep } from "./setupTypes";

export type SetupValidationError =
  | "required"
  | "slug"
  | "price"
  | "duration"
  | "workingDays"
  | "schedule";

type SetupValues = OnboardingDraft;

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function validateSetupValues(
  values: SetupValues,
): SetupValidationError | null {
  return (
    validateSetupStep(values, 1) ??
    validateSetupStep(values, 2) ??
    validateSetupStep(values, 3)
  );
}

export function validateSetupStep(
  values: SetupValues,
  step: Exclude<SetupStep, 4>,
): SetupValidationError | null {
  if (step === 1) {
    if (!values.name.trim() || !values.slug.trim()) return "required";
    if (!values.slug.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)) return "slug";
    return null;
  }

  if (step === 2) {
    if (!values.serviceName.trim()) return "required";

    const price = Number(values.price);
    if (!values.price.trim() || !Number.isFinite(price) || price < 0) {
      return "price";
    }

    const duration = Number(values.duration);
    if (
      !values.duration.trim() ||
      !Number.isInteger(duration) ||
      duration <= 0 ||
      duration > 1440
    ) {
      return "duration";
    }
    return null;
  }

  if (!values.workingDays.length) return "workingDays";

  if (
    !timePattern.test(values.startTime.trim()) ||
    !timePattern.test(values.endTime.trim()) ||
    timeToMinutes(values.endTime) <= timeToMinutes(values.startTime)
  ) {
    return "schedule";
  }

  return null;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.trim().split(":").map(Number);
  return hours * 60 + minutes;
}
