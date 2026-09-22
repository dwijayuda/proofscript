#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  MINIMUM_STATEFUL_LEAN_VERSION,
  classifyLeanCompatibilityOutput,
  compareLeanCompatibilityVersions,
  parseLeanCompatibilityVersion,
} from "../packages/monadic-lowering/src/index.mjs";

assert.equal(MINIMUM_STATEFUL_LEAN_VERSION, "4.33.1");

assert.equal(
  parseLeanCompatibilityVersion("Lean (version 4.33.1, x86_64, commit deadbeef, Release)"),
  "4.33.1",
);
assert.equal(
  parseLeanCompatibilityVersion("Lean (version 4.35.0-rc2, x86_64, commit deadbeef, Release)"),
  "4.35.0-rc2",
);
assert.equal(
  parseLeanCompatibilityVersion("Lean (version 4.36.0-nightly-2026-09-23, x86_64)"),
  "4.36.0-nightly-2026-09-23",
);

assert.equal(compareLeanCompatibilityVersions("4.33.1", "4.33.1"), 0);
assert.equal(compareLeanCompatibilityVersions("4.34.0", "4.33.1"), 1);
assert.equal(compareLeanCompatibilityVersions("4.35.0-rc2", "4.33.1"), 1);
assert.equal(compareLeanCompatibilityVersions("4.33.0", "4.33.1"), -1);
assert.equal(compareLeanCompatibilityVersions("4.33.1-rc1", "4.33.1"), -1);

for (const version of [
  "4.33.1",
  "4.34.0",
  "4.35.0-rc2",
  "4.36.0-nightly-2026-09-23",
  "5.0.0",
]) {
  const result = classifyLeanCompatibilityOutput(`Lean (version ${version}, x86_64, Release)`);
  assert.equal(result.status, "accepted", version);
  assert.equal(result.version, version, version);
  assert.equal(result.minimumVersion, "4.33.1", version);
  assert.equal(result.compatibilityPolicy, ">=4.33.1", version);
  assert.equal(result.exactVersionRequired, false, version);
}

for (const version of ["4.33.0", "4.32.2", "4.33.1-rc1"]) {
  const result = classifyLeanCompatibilityOutput(`Lean (version ${version}, x86_64, Release)`);
  assert.equal(result.status, "unsupported", version);
  assert.match(result.message, /Lean >= 4\.33\.1 required/u, version);
}

const malformed = classifyLeanCompatibilityOutput("not Lean");
assert.equal(malformed.status, "unsupported");
assert.match(malformed.message, /unable to parse Lean version/u);

console.log("PS3_LEAN_VERSION_COMPATIBILITY_TESTS=PASS");
