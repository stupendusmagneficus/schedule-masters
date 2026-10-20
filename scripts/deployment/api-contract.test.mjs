import assert from "node:assert/strict";
import test from "node:test";
import { findContractGaps } from "./api-contract.mjs";

test("reports missing RPC and column names without serializing the API document", () => {
  const document = {
    paths: { "/rpc/ready": {} },
    definitions: { workspaces: { properties: { id: {} } } },
  };
  assert.deepEqual(
    findContractGaps(
      document,
      ["ready", "missing"],
      ["id", "booking_interval_minutes"],
    ),
    ["RPC missing", "workspaces.booking_interval_minutes"],
  );
});

test("accepts an API document exposing the complete required contract", () => {
  assert.deepEqual(
    findContractGaps(
      {
        paths: { "/rpc/ready": {} },
        definitions: { workspaces: { properties: { id: {} } } },
      },
      ["ready"],
      ["id"],
    ),
    [],
  );
});

test("missing API metadata fails closed", () => {
  assert.deepEqual(findContractGaps({}, ["ready"], ["id"]), [
    "RPC ready",
    "workspaces.id",
  ]);
});
