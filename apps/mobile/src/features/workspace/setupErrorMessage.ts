import type { MessageKey } from "@schedule-app/i18n";

type SetupError = { readonly message?: string };

export function getSetupErrorMessageKey(error: SetupError): MessageKey {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("slug")) return "workspace.setupInvalidSlug";
  if (message.includes("duration")) return "workspace.durationInvalid";
  if (message.includes("at least one working day")) {
    return "workspace.workingDaysInvalid";
  }
  if (message.includes("working day") || message.includes("working days")) {
    return "workspace.scheduleInvalid";
  }
  if (message.includes("service") || message.includes("price")) {
    return "workspace.setupInvalidService";
  }
  if (message.includes("start") || message.includes("end")) {
    return "workspace.scheduleInvalid";
  }

  return "workspace.setupFailed";
}
