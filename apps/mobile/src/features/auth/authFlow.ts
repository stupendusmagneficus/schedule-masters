import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import type { AuthMode } from "./authentication";

export type AuthFlowState = {
  readonly authMode: AuthMode;
  readonly isPasswordRecovery: boolean;
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
  | { readonly type: "signedOut" }
  | { readonly type: "recoveryCompleted" }
  | { readonly type: "callbackRejected" };

export const initialAuthFlowState: AuthFlowState = {
  authMode: "signUp",
  isPasswordRecovery: false,
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
        isPasswordRecovery: false,
        session: null,
        sessionRestoreFailed: true,
      };
    case "authStateChanged":
      return {
        ...state,
        isPasswordRecovery:
          action.session !== null &&
          (action.event === "PASSWORD_RECOVERY" ||
            (state.isPasswordRecovery &&
              state.session?.user.id === action.session.user.id)),
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
    case "callbackRejected":
      return { ...state, authMode: "signIn" };
    case "recoveryCompleted":
      return { ...state, isPasswordRecovery: false };
    case "signedOut":
      return {
        ...state,
        authMode: "signIn",
        isPasswordRecovery: false,
        session: null,
        sessionRestoreFailed: false,
      };
  }
}
