#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveNpmInvocation } from "./ps3-npm-invocation.mjs";

const root = path.resolve(import.meta.dirname, "..");
const psc = path.join(root, "bin", "psc.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-json-validation-"));
const app = path.join(tmp, "json-validation-app");
const host = path.join(tmp, "json-validation-package");
const require = createRequire(import.meta.url);

function pscJson(args: string[], expected = 0) {
  const result = spawnSync(process.execPath, [psc, ...args, "--json"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    expected,
    `psc ${args.join(" ")} exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return JSON.parse(result.stdout);
}

try {
  const profile = JSON.parse(fs.readFileSync(
    path.join(root, "config", "proofscript-json-validation-v1.json"),
    "utf8",
  ));
  assert.equal(profile.schema, "proofscript.json-validation-profile/v1");
  assert.equal(profile.profileId, "proofscript-json-validation-v1");
  assert.equal(profile.status, "implemented-trusted-host-bounded");
  assert.equal(profile.package.name, "@proofscript/json-validation");
  assert.equal(profile.ffi.trust, "trusted-external");
  assert.deepEqual(profile.ffi.boundaryTypes, ["String", "Bool"]);
  assert.equal(profile.claims.parserVerified, false);
  assert.equal(profile.claims.serializerVerified, false);
  assert.equal(profile.claims.hostJsonParserTrusted, true);
  assert.equal(profile.claims.structuredJsonCrossesFfiBoundary, false);
  assert.equal(profile.claims.endToEndVerifiedJson, false);

  const hostApi = require(path.join(root, "examples/product-v1/json-validation-package/index.cjs"));
  assert.equal(hostApi.isValid('{"name":"ProofScript"}'), true);
  assert.equal(hostApi.isValid("{bad}"), false);
  assert.equal(hostApi.isObject('{"name":"ProofScript"}'), true);
  assert.equal(hostApi.isObject("[1,2,3]"), false);
  assert.equal(hostApi.isArray("[1,2,3]"), true);
  assert.equal(hostApi.hasStringField('{"name":"ProofScript"}', "name"), true);
  assert.equal(hostApi.hasStringField('{"name":3}', "name"), false);
  assert.equal(hostApi.hasBooleanField('{"active":true}', "active"), true);
  assert.equal(hostApi.hasSafeIntegerField('{"count":3}', "count"), true);
  assert.equal(hostApi.hasSafeIntegerField('{"count":3.5}', "count"), false);
  assert.equal(
    hostApi.canonicalizeOr('{ "name" : "ProofScript", "active" : true }', "fallback"),
    '{"name":"ProofScript","active":true}',
  );
  assert.equal(hostApi.canonicalizeOr("{bad}", "fallback"), "fallback");

  fs.cpSync(path.join(root, "examples/product-v1/json-validation-app"), app, { recursive: true });
  fs.cpSync(path.join(root, "examples/product-v1/json-validation-package"), host, { recursive: true });

  const npm = resolveNpmInvocation([
    "install",
    "--offline",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ]);
  const installed = spawnSync(npm.command, npm.args, {
    cwd: app,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(
    installed.status,
    0,
    `offline JSON validation package install failed\nstdout:\n${installed.stdout}\nstderr:\n${installed.stderr}`,
  );
  assert.ok(fs.existsSync(path.join(app, "node_modules/@proofscript/json-validation/package.json")));
  assert.ok(fs.existsSync(path.join(app, "node_modules/@proofscript/json-validation/index.cjs")));

  const source = path.join(app, "Main.ps");
  const manifest = path.join(app, "proofscript.ffi.json");
  const dist = path.join(app, "dist");
  const js = path.join(dist, "Main.js");
  const core = path.join(dist, "Main.pscore.json");
  const cert = path.join(dist, "Main.pscert.json");
  fs.mkdirSync(dist, { recursive: true });

  const checked = pscJson(["check", source, "--emit-core", core]);
  assert.equal(checked.status, "accepted");

  const built = pscJson([
    "build-js", source,
    "--out", js,
    "--ffi-manifest", manifest,
  ]);
  assert.equal(built.status, "accepted");
  assert.equal(built.trustBoundary.trustedExternalCode, true);
  assert.equal(built.ffi.trust, "trusted-external");
  assert.equal(built.ffi.bindings.length, 7);
  assert.ok(built.ffi.bindings.every((binding: any) =>
    binding.module === "@proofscript/json-validation"
    && binding.trust === "trusted-external"
  ));

  const executed = spawnSync(process.execPath, [
    "-e",
    [
      "const m=require(process.argv[1]);",
      "process.stdout.write(JSON.stringify({",
      "validProfile:m.validProfile,invalidProfile:m.invalidProfile,",
      "objectProfile:m.objectProfile,arrayProfile:m.arrayProfile,",
      "hasName:m.hasName,hasActive:m.hasActive,hasCount:m.hasCount,",
      "rejectsDecimalAsInteger:m.rejectsDecimalAsInteger,",
      "canonicalProfile:m.canonicalProfile,invalidFallback:m.invalidFallback",
      "}));",
    ].join(""),
    js,
  ], {
    cwd: app,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(
    executed.status,
    0,
    `generated JSON validation app failed\nstdout:\n${executed.stdout}\nstderr:\n${executed.stderr}`,
  );
  assert.deepEqual(JSON.parse(executed.stdout), {
    validProfile: true,
    invalidProfile: false,
    objectProfile: true,
    arrayProfile: true,
    hasName: true,
    hasActive: true,
    hasCount: true,
    rejectsDecimalAsInteger: false,
    canonicalProfile: '{"name":"ProofScript","active":true}',
    invalidFallback: "fallback",
  });

  const certified = pscJson([
    "certify", source,
    "--core", core,
    "--out", cert,
    "--runtime-artifact", js,
    "--ffi-manifest", manifest,
  ]);
  assert.equal(certified.status, "accepted");

  const verified = pscJson(["verify", cert]);
  assert.equal(verified.status, "accepted");
  assert.equal(verified.ffi.trust, "trusted-external");
  assert.equal(verified.ffi.bindings.length, 7);
  assert.equal(verified.correspondence.endToEndVerifiedJavaScript, false);

  const certificate = JSON.parse(fs.readFileSync(cert, "utf8"));
  assert.equal(certificate.trustBoundary.trustedExternalCode, true);
  assert.ok(certificate.ffi.sha256);
  assert.ok(certificate.runtime?.backendArtifact?.sha256);
  assert.equal(
    Object.prototype.hasOwnProperty.call(certificate.ffi, "packageIntegrity"),
    false,
    "Product-v1 must not imply npm package-content identity before that gate exists",
  );

  console.log("PRODUCT_V1_JSON_VALIDATION_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
