import type { CustomerProfile } from "./customerDirectory";

export type CustomerContactLine =
  | { readonly kind: "phone" | "email"; readonly value: string }
  | { readonly kind: "none" };

/** Up to two uppercase initials from the first and last name parts. */
export function getCustomerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  const initial = (part: string) => Array.from(part)[0] ?? "";
  return `${initial(first)}${last ? initial(last) : ""}`.toLocaleUpperCase();
}

/** Phone wins over email so the list shows the most actionable contact. */
export function getCustomerContactLine(
  customer: Pick<CustomerProfile, "email" | "phone">,
): CustomerContactLine {
  const phone = customer.phone?.trim();
  if (phone) return { kind: "phone", value: phone };
  const email = customer.email?.trim();
  if (email) return { kind: "email", value: email };
  return { kind: "none" };
}
