import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

export function ActionFeedback({
  message,
  onDismiss,
}: {
  readonly message: string | null;
  readonly onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={styles.toast}
    >
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  message: { ...typography.label, color: colors.actionText, fontWeight: "700" },
  toast: {
    alignSelf: "center",
    backgroundColor: colors.action,
    borderRadius: radii.control,
    elevation: 4,
    maxWidth: 520,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: colors.action,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    position: "absolute",
    top: 10,
    zIndex: 10,
  },
});
