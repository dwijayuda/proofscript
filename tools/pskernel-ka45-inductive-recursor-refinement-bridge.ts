#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runKA11Gate } from './pskernel-ka11-offline-deps.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECKPOINT = 'proofscript-v1-ka45-inductive-recursor-refinement-bridge0';
const VERSION = '1.0.0-pskernel.48';
const BASELINE = 'proofscript-v1-ka44-end-to-end-checker-refinement-plan0';
const FORMAL_OBLIGATIONS = 132;
const cachedLean4LeanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const cachedLeanBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const cachedLakeBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';

const exists = (relOrAbs: string) => fs.existsSync(path.isAbsolute(relOrAbs) ? relOrAbs : path.join(root, relOrAbs));
const read = (relOrAbs: string) => fs.readFileSync(path.isAbsolute(relOrAbs) ? relOrAbs : path.join(root, relOrAbs), 'utf8');
const readJson = (rel: string) => JSON.parse(read(rel));
const writeJson = (rel: string, value: unknown) => fs.writeFileSync(path.join(root, rel), JSON.stringify(value, null, 2) + '\n');
const ensureDir = (rel: string) => fs.mkdirSync(path.join(root, rel), { recursive: true });
const tail = (s: string) => s.slice(-2400);
function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

const FORMAL_LEMMAS = [
  'Lean4Lean.PSKernelKA45.translated_reduceRecursor_wf',
  'Lean4Lean.PSKernelKA45.translated_whnfCore_recursor_path_wf',
  'Lean4Lean.PSKernelKA45.translated_whnf_recursor_path_wf',
  'Lean4Lean.PSKernelKA45.translated_inductive_reduce_rec_import_bound',
];
const COVERED_SURFACE = [
  'TypeChecker.Inner.reduceRecursor.WF',
  "TypeChecker.Inner.whnfCore'.WF",
  "TypeChecker.Inner.whnf'.WF",
  'Inductive.Reduce.inductiveReduceRec import-bound',
];

function lean4leanRootReady(candidate: string) {
  return exists(path.join(candidate, 'Lean4Lean/Verify/TypeChecker/WHNF.lean')) &&
    exists(path.join(candidate, 'Lean4Lean/Inductive/Reduce.lean')) &&
    exists(path.join(candidate, 'lakefile.toml'));
}
function findLean4LeanRoot() {
  if (lean4leanRootReady(cachedLean4LeanRoot)) return cachedLean4LeanRoot;
  const ka11 = runKA11Gate({ strict: true });
  const materializedRoot = String(ka11.lean4leanRoot ?? '');
  if (lean4leanRootReady(materializedRoot)) return materializedRoot;
  throw new Error('Lean4Lean root is not ready for KA-45 recursor bridge');
}
function findMaterializedLean() {
  if (!exists(cachedLeanBin) || !exists(cachedLakeBin)) runKA11Gate({ strict: true });
  assert.ok(exists(cachedLeanBin), `missing Lean binary ${cachedLeanBin}`);
  assert.ok(exists(cachedLakeBin), `missing Lake binary ${cachedLakeBin}`);
  return { leanPath: cachedLeanBin, lakePath: cachedLakeBin };
}
function copyModule(lean4leanRoot: string) {
  fs.copyFileSync(path.join(root, 'assurance/ka45/inductive-recursor-refinement-bridge.lean'), path.join(lean4leanRoot, 'PSKernelKA45InductiveRecursorRefinementBridge.lean'));
}
function walkSourceFiles() {
  const out: { path: string; lines: number; ext: string }[] = [];
  const roots = ['tools', 'assurance', 'packages', 'plugins', 'tests', 'docs'];
  const skip = new Set(['node_modules', 'dist', '.git', 'tmp', '.lake']);
  function walk(dir: string) {
    for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, ent.name);
      if (ent.isDirectory()) { if (!skip.has(ent.name)) walk(rel); continue; }
      if (!ent.isFile() || !/\.(ts|lean|md|json)$/.test(ent.name)) continue;
      const text = fs.readFileSync(path.join(root, rel), 'utf8');
      out.push({ path: rel.replaceAll('\\', '/'), lines: text.split(/\r?\n/).length, ext: path.extname(ent.name) });
    }
  }
  for (const r of roots) if (exists(r)) walk(r);
  return out.sort((a, b) => b.lines - a.lines);
}
function architectureHealth(spec: any) {
  const files = walkSourceFiles();
  const ka45Files = files.filter(f => f.path.includes('ka45') || f.path.includes('KA45'));
  const ka45ToolFiles = ka45Files.filter(f => f.path.startsWith('tools/') && f.ext === '.ts');
  const oversized = ka45Files.filter(f => f.lines > spec.antiSpaghettiPolicy.maxNewKA45SourceLines);
  const forbidden = spec.antiSpaghettiPolicy.forbiddenGeneratedSemanticPackagePrefixes;
  const semanticTouched = ka45Files.some(f => forbidden.some((p: string) => f.path.startsWith(p)));
  return {
    antiSpaghettiGatePassed: oversized.length === 0 && !semanticTouched && ka45ToolFiles.length <= spec.antiSpaghettiPolicy.maxNewKA45ToolFiles,
    sourceFileCount: files.length,
    ka45SourceFiles: ka45Files,
    ka45ToolFiles,
    newKA45OversizedFiles: oversized,
    semanticPackageTouched: semanticTouched,
    forbiddenGeneratedSemanticPackagePrefixes: forbidden,
    note: 'KA-45 fails on new oversized KA-45 files, generated semantic-package edits, or too many KA-45 tool files.',
  };
}
function progressMarkdown(progress: any) {
  const rows = progress.groups.map((g: any) => `| ${g.id} | ${g.progressPercent}% | ${g.status} |`).join('\n');
  return `# Kernel Feature Equivalence Progress — KA-45\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `- Feature-surface bridge progress: **${progress.featureSurfaceBridgeProgressPercent}%**\n` +
    `- Executable-kernel equivalence proof progress: **${progress.executableKernelEquivalenceProofProgressPercent}%**\n` +
    `- Arena corpus regression evidence: **${progress.arenaCorpusRegressionPercent}% for completed direct gates**\n` +
    `- Formal Lean4Lean bridge obligations: **${progress.formalLean4LeanBridgeObligations}**\n\n` +
    `These percentages are conservative checkpoint metrics, not full Lean4 equivalence claims.\n\n` +
    `| Feature group | Progress | Status |\n|---|---:|---|\n${rows}\n`;
}
function writeReports(result: any) {
  ensureDir('assurance/ka45');
  writeJson('assurance/ka45/KA45_INDUCTIVE_RECURSOR_REFINEMENT_BRIDGE_RELEASE_GATE.json', {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    directLean4LeanInductiveRecursorBridge: {
      referenceKind: result.referenceKind,
      actualLean4LeanImportBound: result.actualLean4LeanImportBound,
      strictInductiveRecursorBridgePassed: result.strictInductiveRecursorBridgePassed,
      whnfBuildStatus: result.whnfBuild.status,
      directBridgeCheckStatus: result.directBridgeCheck.status,
      coveredLean4LeanRecursorSurface: result.coveredLean4LeanRecursorSurface,
      formalBridgeLemmas: result.formalBridgeLemmas,
      stillOpen: result.stillOpen,
    },
    architectureHealth: result.architectureHealth,
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
  });
  writeJson('assurance/ka45/KA45_INDUCTIVE_RECURSOR_REFINEMENT_BRIDGE_VERIFICATION_SUMMARY.json', {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    requiredCommands: result.requiredCommands ?? [],
    architectureHealth: result.architectureHealth,
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
  });
  fs.writeFileSync(path.join(root, 'assurance/ka45/KA45_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), progressMarkdown(result.featureEquivalenceProgress));
  const report = `# KA-45 Inductive Recursor Refinement Bridge Report\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\nBaseline: \`${BASELINE}\`\n\n` +
    `## What changed\n\nKA-45 adds a narrow direct Lean4Lean bridge for the verified recursor-reduction/WHNF proof surface. It does not modify trusted PSKernel semantic packages.\n\n` +
    `## Machine-checked bridge lemmas\n\n${FORMAL_LEMMAS.map(x => `- \`${x}\``).join('\n')}\n\n` +
    `## No-spaghetti result\n\n- Anti-spaghetti gate: **${result.architectureHealth.antiSpaghettiGatePassed ? 'passed' : 'failed'}**\n` +
    `- KA-45 tool files: **${result.architectureHealth.ka45ToolFiles.length}**\n` +
    `- New KA-45 oversized files: **${result.architectureHealth.newKA45OversizedFiles.length}**\n` +
    `- Semantic package touched: **${result.architectureHealth.semanticPackageTouched}**\n\n` +
    `## Boundary\n\n- Full Lean4 equivalence: **no**\n- Executable PSKernel refinement proof: **no**\n- Full inductive recursor refinement: **no**\n- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Remaining gaps\n\n${result.stillOpen.map((x: string) => `- ${x}`).join('\n')}\n`;
  fs.writeFileSync(path.join(root, 'assurance/ka45/KA45_INDUCTIVE_RECURSOR_REFINEMENT_BRIDGE_REPORT.md'), report);
}

export function runKA45InductiveRecursorRefinementBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka45/inductive-recursor-refinement-bridge.lean',
    'assurance/ka45/inductive-recursor-refinement-bridge.json',
    'assurance/ka45/obligation-delta.json',
    'assurance/ka45/kernel-feature-equivalence-progress.json',
  ]) assert.ok(exists(rel), `missing ${rel}`);
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka45/inductive-recursor-refinement-bridge.json');
  const delta = readJson('assurance/ka45/obligation-delta.json');
  const progress = readJson('assurance/ka45/kernel-feature-equivalence-progress.json');
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
  assert.equal(versions.ka45Checkpoint, CHECKPOINT);
  assert.equal(versions.ka45FormalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(versions.ka45TrustedSemanticChange, false);
  assert.equal(versions.ka45KernelCodecChange, false);
  assert.equal(versions.ka45NewTrustedComputationRule, false);
  assert.equal(versions.ka45FullInductiveRecursorRefinement, false);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-inductive-recursor-refinement-bridge');
  assert.deepEqual(spec.coveredLean4LeanRecursorSurface, COVERED_SURFACE);
  assert.deepEqual(spec.formalBridgeLemmas, FORMAL_LEMMAS);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAfter, FORMAL_OBLIGATIONS);
  assert.equal(progress.formalLean4LeanBridgeObligations, FORMAL_OBLIGATIONS);
  const architecture = architectureHealth(spec);
  assert.equal(architecture.antiSpaghettiGatePassed, true);

  const lean4leanRoot = findLean4LeanRoot();
  const materialized = findMaterializedLean();
  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const whnfBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Verify.TypeChecker.WHNF'], { cwd: lean4leanRoot, env });
  if (options.strict && whnfBuild.status !== 0) throw new Error(`Lean4Lean WHNF build failed\nSTDOUT:\n${tail(whnfBuild.stdout)}\nSTDERR:\n${tail(whnfBuild.stderr)}`);
  copyModule(lean4leanRoot);
  const directBridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, 'PSKernelKA45InductiveRecursorRefinementBridge.lean'], { cwd: lean4leanRoot, env });
  if (options.strict && directBridgeCheck.status !== 0) throw new Error(`KA45 inductive recursor bridge Lean check failed\nSTDOUT:\n${tail(directBridgeCheck.stdout)}\nSTDERR:\n${tail(directBridgeCheck.stderr)}`);

  const result = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    coreFormat: 71,
    certificateFormat: 2,
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    actualLean4LeanImportBound: true,
    strictInductiveRecursorBridgePassed: whnfBuild.status === 0 && directBridgeCheck.status === 0,
    whnfBuild,
    directBridgeCheck,
    coveredLean4LeanRecursorSurface: COVERED_SURFACE,
    formalBridgeLemmas: FORMAL_LEMMAS,
    architectureHealth: architecture,
    featureEquivalenceProgress: progress,
    stillOpen: delta.stillOpen,
    requiredCommands: [
      { command: 'lake build Lean4Lean.Verify.TypeChecker.WHNF', status: whnfBuild.status },
      { command: 'lake env lean PSKernelKA45InductiveRecursorRefinementBridge.lean', status: directBridgeCheck.status },
    ],
    claimBoundary: spec.claimBoundary,
  };
  writeReports(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const soft = process.argv.includes('--soft');
  const result = runKA45InductiveRecursorRefinementBridgeGate({ strict, soft });
  console.log(JSON.stringify({
    checkpoint: result.checkpoint,
    publicVersion: result.publicVersion,
    strictInductiveRecursorBridgePassed: result.strictInductiveRecursorBridgePassed,
    antiSpaghettiGatePassed: result.architectureHealth.antiSpaghettiGatePassed,
    formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations,
    featureSurfaceBridgeProgressPercent: result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent,
    executableKernelEquivalenceProofProgressPercent: result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent,
  }, null, 2));
}
