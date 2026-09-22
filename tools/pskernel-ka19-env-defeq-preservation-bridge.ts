#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runKA18EnvNoOverwriteBridgeGate } from './pskernel-ka18-env-no-overwrite-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (p: string) => fs.existsSync(p);
const read = (p: string) => fs.readFileSync(p, 'utf8');
const readJson = (rel: string) => JSON.parse(read(path.join(root, rel)));
function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}
const tail = (s: string) => s.slice(-1200);

export function runKA19EnvDefEqPreservationBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka12/direct-lean4lean-reference.lean',
    'assurance/ka13/vdecl-wf-bridge.lean',
    'assurance/ka15/env-wf-bridge.lean',
    'assurance/ka16/env-extension-bridge.lean',
    'assurance/ka17/env-lookup-bridge.lean',
    'assurance/ka18/env-no-overwrite-bridge.lean',
    'assurance/ka19/env-defeq-preservation-bridge.lean',
    'assurance/ka19/env-defeq-preservation-bridge.json',
    'assurance/ka19/obligation-delta.json',
    'assurance/ka19/KA19_RELEASE_GATE.json',
    'assurance/ka19/KA19_REPORT.md',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka19/env-defeq-preservation-bridge.json');
  const delta = readJson('assurance/ka19/obligation-delta.json');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.(22|2[3-9]|[3-9][0-9])$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(versions.implementation, pkg.version);
  assert.equal(versions.packageVersion, pkg.version);
  assert.equal(versions.proofscriptPublicVersion, pkg.version);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.match(versions.latestLocalLineageCheckpoint, /^proofscript-v1-ka(19|2[0-9])-.*0$/);
  assert.equal(versions.ka19Checkpoint, 'proofscript-v1-ka19-env-defeq-preservation-bridge0');
  assert.equal(versions.ka19TrustedSemanticChange, false);
  assert.equal(versions.ka19KernelCodecChange, false);
  assert.equal(versions.ka19NewTrustedComputationRule, false);
  assert.equal(versions.ka19FormalLean4EquivalenceProvenObligations, 16);
  assert.ok(versions.formalLean4EquivalenceProvenObligations >= 16);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-env-defeq-preservation-bridge');
  assert.deepEqual(spec.bridgedRelations, ['Lean4Lean.VEnv.addConst', 'Lean4Lean.VEnv.addDefEq', 'Lean4Lean.VEnv.defeqs']);
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, 16);
  assert.equal(delta.formalLean4EquivalenceProvenObligations, 16);

  const ka18 = runKA18EnvNoOverwriteBridgeGate({ strict: true });
  const lean4leanRoot = ka18.lean4leanRoot;
  const materialized = ka18.materializedLean;
  assert.ok(lean4leanRoot, 'KA-18 bridge gate did not return a Lean4Lean source root');
  assert.ok(materialized?.leanPath && materialized?.lakePath, 'KA-18 bridge gate did not return materialized Lean/Lake paths');

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
  const bridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', path.join(lean4leanRoot, 'PSKernelKA19EnvDefEqPreservationBridge.lean')], { cwd: lean4leanRoot, env });

  const blockedReasons: string[] = [];
  if (!ka18.strictBridgeCheckPassed) blockedReasons.push('ka18_env_no_overwrite_bridge_not_passed');
  if (theoryBuild.status !== 0) blockedReasons.push('lean4lean_theory_typing_env_build_failed');
  for (const [mod, r] of Object.entries(compiles)) if (r.status !== 0) blockedReasons.push(`${mod}_compile_failed`);
  if (bridgeCheck.status !== 0) blockedReasons.push('ka19_env_defeq_preservation_bridge_check_failed');
  const strictBridgeCheckPassed = blockedReasons.length === 0;

  const result = {
    checkpoint: 'proofscript-v1-ka19-env-defeq-preservation-bridge0',
    publicVersion: spec.publicVersion,
    coreFormat: 71,
    certificateFormat: 2,
    baseline: 'proofscript-v1-ka18-env-no-overwrite-bridge0',
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    materializedLean: materialized,
    ka18GateCheckpoint: ka18.checkpoint,
    ka18GatePassed: ka18.strictBridgeCheckPassed,
    theoryBuild: { status: theoryBuild.status, stdoutTail: tail(theoryBuild.stdout), stderrTail: tail(theoryBuild.stderr) },
    compiles,
    bridgeCheck: { status: bridgeCheck.status, stdoutTail: tail(bridgeCheck.stdout), stderrTail: tail(bridgeCheck.stderr) },
    actualLean4LeanImportBound: true,
    directLean4LeanEnvDefEqPreservationBridgeChecked: strictBridgeCheckPassed,
    strictBridgeCheckPassed,
    blockedReasons,
    bridgedRelations: spec.bridgedRelations,
    dependsOn: spec.dependsOn,
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
    formalLean4EquivalenceProvenObligations: 16,
  };

  if (options.strict && !strictBridgeCheckPassed) {
    const err = new Error(`KA-19 strict env-defeq-preservation bridge blocked: ${blockedReasons.join(', ')}`);
    (err as any).result = result;
    throw err;
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA19EnvDefEqPreservationBridgeGate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
    if (process.argv.includes('--strict') && !result.strictBridgeCheckPassed) process.exit(2);
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message, result: error.result ?? null }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
