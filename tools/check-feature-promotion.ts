#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let manifestArg = null;
let proofLedgerArg = null;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--manifest') {
    manifestArg = args[i + 1];
    i += 1;
  } else if (args[i] === '--proof-ledger') {
    proofLedgerArg = args[i + 1];
    i += 1;
  }
}

const manifestPath = manifestArg ? path.resolve(root, manifestArg) : path.join(root, 'config', 'feature-promotion-gate.json');
const proofLedgerPath = proofLedgerArg ? path.resolve(root, proofLedgerArg) : path.join(root, 'config', 'proof-obligations-ledger.json');
const packageClassificationPath = path.join(root, 'config', 'package-classification.json');
const packageJsonPath = path.join(root, 'package.json');
const failures = [];
const validLifecycles = new Set(['supported', 'experimental', 'fail-closed', 'deprecated']);
const validTrustLevels = new Set(['parser-only', 'checked-bootstrap', 'existing-kernel-rules', 'trusted-kernel-change', 'execution-only-after-core']);
const validKernelImpacts = new Set(['no-new-kernel-rule', 'checked-bootstrap-only', 'new-kernel-obligation', 'non-executable-surface', 'fail-closed-only']);
const requiredEvidenceSlots = [
  'parserOrSyntax',
  'elaboratorOrKernel',
  'checkedBootstrapOrObligation',
  'negativeFailClosedSmoke',
  'governanceOrMatrix',
  'documentationReports',
];
const requiredExecutableSlots = ['backendOrRuntime', 'jsExecutionSmoke', 'typescriptCompileSmoke'];

function rel(p) {
  return path.relative(root, p).split(path.sep).join('/');
}

function loadJson(file, label = rel(file)) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`failed to read ${label}: ${error.message}`);
    return null;
  }
}

function existsRelative(ref) {
  return fs.existsSync(path.join(root, ref));
}

function packagePathFor(ref) {
  const normalized = ref.split('/').slice(0, 2).join('/');
  if (normalized.startsWith('packages/') || normalized.startsWith('plugins/')) return normalized;
  return null;
}

const manifest = loadJson(manifestPath, rel(manifestPath));
const packageClassification = fs.existsSync(packageClassificationPath) ? loadJson(packageClassificationPath) : null;
const proofLedger = fs.existsSync(proofLedgerPath) ? loadJson(proofLedgerPath, rel(proofLedgerPath)) : null;
const packageJson = fs.existsSync(packageJsonPath) ? loadJson(packageJsonPath) : null;

if (!manifest || !packageJson) {
  console.error(failures.join('\n'));
  process.exit(1);
}

if (manifest.schemaVersion !== 1) failures.push(`feature promotion schemaVersion must be 1, got ${manifest.schemaVersion}`);
if (manifest.trustClaim?.label !== 'K3-TB trusted-boundary') failures.push('feature promotion trust claim label must remain K3-TB trusted-boundary');
if (manifest.trustClaim?.fullyFormalK3 !== false) failures.push('feature promotion must not mark fullyFormalK3 true');
if (manifest.trustClaim?.lean4Equivalent !== false) failures.push('feature promotion must not mark lean4Equivalent true');
if (manifest.trustClaim?.formalLean4EquivalenceProvenObligations !== 0) failures.push('feature promotion formal Lean 4 equivalence obligations must remain 0 until actually proven');
if (!Array.isArray(manifest.requiredEvidence?.supportedFeatureChecklist) || manifest.requiredEvidence.supportedFeatureChecklist.length < 7) {
  failures.push('feature promotion gate must define a supportedFeatureChecklist with at least 7 items');
}
if (!Array.isArray(manifest.features) || manifest.features.length === 0) failures.push('feature promotion manifest must list at least one feature');

for (const doc of manifest.requiredEvidence?.requiredDocs ?? []) {
  if (!existsRelative(doc)) failures.push(`required feature-promotion doc/template is missing: ${doc}`);
}
if (!proofLedger) {
  failures.push('missing proof obligation ledger: config/proof-obligations-ledger.json');
}

const byPath = new Map((packageClassification?.packages ?? []).map((entry) => [entry.path, entry]));
const proofObligationById = new Map((proofLedger?.obligations ?? []).map((obligation) => [obligation.id, obligation]));
const forbiddenProductionTiers = new Set(manifest.requiredEvidence?.forbiddenProductionFeaturePackages ?? ['experimental', 'bridge', 'plugin-infra']);
const requiredProofObligations = manifest.requiredEvidence?.requiredProofObligations ?? {};
const seen = new Set();

function assertStringArray(feature, fieldName, value, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    failures.push(`${feature.id}: evidence.${fieldName} must be an array`);
    return [];
  }
  if (!allowEmpty && value.length === 0) failures.push(`${feature.id}: evidence.${fieldName} must not be empty for supported production features`);
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0) failures.push(`${feature.id}: evidence.${fieldName} contains a non-string item`);
  }
  return value;
}

function checkEvidenceFile(feature, slot, ref) {
  if (ref.startsWith('test:')) {
    if (!packageJson.scripts?.[ref]) failures.push(`${feature.id}: evidence.${slot} references missing package script ${ref}`);
    return;
  }
  if (!existsRelative(ref)) failures.push(`${feature.id}: evidence.${slot} references missing file ${ref}`);
}

function requiredObligationSetFor(feature) {
  const required = new Set();
  const add = (items = []) => {
    for (const item of items) required.add(item);
  };
  if (feature.lifecycle === 'supported' && feature.productionGradePath === true) add(requiredProofObligations.supportedProductionFeature);
  if (feature.executable !== false) add(requiredProofObligations.executableFeature);
  if (feature.trustLevel === 'checked-bootstrap' || feature.kernelImpact === 'checked-bootstrap-only') add(requiredProofObligations.checkedBootstrapFeature);
  if (feature.trustLevel === 'existing-kernel-rules' || feature.kernelImpact === 'no-new-kernel-rule') add(requiredProofObligations.existingKernelRulesFeature);
  if (feature.trustLevel === 'trusted-kernel-change' || feature.kernelImpact === 'new-kernel-obligation') add(requiredProofObligations.newKernelObligationFeature);
  if (feature.executable === false || feature.kernelImpact === 'non-executable-surface') add(requiredProofObligations.nonExecutableSurfaceFeature);
  return required;
}

function checkProofObligationLinks(feature) {
  const ids = feature.proofObligationIds;
  if (!Array.isArray(ids) || ids.length === 0) {
    failures.push(`${feature.id}: proofObligationIds must be a non-empty array`);
    return;
  }
  const seenIds = new Set();
  for (const id of ids) {
    if (typeof id !== 'string' || id.length === 0) {
      failures.push(`${feature.id}: proofObligationIds contains a non-string item`);
      continue;
    }
    if (seenIds.has(id)) failures.push(`${feature.id}: duplicate proofObligationIds entry ${id}`);
    seenIds.add(id);
    if (!proofObligationById.has(id)) failures.push(`${feature.id}: unknown proof obligation ${id}`);
  }
  for (const required of requiredObligationSetFor(feature)) {
    if (!seenIds.has(required)) {
      if (required === 'runtime-observable-semantics') failures.push(`${feature.id}: executable features must link runtime-observable-semantics`);
      else if (required === 'backend-semantic-preservation') failures.push(`${feature.id}: executable features must link backend-semantic-preservation`);
      else if (required === 'stdlib-bootstrap-soundness') failures.push(`${feature.id}: checked-bootstrap features must link stdlib-bootstrap-soundness`);
      else if (required === 'kernel-lean4-equivalence') failures.push(`${feature.id}: existing-kernel-rules features must link kernel-lean4-equivalence`);
      else failures.push(`${feature.id}: proofObligationIds must include required obligation ${required}`);
    }
  }
}

for (const feature of manifest.features ?? []) {
  if (!feature?.id) {
    failures.push('every feature entry needs id');
    continue;
  }
  if (seen.has(feature.id)) failures.push(`duplicate feature id ${feature.id}`);
  seen.add(feature.id);

  if (!feature.title) failures.push(`${feature.id}: missing title`);
  if (!validLifecycles.has(feature.lifecycle)) failures.push(`${feature.id}: invalid lifecycle ${feature.lifecycle}`);
  if (!validTrustLevels.has(feature.trustLevel)) failures.push(`${feature.id}: invalid trustLevel ${feature.trustLevel}`);
  if (!validKernelImpacts.has(feature.kernelImpact)) failures.push(`${feature.id}: invalid kernelImpact ${feature.kernelImpact}`);
  if (!Array.isArray(feature.syntax) || feature.syntax.length === 0) failures.push(`${feature.id}: syntax examples must be non-empty`);
  if (!feature.checkedStory || !/checked|kernel|fail-closed/i.test(feature.checkedStory)) {
    failures.push(`${feature.id}: checkedStory must explain the checked Core/bootstrap/kernel/fail-closed story`);
  }
  if (!Array.isArray(feature.packages) || feature.packages.length === 0) failures.push(`${feature.id}: packages must be non-empty`);

  for (const pkg of feature.packages ?? []) {
    if (!byPath.has(pkg)) failures.push(`${feature.id}: package is not classified: ${pkg}`);
    const tier = byPath.get(pkg)?.tier;
    if (feature.lifecycle === 'supported' && feature.productionGradePath === true && forbiddenProductionTiers.has(tier)) {
      failures.push(`${feature.id}: supported production feature must not depend on ${tier} package ${pkg}`);
    }
  }

  if (feature.lifecycle === 'supported' && feature.productionGradePath === true) checkProofObligationLinks(feature);

  const evidence = feature.evidence ?? {};
  for (const slot of requiredEvidenceSlots) {
    for (const ref of assertStringArray(feature, slot, evidence[slot])) checkEvidenceFile(feature, slot, ref);
  }
  if (feature.executable !== false) {
    for (const slot of requiredExecutableSlots) {
      for (const ref of assertStringArray(feature, slot, evidence[slot])) checkEvidenceFile(feature, slot, ref);
    }
  } else {
    for (const slot of requiredExecutableSlots) {
      for (const ref of assertStringArray(feature, slot, evidence[slot] ?? [], { allowEmpty: true })) checkEvidenceFile(feature, slot, ref);
    }
  }
  for (const ref of assertStringArray(feature, 'theoremOrReductionSmoke', evidence.theoremOrReductionSmoke ?? [], { allowEmpty: feature.executable === false })) {
    checkEvidenceFile(feature, 'theoremOrReductionSmoke', ref);
  }
  for (const script of assertStringArray(feature, 'packageScripts', evidence.packageScripts ?? [], { allowEmpty: false })) {
    if (!packageJson.scripts?.[script]) failures.push(`${feature.id}: evidence.packageScripts references missing package script ${script}`);
  }

  if (feature.lifecycle === 'supported' && feature.kernelImpact === 'new-kernel-obligation') {
    const obligations = evidence.checkedBootstrapOrObligation ?? [];
    if (!obligations.some((ref) => /PROOF_OBLIGATIONS|KERNEL_COVERAGE|PSKERNEL_TS_PROOF_OBLIGATIONS/.test(ref))) {
      failures.push(`${feature.id}: new-kernel-obligation features must cite a proof-obligation document`);
    }
  }

  if (feature.lifecycle === 'supported' && /formal.*lean.*equiv/i.test(feature.checkedStory)) {
    failures.push(`${feature.id}: supported feature story must not claim formal Lean equivalence`);
  }
}

const featureDoc = path.join(root, 'docs', 'PRODUCTION_FEATURE_PROMOTION_GATE.md');
if (fs.existsSync(featureDoc)) {
  const doc = fs.readFileSync(featureDoc, 'utf8');
  for (const needle of ['Production Feature Gate', 'Required Evidence', 'How to Add a Feature', 'K3-TB']) {
    if (!doc.includes(needle)) failures.push(`docs/PRODUCTION_FEATURE_PROMOTION_GATE.md missing section/text: ${needle}`);
  }
} else {
  failures.push('missing docs/PRODUCTION_FEATURE_PROMOTION_GATE.md');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

const supported = manifest.features.filter((feature) => feature.lifecycle === 'supported').length;
const executable = manifest.features.filter((feature) => feature.executable !== false).length;
const trustedKernelChanges = manifest.features.filter((feature) => feature.trustLevel === 'trusted-kernel-change').length;
const proofObligationLinkedFeatures = manifest.features.filter((feature) => feature.lifecycle === 'supported' && feature.productionGradePath === true && Array.isArray(feature.proofObligationIds) && feature.proofObligationIds.length > 0).length;
const uniqueProofObligationLinks = new Set(manifest.features.flatMap((feature) => feature.proofObligationIds ?? [])).size;
console.log(`✓ feature promotion gate holds (${manifest.features.length} features; supported=${supported}; executable=${executable}; proof-linked=${proofObligationLinkedFeatures})`);
console.log(JSON.stringify({
  release: manifest.release,
  trustClaim: manifest.trustClaim.label,
  formalLean4EquivalenceProvenObligations: manifest.trustClaim.formalLean4EquivalenceProvenObligations,
  trustedKernelChanges,
  proofObligationLinkedFeatures,
  uniqueProofObligationLinks,
}, null, 2));
