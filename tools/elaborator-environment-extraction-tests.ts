#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createPsliveFixture, runPsliveJson, buildJsFixture, requireFixtureModule } from './pslive-test-harness.ts';

const root = process.cwd();
const envSrc = path.join(root, 'packages/elaborator/src/globalEnvironment.ts');
const utilsSrc = path.join(root, 'packages/elaborator/src/coreUtils.ts');
const indexSrc = path.join(root, 'packages/elaborator/src/index.ts');
const termElaborationSrc = path.join(root, 'packages/elaborator/src/termElaboration.ts');

assert.ok(fs.existsSync(envSrc), 'global environment/name resolution must be extracted to packages/elaborator/src/globalEnvironment.ts');
assert.ok(fs.existsSync(utilsSrc), 'shared Core utility helpers must be extracted to packages/elaborator/src/coreUtils.ts');

const env = fs.readFileSync(envSrc, 'utf8');
for (const name of ['InitialGlobalInfo', 'GlobalInfo', 'syncGlobals', 'qualifyDeclarationName', 'namespaceCandidates', 'resolveGlobalName', 'inferElaborationHeadType']) {
  assert.match(env, new RegExp(`export (?:interface|type|function) ${name}\\b`), `globalEnvironment.ts must export ${name}`);
}
assert.match(env, /Lean resolution gives current\/parent non-root namespaces precedence over opens/, 'name resolution precedence comment must live with extracted resolver');
assert.match(env, /pending declaration/, 'pending declaration fallback must live with extracted resolver');

const utils = fs.readFileSync(utilsSrc, 'utf8');
for (const name of ['contextFromTypes', 'flattenCoreApps', 'splitCorePi', 'splitCorePiDomains', 'containsAnyBVar']) {
  assert.match(utils, new RegExp(`export function ${name}\\b`), `coreUtils.ts must export ${name}`);
}

assert.ok(fs.existsSync(termElaborationSrc), 'term dispatcher must be extracted to packages/elaborator/src/termElaboration.ts');
const dispatcher = fs.readFileSync(indexSrc, 'utf8') + '\n' + fs.readFileSync(termElaborationSrc, 'utf8');
const index = dispatcher;
assert.match(dispatcher, /from "\.\/globalEnvironment"/, 'public elaborator wiring/dispatcher must import global environment helpers');
assert.match(dispatcher, /from "\.\/coreUtils"/, 'term dispatcher must import shared Core helpers');
assert.doesNotMatch(index, /function syncGlobals\(/, 'elaborator index must not keep inline syncGlobals');
assert.doesNotMatch(index, /function namespaceCandidates\(/, 'elaborator index must not keep inline namespaceCandidates');
assert.doesNotMatch(index, /function resolveGlobalName\(/, 'elaborator index must not keep inline resolveGlobalName');
assert.doesNotMatch(index, /function inferElaborationHeadType\(/, 'elaborator index must not keep inline inferElaborationHeadType');
assert.doesNotMatch(index, /function contextFromTypes\(/, 'elaborator index must not keep inline contextFromTypes');
assert.doesNotMatch(index, /function flattenCoreApps\(/, 'elaborator index must not keep inline flattenCoreApps');

const fixture = createPsliveFixture('proofscript-elab-env-extraction-', {
  source: `
namespace A {
  def x: Nat := { 1 }
  namespace B {
    def y: Nat := { x + 2 }
  }
}

namespace C {
  def x: Nat := { 10 }
}

open A.B;
def opened: Nat := { y }

def qualified: Nat := { A.x + C.x }

def localShadow(x: Nat): Nat := { x + A.x }

structure Pair where {
  left: Nat;
  right: Nat;
}

def pairValue: Pair := { { left := opened, right := qualified } }
def projected: Nat := { pairValue.left }

theorem opened_rfl: opened = 3 := by rfl
theorem qualified_rfl: qualified = 11 := by rfl
theorem local_shadow_rfl: localShadow 5 = 6 := by rfl
theorem projected_rfl: projected = 3 := by rfl
`,
});
const checked = runPsliveJson(['check', fixture.source, '--json']);
assert.equal(checked.status, 'accepted');
for (const name of ['A.x', 'A.B.y', 'opened', 'qualified', 'localShadow', 'projected', 'opened_rfl', 'local_shadow_rfl']) {
  assert.ok(checked.userDeclarations.some(d => d.name === name), `expected declaration ${name}`);
}
const built = buildJsFixture(fixture, 'env-extraction.js');
const mod = requireFixtureModule(built.outPath);
assert.equal(mod.opened, 3n);
assert.equal(mod.qualified, 11n);
assert.equal(mod.localShadow(5n), 6n);
assert.equal(mod.projected, 3n);

const bad = fixture.write('BadSiblingLeak.ps', `
namespace Left { def hidden: Nat := { 0 } }
namespace Right { def leak: Nat := { hidden } }
`);
const rejected = runPsliveJson(['check', bad, '--json'], 1);
assert.equal(rejected.status, 'rejected');
assert.match(rejected.message, /unknown identifier: hidden/);

console.log('ELABORATOR_ENVIRONMENT_EXTRACTION=PASS');
