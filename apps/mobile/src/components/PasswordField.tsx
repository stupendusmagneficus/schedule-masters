import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { MessageKey } from "@schedule-app/i18n";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

type Props = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onBlur?: () => void;
  readonly label: string;
  readonly error?: string;
  readonly newPassword: boolean;
  readonly t: (key: MessageKey) => string;
};
export function PasswordField({
  value,
  onChange,
  onBlur,
  label,
  error,
  newPassword,
  t,
}: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label} <Text style={styles.error}>*</Text>
      </Text>
      <View style={[styles.control, error && styles.invalid]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={newPassword ? "new-password" : "current-password"}
          textContentType={newPassword ? "newPassword" : "password"}
          onBlur={onBlur}
          onChangeText={onChange}
          placeholder={label}
          secureTextEntry={!visible}
          style={styles.input}
          value={value}
        />
        <Pressable
          accessibilityLabel={t(
            visible ? "auth.hidePassword" : "auth.showPassword",
          )}
          accessibilityRole="button"
          accessibilityState={{ selected: visible }}
          onPress={() => setVisible(!visible)}
          style={styles.visibility}
        >
          <MaterialCommunityIcons
            color={colors.secondaryText}
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={22}
          />
        </Pressable>
      </View>
      <Text style={styles.hint}>{t("auth.passwordHint")}</Text>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { ...typography.label, color: colors.primaryText },
  control: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: typography.body.fontSize,
    minHeight: 48,
    paddingHorizontal: 12,
    textAlignVertical: "center",
  },
  visibility: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  invalid: { borderColor: colors.danger },
  error: { ...typography.caption, color: colors.danger },
  hint: { ...typography.caption, color: colors.secondaryText },
});
