// Svix raw-body HMAC contract; WebCrypto verify performs constant-time comparison.
export async function verifySignature(
  body: string,
  headers: Headers,
  secret: string,
  now: number,
): Promise<boolean> {
  try {
    const id = headers.get("svix-id") ?? "";
    const timestamp = headers.get("svix-timestamp") ?? "";
    const signatures = headers.get("svix-signature") ?? "";
    if (
      !/^[A-Za-z0-9_-]{1,200}$/.test(id) ||
      !/^\d{1,12}$/.test(timestamp) ||
      Math.abs(now - Number(timestamp)) > 300 ||
      signatures.length > 4096 ||
      !secret.startsWith("whsec_")
    )
      return false;
    const bytes = Uint8Array.from(atob(secret.slice(6)), (c) =>
      c.charCodeAt(0),
    );
    if (bytes.length < 16) return false;
    const key = await crypto.subtle.importKey(
      "raw",
      bytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signed = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
    for (const item of signatures.split(" ")) {
      const [version, encoded] = item.split(",");
      if (version !== "v1" || !encoded) continue;
      try {
        const signature = Uint8Array.from(atob(encoded), (c) =>
          c.charCodeAt(0),
        );
        if (await crypto.subtle.verify("HMAC", key, signature, signed))
          return true;
      } catch {
        /* Invalid candidates do not prevent key-rotation alternatives. */
      }
    }
    return false;
  } catch {
    return false;
  }
}
