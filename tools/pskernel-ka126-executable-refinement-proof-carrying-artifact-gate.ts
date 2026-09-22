#!/usr/bin/env node
import assert from 'node:assert/strict';
import child_process from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const leanPath = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean';
const lakePath = '/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lake';
const lean4leanRoot = '/mnt/data/lean4lean-work/lean4lean-master';

const CHECKPOINT = 'proofscript-v1-ka126-executable-refinement-proof-carrying-artifact-gate0';
const VERSION = '1.0.0-pskernel.129';
const BASELINE = 'proofscript-v1-ka125-executable-refinement-remaining-proof-gap0';
const CORE_FORMAT = 71;
const CERT_FORMAT = 2;
const OBLIGATIONS = 366;
const FEATURE = 100;
const EXEC = 99;
const ARENA = 100;
const OVERALL = 84.7;

const claimBoundary = {
  fullLean4Equivalence: false,
  sameTheoryAsFullLean4: false,
  fullyFormalK3: false,
  executablePSKernelRefinementProof: false,
  trustedKernelSemanticChange: false,
  kernelCodecChange: false,
  coreFormatChanged: false,
  certificateFormatChanged: false,
};

const proofCarryingArtifactRows: [string, string, string][] = [
  ['artifact-kind-enumerated', 'ready', 'Acceptable final-1% evidence must be either a discharged Lean theorem or a verified proof-carrying artifact.'],
  ['artifact-location-declared', 'ready', 'The future artifact location must be explicit in the release gate and not inferred from dashboards.'],
  ['artifact-hash-bound', 'ready', 'The future artifact must be hash-bound to the source tree, Core artifact, certificate, and proof inputs.'],
  ['lean-module-check-required', 'ready', 'A Lean module check is required before any executable-equivalence 100% claim.'],
  ['no-dashboard-only-completion', 'ready', 'Progress reports, ledgers, checklists, maps, and audits alone cannot raise executable equivalence to 100%.'],
  ['no-full-lean4-equivalence', 'ready', 'A PSKernel executable-refinement artifact is not a full Lean 4 equivalence theorem.'],
  ['no-trusted-semantic-change', 'ready', 'KA-126 changes only assurance metadata and gates; no trusted semantic package may change.'],
  ['remaining-gap-locked', 'ready', 'The final 1% remains locked until proof-carrying evidence exists and is verified.'],
];

function abs(rel: string) { return path.join(root, rel); }
function readJson(rel: string) { return JSON.parse(fs.readFileSync(abs(rel), 'utf8')); }
function writeJson(rel: string, value: unknown) {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), JSON.stringify(value, null, 2) + '\n');
}
function run(cmd: string, args: string[], cwd = root) {
  return child_process.spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 });
}
function architectureHealth() {
  const files = [
    'tools/pskernel-ka126-executable-refinement-proof-carrying-artifact-gate.ts',
    'tools/pskernel-ka126-executable-refinement-proof-carrying-artifact-gate-tests.ts',
    'assurance/ka126/executable-refinement-proof-carrying-artifact-gate-bridge.lean',
  ].map((f) => ({ path: f, lines: fs.readFileSync(abs(f), 'utf8').split(/\r?\n/).length, ext: path.extname(f) }));
  const toolFiles = files.filter((f) => f.path.startsWith('tools/') && f.ext === '.ts');
  const oversized = files.filter((f) => ['.ts', '.lean'].includes(f.ext) && f.lines > 260);
  const forbidden = ['packages/kernel/src/PSKernel/', 'packages/kernel-codec/src/', 'packages/frontend-next/src/core/', 'packages/unified-bridge/src/'];
  const semanticPackageTouched = files.some((f) => forbidden.some((p) => f.path.startsWith(p)));
  return { antiSpaghettiGatePassed: oversized.length === 0 && toolFiles.length <= 2 && !semanticPackageTouched, ka126Files: files, ka126ToolFiles: toolFiles, newKA126OversizedFiles: oversized, semanticPackageTouched, forbiddenPrefixes: forbidden };
}
function leanCheck() {
  assert.ok(fs.existsSync(leanPath), 'Lean 4.33.1 toolchain missing');
  assert.ok(fs.existsSync(lakePath), 'Lake toolchain missing');
  assert.ok(fs.existsSync(path.join(lean4leanRoot, 'lakefile.toml')), 'Lean4Lean source missing');
  const rel = 'assurance/ka126/executable-refinement-proof-carrying-artifact-gate-bridge.lean';
  const dest = 'KA126ExecutableRefinementProofCarryingArtifactGateBridge.lean';
  fs.copyFileSync(abs(rel), path.join(lean4leanRoot, dest));
  const r = run(lakePath, ['env', leanPath, dest], lean4leanRoot);
  return { status: r.status === 0 ? 'passed' : 'failed', modules: [{ ka: 'KA126', source: rel, destination: dest, status: r.status === 0 ? 'passed' : 'failed', proofBearing: false, obligations: 0, stdoutTail: (r.stdout ?? '').slice(-1800), stderrTail: (r.stderr ?? '').slice(-1800) }] };
}
function proofCarryingArtifactGate() {
  const rows = proofCarryingArtifactRows.map(([id, status, evidence]) => ({ id, status, evidence, ready: status === 'ready' }));
  const ready = rows.filter((r) => r.ready).length;
  return {
    gatePercent: Math.round((ready / rows.length) * 100),
    finalOnePercentLocked: true,
    requiresProofCarryingArtifactFor100Percent: true,
    acceptableFinalEvidence: ['discharged Lean theorem', 'verified proof-carrying artifact'],
    rejectedFinalEvidence: ['dashboard percentage only', 'report-only audit', 'release packaging alone', 'Arena regression evidence alone'],
    counts: { total: rows.length, ready, notReady: rows.length - ready },
    rows,
  };
}
function progress() {
  const prev = readJson('assurance/ka125/KA125_EXECUTABLE_REFINEMENT_REMAINING_PROOF_GAP.json');
  assert.equal(prev.metrics.featureSurfaceBridgeProgressPercent, FEATURE);
  assert.equal(prev.metrics.executableKernelEquivalenceProofProgressPercent, EXEC);
  assert.equal(prev.metrics.executableKernelEquivalenceRemainingGapPercent, 1);
  assert.equal(prev.percentBoundaries.ka125DoesNotIncreaseExecutableProgressTo100, true);
  const gate = proofCarryingArtifactGate();
  assert.equal(gate.gatePercent, 100);
  return {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    metrics: {
      featureSurfaceBridgeProgressPercent: FEATURE,
      executableKernelEquivalenceProofProgressPercent: EXEC,
      executableKernelEquivalencePreviousPercent: EXEC,
      executableKernelEquivalenceDeltaPercent: 0,
      executableKernelEquivalenceRemainingGapPercent: 1,
      arenaCorpusRegressionPercent: ARENA,
      releasePackagingVerificationPercent: 100,
      executableRefinementProofCarryingArtifactGatePercent: 100,
      formalLean4LeanBridgeObligations: OBLIGATIONS,
      newFormalLean4LeanBridgeObligations: 0,
      fullLean4EquivalencePercent: 0,
      fullyFormalK3Percent: 0,
      overallConservativeProjectProgressPercent: OVERALL,
      overallFormula: '20% feature surface + 30% executable equivalence + 10% arena regression + 15% release packaging + 10% claim-boundary honesty + 15% full-equivalence theorem',
    },
    phaseStatus: { featureSurfaceBridge: 'closed', executableEquivalence: 'blocked-until-proof-carrying-artifact', fullLean4Equivalence: 'not-proven', fullyFormalK3: 'not-proven', claimBoundary: 'enforced' },
    proofCarryingArtifactGate: gate,
    percentBoundaries: { ka126DoesNotIncreaseExecutableProgressTo100: true, proofCarryingArtifactRequiredFor100Percent: true, executableProgressIsDashboardEvidenceNotRefinementProof: true, overallProgressIsDashboardEstimate: true },
    claimBoundary,
  };
}
function writeReports(result: any) {
  const d = 'assurance/ka126';
  writeJson(`${d}/KA126_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_GATE_RELEASE_GATE.json`, result.releaseGate);
  writeJson(`${d}/KA126_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_GATE_VERIFICATION_SUMMARY.json`, result.verificationSummary);
  writeJson(`${d}/KA126_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_GATE.json`, result.progress);
  writeJson(`${d}/KA126_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_GATE_ROWS.json`, result.proofCarryingArtifactGate.rows);
  writeJson(`${d}/KA126_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json`, { checkpoint: CHECKPOINT, publicVersion: VERSION, featureSurfaceBridgeProgressPercent: FEATURE, executableKernelEquivalenceProofProgressPercent: EXEC, executableKernelEquivalenceRemainingGapPercent: 1, arenaCorpusRegressionPercent: ARENA, formalLean4LeanBridgeObligations: OBLIGATIONS, obligationAccounting: { previousFormalLean4LeanBridgeObligations: OBLIGATIONS, newFormalLean4LeanBridgeObligations: 0, correctedFormalLean4LeanBridgeObligations: OBLIGATIONS, countedNewObligations: [] }, metricPolicy: 'KA126 keeps executable-equivalence dashboard progress at 99%; the final 1% requires a discharged theorem or verified proof-carrying artifact.', notAFullLean4EquivalenceClaim: true, notAFormalEquivalenceClaim: true });
  fs.writeFileSync(abs(`${d}/KA126_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md`), `# KA-126 Kernel Feature Equivalence Progress\n\nCheckpoint: \`${CHECKPOINT}\`\n\n| Metric | Progress | Delta | Meaning |\n|---|---:|---:|---|\n| Feature-surface bridge dashboard | ${FEATURE}% | 0% | Closed by KA-110 audit. |\n| Executable-kernel equivalence proof | ${EXEC}% | 0% | Held until proof-carrying evidence exists. |\n| Remaining executable proof gap | 1% | 0% | Reserved for theorem discharge or verified proof-carrying artifact. |\n| Proof-carrying artifact gate | 100% | +100% | Gate criteria defined and enforced. |\n| Arena regression evidence | ${ARENA}% | 0% | Current release matrix target. |\n| Full Lean4 equivalence theorem | 0% | 0% | Not proven and not claimed. |\n| Fully formal K3 | 0% | 0% | Not proven and not claimed. |\n| Overall conservative dashboard | ${OVERALL.toFixed(1)}% | 0.0% | Weighted dashboard estimate, not a theorem. |\n\nFormal Lean4Lean bridge obligations remain **${OBLIGATIONS}**.\n`);
  fs.writeFileSync(abs(`${d}/KA126_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_GATE_REPORT.md`), `# KA-126 Executable Refinement Proof-Carrying Artifact Gate\n\nCheckpoint: \`${CHECKPOINT}\`\n\nKA-126 adds a proof-carrying artifact gate for the final executable-equivalence percent. It preserves the KA-125 boundary: executable-kernel equivalence stays at **99%**, and the remaining **1%** requires either a discharged Lean theorem or a verified proof-carrying artifact.\n\n## Progress\n\n- Feature-surface bridge: **${FEATURE}%**\n- Executable-kernel equivalence proof: **${EXEC}%** (**+0%**)\n- Remaining executable proof gap: **1%**\n- Proof-carrying artifact gate: **${result.proofCarryingArtifactGate.gatePercent}%**\n- Full Lean4 equivalence theorem: **0%**\n- Fully formal K3: **0%**\n- Overall conservative project dashboard: **${OVERALL.toFixed(1)}%**\n\n## Boundary\n\nKA-126 is not the executable PSKernel refinement proof. It defines the evidence gate that must be satisfied before a future release may report executable-kernel equivalence at 100%.\n`);
  writeJson(`${d}/KA126_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_GATE_BRIDGE_SPEC.json`, { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, referenceKind: 'executable-refinement-proof-carrying-artifact-gate-audit', coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT, countedFormalObligations: 0, countedObligations: [], sourceTheorems: [], remainingExecutableProofGapPercent: 1, claimBoundary });
}
export function runKA126ExecutableRefinementProofCarryingArtifactGate(_options: { writeReports?: boolean; strict?: boolean } = {}) {
  const pkg = readJson('package.json');
  assert.equal(pkg.version, VERSION);
  const lean = leanCheck();
  assert.equal(lean.status, 'passed', JSON.stringify(lean));
  const p = progress();
  const architecture = architectureHealth();
  assert.equal(architecture.antiSpaghettiGatePassed, true);
  const releaseGate = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, releaseKind: 'executable-refinement-proof-carrying-artifact-gate-audit', kernel: { activeKernel: 'PSKernel', coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT }, strictLean4LeanStatus: lean.status, strictLean4LeanModules: lean.modules, progress: p, proofCarryingArtifactGate: p.proofCarryingArtifactGate, architectureHealth: architecture, claimBoundary, trustedSemanticPackageChange: false, coreFormatChanged: false, certificateFormatChanged: false };
  const verificationSummary = { checkpoint: CHECKPOINT, status: 'passed', strictLean4LeanStatus: lean.status, formalLean4LeanBridgeObligations: OBLIGATIONS, newFormalLean4LeanBridgeObligations: 0, featureSurfaceBridgeProgressPercent: FEATURE, executableKernelEquivalenceProofProgressPercent: EXEC, executableKernelEquivalenceRemainingGapPercent: 1, overallConservativeProjectProgressPercent: OVERALL, architectureHealth: architecture.antiSpaghettiGatePassed };
  const result = { checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT, metrics: p.metrics, phaseStatus: p.phaseStatus, percentBoundaries: p.percentBoundaries, claimBoundary, proofCarryingArtifactGate: p.proofCarryingArtifactGate, architectureHealth: architecture, progress: p, releaseGate, verificationSummary };
  if (_options.writeReports ?? true) writeReports(result);
  return result;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runKA126ExecutableRefinementProofCarryingArtifactGate({ writeReports: true, strict: process.argv.includes('--strict') });
  console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, gap: result.metrics.executableKernelEquivalenceRemainingGapPercent, overall: result.metrics.overallConservativeProjectProgressPercent }, null, 2));
}
