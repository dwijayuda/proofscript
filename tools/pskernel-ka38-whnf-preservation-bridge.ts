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

const CHECKPOINT = 'proofscript-v1-ka38-whnf-preservation-bridge0';
const VERSION = '1.0.0-pskernel.41';
const BASELINE = 'proofscript-v1-ka37-whnf-head-reduction-bridge0';
const FORMAL_OBLIGATIONS = 96;
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
  throw new Error('Lean4Lean root is present but not dependency-ready for KA-38');
}
function findMaterializedLean() {
  if (!exists(cachedLeanBin) || !exists(cachedLakeBin)) runKA11Gate({ strict: true });
  assert.ok(exists(cachedLeanBin), `missing Lean binary ${cachedLeanBin}`);
  assert.ok(exists(cachedLakeBin), `missing Lake binary ${cachedLakeBin}`);
  return { leanPath: cachedLeanBin, lakePath: cachedLakeBin };
}

const FORMAL_LEMMAS = [
  'PSKernelKA38.translated_whred_single_step_deterministic',
  'PSKernelKA38.translated_whred_defeq_preservation',
  'PSKernelKA38.translated_whred_type_preservation',
  'PSKernelKA38.translated_whreds_defeq_preservation',
  'PSKernelKA38.translated_whreds_type_preservation',
  'PSKernelKA38.translated_whnf_whreds_fixed_point',
];
const COVERED_SURFACE = ['WHRed.determ', 'WHRed.defeq', 'WHRed.hasType', 'WHRedS.defeq', 'WHRedS.hasType', 'WHNF.whRedS'];

function copyModule(lean4leanRoot: string, rel: string, moduleFile: string) {
  const src = path.join(root, rel);
  assert.ok(exists(src), `missing ${rel}`);
  fs.copyFileSync(src, path.join(lean4leanRoot, moduleFile));
}

function progressMarkdown(progress: any) {
  const rows = progress.groups.map((g: any) => `| ${g.id} | ${g.progressPercent}% | ${g.status} |`).join('\n');
  return `# Kernel Feature Equivalence Progress — KA-38\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `## Headline percentages\n\n` +
    `- Feature-surface bridge progress: **${progress.featureSurfaceBridgeProgressPercent}%**\n` +
    `- Executable-kernel equivalence proof progress: **${progress.executableKernelEquivalenceProofProgressPercent}%**\n` +
    `- Arena corpus regression status: **${progress.arenaCorpusRegressionPercent}% retained from completed gates**\n` +
    `- Formal Lean4Lean bridge obligations: **${progress.formalLean4LeanBridgeObligations}**\n\n` +
    `These percentages are conservative checkpoint metrics, not theorems of full Lean4 equivalence.\n\n` +
    `## Feature group progress\n\n` +
    `| Feature group | Progress | Status |\n|---|---:|---|\n${rows}\n\n` +
    `## Next highest-impact milestones\n\n` +
    progress.nextHighestImpactMilestones.map((x: string) => `- ${x}`).join('\n') + `\n`;
}

function writeReports(result: any) {
  ensureDir('assurance/ka38');
  const gate = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    directLean4LeanWHNFPreservationBridge: {
      referenceKind: result.referenceKind,
      actualLean4LeanImportBound: result.actualLean4LeanImportBound,
      directLean4LeanWHNFPreservationBridgeChecked: result.directLean4LeanWHNFPreservationBridgeChecked,
      strictWHNFPreservationBridgePassed: result.strictWHNFPreservationBridgePassed,
      headReductionBuildStatus: result.headReductionBuild.status,
      directBridgeCheckStatus: result.directBridgeCheck.status,
      coveredLean4LeanWHNFPreservationSurface: result.coveredLean4LeanWHNFPreservationSurface,
      formalBridgeLemmas: result.formalBridgeLemmas,
      stillOpen: result.stillOpen,
    },
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
    blockedReasons: result.blockedReasons,
  };
  writeJson('assurance/ka38/KA38_RELEASE_GATE.json', gate);
  const summary = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    requiredCommands: result.requiredCommands ?? [],
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
    note: 'KA-38 is a direct Lean4Lean WHNF preservation proof-surface bridge. It does not prove executable PSKernel WHNF, recursor, projection, quotient, or defeq algorithm refinement.',
  };
  writeJson('assurance/ka38/KA38_VERIFICATION_SUMMARY.json', summary);
  fs.writeFileSync(path.join(root, 'assurance/ka38/KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), progressMarkdown(result.featureEquivalenceProgress));
  const report = `# KA-38 WHNF Preservation Bridge Report\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `Public version: \`${VERSION}\`\n\n` +
    `Baseline: \`${BASELINE}\`\n\n` +
    `## What changed\n\n` +
    `KA-38 adds a conditional direct Lean4Lean bridge for WHNF preservation facts: ${COVERED_SURFACE.join(', ')}.\n\n` +
    `## Machine-checked bridge lemmas\n\n` +
    FORMAL_LEMMAS.map(x => `- \`${x}\``).join('\n') + `\n\n` +
    `## Kernel feature equivalence progress\n\n` +
    `- Feature-surface bridge progress: **${result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent}%**\n` +
    `- Executable-kernel equivalence proof progress: **${result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent}%**\n` +
    `- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Boundary\n\n` +
    `- Full Lean 4 equivalence: **no**\n` +
    `- Same theory as full Lean 4: **no**\n` +
    `- Fully formal K3: **no**\n` +
    `- Executable PSKernel refinement proof: **no**\n` +
    `- Full WHNF/recursor refinement: **no**\n` +
    `- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Remaining WHNF/reduction gaps\n\n` +
    result.stillOpen.map((x: string) => `- ${x}`).join('\n') + `\n`;
  fs.writeFileSync(path.join(root, 'assurance/ka38/KA38_REPORT.md'), report);
}

export function runKA38WHNFPreservationBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka38/whnf-preservation-bridge.lean',
    'assurance/ka38/whnf-preservation-bridge.json',
    'assurance/ka38/obligation-delta.json',
    'assurance/ka38/kernel-feature-equivalence-progress.json',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka38/whnf-preservation-bridge.json');
  const delta = readJson('assurance/ka38/obligation-delta.json');
  const progress = readJson('assurance/ka38/kernel-feature-equivalence-progress.json');
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
  assert.equal(versions.ka38Checkpoint, CHECKPOINT);
  assert.equal(versions.ka38FormalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(versions.ka38FeatureSurfaceBridgeProgressPercent, 54);
  assert.equal(versions.ka38ExecutableKernelEquivalenceProofProgressPercent, 24);
  assert.equal(versions.ka38TrustedSemanticChange, false);
  assert.equal(versions.ka38KernelCodecChange, false);
  assert.equal(versions.ka38NewTrustedComputationRule, false);
  assert.equal(versions.ka38FullWHNFRecursorRefinement, false);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-whnf-preservation-bridge');
  assert.deepEqual(spec.coveredLean4LeanWHNFPreservationSurface, COVERED_SURFACE);
  assert.deepEqual(spec.formalBridgeLemmas, FORMAL_LEMMAS);
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAfter, FORMAL_OBLIGATIONS);
  assert.equal(progress.featureSurfaceBridgeProgressPercent, 54);
  assert.equal(progress.executableKernelEquivalenceProofProgressPercent, 24);

  const lean4leanRoot = findLean4LeanRoot();
  const materialized = findMaterializedLean();
  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const headReductionBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Theory.Typing.HeadReduction'], { cwd: lean4leanRoot, env });
  if (options.strict && headReductionBuild.status !== 0) throw new Error(`Lean4Lean HeadReduction build failed\nSTDOUT:\n${tail(headReductionBuild.stdout)}\nSTDERR:\n${tail(headReductionBuild.stderr)}`);

  copyModule(lean4leanRoot, 'assurance/ka38/whnf-preservation-bridge.lean', 'PSKernelKA38WHNFPreservationBridge.lean');
  const directBridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, 'PSKernelKA38WHNFPreservationBridge.lean'], { cwd: lean4leanRoot, env });
  if (options.strict && directBridgeCheck.status !== 0) throw new Error(`KA38 WHNF preservation bridge Lean check failed\nSTDOUT:\n${tail(directBridgeCheck.stdout)}\nSTDERR:\n${tail(directBridgeCheck.stderr)}`);

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
    directLean4LeanWHNFPreservationBridgeChecked: directBridgeCheck.status === 0,
    strictWHNFPreservationBridgePassed: headReductionBuild.status === 0 && directBridgeCheck.status === 0,
    headReductionBuild,
    directBridgeCheck,
    coveredLean4LeanWHNFPreservationSurface: spec.coveredLean4LeanWHNFPreservationSurface,
    formalBridgeLemmas: FORMAL_LEMMAS,
    stillOpen: delta.stillOpen,
    featureEquivalenceProgress: progress,
    blockedReasons: [],
    requiredCommands: [
      { command: 'lake build Lean4Lean.Theory.Typing.HeadReduction', status: headReductionBuild.status },
      { command: 'lake env lean PSKernelKA38WHNFPreservationBridge.lean', status: directBridgeCheck.status },
    ],
    claimBoundary: spec.claimBoundary,
  };
  writeReports(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const soft = process.argv.includes('--soft');
  const result = runKA38WHNFPreservationBridgeGate({ strict, soft });
  console.log(JSON.stringify({
    checkpoint: result.checkpoint,
    publicVersion: result.publicVersion,
    strictWHNFPreservationBridgePassed: result.strictWHNFPreservationBridgePassed,
    formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations,
    featureSurfaceBridgeProgressPercent: result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent,
    executableKernelEquivalenceProofProgressPercent: result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent,
    headReductionBuildStatus: result.headReductionBuild.status,
    directBridgeCheckStatus: result.directBridgeCheck.status,
  }, null, 2));
}
