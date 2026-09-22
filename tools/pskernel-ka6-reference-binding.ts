#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { materializeLean4331 } from './pskernel-ka5-toolchain.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

function run(cmd: string, args: string[], cwd = root) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout, stderr: r.stderr };
}

export function runKA6Gate(options: { strict?: boolean, leanOnly?: boolean } = {}) {
  const required = [
    'assurance/ka6/lean4lean-compatible-binding.lean',
    'assurance/ka6/lean4lean-reference-binding.json',
    'assurance/ka6/obligation-delta.json',
    'assurance/ka6/KA6_REPORT.md',
    'assurance/ka6/KA6_RELEASE_GATE.json',
  ];
  for (const rel of required) assert.ok(exists(rel), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const binding = readJson('assurance/ka6/lean4lean-reference-binding.json');
  const delta = readJson('assurance/ka6/obligation-delta.json');
  const release = readJson('assurance/ka6/KA6_RELEASE_GATE.json');
  const leanSource = read('assurance/ka6/lean4lean-compatible-binding.lean');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(versions.implementation, pkg.version);
  assert.equal(versions.proofscriptPublicVersion, pkg.version);
  assert.ok(String(versions.latestLocalLineageCheckpoint).startsWith('proofscript-v1-ka'));
  assert.equal(versions.defaultKernelCoreFormat, 71);
  assert.equal(versions.ka6TrustedSemanticChange, false);
  assert.equal(versions.ka6KernelCodecChange, false);
  assert.equal(versions.ka6NewTrustedComputationRule, false);
  assert.equal(versions.ka6Lean4LeanImportBound, false);
  assert.equal(versions.ka6FormalLean4EquivalenceProvenObligations, 0);
  assert.equal(versions.fullLean4Equivalence, false);

  assert.equal(binding.schema, 'proofscript.assurance.ka6.lean4lean-reference-binding/v1');
  assert.match(binding.publicVersion, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(binding.bindingKind, 'lean4lean-compatible-reference-interface');
  assert.equal(binding.actualLean4LeanImportBound, false);
  assert.equal(binding.claimBoundary.fullLean4Equivalence, false);
  assert.equal(binding.claimBoundary.formalLean4EquivalenceProvenObligations, 0);
  assert.ok(binding.closedByKA6.length >= 5);
  assert.ok(binding.stillOpen.includes('soundness.imported-Lean4Lean-binding'));
  assert.equal(delta.schema, 'proofscript.assurance.ka6.obligation-delta/v1');
  assert.equal(delta.formalLean4EquivalenceProvenObligations, 0);
  assert.equal(release.kernel.coreArtifactFormat, 71);
  assert.equal(release.claimBoundary.trustedKernelSemanticChange, false);
  assert.equal(release.claimBoundary.actualLean4LeanImportBound, false);

  assert.match(leanSource, /namespace PSKernelKA6/);
  assert.match(leanSource, /namespace Lean4LeanCompat/);
  assert.match(leanSource, /inductive AcceptsNonInductiveShape/);
  assert.match(leanSource, /theorem translated_decl_shape_sound/);
  assert.match(leanSource, /theorem translated_decl_value_policy/);
  assert.doesNotMatch(leanSource, /\bsorry\b/);
  assert.doesNotMatch(leanSource, /\badmit\b/);

  const materialized = materializeLean4331();
  const leanFile = path.join(root, 'assurance/ka6/lean4lean-compatible-binding.lean');
  const leanRun = run(materialized.leanPath, [leanFile]);
  const leanCheckedHere = leanRun.status === 0;
  if (options.strict) assert.equal(leanCheckedHere, true, leanRun.stderr || leanRun.stdout || 'Lean KA-6 check failed');

  const result = {
    checkpoint: 'proofscript-v1-ka6-lean4lean-binding0',
    publicVersion: pkg.version,
    targetLeanVersion: '4.33.1',
    coreFormat: 71,
    materializedLeanPath: materialized.leanPath,
    leanCheckedHere,
    leanRun,
    bindingKind: binding.bindingKind,
    actualLean4LeanImportBound: false,
    closedMachineCheckedScaffoldObligations: binding.closedByKA6.length,
    stillOpenObligations: binding.stillOpen.length,
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 0,
  };

  if (options.leanOnly) {
    return { leanCheckedHere, leanRun, materializedLeanPath: materialized.leanPath };
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const strict = process.argv.includes('--strict');
    const leanOnly = process.argv.includes('--lean-only');
    const result = runKA6Gate({ strict, leanOnly });
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
