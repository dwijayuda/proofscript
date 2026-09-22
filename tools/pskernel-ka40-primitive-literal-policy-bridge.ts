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

const CHECKPOINT = 'proofscript-v1-ka40-primitive-literal-policy-bridge0';
const VERSION = '1.0.0-pskernel.43';
const BASELINE = 'proofscript-v1-ka39-defeq-whnf-refinement-bridge0';
const FORMAL_OBLIGATIONS = 114;
const cachedLean4LeanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const cachedLeanBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const cachedLakeBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';

const FORMAL_LEMMAS = [
  'PSKernelKA40.translated_literal_policy_nat_requires_nat',
  'PSKernelKA40.translated_literal_policy_string_requires_primitives',
  'PSKernelKA40.translated_nat_zero_has_type',
  'PSKernelKA40.translated_nat_succ_has_type',
  'PSKernelKA40.translated_nat_literal_has_type',
  'PSKernelKA40.translated_nat_literal_closed',
  'PSKernelKA40.translated_nat_is_type',
  'PSKernelKA40.translated_nat_const_translates',
  'PSKernelKA40.translated_bool_literal_has_type',
  'PSKernelKA40.translated_bool_is_type',
  'PSKernelKA40.translated_bool_const_translates',
];
const COVERED_SURFACE = [
  'VEnv.ContainsLits natVal',
  'VEnv.ContainsLits strVal',
  'VEnv.HasPrimitives.natZeroT',
  'VEnv.HasPrimitives.natSuccT',
  'VEnv.HasPrimitives.natLitT',
  'VExpr.closedN_natLit',
  'VEnv.HasPrimitives.natIsType',
  'VEnv.HasPrimitives.trNat',
  'VEnv.HasPrimitives.boolLitT',
  'VEnv.HasPrimitives.boolIsType',
  'VEnv.HasPrimitives.trBool',
];

function lean4leanRootReady(candidate: string) {
  return exists(path.join(candidate, 'Lean4Lean/Verify/Primitive.lean')) &&
    exists(path.join(candidate, 'Lean4Lean/Verify/Typing/Expr.lean')) &&
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
  return `# Kernel Feature Equivalence Progress — KA-40\n\n` +
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
  ensureDir('assurance/ka40');
  const gate = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    directLean4LeanPrimitiveLiteralPolicyBridge: {
      referenceKind: result.referenceKind,
      actualLean4LeanImportBound: result.actualLean4LeanImportBound,
      directLean4LeanPrimitiveLiteralPolicyBridgeChecked: result.directLean4LeanPrimitiveLiteralPolicyBridgeChecked,
      strictPrimitiveLiteralPolicyBridgePassed: result.strictPrimitiveLiteralPolicyBridgePassed,
      primitiveBuildStatus: result.primitiveBuild.status,
      directBridgeCheckStatus: result.directBridgeCheck.status,
      coveredLean4LeanPrimitiveLiteralSurface: result.coveredLean4LeanPrimitiveLiteralSurface,
      formalBridgeLemmas: result.formalBridgeLemmas,
      stillOpen: result.stillOpen,
    },
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
    blockedReasons: result.blockedReasons,
  };
  writeJson('assurance/ka40/KA40_PRIMITIVE_LITERAL_POLICY_BRIDGE_RELEASE_GATE.json', gate);
  writeJson('assurance/ka40/KA40_PRIMITIVE_LITERAL_POLICY_BRIDGE_VERIFICATION_SUMMARY.json', {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    requiredCommands: result.requiredCommands ?? [],
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
    note: 'KA-40 is a direct Lean4Lean primitive/literal policy proof-surface bridge. It does not prove executable primitive reflection completeness.',
  });
  fs.writeFileSync(path.join(root, 'assurance/ka40/KA40_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), progressMarkdown(result.featureEquivalenceProgress));
  const report = `# KA-40 Primitive / Literal Policy Bridge Report\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `Public version: \`${VERSION}\`\n\n` +
    `Baseline: \`${BASELINE}\`\n\n` +
    `## What changed\n\n` +
    `KA-40 adds a conditional direct Lean4Lean bridge for primitive and literal policy: ${COVERED_SURFACE.join(', ')}.\n\n` +
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
    `- Full primitive/literal policy refinement: **no**\n` +
    `- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Remaining primitive / literal gaps\n\n` +
    result.stillOpen.map((x: string) => `- ${x}`).join('\n') + `\n`;
  fs.writeFileSync(path.join(root, 'assurance/ka40/KA40_PRIMITIVE_LITERAL_POLICY_BRIDGE_REPORT.md'), report);
}

export function runKA40PrimitiveLiteralPolicyBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka40/primitive-literal-policy-bridge.lean',
    'assurance/ka40/primitive-literal-policy-bridge.json',
    'assurance/ka40/obligation-delta.json',
    'assurance/ka40/kernel-feature-equivalence-progress.json',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka40/primitive-literal-policy-bridge.json');
  const delta = readJson('assurance/ka40/obligation-delta.json');
  const progress = readJson('assurance/ka40/kernel-feature-equivalence-progress.json');
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
  assert.equal(versions.ka40Checkpoint, CHECKPOINT);
  assert.equal(versions.ka40FormalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(versions.ka40FeatureSurfaceBridgeProgressPercent, 58);
  assert.equal(versions.ka40ExecutableKernelEquivalenceProofProgressPercent, 26);
  assert.equal(versions.ka40TrustedSemanticChange, false);
  assert.equal(versions.ka40KernelCodecChange, false);
  assert.equal(versions.ka40NewTrustedComputationRule, false);
  assert.equal(versions.ka40FullPrimitiveLiteralPolicyRefinement, false);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-primitive-literal-policy-bridge');
  assert.deepEqual(spec.coveredLean4LeanPrimitiveLiteralSurface, COVERED_SURFACE);
  assert.deepEqual(spec.formalBridgeLemmas, FORMAL_LEMMAS);
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAfter, FORMAL_OBLIGATIONS);
  assert.equal(progress.featureSurfaceBridgeProgressPercent, 58);
  assert.equal(progress.executableKernelEquivalenceProofProgressPercent, 26);

  const lean4leanRoot = findLean4LeanRoot();
  const materialized = findMaterializedLean();
  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const primitiveBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Verify.Primitive'], { cwd: lean4leanRoot, env });
  if (options.strict && primitiveBuild.status !== 0) throw new Error(`Lean4Lean Primitive build failed\nSTDOUT:\n${tail(primitiveBuild.stdout)}\nSTDERR:\n${tail(primitiveBuild.stderr)}`);

  copyModule(lean4leanRoot, 'assurance/ka40/primitive-literal-policy-bridge.lean', 'PSKernelKA40PrimitiveLiteralPolicyBridge.lean');
  const directBridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, 'PSKernelKA40PrimitiveLiteralPolicyBridge.lean'], { cwd: lean4leanRoot, env });
  if (options.strict && directBridgeCheck.status !== 0) throw new Error(`KA40 Primitive/Literal policy bridge Lean check failed\nSTDOUT:\n${tail(directBridgeCheck.stdout)}\nSTDERR:\n${tail(directBridgeCheck.stderr)}`);

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
    directLean4LeanPrimitiveLiteralPolicyBridgeChecked: directBridgeCheck.status === 0,
    strictPrimitiveLiteralPolicyBridgePassed: primitiveBuild.status === 0 && directBridgeCheck.status === 0,
    primitiveBuild,
    directBridgeCheck,
    coveredLean4LeanPrimitiveLiteralSurface: spec.coveredLean4LeanPrimitiveLiteralSurface,
    formalBridgeLemmas: FORMAL_LEMMAS,
    stillOpen: delta.stillOpen,
    featureEquivalenceProgress: progress,
    blockedReasons: [],
    requiredCommands: [
      { command: 'lake build Lean4Lean.Verify.Primitive', status: primitiveBuild.status },
      { command: 'lake env lean PSKernelKA40PrimitiveLiteralPolicyBridge.lean', status: directBridgeCheck.status },
    ],
    claimBoundary: spec.claimBoundary,
  };
  writeReports(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const soft = process.argv.includes('--soft');
  const result = runKA40PrimitiveLiteralPolicyBridgeGate({ strict, soft });
  console.log(JSON.stringify({
    checkpoint: result.checkpoint,
    publicVersion: result.publicVersion,
    strictPrimitiveLiteralPolicyBridgePassed: result.strictPrimitiveLiteralPolicyBridgePassed,
    formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations,
    featureSurfaceBridgeProgressPercent: result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent,
    executableKernelEquivalenceProofProgressPercent: result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent,
  }, null, 2));
}
