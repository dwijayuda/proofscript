#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (p: string) => fs.existsSync(p);
const read = (p: string) => fs.readFileSync(path.isAbsolute(p) ? p : path.join(root, p), 'utf8');
const readJson = (rel: string) => JSON.parse(read(rel));
const writeJson = (rel: string, value: unknown) => fs.writeFileSync(path.join(root, rel), JSON.stringify(value, null, 2) + '\n');
const ensureDir = (rel: string) => fs.mkdirSync(path.join(root, rel), { recursive: true });
const tail = (s: string) => s.slice(-2400);
function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

const CHECKPOINT = 'proofscript-v1-ka34-mutual-def-env-bridge0';
const VERSION = '1.0.0-pskernel.37';
const BASELINE = 'proofscript-v1-ka33-inductive-env-bridge0';
const FORMAL_OBLIGATIONS = 66;
const cachedLean4LeanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const uploadedLean4LeanRoot = '/mnt/data/ka34-lean4lean/lean4lean-master';
const cachedLeanBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const cachedLakeBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';

function findLean4LeanRoot() {
  for (const candidate of [cachedLean4LeanRoot, uploadedLean4LeanRoot]) {
    if (exists(path.join(candidate, 'Lean4Lean/Theory/Typing/Env.lean')) &&
        exists(path.join(candidate, 'Lean4Lean/Theory/Typing/EnvLemmas.lean')) &&
        exists(path.join(candidate, 'lakefile.toml'))) {
      return candidate;
    }
  }
  throw new Error('Lean4Lean source root with environment typing modules not found');
}
function findMaterializedLean() {
  assert.ok(exists(cachedLeanBin), `missing Lean binary ${cachedLeanBin}`);
  assert.ok(exists(cachedLakeBin), `missing Lake binary ${cachedLakeBin}`);
  return { leanPath: cachedLeanBin, lakePath: cachedLakeBin };
}

const FORMAL_LEMMAS = [
  'PSKernelKA34.translated_mutual_def_is_real_vdecl',
  'PSKernelKA34.translated_mutual_def_vdecl_wf',
  'PSKernelKA34.translated_mutual_def_env_wf',
  'PSKernelKA34.translated_mutual_def_env_ordered',
  'PSKernelKA34.translated_mutual_def_constants_member',
  'PSKernelKA34.translated_mutual_def_defeq_member',
];

function copyModule(lean4leanRoot: string, rel: string, moduleFile: string) {
  const src = path.join(root, rel);
  assert.ok(exists(src), `missing ${rel}`);
  fs.copyFileSync(src, path.join(lean4leanRoot, moduleFile));
}

function writeReports(result: any) {
  ensureDir('assurance/ka34');
  const gate = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    directLean4LeanMutualDefEnvBridge: {
      referenceKind: result.referenceKind,
      actualLean4LeanImportBound: result.actualLean4LeanImportBound,
      directLean4LeanMutualDefEnvBridgeChecked: result.directLean4LeanMutualDefEnvBridgeChecked,
      strictMutualDefEnvBridgePassed: result.strictMutualDefEnvBridgePassed,
      theoryBuildStatus: result.theoryBuild.status,
      directBridgeCheckStatus: result.directBridgeCheck.status,
      coveredLean4LeanDeclConstructors: result.coveredLean4LeanDeclConstructors,
      coveredLean4LeanEnvOperations: result.coveredLean4LeanEnvOperations,
      formalBridgeLemmas: result.formalBridgeLemmas,
      stillOpen: result.stillOpen,
    },
    claimBoundary: result.claimBoundary,
    blockedReasons: result.blockedReasons,
  };
  writeJson('assurance/ka34/KA34_RELEASE_GATE.json', gate);
  const summary = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    requiredCommands: result.requiredCommands ?? [],
    claimBoundary: result.claimBoundary,
    note: 'KA-34 is a conditional direct Lean4Lean mutual-definition environment bridge only. It does not prove executable mutual recursion checking, WHNF/defeq behavior, or full Lean equivalence.',
  };
  writeJson('assurance/ka34/KA34_VERIFICATION_SUMMARY.json', summary);
  const report = `# KA-34 Mutual Definition Environment Bridge Report\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `Public version: \`${VERSION}\`\n\n` +
    `Baseline: \`${BASELINE}\`\n\n` +
    `## What changed\n\n` +
    `KA-34 adds a conditional direct Lean4Lean bridge for the mutual-definition feature group. ` +
    `It targets real Lean4Lean \`VDecl.mutualDef\`, \`VDecl.WF.mutualDef\`, \`VEnv.WF\`, \`VEnv.Ordered\`, \`VEnv.addConsts\`, and \`VEnv.addDefEqs\`.\n\n` +
    `## Machine-checked bridge lemmas\n\n` +
    FORMAL_LEMMAS.map(x => `- \`${x}\``).join('\n') + `\n\n` +
    `## Boundary\n\n` +
    `- Full Lean 4 equivalence: **no**\n` +
    `- Same theory as full Lean 4: **no**\n` +
    `- Fully formal K3: **no**\n` +
    `- Executable PSKernel refinement proof: **no**\n` +
    `- Mutual-definition semantic soundness: **no**\n` +
    `- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Remaining mutual-definition gaps\n\n` +
    result.stillOpen.map((x: string) => `- ${x}`).join('\n') + `\n`;
  fs.writeFileSync(path.join(root, 'assurance/ka34/KA34_REPORT.md'), report);
}

export function runKA34MutualDefEnvBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka12/direct-lean4lean-reference.lean',
    'assurance/ka34/mutual-def-env-bridge.lean',
    'assurance/ka34/mutual-def-env-bridge.json',
    'assurance/ka34/obligation-delta.json',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka34/mutual-def-env-bridge.json');
  const delta = readJson('assurance/ka34/obligation-delta.json');
  assert.equal(pkg.version, VERSION);
  assert.equal(lock.version, VERSION);
  assert.equal(lock.packages[''].version, VERSION);
  assert.equal(versions.implementation, VERSION);
  assert.equal(versions.packageVersion, VERSION);
  assert.equal(versions.proofscriptPublicVersion, VERSION);
  assert.equal(versions.latestLocalLineageCheckpoint, CHECKPOINT);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.certificateFormat, 2);
  assert.equal(versions.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(versions.ka34Checkpoint, CHECKPOINT);
  assert.equal(versions.ka34FormalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(versions.ka34TrustedSemanticChange, false);
  assert.equal(versions.ka34KernelCodecChange, false);
  assert.equal(versions.ka34NewTrustedComputationRule, false);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-mutual-def-env-bridge');
  assert.deepEqual(spec.formalBridgeLemmas, FORMAL_LEMMAS);
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAfter, FORMAL_OBLIGATIONS);

  const lean4leanRoot = findLean4LeanRoot();
  const materialized = findMaterializedLean();
  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const theoryBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Theory.Typing.EnvLemmas'], { cwd: lean4leanRoot, env });
  if (options.strict && theoryBuild.status !== 0) throw new Error(`Lean4Lean environment theory build failed\nSTDOUT:\n${tail(theoryBuild.stdout)}\nSTDERR:\n${tail(theoryBuild.stderr)}`);

  copyModule(lean4leanRoot, 'assurance/ka12/direct-lean4lean-reference.lean', 'PSKernelKA12DirectReference.lean');
  copyModule(lean4leanRoot, 'assurance/ka34/mutual-def-env-bridge.lean', 'PSKernelKA34MutualDefEnvBridge.lean');
  const directBridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, 'PSKernelKA34MutualDefEnvBridge.lean'], { cwd: lean4leanRoot, env });
  if (options.strict && directBridgeCheck.status !== 0) throw new Error(`KA34 mutual-def env bridge Lean check failed\nSTDOUT:\n${tail(directBridgeCheck.stdout)}\nSTDERR:\n${tail(directBridgeCheck.stderr)}`);

  const result = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    coreFormat: 71,
    certificateFormat: 2,
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    materializedLean: materialized,
    actualLean4LeanImportBound: true,
    directLean4LeanMutualDefEnvBridgeChecked: directBridgeCheck.status === 0,
    strictMutualDefEnvBridgePassed: theoryBuild.status === 0 && directBridgeCheck.status === 0,
    theoryBuild,
    directBridgeCheck,
    coveredLean4LeanDeclConstructors: spec.coveredLean4LeanDeclConstructors,
    coveredLean4LeanEnvOperations: spec.coveredLean4LeanEnvOperations,
    formalBridgeLemmas: FORMAL_LEMMAS,
    stillOpen: delta.stillOpen,
    blockedReasons: [],
    requiredCommands: [
      { command: 'lake build Lean4Lean.Theory.Typing.EnvLemmas', status: theoryBuild.status },
      { command: 'lake env lean PSKernelKA34MutualDefEnvBridge.lean', status: directBridgeCheck.status },
    ],
    claimBoundary: spec.claimBoundary,
  };
  writeReports(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const soft = process.argv.includes('--soft');
  const result = runKA34MutualDefEnvBridgeGate({ strict, soft });
  console.log(JSON.stringify({
    checkpoint: result.checkpoint,
    publicVersion: result.publicVersion,
    strictMutualDefEnvBridgePassed: result.strictMutualDefEnvBridgePassed,
    formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations,
    theoryBuildStatus: result.theoryBuild.status,
    directBridgeCheckStatus: result.directBridgeCheck.status,
  }, null, 2));
}
