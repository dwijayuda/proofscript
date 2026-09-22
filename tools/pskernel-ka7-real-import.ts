#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { materializeLean4331 } from './pskernel-ka5-toolchain.ts';
import { runKA6Gate } from './pskernel-ka6-reference-binding.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const read = (p: string) => fs.readFileSync(p, 'utf8');
const exists = (p: string) => fs.existsSync(p);

function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout, stderr: r.stderr };
}

function resolveCandidate(candidate: string): string {
  return path.isAbsolute(candidate) ? candidate : path.join(root, candidate);
}

function requiredFilesPresent(sourceRoot: string, required: string[]): string[] {
  return required.filter((rel) => !exists(path.join(sourceRoot, rel)));
}

function readToolchain(sourceRoot: string): string | null {
  const tc = path.join(sourceRoot, 'lean-toolchain');
  return exists(tc) ? read(tc).trim() : null;
}

function discoverSource(manifest: any) {
  const attempted = manifest.sourceDiscoveryCandidates.map((candidate: string) => {
    const resolved = resolveCandidate(candidate);
    const existsCandidate = exists(resolved);
    const missingRequired = existsCandidate ? requiredFilesPresent(resolved, manifest.requiredSourceFiles) : manifest.requiredSourceFiles;
    const leanToolchain = existsCandidate ? readToolchain(resolved) : null;
    const toolchainMatchesTarget = leanToolchain === `leanprover/lean4:v${manifest.targetLeanVersion}`;
    return { candidate, resolved, exists: existsCandidate, missingRequired, leanToolchain, toolchainMatchesTarget };
  });
  const usable = attempted.find((a: any) => a.exists && a.missingRequired.length === 0);
  return { attempted, usable: usable ?? null };
}

function runRealImportCheck(sourceRoot: string, materialized: { leanPath: string; lakePath: string }, manifest: any) {
  const leanToolchain = readToolchain(sourceRoot);
  if (leanToolchain !== `leanprover/lean4:v${manifest.targetLeanVersion}`) {
    return {
      status: 'blocked',
      blockedReason: 'lean4lean_toolchain_mismatch',
      leanToolchain,
      expectedLeanToolchain: `leanprover/lean4:v${manifest.targetLeanVersion}`,
      build: null,
      check: null,
    };
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pskernel-ka7-'));
  const checkFile = path.join(tmp, 'PSKernelKA7Lean4LeanImportCheck.lean');
  fs.copyFileSync(path.join(root, 'assurance/ka7/lean4lean-real-import-check-template.lean'), checkFile);
  const env = { ...process.env, PATH: `${path.dirname(materialized.leanPath)}:${process.env.PATH ?? ''}` };
  const build = run(materialized.lakePath, ['build', 'Lean4Lean'], { cwd: sourceRoot, env });
  if (build.status !== 0) {
    return { status: 'failed', blockedReason: 'lean4lean_lake_build_failed', leanToolchain, build, check: null };
  }
  const check = run(materialized.lakePath, ['env', materialized.leanPath, checkFile], { cwd: sourceRoot, env });
  return {
    status: check.status === 0 ? 'passed' : 'failed',
    blockedReason: check.status === 0 ? null : 'lean4lean_import_check_failed',
    leanToolchain,
    build,
    check,
  };
}

export function runKA7Gate(options: { strict?: boolean; soft?: boolean; importOnly?: boolean } = {}) {
  const required = [
    'assurance/ka7/lean4lean-source-manifest.json',
    'assurance/ka7/obligation-delta.json',
    'assurance/ka7/lean4lean-real-import-check-template.lean',
    'assurance/ka7/KA7_REPORT.md',
    'assurance/ka7/KA7_RELEASE_GATE.json',
  ];
  for (const rel of required) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const manifest = readJson('assurance/ka7/lean4lean-source-manifest.json');
  const delta = readJson('assurance/ka7/obligation-delta.json');
  const release = readJson('assurance/ka7/KA7_RELEASE_GATE.json');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(lock.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(lock.packages[''].version, /^1\.0\.0-pskernel\.\d+$/);
  assert.match(versions.implementation, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.ka7TrustedSemanticChange, false);
  assert.equal(versions.ka7KernelCodecChange, false);
  assert.equal(versions.ka7FormalLean4EquivalenceProvenObligations, 0);
  assert.equal(manifest.schema, 'proofscript.assurance.ka7.lean4lean-source-manifest/v1');
  assert.equal(manifest.targetLeanVersion, '4.33.1');
  assert.equal(manifest.claimBoundary.actualLean4LeanImportBound, false);
  assert.equal(delta.formalLean4EquivalenceProvenObligations, 0);
  assert.equal(release.kernel.coreArtifactFormat, 71);
  assert.equal(release.kernel.trustedSemanticChange, false);

  const ka6 = runKA6Gate({ strict: true });
  assert.equal(ka6.leanCheckedHere, true);
  assert.equal(ka6.actualLean4LeanImportBound, false);

  const discovery = discoverSource(manifest);
  const materialized = materializeLean4331();
  let importCheck: any = null;
  if (discovery.usable) importCheck = runRealImportCheck(discovery.usable.resolved, materialized, manifest);

  const actualLean4LeanSourcePresent = Boolean(discovery.usable);
  const strictActualImportPassed = Boolean(importCheck?.status === 'passed');
  const blockedReason = strictActualImportPassed ? null : (!actualLean4LeanSourcePresent ? 'lean4lean_source_missing' : importCheck?.blockedReason ?? 'lean4lean_import_not_checked');

  const result = {
    checkpoint: 'proofscript-v1-ka7-real-lean4lean-import0',
    publicVersion: pkg.version,
    targetLeanVersion: manifest.targetLeanVersion,
    coreFormat: 71,
    materializedLeanPath: materialized.leanPath,
    sourceDiscovery: discovery,
    actualLean4LeanSourcePresent,
    actualLean4LeanImportBound: strictActualImportPassed,
    strictActualImportPassed,
    blockedReason,
    importCheck,
    ka6CompatibleScaffoldStillChecks: ka6.leanCheckedHere,
    closedByKA7: delta.closedByKA7.length,
    stillOpenObligations: delta.stillOpen.length,
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 0,
  };

  if (options.strict && !strictActualImportPassed) {
    const detail = actualLean4LeanSourcePresent ? importCheck : discovery;
    throw new Error(`KA-7 strict real Lean4Lean import did not pass: ${blockedReason}; ${JSON.stringify(detail).slice(0, 2000)}`);
  }
  if (options.importOnly) return { actualLean4LeanSourcePresent, strictActualImportPassed, blockedReason, importCheck, sourceDiscovery: discovery };
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA7Gate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft'), importOnly: process.argv.includes('--import-only') });
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
