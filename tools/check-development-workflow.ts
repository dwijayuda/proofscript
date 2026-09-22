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

const manifestPath = manifestArg ? path.resolve(root, manifestArg) : path.join(root, 'config', 'development-workflow.json');
const failures = [];
const canonicalStages = [
  'propose-feature',
  'scope-feature',
  'red-tests',
  'implement-parser-elaborator-kernel',
  'implement-backend-runtime',
  'link-proof-obligations',
  'update-governance-traceability',
  'verify-and-report',
];

function rel(p) {
  return path.relative(root, p).split(path.sep).join('/');
}

function existsRelative(ref) {
  return fs.existsSync(path.join(root, ref));
}

function readJson(file, label = rel(file)) {
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

const manifest = readJson(manifestPath);
const packageJson = readJson(path.join(root, 'package.json'), 'package.json');
const classification = readJson(path.join(root, 'config', 'package-classification.json'), 'config/package-classification.json');
const proofLedger = readJson(path.join(root, 'config', 'proof-obligations-ledger.json'), 'config/proof-obligations-ledger.json');
const featureGate = readJson(path.join(root, 'config', 'feature-promotion-gate.json'), 'config/feature-promotion-gate.json');

if (!manifest || !packageJson || !classification || !proofLedger || !featureGate) {
  console.error(failures.join('\n'));
  process.exit(1);
}

if (manifest.schemaVersion !== 1) failures.push(`development workflow schemaVersion must be 1, got ${manifest.schemaVersion}`);
if (!manifest.release || typeof manifest.release !== 'string') failures.push('development workflow needs string release');
if (!manifest.purpose || !/feature|workflow|proof|evidence/i.test(manifest.purpose)) {
  failures.push('development workflow purpose must explain feature workflow evidence/proof discipline');
}
assertTrustClaim(manifest, 'development workflow');
assertTrustClaim(classification, 'package classification');
assertTrustClaim(proofLedger, 'proof obligation ledger');
assertTrustClaim(featureGate, 'feature promotion gate');

for (const source of stringArray(manifest.sourceConfigs ?? [], 'sourceConfigs')) {
  if (!existsRelative(source)) failures.push(`missing development workflow source config: ${source}`);
}
for (const doc of stringArray(manifest.requiredDocs ?? [], 'requiredDocs')) {
  if (!existsRelative(doc)) failures.push(`missing development workflow doc: ${doc}`);
}
for (const template of stringArray(manifest.templates ?? [], 'templates')) {
  if (!existsRelative(template)) failures.push(`missing development workflow template: ${template}`);
}

const scripts = packageJson.scripts ?? {};
for (const script of stringArray(manifest.requiredArchitectureScripts ?? [], 'requiredArchitectureScripts')) {
  if (!scripts[script]) failures.push(`package.json missing development workflow required script ${script}`);
}
if (!scripts['test:development-workflow']) failures.push('package.json missing test:development-workflow script');
if (!scripts['test:architecture:development-workflow']) failures.push('package.json missing test:architecture:development-workflow script');
if (!scripts['test:architecture']?.includes('check-development-workflow.ts')) {
  failures.push('test:architecture must include check-development-workflow.ts');
}

const stages = Array.isArray(manifest.workflowStages) ? manifest.workflowStages : [];
if (!Array.isArray(manifest.workflowStages)) failures.push('workflowStages must be an array');
const stageIds = new Set();
for (const stage of stages) {
  if (!stage?.id) {
    failures.push('every development workflow stage needs id');
    continue;
  }
  if (stageIds.has(stage.id)) failures.push(`duplicate development workflow stage ${stage.id}`);
  stageIds.add(stage.id);
  if (!stage.title) failures.push(`${stage.id}: missing title`);
  if (!stage.purpose || !/feature|test|proof|verify|verification|scope|core|runtime|governance|matrix|smoke|support/i.test(stage.purpose)) {
    failures.push(`${stage.id}: purpose must describe feature/test/proof/verification workflow`);
  }
  stringArray(stage.requiredEvidence ?? [], `${stage.id}.requiredEvidence`);
  if (stage.blocksPromotion !== true) failures.push(`${stage.id}: blocksPromotion must be true`);
}
for (const stageId of canonicalStages) {
  if (!stageIds.has(stageId)) failures.push(`missing canonical development workflow stage ${stageId}`);
}

const classifiedPackages = new Map((classification.packages ?? []).map((entry) => [entry.path, entry]));
const proofIds = new Set((proofLedger.obligations ?? []).map((entry) => entry.id));
const supportedFeatureIds = new Set((featureGate.features ?? []).filter((feature) => feature.lifecycle === 'supported').map((feature) => feature.id));
const plannedFeatures = Array.isArray(manifest.plannedFeatures) ? manifest.plannedFeatures : [];
if (!Array.isArray(manifest.plannedFeatures)) failures.push('plannedFeatures must be an array');
if (plannedFeatures.length < 4) failures.push(`development workflow should track at least 4 planned features, got ${plannedFeatures.length}`);
for (const feature of plannedFeatures) {
  if (!feature?.id) {
    failures.push('every planned feature needs id');
    continue;
  }
  if (supportedFeatureIds.has(feature.id)) failures.push(`planned feature ${feature.id} is already marked supported; promote it through feature-promotion-gate instead`);
  if (feature.lifecycle !== 'planned') failures.push(`planned feature ${feature.id} lifecycle must be planned`);
  if (feature.mustUseTemplates !== true) failures.push(`planned feature ${feature.id} mustUseTemplates must be true`);
  const obligations = stringArray(feature.mustLinkProofObligations ?? [], `planned feature ${feature.id} mustLinkProofObligations`);
  if (obligations.length === 0) failures.push(`planned feature ${feature.id} mustLinkProofObligations must not be empty`);
  for (const obligation of obligations) {
    if (!proofIds.has(obligation)) failures.push(`planned feature ${feature.id} references unknown proof obligation ${obligation}`);
  }
  for (const packagePath of stringArray(feature.mustTouchPackages ?? [], `planned feature ${feature.id} mustTouchPackages`)) {
    const entry = classifiedPackages.get(packagePath);
    if (!entry) failures.push(`planned feature ${feature.id} references unclassified package ${packagePath}`);
    else if (entry.tier === 'experimental' || entry.tier === 'bridge' || entry.tier === 'plugin-infra') {
      failures.push(`planned feature ${feature.id} must not require non-canonical package ${packagePath}`);
    }
  }
}

const nonClaims = stringArray(manifest.nonClaims ?? [], 'nonClaims');
for (const required of ['not fully formal K3', 'not proven equivalent to Lean 4', 'workflow discipline is not itself a formal proof', 'planned features are not supported features']) {
  if (!nonClaims.includes(required)) failures.push(`development workflow nonClaims missing: ${required}`);
}

const doc = readText('docs/PRODUCTION_DEVELOPMENT_WORKFLOW.md');
for (const needle of ['Production Development Workflow', 'Feature Implementation Steps', 'Proof Obligations', 'Templates', 'What This Does Not Prove', 'K3-TB']) {
  if (!doc.includes(needle)) failures.push(`docs/PRODUCTION_DEVELOPMENT_WORKFLOW.md missing required text/section: ${needle}`);
}

const summary = {
  release: manifest.release,
  trustClaim: manifest.trustClaim,
  workflowStages: stages.length,
  templates: manifest.templates?.length ?? 0,
  plannedFeatures: plannedFeatures.length,
  requiredArchitectureScripts: manifest.requiredArchitectureScripts ?? [],
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
  console.log(`✓ development workflow holds (${summary.workflowStages} stages; ${summary.templates} feature implementation templates; plannedFeatures=${summary.plannedFeatures})`);
  console.log(JSON.stringify({
    release: summary.release,
    trustClaim: summary.trustClaim.label,
    formalLean4EquivalenceProvenObligations: summary.trustClaim.formalLean4EquivalenceProvenObligations,
    requiredArchitectureScripts: summary.requiredArchitectureScripts,
  }, null, 2));
}
