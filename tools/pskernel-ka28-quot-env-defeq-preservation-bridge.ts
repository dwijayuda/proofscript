#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (p: string) => fs.existsSync(p);
const read = (p: string) => fs.readFileSync(p, 'utf8');
const readJson = (rel: string) => JSON.parse(read(path.join(root, rel)));
const tail = (s: string) => s.slice(-1600);
function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

const cachedLean4LeanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const cachedLeanBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const cachedLakeBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';
function findCachedLean4Lean() {
  if (exists(path.join(cachedLean4LeanRoot, 'Lean4Lean/Theory/Typing/Env.lean')) &&
      exists(path.join(cachedLean4LeanRoot, 'Lean4Lean/Theory/Typing/QuotLemmas.lean')) &&
      exists(path.join(cachedLean4LeanRoot, 'lakefile.toml')) &&
      exists(cachedLeanBin) && exists(cachedLakeBin)) {
    return { lean4leanRoot: cachedLean4LeanRoot, materialized: { leanPath: cachedLeanBin, lakePath: cachedLakeBin } };
  }
  return null;
}

export function runKA28QuotEnvDefEqPreservationBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka27/quot-env-no-overwrite-bridge.lean',
    'assurance/ka27/quot-env-no-overwrite-bridge.json',
    'assurance/ka27/KA27_RELEASE_GATE.json',
    'assurance/ka28/quot-env-defeq-preservation-bridge.lean',
    'assurance/ka28/quot-env-defeq-preservation-bridge.json',
    'assurance/ka28/obligation-delta.json',
    'assurance/ka28/KA28_RELEASE_GATE.json',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka28/quot-env-defeq-preservation-bridge.json');
  const delta = readJson('assurance/ka28/obligation-delta.json');
  assert.equal(pkg.version, '1.0.0-pskernel.31');
  assert.equal(lock.version, '1.0.0-pskernel.31');
  assert.equal(lock.packages[''].version, '1.0.0-pskernel.31');
  assert.equal(versions.implementation, '1.0.0-pskernel.31');
  assert.equal(versions.packageVersion, '1.0.0-pskernel.31');
  assert.equal(versions.proofscriptPublicVersion, '1.0.0-pskernel.31');
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.certificateFormat, 2);
  assert.equal(versions.latestLocalLineageCheckpoint, 'proofscript-v1-ka28-quot-env-defeq-preservation-bridge0');
  assert.equal(versions.ka28Checkpoint, 'proofscript-v1-ka28-quot-env-defeq-preservation-bridge0');
  assert.equal(versions.ka28TrustedSemanticChange, false);
  assert.equal(versions.ka28KernelCodecChange, false);
  assert.equal(versions.ka28NewTrustedComputationRule, false);
  assert.equal(versions.ka28FormalLean4EquivalenceProvenObligations, 50);
  assert.equal(versions.formalLean4EquivalenceProvenObligations, 50);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-quot-env-defeq-preservation-bridge');
  assert.deepEqual(spec.coveredPSDeclKinds, ['quot']);
  assert.deepEqual(spec.conditionalBridgeLemmas, [
    'PSKernelKA28.translated_quot_preserves_existing_defeq',
    'PSKernelKA28.translated_quot_preserves_existing_and_adds_quot_defeq',
  ]);
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, 50);
  assert.equal(delta.formalLean4EquivalenceProvenObligations, 50);

  const ka27Gate = readJson('assurance/ka27/KA27_RELEASE_GATE.json');
  assert.equal(ka27Gate.checkpoint, 'proofscript-v1-ka27-quot-env-no-overwrite-bridge0');
  assert.equal(ka27Gate.directLean4LeanQuotEnvNoOverwriteBridge?.directLean4LeanQuotEnvNoOverwriteBridgeChecked, true);
  assert.equal(ka27Gate.claimBoundary?.formalLean4EquivalenceProvenObligations, 48);

  const cached = findCachedLean4Lean();
  assert.ok(cached, 'cached KA-11 offline Lean4Lean build is required for KA-28 strict bridge check');
  const lean4leanRoot = cached.lean4leanRoot;
  const materialized = cached.materialized;
  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };

  const theoryBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Theory.Typing.QuotLemmas'], { cwd: lean4leanRoot, env });

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
    ['assurance/ka25/nondef-env-defeq-preservation-bridge.lean', 'PSKernelKA25NonDefEnvDefEqPreservationBridge.lean'],
    ['assurance/ka26/quot-env-bridge.lean', 'PSKernelKA26QuotEnvBridge.lean'],
    ['assurance/ka27/quot-env-no-overwrite-bridge.lean', 'PSKernelKA27QuotEnvNoOverwriteBridge.lean'],
    ['assurance/ka28/quot-env-defeq-preservation-bridge.lean', 'PSKernelKA28QuotEnvDefEqPreservationBridge.lean'],
  ] as const;
  for (const [src, dst] of modules) fs.copyFileSync(path.join(root, src), path.join(lean4leanRoot, dst));

  const lib = path.join(lean4leanRoot, '.lake/build/lib/lean');
  fs.mkdirSync(lib, { recursive: true });
  const finalMod = 'PSKernelKA28QuotEnvDefEqPreservationBridge';
  const finalCompile = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', path.join(lib, `${finalMod}.olean`), path.join(lean4leanRoot, `${finalMod}.lean`)], { cwd: lean4leanRoot, env });
  const bridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', path.join(lean4leanRoot, `${finalMod}.lean`)], { cwd: lean4leanRoot, env });

  const blockedReasons: string[] = [];
  if (ka27Gate.directLean4LeanQuotEnvNoOverwriteBridge?.directLean4LeanQuotEnvNoOverwriteBridgeChecked !== true) blockedReasons.push('ka27_quot_env_no_overwrite_bridge_not_passed');
  if (theoryBuild.status !== 0) blockedReasons.push('lean4lean_theory_typing_quot_lemmas_build_failed');
  if (finalCompile.status !== 0) blockedReasons.push('PSKernelKA28QuotEnvDefEqPreservationBridge_compile_failed');
  if (bridgeCheck.status !== 0) blockedReasons.push('ka28_quot_env_defeq_preservation_bridge_check_failed');
  const strictBridgeCheckPassed = blockedReasons.length === 0;

  const result = {
    checkpoint: 'proofscript-v1-ka28-quot-env-defeq-preservation-bridge0',
    publicVersion: spec.publicVersion,
    coreFormat: 71,
    certificateFormat: 2,
    baseline: 'proofscript-v1-ka27-quot-env-no-overwrite-bridge0',
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    materializedLean: materialized,
    ka27GateCheckpoint: ka27Gate.checkpoint,
    ka27GatePassed: ka27Gate.directLean4LeanQuotEnvNoOverwriteBridge?.directLean4LeanQuotEnvNoOverwriteBridgeChecked === true,
    theoryBuild: { status: theoryBuild.status, stdoutTail: tail(theoryBuild.stdout), stderrTail: tail(theoryBuild.stderr) },
    compiles: { [finalMod]: { status: finalCompile.status, stdoutTail: tail(finalCompile.stdout), stderrTail: tail(finalCompile.stderr) } },
    bridgeCheck: { status: bridgeCheck.status, stdoutTail: tail(bridgeCheck.stdout), stderrTail: tail(bridgeCheck.stderr) },
    actualLean4LeanImportBound: true,
    directLean4LeanQuotEnvDefEqPreservationBridgeChecked: strictBridgeCheckPassed,
    strictBridgeCheckPassed,
    blockedReasons,
    bridgedRelations: spec.bridgedRelations,
    coveredPSDeclKinds: spec.coveredPSDeclKinds,
    conditionalBridgeLemmas: spec.conditionalBridgeLemmas,
    provenLeanTheoremObligations: delta.provenLeanTheoremObligations,
    stillOpenObligations: delta.stillOpen.length,
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    quotientSemanticSoundness: false,
    formalLean4EquivalenceProvenObligations: 50,
  };

  if (options.strict && !strictBridgeCheckPassed) {
    const err = new Error(`KA-28 strict quotient defeq preservation bridge blocked: ${blockedReasons.join(', ')}`);
    (err as any).result = result;
    throw err;
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA28QuotEnvDefEqPreservationBridgeGate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
    if (process.argv.includes('--strict') && !result.strictBridgeCheckPassed) process.exit(2);
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message, result: error.result ?? null }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
