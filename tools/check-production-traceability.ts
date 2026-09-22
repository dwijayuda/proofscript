#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let manifestArg = null;
let jsonOut = false;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--manifest') {
    manifestArg = args[i + 1];
    i += 1;
  } else if (args[i] === '--json') {
    jsonOut = true;
  }
}

const manifestPath = manifestArg ? path.resolve(root, manifestArg) : path.join(root, 'config', 'production-traceability-bundle.json');
const failures = [];

function rel(p) {
  return path.relative(root, p).split(path.sep).join('/');
}

function existsRelative(ref) {
  return fs.existsSync(path.join(root, ref));
}

function loadJson(file, label = rel(file)) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`failed to read ${label}: ${error.message}`);
    return null;
  }
}

function readText(relativePath) {
  try {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
  } catch (error) {
    failures.push(`failed to read ${relativePath}: ${error.message}`);
    return '';
  }
}

function stringArray(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array`);
    return [];
  }
  if (!allowEmpty && value.length === 0) failures.push(`${label} must not be empty`);
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0) failures.push(`${label} contains a non-string/empty item`);
  }
  return value;
}

function assertTrustClaim(source, label) {
  const trust = source?.trustClaim;
  if (!trust) {
    failures.push(`${label} missing trustClaim`);
    return;
  }
  if (trust.label !== 'K3-TB trusted-boundary') failures.push(`${label} trust claim label must remain K3-TB trusted-boundary`);
  if (trust.fullyFormalK3 !== false) failures.push(`${label} must not mark fullyFormalK3 true`);
  if (trust.lean4Equivalent !== false) failures.push(`${label} must not mark lean4Equivalent true`);
  if (trust.formalLean4EquivalenceProvenObligations !== 0) failures.push(`${label} formal Lean 4 equivalence obligations must remain 0 until actually proven`);
}

const manifest = loadJson(manifestPath);
const packageJson = loadJson(path.join(root, 'package.json'), 'package.json');
const classification = loadJson(path.join(root, 'config', 'package-classification.json'), 'config/package-classification.json');
const featureGate = loadJson(path.join(root, 'config', 'feature-promotion-gate.json'), 'config/feature-promotion-gate.json');
const verificationMatrix = loadJson(path.join(root, 'config', 'verification-matrix.json'), 'config/verification-matrix.json');
const proofLedger = loadJson(path.join(root, 'config', 'proof-obligations-ledger.json'), 'config/proof-obligations-ledger.json');
const developmentWorkflow = loadJson(path.join(root, 'config', 'development-workflow.json'), 'config/development-workflow.json');

if (!manifest || !packageJson || !classification || !featureGate || !verificationMatrix || !proofLedger || !developmentWorkflow) {
  console.error(failures.join('\n'));
  process.exit(1);
}

if (manifest.schemaVersion !== 1) failures.push(`traceability manifest schemaVersion must be 1, got ${manifest.schemaVersion}`);
if (!manifest.release || typeof manifest.release !== 'string') failures.push('traceability manifest needs string release');
if (!manifest.purpose || !/package|feature|verification|proof|trace/i.test(manifest.purpose)) {
  failures.push('traceability manifest purpose must explain package/feature/verification/proof traceability');
}

assertTrustClaim(manifest, 'traceability manifest');
assertTrustClaim(classification, 'package classification');
assertTrustClaim(featureGate, 'feature promotion gate');
assertTrustClaim(verificationMatrix, 'verification matrix');
assertTrustClaim(proofLedger, 'proof obligation ledger');
assertTrustClaim(developmentWorkflow, 'development workflow');

const sourceConfigs = [
  ['package classification', classification],
  ['feature promotion gate', featureGate],
  ['verification matrix', verificationMatrix],
  ['proof obligation ledger', proofLedger],
  ['development workflow', developmentWorkflow],
];
if (manifest.rules?.allSourceConfigsMustShareRelease !== false) {
  for (const [label, config] of sourceConfigs) {
    if (config.release !== manifest.release) failures.push(`${label} release must match traceability release ${manifest.release}, got ${config.release}`);
  }
}

const sources = stringArray(manifest.sources ?? [], 'sources');
for (const source of sources) {
  if (!existsRelative(source)) failures.push(`missing traceability source: ${source}`);
}
for (const doc of stringArray(manifest.requiredDocs ?? [], 'requiredDocs')) {
  if (!existsRelative(doc)) failures.push(`missing required traceability doc: ${doc}`);
}
const requiredLinks = stringArray(manifest.requiredLinks ?? [], 'requiredLinks');
for (const needed of ['packages-to-classification', 'features-to-packages', 'features-to-proof-obligations', 'claims-to-commands', 'proof-obligations-to-evidence', 'non-overclaim-enforced', 'feature-workflow-to-templates', 'feature-workflow-to-proof-obligations']) {
  if (!requiredLinks.includes(needed)) failures.push(`traceability manifest missing required link ${needed}`);
}

const packageByPath = new Map((classification.packages ?? []).map((entry) => [entry.path, entry]));
const stablePath = classification.stablePsc1Path ?? [];
for (const packagePath of stablePath) {
  if (!packageByPath.has(packagePath)) failures.push(`stable package is not classified: ${packagePath}`);
}

const headings = stringArray(manifest.stablePackageReadmeHeadings ?? [], 'stablePackageReadmeHeadings');
let canonicalPackagesDocumented = 0;
for (const packagePath of stablePath) {
  const readmePath = `${packagePath}/README.md`;
  if (!existsRelative(readmePath)) {
    failures.push(`stable package missing README: ${readmePath}`);
    continue;
  }
  const readme = readText(readmePath);
  let ok = true;
  for (const heading of headings) {
    if (!readme.includes(heading)) {
      failures.push(`${readmePath} missing traceability heading: ${heading}`);
      ok = false;
    }
  }
  if (ok) canonicalPackagesDocumented += 1;
}

const proofObligationIds = new Set((proofLedger.obligations ?? []).map((obligation) => obligation.id));
let supportedFeatures = 0;
let proofLinkedFeatures = 0;
const featurePackageLinks = new Set();
const featureProofLinks = new Set();
for (const feature of featureGate.features ?? []) {
  if (feature.lifecycle !== 'supported') continue;
  supportedFeatures += 1;
  if (feature.productionGradePath !== true) failures.push(`${feature.id}: supported feature must set productionGradePath true`);
  const packages = stringArray(feature.packages ?? [], `${feature.id}.packages`);
  for (const packagePath of packages) {
    featurePackageLinks.add(`${feature.id}->${packagePath}`);
    const entry = packageByPath.get(packagePath);
    if (!entry) failures.push(`${feature.id}: feature references unclassified package ${packagePath}`);
    else if (entry.tier === 'experimental') failures.push(`${feature.id}: feature references experimental package ${packagePath}`);
  }
  const obligations = stringArray(feature.proofObligationIds ?? [], `${feature.id}.proofObligationIds`);
  if (obligations.length > 0) proofLinkedFeatures += 1;
  for (const obligationId of obligations) {
    featureProofLinks.add(`${feature.id}->${obligationId}`);
    if (!proofObligationIds.has(obligationId)) failures.push(`${feature.id}: unknown proof obligation ${obligationId}`);
  }
  for (const section of Object.values(feature.evidence ?? {})) {
    if (!Array.isArray(section)) continue;
    for (const ref of section) {
      if (typeof ref === 'string' && !packageJson.scripts?.[ref] && !existsRelative(ref)) failures.push(`${feature.id}: evidence reference missing: ${ref}`);
    }
  }
}
if (supportedFeatures === 0) failures.push('traceability needs at least one supported feature');
if (proofLinkedFeatures !== supportedFeatures) failures.push(`all supported features must be proof-linked; got ${proofLinkedFeatures}/${supportedFeatures}`);

const scripts = packageJson.scripts ?? {};
const claimIds = new Set((verificationMatrix.claims ?? []).map((claim) => claim.id));
for (const claimId of stringArray(manifest.requiredVerificationClaims ?? [], 'requiredVerificationClaims')) {
  if (!claimIds.has(claimId)) failures.push(`required verification claim ${claimId} is absent from verification matrix`);
}
let verificationCommands = 0;
for (const claim of verificationMatrix.claims ?? []) {
  assertTrustClaim(verificationMatrix, 'verification matrix');
  for (const command of claim.commands ?? []) {
    verificationCommands += 1;
    if (!scripts[command]) failures.push(`${claim.id}: command ${command} is not a package script`);
  }
  for (const doc of claim.docs ?? []) {
    if (!existsRelative(doc)) failures.push(`${claim.id}: claim doc is missing: ${doc}`);
  }
}

let obligationsWithEvidence = 0;
let provedFormalLean4EquivalenceObligations = 0;
for (const obligation of proofLedger.obligations ?? []) {
  if (obligation.requiredForFormalLean4Equivalence && obligation.state === 'proved') provedFormalLean4EquivalenceObligations += 1;
  let hasEvidence = false;
  for (const ref of obligation.evidenceFiles ?? []) {
    if (!existsRelative(ref)) failures.push(`${obligation.id}: proof-obligation evidence is missing: ${ref}`);
    else hasEvidence = true;
  }
  if (hasEvidence) obligationsWithEvidence += 1;
}
if (provedFormalLean4EquivalenceObligations !== 0) failures.push('traceability bundle must not report proved formal Lean 4 equivalence obligations yet');
if (provedFormalLean4EquivalenceObligations !== manifest.trustClaim.formalLean4EquivalenceProvenObligations) {
  failures.push('traceability trust claim proven count must match actually proved required proof obligations');
}

const nonClaims = stringArray(manifest.nonClaims ?? [], 'nonClaims');
for (const required of ['not fully formal K3', 'not proven equivalent to Lean 4', 'traceability is not itself a formal proof']) {
  if (!nonClaims.includes(required)) failures.push(`traceability nonClaims missing: ${required}`);
}

const traceDoc = 'docs/PRODUCTION_TRACEABILITY_BUNDLE.md';
if (existsRelative(traceDoc)) {
  const doc = readText(traceDoc);
  for (const needle of ['Production Traceability Bundle', 'K3-TB', 'Sources', 'Links', 'What This Does Not Prove']) {
    if (!doc.includes(needle)) failures.push(`${traceDoc} missing required text/section: ${needle}`);
  }
}

if (!scripts['test:production-traceability']) failures.push('package.json missing test:production-traceability script');
if (!scripts['test:development-workflow']) failures.push('package.json missing test:development-workflow script');
if (!scripts['test:architecture:development-workflow']) failures.push('package.json missing test:architecture:development-workflow script');
if (!scripts['test:architecture:production-traceability']) failures.push('package.json missing test:architecture:production-traceability script');
if (!scripts['test:architecture']?.includes('check-production-traceability.ts')) {
  failures.push('test:architecture must include check-production-traceability.ts');
}
if (!scripts['test:architecture']?.includes('check-development-workflow.ts')) {
  failures.push('test:architecture must include check-development-workflow.ts');
}

const summary = {
  release: manifest.release,
  trustClaim: manifest.trustClaim,
  sources: {
    declared: sources.length,
    checked: sources.filter((source) => existsRelative(source)).length,
  },
  requiredLinks,
  links: {
    canonicalPackages: stablePath.length,
    canonicalPackagesDocumented,
    supportedFeatures,
    proofLinkedFeatures,
    featurePackageLinks: featurePackageLinks.size,
    featureProofLinks: featureProofLinks.size,
    verificationClaims: verificationMatrix.claims?.length ?? 0,
    verificationCommands,
    proofObligations: proofLedger.obligations?.length ?? 0,
    developmentWorkflowStages: developmentWorkflow.workflowStages?.length ?? 0,
    developmentWorkflowTemplates: developmentWorkflow.templates?.length ?? 0,
    plannedFeatureWorkflowEntries: developmentWorkflow.plannedFeatures?.length ?? 0,
    obligationsWithEvidence,
    provedFormalLean4EquivalenceObligations,
  },
  nonClaims,
  failures,
};

if (failures.length) {
  if (jsonOut) console.log(JSON.stringify(summary, null, 2));
  else console.error(failures.join('\n'));
  process.exit(1);
}

if (jsonOut) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`✓ production traceability holds (${summary.release}; features=${supportedFeatures}; packages=${stablePath.length}; claims=${summary.links.verificationClaims})`);
  console.log(JSON.stringify({
    release: summary.release,
    trustClaim: summary.trustClaim.label,
    formalLean4EquivalenceProvenObligations: summary.trustClaim.formalLean4EquivalenceProvenObligations,
    canonicalPackagesDocumented: `${canonicalPackagesDocumented}/${stablePath.length}`,
    proofLinkedFeatures: `${proofLinkedFeatures}/${supportedFeatures}`,
    verificationClaims: summary.links.verificationClaims,
    proofObligations: summary.links.proofObligations,
  }, null, 2));
}
