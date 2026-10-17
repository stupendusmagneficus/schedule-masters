import {
  localeLabels,
  type SupportedLocale,
  supportedLocales,
} from "@schedule-app/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

type LocalePickerProps = {
  readonly locale: SupportedLocale;
  readonly onLocaleChange: (locale: SupportedLocale) => void;
};

export function LocalePicker({ locale, onLocaleChange }: LocalePickerProps) {
  return (
    <View accessibilityRole="radiogroup" style={styles.container}>
      {supportedLocales.map((item) => {
        const isSelected = item === locale;
        return (
          <Pressable
            accessibilityLabel={localeLabels[item]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            key={item}
            onPress={() => onLocaleChange(item)}
            style={[styles.button, isSelected && styles.selectedButton]}
          >
            <Text style={[styles.text, isSelected && styles.selectedText]}>
              {localeLabels[item]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 8,
  },
  container: {
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedButton: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  selectedText: { color: colors.accent },
  text: {
    color: colors.secondaryText,
    ...typography.label,
    fontWeight: "700",
  },
});
