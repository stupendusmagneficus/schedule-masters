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
    select: vi.fn(),
    single: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue(result);
  query.single.mockResolvedValue(result);
  return query;
}

function createClient({
  member,
  service,
  workspace,
}: {
  readonly member: QueryResult;
  readonly service: QueryResult;
  readonly workspace: QueryResult;
}) {
  const queries = {
    services: createQuery(service),
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
    duration_minutes: 60,
    name: "Manicure",
    price_amount: 700,
  };

  it("requires setup only after a successful empty membership lookup", async () => {
    const client = createClient({
      member: { data: null, error: null },
      service: { data: null, error: null },
      workspace: { data: null, error: null },
    });

    await expect(loadMasterWorkspace(client, userId)).resolves.toEqual({
      kind: "setupRequired",
    });
  });

  it("keeps an existing master out of setup when membership loading fails", async () => {
    const client = createClient({
      member: { data: null, error: { message: "Network failed" } },
      service: { data: null, error: null },
      workspace: { data: null, error: null },
    });

    await expect(loadMasterWorkspace(client, userId)).resolves.toEqual({
      kind: "error",
    });
  });

  it("does not return a partial workspace when a dependent query fails", async () => {
    const client = createClient({
      member: { data: { workspace_id: workspace.id }, error: null },
      service: { data: null, error: { message: "Network failed" } },
      workspace: { data: workspace, error: null },
    });

    await expect(loadMasterWorkspace(client, userId)).resolves.toEqual({
      kind: "error",
    });
  });

  it("does not return setup when the workspace query fails", async () => {
    const client = createClient({
      member: { data: { workspace_id: workspace.id }, error: null },
      service: { data: null, error: null },
      workspace: { data: null, error: { message: "Network failed" } },
    });

    await expect(loadMasterWorkspace(client, userId)).resolves.toEqual({
      kind: "error",
    });
  });

  it("returns the complete workspace data for the active member", async () => {
    const client = createClient({
      member: { data: { workspace_id: workspace.id }, error: null },
      service: { data: service, error: null },
      workspace: { data: workspace, error: null },
    });

    await expect(loadMasterWorkspace(client, userId)).resolves.toEqual({
      kind: "ready",
      service,
      workspace,
    });
  });
});
