import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {
  getIntlLocale,
  type MessageKey,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { type ComponentProps, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import {
  formatDateFieldValue,
  serializeDateFieldValue,
} from "../utils/dateFieldValue";
import { CalendarDatePickerSheet } from "./CalendarDatePickerSheet";

type DateTimePickerFieldProps = {
  readonly label: string;
  readonly locale: SupportedLocale;
  readonly mode: "date" | "time";
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly t: (key: MessageKey) => string;
  readonly value: string;
};

type WebPickerInputProps = ComponentProps<typeof TextInput> & {
  type: "date" | "time";
};

export function DateTimePickerField({
  label,
  locale,
  mode,
  onChange,
  placeholder,
  t,
  value,
}: DateTimePickerFieldProps) {
  const [isOpen, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseValue(value, "date"));
  const displayValue =
    mode === "date" ? formatDateFieldValue(value, locale) : value;

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setOpen(false);
    if (event.type === "dismissed" || !selectedDate) return;
    onChange(
      mode === "date"
        ? serializeDateFieldValue(selectedDate)
        : formatTime(selectedDate),
    );
  }

  if (Platform.OS === "web" && mode === "time") {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          {...({ type: mode } as WebPickerInputProps)}
          accessibilityLabel={label}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryText}
          style={styles.input}
          value={value}
        />
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityValue={{ text: displayValue }}
        onPress={() => {
          if (
            (Platform.OS === "ios" || Platform.OS === "web") &&
            mode === "date"
          ) {
            setDraftDate(parseValue(value, "date"));
          }
          setOpen(true);
        }}
        style={({ pressed }) => [styles.input, pressed && styles.pressed]}
      >
        <Text
          style={displayValue ? styles.value : styles.placeholder}
          numberOfLines={1}
        >
          {displayValue || placeholder}
        </Text>
        {mode === "date" ? (
          <MaterialCommunityIcons
            color={colors.secondaryText}
            name="calendar-month-outline"
            size={20}
          />
        ) : null}
      </Pressable>
      {isOpen &&
      (Platform.OS === "ios" || Platform.OS === "web") &&
      mode === "date" ? (
        <CalendarDatePickerSheet
          initialDate={draftDate}
          locale={locale}
          onCancel={() => setOpen(false)}
          onConfirm={(date) => {
            onChange(serializeDateFieldValue(date));
            setOpen(false);
          }}
          t={t}
        />
      ) : null}
      {isOpen &&
      !((Platform.OS === "ios" || Platform.OS === "web") && mode === "date") ? (
        <DateTimePicker
          display={
            mode === "date"
              ? "default"
              : Platform.OS === "ios"
                ? "spinner"
                : "default"
          }
          locale={getIntlLocale(locale)}
          mode={mode}
          onChange={handleChange}
          value={parseValue(value, mode)}
        />
      ) : null}
    </View>
  );
}

function parseValue(value: string, mode: "date" | "time") {
  if (mode === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
  }

  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(
    Number.isFinite(hours) ? hours : 12,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );
  return date;
}

function formatTime(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  input: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 48,
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  pressed: { backgroundColor: colors.subtleSurface },
  label: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: "600",
  },
  placeholder: { ...typography.body, color: colors.secondaryText },
  value: { ...typography.body, color: colors.primaryText },
});
