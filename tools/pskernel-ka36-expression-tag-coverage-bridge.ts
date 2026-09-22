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

const CHECKPOINT = 'proofscript-v1-ka36-expression-tag-coverage-bridge0';
const VERSION = '1.0.0-pskernel.39';
const BASELINE = 'proofscript-v1-ka35-typechecker-refinement-bridge0';
const FORMAL_OBLIGATIONS = 82;
const cachedLean4LeanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const uploadedLean4LeanRoot = '/mnt/data/lean4lean10/lean4lean-master';
const cachedLeanBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const cachedLakeBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';

function lean4leanRootReady(candidate: string) {
  return exists(path.join(candidate, 'Lean4Lean/Verify/Typing/Expr.lean')) &&
    exists(path.join(candidate, 'Lean4Lean/Theory/VExpr.lean')) &&
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
  throw new Error('Lean4Lean root is present but not dependency-ready for KA-36');
}
function findMaterializedLean() {
  if (!exists(cachedLeanBin) || !exists(cachedLakeBin)) {
    runKA11Gate({ strict: true });
  }
  assert.ok(exists(cachedLeanBin), `missing Lean binary ${cachedLeanBin}`);
  assert.ok(exists(cachedLakeBin), `missing Lake binary ${cachedLakeBin}`);
  return { leanPath: cachedLeanBin, lakePath: cachedLakeBin };
}

const FORMAL_LEMMAS = [
  'PSKernelKA36.translated_bvar_expr_tag_covered',
  'PSKernelKA36.translated_fvar_expr_tag_covered',
  'PSKernelKA36.translated_sort_expr_tag_covered',
  'PSKernelKA36.translated_const_expr_tag_covered',
  'PSKernelKA36.translated_app_expr_tag_covered',
  'PSKernelKA36.translated_lam_expr_tag_covered',
  'PSKernelKA36.translated_forall_expr_tag_covered',
  'PSKernelKA36.translated_let_expr_tag_covered',
  'PSKernelKA36.translated_lit_expr_tag_covered',
  'PSKernelKA36.translated_mdata_expr_tag_covered',
  'PSKernelKA36.translated_proj_expr_tag_covered',
];
const COVERED_TAGS = ['bvar', 'fvar', 'sort', 'const', 'app', 'lam', 'forallE', 'letE', 'lit', 'mdata', 'proj'];

function copyModule(lean4leanRoot: string, rel: string, moduleFile: string) {
  const src = path.join(root, rel);
  assert.ok(exists(src), `missing ${rel}`);
  fs.copyFileSync(src, path.join(lean4leanRoot, moduleFile));
}

function writeReports(result: any) {
  ensureDir('assurance/ka36');
  const gate = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    directLean4LeanExpressionTagCoverageBridge: {
      referenceKind: result.referenceKind,
      actualLean4LeanImportBound: result.actualLean4LeanImportBound,
      directLean4LeanExpressionTagCoverageBridgeChecked: result.directLean4LeanExpressionTagCoverageBridgeChecked,
      strictExpressionTagCoverageBridgePassed: result.strictExpressionTagCoverageBridgePassed,
      typingExprBuildStatus: result.typingExprBuild.status,
      directBridgeCheckStatus: result.directBridgeCheck.status,
      coveredLean4LeanTrExprSTags: result.coveredLean4LeanTrExprSTags,
      rawLeanExprTagsStillOutsideThisBridge: result.rawLeanExprTagsStillOutsideThisBridge,
      formalBridgeLemmas: result.formalBridgeLemmas,
      stillOpen: result.stillOpen,
    },
    claimBoundary: result.claimBoundary,
    blockedReasons: result.blockedReasons,
  };
  writeJson('assurance/ka36/KA36_RELEASE_GATE.json', gate);
  const summary = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    requiredCommands: result.requiredCommands ?? [],
    claimBoundary: result.claimBoundary,
    note: 'KA-36 is a direct Lean4Lean TrExprS constructor-surface bridge. It does not prove executable PSKernel expression translator refinement or full Lean equivalence.',
  };
  writeJson('assurance/ka36/KA36_VERIFICATION_SUMMARY.json', summary);
  const report = `# KA-36 Expression Tag Coverage Bridge Report\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `Public version: \`${VERSION}\`\n\n` +
    `Baseline: \`${BASELINE}\`\n\n` +
    `## What changed\n\n` +
    `KA-36 adds a conditional direct Lean4Lean bridge for the full constructor surface of ` +
    `\`Lean4Lean.TrExprS\`: ${COVERED_TAGS.join(', ')}.\n\n` +
    `## Machine-checked bridge lemmas\n\n` +
    FORMAL_LEMMAS.map(x => `- \`${x}\``).join('\n') + `\n\n` +
    `## Boundary\n\n` +
    `- Full Lean 4 equivalence: **no**\n` +
    `- Same theory as full Lean 4: **no**\n` +
    `- Fully formal K3: **no**\n` +
    `- Executable PSKernel refinement proof: **no**\n` +
    `- Raw Lean.Expr metavariable coverage: **no**\n` +
    `- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Remaining expression gaps\n\n` +
    result.stillOpen.map((x: string) => `- ${x}`).join('\n') + `\n`;
  fs.writeFileSync(path.join(root, 'assurance/ka36/KA36_REPORT.md'), report);
}

export function runKA36ExpressionTagCoverageBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka36/expression-tag-coverage-bridge.lean',
    'assurance/ka36/expression-tag-coverage-bridge.json',
    'assurance/ka36/obligation-delta.json',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka36/expression-tag-coverage-bridge.json');
  const delta = readJson('assurance/ka36/obligation-delta.json');
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
  assert.equal(versions.ka36Checkpoint, CHECKPOINT);
  assert.equal(versions.ka36FormalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(versions.ka36TrustedSemanticChange, false);
  assert.equal(versions.ka36KernelCodecChange, false);
  assert.equal(versions.ka36NewTrustedComputationRule, false);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-expression-tag-coverage-bridge');
  assert.deepEqual(spec.coveredLean4LeanTrExprSTags, COVERED_TAGS);
  assert.deepEqual(spec.formalBridgeLemmas, FORMAL_LEMMAS);
  assert.equal(spec.claimBoundary.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAfter, FORMAL_OBLIGATIONS);

  const lean4leanRoot = findLean4LeanRoot();
  const materialized = findMaterializedLean();
  const env = { ...process.env, PATH: `${path.dirname(materialized.lakePath)}:${process.env.PATH ?? ''}` };
  const typingExprBuild = run(materialized.lakePath, ['build', 'Lean4Lean.Verify.Typing.Expr'], { cwd: lean4leanRoot, env });
  if (options.strict && typingExprBuild.status !== 0) throw new Error(`Lean4Lean Verify.Typing.Expr build failed\nSTDOUT:\n${tail(typingExprBuild.stdout)}\nSTDERR:\n${tail(typingExprBuild.stderr)}`);

  copyModule(lean4leanRoot, 'assurance/ka36/expression-tag-coverage-bridge.lean', 'PSKernelKA36ExpressionTagCoverageBridge.lean');
  const directBridgeCheck = run(materialized.lakePath, ['env', materialized.leanPath, 'PSKernelKA36ExpressionTagCoverageBridge.lean'], { cwd: lean4leanRoot, env });
  if (options.strict && directBridgeCheck.status !== 0) throw new Error(`KA36 expression tag coverage bridge Lean check failed\nSTDOUT:\n${tail(directBridgeCheck.stdout)}\nSTDERR:\n${tail(directBridgeCheck.stderr)}`);

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
    directLean4LeanExpressionTagCoverageBridgeChecked: directBridgeCheck.status === 0,
    strictExpressionTagCoverageBridgePassed: typingExprBuild.status === 0 && directBridgeCheck.status === 0,
    typingExprBuild,
    directBridgeCheck,
    coveredLean4LeanTrExprSTags: spec.coveredLean4LeanTrExprSTags,
    rawLeanExprTagsStillOutsideThisBridge: spec.rawLeanExprTagsStillOutsideThisBridge,
    formalBridgeLemmas: FORMAL_LEMMAS,
    stillOpen: delta.stillOpen,
    blockedReasons: [],
    requiredCommands: [
      { command: 'lake build Lean4Lean.Verify.Typing.Expr', status: typingExprBuild.status },
      { command: 'lake env lean PSKernelKA36ExpressionTagCoverageBridge.lean', status: directBridgeCheck.status },
    ],
    claimBoundary: spec.claimBoundary,
  };
  writeReports(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const soft = process.argv.includes('--soft');
  const result = runKA36ExpressionTagCoverageBridgeGate({ strict, soft });
  console.log(JSON.stringify({
    checkpoint: result.checkpoint,
    publicVersion: result.publicVersion,
    strictExpressionTagCoverageBridgePassed: result.strictExpressionTagCoverageBridgePassed,
    formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations,
    typingExprBuildStatus: result.typingExprBuild.status,
    directBridgeCheckStatus: result.directBridgeCheck.status,
  }, null, 2));
}
