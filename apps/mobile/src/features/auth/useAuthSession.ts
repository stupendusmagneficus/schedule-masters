import type { SupabaseDatabaseClient } from "@schedule-app/api";
import { useEffect, useReducer, useState } from "react";
import { AppState, Linking, Platform } from "react-native";

import { platformStorage } from "../../lib/platformStorage";
import { initialAuthFlowState, reduceAuthFlow } from "./authFlow";
import { manageAuthRefresh } from "./authLifecycle";
import { recoveryUserStorageKey } from "./authRecoveryStorage";
import { cleanWebCallbackUrl, completeAuthCallback } from "./authRedirect";

export function useAuthSession(
  client: SupabaseDatabaseClient | null,
  disabled: boolean,
  redirectTo: string,
) {
  const [state, dispatch] = useReducer(reduceAuthFlow, initialAuthFlowState);
  const [restoring, setRestoring] = useState(Boolean(client));
  const [callbackFailed, setCallbackFailed] = useState(false);

  useEffect(() => {
    if (disabled || !client || Platform.OS === "web") return;
    return manageAuthRefresh(client.auth, AppState);
  }, [client, disabled]);

  useEffect(() => {
    if (disabled || !client) return;
    const authClient = client;
    let active = true;
    const handledUrls = new Map<string, Promise<void>>();
    let pendingUrls = 0;
    let initialRestore = true;
    // Auth listeners must not await another Auth method (SDK lock). Only queue
    // storage work here; callback/session restoration waits for that work later.
    let markerWrites: Promise<unknown> = Promise.resolve();
    const { data: subscription } = client.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;
        if (event === "PASSWORD_RECOVERY" && session) {
          markerWrites = markerWrites.then(() =>
            platformStorage.setItem(recoveryUserStorageKey, session.user.id),
          );
        } else if (event === "SIGNED_OUT") {
          markerWrites = markerWrites.then(() =>
            platformStorage.removeItem(recoveryUserStorageKey),
          );
        }
        void markerWrites.catch(() => {
          if (active) setCallbackFailed(true);
        });
        dispatch({ type: "authStateChanged", event, session });
      },
    );

    function handleUrl(url: string): Promise<void> {
      const previous = handledUrls.get(url);
      if (previous) return previous;
      if (handledUrls.size >= 16)
        handledUrls.delete(handledUrls.keys().next().value as string);
      pendingUrls++;
      setRestoring(true);
      const work = exchangeUrl(url).finally(() => {
        pendingUrls--;
        if (active && !initialRestore && pendingUrls === 0) setRestoring(false);
      });
      handledUrls.set(url, work);
      return work;
    }
    async function exchangeUrl(url: string) {
      const result = await completeAuthCallback(authClient, url, redirectTo);
      if (!active || result === "ignored") return;
      setCallbackFailed(result === "failed");
      if (result === "failed") dispatch({ type: "callbackRejected" });
      if (result === "completed" || result === "recovery") {
        const { data, error } = await authClient.auth.getSession();
        if (error || !data.session) throw new Error("Auth session unavailable");
        await markerWrites;
        if (!active) return;
        dispatch({
          type: "authStateChanged",
          event: result === "recovery" ? "PASSWORD_RECOVERY" : "SIGNED_IN",
          session: data.session,
        });
      }
      if (Platform.OS === "web") cleanWebCallbackUrl(url, redirectTo);
    }
    const link = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url).catch(() => {
        if (active) setCallbackFailed(true);
      });
    });
    async function restore() {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) await handleUrl(initialUrl);
        const { data, error } = await authClient.auth.getSession();
        await markerWrites;
        const recoveryUser = await platformStorage.getItem(
          recoveryUserStorageKey,
        );
        if (!active) return;
        if (data.session && recoveryUser === data.session.user.id) {
          dispatch({
            type: "authStateChanged",
            event: "PASSWORD_RECOVERY",
            session: data.session,
          });
        }
        dispatch({
          type: "sessionRestored",
          error: Boolean(error),
          session: data.session,
        });
      } catch {
        if (active) dispatch({ type: "sessionRestoreFailed" });
      } finally {
        initialRestore = false;
        if (active && pendingUrls === 0) setRestoring(false);
      }
    }
    void restore();
    return () => {
      active = false;
      link.remove();
      subscription.subscription.unsubscribe();
    };
  }, [client, disabled, redirectTo]);

  async function finishRecovery() {
    await platformStorage.removeItem(recoveryUserStorageKey);
    dispatch({ type: "recoveryCompleted" });
  }

  return { state, dispatch, restoring, callbackFailed, finishRecovery };
}
