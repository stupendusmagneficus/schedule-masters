import { describe, expect, it } from "vitest";

import {
  getInitialManualBookingStep,
  manualBookingStepIndex,
  nextManualBookingStep,
  previousManualBookingStep,
} from "./manualBookingFlow";

describe("manual booking flow", () => {
  it("starts with time when a customer is selected but no slot is chosen", () => {
    expect(
      getInitialManualBookingStep({ hasCustomer: true, hasStartsAt: false }),
    ).toBe("time");
  });

  it("moves forward without passing the review step", () => {
    expect(nextManualBookingStep("time")).toBe("customer");
    expect(nextManualBookingStep("customer")).toBe("review");
    expect(nextManualBookingStep("review")).toBe("review");
  });

  it("moves back without passing the time step", () => {
    expect(previousManualBookingStep("review")).toBe("customer");
    expect(previousManualBookingStep("customer")).toBe("time");
    expect(previousManualBookingStep("time")).toBe("time");
  });

  it("exposes a stable progress index", () => {
    expect(manualBookingStepIndex("time")).toBe(0);
    expect(manualBookingStepIndex("customer")).toBe(1);
    expect(manualBookingStepIndex("review")).toBe(2);
  });
});
