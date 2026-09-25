import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import type { AuthMode } from "./authentication";

export type AuthFlowState = {
  readonly authMode: AuthMode;
  readonly session: Session | null;
  readonly sessionRestoreFailed: boolean;
};

export type AuthFlowAction =
  | {
      readonly error: boolean;
      readonly session: Session | null;
      readonly type: "sessionRestored";
    }
  | { readonly type: "sessionRestoreFailed" }
  | {
      readonly event: AuthChangeEvent;
      readonly session: Session | null;
      readonly type: "authStateChanged";
    }
  | { readonly session: Session; readonly type: "authenticated" }
  | { readonly type: "signedOut" };

export const initialAuthFlowState: AuthFlowState = {
  authMode: "signUp",
  session: null,
  sessionRestoreFailed: false,
};

export function reduceAuthFlow(
  state: AuthFlowState,
  action: AuthFlowAction,
): AuthFlowState {
  switch (action.type) {
    case "sessionRestored":
      return {
        ...state,
        session: action.session,
        sessionRestoreFailed: action.error,
        ...(action.error ? { authMode: "signIn" as const } : {}),
      };
    case "sessionRestoreFailed":
      return {
        ...state,
        authMode: "signIn",
        session: null,
        sessionRestoreFailed: true,
      };
    case "authStateChanged":
      return {
        ...state,
        session: action.session,
        sessionRestoreFailed: false,
        ...(action.event === "SIGNED_OUT"
          ? { authMode: "signIn" as const }
          : {}),
      };
    case "authenticated":
      return {
        ...state,
        session: action.session,
        sessionRestoreFailed: false,
      };
    case "signedOut":
      return {
        ...state,
        authMode: "signIn",
        session: null,
        sessionRestoreFailed: false,
      };
  }
}
