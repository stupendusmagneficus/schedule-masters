export function findContractGaps(document, rpcNames, workspaceColumns) {
  return [
    ...rpcNames
      .filter((name) => !document.paths?.[`/rpc/${name}`])
      .map((name) => `RPC ${name}`),
    ...workspaceColumns
      .filter((name) => !document.definitions?.workspaces?.properties?.[name])
      .map((name) => `workspaces.${name}`),
  ];
}
