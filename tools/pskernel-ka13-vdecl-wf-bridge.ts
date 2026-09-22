#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runKA12ReferenceGate } from './pskernel-ka12-direct-reference.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (p: string) => fs.existsSync(p);
const read = (p: string) => fs.readFileSync(p, 'utf8');
const readJson = (rel: string) => JSON.parse(read(path.join(root, rel)));
function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

export function runKA13BridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka12/direct-lean4lean-reference.lean',
    'assurance/ka13/vdecl-wf-bridge.lean',
    'assurance/ka13/vdecl-wf-bridge.json',
    'assurance/ka13/obligation-delta.json',
    'assurance/ka13/KA13_RELEASE_GATE.json',
    'assurance/ka13/KA13_REPORT.md',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka13/vdecl-wf-bridge.json');
  const delta = readJson('assurance/ka13/obligation-delta.json');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(versions.implementation, pkg.version);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.ok(String(versions.latestLocalLineageCheckpoint).startsWith('proofscript-v1-ka'));
  assert.equal(versions.ka13Checkpoint, 'proofscript-v1-ka13-vdecl-wf-bridge0');
  assert.equal(versions.ka13TrustedSemanticChange, false);
  assert.equal(versions.ka13KernelCodecChange, false);
  assert.equal(versions.ka13NewTrustedComputationRule, false);
  assert.equal(versions.ka13FormalLean4EquivalenceProvenObligations, 2);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-vdecl-wf-bridge');
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, 2);

  const ka12 = runKA12ReferenceGate({ strict: true });
  const lean4leanRoot = ka12.lean4leanRoot;
  const materialized = ka12.materializedLean;
  assert.ok(lean4leanRoot, 'KA-12 reference gate did not return a Lean4Lean source root');
  assert.ok(materialized?.leanPath && materialized?.lakePath, 'KA-12 reference gate did not return materialized Lean/Lake paths');

  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const theoryBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Theory.Typing.Env'], { cwd: lean4leanRoot, env });

  const ka12Module = path.join(lean4leanRoot, 'PSKernelKA12DirectReference.lean');
  const ka12Olean = path.join(lean4leanRoot, '.lake/build/lib/lean/PSKernelKA12DirectReference.olean');
  const ka13Module = path.join(lean4leanRoot, 'PSKernelKA13VDeclWFBridge.lean');
  fs.copyFileSync(path.join(root, 'assurance/ka12/direct-lean4lean-reference.lean'), ka12Module);
  fs.copyFileSync(path.join(root, 'assurance/ka13/vdecl-wf-bridge.lean'), ka13Module);
  fs.mkdirSync(path.dirname(ka12Olean), { recursive: true });

  const ka12Compile = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', '-o', ka12Olean, ka12Module], { cwd: lean4leanRoot, env });
  const bridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, '-R', '.', ka13Module], { cwd: lean4leanRoot, env });

  const blockedReasons: string[] = [];
  if (!ka12.strictReferenceCheckPassed) blockedReasons.push('ka12_reference_gate_not_passed');
  if (theoryBuild.status !== 0) blockedReasons.push('lean4lean_theory_typing_env_build_failed');
  if (ka12Compile.status !== 0) blockedReasons.push('ka12_reference_module_compile_failed');
  if (bridgeCheck.status !== 0) blockedReasons.push('ka13_vdecl_wf_bridge_check_failed');
  const strictBridgeCheckPassed = blockedReasons.length === 0;

  const result = {
    checkpoint: 'proofscript-v1-ka13-vdecl-wf-bridge0',
    publicVersion: spec.publicVersion,
    coreFormat: 71,
    certificateFormat: 2,
    baseline: 'proofscript-v1-ka12-direct-lean4lean-reference0',
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    materializedLean: materialized,
    ka12GateCheckpoint: ka12.checkpoint,
    ka12GatePassed: ka12.strictReferenceCheckPassed,
    theoryBuild: { status: theoryBuild.status, stdoutTail: theoryBuild.stdout.slice(-3000), stderrTail: theoryBuild.stderr.slice(-3000) },
    ka12Compile: { status: ka12Compile.status, stdoutTail: ka12Compile.stdout.slice(-3000), stderrTail: ka12Compile.stderr.slice(-3000) },
    bridgeCheck: { status: bridgeCheck.status, stdoutTail: bridgeCheck.stdout.slice(-3000), stderrTail: bridgeCheck.stderr.slice(-3000) },
    actualLean4LeanImportBound: ka12.actualLean4LeanImportBound,
    directLean4LeanVDeclWFBridgeChecked: bridgeCheck.status === 0,
    strictBridgeCheckPassed,
    blockedReasons,
    bridgedRelation: spec.bridgedRelation,
    bridgedDeclKinds: spec.bridgedDeclKinds,
    conditionalBridgeLemmas: spec.conditionalBridgeLemmas,
    provenLeanTheoremObligations: delta.provenLeanTheoremObligations,
    stillOpenObligations: delta.stillOpen.length,
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 2,
  };

  if (options.strict && !strictBridgeCheckPassed) {
    throw new Error(`KA-13 strict VDecl.WF bridge did not pass: ${blockedReasons.join(',')}; ${JSON.stringify({ theoryBuild: result.theoryBuild, ka12Compile: result.ka12Compile, bridgeCheck: result.bridgeCheck }).slice(0, 4000)}`);
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runKA13BridgeGate({ strict: process.argv.includes('--strict'), soft: process.argv.includes('--soft') });
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}
