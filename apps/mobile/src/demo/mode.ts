import { Platform } from "react-native";

declare const process: {
  readonly env: { readonly EXPO_PUBLIC_DEMO_MODE?: string };
};

declare const window: {
  readonly location: { readonly search: string };
};

export function isDemoMode(): boolean {
  if (process.env.EXPO_PUBLIC_DEMO_MODE === "true") {
    return true;
  }

  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    /(?:^|[?&])demo=1(?:&|$)/.test(window.location.search)
  );
}
