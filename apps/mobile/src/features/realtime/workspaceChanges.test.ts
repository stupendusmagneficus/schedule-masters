import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  getWorkspaceDataResources,
  subscribeToWorkspaceDataChanges,
} from "./workspaceChanges";

describe("workspace realtime invalidation dependencies", () => {
  it("refreshes every appointment-derived view when visits change", () => {
    expect(getWorkspaceDataResources("appointments")).toEqual([
      "appointments",
      "bookingRequests",
      "calendar",
      "customerDirectory",
      "customerHistory",
      "finance",
      "freeSlots",
    ]);
    expect(
      getWorkspaceDataResources("appointments", {
        new: { source: "master_created" },
        old: null,
      }),
    ).not.toContain("bookingRequests");
    expect(
      getWorkspaceDataResources("appointments", {
        new: { source: "public_booking" },
        old: null,
      }),
    ).toContain("bookingRequests");
  });

  it("refreshes the calendar for every schedule mutation table", () => {
    for (const table of [
      "availability_breaks",
      "availability_date_overrides",
      "availability_exceptions",
      "availability_rules",
    ]) {
      expect(getWorkspaceDataResources(table)).toEqual([
        "calendar",
        "freeSlots",
      ]);
    }
  });

  it("keeps customer and service invalidation scoped to their consumers", () => {
    expect(getWorkspaceDataResources("customers")).toEqual([
      "customerDirectory",
      "customerHistory",
    ]);
    expect(getWorkspaceDataResources("services")).toEqual([
      "freeSlots",
      "services",
    ]);
    expect(getWorkspaceDataResources("unknown_table")).toEqual([]);
  });

  it("uses one workspace channel and relies on RLS for break rows", () => {
    const channel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
    const client = {
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn(),
    } as unknown as SupabaseClient<Database>;
    const onChange = vi.fn();

    const unsubscribe = subscribeToWorkspaceDataChanges(
      client,
      "workspace-a",
      onChange,
    );

    expect(client.channel).toHaveBeenCalledTimes(1);
    expect(client.channel).toHaveBeenCalledWith("workspace-data:workspace-a");
    expect(channel.on).toHaveBeenCalledTimes(7);
    const breakSubscription = channel.on.mock.calls.find(
      ([, config]) => config.table === "availability_breaks",
    );
    expect(breakSubscription?.[1]).not.toHaveProperty("filter");
    const customerSubscription = channel.on.mock.calls.find(
      ([, config]) => config.table === "customers",
    );
    expect(customerSubscription?.[1]).toMatchObject({
      filter: "workspace_id=eq.workspace-a",
    });

    unsubscribe();
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });
});
