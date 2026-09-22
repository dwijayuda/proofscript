#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runKA16EnvExtensionBridgeGate } from './pskernel-ka16-env-extension-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (p: string) => fs.existsSync(p);
const read = (p: string) => fs.readFileSync(p, 'utf8');
const readJson = (rel: string) => JSON.parse(read(path.join(root, rel)));
function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}
const tail = (s: string) => s.slice(-1200);

export function runKA17EnvLookupBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka12/direct-lean4lean-reference.lean',
    'assurance/ka13/vdecl-wf-bridge.lean',
    'assurance/ka15/env-wf-bridge.lean',
    'assurance/ka16/env-extension-bridge.lean',
    'assurance/ka17/env-lookup-bridge.lean',
    'assurance/ka17/env-lookup-bridge.json',
    'assurance/ka17/obligation-delta.json',
    'assurance/ka17/KA17_RELEASE_GATE.json',
    'assurance/ka17/KA17_REPORT.md',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka17/env-lookup-bridge.json');
  const delta = readJson('assurance/ka17/obligation-delta.json');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.(20|21|2[2-9]|[3-9][0-9])$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(versions.implementation, pkg.version);
  assert.equal(versions.packageVersion, pkg.version);
  assert.equal(versions.proofscriptPublicVersion, pkg.version);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.match(versions.latestLocalLineageCheckpoint, /^proofscript-v1-ka(17|18|19|2[0-9])-/);
  assert.equal(versions.ka17Checkpoint, 'proofscript-v1-ka17-env-lookup-bridge0');
  assert.equal(versions.ka17TrustedSemanticChange, false);
  assert.equal(versions.ka17KernelCodecChange, false);
  assert.equal(versions.ka17NewTrustedComputationRule, false);
  assert.equal(versions.ka17FormalLean4EquivalenceProvenObligations, 9);
  assert.ok(versions.formalLean4EquivalenceProvenObligations >= 9);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-env-lookup-bridge');
  assert.deepEqual(spec.bridgedRelations, ['Lean4Lean.VEnv.constants', 'Lean4Lean.VEnv.defeqs']);
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, 9);
  assert.equal(delta.formalLean4EquivalenceProvenObligations, 9);

  const ka16 = runKA16EnvExtensionBridgeGate({ strict: true });
  const lean4leanRoot = ka16.lean4leanRoot;
  const materialized = ka16.materializedLean;
  assert.ok(lean4leanRoot, 'KA-16 bridge gate did not return a Lean4Lean source root');
  assert.ok(materialized?.leanPath && materialized?.lakePath, 'KA-16 bridge gate did not return materialized Lean/Lake paths');

  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const theoryBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Theory.Typing.Env'], { cwd: lean4leanRoot, env });

  const modules = [
    ['assurance/ka12/direct-lean4lean-reference.lean', 'PSKernelKA12DirectReference.lean'],
    ['assurance/ka13/vdecl-wf-bridge.lean', 'PSKernelKA13VDeclWFBridge.lean'],
    ['assurance/ka15/env-wf-bridge.lean', 'PSKernelKA15EnvWFBridge.lean'],
    ['assurance/ka16/env-extension-bridge.lean', 'PSKernelKA16EnvExtensionBridge.lean'],
    ['assurance/ka17/env-lookup-bridge.lean', 'PSKernelKA17EnvLookupBridge.lean'],
  ] as const;
  for (const [src, dst] of modules) fs.copyFileSync(path.join(root, src), path.join(lean4leanRoot, dst));

  const lib = path.join(lean4leanRoot, '.lake/build/lib/lean');
  fs.mkdirSync(lib, { recursive: true });
  const ka12Compile = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', path.join(lib, 'PSKernelKA12DirectReference.olean'), path.join(lean4leanRoot, 'PSKernelKA12DirectReference.lean')], { cwd: lean4leanRoot, env });
  const ka13Compile = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', path.join(lib, 'PSKernelKA13VDeclWFBridge.olean'), path.join(lean4leanRoot, 'PSKernelKA13VDeclWFBridge.lean')], { cwd: lean4leanRoot, env });
  const ka15Compile = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', path.join(lib, 'PSKernelKA15EnvWFBridge.olean'), path.join(lean4leanRoot, 'PSKernelKA15EnvWFBridge.lean')], { cwd: lean4leanRoot, env });
  const ka16Compile = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', path.join(lib, 'PSKernelKA16EnvExtensionBridge.olean'), path.join(lean4leanRoot, 'PSKernelKA16EnvExtensionBridge.lean')], { cwd: lean4leanRoot, env });
  const bridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', path.join(lean4leanRoot, 'PSKernelKA17EnvLookupBridge.lean')], { cwd: lean4leanRoot, env });

  const blockedReasons: string[] = [];
  if (!ka16.strictBridgeCheckPassed) blockedReasons.push('ka16_env_extension_bridge_not_passed');
  if (theoryBuild.status !== 0) blockedReasons.push('lean4lean_theory_typing_env_build_failed');
  if (ka12Compile.status !== 0) blockedReasons.push('ka12_reference_module_compile_failed');
  if (ka13Compile.status !== 0) blockedReasons.push('ka13_vdecl_wf_bridge_compile_failed');
  if (ka15Compile.status !== 0) blockedReasons.push('ka15_env_wf_bridge_compile_failed');
  if (ka16Compile.status !== 0) blockedReasons.push('ka16_env_extension_bridge_compile_failed');
  if (bridgeCheck.status !== 0) blockedReasons.push('ka17_env_lookup_bridge_check_failed');
  const strictBridgeCheckPassed = blockedReasons.length === 0;

  const result = {
    checkpoint: 'proofscript-v1-ka17-env-lookup-bridge0',
    publicVersion: spec.publicVersion,
    coreFormat: 71,
    certificateFormat: 2,
    baseline: 'proofscript-v1-ka16-env-extension-bridge0',
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    materializedLean: materialized,
    ka16GateCheckpoint: ka16.checkpoint,
    ka16GatePassed: ka16.strictBridgeCheckPassed,
    theoryBuild: { status: theoryBuild.status, stdoutTail: tail(theoryBuild.stdout), stderrTail: tail(theoryBuild.stderr) },
    ka12Compile: { status: ka12Compile.status, stdoutTail: tail(ka12Compile.stdout), stderrTail: tail(ka12Compile.stderr) },
    ka13Compile: { status: ka13Compile.status, stdoutTail: tail(ka13Compile.stdout), stderrTail: tail(ka13Compile.stderr) },
    ka15Compile: { status: ka15Compile.status, stdoutTail: tail(ka15Compile.stdout), stderrTail: tail(ka15Compile.stderr) },
    ka16Compile: { status: ka16Compile.status, stdoutTail: tail(ka16Compile.stdout), stderrTail: tail(ka16Compile.stderr) },
    bridgeCheck: { status: bridgeCheck.status, stdoutTail: tail(bridgeCheck.stdout), stderrTail: tail(bridgeCheck.stderr) },
    actualLean4LeanImportBound: true,
    directLean4LeanEnvLookupBridgeChecked: strictBridgeCheckPassed,
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
    formalLean4EquivalenceProvenObligations: 9,
  };

  if (options.strict && !strictBridgeCheckPassed) {
    const err = new Error(`KA-17 strict env-lookup bridge blocked: ${blockedReasons.join(', ')}`);
    (err as any).result = result;
    throw err;
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA17EnvLookupBridgeGate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
    if (process.argv.includes('--strict') && !result.strictBridgeCheckPassed) process.exit(2);
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message, result: error.result ?? null }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
