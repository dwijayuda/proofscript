#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tool = path.join(root, 'tools', 'check-canonical-package-docs.ts');

function run(args, cwd = root) {
  return spawnSync(process.execPath, [tool, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(file, value) {
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function minimalManifest() {
  return {
    schemaVersion: 1,
    release: 'fixture',
    trustClaim: {
      label: 'K3-TB trusted-boundary',
      fullyFormalK3: false,
      lean4Equivalent: false,
      formalLean4EquivalenceProvenObligations: 0,
    },
    stablePsc1Path: ['packages/kernel'],
    packages: [{
      path: 'packages/kernel',
      npmName: '@proofscript/kernel',
      tier: 'trusted',
      lifecycle: 'canonical',
      trustBoundary: 'TCB-adjacent kernel checker; no ProofScript package imports allowed.',
      productionRole: 'Checks explicit Core declarations and maintains K3-TB kernel state.',
      allowedDependencies: [],
    }],
  };
}

function validReadme() {
  return `# @proofscript/kernel

## Production Role

Checks explicit Core declarations and maintains K3-TB kernel state.

## Trust Boundary

Tier: trusted
Lifecycle: canonical
Trust boundary: TCB-adjacent kernel checker; no ProofScript package imports allowed.
This package is TCB-adjacent and must not import runtime, backend, product, plugin, bridge, or experimental layers.

## Extension Points

Use the feature promotion gate before changing supported Core behavior.

## Verification

Run npm run test:architecture.

## Non-Claims

This is K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.
`;
}

function writeGuide(tmp) {
  fs.writeFileSync(path.join(tmp, 'docs', 'PRODUCTION_CANONICAL_PACKAGE_GUIDE.md'), `# Canonical Package Guide

## Package Responsibilities

packages/kernel

## How to Add a Feature

Use the feature promotion gate.

## What This Does Not Prove

K3-TB trusted-boundary remains not fully formal K3 and not proven equivalent to Lean 4.
`);
}

function makeFixture({ readme = validReadme(), guide = true } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-canonical-docs-'));
  writeJson(path.join(tmp, 'config', 'package-classification.json'), minimalManifest());
  mkdirp(path.join(tmp, 'packages', 'kernel'));
  writeJson(path.join(tmp, 'packages', 'kernel', 'package.json'), { name: '@proofscript/kernel' });
  if (readme != null) fs.writeFileSync(path.join(tmp, 'packages', 'kernel', 'README.md'), readme);
  if (guide) {
    mkdirp(path.join(tmp, 'docs'));
    writeGuide(tmp);
  }
  return tmp;
}

{
  const result = run(['--json']);
  assert.equal(result.status, 0, `real repository package docs should pass\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.stablePathCount, 14);
  assert.equal(parsed.docsChecked, 14);
  assert.equal(parsed.formalLean4EquivalenceProvenObligations, 0);
}

{
  const tmp = makeFixture();
  const result = run(['--root', tmp, '--json']);
  assert.equal(result.status, 0, `valid fixture should pass\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.equal(JSON.parse(result.stdout).docsChecked, 1);
}

{
  const tmp = makeFixture({ readme: validReadme().replace('## Non-Claims', '## Claims') });
  const result = run(['--root', tmp, '--json']);
  assert.notEqual(result.status, 0, 'fixture missing Non-Claims heading should fail');
  assert.match(result.stdout, /## Non-Claims/);
}

{
  const tmp = makeFixture({ readme: null });
  const result = run(['--root', tmp]);
  assert.notEqual(result.status, 0, 'fixture missing README should fail');
  assert.match(result.stderr, /missing canonical package README/);
}

console.log('✓ canonical package docs tests passed');
