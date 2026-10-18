import * as Sharing from "expo-sharing";
import { captureRef, type ViewShotRef } from "react-native-view-shot";

export type ShareFreeSlotsImageResult = "opened" | "downloaded" | "cancelled";

export function captureFreeSlotsCard(view: ViewShotRef) {
  return captureRef(view, {
    fileName: "free-appointments.png",
    format: "png",
    quality: 1,
  });
}

export async function shareFreeSlotsImage(
  imageUri: string,
  _bookingUrl: string,
  title: string,
): Promise<ShareFreeSlotsImageResult> {
  await Sharing.shareAsync(imageUri, {
    UTI: "public.png",
    dialogTitle: title,
    mimeType: "image/png",
  });
  return "opened" as const;
}
