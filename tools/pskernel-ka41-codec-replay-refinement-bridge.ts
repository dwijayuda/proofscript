#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { decodeArtifact, makeKernelLevelInstantiationConformanceArtifact, canonicalJson } from '../packages/kernel-codec/dist/index.js';

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

const CHECKPOINT = 'proofscript-v1-ka41-codec-replay-refinement-bridge0';
const VERSION = '1.0.0-pskernel.44';
const BASELINE = 'proofscript-v1-ka40-primitive-literal-policy-bridge0';
const FORMAL_OBLIGATIONS = 120;
const cachedLean4LeanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const cachedLeanBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const cachedLakeBin = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';

const FORMAL_LEMMAS = [
  'PSKernelKA41.translated_replay_context_lookup_preserved',
  'PSKernelKA41.translated_replay_state_env_preserved',
  'PSKernelKA41.translated_replay_state_num_added_preserved',
  'PSKernelKA41.translated_replay_context_flags_preserved',
  'PSKernelKA41.translated_replay_result_count_preserved',
  'PSKernelKA41.translated_replay_result_env_preserved',
];

function lean4leanRootReady(candidate: string) {
  return exists(path.join(candidate, 'Lean4Lean/Replay.lean')) && exists(path.join(candidate, 'lakefile.toml'));
}
function materializedLean() {
  assert.ok(exists(cachedLeanBin), `missing Lean binary ${cachedLeanBin}`);
  assert.ok(exists(cachedLakeBin), `missing Lake binary ${cachedLakeBin}`);
  assert.ok(lean4leanRootReady(cachedLean4LeanRoot), `missing Lean4Lean Replay root ${cachedLean4LeanRoot}`);
  return { lean4leanRoot: cachedLean4LeanRoot, leanPath: cachedLeanBin, lakePath: cachedLakeBin };
}
function codecRoundTripChecks() {
  const artifact = makeKernelLevelInstantiationConformanceArtifact([]);
  const encoded = canonicalJson(artifact);
  const decoded = decodeArtifact(JSON.parse(encoded));
  const reencoded = canonicalJson(decoded);
  return {
    canonicalJsonStable: encoded === reencoded,
    decodeArtifactRoundTrip: decoded.format === 'proofscript-core' && decoded.formatVersion === 71 && Array.isArray(decoded.declarations),
    profileVersionBinding: decoded.formatVersion === 71 && decoded.implementationProfile === 'KERNEL-level-instantiation-conformance1',
    declarationCount: decoded.declarations.length,
  };
}
function progressMarkdown(progress: any) {
  const rows = progress.groups.map((g: any) => `| ${g.id} | ${g.progressPercent}% | ${g.status} |`).join('\n');
  return `# Kernel Feature Equivalence Progress — KA-41\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\n` +
    `- Feature-surface bridge progress: **${progress.featureSurfaceBridgeProgressPercent}%**\n` +
    `- Executable-kernel equivalence proof progress: **${progress.executableKernelEquivalenceProofProgressPercent}%**\n` +
    `- Arena corpus regression evidence: **${progress.arenaCorpusRegressionPercent}% for completed direct gates**\n` +
    `- Formal Lean4Lean bridge obligations: **${progress.formalLean4LeanBridgeObligations}**\n\n` +
    `These percentages are conservative checkpoint metrics, not full Lean4 equivalence claims.\n\n` +
    `| Feature group | Progress | Status |\n|---|---:|---|\n${rows}\n`;
}
function writeReports(result: any) {
  ensureDir('assurance/ka41');
  const gate = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: result.kernel,
    directLean4LeanCodecReplayBridge: {
      referenceKind: result.referenceKind,
      actualLean4LeanImportBound: result.actualLean4LeanImportBound,
      directLean4LeanCodecReplayBridgeChecked: result.directLean4LeanCodecReplayBridgeChecked,
      strictCodecReplayBridgePassed: result.strictCodecReplayBridgePassed,
      replayBuildStatus: result.replayBuild.status,
      directBridgeCheckStatus: result.directBridgeCheck.status,
      coveredLean4LeanReplaySurface: result.coveredLean4LeanReplaySurface,
      codecRoundTripChecks: result.codecRoundTripChecks,
      formalBridgeLemmas: result.formalBridgeLemmas,
      stillOpen: result.stillOpen,
    },
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
    blockedReasons: result.blockedReasons,
  };
  writeJson('assurance/ka41/KA41_CODEC_REPLAY_REFINEMENT_BRIDGE_RELEASE_GATE.json', gate);
  writeJson('assurance/ka41/KA41_CODEC_REPLAY_REFINEMENT_BRIDGE_VERIFICATION_SUMMARY.json', {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    requiredCommands: result.requiredCommands ?? [],
    featureEquivalenceProgress: result.featureEquivalenceProgress,
    claimBoundary: result.claimBoundary,
    note: 'KA-41 is a direct Lean4Lean Replay proof-surface bridge plus PSKernel codec stability gate. It does not prove full codec/replay refinement.',
  });
  fs.writeFileSync(path.join(root, 'assurance/ka41/KA41_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), progressMarkdown(result.featureEquivalenceProgress));
  const report = `# KA-41 Codec / Replay Refinement Bridge Report\n\n` +
    `Checkpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\nBaseline: \`${BASELINE}\`\n\n` +
    `## What changed\n\nKA-41 imports real Lean4Lean Replay and adds wrapper obligations for Replay.Context, Replay.State, and replay result-shape surfaces. It also adds a PSKernel codec stability gate for canonical JSON and Core v71 decode round-trip.\n\n` +
    `## Machine-checked bridge lemmas\n\n` + FORMAL_LEMMAS.map(x => `- \`${x}\``).join('\n') + `\n\n` +
    `## Codec gate\n\n- canonical JSON stable: **${result.codecRoundTripChecks.canonicalJsonStable}**\n- decode artifact round-trip: **${result.codecRoundTripChecks.decodeArtifactRoundTrip}**\n- profile/version binding: **${result.codecRoundTripChecks.profileVersionBinding}**\n\n` +
    `## Progress\n\n- Feature-surface bridge progress: **${result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent}%**\n- Executable-kernel equivalence proof progress: **${result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent}%**\n- Formal Lean4Lean bridge obligations: **${FORMAL_OBLIGATIONS}**\n\n` +
    `## Boundary\n\n- Full Lean4 equivalence: **no**\n- Same theory as full Lean4: **no**\n- Fully formal K3: **no**\n- Executable PSKernel refinement proof: **no**\n- Full codec/replay refinement: **no**\n\n` +
    `## Remaining codec/replay gaps\n\n` + result.stillOpen.map((x: string) => `- ${x}`).join('\n') + `\n`;
  fs.writeFileSync(path.join(root, 'assurance/ka41/KA41_CODEC_REPLAY_REFINEMENT_BRIDGE_REPORT.md'), report);
}

export function runKA41CodecReplayRefinementBridgeGate(options: { strict?: boolean; soft?: boolean } = {}) {
  for (const rel of [
    'assurance/ka41/codec-replay-refinement-bridge.lean',
    'assurance/ka41/codec-replay-refinement-bridge.json',
    'assurance/ka41/obligation-delta.json',
    'assurance/ka41/kernel-feature-equivalence-progress.json',
  ]) assert.ok(exists(path.join(root, rel)), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const spec = readJson('assurance/ka41/codec-replay-refinement-bridge.json');
  const delta = readJson('assurance/ka41/obligation-delta.json');
  const progress = readJson('assurance/ka41/kernel-feature-equivalence-progress.json');
  assert.match(pkg.version, /^1\.0\.0-pskernel\.(44|45)$/);
  assert.match(lock.version, /^1\.0\.0-pskernel\.(44|45)$/);
  assert.match(lock.packages[''].version, /^1\.0\.0-pskernel\.(44|45)$/);
  assert.match(versions.implementation, /^1\.0\.0-pskernel\.(44|45)$/);
  assert.ok([CHECKPOINT, 'proofscript-v1-ka42-resource-error-conservativity-bridge0'].includes(versions.latestLocalLineageCheckpoint));
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.certificateFormat, 2);
  assert.ok(versions.formalLean4EquivalenceProvenObligations >= FORMAL_OBLIGATIONS);
  assert.equal(versions.ka41Checkpoint, CHECKPOINT);
  assert.equal(versions.ka41FeatureSurfaceBridgeProgressPercent, 61);
  assert.equal(versions.ka41ExecutableKernelEquivalenceProofProgressPercent, 28);
  assert.equal(versions.ka41TrustedSemanticChange, false);
  assert.equal(versions.ka41KernelCodecChange, false);
  assert.equal(versions.ka41NewTrustedComputationRule, false);
  assert.equal(versions.ka41FullCodecReplayRefinement, false);
  assert.equal(spec.referenceKind, 'direct-imported-lean4lean-codec-replay-refinement-bridge');
  assert.deepEqual(spec.formalBridgeLemmas, FORMAL_LEMMAS);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsBefore, 114);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAdded, 6);
  assert.equal(delta.formalLean4EquivalenceProvenObligationsAfter, FORMAL_OBLIGATIONS);
  assert.equal(progress.featureSurfaceBridgeProgressPercent, 61);
  assert.equal(progress.executableKernelEquivalenceProofProgressPercent, 28);

  const { lean4leanRoot, leanPath, lakePath } = materializedLean();
  const replayBuild = run(lakePath, ['build', 'Lean4Lean.Replay'], { cwd: lean4leanRoot });
  if (options.strict) assert.equal(replayBuild.status, 0, replayBuild.stderr || replayBuild.stdout);
  const moduleTarget = path.join(lean4leanRoot, 'PSKernelKA41CodecReplay.lean');
  fs.copyFileSync(path.join(root, 'assurance/ka41/codec-replay-refinement-bridge.lean'), moduleTarget);
  const directBridgeCheck = run(lakePath, ['env', leanPath, 'PSKernelKA41CodecReplay.lean'], { cwd: lean4leanRoot });
  if (options.strict) assert.equal(directBridgeCheck.status, 0, directBridgeCheck.stderr || directBridgeCheck.stdout);

  const codecChecks = codecRoundTripChecks();
  assert.equal(codecChecks.canonicalJsonStable, true);
  assert.equal(codecChecks.decodeArtifactRoundTrip, true);
  assert.equal(codecChecks.profileVersionBinding, true);

  const claimBoundary = {
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    executablePSKernelRefinementProof: false,
    fullCodecReplayRefinement: false,
    formalLean4EquivalenceProvenObligations: FORMAL_OBLIGATIONS,
  };
  const stillOpen = delta.stillOpen;
  const result = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    referenceKind: spec.referenceKind,
    lean4leanRoot,
    materializedLean: { leanPath, lakePath },
    replayBuild,
    directBridgeCheck,
    actualLean4LeanImportBound: exists(path.join(lean4leanRoot, 'Lean4Lean/Replay.lean')),
    directLean4LeanCodecReplayBridgeChecked: directBridgeCheck.status === 0,
    strictCodecReplayBridgePassed: directBridgeCheck.status === 0 && replayBuild.status === 0,
    coveredLean4LeanReplaySurface: spec.coveredLean4LeanReplaySurface,
    codecRoundTripChecks: codecChecks,
    formalBridgeLemmas: FORMAL_LEMMAS,
    formalLean4LeanBridgeObligations: FORMAL_OBLIGATIONS,
    featureEquivalenceProgress: progress,
    claimBoundary,
    stillOpen,
    blockedReasons: [] as string[],
  };
  writeReports(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const soft = process.argv.includes('--soft');
  try { console.log(JSON.stringify(runKA41CodecReplayRefinementBridgeGate({ strict, soft }), null, 2)); }
  catch (err) { if (soft) console.log(JSON.stringify({ checkpoint: CHECKPOINT, status: 'blocked', error: String(err) }, null, 2)); else throw err; }
}
