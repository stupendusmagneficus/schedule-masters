import { describe, expect, it } from "vitest";
import { supportedLocaleSchema } from "./index";

describe("validation scaffold", () => {
  it("accepts the supported product locales", () => {
    expect(supportedLocaleSchema.parse("cz")).toBe("cz");
  });
});
