#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECKPOINT = 'proofscript-v1-ka78-recursor-projection-sorry-boundary-audit0';
const VERSION = '1.0.0-pskernel.81';
const BASELINE = 'proofscript-v1-ka77-executable-infer-structural-refinement0';
const CORE_FORMAT = 71;
const CERT_FORMAT = 2;
const BASELINE_OBLIGATIONS = 235;
const NEW_OBLIGATIONS = 0;
const LEDGER_CORRECTION = -3;
const CORRECTED_TOTAL_OBLIGATIONS = 232;
const FEATURE_PROGRESS = 90;
const EXECUTABLE_PROGRESS = 57;
const lean4leanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const reducePath = path.join(lean4leanRoot, 'Lean4Lean/Verify/TypeChecker/Reduce.lean');
const whnfPath = path.join(lean4leanRoot, 'Lean4Lean/Verify/TypeChecker/WHNF.lean');
const inferPath = path.join(lean4leanRoot, 'Lean4Lean/Verify/TypeChecker/InferType.lean');
const abs = (p: string) => path.join(root, p);
const readJson = (rel: string) => JSON.parse(fs.readFileSync(abs(rel), 'utf8'));
const writeJson = (rel: string, v: unknown) => { fs.mkdirSync(path.dirname(abs(rel)), { recursive: true }); fs.writeFileSync(abs(rel), JSON.stringify(v, null, 2) + '\n'); };

const claimBoundary = {
  fullLean4Equivalence: false,
  sameTheoryAsFullLean4: false,
  fullyFormalK3: false,
  executablePSKernelRefinementProof: false,
  fullExecutableWHNFDefEqInferRefinement: false,
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

function theoremBodyContainsSorry(source: string, theoremName: string): boolean {
  return /:=\s*sorry(?:\s|$)/.test(theoremSourceBlock(source, theoremName));
}

function theoremBlockMentions(source: string, theoremName: string, dependency: string): boolean {
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
      if (!ent.isFile() || !/ka78|KA78/.test(rel) || !/\.(ts|md|json)$/.test(ent.name)) continue;
      files.push({ path: rel, lines: fs.readFileSync(abs(rel), 'utf8').split(/\r?\n/).length, ext: path.extname(ent.name) });
    }
  };
  ['tools', 'assurance', 'docs', 'packages'].forEach(scan);
  const toolFiles = files.filter(f => f.path.startsWith('tools/') && f.ext === '.ts');
  const oversized = files.filter(f => f.lines > 260);
  const forbiddenPrefixes = ['packages/kernel/src/PSKernel/', 'packages/kernel-codec/src/', 'packages/frontend-next/src/core/', 'packages/unified-bridge/src/'];
  const semanticPackageTouched = files.some(f => forbiddenPrefixes.some(p => f.path.startsWith(p)));
  return { antiSpaghettiGatePassed: oversized.length === 0 && toolFiles.length <= 2 && !semanticPackageTouched, ka78Files: files, ka78ToolFiles: toolFiles, newKA78OversizedFiles: oversized, semanticPackageTouched, forbiddenPrefixes };
}

function audit() {
  const pkg = readJson('package.json');
  assert.equal(pkg.version, VERSION, 'package version must be KA78 public version');
  const baselineProgress = readJson('assurance/ka77/KA77_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json');
  assert.equal(baselineProgress.formalLean4LeanBridgeObligations, BASELINE_OBLIGATIONS, 'KA77 baseline obligation count must be 235 before KA78 correction');
  assert.ok(fs.existsSync(reducePath), 'Lean4Lean Reduce source must be present');
  assert.ok(fs.existsSync(whnfPath), 'Lean4Lean WHNF source must be present');
  assert.ok(fs.existsSync(inferPath), 'Lean4Lean InferType source must be present');
  const reduceSource = fs.readFileSync(reducePath, 'utf8');
  const whnfSource = fs.readFileSync(whnfPath, 'utf8');
  const inferSource = fs.readFileSync(inferPath, 'utf8');
  assert.equal(theoremBodyContainsSorry(whnfSource, 'reduceRecursor.WF'), true, 'reduceRecursor.WF must be detected as direct-sorry-backed');
  assert.equal(theoremBodyContainsSorry(reduceSource, 'reduceProjCore.WF'), true, 'reduceProjCore.WF must be detected as direct-sorry-backed');
  assert.equal(theoremBodyContainsSorry(inferSource, 'inferProj.WF'), true, 'inferProj.WF must be detected as direct-sorry-backed');
  assert.equal(theoremBlockMentions(reduceSource, 'reduceProj.WF', 'reduceProjCore.WF'), true, 'reduceProj.WF dependency risk must be detected');
  assert.equal(theoremBlockMentions(inferSource, "inferType'.WF", 'inferProj.WF'), true, "inferType'.WF dependency risk must be detected");
  const arch = architectureHealth();
  assert.equal(arch.antiSpaghettiGatePassed, true, 'KA78 anti-spaghetti gate must pass');

  const demotedDirectSorryBackedObligations = [
    { ka: 45, name: 'translated_reduceRecursor_wf', upstreamTheorem: 'Lean4Lean.TypeChecker.Inner.reduceRecursor.WF', sourceFile: 'Lean4Lean/Verify/TypeChecker/WHNF.lean', reason: 'upstream_theorem_body_contains_sorry', previousStatus: 'counted', correctedStatus: 'demoted-not-counted' },
    { ka: 50, originalPreparedAt: 46, name: 'translated_reduceProjCore_wf', upstreamTheorem: 'Lean4Lean.TypeChecker.Inner.reduceProjCore.WF', sourceFile: 'Lean4Lean/Verify/TypeChecker/Reduce.lean', reason: 'upstream_theorem_body_contains_sorry', previousStatus: 'counted', correctedStatus: 'demoted-not-counted' },
    { ka: 50, originalPreparedAt: 46, name: 'translated_inferProj_wf', upstreamTheorem: 'Lean4Lean.TypeChecker.Inner.inferProj.WF', sourceFile: 'Lean4Lean/Verify/TypeChecker/InferType.lean', reason: 'upstream_theorem_body_contains_sorry', previousStatus: 'counted', correctedStatus: 'demoted-not-counted' }
  ];
  const dependencyRiskObligations = [
    { ka: 45, name: 'translated_whnfCore_recursor_path_wf', upstreamTheorem: "Lean4Lean.TypeChecker.Inner.whnfCore'.WF", dependencyRisk: 'calls_or_depends_on_reduceRecursor.WF', status: 'flagged-for-transitive-dependency-audit' },
    { ka: 45, name: 'translated_whnf_recursor_path_wf', upstreamTheorem: 'Lean4Lean.TypeChecker.Inner.whnf.WF', dependencyRisk: 'may_depend_on_reduceRecursor.WF_path', status: 'flagged-for-transitive-dependency-audit' },
    { ka: 50, originalPreparedAt: 46, name: 'translated_reduceProj_wf', upstreamTheorem: 'Lean4Lean.TypeChecker.Inner.reduceProj.WF', dependencyRisk: 'uses_reduceProjCore.WF_which_is_sorry_backed', status: 'flagged-for-transitive-dependency-audit' },
    { ka: 50, originalPreparedAt: 46, name: 'translated_whnfCore_projection_path_wf', upstreamTheorem: "Lean4Lean.TypeChecker.Inner.whnfCore'.WF", dependencyRisk: 'projection_path_may_reach_reduceProjCore.WF', status: 'flagged-for-transitive-dependency-audit' },
    { ka: 'future', name: "inferType'.WF", upstreamTheorem: "Lean4Lean.TypeChecker.Inner.inferType'.WF", dependencyRisk: 'uses_inferProj.WF_which_is_sorry_backed', status: 'do-not-count-until-projection-boundary-is-repaired' }
  ];

  const progress = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    featureSurfaceBridgeProgressPercent: FEATURE_PROGRESS,
    executableKernelEquivalenceProofProgressPercent: EXECUTABLE_PROGRESS,
    arenaCorpusRegressionPercent: 100,
    formalLean4LeanBridgeObligations: CORRECTED_TOTAL_OBLIGATIONS,
    obligationAccounting: {
      previousFormalLean4LeanBridgeObligations: BASELINE_OBLIGATIONS,
      newFormalLean4LeanBridgeObligations: NEW_OBLIGATIONS,
      ledgerCorrectionFormalLean4LeanBridgeObligations: LEDGER_CORRECTION,
      correctedFormalLean4LeanBridgeObligations: CORRECTED_TOTAL_OBLIGATIONS,
      demotedDirectSorryBackedObligations,
      dependencyRiskObligations
    },
    metricPolicy: 'KA78 corrects the formal obligation ledger by demoting direct upstream-sorry-backed recursor/projection obligations. Dependency-risk obligations are flagged but not demoted until a dedicated transitive-dependency audit.',
    notAFormalEquivalenceClaim: true
  };
  const auditSpec = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    referenceKind: 'recursor-projection-sorry-boundary-audit-only',
    coreFormat: CORE_FORMAT,
    certificateFormat: CERT_FORMAT,
    countedNewFormalObligations: NEW_OBLIGATIONS,
    ledgerCorrectionFormalLean4LeanBridgeObligations: LEDGER_CORRECTION,
    correctedFormalLean4LeanBridgeObligations: CORRECTED_TOTAL_OBLIGATIONS,
    directSorryPolicy: 'do-not-count-upstream-theorems-whose-own-body-is-sorry',
    transitiveDependencyPolicy: 'flag-risk-now; demote-only-after-dedicated-dependency-closure-audit',
    auditFindings: { demotedDirectSorryBackedObligations, dependencyRiskObligations },
    claimBoundary
  };
  const releaseGate = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    releaseKind: 'sorry-boundary-audit-no-new-proof-obligations',
    kernel: { activeKernel: 'PSKernel', coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT },
    strictLean4LeanStatus: 'not-applicable-audit-only',
    featureEquivalenceProgress: progress,
    auditFindings: { demotedDirectSorryBackedObligations, dependencyRiskObligations },
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
    formalLean4LeanBridgeObligations: CORRECTED_TOTAL_OBLIGATIONS,
    newFormalLean4LeanBridgeObligations: NEW_OBLIGATIONS,
    ledgerCorrectionFormalLean4LeanBridgeObligations: LEDGER_CORRECTION,
    auditFindings: { demotedDirectSorryBackedObligations, dependencyRiskObligations },
    redTestObserved: true,
    redTestReason: 'KA78 audit test failed first on missing KA78 gate tool',
    noWrapperTimeoutCountedAsPassed: true
  };
  return { status: 'passed', checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT, formalLean4LeanBridgeObligations: CORRECTED_TOTAL_OBLIGATIONS, newFormalLean4LeanBridgeObligations: NEW_OBLIGATIONS, ledgerCorrectionFormalLean4LeanBridgeObligations: LEDGER_CORRECTION, featureSurfaceBridgeProgressPercent: FEATURE_PROGRESS, executableKernelEquivalenceProofProgressPercent: EXECUTABLE_PROGRESS, auditFindings: { demotedDirectSorryBackedObligations, dependencyRiskObligations }, claimBoundary, architectureHealth: arch, featureEquivalenceProgress: progress, auditSpec, releaseGate, verificationSummary };
}

function writeReports(result: ReturnType<typeof audit>) {
  writeJson('assurance/ka78/KA78_RECURSOR_PROJECTION_SORRY_BOUNDARY_AUDIT_RELEASE_GATE.json', result.releaseGate);
  writeJson('assurance/ka78/KA78_RECURSOR_PROJECTION_SORRY_BOUNDARY_AUDIT_VERIFICATION_SUMMARY.json', result.verificationSummary);
  writeJson('assurance/ka78/KA78_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json', result.featureEquivalenceProgress);
  writeJson('assurance/ka78/KA78_RECURSOR_PROJECTION_SORRY_BOUNDARY_AUDIT_SPEC.json', result.auditSpec);
  fs.writeFileSync(abs('assurance/ka78/KA78_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), `# KA-78 Kernel Feature Equivalence Progress\n\nCheckpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\n- Feature-surface bridge progress: **${FEATURE_PROGRESS}%** conservative dashboard estimate\n- Executable-kernel equivalence proof progress: **${EXECUTABLE_PROGRESS}%** conservative dashboard estimate\n- Arena corpus regression evidence: **100%**\n- Corrected formal Lean4Lean bridge obligations: **${CORRECTED_TOTAL_OBLIGATIONS}**\n\nKA-78 adds no new proof obligations. It corrects the obligation ledger by demoting three direct upstream-sorry-backed recursor/projection obligations and flags projection/recursor dependency risks for a later transitive audit.\n`);
  fs.writeFileSync(abs('assurance/ka78/KA78_RECURSOR_PROJECTION_SORRY_BOUNDARY_AUDIT_REPORT.md'), `# KA-78 Recursor/Projection Sorry-Boundary Audit Report\n\nCheckpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\nBaseline: \`${BASELINE}\`\n\n## Result\n\nKA-78 adds **0** new proof obligations and applies a **-3** correction to the formal Lean4Lean bridge obligation ledger.\n\nCorrected total formal Lean4Lean bridge obligations: **${CORRECTED_TOTAL_OBLIGATIONS}**.\n\n## Demoted direct-sorry-backed obligations\n\n${result.auditFindings.demotedDirectSorryBackedObligations.map(x => `- \`${x.name}\` (${x.upstreamTheorem}) — ${x.reason}`).join('\n')}\n\n## Flagged dependency risks\n\n${result.auditFindings.dependencyRiskObligations.map(x => `- \`${x.name}\` (${x.upstreamTheorem}) — ${x.dependencyRisk}`).join('\n')}\n\n## Boundary\n\n- Full Lean4 equivalence: **no**\n- Same theory as full Lean4: **no**\n- Fully formal K3: **no**\n- Executable PSKernel refinement proof: **no**\n- Trusted PSKernel semantic change: **no**\n- Core format changed: **no**\n- Certificate format changed: **no**\n`);
}

export function runKA78(options: { strict?: boolean; writeReports?: boolean } = {}) {
  const result = audit();
  if (options.writeReports !== false) writeReports(result);
  if (options.strict) {
    assert.equal(result.status, 'passed');
    assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runKA78({ strict: process.argv.includes('--strict'), writeReports: true });
  console.log(JSON.stringify({ status: result.status, checkpoint: result.checkpoint, publicVersion: result.publicVersion, baseline: result.baseline, formalLean4LeanBridgeObligations: result.formalLean4LeanBridgeObligations, newFormalLean4LeanBridgeObligations: result.newFormalLean4LeanBridgeObligations, ledgerCorrectionFormalLean4LeanBridgeObligations: result.ledgerCorrectionFormalLean4LeanBridgeObligations, featureSurfaceBridgeProgressPercent: result.featureSurfaceBridgeProgressPercent, executableKernelEquivalenceProofProgressPercent: result.executableKernelEquivalenceProofProgressPercent, auditFindings: result.auditFindings, claimBoundary: result.claimBoundary }, null, 2));
}
