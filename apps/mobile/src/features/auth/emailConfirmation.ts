import type { AuthError } from "./authentication";

export function isEmailConfirmationRequired(error: AuthError): boolean {
  if (error.code === "email_not_confirmed") {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("email not confirmed") ||
    message.includes("email is not confirmed")
  );
}
