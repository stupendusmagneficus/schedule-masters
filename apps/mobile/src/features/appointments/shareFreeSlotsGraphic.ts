import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import { Platform, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

type BrowserFile = { readonly name: string; readonly type: string };
type BrowserSharePayload = {
  readonly files: readonly BrowserFile[];
  readonly title: string;
};

type BrowserEnvironment = {
  readonly File?: new (
    parts: readonly unknown[],
    filename: string,
    options: { readonly type: string },
  ) => BrowserFile;
  readonly document?: {
    createElement: (tag: "a") => {
      download: string;
      href: string;
      click: () => void;
    };
  };
  readonly navigator?: {
    canShare?: (data: BrowserSharePayload) => boolean;
    share?: (data: BrowserSharePayload) => Promise<void>;
  };
};

export async function shareFreeSlotsGraphic(
  viewRef: RefObject<View | null>,
  title: string,
): Promise<"shared" | "downloaded"> {
  if (!viewRef.current) throw new Error("The availability card is not ready.");

  const imageUri = await captureRef(viewRef, {
    format: "png",
    quality: 1,
    result: Platform.OS === "web" ? "data-uri" : "tmpfile",
  });

  if (Platform.OS === "web") {
    const browser = globalThis as unknown as BrowserEnvironment;
    const browserNavigator = browser.navigator;
    if (browserNavigator?.share && browser.File) {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const file = new browser.File(
        [blob],
        "schedule-masters-availability.png",
        {
          type: "image/png",
        },
      );
      if (browserNavigator.canShare?.({ files: [file], title })) {
        await browserNavigator.share({ files: [file], title });
        return "shared";
      }
    }

    if (!browser.document) throw new Error("Image download is not available.");
    const link = browser.document.createElement("a");
    link.download = "schedule-masters-availability.png";
    link.href = imageUri;
    link.click();
    return "downloaded";
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Image sharing is not available on this device.");
  }

  await Sharing.shareAsync(imageUri, {
    dialogTitle: title,
    mimeType: "image/png",
    UTI: "public.png",
  });
  return "shared";
}
