import { captureRef, type ViewShotRef } from "react-native-view-shot";
import type { ShareFreeSlotsImageResult } from "./shareFreeSlotsImage";

type ShareFile = { readonly name: string; readonly type: string };

type BrowserApi = {
  readonly Blob: new (
    parts: readonly unknown[],
    options: { readonly type: string },
  ) => unknown;
  readonly File: new (
    parts: readonly unknown[],
    name: string,
    options: { readonly type: string },
  ) => ShareFile;
  readonly URL: {
    createObjectURL: (blob: unknown) => string;
    revokeObjectURL: (url: string) => void;
  };
  readonly Uint8Array: new (values: readonly number[]) => unknown;
  readonly atob: (encoded: string) => string;
  readonly document: {
    createElement: (tag: "a") => {
      click: () => void;
      download: string;
      href: string;
    };
  };
  readonly navigator: {
    canShare?: (data: { readonly files: readonly ShareFile[] }) => boolean;
    share?: (data: {
      readonly files: readonly ShareFile[];
      readonly text: string;
      readonly title: string;
    }) => Promise<void>;
  };
  readonly setTimeout: (callback: () => void, delay: number) => unknown;
};

export async function shareFreeSlotsImage(
  imageUri: string,
  bookingUrl: string,
  title: string,
): Promise<ShareFreeSlotsImageResult> {
  const browser = globalThis as unknown as BrowserApi;
  const imageFile = createImageFile(imageUri, browser);

  if (
    browser.navigator.share &&
    browser.navigator.canShare?.({ files: [imageFile] })
  ) {
    const shareResult = browser.navigator.share({
      files: [imageFile],
      text: bookingUrl,
      title,
    });
    try {
      await shareResult;
      return "opened" as const;
    } catch (error) {
      if (getErrorName(error) === "AbortError") return "cancelled" as const;
    }
  }

  const downloadUrl = browser.URL.createObjectURL(imageFile);
  const downloadLink = browser.document.createElement("a");
  downloadLink.download = "free-appointments.png";
  downloadLink.href = downloadUrl;
  downloadLink.click();
  browser.setTimeout(() => browser.URL.revokeObjectURL(downloadUrl), 1000);
  return "downloaded" as const;
}

export function captureFreeSlotsCard(view: ViewShotRef) {
  return captureRef(view, {
    format: "png",
    quality: 1,
    result: "data-uri",
  });
}

function createImageFile(imageUri: string, browser: BrowserApi) {
  const [, encodedImage = ""] = imageUri.split(",", 2);
  const imageBytes = browser.atob(encodedImage);
  const bytes = new browser.Uint8Array(
    Array.from(imageBytes, (character) => character.charCodeAt(0)),
  );
  const imageBlob = new browser.Blob([bytes], { type: "image/png" });
  return new browser.File([imageBlob], "free-appointments.png", {
    type: "image/png",
  });
}

function getErrorName(error: unknown) {
  return typeof error === "object" && error !== null && "name" in error
    ? error.name
    : undefined;
}
