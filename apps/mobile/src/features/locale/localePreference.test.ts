import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/platformStorage", () => ({
  platformStorage: {
    getItem: async () => null,
    setItem: async () => undefined,
  },
}));

import {
  loadLocalePreference,
  localePreferenceStorageKey,
  saveLocalePreference,
} from "./localePreference";

describe("locale preference", () => {
  it("keeps Czech as the default when there is no saved selection", async () => {
    await expect(
      loadLocalePreference({ getItem: () => null, setItem: () => {} }),
    ).resolves.toBe("cz");
  });

  it.each(["ru", "cz", "en", "sk", "uk"] as const)(
    "restores the saved %s selection",
    async (locale) => {
      await expect(
        loadLocalePreference({
          getItem: () => locale,
          setItem: () => {},
        }),
      ).resolves.toBe(locale);
    },
  );

  it("ignores unsupported saved values and survives storage errors", async () => {
    const unsupported = {
      getItem: () => "de",
      setItem: () => {},
    };
    const unavailable = {
      getItem: () => Promise.reject(new Error("storage unavailable")),
      setItem: () => {},
    };

    await expect(loadLocalePreference(unsupported)).resolves.toBe("cz");
    await expect(loadLocalePreference(unavailable)).resolves.toBe("cz");
  });

  it("saves the selected locale under the shared preference key", async () => {
    let saved: readonly [string, string] | null = null;
    await saveLocalePreference("uk", {
      getItem: () => null,
      setItem: (key, value) => {
        saved = [key, value];
      },
    });

    expect(saved).toEqual([localePreferenceStorageKey, "uk"]);
  });
});
