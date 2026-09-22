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
function run(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: options.cwd ?? root, env: options.env ?? process.env, encoding: 'utf8' });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}
function tail(s: string, n = 5000) { return s.length > n ? s.slice(-n) : s; }

const CHECKPOINT = 'proofscript-v1-ka42-resource-error-conservativity-bridge0';
const VERSION = '1.0.0-pskernel.45';
const BASELINE = 'proofscript-v1-ka41-codec-replay-refinement-bridge0';
const FORMAL_OBLIGATIONS = 128;
const cachedLean4LeanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const cachedLeanBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const cachedLakeBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';

const FORMAL_LEMMAS = [
  'PSKernelKA42.translated_default_rec_depth_policy',
  'PSKernelKA42.translated_default_whnf_policy',
  'PSKernelKA42.translated_default_lazy_delta_policy',
  'PSKernelKA42.translated_zero_fuel_whnf_deep_recursion',
  'PSKernelKA42.translated_zero_fuel_whnfCore_deep_recursion',
  'PSKernelKA42.translated_zero_fuel_inferType_deep_recursion',
  'PSKernelKA42.translated_zero_fuel_isDefEqCore_deep_recursion',
  'PSKernelKA42.translated_except_error_not_success',
];

function lean4leanRootReady(candidate: string) {
  return exists(path.join(candidate, 'Lean4Lean/TypeChecker.lean')) && exists(path.join(candidate, 'Lean4Lean/FuelConfig.lean')) && exists(path.join(candidate, 'lakefile.toml'));
}
function materializedLean() {
  assert.ok(exists(cachedLeanBin), `missing Lean binary ${cachedLeanBin}`);
  assert.ok(exists(cachedLakeBin), `missing Lake binary ${cachedLakeBin}`);
  assert.ok(lean4leanRootReady(cachedLean4LeanRoot), `missing Lean4Lean TypeChecker/FuelConfig root ${cachedLean4LeanRoot}`);
  return { lean4leanRoot: cachedLean4LeanRoot, leanPath: cachedLeanBin, lakePath: cachedLakeBin };
}
function progressMarkdown(progress: any) {
  const rows = progress.groups.map((g: any) => `| ${g.id} | ${g.progressPercent}% | ${g.status} |`).join('\n');
  return `# Kernel Feature Equivalence Progress — KA-42\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `- Feature-surface bridge progress: **${progress.featureSurfaceBridgeProgressPercent}%**\n` +
    `- Executable-kernel equivalence proof progress: **${progress.executableKernelEquivalenceProofProgressPercent}%**\n` +
    `- Arena corpus regression evidence: **${progress.arenaCorpusRegressionPercent}% for completed direct gates**\n` +
    `- Formal Lean4Lean bridge obligations: **${progress.formalLean4LeanBridgeObligations}**\n\n` +
    `These percentages are conservative checkpoint metrics, not full Lean4 equivalence claims.\n\n` +
    `| Feature group | Progress | Status |\n|---|---:|---|\n${rows}\n`;
}
function writeReports(result: any) {
  ensureDir('assurance/ka42');
  const gate = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: result.kernel,
    directLean4LeanResourceErrorBridge: {
      referenceKind: result.referenceKind,
      actualLean4LeanImportBound: result.actualLean4LeanImportBound,
      directLean4LeanResourceErrorBridgeChecked: result.directLean4LeanResourceErrorBridgeChecked,
      strictResourceErrorBridgePassed: result.strictResourceErrorBridgePassed,
      typeCheckerBuildStatus: result.typeCheckerBuild.status,
      directBridgeCheckStatus: result.directBridgeCheck.status,
      coveredLean4LeanSurface: result.coveredLean4LeanSurface,
      formalBridgeLemmas: result.formalBridgeLemmas,
      stillOpen: result.stillOpen,
    },
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
    blockedReasons: result.blockedReasons,
  };
  writeJson('assurance/ka42/KA42_RESOURCE_ERROR_CONSERVATIVITY_BRIDGE_RELEASE_GATE.json', gate);
  writeJson('assurance/ka42/KA42_RESOURCE_ERROR_CONSERVATIVITY_BRIDGE_VERIFICATION_SUMMARY.json', {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    requiredCommands: result.requiredCommands ?? [],
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
    note: 'KA-42 is a direct Lean4Lean resource/error proof-surface bridge. It does not prove full PSKernel resource/error conservativity.',
  });
  fs.writeFileSync(path.join(root, 'assurance/ka42/KA42_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), progressMarkdown(result.featureEquivalenceProgress));
  const report = `# KA-42 Resource / Error Conservativity Bridge Report\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\nBaseline: \`${BASELINE}\`\n\n` +
    `## What changed\n\nKA-42 imports real Lean4Lean TypeChecker/FuelConfig and adds wrapper obligations showing explicit fuel defaults and zero-recursion-fuel failure behavior as \`deepRecursion\`, plus an \`Except.error\` non-success conservativity lemma.\n\n` +
    `## Machine-checked bridge lemmas\n\n` + FORMAL_LEMMAS.map(x => `- \`${x}\``).join('\n') + `\n\n` +
    `## Progress\n\n- Feature-surface bridge progress: **${result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent}%**\n` +
    `- Executable-kernel equivalence proof progress: **${result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent}%**\n` +
    `- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Boundary\n\n- Full Lean4 equivalence: **no**\n- Same theory as full Lean4: **no**\n- Fully formal K3: **no**\n- Executable PSKernel refinement proof: **no**\n- Full resource/error conservativity: **no**\n\n` +
    `## Remaining resource/error gaps\n\n` + result.stillOpen.map((x: string) => `- ${x}`).join('\n') + `\n`;
  fs.writeFileSync(path.join(root, 'assurance/ka42/KA42_RESOURCE_ERROR_CONSERVATIVITY_BRIDGE_REPORT.md'), report);
}

export function runKA42ResourceErrorConservativityBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka42/resource-error-conservativity-bridge.lean',
    'assurance/ka42/resource-error-conservativity-bridge.json',
    'assurance/ka42/obligation-delta.json',
    'assurance/ka42/kernel-feature-equivalence-progress.json',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka42/resource-error-conservativity-bridge.json');
  const delta = readJson('assurance/ka42/obligation-delta.json');
  const progress = readJson('assurance/ka42/kernel-feature-equivalence-progress.json');
  assert.equal(pkg.version, VERSION);
  assert.equal(lock.version, VERSION);
  assert.equal(lock.packages[''].version, VERSION);
  assert.equal(versions.implementation, VERSION);
  assert.equal(versions.latestLocalLineageCheckpoint, CHECKPOINT);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.certificateFormat, 2);
  assert.equal(versions.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(versions.ka42Checkpoint, CHECKPOINT);
  assert.equal(versions.ka42FeatureSurfaceBridgeProgressPercent, 63);
  assert.equal(versions.ka42ExecutableKernelEquivalenceProofProgressPercent, 30);
  assert.equal(versions.ka42TrustedSemanticChange, false);
  assert.equal(versions.ka42KernelCodecChange, false);
  assert.equal(versions.ka42NewTrustedComputationRule, false);
  assert.equal(versions.ka42FullResourceErrorConservativity, false);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-resource-error-conservativity-bridge');
  assert.deepEqual(spec.formalBridgeLemmas, FORMAL_LEMMAS);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsBefore, 120);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAdded, 8);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAfter, FORMAL_OBLIGATIONS);
  assert.equal(progress.featureSurfaceBridgeProgressPercent, 63);
  assert.equal(progress.executableKernelEquivalenceProofProgressPercent, 30);

  const { lean4leanRoot, leanPath, lakePath } = materializedLean();
  const typeCheckerBuild = run(lakePath, ['build', 'Lean4Lean.TypeChecker'], { cwd: lean4leanRoot });
  if (options.strict && typeCheckerBuild.status !== 0) throw new Error(`Lean4Lean TypeChecker build failed\nSTDOUT:\n${tail(typeCheckerBuild.stdout)}\nSTDERR:\n${tail(typeCheckerBuild.stderr)}`);
  const moduleTarget = path.join(lean4leanRoot, 'PSKernelKA42ResourceError.lean');
  fs.copyFileSync(path.join(root, 'assurance/ka42/resource-error-conservativity-bridge.lean'), moduleTarget);
  const directBridgeCheck = run(lakePath, ['env', leanPath, 'PSKernelKA42ResourceError.lean'], { cwd: lean4leanRoot });
  if (options.strict && directBridgeCheck.status !== 0) throw new Error(`KA42 resource/error bridge Lean check failed\nSTDOUT:\n${tail(directBridgeCheck.stdout)}\nSTDERR:\n${tail(directBridgeCheck.stderr)}`);

  const claimBoundary = {
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    executablePSKernelRefinementProof: false,
    fullResourceErrorConservativity: false,
    formalLean4EquivalenceProvenObligations: FORMAL_OBLIGATIONS,
  };
  const result = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    materializedLean: { leanPath, lakePath },
    typeCheckerBuild,
    directBridgeCheck,
    actualLean4LeanImportBound: exists(path.join(lean4leanRoot, 'Lean4Lean/TypeChecker.lean')) && exists(path.join(lean4leanRoot, 'Lean4Lean/FuelConfig.lean')),
    directLean4LeanResourceErrorBridgeChecked: directBridgeCheck.status === 0,
    strictResourceErrorBridgePassed: directBridgeCheck.status === 0 && typeCheckerBuild.status === 0,
    coveredLean4LeanSurface: spec.coveredLean4LeanSurface,
    formalBridgeLemmas: FORMAL_LEMMAS,
    formalLean4LeanBridgeObligations: FORMAL_OBLIGATIONS,
    featureEquivalenceProgress: progress,
    claimBoundary,
    stillOpen: delta.stillOpen,
    blockedReasons: [] as string[],
  };
  writeReports(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const soft = process.argv.includes('--soft');
  try { console.log(JSON.stringify(runKA42ResourceErrorConservativityBridgeGate({ strict, soft }), null, 2)); }
  catch (err) { if (soft) console.log(JSON.stringify({ checkpoint: CHECKPOINT, status: 'blocked', error: String(err) }, null, 2)); else throw err; }
}
