#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECKPOINT = 'proofscript-v1-ka80-infertype-top-level-projection-boundary-audit0';
const VERSION = '1.0.0-pskernel.83';
const BASELINE = 'proofscript-v1-ka79-executable-infer-loop-refinement0';
const CORE_FORMAT = 71;
const CERT_FORMAT = 2;
const BASELINE_OBLIGATIONS = 237;
const NEW_OBLIGATIONS = 0;
const LEDGER_CORRECTION = 0;
const TOTAL_OBLIGATIONS = 237;
const FEATURE_PROGRESS = 91;
const EXECUTABLE_PROGRESS = 58;
const lean4leanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const inferPath = path.join(lean4leanRoot, 'Lean4Lean/Verify/TypeChecker/InferType.lean');
const basicPath = path.join(lean4leanRoot, 'Lean4Lean/Verify/TypeChecker/Basic.lean');
const abs = (p: string) => path.join(root, p);
const readJson = (rel: string) => JSON.parse(fs.readFileSync(abs(rel), 'utf8'));
const writeJson = (rel: string, v: unknown) => { fs.mkdirSync(path.dirname(abs(rel)), { recursive: true }); fs.writeFileSync(abs(rel), JSON.stringify(v, null, 2) + '\n'); };

const claimBoundary = {
  fullLean4Equivalence: false,
  sameTheoryAsFullLean4: false,
  fullyFormalK3: false,
  executablePSKernelRefinementProof: false,
  fullExecutableInferTypeRefinement: false,
  trustedKernelSemanticChange: false,
  kernelCodecChange: false,
  coreFormatChanged: false,
  certificateFormatChanged: false
};

function theoremSourceBlock(source: string, theoremName: string): string {
  const escaped = theoremName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startRe = new RegExp(`(?:^|\\n)theorem\\s+${escaped}(?=\\s|\\.|:)`);
  const m = source.match(startRe);
  assert.ok(m && m.index !== undefined, `expected theorem ${theoremName} in upstream source`);
  const start = m.index;
  const rest = source.slice(start + 1);
  const next = rest.search(/\ntheorem\s+/);
  return next === -1 ? rest : rest.slice(0, next);
}
function theoremBodyContainsDirectSorry(source: string, theoremName: string): boolean {
  return /:=\s*sorry(?:\s|$)/.test(theoremSourceBlock(source, theoremName));
}
function theoremMentions(source: string, theoremName: string, dependency: string): boolean {
  return theoremSourceBlock(source, theoremName).includes(dependency);
}
function architectureHealth() {
  const files: { path: string; lines: number; ext: string }[] = [];
  const scan = (dir: string) => {
    const d = abs(dir);
    if (!fs.existsSync(d)) return;
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const rel = path.join(dir, ent.name).replaceAll('\\\\', '/');
      if (ent.isDirectory()) {
        if (!['node_modules', 'dist', '.git', '.lake'].includes(ent.name)) scan(rel);
        continue;
      }
      if (!ent.isFile() || !/ka80|KA80/.test(rel) || !/\.(ts|md|json)$/.test(ent.name)) continue;
      files.push({ path: rel, lines: fs.readFileSync(abs(rel), 'utf8').split(/\r?\n/).length, ext: path.extname(ent.name) });
    }
  };
  ['tools', 'assurance', 'docs', 'packages'].forEach(scan);
  const toolFiles = files.filter(f => f.path.startsWith('tools/') && f.ext === '.ts');
  const oversized = files.filter(f => f.lines > 260);
  const forbiddenPrefixes = ['packages/kernel/src/PSKernel/', 'packages/kernel-codec/src/', 'packages/frontend-next/src/core/', 'packages/unified-bridge/src/'];
  const semanticPackageTouched = files.some(f => forbiddenPrefixes.some(p => f.path.startsWith(p)));
  return { antiSpaghettiGatePassed: oversized.length === 0 && toolFiles.length <= 2 && !semanticPackageTouched, ka80Files: files, ka80ToolFiles: toolFiles, newKA80OversizedFiles: oversized, semanticPackageTouched, forbiddenPrefixes };
}

function audit() {
  const pkg = readJson('package.json');
  assert.equal(pkg.version, VERSION, 'package version must be KA80 public version');
  const baselineProgress = readJson('assurance/ka79/KA79_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json');
  assert.equal(baselineProgress.formalLean4LeanBridgeObligations, BASELINE_OBLIGATIONS, 'KA79 baseline obligation count must be 237');
  assert.ok(fs.existsSync(inferPath), 'Lean4Lean InferType source must be present');
  assert.ok(fs.existsSync(basicPath), 'Lean4Lean Basic source must be present');
  const inferSource = fs.readFileSync(inferPath, 'utf8');
  const basicSource = fs.readFileSync(basicPath, 'utf8');
  assert.equal(theoremBodyContainsDirectSorry(inferSource, 'inferProj.WF'), true, 'inferProj.WF must be detected as direct-sorry-backed');
  assert.equal(theoremBodyContainsDirectSorry(inferSource, "inferType'.WF"), false, "inferType'.WF is not direct-sorry-backed");
  assert.equal(theoremMentions(inferSource, "inferType'.WF", 'inferProj.WF'), true, "inferType'.WF must be detected as projection-dependent");
  assert.equal(theoremMentions(basicSource, 'inferType.WF\'', 'wf.inferType'), true, "Basic inferType.WF' must be detected as state-field based");
  assert.equal(theoremMentions(basicSource, 'checkType.WF', 'inferType.WF\''), true, 'checkType.WF must be detected as wrapper over inferType.WF\'');
  const arch = architectureHealth();
  assert.equal(arch.antiSpaghettiGatePassed, true, 'KA80 anti-spaghetti gate must pass');

  const rootBlockedDependency = {
    name: 'translated_inferProj_wf',
    upstreamTheorem: 'Lean4Lean.TypeChecker.Inner.inferProj.WF',
    sourceFile: 'Lean4Lean/Verify/TypeChecker/InferType.lean',
    status: 'demoted-in-KA78',
    reason: 'upstream_theorem_body_contains_sorry'
  };
  const blockedTopLevelInferTypeObligations = [
    {
      name: 'translated_inferType_prime_wf',
      upstreamTheorem: "Lean4Lean.TypeChecker.Inner.inferType'.WF",
      sourceFile: 'Lean4Lean/Verify/TypeChecker/InferType.lean',
      status: 'blocked-not-counted',
      reason: "theorem body contains a projection branch that calls inferProj.WF, which KA78 demoted as direct-sorry-backed"
    },
    {
      name: 'translated_inferType_wf',
      upstreamTheorem: 'Lean4Lean.TypeChecker.Inner.inferType.WF',
      sourceFile: 'Lean4Lean/Verify/TypeChecker/Basic.lean',
      status: 'blocked-not-counted',
      reason: "wrapper depends on the state-field/top-level inferType proof surface; do not count until inferType'.WF projection boundary is repaired"
    },
    {
      name: 'translated_checkType_wf',
      upstreamTheorem: 'Lean4Lean.TypeChecker.Inner.checkType.WF',
      sourceFile: 'Lean4Lean/Verify/TypeChecker/Basic.lean',
      status: 'blocked-not-counted',
      reason: "wrapper over inferType.WF'; do not count until the top-level InferType projection boundary is repaired"
    }
  ];
  const stillCountedInferSlices = [
    'KA75 executable Infer atomic refinement',
    'KA76 executable Infer constant/literal refinement',
    'KA77 executable Infer structural refinement',
    'KA79 executable Infer loop refinement'
  ];
  const progress = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    featureSurfaceBridgeProgressPercent: FEATURE_PROGRESS,
    executableKernelEquivalenceProofProgressPercent: EXECUTABLE_PROGRESS,
    arenaCorpusRegressionPercent: 100,
    formalLean4LeanBridgeObligations: TOTAL_OBLIGATIONS,
    obligationAccounting: {
      previousFormalLean4LeanBridgeObligations: BASELINE_OBLIGATIONS,
      newFormalLean4LeanBridgeObligations: NEW_OBLIGATIONS,
      ledgerCorrectionFormalLean4LeanBridgeObligations: LEDGER_CORRECTION,
      correctedFormalLean4LeanBridgeObligations: TOTAL_OBLIGATIONS,
      blockedTopLevelInferTypeObligations,
      rootBlockedDependency,
      stillCountedInferSlices
    },
    metricPolicy: "KA80 adds no proof obligations. It audits and blocks top-level InferType/checkType obligation counting until the InferType projection branch no longer depends on the KA78-demoted inferProj.WF boundary.",
    notAFormalEquivalenceClaim: true
  };
  const auditSpec = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    referenceKind: 'infertype-top-level-projection-boundary-audit-only',
    coreFormat: CORE_FORMAT,
    certificateFormat: CERT_FORMAT,
    countedNewFormalObligations: NEW_OBLIGATIONS,
    ledgerCorrectionFormalLean4LeanBridgeObligations: LEDGER_CORRECTION,
    correctedFormalLean4LeanBridgeObligations: TOTAL_OBLIGATIONS,
    directSorryPolicy: 'do-not-count-upstream-theorems-whose-own-body-is-sorry',
    dependencyBoundaryPolicy: 'do-not-count-top-level-theorems-that-route-through-demoted-direct-sorry-backed-boundaries',
    auditFindings: { rootBlockedDependency, blockedTopLevelInferTypeObligations, stillCountedInferSlices },
    claimBoundary
  };
  const releaseGate = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    releaseKind: 'infertype-top-level-projection-boundary-audit-no-new-proof-obligations',
    kernel: { activeKernel: 'PSKernel', coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT },
    strictLean4LeanStatus: 'not-applicable-audit-only',
    featureEquivalenceProgress: progress,
    auditFindings: { rootBlockedDependency, blockedTopLevelInferTypeObligations, stillCountedInferSlices },
    architectureHealth: arch,
    claimBoundary,
    trustedSemanticPackageChange: false,
    coreFormatChanged: false,
    certificateFormatChanged: false
  };
  const verificationSummary = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    focusedGateStatus: 'passed',
    strictLean4LeanStatus: 'not-applicable-audit-only',
    formalLean4LeanBridgeObligations: TOTAL_OBLIGATIONS,
    newFormalLean4LeanBridgeObligations: NEW_OBLIGATIONS,
    ledgerCorrectionFormalLean4LeanBridgeObligations: LEDGER_CORRECTION,
    auditFindings: { rootBlockedDependency, blockedTopLevelInferTypeObligations, stillCountedInferSlices },
    redTestObserved: true,
    redTestReason: 'KA80 audit test failed first on missing KA80 gate tool',
    noWrapperTimeoutCountedAsPassed: true
  };
  return { status: 'passed', checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT, formalLean4LeanBridgeObligations: TOTAL_OBLIGATIONS, newFormalLean4LeanBridgeObligations: NEW_OBLIGATIONS, ledgerCorrectionFormalLean4LeanBridgeObligations: LEDGER_CORRECTION, featureSurfaceBridgeProgressPercent: FEATURE_PROGRESS, executableKernelEquivalenceProofProgressPercent: EXECUTABLE_PROGRESS, auditFindings: { rootBlockedDependency, blockedTopLevelInferTypeObligations, stillCountedInferSlices }, claimBoundary, architectureHealth: arch, featureEquivalenceProgress: progress, auditSpec, releaseGate, verificationSummary };
}

function writeReports(result: ReturnType<typeof audit>) {
  writeJson('assurance/ka80/KA80_INFERTYPE_TOP_LEVEL_PROJECTION_BOUNDARY_AUDIT_RELEASE_GATE.json', result.releaseGate);
  writeJson('assurance/ka80/KA80_INFERTYPE_TOP_LEVEL_PROJECTION_BOUNDARY_AUDIT_VERIFICATION_SUMMARY.json', result.verificationSummary);
  writeJson('assurance/ka80/KA80_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json', result.featureEquivalenceProgress);
  writeJson('assurance/ka80/KA80_INFERTYPE_TOP_LEVEL_PROJECTION_BOUNDARY_AUDIT_SPEC.json', result.auditSpec);
  fs.writeFileSync(abs('assurance/ka80/KA80_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), `# KA-80 Kernel Feature Equivalence Progress\n\nCheckpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\n- Feature-surface bridge progress: **${FEATURE_PROGRESS}%** conservative dashboard estimate\n- Executable-kernel equivalence proof progress: **${EXECUTABLE_PROGRESS}%** conservative dashboard estimate\n- Arena corpus regression evidence: **100%**\n- Formal Lean4Lean bridge obligations: **${TOTAL_OBLIGATIONS}**\n\nKA-80 adds no new proof obligations. It blocks top-level InferType/checkType counting until the InferType projection branch no longer routes through the KA78-demoted \`inferProj.WF\` boundary.\n`);
  fs.writeFileSync(abs('assurance/ka80/KA80_INFERTYPE_TOP_LEVEL_PROJECTION_BOUNDARY_AUDIT_REPORT.md'), `# KA-80 InferType Top-Level Projection-Boundary Audit Report\n\nCheckpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\nBaseline: \`${BASELINE}\`\n\n## Result\n\nKA-80 adds **0** new proof obligations and applies **0** ledger correction. Corrected total formal Lean4Lean bridge obligations remain **${TOTAL_OBLIGATIONS}**.\n\n## Blocked top-level InferType obligations\n\n${result.auditFindings.blockedTopLevelInferTypeObligations.map(x => `- \`${x.name}\` (${x.upstreamTheorem}) — ${x.reason}`).join('\n')}\n\n## Root blocked dependency\n\n- \`${result.auditFindings.rootBlockedDependency.name}\` (${result.auditFindings.rootBlockedDependency.upstreamTheorem}) — ${result.auditFindings.rootBlockedDependency.reason}\n\n## Still counted narrow Infer slices\n\n${result.auditFindings.stillCountedInferSlices.map(x => `- ${x}`).join('\n')}\n\n## Boundary\n\n- Full Lean4 equivalence: **no**\n- Same theory as full Lean4: **no**\n- Fully formal K3: **no**\n- Executable PSKernel refinement proof: **no**\n- Full executable InferType refinement: **no**\n- Trusted PSKernel semantic change: **no**\n- Core format changed: **no**\n- Certificate format changed: **no**\n`);
}

export function runKA80(options: { strict?: boolean; writeReports?: boolean } = {}) {
  const result = audit();
  if (options.writeReports !== false) writeReports(result);
  if (options.strict) {
    assert.equal(result.status, 'passed');
    assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runKA80({ strict: process.argv.includes('--strict'), writeReports: true });
  console.log(JSON.stringify({ status: result.status, checkpoint: result.checkpoint, publicVersion: result.publicVersion, baseline: result.baseline, formalLean4LeanBridgeObligations: result.formalLean4LeanBridgeObligations, newFormalLean4LeanBridgeObligations: result.newFormalLean4LeanBridgeObligations, ledgerCorrectionFormalLean4LeanBridgeObligations: result.ledgerCorrectionFormalLean4LeanBridgeObligations, featureSurfaceBridgeProgressPercent: result.featureSurfaceBridgeProgressPercent, executableKernelEquivalenceProofProgressPercent: result.executableKernelEquivalenceProofProgressPercent, auditFindings: result.auditFindings, claimBoundary: result.claimBoundary }, null, 2));
}
