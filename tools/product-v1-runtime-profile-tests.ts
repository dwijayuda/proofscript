#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const profile = JSON.parse(fs.readFileSync(
  path.join(root, "config", "proofscript-runtime-profile-v1.json"),
  "utf8",
));
const types = fs.readFileSync(path.join(root, "packages/runtime/src/types.ts"), "utf8");
const nat = fs.readFileSync(path.join(root, "packages/runtime/src/nat.ts"), "utf8");
const int = fs.readFileSync(path.join(root, "packages/runtime/src/int.ts"), "utf8");
const bool = fs.readFileSync(path.join(root, "packages/runtime/src/bool.ts"), "utf8");
const structures = fs.readFileSync(path.join(root, "packages/runtime/src/structures.ts"), "utf8");
const generated = fs.readFileSync(path.join(root, "packages/runtime/src/generatedRuntime.ts"), "utf8");
const runtimeProfile = fs.readFileSync(path.join(root, "packages/runtime/src/profile.ts"), "utf8");

assert.equal(profile.schema, "proofscript.runtime-profile/v1");
assert.equal(profile.profileId, "proofscript-js-runtime-v1");
assert.equal(profile.status, "specified-bounded");
assert.equal(profile.correspondence.runtimeRepresentationSpecified, true);
assert.equal(profile.correspondence.runtimeImplementationGated, true);
assert.equal(profile.correspondence.coreToTypeScriptFormalCorrespondence, false);
assert.equal(profile.correspondence.typeScriptToJavaScriptFormalCorrespondence, false);
assert.equal(profile.correspondence.endToEndVerifiedJavaScriptClaim, false);

assert.equal(profile.representations.Nat.host, "bigint");
assert.match(types, /export type PsNat = bigint/u);
assert.match(nat, /bigintValue < 0n/u);
assert.match(nat, /a <= b \? 0n : a - b|return a <= b \? 0n : a - b/u);
assert.ok(profile.representations.Nat.forbidden.includes("JavaScript number representation"));

assert.equal(profile.representations.Int.host, "bigint");
assert.match(types, /export type PsInt = bigint/u);
assert.match(int, /return -value/u);
assert.match(int, /left \+ right/u);
assert.match(int, /left - right/u);

assert.equal(profile.representations.Bool.host, "boolean");
assert.match(types, /export type PsBool = boolean/u);
assert.match(bool, /return !value/u);
assert.ok(profile.representations.Bool.forbidden.includes("JavaScript truthiness coercion"));

assert.equal(profile.representations.Unit.host, "null");
assert.match(types, /export type PsUnit = null/u);
assert.match(generated, /Unit_unit: null as PsUnit/u);

assert.equal(profile.representations.String.host, "string");
assert.match(runtimeProfile, /JS\/TypeScript string emission after Core checking/u);
assert.ok(profile.representations.String.limitations.some((item) => /Unicode observational correspondence/u.test(item)));

assert.equal(profile.representations.Structure.host, "frozen tagged record");
assert.match(structures, /Object\.freeze\(\{ __psInductive: inductive, __psCtor: ctor, fields: Object\.freeze/u);
assert.match(types, /readonly __psInductive: string/u);
assert.match(types, /readonly __psCtor: number/u);

assert.deepEqual(profile.representations.Option.constructors.none, {
  __psInductive: "Option", __psCtor: 0, fields: [],
});
assert.deepEqual(profile.representations.Option.constructors.some, {
  __psInductive: "Option", __psCtor: 1, fields: ["value"],
});
assert.match(generated, /__psInductive !== 'Option'/u);
assert.match(generated, /__psCtor === 0/u);
assert.match(generated, /__psCtor === 1/u);
assert.ok(profile.representations.Option.forbidden.includes("A | null"));

assert.deepEqual(profile.representations.Except.constructors.error, {
  __psInductive: "Except", __psCtor: 0, fields: ["error"],
});
assert.deepEqual(profile.representations.Except.constructors.ok, {
  __psInductive: "Except", __psCtor: 1, fields: ["value"],
});
assert.match(generated, /__psInductive !== 'Except'/u);

assert.deepEqual(profile.representations.List.constructors.nil, {
  __psInductive: "List", __psCtor: 0, fields: [],
});
assert.deepEqual(profile.representations.List.constructors.cons, {
  __psInductive: "List", __psCtor: 1, fields: ["head", "tail"],
});
assert.match(generated, /Struct_mk\('List', 0, \[\]\)/u);
assert.match(generated, /Struct_mk\('List', 1, \[items\[i\], out\]\)/u);
assert.match(generated, /depth < 100000/u);

assert.deepEqual(profile.representations.Array.constructor, {
  __psInductive: "Array", __psCtor: 0, fields: ["List payload"],
});
assert.match(generated, /Struct_mk\('Array', 0, \[/u);
assert.ok(profile.representations.Array.forbidden.includes("raw mutable JavaScript Array as semantic representation"));

assert.equal(profile.representations.Equality.runtime, "no general JavaScript ==/=== replacement for ProofScript equality");
assert.match(generated, /Nat_beq:.*a === b/u);
assert.match(generated, /Int_beq:.*a === b/u);

for (const unsupported of ["IO","Char","Float","UInt8","UInt16","UInt32","UInt64","USize"]) {
  assert.equal(profile.representations[unsupported].status, "unsupported");
  assert.equal(profile.representations[unsupported].runtime, null);
}
assert.match(runtimeProfile, /UInt\/Float\/runtime semantics/u);
assert.match(runtimeProfile, /IO, modules as runtime namespaces, effects/u);

console.log("PRODUCT_V1_RUNTIME_PROFILE_TESTS=PASS");
