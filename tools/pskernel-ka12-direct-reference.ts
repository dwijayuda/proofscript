#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runKA12Gate } from './pskernel-ka12-direct-binding.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (p: string) => fs.existsSync(p);
const read = (p: string) => fs.readFileSync(p, 'utf8');
const readJson = (rel: string) => JSON.parse(read(path.join(root, rel)));
function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

export function runKA12ReferenceGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka12/direct-lean4lean-reference.lean',
    'assurance/ka12/direct-reference-binding.json',
    'assurance/ka12/obligation-delta.json',
    'assurance/ka12/KA12_RELEASE_GATE.json',
    'assurance/ka12/KA12_REPORT.md',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka12/direct-reference-binding.json');
  const delta = readJson('assurance/ka12/obligation-delta.json');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(versions.implementation, pkg.version);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.ok(String(versions.latestLocalLineageCheckpoint).startsWith('proofscript-v1-ka'), 'unexpected KA lineage checkpoint');
  assert.equal(versions.ka12TrustedSemanticChange, false);
  assert.equal(versions.ka12KernelCodecChange, false);
  assert.equal(versions.ka12NewTrustedComputationRule, false);
  assert.equal(versions.ka12FormalLean4EquivalenceProvenObligations, 0);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-reference-types');
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, 0);

  const binding = runKA12Gate({ strict: true });
  const lean4leanRoot = binding.lean4leanRoot;
  const materialized = binding.materializedLean;
  assert.ok(lean4leanRoot, 'KA-12 binding gate did not return a Lean4Lean source root');
  assert.ok(materialized?.leanPath && materialized?.lakePath, 'KA-12 binding gate did not return materialized Lean/Lake paths');

  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const theoryBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Theory.VDecl'], { cwd: lean4leanRoot, env });
  const checkSrc = path.join(lean4leanRoot, 'PSKernelKA12DirectReference.lean');
  fs.copyFileSync(path.join(root, 'assurance/ka12/direct-lean4lean-reference.lean'), checkSrc);
  const directReferenceCheck = run(materialized.lakePath, ['env', materialized.leanPath, checkSrc], { cwd: lean4leanRoot, env });

  const blockedReasons: string[] = [];
  if (!binding.strictDirectImportPassed) blockedReasons.push('ka12_binding_gate_not_passed');
  if (theoryBuild.status !== 0) blockedReasons.push('lean4lean_theory_vdecl_build_failed');
  if (directReferenceCheck.status !== 0) blockedReasons.push('ka12_direct_reference_check_failed');
  const strictReferenceCheckPassed = blockedReasons.length === 0;

  const result = {
    checkpoint: 'proofscript-v1-ka12-direct-lean4lean-reference0',
    publicVersion: pkg.version,
    coreFormat: 71,
    certificateFormat: 2,
    baseline: 'proofscript-v1-ka12-direct-lean4lean-binding0',
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    materializedLean: materialized,
    bindingGateCheckpoint: binding.checkpoint,
    bindingGatePassed: binding.strictDirectImportPassed,
    theoryBuild: { status: theoryBuild.status, stdoutTail: theoryBuild.stdout.slice(-3000), stderrTail: theoryBuild.stderr.slice(-3000) },
    directReferenceCheck: { status: directReferenceCheck.status, stdoutTail: directReferenceCheck.stdout.slice(-3000), stderrTail: directReferenceCheck.stderr.slice(-3000) },
    actualLean4LeanImportBound: binding.actualLean4LeanImportBound,
    directLean4LeanReferenceChecked: directReferenceCheck.status === 0,
    strictReferenceCheckPassed,
    blockedReasons,
    targets: spec.targets,
    coveredPSDeclKinds: spec.coveredPSDeclKinds,
    excludedPSDeclKinds: spec.excludedPSDeclKinds,
    blockedPSExprTags: spec.blockedPSExprTags,
    closedByKA12: spec.closedByKA12.length,
    stillOpenObligations: delta.stillOpen.length,
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 0,
  };

  if (options.strict && !strictReferenceCheckPassed) {
    throw new Error(`KA-12 strict direct Lean4Lean reference did not pass: ${blockedReasons.join(',')}; ${JSON.stringify({ theoryBuild: result.theoryBuild, directReferenceCheck: result.directReferenceCheck }).slice(0, 4000)}`);
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA12ReferenceGate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
