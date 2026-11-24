type AccountDeletionClient = {
  readonly auth: {
    readonly signOut: (options: {
      scope: "local";
    }) => Promise<{ error: unknown }>;
  };
  readonly rpc: (
    functionName: "delete_my_account",
    args: { p_confirmation: string },
  ) => PromiseLike<{ error: { message: string } | null }>;
};

/**
 * Permanently deletes the signed-in master and every workspace they solely own.
 * The server session is gone afterwards, so only the local session is cleared.
 */
export async function deleteMyAccount(
  client: AccountDeletionClient,
): Promise<void> {
  const { error } = await client.rpc("delete_my_account", {
    p_confirmation: "DELETE",
  });
  if (error) throw new Error(error.message);
  await client.auth.signOut({ scope: "local" });
}
