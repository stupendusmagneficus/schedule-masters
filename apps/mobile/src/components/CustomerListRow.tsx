import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {
  formatCompactDate,
  type MessageKey,
  type SupportedLocale,
} from "@schedule-app/i18n";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { buildCustomerPhoneUrl } from "../features/customers/customerContact";
import type { CustomerProfile } from "../features/customers/customerDirectory";
import {
  getCustomerContactLine,
  getCustomerInitials,
} from "../features/customers/customerListItem";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

type CustomerListRowProps = {
  readonly customer: CustomerProfile;
  readonly locale: SupportedLocale;
  readonly onOpen: () => void;
  readonly separated: boolean;
  readonly t: (key: MessageKey) => string;
  readonly timeZone: string;
};

const AVATAR_SIZE = 40;

export function CustomerListRow({
  customer,
  locale,
  onOpen,
  separated,
  t,
  timeZone,
}: CustomerListRowProps) {
  const contact = getCustomerContactLine(customer);
  const contactText =
    contact.kind === "none" ? t("mobile.customerNoContact") : contact.value;
  const callUrl =
    contact.kind === "phone"
      ? buildCustomerPhoneUrl(contact.value, "call")
      : null;
  const visitText = customer.last_completed_visit_at
    ? t("mobile.customerLastVisit").replace(
        "{date}",
        formatCompactDate(new Date(customer.last_completed_visit_at), locale, {
          timeZone,
        }),
      )
    : t("mobile.customerNoVisitsYet");

  return (
    <View style={[styles.row, separated && styles.separated]}>
      <Pressable
        accessibilityHint={t("mobile.openCustomerDetails")}
        accessibilityLabel={`${customer.name}, ${contactText}, ${visitText}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getCustomerInitials(customer.name)}
          </Text>
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {customer.name}
          </Text>
          <View style={styles.contactLine}>
            <MaterialCommunityIcons
              color={colors.secondaryText}
              name={
                contact.kind === "phone"
                  ? "phone-outline"
                  : contact.kind === "email"
                    ? "email-outline"
                    : "account-off-outline"
              }
              size={14}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.secondary,
                contact.kind === "none" && styles.missing,
              ]}
            >
              {contactText}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.meta}>
            {visitText}
          </Text>
        </View>
        {callUrl ? null : (
          <MaterialCommunityIcons
            color={colors.secondaryText}
            name="chevron-right"
            size={22}
          />
        )}
      </Pressable>
      {callUrl ? (
        <Pressable
          accessibilityLabel={`${t("mobile.customerCall")}: ${contactText}`}
          accessibilityRole="button"
          onPress={() =>
            void Linking.openURL(callUrl).catch(() =>
              Alert.alert(t("mobile.customerContactActionFailed")),
            )
          }
          style={({ pressed }) => [styles.call, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons
            color={colors.accent}
            name="phone-outline"
            size={22}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: AVATAR_SIZE / 2,
    height: AVATAR_SIZE,
    justifyContent: "center",
    width: AVATAR_SIZE,
  },
  avatarText: { ...typography.label, color: colors.accent, fontWeight: "700" },
  call: {
    alignItems: "center",
    borderRadius: radii.control,
    justifyContent: "center",
    marginRight: 4,
    minHeight: 44,
    minWidth: 44,
  },
  contactLine: { alignItems: "center", flexDirection: "row", gap: 4 },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  main: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 10,
  },
  meta: { ...typography.caption, color: colors.secondaryText },
  missing: { fontStyle: "italic" },
  name: {
    ...typography.body,
    color: colors.primaryText,
    fontWeight: "600",
  },
  pressed: { opacity: 0.7 },
  row: { alignItems: "center", flexDirection: "row" },
  secondary: {
    ...typography.metadata,
    color: colors.secondaryText,
    flexShrink: 1,
  },
  separated: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
