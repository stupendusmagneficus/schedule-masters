import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type BrowserStorage = {
  readonly localStorage: {
    getItem: (key: string) => string | null;
    removeItem: (key: string) => void;
    setItem: (key: string, value: string) => void;
  };
};

function getBrowserStorage() {
  const runtime = globalThis as typeof globalThis & {
    window?: BrowserStorage;
  };
  return runtime.window?.localStorage;
}

const browserStorage = {
  getItem: (key: string) => {
    return getBrowserStorage()?.getItem(key) ?? null;
  },
  removeItem: (key: string) => {
    getBrowserStorage()?.removeItem(key);
  },
  setItem: (key: string, value: string) => {
    getBrowserStorage()?.setItem(key, value);
  },
};

const nativeStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
};

export const platformStorage =
  Platform.OS === "web" ? browserStorage : nativeStorage;
