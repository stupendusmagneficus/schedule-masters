import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import {
  createAuthenticatedTestUser,
  createSupabaseAdminTestClient,
} from "./supabase.integration.helpers";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contract = url && publishableKey && serviceRoleKey ? it : it.skip;

contract(
  "deletes the caller's account with their sole-owner workspace and leaves others intact",
  async () => {
    if (!url || !publishableKey || !serviceRoleKey) return;
    const admin = createSupabaseAdminTestClient({ url, serviceRoleKey });
    const suffix = randomUUID();
    const ownWorkspaceId = randomUUID();
    const otherWorkspaceId = randomUUID();
    const customerId = randomUUID();
    const userIds: string[] = [];

    try {
      for (const [id, name] of [
        [ownWorkspaceId, "Deleted studio"],
        [otherWorkspaceId, "Unrelated studio"],
      ] as const) {
        expect(
          (
            await admin.from("workspaces").insert({
              id,
              name,
              slug: `delete-${id}`,
              timezone: "Europe/Prague",
            })
          ).error,
        ).toBeNull();
      }
      const owner = await createAuthenticatedTestUser({
        admin,
        email: `delete-owner-${suffix}@example.test`,
        password: `Test-${randomUUID()}-Aa1!`,
        publishableKey,
        url,
      });
      userIds.push(owner.user.id);
      const otherOwner = await createAuthenticatedTestUser({
        admin,
        email: `delete-other-${suffix}@example.test`,
        password: `Test-${randomUUID()}-Aa1!`,
        publishableKey,
        url,
      });
      userIds.push(otherOwner.user.id);
      expect(
        (
          await admin.from("workspace_members").insert([
            {
              role: "owner",
              user_id: owner.user.id,
              workspace_id: ownWorkspaceId,
            },
            {
              role: "owner",
              user_id: otherOwner.user.id,
              workspace_id: otherWorkspaceId,
            },
          ])
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.from("customers").insert({
            id: customerId,
            name: "Client with PII",
            email: "client@example.test",
            phone: "+420777000111",
            workspace_id: ownWorkspaceId,
          })
        ).error,
      ).toBeNull();

      const unconfirmed = await owner.client.rpc("delete_my_account", {
        p_confirmation: "yes",
      });
      expect(unconfirmed.error?.message).toContain(
        "Account deletion must be confirmed",
      );
      expect(
        (await admin.from("workspaces").select("id").eq("id", ownWorkspaceId))
          .data,
      ).toHaveLength(1);

      const deleted = await owner.client.rpc("delete_my_account", {
        p_confirmation: "DELETE",
      });
      expect(deleted.error).toBeNull();

      expect(
        (await admin.from("workspaces").select("id").eq("id", ownWorkspaceId))
          .data,
      ).toEqual([]);
      expect(
        (await admin.from("customers").select("id").eq("id", customerId)).data,
      ).toEqual([]);
      const removedUser = await admin.auth.admin.getUserById(owner.user.id);
      expect(removedUser.data.user).toBeNull();
      userIds.shift();

      expect(
        (await admin.from("workspaces").select("id").eq("id", otherWorkspaceId))
          .data,
      ).toHaveLength(1);
      expect(
        (await admin.auth.admin.getUserById(otherOwner.user.id)).data.user?.id,
      ).toBe(otherOwner.user.id);
    } finally {
      await admin
        .from("workspaces")
        .delete()
        .in("id", [ownWorkspaceId, otherWorkspaceId]);
      for (const userId of userIds) await admin.auth.admin.deleteUser(userId);
    }
  },
  60_000,
);

contract("rejects account deletion without a signed-in user", async () => {
  if (!url || !publishableKey) return;
  const response = await fetch(`${url}/rest/v1/rpc/delete_my_account`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_confirmation: "DELETE" }),
  });
  expect(response.ok).toBe(false);
});
