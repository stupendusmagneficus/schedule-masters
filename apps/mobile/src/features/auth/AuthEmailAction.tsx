import type { MessageKey } from "@schedule-app/i18n";
import { View } from "react-native";
import { ActionButton } from "../../components/ActionButton";
import { AuthFeedback } from "../../components/AuthFeedback";
import type { AuthEmailKind, AuthRecoveryClient } from "./authRecovery";
import { useAuthEmailRequest } from "./useAuthEmailRequest";

export function AuthEmailAction({
  client,
  kind,
  email,
  redirectTo,
  t,
}: {
  readonly client: AuthRecoveryClient;
  readonly kind: AuthEmailKind;
  readonly email: string;
  readonly redirectTo: string;
  readonly t: (key: MessageKey) => string;
}) {
  const request = useAuthEmailRequest(client);
  const label =
    request.remaining > 0
      ? `${t("auth.resendWait")} ${request.remaining} ${t("auth.seconds")}`
      : t(
          kind === "confirmation"
            ? "auth.resendConfirmation"
            : "auth.sendRecovery",
        );
  return (
    <View style={{ gap: 16 }}>
      {request.message && (
        <AuthFeedback
          notice={{
            message: t(request.message),
            tone:
              request.message === "auth.emailRequestSent" ? "info" : "error",
          }}
        />
      )}
      <ActionButton
        label={label}
        disabled={!request.ready || request.busy || request.remaining > 0}
        loading={request.busy}
        loadingLabel={t("common.loading")}
        onPress={() => void request.send(kind, email, redirectTo)}
        variant="primary"
      />
    </View>
  );
}
