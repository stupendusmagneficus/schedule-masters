import type { ViewShotRef } from "react-native-view-shot";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureFreeSlotsCard,
  shareFreeSlotsImage,
} from "./shareFreeSlotsImage.web";

const { captureRef } = vi.hoisted(() => ({ captureRef: vi.fn() }));
vi.mock("react-native-view-shot", () => ({ captureRef }));

describe("shareFreeSlotsImage on web", () => {
  const share = vi.fn();
  const click = vi.fn();
  const revokeObjectURL = vi.fn();
  const setTimeoutMock = vi.fn((callback: () => void) => callback());

  beforeEach(() => {
    captureRef.mockResolvedValue("data:image/png;base64,aW1hZ2U=");
    share.mockResolvedValue(undefined);
    vi.stubGlobal("atob", () => "image");
    vi.stubGlobal("navigator", {
      canShare: () => true,
      share,
    });
    vi.stubGlobal("document", {
      createElement: () => ({ click, download: "", href: "" }),
    });
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:free-slots",
      revokeObjectURL,
    });
    vi.stubGlobal("setTimeout", setTimeoutMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shares a PNG card with the booking link when file sharing is supported", async () => {
    const imageUri = await captureFreeSlotsCard({} as ViewShotRef);
    const result = await shareFreeSlotsImage(
      imageUri,
      "https://book.example/?slug=studio",
      "Free slots",
    );

    expect(captureRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ format: "png", result: "data-uri" }),
    );
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "https://book.example/?slug=studio",
        title: "Free slots",
      }),
    );
    const sharedFile = share.mock.calls[0][0].files[0] as File;
    expect(sharedFile.name).toBe("free-appointments.png");
    expect(sharedFile.type).toBe("image/png");
    expect(result).toBe("opened");
  });

  it("downloads the PNG when file sharing is unavailable", async () => {
    vi.stubGlobal("navigator", { canShare: () => false, share });

    const imageUri = await captureFreeSlotsCard({} as ViewShotRef);
    const result = await shareFreeSlotsImage(
      imageUri,
      "https://book.example/?slug=studio",
      "Free slots",
    );

    expect(share).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:free-slots");
    expect(result).toBe("downloaded");
  });
});
