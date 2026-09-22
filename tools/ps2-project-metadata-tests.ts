#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadProjectConfig, ProjectError } from "@proofscript/project";

const root = path.resolve(import.meta.dirname, "..");

const basic = loadProjectConfig(path.join(root, "examples", "basic"));
assert.equal(basic.language, "0.6.1");
assert.equal(basic.productProfile, "ps1-v061");
assert.equal(basic.semanticBaseline, undefined);

const standalone = loadProjectConfig(path.join(root, "examples", "standalone-small"));
assert.equal(standalone.language, "0.6.1");
assert.equal(standalone.productProfile, "ps1-v061");
assert.equal(standalone.semanticBaseline, undefined);

function projectWith(configSource: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-project-meta-"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ private: true }, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "proofscript.config.cts"), configSource + "\n");
  return dir;
}

const currentDir = projectWith('module.exports={language:"0.6.1",productProfile:"ps1-v061",sourceRoots:["src"]};');
assert.deepEqual(loadProjectConfig(currentDir), {
  language: "0.6.1",
  productProfile: "ps1-v061",
  sourceRoots: ["src"],
});

const legacyDir = projectWith('module.exports={language:"0.1",semanticBaseline:"lean-4.33.1"};');
assert.deepEqual(loadProjectConfig(legacyDir), {
  language: "0.1",
  semanticBaseline: "lean-4.33.1",
});

const mixedCurrent = projectWith('module.exports={language:"0.6.1",productProfile:"ps1-v061",semanticBaseline:"lean-4.33.1"};');
assert.throws(
  () => loadProjectConfig(mixedCurrent),
  (error: unknown) => error instanceof ProjectError && /must not present a Lean\/Core compatibility baseline/i.test(error.message),
);

const mixedLegacy = projectWith('module.exports={language:"0.1",productProfile:"ps1-v061",semanticBaseline:"lean-4.33.1"};');
assert.throws(
  () => loadProjectConfig(mixedLegacy),
  (error: unknown) => error instanceof ProjectError && /must not use the current productProfile/i.test(error.message),
);

const badProfile = projectWith('module.exports={language:"0.6.1",productProfile:"wrong"};');
assert.throws(() => loadProjectConfig(badProfile), /unsupported ProofScript product profile/);

const badLanguage = projectWith('module.exports={language:"9.9"};');
assert.throws(() => loadProjectConfig(badLanguage), /unsupported ProofScript language/);

console.log("PS2_PROJECT_METADATA_TESTS=PASS");
