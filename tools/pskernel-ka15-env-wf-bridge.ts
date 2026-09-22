#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runKA13BridgeGate } from './pskernel-ka13-vdecl-wf-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (p: string) => fs.existsSync(p);
const read = (p: string) => fs.readFileSync(p, 'utf8');
const readJson = (rel: string) => JSON.parse(read(path.join(root, rel)));
function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

export function runKA15EnvWFBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka12/direct-lean4lean-reference.lean',
    'assurance/ka13/vdecl-wf-bridge.lean',
    'assurance/ka15/env-wf-bridge.lean',
    'assurance/ka15/env-wf-bridge.json',
    'assurance/ka15/obligation-delta.json',
    'assurance/ka15/KA15_RELEASE_GATE.json',
    'assurance/ka15/KA15_REPORT.md',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka15/env-wf-bridge.json');
  const delta = readJson('assurance/ka15/obligation-delta.json');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(versions.implementation, pkg.version);
  assert.equal(versions.packageVersion, pkg.version);
  assert.equal(versions.proofscriptPublicVersion, pkg.version);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.ok(String(versions.latestLocalLineageCheckpoint).startsWith('proofscript-v1-ka'), 'unexpected KA lineage checkpoint');
  assert.equal(versions.ka15Checkpoint, 'proofscript-v1-ka15-env-wf-bridge0');
  assert.equal(versions.ka15TrustedSemanticChange, false);
  assert.equal(versions.ka15KernelCodecChange, false);
  assert.equal(versions.ka15NewTrustedComputationRule, false);
  assert.equal(versions.ka15FormalLean4EquivalenceProvenObligations, 4);
  assert.ok(Number(versions.formalLean4EquivalenceProvenObligations) >= 4);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-env-wf-bridge');
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, 4);
  assert.equal(delta.formalLean4EquivalenceProvenObligations, 4);

  const ka13 = runKA13BridgeGate({ strict: true });
  const lean4leanRoot = ka13.lean4leanRoot;
  const materialized = ka13.materializedLean;
  assert.ok(lean4leanRoot, 'KA-13 bridge gate did not return a Lean4Lean source root');
  assert.ok(materialized?.leanPath && materialized?.lakePath, 'KA-13 bridge gate did not return materialized Lean/Lake paths');

  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const theoryBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Theory.Typing.Env'], { cwd: lean4leanRoot, env });

  const ka12Module = path.join(lean4leanRoot, 'PSKernelKA12DirectReference.lean');
  const ka12Olean = path.join(lean4leanRoot, '.lake/build/lib/lean/PSKernelKA12DirectReference.olean');
  const ka13Module = path.join(lean4leanRoot, 'PSKernelKA13VDeclWFBridge.lean');
  const ka13Olean = path.join(lean4leanRoot, '.lake/build/lib/lean/PSKernelKA13VDeclWFBridge.olean');
  const ka15Module = path.join(lean4leanRoot, 'PSKernelKA15EnvWFBridge.lean');

  fs.copyFileSync(path.join(root, 'assurance/ka12/direct-lean4lean-reference.lean'), ka12Module);
  fs.copyFileSync(path.join(root, 'assurance/ka13/vdecl-wf-bridge.lean'), ka13Module);
  fs.copyFileSync(path.join(root, 'assurance/ka15/env-wf-bridge.lean'), ka15Module);
  fs.mkdirSync(path.dirname(ka12Olean), { recursive: true });

  const ka12Compile = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', ka12Olean, ka12Module], { cwd: lean4leanRoot, env });
  const ka13Compile = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', ka13Olean, ka13Module], { cwd: lean4leanRoot, env });
  const bridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', ka15Module], { cwd: lean4leanRoot, env });

  const blockedReasons: string[] = [];
  if (!ka13.strictBridgeCheckPassed) blockedReasons.push('ka13_vdecl_wf_bridge_not_passed');
  if (theoryBuild.status !== 0) blockedReasons.push('lean4lean_theory_typing_env_build_failed');
  if (ka12Compile.status !== 0) blockedReasons.push('ka12_reference_module_compile_failed');
  if (ka13Compile.status !== 0) blockedReasons.push('ka13_vdecl_wf_bridge_compile_failed');
  if (bridgeCheck.status !== 0) blockedReasons.push('ka15_env_wf_bridge_check_failed');
  const strictBridgeCheckPassed = blockedReasons.length === 0;

  const result = {
    checkpoint: 'proofscript-v1-ka15-env-wf-bridge0',
    publicVersion: spec.publicVersion,
    coreFormat: 71,
    certificateFormat: 2,
    baseline: 'proofscript-v1-ka14-real-arena-corpus0',
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    materializedLean: materialized,
    ka13GateCheckpoint: ka13.checkpoint,
    ka13GatePassed: ka13.strictBridgeCheckPassed,
    theoryBuild: { status: theoryBuild.status, stdoutTail: theoryBuild.stdout.slice(-3000), stderrTail: theoryBuild.stderr.slice(-3000) },
    ka12Compile: { status: ka12Compile.status, stdoutTail: ka12Compile.stdout.slice(-3000), stderrTail: ka12Compile.stderr.slice(-3000) },
    ka13Compile: { status: ka13Compile.status, stdoutTail: ka13Compile.stdout.slice(-3000), stderrTail: ka13Compile.stderr.slice(-3000) },
    bridgeCheck: { status: bridgeCheck.status, stdoutTail: bridgeCheck.stdout.slice(-3000), stderrTail: bridgeCheck.stderr.slice(-3000) },
    actualLean4LeanImportBound: ka13.actualLean4LeanImportBound,
    directLean4LeanEnvWFBridgeChecked: bridgeCheck.status === 0,
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
    formalLean4EquivalenceProvenObligations: 4,
  };

  if (options.strict && !strictBridgeCheckPassed) {
    throw new Error(`KA-15 strict VEnv.WF bridge did not pass: ${blockedReasons.join(',')}; ${JSON.stringify({ theoryBuild: result.theoryBuild, ka12Compile: result.ka12Compile, ka13Compile: result.ka13Compile, bridgeCheck: result.bridgeCheck }).slice(0, 4000)}`);
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA15EnvWFBridgeGate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
