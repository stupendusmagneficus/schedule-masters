import { describe, expect, it, vi } from "vitest";
import { cooldownSeconds, readEmailDeadline } from "./authRecoveryStorage";

describe("email cooldown", () => {
  it("rounds up and expires independently of timer ticks", () => {
    expect(cooldownSeconds(60_000, 1)).toBe(60);
    expect(cooldownSeconds(60_000, 59_001)).toBe(1);
    expect(cooldownSeconds(60_000, 61_000)).toBe(0);
  });
  it("ignores corrupt storage and bounds a future timestamp", async () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
    for (const value of [null, "NaN", "0", "-5"]) {
      storage.getItem.mockResolvedValueOnce(value);
      expect(await readEmailDeadline(storage, 1000)).toBe(0);
    }
    storage.getItem.mockResolvedValueOnce("99000000000000");
    expect(await readEmailDeadline(storage, 1000)).toBe(61_000);
  });
});
