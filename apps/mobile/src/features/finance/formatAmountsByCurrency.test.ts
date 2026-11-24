import { formatCurrency } from "@schedule-app/i18n";
import { describe, expect, it } from "vitest";
import { formatAmountsByCurrency } from "./formatAmountsByCurrency";

describe("formatAmountsByCurrency", () => {
  it("shows zero in the fallback currency when there are no amounts", () => {
    expect(formatAmountsByCurrency({}, "cz", "CZK")).toBe(
      formatCurrency(0, "cz", "CZK"),
    );
    expect(formatAmountsByCurrency({}, "en", "EUR")).toBe(
      formatCurrency(0, "en", "EUR"),
    );
  });

  it("lists every currency in a stable alphabetical order", () => {
    expect(formatAmountsByCurrency({ EUR: 20, CZK: 1500 }, "en", "CZK")).toBe(
      `${formatCurrency(1500, "en", "CZK")} · ${formatCurrency(20, "en", "EUR")}`,
    );
  });
});
