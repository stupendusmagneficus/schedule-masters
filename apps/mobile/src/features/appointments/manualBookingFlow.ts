export const manualBookingSteps = ["time", "customer", "review"] as const;

export type ManualBookingStep = (typeof manualBookingSteps)[number];

export function nextManualBookingStep(
  step: ManualBookingStep,
): ManualBookingStep {
  const index = manualBookingSteps.indexOf(step);
  return manualBookingSteps[Math.min(index + 1, manualBookingSteps.length - 1)];
}

export function previousManualBookingStep(
  step: ManualBookingStep,
): ManualBookingStep {
  const index = manualBookingSteps.indexOf(step);
  return manualBookingSteps[Math.max(index - 1, 0)];
}

export function manualBookingStepIndex(step: ManualBookingStep): number {
  return manualBookingSteps.indexOf(step);
}
