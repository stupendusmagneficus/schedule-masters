import Ionicons from "@expo/vector-icons/Ionicons";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import {
  Animated,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, radii, shadows } from "../theme/tokens";

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

const navigationPadding = 4;

export function BottomNavigation({
  activeTab,
  labels,
  onTabChange,
}: BottomNavigationProps) {
  const indicatorX = useRef(new Animated.Value(0)).current;
  const activeIndex = navigationItems.findIndex(
    (item) => item.id === activeTab,
  );
  const [itemWidth, setItemWidth] = useState(0);

  useEffect(() => {
    if (itemWidth === 0) {
      return;
    }

    Animated.spring(indicatorX, {
      damping: 18,
      mass: 0.7,
      stiffness: 220,
      toValue: activeIndex * itemWidth,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, indicatorX, itemWidth]);

  function handleLayout(event: LayoutChangeEvent) {
    const nextItemWidth =
      (event.nativeEvent.layout.width - navigationPadding * 2) /
      navigationItems.length;

    setItemWidth(nextItemWidth);
    indicatorX.setValue(activeIndex * nextItemWidth);
  }

  return (
    <View
      accessibilityRole="tablist"
      onLayout={handleLayout}
      style={styles.container}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activeIndicator,
          {
            transform: [{ translateX: indicatorX }],
            width: itemWidth,
          },
        ]}
      />
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
            <Ionicons color={color} name={item.icon} size={20} />
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
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    padding: navigationPadding,
    ...shadows.surface,
  },
  activeIndicator: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    bottom: 4,
    left: 4,
    position: "absolute",
    top: 4,
  },
  item: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 48,
    zIndex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
