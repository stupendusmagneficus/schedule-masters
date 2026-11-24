import type { Database } from "@schedule-app/api";
import type { MessageKey } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { deleteMyAccount } from "../features/account/deleteAccount";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";
import { InfoCard } from "./InfoCard";

type DeleteAccountCardProps = {
  readonly client: SupabaseClient<Database>;
  readonly t: (key: MessageKey) => string;
};

export function DeleteAccountCard({ client, t }: DeleteAccountCardProps) {
  const [isConfirming, setConfirming] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  const [hasFailed, setFailed] = useState(false);

  async function confirmDeletion() {
    setDeleting(true);
    setFailed(false);
    try {
      // On success the auth listener returns the app to the sign-in screen.
      await deleteMyAccount(client);
    } catch {
      setFailed(true);
      setDeleting(false);
    }
  }

  return (
    <InfoCard>
      <Text style={styles.sectionTitle}>{t("mobile.deleteAccount")}</Text>
      <Text style={styles.helper}>{t("mobile.deleteAccountDescription")}</Text>
      {isConfirming ? (
        <View accessibilityRole="alert" style={styles.confirmation}>
          <Text style={styles.confirmationText}>
            {t("mobile.deleteAccountConfirmDescription")}
          </Text>
          <ActionButton
            disabled={isDeleting}
            label={t("common.cancel")}
            onPress={() => setConfirming(false)}
            variant="secondary"
          />
          <ActionButton
            disabled={isDeleting}
            label={t("mobile.deleteAccountConfirm")}
            loading={isDeleting}
            loadingLabel={t("common.loading")}
            onPress={() => void confirmDeletion()}
            variant="destructiveConfirm"
          />
        </View>
      ) : (
        <ActionButton
          label={t("mobile.deleteAccount")}
          onPress={() => setConfirming(true)}
          size="compact"
          style={styles.action}
          variant="destructive"
        />
      )}
      {hasFailed ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t("mobile.deleteAccountFailed")}
        </Text>
      ) : null}
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  action: { alignSelf: "flex-start", marginTop: 8 },
  confirmation: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.surface,
    gap: 8,
    marginTop: 12,
    padding: 12,
  },
  confirmationText: { ...typography.caption, color: colors.danger },
  error: { ...typography.caption, color: colors.danger, marginTop: 8 },
  helper: { ...typography.caption, color: colors.secondaryText },
  sectionTitle: { ...typography.section, color: colors.primaryText },
});
