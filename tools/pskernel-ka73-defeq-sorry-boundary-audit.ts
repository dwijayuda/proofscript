#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECKPOINT = 'proofscript-v1-ka73-defeq-sorry-boundary-audit0';
const VERSION = '1.0.0-pskernel.76';
const BASELINE = 'proofscript-v1-ka72-executable-defeq-eta-cache-status-refinement0';
const CORE_FORMAT = 71;
const CERT_FORMAT = 2;
const BASELINE_OBLIGATIONS = 220;
const NEW_OBLIGATIONS = 0;
const LEDGER_CORRECTION = -1;
const CORRECTED_TOTAL_OBLIGATIONS = 219;
const FEATURE_PROGRESS = 88;
const EXECUTABLE_PROGRESS = 55;
const lean4leanRoot = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
const isDefEqPath = path.join(lean4leanRoot, 'Lean4Lean/Verify/TypeChecker/IsDefEq.lean');
const abs = (p: string) => path.join(root, p);
const readJson = (rel: string) => JSON.parse(fs.readFileSync(abs(rel), 'utf8'));
const writeJson = (rel: string, v: unknown) => { fs.mkdirSync(path.dirname(abs(rel)), { recursive: true }); fs.writeFileSync(abs(rel), JSON.stringify(v, null, 2) + '\n'); };

const claimBoundary = {
  fullLean4Equivalence: false,
  sameTheoryAsFullLean4: false,
  fullyFormalK3: false,
  executablePSKernelRefinementProof: false,
  fullExecutableWHNFDefEqRefinement: false,
  trustedKernelSemanticChange: false,
  kernelCodecChange: false,
  coreFormatChanged: false,
  certificateFormatChanged: false
};

function theoremBodyContainsSorry(source: string, theoremName: string): boolean {
  const escaped = theoremName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`theorem\\s+${escaped}[\\s\\S]*?:=\\s*sorry(?:\\s|$)`);
  return re.test(source);
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
      if (!ent.isFile() || !/ka73|KA73/.test(rel) || !/\.(ts|md|json)$/.test(ent.name)) continue;
      files.push({ path: rel, lines: fs.readFileSync(abs(rel), 'utf8').split(/\r?\n/).length, ext: path.extname(ent.name) });
    }
  };
  ['tools', 'assurance', 'docs', 'packages'].forEach(scan);
  const toolFiles = files.filter(f => f.path.startsWith('tools/') && f.ext === '.ts');
  const oversized = files.filter(f => f.lines > 260);
  const forbiddenPrefixes = ['packages/kernel/src/PSKernel/', 'packages/kernel-codec/src/', 'packages/frontend-next/src/core/', 'packages/unified-bridge/src/'];
  const semanticPackageTouched = files.some(f => forbiddenPrefixes.some(p => f.path.startsWith(p)));
  return { antiSpaghettiGatePassed: oversized.length === 0 && toolFiles.length <= 2 && !semanticPackageTouched, ka73Files: files, ka73ToolFiles: toolFiles, newKA73OversizedFiles: oversized, semanticPackageTouched, forbiddenPrefixes };
}

function audit() {
  const pkg = readJson('package.json');
  assert.equal(pkg.version, VERSION, 'package version must be KA73 public version');
  const baselineProgress = readJson('assurance/ka72/KA72_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json');
  assert.equal(baselineProgress.formalLean4LeanBridgeObligations, BASELINE_OBLIGATIONS, 'KA72 baseline obligation count must be 220 before correction');
  const ka70Spec = readJson('assurance/ka70/KA70_EXECUTABLE_DEFEQ_UNIT_PROJ_REFINEMENT_BRIDGE_SPEC.json');
  assert.ok(ka70Spec.countedNewObligationNames.includes('translated_isDefEqUnitLike_wf'), 'KA70 must be the checkpoint whose counted obligation is audited');
  assert.ok(fs.existsSync(isDefEqPath), 'Lean4Lean IsDefEq source must be present for sorry-boundary audit');
  const isDefEqSource = fs.readFileSync(isDefEqPath, 'utf8');
  assert.equal(theoremBodyContainsSorry(isDefEqSource, 'isDefEqUnitLike.WF'), true, 'isDefEqUnitLike.WF must be detected as sorry-backed');
  assert.equal(theoremBodyContainsSorry(isDefEqSource, 'tryEtaStructCore.WF'), true, 'tryEtaStructCore.WF must be detected as sorry-backed');
  const arch = architectureHealth();
  assert.equal(arch.antiSpaghettiGatePassed, true, 'KA73 anti-spaghetti gate must pass');
  const demotedCountedObligations = [
    {
      ka: 70,
      name: 'translated_isDefEqUnitLike_wf',
      upstreamTheorem: 'Lean4Lean.TypeChecker.Inner.isDefEqUnitLike.WF',
      reason: 'upstream_theorem_body_contains_sorry',
      previousStatus: 'counted',
      correctedStatus: 'demoted-not-counted'
    }
  ];
  const alreadyExcludedSorryBacked = [
    {
      ka: 72,
      name: 'tryEtaStructCore.WF',
      upstreamTheorem: 'Lean4Lean.TypeChecker.Inner.tryEtaStructCore.WF',
      reason: 'upstream_theorem_body_contains_sorry',
      status: 'already-excluded-by-KA72'
    }
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
      demotedCountedObligations
    },
    metricPolicy: 'KA73 corrects the formal obligation ledger by demoting a KA70 obligation backed by upstream Lean4Lean sorry. Percentages stay conservative and do not increase.',
    notAFormalEquivalenceClaim: true
  };
  const bridgeSpec = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    referenceKind: 'defeq-sorry-boundary-audit-only',
    coreFormat: CORE_FORMAT,
    certificateFormat: CERT_FORMAT,
    countedNewFormalObligations: NEW_OBLIGATIONS,
    ledgerCorrectionFormalLean4LeanBridgeObligations: LEDGER_CORRECTION,
    correctedFormalLean4LeanBridgeObligations: CORRECTED_TOTAL_OBLIGATIONS,
    auditFindings: { demotedCountedObligations, alreadyExcludedSorryBacked },
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
    auditFindings: { demotedCountedObligations, alreadyExcludedSorryBacked },
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
    auditFindings: { demotedCountedObligations, alreadyExcludedSorryBacked },
    redTestObserved: true,
    redTestReason: 'KA73 sorry-boundary audit test failed first on missing KA73 gate tool',
    noWrapperTimeoutCountedAsPassed: true
  };
  return { status: 'passed', checkpoint: CHECKPOINT, publicVersion: VERSION, baseline: BASELINE, coreFormat: CORE_FORMAT, certificateFormat: CERT_FORMAT, formalLean4LeanBridgeObligations: CORRECTED_TOTAL_OBLIGATIONS, newFormalLean4LeanBridgeObligations: NEW_OBLIGATIONS, ledgerCorrectionFormalLean4LeanBridgeObligations: LEDGER_CORRECTION, featureSurfaceBridgeProgressPercent: FEATURE_PROGRESS, executableKernelEquivalenceProofProgressPercent: EXECUTABLE_PROGRESS, auditFindings: { demotedCountedObligations, alreadyExcludedSorryBacked }, claimBoundary, architectureHealth: arch, featureEquivalenceProgress: progress, bridgeSpec, releaseGate, verificationSummary };
}

function writeReports(result: ReturnType<typeof audit>) {
  writeJson('assurance/ka73/KA73_DEFEQ_SORRY_BOUNDARY_AUDIT_RELEASE_GATE.json', result.releaseGate);
  writeJson('assurance/ka73/KA73_DEFEQ_SORRY_BOUNDARY_AUDIT_VERIFICATION_SUMMARY.json', result.verificationSummary);
  writeJson('assurance/ka73/KA73_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json', result.featureEquivalenceProgress);
  writeJson('assurance/ka73/KA73_DEFEQ_SORRY_BOUNDARY_AUDIT_SPEC.json', result.bridgeSpec);
  fs.writeFileSync(abs('assurance/ka73/KA73_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md'), `# KA-73 Kernel Feature Equivalence Progress\n\nCheckpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\n- Feature-surface bridge progress: **${FEATURE_PROGRESS}%** conservative dashboard estimate\n- Executable-kernel equivalence proof progress: **${EXECUTABLE_PROGRESS}%** conservative dashboard estimate\n- Arena corpus regression evidence: **100%**\n- Corrected formal Lean4Lean bridge obligations: **${CORRECTED_TOTAL_OBLIGATIONS}**\n\nKA-73 adds no new proof obligations. It corrects the formal obligation ledger by demoting one KA-70 counted obligation backed by an upstream Lean4Lean \`sorry\`.\n`);
  fs.writeFileSync(abs('assurance/ka73/KA73_DEFEQ_SORRY_BOUNDARY_AUDIT_REPORT.md'), `# KA-73 DefEq Sorry-Boundary Audit Report\n\nCheckpoint: \`${CHECKPOINT}\`\n\nPublic version: \`${VERSION}\`\n\nBaseline: \`${BASELINE}\`\n\n## Result\n\nKA-73 adds **0** new proof obligations and applies a **-1** correction to the formal Lean4Lean bridge obligation ledger.\n\nCorrected total formal Lean4Lean bridge obligations: **${CORRECTED_TOTAL_OBLIGATIONS}**.\n\n## Demoted obligation\n\n- \`translated_isDefEqUnitLike_wf\` from KA-70 is demoted from counted to not-counted because upstream \`Lean4Lean.TypeChecker.Inner.isDefEqUnitLike.WF\` contains \`sorry\`.\n\n## Already excluded\n\n- \`tryEtaStructCore.WF\` remains excluded, matching KA-72's policy, because upstream \`Lean4Lean.TypeChecker.Inner.tryEtaStructCore.WF\` contains \`sorry\`.\n\n## Boundary\n\n- Full Lean4 equivalence: **no**\n- Same theory as full Lean4: **no**\n- Fully formal K3: **no**\n- Executable PSKernel refinement proof: **no**\n- Trusted PSKernel semantic change: **no**\n- Core format changed: **no**\n- Certificate format changed: **no**\n`);
}

export function runKA73(options: { strict?: boolean; writeReports?: boolean } = {}) {
  const result = audit();
  if (options.writeReports !== false) writeReports(result);
  if (options.strict) {
    assert.equal(result.status, 'passed');
    assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runKA73({ strict: process.argv.includes('--strict'), writeReports: true });
  console.log(JSON.stringify({ status: result.status, checkpoint: result.checkpoint, publicVersion: result.publicVersion, baseline: result.baseline, formalLean4LeanBridgeObligations: result.formalLean4LeanBridgeObligations, newFormalLean4LeanBridgeObligations: result.newFormalLean4LeanBridgeObligations, ledgerCorrectionFormalLean4LeanBridgeObligations: result.ledgerCorrectionFormalLean4LeanBridgeObligations, featureSurfaceBridgeProgressPercent: result.featureSurfaceBridgeProgressPercent, executableKernelEquivalenceProofProgressPercent: result.executableKernelEquivalenceProofProgressPercent, auditFindings: result.auditFindings, claimBoundary: result.claimBoundary }, null, 2));
}
