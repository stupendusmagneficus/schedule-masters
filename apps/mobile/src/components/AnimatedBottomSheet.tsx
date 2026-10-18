import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii } from "../theme/tokens";

type AnimatedBottomSheetProps = {
  readonly children: ReactNode;
  readonly onClose: () => void;
  readonly showHandle?: boolean;
  readonly sheetStyle?: StyleProp<ViewStyle>;
  readonly visible: boolean;
};

export function AnimatedBottomSheet({
  children,
  onClose,
  showHandle = true,
  sheetStyle,
  visible,
}: AnimatedBottomSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const [reduceMotion, setReduceMotion] = useState(false);
  const reduceMotionRef = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);

  useEffect(() => {
    let frame: number | undefined;
    progress.stopAnimation();
    backdropOpacity.stopAnimation();
    if (visible) {
      setMounted(true);
      frame = requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: reduceMotionRef.current ? 0 : 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(progress, {
            toValue: 1,
            duration: reduceMotionRef.current ? 0 : 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: Platform.OS !== "web",
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: reduceMotionRef.current ? 0 : 140,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: reduceMotionRef.current ? 0 : 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }

    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [backdropOpacity, progress, visible]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 0],
  });

  return (
    <Modal
      accessibilityViewIsModal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={mounted}
    >
      <View style={styles.overlay}>
        <Animated.View
          pointerEvents={visible ? "auto" : "none"}
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable
            accessibilityElementsHidden
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          style={[styles.animatedSheet, { transform: [{ translateY }] }]}
        >
          <SafeAreaView edges={["bottom"]} style={[styles.sheet, sheetStyle]}>
            {showHandle ? (
              <View accessibilityElementsHidden style={styles.handleArea}>
                <View style={styles.handle} />
              </View>
            ) : null}
            {children}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  animatedSheet: { alignSelf: "center", maxWidth: 720, width: "100%" },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  handle: {
    backgroundColor: colors.border,
    borderRadius: radii.control,
    height: 4,
    width: 32,
  },
  handleArea: { alignItems: "center", height: 20, justifyContent: "center" },
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.surface,
    borderTopRightRadius: radii.surface,
    maxHeight: "92%",
    overflow: "hidden",
  },
});
