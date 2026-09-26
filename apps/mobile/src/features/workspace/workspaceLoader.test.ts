import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { loadMasterWorkspace } from "./workspaceLoader";

type QueryResult = { readonly data: unknown; readonly error: unknown };

function createQuery(result: QueryResult) {
  const query = {
    eq: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(),
    is: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are thenable in production.
    then: (onFulfilled: (value: QueryResult) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue(result);
  query.single.mockResolvedValue(result);
  return query;
}

function createClient({
  member,
  services,
  workspace,
}: {
  readonly member: QueryResult;
  readonly services: QueryResult;
  readonly workspace: QueryResult;
}) {
  const queries = {
    services: createQuery(services),
    workspace_members: createQuery(member),
    workspaces: createQuery(workspace),
  };
  const client = {
    from: vi.fn((table: keyof typeof queries) => queries[table]),
  };

  return client as unknown as SupabaseClient<Database>;
}

describe("loadMasterWorkspace", () => {
  const userId = "user-1";
  const workspace = {
    id: "workspace-1",
    name: "Anna Nails",
    slug: "anna-nails",
    timezone: "Europe/Prague",
  };
  const service = {
    archived_at: null,
    buffer_after_minutes: 0,
    buffer_before_minutes: 0,
    description: null,
    duration_minutes: 60,
    id: "service-1",
    is_active: true,
    name: "Manicure",
    price_amount: 700,
    sort_order: 0,
    currency: "CZK",
  };

  it("requires setup only after a successful empty membership lookup", async () => {
    const client = createClient({
      member: { data: null, error: null },
      services: { data: [], error: null },
      workspace: { data: null, error: null },
    });

    await expect(loadMasterWorkspace(client, userId)).resolves.toEqual({
      kind: "setupRequired",
    });
  });

  it("keeps an existing master out of setup when membership loading fails", async () => {
    const client = createClient({
      member: { data: null, error: { message: "Network failed" } },
      services: { data: [], error: null },
      workspace: { data: null, error: null },
    });

    await expect(loadMasterWorkspace(client, userId)).resolves.toEqual({
      kind: "error",
    });
  });

  it("does not return a partial workspace when a dependent query fails", async () => {
    const client = createClient({
      member: {
        data: { role: "owner", workspace_id: workspace.id },
        error: null,
      },
      services: { data: [], error: { message: "Network failed" } },
      workspace: { data: workspace, error: null },
    });

    await expect(loadMasterWorkspace(client, userId)).resolves.toEqual({
      kind: "error",
    });
  });

  it("does not return setup when the workspace query fails", async () => {
    const client = createClient({
      member: {
        data: { role: "owner", workspace_id: workspace.id },
        error: null,
      },
      services: { data: [], error: null },
      workspace: { data: null, error: { message: "Network failed" } },
    });

    await expect(loadMasterWorkspace(client, userId)).resolves.toEqual({
      kind: "error",
    });
  });

  it("returns the complete workspace data for the active member", async () => {
    const client = createClient({
      member: {
        data: { role: "owner", workspace_id: workspace.id },
        error: null,
      },
      services: { data: [service], error: null },
      workspace: { data: workspace, error: null },
    });

    await expect(loadMasterWorkspace(client, userId)).resolves.toEqual({
      kind: "ready",
      memberRole: "owner",
      services: [service],
      workspace,
    });
  });
});
