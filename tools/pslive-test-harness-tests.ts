#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createPsliveFixture,
  runPsliveJson,
  buildJsFixture,
  buildTsFixture,
  compileTypeScriptFixture,
  requireFixtureModule,
  expectPsliveRejected,
} from './pslive-test-harness.ts';

const fixture = createPsliveFixture('proofscript-pslive-harness-', {
  fileName: 'Harness.ps',
  source: `
function double(x: Nat): Nat := { x * 2 }
def six: Nat := { double 3 }
def choose: Nat := { if true && false then 1 else 2 }
theorem six_eq: six = 6 := by rfl
`,
});

assert.ok(fs.existsSync(fixture.source), 'fixture writes source file');
assert.equal(path.basename(fixture.source), 'Harness.ps');

const checked = runPsliveJson(['check', fixture.source, '--json']);
assert.equal(checked.status, 'accepted');
assert.ok(checked.userDeclarations.some(d => d.name === 'six'));

const builtJs = buildJsFixture(fixture, 'harness.js');
assert.equal(builtJs.result.status, 'accepted');
assert.equal(builtJs.result.target, 'js');
const jsModule = requireFixtureModule(builtJs.outPath);
assert.equal(jsModule.six, 6n);
assert.equal(jsModule.choose, 2n);

const builtTs = buildTsFixture(fixture, 'harness.ts');
assert.equal(builtTs.result.status, 'accepted');
assert.equal(builtTs.result.target, 'ts');
const compiledPath = compileTypeScriptFixture(builtTs.outPath, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledPath);
assert.equal(compiled.six, 6n);
assert.equal(compiled.choose, 2n);

const rejectedSource = fixture.write('Rejected.ps', 'def bad: Nat := { true + 1 }\n');
const rejected = expectPsliveRejected(['check', rejectedSource, '--json']);
assert.equal(rejected.status, 'rejected');
assert.match(rejected.message, /expected type|argument|literal/i);

console.log('PSLIVE_TEST_HARNESS=PASS');
