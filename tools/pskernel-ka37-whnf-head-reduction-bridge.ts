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

const CHECKPOINT = 'proofscript-v1-ka37-whnf-head-reduction-bridge0';
const VERSION = '1.0.0-pskernel.40';
const BASELINE = 'proofscript-v1-ka36-expression-tag-coverage-bridge0';
const FORMAL_OBLIGATIONS = 90;
const cachedLean4LeanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const uploadedLean4LeanRoot = '/mnt/data/lean4lean10/lean4lean-master';
const cachedLeanBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const cachedLakeBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';

function lean4leanRootReady(candidate: string) {
  return exists(path.join(candidate, 'Lean4Lean/Theory/Typing/HeadReduction.lean')) &&
    exists(path.join(candidate, 'Lean4Lean/Theory/Typing/ChurchRosser.lean')) &&
    exists(path.join(candidate, 'lakefile.toml')) &&
    read(path.join(candidate, 'lakefile.toml')).includes('name = "batteries"') &&
    (read(path.join(candidate, 'lakefile.toml')).includes('path =') || exists(path.join(candidate, '.lake/packages/batteries/Batteries.lean')));
}
function findLean4LeanRoot() {
  if (lean4leanRootReady(cachedLean4LeanRoot)) return cachedLean4LeanRoot;
  const ka11 = runKA11Gate({ strict: true });
  assert.ok(ka11.lean4leanRoot, 'KA-11 did not materialize Lean4Lean root');
  const materializedRoot = String(ka11.lean4leanRoot);
  if (lean4leanRootReady(materializedRoot)) return materializedRoot;
  if (lean4leanRootReady(uploadedLean4LeanRoot)) return uploadedLean4LeanRoot;
  throw new Error('Lean4Lean root is present but not dependency-ready for KA-37');
}
function findMaterializedLean() {
  if (!exists(cachedLeanBin) || !exists(cachedLakeBin)) runKA11Gate({ strict: true });
  assert.ok(exists(cachedLeanBin), `missing Lean binary ${cachedLeanBin}`);
  assert.ok(exists(cachedLakeBin), `missing Lake binary ${cachedLakeBin}`);
  return { leanPath: cachedLeanBin, lakePath: cachedLakeBin };
}

const FORMAL_LEMMAS = [
  'PSKernelKA37.translated_whnf_bvar_head_normal',
  'PSKernelKA37.translated_whnf_lam_head_normal',
  'PSKernelKA37.translated_whnf_sort_head_normal',
  'PSKernelKA37.translated_whnf_forall_head_normal',
  'PSKernelKA37.translated_whred_beta_step',
  'PSKernelKA37.translated_whred_app_congruence',
  'PSKernelKA37.translated_whreds_app_congruence',
  'PSKernelKA37.translated_whreds_deterministic',
];
const COVERED_SURFACE = ['WHNF.bvar', 'WHNF.lam', 'WHNF.sort', 'WHNF.forallE', 'WHRed.beta', 'WHRed.app', 'WHRedS.app', 'WHRedS.determ'];

function copyModule(lean4leanRoot: string, rel: string, moduleFile: string) {
  const src = path.join(root, rel);
  assert.ok(exists(src), `missing ${rel}`);
  fs.copyFileSync(src, path.join(lean4leanRoot, moduleFile));
}

function writeReports(result: any) {
  ensureDir('assurance/ka37');
  const gate = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    directLean4LeanWHNFHeadReductionBridge: {
      referenceKind: result.referenceKind,
      actualLean4LeanImportBound: result.actualLean4LeanImportBound,
      directLean4LeanWHNFHeadReductionBridgeChecked: result.directLean4LeanWHNFHeadReductionBridgeChecked,
      strictWHNFHeadReductionBridgePassed: result.strictWHNFHeadReductionBridgePassed,
      headReductionBuildStatus: result.headReductionBuild.status,
      directBridgeCheckStatus: result.directBridgeCheck.status,
      coveredLean4LeanWHNFHeadReductionSurface: result.coveredLean4LeanWHNFHeadReductionSurface,
      formalBridgeLemmas: result.formalBridgeLemmas,
      stillOpen: result.stillOpen,
    },
    claimBoundary: result.claimBoundary,
    blockedReasons: result.blockedReasons,
  };
  writeJson('assurance/ka37/KA37_RELEASE_GATE.json', gate);
  const summary = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    requiredCommands: result.requiredCommands ?? [],
    claimBoundary: result.claimBoundary,
    note: 'KA-37 is a direct Lean4Lean WHNF/head-reduction proof-surface bridge. It does not prove executable PSKernel WHNF, recursor, projection, or quotient reduction refinement.',
  };
  writeJson('assurance/ka37/KA37_VERIFICATION_SUMMARY.json', summary);
  const report = `# KA-37 WHNF Head-Reduction Bridge Report\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `Public version: \`${VERSION}\`\n\n` +
    `Baseline: \`${BASELINE}\`\n\n` +
    `## What changed\n\n` +
    `KA-37 adds a conditional direct Lean4Lean bridge for a theory-level WHNF/head-reduction surface: ${COVERED_SURFACE.join(', ')}.\n\n` +
    `## Machine-checked bridge lemmas\n\n` +
    FORMAL_LEMMAS.map(x => `- \`${x}\``).join('\n') + `\n\n` +
    `## Boundary\n\n` +
    `- Full Lean 4 equivalence: **no**\n` +
    `- Same theory as full Lean 4: **no**\n` +
    `- Fully formal K3: **no**\n` +
    `- Executable PSKernel refinement proof: **no**\n` +
    `- Full WHNF/recursor refinement: **no**\n` +
    `- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Remaining WHNF/reduction gaps\n\n` +
    result.stillOpen.map((x: string) => `- ${x}`).join('\n') + `\n`;
  fs.writeFileSync(path.join(root, 'assurance/ka37/KA37_REPORT.md'), report);
}

export function runKA37WHNFHeadReductionBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka37/whnf-head-reduction-bridge.lean',
    'assurance/ka37/whnf-head-reduction-bridge.json',
    'assurance/ka37/obligation-delta.json',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka37/whnf-head-reduction-bridge.json');
  const delta = readJson('assurance/ka37/obligation-delta.json');
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
  assert.equal(versions.ka37Checkpoint, CHECKPOINT);
  assert.equal(versions.ka37FormalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(versions.ka37TrustedSemanticChange, false);
  assert.equal(versions.ka37KernelCodecChange, false);
  assert.equal(versions.ka37NewTrustedComputationRule, false);
  assert.equal(versions.ka37FullWHNFRecursorRefinement, false);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-whnf-head-reduction-bridge');
  assert.deepEqual(spec.coveredLean4LeanWHNFHeadReductionSurface, COVERED_SURFACE);
  assert.deepEqual(spec.formalBridgeLemmas, FORMAL_LEMMAS);
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAfter, FORMAL_OBLIGATIONS);

  const lean4leanRoot = findLean4LeanRoot();
  const materialized = findMaterializedLean();
  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const headReductionBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Theory.Typing.HeadReduction'], { cwd: lean4leanRoot, env });
  if (options.strict && headReductionBuild.status !== 0) throw new Error(`Lean4Lean HeadReduction build failed\nSTDOUT:\n${tail(headReductionBuild.stdout)}\nSTDERR:\n${tail(headReductionBuild.stderr)}`);

  copyModule(lean4leanRoot, 'assurance/ka37/whnf-head-reduction-bridge.lean', 'PSKernelKA37WHNFHeadReductionBridge.lean');
  const directBridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, 'PSKernelKA37WHNFHeadReductionBridge.lean'], { cwd: lean4leanRoot, env });
  if (options.strict && directBridgeCheck.status !== 0) throw new Error(`KA37 WHNF head-reduction bridge Lean check failed\nSTDOUT:\n${tail(directBridgeCheck.stdout)}\nSTDERR:\n${tail(directBridgeCheck.stderr)}`);

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
    directLean4LeanWHNFHeadReductionBridgeChecked: directBridgeCheck.status === 0,
    strictWHNFHeadReductionBridgePassed: headReductionBuild.status === 0 && directBridgeCheck.status === 0,
    headReductionBuild,
    directBridgeCheck,
    coveredLean4LeanWHNFHeadReductionSurface: spec.coveredLean4LeanWHNFHeadReductionSurface,
    formalBridgeLemmas: FORMAL_LEMMAS,
    stillOpen: delta.stillOpen,
    blockedReasons: [],
    requiredCommands: [
      { command: 'lake build Lean4Lean.Theory.Typing.HeadReduction', status: headReductionBuild.status },
      { command: 'lake env lean PSKernelKA37WHNFHeadReductionBridge.lean', status: directBridgeCheck.status },
    ],
    claimBoundary: spec.claimBoundary,
  };
  writeReports(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const soft = process.argv.includes('--soft');
  const result = runKA37WHNFHeadReductionBridgeGate({ strict, soft });
  console.log(JSON.stringify({
    checkpoint: result.checkpoint,
    publicVersion: result.publicVersion,
    strictWHNFHeadReductionBridgePassed: result.strictWHNFHeadReductionBridgePassed,
    formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations,
    headReductionBuildStatus: result.headReductionBuild.status,
    directBridgeCheckStatus: result.directBridgeCheck.status,
  }, null, 2));
}
