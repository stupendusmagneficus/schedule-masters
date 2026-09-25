import type { MessageKey } from "@schedule-app/i18n";

type SetupError = { readonly message?: string };

export function getSetupErrorMessageKey(error: SetupError): MessageKey {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("slug")) return "workspace.setupInvalidSlug";
  if (
    message.includes("service") ||
    message.includes("price") ||
    message.includes("duration")
  ) {
    return "workspace.setupInvalidService";
  }

  return "workspace.setupFailed";
}
