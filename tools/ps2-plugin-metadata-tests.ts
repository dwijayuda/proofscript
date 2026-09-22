#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CURRENT_PRODUCT_PROFILE,
  CURRENT_PROOFSCRIPT_REFERENCE,
} from "@proofscript/plugin-api";
import { PluginHost } from "@proofscript/plugin-host";
import { toCheckedModuleSnapshot } from "@proofscript/semantic-ir";

const root = path.resolve(import.meta.dirname, "..");

assert.equal(CURRENT_PROOFSCRIPT_REFERENCE, "v0.6.1");
assert.equal(CURRENT_PRODUCT_PROFILE, "ps1-v061");

const snapshot = toCheckedModuleSnapshot({
  status: "accepted",
  declarations: [],
  assumptions: [],
  semanticSha256: "test",
} as any, "/tmp/example.ps");

assert.equal(snapshot.schema, 1);
assert.equal(snapshot.proofscriptReference, "v0.6.1");
assert.equal(snapshot.productProfile, "ps1-v061");
assert.deepEqual(snapshot.coreCompatibility, {
  proofscriptReference: "v0.1",
  leanSemanticBaseline: "lean-4.33.1",
  implementationProfile: "K3c-section-vars0",
});
assert.equal(snapshot.semanticBaseline, "lean-4.33.1");
assert.equal(snapshot.implementationProfile, "K3c-section-vars0");
assert.ok(Object.isFrozen(snapshot), "backend snapshot should remain immutable");

const current = new PluginHost();
await current.load("@proofscript/backend-manifest", root);
assert.equal(current.loaded.length, 1);
assert.equal(current.loaded[0]!.plugin.manifest.proofscriptReference, "v0.6.1");
assert.ok("productProfile" in current.loaded[0]!.plugin.manifest);
assert.equal((current.loaded[0]!.plugin.manifest as any).productProfile, "ps1-v061");
assert.ok(current.getBackend("manifest"));

const example = new PluginHost();
await example.load("example-proofscript-backend-names", root);
assert.equal(example.loaded[0]!.plugin.manifest.proofscriptReference, "v0.6.1");
assert.ok(example.getBackend("names"));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-plugin-meta-"));
fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ private: true }, null, 2) + "\n");

const legacyPath = path.join(tmp, "legacy.cjs");
fs.writeFileSync(legacyPath, `
module.exports = {
  manifest: {
    name: "legacy-plugin-v1",
    version: "0.0.1",
    pluginApi: 1,
    proofscriptReference: "v0.1",
    semanticBaseline: "lean-4.33.1",
    kinds: ["backend"],
    logicalContribution: "none"
  },
  setup() {}
};
`);
const legacy = new PluginHost();
await legacy.load("./legacy.cjs", tmp);
assert.equal(legacy.loaded.length, 1, "legacy Plugin API v1 metadata must remain loadable");

const invalidPath = path.join(tmp, "invalid.cjs");
fs.writeFileSync(invalidPath, `
module.exports = {
  manifest: {
    name: "mixed-invalid-plugin",
    version: "0.0.1",
    pluginApi: 1,
    proofscriptReference: "v0.6.1",
    productProfile: "stale-profile",
    semanticBaseline: "lean-4.33.1",
    kinds: ["backend"],
    logicalContribution: "none"
  },
  setup() {}
};
`);
const invalid = new PluginHost();
await assert.rejects(
  () => invalid.load("./invalid.cjs", tmp),
  /product\/compatibility metadata mismatch/,
  "mixed or stale product metadata must fail closed",
);

console.log("PS2_PLUGIN_METADATA_TESTS=PASS");
