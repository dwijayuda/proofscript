#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (p: string) => fs.existsSync(p);
const read = (p: string) => fs.readFileSync(p, 'utf8');
const readJson = (rel: string) => JSON.parse(read(path.join(root, rel)));
function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}
const tail = (s: string) => s.slice(-1600);
const cachedLean4LeanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const cachedLeanBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const cachedLakeBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';
function findCachedLean4Lean() {
  if (exists(path.join(cachedLean4LeanRoot, 'Lean4Lean/Theory/Typing/Env.lean')) &&
      exists(path.join(cachedLean4LeanRoot, 'lakefile.toml')) &&
      exists(cachedLeanBin) && exists(cachedLakeBin)) {
    return { lean4leanRoot: cachedLean4LeanRoot, materialized: { leanPath: cachedLeanBin, lakePath: cachedLakeBin } };
  }
  return null;
}

export function runKA24NonDefEnvNoOverwriteBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka12/direct-lean4lean-reference.lean',
    'assurance/ka13/vdecl-wf-bridge.lean',
    'assurance/ka15/env-wf-bridge.lean',
    'assurance/ka16/env-extension-bridge.lean',
    'assurance/ka17/env-lookup-bridge.lean',
    'assurance/ka18/env-no-overwrite-bridge.lean',
    'assurance/ka19/env-defeq-preservation-bridge.lean',
    'assurance/ka20/nondef-vdecl-wf-bridge.lean',
    'assurance/ka21/nondef-env-wf-bridge.lean',
    'assurance/ka22/nondef-env-extension-bridge.lean',
    'assurance/ka23/nondef-env-lookup-bridge.lean',
    'assurance/ka24/nondef-env-no-overwrite-bridge.lean',
    'assurance/ka24/nondef-env-no-overwrite-bridge.json',
    'assurance/ka24/obligation-delta.json',
    'assurance/ka24/KA24_RELEASE_GATE.json',
    'assurance/ka24/KA24_REPORT.md',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka24/nondef-env-no-overwrite-bridge.json');
  const delta = readJson('assurance/ka24/obligation-delta.json');

  assert.equal(pkg.version, '1.0.0-pskernel.27');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(versions.implementation, pkg.version);
  assert.equal(versions.packageVersion, pkg.version);
  assert.equal(versions.proofscriptPublicVersion, pkg.version);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.latestLocalLineageCheckpoint, 'proofscript-v1-ka24-nondef-env-no-overwrite-bridge0');
  assert.equal(versions.ka24Checkpoint, 'proofscript-v1-ka24-nondef-env-no-overwrite-bridge0');
  assert.equal(versions.ka24TrustedSemanticChange, false);
  assert.equal(versions.ka24KernelCodecChange, false);
  assert.equal(versions.ka24NewTrustedComputationRule, false);
  assert.equal(versions.ka24FormalLean4EquivalenceProvenObligations, 32);
  assert.equal(versions.formalLean4EquivalenceProvenObligations, 32);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-nondef-env-no-overwrite-bridge');
  assert.deepEqual(spec.bridgedRelations, ['Lean4Lean.VEnv.addConst', 'Lean4Lean.VEnv.constants']);
  assert.deepEqual(spec.coveredPSDeclKinds, ['theorem', 'opaque']);
  assert.deepEqual(spec.nonAddingPSDeclKinds, ['example']);
  assert.deepEqual(spec.alreadyCoveredPSDeclKinds, ['axiom', 'definition']);
  assert.deepEqual(spec.conditionalBridgeLemmas, [
    'PSKernelKA24.translated_theorem_fresh_before_add',
    'PSKernelKA24.translated_opaque_fresh_before_add',
    'PSKernelKA24.translated_theorem_preserves_other_lookup',
    'PSKernelKA24.translated_opaque_preserves_other_lookup',
  ]);
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, 32);
  assert.equal(delta.formalLean4EquivalenceProvenObligations, 32);

  const ka23Gate = readJson('assurance/ka23/KA23_RELEASE_GATE.json');
  assert.equal(ka23Gate.checkpoint, 'proofscript-v1-ka23-nondef-env-lookup-bridge0');
  assert.equal(ka23Gate.directLean4LeanNonDefEnvLookupBridge?.directLean4LeanNonDefEnvLookupBridgeChecked, true);
  assert.equal(ka23Gate.claimBoundary?.formalLean4EquivalenceProvenObligations, 28);

  const cached = findCachedLean4Lean();
  assert.ok(cached, 'cached KA-11 offline Lean4Lean build is required for KA-24 strict bridge check');
  const lean4leanRoot = cached.lean4leanRoot;
  const materialized = cached.materialized;

  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const theoryBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Theory.Typing.Env'], { cwd: lean4leanRoot, env });

  const modules = [
    ['assurance/ka12/direct-lean4lean-reference.lean', 'PSKernelKA12DirectReference.lean'],
    ['assurance/ka13/vdecl-wf-bridge.lean', 'PSKernelKA13VDeclWFBridge.lean'],
    ['assurance/ka15/env-wf-bridge.lean', 'PSKernelKA15EnvWFBridge.lean'],
    ['assurance/ka16/env-extension-bridge.lean', 'PSKernelKA16EnvExtensionBridge.lean'],
    ['assurance/ka17/env-lookup-bridge.lean', 'PSKernelKA17EnvLookupBridge.lean'],
    ['assurance/ka18/env-no-overwrite-bridge.lean', 'PSKernelKA18EnvNoOverwriteBridge.lean'],
    ['assurance/ka19/env-defeq-preservation-bridge.lean', 'PSKernelKA19EnvDefEqPreservationBridge.lean'],
    ['assurance/ka20/nondef-vdecl-wf-bridge.lean', 'PSKernelKA20NonDefVDeclWFBridge.lean'],
    ['assurance/ka21/nondef-env-wf-bridge.lean', 'PSKernelKA21NonDefEnvWFBridge.lean'],
    ['assurance/ka22/nondef-env-extension-bridge.lean', 'PSKernelKA22NonDefEnvExtensionBridge.lean'],
    ['assurance/ka23/nondef-env-lookup-bridge.lean', 'PSKernelKA23NonDefEnvLookupBridge.lean'],
    ['assurance/ka24/nondef-env-no-overwrite-bridge.lean', 'PSKernelKA24NonDefEnvNoOverwriteBridge.lean'],
  ] as const;
  for (const [src, dst] of modules) fs.copyFileSync(path.join(root, src), path.join(lean4leanRoot, dst));

  const lib = path.join(lean4leanRoot, '.lake/build/lib/lean');
  fs.mkdirSync(lib, { recursive: true });
  const compiles: Record<string, { status: number; stdoutTail: string; stderrTail: string }> = {};
  for (const [, dst] of modules.slice(0, -1)) {
    const mod = dst.replace(/\.lean$/, '');
    const r = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', path.join(lib, `${mod}.olean`), path.join(lean4leanRoot, dst)], { cwd: lean4leanRoot, env });
    compiles[mod] = { status: r.status, stdoutTail: tail(r.stdout), stderrTail: tail(r.stderr) };
  }
  const bridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', path.join(lean4leanRoot, 'PSKernelKA24NonDefEnvNoOverwriteBridge.lean')], { cwd: lean4leanRoot, env });

  const blockedReasons: string[] = [];
  if (ka23Gate.directLean4LeanNonDefEnvLookupBridge?.directLean4LeanNonDefEnvLookupBridgeChecked !== true) blockedReasons.push('ka23_nondef_env_lookup_bridge_not_passed');
  if (theoryBuild.status !== 0) blockedReasons.push('lean4lean_theory_typing_env_build_failed');
  for (const [mod, r] of Object.entries(compiles)) if (r.status !== 0) blockedReasons.push(`${mod}_compile_failed`);
  if (bridgeCheck.status !== 0) blockedReasons.push('ka24_nondef_env_no_overwrite_bridge_check_failed');
  const strictBridgeCheckPassed = blockedReasons.length === 0;

  const result = {
    checkpoint: 'proofscript-v1-ka24-nondef-env-no-overwrite-bridge0',
    publicVersion: spec.publicVersion,
    coreFormat: 71,
    certificateFormat: 2,
    baseline: 'proofscript-v1-ka23-nondef-env-lookup-bridge0',
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    materializedLean: materialized,
    ka23GateCheckpoint: ka23Gate.checkpoint,
    ka23GatePassed: ka23Gate.directLean4LeanNonDefEnvLookupBridge?.directLean4LeanNonDefEnvLookupBridgeChecked === true,
    theoryBuild: { status: theoryBuild.status, stdoutTail: tail(theoryBuild.stdout), stderrTail: tail(theoryBuild.stderr) },
    compiles,
    bridgeCheck: { status: bridgeCheck.status, stdoutTail: tail(bridgeCheck.stdout), stderrTail: tail(bridgeCheck.stderr) },
    actualLean4LeanImportBound: true,
    directLean4LeanNonDefEnvNoOverwriteBridgeChecked: strictBridgeCheckPassed,
    strictBridgeCheckPassed,
    blockedReasons,
    bridgedRelations: spec.bridgedRelations,
    coveredPSDeclKinds: spec.coveredPSDeclKinds,
    nonAddingPSDeclKinds: spec.nonAddingPSDeclKinds,
    alreadyCoveredPSDeclKinds: spec.alreadyCoveredPSDeclKinds,
    conditionalBridgeLemmas: spec.conditionalBridgeLemmas,
    provenLeanTheoremObligations: delta.provenLeanTheoremObligations,
    stillOpenObligations: delta.stillOpen.length,
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 32,
  };

  if (options.strict && !strictBridgeCheckPassed) {
    const err = new Error(`KA-24 strict nondef env no-overwrite bridge blocked: ${blockedReasons.join(', ')}`);
    (err as any).result = result;
    throw err;
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA24NonDefEnvNoOverwriteBridgeGate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
    if (process.argv.includes('--strict') && !result.strictBridgeCheckPassed) process.exit(2);
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message, result: error.result ?? null }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
