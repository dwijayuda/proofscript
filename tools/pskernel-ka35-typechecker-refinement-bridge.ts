#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runKA11Gate } from './pskernel-ka11-offline-deps.ts';

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

const CHECKPOINT = 'proofscript-v1-ka35-typechecker-refinement-bridge0';
const VERSION = '1.0.0-pskernel.38';
const BASELINE = 'proofscript-v1-ka34-mutual-def-env-bridge0';
const FORMAL_OBLIGATIONS = 71;
const cachedLean4LeanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const uploadedLean4LeanRoot = '/mnt/data/ka35-lean4lean/lean4lean-master';
const cachedLeanBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const cachedLakeBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';

function findLean4LeanRoot() {
  for (const candidate of [cachedLean4LeanRoot, uploadedLean4LeanRoot]) {
    if (exists(path.join(candidate, 'Lean4Lean/Verify/TypeChecker.lean')) &&
        exists(path.join(candidate, 'Lean4Lean/Verify/TypeChecker/InferType.lean')) &&
        exists(path.join(candidate, 'Lean4Lean/Verify/TypeChecker/WHNF.lean')) &&
        exists(path.join(candidate, 'Lean4Lean/Verify/TypeChecker/IsDefEq.lean')) &&
        exists(path.join(candidate, 'lakefile.toml'))) {
      return candidate;
    }
  }
  const ka11 = runKA11Gate({ strict: true });
  assert.ok(ka11.lean4leanRoot, 'KA-11 did not materialize Lean4Lean root');
  return String(ka11.lean4leanRoot);
}
function findMaterializedLean() {
  assert.ok(exists(cachedLeanBin), `missing Lean binary ${cachedLeanBin}`);
  assert.ok(exists(cachedLakeBin), `missing Lake binary ${cachedLakeBin}`);
  return { leanPath: cachedLeanBin, lakePath: cachedLakeBin };
}

const FORMAL_LEMMAS = [
  'PSKernelKA35.translated_whnf_refines_typing',
  'PSKernelKA35.translated_whnfCore_refines_typing',
  'PSKernelKA35.translated_inferType_refines_typing',
  'PSKernelKA35.translated_checkType_refines_typing',
  'PSKernelKA35.translated_isDefEq_refines_defeq',
];

function copyModule(lean4leanRoot: string, rel: string, moduleFile: string) {
  const src = path.join(root, rel);
  assert.ok(exists(src), `missing ${rel}`);
  fs.copyFileSync(src, path.join(lean4leanRoot, moduleFile));
}

function writeReports(result: any) {
  ensureDir('assurance/ka35');
  const gate = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    directLean4LeanTypeCheckerRefinementBridge: {
      referenceKind: result.referenceKind,
      actualLean4LeanImportBound: result.actualLean4LeanImportBound,
      directLean4LeanTypeCheckerRefinementBridgeChecked: result.directLean4LeanTypeCheckerRefinementBridgeChecked,
      strictTypeCheckerRefinementBridgePassed: result.strictTypeCheckerRefinementBridgePassed,
      typeCheckerBuildStatus: result.typeCheckerBuild.status,
      directBridgeCheckStatus: result.directBridgeCheck.status,
      coveredLean4LeanTypeCheckerOperations: result.coveredLean4LeanTypeCheckerOperations,
      formalBridgeLemmas: result.formalBridgeLemmas,
      stillOpen: result.stillOpen,
    },
    claimBoundary: result.claimBoundary,
    blockedReasons: result.blockedReasons,
  };
  writeJson('assurance/ka35/KA35_RELEASE_GATE.json', gate);
  const summary = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    requiredCommands: result.requiredCommands ?? [],
    claimBoundary: result.claimBoundary,
    note: 'KA-35 is a direct Lean4Lean TypeChecker proof-surface bridge only. It does not prove executable PSKernel checker refinement or full Lean equivalence.',
  };
  writeJson('assurance/ka35/KA35_VERIFICATION_SUMMARY.json', summary);
  const report = `# KA-35 TypeChecker Refinement Bridge Report\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `Public version: \`${VERSION}\`\n\n` +
    `Baseline: \`${BASELINE}\`\n\n` +
    `## What changed\n\n` +
    `KA-35 adds a conditional direct Lean4Lean bridge for the executable TypeChecker proof surface. ` +
    `It targets real Lean4Lean \`TypeChecker.whnf.WF\`, \`whnfCore.WF\`, \`inferType.WF\`, \`checkType.WF\`, and \`isDefEq.WF\`.\n\n` +
    `## Machine-checked bridge lemmas\n\n` +
    FORMAL_LEMMAS.map(x => `- \`${x}\``).join('\n') + `\n\n` +
    `## Boundary\n\n` +
    `- Full Lean 4 equivalence: **no**\n` +
    `- Same theory as full Lean 4: **no**\n` +
    `- Fully formal K3: **no**\n` +
    `- Executable PSKernel refinement proof: **no**\n` +
    `- TypeChecker semantic completeness: **no**\n` +
    `- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Remaining TypeChecker gaps\n\n` +
    result.stillOpen.map((x: string) => `- ${x}`).join('\n') + `\n`;
  fs.writeFileSync(path.join(root, 'assurance/ka35/KA35_REPORT.md'), report);
}

export function runKA35TypeCheckerRefinementBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka35/typechecker-refinement-bridge.lean',
    'assurance/ka35/typechecker-refinement-bridge.json',
    'assurance/ka35/obligation-delta.json',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka35/typechecker-refinement-bridge.json');
  const delta = readJson('assurance/ka35/obligation-delta.json');
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
  assert.equal(versions.ka35Checkpoint, CHECKPOINT);
  assert.equal(versions.ka35FormalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(versions.ka35TrustedSemanticChange, false);
  assert.equal(versions.ka35KernelCodecChange, false);
  assert.equal(versions.ka35NewTrustedComputationRule, false);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-typechecker-refinement-bridge');
  assert.deepEqual(spec.formalBridgeLemmas, FORMAL_LEMMAS);
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAfter, FORMAL_OBLIGATIONS);

  const lean4leanRoot = findLean4LeanRoot();
  const materialized = findMaterializedLean();
  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const typeCheckerBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Verify.TypeChecker'], { cwd: lean4leanRoot, env });
  if (options.strict && typeCheckerBuild.status !== 0) throw new Error(`Lean4Lean Verify.TypeChecker build failed\nSTDOUT:\n${tail(typeCheckerBuild.stdout)}\nSTDERR:\n${tail(typeCheckerBuild.stderr)}`);

  copyModule(lean4leanRoot, 'assurance/ka35/typechecker-refinement-bridge.lean', 'PSKernelKA35TypeCheckerRefinementBridge.lean');
  const directBridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, 'PSKernelKA35TypeCheckerRefinementBridge.lean'], { cwd: lean4leanRoot, env });
  if (options.strict && directBridgeCheck.status !== 0) throw new Error(`KA35 TypeChecker refinement bridge Lean check failed\nSTDOUT:\n${tail(directBridgeCheck.stdout)}\nSTDERR:\n${tail(directBridgeCheck.stderr)}`);

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
    directLean4LeanTypeCheckerRefinementBridgeChecked: directBridgeCheck.status === 0,
    strictTypeCheckerRefinementBridgePassed: typeCheckerBuild.status === 0 && directBridgeCheck.status === 0,
    typeCheckerBuild,
    directBridgeCheck,
    coveredLean4LeanTypeCheckerOperations: spec.coveredLean4LeanTypeCheckerOperations,
    formalBridgeLemmas: FORMAL_LEMMAS,
    stillOpen: delta.stillOpen,
    blockedReasons: [],
    requiredCommands: [
      { command: 'lake build Lean4Lean.Verify.TypeChecker', status: typeCheckerBuild.status },
      { command: 'lake env lean PSKernelKA35TypeCheckerRefinementBridge.lean', status: directBridgeCheck.status },
    ],
    claimBoundary: spec.claimBoundary,
  };
  writeReports(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const soft = process.argv.includes('--soft');
  const result = runKA35TypeCheckerRefinementBridgeGate({ strict, soft });
  console.log(JSON.stringify({
    checkpoint: result.checkpoint,
    publicVersion: result.publicVersion,
    strictTypeCheckerRefinementBridgePassed: result.strictTypeCheckerRefinementBridgePassed,
    formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations,
    typeCheckerBuildStatus: result.typeCheckerBuild.status,
    directBridgeCheckStatus: result.directBridgeCheck.status,
  }, null, 2));
}
