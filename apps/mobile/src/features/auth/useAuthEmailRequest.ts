import type { MessageKey } from "@schedule-app/i18n";
import { masterEmailSchema } from "@schedule-app/validation";
import { useEffect, useRef, useState } from "react";
import { platformStorage } from "../../lib/platformStorage";
import {
  type AuthEmailKind,
  type AuthRecoveryClient,
  requestAuthEmail,
} from "./authRecovery";
import {
  authEmailCooldownMs,
  authEmailDeadlineKey,
  cooldownSeconds,
  readEmailDeadline,
} from "./authRecoveryStorage";

export function useAuthEmailRequest(client: AuthRecoveryClient) {
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<MessageKey | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    void readEmailDeadline(platformStorage, Date.now())
      .then((value) => {
        if (active) setDeadline(value);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function send(kind: AuthEmailKind, email: string, redirect: string) {
    if (!ready || inFlight.current || cooldownSeconds(deadline, Date.now()))
      return;
    if (!masterEmailSchema.safeParse(email).success) {
      setMessage("auth.emailInvalid");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const stored = await readEmailDeadline(platformStorage, Date.now());
      if (stored > Date.now()) {
        setDeadline(stored);
        return;
      }
      const until = Date.now() + authEmailCooldownMs;
      setDeadline(until);
      setNow(Date.now());
      await platformStorage.setItem(authEmailDeadlineKey, String(until));
      const result = await requestAuthEmail(client, kind, email, redirect);
      setMessage(
        result === "sent"
          ? "auth.emailRequestSent"
          : result === "invalidEmail"
            ? "auth.emailInvalid"
            : "auth.networkError",
      );
    } catch {
      setMessage("auth.networkError");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    remaining: cooldownSeconds(deadline, now),
    ready,
    message,
    send,
  };
}
