#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runKA15EnvWFBridgeGate } from './pskernel-ka15-env-wf-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (p: string) => fs.existsSync(p);
const read = (p: string) => fs.readFileSync(p, 'utf8');
const readJson = (rel: string) => JSON.parse(read(path.join(root, rel)));
function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}
const tail = (s: string) => s.slice(-1200);

export function runKA16EnvExtensionBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka12/direct-lean4lean-reference.lean',
    'assurance/ka13/vdecl-wf-bridge.lean',
    'assurance/ka15/env-wf-bridge.lean',
    'assurance/ka16/env-extension-bridge.lean',
    'assurance/ka16/env-extension-bridge.json',
    'assurance/ka16/obligation-delta.json',
    'assurance/ka16/KA16_RELEASE_GATE.json',
    'assurance/ka16/KA16_REPORT.md',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka16/env-extension-bridge.json');
  const delta = readJson('assurance/ka16/obligation-delta.json');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(versions.implementation, pkg.version);
  assert.equal(versions.packageVersion, pkg.version);
  assert.equal(versions.proofscriptPublicVersion, pkg.version);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.ka16Checkpoint, 'proofscript-v1-ka16-env-extension-bridge0');
  assert.equal(versions.ka16TrustedSemanticChange, false);
  assert.equal(versions.ka16KernelCodecChange, false);
  assert.equal(versions.ka16NewTrustedComputationRule, false);
  assert.equal(versions.ka16FormalLean4EquivalenceProvenObligations, 6);
  assert.ok(versions.formalLean4EquivalenceProvenObligations >= 6);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-env-extension-bridge');
  assert.equal(spec.bridgedRelation, 'Lean4Lean.VEnv.LE');
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, 6);
  assert.equal(delta.formalLean4EquivalenceProvenObligations, 6);

  const ka15 = runKA15EnvWFBridgeGate({ strict: true });
  const lean4leanRoot = ka15.lean4leanRoot;
  const materialized = ka15.materializedLean;
  assert.ok(lean4leanRoot, 'KA-15 bridge gate did not return a Lean4Lean source root');
  assert.ok(materialized?.leanPath && materialized?.lakePath, 'KA-15 bridge gate did not return materialized Lean/Lake paths');

  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const theoryBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Theory.Typing.Env'], { cwd: lean4leanRoot, env });

  const modules = [
    ['assurance/ka12/direct-lean4lean-reference.lean', 'PSKernelKA12DirectReference.lean'],
    ['assurance/ka13/vdecl-wf-bridge.lean', 'PSKernelKA13VDeclWFBridge.lean'],
    ['assurance/ka15/env-wf-bridge.lean', 'PSKernelKA15EnvWFBridge.lean'],
    ['assurance/ka16/env-extension-bridge.lean', 'PSKernelKA16EnvExtensionBridge.lean'],
  ] as const;
  for (const [src, dst] of modules) fs.copyFileSync(path.join(root, src), path.join(lean4leanRoot, dst));

  const lib = path.join(lean4leanRoot, '.lake/build/lib/lean');
  fs.mkdirSync(lib, { recursive: true });
  const ka12Compile = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', path.join(lib, 'PSKernelKA12DirectReference.olean'), path.join(lean4leanRoot, 'PSKernelKA12DirectReference.lean')], { cwd: lean4leanRoot, env });
  const ka13Compile = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', path.join(lib, 'PSKernelKA13VDeclWFBridge.olean'), path.join(lean4leanRoot, 'PSKernelKA13VDeclWFBridge.lean')], { cwd: lean4leanRoot, env });
  const ka15Compile = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', path.join(lib, 'PSKernelKA15EnvWFBridge.olean'), path.join(lean4leanRoot, 'PSKernelKA15EnvWFBridge.lean')], { cwd: lean4leanRoot, env });
  const bridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', path.join(lean4leanRoot, 'PSKernelKA16EnvExtensionBridge.lean')], { cwd: lean4leanRoot, env });

  const blockedReasons: string[] = [];
  if (!ka15.strictBridgeCheckPassed) blockedReasons.push('ka15_env_wf_bridge_not_passed');
  if (theoryBuild.status !== 0) blockedReasons.push('lean4lean_theory_typing_env_build_failed');
  if (ka12Compile.status !== 0) blockedReasons.push('ka12_reference_module_compile_failed');
  if (ka13Compile.status !== 0) blockedReasons.push('ka13_vdecl_wf_bridge_compile_failed');
  if (ka15Compile.status !== 0) blockedReasons.push('ka15_env_wf_bridge_compile_failed');
  if (bridgeCheck.status !== 0) blockedReasons.push('ka16_env_extension_bridge_check_failed');
  const strictBridgeCheckPassed = blockedReasons.length === 0;

  const result = {
    checkpoint: 'proofscript-v1-ka16-env-extension-bridge0',
    publicVersion: spec.publicVersion,
    coreFormat: 71,
    certificateFormat: 2,
    baseline: 'proofscript-v1-ka15-env-wf-bridge0',
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    materializedLean: materialized,
    ka15GateCheckpoint: ka15.checkpoint,
    ka15GatePassed: ka15.strictBridgeCheckPassed,
    theoryBuild: { status: theoryBuild.status, stdoutTail: tail(theoryBuild.stdout), stderrTail: tail(theoryBuild.stderr) },
    ka12Compile: { status: ka12Compile.status, stdoutTail: tail(ka12Compile.stdout), stderrTail: tail(ka12Compile.stderr) },
    ka13Compile: { status: ka13Compile.status, stdoutTail: tail(ka13Compile.stdout), stderrTail: tail(ka13Compile.stderr) },
    ka15Compile: { status: ka15Compile.status, stdoutTail: tail(ka15Compile.stdout), stderrTail: tail(ka15Compile.stderr) },
    bridgeCheck: { status: bridgeCheck.status, stdoutTail: tail(bridgeCheck.stdout), stderrTail: tail(bridgeCheck.stderr) },
    actualLean4LeanImportBound: true,
    directLean4LeanEnvExtensionBridgeChecked: strictBridgeCheckPassed,
    strictBridgeCheckPassed,
    blockedReasons,
    bridgedRelation: spec.bridgedRelation,
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
    formalLean4EquivalenceProvenObligations: 6,
  };

  if (options.strict && !strictBridgeCheckPassed) {
    const err = new Error(`KA-16 strict env-extension bridge blocked: ${blockedReasons.join(', ')}`);
    (err as any).result = result;
    throw err;
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA16EnvExtensionBridgeGate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
    if (process.argv.includes('--strict') && !result.strictBridgeCheckPassed) process.exit(2);
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message, result: error.result ?? null }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
