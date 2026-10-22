import type { Session } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { initialAuthFlowState, reduceAuthFlow } from "./authFlow";

const session = { user: { id: "master-1" } } as Session;

describe("reduceAuthFlow", () => {
  it("keeps the initial sign-up entry point when no session exists", () => {
    expect(
      reduceAuthFlow(initialAuthFlowState, {
        error: false,
        session: null,
        type: "sessionRestored",
      }),
    ).toEqual(initialAuthFlowState);
  });

  it("opens sign-in after session restoration fails", () => {
    expect(
      reduceAuthFlow(initialAuthFlowState, {
        error: true,
        session: null,
        type: "sessionRestored",
      }),
    ).toEqual({
      authMode: "signIn",
      isPasswordRecovery: false,
      session: null,
      sessionRestoreFailed: true,
    });
  });

  it("keeps the user in sign-in after an explicit sign-out event", () => {
    const authenticated = reduceAuthFlow(initialAuthFlowState, {
      session,
      type: "authenticated",
    });

    expect(
      reduceAuthFlow(authenticated, {
        event: "SIGNED_OUT",
        session: null,
        type: "authStateChanged",
      }),
    ).toEqual({
      authMode: "signIn",
      isPasswordRecovery: false,
      session: null,
      sessionRestoreFailed: false,
    });
  });
});

describe("password recovery session gating", () => {
  it("keeps recovery active across session restoration and refresh", () => {
    const recovery = reduceAuthFlow(initialAuthFlowState, {
      type: "authStateChanged",
      event: "PASSWORD_RECOVERY",
      session,
    });
    expect(recovery.isPasswordRecovery).toBe(true);
    expect(
      reduceAuthFlow(recovery, {
        type: "sessionRestored",
        session,
        error: false,
      }).isPasswordRecovery,
    ).toBe(true);
    expect(
      reduceAuthFlow(recovery, {
        type: "authStateChanged",
        event: "TOKEN_REFRESHED",
        session,
      }).isPasswordRecovery,
    ).toBe(true);
    expect(
      reduceAuthFlow(recovery, { type: "recoveryCompleted" })
        .isPasswordRecovery,
    ).toBe(false);
    expect(
      reduceAuthFlow(recovery, { type: "signedOut" }).isPasswordRecovery,
    ).toBe(false);
  });
});

it("opens sign-in with a direct reset action after a rejected email link", () => {
  const failed = reduceAuthFlow(initialAuthFlowState, {
    type: "callbackRejected",
  });
  expect(
    reduceAuthFlow(failed, {
      type: "sessionRestored",
      error: false,
      session: null,
    }).authMode,
  ).toBe("signIn");
});
