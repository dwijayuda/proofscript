#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildJsFixture,
  buildTsFixture,
  compileTypeScriptFixture,
  createPsliveFixture,
  expectPsliveRejected,
  requireFixtureModule,
  runPsliveJson,
} from './pslive-test-harness.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examplesRoot = path.join(repoRoot, 'examples', 'software-profile');
const srcRoot = path.join(examplesRoot, 'src');
const docsPath = path.join(examplesRoot, 'README.md');
const manifestPath = path.join(examplesRoot, 'software-profile-examples.json');

function copyExampleFixture(fileName: string) {
  const sourcePath = path.join(srcRoot, fileName);
  assert.ok(fs.existsSync(sourcePath), `software-profile example missing: ${sourcePath}`);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const fixture = createPsliveFixture(`proofscript-software-${path.basename(fileName, '.ps')}-`, {
    fileName,
    source,
  });
  return fixture;
}

function listToArray(list: any): any[] {
  const out: any[] = [];
  let cursor = list;
  for (let depth = 0; depth < 10000; depth += 1) {
    assert.equal(cursor.__psInductive, 'List');
    if (cursor.__psCtor === 0) return out;
    assert.equal(cursor.__psCtor, 1);
    out.push(cursor.fields[0]);
    cursor = cursor.fields[1];
  }
  throw new Error('bounded list traversal exceeded');
}

function arrayToArray(arrayValue: any): any[] {
  assert.equal(arrayValue.__psInductive, 'Array');
  assert.equal(arrayValue.__psCtor, 0);
  return listToArray(arrayValue.fields[0]);
}

function assertBuildsBoth(fixture: ReturnType<typeof createPsliveFixture>, stem: string) {
  console.error(`[software-profile examples] ${stem}: check`);
  const checked = runPsliveJson(['check', fixture.source, '--json']);
  assert.equal(checked.status, 'accepted', `${stem} should check`);
  assert.ok(checked.userDeclarations.length >= 4, `${stem} should expose several declarations`);

  console.error(`[software-profile examples] ${stem}: build js`);
  const js = buildJsFixture(fixture, `${stem}.js`);
  const jsModule = requireFixtureModule(js.outPath);

  console.error(`[software-profile examples] ${stem}: build ts`);
  const ts = buildTsFixture(fixture, `${stem}.ts`);
  console.error(`[software-profile examples] ${stem}: tsc`);
  const compiledPath = compileTypeScriptFixture(ts.outPath, fixture.path('compiled'));
  const tsModule = requireFixtureModule(compiledPath);

  return { checked, jsModule, tsModule, js, ts };
}

assert.ok(fs.existsSync(docsPath), 'software-profile examples README must exist');
assert.ok(fs.existsSync(manifestPath), 'software-profile examples manifest must exist');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.profileId, 'proofscript-software-v0');
assert.equal(manifest.checkpoint, 'P5.96-software-executable-examples0');
assert.deepEqual(manifest.examples.map((e: any) => e.file).sort(), [
  'BusinessRules.ps',
  'Collections.ps',
  'SecurityPolicy.ps',
  'StateMachine.ps',
  'Validation.ps',
].sort());

console.error('[software-profile examples] BusinessRules');
const business = assertBuildsBoth(copyExampleFixture('BusinessRules.ps'), 'business-rules');
assert.equal(business.jsModule.discountSmall, 95n);
assert.equal(business.jsModule.discountLarge, 90n);
assert.equal(business.jsModule.clampedUnderflow, 0n);
assert.equal(business.tsModule.discountLarge, 90n);

console.error('[software-profile examples] StateMachine');
const state = assertBuildsBoth(copyExampleFixture('StateMachine.ps'), 'state-machine');
assert.equal(state.jsModule.paidOrder.__psInductive, 'Order');
assert.equal(state.jsModule.paidOrder.fields[0].__psCtor, 1);
assert.equal(state.jsModule.cancelledOrder.fields[0].__psCtor, 3);
assert.equal(state.jsModule.canShipPaid, true);
assert.equal(state.jsModule.canShipNew, false);
assert.equal(state.tsModule.paidOrder.fields[0].__psCtor, 1);

console.error('[software-profile examples] SecurityPolicy');
const policy = assertBuildsBoth(copyExampleFixture('SecurityPolicy.ps'), 'security-policy');
assert.equal(policy.jsModule.adminCanDelete, true);
assert.equal(policy.jsModule.editorCannotDelete, false);
assert.equal(policy.jsModule.viewerCanRead, true);
assert.equal(policy.tsModule.editorCannotDelete, false);

console.error('[software-profile examples] Validation');
const validation = assertBuildsBoth(copyExampleFixture('Validation.ps'), 'validation');
assert.equal(validation.jsModule.validAge.__psInductive, 'Except');
assert.equal(validation.jsModule.validAge.__psCtor, 1);
assert.deepEqual(validation.jsModule.validAge.fields, [42n]);
assert.equal(validation.jsModule.invalidAge.__psCtor, 0);
assert.deepEqual(validation.jsModule.invalidAge.fields, ['too young']);
assert.equal(validation.tsModule.validAge.__psCtor, 1);

console.error('[software-profile examples] Collections');
const collections = assertBuildsBoth(copyExampleFixture('Collections.ps'), 'collections');
assert.deepEqual(listToArray(collections.jsModule.nonZeroList), [1n, 2n, 3n]);
assert.deepEqual(arrayToArray(collections.jsModule.nonZeroArray), [4n, 5n]);
assert.equal(collections.jsModule.firstThree.__psCtor, 1);
assert.deepEqual(collections.jsModule.firstThree.fields, [3n]);
assert.equal(collections.jsModule.anyLarge, true);
assert.deepEqual(arrayToArray(collections.tsModule.nonZeroArray), [4n, 5n]);

const badFeature = createPsliveFixture('proofscript-software-deferred-contract-', {
  fileName: 'DeferredRequires.ps',
  source: 'def bad(x: Nat): Nat requires x > 0 := { x }\n',
});
const rejected = expectPsliveRejected(['check', badFeature.source, '--json']);
assert.match(rejected.message, /ParseError|requires|unexpected|expected|not a function/i, 'deferred contract syntax must not silently compile');

const readme = fs.readFileSync(docsPath, 'utf8');
assert.match(readme, /P5\.96/);
assert.match(readme, /not a full Lean 4 equivalence claim/i);
assert.match(readme, /contracts.*deferred/i);

console.log('PROOFSCRIPT_SOFTWARE_EXECUTABLE_EXAMPLES0=PASS');
