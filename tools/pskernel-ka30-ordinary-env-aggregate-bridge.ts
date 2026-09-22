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
      exists(path.join(cachedLean4LeanRoot, 'lakefile.toml')) &&
      exists(cachedLeanBin) && exists(cachedLakeBin)) {
    return { lean4leanRoot: cachedLean4LeanRoot, materialized: { leanPath: cachedLeanBin, lakePath: cachedLakeBin } };
  }
  return null;
}

export function runKA30OrdinaryEnvAggregateBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka25/nondef-env-defeq-preservation-bridge.lean',
    'assurance/ka25/KA25_RELEASE_GATE.json',
    'assurance/ka29/KA29_RELEASE_GATE.json',
    'assurance/ka30/ordinary-env-aggregate-bridge.lean',
    'assurance/ka30/ordinary-env-aggregate-bridge.json',
    'assurance/ka30/obligation-delta.json',
    'assurance/ka30/KA30_RELEASE_GATE.json',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka30/ordinary-env-aggregate-bridge.json');
  const delta = readJson('assurance/ka30/obligation-delta.json');
  const compatiblePublicVersion = /^1\.0\.0-pskernel\.(33|34)$/;
  assert.match(pkg.version, compatiblePublicVersion);
  assert.match(lock.version, compatiblePublicVersion);
  assert.match(lock.packages[''].version, compatiblePublicVersion);
  assert.match(versions.implementation, compatiblePublicVersion);
  assert.match(versions.packageVersion, compatiblePublicVersion);
  assert.match(versions.proofscriptPublicVersion, compatiblePublicVersion);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.certificateFormat, 2);
  assert.ok(['proofscript-v1-ka30-ordinary-env-aggregate-bridge0', 'proofscript-v1-ka31-example-env-aggregate-bridge0'].includes(versions.latestLocalLineageCheckpoint));
  assert.equal(versions.ka30Checkpoint, 'proofscript-v1-ka30-ordinary-env-aggregate-bridge0');
  assert.equal(versions.ka30TrustedSemanticChange, false);
  assert.equal(versions.ka30KernelCodecChange, false);
  assert.equal(versions.ka30NewTrustedComputationRule, false);
  assert.equal(versions.ka30FormalLean4EquivalenceProvenObligations, 55);
  assert.ok([55, 56].includes(versions.formalLean4EquivalenceProvenObligations));
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-ordinary-env-aggregate-bridge');
  assert.deepEqual(spec.coveredPSDeclKinds, ['axiom', 'definition', 'theorem', 'opaque']);
  assert.deepEqual(spec.conditionalBridgeLemmas, [
    'PSKernelKA30.translated_axiom_env_aggregate_bridge',
    'PSKernelKA30.translated_definition_env_aggregate_bridge',
    'PSKernelKA30.translated_theorem_env_aggregate_bridge',
    'PSKernelKA30.translated_opaque_env_aggregate_bridge',
  ]);
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, 55);
  assert.equal(delta.formalLean4EquivalenceProvenObligations, 55);

  const ka25Gate = readJson('assurance/ka25/KA25_RELEASE_GATE.json');
  const ka29Gate = readJson('assurance/ka29/KA29_RELEASE_GATE.json');
  assert.equal(ka25Gate.checkpoint, 'proofscript-v1-ka25-nondef-env-defeq-preservation-bridge0');
  assert.equal(ka29Gate.checkpoint, 'proofscript-v1-ka29-quot-env-aggregate-bridge0');
  assert.equal(ka29Gate.claimBoundary?.formalLean4EquivalenceProvenObligations, 51);

  const cached = findCachedLean4Lean();
  assert.ok(cached, 'cached KA-11 offline Lean4Lean build is required for KA-30 strict bridge check');
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
    ['assurance/ka25/nondef-env-defeq-preservation-bridge.lean', 'PSKernelKA25NonDefEnvDefEqPreservationBridge.lean'],
    ['assurance/ka30/ordinary-env-aggregate-bridge.lean', 'PSKernelKA30OrdinaryEnvAggregateBridge.lean'],
  ] as const;
  for (const [src, dst] of modules) fs.copyFileSync(path.join(root, src), path.join(lean4leanRoot, dst));

  const lib = path.join(lean4leanRoot, '.lake/build/lib/lean');
  fs.mkdirSync(lib, { recursive: true });
  const finalMod = 'PSKernelKA30OrdinaryEnvAggregateBridge';
  const finalCompile = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', path.join(lib, `${finalMod}.olean`), path.join(lean4leanRoot, `${finalMod}.lean`)], { cwd: lean4leanRoot, env });
  const bridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', path.join(lean4leanRoot, `${finalMod}.lean`)], { cwd: lean4leanRoot, env });

  const blockedReasons: string[] = [];
  if (theoryBuild.status !== 0) blockedReasons.push('lean4lean_theory_typing_env_build_failed');
  if (finalCompile.status !== 0) blockedReasons.push('PSKernelKA30OrdinaryEnvAggregateBridge_compile_failed');
  if (bridgeCheck.status !== 0) blockedReasons.push('ka30_ordinary_env_aggregate_bridge_check_failed');
  const strictBridgeCheckPassed = blockedReasons.length === 0;

  const result = {
    checkpoint: 'proofscript-v1-ka30-ordinary-env-aggregate-bridge0',
    publicVersion: spec.publicVersion,
    coreFormat: 71,
    certificateFormat: 2,
    baseline: 'proofscript-v1-ka29-quot-env-aggregate-bridge0',
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    materializedLean: materialized,
    ka25GateCheckpoint: ka25Gate.checkpoint,
    ka29GateCheckpoint: ka29Gate.checkpoint,
    theoryBuild: { status: theoryBuild.status, stdoutTail: tail(theoryBuild.stdout), stderrTail: tail(theoryBuild.stderr) },
    compiles: { [finalMod]: { status: finalCompile.status, stdoutTail: tail(finalCompile.stdout), stderrTail: tail(finalCompile.stderr) } },
    bridgeCheck: { status: bridgeCheck.status, stdoutTail: tail(bridgeCheck.stdout), stderrTail: tail(bridgeCheck.stderr) },
    actualLean4LeanImportBound: true,
    directLean4LeanOrdinaryEnvAggregateBridgeChecked: strictBridgeCheckPassed,
    strictBridgeCheckPassed,
    blockedReasons,
    bridgedRelations: spec.bridgedRelations,
    coveredPSDeclKinds: spec.coveredPSDeclKinds,
    explicitlyNotReopenedHere: spec.explicitlyNotReopenedHere,
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
    formalLean4EquivalenceProvenObligations: 55,
  };

  if (options.strict && !strictBridgeCheckPassed) {
    const err = new Error(`KA-30 strict ordinary aggregate bridge blocked: ${blockedReasons.join(', ')}`);
    (err as any).result = result;
    throw err;
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA30OrdinaryEnvAggregateBridgeGate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
    if (process.argv.includes('--strict') && !result.strictBridgeCheckPassed) process.exit(2);
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message, result: error.result ?? null }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
