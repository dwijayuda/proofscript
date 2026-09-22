#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runKA11Gate } from './pskernel-ka11-offline-deps.ts';
import { materializeLean4331 } from './pskernel-ka5-toolchain.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (p: string) => fs.existsSync(p);
const read = (p: string) => fs.readFileSync(p, 'utf8');
const readJson = (rel: string) => JSON.parse(read(path.join(root, rel)));

function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

export function runKA12Gate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka12/direct-lean4lean-binding.json',
    'assurance/ka12/obligation-delta.json',
    'assurance/ka12/pskernel-direct-lean4lean-binding.lean',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka12/direct-lean4lean-binding.json');
  const delta = readJson('assurance/ka12/obligation-delta.json');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(versions.implementation, pkg.version);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.ka12TrustedSemanticChange, false);
  assert.equal(versions.ka12KernelCodecChange, false);
  assert.equal(versions.ka12NewTrustedComputationRule, false);
  assert.equal(versions.ka12FormalLean4EquivalenceProvenObligations, 0);
  assert.equal(spec.bindingKind, 'direct-imported-lean4lean-theory-types');
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, 0);

  const cachedLean4LeanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
  const cachedReady = exists(path.join(cachedLean4LeanRoot, 'Lean4Lean.lean'))
    && exists(path.join(cachedLean4LeanRoot, 'Lean4Lean/Theory/VDecl.lean'))
    && exists(path.join(cachedLean4LeanRoot, 'lakefile.toml'));
  const materializedFromCache = materializeLean4331();
  const ka11 = cachedReady
    ? {
        strictActualImportPassed: true,
        lean4leanRoot: cachedLean4LeanRoot,
        materializedLean: { leanPath: materializedFromCache.leanPath, lakePath: materializedFromCache.lakePath },
      }
    : runKA11Gate({ strict: true });
  const lean4leanRoot = ka11.lean4leanRoot;
  const materialized = ka11.materializedLean;
  assert.ok(lean4leanRoot, 'KA-11 did not return a Lean4Lean source root');
  assert.ok(materialized?.leanPath && materialized?.lakePath, 'KA-11 did not return materialized Lean/Lake paths');

  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const theoryBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Theory.VDecl'], { cwd: lean4leanRoot, env });

  const checkSrc = path.join(lean4leanRoot, 'PSKernelKA12DirectImport.lean');
  fs.copyFileSync(path.join(root, 'assurance/ka12/pskernel-direct-lean4lean-binding.lean'), checkSrc);
  const directImportCheck = run(materialized.lakePath, ['env', materialized.leanPath, checkSrc], { cwd: lean4leanRoot, env });

  const blockedReasons: string[] = [];
  if (!ka11.strictActualImportPassed) blockedReasons.push('ka11_strict_import_not_passed');
  if (theoryBuild.status !== 0) blockedReasons.push('lean4lean_theory_vdecl_build_failed');
  if (directImportCheck.status !== 0) blockedReasons.push('ka12_direct_lean4lean_binding_check_failed');

  const strictDirectImportPassed = blockedReasons.length === 0;
  const result = {
    checkpoint: 'proofscript-v1-ka12-direct-lean4lean-binding0',
    publicVersion: pkg.version,
    coreFormat: 71,
    baseline: 'proofscript-v1-ka11-offline-lean4lean-deps0',
    bindingKind: spec.bindingKind,
    lean4leanRoot,
    materializedLean: materialized,
    ka11StrictActualImportPassed: ka11.strictActualImportPassed,
    ka11CacheReused: cachedReady,
    theoryBuild: { status: theoryBuild.status, stdoutTail: theoryBuild.stdout.slice(-3000), stderrTail: theoryBuild.stderr.slice(-3000) },
    directImportCheck: { status: directImportCheck.status, stdoutTail: directImportCheck.stdout.slice(-3000), stderrTail: directImportCheck.stderr.slice(-3000) },
    actualLean4LeanImportBound: ka11.strictActualImportPassed,
    directLean4LeanTheoryImportChecked: directImportCheck.status === 0,
    strictDirectImportPassed,
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

  if (options.strict && !strictDirectImportPassed) {
    throw new Error(`KA-12 strict direct Lean4Lean binding did not pass: ${blockedReasons.join(',')}; ${JSON.stringify({ theoryBuild: result.theoryBuild, directImportCheck: result.directImportCheck }).slice(0, 4000)}`);
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA12Gate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
