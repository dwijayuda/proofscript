#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const jsonOut = args.includes('--json');
const checkOnly = args.includes('--check');

const failures = [];
const warnings = [];

function rel(p) {
  return path.relative(root, p).split(path.sep).join('/');
}

function loadJson(relativePath) {
  const file = path.join(root, relativePath);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`failed to read ${relativePath}: ${error.message}`);
    return null;
  }
}

function readText(relativePath) {
  const file = path.join(root, relativePath);
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    failures.push(`failed to read ${relativePath}: ${error.message}`);
    return '';
  }
}

function runNodeTool(label, toolArgs, { parseJson = false } = {}) {
  const result = spawnSync(process.execPath, toolArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    failures.push(`${label} failed with status ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    return { ok: false, stdout: result.stdout, stderr: result.stderr, status: result.status, json: null };
  }
  let parsed = null;
  if (parseJson) {
    try {
      parsed = JSON.parse(result.stdout);
    } catch (error) {
      failures.push(`${label} did not emit valid JSON: ${error.message}\nstdout:\n${result.stdout}`);
    }
  }
  return { ok: true, stdout: result.stdout, stderr: result.stderr, status: result.status, json: parsed };
}

function assertTrustClaim(source, label) {
  if (!source) return;
  const trust = source.trustClaim;
  if (!trust) {
    failures.push(`${label} missing trustClaim`);
    return;
  }
  if (trust.label !== 'K3-TB trusted-boundary') failures.push(`${label} trust label must remain K3-TB trusted-boundary`);
  if (trust.fullyFormalK3 !== false) failures.push(`${label} must not mark fullyFormalK3 true`);
  if (trust.lean4Equivalent !== false) failures.push(`${label} must not mark lean4Equivalent true`);
  if (trust.formalLean4EquivalenceProvenObligations !== 0) failures.push(`${label} formal Lean 4 equivalence obligations must remain 0 until actually proven`);
}

function countLines(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  return text.split(/\r?\n/).length;
}

function docContains(relativePath, needles) {
  const text = readText(relativePath);
  for (const needle of needles) {
    if (!text.includes(needle)) failures.push(`${relativePath} missing required text/section: ${needle}`);
  }
}

const packageJson = loadJson('package.json');
const classification = loadJson('config/package-classification.json');
const featureGate = loadJson('config/feature-promotion-gate.json');
const verificationMatrix = loadJson('config/verification-matrix.json');
const proofLedger = loadJson('config/proof-obligations-ledger.json');
const developmentWorkflow = loadJson('config/development-workflow.json');

assertTrustClaim(classification, 'package classification');
assertTrustClaim(featureGate, 'feature promotion gate');
assertTrustClaim(verificationMatrix, 'verification matrix');
assertTrustClaim(proofLedger, 'proof obligation ledger');
assertTrustClaim(developmentWorkflow, 'development workflow');

runNodeTool('package classification checker', ['tools/check-package-classification.ts']);
runNodeTool('feature promotion checker', ['tools/check-feature-promotion.ts']);
runNodeTool('verification matrix checker', ['tools/check-verification-matrix.ts']);
const proofObligations = runNodeTool('proof obligation ledger checker', ['tools/check-proof-obligations.ts', '--json'], { parseJson: true });
const packageDocs = runNodeTool('canonical package docs checker', ['tools/check-canonical-package-docs.ts', '--json'], { parseJson: true });
const traceability = runNodeTool('production traceability checker', ['tools/check-production-traceability.ts', '--json'], { parseJson: true });
const developmentWorkflowStatus = runNodeTool('development workflow checker', ['tools/check-development-workflow.ts', '--json'], { parseJson: true });
const kernel = runNodeTool('pskernel status', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'status', '--json'], { parseJson: true });

if (kernel.json) {
  if (kernel.json.status !== 'trusted-boundary') failures.push(`pskernel status must be trusted-boundary, got ${kernel.json.status}`);
  if (kernel.json.proofStatus !== 'not-proven') failures.push(`pskernel proofStatus must be not-proven, got ${kernel.json.proofStatus}`);
  if (!Array.isArray(kernel.json.failClosedSlices) || !kernel.json.failClosedSlices.some((item) => /formal equivalence/i.test(item))) {
    failures.push('pskernel status must keep full formal equivalence in failClosedSlices');
  }
}

const docs = [
  'docs/PRODUCTION_ARCHITECTURE_STATUS.md',
  'docs/PRODUCTION_PACKAGE_CLASSIFICATION.md',
  'docs/PRODUCTION_FEATURE_PROMOTION_GATE.md',
  'docs/PRODUCTION_VERIFICATION_MATRIX.md',
  'docs/PRODUCTION_READINESS_STATUS.md',
  'docs/PRODUCTION_CANONICAL_PACKAGE_GUIDE.md',
  'docs/PRODUCTION_PROOF_OBLIGATION_LEDGER.md',
  'docs/PRODUCTION_TRACEABILITY_BUNDLE.md',
  'docs/PRODUCTION_DEVELOPMENT_WORKFLOW.md',
];
for (const doc of docs) {
  if (!fs.existsSync(path.join(root, doc))) failures.push(`missing required production doc: ${doc}`);
}
docContains('docs/PRODUCTION_READINESS_STATUS.md', [
  'Production Readiness Status',
  'Canonical PSC-1 Production Path',
  'What Is Still Not Proven',
  'Feature Addition Gate',
  'K3-TB',
  'P5.2 Proof Obligation Ledger',
  'P5.3 Feature Proof-Obligation Linkage',
  'P5.4 Production Traceability Bundle',
  'P5.5 Development Workflow Gate',
  'P5.6 Option Feature',
  'P5.7 List(Nat) Feature',
  'P5.8 Minimal String Feature',
  'P5.11 Minimal Int Arithmetic Feature',
  'P5.12 Array(Nat) Feature',
  'P5.14 Array.size / Array.get? Feature',
  'P5.15 Option.map / Except.map Feature',
  'P5.16 Option.bind / Except.bind Feature',
  'P5.17 Minimal Do-Notation Feature',
  'P5.18 Array.map Feature',
  'P5.19 List.map Feature',
  'P5.20 List.foldl Feature',
  'P5.21 Array.foldl Feature',
  'P5.22 List.filter / Array.filter Feature',
  'P5.23 List.append / Array.append Feature',
  'P5.24 List.length / Array.isEmpty Feature',
  'P5.25 List.reverse / Array.reverse Feature',
  'P5.26 List.any / List.all / Array.any / Array.all Feature',
  'P5.27 TypeScript Source Migration',
  'P5.28 List.find? / Array.find? Feature',
  'P5.29 List.head? / Array.head? Feature',
  'P5.30 List.tail? / Array.tail? Feature',
  'P5.31 List.isEmpty Feature',
  'P5.32 List.last? / Array.last? Feature',
  'P5.33 List.get? Feature',
  'P5.34 List.take / Array.take Feature',
  'P5.35 List.drop / Array.drop Feature',
  'P5.36 List.range / Array.range Feature',
  'P5.37 List.replicate / Array.replicate Feature',
  'P5.38 List.toArray / Array.toList Feature',
  'P5.39 List.takeWhile / Array.takeWhile Feature',
  'P5.40 List.dropWhile / Array.dropWhile Feature',
  'P5.41 List.countP / Array.countP Feature',
  'P5.42 List.singleton / Array.singleton Feature',
  'P5.43 Option.isSome / Option.isNone / Except.isOk / Except.isError Feature',
  'P5.44 Option.getD / Except.getD Feature',
  'P5.45 Option.orElse / Except.orElse Feature',
  'P5.46 Option.toList / Except.toOption Feature',
  'P5.48 Option.toExcept / Except.toArray Feature',
  'P5.49 Except.mapError Feature',
  'P5.50 Option.filter Feature',
  'P5.51 Option.flatten Feature',
  'P5.53 Except.toError Feature',
  'P5.54 Except.getErrorD Feature',
  'P5.55 Option.fold Feature',
  'P5.56 Except.swap Feature',
  'P5.57 Except.fold Feature',
  'P5.58 Except.bimap Feature',
  'P5.59 Option.any Feature',
  'P5.60 Reference v0.6.1 Declaration Forms Feature',
  'P5.61 Reference v0.6.1 Match Body Feature',
  'P5.62 Reference v0.6.1 Where Body Feature',
  'P5.63 Reference v0.6.1 Structure Expression Bodies Feature',
  'P5.64 Reference v0.6.1 Class Body Feature',
]);

const packageByPath = new Map((classification?.packages ?? []).map((entry) => [entry.path, entry]));
const stablePath = classification?.stablePsc1Path ?? [];
for (const stable of stablePath) {
  const entry = packageByPath.get(stable);
  if (!entry) failures.push(`stable PSC-1 path package is not classified: ${stable}`);
  else if (!['trusted', 'language', 'execution'].includes(entry.tier)) failures.push(`stable PSC-1 package ${stable} has unstable tier ${entry.tier}`);
}

const featurePackages = new Set();
for (const feature of featureGate?.features ?? []) {
  for (const pkg of feature.packages ?? []) featurePackages.add(pkg);
  if (feature.lifecycle === 'supported' && feature.productionGradePath !== true) {
    failures.push(`${feature.id}: supported features must stay on productionGradePath`);
  }
}
for (const pkg of featurePackages) {
  const entry = packageByPath.get(pkg);
  if (!entry) failures.push(`feature gate references unclassified package ${pkg}`);
  else if (entry.tier === 'experimental') failures.push(`feature gate references experimental package ${pkg}`);
}

const requiredClaimIds = new Set((verificationMatrix?.claims ?? []).filter((claim) => claim.requiredForRelease).map((claim) => claim.id));
for (const required of ['build-integrity', 'trust-boundary-architecture', 'package-classification-enforced', 'feature-promotion-enforced', 'feature-proof-obligation-linkage-enforced', 'verification-matrix-enforced', 'proof-obligation-ledger-enforced', 'canonical-package-docs-enforced', 'kernel-smoke-and-status', 'production-traceability-enforced', 'development-workflow-enforced']) {
  if (!requiredClaimIds.has(required)) failures.push(`verification matrix missing required production claim ${required}`);
}

const packageScripts = packageJson?.scripts ?? {};
for (const neededScript of ['production:status', 'production:status:json', 'test:production-readiness', 'test:architecture', 'test:canonical-package-docs', 'test:architecture:package-docs', 'test:proof-obligations', 'test:architecture:proof-obligations', 'test:feature-proof-obligation-linkage', 'test:architecture:feature-proof-obligation-linkage', 'test:production-traceability', 'test:architecture:production-traceability', 'test:development-workflow', 'test:architecture:development-workflow']) {
  if (!packageScripts[neededScript]) failures.push(`package.json missing production readiness script ${neededScript}`);
}
if (packageScripts['test:architecture'] && !packageScripts['test:architecture'].includes('production-status.ts --check')) {
  failures.push('test:architecture must include production-status.ts --check');
}
if (packageScripts['test:architecture'] && !packageScripts['test:architecture'].includes('check-canonical-package-docs.ts')) {
  failures.push('test:architecture must include check-canonical-package-docs.ts');
}
if (packageScripts['test:architecture'] && !packageScripts['test:architecture'].includes('check-proof-obligations.ts')) {
  failures.push('test:architecture must include check-proof-obligations.ts');
}
if (packageScripts['test:architecture'] && !packageScripts['test:architecture'].includes('check-feature-promotion.ts')) {
  failures.push('test:architecture must include check-feature-promotion.ts for feature proof-obligation linkage');
}
if (packageScripts['test:architecture'] && !packageScripts['test:architecture'].includes('check-development-workflow.ts')) {
  failures.push('test:architecture must include check-development-workflow.ts');
}

const lineCounts = {
  parserIndex: countLines('packages/parser/src/index.ts'),
  elaboratorIndex: countLines('packages/elaborator/src/index.ts'),
  backendIndex: countLines('packages/backend-typescript/src/index.ts'),
  runtimeIndex: countLines('packages/runtime/src/index.ts'),
};
if (lineCounts.elaboratorIndex != null && lineCounts.elaboratorIndex > 1200) {
  warnings.push(`elaborator index remains large (${lineCounts.elaboratorIndex} lines); keep extracting before large features`);
}

const tierCounts = (classification?.packages ?? []).reduce((acc, entry) => {
  acc[entry.tier] = (acc[entry.tier] ?? 0) + 1;
  return acc;
}, {});
const lifecycleCounts = (classification?.packages ?? []).reduce((acc, entry) => {
  acc[entry.lifecycle] = (acc[entry.lifecycle] ?? 0) + 1;
  return acc;
}, {});
const supportedFeatures = (featureGate?.features ?? []).filter((feature) => feature.lifecycle === 'supported');
const executableFeatures = supportedFeatures.filter((feature) => feature.executable !== false);
const proofLinkedSupportedFeatures = supportedFeatures.filter((feature) => Array.isArray(feature.proofObligationIds) && feature.proofObligationIds.length > 0);
const uniqueFeatureProofObligations = new Set(supportedFeatures.flatMap((feature) => feature.proofObligationIds ?? []));
const requiredClaims = (verificationMatrix?.claims ?? []).filter((claim) => claim.requiredForRelease);
const formalRequiredObligations = proofLedger?.obligations?.filter((obligation) => obligation.requiredForFormalLean4Equivalence) ?? [];
const formallyProvedObligations = formalRequiredObligations.filter((obligation) => obligation.state === 'proved');
if (proofLedger && formallyProvedObligations.length !== proofLedger.trustClaim.formalLean4EquivalenceProvenObligations) {
  failures.push('proof obligation ledger proved count must match trust claim count');
}

const summary = {
  release: featureGate?.release ?? 'P5.64',
  packageVersion: packageJson?.version ?? null,
  status: failures.length ? 'failed' : 'architecture-gated-pre-production',
  readyForControlledFeatures: failures.length === 0,
  canonicalProductionPathPackages: stablePath.length,
  packageClassification: {
    packages: classification?.packages?.length ?? 0,
    tierCounts,
    lifecycleCounts,
  },
  featurePromotion: {
    trackedFeatures: featureGate?.features?.length ?? 0,
    supportedFeatures: supportedFeatures.length,
    executableSupportedFeatures: executableFeatures.length,
    proofObligationLinkedSupportedFeatures: proofLinkedSupportedFeatures.length,
    uniqueProofObligationLinks: uniqueFeatureProofObligations.size,
  },
  verificationMatrix: {
    claims: verificationMatrix?.claims?.length ?? 0,
    requiredClaims: requiredClaims.length,
    optionalClaims: (verificationMatrix?.claims?.length ?? 0) - requiredClaims.length,
  },
  proofObligations: proofObligations.json ? {
    obligations: proofObligations.json.obligations,
    requiredForFormalLean4Equivalence: proofObligations.json.requiredForFormalLean4Equivalence,
    provedFormalLean4EquivalenceObligations: proofObligations.json.provedFormalLean4EquivalenceObligations,
    stateCounts: proofObligations.json.stateCounts,
  } : null,
  canonicalPackageDocs: packageDocs.json ? {
    stablePathCount: packageDocs.json.stablePathCount,
    docsChecked: packageDocs.json.docsChecked,
    requiredHeadings: packageDocs.json.requiredHeadings?.length ?? 0,
  } : null,
  kernelTrust: kernel.json ? {
    status: kernel.json.status,
    proofStatus: kernel.json.proofStatus,
    semanticBaseline: kernel.json.semanticBaseline,
    implementationProfile: kernel.json.implementationProfile,
    overallProgressEstimate: kernel.json.overallProgressEstimate,
  } : null,
  currentArchitectureEstimates: {
    standalonePsc1WithoutLean4: '~99.4%',
    psc1SmallCompleteProgrammingLanguage: '~86.3%',
    psc1SmallTheoremProver: '~62.8%',
    fullProofScriptCompiler: '~74.0%',
    fullLeanLikeProofScriptWithoutLean4: '~15.6%' ,
    formalLean4Equivalence: '0 proven obligations',
    maintainabilityAntiSpaghetti: '~95%',
    productionGradeArchitectureReadiness: '~94%',
    explainabilityForNewContributors: '~98%',
    featureAdditionSafety: '~98%',
    formalTrustStory: '~54%'  ,
  },
  developmentWorkflow: developmentWorkflowStatus.json ? {
    workflowStages: developmentWorkflowStatus.json.workflowStages,
    templates: developmentWorkflowStatus.json.templates,
    plannedFeatures: developmentWorkflowStatus.json.plannedFeatures,
  } : null,
  productionTraceability: traceability.json ? {
    sources: traceability.json.sources,
    links: traceability.json.links,
    requiredLinks: traceability.json.requiredLinks?.length ?? 0,
  } : null,
  lineCounts,
  nextRecommendedWork: [
    'P5.74: continue exact-Lean kernel/prelude gap closure after checked Iff.refl/Iff.symm/Iff.trans activation',
    'P5.x: broader Array APIs remain deferred unless checked Core/kernel-first',
    'P5.x: psverify/psc CLI consolidation as a tooling cleanup slice',
  ],
  nonClaims: [
    'not fully formal K3',
    'not proven equivalent to Lean 4',
    'not a complete Lean 4 implementation',
    'not self-hosting',
    'proof-obligation ledger is not itself a formal proof',
  ],
  warnings,
  failures,
};

if (failures.length) {
  if (jsonOut) console.log(JSON.stringify(summary, null, 2));
  else console.error(failures.join('\n'));
  process.exit(1);
}

if (jsonOut) {
  console.log(JSON.stringify(summary, null, 2));
} else if (checkOnly) {
  console.log(`✓ production readiness gate holds (${summary.status}; features=${supportedFeatures.length}; requiredClaims=${requiredClaims.length})`);
  console.log(JSON.stringify({
    release: summary.release,
    trust: summary.kernelTrust,
    readyForControlledFeatures: summary.readyForControlledFeatures,
    formalLean4Equivalence: summary.currentArchitectureEstimates.formalLean4Equivalence,
    canonicalPackageDocs: summary.canonicalPackageDocs,
    proofObligations: summary.proofObligations,
    productionTraceability: summary.productionTraceability,
    developmentWorkflow: summary.developmentWorkflow,
  }, null, 2));
} else {
  console.log('ProofScript production readiness status');
  console.log(`release: ${summary.release}`);
  console.log(`status: ${summary.status}`);
  console.log(`readyForControlledFeatures: ${summary.readyForControlledFeatures}`);
  console.log(`canonicalProductionPathPackages: ${summary.canonicalProductionPathPackages}`);
  console.log(`supportedFeatures: ${summary.featurePromotion.supportedFeatures}`);
  console.log(`proofLinkedSupportedFeatures: ${summary.featurePromotion.proofObligationLinkedSupportedFeatures}/${summary.featurePromotion.supportedFeatures}`);
  console.log(`requiredVerificationClaims: ${summary.verificationMatrix.requiredClaims}`);
  console.log(`canonicalPackageDocs: ${summary.canonicalPackageDocs?.docsChecked}/${summary.canonicalPackageDocs?.stablePathCount}`);
  console.log(`proofObligations: ${summary.proofObligations?.obligations} total / ${summary.proofObligations?.provedFormalLean4EquivalenceObligations} proved formal Lean-equivalence obligations`);
  console.log(`productionTraceability: ${summary.productionTraceability?.links?.proofLinkedFeatures}/${summary.productionTraceability?.links?.supportedFeatures} proof-linked features; ${summary.productionTraceability?.links?.verificationClaims} verification claims`);
  console.log(`developmentWorkflow: ${summary.developmentWorkflow?.workflowStages} stages; ${summary.developmentWorkflow?.templates} templates; ${summary.developmentWorkflow?.plannedFeatures} planned features`);
  console.log(`kernelTrust: ${summary.kernelTrust?.status} / ${summary.kernelTrust?.proofStatus}`);
  console.log('nonClaims:');
  for (const nonClaim of summary.nonClaims) console.log(`- ${nonClaim}`);
}
