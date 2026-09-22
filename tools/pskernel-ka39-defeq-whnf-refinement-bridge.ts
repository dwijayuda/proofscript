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

const CHECKPOINT = 'proofscript-v1-ka39-defeq-whnf-refinement-bridge0';
const VERSION = '1.0.0-pskernel.42';
const BASELINE = 'proofscript-v1-ka38-whnf-preservation-bridge0';
const FORMAL_OBLIGATIONS = 103;
const cachedLean4LeanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const cachedLeanBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const cachedLakeBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';

const FORMAL_LEMMAS = [
  'PSKernelKA39.translated_defeq_has_type_pair',
  'PSKernelKA39.translated_defeq_to_untyped',
  'PSKernelKA39.translated_defeq_untyped_refl',
  'PSKernelKA39.translated_defeq_untyped_symm',
  'PSKernelKA39.translated_defeq_mono_env',
  'PSKernelKA39.translated_defeq_untyped_mono_env',
  'PSKernelKA39.translated_has_type_mono_env',
];
const COVERED_SURFACE = [
  'IsDefEq.hasType',
  'IsDefEq.toU',
  'IsDefEqU.refl',
  'IsDefEqU.symm',
  'IsDefEq.mono',
  'IsDefEqU.mono',
  'HasType.mono',
];

function lean4leanRootReady(candidate: string) {
  return exists(path.join(candidate, 'Lean4Lean/Theory/Typing/Lemmas.lean')) &&
    exists(path.join(candidate, 'Lean4Lean/Theory/Typing/HeadReduction.lean')) &&
    exists(path.join(candidate, 'lakefile.toml'));
}
function findLean4LeanRoot() {
  if (lean4leanRootReady(cachedLean4LeanRoot)) return cachedLean4LeanRoot;
  const ka11 = runKA11Gate({ strict: true });
  const materializedRoot = String(ka11.lean4leanRoot ?? '');
  assert.ok(lean4leanRootReady(materializedRoot), 'KA-11 did not materialize dependency-ready Lean4Lean root');
  return materializedRoot;
}
function findMaterializedLean() {
  if (!exists(cachedLeanBin) || !exists(cachedLakeBin)) runKA11Gate({ strict: true });
  assert.ok(exists(cachedLeanBin), `missing Lean binary ${cachedLeanBin}`);
  assert.ok(exists(cachedLakeBin), `missing Lake binary ${cachedLakeBin}`);
  return { leanPath: cachedLeanBin, lakePath: cachedLakeBin };
}
function copyModule(lean4leanRoot: string, rel: string, moduleFile: string) {
  const src = path.join(root, rel);
  assert.ok(exists(src), `missing ${rel}`);
  fs.copyFileSync(src, path.join(lean4leanRoot, moduleFile));
}
function progressMarkdown(progress: any) {
  const rows = progress.groups.map((g: any) => `| ${g.id} | ${g.progressPercent}% | ${g.status} |`).join('\n');
  return `# Kernel Feature Equivalence Progress — KA-39\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `## Headline percentages\n\n` +
    `- Feature-surface bridge progress: **${progress.featureSurfaceBridgeProgressPercent}%**\n` +
    `- Executable-kernel equivalence proof progress: **${progress.executableKernelEquivalenceProofProgressPercent}%**\n` +
    `- Arena corpus regression status: **${progress.arenaCorpusRegressionPercent}% retained from completed direct gates**\n` +
    `- Formal Lean4Lean bridge obligations: **${progress.formalLean4LeanBridgeObligations}**\n\n` +
    `These percentages are conservative checkpoint metrics, not theorems of full Lean4 equivalence.\n\n` +
    `## Feature group progress\n\n` +
    `| Feature group | Progress | Status |\n|---|---:|---|\n${rows}\n\n` +
    `## Next highest-impact milestones\n\n` +
    progress.nextHighestImpactMilestones.map((x: string) => `- ${x}`).join('\n') + `\n`;
}
function writeReports(result: any) {
  ensureDir('assurance/ka39');
  const gate = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    directLean4LeanDefEqWHNFBridge: {
      referenceKind: result.referenceKind,
      actualLean4LeanImportBound: result.actualLean4LeanImportBound,
      directLean4LeanDefEqWHNFBridgeChecked: result.directLean4LeanDefEqWHNFBridgeChecked,
      strictDefEqWHNFBridgePassed: result.strictDefEqWHNFBridgePassed,
      lemmasBuildStatus: result.lemmasBuild.status,
      directBridgeCheckStatus: result.directBridgeCheck.status,
      coveredLean4LeanDefEqSurface: result.coveredLean4LeanDefEqSurface,
      formalBridgeLemmas: result.formalBridgeLemmas,
      stillOpen: result.stillOpen,
    },
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
    blockedReasons: result.blockedReasons,
  };
  writeJson('assurance/ka39/KA39_DEFEQ_WHNF_REFINEMENT_BRIDGE_RELEASE_GATE.json', gate);
  writeJson('assurance/ka39/KA39_DEFEQ_WHNF_REFINEMENT_BRIDGE_VERIFICATION_SUMMARY.json', {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    requiredCommands: result.requiredCommands ?? [],
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
    note: 'KA-39 is a direct Lean4Lean definitional-equality/WHNF proof-surface bridge. It does not prove executable PSKernel isDefEq refinement.',
  });
  fs.writeFileSync(path.join(root, 'assurance/ka39/KA39_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), progressMarkdown(result.featureEquivalenceProgress));
  const report = `# KA-39 DefEq / WHNF Refinement Bridge Report\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `Public version: \`${VERSION}\`\n\n` +
    `Baseline: \`${BASELINE}\`\n\n` +
    `## What changed\n\n` +
    `KA-39 adds a conditional direct Lean4Lean bridge for definitional equality and typing monotonicity facts: ${COVERED_SURFACE.join(', ')}.\n\n` +
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
    `- Full defeq/WHNF refinement: **no**\n` +
    `- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Remaining defeq / conversion gaps\n\n` +
    result.stillOpen.map((x: string) => `- ${x}`).join('\n') + `\n`;
  fs.writeFileSync(path.join(root, 'assurance/ka39/KA39_DEFEQ_WHNF_REFINEMENT_BRIDGE_REPORT.md'), report);
}

export function runKA39DefEqWHNFRefinementBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka39/defeq-whnf-refinement-bridge.lean',
    'assurance/ka39/defeq-whnf-refinement-bridge.json',
    'assurance/ka39/obligation-delta.json',
    'assurance/ka39/kernel-feature-equivalence-progress.json',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka39/defeq-whnf-refinement-bridge.json');
  const delta = readJson('assurance/ka39/obligation-delta.json');
  const progress = readJson('assurance/ka39/kernel-feature-equivalence-progress.json');
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
  assert.equal(versions.ka39Checkpoint, CHECKPOINT);
  assert.equal(versions.ka39FormalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(versions.ka39FeatureSurfaceBridgeProgressPercent, 56);
  assert.equal(versions.ka39ExecutableKernelEquivalenceProofProgressPercent, 25);
  assert.equal(versions.ka39TrustedSemanticChange, false);
  assert.equal(versions.ka39KernelCodecChange, false);
  assert.equal(versions.ka39NewTrustedComputationRule, false);
  assert.equal(versions.ka39FullDefEqWHNFRefinement, false);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-defeq-whnf-refinement-bridge');
  assert.deepEqual(spec.coveredLean4LeanDefEqSurface, COVERED_SURFACE);
  assert.deepEqual(spec.formalBridgeLemmas, FORMAL_LEMMAS);
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAfter, FORMAL_OBLIGATIONS);
  assert.equal(progress.featureSurfaceBridgeProgressPercent, 56);
  assert.equal(progress.executableKernelEquivalenceProofProgressPercent, 25);

  const lean4leanRoot = findLean4LeanRoot();
  const materialized = findMaterializedLean();
  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const lemmasBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Theory.Typing.Lemmas'], { cwd: lean4leanRoot, env });
  if (options.strict && lemmasBuild.status !== 0) throw new Error(`Lean4Lean Lemmas build failed\nSTDOUT:\n${tail(lemmasBuild.stdout)}\nSTDERR:\n${tail(lemmasBuild.stderr)}`);

  copyModule(lean4leanRoot, 'assurance/ka39/defeq-whnf-refinement-bridge.lean', 'PSKernelKA39DefEqWHNFRefinementBridge.lean');
  const directBridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, 'PSKernelKA39DefEqWHNFRefinementBridge.lean'], { cwd: lean4leanRoot, env });
  if (options.strict && directBridgeCheck.status !== 0) throw new Error(`KA39 DefEq/WHNF bridge Lean check failed\nSTDOUT:\n${tail(directBridgeCheck.stdout)}\nSTDERR:\n${tail(directBridgeCheck.stderr)}`);

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
    directLean4LeanDefEqWHNFBridgeChecked: directBridgeCheck.status === 0,
    strictDefEqWHNFBridgePassed: lemmasBuild.status === 0 && directBridgeCheck.status === 0,
    lemmasBuild,
    directBridgeCheck,
    coveredLean4LeanDefEqSurface: spec.coveredLean4LeanDefEqSurface,
    formalBridgeLemmas: FORMAL_LEMMAS,
    stillOpen: delta.stillOpen,
    featureEquivalenceProgress: progress,
    blockedReasons: [],
    requiredCommands: [
      { command: 'lake build Lean4Lean.Theory.Typing.Lemmas', status: lemmasBuild.status },
      { command: 'lake env lean PSKernelKA39DefEqWHNFRefinementBridge.lean', status: directBridgeCheck.status },
    ],
    claimBoundary: spec.claimBoundary,
  };
  writeReports(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const soft = process.argv.includes('--soft');
  const result = runKA39DefEqWHNFRefinementBridgeGate({ strict, soft });
  console.log(JSON.stringify({
    checkpoint: result.checkpoint,
    publicVersion: result.publicVersion,
    strictDefEqWHNFBridgePassed: result.strictDefEqWHNFBridgePassed,
    formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations,
    featureSurfaceBridgeProgressPercent: result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent,
    executableKernelEquivalenceProofProgressPercent: result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent,
    lemmasBuildStatus: result.lemmasBuild.status,
    directBridgeCheckStatus: result.directBridgeCheck.status,
  }, null, 2));
}
