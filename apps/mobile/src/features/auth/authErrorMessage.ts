import type { MessageKey } from "@schedule-app/i18n";

import type { AuthError } from "./authentication";

export function getAuthErrorMessageKey(error: AuthError): MessageKey {
  if (error.code === "invalid_credentials") {
    return "auth.invalidCredentials";
  }

  if (error.code === "user_already_exists") {
    return "auth.accountExists";
  }

  const message = error.message.toLowerCase();
  if (message.includes("network") || message.includes("fetch")) {
    return "auth.networkError";
  }

  return "common.error";
}
