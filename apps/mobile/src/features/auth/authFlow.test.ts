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
      session: null,
      sessionRestoreFailed: false,
    });
  });
});
