#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const psc = path.join(root, "bin", "psc.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-ffi-v1-"));

function run(args: string[], expected = 0) {
  const result = spawnSync(process.execPath, [psc, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    expected,
    `psc ${args.join(" ")} exited ${result.status}, expected ${expected}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return result;
}

function json(args: string[], expected = 0) {
  return JSON.parse(run([...args, "--json"], expected).stdout);
}

try {
  const source = path.join(tmp, "HostInterop.ps");
  const manifest = path.join(tmp, "proofscript.ffi.json");
  const core = path.join(tmp, "HostInterop.pscore.json");
  const js = path.join(tmp, "HostInterop.js");
  const ts = path.join(tmp, "HostInterop.ts");
  const cert = path.join(tmp, "HostInterop.pscert.json");

  fs.writeFileSync(source, [
    "axiom hostBasename(path: String): String;",
    "axiom hostBasenameSuffix(path: String, suffix: String): String;",
    'def hostResult: String := { hostBasename("/tmp/example.txt") }',
    'def hostSuffixResult: String := { hostBasenameSuffix("/tmp/example.txt", ".txt") }',
    "",
  ].join("\n"));
  fs.writeFileSync(manifest, JSON.stringify({
    schema: "proofscript.ffi/v1",
    bindings: [
      {
        name: "hostBasename",
        module: "node:path",
        exportName: "basename",
        trust: "trusted-external",
      },
      {
        name: "hostBasenameSuffix",
        module: "node:path",
        exportName: "basename",
        trust: "trusted-external",
      },
    ],
  }, null, 2) + "\n");

  const checked = json(["check", source, "--emit-core", core]);
  assert.equal(checked.status, "accepted");
  const coreArtifact = JSON.parse(fs.readFileSync(core, "utf8"));
  assert.ok(coreArtifact.declarations.some((decl: any) =>
    decl.kind === "axiom" && decl.name === "hostBasename"
  ));

  const unbound = run(["build-js", source, "--out", path.join(tmp, "unbound.js")], 1);
  assert.match(
    unbound.stderr + unbound.stdout,
    /depends on unbound axiom 'hostBasename'.*ffi-v1 binding/u,
  );

  const builtJs = json([
    "build-js", source, "--out", js,
    "--ffi-manifest", manifest,
  ]);
  assert.equal(builtJs.status, "accepted");
  assert.equal(builtJs.ffi.schema, "proofscript.ffi/v1");
  assert.equal(builtJs.ffi.trust, "trusted-external");
  assert.equal(builtJs.ffi.bindings.length, 2);
  assert.deepEqual(builtJs.ffi.bindings.map((binding: any) => binding.arity), [1, 2]);
  assert.equal(builtJs.trustBoundary.trustedExternalCode, true);
  const jsSource = fs.readFileSync(js, "utf8");
  assert.match(jsSource, /require\("node:path"\)/u);
  assert.match(jsSource, /\["basename"\]/u);
  assert.match(jsSource, /arg0 => arg1 => __psFfiRaw\d+\(arg0, arg1\)/u);

  const executed = json([
    "run", source, "--call", "hostResult",
    "--ffi-manifest", manifest,
  ]);
  assert.equal(executed.status, "accepted");
  assert.equal(executed.result, "example.txt");
  assert.equal(executed.ffi.trust, "trusted-external");
  assert.equal(executed.trustBoundary.trustedExternalCode, true);

  const executedSuffix = json([
    "run", source, "--call", "hostSuffixResult",
    "--ffi-manifest", manifest,
  ]);
  assert.equal(executedSuffix.status, "accepted");
  assert.equal(executedSuffix.result, "example");

  const builtTs = json([
    "build-ts", source, "--out", ts,
    "--runtime", "bundled",
    "--ffi-manifest", manifest,
  ]);
  assert.equal(builtTs.status, "accepted");
  assert.equal(builtTs.ffi.bindings[0].name, "hostBasename");
  const tsSource = fs.readFileSync(ts, "utf8");
  assert.match(tsSource, /import \{ basename as __psFfiRaw\d+ \} from "node:path";/u);
  assert.match(tsSource, /\(arg0: string\) => \(arg1: string\) => __psFfiRaw\d+\(arg0, arg1\)/u);

  const certified = json([
    "certify", source,
    "--core", core,
    "--out", cert,
    "--runtime-artifact", js,
    "--ffi-manifest", manifest,
  ]);
  assert.equal(certified.status, "accepted");
  const certificate = JSON.parse(fs.readFileSync(cert, "utf8"));
  assert.equal(certificate.ffi.schema, "proofscript.ffi/v1");
  assert.equal(certificate.ffi.trust, "trusted-external");
  assert.equal(certificate.ffi.bindings[0].name, "hostBasename");
  assert.equal(certificate.trustBoundary.trustedExternalCode, true);
  assert.equal(certificate.trustBoundary.externalImplementationVerified, false);
  assert.equal(certificate.correspondence.endToEndVerifiedJavaScript, false);

  const verified = json(["verify", cert]);
  assert.equal(verified.status, "accepted");
  assert.equal(verified.ffi.trust, "trusted-external");
  assert.equal(verified.ffi.bindings[0].module, "node:path");

  const originalManifest = fs.readFileSync(manifest, "utf8");
  const tampered = JSON.parse(originalManifest);
  tampered.bindings[0].exportName = "dirname";
  fs.writeFileSync(manifest, JSON.stringify(tampered, null, 2) + "\n");
  const tamperedVerification = json(["verify", cert], 1);
  assert.equal(tamperedVerification.status, "rejected");
  assert.match(tamperedVerification.message, /FFI manifest hash mismatch/u);
  fs.writeFileSync(manifest, originalManifest);

  const nonAxiomSource = path.join(tmp, "NonAxiom.ps");
  const nonAxiomManifest = path.join(tmp, "non-axiom.ffi.json");
  fs.writeFileSync(nonAxiomSource, [
    "def localBase(path: String): String := { path }",
    'def localResult: String := { localBase("x") }',
    "",
  ].join("\n"));
  fs.writeFileSync(nonAxiomManifest, JSON.stringify({
    schema: "proofscript.ffi/v1",
    bindings: [{
      name: "localBase",
      module: "node:path",
      exportName: "basename",
      trust: "trusted-external",
    }],
  }, null, 2) + "\n");
  const nonAxiom = run([
    "build-js", nonAxiomSource,
    "--out", path.join(tmp, "non-axiom.js"),
    "--ffi-manifest", nonAxiomManifest,
  ], 1);
  assert.match(nonAxiom.stderr + nonAxiom.stdout, /must target a user Core axiom/u);

  const unsupportedSource = path.join(tmp, "UnsupportedBoundary.ps");
  const unsupportedManifest = path.join(tmp, "unsupported.ffi.json");
  fs.writeFileSync(unsupportedSource, [
    "axiom hostList(xs: List(Nat)): Nat;",
    "def unsupportedResult: Nat := { hostList(List.nil(Nat)) }",
    "",
  ].join("\n"));
  fs.writeFileSync(unsupportedManifest, JSON.stringify({
    schema: "proofscript.ffi/v1",
    bindings: [{
      name: "hostList",
      module: "node:path",
      exportName: "basename",
      trust: "trusted-external",
    }],
  }, null, 2) + "\n");
  const unsupported = run([
    "build-js", unsupportedSource,
    "--out", path.join(tmp, "unsupported.js"),
    "--ffi-manifest", unsupportedManifest,
  ], 1);
  assert.match(
    unsupported.stderr + unsupported.stdout,
    /first-order Nat\/Int\/Bool\/String\/Unit/u,
  );

  const badTrust = path.join(tmp, "bad-trust.ffi.json");
  fs.writeFileSync(badTrust, JSON.stringify({
    schema: "proofscript.ffi/v1",
    bindings: [{
      name: "hostBasename",
      module: "node:path",
      exportName: "basename",
      trust: "verified",
    }],
  }, null, 2) + "\n");
  const rejectedTrust = run([
    "build-js", source,
    "--out", path.join(tmp, "bad-trust.js"),
    "--ffi-manifest", badTrust,
  ], 1);
  assert.match(rejectedTrust.stderr + rejectedTrust.stdout, /trust='trusted-external'/u);

  console.log("PRODUCT_V1_FFI_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
