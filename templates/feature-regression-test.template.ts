#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createPsliveFixture, buildJsFixture, buildTsFixture, compileTypeScriptFixture } from './pslive-test-harness.ts';

const fixture = createPsliveFixture('ps-feature-name-');
fixture.write('feature.ps', `
-- add focused ProofScript source here
`);

// RED expectation: run this before implementation and confirm it fails for the intended reason.
// GREEN expectation: after implementation, JS and TS behavior should match the checked Core semantics.
const js = buildJsFixture(fixture, 'feature.ps');
const mod = fixture.requireModule(js.outFile);
assert.ok(mod);

const ts = buildTsFixture(fixture, 'feature.ps');
compileTypeScriptFixture(fixture, ts.outFile);

console.log('✓ feature regression template smoke passed');
