import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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

type DateTimePickerFieldProps = {
  readonly label: string;
  readonly mode: "date" | "time";
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly value: string;
};

type WebPickerInputProps = ComponentProps<typeof TextInput> & {
  type: "date" | "time";
};

export function DateTimePickerField({
  label,
  mode,
  onChange,
  placeholder,
  value,
}: DateTimePickerFieldProps) {
  const [isOpen, setOpen] = useState(false);

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setOpen(false);
    if (event.type === "dismissed" || !selectedDate) return;
    onChange(
      mode === "date" ? formatDate(selectedDate) : formatTime(selectedDate),
    );
  }

  if (Platform.OS === "web") {
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
        onPress={() => setOpen(true)}
        style={styles.input}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value || placeholder}
        </Text>
      </Pressable>
      {isOpen ? (
        <DateTimePicker
          display="spinner"
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

function formatDate(value: Date) {
  return [value.getFullYear(), value.getMonth() + 1, value.getDate()]
    .map((part, index) =>
      index === 0 ? String(part) : String(part).padStart(2, "0"),
    )
    .join("-");
}

function formatTime(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  input: {
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  label: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: "600",
  },
  placeholder: { ...typography.body, color: colors.secondaryText },
  value: { ...typography.body, color: colors.primaryText },
});
