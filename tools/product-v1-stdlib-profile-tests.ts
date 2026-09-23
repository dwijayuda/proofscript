#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { readCurrentStandardLibrary } from "../packages/product-profile/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const profile = JSON.parse(fs.readFileSync(
  path.join(root, "config", "proofscript-stdlib-profile-v1.json"),
  "utf8",
));
const runtimeProfile = JSON.parse(fs.readFileSync(
  path.join(root, "config", "proofscript-runtime-profile-v1.json"),
  "utf8",
));
const packageJson = JSON.parse(fs.readFileSync(
  path.join(root, "packages/std/package.json"),
  "utf8",
));
const manifestPath = path.join(root, "packages/std/bootstrap-manifest.json");
const manifestBytes = fs.readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const foundation = fs.readFileSync(
  path.join(root, "packages/std/src/Bootstrap/Foundation.ps"),
  "utf8",
);
const termEmitter = fs.readFileSync(
  path.join(root, "packages/backend-typescript/src/termEmitter.ts"),
  "utf8",
);

assert.equal(profile.schema, "proofscript.stdlib-profile/v1");
assert.equal(profile.profileId, "proofscript-stdlib-v1");
assert.equal(profile.status, "specified-bounded");
assert.equal(packageJson.name, "@proofscript/std");
assert.equal(profile.package.name, "@proofscript/std");
assert.equal(profile.package.sourceImportRequired, false);
assert.equal(manifest.declarations.length, 96);
assert.equal(manifest.declarationCount, 96);

const declarations = new Set(manifest.declarations);
for (const [familyName, family] of Object.entries(profile.families) as [string, any][]) {
  assert.match(family.status, /^supported-bounded$/u, familyName);
  for (const declaration of family.required ?? []) {
    assert.ok(
      declarations.has(declaration),
      `stdlib family ${familyName} requires missing bootstrap declaration ${declaration}`,
    );
  }
}

assert.equal(profile.resultLikeType.name, "Except");
assert.equal(profile.resultLikeType.shape, "Except(E, A)");
assert.match(profile.resultLikeType.policy, /Result-like/u);
assert.ok(!declarations.has("Result"), "Product-v1 must not duplicate Except with a second Result family");

for (const generated of profile.families.Eq.generated) {
  if (generated === "Eq.refl") assert.match(foundation, /\| refl:/u);
  else if (generated === "Eq.rec") assert.match(foundation, /inductive Eq/u);
}
assert.match(foundation, /\| zero;/u);
assert.match(foundation, /\| succ\(n: Nat\);/u);
assert.match(foundation, /\| false;/u);
assert.match(foundation, /\| true;/u);
assert.match(foundation, /\| none;/u);
assert.match(foundation, /\| some\(value: A\);/u);
assert.match(foundation, /\| nil;/u);
assert.match(foundation, /\| cons\(head: A, tail: List\(A\)\);/u);
assert.match(foundation, /\| mk\(data: List\(A\)\);/u);
assert.match(foundation, /\| error\(error: E\);/u);
assert.match(foundation, /\| ok\(value: A\);/u);

for (const assumption of manifest.assumptions) {
  assert.ok(
    declarations.has(assumption),
    `bootstrap assumption ${assumption} must also be a declared stdlib name`,
  );
  assert.ok(
    termEmitter.includes(`term.name === "${assumption}"`)
      || termEmitter.includes(`head.name === "${assumption}"`),
    `bootstrap runtime assumption ${assumption} lacks explicit TypeScript backend lowering`,
  );
}

for (const family of ["Option", "Except", "List", "Array", "String"]) {
  assert.match(
    runtimeProfile.representations[family].status,
    /^implemented/u,
    `runtime profile must define the Product-v1 representation of ${family}`,
  );
}

assert.equal(profile.packageLayer.jsonValidation.status, "implemented-trusted-host-bounded");
assert.equal(profile.packageLayer.jsonValidation.package, "@proofscript/json-validation");
assert.equal(profile.packageLayer.jsonValidation.trust, "trusted-external");
assert.equal(profile.packageLayer.jsonValidation.parserVerified, false);
assert.equal(profile.packageLayer.jsonValidation.structuredJsonValueModel, false);
assert.equal(profile.packageLayer.jsonValidation.gate, "test:product-v1:json-validation");
assert.ok(fs.existsSync(path.join(root, profile.packageLayer.jsonValidation.profile)));
assert.ok(fs.existsSync(path.join(root, profile.packageLayer.jsonValidation.example, "Main.ps")));
assert.equal(profile.packageLayer.packageSourceResolution.status, "project-modules-only");
assert.equal(
  profile.packageLayer.dependencyCertificateIdentity.status,
  "implemented-for-implicit-stdlib-and-npm-ffi",
);
assert.equal(profile.packageLayer.dependencyCertificateIdentity.identitySchema, "proofscript.npm-dependency-identity/v1");
assert.equal(profile.packageLayer.dependencyCertificateIdentity.tamperRejection, true);
assert.equal(profile.packageLayer.dependencyCertificateIdentity.sourcePackageImports, "not yet implemented");

const stdlib = readCurrentStandardLibrary(root);
assert.equal(stdlib.package, "@proofscript/std");
assert.equal(stdlib.version, packageJson.version);
assert.equal(stdlib.profileId, "proofscript-stdlib-v1");
assert.equal(stdlib.declarationCount, 96);
assert.equal(
  stdlib.manifestSha256,
  createHash("sha256").update(manifestBytes).digest("hex"),
);
assert.equal(stdlib.bootstrapCoreSha256, manifest.coreSha256);
assert.equal(stdlib.bootstrapSourceSha256, manifest.sourceSha256);

console.log("PRODUCT_V1_STDLIB_PROFILE_TESTS=PASS");
