#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const runtimeSrc = path.join(root, 'packages/runtime/src');
const expectedFiles = [
  'types.ts',
  'profile.ts',
  'nat.ts',
  'bool.ts',
  'structures.ts',
  'status.ts',
  'source.ts',
  'index.ts',
];

for (const file of expectedFiles) {
  assert.ok(fs.existsSync(path.join(runtimeSrc, file)), `expected runtime module ${file} to exist`);
}

const index = fs.readFileSync(path.join(runtimeSrc, 'index.ts'), 'utf8');
for (const moduleName of ['types', 'profile', 'nat', 'bool', 'structures', 'status', 'source']) {
  assert.match(index, new RegExp(`export \\* from ["']\\./${moduleName}["'];`), `index.ts should re-export ${moduleName}`);
}
assert.ok(index.split('\n').length <= 20, 'runtime index.ts should stay a thin public API barrel');

const profile = fs.readFileSync(path.join(runtimeSrc, 'profile.ts'), 'utf8');
assert.match(profile, /PSC1_TRUST_LABEL/);
assert.match(profile, /PSC1_SUPPORTED_FEATURES/);
assert.match(profile, /PSC1_FAIL_CLOSED_FEATURES/);

const nat = fs.readFileSync(path.join(runtimeSrc, 'nat.ts'), 'utf8');
assert.match(nat, /export function psNat/);
assert.match(nat, /export function Nat_rec/);
assert.doesNotMatch(nat, /Struct_mk|Inductive_rec|Bool_not|Bool_xor/, 'Nat runtime module should not contain structure/inductive/Bool helpers');

const bool = fs.readFileSync(path.join(runtimeSrc, 'bool.ts'), 'utf8');
assert.match(bool, /export function Bool_not/);
assert.match(bool, /export function Bool_xor/);
assert.doesNotMatch(bool, /Nat_add|Struct_mk|Inductive_rec/, 'Bool runtime module should not contain Nat or structure/inductive helpers');

const structures = fs.readFileSync(path.join(runtimeSrc, 'structures.ts'), 'utf8');
assert.match(structures, /export function Struct_mk/);
assert.match(structures, /export function Inductive_rec/);
assert.doesNotMatch(structures, /Nat_add|Nat_pred|Nat_sub|Nat_mul|Nat_beq|Nat_leb|Nat_ltb|Bool_not|Bool_xor/, 'structure runtime module should not contain Nat/Bool helpers');

const source = fs.readFileSync(path.join(runtimeSrc, 'source.ts'), 'utf8');
assert.match(source, /export function psc1RuntimeSource/);
assert.match(source, /export function psc1RuntimeTypeScriptSource/);
assert.doesNotMatch(source, /export function Nat_add/, 'runtime source-template module should not define executable Nat helpers');

const runtime = await import(pathToFileURL(path.join(root, 'packages/runtime/dist/index.js')));
assert.equal(runtime.Nat_mul(3n)(4n), 12n, 'runtime public API should still expose Nat_mul');
assert.equal(runtime.Nat_pred(0n), 0n, 'runtime public API should expose saturating Nat_pred at zero');
assert.equal(runtime.Nat_pred(4n), 3n, 'runtime public API should expose Nat_pred');
assert.equal(runtime.Nat_sub(2n)(5n), 0n, 'runtime public API should expose saturating Nat_sub');
assert.equal(runtime.Nat_sub(9n)(4n), 5n, 'runtime public API should expose Nat_sub');
assert.equal(runtime.Nat_beq(4n)(4n), true, 'runtime public API should expose Nat_beq');
assert.equal(runtime.Nat_leb(4n)(5n), true, 'runtime public API should expose Nat_leb');
assert.equal(runtime.Nat_ltb(4n)(4n), false, 'runtime public API should expose Nat_ltb');
assert.equal(runtime.Nat_rec('z')((pred) => (ih) => `${ih}s${pred}`)(2n), 'zs0s1', 'runtime public API should still expose Nat_rec behavior');
assert.equal(runtime.Bool_not(true), false, 'runtime public API should expose Bool_not');
assert.equal(runtime.Bool_xor(true)(false), true, 'runtime public API should expose Bool_xor');
assert.equal(runtime.Bool_xor(true)(true), false, 'runtime public API should expose Bool_xor same-input false behavior');
const pair = runtime.Struct_mk('Pair', 0, [1n, false]);
assert.equal(runtime.Struct_proj(pair)(0), 1n, 'runtime public API should still expose Struct projection');
assert.equal(runtime.Inductive_rec('Pair', [2])([x => y => [x, y]])(pair)[1], false, 'runtime public API should still expose Inductive_rec behavior');
const status = runtime.psc1RuntimeStatus();
assert.equal(status.requiresLean4, false);
assert.match(status.trustLabel, /trusted-boundary/);
assert.ok(Array.isArray(status.supported));
assert.ok(Array.isArray(status.failClosed));
assert.match(runtime.psc1RuntimeSource({
  implementationProfile: runtime.PSC1_IMPLEMENTATION_PROFILE,
  trustLabel: runtime.PSC1_TRUST_LABEL,
  supported: runtime.PSC1_SUPPORTED_FEATURES,
  failClosed: runtime.PSC1_FAIL_CLOSED_FEATURES,
  sourceSha256: 'test',
}), /const __ps = Object\.freeze/);

console.log(JSON.stringify({ ok: true, checked: expectedFiles.length, module: 'runtime-extraction' }));
