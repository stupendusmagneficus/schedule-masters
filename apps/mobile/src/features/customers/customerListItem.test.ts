import { describe, expect, it } from "vitest";
import {
  getCustomerContactLine,
  getCustomerInitials,
} from "./customerListItem";

describe("getCustomerInitials", () => {
  it("uses the first and last name parts", () => {
    expect(getCustomerInitials("Yahor Dunayeu")).toBe("YD");
    expect(getCustomerInitials("  Anna Marie   Nováková ")).toBe("AN");
  });

  it("handles single names, Cyrillic and lowercase input", () => {
    expect(getCustomerInitials("катя")).toBe("К");
    expect(getCustomerInitials("Test")).toBe("T");
  });

  it("falls back to a question mark for blank names", () => {
    expect(getCustomerInitials("   ")).toBe("?");
  });
});

describe("getCustomerContactLine", () => {
  it("prefers the phone over the email", () => {
    expect(
      getCustomerContactLine({ email: "a@example.test", phone: "+420 777" }),
    ).toEqual({ kind: "phone", value: "+420 777" });
  });

  it("falls back to the email, then to no contact", () => {
    expect(
      getCustomerContactLine({ email: " a@example.test ", phone: " " }),
    ).toEqual({ kind: "email", value: "a@example.test" });
    expect(getCustomerContactLine({ email: null, phone: null })).toEqual({
      kind: "none",
    });
  });
});
