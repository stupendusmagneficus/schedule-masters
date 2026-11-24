import { describe, expect, it, vi } from "vitest";

import { deleteMyAccount } from "./deleteAccount";

function createClient(rpcError: { message: string } | null) {
  return {
    auth: { signOut: vi.fn().mockResolvedValue({ error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: rpcError }),
  };
}

describe("deleteMyAccount", () => {
  it("deletes the account with the server confirmation and clears the local session", async () => {
    const client = createClient(null);

    await deleteMyAccount(client);

    expect(client.rpc).toHaveBeenCalledWith("delete_my_account", {
      p_confirmation: "DELETE",
    });
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("keeps the session and reports the failure when deletion fails", async () => {
    const client = createClient({ message: "network" });

    await expect(deleteMyAccount(client)).rejects.toThrow("network");
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });
});
