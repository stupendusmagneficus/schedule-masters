import { StyleSheet, Text, View } from "react-native";
import type { AuthNotice } from "../features/auth/authNotice";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

export function AuthFeedback({ notice }: { readonly notice: AuthNotice }) {
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor:
            notice.tone === "error" ? colors.dangerSoft : colors.accentSoft,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color:
              notice.tone === "error" ? colors.danger : colors.accentPressed,
          },
        ]}
      >
        {notice.message}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { borderRadius: radii.surface, padding: 12 },
  text: { ...typography.metadata },
});
