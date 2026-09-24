import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/tokens";

export type MobileTab = "calendar" | "profile" | "today";

type NavigationLabels = Record<MobileTab, string>;

type BottomNavigationProps = {
  readonly activeTab: MobileTab;
  readonly labels: NavigationLabels;
  readonly onTabChange: (tab: MobileTab) => void;
};

type NavigationItem = {
  readonly icon: ComponentProps<typeof Ionicons>["name"];
  readonly id: MobileTab;
};

const navigationItems: readonly NavigationItem[] = [
  { icon: "today-outline", id: "today" },
  { icon: "calendar-outline", id: "calendar" },
  { icon: "person-circle-outline", id: "profile" },
];

export function BottomNavigation({
  activeTab,
  labels,
  onTabChange,
}: BottomNavigationProps) {
  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {navigationItems.map((item) => {
        const isActive = item.id === activeTab;
        const color = isActive ? colors.accent : colors.secondaryText;
        return (
          <Pressable
            accessibilityLabel={labels[item.id]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={item.id}
            onPress={() => onTabChange(item.id)}
            style={styles.item}
          >
            <Ionicons color={color} name={item.icon} size={22} />
            <Text style={[styles.label, { color }]}>{labels[item.id]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    paddingBottom: 10,
    paddingTop: 8,
  },
  item: {
    alignItems: "center",
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 48,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
});
